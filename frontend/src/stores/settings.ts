// OPS-001 O9 — Zustand store mirroring <configDir>/yukki/settings.json
// for the frontend. Hydrated once at App.tsx mount via `hydrate()`,
// mutated by `setDebugMode` with optimistic update + rollback on
// disk failure.
//
// The badge in TitleBar (O13) and the FileMenu item (O14) read
// `debugMode` directly. The toggle is also bound to Ctrl+Shift+D
// in App.tsx (O12).

import { create } from 'zustand';
import { LoadSettings, SaveSettings } from '../../wailsjs/go/main/App';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

interface SettingsState {
  debugMode: boolean;
  /** True once `hydrate()` has resolved (success or graceful failure). */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDebugMode: (next: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  debugMode: false,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const persisted = await LoadSettings();
      set({ debugMode: !!persisted.DebugMode, hydrated: true });
    } catch (err) {
      // Don't block UI; warn on the desktop log so we know.
      logger.warn('settings hydrate failed', {
        err: err instanceof Error ? err.message : String(err),
      });
      set({ hydrated: true });
    }
  },

  async setDebugMode(next) {
    const previous = get().debugMode;
    if (previous === next) return;
    // Optimistic update so the UI feels instant.
    set({ debugMode: next });
    try {
      await SaveSettings({ DebugMode: next });
    } catch (err) {
      // Rollback + surface a toast — the user's intent did not stick.
      set({ debugMode: previous });
      logger.error('settings save failed', err instanceof Error ? err : new Error(String(err)));
      toast({
        title: 'Mode debug',
        description: 'Impossible d’enregistrer la préférence — voir les logs.',
        variant: 'destructive',
      });
    }
  },
}));
