import { create } from 'zustand';
import {
  AllowedTransitions,
  ListArtifacts,
  UpdateArtifactPriority,
  UpdateArtifactStatus,
  type Meta,
} from '../../wailsjs/go/main/App';
import { useArtifactsStore } from './artifacts';
import { KINDS, type StageKind } from '../components/workflow/stages';

export interface WorkflowRow {
  id: string;
  cells: Partial<Record<StageKind, Meta>>;
  updated: string;
}

export interface CreateModalState {
  open: boolean;
  sourceArtifact: Meta | null;
  nextKind: StageKind | null;
}

interface WorkflowState {
  rows: WorkflowRow[];
  loading: boolean;
  error: string | null;
  pendingUpdates: Set<string>;
  drawerPath: string | null;
  transitionsCache: Map<string, string[]>;
  createModal: CreateModalState;

  loadAll: () => Promise<void>;
  advanceStatus: (path: string, newStatus: string) => Promise<void>;
  reorderRows: (fromIdx: number, toIdx: number) => Promise<void>;
  openDrawer: (path: string) => void;
  closeDrawer: () => void;
  openCreateModal: (sourceArtifact: Meta, nextKind: StageKind) => void;
  closeCreateModal: () => void;
  getAllowed: (currentStatus: string) => Promise<string[]>;
}

function rowPriority(row: WorkflowRow): number {
  const p = row.cells.stories?.Priority ?? 0;
  return p > 0 ? p : Number.POSITIVE_INFINITY;
}

function sortRows(rows: WorkflowRow[]): WorkflowRow[] {
  return [...rows].sort((a, b) => {
    const pa = rowPriority(a);
    const pb = rowPriority(b);
    if (pa !== pb) return pa - pb;
    if (a.updated < b.updated) return 1;
    if (a.updated > b.updated) return -1;
    return 0;
  });
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  pendingUpdates: new Set<string>(),
  drawerPath: null,
  transitionsCache: new Map<string, string[]>(),
  createModal: { open: false, sourceArtifact: null, nextKind: null },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const arrays = await Promise.all(KINDS.map((k) => ListArtifacts(k)));
      const byId = new Map<string, WorkflowRow>();
      KINDS.forEach((kind, i) => {
        for (const meta of arrays[i] ?? []) {
          const id = meta.ID || meta.Slug || meta.Path;
          const row: WorkflowRow = byId.get(id) ?? {
            id,
            cells: {},
            updated: '',
          };
          row.cells[kind] = meta;
          if (meta.Updated && meta.Updated > row.updated) {
            row.updated = meta.Updated;
          }
          byId.set(id, row);
        }
      });
      const rows = sortRows(Array.from(byId.values()));
      set({ rows, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  advanceStatus: async (path, newStatus) => {
    const pending = get().pendingUpdates;
    if (pending.has(path)) return;
    const next = new Set(pending);
    next.add(path);
    set({ pendingUpdates: next });

    const prevRows = get().rows;
    const newRows = prevRows.map((row) => {
      const newCells = { ...row.cells };
      for (const kind of KINDS) {
        const cell = newCells[kind];
        if (cell?.Path === path) {
          newCells[kind] = { ...cell, Status: newStatus };
          break;
        }
      }
      return { ...row, cells: newCells };
    });
    set({ rows: newRows });

    try {
      await UpdateArtifactStatus(path, newStatus);
      void useArtifactsStore.getState().refresh();
    } catch (e) {
      set({ rows: prevRows, error: String(e) });
      throw e;
    } finally {
      const still = new Set(get().pendingUpdates);
      still.delete(path);
      set({ pendingUpdates: still });
    }
  },

  reorderRows: async (fromIdx, toIdx) => {
    const current = get().rows;
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= current.length) return;
    if (toIdx < 0 || toIdx >= current.length) return;

    // Compute new visual order
    const reordered = [...current];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Renumerate priorities 1..N over the new order
    const updates: Array<{ path: string; priority: number; row: WorkflowRow }> = [];
    const optimistic = reordered.map((row, idx) => {
      const newPriority = idx + 1;
      const story = row.cells.stories;
      if (!story) {
        return row; // orphan: no story, can't persist priority
      }
      const oldPriority = story.Priority ?? 0;
      const newCells = { ...row.cells };
      newCells.stories = { ...story, Priority: newPriority };
      if (oldPriority !== newPriority) {
        updates.push({ path: story.Path, priority: newPriority, row });
      }
      return { ...row, cells: newCells };
    });

    // Optimistic
    set({ rows: optimistic });

    try {
      await Promise.all(
        updates.map((u) => UpdateArtifactPriority(u.path, u.priority)),
      );
      // Re-sort to make sure the order matches priority asc (it should
      // already, but defensive)
      set({ rows: sortRows(optimistic) });
      void useArtifactsStore.getState().refresh();
    } catch (e) {
      // Rollback
      set({ rows: current, error: String(e) });
      throw e;
    }
  },

  openDrawer: (path) => set({ drawerPath: path }),
  closeDrawer: () => set({ drawerPath: null }),

  openCreateModal: (sourceArtifact, nextKind) =>
    set({ createModal: { open: true, sourceArtifact, nextKind } }),
  closeCreateModal: () =>
    set({
      createModal: { open: false, sourceArtifact: null, nextKind: null },
    }),

  getAllowed: async (currentStatus) => {
    const cached = get().transitionsCache.get(currentStatus);
    if (cached) return cached;
    const allowed = await AllowedTransitions(currentStatus);
    const cache = new Map(get().transitionsCache);
    cache.set(currentStatus, allowed);
    set({ transitionsCache: cache });
    return allowed;
  },
}));
