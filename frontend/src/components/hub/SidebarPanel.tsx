import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShellStore, type ShellMode } from '@/stores/shell';
import { HubList } from './HubList';

const TITLES: Record<ShellMode, string> = {
  stories: 'Stories',
  analysis: 'Analyses',
  prompts: 'Canvas',
  tests: 'Tests',
  inbox: 'Inbox',     // META-005
  epics: 'Epics',     // META-005
  roadmap: 'Roadmap', // META-005
  settings: 'Settings',
  workflow: 'Workflow',
};

export function SidebarPanel(): JSX.Element {
  const activeMode = useShellStore((s) => s.activeMode);
  const sidebarOpen = useShellStore((s) => s.sidebarOpen);
  const closeSidebar = useShellStore((s) => s.closeSidebar);

  return (
    <aside
      aria-label="Mode panel"
      className={cn(
        'flex flex-col border-r border-border bg-card transition-[width] duration-150 ease-out overflow-hidden',
        sidebarOpen ? 'w-60' : 'w-0',
        'max-md:fixed max-md:inset-y-0 max-md:left-13 max-md:z-40 max-md:shadow-xl',
      )}
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="text-sm font-semibold">{TITLES[activeMode]}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Close panel"
          onClick={closeSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      {activeMode === 'settings' ? (
        <div className="p-4 text-sm text-muted-foreground">
          Settings panel — UI-007 (à venir).
        </div>
      ) : (
        <HubList className="flex-1" />
      )}
    </aside>
  );
}
