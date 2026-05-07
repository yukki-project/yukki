// UI-014f — O4: ExportConflictDialog.
// Shown when StoryExport returns an ExportConflictError (existing file at target path).
// Offers Cancel (keep existing) or Overwrite (re-export with {Overwrite: true}).

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExportConflictInfo {
  existingPath: string;
  existingUpdatedAt: string;
}

function formatRelative(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'à l\'instant';
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  return `il y a ${Math.floor(hr / 24)} j`;
}

interface Props {
  conflict: ExportConflictInfo | null;
  onOverwrite: () => void;
  onCancel: () => void;
}

/**
 * Controlled dialog that warns the author before overwriting an existing story file.
 * Renders nothing when `conflict` is null.
 */
export function ExportConflictDialog({ conflict, onOverwrite, onCancel }: Props): JSX.Element | null {
  if (!conflict) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[440px] rounded-yk-md bg-yk-bg-2 border border-yk-line p-5 shadow-xl',
            'font-inter text-yk-text-primary',
          )}
          aria-describedby="conflict-desc"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yk-warning" />
              <div>
                <Dialog.Title className="text-[14px] font-semibold">
                  La story existe déjà
                </Dialog.Title>
                <p id="conflict-desc" className="mt-1 text-[12px] text-yk-text-secondary">
                  Un fichier existe à ce chemin. L&apos;écraser supprimera définitivement la version en place.
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Annuler"
              onClick={onCancel}
              className="text-yk-text-muted hover:text-yk-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-5 rounded-yk-sm bg-yk-bg-1 border border-yk-line px-3 py-2.5 text-[12px]">
            <p className="font-jbmono text-yk-text-primary break-all">{conflict.existingPath}</p>
            <p className="mt-1 text-yk-text-muted">
              Modifiée {formatRelative(conflict.existingUpdatedAt)}
            </p>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'rounded-yk-sm border border-yk-line px-4 py-1.5',
                'font-inter text-[13px] text-yk-text-secondary',
                'transition-colors hover:bg-yk-bg-3 hover:text-yk-text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              )}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onOverwrite}
              className={cn(
                'rounded-yk-sm px-4 py-1.5',
                'bg-yk-danger font-inter text-[13px] font-medium text-white',
                'transition-colors hover:brightness-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              )}
            >
              Écraser
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
