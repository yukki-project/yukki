import { useEffect } from 'react';
import { ActivityBar } from '@/components/hub/ActivityBar';
import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
import { ProjectPicker } from '@/components/hub/ProjectPicker';
import { SidebarPanel } from '@/components/hub/SidebarPanel';
import { StoryViewer } from '@/components/hub/StoryViewer';
import { TitleBar } from '@/components/hub/TitleBar';
import { Toaster } from '@/components/ui/toaster';
import { WorkflowPipeline } from '@/components/workflow/WorkflowPipeline';
import { useClaudeStore } from '@/stores/claude';
import { useProjectStore } from '@/stores/project';
import { useShellStore } from '@/stores/shell';

export default function App() {
  const projectDir = useProjectStore((s) => s.projectDir);
  const refreshClaude = useClaudeStore((s) => s.refresh);
  const activeMode = useShellStore((s) => s.activeMode);

  useEffect(() => {
    void refreshClaude();
  }, [refreshClaude]);

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <TitleBar />
      {!projectDir ? (
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
