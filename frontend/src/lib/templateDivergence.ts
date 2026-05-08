// UI-014h O13 — Pure functions pour détecter la divergence entre le contenu d'un
// artefact et son template. Alimente le banner d'avertissement universel
// "Le format ne correspond plus au template SPDD".
//
// Les sections requises absentes du fichier (présent comme placeholder synthétique
// dans EditState après parseArtifactContent) sont signalées. Les sections orphelines
// (présentes dans le fichier mais pas dans le template) sont signalées séparément.

import type { EditState } from './genericSerializer';
import type { ParsedTemplate } from './templateParser';

export interface TemplateDivergence {
  /** Headings de sections requises par le template mais absentes du fichier source. */
  missingRequired: string[];
  /** Headings de sections présentes dans le fichier mais pas dans le template. */
  orphanSections: string[];
}

/**
 * Compare l'`EditState` avec son `ParsedTemplate` pour détecter les divergences
 * structurelles. Toutes les comparaisons sont case-insensitive sur le heading.
 */
export function computeDivergence(
  editState: EditState,
  parsedTemplate: ParsedTemplate,
): TemplateDivergence {
  const templateHeadings = new Set(
    parsedTemplate.sections.map((s) => s.heading.toLowerCase()),
  );

  const missingRequired: string[] = [];
  for (const spec of parsedTemplate.sections) {
    if (!spec.required) continue;
    const sectionState = editState.sections.find(
      (s) => s.heading.toLowerCase() === spec.heading.toLowerCase(),
    );
    // Section absente du fichier → ajoutée par le template comme placeholder
    if (!sectionState || !sectionState.presentInFile) {
      missingRequired.push(spec.heading);
    }
  }

  const orphanSections: string[] = [];
  for (const section of editState.sections) {
    if (!templateHeadings.has(section.heading.toLowerCase())) {
      orphanSections.push(section.heading);
    }
  }

  return { missingRequired, orphanSections };
}

/**
 * Construit la liste des messages d'avertissement consommables par le banner
 * (un message par section absente). Format identique aux warnings story
 * existants pour réutiliser le composant `WarningsBanner`.
 */
export function divergenceWarnings(divergence: TemplateDivergence): string[] {
  return divergence.missingRequired.map(
    (heading) => `La section ${heading} est absente. Elle sera réinsérée vide.`,
  );
}
