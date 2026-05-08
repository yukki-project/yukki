// UI-014c — Center document column. FM + prose sections are now editable.
// UI-014d — ProseTextarea detects selection ≥ 3 words and opens AiPopover.

import { useCallback, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { SECTIONS, SECTION_HINTS } from './sections';
import { useSpddEditorStore } from '@/stores/spdd';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SpddFmForm } from './SpddFmForm';
import { SpddAcEditor } from './SpddAcEditor';
import { WysiwygProseEditor } from './WysiwygProseEditor';
import type { ProseSectionKey, SectionKey, SpddSection } from './types';
import type { EditState, SectionState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

export interface SpddDocumentProps {
  onActiveSectionFromScroll: (key: SectionKey) => void;
  /** UI-014h: quand non-null, pilote le rendu depuis le template. */
  editState?: EditState | null;
  /** UI-014h O9: nécessaire pour rendre le FM en tête (fmSpecs). */
  parsedTemplate?: ParsedTemplate | null;
  /** UI-014h: callback de mise à jour d'une section générique. */
  onEditStateChange?: (updated: EditState) => void;
  /** UI-014h: mode lecture seule — désactive l'édition du contenu. */
  readOnly?: boolean;
}

export function SpddDocument({
  onActiveSectionFromScroll,
  editState,
  parsedTemplate,
  onEditStateChange,
  readOnly,
}: SpddDocumentProps): JSX.Element {
  const containerRef = useRef<HTMLElement | null>(null);

  // Wire up an IntersectionObserver: the section that occupies the most of
  // the viewport becomes the active one (debounced via ref to avoid jitter
  // during smooth-scroll).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const visibility = new Map<SectionKey, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.sectionKey as
            | SectionKey
            | undefined;
          if (!key) continue;
          visibility.set(key, e.intersectionRatio);
        }
        let bestKey: SectionKey | null = null;
        let bestRatio = -1;
        for (const [k, r] of visibility.entries()) {
          if (r > bestRatio) {
            bestKey = k;
            bestRatio = r;
          }
        }
        if (bestKey && bestRatio > 0.05) {
          onActiveSectionFromScroll(bestKey);
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const sections = root.querySelectorAll<HTMLElement>('[data-section-key]');
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // Re-observe when switching between story/template modes (editState changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onActiveSectionFromScroll, !!editState]);

  return (
    <TooltipProvider delayDuration={250}>
      <main
        ref={containerRef}
        className="relative h-full overflow-y-auto bg-yk-bg-page"
      >
        <div className="mx-auto max-w-[720px] px-14 pb-20 pt-7">
          {editState && onEditStateChange ? (
            /* UI-014h: rendu piloté par template */
            <>
              {/* UI-014h O9: front-matter en tête, piloté par parsedTemplate.fmSpecs */}
              {parsedTemplate && parsedTemplate.fmSpecs.length > 0 && (
                <section
                  id="spdd-section-generic-fm"
                  data-section-key="spdd-section-generic-fm"
                  className="scroll-mt-20 pb-10"
                  aria-labelledby="spdd-section-generic-fm-title"
                >
                  <header className="mb-3 flex items-center gap-2 border-b border-yk-line-subtle pb-2">
                    <h2
                      id="spdd-section-generic-fm-title"
                      className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-yk-text-primary"
                    >
                      Front-matter
                    </h2>
                    <span className="rounded-yk-sm bg-[color:var(--yk-warning-soft)] px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider text-yk-warning">
                      obligatoire
                    </span>
                  </header>
                  <SpddFmForm
                    fmSpecs={parsedTemplate.fmSpecs}
                    values={editState.fmValues}
                    readOnly={readOnly}
                    onValuesChange={(key, next) => {
                      onEditStateChange({
                        ...editState,
                        fmValues: { ...editState.fmValues, [key]: next },
                      });
                    }}
                  />
                </section>
              )}
              {editState.sections.map((section, idx) => (
                <GenericSectionBlock
                  key={idx}
                  section={section}
                  index={idx}
                  editState={editState}
                  onEditStateChange={onEditStateChange}
                  readOnly={readOnly ?? true}
                  artifactType={artifactTypeFromFmValues(editState.fmValues)}
                  parsedTemplate={parsedTemplate}
                />
              ))}
            </>
          ) : (
            /* Fallback: sections statiques story — `required` lu depuis le
                template story.md si parsedTemplate est disponible (UI-014h). */
            SECTIONS.map((section) => (
              <SectionBlock
                key={section.key}
                section={section}
                readOnly={readOnly ?? false}
                parsedTemplate={parsedTemplate ?? null}
              />
            ))
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}

function SectionBlock({
  section,
  readOnly,
  parsedTemplate,
}: {
  section: SpddSection;
  readOnly: boolean;
  parsedTemplate: ParsedTemplate | null;
}): JSX.Element {
  const id = `spdd-section-${section.key}`;
  // UI-014h — required 100% template-driven : annotation `<!-- spdd: required -->`
  // dans story.md. Pas de fallback hardcodé. FM est traité comme toujours
  // requis (contrainte structurelle YAML).
  const tmplSpec = parsedTemplate?.sections.find(
    (s) => s.heading.toLowerCase() === section.label.toLowerCase(),
  );
  const required = section.key === 'fm' ? true : (tmplSpec?.required ?? false);

  return (
    <section
      id={id}
      data-section-key={section.key}
      className="scroll-mt-20 pb-10"
      aria-labelledby={`${id}-title`}
    >
      <header className="mb-3 flex items-center gap-2 border-b border-yk-line-subtle pb-2">
        <h2
          id={`${id}-title`}
          className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-yk-text-primary"
        >
          {section.label}
        </h2>
        <span
          className={cn(
            'rounded-yk-sm px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider',
            required
              ? 'bg-[color:var(--yk-warning-soft)] text-yk-warning'
              : 'bg-yk-bg-2 text-yk-text-muted',
          )}
        >
          {required ? 'obligatoire' : 'optionnel'}
        </span>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Hint pour ${section.label}`}
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center rounded-full',
                'text-yk-text-faint transition-colors hover:text-yk-text-secondary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              )}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {SECTION_HINTS[section.key]}
          </TooltipContent>
        </Tooltip>
      </header>

      {section.key === 'fm' ? (
        <SpddFmForm readOnly={readOnly} />
      ) : section.key === 'ac' ? (
        <SpddAcEditor readOnly={readOnly} />
      ) : (
        <ProseSectionWysiwyg sectionKey={section.key as ProseSectionKey} readOnly={readOnly} />
      )}
    </section>
  );
}

// UI-014i O6 — Wrapper qui adapte le store legacy story à WysiwygProseEditor.
// Symétrique avec le chemin générique : read-only et édition utilisent le
// même composant (WysiwygProseEditor → Tiptap WYSIWYG en édition + toggle
// Source pour retrouver le textarea brut si besoin / pour l'AI popover
// legacy depuis le mode source).
function ProseSectionWysiwyg({
  sectionKey,
  readOnly,
}: {
  sectionKey: ProseSectionKey;
  readOnly: boolean;
}): JSX.Element {
  const value = useSpddEditorStore((s) => s.draft.sections[sectionKey]);
  const setSection = useSpddEditorStore((s) => s.setSection);
  const heading = SECTIONS.find((s) => s.key === sectionKey)?.label;
  return (
    <WysiwygProseEditor
      value={value}
      onChange={(next) => setSection(sectionKey, next)}
      readOnly={readOnly}
      sectionHeading={heading}
      artifactType="story"
    />
  );
}

// ─── Generic section block (UI-014h) ──────────────────────────────────────

interface GenericSectionBlockProps {
  section: SectionState;
  index: number;
  editState: EditState;
  onEditStateChange: (updated: EditState) => void;
  readOnly: boolean;
  /** UI-014h O10 — type d'artefact passé au popover AI comme contexte. */
  artifactType?: string;
  /** UI-014h — template parsed pour lire le badge obligatoire/optionnel. */
  parsedTemplate?: ParsedTemplate | null;
}

function GenericSectionBlock({
  section,
  index,
  editState,
  onEditStateChange,
  readOnly,
  artifactType,
  parsedTemplate,
}: GenericSectionBlockProps): JSX.Element {
  const id = `spdd-section-generic-${index}`;
  // UI-014h — required lu depuis le template (mêmes annotations que le legacy)
  const tmplSpec = parsedTemplate?.sections.find(
    (s) => s.heading.toLowerCase() === section.heading.toLowerCase(),
  );
  const required = tmplSpec?.required ?? false;

  const handleContentChange = useCallback(
    (value: string) => {
      const newSections = editState.sections.map((s, i) =>
        i === index ? { ...s, content: value } : s,
      );
      onEditStateChange({ ...editState, sections: newSections });
    },
    [editState, index, onEditStateChange],
  );

  return (
    <section
      id={id}
      data-section-key={id}
      className="scroll-mt-20 pb-10"
      aria-labelledby={`${id}-title`}
    >
      <header className="mb-3 flex items-center gap-2 border-b border-yk-line-subtle pb-2">
        <h2
          id={`${id}-title`}
          className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-yk-text-primary"
        >
          {section.heading}
        </h2>
        <span
          className={cn(
            'rounded-yk-sm px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider',
            required
              ? 'bg-[color:var(--yk-warning-soft)] text-yk-warning'
              : 'bg-yk-bg-2 text-yk-text-muted',
          )}
        >
          {required ? 'obligatoire' : 'optionnel'}
        </span>
      </header>

      {section.widget === 'ac-cards' ? (
        /* UI-014h O8: AC editor template-driven via props parallèles. */
        <SpddAcEditor
          items={section.acs}
          readOnly={readOnly}
          onItemsChange={(next) => {
            const newSections = editState.sections.map((s, i) =>
              i === index ? { ...s, acs: next } : s,
            );
            onEditStateChange({ ...editState, sections: newSections });
          }}
        />
      ) : (
        // UI-014i O5 — drop-in WysiwygProseEditor (lecture stylée +
        // édition fallback textarea). Mode édition WYSIWYG Tiptap = livraison
        // ultérieure (O2/O4/O7/O8 reportés).
        <WysiwygProseEditor
          value={section.content}
          onChange={handleContentChange}
          readOnly={readOnly}
          sectionHeading={section.heading}
          artifactType={artifactType}
        />
      )}
    </section>
  );
}

// UI-014h O10 — heuristique pour deviner le type d'artefact depuis fmValues.
// Utilisé pour enrichir le contexte du prompt LLM (heading + type).
function artifactTypeFromFmValues(fm: Record<string, string | string[]>): string {
  const id = fm['id'];
  if (typeof id !== 'string') return '';
  if (id.startsWith('INBOX-')) return 'inbox';
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('ROADMAP-')) return 'roadmap';
  return ''; // canvas, analysis, story partagent les préfixes — laissé vide
}

// UI-014i O6 — Note : le composant ProseTextarea legacy a été supprimé.
// La symétrie story/générique passe maintenant par WysiwygProseEditor
// pour les deux paths (cf. ProseSectionWysiwyg ci-dessus). Le mode source
// du WysiwygProseEditor (toggle "Source") fournit le textarea brut + AI
// popover via GenericProseTextarea quand l'utilisateur en a besoin.
