// UI-014a — Section sommaire (240px) on the left of the editor.
// UI-014h O12 — Branche générique enrichie : dots de progression + badge OBLIGATOIRE
// + footer "X/Y obligatoires" + missing list, comme la branche story.

import { Check, Circle, CircleDot } from 'lucide-react';
import { SECTIONS } from './sections';
import {
  isKeyRequired,
  selectAcCompletion,
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  selectRequiredTotal,
  selectSectionStatus,
  useSpddEditorStore,
} from '@/stores/spdd';
import {
  genericProgress,
  genericSectionStatus,
  type GenericSectionStatus,
} from '@/lib/sectionStatus';
import { cn } from '@/lib/utils';
import type { SectionKey, SectionStatus } from './types';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

export interface SpddTOCProps {
  onSectionClick: (key: SectionKey) => void;
  /** UI-014h: quand non-null, pilote le TOC depuis les sections génériques. */
  editState?: EditState | null;
  /** UI-014h O12: necessaire pour computer required/filled par section. */
  parsedTemplate?: ParsedTemplate | null;
  /** UI-014h O12: index de la section active dans le chemin generique (-1 = aucune). */
  activeGenericIndex?: number;
  /** UI-014h O12: callback de selection d'une section dans le chemin generique. */
  onGenericSectionClick?: (index: number) => void;
}

interface PastilleProps {
  status: SectionStatus;
}

function Pastille({ status }: PastilleProps): JSX.Element {
  switch (status) {
    case 'active':
      return (
        <span
          aria-hidden
          className="flex h-3 w-3 items-center justify-center rounded-full bg-[color:var(--yk-primary-soft)]"
        >
          <CircleDot className="h-3 w-3 text-yk-primary" strokeWidth={2.5} />
        </span>
      );
    case 'done':
      return (
        <span
          aria-hidden
          className="flex h-3 w-3 items-center justify-center rounded-full bg-[color:var(--yk-success-soft)]"
        >
          <Check className="h-2.5 w-2.5 text-yk-success" strokeWidth={3} />
        </span>
      );
    case 'todo':
      return (
        <span
          aria-hidden
          className="flex h-3 w-3 items-center justify-center rounded-full bg-[color:var(--yk-warning-soft)]"
        >
          <Circle className="h-2.5 w-2.5 text-yk-warning" strokeWidth={2.5} />
        </span>
      );
    case 'error':
      return (
        <span
          aria-hidden
          className="flex h-3 w-3 items-center justify-center rounded-full bg-[color:var(--yk-danger-soft)]"
        >
          <Circle className="h-2.5 w-2.5 text-yk-danger" strokeWidth={2.5} />
        </span>
      );
    case 'optional':
    default:
      return (
        <span
          aria-hidden
          className="h-3 w-3 rounded-full border border-dashed border-yk-text-faint"
        />
      );
  }
}

