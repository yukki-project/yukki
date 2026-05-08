---
id: UI-014i
slug: wysiwyg-markdown-rendering
story: .yukki/stories/UI-014i-wysiwyg-markdown-rendering.md
status: draft
created: 2026-05-08
updated: 2026-05-08
---

# Analyse — Rendu markdown WYSIWYG des sections prose

> Contexte stratégique pour la story `UI-014i-wysiwyg-markdown-rendering`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase.
> Ne dupliquer ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`markdown`, `WYSIWYG`, `prose`, `textarea`, `render`, `Tiptap`, `Lexical`,
`ProseMirror`, `shiki`, `round-trip`, `toolbar`, `toggle`, `editor`,
`read-only`, `react-markdown`, `remark-gfm`.

## Concepts de domaine

> Identification selon les briques DDD allégées de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **`react-markdown` + `remark-gfm`** — `frontend/package.json` (^9 + ^4),
  utilisés par
  [`frontend/src/components/hub/StoryViewer.tsx`](../../frontend/src/components/hub/StoryViewer.tsx).
  Rendu markdown → React avec un mapping `mdComponents` qui customise
  `h2`, `code`, `a`, etc. Déjà au-dessus du seuil pour couvrir tout le
  markdown lu en read-only.
- **`shiki` + `CodeBlock`** —
  [`frontend/src/components/hub/CodeBlock.tsx`](../../frontend/src/components/hub/CodeBlock.tsx).
  Surligne les blocs de code multi-lignes via `codeToHtml(content, {
  lang, theme: 'github-dark' })`. Chargement async + fallback `<pre>`
  silencieux. Ré-utilisable directement dans tout pipeline de rendu
  markdown.
- **`GenericProseTextarea`** —
  [`frontend/src/components/spdd/GenericProseTextarea.tsx`](../../frontend/src/components/spdd/GenericProseTextarea.tsx)
  (livré UI-014h O10). Textarea brut auto-resize avec détection de
  sélection ≥ 3 mots → AI popover (`useSpddSuggest`). Doit rester
  utilisable comme **fallback "Markdown source"** quand l'utilisateur
  bascule depuis le mode WYSIWYG.
- **`ProseTextarea`** —
  [`frontend/src/components/spdd/SpddDocument.tsx`](../../frontend/src/components/spdd/SpddDocument.tsx).
  Textarea brut legacy story, couplé au store
  `useSpddEditorStore.draft.sections[key]` + AI popover legacy
  (`openAiPopover`). Rend les 6 sections prose `bg`/`bv`/`si`/`so`/`oq`/`no`.
- **`SpddMarkdownView`** —
  [`frontend/src/components/spdd/SpddMarkdownView.tsx`](../../frontend/src/components/spdd/SpddMarkdownView.tsx).
  Vue markdown source globale du SpddEditor (toggle `SegmentedViewMode`
  story). Affiche le draft sérialisé en markdown brut éditable. Pas
  utilisée pour les sections individuelles — utile comme référence
  d'intégration.

### Nouveaux (à introduire)

- **`WysiwygProseEditor`** (composant) — surface unifiée du nouveau flux :
  - Mode `view` : rend `value: string` (markdown source) via
    `react-markdown` + `mdComponents` (réutilise le mapping de StoryViewer).
  - Mode `edit` : monte un éditeur WYSIWYG ProseMirror (Tiptap) avec
    extension markdown bidirectionnelle. Émet `onChange(nextMarkdown)`
    sur blur ou Ctrl+S.
  - Expose `readOnly`, `sectionHeading`, `artifactType` (cf. UI-014h O10
    pour le contexte AI), `value`, `onChange`. **API identique à
    `GenericProseTextarea`** pour drop-in replacement dans
    `GenericSectionBlock` et `SectionBlock` legacy.
- **Markdown ↔ ProseMirror serializer** — un sérialiseur markdown
  bidirectionnel branché à Tiptap. Candidats : `tiptap-markdown` (Aletheia),
  `prosemirror-markdown` (officiel ProseMirror). À valider via spike
  (cf. décisions). C'est ce composant qui porte la **garantie de
  round-trip** — sa qualité est critique.
