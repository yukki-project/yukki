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
import { useToast } from '@/hooks/use-toast';
import {
  COLUMN_LABELS,
  COLUMN_ORDER,
  useWorkflowStore,
  type ColumnState,
  type WorkflowItem,
} from '@/stores/workflow';
import { WorkflowColumn } from './WorkflowColumn';
import { WorkflowDrawer } from './WorkflowDrawer';
import { CreateNextStageModal } from './CreateNextStageModal';
import { type StageKind } from './stages';

interface DragData {
  type: 'card';
  state: ColumnState;
  item: WorkflowItem;
}

interface DropData {
  type: 'column';
  state: ColumnState;
}

const REVIEWED_OR_BEYOND = new Set([
  'reviewed',
  'accepted',
  'implemented',
  'synced',
]);

function nextColumnOf(state: ColumnState): ColumnState | null {
  const idx = COLUMN_ORDER.indexOf(state);
  if (idx === -1 || idx === COLUMN_ORDER.length - 1) return null;
  return COLUMN_ORDER[idx + 1];
}

function nextKindOf(state: ColumnState): StageKind | null {
  if (state === 'stories') return 'analysis';
  if (state === 'analysis') return 'prompts';
  if (state === 'implementation') return 'tests';
  // 'prompts' → implementation is a status change, not artifact creation.
  // 'tests' has no next.
  return null;
}

export function WorkflowPipeline() {
  const columns = useWorkflowStore((s) => s.columns);
  const loading = useWorkflowStore((s) => s.loading);
  const error = useWorkflowStore((s) => s.error);
  const loadAll = useWorkflowStore((s) => s.loadAll);
  const createModal = useWorkflowStore((s) => s.createModal);
  const openCreateModal = useWorkflowStore((s) => s.openCreateModal);
  const closeCreateModal = useWorkflowStore((s) => s.closeCreateModal);
  const [activeItem, setActiveItem] = useState<WorkflowItem | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragData | undefined;
    setActiveItem(data?.item ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveItem(null);
    if (!e.over) return;
    const dragData = e.active.data.current as DragData | undefined;
    const dropData = e.over.data.current as DropData | undefined;
    if (!dragData || dragData.type !== 'card') return;
    if (!dropData || dropData.type !== 'column') return;

    const fromState = dragData.state;
    const toState = dropData.state;
    if (fromState === toState) return; // no-op

    const expectedNext = nextColumnOf(fromState);
    if (toState !== expectedNext) {
      toast({
        title: 'Cannot skip stages',
        description: `Drop on the next column (${
          expectedNext ? COLUMN_LABELS[expectedNext] : 'n/a'
        }).`,
        variant: 'destructive',
      });
      return;
    }

    // Adjacent : prompts → implementation = status change, not artifact creation
    if (fromState === 'prompts' && toState === 'implementation') {
      toast({
        title: 'Mark canvas as implemented via the menu',
        description:
          'Use the card menu (⋯) to mark the canvas status as "implemented".',
        variant: 'destructive',
      });
      return;
    }

    // Gating : status active ≥ reviewed
    const currentStatus = dragData.item.active.Status;
    if (!REVIEWED_OR_BEYOND.has(currentStatus)) {
      toast({
        title: `Mark ${COLUMN_LABELS[fromState]} as reviewed first`,
        description: `Status of ${dragData.item.id} must be ≥ reviewed before creating the next stage.`,
        variant: 'destructive',
      });
      return;
    }

    const nextKind = nextKindOf(fromState);
    if (!nextKind) {
      toast({
        title: 'No next stage',
        description: `${COLUMN_LABELS[fromState]} has no next stage.`,
        variant: 'destructive',
      });
      return;
    }

    openCreateModal(dragData.item.active, nextKind);
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  const totalItems = COLUMN_ORDER.reduce(
    (n, s) => n + columns[s].length,
    0,
  );

  if (loading && totalItems === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          No SPDD artifacts yet. Run{' '}
          <code className="font-mono">/yukki-story</code> to create one.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Workflow Kanban board"
      className="flex flex-1 overflow-hidden"
    >
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-1 divide-x divide-border overflow-auto">
          {COLUMN_ORDER.map((state) => (
            <WorkflowColumn
              key={state}
              state={state}
              items={columns[state]}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div className="rounded-md border border-primary bg-card p-2 text-xs shadow-lg shadow-primary/30">
              <div className="font-mono text-[10px] text-muted-foreground">
                {activeItem.id}
              </div>
              <div className="text-foreground line-clamp-1">
                {activeItem.active.Title}
              </div>
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
