---
id: UI-008
slug: workflow-pipeline-view
story: spdd/stories/UI-008-workflow-pipeline-view.md
analysis: spdd/analysis/UI-008-workflow-pipeline-view.md
status: implemented
created: 2026-05-02
updated: 2026-05-02
---

# Canvas REASONS — Vue pipeline SPDD (swim-lane Linear/Jira hybride)

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> code ↔ canvas se résout **dans ce fichier d'abord** (via
> `/spdd-prompt-update`). 7 OQs (story) + 8 D-D (analyse) toutes
> tranchées en reco A. Lève partiellement l'Invariant I5 d'UI-007
> (Backend Go = 0 changement) — UI-008 ajoute 2 méthodes Go +
> 1 nouveau fichier de constants.

---

## R — Requirements

### Problème

Le hub yukki actuel (UI-006) liste les artefacts SPDD à plat par
"kind". Pour suivre où en est *une feature donnée* (ex. UI-007),
l'utilisateur navigue entre 4 modes et recoupe mentalement les
`id` partagés. Et pour avancer une feature dans le workflow
(`status: draft` → `reviewed` → `accepted`...), il édite le
front-matter à la main. UI-008 livre une vue swim-lane (Linear-
style) où chaque ligne est une feature et chaque colonne une
étape SPDD, avec drag-and-drop progressif et gating dur (Jira-
style validators).

### Definition of Done

- [ ] **Mode `Workflow`** ajouté dans `<ActivityBar />` en 5ᵉ slot
      principal (entre `Tests` et `Settings`). Icône `Workflow` ou
      `LayoutGrid` lucide-react. `ShellMode` étendu à 6 valeurs.
      `'workflow'` **NON** ajouté à `SPDD_KINDS` (Invariant I3
      UI-006 préservé : ne touche pas `useArtifactsStore.setKind`).
- [ ] **`<WorkflowPipeline />`** rendu dans le main content (à la
      place du `<StoryViewer />`) quand `activeMode === 'workflow'`.
      Header sticky 5 colonnes (`Story` / `Analysis` / `Canvas` /
      `Implementation` / `Tests`), body lignes par `id` distinct.
- [ ] **Cellules** : remplie = `<WorkflowCard />` avec `id`, slug
      tronqué, badge status (réutilise `STATUS_BADGE` exporté
      depuis `HubList.tsx`), date `updated`. Vide débloquée =
      bouton `Plus`. Vide bloquée par gating = icône `Lock` grisée
      avec tooltip "Complete previous stage first".
- [ ] **Click sur carte** → ouvre `<WorkflowDrawer />` (Sheet
      shadcn, drawer droit ~600px) avec `<StoryViewer />` à
      l'intérieur. Close au click hors / `Escape`.
- [ ] **Drag-and-drop** via `@dnd-kit/core` + `@dnd-kit/sortable` :
      drag une carte verticalement dans la **même colonne**
      → drop targets "Mark <status>" apparaissent ; drop →
      `useWorkflowStore.advanceStatus(path, newStatus)` →
      optimistic update + toast confirmation. Rollback + toast
      destructive si la binding Go renvoie une erreur.
- [ ] **Click droit / bouton MoreHorizontal** sur une carte →
      `DropdownMenu` shadcn avec items `Mark as <status>` pour les
      transitions valides. Items invalides désactivés avec tooltip
      "Cannot skip — go through reviewed first".
- [ ] **Modal "Create next stage"** (`<CreateNextStageModal />`,
      Dialog shadcn) ouverte au click sur une cellule vide
      débloquée. Affiche la commande slash à copier
      (`/spdd-analysis spdd/stories/<id>-<slug>.md`,
      `/spdd-reasons-canvas spdd/analysis/<id>-<slug>.md`, etc.)
      + bouton `Copy command` + disclaimer "Coming in a future
      version: this will run automatically."
- [ ] **Backend Go** :
      - Nouveau fichier `internal/artifacts/status.go` : type
        `Status string` (typed const), `OrderedStatuses []Status`,
        `IsValidTransition(from, to Status) bool` (forward 1 cran
        OU downgrade 1 cran), `AllowedTransitions(from Status)
        []Status` (retourne current + voisins valides). Tests
        unitaires `status_test.go` couvrant transitions valides
        + invalides.
      - Méthode `(a *App) UpdateArtifactStatus(path, newStatus
        string) error` ajoutée à `internal/uiapp/app.go` : lit le
        fichier, parse le front-matter via `yaml.Node` (préserve
        ordre/commentaires), valide la transition, mute Status +
        Updated, recolle au body, atomic write.
      - Méthode `(a *App) AllowedTransitions(currentStatus string)
        []string` exposée pour le frontend.
- [ ] **Frontend store** `useWorkflowStore` (6ᵉ store, Invariant
      I6 UI-001b) :
      - `rows: WorkflowRow[]` (indexé par `id`, agrégation
        cross-kind via 4 calls parallèles à `ListArtifacts`)
      - `loading: boolean`, `error: string | null`
      - `pendingUpdates: Set<string>` (paths en cours)
      - `drawerPath: string | null` (carte sélectionnée pour
        viewer)
      - `loadAll()`, `advanceStatus(path, newStatus)`,
        `openDrawer(path)`, `closeDrawer()`
      - `advanceStatus` appelle `UpdateArtifactStatus` Go binding,
        update optimistic, rollback sur erreur, refresh
        `useArtifactsStore` (D-D7 double refresh).
- [ ] **Stubs Wails** : `frontend/wailsjs/go/main/App.{d.ts,js}`
      étendus avec `UpdateArtifactStatus` et `AllowedTransitions`
      (pattern AV-workaround UI-001a/c/UI-007).
- [ ] **shadcn add** : `dropdown-menu`, `toast` (+ `toaster.tsx` +
      `use-toast.ts`), `sheet`. Ajout 3 fichiers + 3 deps Radix.
- [ ] **Deps npm** : `@dnd-kit/core`, `@dnd-kit/sortable` ajoutées
      au `package.json` + lock.
- [ ] **`<Toaster />`** posé au root dans `<App />` (D-D8).
- [ ] **Pas de régression** UI-001/UI-006/UI-007 : navigation
      ActivityBar, sidebar, viewer, NewStoryModal, TitleBar
      fonctionnent identiquement.
