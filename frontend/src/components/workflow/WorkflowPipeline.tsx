import { useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/stores/workflow';
import { WorkflowRow } from './WorkflowRow';
import { WorkflowDrawer } from './WorkflowDrawer';
import { IMPLEMENTATION_LABEL, STAGES } from './stages';
import { type Meta } from '../../../wailsjs/go/main/App';

export function WorkflowPipeline() {
  const rows = useWorkflowStore((s) => s.rows);
  const loading = useWorkflowStore((s) => s.loading);
  const error = useWorkflowStore((s) => s.error);
  const loadAll = useWorkflowStore((s) => s.loadAll);
  const advanceStatus = useWorkflowStore((s) => s.advanceStatus);
  const getAllowed = useWorkflowStore((s) => s.getAllowed);
  const [activeArtifact, setActiveArtifact] = useState<Meta | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { artifact?: Meta } | undefined;
    setActiveArtifact(data?.artifact ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveArtifact(null);
    if (!e.over) return;
    const path = String(e.active.id);
    const targetStatus = String(e.over.id).split(':').pop() ?? '';
    const data = e.active.data.current as { status?: string } | undefined;
    if (!data || !targetStatus || targetStatus === data.status) return;
    const allowed = await getAllowed(data.status ?? '');
    if (!allowed.includes(targetStatus)) {
      toast({
        title: 'Invalid transition',
        description: `Cannot go from ${data.status} to ${targetStatus}`,
        variant: 'destructive',
      });
      return;
    }
    try {
      await advanceStatus(path, targetStatus);
      toast({
        title: 'Status updated',
        description: `${data.status} → ${targetStatus}`,
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: String(err),
        variant: 'destructive',
      });
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

  return (
    <section
      aria-label="Workflow pipeline"
      className="flex flex-1 flex-col overflow-auto"
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-card">
            <tr>
              <th className="w-32 px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground border-b border-r border-border">
                Feature
              </th>
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
            {rows.map((row) => (
              <WorkflowRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
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
          ) : null}
        </DragOverlay>
      </DndContext>
      <WorkflowDrawer />
    </section>
  );
}
