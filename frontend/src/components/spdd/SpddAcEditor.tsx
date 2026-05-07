// UI-014b — Editable Acceptance Criteria cards.
// Each card has an editable title + 3 Given/When/Then textareas.
// Controls: drag handle (visual mock), duplicate, delete.
// Footer: "+ Ajouter un AC" button.

import { useRef } from 'react';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import type { MockAcceptanceCriterion } from './types';

// ─── Auto-resize textarea ─────────────────────────────────────────────────

interface AutoTextareaProps {
  id?: string;
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

function AutoTextarea({
  id,
  value,
  placeholder,
  className,
  onChange,
}: AutoTextareaProps): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }}
      className={cn(
        'w-full resize-none overflow-hidden bg-transparent text-[13.5px]',
        'leading-[1.55] text-yk-text-primary placeholder:text-yk-text-faint',
        'focus:outline-none',
        className,
      )}
    />
  );
}

// ─── GWT row ─────────────────────────────────────────────────────────────

type GwtField = 'given' | 'when' | 'then';

interface GwtRowProps {
  acId: string;
  field: GwtField;
  value: string;
  filled: boolean;
}

function GwtRow({ acId, field, value, filled }: GwtRowProps): JSX.Element {
  const updateAc = useSpddEditorStore((s) => s.updateAc);
  const label = field.toUpperCase() as 'GIVEN' | 'WHEN' | 'THEN';
  return (
    <div className="flex items-start gap-0 border-t border-yk-line-subtle first:border-t-0">
      <span
        className={cn(
          'w-[70px] shrink-0 bg-yk-bg-1 px-3 py-2 font-jbmono text-[11px]',
          filled ? 'text-yk-text-muted' : 'text-yk-warning',
        )}
      >
        {label}
      </span>
      <div className="flex-1 px-3 py-1.5">
        <AutoTextarea
          id={`${acId}-${field}`}
          value={value}
          placeholder={`${label.charAt(0) + label.slice(1).toLowerCase()}…`}
          onChange={(v) => updateAc(acId, field, v)}
        />
      </div>
    </div>
  );
}

// ─── AC card ─────────────────────────────────────────────────────────────

interface AcCardProps {
  ac: MockAcceptanceCriterion;
  index: number;
  isActive: boolean;
}

function AcCard({ ac, index, isActive }: AcCardProps): JSX.Element {
  const updateAc = useSpddEditorStore((s) => s.updateAc);
  const removeAc = useSpddEditorStore((s) => s.removeAc);
  const duplicateAc = useSpddEditorStore((s) => s.duplicateAc);

  const filled = [ac.given, ac.when, ac.then];
  const filledCount = filled.filter((v) => v.trim()).length;
  const complete = filledCount === 3 && ac.title.trim();
  const partial = filledCount > 0 && !complete;

  return (
    <article
      className={cn(
        'rounded-yk border bg-yk-bg-2 transition-shadow',
        isActive
          ? 'border-yk-primary shadow-[0_0_0_2px_var(--yk-primary-ring)]'
          : 'border-yk-line',
      )}
    >
      {/* Card header */}
      <header className="flex items-center gap-2 border-b border-yk-line-subtle px-3 py-1.5">
        {/* Drag handle — visual mock, no DnD this story */}
        <span
          aria-hidden
          className="cursor-grab text-yk-text-faint hover:text-yk-text-muted"
          title="Drag & drop disponible dans une version ultérieure"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        {/* Status badge */}
        <AcStatusBadge complete={Boolean(complete)} partial={partial} index={index} />

        <span className="font-jbmono text-[11.5px] text-yk-text-muted">{ac.id}</span>

        {/* Editable title */}
        <input
          type="text"
          value={ac.title}
          placeholder="Titre de l'Acceptance Criterion…"
          onChange={(e) => updateAc(ac.id, 'title', e.target.value)}
          className={cn(
            'flex-1 bg-transparent font-inter text-[13.5px] font-medium text-yk-text-primary',
            'placeholder:text-yk-text-faint focus:outline-none',
          )}
        />

        {/* Actions */}
        <button
          type="button"
          aria-label={`Dupliquer ${ac.id}`}
          onClick={() => duplicateAc(ac.id)}
          className="flex h-6 w-6 items-center justify-center rounded-yk-sm text-yk-text-faint transition-colors hover:bg-yk-bg-3 hover:text-yk-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--yk-primary-ring)]"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Supprimer ${ac.id}`}
          onClick={() => removeAc(ac.id)}
          className="flex h-6 w-6 items-center justify-center rounded-yk-sm text-yk-text-faint transition-colors hover:bg-[color:var(--yk-danger-soft)] hover:text-yk-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--yk-primary-ring)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* GWT rows */}
      <div>
        <GwtRow acId={ac.id} field="given" value={ac.given} filled={ac.given.trim().length > 0} />
        <GwtRow acId={ac.id} field="when" value={ac.when} filled={ac.when.trim().length > 0} />
        <GwtRow acId={ac.id} field="then" value={ac.then} filled={ac.then.trim().length > 0} />
      </div>
    </article>
  );
}

interface AcStatusBadgeProps {
  complete: boolean;
  partial: boolean;
  index: number;
}

function AcStatusBadge({ complete, partial, index }: AcStatusBadgeProps): JSX.Element {
  if (complete)
    return (
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-yk-success text-[10px] font-bold text-white">
        ✓
      </span>
    );
  if (partial)
    return (
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-yk-warning text-[10px] font-bold text-yk-bg-page">
        !
      </span>
    );
  return (
    <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[color:var(--yk-primary-soft)] font-jbmono text-[10px] text-yk-primary">
      {index}
    </span>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function SpddAcEditor(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const addAc = useSpddEditorStore((s) => s.addAc);
  const activeSection = useSpddEditorStore((s) => s.activeSection);

  return (
    <div className="space-y-3">
      {draft.ac.map((ac, idx) => (
        <AcCard
          key={ac.id}
          ac={ac}
          index={idx + 1}
          isActive={activeSection === 'ac'}
        />
      ))}

      {/* Add AC footer */}
      <button
        type="button"
        onClick={addAc}
        className={cn(
          'w-full rounded-yk border border-dashed border-yk-line py-3',
          'font-inter text-[13px] text-yk-text-muted transition-colors',
          'hover:border-yk-primary hover:bg-[color:var(--yk-primary-soft)] hover:text-yk-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
        )}
      >
        + Ajouter un AC
      </button>
    </div>
  );
}
