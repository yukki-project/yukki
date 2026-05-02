import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useArtifactsStore } from './artifacts';

export type ShellMode = 'stories' | 'analysis' | 'prompts' | 'tests' | 'settings' | 'workflow';

// 'workflow' volontairement non inclus : le mode workflow ne touche pas
// useArtifactsStore.setKind (Invariant I3 UI-006 + I2 UI-008).
const SPDD_KINDS: ShellMode[] = ['stories', 'analysis', 'prompts', 'tests'];

interface ShellState {
  activeMode: ShellMode;
  sidebarOpen: boolean;

  setActiveMode: (mode: ShellMode) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set, get) => ({
      activeMode: 'stories',
      sidebarOpen: true,

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
    }),
    {
      name: 'yukki:shell-prefs',
      onRehydrateStorage: () => (state) => {
        if (state && SPDD_KINDS.includes(state.activeMode)) {
          useArtifactsStore.getState().setKind(state.activeMode);
        }
      },
    },
  ),
);
