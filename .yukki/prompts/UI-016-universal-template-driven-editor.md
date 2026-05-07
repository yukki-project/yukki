---
id: UI-016
slug: universal-template-driven-editor
story: .yukki/stories/UI-016-universal-template-driven-editor.md
analysis: .yukki/analysis/UI-016-universal-template-driven-editor.md
status: implemented
created: 2026-05-08
updated: 2026-05-08
---

# Canvas REASONS — SpddEditor pilote son rendu depuis le template de l artefact

> Specification executable. Source de verite pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code <-> canvas se resout **dans ce fichier d abord**.

---

## R — Requirements

### Probleme

`SpddEditor` rend des sections hard-codees story (8 sections fixes de `sections.ts`)
quel que soit l artefact ouvert. `detectArtifactType` ne distingue pas les analyses
et canvas des stories (meme prefixe d ID). Quand un artefact non-story est charge,
les mauvaises sections s affichent et `useAutoSave` risque d ecraser le fichier
generique avec du contenu story. Le projet dispose deja d une couche generique
complete (`parseTemplate` + `parseArtifactContent` + `serializeArtifact`) qu il
suffit de brancher sur `SpddEditor`.

### Definition of Done

- [ ] Selectionner une story dans la liste -> SpddEditor charge le template `story.md`,
  construit `EditState`, affiche les sections du template dans SpddDocument (AC1)
- [ ] Selectionner une inbox -> SpddEditor charge `inbox.md`, TOC et sections
  reflectent le template inbox (AC2)
- [ ] Sections `textarea` affichees en zones de texte editables ; section AC
  affichee en cartes `GenericAc` Given/When/Then (AC3)
- [ ] Ctrl+S -> `serializeArtifact` -> `WriteArtifact` -> toast confirme (AC4)
- [ ] Artefact dont le template est absent -> bandeau "Template non disponible",
  textarea brut editable, sauvegarde possible (AC5)
- [ ] `useAutoSave` desactive quand `editState !== null` (pas de conflit DraftSave)
- [ ] `SpddInspector` masque quand `editState !== null` et type != story

---

## E — Entities

### Entites

| Nom | Description | Champs cles | Cycle de vie |
|---|---|---|---|
| `ParsedTemplate` | Spec derivee d un template `.yukki/templates/<type>.md` | `fmSpecs: FrontmatterSpec[]`, `sections: SectionSpec[]` | Charge a chaque changement de selectedPath ; immutable pendant la session |
| `EditState` | Etat edite d un artefact : frontmatter + sections | `fmValues: Record<string, string | string[]>`, `sections: SectionState[]` | Cree depuis rawContent + template ; mute par les inputs ; serialise a la sauvegarde |
| `SectionState` | Etat d une section individuelle | `heading`, `widget: 'textarea' | 'ac-cards'`, `content`, `acs: GenericAc[]` | Partie de `EditState` |
| `GenericAc` | Un critere AC generique | `id`, `title`, `given`, `when`, `then` | Cree/mute dans `GenericAcEditor` |
| `ArtifactType` | Type detecte depuis le chemin et/ou le prefixe d ID | `'story' | 'inbox' | 'epic' | 'analysis' | 'canvas' | 'unknown'` | Derive a la volee |

### Relations

- `selectedPath` (artifacts store) -> `ParsedTemplate` + `EditState` : charge par `useEffect` dans `SpddEditor`
- `ParsedTemplate.sections[]` -> `SectionState[]` : mapping 1-1 (sections orphelines ajoutees en fin)
- `EditState` -> `serializeArtifact()` -> contenu fichier (round-trip garanti, 24 tests verts)

---

## A — Approach

