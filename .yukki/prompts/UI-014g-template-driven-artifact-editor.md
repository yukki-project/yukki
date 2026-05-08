---
id: UI-014g
slug: template-driven-artifact-editor
story: .yukki/stories/UI-014g-template-driven-artifact-editor.md
analysis: .yukki/analysis/UI-014g-template-driven-artifact-editor.md
status: implemented
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — Mode édition structuré dans StoryViewer piloté par template

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

`StoryViewer` propose un textarea brut pour éditer les artefacts. L'interface
ne reflète pas la structure sémantique du fichier (sections, frontmatter, AC).
Le résultat : l'utilisateur édite du markdown brut là où le template SPDD
définit une structure précise et des composants graphiques adaptés (cartes G/W/T).

### Definition of Done

- [ ] Le mode édition de `StoryViewer` affiche des sections séparées et
  labellisées, et non un textarea brut
- [ ] Les templates `.yukki/templates/story.md` et `.yukki/templates/inbox.md`
  sont lus via `ReadArtifact` et pilotent la structure de l'éditeur
- [ ] Une section dont le corps de template contient `**Given**` + `**When**`
  + `**Then**` est rendue avec `GenericAcEditor` (cartes colorées)
- [ ] Les autres sections sont rendues en `AutoTextarea` redimensionnable
- [ ] Le frontmatter est éditable via des inputs typés (text, date, select, tags)
- [ ] Le bouton "+ Ajouter un AC" ajoute une carte vide et focus le champ Given
- [ ] La sauvegarde reconstruit le fichier `.md` sans perte de données
  (frontmatter intact, sections dans l'ordre du template, AC au format
  `- **Given** … / - **When** … / - **Then** …`)
- [ ] Fallback textarea brut si aucun template ne correspond au type détecté,
  avec notice "Template inconnu — édition en mode brut"
- [ ] Tests round-trip couvrant story, inbox et le cas fallback

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `SectionSpec` | Description d'une section dérivée du template | `heading: string`, `widget: 'textarea' \| 'ac-cards'` | Créé au parsing du template, consommé par `TemplatedEditor`, détruit à la fermeture du mode édition |
| `FrontmatterSpec` | Description d'un champ frontmatter | `key: string`, `widget: 'text' \| 'date' \| 'select' \| 'tags'`, `options?: string[]` | Même cycle que `SectionSpec` |
| `GenericAc` | Critère d'acceptation générique (hors store Zustand) | `id: string`, `title: string`, `given: string`, `when: string`, `then: string` | Créé à l'init de `GenericAcEditor`, muté en local, sérialisé à la sauvegarde |
| `ParsedTemplate` | Résultat complet du parsing d'un template | `fmSpecs: FrontmatterSpec[]`, `sections: SectionSpec[]` | Créé une fois par `parseTemplate()`, immuable |

### Relations

- `StoryViewer` charge un `ParsedTemplate` via `parseTemplate(templateContent)` lors du clic Edit
- `TemplatedEditor` consomme `ParsedTemplate` + le contenu actuel du fichier, produit un `string` sur `onChange`
- `GenericAcEditor` consomme et produit `GenericAc[]` via callbacks props (pas de store global)

---

## A — Approach

`StoryViewer` garde sa structure existante (bouton Edit haut droite, état
`mode: 'read' | 'edit'`, `ReadArtifact` / `WriteArtifact`). Seul le bloc
rendu en mode edit change : le textarea brut est remplacé par `TemplatedEditor`.

Au clic Edit, `StoryViewer` :
1. Détermine le type de l'artefact depuis le préfixe du champ `id:` dans le frontmatter
   (`INBOX-` → `inbox`, `EPIC-` → `epic`, autres → `story` comme défaut)
2. Charge le template correspondant via `ReadArtifact('.yukki/templates/<type>.md')`
3. Parse le template via `parseTemplate(content)` → `ParsedTemplate`
4. Parse le contenu actuel du fichier en état éditable via `parseArtifactContent(raw, parsedTemplate)`
5. Rend `<TemplatedEditor>` avec ces données ; `TemplatedEditor` émet `onChange(newRaw: string)`
6. À la sauvegarde, `StoryViewer` appelle `WriteArtifact(path, newRaw)` comme avant

Le découplage du store se fait côté `GenericAcEditor` : composant séparé de
`SpddAcEditor`, avec `acs: GenericAc[]` + `onAcsChange: (acs: GenericAc[]) => void`
en props. `SpddAcEditor` (UI-014) reste inchangé.

