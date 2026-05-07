// UI-014e — Export checklist popover.
// Shown when the Export button is clicked and the story is incomplete.
// Lists 5 required conditions with ✓/✗ + "Aller→" links.

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  useSpddEditorStore,
} from '@/stores/spdd';
import { REQUIRED_COUNT } from './sections';
import type { SectionKey } from './types';

// ─── Checklist items ──────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  sectionKey: SectionKey;
  ok: boolean;
}

function buildCheckItems(state: ReturnType<typeof useSpddEditorStore.getState>): CheckItem[] {
  const { draft } = state;
  const fmOk = Boolean(
    draft.id && draft.slug && draft.title && draft.status &&
    draft.created && draft.updated && draft.owner && draft.modules.length > 0,
  );
  const bgOk = draft.sections.bg.trim().length > 0;
  const bvOk = draft.sections.bv.trim().length > 0;
  const siOk = draft.sections.si.trim().length > 0;
  const acOk =
    draft.ac.length > 0 &&
    draft.ac.every(
      (ac) => ac.title.trim() && ac.given.trim() && ac.when.trim() && ac.then.trim(),
    );

  return [
    { label: 'Front-matter complet', sectionKey: 'fm', ok: fmOk },
    { label: 'Background non vide',  sectionKey: 'bg', ok: bgOk },
    { label: 'Business Value non vide', sectionKey: 'bv', ok: bvOk },
    { label: 'Scope In non vide',   sectionKey: 'si', ok: siOk },
    { label: 'Tous les AC complets (G/W/T)', sectionKey: 'ac', ok: acOk },
  ];
}

// ─── Go-to link ───────────────────────────────────────────────────────────

function GoToLink({
  sectionKey,
  onGo,
}: {
  sectionKey: SectionKey;
  onGo: (key: SectionKey) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onGo(sectionKey)}
      className="font-inter text-[11.5px] text-yk-primary underline decoration-dotted hover:no-underline focus-visible:outline-none"
    >
      Aller→
    </button>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

interface ExportChecklistProps {
  onClose: () => void;
  onExport: () => void;
  onGoToSection: (key: SectionKey) => void;
}

export function ExportChecklist({
  onClose,
  onExport,
  onGoToSection,
}: ExportChecklistProps): JSX.Element {
  const state = useSpddEditorStore();
  const items = buildCheckItems(state);
  const allOk = items.every((i) => i.ok);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Checklist d'export"
      className={cn(
        'absolute right-0 top-full z-50 mt-2 w-[340px]',
        'rounded-yk border border-yk-line bg-yk-bg-1',
        'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
        'animate-in fade-in slide-in-from-top-1 duration-[120ms]',
      )}
    >
      {/* Chevron notch */}
      <div
        aria-hidden
        className="absolute right-8 top-[-7px] h-3 w-3 rotate-45 rounded-sm border-l border-t border-yk-line bg-yk-bg-1"
      />

      {/* Warning banner */}
      <div className="rounded-t-yk border-b border-yk-line bg-[color:var(--yk-warning-soft)] px-3 py-2 text-[12.5px] text-yk-warning">
        <span className="font-medium">⚠ Avant d'exporter, complète : </span>
        <span className="font-normal text-yk-text-secondary">
          L'export `.md` exige toutes les sections obligatoires.
        </span>
      </div>

      {/* Checklist */}
      <ul className="py-2">
        {items.map((item) => (
          <li
            key={item.sectionKey}
            className="flex items-center gap-2 px-4 py-1.5"
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                item.ok
                  ? 'bg-yk-success text-white'
                  : 'bg-[color:var(--yk-danger-soft)] text-yk-danger',
              )}
            >
              {item.ok ? '✓' : '✗'}
            </span>
            <span
              className={cn(
                'flex-1 font-inter text-[13px]',
                item.ok ? 'text-yk-text-muted line-through' : 'text-yk-text-primary',
              )}
            >
              {item.label}
            </span>
            {!item.ok && (
              <GoToLink
                sectionKey={item.sectionKey}
                onGo={(key) => { onGoToSection(key); onClose(); }}
              />
            )}
          </li>
        ))}
      </ul>

      {/* Footer buttons */}
      <div className="flex items-center gap-2 border-t border-yk-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'flex-1 rounded-yk-sm border border-yk-line py-1.5',
            'font-inter text-[13px] text-yk-text-secondary',
            'transition-colors hover:bg-yk-bg-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
          )}
        >
          Plus tard
        </button>
        <button
          type="button"
          disabled={!allOk}
          aria-disabled={!allOk}
          onClick={() => { onExport(); onClose(); }}
          className={cn(
            'flex-1 rounded-yk-sm py-1.5 font-inter text-[13px] font-medium',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
            allOk
              ? 'bg-yk-primary text-white hover:brightness-110'
              : 'cursor-not-allowed bg-yk-primary text-white opacity-40',
          )}
        >
          ✦ Exporter
        </button>
      </div>
    </div>
  );
}
