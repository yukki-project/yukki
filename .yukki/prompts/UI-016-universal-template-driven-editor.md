---
id: UI-016
slug: universal-template-driven-editor
story: .yukki/stories/UI-016-universal-template-driven-editor.md
analysis: .yukki/analysis/UI-016-universal-template-driven-editor.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — SpddEditor universel piloté par template avec mode lecture intégré

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

`SpddEditor` est hard-codé pour les stories et inaccessible depuis la liste d'artefacts. `StoryViewer` affiche les artefacts en Markdown brut, sans tirer parti des templates. Il faut un éditeur unique, piloté par template, avec un mode lecture (view-only) qui remplace la vue Markdown prose, et un mode édition qui remplace le textarea brut.

### Definition of Done

- [ ] Cliquer un item de la liste affiche le mode lecture structuré (AC1)
- [ ] Le bouton "Éditer" (ou `E`) bascule en mode édition avec sections éditables selon leur widget (AC2)
- [ ] `Ctrl+S` / bouton "Enregistrer" écrit le fichier via `WriteArtifact`, bascule en lecture, affiche un toast (AC3)
- [ ] Les sections AC sont rendues en cartes Given/When/Then en lecture ET en édition (AC4)
- [ ] Types sans template connu → fallback textarea brut avec bandeau "Template non disponible" (AC5)
- [ ] Le bouton "+ New Story" et `NewStoryModal` sont supprimés
- [ ] Le mode `editor` est supprimé de `ShellMode` et de `App.tsx`
- [ ] `parser.ts`, `serializer.ts`, `sections.ts` (dossier spdd) sont supprimés ou vidés

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `ParsedTemplate` | Spec dérivée d'un template `.yukki/templates/<type>.md` | `fmSpecs: FrontmatterSpec[]`, `sections: SectionSpec[]` | Chargée une fois à l'ouverture du mode édition/lecture ; immuable pendant la session |
| `EditState` | État édité d'un artefact : frontmatter + sections | `fmValues: Record<string, string \| string[]>`, `sections: SectionState[]` | Créé à partir du contenu fichier + template ; muté par les inputs ; sérialisé à la sauvegarde |
| `SectionState` | État d'une section individuelle | `heading`, `widget: 'textarea' \| 'ac-cards'`, `content`, `acs: GenericAc[]` | Partie de `EditState` |
| `GenericAc` | Un critère AC générique | `id`, `title`, `given`, `when`, `then` | Créé/muté dans `GenericAcEditor` ; sérialisé en `### ACn — …` |
| `ArtifactType` | Type détecté depuis le préfixe d'ID | `'story' \| 'inbox' \| 'epic' \| 'unknown'` | Dérivé à la volée depuis `id` frontmatter |

### Relations

- `selectedPath` (artifacts store) ⟶ `ParsedTemplate` + `EditState` : chargement déclenché par changement de `selectedPath`
- `ParsedTemplate.sections[]` ⟶ `SectionState[]` : mapping 1-1 (sections orphelines ajoutées en fin)
- `EditState` ⟶ `serializeArtifact()` ⟶ contenu fichier (round-trip garanti)

---

## A — Approach

On supprime le store `useSpddEditorStore` (story-specific) et on le remplace par un store générique `useArtifactEditorStore` qui coordonne le chargement depuis `selectedPath`, le parsing via les fonctions UI-015, et la sauvegarde via `WriteArtifact`. Le composant `SpddEditor` est renommé et refactorisé en `ArtifactEditor` — il écoute `selectedPath`, charge le template correspondant au type, et bascule entre mode lecture (sections statiques, AC cards read-only) et mode édition (`TemplatedEditor` de UI-015). `StoryViewer` est simplifié : il délègue à `ArtifactEditor` pour les types couverts par un template, et conserve le fallback textarea brut pour les types inconnus.

`App.tsx` perd la route `activeMode === 'editor'` : l'éditeur s'affiche dans le panneau principal au clic sur un item de la liste (mode lecture), puis en édition via le bouton. `NewStoryModal` et le bouton "+" sont supprimés.

