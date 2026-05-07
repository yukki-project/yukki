// UI-014a — Mock story used by the editor shell while UI-014b/c bring real
// editing. The fixture is the FRONT-002 example documented in the design
// prompt: it is intentionally partially complete (Scope Out empty, two ACs
// missing parts) so the TOC, progress bar and inspector all light up.

import type { StoryDraft } from './types';

const updatedAt = new Date('2026-05-07T14:01:43Z').toISOString();
const savedAt = new Date(Date.parse(updatedAt) + 60_000).toISOString();

export const DEMO_STORY: StoryDraft = {
  id: 'FRONT-002',
  slug: 'spdd-editor',
  title: 'Éditeur guidé SPDD',
  status: 'draft',
  created: '2026-04-12',
  updated: '2026-05-07',
  owner: 'po-front@yuki',
  modules: ['frontend', 'docs'],
  sections: {
    bg: "Aujourd'hui les stories se rédigent à la main dans un éditeur markdown générique, c'est lent et sujet à oublis de sections, et la qualité dépend de la rigueur du rédacteur. Cette friction freine l'adoption de SPDD chez les nouveaux PO.",
    bv: "En tant que Product Owner, je veux rédiger des stories SPDD sans oublier de sections, afin de raccourcir les cycles de revue et faciliter l'embarquement des nouveaux rédacteurs.",
    si: "Édition guidée section par section.\nBascule WYSIWYG ↔ Markdown sans perte.\nAssistance IA contextuelle (4 actions) sur la sélection.\nValidation front-matter inline avec messages explicites.\nExport `.md` conforme au template SPDD.",
    so: '', // intentionally empty — produces an `optional` pastille
    oq: '',
    no: '',
  },
  ac: [
    {
      id: 'AC1',
      title: "Saisie d'un Given/When/Then valide",
      given: "un nouveau formulaire d'AC vide",
      when: 'le rédacteur saisit les 3 zones et clique « Valider »',
      then: "l'AC s'ajoute en bas de la liste, le compteur passe à n+1, le focus revient sur le titre du nouveau formulaire",
    },
    {
      id: 'AC2',
      title: 'Réordonner deux AC par drag',
      given: 'une story avec au moins deux AC',
      when: "le rédacteur fait glisser AC-2 au-dessus de AC-1",
      then: '', // intentionally empty — AC partial
    },
    {
      id: 'AC3',
      title: "Suppression d'un AC",
      given: '',
      when: "le rédacteur clique sur l'icône poubelle d'AC-2",
      then: 'AC-2 est retiré de la liste, la numérotation se met à jour, un toast permet le « Annuler » pendant 5 secondes',
    },
  ],
  savedAt,
};
