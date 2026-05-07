---
id: UI-016
slug: universal-template-driven-editor
title: SpddEditor universel piloté par template avec mode lecture intégré
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
story: .yukki/stories/UI-016-universal-template-driven-editor.md
---

# Analyse — UI-016 SpddEditor universel piloté par template avec mode lecture intégré

> Analyse SPDD de la story `UI-016-universal-template-driven-editor`.
> Migrer `SpddEditor` + son store vers un modèle entièrement piloté par
> template (en réutilisant la couche `ParsedTemplate` + `EditState` produite
> en UI-015) et y ajouter un mode lecture (view-only) qui remplace la vue
> Markdown prose de `StoryViewer` pour tous les artefacts.

---

## Concepts de domaine

### Concepts existants

- **`SpddEditor` / `useSpddEditorStore`** — ensemble hard-codé pour stories
  (`frontend/src/components/spdd/SpddEditor.tsx`, `stores/spdd.ts`). Affiche
  9 sections (fm, bg, bv, si, so, ac, oq, no) alimentées par `SECTIONS`
  statique, parser/serializer dédiés (`parser.ts`, `serializer.ts`). Store
  mutationnel avec AI assist (UI-014d).

- **`SECTIONS` array** (`frontend/src/components/spdd/sections.ts`) — tableau
  statique définissant les 8 sections story (clé + label + requis). Source de
  vérité actuelle de l'interface éditeur.

- **`StoryDraft` type** (`frontend/src/components/spdd/types.ts`) — structure
  figée pour une story brouillon : frontmatter story-specific (`id`, `slug`,
  `title`, `status`, `created`, `updated`, `owner`, `modules`), sections
  prose, et `ac[]` (Acceptance Criteria).

- **`parser.ts` / `serializer.ts`** — paires story-spécifiques pour round-trip
  Markdown ↔ `StoryDraft`. Non généralisables car elles connaissent les 8
  sections story par cœur.

- **`StoryViewer`** (`frontend/src/components/hub/StoryViewer.tsx`) — affiche
  artefacts en lecture (markdown + ReactMarkdown), peut basculer en édition
  textarea brut. Dispose déjà du `mode` state (read/edit) et commence à
  utiliser `TemplatedEditor` (UI-015).

- **UI-015 : `ParsedTemplate` + `EditState`** — couche générique complète :
  - `ParsedTemplate` (`lib/templateParser.ts`) : `fmSpecs[]` + `sections[]`
    dérivés d'un template `.md`
  - `EditState` (`lib/genericSerializer.ts`) : `fmValues{}` + `sections[]`
    représentant l'état édité
  - `TemplatedEditor` : composant React générique (frontmatter + sections)
  - `GenericAcEditor` : composant AC cards découplé du store
  - `parseTemplate()`, `parseArtifactContent()`, `serializeArtifact()` —
    fonctions pures pour round-trip

- **`detectArtifactType(id)` / `templateNameForType(type)`** — utilitaires
  déjà présents (`lib/templateParser.ts`) pour mapper type d'artefact →
  template (`story`, `inbox`, `epic`).

- **Templates `.yukki/templates/`** — story.md, inbox.md, epic.md,
  analysis.md, canvas.md. Chacun définit la structure YAML frontmatter +
  sections. Lus depuis le disque via `ReadArtifact` (Wails).

- **`useAutoSave` hook** (`frontend/src/hooks/useAutoSave.ts`) — sauvegarde
  auto via `DraftSave` (Go backend) toutes les 2s. Appelé depuis `SpddEditor`
  pour stories uniquement ; fortement couplé à `StoryDraft`.

- **`NewStoryModal`** (`frontend/src/components/hub/NewStoryModal.tsx`) —
  dialogue pour créer une story via `/yukki-story` CLI (exécutée en Go).
  Utilisée depuis `HubList.tsx` uniquement quand `kind === 'stories'`. Lance
  l'exécution Go, écoute `provider:*` events, rafraîchit la liste et sélectionne
  le nouvel artefact.

- **Mode `editor` dans `App.tsx`** — route actuelle dédiée à `SpddEditor`,
  affiche l'éditeur seul (pas de sidebar liste). Route contrôlée via
  `ShellMode` / `ShellStore`.

