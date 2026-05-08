---
id: UI-014h
slug: universal-template-driven-editor
story: .yukki/stories/UI-014h-universal-template-driven-editor.md
analysis: .yukki/analysis/UI-014h-universal-template-driven-editor.md
status: synced
created: 2026-05-08
updated: 2026-05-09
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
- [ ] (O8) widget `'ac-cards'` dans le chemin generique monte `SpddAcEditor` (pas un placeholder),
  avec drag, completion, et le meme contrat de mutation que pour les stories
- [ ] (O9) widget `'fm-form'` dans le chemin generique monte `SpddFmForm` pilote par
  `parsedTemplate.fmSpecs` (validation et selecteurs derives du template, pas de mapping en dur)
- [ ] (O10) `GenericProseTextarea` expose un AI popover qui appelle `useSpddSuggest`
  avec `{ heading, artifactType }` comme contexte (pas de `SectionKey` story-specifique)
- [ ] Apres O9 livre : story bascule dans le chemin generique (`editState !== null`) ;
  `useSpddEditorStore` / `StoryDraft` / `useAutoSave` / `DraftSave` deviennent inactifs et
  sont planifies pour retrait dans une story de cleanup dediee (hors scope ici)
- [ ] (O11) `SectionSpec` etendu avec `required: boolean` + `help: string`, derives
  des annotations dans `.yukki/templates/<type>.md` ; `parseTemplate` les remonte
- [ ] (O12) Sidebar SECTIONS universelle : dot de progression par section (rempli /
  vide), badge `OBLIGATOIRE` quand `section.required === true`, footer "X/Y
  obligatoires" + liste des sections obligatoires manquantes — visible pour tous
  les types, pas seulement story
- [ ] (O13) Banner d avertissement universel "Le format ne correspond plus au
  template — passer en WYSIWYG va appliquer la structure attendue" + liste des
  sections requises absentes, dérivé du diff entre `editState.sections` et
  `parsedTemplate.sections.filter(s => s.required)` — affiché pour tous les types
- [ ] (O14) Inspector universel pilote par `parsedTemplate.sections[i].help`
  (et `fmSpecs[j].help` pour le front-matter) — remplace le comportement "hide
  Inspector pour non-story" de O7. Story conserve sa richesse, inbox/epic/
  analysis/canvas l acquierent

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

**Direction : unification staged vers le chemin template-driven (Option B).** Le
chemin `editState` (template -> sections dynamiques -> `serializeArtifact` -> 
`WriteArtifact`) devient la cible universelle. Le chemin legacy story 
(`StoryDraft` + `useSpddEditorStore` + `SpddFmForm`/`SpddAcEditor` montes 
statiquement + `useAutoSave`/`DraftSave` + AI popover sur `ProseTextarea`) 
migre progressivement, **widget par widget**, dans le chemin generique. Pas de 
big-bang : chaque etape est livrable seule, observable, reversible.

### Phases

| Phase | Operations | Etat | Cible |
|---|---|---|---|
| 1 — Foundation dual-path | O1–O7 | livre | rendu generique pour non-stories ; story reste legacy |
| 2 — `ac-cards` riche | O8 | a livrer | inbox/epic/canvas peuvent avoir des AC riches sans toucher a `StoryDraft` |
| 3 — `fm-form` derive du template | O9 | a livrer | story peut basculer dans le chemin generique apres cette etape |
| 4 — AI popover generique | O10 | a livrer | story garde son AI Assist apres bascule |
| 5 — Bascule story + retrait `StoryDraft` | (story dediee, hors scope) | hors scope | un seul chemin |

### Visual baseline

L editeur story actuel (rendu legacy avec sidebar SECTIONS + dots de progression +
badges `OBLIGATOIRE`, Inspector contextuel, banner "format diverge du template",
footer "X/Y obligatoires") est **la reference UX cible** pour tous les types
d artefacts. La migration vers le chemin generique ne doit **rien retirer** de
cette richesse — elle doit la **promouvoir** en pilotant ces elements depuis le
template (champs `required` et `help` declaratifs sur chaque `SectionSpec` /
`FrontmatterSpec`). Inbox, epic, analysis, canvas voient la **meme** UX que story,
parametree par leur template.

### Mecanique

`SpddEditor` garde `editState: EditState \| null` et `parsedTemplate: ParsedTemplate \| null`
en state local (`useState`). `SpddDocument` route le rendu d une section selon
`section.widget` :