Les fichiers `parser.ts`, `serializer.ts`, `sections.ts` (dossier `spdd/`) sont supprimés après migration de tous leurs usages.

### Alternatives considérées

- **Deux systèmes parallèles** — `SpddEditor` pour stories, `TemplatedEditor` pour les autres — rejeté : dette O(n), UX inconsistante.
- **Générer UI côté Go** — rejeté : couplage fort, latence Wails, complexité versioning.
- **Garder mode `editor` comme route séparée** — rejeté : confusion mentale, rompt workflow contextuel.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature |
|---|---|---|
| `frontend/src/stores/` | `spdd.ts` → remplacé par `artifactEditor.ts` | création + suppression |
| `frontend/src/components/spdd/` | `SpddEditor.tsx` → `ArtifactEditor.tsx` ; suppression de `parser.ts`, `serializer.ts`, `sections.ts`, `SpddDocument.tsx`, `SpddInspector.tsx`, `SpddFmForm.tsx` | modification + suppressions |
| `frontend/src/components/hub/` | `StoryViewer.tsx` (simplification), `HubList.tsx` (suppression `+`), `NewStoryModal.tsx` (suppression), `SidebarPanel.tsx` (nettoyage) | modifications + suppressions |
| `frontend/src/App.tsx` | Supprimer route `editor`, importer `ArtifactEditor` | modification |
| `frontend/src/stores/shell.ts` | Supprimer `'editor'` de `ShellMode` | modification |
| `frontend/src/lib/` | `templateParser.ts`, `genericSerializer.ts` (UI-015) — non modifiés | — |
| `frontend/src/components/hub/` | `TemplatedEditor.tsx`, `GenericAcEditor.tsx` (UI-015) — non modifiés | — |

### Schéma de flux

```
Clic item liste
  → setSelectedPath(path)                      (artifacts store)
  → useArtifactEditorStore écoute selectedPath
  → ReadArtifact(path)                         (Wails)
  → detectArtifactType(id) → templateName
  → ReadArtifact(.yukki/templates/<type>.md)   (Wails)
  → parseTemplate(raw)       → ParsedTemplate
  → parseArtifactContent(raw, tmpl) → EditState
  → affiche ArtifactEditor (viewMode: 'read')

Clic "Éditer" (ou touche E)
  → setViewMode('edit')
  → affiche <TemplatedEditor editState template>

Clic "Enregistrer" (ou Ctrl+S)
  → serializeArtifact(editState, template) → string
  → WriteArtifact(path, content)           (Wails)
  → ReadArtifact(path)                     (refresh)
  → setViewMode('read')
  → toast "Sauvegardé"
```

---

## O — Operations

### O1 — Créer le store `useArtifactEditorStore`

- **Module** : `frontend`
- **Fichier** : `frontend/src/stores/artifactEditor.ts` (nouveau)
- **Signature** :
  ```typescript
  interface ArtifactEditorState {
    selectedPath: string;
    rawContent: string;
    parsedTemplate: ParsedTemplate | null;
    editState: EditState | null;
    viewMode: 'read' | 'edit';
    loading: boolean;
    saving: boolean;
    error: string | null;

    loadArtifact: (path: string) => Promise<void>;
    setViewMode: (mode: 'read' | 'edit') => void;
    updateEditState: (state: EditState) => void;
    saveArtifact: () => Promise<void>;
    reset: () => void;
  }

  export const useArtifactEditorStore = create<ArtifactEditorState>()(...)
  ```