- **Artifacts store** (`frontend/src/stores/artifacts.ts`) — dispose de
  `selectedPath` (chemin du fichier courant) déjà utilisé par `StoryViewer`
  pour charger le contenu au clic.

### Concepts nouveaux à introduire

- **Store générique unifié** — refactorer `useSpddEditorStore` pour
  devenir indépendant du type d'artefact. État unifié :
  ```typescript
  {
    selectedPath: string;
    viewMode: 'read' | 'edit';
    editState: EditState | null;
    parsedTemplate: ParsedTemplate | null;
    loading: boolean;
    error: string | null;
    loadArtifact(path: string): Promise<void>;
    setViewMode(mode: 'read' | 'edit'): void;
    updateEditState(state: EditState): void;
    saveArtifact(): Promise<void>;
  }
  ```

- **Mode lecture (view-only)** — rendu structuré des sections sans formulaires
  éditables. Sections affichées comme prose organisée (heading + contenu
  formaté), AC en cards statiques, frontmatter en tableau read-only. Bouton
  "Éditer" bascule en mode édition ; bouton "Enregistrer" revient en lecture.

- **`SpddEditor` universel** — refactorisation du composant pour :
  - Lire le `selectedPath` depuis `useArtifactsStore`
  - Charger le fichier via `ReadArtifact` + détecter le type via ID
  - Parser le template correspondant via `parseTemplate` (UI-015)
  - Parser le contenu via `parseArtifactContent` (UI-015)
  - Afficher soit le mode read (sections statiques), soit le mode edit
    (`TemplatedEditor` de UI-015)
  - Sauvegarder via `WriteArtifact` + `serializeArtifact` (UI-015)

- **Suppression de l'UI de création** :
  - Bouton "+ New Story" de `HubList.tsx` — supprimé
  - `NewStoryModal.tsx` — composant supprimé
  - Mode `editor` dans `ShellStore` / `App.tsx` — supprimé

---

## Approche stratégique (Y-Statement)

**Pour** éliminer la dette technique du `SpddEditor` hard-codé story-only
et unifier l'expérience UX,

**En** réutilisant intégralement la couche générique `ParsedTemplate` +
`EditState` + `TemplatedEditor` produite en UI-015,

**Nous** transformons `SpddEditor` en orchestrateur universel qui adapte son
interface et son comportement en fonction du type d'artefact détecté (via ID)
et de son template correspondant, supprimons 3 fichiers legacy
(`parser.ts`, `serializer.ts`, `sections.ts`), réduisons la complexité du
store Zustand, et rendons les 4 AC du scope testables sans modification future
du code front (nouvelle template = nouvelle UI automatiquement).

### Alternatives écartées

1. **Maintenir deux systèmes parallèles** — `SpddEditor` pour stories,
   `TemplatedEditor` pour les autres. Rejeté : coût de maintenance O(n),
   code dupliqué, expérience UX inconsistante.

2. **Générer le `SpddEditor` côté Go** — API Go produit une spec `UILayout`
   que le frontend instancie. Rejeté : couple frontend-backend fortement,
   latence Wails supplémentaire, complexité de versioning.

3. **Garder mode `editor` comme route séparée avec button ActivityBar** —
   Rejeté : crée une confusion mentale (deux vues disjointes), rompt le
   workflow contextuel, incompatible avec les AC1-AC5.

---

## Modules impactés