- `widget === 'textarea'` -> `GenericProseTextarea` (apres O10 : avec AI popover)
- `widget === 'ac-cards'` -> `SpddAcEditor` (apres O8) — meme composant pour tous les types
- `widget === 'fm-form'` -> `SpddFmForm` pilote par `parsedTemplate.fmSpecs` (apres O9)

Tant que toutes les etapes ne sont pas livrees, le chemin legacy reste actif 
**uniquement pour les stories** (`type === 'story'` -> `editState` force a `null`). 
Le code de selection du chemin vit dans `SpddEditor` et est l unique point de 
bascule. **DraftSave reste actif pour story tant que O9 n est pas livre** 
(parce qu avant O9, `SpddFmForm` ne peut pas etre monte depuis `editState` -> 
story doit rester sur `StoryDraft` -> auto-save story-specifique).

Apres O9 : story bascule dans le chemin generique. `useAutoSave` desactive 
(via `enabled = editState === null` qui devient toujours `false` pour story), 
`StoryDraft` n est plus mute. `useSpddEditorStore` reste lisible (lecture seule, 
en attente de retrait dans la story de cleanup).

### Alternatives considerees

- **Maintenir deux chemins indefiniment (Option A)** — rejetee : duplication 
  croissante a chaque feature (AI, export, auto-save), inbox/epic restent 
  second-class.
- **Mapping `heading` -> composant via heuristique (Option C)** — rejetee : le 
  template declare deja `widget` explicitement ; deriver depuis le heading 
  contournerait la source de verite et serait fragile au moindre renommage de 
  section.
- **Migrer `spdd.ts` entierement vers `EditState` en un seul coup** — rejetee : 
  perimetre trop large, regression probable sur AI Assist + auto-save. Le 
  staged migration evite ce risque.
- **Creer un store global `useEditStateStore`** — rejetee : source de verite 
  dupliquee ; state local dans `SpddEditor` suffit.

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

  [Nouveau ajout UI-014h]
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
   * Ex. "C:/workspace/yukki/.yukki/stories/UI-014h.md" + "story"
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
  - `detectArtifactTypeFromPath('C:/w/.yukki/stories/UI-014h.md')` -> `'story'`
  - `detectArtifactTypeFromPath('C:/w/.yukki/analysis/UI-014h.md')` -> `'analysis'`
  - `detectArtifactTypeFromPath('C:/w/.yukki/prompts/UI-014h.md')` -> `'canvas'`
  - `templatePathFor('C:/w/.yukki/stories/UI-014h.md', 'story')` -> `'C:/w/.yukki/templates/story.md'`
  - `templatePathFor('C:/w/.yukki/analysis/UI-014h.md', 'analysis')` -> `null` (analysis sans template)
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
       (UI-014g) — a decider selon la compat des types. Proposer `GenericAcEditor`
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

### O7 — Masquer `SpddInspector` quand `editState !== null` *(provisoire — supersede par O14)*

> **Note** : ce comportement est **provisoire**. O14 promeut l Inspector au
> chemin generique en le pilotant via `parsedTemplate`. Apres O14, l Inspector
> est visible pour **tous** les types et la condition de masquage de O7 est
> retiree. O7 reste documente ici pour la tracabilite de la phase 1.

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