- **Comportement** :
  1. `loadArtifact(path)` : set `loading=true`, appelle `ReadArtifact(path)`, stocke `rawContent`, détecte `artifactType` via `detectArtifactType(id)` (id extrait du frontmatter), dérive `templateName` via `templateNameForType`, si `templateName != null` : appelle `ReadArtifact(.yukki/templates/<type>.md)`, parse via `parseTemplate` → `parsedTemplate`, parse contenu via `parseArtifactContent` → `editState`. Si template absent ou type inconnu : `parsedTemplate=null`, `editState=null`. Set `viewMode='read'`, `loading=false`.
  2. `saveArtifact()` : si `parsedTemplate != null && editState != null` : `serializeArtifact(editState, parsedTemplate)` → `content`; sinon `rawContent`. Appelle `WriteArtifact(selectedPath, content)`, re-appelle `ReadArtifact` pour rafraîchir `rawContent`, set `viewMode='read'`, `saving=false`.
  3. Template path derivé depuis le chemin absolu de l'artefact (comme implémenté dans StoryViewer — extraire la racine `.yukki/` depuis le chemin absolu).
- **Tests** : `artifactEditor.test.ts` — charger story → template parsé, charger type inconnu → parsedTemplate null, saveArtifact → WriteArtifact appelé avec contenu sérialisé.

### O2 — Créer le composant `ArtifactEditor`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/ArtifactEditor.tsx` (nouveau)
- **Signature** :
  ```typescript
  export function ArtifactEditor(): JSX.Element
  // Pas de props — lit tout depuis useArtifactEditorStore + useArtifactsStore
  ```
- **Comportement** :
  1. Subscribe à `useArtifactsStore(s => s.selectedPath)` ; appelle `loadArtifact(path)` via `useEffect` quand `selectedPath` change.
  2. Si `!selectedPath` : affiche état vide "Sélectionner un artefact".
  3. Si `loading` : spinner.
  4. Si `error` : bandeau destructive.
  5. Si `viewMode === 'read'` : affiche `<ArtifactReadView>` (O3) + bouton "Éditer" haut droite (icône `Pencil`) + raccourci `E`.
  6. Si `viewMode === 'edit'` et `parsedTemplate !== null` : affiche `<TemplatedEditor editState template onChange={updateEditState}>` + boutons Save/Cancel haut droite + raccourci `Ctrl+S` / `Escape`.
  7. Si `viewMode === 'edit'` et `parsedTemplate === null` : affiche fallback textarea brut + bandeau "Template non disponible — édition en mode brut" + zone texte `rawContent` éditable + Save/Cancel.
  8. Save → `saveArtifact()` → toast "Sauvegardé" si succès, toast destructive si erreur.
- **Tests** : rendu état vide, rendu loading, rendu read avec template, rendu edit avec TemplatedEditor, rendu fallback textarea, raccourcis clavier E / Ctrl+S / Escape.

### O3 — Créer le composant `ArtifactReadView`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/ArtifactReadView.tsx` (nouveau)
- **Signature** :
  ```typescript
  interface ArtifactReadViewProps {
    editState: EditState;
    template: ParsedTemplate;
  }
  export function ArtifactReadView({ editState, template }: ArtifactReadViewProps): JSX.Element
  // Fallback si template null : ArtifactReadView ne s'affiche pas (ArtifactEditor bascule sur rawContent rendu en markdown)
  ```
