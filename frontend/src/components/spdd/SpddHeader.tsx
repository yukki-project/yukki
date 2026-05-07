// UI-014a — Story header. Sits between TabBar and the 3-column grid.

import { useMemo } from 'react';
import { Code2, Download, Edit3 } from 'lucide-react';
import { useSpddEditorStore, selectRequiredCompleted } from '@/stores/spdd';
import { REQUIRED_COUNT } from './sections';
import { cn } from '@/lib/utils';
import type { ViewMode } from './types';

const STATUS_PILL_CLASSES: Record<string, string> = {
  draft: 'bg-[color:var(--yk-warning-soft)] text-yk-warning',
  reviewed: 'bg-[color:var(--yk-primary-soft)] text-yk-primary',
  accepted: 'bg-[color:var(--yk-success-soft)] text-yk-success',
  implemented: 'bg-[color:var(--yk-success-soft)] text-yk-success',
  synced: 'bg-yk-bg-3 text-yk-text-secondary',
};

function formatSavedAt(savedAt: string | null): string {
  if (!savedAt) return 'jamais sauvé';
  const d = new Date(savedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `sauvé ${hh}:${mm}`;
}

export function SpddHeader(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const viewMode = useSpddEditorStore((s) => s.viewMode);
  const setViewMode = useSpddEditorStore((s) => s.setViewMode);
  const state = useSpddEditorStore();
  const completed = useMemo(() => selectRequiredCompleted(state), [state]);
  const allDone = completed === REQUIRED_COUNT;
  const savedLabel = formatSavedAt(draft.savedAt);

  return (
    <header
      aria-label="Story header"
      className="flex h-10 shrink-0 items-center gap-3 border-b border-yk-line bg-yk-bg-1 px-4"
    >
      <span className="font-jbmono text-[12px] text-yk-text-secondary">
        {draft.id}
      </span>
      <span className="font-inter text-[14px] font-medium text-yk-text-primary">
        {draft.title}
      </span>
      <span
        className={cn(
          'rounded-yk-sm px-2 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider',
          STATUS_PILL_CLASSES[draft.status] ?? STATUS_PILL_CLASSES.draft,
        )}
      >
        {draft.status}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-yk-text-muted">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-yk-success" />
        <span className="font-jbmono">{savedLabel}</span>
      </span>
      <div className="flex-1" />

      <SegmentedViewMode value={viewMode} onChange={setViewMode} />

      <button
        type="button"
        onClick={() => {
          if (!allDone) {
            console.warn(
              '[SpddEditor] export disabled — required sections incomplete',
            );
            return;
          }
          // UI-014e wires this to the export checklist + toast.
        }}
        className={cn(
          'flex items-center gap-1.5 rounded-yk-sm px-3 py-1 font-inter text-[12px] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
          allDone
            ? 'bg-yk-primary text-white hover:brightness-110'
            : 'border border-yk-primary text-yk-primary opacity-80 hover:opacity-100',
        )}
        aria-disabled={!allDone}
        title={allDone ? 'Exporter la story' : 'Complète les sections obligatoires'}
      >
        <Download className="h-3.5 w-3.5" />
        Exporter
      </button>
    </header>
  );
}

interface SegmentedViewModeProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function SegmentedViewMode({
  value,
  onChange,
}: SegmentedViewModeProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Mode d'affichage"
      className="flex items-center gap-0.5 rounded-yk-sm bg-yk-bg-2 p-0.5"
    >
      <SegmentedButton
        active={value === 'wysiwyg'}
        onClick={() => onChange('wysiwyg')}
        Icon={Edit3}
        label="WYSIWYG"
      />
      <SegmentedButton
        active={value === 'markdown'}
        onClick={() => onChange('markdown')}
        Icon={Code2}
        label="Markdown"
      />
    </div>
  );
}

interface SegmentedButtonProps {
  active: boolean;
  onClick: () => void;
  Icon: typeof Code2;
  label: string;
}

function SegmentedButton({
  active,
  onClick,
  Icon,
  label,
}: SegmentedButtonProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-yk-sm px-2.5 py-1 font-jbmono text-[11px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
        active
          ? 'bg-yk-bg-3 text-yk-text-primary shadow-[inset_0_-2px_0_0_var(--yk-primary)]'
          : 'text-yk-text-muted hover:text-yk-text-secondary',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
