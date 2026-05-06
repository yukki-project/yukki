import { useRef, useState } from 'react';
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

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 160;
const MAX_WIDTH = 500;

export function SidebarPanel(): JSX.Element {
  const activeMode = useShellStore((s) => s.activeMode);
  const sidebarOpen = useShellStore((s) => s.sidebarOpen);
  const closeSidebar = useShellStore((s) => s.closeSidebar);

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + ev.clientX - startX.current));
      setWidth(next);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <aside
      aria-label="Mode panel"
      className={cn(
        'relative flex flex-col border-r border-border bg-card overflow-hidden shrink-0',
        'max-md:fixed max-md:inset-y-0 max-md:left-13 max-md:z-40 max-md:shadow-xl',
      )}
      style={{ width: sidebarOpen ? width : 0 }}
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
      {sidebarOpen && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
          onMouseDown={onDragStart}
          aria-label="Resize sidebar"
        />
      )}
    </aside>
  );
}
