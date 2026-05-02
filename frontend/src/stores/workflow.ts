import { create } from 'zustand';
import {
  AllowedTransitions,
  ListArtifacts,
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

interface WorkflowState {
  rows: WorkflowRow[];
  loading: boolean;
  error: string | null;
  pendingUpdates: Set<string>;
  drawerPath: string | null;
  transitionsCache: Map<string, string[]>;

  loadAll: () => Promise<void>;
  advanceStatus: (path: string, newStatus: string) => Promise<void>;
  openDrawer: (path: string) => void;
  closeDrawer: () => void;
  getAllowed: (currentStatus: string) => Promise<string[]>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  pendingUpdates: new Set<string>(),
  drawerPath: null,
  transitionsCache: new Map<string, string[]>(),

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
      const rows = Array.from(byId.values()).sort((a, b) =>
        a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0,
      );
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

  openDrawer: (path) => set({ drawerPath: path }),
  closeDrawer: () => set({ drawerPath: null }),

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
