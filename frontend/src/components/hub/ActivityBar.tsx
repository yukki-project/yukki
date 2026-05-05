import {
  BookOpen,
  CheckSquare,
  Cog,
  FileText,
  Inbox,
  Layers,
  Lightbulb,
  Map,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useShellStore, type ShellMode } from '@/stores/shell';

interface ActivityItem {
  mode: ShellMode;
  label: string;
  Icon: LucideIcon;
}

const PRIMARY_ITEMS: ActivityItem[] = [
  { mode: 'inbox', label: 'Inbox', Icon: Inbox },           // META-005
  { mode: 'stories', label: 'Stories', Icon: BookOpen },
  { mode: 'epics', label: 'Epics', Icon: Layers },          // META-005
  { mode: 'analysis', label: 'Analyses', Icon: Lightbulb },
  { mode: 'prompts', label: 'Canvas', Icon: FileText },
  { mode: 'tests', label: 'Tests', Icon: CheckSquare },
  { mode: 'roadmap', label: 'Roadmap', Icon: Map },         // META-005
  { mode: 'workflow', label: 'Workflow', Icon: Workflow },
];

const SETTINGS_ITEM: ActivityItem = {
  mode: 'settings',
  label: 'Settings',
  Icon: Cog,
};

interface BarButtonProps {
  item: ActivityItem;
  activeMode: ShellMode;
  onSelect: (mode: ShellMode) => void;
}

function BarButton({ item, activeMode, onSelect }: BarButtonProps): JSX.Element {
  const isActive = item.mode === activeMode;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={item.label}
          onClick={() => onSelect(item.mode)}
          className={cn(
            'relative flex h-12 w-full items-center justify-center transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isActive && 'bg-accent/50 text-foreground',
          )}
        >
          {isActive && (
            <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-primary" />
          )}
          <item.Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function ActivityBar(): JSX.Element {
  const activeMode = useShellStore((s) => s.activeMode);
  const setActiveMode = useShellStore((s) => s.setActiveMode);
  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="Activity bar"
        className="flex w-13 flex-col border-r border-border bg-card"
      >
        {PRIMARY_ITEMS.map((item) => (
          <BarButton
            key={item.mode}
            item={item}
            activeMode={activeMode}
            onSelect={setActiveMode}
          />
        ))}
        <div className="flex-1" />
        <BarButton
          item={SETTINGS_ITEM}
          activeMode={activeMode}
          onSelect={setActiveMode}
        />
      </aside>
    </TooltipProvider>
  );
}
