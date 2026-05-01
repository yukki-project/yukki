import { useEffect, useState } from 'react';
import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
import { HubList } from '@/components/hub/HubList';
import { ProjectPicker } from '@/components/hub/ProjectPicker';
import { Sidebar } from '@/components/hub/Sidebar';
import { SidebarToggle } from '@/components/hub/SidebarToggle';
import { StoryViewer } from '@/components/hub/StoryViewer';
import { useClaudeStore } from '@/stores/claude';
import { useProjectStore } from '@/stores/project';

const NARROW_QUERY = '(max-width: 767px)';

export default function App() {
  const projectDir = useProjectStore((s) => s.projectDir);
  const refreshClaude = useClaudeStore((s) => s.refresh);

  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    void refreshClaude();
  }, [refreshClaude]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setCollapsed(e.matches);
    onChange(mq);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!projectDir) {
    return <ProjectPicker />;
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <ClaudeBanner />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar collapsed={collapsed} onSelect={() => setCollapsed(true)} />
        <div className="flex flex-1">
          <div className="border-b md:border-0 px-2 py-1 absolute top-1 left-1 z-50">
            <SidebarToggle
              collapsed={collapsed}
              onToggle={() => setCollapsed((c) => !c)}
            />
          </div>
          <section className="flex flex-1">
            <HubList className="w-1/2 lg:w-2/5 border-r" />
            <StoryViewer className="flex-1" />
          </section>
        </div>
      </div>
    </main>
  );
}