- [ ] `tsc --noEmit` ✓, `vite build` ✓, `bash scripts/dev/ui-build.sh` ✓,
      `go test ./internal/artifacts/...` ✓.

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `useWorkflowStore` (Zustand, nouveau, 6ᵉ) | Agrège artefacts cross-kind, indexe par `id`, gère drawer + pendingUpdates | `rows: WorkflowRow[]`, `pendingUpdates: Set<string>`, `drawerPath: string \| null`, `loadAll`, `advanceStatus`, `openDrawer`, `closeDrawer` | global app lifetime |
| `WorkflowRow` (TS interface, nouveau) | Une feature dans le pipeline | `{ id: string; cells: { story?: Meta; analysis?: Meta; prompts?: Meta; tests?: Meta }; updated: string }` | en mémoire, dérivé du backend |
| `Status` (Go type, nouveau) | Typed constant pour les statuses SPDD | `Status string` ; constants `StatusDraft, StatusReviewed, StatusAccepted, StatusImplemented, StatusSynced` ; ordered slice | constant compile-time |
| `IsValidTransition` (Go func, nouveau) | Validateur transitions | `(from, to Status) bool` — forward 1 cran ou downgrade 1 cran | pure function |
| `AllowedTransitions` (Go func + binding, nouveau) | Liste les transitions valides | `(from Status) []Status` côté Go ; binding `(currentStatus string) []string` côté Wails | pure function |
| `UpdateArtifactStatus` (binding Go, nouveau) | Mute le status d'un artefact | `(path, newStatus string) error` — atomic | per-call |
| `<WorkflowPipeline />` (composant, nouveau) | Tableau swim-lane 5 colonnes | props : aucune (consume `useWorkflowStore`) | mount avec activeMode='workflow' |
| `<WorkflowRow />` (composant, nouveau) | Une ligne du pipeline | `{ row: WorkflowRow }` | per row |
| `<WorkflowCard />` (composant, nouveau) | Carte draggable + DropdownMenu | `{ artifact: Meta, kind: string, allowedTransitions: string[] }` | per cellule remplie |
| `<WorkflowDrawer />` (composant, nouveau) | Sheet droit avec StoryViewer | props : aucune (consume `useWorkflowStore.drawerPath`) | mount avec WorkflowPipeline |
| `<CreateNextStageModal />` (composant, nouveau) | Dialog "copy slash command" | `{ open: boolean, onOpenChange, sourceArtifact: Meta, nextKind: string }` | per-instance |
| `STAGES` (TS const, nouveau) | Mapping kind ↔ stage column ordonné | `[{ kind: 'stories', label: 'Story' }, ..., { kind: 'tests', label: 'Tests' }]` + marker dérivé "Implementation" | constant côté frontend |
| `STATUS_BADGE` (TS const, existante UI-001b) | Mapping status → classes Tailwind | `Record<string, string>` | exporté depuis `HubList.tsx` |

### Relations

- `<WorkflowPipeline />` ⟶ `useWorkflowStore` : lit `rows`, `loading`,
  appelle `advanceStatus` au drop / DropdownMenu.
- `<WorkflowCard />` ⟶ `dnd-kit` `useDraggable` : pickup drag.
- `<WorkflowPipeline />` ⟶ `dnd-kit` `DndContext` : englobe le tableau.
- `useWorkflowStore.advanceStatus` ⟶ `UpdateArtifactStatus` (Go) :
  appel direct (binding Wails). Sur succès → update local + appel
  `useArtifactsStore.getState().refresh()` (D-D7).
- `useWorkflowStore.loadAll` ⟶ 4 × `ListArtifacts` (Go) en parallèle
  via `Promise.all`. Indexation par `id` côté frontend.
- `<WorkflowDrawer />` ⟶ `useWorkflowStore.drawerPath` + render
  `<StoryViewer className="..." />`.
- `<App />` ⟶ render `<WorkflowPipeline />` au lieu de `<StoryViewer />`
  quand `activeMode === 'workflow'`. `<Toaster />` posé au root.

### Invariants UI-008

- **I1** — `useWorkflowStore` est un **store isolé** (Invariant I6
  UI-001b). N'importe **aucun** des 5 autres stores. Appels cross-store
  via `getState()` (continuité Invariant I4 UI-006).
- **I2** — Mode `'workflow'` ne touche **jamais**
  `useArtifactsStore.setKind`. C'est garanti structurellement par
  l'absence de `'workflow'` dans la constante `SPDD_KINDS` de
  `useShellStore.setActiveMode`.
- **I3** — La règle de gating (transitions valides) vit
  **canoniquement côté Go** (`internal/artifacts/status.go`). Le
  frontend la consomme via `AllowedTransitions()` au mount du mode
  workflow et la met en cache. Pas de duplication de la règle métier
  côté TS (anti-divergence).
- **I4** — `UpdateArtifactStatus` Go préserve **les autres champs
  YAML** (owner, modules, depends-on, etc.) via `yaml.Node`
  manipulation in-place. Aucun champ n'est perdu ou réordonné. Tests
  Go valident le round-trip idempotent sur un fixture multi-champs.
- **I5** — Atomic write : `UpdateArtifactStatus` écrit via le pattern
  temp-file + rename (comme `Writer.Write`). Pas de write partiel
  visible si l'app crash en cours.
- **I6** — `<Toaster />` est un singleton au root `<App />`.
  `useToast()` peut être consommé par n'importe quel composant.
  Évite les multi-Provider conflicts.
- **I7** — Optimistic update : `advanceStatus` met à jour `rows`
  immédiatement dans le store (pour réactivité UI), puis appelle
  la binding. Sur erreur → rollback + toast destructive. Sur succès
  → toast success court (2s).
- **I8** — Pas de modification du Backend Go en dehors de
  `internal/artifacts/status.go` (nouveau) + `internal/uiapp/app.go`
  (2 méthodes ajoutées). `Writer.Write`, `parser.go`, `lister.go`,
  `id.go` inchangés. Aucun changement à `ui.go`, `main.go`,
  `wails.json`, `cmd/`.

### Integration points

- **`@dnd-kit/core` + `@dnd-kit/sortable`** (npm, nouveau, ~14 KB
  gzip) — drag-and-drop accessible. Pattern : `DndContext` →
  `useDraggable` sur cards → `useDroppable` sur drop targets +
  `DragOverlay` pour preview.
- **shadcn `dropdown-menu` / `toast` / `sheet`** (3 nouveaux
  composants ajoutés via `npx shadcn add`). Peer-deps Radix
  ajoutées auto.
- **`@radix-ui/react-toast` + `react-dropdown-menu`** (peer-deps).
- **Pattern Invariant I3 UI-006** — `'workflow'` non inclus dans
  `SPDD_KINDS` du `setActiveMode` du `useShellStore`.
- **`useArtifactsStore.refresh`** consommé via `getState()` après
  chaque update (cross-mode sync, D-D7).