- **`MarkdownToolbar`** (composant) — toolbar minimale au-dessus de
  l'éditeur en mode édition : gras, italique, titre H2/H3, liste à
  puces, code inline, bloc de code, lien. Raccourcis markdown style
  natifs gérés par Tiptap (`InputRules` pour `**`, `_`, `#`, `-`, `` ` ``).

## Approche stratégique

> Format Y-Statement selon
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour** rendre les sections prose markdown des artefacts SPDD avec un
mode lecture stylisé ET un mode édition WYSIWYG sans casser le round-trip
markdown, **on choisit** d'introduire un composant `WysiwygProseEditor`
qui combine `react-markdown` (réutilisé du bundle existant) pour le rendu
read-only et **Tiptap** (ProseMirror) pour l'édition WYSIWYG, avec une
extension markdown serializer bidirectionnelle, **plutôt que**
**(a) Lexical** (round-trip markdown moins mature, communauté plus jeune,
peu d'usage SPDD existant à benchmark) ou **(b) un éditeur ProseMirror
from-scratch** (coût d'apprentissage et boilerplate >> ROI pour cette
story) ou **(c) une approche CodeMirror markdown source highlighted**
(améliore le textarea brut mais ne livre pas le WYSIWYG promis), **pour
atteindre** une intégration React idiomatique avec round-trip markdown
fiable et un écosystème d'extensions mature (tables, code, links déjà
disponibles), **en acceptant** un bundle ~150 KB de plus pour les modules
Tiptap (lazy-load atténue) et une API ProseMirror complexe à apprendre
pour les futures extensions.

### Alternatives écartées

- **Lexical (Meta)** — bundle plus léger (~50 KB) mais round-trip markdown
  immature (la conversion passe par AST → HTML → markdown chez Lexical,
  source possible de divergences). Communauté plus jeune, peu de retours
  d'expérience SPDD. Réévaluable plus tard si Tiptap pose problème.
- **ProseMirror from-scratch** — flexibilité maximale, mais boilerplate
  important (schema, plugins, commands à coder à la main). Tiptap est
  une couche haut-niveau qui couvre 80 % des besoins.
- **CodeMirror 6 avec markdown highlighting** — édition de markdown
  source avec coloration syntaxique (visuel intermédiaire). Améliore le
  textarea actuel mais ne livre pas le "WYSIWYG" demandé. Possible
  livrable parallèle ultérieur, pas de remplacement.
- **Statu quo (textarea brut)** — rejeté : la story `UI-014i` existe
  précisément pour adresser cette dette UX.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/spdd/WysiwygProseEditor.tsx` | fort | création — composant racine du nouveau flux |
| `frontend/src/components/spdd/MarkdownToolbar.tsx` | moyen | création — toolbar locale |
| `frontend/src/lib/markdownComponents.ts` | moyen | création — extraction des `mdComponents` (depuis `StoryViewer.tsx`) pour réutilisation |
| `frontend/src/components/spdd/SpddDocument.tsx` | moyen | modification — `GenericSectionBlock` et `SectionBlock` montent `WysiwygProseEditor` au lieu du textarea brut |
| `frontend/src/components/spdd/GenericProseTextarea.tsx` | faible | inchangé — reste comme fallback "Markdown source" |
| `frontend/src/components/spdd/SpddHeader.tsx` | faible | option : propager le toggle `SegmentedViewMode` au chemin générique (cf. décisions) |
| `frontend/package.json` | moyen | ajout deps : `@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown` |

## Dépendances et intégrations

- **`react-markdown` ^9.0.1** — déjà présent.
- **`remark-gfm` ^4.0.0** — déjà présent (tables GFM, listes de tâches).
- **`shiki` ^4.0.2** — déjà présent (via `CodeBlock`).
- **Nouveau** : `@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`
  (extensions de base : bold, italic, heading, list, code, link),
  `tiptap-markdown` (ou `prosemirror-markdown` selon spike).
- **`useSpddSuggest`** (hook AI Assist livré UI-014h O10) — l'AI popover
  doit continuer de fonctionner par-dessus l'éditeur WYSIWYG. Stratégie :
  capturer `selectionchange` au niveau de la racine éditeur, dériver
  start/end/text depuis la sélection ProseMirror, ouvrir le popover
  comme aujourd'hui.

## Risques et points d'attention

> Catégories selon
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Round-trip non strict** (Data — Impact **fort**, Probabilité moyenne) —
  La sérialisation Markdown → ProseMirror → Markdown peut introduire
  des différences cosmétiques (réordonnancement d'attributs, indentation
  de listes, escape de caractères, ordre des classes CSS). Sur un repo
  versionné avec git, chaque divergence pollue le diff. **Mitigation** :
  tests round-trip bit-pour-bit sur fixtures réelles
  (`.yukki/stories/UI-014h.md`, `.yukki/prompts/UI-014h.md` — riches en
  syntaxes mixtes) ; ne sérialiser en markdown qu'au moment de la
  sauvegarde, pas à chaque keystroke ; bench du round-trip par CI.

- **Augmentation du bundle frontend** (Performance-Reliability — Impact
  moyen, Probabilité **certaine**) — Tiptap + extensions = ~150 KB
  minifié-gzipped. Bundle frontend actuel < 1 MB ; ajout de 15 % notable
  en cold start. **Mitigation** : `import('...')` dynamique de
  `WysiwygProseEditor` au passage en mode édition ; tree-shaking
  rigoureux des extensions starter-kit (désactiver tables/strike si
  non utilisées) ; mesurer avec `rollup-plugin-visualizer` avant /
  après.

- **Conflit AI popover ↔ bubble menu Tiptap** (Intégration — Impact
  moyen, Probabilité moyenne) — Tiptap propose un `BubbleMenu` natif
  sur sélection. UI-014h a livré son propre `GenericAiPopoverPanel`
  déclenché à `selectionchange` ≥ 3 mots. Si les deux coexistent, ils
  se masquent ou se concurrencent. **Mitigation** : désactiver le
  BubbleMenu Tiptap par défaut, conserver l'AI popover custom et
  l'adapter à la sélection ProseMirror.

- **Markdown étendu non couvert par Tiptap starter-kit** (Compatibilité —
  Impact moyen, Probabilité moyenne) — Les analyses et canvas SPDD
  contiennent des **tableaux markdown** (ex. "Modules impactés" dans
  `analysis.md`, "Phases" dans le canvas UI-014h). Le starter-kit
  Tiptap n'inclut pas l'extension `Table`. **Mitigation** : ajouter
  `@tiptap/extension-table`, ou laisser ces sections en fallback
  textarea via le toggle ; le test de round-trip détecte les
  divergences.

- **Performance sur documents longs** (Performance-Reliability — Impact
  faible, Probabilité faible) — Sections > 5000 caractères :
  re-rendu/re-parse à chaque keystroke peut introduire du jank. **Mitigation** :
  debounce du `onChange` (150 ms) ; sérialisation markdown différée
  (sur blur ou Ctrl+S) ; bench manuel sur fixture lourde.

## Cas limites identifiés

> Identification selon BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Markdown malformé** (Erreurs utilisateur) — Section contenant `**gras
  non fermé`, `[lien sans url`, `` ` ``... orphelin. Le rendu doit faire
  son meilleur effort sans crash, et le toggle "Markdown source" reste
  accessible pour corriger.

- **Caractères spéciaux et Unicode** (Encodage) — Em-dashes (`—`),
  accents (`é`/`à`), emojis si présents, backticks à l'intérieur de
  code inline (`` `txt with ` inside` ``). Le round-trip doit les
  préserver à l'identique.

