import { create } from 'zustand';
import { ListArtifacts, type Meta } from '../../wailsjs/go/main/App';

interface ArtifactsState {
  kind: string;
  items: Meta[];
  selectedPath: string;
  error: string | null;
  setKind: (k: string) => void;
  setSelectedPath: (p: string) => void;
  refresh: () => Promise<void>;
}

export const useArtifactsStore = create<ArtifactsState>((set, get) => ({
  kind: 'stories',
  items: [],
  selectedPath: '',
  error: null,
  // @internal — call only via useShellStore.setActiveMode (UI-006 I4)
  setKind: (k) => {
    set({ kind: k, selectedPath: '' });
    void get().refresh();
  },
  setSelectedPath: (p) => set({ selectedPath: p }),
  refresh: async () => {
    try {
      const items = await ListArtifacts(get().kind);
      set({ items, error: null });
    } catch (e) {
      set({ items: [], error: String(e) });
    }
  },
}));