### Alternatives considérées

- **Modifier `SpddAcEditor` en place** — risque de régression sur `SpddEditor`
  (UI-014) qui consomme `useSpddEditorStore` directement dans les sous-composants
- **Bundler les templates via `import.meta.glob`** — les templates sont dans
  `.yukki/templates/` hors `frontend/`, Vite ne les voit pas sans copie ;
  `ReadArtifact` est plus simple et déjà disponible

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `frontend/src/components/hub/` | `StoryViewer.tsx` | modification — remplace textarea edit par `<TemplatedEditor>` |
| `frontend/src/components/hub/` | `TemplatedEditor.tsx` | création |
| `frontend/src/components/hub/` | `GenericAcEditor.tsx` | création |
| `frontend/src/lib/` | `templateParser.ts` | création |
| `frontend/src/lib/` | `genericSerializer.ts` | création |
| `frontend/src/components/spdd/` | `SpddAcEditor.tsx` | aucun changement |
| `frontend/src/components/spdd/` | `types.ts` | ajout `SectionSpec`, `FrontmatterSpec`, `GenericAc` |

### Schéma de flux

```
Clic Edit
  └─ StoryViewer
       ├─ detectType(frontmatter.id) → 'story' | 'inbox' | 'epic' | 'unknown'
       ├─ ReadArtifact('.yukki/templates/<type>.md') → templateRaw
       ├─ parseTemplate(templateRaw) → ParsedTemplate { fmSpecs, sections }
       ├─ parseArtifactContent(fileRaw, ParsedTemplate) → EditState
       └─ <TemplatedEditor editState onChange={setDirty} />
              ├─ <FrontmatterForm fmSpecs fmValues onChange />   (inputs typés)
              └─ {sections.map(spec =>
                    spec.widget === 'ac-cards'
                      ? <GenericAcEditor acs onChange />          (cartes G/W/T)
                      : <AutoTextarea value onChange />            (textarea)
                  )}

Ctrl+S / Sauvegarde
  └─ serializeArtifact(editState, ParsedTemplate) → newRaw
       └─ WriteArtifact(path, newRaw)
```

---

## O — Operations

### O1 — Ajouter les types `SectionSpec`, `FrontmatterSpec`, `GenericAc` dans `types.ts`

- **Module** : `frontend/src/components/spdd/`
- **Fichier** : `types.ts`
- **Signature** :
  ```typescript
  export type SectionWidget = 'textarea' | 'ac-cards';
  export type FrontmatterWidget = 'text' | 'date' | 'select' | 'tags';

  export interface SectionSpec {
    heading: string;
    widget: SectionWidget;
  }

  export interface FrontmatterSpec {
    key: string;
    widget: FrontmatterWidget;
    options?: string[]; // pour widget='select'
  }

  export interface GenericAc {
    id: string;   // 'AC1', 'AC2', ...
    title: string;
    given: string;
    when: string;
    then: string;
  }
  ```
- **Comportement** : ajout pur, aucune modification des types existants
- **Tests** : aucun test unitaire nécessaire (types compilés)

---

### O2 — Créer `templateParser.ts`

- **Module** : `frontend/src/lib/`
- **Fichier** : `templateParser.ts`
- **Signature** :
  ```typescript
  export interface ParsedTemplate {
    fmSpecs: FrontmatterSpec[];
    sections: SectionSpec[];
  }

  export function parseTemplate(templateRaw: string): ParsedTemplate
  ```
- **Comportement** :
  1. Extraire le bloc frontmatter (`---…---`) du template
  2. Pour chaque champ frontmatter (ligne `key: <valeur-exemple>`) :
     - valeur contient `|` → `widget: 'select'`, `options` = valeurs séparées par `|`
     - clé est `created` ou `updated` → `widget: 'date'`
     - valeur est `[]` ou commence par `-` (liste) → `widget: 'tags'`
     - sinon → `widget: 'text'`
  3. Extraire les sections `##` du body (texte entre `## Titre` et le `##` suivant)
  4. Pour chaque section : détecter si le corps contient `**Given**` ET `**When**` ET `**Then**` → `widget: 'ac-cards'`, sinon `widget: 'textarea'`
  5. Retourner `{ fmSpecs, sections }`
- **Tests** :
  - `parseTemplate(storyTemplate)` → section AC a `widget: 'ac-cards'`
  - `parseTemplate(storyTemplate)` → section Background a `widget: 'textarea'`
  - `parseTemplate(inboxTemplate)` → aucune section `ac-cards`
  - `parseTemplate(epicTemplate)` → section "Acceptance Criteria haut niveau" a `widget: 'textarea'` (bullet-list sans G/W/T)
  - champ `status:` → `widget: 'select'` avec les options extraites
  - champ `created:` → `widget: 'date'`

