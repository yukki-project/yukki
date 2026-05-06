import { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { type Meta } from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';
import { useProjectStore } from '@/stores/project';
import { NewStoryModal } from './NewStoryModal';

export const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  accepted: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  implemented: 'bg-green-500/15 text-green-700 dark:text-green-300',
  synced: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

// Singularize kind label for display under ID
const KIND_LABEL: Record<string, string> = {
  stories: 'story',
  analysis: 'analysis',
  prompts: 'canvas',
  tests: 'test',
  inbox: 'inbox',
  epics: 'epic',
  roadmap: 'roadmap',
};

interface HubListProps {
  className?: string;
}

export function HubList({ className }: HubListProps) {
  const items = useArtifactsStore((s) => s.items);
  const error = useArtifactsStore((s) => s.error);
  const selectedPath = useArtifactsStore((s) => s.selectedPath);
  const setSelectedPath = useArtifactsStore((s) => s.setSelectedPath);
  const kind = useArtifactsStore((s) => s.kind);
  const projectDir = useProjectStore((s) => s.projectDir);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const kindLabel = KIND_LABEL[kind] ?? kind;

  return (
    <section className={cn('flex flex-col overflow-y-auto', className)} aria-label="Artefact list">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background border-b px-4 py-2">
        <div className="text-sm font-semibold capitalize">
          {kind}
          <span className="ml-2 text-xs text-muted-foreground">{items.length} item(s)</span>
        </div>
        {kind === 'stories' && (
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            disabled={!projectDir}
          >
            <Plus className="mr-2 h-3 w-3" /> New Story
          </Button>
        )}
      </header>
      {error && (
        <div className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      {!error && items.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">No {kind} yet.</p>
      )}
      {items.length > 0 && (
        <ul className="w-full">
          {items.map((m: Meta) => {
            const broken = !!m.Error;
            const active = m.Path === selectedPath;
            return (
              <li
                key={m.Path}
                onClick={() => setSelectedPath(m.Path)}
                className={cn(
                  'flex items-start gap-3 px-3 py-2 cursor-pointer border-b hover:bg-accent/40',
                  active && 'bg-accent/60',
                )}
              >
                {/* ID + kind */}
                <div className="flex flex-col shrink-0 min-w-0 w-16">
                  <span className="font-mono text-[11px] leading-tight truncate">{m.ID || '?'}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{kindLabel}</span>
                </div>
                {/* Title */}
                <span className="flex-1 text-sm leading-tight truncate pt-px">{m.Title || m.Slug || '—'}</span>
                {/* Status */}
                <div className="shrink-0 pt-px">
                  {broken ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive"
                      title={m.Error}
                    >
                      <AlertCircle className="h-2.5 w-2.5" /> err
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'inline-block rounded-md px-1.5 py-0.5 text-[10px]',
                        STATUS_BADGE[m.Status] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {m.Status || '?'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <NewStoryModal open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  );
}
