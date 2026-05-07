// CORE-007 — O6: RestoreDialog component.
// Shown when the Wails backend emits "draft:restore-available" on startup,
// listing the available drafts sorted by most-recently-saved first.
// UI-014f — O7: RestoreDialogController calls DraftLoad + resetDraft on restore.

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import { mapGoToDraft } from '@/lib/draftMapper';

/** A lightweight summary of a saved draft (matches Go DraftSummary). */
export interface DraftSummary {
  id: string;
  title: string;
  updatedAt: string; // ISO timestamp
}

interface Props {
  summaries: DraftSummary[];
  onRestore: (id: string) => void;
  onDismiss: () => void;
}

function formatRelative(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'à l\'instant';
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const d = Math.floor(hr / 24);
  return `il y a ${d} j`;
}

/**
 * RestoreDialog presents available saved drafts and lets the author resume
 * one or dismiss the dialog.
 */
export function RestoreDialog({ summaries, onRestore, onDismiss }: Props): JSX.Element {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[420px] max-h-[60vh] overflow-y-auto rounded-yk-md',
            'bg-yk-bg-2 border border-yk-line p-5 shadow-xl',
            'font-inter text-yk-text-primary',
          )}
          aria-describedby="restore-desc"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[14px] font-semibold">
                Brouillons non exportés
              </Dialog.Title>
              <p id="restore-desc" className="mt-1 text-[12px] text-yk-text-secondary">
                Reprendre un brouillon enregistré automatiquement ?
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={onDismiss}
              className="text-yk-text-muted hover:text-yk-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-2">
            {summaries.map((s) => (
              <li
                key={s.id}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-yk-sm',
                  'border border-yk-line bg-yk-bg-1 px-3 py-2.5',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {s.title || '(sans titre)'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-yk-text-muted">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="font-jbmono">{s.id}</span>
                    <span>·</span>
                    <span>{formatRelative(s.updatedAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(s.id)}
                  className={cn(
                    'shrink-0 rounded-yk-sm px-3 py-1 text-[12px] font-medium',
                    'bg-[color:var(--yk-primary-soft)] text-yk-primary',
                    'hover:bg-[color:var(--yk-primary)] hover:text-white',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[color:var(--yk-primary-ring)]',
                  )}
                >
                  Reprendre
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="text-[12px] text-yk-text-muted hover:text-yk-text-primary transition-colors"
            >
              Plus tard
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── RestoreDialogController ──────────────────────────────────────────────
// Listens to the "draft:restore-available" Wails event and manages the
// RestoreDialog lifecycle.

interface ControllerProps {
  onRestore: (id: string) => void;
}

/**
 * Mounts a listener for the Wails "draft:restore-available" event and
 * renders the RestoreDialog when the event fires with pending drafts.
 */
export function RestoreDialogController({ onRestore }: ControllerProps): JSX.Element | null {
  const [summaries, setSummaries] = useState<DraftSummary[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = (window as any).runtime;
    if (!runtime?.EventsOn) return;

    const off = runtime.EventsOn(
      'draft:restore-available',
      (data: DraftSummary[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSummaries(data);
        }
      },
    );
    return () => { off?.(); };
  }, []);

  if (!summaries) return null;

  const handleRestore = async (id: string) => {
    setSummaries(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (window as any).go;
    if (go?.main?.App?.DraftLoad) {
      try {
        const loaded = await go.main.App.DraftLoad(id);
        useSpddEditorStore.getState().resetDraft(mapGoToDraft(loaded));
        return;
      } catch {
        // Fall through to the prop-based onRestore.
      }
    }
    onRestore(id);
  };

  return (
    <RestoreDialog
      summaries={summaries}
      onRestore={handleRestore}
      onDismiss={() => setSummaries(null)}
    />
  );
}