- **Comportement** :
  1. Header : affiche les champs frontmatter clés (id, title, status, updated) en lecture seule — badges visuels identiques aux badges de `HubList` pour status.
  2. Pour chaque section dans `editState.sections` (dans l'ordre template) :
     - Heading `## <section.heading>` rendu en `<h2>` stylé.
     - Si `section.widget === 'ac-cards'` : rend chaque `GenericAc` en carte statique (même apparence que `GenericAcEditor` mais sans inputs, sans boutons d'action — read-only). Given=bleu, When=ambre, Then=vert.
     - Si `section.widget === 'textarea'` : rend `section.content` en `<ReactMarkdown>` avec `remarkGfm`.
  3. Sections orphelines (non reconnues par template) rendues à la fin, également en Markdown.
- **Tests** : rendu story complète (header + sections + AC cards) ; rendu inbox (pas d'AC cards) ; sections orphelines présentes en fin.

### O4 — Brancher `ArtifactEditor` dans `App.tsx` et supprimer la route `editor`

- **Module** : `frontend`
- **Fichier** : `frontend/src/App.tsx`
- **Signature** : modification inline
- **Comportement** :
  1. Supprimer l'import `SpddEditor`.
  2. Importer `ArtifactEditor`.
  3. Remplacer le ternaire :
     ```tsx
     // Avant
     {activeMode === 'editor' ? <SpddEditor /> : <StoryViewer className="flex-1" />}
     // Après
     <ArtifactEditor />
     ```
  4. Supprimer la condition `{activeMode !== 'editor' && <SidebarPanel />}` — la sidebar est toujours visible (l'éditeur s'intègre dans le panneau de droite, pas en plein écran).
- **Tests** : App.test.tsx — rendu avec activeMode='stories', item sélectionné → ArtifactEditor visible.

### O5 — Supprimer le mode `editor` de `ShellMode`

- **Module** : `frontend`
- **Fichier** : `frontend/src/stores/shell.ts`
- **Signature** : modification inline
- **Comportement** :
  1. Retirer `'editor'` du type `ShellMode`.
  2. Le guard de migration (`activeMode === 'editor' → 'stories'`) dans `onRehydrateStorage` est déjà en place (commit `dcbcbf7`) — le garder.
- **Tests** : TypeScript compile sans erreur ; le type `ShellMode` est restreint.

### O6 — Simplifier `StoryViewer` — déléguer à `ArtifactEditor`

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/hub/StoryViewer.tsx`
- **Comportement** :
  1. `StoryViewer` n'est plus rendu dans `App.tsx` (supprimé au profit de `ArtifactEditor` en O4).
  2. **Si des usages restants subsistent** (ex. composant test ou preview secondaire), les supprimer.
  3. Le fichier peut être supprimé entièrement une fois qu'aucun import ne le référence.
- **Tests** : `grep -r StoryViewer frontend/src` → 0 résultats après nettoyage.

### O7 — Supprimer `NewStoryModal` et le bouton "+" dans `HubList`

- **Module** : `frontend`
- **Fichiers** : `frontend/src/components/hub/NewStoryModal.tsx` (suppression), `frontend/src/components/hub/HubList.tsx` (modification), `frontend/src/components/hub/SidebarPanel.tsx` (nettoyage import si présent)
- **Comportement** :
  1. `HubList.tsx` : supprimer `import { NewStoryModal }`, l'état `modalOpen`, le `<Button>` `<Plus>`, le `<NewStoryModal>` en bas du JSX.
  2. Supprimer le fichier `NewStoryModal.tsx`.
  3. Si `SidebarPanel.tsx` importe ou référence `NewStoryModal` → supprimer ces références.
- **Tests** : HubList.test.tsx — le bouton "+" n'est plus dans le DOM ; pas d'import cassé.

### O8 — Supprimer les fichiers legacy du dossier `spdd/`

- **Module** : `frontend`
- **Fichiers à supprimer** : `frontend/src/components/spdd/parser.ts`, `frontend/src/components/spdd/serializer.ts`, `frontend/src/components/spdd/sections.ts`, `frontend/src/components/spdd/SpddDocument.tsx`, `frontend/src/components/spdd/SpddInspector.tsx`, `frontend/src/components/spdd/SpddFmForm.tsx`, `frontend/src/components/spdd/SpddEditor.tsx`
- **Fichiers à conserver** : `SpddAcEditor.tsx` (référencé par UI-015 `GenericAcEditor` pour la copie visuelle), `SpddHeader.tsx` (si réutilisé dans `ArtifactEditor`), `SpddMarkdownView.tsx` (si réutilisé dans fallback), `SpddTOC.tsx` (si réutilisé en O3), `types.ts` (types réutilisés par UI-015), composants AI (`AiPopover.tsx`, `AiDiffPanel.tsx`, `ExportChecklist.tsx`, etc.) — à supprimer si plus référencés, à conserver sinon.
- **Comportement** : avant suppression, vérifier via `grep` que chaque fichier n'est plus importé nulle part. Supprimer dans l'ordre inverse des dépendances. `SpddEditor.tsx` en dernier (après que App.tsx ne l'importe plus).
- **Tests** : `npx tsc --noEmit` → 0 erreurs après toutes les suppressions.

### O9 — Supprimer le store `spdd.ts`

- **Module** : `frontend`
- **Fichier** : `frontend/src/stores/spdd.ts` (suppression) + `frontend/src/stores/spdd.test.ts` (suppression)
- **Comportement** : après avoir vérifié qu'aucun import ne référence `useSpddEditorStore` ni `SpddEditorState`, supprimer les deux fichiers. Si des hooks (`useAutoSave.ts`, `useSpddSuggest.ts`, `useValidation.ts`) importent `spdd.ts`, les adapter pour importer depuis `artifactEditor.ts` ou les supprimer si plus utilisés.
- **Tests** : `npx tsc --noEmit` → 0 erreurs.

---

## N — Norms

- **Conventions React** : composants en PascalCase, hooks en camelCase préfixés `use`. Pas de `console.log` (utiliser toast pour les erreurs utilisateur).
- **Zustand** : stores avec `create<State>()`. Pas de `immer` sauf si l'état est profondément imbriqué. Actions nommées de façon verbale (loadArtifact, saveArtifact, setViewMode).
- **TypeScript strict** : pas de `any`, pas de `!` non-null assertion sauf preuve que la valeur est non-nulle. Tous les props d'interface documentés si non-évidents.
- **Wails bindings** : toujours vérifier `window['go']['uiapp']['App']` disponible (pattern `go?.uiapp?.App?.ReadArtifact`) en dev browser (pas de Wails).
- **Chemins de template** : dériver le chemin absolu template depuis le chemin absolu de l'artefact (extraire racine `.yukki/` et concaténer `templates/<type>.md`). Ne pas utiliser de chemin relatif passé à `ReadArtifact`.
- **Tests** : coverage sur logique store (loadArtifact, saveArtifact), composants (snapshot + interactions clavier). Pas de tests sur le markup CSS.
- **HMR Vite** : les suppressions de fichiers doivent être faites proprement (pas de fichiers vides laissés) pour éviter des erreurs HMR.

---

## S — Safeguards

- **Invariant I1** — `WriteArtifact` est appelé uniquement avec un `path` non-vide issu de `selectedPath`. Ne jamais écrire dans un fichier vide ou calculé côté frontend sans validation.
- **Invariant I2** — `serializeArtifact(editState, template)` est toujours appelé avec le `template` qui correspond au fichier courant. Ne jamais mélanger un `EditState` d'un artefact avec un `ParsedTemplate` d'un autre.
- **Invariant I3** — `SpddAcEditor.tsx` n'est **jamais modifié** dans cette story (safeguard UI-015 : il reste couplé au store story pour l'AI assist). Seul `GenericAcEditor.tsx` est utilisé dans `ArtifactEditor`.
- **Invariant I4** — Le mode `editor` est supprimé de `ShellMode` mais le guard de migration `activeMode === 'editor' → 'stories'` dans `onRehydrateStorage` est **conservé** pour les utilisateurs avec localStorage ancien.
- **Invariant I5** — Aucun code de `parser.ts` / `serializer.ts` n'est copié-collé dans les nouveaux fichiers. Toute logique de round-trip passe par les fonctions UI-015 (`parseArtifactContent`, `serializeArtifact`).
- **Invariant I6** — `NewStoryModal` est supprimé sans remplacement UI. La création d'artefacts reste dans les CLI skills (`/yukki-story`, etc.). Ne pas ajouter de bouton de création en remplacement.
- **Périmètre** — Ne pas refactorer `SpddAcEditor`, `AiPopover`, `AiDiffPanel`, `useSpddSuggest`, `useValidation` dans cette story. Ces composants seront adressés dans une future story AI assist.
