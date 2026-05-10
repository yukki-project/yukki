// UI-019 O6 — Zustand store for the restructuration overlay.
//
// Holds the open/closed state of the Inspector overlay, the diff
// preview buffer (before/after markdown), and the final markdown
// post-acceptance (pre-Ctrl+S — the actual disk write stays
// manual, cf. story Q5).
//
// The chat history and the streaming state machine live in the
// hook (`useRestructureSession`) so the store stays focused on
// the user-facing diff approval flow.

import { create } from 'zustand';

interface RestructureState {
  /** True while the Inspector overlay should replace its normal content. */
  open: boolean;

  /** Snapshot of the artefact body just before clicking "Restructurer". */
  before: string | null;

  /** Latest LLM-rendered restructuration; null until done. */
  after: string | null;

  openOverlay: (before: string) => void;
  setAfter: (after: string) => void;

  /**
   * Accept consumes the current `after`, returns it, and resets the
   * overlay state. The caller (SpddEditor) is responsible for
   * applying the markdown to the draft and flipping `isDirty`.
   */
  accept: () => string | null;

  /** Refuse drops the diff and closes the overlay; draft untouched. */
  refuse: () => void;

  /** Equivalent to refuse() — used when the user closes without choosing. */
  closeOverlay: () => void;

  /** Hard reset (used by tests and by "Recommencer" in chat exhausted mode). */
  reset: () => void;
}

const INITIAL: Pick<RestructureState, 'open' | 'before' | 'after'> = {
  open: false,
  before: null,
  after: null,
};

export const useRestructureStore = create<RestructureState>((set, get) => ({
  ...INITIAL,

  openOverlay(before) {
    set({ open: true, before, after: null });
  },

  setAfter(after) {
    set({ after });
  },

  accept() {
    const a = get().after;
    set({ ...INITIAL });
    return a;
  },

  refuse() {
    set({ ...INITIAL });
  },

  closeOverlay() {
    set({ ...INITIAL });
  },

  reset() {
    set({ ...INITIAL });
  },
}));
