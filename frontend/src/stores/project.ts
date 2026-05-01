import { create } from 'zustand';

interface ProjectState {
  projectDir: string;
  hasSpdd: boolean;
  setProjectDir: (dir: string) => void;
  setHasSpdd: (yes: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectDir: '',
  hasSpdd: false,
  setProjectDir: (dir) => set({ projectDir: dir }),
  setHasSpdd: (yes) => set({ hasSpdd: yes }),
}));
