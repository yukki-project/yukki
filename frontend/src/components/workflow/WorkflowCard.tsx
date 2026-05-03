import { useEffect, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { type Meta } from '../../../wailsjs/go/main/App';
import { STATUS_BADGE } from '../hub/HubList';
import { useWorkflowStore } from '@/stores/workflow';
import { STAGES, type StageKind } from './stages';

const ALL_STATUSES = ['draft', 'reviewed', 'accepted', 'implemented', 'synced'];

interface WorkflowCardProps {
  artifact: Meta;
  kind: StageKind;
}

export function WorkflowCard({ artifact, kind }: WorkflowCardProps) {
  const advanceStatus = useWorkflowStore((s) => s.advanceStatus);
  const openDrawer = useWorkflowStore((s) => s.openDrawer);
  const getAllowed = useWorkflowStore((s) => s.getAllowed);
  const pendingUpdates = useWorkflowStore((s) => s.pendingUpdates);
  const [allowed, setAllowed] = useState<string[]>([]);
  const { toast } = useToast();

  const status = artifact.Status || 'draft';
  const isPending = pendingUpdates.has(artifact.Path);

  useEffect(() => {
    void getAllowed(status).then(setAllowed);
  }, [status, getAllowed]);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: artifact.Path,
      data: { type: 'card', kind, status, artifact },
      disabled: isPending,
    });

  async function handleSelect(newStatus: string) {
    if (newStatus === status) return;
    if (!allowed.includes(newStatus)) return;
    try {
      await advanceStatus(artifact.Path, newStatus);
      toast({
        title: `${artifact.ID} → ${newStatus}`,
        description: `${kind} status updated.`,
      });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: String(e),
        variant: 'destructive',
      });
    }
  }

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="article"
      aria-roledescription="card"
      className={cn(
        'group relative flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs',
        'hover:border-primary/40 transition-colors',
        isDragging && 'opacity-30',
        isPending && 'opacity-60 cursor-wait',
      )}
    >
      <button
        type="button"
        onClick={() => openDrawer(artifact.Path)}
        className="flex flex-col gap-1 text-left"
        {...listeners}
        {...attributes}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {artifact.ID}
          </span>
          <div className="flex items-center gap-1">
            <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {STAGES.find((s) => s.kind === kind)?.label ?? kind}
            </span>
            <span
              className={cn(
                'inline-block rounded px-1.5 py-0.5 text-[10px]',
                STATUS_BADGE[status] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {status}
            </span>
          </div>
        </div>
        <div className="line-clamp-1 text-foreground" title={artifact.Title}>
          {artifact.Title || artifact.Slug || '—'}
        </div>
        {artifact.Updated && (
          <time className="text-[10px] text-muted-foreground">
            {artifact.Updated}
          </time>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-5 w-5 opacity-0 group-hover:opacity-100"
            aria-label="Status actions"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ALL_STATUSES.map((s) => {
            const enabled = allowed.includes(s) && s !== status;
            return (
              <DropdownMenuItem
                key={s}
                disabled={!enabled}
                onClick={() => void handleSelect(s)}
                className="capitalize"
              >
                Mark as {s}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
