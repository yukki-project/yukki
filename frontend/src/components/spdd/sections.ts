// UI-014a — Static SPDD section definitions.
//
// Order is the SPDD template canonical order (see .yukki/templates/story.md).
// `required` reflects which sections gate the export checklist (UI-014e).

import type { SpddSection } from './types';

export const SECTIONS: readonly SpddSection[] = [
  { key: 'fm', label: 'Front-matter',        required: true  },
  { key: 'bg', label: 'Background',          required: true  },
  { key: 'bv', label: 'Business Value',      required: true  },
  { key: 'si', label: 'Scope In',            required: true  },
  { key: 'so', label: 'Scope Out',           required: false },
  { key: 'ac', label: 'Acceptance Criteria', required: true  },
  { key: 'oq', label: 'Open Questions',      required: false },
  { key: 'no', label: 'Notes',               required: false },
];

export const REQUIRED_COUNT = SECTIONS.filter((s) => s.required).length;

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
