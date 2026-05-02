import { create } from 'zustand';

export type GenerationPhase = 'idle' | 'running' | 'success' | 'error';

interface GenerationState {
  phase: GenerationPhase;
  currentLabel: string;
  error: string;
  lastResult: { path: string; durationMs: number } | null;
  startedAt: number;

  start: (label: string) => void;
  succeed: (path: string, durationMs: number) => void;
  fail: (error: string) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  phase: 'idle',
  currentLabel: '',
  error: '',
  lastResult: null,
  startedAt: 0,
  start: (label) =>
    set({
      phase: 'running',
      currentLabel: label,
      error: '',
      startedAt: Date.now(),
    }),
  succeed: (path, durationMs) =>
    set({
      phase: 'success',
      lastResult: { path, durationMs },
      currentLabel: '',
    }),
  fail: (error) =>
    set({
      phase: 'error',
      error,
      currentLabel: '',
    }),
  reset: () =>
    set({
      phase: 'idle',
      currentLabel: '',
      error: '',
      startedAt: 0,
    }),
}));
