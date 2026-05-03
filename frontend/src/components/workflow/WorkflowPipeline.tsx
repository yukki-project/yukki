import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/stores/workflow';
import { WorkflowRow } from './WorkflowRow';
import { WorkflowDrawer } from './WorkflowDrawer';
import { CreateNextStageModal } from './CreateNextStageModal';
import { IMPLEMENTATION_LABEL, STAGES, type StageKind } from './stages';
import { type Meta } from '../../../wailsjs/go/main/App';

interface DragData {
  type: 'card' | 'row';
  status?: string;
  artifact?: Meta;
}

interface DropData {
  type: 'next-stage-target';
  rowId: string;
  kind: StageKind;
  gatingOpen: boolean;
}

export function WorkflowPipeline() {
  const rows = useWorkflowStore((s) => s.rows);
  const loading = useWorkflowStore((s) => s.loading);
  const error = useWorkflowStore((s) => s.error);
  const loadAll = useWorkflowStore((s) => s.loadAll);
  const reorderRows = useWorkflowStore((s) => s.reorderRows);
  const createModal = useWorkflowStore((s) => s.createModal);
  const openCreateModal = useWorkflowStore((s) => s.openCreateModal);
  const closeCreateModal = useWorkflowStore((s) => s.closeCreateModal);
  const [activeArtifact, setActiveArtifact] = useState<Meta | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragData | undefined;
    if (data?.type === 'row') {
      setActiveRowId(String(e.active.id));
    } else {
      setActiveArtifact(data?.artifact ?? null);
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as DragData | undefined;
    setActiveArtifact(null);
    setActiveRowId(null);

    // Row reorder
    if (data?.type === 'row' && e.over && e.active.id !== e.over.id) {
      const fromIdx = rows.findIndex((r) => r.id === e.active.id);
      const toIdx = rows.findIndex((r) => r.id === e.over!.id);
      if (fromIdx === -1 || toIdx === -1) return;
      try {
        await reorderRows(fromIdx, toIdx);
        toast({
          title: 'Reordered',
          description: `Moved ${e.active.id} to position ${toIdx + 1}.`,
        });
      } catch (err) {
        toast({
          title: 'Reorder failed',
          description: String(err),
          variant: 'destructive',
        });
      }
      return;
    }

    // Card drop on next-stage target
    if (data?.type === 'card' && e.over) {
      const dropData = e.over.data.current as DropData | undefined;
      if (dropData?.type === 'next-stage-target') {
        if (!dropData.gatingOpen) {
          toast({
            title: 'Mark previous stage as reviewed first',
            description: `Status of the active artifact must be ≥ reviewed before creating the next stage.`,
            variant: 'destructive',
          });
          return;
        }
        if (data.artifact) {
          openCreateModal(data.artifact, dropData.kind);
        }
      }
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          No SPDD artifacts yet. Run <code className="font-mono">/spdd-story</code>{' '}
          to create one.
        </p>
      </div>
    );
  }

  const activeRow = activeRowId ? rows.find((r) => r.id === activeRowId) : null;

  return (
    <section
      aria-label="Workflow pipeline"
      className="flex flex-1 flex-col overflow-auto"
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext
          items={rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr>
                <th className="w-12 px-1 py-2 border-b border-border" aria-label="Reorder" />
                {STAGES.map((s) => (
                  <th
                    key={s.kind}
                    className="px-2 py-2 text-left text-xs font-semibold uppercase text-muted-foreground border-b border-border"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-muted-foreground border-b border-border">
                  {IMPLEMENTATION_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <WorkflowRow key={row.id} row={row} index={i} />
              ))}
            </tbody>
          </table>
        </SortableContext>
        <DragOverlay>
          {activeArtifact ? (
            <div className="rounded-md border border-primary bg-card p-2 text-xs shadow-lg shadow-primary/30">
              <div className="font-mono text-[10px] text-muted-foreground">
                {activeArtifact.ID}
              </div>
              <div className="text-foreground line-clamp-1">
                {activeArtifact.Title}
              </div>
            </div>
          ) : activeRow ? (
            <div className="rounded-md border border-primary bg-card px-3 py-2 text-xs shadow-lg shadow-primary/30">
              <span className="font-mono text-foreground">{activeRow.id}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <WorkflowDrawer />
      <CreateNextStageModal
        open={createModal.open}
        onOpenChange={(v) => {
          if (!v) closeCreateModal();
        }}
        sourceArtifact={createModal.sourceArtifact}
        nextKind={createModal.nextKind ?? 'analysis'}
      />
    </section>
  );
}
