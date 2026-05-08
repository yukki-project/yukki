// UI-014h O12 — Helpers purs pour computer le statut d'une section dans le
// chemin generique (template-driven). Equivalent generique de
// `selectSectionStatus` / `selectRequiredCompleted` du store legacy story.
//
// Pas de side-effect, pas de store : tout est derive de `EditState` +
// `ParsedTemplate`. Utilise par `SpddTOC` (chemin generique) et `SpddFooter`.

import type { EditState, SectionState } from './genericSerializer';
import type { ParsedTemplate } from './templateParser';

/**
 * Une section est consideree "remplie" :
 * - widget 'textarea' : `content` non vide apres trim
 * - widget 'ac-cards' : au moins un AC, et chaque AC a title+given+when+then non vides
 */
export function isSectionFilled(section: SectionState): boolean {
  if (section.widget === 'ac-cards') {
    return (
      section.acs.length > 0 &&
      section.acs.every(
        (ac) =>
          ac.title.trim() !== '' &&
          ac.given.trim() !== '' &&
          ac.when.trim() !== '' &&
          ac.then.trim() !== '',
      )
    );
  }
  return section.content.trim() !== '';
}

export interface GenericProgress {
  completed: number;
  total: number;
  /** Headings des sections required non remplies. */
  missing: string[];
}

/**
 * Compte les sections required completees vs total required.
 * Les sections sont matchees par heading entre `editState.sections` et
 * `parsedTemplate.sections`.
 */
export function genericProgress(
  editState: EditState,
  parsedTemplate: ParsedTemplate,
): GenericProgress {
  let completed = 0;
  let total = 0;
  const missing: string[] = [];

  for (const spec of parsedTemplate.sections) {
    if (!spec.required) continue;
    total++;
    const sectionState = editState.sections.find(
      (s) => s.heading.toLowerCase() === spec.heading.toLowerCase(),
    );
    if (sectionState && isSectionFilled(sectionState)) {
      completed++;
    } else {
      missing.push(spec.heading);
    }
  }

  return { completed, total, missing };
}

export type GenericSectionStatus =
  | 'done' // required + filled
  | 'todo' // required + empty
  | 'optional-filled' // not required + filled
  | 'optional'; // not required + empty

/**
 * Statut visuel d'une section dans la TOC generique.
 * `required` est lu depuis le `SectionSpec` correspondant ; `filled` depuis l'`EditState`.
 */
export function genericSectionStatus(
  section: SectionState,
  required: boolean,
): GenericSectionStatus {
  const filled = isSectionFilled(section);
  if (required) return filled ? 'done' : 'todo';
  return filled ? 'optional-filled' : 'optional';
}
