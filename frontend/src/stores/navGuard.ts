// Nav-guard store : intercepte les actions de navigation quand
// l'éditeur a des modifs en cours qui seraient perdues. Deux états
// déclenchent le blocage :
//   1. `useSpddEditorStore.isDirty === true` — modifs draft non
//      sauvegardées (badge orange « modifié non sauvé »).
//   2. `useRestructureStore.open === true` — overlay restructure IA
//      actif, conversation chat en cours qui serait perdue.
//
// Le guard lit lui-même les deux stores (au lieu d'attendre un
// boolean en paramètre) — single source of truth, pas de risque
// d'oubli côté call-site.
//
// Workflow modal :
//   - Quitter sans sauver → reset isDirty + close restructure
//     overlay + cancel session, puis exécute l'action.
//   - Annuler → drop l'action, on reste où on est.

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { useSpddEditorStore } from '@/stores/spdd';
import { useRestructureStore } from '@/stores/restructure';

interface NavGuardState {
  /** Action navigation en attente. null = pas de modal. */
  pendingAction: (() => void) | null;

  /**
   * Wrap d'une action navigation. Lit lui-même les flags
   * `isDirty` (spdd store) et `restructureOpen` (restructure
   * store). Si l'un des deux est true, l'action est queued et
   * le modal s'ouvre. Sinon exécution immédiate.
   */
  guard: (action: () => void) => void;

  /**
   * Confirme : reset les flags + ferme la restructure overlay,
   * puis exécute l'action en attente. Le SpddEditor verra le
   * nouveau selectedPath et rechargera proprement.
   */
  confirm: () => void;

  /** Annule : drop l'action en attente. */
  cancel: () => void;
}

export const useNavGuardStore = create<NavGuardState>((set, get) => ({
  pendingAction: null,

  guard(action) {
    const isDirty = useSpddEditorStore.getState().isDirty;
    const restructureOpen = useRestructureStore.getState().open;
    logger.debug('navGuard.guard called', { isDirty, restructureOpen });
    if (!isDirty && !restructureOpen) {
      action();
      return;
    }
    set({ pendingAction: action });
  },

  confirm() {
    const action = get().pendingAction;
    set({ pendingAction: null });
    // Reset des flags / overlays pour que le rechargement du
    // SpddEditor (post-action) parte d'un état propre.
    useSpddEditorStore.getState().setDirty(false);
    useRestructureStore.getState().closeOverlay();
    if (action) action();
  },

  cancel() {
    set({ pendingAction: null });
  },
}));
