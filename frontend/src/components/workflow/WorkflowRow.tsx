import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowCard } from './WorkflowCard';
import { CreateNextStageModal } from './CreateNextStageModal';
import {
  IMPLEMENTATION_LABEL,
  KINDS,
  type StageKind,
} from './stages';
import { type WorkflowRow as WorkflowRowType } from '@/stores/workflow';

interface WorkflowRowProps {
  row: WorkflowRowType;
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

export function WorkflowRow({ row }: WorkflowRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetKind, setTargetKind] = useState<StageKind>('analysis');

  const activeIdx = mostAdvancedIndex(row);
  const activeKind = activeIdx >= 0 ? KINDS[activeIdx] : null;
  const activeCell = activeKind ? row.cells[activeKind] : null;
  const gatingOpen =
    !!activeCell && REVIEWED_OR_BEYOND.has(activeCell.Status);
  const sourceArtifact = activeCell ?? null;

  function openCreate(kind: StageKind) {
    setTargetKind(kind);
    setModalOpen(true);
  }

  const promptsCell = row.cells.prompts;
  const isImplemented =
    !!promptsCell &&
    (promptsCell.Status === 'implemented' || promptsCell.Status === 'synced');

  return (
    <>
      <tr className="border-b border-border last:border-b-0">
        <th className="sticky left-0 z-10 w-32 bg-card px-3 py-2 text-left text-xs font-mono text-muted-foreground border-r border-border">
          {row.id}
        </th>
        {KINDS.map((kind, i) => {
          // Active cell : show the card.
          if (i === activeIdx) {
            return (
              <td key={kind} className="p-2 align-top">
                <WorkflowCard artifact={row.cells[kind]!} kind={kind} />
              </td>
            );
          }
          // Past cell : discreet placeholder.
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
          // Next-action cell : Plus if gating open.
          if (i === activeIdx + 1) {
            return (
              <td key={kind} className="p-2 align-top">
                <button
                  type="button"
                  disabled={!gatingOpen}
                  onClick={() => gatingOpen && openCreate(kind)}
                  title={
                    gatingOpen
                      ? `Create ${kind}`
                      : 'Mark previous stage as reviewed first'
                  }
                  className={cn(
                    'flex h-16 w-full items-center justify-center rounded-md border border-dashed',
                    gatingOpen
                      ? 'border-primary/40 text-primary hover:bg-primary/10'
                      : 'border-transparent text-muted-foreground/30 cursor-not-allowed',
                  )}
                >
                  {gatingOpen && <Plus className="h-4 w-4" />}
                </button>
              </td>
            );
          }
          // Far future cell : empty.
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
      <CreateNextStageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sourceArtifact={sourceArtifact}
        nextKind={targetKind}
      />
    </>
  );
}
