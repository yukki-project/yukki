/* global React, Icon */
// SPDD section model + content state. Source of truth.

const SECTION_DEFS = [
  { key: 'fm',  label: 'Front-matter',         required: true,  hint: null },
  { key: 'bg',  label: 'Background',           required: true,  hint: 'Pose le décor : pourquoi cette story existe, dans quel projet, à quel moment. 2-4 phrases suffisent. (Background ≠ solution.)' },
  { key: 'bv',  label: 'Business Value',       required: true,  hint: 'Quel utilisateur gagne quoi grâce à ça ? Format suggéré : « En tant que X, je veux Y, afin de Z. »' },
  { key: 'si',  label: 'Scope In',             required: true,  hint: 'Liste ce que cette story livre. Précis, observable, fini. Une puce = une chose.' },
  { key: 'so',  label: 'Scope Out',            required: false, hint: 'Liste ce qu\'elle ne livre pas — pour fermer les portes. Optionnel mais recommandé.' },
  { key: 'ac',  label: 'Acceptance Criteria',  required: true,  hint: 'Décris des cas concrets — Given (état initial), When (action), Then (résultat observable).' },
  { key: 'oq',  label: 'Open Questions',       required: false, hint: 'Une décision à trancher avant l\'implémentation ? Note-la ici — c\'est moins coûteux que de la découvrir en revue.' },
  { key: 'no',  label: 'Notes',                required: false, hint: 'Notes libres : décisions de design, refs vers d\'autres stories, contexte qui ne rentre nulle part ailleurs.' },
];

window.SECTION_DEFS = SECTION_DEFS;

// Default content for the editable story
window.DEFAULT_STORY = () => ({
  fm: {
    id: 'FRONT-002',
    slug: 'spdd-editor',
    title: 'Éditeur guidé SPDD',
    status: 'draft',
    created: '2026-04-12',
    updated: '2026-05-07',
    owner: 'po-front@yuki',
    modules: ['frontend', 'docs'],
  },
  bg: 'Aujourd\'hui les stories se rédigent à la main dans un éditeur markdown générique, c\'est lent et sujet à oublis de sections, et la qualité dépend de la rigueur du rédacteur. Cette friction freine l\'adoption de SPDD chez les nouveaux PO.',
  bv: 'En tant que **Product Owner**, je veux rédiger des stories SPDD sans oublier de sections, afin de raccourcir les cycles de revue et faciliter l\'embarquement des nouveaux rédacteurs.',
  si: [
    'Édition guidée par section, dans l\'ordre du template SPDD',
    'Bascule WYSIWYG ↔ markdown brut sans perte',
    'Assistance IA contextuelle sur sélection (4 actions)',
    'Validation front-matter inline avec messages explicites',
    'Export `.md` conforme au template',
  ],
  so: '',
  ac: [
    {
      id: 1,
      title: 'Saisie d\'un Given/When/Then valide',
      given: 'un nouveau formulaire d\'AC vide',
      when: 'le rédacteur saisit les 3 zones et clique « Ajouter »',
      then: 'l\'AC s\'ajoute en bas de la liste, le compteur passe à n+1',
    },
    {
      id: 2,
      title: 'Réordonner deux AC par drag',
      given: 'la story contient AC-1 et AC-2',
      when: 'le rédacteur drag AC-2 au-dessus de AC-1',
      then: '',
    },
    {
      id: 3,
      title: 'Suppression d\'un AC',
      given: '',
      when: 'le rédacteur clique l\'icône poubelle d\'un AC',
      then: 'l\'AC est marqué archivé (soft-delete réversible) et masqué par défaut',
    },
  ],
  oq: '',
  no: '',
});
