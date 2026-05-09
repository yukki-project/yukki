// OPS-001 prompt-update O19 — Zustand store for the LogsDrawer.
//
// Holds a circular buffer of the last N log entries (FIFO), the
// open/close state of the drawer, and the active filters.
// Hydrated on demand via App.TailLogs(N) — only when the user opens
// the drawer the first time. Live updates flow through the
// "log:event" Wails event subscribed once at App.tsx mount.

import { create } from 'zustand';
import { TailLogs } from '../../wailsjs/go/main/App';
import type { LogLine } from '../../wailsjs/go/main/App';
import { logger } from '@/lib/logger';

const BUFFER_CAP = 500;

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const ALL_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const ALL_SOURCES = ['frontend', 'go'];

interface DevToolsState {
  drawerOpen: boolean;
  buffer: LogLine[];
  levelFilter: Set<LogLevel>;
  sourceFilter: Set<string>;
  autoScroll: boolean;

  openDrawer: () => Promise<void>;
  closeDrawer: () => void;
  toggleDrawer: () => Promise<void>;
  pushEntry: (line: LogLine) => void;
  setLevelFilter: (l: LogLevel, on: boolean) => void;
  setSourceFilter: (s: string, on: boolean) => void;
  toggleAutoScroll: () => void;
}

export const useDevToolsStore = create<DevToolsState>((set, get) => ({
  drawerOpen: false,
  buffer: [],
  levelFilter: new Set<LogLevel>(ALL_LEVELS),
  sourceFilter: new Set<string>(ALL_SOURCES),
  autoScroll: true,

  async openDrawer() {
    if (get().drawerOpen) return;
    try {
      const lines = await TailLogs(BUFFER_CAP);
      set({ buffer: lines.slice(-BUFFER_CAP), drawerOpen: true });
    } catch (e) {
      logger.warn('TailLogs failed', {
        err: e instanceof Error ? e.message : String(e),
      });
      // Open with whatever we have; live events will fill it in.
      set({ drawerOpen: true });
    }
  },

  closeDrawer() {
    set({ drawerOpen: false });
  },

  async toggleDrawer() {
    if (get().drawerOpen) {
      get().closeDrawer();
    } else {
      await get().openDrawer();
    }
  },

  pushEntry(line) {
    set((state) => {
      const next = state.buffer.length < BUFFER_CAP
        ? [...state.buffer, line]
        : [...state.buffer.slice(1), line];
      return { buffer: next };
    });
  },

  setLevelFilter(level, on) {
    set((state) => {
      const next = new Set(state.levelFilter);
      if (on) next.add(level);
      else next.delete(level);
      return { levelFilter: next };
    });
  },

  setSourceFilter(source, on) {
    set((state) => {
      const next = new Set(state.sourceFilter);
      if (on) next.add(source);
      else next.delete(source);
      return { sourceFilter: next };
    });
  },

  toggleAutoScroll() {
    set((state) => ({ autoScroll: !state.autoScroll }));
  },
}));
