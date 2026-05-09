import { useEffect } from 'react';
import { ActivityBar } from '@/components/hub/ActivityBar';
import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
import { ProjectPicker } from '@/components/hub/ProjectPicker';
import { SidebarPanel } from '@/components/hub/SidebarPanel';
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
import { useSettingsStore } from '@/stores/settings';
import { useDevToolsStore } from '@/stores/devTools';
import { hydrateBuildFlags } from '@/lib/buildFlags';
import { LogsDrawer } from '@/components/hub/LogsDrawer';
import type { LogLine } from '../wailsjs/go/main/App';
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
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const debugMode = useSettingsStore((s) => s.debugMode);
  const setDebugMode = useSettingsStore((s) => s.setDebugMode);

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

  // OPS-001 O12 — hydrate the settings store on first mount so the
  // TitleBar badge and DeveloperMenu reflect the persisted state.
  // Also hydrate the build flag so isDevBuild() returns the right
  // value before any debug surface is rendered.
  useEffect(() => {
    void Promise.all([hydrateSettings(), hydrateBuildFlags()]);
  }, [hydrateSettings]);

  // OPS-001 prompt-update — subscribe to the live log stream once
  // mounted. The Go backend only emits "log:event" in dev builds
  // (EmitLogEventListener returns nil otherwise), so the listener is
  // safe to attach unconditionally — release builds never see an
  // event. We do NOT gate by isDevBuild() here because that helper
  // resolves async via Wails IPC; gating would race the first paint
  // and miss the listener attachment forever.
  const pushLogEntry = useDevToolsStore((s) => s.pushEntry);
  useEffect(() => {
    const off = EventsOn<LogLine>('log:event', (line) => pushLogEntry(line));
    return () => off();
  }, [pushLogEntry]);

  // OPS-001 O12 — global Ctrl+Shift+D / Cmd+Shift+D toggle. The
  // existing ctrl shortcut block above checks `e.ctrlKey` then
  // matches single-letter keys, so it would route 'D' to that
  // handler if we added it there. Keep this listener separate to
  // require *both* ctrl/meta and shift, and to avoid colliding with
  // browser devtools shortcuts (Ctrl+Shift+D opens a profile
  // picker in some Chromium variants but not in the embedded
  // WebView2 used by Wails).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      e.preventDefault();
      void setDebugMode(!debugMode);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [debugMode, setDebugMode]);

  return (
    <main className="h-screen flex flex-col bg-ykp-bg-page text-ykp-text-primary overflow-hidden">
      <TitleBar />
      <TabBar />
      {!current ? (
        <ProjectPicker />
      ) : (
        <>
          <ClaudeBanner />
          <div className="flex flex-1 overflow-hidden">
            <ActivityBar />
            <SidebarPanel />
            <section className="flex flex-1 overflow-hidden">
              {activeMode === 'workflow' ? (
                <WorkflowPipeline />
              ) : (
                <SpddEditor />
              )}
            </section>
          </div>
        </>
      )}
      <Toaster />
      <LogsDrawer />
    </main>
  );
}