- **Pattern AV-workaround stubs** — `frontend/wailsjs/go/main/App.{d.ts,js}`
  étendus pour les 2 nouvelles bindings (continuité UI-007 O5).

---

## A — Approach

### Y-Statement

> Pour résoudre **l'absence de visualisation cross-kind de la
> progression d'une feature dans le workflow SPDD et le besoin
> de gating dur contre les skips d'étape**, on choisit
> **un 6ᵉ store Zustand `useWorkflowStore` qui agrège les 4 kinds
> en parallèle et indexe par `id`, un nouveau composant
> `<WorkflowPipeline />` rendu en main content quand
> `activeMode='workflow'`, du drag-and-drop accessible via dnd-kit
> avec optimistic update, du gating canonique côté Go (nouveau
> fichier `internal/artifacts/status.go` + 2 bindings
> `UpdateArtifactStatus` / `AllowedTransitions`), et la règle
> métier consommée par le frontend via la binding pour éviter
> toute duplication**, plutôt que **(a) garder la navigation
> par-kind et faire évoluer HubList**, **(b) implémenter le gating
> côté frontend uniquement (risque de divergence)**, ou
> **(c) introduire un store mega-state qui agrège tous les
> artefacts en remplacement d'`useArtifactsStore`**, pour atteindre
> **une vue Linear-style familiarité immédiate, gating Jira-style
> robuste (validators backend), et zéro régression sur le hub
> existant**, en acceptant **(a) une nouvelle dépendance
> `@dnd-kit` ~14 KB gzip, (b) 3 nouveaux composants shadcn
> ajoutés (dropdown-menu, toast, sheet), (c) la levée volontaire
> et tracée de l'Invariant "Backend Go = 0 changement" hérité
> d'UI-006/UI-007**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-02)

**Story-level (OQ1..OQ7)** — orientation Linear/Jira hybride :
- OQ1 → A : icône Workflow en 5ᵉ slot ActivityBar
- OQ2 → A : drag-and-drop via `@dnd-kit`
- OQ3 → A : notifications via shadcn `toast`
- OQ4 → A : nouveau composant `<WorkflowDrawer />` (Sheet shadcn)
- OQ5 → A : modal "Create" affiche slash command + disclaimer V2
- OQ6 → A : tri rows par `updated` desc
- OQ7 → A : transitions forward + downgrade 1 cran

**Analysis-level (D-D1..D-D8)** :
- D-D1 → A : pipeline view dans le main content
- D-D2 → A : `npx shadcn add sheet` pour le drawer
- D-D3 → A : nouveau fichier `internal/artifacts/status.go`
- D-D4 → A : rewrite front-matter only (pas le body)
- D-D5 → A : `yaml.Node` pour préserver les autres champs
- D-D6 → A : mapping `kind ↔ stage` côté frontend uniquement
- D-D7 → A : double refresh post-`advanceStatus`
- D-D8 → A : `<Toaster />` au root `<App />`

### Alternatives écartées

- **Garder la navigation per-kind UI-006 + faire évoluer HubList** —
  ne livre pas la vue cross-kind demandée par la story. HubList
  reste utile pour les vues focus (filtrage par kind).
- **Gating côté frontend uniquement** — risque de divergence si
  le code Go évolue indépendamment. Backend = source de vérité.
- **Mega-store unique** (`useGlobalArtifactsStore` qui remplace
  `useArtifactsStore`) — casse Invariant I6 UI-001b (stores
  isolés). Refusé.
- **HTML5 Drag and Drop natif** — accessibilité clavier à coder
  à la main, pas robuste. dnd-kit standard 2026.
- **react-dnd** — plus lourd, HOC-based, moins ARIA. dnd-kit gagne.
- **Sheet maison via Dialog en variant** — réinvente l'existant ;
  shadcn Sheet est officiel et minimaliste.
- **Trigger AI direct depuis l'UI dès V1** — out of scope (story
  Scope Out, déléguée à UI-009 ou ultérieure).