### O8 — Router `widget: 'ac-cards'` vers `SpddAcEditor` depuis le chemin generique

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx` (+ adaptation des 
  types si necessaire dans `SpddAcEditor.tsx`)
- **Signature** :
  ```typescript
  // Dans SpddDocument, dans la branche editState !== null, remplacer le rendu
  // GenericProseTextarea pour widget === 'ac-cards' par :
  if (section.widget === 'ac-cards') {
    return (
      <SpddAcEditor
        items={section.acs ?? []}
        onItemsChange={(next) => onSectionMutate(index, { acs: next })}
      />
    );
  }
  ```
- **Comportement** :
  1. `SpddAcEditor` est aujourd hui couple a `useSpddEditorStore` (mutation directe 
     de `draft.ac`). Le decoupler : ajouter une props API `items: GenericAc[]` + 
     `onItemsChange: (next: GenericAc[]) => void`. L API store reste disponible 
     pour le chemin legacy (compat ascendante via valeurs par defaut).
  2. Le type `GenericAc` (`{ id, title, given, when, then }`) est deja utilise par 
     `parseArtifactContent` — `SpddAcEditor` accepte ce type directement (les 
     champs sont identiques ou retypables sans migration).
  3. La mutation d un AC propage vers `editState.sections[i].acs` via `onSectionMutate`. 
     `serializeArtifact` ecrit la section AC selon le format du template.
  4. Aucun toggle de feature : c est une bascule definitive du rendu de `'ac-cards'` 
     dans le chemin generique. Le chemin legacy story (qui ne passe pas par `editState`) 
     n est pas touche par O8.
- **Tests** : `SpddDocument.test.tsx` — rendu d un `editState` avec une section 
  `widget: 'ac-cards'` -> `SpddAcEditor` est monte (pas un textarea) ; 
  ajout/suppression d un AC propage via `onSectionMutate`. `SpddAcEditor.test.tsx` 
  — rendu en mode props (sans store) avec `items` injecte.

### O9 — Router `widget: 'fm-form'` vers `SpddFmForm` pilote par `fmSpecs`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx` 
  (+ refactor de `SpddFmForm.tsx` pour accepter `fmSpecs`)
- **Signature** :
  ```typescript
  // Nouvelle props API SpddFmForm :
  export interface SpddFmFormProps {
    fmSpecs: FrontmatterSpec[];
    values: Record<string, string | string[]>;
    onValuesChange: (next: Record<string, string | string[]>) => void;
  }
  
  // Dans SpddDocument :
  if (section.widget === 'fm-form') {
    return (
      <SpddFmForm
        fmSpecs={parsedTemplate.fmSpecs}
        values={editState.fmValues}
        onValuesChange={onFmValuesChange}
      />
    );
  }
  ```
- **Comportement** :
  1. `SpddFmForm` aujourd hui contient des champs en dur (`id`, `slug`, `title`, 
     `status`, `modules`, ...) couples a `useSpddEditorStore`. Le refactorer en 
     formulaire generique drive par `fmSpecs` :
     - Pour chaque `FrontmatterSpec` : rendre le bon controle selon `spec.type` 
       (`'string'` -> input, `'enum'` -> select, `'array'` -> tags input, 
       `'date'` -> date input).
     - Validation derivee de `spec.required`, `spec.options`.
     - Plus de mapping en dur entre champs et `StoryDraft`.
  2. Apres O9, story peut basculer dans le chemin generique : son template 
     `story.md` declare un `widget: 'fm-form'` au debut, et `parsedTemplate.fmSpecs` 
     contient les memes specs que celles que `SpddFmForm` codait en dur 
     (verifier la conformite des specs avec un test). Si les specs divergent, 
     mettre a jour `story.md` (template) plutot que `SpddFmForm` (code).
  3. Une fois O9 livre, dans `SpddEditor` retirer la condition qui force 
     `editState = null` pour `type === 'story'`. Story passe par le chemin 
     generique. `useAutoSave` est desactive automatiquement (`enabled = editState 
     === null` -> `false`). `DraftSave` n est plus appele.
  4. Garde-fou de migration : ajouter un test e2e qui ouvre une story existante 
     dans le repo (ex. CORE-001), edite un champ FM, sauvegarde, et verifie 
     que le frontmatter du fichier est round-trip preserve (format yaml inchange 
     hors valeur modifiee).
- **Tests** : `SpddFmForm.test.tsx` — rendu pilote par `fmSpecs` synthetiques 
  (3 champs : `string`, `enum`, `array`) ; mutation propage via `onValuesChange`. 
  `SpddDocument.test.tsx` — section `widget: 'fm-form'` monte `SpddFmForm`. 
  `SpddEditor.test.tsx` — ouverture d une story apres O9 -> `editState !== null`, 
  `useAutoSave` desactive, `DraftSave` jamais appele.

