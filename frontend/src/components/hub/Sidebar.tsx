import { useEffect, useState } from 'react';
import { BookOpen, FileText, Lightbulb, RefreshCw } from 'lucide-react';
import { AllowedKinds } from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';

const ICONS: Record<string, JSX.Element> = {
  stories: <BookOpen className="h-4 w-4" />,
  analysis: <Lightbulb className="h-4 w-4" />,
  prompts: <FileText className="h-4 w-4" />,
  tests: <RefreshCw className="h-4 w-4" />,
};

interface SidebarProps {
  collapsed: boolean;
  onSelect?: () => void;
}

export function Sidebar({ collapsed, onSelect }: SidebarProps) {
  const [kinds, setKinds] = useState<string[]>([]);
  const kind = useArtifactsStore((s) => s.kind);
  const setKind = useArtifactsStore((s) => s.setKind);
  const refresh = useArtifactsStore((s) => s.refresh);

  useEffect(() => {
    void (async () => {
      try {
        const list = await AllowedKinds();
        setKinds(list);
      } catch {
        setKinds(['stories', 'analysis', 'prompts', 'tests']);
      }
    })();
  }, []);

  function handleClick(k: string) {
    setKind(k);
    onSelect?.();
  }

  return (
    <aside
      className={cn(
        'border-r bg-muted/30 transition-transform duration-200',
        'fixed inset-y-0 left-0 z-40 w-60 md:static md:translate-x-0',
        collapsed && '-translate-x-full md:-translate-x-full md:w-0 md:overflow-hidden',
      )}
      aria-label="Artefact kinds"
    >
      <nav className="p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refresh()}
          className="w-full justify-start text-xs text-muted-foreground"
        >
          <RefreshCw className="mr-2 h-3 w-3" /> refresh
        </Button>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleClick(k)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm capitalize transition-colors',
              k === kind
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {ICONS[k] ?? <FileText className="h-4 w-4" />}
            {k}
          </button>
        ))}
      </nav>
    </aside>
  );
}