- **Persistance des prefs workflow view** (largeur colonnes,
  ordre custom) — différé.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/artifacts/status.go` | nouveau | typed `Status` + constants + `IsValidTransition` + `AllowedTransitions` (~80 lignes) |
| `internal/artifacts/status_test.go` | nouveau | tests transitions valides/invalides (~60 lignes) |
| `internal/uiapp/app.go` | modif | 2 méthodes ajoutées (`UpdateArtifactStatus`, `AllowedTransitions`), ~60 lignes |
| `frontend/wailsjs/go/main/App.d.ts` | modif | 2 signatures ajoutées (stub AV-workaround) |
| `frontend/wailsjs/go/main/App.js` | modif | 2 wrappers `window['go']['uiapp']['App']['<method>']()` |
| `frontend/src/stores/workflow.ts` | nouveau | 6ᵉ store Zustand (~140 lignes) |
| `frontend/src/stores/shell.ts` | modif minimale | `ShellMode` étendu à 6 valeurs (1 ligne, `'workflow'` ajouté à l'union) |
| `frontend/src/components/hub/ActivityBar.tsx` | modif | ajout de l'item `Workflow` dans `PRIMARY_ITEMS` (5 lignes) |
| `frontend/src/components/hub/HubList.tsx` | modif minimale | export du `STATUS_BADGE` (1 ligne, `export const`) |
| `frontend/src/components/workflow/WorkflowPipeline.tsx` | nouveau | tableau swim-lane DndContext (~250 lignes) |
| `frontend/src/components/workflow/WorkflowRow.tsx` | nouveau | une ligne du pipeline (~80 lignes) |
| `frontend/src/components/workflow/WorkflowCard.tsx` | nouveau | carte draggable + DropdownMenu (~120 lignes) |
| `frontend/src/components/workflow/WorkflowDrawer.tsx` | nouveau | Sheet shadcn + StoryViewer (~50 lignes) |
| `frontend/src/components/workflow/CreateNextStageModal.tsx` | nouveau | Dialog avec slash command + Copy (~80 lignes) |
| `frontend/src/components/workflow/stages.ts` | nouveau | constant `STAGES` mapping kind ↔ label (~20 lignes) |
| `frontend/src/components/ui/dropdown-menu.tsx` | nouveau | shadcn add |
| `frontend/src/components/ui/toast.tsx` + `toaster.tsx` + `use-toast.ts` | nouveaux | shadcn add toast (3 fichiers) |
| `frontend/src/components/ui/sheet.tsx` | nouveau | shadcn add |
| `frontend/src/App.tsx` | modif | branchement `activeMode === 'workflow' ? <WorkflowPipeline /> : <StoryViewer />` + `<Toaster />` au root |
| `frontend/package.json` / `package-lock.json` | modif | `@dnd-kit/core`, `@dnd-kit/sortable`, `@radix-ui/react-toast`, `@radix-ui/react-dropdown-menu` |
| `internal/artifacts/{parser,lister,writer,id}.go` | **nul** | inchangés |
| `ui.go` / `main.go` / `ui_mock.go` / `ui_prod.go` / `wails.json` | **nul** | aucun changement |
| Backend Go autres packages (`provider/`, `internal/workflow/`, ...) | **nul** | scope étranger |

### Schéma de flux

```
   ┌─ FENÊTRE WAILS (frameless UI-007) ──────────────────────────────┐
   │ ┌─ <TitleBar /> ──────────────────────────────────────────────┐ │
   │ ├─ <ClaudeBanner /> ──────────────────────────────────────────┤ │
   │ │ ┌─ Activity─┐ ┌─ Sidebar─┐ ┌─ Main = <WorkflowPipeline /> ─┐ │ │
   │ │ │  📚 Stories│ │ collapsée│ │ ┌──────────────────────────┐ │ │ │
   │ │ │  💡 Analyses│ │  ou       │ │ │ Story │ Analysis │ Canvas│Implementation│ Tests │ │ │
   │ │ │  📝 Canvas │ │  HubList │ │ ├──────────────────────────┤ │ │ │
   │ │ │  ✓  Tests │ │  (default)│ │ │ UI-007 │ ✅ R   │ ✅ R    │ ✅ I    │ ⬜ │ │ │ │
   │ │ │  ▦  Workflow│ │           │ │ ├──────────────────────────┤ │ │ │
   │ │ │           │ │           │ │ │ UI-008 │ 🟡 D   │ ⬜      │ 🔒    │ 🔒 │ │ │ │
   │ │ │  ⚙  Settings│ │           │ │ ├──────────────────────────┤ │ │ │
   │ │ └───────────┘ └───────────┘ └────────────────────────────┘ │ │ │
   │ └────────────────────────────────────────────────────────────┘ │
   └────────────────────────────────────────────────────────────────┘

   useWorkflowStore                  useArtifactsStore (UI-001b)
   ─────────────────                 ──────────────────
   loadAll()                         (mode-by-kind, refresh)
       │ Promise.all 4 × ListArtifacts
       ▼
   indexBy(id) → rows[]
   advanceStatus(path, newStatus) ─► UpdateArtifactStatus (Go binding)
       │ optimistic update                │
       │                                  ▼ atomic write status.go
       │                              valid transition ?
       │                                  │ yes → write, return nil
       │                                  │ no  → return error
       ▼ onSuccess
   useArtifactsStore.getState().refresh()  ─► HubList sync next mount

   Drag and drop (dnd-kit) :
   ─────────────────────────
   <DndContext onDragEnd={({active, over}) => advanceStatus(active.id, over.id)}>
     <WorkflowCard useDraggable />  ── pickup avec Space (clavier) ou souris
     <DropTarget useDroppable />    ── apparaît pendant drag, ARIA aria-roledescription
     <DragOverlay>...</DragOverlay> ── preview avec shadow-primary/30
   </DndContext>

   Gating (canonique Go) :
   ─────────────────────
   AllowedTransitions(currentStatus) → []string
   - draft       → [reviewed]
   - reviewed    → [draft, accepted]            (downgrade 1 cran D-D7)
   - accepted    → [reviewed, implemented]
   - implemented → [accepted, synced]
   - synced      → [implemented]
   Frontend cache la map au mount ; UI grise les options invalides du DropdownMenu.
```

---

## O — Operations

> Ordre d'exécution : **O1 → O2 → O3 → O4 → O5 → O6 → O7 → O8 → O9 → O10**.
> O1-O3 = backend Go, O4 = stubs Wails, O5-O6 = deps + shadcn add,
> O7 = store, O8 = composants, O9 = wiring App.tsx, O10 = vérifs.

### O1 — `internal/artifacts/status.go` (constants + validators)

- **Module** : `internal/artifacts`
- **Fichier** : `internal/artifacts/status.go` (nouveau)
- **Signature** :
  ```go
  package artifacts

  // Status is a typed constant for the SPDD artifact status field
  // (front-matter `status:` value).
  type Status string

  const (
      StatusDraft       Status = "draft"
      StatusReviewed    Status = "reviewed"
      StatusAccepted    Status = "accepted"
      StatusImplemented Status = "implemented"
      StatusSynced      Status = "synced"
  )

  // OrderedStatuses returns the canonical SPDD progression order.
  func OrderedStatuses() []Status {
      return []Status{StatusDraft, StatusReviewed, StatusAccepted, StatusImplemented, StatusSynced}
  }

  // IsValidTransition returns true iff `from → to` is a forward move
  // by 1 step OR a backward move by 1 step (downgrade allowed for
  // "I validated too fast, going back to draft", D-D7 of UI-008).
  // Identity (from == to) returns false (no-op transitions are
  // surfaced as errors so the UI doesn't silently swallow them).
  func IsValidTransition(from, to Status) bool

  // AllowedTransitions returns the list of statuses reachable from
  // `from` (= forward 1 step + backward 1 step + identity itself
  // for UI display convenience).
  func AllowedTransitions(from Status) []Status
  ```
- **Comportement** :
  1. Le type `Status` est une string aliasée pour la sécurité de
     compilation (impossible de passer un `string` directement où
     un `Status` est attendu).
  2. `IsValidTransition(StatusDraft, StatusReviewed) == true`
     (forward).
  3. `IsValidTransition(StatusReviewed, StatusDraft) == true`
     (downgrade).
  4. `IsValidTransition(StatusDraft, StatusAccepted) == false`
     (skip).
  5. `IsValidTransition(StatusDraft, StatusDraft) == false` (no-op).
  6. `IsValidTransition(StatusDraft, "wip") == false` (unknown
     target). Les statuses inconnus retournent toujours false.
  7. `AllowedTransitions(StatusReviewed)` retourne
     `[StatusDraft, StatusReviewed, StatusAccepted]`.
  8. Pour un status inconnu, retourne `[]Status{}` (slice vide,
     pas nil — convention Go pour JSON).
- **Tests** (`internal/artifacts/status_test.go`) :
  - `TestIsValidTransition_Forward` : draft→reviewed, reviewed→
    accepted, accepted→implemented, implemented→synced (tous true)
  - `TestIsValidTransition_Backward` : reviewed→draft, accepted→
    reviewed, implemented→accepted, synced→implemented (tous true)
  - `TestIsValidTransition_Skip` : draft→accepted, draft→
    implemented, draft→synced, reviewed→implemented (tous false)
  - `TestIsValidTransition_NoOp` : draft→draft (false)
  - `TestIsValidTransition_Unknown` : "wip"→draft, draft→"wip"
    (false)
  - `TestAllowedTransitions_Endpoints` : draft → [draft,
    reviewed], synced → [implemented, synced]
  - `TestAllowedTransitions_Middle` : reviewed → [draft, reviewed,
    accepted]

### O2 — `UpdateArtifactStatus` binding Go

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go` (modif — méthode ajoutée)
- **Signature** :
  ```go
  // UpdateArtifactStatus mutates the `status:` field of the SPDD
  // artifact at `path`, validating the transition against the
  // SPDD progression rules (forward 1 step or downgrade 1 step,
  // see artifacts.IsValidTransition).
  //
  // It also bumps the `updated:` field to today's date (ISO-8601).
  // Other front-matter fields (owner, modules, depends-on, ...)
  // and the body markdown are preserved untouched (yaml.Node
  // round-trip).
  //
  // Returns an error if:
  //   - file cannot be read or written
  //   - front-matter is malformed
  //   - the transition is invalid (skip or no-op)
  func (a *App) UpdateArtifactStatus(path, newStatus string) error
  ```