On ajoute `editState: EditState | null` et `parsedTemplate: ParsedTemplate | null`
comme state local (`useState`) dans `SpddEditor`. Quand `selectedPath` change,
`SpddEditor` charge en parallele l artefact (deja fait) et le template du type
detecte, puis construit `EditState`. `SpddDocument` et `SpddTOC` sont parametres
pour consommer soit les `SECTIONS` statiques (si `editState === null`, soit les
sections de l `EditState` (si non-null). `SpddHeader` lit `fmValues.id/title/status`
quand `editState` est non-null. `useAutoSave` est desactive via `enabled = editState
=== null`. `SpddInspector` est masque quand `editState !== null` et type != story.
`StoryDraft` et le store `spdd.ts` restent intacts — seul le rendu visuel change.

Pour determiner le chemin du template, on extrait la racine `.yukki/` depuis le
chemin absolu de l artefact (meme heuristique que `StoryViewer`). On ajoute
`detectArtifactTypeFromPath` dans `templateParser.ts` pour distinguer les analyses
et canvas des stories. Cette fonction est privilegiee sur `detectArtifactType(id)`
dans `SpddEditor`.

### Alternatives considerees

- **Migrer `spdd.ts` entierement vers `EditState`** — rejetee : casserait l AI Assist
  et l auto-save ; perimetre trop large pour cette story.
- **Creer un store global `useEditStateStore`** — rejetee : source de verite dupliquee ;
  state local dans `SpddEditor` suffit.

---

## S — Structure

### Modules touches

| Module | Fichiers principaux | Nature |
|---|---|---|
| `frontend/src/lib/templateParser.ts` | Ajout `detectArtifactTypeFromPath` + `templatePathFor` | modification |
| `frontend/src/components/spdd/SpddEditor.tsx` | Ajout state local `editState` + `parsedTemplate` + `useEffect` de chargement template | modification |
| `frontend/src/components/spdd/SpddDocument.tsx` | Sections generees depuis `EditState.sections` quand non-null | modification |
| `frontend/src/components/spdd/SpddTOC.tsx` | TOC depuis `EditState.sections` quand non-null | modification |
| `frontend/src/components/spdd/SpddHeader.tsx` | Titre/status depuis `editState.fmValues` quand non-null | modification |
| `frontend/src/stores/spdd.ts` | `useAutoSave` desactive via param `enabled` | modification minimale |

### Schema de flux

```
selectedPath change (useArtifactsStore)
  -> useEffect dans SpddEditor
  -> ReadArtifact(selectedPath)             deja implemente
  -> markdownToDraft(raw)                   deja implemente (stories)
  -> resetDraft(loaded)                     deja implemente

  [Nouveau ajout UI-016]
  -> detectArtifactTypeFromPath(selectedPath) -> ArtifactType
  -> templateNameForType(type)                -> templateName | null
  -> if templateName:
       ReadArtifact(templatePathFor(selectedPath, type)) -> templateRaw
       parseTemplate(templateRaw)            -> parsedTemplate
       parseArtifactContent(raw, parsedTemplate) -> editState
       setEditState(editState)
       setParsedTemplate(parsedTemplate)
     else:
       setEditState(null)
       setParsedTemplate(null)

SpddDocument render :
  if (editState !== null) -> render sections depuis editState.sections
  else                    -> render SECTIONS statiques (actuel)

SpddTOC render :
  if (editState !== null) -> TOC depuis editState.sections.map(s => s.heading)
  else                    -> SECTIONS statiques (actuel)

SpddHeader render :
  if (editState !== null) -> id/title/status depuis editState.fmValues
  else                    -> draft.id / draft.title / draft.status (actuel)

Ctrl+S (quand editState !== null) :
  -> serializeArtifact(editState, parsedTemplate) -> content
  -> WriteArtifact(selectedPath, content)
  -> toast "Sauvegarde"
```

---

## O — Operations

### O1 — Ajouter `detectArtifactTypeFromPath` + `templatePathFor` dans `templateParser.ts`

- **Module** : `frontend`
- **Fichier** : `frontend/src/lib/templateParser.ts`
- **Signature** :
  ```typescript
  /**
   * Detecte le type d artefact depuis le segment de repertoire du chemin absolu.
   * Privilegier sur detectArtifactType(id) quand le chemin est disponible.
   */
  export function detectArtifactTypeFromPath(absolutePath: string): ArtifactType

  /**
   * Derive le chemin absolu du template depuis le chemin absolu de l artefact.
   * Ex. "C:/workspace/yukki/.yukki/stories/UI-016.md" + "story"
   *   -> "C:/workspace/yukki/.yukki/templates/story.md"
   * Retourne null si le chemin ne contient pas "/.yukki/".
   */
  export function templatePathFor(absolutePath: string, type: ArtifactType): string | null
  ```
- **Comportement** :
  1. `detectArtifactTypeFromPath` : normalise les separateurs (`\` -> `/`),
     cherche les segments `/.yukki/stories/` -> `story`, `/.yukki/analysis/` ->
     `analysis`, `/.yukki/prompts/` -> `canvas`, `/.yukki/inbox/` -> `inbox`,
     `/.yukki/epics/` -> `epic`. Fallback : `detectArtifactType(basename(path).split('-')[0])`.
  2. `templatePathFor` : extrait le prefixe jusqu a `/.yukki/`, concatene
     `/.yukki/templates/<templateNameForType(type)>.md`. Retourne `null` si
     `templateNameForType(type)` est `null` (type inconnu).
- **Tests** : `templateParser.test.ts` (nouveau fichier ou ajout) :
  - `detectArtifactTypeFromPath('C:/w/.yukki/stories/UI-016.md')` -> `'story'`
  - `detectArtifactTypeFromPath('C:/w/.yukki/analysis/UI-016.md')` -> `'analysis'`
  - `detectArtifactTypeFromPath('C:/w/.yukki/prompts/UI-016.md')` -> `'canvas'`
  - `templatePathFor('C:/w/.yukki/stories/UI-016.md', 'story')` -> `'C:/w/.yukki/templates/story.md'`
  - `templatePathFor('C:/w/.yukki/analysis/UI-016.md', 'analysis')` -> `null` (analysis sans template)
  - separateurs Windows (`\`) normalises correctement

### O2 — Charger template + construire `EditState` dans `SpddEditor` au changement de `selectedPath`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddEditor.tsx`
- **Signature** :
  ```typescript
  // Nouveaux imports a ajouter :
  import { parseTemplate, parseArtifactContent, detectArtifactTypeFromPath, templatePathFor } from '@/lib/templateParser';
  import { serializeArtifact } from '@/lib/genericSerializer';
  import { WriteArtifact } from '../../../wailsjs/go/main/App';
  import type { EditState, SectionState } from '@/lib/genericSerializer';
  import type { ParsedTemplate } from '@/lib/templateParser';

  // Nouveaux state dans SpddEditor() :
  const [editState, setEditState] = useState<EditState | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<ParsedTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  ```
- **Comportement** :
  1. L `useEffect` existant sur `selectedPath` charge deja l artefact via
     `ReadArtifact` + `markdownToDraft` + `resetDraft`. Etendre cet effet :
     apres avoir recu le `raw`, appeler `detectArtifactTypeFromPath(selectedPath)`
     pour obtenir le type, puis `templatePathFor(selectedPath, type)` pour le
     chemin template.
  2. Si `templatePath !== null` : appeler `ReadArtifact(templatePath)` (en parallele
     ou sequentiel apres le premier), puis `parseTemplate(rawTemplate)` ->
     `parsedTemplate`, puis `parseArtifactContent(raw, parsedTemplate)` ->
     `editState`. Stocker les deux avec `setParsedTemplate` + `setEditState`.
  3. Si `templatePath === null` (type non couvert) : `setEditState(null)`,
     `setParsedTemplate(null)`.
  4. Ajouter flag `aborted` dans l effet pour eviter les mises a jour stale si
     `selectedPath` change pendant le chargement.
  5. Passer `editState`, `parsedTemplate` en prop/context aux composants enfants
     qui en ont besoin (SpddDocument, SpddTOC, SpddHeader).
- **Tests** : `SpddEditor.test.tsx` (existant ou nouveau) :
  - story selectionnee -> `ReadArtifact` appele deux fois (artefact + template),
    `editState` non-null, sections = celles du template story
  - type inconnu -> `editState === null`
  - `selectedPath` change pendant chargement -> pas de mise a jour stale

### O3 — Desactiver `useAutoSave` quand `editState !== null`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddEditor.tsx`
- **Signature** :
  ```typescript
  // Modifier l appel existant :
  useAutoSave(draft, editState === null);
  ```
- **Comportement** :
  Passer `enabled = editState === null` a `useAutoSave`. Quand `editState` est
  non-null, `DraftSave` n est plus appele — evite d ecraser un fichier inbox ou
  analyse avec du contenu story serialise.
- **Tests** : SpddEditor.test — avec `editState` non-null, verifier que
  `DraftSave` n est pas appele apres 2s.

### O4 — Parametrer `SpddDocument` depuis `EditState.sections`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx`
- **Signature** :
  ```typescript
  export interface SpddDocumentProps {
    onActiveSectionFromScroll: (key: SectionKey) => void;
    // Nouveaux props optionnels :
    editState?: EditState | null;
    onEditStateChange?: (updated: EditState) => void;
  }
  ```
- **Comportement** :
  1. Si `editState` est non-null : iterer sur `editState.sections` au lieu de
     `SECTIONS` pour rendre les sections.
  2. Chaque `SectionState` rend un bloc avec heading `<h2>` + contenu selon le
     `widget` :
     - `'textarea'` : `<ProseTextarea>` (deja existant) avec le contenu de la
       section, `onChange` met a jour `editState.sections[i].content` via
       `onEditStateChange`.
     - `'ac-cards'` : `<SpddAcEditor>` (deja existant) ou `<GenericAcEditor>`
       (UI-015) — a decider selon la compat des types. Proposer `GenericAcEditor`
       pour les types non-story (inbox peut avoir des ACs), `SpddAcEditor` pour
       stories (coherence existante). Transition progressive.
  3. Si `editState === null` : comportement existant (itere sur `SECTIONS` statique).
  4. Section ID HTML : `spdd-section-<index>` si `editState` non-null (pas de
     `SectionKey` fixe), `spdd-section-<key>` si statique (existant).
- **Tests** : `SpddDocument.test.tsx` — rendu avec `editState` inbox (2 sections
  textarea) vs sans `editState` (8 sections statiques) ; mutation d une section
  via `onEditStateChange`.

### O5 — Parametrer `SpddTOC` depuis `EditState.sections`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddTOC.tsx`
- **Signature** :
  ```typescript
  export interface SpddTOCProps {
    onSectionClick: (key: SectionKey) => void;
    // Nouveau prop optionnel :
    editState?: EditState | null;
  }
  ```
- **Comportement** :
  1. Si `editState` est non-null : rendre la liste de sections depuis
     `editState.sections.map((s, i) => ({ key: String(i), label: s.heading }))`.
     Pastilles simplifiques : toutes `'optional'` (pas de logique required/done
     sur les sections generiques dans cette story).
  2. Si `editState === null` : comportement existant (SECTIONS statique + pastilles
     dynamiques depuis le store).
  3. Clic sur une section : scroll vers `document.getElementById('spdd-section-<i>')`.
- **Tests** : `SpddTOC.test.tsx` — rendu avec editState 3 sections -> 3 entrees ;
  sans editState -> 8 entrees statiques.

### O6 — Parametrer `SpddHeader` depuis `editState.fmValues`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddHeader.tsx`
- **Signature** :
  ```typescript
  // SpddHeader lit deja le store. Ajouter un prop optionnel :
  export interface SpddHeaderProps {
    editState?: EditState | null;
  }
  export function SpddHeader({ editState }: SpddHeaderProps = {}): JSX.Element
  ```
- **Comportement** :
  1. Si `editState` est non-null : afficher `editState.fmValues.id ?? ''`,
     `editState.fmValues.title ?? ''`, `editState.fmValues.status ?? 'draft'`
     a la place de `draft.id`, `draft.title`, `draft.status`.
  2. Le bouton "Exporter" est masque quand `editState !== null` (export story
     uniquement pour l instant).
  3. Le `SegmentedViewMode` est masque quand `editState !== null` (toggle
     markdown/wysiwyg n est pas pertinent pour les types generiques dans
     cette story).
  4. Si `editState === null` : comportement existant (lit le store).
- **Tests** : `SpddHeader.test.tsx` — rendu avec editState inbox -> id/title/status
  depuis fmValues ; sans editState -> valeurs depuis store.

### O7 — Masquer `SpddInspector` quand `editState !== null`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddEditor.tsx`
- **Signature** : modification inline dans le rendu de `SpddEditor`
- **Comportement** :
  1. Dans le ternaire de mise en page, ajouter condition :
     ```tsx
     const showInspector = !isMarkdown && !editState && !showDiffPanel;
     const showDiffPanelActual = !isMarkdown && (aiPhase === 'generating' || aiPhase === 'diff') && !editState;
     // grid-cols adapte : si editState non-null -> grid-cols-[240px_1fr] (pas d inspecteur)
     ```
  2. L inspecteur story (`SpddInspector`) n est rendu que quand `editState === null`.
     Quand `editState !== null`, la colonne droite est absente.
- **Tests** : `SpddEditor.test.tsx` — avec `editState` non-null, inspecteur absent ;
  sans `editState`, inspecteur present.

---

## N — Norms

- **Pas d effet de bord store** : `editState` et `parsedTemplate` vivent en
  `useState` local dans `SpddEditor`. Aucun module externe ne les lit via un store.
- **Pure functions** : `parseTemplate`, `parseArtifactContent`, `serializeArtifact`,
  `detectArtifactTypeFromPath`, `templatePathFor` sont toutes des pure functions
  sans side-effect — testables sans mock.
- **Aborted flag** : tout `useEffect` avec promesse asynchrone doit inclure un
  flag `let aborted = false` + `return () => { aborted = true }` pour eviter les
  mises a jour stale.
- **TypeScript strict** : pas de `as any`, pas d assertion non-null (`!`) sans
  guard explicite. `fmValues.title` peut etre `undefined` — `SpddHeader` doit
  tolerer ca.
- **Nommage** : composants en PascalCase, hooks en `use*`, types d interface en
  PascalCase, pas de suffixe `I` ou `T`.
- **Tests** : pyramide adaptee trophee (cf.
  `.yukki/methodology/testing/testing-frontend.md`) — tests d integration
  (composant + store + wails mock) privilegies sur les tests unitaires isoles.
  Coverage cible : logique de chargement + rendu conditionnel (pas les
  chemins CSS).
- **Raccourcis clavier** : Ctrl+S pour sauvegarder (quand `editState` non-null),
  identique a `StoryViewer`.

---

## S — Safeguards

- **Ne jamais appeler `DraftSave`** quand `editState !== null` — risque d ecraser
  un fichier generique avec du contenu story serialise. `useAutoSave` doit etre
  desactive via `enabled = editState === null`.
- **Ne jamais afficher les sections story hard-codees** pour un artefact dont
  `editState` est non-null — le rendu dynamique prime sur `SECTIONS`.
- **Ne jamais ignorer le flag `aborted`** dans les effets asynchrones — risque
  de mise a jour stale si `selectedPath` change rapidement.
- **Ne pas supprimer `parser.ts` / `serializer.ts` / `sections.ts`** dans cette
  story — ils restent en place pour `StoryDraft`, l AI Assist et les tests
  existants. Migration = story separee.
- **Ne pas modifier `StoryDraft` ni `useSpddEditorStore`** — ces types sont
  consommes par l AI Assist (`useSpddSuggest`, `AiDiffPanel`) et `useAutoSave`.
  Toute modification casse ces features.
- **Ne pas afficher `SpddInspector`** quand `editState !== null` — les tips
  story-specifiques (Background, Business Value) n ont pas de sens pour un
  artefact inbox ou epic.
- **`templatePathFor` ne jamais hardcoder** de chemin absolu — deriver depuis
  `selectedPath` uniquement.
