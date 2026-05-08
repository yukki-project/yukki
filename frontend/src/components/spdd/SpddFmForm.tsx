// UI-014b — Editable front-matter form.
// UI-014h O9 — Props API parallèle (fmSpecs / values / onValuesChange) pour le
// chemin template-driven générique. Le mode legacy story (sans props) reste
// inchangé : champs codés en dur + validation + chips modules + store.
// Le mode props rend les champs de manière dynamique depuis fmSpecs.
// Renders a grid of label + input rows. Validates on blur with explicit
// error messages. Modules are rendered as chips with add/remove.

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import { validateFmField, VALID_STATUSES } from './validation';
import type { FmField } from './validation';
import type { FrontmatterSpec } from './types';

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
  readOnly?: boolean;
  children?: React.ReactNode;
}

function FieldRow({ label, field, value, readOnly, children }: FieldRowProps): JSX.Element {
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
            readOnly={readOnly}
            onChange={readOnly ? undefined : handleChange}
            onBlur={readOnly ? undefined : handleBlur}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'w-full rounded-yk-sm bg-transparent py-1 font-jbmono text-[13px] text-yk-text-primary',
              'focus:outline-none focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
              'border border-transparent transition-colors',
              'hover:border-yk-line focus:border-yk-primary',
              hasError && 'border-yk-danger text-yk-danger',
              readOnly && 'cursor-default',
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
  readOnly?: boolean;
}