---

### O3 — Créer `genericSerializer.ts`

- **Module** : `frontend/src/lib/`
- **Fichier** : `genericSerializer.ts`
- **Signature** :
  ```typescript
  export interface EditState {
    fmValues: Record<string, string | string[]>;
    sections: Array<{ heading: string; widget: SectionWidget; content: string; acs?: GenericAc[] }>;
  }

  export function parseArtifactContent(raw: string, template: ParsedTemplate): EditState

  export function serializeArtifact(state: EditState, template: ParsedTemplate): string
  ```
- **Comportement de `parseArtifactContent`** :
  1. Extraire le frontmatter YAML du fichier courant → `fmValues`
  2. Pour chaque `SectionSpec` du template :
     - Trouver la section correspondante dans le fichier par titre (case-insensitive)
     - Si `widget: 'textarea'` → `content` = texte brut de la section
     - Si `widget: 'ac-cards'` → parser les cartes `### ACn — titre` + `- **Given** …` / `- **When** …` / `- **Then** …` → `acs: GenericAc[]` ; `content = ''`
     - Si section absente du fichier → `content: ''` ou `acs: []`
  3. Conserver les sections du fichier absentes du template en fin (orphelines)
- **Comportement de `serializeArtifact`** :
  1. Reconstruire le frontmatter YAML depuis `fmValues` (ordre de `fmSpecs`)
  2. Pour chaque section dans `state.sections` (ordre `template.sections` en premier) :
     - `widget: 'textarea'` → `## Heading\n\n{content}\n\n`
     - `widget: 'ac-cards'` → `## Heading\n\n` + AC sérialisés :
       `### AC{n} — {title}\n\n- **Given** {given}\n- **When** {when}\n- **Then** {then}\n\n`
       (numérotation séquentielle recalculée 1..n)
  3. Sections orphelines ajoutées en fin telles quelles
- **Tests** :
  - round-trip story : `parseArtifactContent(serializeArtifact(state)) ≈ state`
  - round-trip inbox : idem
  - AC ajouté puis supprimé → numérotation recalculée correctement
  - Frontmatter intact après sauvegarde (champ `id` non modifié)
  - Section absente du template conservée en fin de fichier

---

### O4 — Créer `GenericAcEditor.tsx`

- **Module** : `frontend/src/components/hub/`
- **Fichier** : `GenericAcEditor.tsx`
- **Signature** :
  ```typescript
  interface GenericAcEditorProps {
    acs: GenericAc[];
    onChange: (acs: GenericAc[]) => void;
  }

  export function GenericAcEditor({ acs, onChange }: GenericAcEditorProps): JSX.Element
  ```
- **Comportement** :
  - Afficher une carte par AC (visuellement identique à `SpddAcEditor` : `GwtRow` avec labels colorés, titre éditable, boutons Dupliquer/Supprimer)
  - `GwtRow` et `AcCard` internes utilisent `onChange` en prop, pas `useSpddEditorStore`
  - Bouton "+ Ajouter un AC" en bas : ajoute `{ id: 'ACn+1', title: '', given: '', when: '', then: '' }`, focus sur l'input Given de la nouvelle carte
  - Duplication : insère une copie avec `id` suivant après la carte courante
  - Suppression : retire la carte et renumérote
- **Tests** :
  - Ajouter un AC → longueur `acs + 1`
  - Supprimer AC2 sur 3 cartes → 2 cartes restantes, ids recalculés `AC1`, `AC2`
  - `onChange` appelé à chaque modification d'un champ

---

### O5 — Créer `TemplatedEditor.tsx`

- **Module** : `frontend/src/components/hub/`
- **Fichier** : `TemplatedEditor.tsx`
- **Signature** :
  ```typescript
  interface TemplatedEditorProps {
    editState: EditState;
    template: ParsedTemplate;
    onChange: (state: EditState) => void;
  }

  export function TemplatedEditor({ editState, template, onChange }: TemplatedEditorProps): JSX.Element
  ```