### O10 — AI popover sur `GenericProseTextarea` avec contexte heading + type

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/GenericProseTextarea.tsx` 
  (+ extension de `useSpddSuggest`)
- **Signature** :
  ```typescript
  // Extension de useSpddSuggest : remplacer SectionKey par un contexte structure :
  export interface SuggestContext {
    artifactType: ArtifactType;
    sectionHeading: string;       // ex. "Background", "R — Requirements"
    sectionWidget: 'textarea' | 'ac-cards' | 'fm-form';
    selectionText: string;
    surroundingContent: string;   // contenu complet de la section
  }
  export function useSpddSuggest(): {
    suggest: (ctx: SuggestContext) => Promise<string>;
    streaming: boolean;
    cancel: () => void;
  }
  
  // GenericProseTextarea : detection de selection >= 3 mots -> openAiPopover
  // identique a ProseTextarea, mais le contexte envoye est SuggestContext.
  ```
- **Comportement** :
  1. `useSpddSuggest` aujourd hui prend `SectionKey` (story-specifique) pour 
     construire son prompt. Le refactorer pour prendre `SuggestContext` : le 
     prompt LLM est construit a partir du `heading` (titre humain de la section) 
     et du `artifactType` plutot que d un mapping `SectionKey -> consigne`. 
     Garder retro-compatibilite : si l appelant passe un `SectionKey` (chemin 
     legacy story), le mapper vers un `SuggestContext` synthetique.
  2. `GenericProseTextarea` ajoute la meme detection de selection que 
     `ProseTextarea` : `onSelect` -> si selection >= 3 mots, ouvrir un popover 
     ancre sur la selection ; bouton "Suggerer (AI)" appelle 
     `suggest({ artifactType, sectionHeading, sectionWidget: 'textarea', 
     selectionText, surroundingContent })`.
  3. Le streaming et la fusion du resultat reutilisent la meme infra que 
     `ProseTextarea` (composant `AiSuggestPopover` extrait au passage si pas 
     deja partage).
  4. Scope de prompt : le prompt LLM doit etre formule de maniere generique 
     ("Tu aides a editer la section <heading> d un artefact <type>. Voici 
     le contenu actuel : ... Voici la selection : ..."), pas de references 
     story-specifiques codees en dur dans `useSpddSuggest`.
- **Tests** : `useSpddSuggest.test.ts` — appel avec `SuggestContext` (artefact 
  inbox, heading "Probleme") -> prompt envoye contient le heading et le type, 
  pas de mention story-specifique. `GenericProseTextarea.test.tsx` — selection 
  de >= 3 mots -> popover s ouvre ; clic "Suggerer" -> `suggest` appele avec 
  le bon `SuggestContext`. Test d integration : ouverture d une inbox, 
  selection dans la section "Probleme", suggestion AI insere du texte.

### O11 — Etendre `SectionSpec` / `FrontmatterSpec` avec `required` + `help`

- **Module** : `frontend`
- **Fichier** : `frontend/src/lib/templateParser.ts`
- **Signature** :
  ```typescript
  export interface SectionSpec {
    heading: string;
    widget: 'textarea' | 'ac-cards' | 'fm-form';
    required: boolean;     // nouveau
    help: string;          // nouveau (markdown court, peut etre vide)
  }
  
  export interface FrontmatterSpec {
    name: string;
    type: 'string' | 'enum' | 'array' | 'date';
    required: boolean;     // deja present ou a ajouter selon l etat actuel
    help: string;          // nouveau
    options?: string[];
  }
  ```
- **Comportement** :
  1. Convention dans les templates `.yukki/templates/<type>.md` : chaque section
     porte un **commentaire HTML** d annotation juste apres son heading, format
     `<!-- spdd: required help="..." -->` ou variante YAML inline. `parseTemplate`
     extrait ces annotations et les remonte dans `SectionSpec`.
  2. Pour le front-matter, les annotations vivent dans un bloc YAML dedie en
     tete du template (ex. `# spdd-fm-spec:` puis specs).
  3. Default : `required: false`, `help: ''`. Pas de breaking change : les
     templates existants restent valides ; les annotations sont ajoutees
     incrementalement.
  4. Mettre a jour `story.md`, `inbox.md`, `epic.md`, `analysis.md`,
     `canvas-reasons.md` avec les annotations correspondantes (Background,
     Business Value, Scope In = required pour story, etc.).
- **Tests** : `templateParser.test.ts` — parser un template avec annotations
  `required` + `help` -> SectionSpec correctement remplie ; template sans
  annotations -> defaults appliques (pas d erreur).

