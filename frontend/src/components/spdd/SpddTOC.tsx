// UI-014a — Section sommaire (240px) on the left of the editor.

import { Check, Circle, CircleDot } from 'lucide-react';
import { SECTIONS, REQUIRED_COUNT } from './sections';
import {
  selectAcCompletion,
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  selectSectionStatus,
  useSpddEditorStore,
} from '@/stores/spdd';
import { cn } from '@/lib/utils';
import type { SectionKey, SectionStatus } from './types';
import type { EditState } from '@/lib/genericSerializer';

export interface SpddTOCProps {
  onSectionClick: (key: SectionKey) => void;
  /** UI-016: quand non-null, pilote le TOC depuis les sections génériques. */
  editState?: EditState | null;
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

export function SpddTOC({ onSectionClick, editState }: SpddTOCProps): JSX.Element {
  const state = useSpddEditorStore();
  const completed = selectRequiredCompleted(state);
  const missing = selectMissingRequiredLabels(state);
  const acStatus = selectAcCompletion(state);

  const progressPct = Math.round((completed / REQUIRED_COUNT) * 100);
  const allDone = completed === REQUIRED_COUNT;

  // UI-016: rendu piloté par template
  if (editState) {
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
          {editState.sections.map((section, idx) => (
            <li key={idx}>
              <button
                type="button"
                role="tab"
                onClick={() => {
                  const el = document.getElementById(`spdd-section-generic-${idx}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                title={section.heading}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-yk-sm px-2 py-1.5 text-left transition-colors',
                  'hover:bg-yk-bg-2 focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[color:var(--yk-primary-ring)]',
                )}
              >
                <Pastille status="optional" />
                <span className="flex-1 truncate text-[13px] leading-5 text-yk-text-secondary">
                  {section.heading}
                </span>
              </button>
            </li>
          ))}
        </ul>
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
          const status = selectSectionStatus(state, section.key);
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
                {section.key === 'ac' && state.draft.ac.length > 0 && (
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

      <div className="border-t border-yk-line-subtle px-4 py-3"> {/* static footer */}
        <div className="mb-1.5 flex items-baseline justify-between font-jbmono text-[11px] text-yk-text-muted">
          <span>Progression</span>
          <span className={allDone ? 'text-yk-success' : 'text-yk-warning'}>
            {completed}/{REQUIRED_COUNT}
          </span>
        </div>
        <div
          className="h-[3px] w-full overflow-hidden rounded-full bg-yk-bg-3"
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={REQUIRED_COUNT}
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
    </nav>
  );
}
