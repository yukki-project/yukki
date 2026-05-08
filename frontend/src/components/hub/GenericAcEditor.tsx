// UI-014g — Generic AC editor: Given/When/Then cards driven by props, no store.
// Visually identical to SpddAcEditor but fully decoupled from useSpddEditorStore.

import { useCallback, useRef } from 'react';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenericAc } from '@/components/spdd/types';

// ─── Auto-resize textarea ─────────────────────────────────────────────────

interface AutoTextareaProps {
  id?: string;
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

function AutoTextarea({ id, value, placeholder, className, onChange }: AutoTextareaProps): JSX.Element {
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

// ─── Status badge ─────────────────────────────────────────────────────────

function AcStatusBadge({ complete, partial, index }: { complete: boolean; partial: boolean; index: number }): JSX.Element {
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

// ─── GWT row ─────────────────────────────────────────────────────────────

type GwtField = 'given' | 'when' | 'then';

interface GwtRowProps {
  acId: string;
  field: GwtField;
  value: string;
  onChange: (value: string) => void;
}

function GwtRow({ acId, field, value, onChange }: GwtRowProps): JSX.Element {
  const label = field.toUpperCase() as 'GIVEN' | 'WHEN' | 'THEN';
  const filled = value.trim().length > 0;
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
          onChange={onChange}
        />
      </div>
    </div>
  );
}

// ─── AC card ─────────────────────────────────────────────────────────────

interface AcCardProps {
  ac: GenericAc;
  index: number;
  onUpdate: (field: keyof GenericAc, value: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function AcCard({ ac, index, onUpdate, onDuplicate, onRemove }: AcCardProps): JSX.Element {
  const filled = [ac.given, ac.when, ac.then];
  const filledCount = filled.filter((v) => v.trim()).length;
  const complete = filledCount === 3 && ac.title.trim().length > 0;
  const partial = filledCount > 0 && !complete;

  return (
    <article
      className={cn(
        'rounded-yk border bg-yk-bg-2 transition-shadow',
        'border-yk-line',
      )}
    >
      <header className="flex items-center gap-2 border-b border-yk-line-subtle px-3 py-1.5">
        <span
          aria-hidden
          className="cursor-grab text-yk-text-faint hover:text-yk-text-muted"
          title="Drag & drop disponible dans une version ultérieure"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <AcStatusBadge complete={complete} partial={partial} index={index} />

        <span className="font-jbmono text-[11.5px] text-yk-text-muted">{ac.id}</span>

        <input
          type="text"
          value={ac.title}
          placeholder="Titre de l'Acceptance Criterion…"
          onChange={(e) => onUpdate('title', e.target.value)}
          className={cn(
            'flex-1 bg-transparent font-inter text-[13.5px] font-medium text-yk-text-primary',
            'placeholder:text-yk-text-faint focus:outline-none',
          )}
        />

        <button
          type="button"
          aria-label={`Dupliquer ${ac.id}`}
          onClick={onDuplicate}
          className="flex h-6 w-6 items-center justify-center rounded-yk-sm text-yk-text-faint transition-colors hover:bg-yk-bg-3 hover:text-yk-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--yk-primary-ring)]"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Supprimer ${ac.id}`}
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded-yk-sm text-yk-text-faint transition-colors hover:bg-[color:var(--yk-danger-soft)] hover:text-yk-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--yk-primary-ring)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      <div>
        <GwtRow acId={ac.id} field="given" value={ac.given} onChange={(v) => onUpdate('given', v)} />
        <GwtRow acId={ac.id} field="when" value={ac.when} onChange={(v) => onUpdate('when', v)} />
        <GwtRow acId={ac.id} field="then" value={ac.then} onChange={(v) => onUpdate('then', v)} />
      </div>
    </article>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

interface GenericAcEditorProps {
  acs: GenericAc[];
  onChange: (acs: GenericAc[]) => void;
}

export function GenericAcEditor({ acs, onChange }: GenericAcEditorProps): JSX.Element {
  const givenRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const renumber = useCallback((list: GenericAc[]): GenericAc[] =>
    list.map((ac, i) => ({ ...ac, id: `AC${i + 1}` })),
  []);

  const handleUpdate = (index: number, field: keyof GenericAc, value: string) => {
    const next = acs.map((ac, i) => i === index ? { ...ac, [field]: value } : ac);
    onChange(next);
  };

  const handleDuplicate = (index: number) => {
    const copy = { ...acs[index] };
    const next = [...acs.slice(0, index + 1), copy, ...acs.slice(index + 1)];
    onChange(renumber(next));
  };

  const handleRemove = (index: number) => {
    const next = acs.filter((_, i) => i !== index);
    onChange(renumber(next));
  };

  const handleAdd = () => {
    const newIndex = acs.length;
    const newAc: GenericAc = { id: `AC${newIndex + 1}`, title: '', given: '', when: '', then: '' };
    onChange([...acs, newAc]);
    // Focus the Given textarea of the new card after render
    requestAnimationFrame(() => {
      const el = givenRefs.current.get(newIndex);
      el?.focus();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {acs.map((ac, i) => (
        <AcCard
          key={ac.id}
          ac={ac}
          index={i + 1}
          onUpdate={(field, value) => handleUpdate(i, field, value)}
          onDuplicate={() => handleDuplicate(i)}
          onRemove={() => handleRemove(i)}
        />
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className={cn(
          'flex items-center gap-2 rounded-yk border border-dashed border-yk-line px-3 py-2',
          'text-[13px] text-yk-text-muted hover:border-yk-primary hover:text-yk-primary',
          'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--yk-primary-ring)]',
        )}
      >
        + Ajouter un AC
      </button>
    </div>
  );
}