- **Comportement** :
  - Rendre `<FrontmatterForm>` en haut (champs frontmatter selon `fmSpecs`)
  - Rendre chaque section dans l'ordre de `editState.sections` :
    - `widget: 'textarea'` → `<label>{heading}</label><AutoTextarea value={section.content} onChange={...} />`
    - `widget: 'ac-cards'` → `<label>{heading}</label><GenericAcEditor acs={section.acs} onChange={...} />`
  - `FrontmatterForm` (interne ou extrait) : pour chaque `FrontmatterSpec` :
    - `'text'` → `<input type="text" />`
    - `'date'` → `<input type="date" />`
    - `'select'` → `<select>` avec `<option>` par entrée `options`
    - `'tags'` → `<TagInput>` (liste éditable de strings, ou textarea si aucun composant disponible)
  - Chaque modification appelle `onChange` avec l'`EditState` mis à jour
- **Tests** :
  - Rendu avec template story → présence d'un `GenericAcEditor`
  - Rendu avec template inbox → absence de `GenericAcEditor`
  - Modification d'une textarea → `onChange` appelé avec le bon contenu

---

### O6 — Modifier `StoryViewer.tsx` pour intégrer `TemplatedEditor`

- **Module** : `frontend/src/components/hub/`
- **Fichier** : `StoryViewer.tsx`
- **Signature** : pas de nouveau export ; modification interne uniquement
- **Comportement** :
  1. Ajouter état : `template: ParsedTemplate | null`, `editState: EditState | null`, `templateLoading: boolean`
  2. Dans `enterEditMode()` :
     - Détecter le type : extraire `id` du frontmatter → préfixe avant `-` → mapper vers nom de template
       (`INBOX` → `inbox`, `EPIC` → `epic`, tout autre → `story`)
     - Si type connu : `ReadArtifact('.yukki/templates/<type>.md')` → `parseTemplate()` → `parseArtifactContent()`
     - Si `ReadArtifact` échoue (template introuvable) → `template = null` (fallback)
     - Stocker dans `template` et `editState`
  3. Dans le bloc render mode edit :
     - Si `template !== null` → `<TemplatedEditor editState={editState} template={template} onChange={setEditState} />`
     - Si `template === null` → textarea brut existant + notice "Template inconnu — édition en mode brut"
  4. Dans `handleSave()` :
     - Si `editState !== null` → `serializeArtifact(editState, template)` → `newRaw`
     - Sinon → `buildFullContent(content, dirtyContent)` (chemin existant)
- **Tests** :
  - Mock `ReadArtifact` avec template story → `TemplatedEditor` rendu en mode edit
  - Mock `ReadArtifact` retourne erreur → textarea brut + notice rendu

---

### O7 — Ajouter les tests round-trip dans `genericSerializer.test.ts`

- **Module** : `frontend/src/lib/`
- **Fichier** : `genericSerializer.test.ts` (nouveau)
- **Comportement** :
  - Suite Vitest couvrant les cas identifiés dans O3
  - Utiliser les fixtures des templates réels (`.yukki/templates/story.md`, `inbox.md`)
  - Couvrir : parse pur, serialize pur, round-trip complet, cas orphelines, cas AC vide

---

## N — Norms

- **Pas de store global** dans `TemplatedEditor`, `GenericAcEditor`, `templateParser`, `genericSerializer` — état local React uniquement (`useState`)
- **`SpddAcEditor` non modifié** — aucune régression sur UI-014
- **`ReadArtifact` pour les templates** — jamais de chemin hardcodé en dehors de la résolution du type
- **Round-trip sans perte** — `parseArtifactContent(serializeArtifact(state)) ≈ state` pour tous les types couverts
- **TypeScript strict** — tous les nouveaux fichiers en `strict: true`, pas de `any` non justifié
- **Numérotation AC** — toujours recalculée `AC1..n` à la sérialisation (pas d'ids stables)
- **Tailwind uniquement** — pas de CSS inline ; classes `yk-*` existantes pour les couleurs

---

## S — Safeguards

- **Ne jamais appeler `useSpddEditorStore`** dans `GenericAcEditor`, `TemplatedEditor`, `templateParser`, `genericSerializer`
- **Ne jamais modifier** `SpddAcEditor.tsx`, `parser.ts`, `serializer.ts` de `spdd/` dans cette story
- **Toujours tester le round-trip** avant de marquer une opération implémentée (O3 + O7 sont co-dépendants)
- **Fallback textarea** si `ReadArtifact` échoue — ne jamais bloquer l'accès à l'édition
- **Pas de `ReadArtifact` synchrone** — le chargement du template est async, afficher un état de chargement intermédiaire
- **Sections orphelines conservées** — un champ ou une section non reconnue du template ne doit jamais être perdu à la sauvegarde
