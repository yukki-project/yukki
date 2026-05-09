import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { WorkflowCard } from './WorkflowCard';
import {
  COLUMN_LABELS,
  type ColumnState,
  type WorkflowItem,
} from '@/stores/workflow';

interface WorkflowColumnProps {
  state: ColumnState;
  items: WorkflowItem[];
}

export function WorkflowColumn({ state, items }: WorkflowColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${state}`,
    data: { type: 'column', state },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex h-10 items-center border-b border-ykp-line bg-ykp-bg-elevated px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ykp-text-muted">
          {COLUMN_LABELS[state]}
        </span>
        <span className="ml-2 text-xs text-ykp-text-muted/50">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 p-2 transition-colors',
          isOver && 'bg-ykp-primary/5',
        )}
        aria-label={`${COLUMN_LABELS[state]} column`}
      >
        {items.map((item) => (
          <WorkflowCard
            key={item.id}
            artifact={item.active}
            kind={item.activeKind}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center text-xs text-ykp-text-muted/30 py-4">
            —
          </div>
        )}
      </div>
    </div>
  );
}