| Module | Impact | Nature | Détail |
|---|---|---|---|
| `frontend/src/stores/spdd.ts` | **fort** | refactorisation complète | Remplacer `draft: StoryDraft` par `editState: EditState \| null`. Ajouter `selectedPath`, `viewMode: 'read' \| 'edit'`, `loading`, `error`. Supprimer dépendance `SECTIONS`, `parser`, `serializer`. |
| `frontend/src/components/spdd/SpddEditor.tsx` | **fort** | refactorisation complète | Rendre universel : charger depuis `selectedPath`, détecter type, loader template, afficher read/edit, sauvegarder via `serializeArtifact` + `WriteArtifact`. |
| `frontend/src/components/spdd/sections.ts` | **élevé** | suppression | `SECTIONS` remplacé par `ParsedTemplate.sections` dynamique. |
| `frontend/src/components/spdd/parser.ts` | **élevé** | suppression | Remplacé par `parseArtifactContent` générique (UI-015). |
| `frontend/src/components/spdd/serializer.ts` | **élevé** | suppression | Remplacé par `serializeArtifact` générique (UI-015). |
| `frontend/src/components/hub/StoryViewer.tsx` | **moyen** | simplification/suppression | Vue markdown prose disparaît ; remplacée par read-mode du `SpddEditor`. |
| `frontend/src/components/hub/HubList.tsx` | **moyen** | modification | Supprimer bouton `<Plus>` "+ New Story". |
| `frontend/src/components/hub/NewStoryModal.tsx` | **moyen** | suppression | Composant supprimé. |
| `frontend/src/components/hub/SidebarPanel.tsx` | **faible** | modification | Supprimer logique liée au mode `editor`. |
| `frontend/src/App.tsx` | **faible** | modification | Supprimer route `activeMode === 'editor'`. |
| `frontend/src/stores/shell.ts` | **faible** | modification | Supprimer `'editor'` du type `ShellMode`. |
| `frontend/src/hooks/useAutoSave.ts` | **moyen** | refactorisation | Généraliser : hook `useArtifactAutoSave(path, editState, template)` qui appelle `WriteArtifact` + `serializeArtifact`. |

---

## Dépendances et intégrations

- **UI-015 outputs** — dépendance critique et directe :
  - `parseTemplate(templateRaw: string): ParsedTemplate`
  - `parseArtifactContent(raw: string, template: ParsedTemplate): EditState`
  - `serializeArtifact(state: EditState, template: ParsedTemplate): string`
  - Composants `TemplatedEditor`, `GenericAcEditor`
  - Utilitaires `detectArtifactType`, `templateNameForType`

- **Wails bindings** — les deux existants suffisent :
  - `ReadArtifact(path: string): Promise<string>`
  - `WriteArtifact(path: string, content: string): Promise<void>`

- **Artifacts store** — `useArtifactsStore().selectedPath` source de vérité.

---

## Risques

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| **Régression AI assist** | élevé | certaine | `useSpddSuggest` hard-codé stories → inactif pour autres types. Décision acceptée : AI assist conservé stories uniquement en UI-016. |
| **Auto-save fragmentation** | moyen | moyenne | `useAutoSave` appelle `DraftSave` story-specific. Généralisation nécessite tests avec inbox, epic. |
| **Breaking change store** | moyen | certaine | Hooks et tests dépendant de `useSpddEditorStore` / `StoryDraft` vont casser. Commit BREAKING explicite. |
| **Round-trip ambiguïté** | moyen | faible | Heuristique ac-cards : triple confirmation (`**Given**` + `**When**` + `**Then**`). Fallback textarea si doute. |
| **Template mismatch** | moyen | faible | Artefact diverge du template (champs ajoutés). Bandeau notification + fallback textarea. |

---

## Cas limites identifiés

1. **Type sans template connu** (ex. `ROADMAP-001`) → `templateNameForType('unknown') = null` → fallback textarea + bandeau (AC5).
2. **Fichier sans frontmatter valide** → `EditState` avec `fmValues` vide + textarea body.
3. **Section AC dans template, aucune AC dans fichier** → `GenericAcEditor` liste vide + bouton "+ Ajouter AC".
4. **Template modifié sur disque pendant session** → `ParsedTemplate` chargé au startup, immuable pendant la session (assomption acceptable).
5. **Sections orphelines** (dans fichier, absentes du template) → placées en fin de liste, pas perdues à la sauvegarde.
6. **Artefact sans ID valide** → `detectArtifactType('')` = `'unknown'` → fallback textarea.
7. **Auto-save échoue** (backend Go crash) → toast "Sauvegarde échouée", `EditState` conservé in-memory.

---

## Décisions à prendre avant le canvas

1. [ ] **Numérotation AC à la sauvegarde** : re-numéroter `AC1..n` ou préserver IDs originaux ? **Recommandation** : re-numéroter.
2. [ ] **Fallback textarea** : afficher (a) le `.md` complet brut ou (b) inputs FM basiques + textarea body ? **Recommandation** : (b).
3. [ ] **Mode lecture : interaction AC** : statique ou cliquable/copiable ? **Recommandation** : statique pour UI-016.
4. [ ] **Suppression `NewStoryModal`** : confirmé définitif ? **Recommandation** : oui, création via CLI uniquement.
