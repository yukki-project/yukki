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

export type ColumnState =
  | 'stories'
  | 'analysis'
  | 'prompts'
  | 'implementation'
  | 'tests';

export const COLUMN_ORDER: ColumnState[] = [
  'stories',
  'analysis',
  'prompts',
  'implementation',
  'tests',
];

export const COLUMN_LABELS: Record<ColumnState, string> = {
  stories: 'Story',
  analysis: 'Analysis',
  prompts: 'Canvas',
  implementation: 'Implementation',
  tests: 'Tests',
};

export interface WorkflowItem {
  id: string;
  state: ColumnState;
  activeKind: StageKind;
  active: Meta;
  cells: Partial<Record<StageKind, Meta>>;
}

export interface CreateModalState {
  open: boolean;
  sourceArtifact: Meta | null;
  nextKind: StageKind | null;
}

interface WorkflowState {
  columns: Record<ColumnState, WorkflowItem[]>;
  loading: boolean;
  error: string | null;
  pendingUpdates: Set<string>;
  drawerPath: string | null;
  transitionsCache: Map<string, string[]>;
  createModal: CreateModalState;

  loadAll: () => Promise<void>;
  advanceStatus: (path: string, newStatus: string) => Promise<void>;
  openDrawer: (path: string) => void;
  closeDrawer: () => void;
  openCreateModal: (sourceArtifact: Meta, nextKind: StageKind) => void;
  closeCreateModal: () => void;
  getAllowed: (currentStatus: string) => Promise<string[]>;
}

function emptyColumns(): Record<ColumnState, WorkflowItem[]> {
  return {
    stories: [],
    analysis: [],
    prompts: [],
    implementation: [],
    tests: [],
  };
}

function deriveState(cells: Partial<Record<StageKind, Meta>>): {
  state: ColumnState;
  activeKind: StageKind;
  active: Meta;
} | null {
  if (cells.tests) {
    return { state: 'tests', activeKind: 'tests', active: cells.tests };
  }
  if (cells.prompts) {
    const status = cells.prompts.Status;
    const state: ColumnState =
      status === 'implemented' || status === 'synced'
        ? 'implementation'
        : 'prompts';
    return { state, activeKind: 'prompts', active: cells.prompts };
  }
  if (cells.analysis) {
    return { state: 'analysis', activeKind: 'analysis', active: cells.analysis };
  }
  if (cells.stories) {
    return { state: 'stories', activeKind: 'stories', active: cells.stories };
  }
  if (cells.inbox) {
    return { state: 'stories', activeKind: 'inbox', active: cells.inbox };
  }
  if (cells.epics) {
    return { state: 'stories', activeKind: 'epics', active: cells.epics };
  }
  if (cells.roadmap) {
    return { state: 'stories', activeKind: 'roadmap', active: cells.roadmap };
  }
  return null;
}

function itemPriority(item: WorkflowItem): number {
  const p = item.cells.stories?.Priority ?? 0;
  return p > 0 ? p : Number.POSITIVE_INFINITY;
}

function sortItems(items: WorkflowItem[]): WorkflowItem[] {
  return [...items].sort((a, b) => {
    const pa = itemPriority(a);
    const pb = itemPriority(b);
    if (pa !== pb) return pa - pb;
    const ua = a.active.Updated ?? '';
    const ub = b.active.Updated ?? '';
    if (ua < ub) return 1;
    if (ua > ub) return -1;
    return 0;
  });
}

function buildColumns(
  arrays: Meta[][],
): Record<ColumnState, WorkflowItem[]> {
  const byId = new Map<string, Partial<Record<StageKind, Meta>>>();
  KINDS.forEach((kind, i) => {
    for (const meta of arrays[i] ?? []) {
      const id = meta.ID || meta.Slug || meta.Path;
      const cells = byId.get(id) ?? {};
      cells[kind] = meta;
      byId.set(id, cells);
    }
  });

  const columns = emptyColumns();
  for (const [id, cells] of byId.entries()) {
    const derived = deriveState(cells);
    if (!derived) continue;
    columns[derived.state].push({
      id,
      state: derived.state,
      activeKind: derived.activeKind,
      active: derived.active,
      cells,
    });
  }
  for (const state of COLUMN_ORDER) {
    columns[state] = sortItems(columns[state]);
  }
  return columns;
}

function findItemByPath(
  columns: Record<ColumnState, WorkflowItem[]>,
  path: string,
): WorkflowItem | null {
  for (const state of COLUMN_ORDER) {
    const found = columns[state].find((it) => it.active.Path === path);
    if (found) return found;
  }
  return null;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  columns: emptyColumns(),
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
      set({ columns: buildColumns(arrays), loading: false });
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

    const prevColumns = get().columns;
    // Optimistic: mutate the active.Status of the item
    const newColumns = COLUMN_ORDER.reduce((acc, state) => {
      acc[state] = prevColumns[state].map((it) =>
        it.active.Path === path
          ? {
              ...it,
              active: { ...it.active, Status: newStatus },
              cells: {
                ...it.cells,
                [it.activeKind]: { ...it.active, Status: newStatus },
              },
            }
          : it,
      );
      return acc;
    }, emptyColumns());
    set({ columns: newColumns });

    try {
      await UpdateArtifactStatus(path, newStatus);
      // Reload to pick up state change (e.g. canvas.implemented → moves to
      // Implementation column).
      await get().loadAll();
      void useArtifactsStore.getState().refresh();
    } catch (e) {
      set({ columns: prevColumns, error: String(e) });
      throw e;
    } finally {
      const still = new Set(get().pendingUpdates);
      still.delete(path);
      set({ pendingUpdates: still });
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

// Reserved for future column-priority manual reorder (V2).
void UpdateArtifactPriority;
void findItemByPath;