- **Liens internes vers d'autres artefacts** (Format métier) — Liens
  comme `[UI-014h](.yukki/prompts/UI-014h-...)` — doivent rester
  cliquables (ouverture dans le viewer, pas dans le navigateur)
  ET round-trippés exactement.

- **Sections vides ou whitespace-only** (États vides) — Placeholder
  affiché en mode édition (ex. "Commencez à taper…") ; rendu vide
  totalement absent en mode lecture seule (pas d'élément `<p></p>`
  parasite).

- **Bloc de code multi-lignes avec triple backticks** (Format métier) —
  Bloc avec `language` (` ```typescript ... ``` `) doit rester
  surligné via shiki en read-only ET dans l'éditeur, et préserver
  l'attribut langue après round-trip.

## Décisions à prendre avant le canvas

- [ ] **Choix lib WYSIWYG : Tiptap ou Lexical ?** — l'analyse recommande
  Tiptap. Confirmer via un spike court (PR de prototype isolé) qui
  ouvre `UI-014h-universal-template-driven-editor.md` (canvas riche en
  syntaxes : tables, code, listes imbriquées) et vérifie le round-trip
  bit-pour-bit. Décision à graver dans le canvas REASONS.
- [ ] **Granularité du toggle WYSIWYG/Markdown** — global header (cohérent
  avec story actuel) ou par section (chaque section a son propre toggle) ?
  Recommandation : global header pour limiter le mental load.
- [ ] **Stratégie de chargement Tiptap** — bundle inclus dès l'ouverture
  ou lazy-load au passage en mode édition ? Recommandation : lazy-load
  pour préserver le cold-start read-only.
- [ ] **Extraction des `mdComponents`** — depuis `StoryViewer.tsx` vers
  `frontend/src/lib/markdownComponents.ts` partagé ? Permet réutilisation
  entre StoryViewer (workflow drawer), `WysiwygProseEditor` (read-only),
  et tout futur consommateur. Recommandation : oui, c'est cohérent avec
  l'unification UI-014.
