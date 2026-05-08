// UI-014a — Static SPDD section definitions.
//
// Order is the SPDD template canonical order (see .yukki/templates/story.md).
//
// UI-014h — `required` n'est plus stocké ici : il est dérivé de l'annotation
// `<!-- spdd: required -->` du template story.md (cf. parseTemplate). Le
// mapping key↔label reste structurel — il vient du fait que `StoryDraft` a
// des champs typés (bg, bv, ...) tandis que les annotations parlent en
// heading humain ("Background", ...).

import type { SpddSection } from './types';

export const SECTIONS: readonly SpddSection[] = [
  { key: 'fm', label: 'Front-matter'        },
  { key: 'bg', label: 'Background'          },
  { key: 'bv', label: 'Business Value'      },
  { key: 'si', label: 'Scope In'            },
  { key: 'so', label: 'Scope Out'           },
  { key: 'ac', label: 'Acceptance Criteria' },
  { key: 'oq', label: 'Open Questions'      },
  { key: 'no', label: 'Notes'               },
];

/** Mapping inverse heading template → SectionKey. Utilisé par les selectors
 *  pour trouver la valeur correspondante dans `StoryDraft` quand on itère
 *  les sections requises annoncées par le template. */
export const HEADING_TO_KEY: Record<string, SpddSection['key']> = Object.fromEntries(
  SECTIONS.map((s) => [s.label.toLowerCase(), s.key]),
);

// SPDD section hints used by the `?` tooltip (UI-014a) and the "Définition
// SPDD" card in the inspector. Copy taken from .yukki/templates/story.md
// and the design prompt.
export const SECTION_HINTS: Record<string, string> = {
  fm: "Métadonnées de la story : id, slug, titre, statut, dates, owner et modules impactés. Toutes les valeurs respectent un format strict.",
  bg: "Pose le décor : pourquoi cette story existe, quel contexte métier ou technique. 3 à 6 lignes max.",
  bv: "À qui sert cette story et quel gain mesurable. Exprime la valeur, pas la solution technique.",
  si: "Liste précise de ce qui est dans le périmètre. Une puce = un comportement ou un livrable.",
  so: "Ce qui est explicitement exclu, et pourquoi. Évite l'ambiguïté en revue.",
  ac: "Critères d'acceptation testables au format Given/When/Then. Un AC = un comportement.",
  oq: "Questions à trancher avec le PO/archi avant de partir en analyse. Cocher au fil de l'eau.",
  no: "Liens vers tickets, threads, captures. Tout ce qui éclaire le contexte sans alourdir le corps.",
};