### O12 — Sidebar `SpddTOC` + footer progression universels

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddTOC.tsx` + 
  `frontend/src/components/spdd/SpddFooter.tsx` (ou inline dans `SpddEditor`
  selon l existant)
- **Signature** :
  ```typescript
  // SpddTOC : extension de O5
  export interface SpddTOCProps {
    onSectionClick: (key: string) => void;
    editState?: EditState | null;
    parsedTemplate?: ParsedTemplate | null;
  }
  // Pour chaque section, derive : { filled: boolean, required: boolean }
  // - filled : section.content non vide OU section.acs non vide
  // - required : parsedTemplate.sections[i].required
  ```
- **Comportement** :
  1. `SpddTOC` (chemin generique) affiche pour chaque section :
     - dot de progression : `text-emerald-500` si `filled`, `text-slate-500` sinon
     - badge `OBLIGATOIRE` si `required && !filled` (style coherent avec story actuel)
  2. Footer (composant existant ou nouveau) : "X/Y obligatoires remplies" +
     liste des sections obligatoires non remplies (sous le label "manque : ...").
     Affiche aussi la liste pour les artefacts non-story.
  3. Les calculs `filled` / `required` sont des helpers purs derives de
     `editState` + `parsedTemplate`. Mises dans `frontend/src/lib/sectionStatus.ts`
     (nouveau fichier, sous le pattern de `statusBadge.ts`).
  4. Pour le chemin legacy story (`editState === null`), conserver la logique
     existante (les composants doivent rester retrocompatibles).
- **Tests** : `SpddTOC.test.tsx` — rendu avec un editState inbox dont la section
  Probleme est requise et vide -> badge OBLIGATOIRE present, dot vide ;
  apres remplissage du content -> badge disparait, dot rempli. Test integration
  via SpddEditor avec une story (chemin generique apres O9) verifiant que le
  comportement reste identique au legacy.

### O13 — Banner "format diverge du template" universel

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddTemplateDivergenceBanner.tsx`
  (nouveau) + integration dans `SpddEditor`
- **Signature** :
  ```typescript
  export interface TemplateDivergence {
    missingRequired: string[];   // headings de sections requises absentes
    extraSections: string[];     // sections du fichier non declarees dans le template
  }
  
  export function computeDivergence(
    editState: EditState,
    parsedTemplate: ParsedTemplate,
  ): TemplateDivergence
  
  export function SpddTemplateDivergenceBanner(props: {
    divergence: TemplateDivergence;
    onDismiss: () => void;
  }): JSX.Element | null
  ```