function StatusSelect({ value, readOnly }: StatusSelectProps): JSX.Element {
  const setFmField = useSpddEditorStore((s) => s.setFmField);
  return (
    <select
      id="fm-status"
      value={value}
      disabled={readOnly}
      onChange={(e) => setFmField('status' as FmField, e.currentTarget.value)}
      className={cn(
        'w-full rounded-yk-sm bg-yk-bg-1 py-1 font-jbmono text-[13px] text-yk-text-primary',
        'border border-yk-line focus:border-yk-primary focus:outline-none',
        'focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
        readOnly && 'cursor-default opacity-80',
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
  readOnly?: boolean;
}

function ModulesEditor({ modules, readOnly }: ModulesEditorProps): JSX.Element {
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
            {!readOnly && (
              <button
                type="button"
                aria-label={`Retirer ${m}`}
                onClick={() => removeModule(m)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-yk-text-muted hover:text-yk-danger focus-visible:outline-none"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
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
        )}
      </div>
    </div>
  );
}

// ─── Generic field row (UI-014h O9) ───────────────────────────────────────
//
// Variante générique du FieldRow qui ne dépend pas du store. Utilisée par le
// chemin template-driven : valeur + onChange viennent de props parallèles.
// Pas de validation par champ (les fmSpecs ne portent pas encore de schéma
// de validation cf. canvas UI-014h — c'est une story dédiée future).

interface GenericFieldProps {
  spec: FrontmatterSpec;
  value: string | string[] | undefined;
  readOnly?: boolean;
  onChange: (next: string | string[]) => void;
}

function GenericField({ spec, value, readOnly, onChange }: GenericFieldProps): JSX.Element {
  const id = `fm-generic-${spec.key}`;
  const strValue = Array.isArray(value)
    ? value.join(', ')
    : (value ?? '');

  const renderControl = () => {
    if (spec.widget === 'select' && spec.options) {
      return (
        <select
          id={id}
          value={String(value ?? '')}
          disabled={readOnly}
          onChange={(e) => onChange(e.currentTarget.value)}
          className={cn(
            'w-full rounded-yk-sm bg-yk-bg-1 py-1 font-jbmono text-[13px] text-yk-text-primary',
            'border border-yk-line focus:border-yk-primary focus:outline-none',
            'focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
            readOnly && 'cursor-default opacity-80',
          )}
        >
          {spec.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (spec.widget === 'date') {
      return (
        <input
          id={id}
          type="date"
          value={String(value ?? '')}
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange(e.currentTarget.value)}
          className={cn(
            'w-full rounded-yk-sm bg-transparent py-1 font-jbmono text-[13px] text-yk-text-primary',
            'border border-transparent transition-colors',
            'hover:border-yk-line focus:border-yk-primary',
            'focus:outline-none focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
            readOnly && 'cursor-default',
          )}
        />
      );
    }

    if (spec.widget === 'tags') {
      // Mode tags simple : chips depuis array, input "ajouter…" pour push,
      // pas de suggestions (les fmSpecs ne portent pas la liste des modules
      // connus — c'est legacy story-only).
      const items: string[] = Array.isArray(value) ? value : [];
      return (
        <GenericTagsInput
          items={items}
          readOnly={readOnly}
          onChange={(next) => onChange(next)}
        />
      );
    }

    // Default: text
    return (
      <input
        id={id}
        type="text"
        value={strValue}
        readOnly={readOnly}
        autoComplete="off"
        spellCheck={false}
        onChange={readOnly ? undefined : (e) => onChange(e.currentTarget.value)}
        className={cn(
          'w-full rounded-yk-sm bg-transparent py-1 font-jbmono text-[13px] text-yk-text-primary',
          'border border-transparent transition-colors',
          'hover:border-yk-line focus:border-yk-primary',
          'focus:outline-none focus:ring-1 focus:ring-[color:var(--yk-primary-ring)]',
          readOnly && 'cursor-default',
        )}
      />
    );
  };

  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-x-2 rounded-yk px-2 py-1">
      <label
        htmlFor={id}
        className="mt-[7px] font-jbmono text-[11.5px] text-yk-text-muted"
        title={spec.help || undefined}
      >
        {spec.key}
      </label>
      <div className="flex flex-col gap-0.5">
        {renderControl()}
      </div>
    </div>
  );
}

function GenericTagsInput({
  items,
  readOnly,
  onChange,
}: {
  items: string[];
  readOnly?: boolean;
  onChange: (next: string[]) => void;
}): JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInputValue('');
  };

  const remove = (m: string) => onChange(items.filter((x) => x !== m));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((m) => (
        <span
          key={m}
          className="inline-flex items-center gap-1 rounded-yk-sm bg-yk-bg-3 px-2 py-0.5 font-jbmono text-[11.5px] text-yk-text-secondary"
        >
          {m}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Retirer ${m}`}
              onClick={() => remove(m)}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-yk-text-muted hover:text-yk-danger focus-visible:outline-none"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          type="text"
          value={inputValue}
          placeholder="ajouter…"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(inputValue);
            }
          }}
          className={cn(
            'h-6 rounded-yk-sm bg-transparent px-2 font-jbmono text-[11.5px]',
            'border border-yk-line text-yk-text-primary placeholder:text-yk-text-faint',
            'focus:border-yk-primary focus:outline-none',
          )}
        />
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export interface SpddFmFormProps {
  /** UI-014h O9: specs FM dérivées du template (active le mode générique). */
  fmSpecs?: ReadonlyArray<FrontmatterSpec>;
  /** UI-014h O9: valeurs FM (Record key→value). Requis si fmSpecs est fourni. */
  values?: Record<string, string | string[]>;
  /** UI-014h O9: callback de mutation (key, next). Requis si fmSpecs est fourni. */
  onValuesChange?: (key: string, next: string | string[]) => void;
  /** UI-014h O9: désactive l'édition (lecture seule). */
  readOnly?: boolean;
}

export function SpddFmForm({
  fmSpecs,
  values,
  onValuesChange,
  readOnly,
}: SpddFmFormProps = {}): JSX.Element {
  const usePropsApi =
    fmSpecs !== undefined && values !== undefined && onValuesChange !== undefined;

  if (usePropsApi) {
    return (
      <div className="rounded-yk border border-yk-line bg-yk-bg-2 py-2">
        {fmSpecs.map((spec) => (
          <GenericField
            key={spec.key}
            spec={spec}
            value={values[spec.key]}
            readOnly={readOnly}
            onChange={(next) => onValuesChange(spec.key, next)}
          />
        ))}
      </div>
    );
  }

  // Legacy story path — store-coupled, validations, modules suggestions.
  return <SpddFmFormLegacy readOnly={readOnly} />;
}

function SpddFmFormLegacy({ readOnly }: { readOnly?: boolean }): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  return (
    <div className="rounded-yk border border-yk-line bg-yk-bg-2 py-2">
      <FieldRow label="id" field="id" value={draft.id} readOnly={readOnly} />
      <FieldRow label="slug" field="slug" value={draft.slug} readOnly={readOnly} />
      <FieldRow label="title" field="title" value={draft.title} readOnly={readOnly} />
      <FieldRow label="status" field="status" value={draft.status} readOnly={readOnly}>
        <StatusSelect value={draft.status} readOnly={readOnly} />
      </FieldRow>
      <FieldRow label="created" field="created" value={draft.created} readOnly={readOnly} />
      <FieldRow label="updated" field="updated" value={draft.updated} readOnly={readOnly} />
      <FieldRow label="owner" field="owner" value={draft.owner} readOnly={readOnly} />
      <div className="grid grid-cols-[110px_1fr] items-start gap-x-2 px-2 py-1">
        <span className="mt-[7px] font-jbmono text-[11.5px] text-yk-text-muted">
          modules
        </span>
        <ModulesEditor modules={draft.modules} readOnly={readOnly} />
      </div>
    </div>
  );
}
