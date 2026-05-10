// UI-023 O8 — central subscriber to the Wails event `yukki:fs:changed`.
//
// One instance must be mounted at the app root (App.tsx). Dispatches
// disk events to the impacted Zustand stores :
//
//   - `useArtifactsStore.refresh()` when the changed file lives under
//     the kind currently displayed in the HubList.
//   - `useSpddEditorStore.setConflictWarning` when the changed file
//     is the one currently open in the SpddEditor and `isDirty`.
//   - `useSpddEditorStore.setDeleted` when the open file is removed.
//
// The hook is purely subscriber : the back-end emits, the front-end
// reacts. No outbound calls (acquire/release locks happen elsewhere).

import { useEffect } from 'react';
import { useArtifactsStore } from '@/stores/artifacts';
import { useSpddEditorStore } from '@/stores/spdd';
import { artifactKindFromPath } from '@/lib/artifactPath';
import { logger } from '@/lib/logger';

export interface FsChangedPayload {
  projectPath: string;
  path: string;
  kind: 'create' | 'modify' | 'delete' | 'rename';
  mtime: number;
}

interface WailsRuntime {
  EventsOn: (
    eventName: string,
    callback: (...data: unknown[]) => void,
  ) => () => void;
}

/**
 * Abonnement central à l'event Wails `yukki:fs:changed`. Doit être
 * instancié une seule fois (App.tsx racine) — re-render du composant
 * ne reattache pas (cleanup propre via la fonction renvoyée par
 * EventsOn).
 *
 * Le hook ne retourne rien : il agit par side-effect sur les stores
 * Zustand.
 */
export function useFsWatchSubscriber(): void {
  useEffect(() => {
    const runtime = (window as unknown as { runtime?: WailsRuntime }).runtime;
    if (!runtime?.EventsOn) {
      logger.warn('useFsWatchSubscriber: Wails runtime not available');
      return;
    }

    const off = runtime.EventsOn('yukki:fs:changed', (...data: unknown[]) => {
      const payload = data[0] as FsChangedPayload | undefined;
      if (!payload) return;

      logger.debug('fs:changed received', {
        path: payload.path,
        kind: payload.kind,
        projectPath: payload.projectPath,
      });

      const artifactsState = useArtifactsStore.getState();
      const editorState = useSpddEditorStore.getState();

      const eventKind = artifactKindFromPath(payload.path);
      const isCurrentKind = eventKind !== null && eventKind === artifactsState.kind;
      const isOpenedFile = payload.path === artifactsState.selectedPath;

      // Open file removed → mark it as deleted so SpddEditor can
      // render an explicit empty state. Skip the kind-bound refresh
      // logic ; refresh is still useful so HubList drops the item.
      if (isOpenedFile && payload.kind === 'delete') {
        editorState.setDeleted(true);
        if (isCurrentKind) {
          void artifactsState.refresh();
        }
        return;
      }

      // Open file modified externally with local unsaved changes →
      // trigger the conflict warning. SpddEditor renders the banner
      // with reload / keep-mine choice.
      if (isOpenedFile && editorState.isDirty && payload.kind !== 'delete') {
        editorState.setConflictWarning({
          path: payload.path,
          diskMtime: payload.mtime,
        });
        // No refresh of HubList here — the edit is in flight, the
        // file is still listed.
        return;
      }

      // Open file modified externally without local changes →
      // signal SpddEditor to reload the content live. Without this,
      // the user sees the HubList update (titre, status) but the
      // editor body stays stale until they navigate away and back.
      if (isOpenedFile && !editorState.isDirty && payload.kind !== 'delete') {
        editorState.bumpExternalReloadCounter();
        // Refresh the listing in parallel — the title may have
        // changed in the front-matter and the HubList shows it.
        if (isCurrentKind) {
          void artifactsState.refresh();
        }
        return;
      }

      // Default branch — fire-and-forget refresh of the listing if
      // the event matches the kind currently displayed. Stores not
      // tied to the listing (Inspector, etc.) are unaffected.
      if (isCurrentKind) {
        void artifactsState.refresh();
      }
    });

    return () => {
      off();
    };
  }, []);
}