- **Comportement** :
  1. Apres chargement d un artefact, calculer la divergence : sections requises
     du template absentes du fichier, sections du fichier non declarees dans le
     template.
  2. Si `missingRequired.length > 0` : afficher le banner orange/amber en haut
     du `SpddDocument` :
     > "Le format ne correspond plus au template SPDD — passer en WYSIWYG va
     > appliquer la structure attendue."
     suivi d une liste a puces des sections concernees ("La section X est
     absente. Elle sera reinseree vide.").
  3. Bouton de fermeture (`onDismiss`) qui cache le banner pour la session
     courante (state local, pas persiste).
  4. Le calcul de divergence est une **pure function** dans
     `frontend/src/lib/templateDivergence.ts` (nouveau fichier).
- **Tests** : `templateDivergence.test.ts` — editState inbox avec section
  Probleme absente alors que le template la marque required -> divergence
  detectee. `SpddTemplateDivergenceBanner.test.tsx` — divergence non vide ->
  banner rendu ; vide -> rien.

### O14 — Inspector universel pilote par `parsedTemplate`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddInspector.tsx` (refactor) +
  `frontend/src/components/spdd/SpddEditor.tsx` (retrait de la condition de O7)
- **Signature** :
  ```typescript
  export interface SpddInspectorProps {
    parsedTemplate: ParsedTemplate | null;
    activeSection: { kind: 'fm' } | { kind: 'section'; index: number };
    fmValues: Record<string, string | string[]>;
    editState: EditState | null;
  }
  ```
- **Comportement** :
  1. Refactorer `SpddInspector` pour qu il prenne `parsedTemplate` + 
     `activeSection` au lieu de la `SectionKey` story-specifique.
  2. Pour `activeSection.kind === 'fm'` : afficher la liste des modules connus
     (depuis fmValues), les statuts SPDD (helper texte), et la liste des
     `FrontmatterSpec.help` pour chaque champ FM.
  3. Pour `activeSection.kind === 'section'` : afficher
     `parsedTemplate.sections[index].help` (markdown court rendu en prose).
     Si `help === ''`, afficher un placeholder neutre ("Pas de tip pour cette
     section").
  4. Apres O14, dans `SpddEditor`, retirer la condition `!editState` du
     `showInspector` introduite par O7. L Inspector s affiche pour tous les
     types tant qu `parsedTemplate` est disponible.
  5. Les sections particulieres riches (ex. AC -> compteurs Given/When/Then,
     statuts SPDD detailles) restent disponibles si la section est reconnue
     par heading/widget — surcouche optionnelle au-dessus du `help` derive du
     template.
- **Tests** : `SpddInspector.test.tsx` — rendu avec un parsedTemplate inbox,
  activeSection sur la section "Probleme" -> tip rendu depuis `section.help`.
  Rendu sur le front-matter -> liste des modules + helps des FM specs.
  Test integration via `SpddEditor` : l Inspector reste visible pour un
  artefact inbox.

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
  desactive via `enabled = editState === null`. **DraftSave reste actif pour
  les stories tant que O9 n est pas livre** (avant O9, story reste sur le chemin
  legacy avec `editState === null` force pour `type === 'story'`).
- **Ne jamais afficher les sections story hard-codees** pour un artefact dont
  `editState` est non-null — le rendu dynamique prime sur `SECTIONS`.
- **Ne jamais ignorer le flag `aborted`** dans les effets asynchrones — risque
  de mise a jour stale si `selectedPath` change rapidement.
- **Ne pas supprimer `parser.ts` / `serializer.ts` / `sections.ts`** tant que
  O8-O10 ne sont pas livres et que la story de cleanup `StoryDraft` n a pas
  ete planifiee — ils restent en place pour `StoryDraft` et les tests existants.
- **Ne pas modifier `StoryDraft` ni `useSpddEditorStore` tant que O8-O10 ne
  sont pas livres** — ces types sont consommes par l AI Assist legacy
  (`useSpddSuggest` v1, `AiDiffPanel`) et `useAutoSave`. Apres O10, leur retrait
  progressif fait l objet d une story de cleanup dediee (hors scope ici).
- **Ne pas refactorer `SpddAcEditor` / `SpddFmForm` en place destructive** lors
  de O8/O9 — ajouter une **props API parallele** (`items`/`onItemsChange`,
  `fmSpecs`/`values`/`onValuesChange`) qui coexiste avec l API store, pour ne
  pas casser le chemin legacy story tant qu il existe.
- **Ne pas afficher `SpddInspector`** quand `editState !== null` **et tant que
  O14 n est pas livre** — les tips story-specifiques (Background, Business Value)
  n ont pas de sens pour un artefact inbox ou epic. Apres O14, l Inspector
  devient generique (pilote par `parsedTemplate.sections[i].help`) et la
  condition de masquage est retiree : il s affiche pour tous les types.
- **`templatePathFor` ne jamais hardcoder** de chemin absolu — deriver depuis
  `selectedPath` uniquement.
- **Round-trip frontmatter preserve** — apres O9, ouvrir+sauvegarder une story
  existante sans modification doit produire un fichier identique octet pour
  octet (modulo normalisation EOL). Tester explicitement avec une story du
  repo (ex. CORE-001).

---

## Changelog

- 2026-05-08 — `R / A / O / S` — Bascule de l Approach vers une **unification
  staged** (Option B en 3 etapes au lieu de "deux chemins coexistants
  indefiniment"). Ajout de `O8` (router `widget: 'ac-cards'` -> `SpddAcEditor`),
  `O9` (router `widget: 'fm-form'` -> `SpddFmForm` pilote par `fmSpecs`,
  bascule story dans le chemin generique apres O9), `O10` (AI popover sur
  `GenericProseTextarea` avec contexte `{ heading, artifactType }`). DoD
  etendu (4 items lies aux nouvelles Ops). Safeguards ajustes : `StoryDraft`
  / `useSpddEditorStore` / `DraftSave` deviennent **conditionnellement
  preserves** (jusqu a O9 pour DraftSave, jusqu a la story de cleanup
  post-O10 pour les types). Ajout d un safeguard "props API parallele"
  pour ne pas casser le chemin legacy lors de O8/O9. Sections E, S Structure,
  N inchangees (les nouvelles Ops reutilisent les modules deja recenses).
  Status repasse de `implemented` a `reviewed`.
- 2026-05-08 — `R / A / O / S` — Promotion de la **richesse UX legacy** au
  chemin generique (instruction "prend comme base ce component"). Ajout de
  `O11` (etendre `SectionSpec` / `FrontmatterSpec` avec `required` + `help`),
  `O12` (sidebar SECTIONS + footer progression universels avec dots et badges
  `OBLIGATOIRE`), `O13` (banner "format diverge du template" universel via
  `computeDivergence`), `O14` (Inspector universel pilote par
  `parsedTemplate.sections[i].help`, supersede O7). DoD etendu (4 items
  supplementaires). O7 marque comme provisoire (note inline). Safeguard
  Inspector conditionne sur "tant que O14 non livre".
- 2026-05-08 — `O / S — generation` — `/yukki-generate` execute pour le
  slice **visual baseline** (O11 + O12 + O13 + O14). Livrables :
  - `frontend/src/components/spdd/types.ts` — `SectionSpec` et
    `FrontmatterSpec` etendus avec `required: boolean` + `help: string`.
  - `frontend/src/lib/templateParser.ts` — parser des annotations HTML
    `<!-- spdd: required help="..." -->` apres chaque heading. Defaults
    `required=false`, `help=''` pour compat ascendante.
  - `frontend/src/lib/sectionStatus.ts` (nouveau) — helpers purs
    `isSectionFilled`, `genericProgress`, `genericSectionStatus`.
  - `frontend/src/lib/templateDivergence.ts` (nouveau) —
    `computeDivergence` + `divergenceWarnings`. `SectionState`
    enrichi avec `presentInFile: boolean`.
  - `frontend/src/components/spdd/SpddTOC.tsx` — branche generique
    enrichie : dots de progression, badges `OBLIGATOIRE`, footer
    "X/Y obligatoires" + missing list, propagation de
    `activeGenericIndex` + `onGenericSectionClick`.
  - `frontend/src/components/spdd/SpddFooter.tsx` — bascule sur
    `genericProgress(editState, parsedTemplate)` quand fournis.
  - `frontend/src/components/spdd/GenericInspector.tsx` (nouveau) —
    Inspector pilote par `parsedTemplate.sections[i].help` ; cards
    Aide, Etat (required/widget/rempli/source), Sauvegarder.
  - `frontend/src/components/spdd/SpddEditor.tsx` — wiring complet :
    `activeGenericIndex` local, `divergenceDismissed` local,
    `warningsToShow` derive de `divergenceWarnings(computeDivergence)`
    pour le chemin generique, retrait du `GenericInspector` inline,
    montage du nouveau composant. Note inline pour O7 (provisoire).
  - 5 templates annotes : `story.md`, `inbox.md`, `epic.md`,
    `analysis.md`, `canvas-reasons.md`.
  - 4 fichiers de tests (65 tests verts) : `templateParser.test.ts`
    (annotations), `sectionStatus.test.ts` (nouveau),
    `templateDivergence.test.ts` (nouveau), `genericSerializer.test.ts`
    (round-trip preserve).

  **Reportes au prochain `/yukki-generate`** : `O8` (SpddAcEditor props API),
  `O9` (SpddFmForm fmSpecs-driven + bascule story), `O10` (useSpddSuggest
  generique + AI popover sur GenericProseTextarea). Justification :
  scope refactor des widgets riches qui touche l ecosysteme AI Assist
  legacy + store ; isolation pour limiter le risque de regression.

  Status reste `reviewed` (ne passe pas a `implemented` tant que O8-O10
  ne sont pas livres). Type-check frontend vert ; 65 nouveaux tests verts ;
  7 echecs preexistants dans `TabBar.test.tsx` et `StoryViewer.test.tsx`
  (timers fakes manquants, sans rapport avec ce slice).
- 2026-05-08 — `O / S — bugfixes parser` — Pendant la validation visuelle du
  slice O11-O14, deux bugs decouverts dans `parseTemplate` / `parseFmValues`
  (regression non couverte par les tests fixtures car ceux-ci omettaient
  `# <titre>` entre frontmatter et premier `##`, et utilisaient LF au lieu
  de CRLF) :
  - **#1 Preambule pollution** : `flushSection()` ne vidait pas
    `currentContent` avant le premier `##`, donc la H1 et lignes preliminaires
    s accumulaient dans la premiere section -> `parseSectionAnnotation`
    voyait `# <titre>` comme premiere ligne non-vide et ratait l annotation
    `<!-- spdd: required -->`. Fix : `currentContent.length = 0` toujours,
    pas seulement si `currentHeading !== null`. Test de regression ajoute.
  - **#2 CRLF** : `parseFmValues` et `splitBodySections` splittaient sur
    `\n` ; les fichiers Windows (CRLF) gardaient un `\r` traînant qui cassait
    la regex `^kv:\s*(.*)$` (en JS, `.` ne matche pas `\r` et `$` non plus).
    Resultat : aucun champ FM parse sauf le dernier (sans `\r`). Fix :
    splitter sur `\r?\n` partout. Test de regression CRLF dedie.
  Apres fix : 68 tests verts.
- 2026-05-08 — `O / S — generation 2` — `/yukki-generate` execute pour le
  slice **widgets riches** (O8 + O9 + O10). Livrables :
  - `frontend/src/components/spdd/SpddAcEditor.tsx` — props API parallele
    (`items` / `onItemsChange` / `readOnly`) qui coexiste avec l API store
    legacy. Controller abstraction (store-backed vs props-backed) interne.
    AC, drag handle, dup, delete masques en lecture seule.
  - `frontend/src/components/spdd/SpddFmForm.tsx` — props API parallele
    (`fmSpecs` / `values` / `onValuesChange` / `readOnly`). Mode generique
    rend les champs dynamiquement par widget (`text` / `select` / `date` /
    `tags` avec chips). Mode legacy story (sans props) inchange : champs
    en dur + validation + suggestions modules.
  - `frontend/src/components/spdd/SpddDocument.tsx` — branche generique
    monte `SpddFmForm` en tete (front-matter pseudo-section avec heading
    "Front-matter" + badge `OBLIGATOIRE`), puis itere `editState.sections`
    en routant `widget: 'ac-cards'` -> `SpddAcEditor` (avec items/readOnly)
    et `widget: 'textarea'` -> `GenericProseTextarea` (avec sectionHeading
    + artifactType pour le contexte AI).
  - `frontend/src/components/spdd/GenericProseTextarea.tsx` (nouveau) —
    extrait du SpddDocument, ajoute detection de selection >= 3 mots ->
    `GenericAiPopoverPanel` flottant a la position de la selection.
    Le popover liste les 4 actions IA (`AI_ACTIONS`), kick off
    `useSpddSuggest.start({ section: heading, action, selectedText })`,
    affiche le streaming en zone scrollable, propose Accepter / Refuser.
    Sur Accepter, la selection [start, end] est remplacee par le resultat.
  - 2 fichiers de tests (13 tests verts) : `SpddAcEditor.test.tsx` (5),
    `SpddFmForm.test.tsx` (8). Couvre : rendu props, mutations propagees
    via callback, renumerotation AC sur delete, readOnly desactive
    inputs+actions+ajout, type-specific widget rendering pour FM.

  **Divergence avec canvas** : O9.3 dans le canvas precise "retirer la
  condition qui force `editState = null` pour `type === 'story'`" (bascule
  story dans le chemin generique). MAIS l Approach Phase 5 marque
  "Bascule story + retrait `StoryDraft` (story dediee, hors scope)".
  Resolution : la bascule N'EST PAS livree dans ce slice — coherent avec
  l Approach. La condition `type !== 'story'` reste dans `SpddEditor`.
  `DraftSave` reste actif pour story. Le retrait sera traite dans une
  story dediee post-UI-014h (cleanup `StoryDraft` + bascule).

  **Suggestion utilisateur (a traiter en story dediee)** : "AI actions
  dans la spec ?". Idee : declarer les actions IA disponibles par section
  dans le template (`<!-- spdd: ai-actions="improve,enrich,structurer-invest" -->`)
  ou par type d artefact (bloc top du template). Permet des actions
  specifiques (ex. "Structurer en INVEST" sur les sections AC, "BVA" sur
  Cas limites de l analyse). Aujourd hui les 4 actions sont codees dans
  `aiActions.ts`. Necessite une story future : extension SectionSpec/
  ParsedTemplate avec `aiActions`, parsing annotation, GenericProseTextarea
  prend la liste en prop.

  Status passe a `implemented`. Type-check frontend vert ; 81 tests verts
  au total (incluant 2 nouvelles suites). 7 echecs preexistants
  inchanges.