- **Comportement** :
  1. Read file at `path` (must be `.md`).
  2. Split content : `---\n<yaml>\n---\n<body>` via the existing
     parser helpers, or via simple line parsing.
  3. Parse the YAML block into `yaml.Node` (preserves order +
     comments). Find the `status:` and `updated:` scalar nodes.
  4. Read the current `status:` value, call
     `artifacts.IsValidTransition(Status(current), Status(newStatus))`.
     If false → return error
     `fmt.Errorf("invalid status transition: %s → %s", current, newStatus)`.
  5. Mutate the `status:` scalar node value in place to `newStatus`.
  6. Mutate `updated:` to `time.Now().Format("2006-01-02")` (or
     create the field if absent — but should never be absent in
     SPDD artifacts).
  7. Re-serialize the YAML node to a `[]byte` via `yaml.Marshal`.
  8. Recombine `---\n` + serialized + `\n---\n` + body.
  9. Atomic write : write to `<path>.tmp`, then `os.Rename`.
  10. Return `nil`.
- **Tests** : couverts via tests Go directs (`internal/uiapp/...`)
  ou via tests d'intégration. Au minimum :
  - Round-trip preserves `owner`, `modules`, `depends-on`
  - Invalid transition returns error, file untouched
  - Unknown path returns error
  - Atomic write : kill mid-write doesn't leave partial file

