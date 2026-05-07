import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useArtifactsStore } from './artifacts';

export type ShellMode =
  | 'stories'
  | 'analysis'
  | 'prompts'
  | 'tests'
  | 'inbox'   // META-005
  | 'epics'   // META-005
  | 'roadmap' // META-005
  | 'settings'
  | 'workflow';
  // UI-016: 'editor' supprimé — ArtifactEditor remplace SpddEditor+StoryViewer

// 'workflow' et 'editor' volontairement non inclus : ils ne pilotent pas
// useArtifactsStore.setKind (Invariant I3 UI-006 + I2 UI-008).
const SPDD_KINDS: ShellMode[] = [
  'stories',
  'analysis',
  'prompts',
  'tests',
  'inbox',   // META-005
  'epics',   // META-005
  'roadmap', // META-005
];

interface ShellState {
  activeMode: ShellMode;
  sidebarOpen: boolean;
  showArchived: boolean;

  setActiveMode: (mode: ShellMode) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  setShowArchived: (v: boolean) => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set, get) => ({
      activeMode: 'stories',
      sidebarOpen: true,
      showArchived: false,

      setActiveMode: (mode) => {
        const { activeMode, sidebarOpen } = get();
        if (mode === activeMode && sidebarOpen) {
          set({ sidebarOpen: false });
          return;
        }
        set({ activeMode: mode, sidebarOpen: true });
        if (SPDD_KINDS.includes(mode)) {
          useArtifactsStore.getState().setKind(mode);
        }
      },

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      closeSidebar: () => set({ sidebarOpen: false }),
      openSidebar: () => set({ sidebarOpen: true }),
      setShowArchived: (v) => set({ showArchived: v }),
    }),
    {
      name: 'yukki:shell-prefs',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // UI-015: 'editor' mode retired from ActivityBar — redirect to stories
        if ((state.activeMode as string) === 'editor') {
          state.activeMode = 'stories';
        }
        if (SPDD_KINDS.includes(state.activeMode)) {
          useArtifactsStore.getState().setKind(state.activeMode);
        }
      },
    },
  ),
);