export function SpddTOC({
  onSectionClick,
  editState,
  parsedTemplate,
  activeGenericIndex = -1,
  onGenericSectionClick,
}: SpddTOCProps): JSX.Element {
  const state = useSpddEditorStore();
  const tmpl = parsedTemplate ?? null;
  const completed = selectRequiredCompleted(state, tmpl);
  const total = selectRequiredTotal(tmpl);
  const missing = selectMissingRequiredLabels(state, tmpl);
  const acStatus = selectAcCompletion(state);

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  // UI-014h O12: rendu piloté par template — enrichi avec dots, badges, footer.
  if (editState) {
    const progress = parsedTemplate
      ? genericProgress(editState, parsedTemplate)
      : { completed: 0, total: 0, missing: [] };
    const allDoneGeneric =
      progress.total > 0 && progress.completed === progress.total;
    const progressPctGeneric =
      progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;

    return (
      <nav
        aria-label="Sommaire SPDD"
        className="flex h-full flex-col bg-yk-bg-1 font-inter"
      >
        <div className="border-b border-yk-line-subtle px-4 pb-2 pt-3">
          <span className="font-jbmono text-[10px] uppercase tracking-wider text-yk-text-muted">
            Sections
          </span>
        </div>
        <ul role="tablist" className="flex-1 overflow-y-auto px-2 py-2">
          {editState.sections.map((section, idx) => {
            const spec = parsedTemplate?.sections.find(
              (s) => s.heading.toLowerCase() === section.heading.toLowerCase(),
            );
            const required = spec?.required ?? false;
            const isActive = idx === activeGenericIndex;
            const status: GenericSectionStatus = genericSectionStatus(section, required);
            const pastilleStatus: SectionStatus = isActive
              ? 'active'
              : status === 'done'
                ? 'done'
                : status === 'todo'
                  ? 'todo'
                  : 'optional';
            const labelClass = cn(
              'flex-1 truncate text-[13px] leading-5',
              isActive
                ? 'text-yk-text-primary'
                : status === 'done'
                  ? 'text-yk-text-secondary'
                  : status === 'todo'
                    ? 'text-yk-text-secondary'
                    : 'text-yk-text-muted',
            );
            return (
              <li key={idx}>
                <button
                  type="button"
                  role="tab"
                  aria-current={isActive ? 'true' : undefined}
                  aria-selected={isActive}
                  onClick={() => {
                    onGenericSectionClick?.(idx);
                    const el = document.getElementById(`spdd-section-generic-${idx}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  title={section.heading}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-yk-sm px-2 py-1.5 text-left transition-colors',
                    'hover:bg-yk-bg-2 focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[color:var(--yk-primary-ring)]',
                    isActive && 'bg-[color:var(--yk-primary-soft)]',
                  )}
                >
                  <Pastille status={pastilleStatus} />
                  <span className={labelClass}>{section.heading}</span>
                  {required && status === 'todo' && (
                    <span
                      className="ml-auto rounded-yk-sm bg-[color:var(--yk-warning-soft)] px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider text-yk-warning"
                      title="Section obligatoire non remplie"
                    >
                      obligatoire
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {parsedTemplate && progress.total > 0 && (
          <div className="border-t border-yk-line-subtle px-4 py-3">
            <div className="mb-1.5 flex items-baseline justify-between font-jbmono text-[11px] text-yk-text-muted">
              <span>Progression</span>
              <span className={allDoneGeneric ? 'text-yk-success' : 'text-yk-warning'}>
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div
              className="h-[3px] w-full overflow-hidden rounded-full bg-yk-bg-3"
              role="progressbar"
              aria-valuenow={progress.completed}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  allDoneGeneric ? 'bg-yk-success' : 'bg-yk-warning',
                )}
                style={{ width: `${progressPctGeneric}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-yk-text-muted">
              obligatoires remplies
              {progress.missing.length > 0 && (
                <span className="block pt-0.5 text-yk-text-faint">
                  manque : {progress.missing.join(', ')}
                </span>
              )}
            </p>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Sommaire SPDD"
      className="flex h-full flex-col bg-yk-bg-1 font-inter"
    >
      <div className="border-b border-yk-line-subtle px-4 pb-2 pt-3">
        <span className="font-jbmono text-[10px] uppercase tracking-wider text-yk-text-muted">
          Sections
        </span>
      </div>

      <ul role="tablist" className="flex-1 overflow-y-auto px-2 py-2">
        {SECTIONS.map((section) => {
          const status = selectSectionStatus(state, section.key, tmpl);
          const required = isKeyRequired(section.key, tmpl);
          const isActive = status === 'active';
          const labelClass = cn(
            'flex-1 truncate text-[13px] leading-5',
            isActive
              ? 'text-yk-text-primary'
              : status === 'done'
                ? 'text-yk-text-secondary'
                : status === 'optional'
                  ? 'text-yk-text-muted'
                  : 'text-yk-text-secondary',
          );
          return (
            <li key={section.key}>
              <button
                type="button"
                role="tab"
                aria-current={isActive ? 'true' : undefined}
                aria-selected={isActive}
                onClick={() => onSectionClick(section.key)}
                title={section.label}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-yk-sm px-2 py-1.5 text-left transition-colors',
                  'hover:bg-yk-bg-2 focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[color:var(--yk-primary-ring)]',
                  isActive && 'bg-[color:var(--yk-primary-soft)]',
                )}
              >
                <Pastille status={status} />
                <span className={labelClass}>{section.label}</span>
                {required && status === 'todo' && (
                  <span
                    className="ml-auto rounded-yk-sm bg-[color:var(--yk-warning-soft)] px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider text-yk-warning"
                    title="Section obligatoire non remplie"
                  >
                    obligatoire
                  </span>
                )}
                {section.key === 'ac' && state.draft.ac.length > 0 && !(required && status === 'todo') && (
                  <span className="ml-auto font-jbmono text-[11px] text-yk-text-faint">
                    ({state.draft.ac.length})
                  </span>
                )}
              </button>

              {section.key === 'ac' && state.draft.ac.length > 0 && (
                <ul className="ml-7 mt-0.5 space-y-0.5 border-l border-yk-line-subtle pl-3 pb-1">
                  {state.draft.ac.map((ac) => {
                    const compl = acStatus.find((c) => c.id === ac.id);
                    const dotClass = compl?.complete
                      ? 'bg-yk-success'
                      : 'bg-yk-warning';
                    return (
                      <li key={ac.id} className="flex items-center gap-2 py-0.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
                        <span className="font-jbmono text-[11px] text-yk-text-muted">
                          {ac.id}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {total > 0 && (
        <div className="border-t border-yk-line-subtle px-4 py-3">
          <div className="mb-1.5 flex items-baseline justify-between font-jbmono text-[11px] text-yk-text-muted">
            <span>Progression</span>
            <span className={allDone ? 'text-yk-success' : 'text-yk-warning'}>
              {completed}/{total}
            </span>
          </div>
          <div
            className="h-[3px] w-full overflow-hidden rounded-full bg-yk-bg-3"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div
              className={cn(
                'h-full transition-all duration-300',
                allDone ? 'bg-yk-success' : 'bg-yk-warning',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-yk-text-muted">
            obligatoires remplies
            {missing.length > 0 && (
              <span className="block pt-0.5 text-yk-text-faint">
                manque : {missing.join(', ')}
              </span>
            )}
          </p>
        </div>
      )}
    </nav>
  );
}
