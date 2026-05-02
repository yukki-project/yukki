import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowCard } from './WorkflowCard';
import { CreateNextStageModal } from './CreateNextStageModal';
import {
  IMPLEMENTATION_LABEL,
  KINDS,
  previousStageOf,
  type StageKind,
} from './stages';
import { type WorkflowRow as WorkflowRowType } from '@/stores/workflow';

interface WorkflowRowProps {
  row: WorkflowRowType;
}

const REVIEWED_OR_BEYOND = new Set(['reviewed', 'accepted', 'implemented', 'synced']);

function canCreateStage(row: WorkflowRowType, target: StageKind): boolean {
  const prev = previousStageOf(target);
  if (!prev) return true; // 'stories' has no prerequisite
  const prevCell = row.cells[prev];
  return !!prevCell && REVIEWED_OR_BEYOND.has(prevCell.Status);
}

export function WorkflowRow({ row }: WorkflowRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetKind, setTargetKind] = useState<StageKind>('analysis');

  function openCreate(target: StageKind) {
    setTargetKind(target);
    setModalOpen(true);
  }

  // Source artifact for the modal: the cell of the stage immediately before target.
  const sourceArtifact = (() => {
    const prev = previousStageOf(targetKind);
    return prev ? row.cells[prev] ?? null : null;
  })();

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
        {KINDS.map((kind) => {
          const cell = row.cells[kind];
          if (cell) {
            return (
              <td key={kind} className="p-2 align-top">
                <WorkflowCard artifact={cell} kind={kind} />
              </td>
            );
          }
          const unlocked = canCreateStage(row, kind);
          return (
            <td key={kind} className="p-2 align-top">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && openCreate(kind)}
                title={
                  unlocked
                    ? `Create ${kind}`
                    : 'Complete previous stage first (status must be ≥ reviewed)'
                }
                className={cn(
                  'flex h-16 w-full items-center justify-center rounded-md border border-dashed',
                  unlocked
                    ? 'border-primary/40 text-primary hover:bg-primary/10'
                    : 'border-border text-muted-foreground/50 cursor-not-allowed',
                )}
              >
                {unlocked ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
              </button>
            </td>
          );
        })}
        <td className="p-2 align-top">
          <div
            className={cn(
              'flex h-16 w-full items-center justify-center rounded-md border text-xs',
              isImplemented
                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-border text-muted-foreground/50',
            )}
            title={
              isImplemented
                ? `${IMPLEMENTATION_LABEL} ✓`
                : `${IMPLEMENTATION_LABEL} pending`
            }
          >
            {isImplemented ? '✓ implemented' : '—'}
          </div>
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
