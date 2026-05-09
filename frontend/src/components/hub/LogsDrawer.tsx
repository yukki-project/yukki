// OPS-001 prompt-update O19 — Drawer rétractable bas qui affiche
// les 500 dernières entrées du fichier de log, mises à jour en
// live via le Wails event "log:event".
//
// Render null en build de release (isDevBuild() === false) — la
// surface n'existe pas pour l'utilisateur final.

import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { isDevBuild } from '@/lib/buildFlags';
import { useDevToolsStore, type LogLevel } from '@/stores/devTools';

const ALL_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const ALL_SOURCES = ['frontend', 'go'];

const LEVEL_CLASS: Record<string, string> = {
  DEBUG: 'text-ykp-text-muted',
  INFO: 'text-ykp-text-secondary',
  WARN: 'text-ykp-warning',
  ERROR: 'text-ykp-danger',
};

export function LogsDrawer(): JSX.Element | null {
  if (!isDevBuild()) return null;

  const open = useDevToolsStore((s) => s.drawerOpen);
  const buffer = useDevToolsStore((s) => s.buffer);
  const levelFilter = useDevToolsStore((s) => s.levelFilter);
  const sourceFilter = useDevToolsStore((s) => s.sourceFilter);
  const autoScroll = useDevToolsStore((s) => s.autoScroll);
  const closeDrawer = useDevToolsStore((s) => s.closeDrawer);
  const setLevelFilter = useDevToolsStore((s) => s.setLevelFilter);
  const setSourceFilter = useDevToolsStore((s) => s.setSourceFilter);
  const toggleAutoScroll = useDevToolsStore((s) => s.toggleAutoScroll);

  const listRef = useRef<HTMLDivElement>(null);

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeDrawer();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDrawer]);

  const filtered = useMemo(
    () =>
      buffer.filter((line) => {
        const level = (line.Level || 'INFO') as LogLevel;
        const source = line.Source || 'go';
        return levelFilter.has(level) && sourceFilter.has(source);
      }),
    [buffer, levelFilter, sourceFilter],
  );

  useEffect(() => {
    if (!autoScroll || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filtered, autoScroll]);

  if (!open) return null;

  return (
    <aside
      role="region"
      aria-label="Logs drawer"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[30vh] min-h-[180px] flex-col border-t border-ykp-line bg-ykp-bg-elevated text-xs"
    >
      <header className="flex items-center justify-between gap-2 border-b border-ykp-line px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wide text-ykp-text-secondary">
            Logs (live)
          </span>
          <span className="text-ykp-text-muted">
            {filtered.length} / {buffer.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ALL_LEVELS.map((lvl) => (
            <label key={lvl} className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={levelFilter.has(lvl)}
                onChange={(e) => setLevelFilter(lvl, e.target.checked)}
              />
              <span className={LEVEL_CLASS[lvl]}>{lvl}</span>
            </label>
          ))}
          <span className="mx-1 text-ykp-line-strong">|</span>
          {ALL_SOURCES.map((src) => (
            <label key={src} className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={sourceFilter.has(src)}
                onChange={(e) => setSourceFilter(src, e.target.checked)}
              />
              <span>{src}</span>
            </label>
          ))}
          <span className="mx-1 text-ykp-line-strong">|</span>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={toggleAutoScroll}
            />
            <span>Auto-scroll</span>
          </label>
          <button
            type="button"
            aria-label="Close logs drawer"
            onClick={closeDrawer}
            className="ml-1 rounded p-1 text-ykp-text-secondary hover:bg-ykp-line hover:text-ykp-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono leading-5"
      >
        {filtered.length === 0 ? (
          <p className="text-ykp-text-muted">
            Aucune entrée — déclenche une action ou attends un event.
          </p>
        ) : (
          filtered.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap break-all">
              <span className="text-ykp-text-muted">{line.Timestamp} </span>
              <span className={LEVEL_CLASS[line.Level] ?? ''}>{line.Level} </span>
              {line.Source && (
                <span className="text-ykp-text-secondary">{line.Source} </span>
              )}
              <span className="text-ykp-text-primary">{line.Msg}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
