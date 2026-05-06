// UI-009 — useTabsStore : état des projets ouverts (tabs).
// Source de vérité = backend (pas de persist middleware côté front).
import { create } from 'zustand';

export interface ProjectTab {
  path: string;
  name: string;
  lastOpened: string; // ISO8601
}

interface TabsState {
  openedProjects: ProjectTab[];
  activeIndex: number; // -1 = no project open
  recentProjects: ProjectTab[];

  addProject: (meta: ProjectTab) => void;
  removeProject: (idx: number) => void;
  setActive: (idx: number) => void;
  reorderProjects: (order: number[]) => void;
  setOpenedProjects: (projects: ProjectTab[], activeIndex: number) => void;
  setRecentProjects: (projects: ProjectTab[]) => void;
}

export const useTabsStore = create<TabsState>()((set) => ({
  openedProjects: [],
  activeIndex: -1,
  recentProjects: [],

  addProject: (meta) =>
    set((state) => ({
      openedProjects: [...state.openedProjects, meta],
      activeIndex: state.openedProjects.length, // new tab is last
    })),

  removeProject: (idx) =>
    set((state) => {
      const next = state.openedProjects.filter((_, i) => i !== idx);
      let newActive = state.activeIndex;
      if (next.length === 0) {
        newActive = -1;
      } else {
        if (idx <= state.activeIndex) newActive--;
        if (newActive < 0) newActive = 0;
      }
      return { openedProjects: next, activeIndex: newActive };
    }),

  setActive: (idx) => set({ activeIndex: idx }),

  reorderProjects: (order) =>
    set((state) => {
      const reordered = order.map((i) => state.openedProjects[i]);
      const newActive = order.indexOf(state.activeIndex);
      return { openedProjects: reordered, activeIndex: newActive };
    }),

  setOpenedProjects: (projects, activeIndex) =>
    set({ openedProjects: projects, activeIndex }),

  setRecentProjects: (projects) => set({ recentProjects: projects }),
}));

/** Selector: returns the active ProjectTab or null when no project is open. */
export function activeProject(state: TabsState): ProjectTab | null {
  if (state.activeIndex < 0 || state.activeIndex >= state.openedProjects.length) {
    return null;
  }
  return state.openedProjects[state.activeIndex];
}

// Re-export for convenience in components.
export type { TabsState };
