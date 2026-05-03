import { GripVertical } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { WorkflowCard } from './WorkflowCard';
import {
  IMPLEMENTATION_LABEL,
  KINDS,
  type StageKind,
} from './stages';
import { type WorkflowRow as WorkflowRowType } from '@/stores/workflow';

interface WorkflowRowProps {
  row: WorkflowRowType;
  index: number;
}

const REVIEWED_OR_BEYOND = new Set([
  'reviewed',
  'accepted',
  'implemented',
  'synced',
]);

function mostAdvancedIndex(row: WorkflowRowType): number {
  let last = -1;
  KINDS.forEach((kind, i) => {
    if (row.cells[kind]) last = i;
  });
  return last;
}

interface NextStageDropTargetProps {
  row: WorkflowRowType;
  kind: StageKind;
  gatingOpen: boolean;
}

function NextStageDropTarget({ row, kind, gatingOpen }: NextStageDropTargetProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${row.id}:next:${kind}`,
    data: { type: 'next-stage-target', rowId: row.id, kind, gatingOpen },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-16 w-full items-center justify-center rounded-md border border-dashed transition-colors',
        isOver && gatingOpen && 'border-primary bg-primary/10',
        isOver && !gatingOpen && 'border-destructive/50 bg-destructive/10',
        !isOver && 'border-border/40',
      )}
      aria-label={`Drop card here to create ${kind}`}
    />
  );
}

export function WorkflowRow({ row, index }: WorkflowRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    data: { type: 'row' },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const activeIdx = mostAdvancedIndex(row);
  const activeKind = activeIdx >= 0 ? KINDS[activeIdx] : null;
  const activeCell = activeKind ? row.cells[activeKind] : null;
  const gatingOpen =
    !!activeCell && REVIEWED_OR_BEYOND.has(activeCell.Status);

  const promptsCell = row.cells.prompts;
  const isImplemented =
    !!promptsCell &&
    (promptsCell.Status === 'implemented' || promptsCell.Status === 'synced');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-border last:border-b-0',
        isDragging && 'opacity-40',
      )}
    >
      <td className="w-12 px-1 py-2 align-middle">
        <div className="flex items-center justify-center gap-1">
          <span className="font-mono text-xs text-muted-foreground/50 w-4 text-right">
            {index + 1}.
          </span>
          <button
            type="button"
            className="cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag to reorder ${row.id}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </td>
      {KINDS.map((kind, i) => {
        if (i === activeIdx) {
          return (
            <td key={kind} className="p-2 align-top">
              <WorkflowCard artifact={row.cells[kind]!} kind={kind} />
            </td>
          );
        }
        if (i < activeIdx) {
          return (
            <td
              key={kind}
              className="p-2 align-middle text-center text-muted-foreground/40"
            >
              —
            </td>
          );
        }
        if (i === activeIdx + 1) {
          return (
            <td key={kind} className="p-2 align-top">
              <NextStageDropTarget
                row={row}
                kind={kind}
                gatingOpen={gatingOpen}
              />
            </td>
          );
        }
        return <td key={kind} className="p-2 align-top" />;
      })}
      <td className="p-2 align-top">
        {isImplemented ? (
          <div
            className="flex h-16 w-full items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 text-xs text-green-700 dark:text-green-300"
            title={`${IMPLEMENTATION_LABEL} ✓`}
          >
            ✓ implemented
          </div>
        ) : (
          <div className="h-16" />
        )}
      </td>
    </tr>
  );
}
