// UI-014b — Editable front-matter form.
// Renders a grid of label + input rows. Validates on blur with explicit
// error messages. Modules are rendered as chips with add/remove.

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import { validateFmField, VALID_STATUSES } from './validation';
import type { FmField } from './validation';

const KNOWN_MODULES = [
  'frontend',
  'backend',
  'controller',
  'common',
  'extensions/auth',
  'extensions/billing',
  'helm',
  'docs',
  'cli',
  'internal/uiapp',
  'internal/provider',
];

// ─── Field row ────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  field: FmField;
  value: string;
  children?: React.ReactNode;
}

function FieldRow({ label, field, value, children }: FieldRowProps): JSX.Element {
  const setFmField = useSpddEditorStore((s) => s.setFmField);
  const [error, setError] = useState<string | null>(null);
  const hasError = Boolean(error);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const err = validateFmField(field, e.currentTarget.value);
      setError(err);
    },
    [field],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFmField(field, e.currentTarget.value);
      // Clear error as soon as the user starts correcting.
      if (error) setError(null);
    },
    [field, error, setFmField],
  );

  return (
    <div
      className={cn(
        'group grid grid-cols-[110px_1fr] items-start gap-x-2 rounded-yk px-2 py-1 transition-colors',
        hasError && 'bg-[color:var(--yk-danger-soft)]',
      )}
    >
      <label
        htmlFor={`fm-${field}`}
        className="mt-[7px] font-jbmono text-[11.5px] text-yk-text-muted"
      >
        {label}
      </label>
      <div className="flex flex-col gap-0.5">
        {children ?? (
          <input
            id={`fm-${field}`}
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'w-full rounded-yk-sm bg-transparent py-1 font-jbmono text-[13px] text-yk-text-primary',
              'focus:outline-none focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
              'border border-transparent transition-colors',
              'hover:border-yk-line focus:border-yk-primary',
              hasError && 'border-yk-danger text-yk-danger',
            )}
          />
        )}
        {hasError && (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-[11.5px] text-yk-danger"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Status select ────────────────────────────────────────────────────────

interface StatusSelectProps {
  value: string;
}

function StatusSelect({ value }: StatusSelectProps): JSX.Element {
  const setFmField = useSpddEditorStore((s) => s.setFmField);
  return (
    <select
      id="fm-status"
      value={value}
      onChange={(e) => setFmField('status' as FmField, e.currentTarget.value)}
      className={cn(
        'w-full rounded-yk-sm bg-yk-bg-1 py-1 font-jbmono text-[13px] text-yk-text-primary',
        'border border-yk-line focus:border-yk-primary focus:outline-none',
        'focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
      )}
    >
      {VALID_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// ─── Modules chips ────────────────────────────────────────────────────────

interface ModulesEditorProps {
  modules: readonly string[];
}

function ModulesEditor({ modules }: ModulesEditorProps): JSX.Element {
  const setFmField = useSpddEditorStore((s) => s.setFmField);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = KNOWN_MODULES.filter(
    (m) =>
      !modules.includes(m) &&
      m.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const addModule = useCallback(
    (mod: string) => {
      const trimmed = mod.trim();
      if (!trimmed || modules.includes(trimmed)) return;
      setFmField('modules', [...modules, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    },
    [modules, setFmField],
  );

  const removeModule = useCallback(
    (mod: string) => {
      setFmField(
        'modules',
        modules.filter((m) => m !== mod),
      );
    },
    [modules, setFmField],
  );

  const isUnknown = (mod: string) => !KNOWN_MODULES.includes(mod);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5">
        {modules.map((m) => (
          <span
            key={m}
            className={cn(
              'inline-flex items-center gap-1 rounded-yk-sm px-2 py-0.5',
              'font-jbmono text-[11.5px] text-yk-text-secondary',
              isUnknown(m)
                ? 'bg-yk-bg-3 shadow-[inset_0_0_0_1px_var(--yk-danger)]'
                : 'bg-yk-bg-3',
            )}
            title={isUnknown(m) ? "Module inconnu — ajoute-le à la liste si c'est volontaire" : undefined}
          >
            {m}
            <button
              type="button"
              aria-label={`Retirer ${m}`}
              onClick={() => removeModule(m)}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-yk-text-muted hover:text-yk-danger focus-visible:outline-none"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder="ajouter…"
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addModule(inputValue);
              }
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className={cn(
              'h-6 rounded-yk-sm bg-transparent px-2 font-jbmono text-[11.5px]',
              'border border-yk-line text-yk-text-primary placeholder:text-yk-text-faint',
              'focus:border-yk-primary focus:outline-none',
            )}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-full z-50 mt-1 rounded-yk border border-yk-line bg-yk-bg-1 py-1 shadow-lg">
              {suggestions.slice(0, 8).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={() => addModule(s)}
                    className="w-full px-3 py-1 text-left font-jbmono text-[11.5px] text-yk-text-secondary hover:bg-yk-bg-2 hover:text-yk-text-primary"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function SpddFmForm(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  return (
    <div className="rounded-yk border border-yk-line bg-yk-bg-2 py-2">
      <FieldRow label="id" field="id" value={draft.id} />
      <FieldRow label="slug" field="slug" value={draft.slug} />
      <FieldRow label="title" field="title" value={draft.title} />
      <FieldRow label="status" field="status" value={draft.status}>
        <StatusSelect value={draft.status} />
      </FieldRow>
      <FieldRow label="created" field="created" value={draft.created} />
      <FieldRow label="updated" field="updated" value={draft.updated} />
      <FieldRow label="owner" field="owner" value={draft.owner} />
      <div className="grid grid-cols-[110px_1fr] items-start gap-x-2 px-2 py-1">
        <span className="mt-[7px] font-jbmono text-[11.5px] text-yk-text-muted">
          modules
        </span>
        <ModulesEditor modules={draft.modules} />
      </div>
    </div>
  );
}
