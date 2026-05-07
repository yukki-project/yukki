import { useEffect } from 'react';
import { ActivityBar } from '@/components/hub/ActivityBar';
import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
import { ProjectPicker } from '@/components/hub/ProjectPicker';
import { SidebarPanel } from '@/components/hub/SidebarPanel';
import { StoryViewer } from '@/components/hub/StoryViewer';
import { TabBar } from '@/components/hub/TabBar';
import { TitleBar } from '@/components/hub/TitleBar';
import { Toaster } from '@/components/ui/toaster';
import { WorkflowPipeline } from '@/components/workflow/WorkflowPipeline';
import { SpddEditor } from '@/components/spdd/SpddEditor';
import { CloseProject, LoadRegistry, OpenProject, SwitchProject } from '../wailsjs/go/main/App';
import { EventsOn } from '@/lib/wails-events';
import { useClaudeStore } from '@/stores/claude';
import { useTabsStore, activeProject } from '@/stores/tabs';
import { useShellStore } from '@/stores/shell';
import { useProjectStore } from '@/stores/project';
import { useArtifactsStore } from '@/stores/artifacts';
import type { ProjectOpenedPayload, ProjectClosedPayload, ProjectSwitchedPayload } from '@/lib/wails-events';

export default function App() {
  const openedProjects = useTabsStore((s) => s.openedProjects);
  const activeIndex = useTabsStore((s) => s.activeIndex);
  const recentProjects = useTabsStore((s) => s.recentProjects);
  const addProject = useTabsStore((s) => s.addProject);
  const removeProject = useTabsStore((s) => s.removeProject);
  const setActive = useTabsStore((s) => s.setActive);
  const setOpenedProjects = useTabsStore((s) => s.setOpenedProjects);
  const setRecentProjects = useTabsStore((s) => s.setRecentProjects);
  const refreshClaude = useClaudeStore((s) => s.refresh);
  const activeMode = useShellStore((s) => s.activeMode);
  const setProjectDir = useProjectStore((s) => s.setProjectDir);
  const setHasSpdd = useProjectStore((s) => s.setHasSpdd);
  const refreshArtifacts = useArtifactsStore((s) => s.refresh);

  const current = activeProject({ openedProjects, activeIndex, recentProjects } as Parameters<typeof activeProject>[0]);

  // Hydrate tabs store from backend registry on mount.
  useEffect(() => {
    void (async () => {
      try {
        const reg = await LoadRegistry();
        const projects = (reg.opened_projects ?? []).map((e: { path: string; name: string; last_opened: string }) => ({
          path: e.path,
          name: e.name,
          lastOpened: e.last_opened,
        }));
        setOpenedProjects(projects, reg.active_index ?? -1);
        const recents = (reg.recent_projects ?? []).map((e: { path: string; name: string; last_opened: string }) => ({
          path: e.path,
          name: e.name,
          lastOpened: e.last_opened,
        }));
        setRecentProjects(recents);
      } catch {
        // Registry absent or empty — start fresh.
      }
    })();
  }, [setOpenedProjects, setRecentProjects]);

  // Subscribe to backend project events.
  useEffect(() => {
    const offOpened = EventsOn<ProjectOpenedPayload>('project:opened', (meta) => {
      addProject({ path: meta.path, name: meta.name, lastOpened: meta.lastOpened });
    });
    const offClosed = EventsOn<ProjectClosedPayload>('project:closed', ({ idx }) => {
      removeProject(idx);
    });
    const offSwitched = EventsOn<ProjectSwitchedPayload>('project:switched', (meta) => {
      const idx = openedProjects.findIndex((p) => p.path === meta.path);
      if (idx >= 0) setActive(idx);
    });
    return () => {
      offOpened();
      offClosed();
      offSwitched();
    };
  }, [addProject, removeProject, setActive, openedProjects]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey) return;

      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        void OpenProject('').then((meta) => {
          if (meta && meta.Path) {
            addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
          }
        });
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        if (activeIndex >= 0) {
          e.preventDefault();
          void CloseProject(activeIndex).then(() => removeProject(activeIndex));
        }
        return;
      }

      if (e.key === 'Tab') {
        const len = openedProjects.length;
        if (len === 0) return;
        e.preventDefault();
        const next = e.shiftKey
          ? (activeIndex - 1 + len) % len
          : (activeIndex + 1) % len;
        void SwitchProject(next).then(() => setActive(next));
        return;
      }

      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9) {
        const idx = digit - 1;
        if (idx < openedProjects.length) {
          e.preventDefault();
          void SwitchProject(idx).then(() => setActive(idx));
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, openedProjects, addProject, removeProject, setActive]);

  // Sync active project to legacy stores (SidebarPanel, HubList, StoryViewer
  // still read useProjectStore.projectDir and useArtifactsStore).
  useEffect(() => {
    if (current) {
      setProjectDir(current.path);
      setHasSpdd(true);
      void refreshArtifacts();
    } else {
      setProjectDir('');
      setHasSpdd(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.path]);

  // Probe Claude on mount.
  useEffect(() => {
    void refreshClaude();
  }, [refreshClaude]);

  return (
    <main className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TitleBar />
      <TabBar />
      {!current ? (
        <ProjectPicker />
      ) : (
        <>
          <ClaudeBanner />
          <div className="flex flex-1 overflow-hidden">
            {activeMode !== 'editor' && <ActivityBar />}
            {activeMode !== 'editor' && <SidebarPanel />}
            <section className="flex flex-1 overflow-hidden">
              {activeMode === 'workflow' ? (
                <WorkflowPipeline />
              ) : activeMode === 'editor' ? (
                <SpddEditor />
              ) : (
                <StoryViewer className="flex-1" />
              )}
            </section>
          </div>
        </>
      )}
      <Toaster />
    </main>
  );
}
