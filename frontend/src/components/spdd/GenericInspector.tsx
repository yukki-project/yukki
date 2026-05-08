// UI-014h O14 — Inspector universel piloté par parsedTemplate.
// Affiche les tips contextuels (section.help) pour la section active du
// chemin générique. Equivalent fonctionnel de `SpddInspector` (story-only)
// mais piloté par les annotations `<!-- spdd: help="..." -->` du template.

import { useMemo } from 'react';
import type { EditState, SectionState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';
import { isSectionFilled } from '@/lib/sectionStatus';

interface GenericInspectorProps {
  editState: EditState;
  parsedTemplate: ParsedTemplate | null;
  /** Index de la section active dans editState.sections. -1 = front-matter. */
  activeIndex: number;
}

export function GenericInspector({
  editState,
  parsedTemplate,
  activeIndex,
}: GenericInspectorProps): JSX.Element {
  const isFm = activeIndex < 0;
  const activeSection: SectionState | null = isFm
    ? null
    : editState.sections[activeIndex] ?? null;

  const activeSpec = useMemo(() => {
    if (isFm || !activeSection || !parsedTemplate) return null;
    return parsedTemplate.sections.find(
      (s) => s.heading.toLowerCase() === activeSection.heading.toLowerCase(),
    );
  }, [isFm, activeSection, parsedTemplate]);

  const headerLabel = isFm ? 'Front-matter' : (activeSection?.heading ?? '—');

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-yk-bg-1 px-4 py-4 font-inter">
      <header className="mb-3">
        <p className="font-jbmono text-[10px] uppercase tracking-[0.12em] text-yk-text-muted">
          Inspector
        </p>
        <h2 className="text-[13.5px] font-semibold text-yk-text-primary">
          {headerLabel}
        </h2>
      </header>

      {isFm
        ? <FmCards editState={editState} />
        : (
          <SectionCards
            section={activeSection}
            help={activeSpec?.help ?? ''}
            required={activeSpec?.required ?? false}
          />
        )}

      <SaveCard />
    </div>
  );
}

// ─── Cards ─────────────────────────────────────────────────────────────────

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mb-3 rounded-yk border border-yk-line-subtle bg-yk-bg-2 px-3.5 py-3">
      <p className="mb-1.5 font-jbmono text-[10px] uppercase tracking-wider text-yk-text-muted">
        {label}
      </p>
      <div className="text-[12.5px] leading-[1.55] text-yk-text-secondary">
        {children}
      </div>
    </section>
  );
}

function FmCards({ editState }: { editState: EditState }): JSX.Element {
  const fmEntries = Object.entries(editState.fmValues);
  return (
    <Card label="Champs">
      {fmEntries.length === 0 ? (
        <p className="text-yk-text-faint">Aucun champ.</p>
      ) : (
        <ul className="space-y-1.5">
          {fmEntries.map(([key, value]) => (
            <li key={key} className="flex items-baseline gap-2">
              <span className="shrink-0 font-jbmono text-[11px] text-yk-text-muted">
                {key}
              </span>
              <span className="text-yk-text-secondary">
                {Array.isArray(value)
                  ? value.length > 0 ? value.join(', ') : '—'
                  : value || '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SectionCards({
  section,
  help,
  required,
}: {
  section: SectionState | null;
  help: string;
  required: boolean;
}): JSX.Element {
  if (!section) {
    return (
      <Card label="Section">
        <p className="text-yk-text-faint">Aucune section sélectionnée.</p>
      </Card>
    );
  }

  const filled = isSectionFilled(section);

  return (
    <>
      {help && (
        <Card label="Aide">
          <p>{help}</p>
        </Card>
      )}
      <Card label="État">
        <ul className="space-y-1">
          <li className="flex items-baseline gap-2">
            <span className="shrink-0 font-jbmono text-[11px] text-yk-text-muted">
              required
            </span>
            <span
              className={
                required ? 'text-yk-warning' : 'text-yk-text-faint'
              }
            >
              {required ? 'oui' : 'non'}
            </span>
          </li>
          <li className="flex items-baseline gap-2">
            <span className="shrink-0 font-jbmono text-[11px] text-yk-text-muted">
              widget
            </span>
            <span className="text-yk-text-secondary">{section.widget}</span>
          </li>
          <li className="flex items-baseline gap-2">
            <span className="shrink-0 font-jbmono text-[11px] text-yk-text-muted">
              rempli
            </span>
            <span
              className={filled ? 'text-yk-success' : 'text-yk-text-faint'}
            >
              {filled ? 'oui' : 'non'}
            </span>
          </li>
          <li className="flex items-baseline gap-2">
            <span className="shrink-0 font-jbmono text-[11px] text-yk-text-muted">
              source
            </span>
            <span className="text-yk-text-secondary">
              {section.presentInFile ? 'fichier' : 'template (synthétisé)'}
            </span>
          </li>
        </ul>
      </Card>
    </>
  );
}

function SaveCard(): JSX.Element {
  return (
    <Card label="Sauvegarder">
      <p>
        <kbd className="rounded border border-yk-line-subtle px-1 py-0.5 font-jbmono text-[11px]">
          Ctrl+S
        </kbd>{' '}
        pour sauvegarder l'artefact dans le fichier source.
      </p>
    </Card>
  );
}