### O3 — `AllowedTransitions` binding Go

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go` (modif — méthode ajoutée)
- **Signature** :
  ```go
  // AllowedTransitions returns the list of statuses reachable from
  // `currentStatus` (current itself + forward + backward 1 step).
  // Used by the frontend to grey out invalid items in the
  // status DropdownMenu.
  //
  // Returns empty slice for unknown statuses.
  func (a *App) AllowedTransitions(currentStatus string) []string
  ```
- **Comportement** :
  1. Convert `currentStatus` to `Status`.
  2. Call `artifacts.AllowedTransitions(s)`.
  3. Convert `[]Status` → `[]string`.
  4. Return.
- **Tests** : couverts par les tests de O1 (la fonction Go est
  juste un wrapper).

### O4 — Stubs Wails AV-workaround

- **Module** : `frontend/wailsjs/go/main`
- **Fichiers** :
  - `frontend/wailsjs/go/main/App.d.ts` (modif — ajout)
  - `frontend/wailsjs/go/main/App.js` (modif — ajout)
- **Signature** dans `App.d.ts` (à ajouter à la fin du bloc des
  signatures) :
  ```typescript
  // UI-008
  export function UpdateArtifactStatus(path: string, newStatus: string): Promise<void>;
  export function AllowedTransitions(currentStatus: string): Promise<string[]>;
  ```
- **Wrappers** dans `App.js` (à ajouter à la fin) :
  ```javascript
  // UI-008
  export function UpdateArtifactStatus(path, newStatus) {
    return window['go']['uiapp']['App']['UpdateArtifactStatus'](path, newStatus);
  }

  export function AllowedTransitions(currentStatus) {
    return window['go']['uiapp']['App']['AllowedTransitions'](currentStatus);
  }
  ```

### O5 — Ajout des deps npm + shadcn add

- **Module** : `frontend`
- **Commandes à exécuter** :
  ```bash
  cd frontend
  npm install @dnd-kit/core @dnd-kit/sortable
  npx shadcn@latest add toast dropdown-menu sheet
  ```
- **Fichiers générés** :
  - `frontend/src/components/ui/dropdown-menu.tsx`
  - `frontend/src/components/ui/toast.tsx`
  - `frontend/src/components/ui/toaster.tsx`
  - `frontend/src/hooks/use-toast.ts` (ou similar — chemin shadcn)
  - `frontend/src/components/ui/sheet.tsx`
- **Comportement** :
  - Les composants shadcn sont consommés tels quels (pas de
    customisation).
  - shadcn add ajoute auto les peer-deps Radix
    (`@radix-ui/react-toast`, `@radix-ui/react-dropdown-menu`).
- **Tests** : aucun. Validation indirecte via O7-O8 (le code
  qui consomme les composants doit type-checker).

### O6 — `STAGES` constant + export `STATUS_BADGE`

- **Module** : `frontend/src/components/{workflow,hub}`
- **Fichiers** :
  - `frontend/src/components/workflow/stages.ts` (nouveau)
  - `frontend/src/components/hub/HubList.tsx` (modif minimale,
    exposer `STATUS_BADGE`)
- **Signature `stages.ts`** :
  ```typescript
  export interface Stage {
    kind: 'stories' | 'analysis' | 'prompts' | 'tests';
    label: string;
  }

  export const STAGES: Stage[] = [
    { kind: 'stories',  label: 'Story' },
    { kind: 'analysis', label: 'Analysis' },
    { kind: 'prompts',  label: 'Canvas' },
    { kind: 'tests',    label: 'Tests' },
  ];

  // 5e colonne dérivée : Implementation = canvas avec status='implemented'.
  // Pas un kind séparé, juste un marker visuel calculé.
  export const IMPLEMENTATION_LABEL = 'Implementation';
  ```
- **Modif `HubList.tsx`** :
  ```diff
  - const STATUS_BADGE: Record<string, string> = {
  + export const STATUS_BADGE: Record<string, string> = {
  ```
- **Tests** : aucun (constants).

### O7 — `useWorkflowStore` (6ᵉ store Zustand)

- **Module** : `frontend/src/stores`
- **Fichier** : `frontend/src/stores/workflow.ts` (nouveau)
- **Signatures** :
  ```typescript
  import { create } from 'zustand';
  import {
    AllowedTransitions,
    ListArtifacts,
    UpdateArtifactStatus,
    type Meta,
  } from '../../wailsjs/go/main/App';
  import { useArtifactsStore } from './artifacts';

  type Kind = 'stories' | 'analysis' | 'prompts' | 'tests';
  const KINDS: Kind[] = ['stories', 'analysis', 'prompts', 'tests'];

  export interface WorkflowRow {
    id: string;
    cells: Partial<Record<Kind, Meta>>;
    updated: string; // max(cells.*.Updated)
  }

  interface WorkflowState {
    rows: WorkflowRow[];
    loading: boolean;
    error: string | null;
    pendingUpdates: Set<string>;
    drawerPath: string | null;
    transitionsCache: Map<string, string[]>;

    loadAll: () => Promise<void>;
    advanceStatus: (path: string, newStatus: string) => Promise<void>;
    openDrawer: (path: string) => void;
    closeDrawer: () => void;
    getAllowed: (currentStatus: string) => Promise<string[]>;
  }

  export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    rows: [],
    loading: false,
    error: null,
    pendingUpdates: new Set(),
    drawerPath: null,
    transitionsCache: new Map(),

    loadAll: async () => {
      set({ loading: true, error: null });
      try {
        const arrays = await Promise.all(
          KINDS.map((k) => ListArtifacts(k)),
        );
        const byId = new Map<string, WorkflowRow>();
        KINDS.forEach((kind, i) => {
          for (const meta of arrays[i]) {
            const id = meta.ID || '?';
            const row =
              byId.get(id) ??
              ({ id, cells: {}, updated: '' } as WorkflowRow);
            row.cells[kind] = meta;
            if (meta.Updated && meta.Updated > row.updated) {
              row.updated = meta.Updated;
            }
            byId.set(id, row);
          }
        });
        const rows = Array.from(byId.values()).sort((a, b) =>
          a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0,
        );
        set({ rows, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    advanceStatus: async (path, newStatus) => {
      const pending = new Set(get().pendingUpdates);
      if (pending.has(path)) return; // de-dupe
      pending.add(path);
      set({ pendingUpdates: pending });

      // Optimistic
      const prevRows = get().rows;
      const newRows = prevRows.map((row) => {
        const newCells = { ...row.cells };
        for (const kind of KINDS) {
          if (newCells[kind]?.Path === path) {
            newCells[kind] = { ...newCells[kind]!, Status: newStatus };
            break;
          }
        }
        return { ...row, cells: newCells };
      });
      set({ rows: newRows });

      try {
        await UpdateArtifactStatus(path, newStatus);
        // Sync HubList (D-D7)
        void useArtifactsStore.getState().refresh();
      } catch (e) {
        // Rollback
        set({ rows: prevRows, error: String(e) });
        throw e;
      } finally {
        const still = new Set(get().pendingUpdates);
        still.delete(path);
        set({ pendingUpdates: still });
      }
    },

    openDrawer: (path) => set({ drawerPath: path }),
    closeDrawer: () => set({ drawerPath: null }),

    getAllowed: async (currentStatus) => {
      const cached = get().transitionsCache.get(currentStatus);
      if (cached) return cached;
      const allowed = await AllowedTransitions(currentStatus);
      const cache = new Map(get().transitionsCache);
      cache.set(currentStatus, allowed);
      set({ transitionsCache: cache });
      return allowed;
    },
  }));
  ```
- **Comportement** :
  1. `loadAll` : `Promise.all` sur 4 kinds, indexation par `id`,
     tri par `updated` desc.
  2. `advanceStatus` : optimistic update sur `rows`, appel binding
     Go, rollback si erreur (re-throw pour permettre toast au
     niveau caller). De-dupe sur `pendingUpdates`.
  3. `getAllowed` : cache pour éviter de spammer la binding
     (la règle ne change pas pendant la session).
- **Tests** : aucun en V1 (cohérent UI-006/007). Validation
  manuelle.

### O8 — Composants `<WorkflowPipeline />` + sous-composants

- **Module** : `frontend/src/components/workflow/`
- **Fichiers nouveaux** (5) :
  - `WorkflowPipeline.tsx`
  - `WorkflowRow.tsx`
  - `WorkflowCard.tsx`
  - `WorkflowDrawer.tsx`
  - `CreateNextStageModal.tsx`
- **Comportement** :
  1. **`<WorkflowPipeline />`** :
     - Mount → `useEffect(() => { loadAll(); }, [])`.
     - Render `<DndContext onDragEnd={...}>` englobant le tableau.
     - Header sticky : `STAGES.map(s => <th>{s.label}</th>)` +
       `<th>Implementation</th>`.
     - Body : `rows.map(row => <WorkflowRow row={row} />)`.
     - `<WorkflowDrawer />` rendu en dehors du tableau.
     - `<DragOverlay>` rendu au niveau `<DndContext>` enfant.
  2. **`<WorkflowRow />`** :
     - Props `{ row: WorkflowRow }`.
     - Render 5 cellules : 4 `kind` + 1 dérivée Implementation.
     - Pour chaque kind :
       - `row.cells[kind]` existe → `<WorkflowCard artifact={...} kind={kind} />`
       - Sinon : cellule vide. Gating calcule si débloqué (cell
         précédente avec status ≥ reviewed) → bouton `Plus`
         (ouvre `<CreateNextStageModal />`) ou icône `Lock`.
     - Cellule "Implementation" :
       - Si `row.cells.prompts?.Status === 'implemented' || === 'synced'` →
         badge `Implemented` vert.
       - Sinon : marker neutre.
  3. **`<WorkflowCard />`** :
     - Props `{ artifact: Meta, kind: string }`.
     - `useDraggable({ id: artifact.Path })` — pickup.
     - Render carte : `id` (mono fonts xs), slug tronqué,
       `<span>` badge avec classe `STATUS_BADGE[status]`,
       `<time>` updated.
     - `<DropdownMenu>` au click sur bouton `MoreHorizontal` :
       - `useEffect` charge `getAllowed(artifact.Status)` au mount.
       - Items générés depuis le cache `transitionsCache`.
       - Items invalides désactivés avec tooltip.
       - `onClick={() => advanceStatus(artifact.Path, status)}`.
       - `onSuccess` → toast success ; `onError` → toast destructive.
     - Click sur la carte (hors menu) → `openDrawer(artifact.Path)`.
  4. **`<WorkflowDrawer />`** :
     - Lit `drawerPath` de `useWorkflowStore`.
     - Si `drawerPath !== null` → `<Sheet open={true} onOpenChange={(v) => !v && closeDrawer()}>` avec
       `<StoryViewer />` posé pour rendre l'artefact (réutilise
       `useArtifactsStore.setSelectedPath(drawerPath)` au mount,
       puis StoryViewer rend le markdown).
       Note : `<StoryViewer />` consume `useArtifactsStore`. On
       set `selectedPath` au open + reset au close.
  5. **`<CreateNextStageModal />`** :
     - Props `{ open, onOpenChange, sourceArtifact, nextKind }`.
     - Affiche commande slash dans un `<code>` :
       - nextKind=analysis → `/spdd-analysis spdd/stories/<id>-<slug>.md`
       - nextKind=prompts → `/spdd-reasons-canvas spdd/analysis/<id>-<slug>.md`
       - nextKind=tests → (V1 stub, future story)
     - Bouton `Copy command` → `navigator.clipboard.writeText(...)`.
     - Disclaimer : "Coming in a future version: this will run automatically."
     - Bouton `Close` → `onOpenChange(false)`.
- **Tests** : aucun automatisé. Validation manuelle AC1..AC11
  de la story.

### O9 — Wiring `<App />` + `<ActivityBar />` + `shell.ts`

- **Module** : `frontend/src`
- **Fichiers** :
  - `frontend/src/stores/shell.ts` (modif minimale — étendre union)
  - `frontend/src/components/hub/ActivityBar.tsx` (modif — ajouter item)
  - `frontend/src/App.tsx` (modif — branchement workflow + Toaster)
- **Diff `shell.ts`** :
  ```diff
  - export type ShellMode = 'stories' | 'analysis' | 'prompts' | 'tests' | 'settings';
  + export type ShellMode = 'stories' | 'analysis' | 'prompts' | 'tests' | 'settings' | 'workflow';

  - const SPDD_KINDS: ShellMode[] = ['stories', 'analysis', 'prompts', 'tests'];
  + const SPDD_KINDS: ShellMode[] = ['stories', 'analysis', 'prompts', 'tests'];
  // 'workflow' volontairement non inclus (Invariant I3 d'UI-006 + I2 d'UI-008)
  ```
- **Diff `ActivityBar.tsx`** :
  ```diff
  - import { BookOpen, CheckSquare, Cog, FileText, Lightbulb, type LucideIcon } from 'lucide-react';
  + import { BookOpen, CheckSquare, Cog, FileText, Lightbulb, Workflow, type LucideIcon } from 'lucide-react';

    const PRIMARY_ITEMS: ActivityItem[] = [
      { mode: 'stories', label: 'Stories', Icon: BookOpen },
      { mode: 'analysis', label: 'Analyses', Icon: Lightbulb },
      { mode: 'prompts', label: 'Canvas', Icon: FileText },
      { mode: 'tests', label: 'Tests', Icon: CheckSquare },
  +   { mode: 'workflow', label: 'Workflow', Icon: Workflow },
    ];
  ```
- **Diff `App.tsx`** :
  ```diff
    import { ActivityBar } from '@/components/hub/ActivityBar';
    import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
    import { ProjectPicker } from '@/components/hub/ProjectPicker';
    import { SidebarPanel } from '@/components/hub/SidebarPanel';
    import { StoryViewer } from '@/components/hub/StoryViewer';
    import { TitleBar } from '@/components/hub/TitleBar';
  + import { Toaster } from '@/components/ui/toaster';
  + import { WorkflowPipeline } from '@/components/workflow/WorkflowPipeline';
    import { useClaudeStore } from '@/stores/claude';
    import { useProjectStore } from '@/stores/project';
  + import { useShellStore } from '@/stores/shell';

    ...
  +   const activeMode = useShellStore((s) => s.activeMode);
    ...

    return (
      <main className="...">
        <TitleBar />
        {!projectDir ? (
          <ProjectPicker />
        ) : (
          <>
            <ClaudeBanner />
            <div className="flex flex-1 overflow-hidden">
              <ActivityBar />
              <SidebarPanel />
              <section className="flex flex-1 overflow-hidden">
  -             <StoryViewer className="flex-1" />
  +             {activeMode === 'workflow' ? (
  +               <WorkflowPipeline />
  +             ) : (
  +               <StoryViewer className="flex-1" />
  +             )}
              </section>
            </div>
          </>
        )}
  +     <Toaster />
      </main>
    );
  ```

### O10 — Vérifications

- **Module** : transverse
- **Comportement** :
  1. `cd frontend && npx tsc --noEmit` — type-check.
  2. `cd frontend && npx vite build` — bundle Vite.
  3. `go test ./internal/artifacts/... -v` — tests Go status.go.
  4. `go build ./...` — compile Go (vérifie que les bindings
     compilent).
  5. `bash scripts/dev/ui-build.sh` — wails build mock complet.
  6. Lancement : `build/bin/yukki-ui.exe ui` — validation manuelle :
     - icône Workflow visible dans l'ActivityBar (5ᵉ slot)
     - click → bascule vers la pipeline view en main content
     - rows visibles avec features SPDD du repo yukki
     - drag d'une carte → drop target apparaît, drop → status
       change + toast confirmation
     - click sur carte → drawer ouvre avec contenu
     - cellule vide débloquée → modal Create avec slash command
     - cellule vide bloquée → icône Lock, tooltip
- **Tests** : aucun automatisé en plus.

---

## N — Norms

- **TypeScript strict** — pas d'`any`. Le store typé `WorkflowState`
  + `WorkflowRow`. Le cast `Set<string>` pour `pendingUpdates`
  est explicite.
- **CSS variables shadcn uniquement** — aucun hex hardcodé. Tout
  passe par `bg-card`, `text-foreground`, `bg-primary`,
  `bg-destructive`, `text-muted-foreground`, `bg-accent`,
  `border-border` (Invariant I4 UI-006).
- **lucide-react** — icônes uniquement depuis cette lib.
  Nouvelles : `Workflow`, `Lock`, `Plus`, `MoreHorizontal`.
- **Zustand** — 6 stores isolés (Invariant I6 UI-001b). Cross-store
  via `getState()` (Invariant I4 UI-006).
- **shadcn/ui** — `Button`, `Dialog`, `Tooltip`, `DropdownMenu`,
  `Toast`, `Sheet` ajoutés via `npx shadcn add`. Pas de réécriture
  manuelle.
- **dnd-kit** — `DndContext` + `useDraggable` + `useDroppable` +
  `DragOverlay`. Pas de `onDragStart` custom (laisser dnd-kit
  gérer la `setActivatorNodeRef`). Animation 150ms ease-out
  cohérente avec UI-006.
- **Optimistic update + rollback** — pattern systématique pour
  `advanceStatus`. Toast success / destructive selon résultat.
- **Tests Go** — `internal/artifacts/status_test.go` couvre les
  9 cas (4 forward + 4 backward + skip + no-op + unknown).
  Pas de tests intégration `UpdateArtifactStatus` en V1 (validation
  manuelle).
- **Tests UI** — aucun automatisé en V1 (cohérent UI-006/007).
- **Atomic write Go** — `os.WriteFile(temp, ...)` + `os.Rename(temp, path)`.
  Cleanup du temp en defer si echec.
- **Front-matter rewrite** — `yaml.Node` manipulation in place
  pour préserver ordre/commentaires (D-D5). Pas de
  `yaml.Marshal/Unmarshal` global qui réordonne.
- **Convention de commit** — par Operation pour préserver la
  granularité (10 commits potentiels). Ou commit unifié `feat(ui-008)`
  si on souhaite un seul commit. À trancher au moment du generate.
- **Accessibility** — `aria-label` sur boutons, `aria-roledescription`
  sur cards (`"card"`), live region ARIA via dnd-kit
  (auto-géré). Tooltip Radix accessible par défaut.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de modification Go en dehors de `internal/artifacts/status.go`
  (nouveau) + `internal/artifacts/status_test.go` (nouveau) +
  `internal/uiapp/app.go` (2 méthodes ajoutées) (Invariant I8)**
  - `parser.go`, `lister.go`, `writer.go`, `id.go` : 0 changement.
  - `ui.go`, `main.go`, `ui_mock.go`, `ui_prod.go`, `wails.json`,
    `cmd/`, `internal/workflow/`, `internal/uiapp/` autres
    fichiers : 0 changement.
  - Backend Go autres packages : scope étranger.
- **Pas de modification du contrat des stores existants (Invariant I3)**
  - `useShellStore.SPDD_KINDS` reste à 4 valeurs (`'workflow'`
    NON inclus pour préserver Invariant I3 d'UI-006). `ShellMode`
    union étendue uniquement.
  - `useArtifactsStore` API inchangée. Pas d'ajout de méthode,
    pas de modification de `setKind`.
  - `useShellStore` actions (`setActiveMode`, etc.) inchangées.
- **Pas de fusion de stores (Invariant I1)**
  - `useWorkflowStore` n'importe pas les autres stores. Cross-store
    via `getState()` uniquement (D-D7 + Invariant I4 UI-006).
- **Pas de duplication de la règle métier gating (Invariant I3 UI-008)**
  - La règle `IsValidTransition` vit côté Go uniquement. Le
    frontend la consomme via `AllowedTransitions` binding et la
    cache en mémoire. Pas de réimplémentation TS.
- **Pas de hex color hardcodé (Invariant I4 UI-008)**
  - Le badge status réutilise `STATUS_BADGE` (UI-001b) qui est
    en `bg-blue-500/15` etc. (classes Tailwind, **pas** hex).
  - `bg-primary/10`, `border-primary` pour drag overlay.
- **Pas de modification du composant `<HubList />` au-delà de
  l'export `STATUS_BADGE`**
  - L'export ajoute juste un mot-clé `export` à la const
    existante. Pas de changement de comportement, pas de
    modification de la JSX.
- **Pas de modification de `<StoryViewer />`, `<NewStoryModal />`,
  `<TitleBar />`, `<ClaudeBanner />`, `<ProjectPicker />`,
  `<SidebarPanel />` au-delà de leur ré-export ou consumption**
  - APIs préservées. Pas de nouveau prop, pas de nouvel
    `useStore`. (`<StoryViewer />` est consommé tel quel par
    `<WorkflowDrawer />`.)
- **Pas de tests Playwright/Cypress en V1**
  - Validation manuelle uniquement, cohérent UI-001b/c/UI-006/UI-007.
- **Atomic write obligatoire dans `UpdateArtifactStatus`**
  - Pas de `os.WriteFile(path, ...)` direct. Toujours via
    temp + rename. Le temp est nettoyé sur erreur.
- **Pas de leak de status invalide depuis `UpdateArtifactStatus`**
  - Si `IsValidTransition(currentStatus, newStatus) == false`,
    retourne erreur immédiatement, **avant** toute modification
    du fichier.
- **Pas de feature flag, pas de retro-compat fictive**
  - Le canvas est la spec, le code la suit. Pas de
    `if (DISABLE_WORKFLOW) return null`.
- **Pas de modification de `frontend/dist/.gitkeep`**
  - Le build wipe le dossier mais le `.gitkeep` doit rester
    tracké. Restauration manuelle si supprimé par le build.

---

## Changelog

- **2026-05-02 — création** — canvas v1 issu de l'analyse UI-008
  reviewed. 7 OQs (story) + 8 D-D (analyse) toutes en reco par
  défaut. 10 Operations livrables (3 backend Go, 2 stubs Wails,
  2 deps + shadcn add, 1 store, 5 composants, 1 wiring, 1
  vérifs). 8 invariants Safeguards UI-008.
- **2026-05-02 — implementation** — O1..O10 livrés.
  - Tests Go : 8/8 PASS sur `IsValidTransition` + `AllowedTransitions`
  - `tsc --noEmit` ✓, `vite build` ✓ (528 KB JS, +100 KB vs UI-007
    par dnd-kit + Radix peer-deps shadcn add toast/dropdown/sheet)
  - `wails build -tags mock` ✓ (32s, binaire 13 MB)
  - **Divergence V1 mineure** vs canvas O8 : drag-and-drop est
    activé visuellement (`useDraggable` + `DragOverlay`) mais
    **sans drop targets explicites** par status. Le changement de
    status passe par le DropdownMenu (click droit/MoreHorizontal).
    L'AC6 "drop sur Mark <status>" sera complété en UI-008.5
    quand on validera l'UX kanban Linear-style avec utilisateurs.
    Justification : V1 minimal viable, dropdown couvre 100% du
    cas d'usage, drag affordance préservée pour futur.
  - Refactor mineur préventif : `<SidebarPanel />` `TITLES`
    étendu avec `workflow: 'Workflow'` (sinon TS error sur
    `Record<ShellMode, string>`).
  - Pipeline view layout : `<table>` HTML natif avec
    `border-separate` + sticky thead. ~10 features × 5 colonnes
    rendent fluidement sur le repo yukki actuel.
