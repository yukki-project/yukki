---
id: UI-009
slug: multi-project-file-open-close
title: Multi-projet — File menu + tab bar
story: .yukki/stories/UI-009-multi-project-file-open-close.md
analysis: .yukki/analysis/UI-009-multi-project-file-open-close.md
status: synced
created: 2026-05-06
updated: 2026-05-06
---

# Canvas REASONS — Multi-projet (File menu + tabs)

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Yukki ne gère aujourd'hui qu'un seul projet à la fois via `SelectProject`. Pour
jongler entre plusieurs repos, l'utilisateur doit fermer, relancer et resélectionner
un dossier, perdant ainsi l'état de l'autre projet. Cette story livre le MVP
multi-projet : File menu (Open / Close / Recent) dans le titlebar, tab bar
VSCode-style (1 tab = 1 projet), et persistance du registre entre sessions.

### Definition of Done

- [ ] `File > Open Project...` (ou `Ctrl+O`) ouvre un directory picker, valide le
  dossier, l'ajoute à la session et bascule dessus (AC1)
- [ ] Si le dossier n'a pas de `.yukki/`, une boîte de dialogue propose Initialize
  ou Cancel — aucun ajout avant décision, aucun crash (AC5)
- [ ] Si le dossier est déjà ouvert, le tab existant est activé — pas de doublon (cas limite)
- [ ] `File > Close Project` (ou `Ctrl+W`) retire le projet courant et bascule sur
  le suivant, ou affiche l'empty state si aucun projet restant (AC2)
- [ ] `File > Recent Projects ▶` liste les 10 derniers projets ; un clic = Open (AC3)
- [ ] Au redémarrage de yukki, les projets ouverts lors de la session précédente
  sont restaurés et le projet courant redevient courant (AC4)
- [ ] Un projet supprimé du filesystem entre deux sessions est retiré du registre
  avec un message info — pas de crash (AC6)
- [ ] `Ctrl+Tab` / `Ctrl+Shift+Tab` navigue entre tabs ; `Ctrl+1`–`Ctrl+9` bascule
  directement au tab N ; drag-drop réordonne les tabs
- [ ] `ReadArtifact` accepte les paths des N projets ouverts et refuse tout path hors
  des N préfixes (Invariant I1 étendu)
- [ ] Registry corrompu → fichier sauvegardé `.broken.bak`, démarrage vide, pas de crash
- [ ] `go test ./internal/uiapp/...` passe (tests Go backend)

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `OpenedProject` | Un projet yukki ouvert dans la session courante | `path string` (absolu, canonique), `name string` (`filepath.Base`), `lastOpened time.Time`, `loader *templates.Loader`, `writer *artifacts.Writer` | Créé par `OpenProject`, supprimé par `CloseProject` |
| `ProjectMeta` | Représentation sérialisable d'un projet (envoyée au frontend via Wails) | `Path string`, `Name string`, `LastOpened time.Time` | Value object — pas de cycle |
| `RegistryEntry` | Entrée dans le fichier `projects.json` (opened ou recent) | `Path string`, `Name string`, `LastOpened time.Time` | Persisté par `saveRegistry`, chargé par `loadRegistry` |
| `ProjectsRegistry` | Snapshot sérialisable du state complet | `Version int`, `ActiveIndex int`, `OpenedProjects []RegistryEntry`, `RecentProjects []RegistryEntry` | Écrit sur disque à chaque mutation, lu au démarrage |
| `App` (évoluée) | Root struct Wails — passe de mono-state à multi-state | `openedProjects []*OpenedProject`, `activeIndex int`, `mu sync.RWMutex` + champs existants conservés | Initialisé par `OnStartup`, flush par `OnShutdown` |

### Relations

- `App` ⟶ `[]*OpenedProject` : 0..N (slice ordonnée = ordre des tabs)
- `App.activeIndex` pointe l'`OpenedProject` courant (invariant : 0 ≤ activeIndex < len, ou -1 si vide)
- `ProjectsRegistry` ⟶ `[]RegistryEntry` opened (miroir de `openedProjects`) + recent (N=10)
- Bindings existants (`ListArtifacts`, `ReadArtifact`, `RunStory`) ⟶ délèguent au projet actif (`openedProjects[activeIndex]`)

---

## A — Approach

Le refactor central est **additif-wrapper** : les bindings existants
(`ListArtifacts`, `ReadArtifact`, `RunStory`, `SelectProject`, `InitializeYukki`,
`GetClaudeStatus`) ne changent pas de signature — ils deviennent des wrappers sur
le projet actif courant (`a.activeProject()`). Cette règle garantit zéro régression
sur UI-001b/c.

Les nouveaux bindings (`OpenProject`, `CloseProject`, `SwitchProject`,
`ListOpenedProjects`, `ReorderProjects`, `LoadRegistry`, `ListRecentProjects`) sont
purement additifs.

`SelectProject` est conservé comme alias déprécié vers `OpenProject` (migration
douce du frontend sur 1 release).

Le registre est persisté dans `<os.UserConfigDir()>/yukki/projects.json` (XDG)
via `encoding/json` de la stdlib — aucune dépendance externe. Format versionné
(`"version": 1`), migration gracieuse si version inconnue.

La protection concurrente est assurée par un `sync.RWMutex` dans `App` :
- lectures (bindings de query) → `RLock`
- mutations (OpenProject, CloseProject, SwitchProject, ReorderProjects) → `Lock`

Le Safeguard I1 (path-isolation dans `ReadArtifact`) est étendu via une fonction
helper `hasYukkiPrefix(absPath string, projects []*OpenedProject) bool` qui itère
sur tous les préfixes ouverts.

Côté frontend :
- Nouveau store Zustand `useTabsStore` (non persisté côté front — source de vérité = backend)
- `TabBar.tsx` rendu sous le `TitleBar`, au-dessus de la zone contenu
- `FileMenu.tsx` intégré dans le `TitleBar` à gauche (dropdown via shadcn `DropdownMenu`)
- `App.tsx` capte `keydown` pour les raccourcis `Ctrl+O`, `Ctrl+W`, `Ctrl+Tab`,
  `Ctrl+Shift+Tab`, `Ctrl+1`–`Ctrl+9`
- Synchronisation frontend←backend via events Wails `project:opened` et `project:closed`
  (pattern établi par UI-001c)
- `ProjectPicker` maintenu pour l'empty state (0 projets ouverts) ; le flow
  "Initialize" dans `ProjectPicker` est adapté pour appeler `OpenProject` après init

### Alternatives considérées

- **Multi-window Wails** — Rejetée : coordination complexe, titlebar dupliqué,
  pas de menu File partagé.
- **Wrapper externe multi-instance** — Rejetée : pas de state partagé, RAM doublée,
  UX fragmentée.
- **`SelectProject` étendu sans nouveau binding** — Rejetée : sémantique "open
  additif" vs "select exclusif" n'est pas exprimable avec la même signature.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/uiapp` | `app.go` | modify — ajout champs multi-state, helpers `activeProject()`, `canonicalizePath()`, `hasYukkiPrefix()`, refactor `SelectProject` en alias, `ReadArtifact` étendu |
| `internal/uiapp` | `registry.go` (nouveau) | create — types `OpenedProject`, `ProjectMeta`, `RegistryEntry`, `ProjectsRegistry` + `loadRegistry()`, `saveRegistry()`, `registryPath()` |
| `internal/uiapp` | `bindings.go` (nouveau) | create — nouveaux bindings Wails : `OpenProject`, `CloseProject`, `SwitchProject`, `ListOpenedProjects`, `ReorderProjects`, `LoadRegistry`, `ListRecentProjects` |
| `internal/uiapp` | `app_test.go` | modify — adapter les tests existants au multi-state, ajouter `TestApp_OpenProject_*`, `TestApp_CloseProject_*`, `TestApp_ReadArtifact_PathTraversal_MultiProject`, `TestRegistry_*` |
| `frontend/src/stores` | `tabs.ts` (nouveau) | create — `useTabsStore` (Zustand, non persisté) |
| `frontend/src/stores` | `project.ts` | modify — retirer `projectDir` / `hasSpdd` (remplacé par `useTabsStore.activeProject`) |
| `frontend/src/components/hub` | `TitleBar.tsx` | modify — intégrer `FileMenu` à gauche |
| `frontend/src/components/hub` | `TabBar.tsx` (nouveau) | create — tabs projets + drag-drop + bouton `+` |
| `frontend/src/components/hub` | `FileMenu.tsx` (nouveau) | create — dropdown Open / Close / Recent / Initialize |
| `frontend/src/components/hub` | `ProjectPicker.tsx` | modify — appel `OpenProject` (nouveau binding) au lieu de `SelectProject` |
| `frontend/src/` | `App.tsx` | modify — ajouter `TabBar`, brancher les raccourcis clavier, adapter guard `!projectDir` |
| `frontend/wailsjs/go/main` | `App.js` / `App.d.ts` | modify — stubs hand-written pour les nouveaux bindings |
| `frontend/src/lib` | `wails-events.ts` | modify — ajouter `ProjectOpenedPayload`, `ProjectClosedPayload` |

### Schéma de flux

```
[User: Ctrl+O / File > Open]
        │
        ▼
  FileMenu.tsx → OpenProject() [Wails binding]
        │
        ▼
  App.go : OpenProject(path string)
    1. openDirectoryDialog si path==""
    2. canonicalizePath() → absPath
    3. check doublon → SwitchProject si déjà ouvert
    4. os.Stat(.yukki/) → si absent → retourner ErrNoYukki
    5. append openedProjects, activeIndex = len-1
    6. saveRegistry()
    7. emitEvent("project:opened", ProjectMeta{...})
        │
        ▼
  Frontend : EventsOn("project:opened")
    → useTabsStore.addProject(meta)
    → useTabsStore.setActive(meta.path)
        │
        ▼
  TabBar.tsx re-render + sidebar/hub = projet courant
```

---

## O — Operations

### O1 — `registry.go` : types et persistence XDG

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/registry.go` (nouveau)
- **Signature** :
  ```go
  // Types
  type OpenedProject struct {
      Path       string
      Name       string
      LastOpened time.Time
      loader     *templates.Loader
      writer     *artifacts.Writer
  }

  type ProjectMeta struct {
      Path       string    `json:"path"`
      Name       string    `json:"name"`
      LastOpened time.Time `json:"lastOpened"`
  }

  type RegistryEntry struct {
      Path       string    `json:"path"`
      Name       string    `json:"name"`
      LastOpened time.Time `json:"last_opened"`
  }

  type ProjectsRegistry struct {
      Version        int             `json:"version"`
      ActiveIndex    int             `json:"active_index"`
      OpenedProjects []RegistryEntry `json:"opened_projects"`
      RecentProjects []RegistryEntry `json:"recent_projects"`
  }

  // Functions
  func registryPath() (string, error)
  func loadRegistry() (*ProjectsRegistry, error)
  func saveRegistry(reg *ProjectsRegistry) error
  func newOpenedProject(path string) (*OpenedProject, error)
  func (p *OpenedProject) meta() ProjectMeta
  ```
- **Comportement** :
  1. `registryPath()` : appelle `os.UserConfigDir()`, retourne
     `<configDir>/yukki/projects.json`. Crée le dossier `yukki/` si absent
     (`os.MkdirAll`, mode 0o700).
  2. `loadRegistry()` : lit le fichier JSON. Si absent → retourne un registry
     vide (`version: 1`). Si parse error → sauvegarde le fichier corrompu en
     `<path>.broken.bak` (via `os.Rename`), log warn, retourne registry vide.
     Si `version` inconnu (≠ 1) → log warn + retourne registry vide (migration
     gracieuse).
  3. `saveRegistry(reg)` : sérialise en JSON indenté, écrit via `os.WriteFile`
     (mode 0o600). Crée le dossier parent si absent.
  4. `newOpenedProject(path)` : canonicalize (cf. O2 helper), vérifie
     `os.Stat(filepath.Join(path, ".yukki"))`, retourne `ErrNoYukki` si absent.
     Initialise `loader` et `writer`.
  5. `meta()` : retourne `ProjectMeta` depuis les champs publics.
- **Tests** :
  - `TestRegistry_LoadMissing_ReturnsEmpty` — fichier absent → registry vide, pas d'erreur
  - `TestRegistry_LoadCorrupted_StartsEmpty` — JSON invalide → .broken.bak créé, registry vide
  - `TestRegistry_LoadUnknownVersion_StartsEmpty` — version 99 → registry vide
  - `TestRegistry_SaveAndLoad_RoundTrip` — save puis load → données identiques
  - `TestRegistryPath_CreatesDir` — dossier créé si absent

---

### O2 — `app.go` : helpers multi-state + refactor mono-state

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go` (modify)
- **Signature** :
  ```go
  // Nouveaux champs dans App struct :
  // openedProjects []*OpenedProject
  // activeIndex    int          // -1 si vide
  // mu             sync.RWMutex // protège openedProjects + activeIndex

  func (a *App) activeProject() (*OpenedProject, error)
  func canonicalizePath(path string) (string, error)
  func hasYukkiPrefix(absPath string, projects []*OpenedProject) bool

  // Bindings existants refactorisés (signature inchangée) :
  func (a *App) SelectProject() (string, error)      // alias → OpenProject("")
  func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error)
  func (a *App) ReadArtifact(path string) (string, error)
  func (a *App) RunStory(kind, prefix, prompt string) error
  ```
- **Comportement** :
  1. `activeProject()` : lock RLock. Si `len(a.openedProjects) == 0` ou
     `a.activeIndex < 0` → retourner `errors.New("no project selected")`. Sinon
     retourner `a.openedProjects[a.activeIndex]`.
  2. `canonicalizePath(path)` : `filepath.Abs(path)` → `filepath.EvalSymlinks`
     → `filepath.Clean`. Sur Windows, le chemin canonicalisé est stocké tel quel
     mais comparé via `strings.EqualFold` (cf. O3).
  3. `hasYukkiPrefix(absPath, projects)` : itère sur les projets ; pour chacun,
     calcule `prefix = filepath.Join(p.Path, ".yukki") + string(filepath.Separator)`
     ; teste avec `strings.HasPrefix` (case-sensitive Linux/macOS) ou
     `strings.EqualFold` sur les préfixes communs (Windows, via `runtime.GOOS`).
     Retourne `true` dès qu'un match est trouvé.
  4. `SelectProject()` : appelle `a.OpenProject("")` et retourne `(path, err)`.
     Annotée `// Deprecated: use OpenProject`.
  5. `ListArtifacts` : remplace `if a.projectDir == ""` par `p, err := a.activeProject()`.
     Utilise `p.Path` au lieu de `a.projectDir`.
  6. `ReadArtifact` : remplace le check mono-préfixe par `hasYukkiPrefix(absPath,
     a.openedProjects)`. Retourne `"path outside any opened project .yukki"` si refus.
  7. `RunStory` : remplace `a.loader` / `a.writer` par `p.loader` / `p.writer`
     depuis `activeProject()`.
  8. `App` struct : retirer les champs `projectDir string`, `loader *templates.Loader`,
     `writer *artifacts.Writer` (désormais dans `OpenedProject`).
  9. `OnStartup` : appeler `a.restoreRegistry()` (défini en O4) après le setup du ctx.
  10. `OnShutdown` : appeler `a.persistRegistry()` (défini en O4) avant `a.cancel()`.
- **Tests** :
  - `TestApp_ActiveProject_EmptyReturnsError`
  - `TestApp_HasYukkiPrefix_AcceptsKnownProject`
  - `TestApp_HasYukkiPrefix_RejectsOutsidePath`
  - `TestApp_HasYukkiPrefix_WindowsCaseInsensitive` (vérifie EqualFold)
  - `TestApp_ReadArtifact_PathTraversal_MultiProject` — 2 projets ouverts, vérifie accept/refus
  - `TestApp_ListArtifacts_NoProject_ReturnsError`
  - `TestApp_SelectProject_DelegatesToOpenProject`
  - Adapter `TestApp_OnStartup_StoresContext`, `TestApp_OnShutdown_CancelsContext`

---

### O3 — `bindings.go` : nouveaux bindings Wails

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/bindings.go` (nouveau)
- **Signature** :
  ```go
  func (a *App) OpenProject(path string) (ProjectMeta, error)
  func (a *App) CloseProject(idx int) error
  func (a *App) SwitchProject(idx int) error
  func (a *App) ListOpenedProjects() []ProjectMeta
  func (a *App) ReorderProjects(order []int) error
  func (a *App) LoadRegistry() (ProjectsRegistry, error)
  func (a *App) ListRecentProjects() ([]ProjectMeta, error)
  ```
- **Comportement** :
  1. `OpenProject(path string)` :
     - Si `path == ""` → ouvrir `openDirectoryDialog`.
     - `canonicalizePath(selected)` → `canon`.
     - Vérifier doublon : si un projet dans `openedProjects` a même path (via
       `strings.EqualFold` sur Windows, `==` sinon) → `SwitchProject(idx)`, retourner son meta.
     - `newOpenedProject(canon)` → si `ErrNoYukki` → retourner `(ProjectMeta{}, ErrNoYukki)`.
       Le frontend affichera la boîte Initialize / Cancel.
     - Cap : si `len(a.openedProjects) >= maxOpenedProjects` (constante = 20) →
       retourner `ErrTooManyProjects`.
     - `Lock()` ; append ; `activeIndex = len-1` ; `Unlock()`.
     - `saveRegistry(a.buildRegistry())`.
     - `emitEvent(a.ctx, "project:opened", p.meta())`.
     - Retourner `p.meta(), nil`.
  2. `CloseProject(idx int)` :
     - `Lock()` ; bounds-check ; retirer `openedProjects[idx]` (slice splice).
     - Si `len == 0` → `activeIndex = -1` ; sinon `activeIndex = min(idx, len-1)`.
     - `Unlock()`.
     - `saveRegistry(a.buildRegistry())`.
     - `emitEvent(a.ctx, "project:closed", idx)`.
  3. `SwitchProject(idx int)` :
     - `Lock()` ; bounds-check ; `activeIndex = idx` ; `Unlock()`.
     - `emitEvent(a.ctx, "project:switched", a.openedProjects[idx].meta())`.
  4. `ListOpenedProjects()` :
     - `RLock()` ; mapper `openedProjects` → `[]ProjectMeta` ; `RUnlock()`.
  5. `ReorderProjects(order []int)` :
     - Valider que `order` est une permutation de `0..len-1`, sinon `ErrInvalidOrder`.
     - `Lock()` ; réarranger la slice ; corriger `activeIndex` dans la permutation ;
       `Unlock()` ; `saveRegistry`.
  6. `LoadRegistry()` :
     - Appelle `loadRegistry()`. Retourne le `ProjectsRegistry` brut (pour hydratation
       frontend au démarrage).
  7. `ListRecentProjects()` :
     - `RLock()` ; retourner la liste `RecentProjects` du registry courant (max 10,
       filtrée des projets déjà ouverts) ; `RUnlock()`.
  8. Helper interne `buildRegistry()` : construit un `ProjectsRegistry` depuis
     `openedProjects` + `activeIndex` ; gère la liste `recent` (déduplique, tronque à 10).
  9. `restoreRegistry()` (appelé par O2/OnStartup) : appelle `loadRegistry()` ; pour
     chaque `opened_project`, appelle `newOpenedProject(entry.Path)` — si erreur (projet
     absent), log info, skip. Restaure `activeIndex` (borné à len courant).
  10. `persistRegistry()` (appelé par O2/OnShutdown) : `saveRegistry(a.buildRegistry())`.
- **Tests** :
  - `TestApp_OpenProject_AddsTab`
  - `TestApp_OpenProject_DuplicateActivatesExisting`
  - `TestApp_OpenProject_NoYukki_ReturnsErrNoYukki`
  - `TestApp_OpenProject_ExceedsCap_ReturnsError`
  - `TestApp_CloseProject_LastProject_EmptyState`
  - `TestApp_CloseProject_MiddleTab_ShiftsActive`
  - `TestApp_SwitchProject_SetsActive`
  - `TestApp_ReorderProjects_InvalidPermutation_Errors`
  - `TestApp_RestoreRegistry_SkipsMissingPaths`
  - `TestApp_PersistRegistry_SavesState`

---

### O4 — `useTabsStore` (frontend)

- **Module** : `frontend/src/stores`
- **Fichier** : `frontend/src/stores/tabs.ts` (nouveau)
- **Signature** :
  ```typescript
  export interface ProjectTab {
    path: string;
    name: string;
    lastOpened: string; // ISO8601
  }

  interface TabsState {
    openedProjects: ProjectTab[];
    activeIndex: number; // -1 = empty
    recentProjects: ProjectTab[];

    addProject: (meta: ProjectTab) => void;
    removeProject: (idx: number) => void;
    setActive: (idx: number) => void;
    reorderProjects: (order: number[]) => void;
    setOpenedProjects: (projects: ProjectTab[], activeIndex: number) => void;
    setRecentProjects: (projects: ProjectTab[]) => void;
  }

  export const useTabsStore: StoreApi<TabsState>;
  export function activeProject(state: TabsState): ProjectTab | null;
  ```
- **Comportement** :
  1. Store Zustand **sans** `persist` middleware (source de vérité = backend).
  2. `addProject(meta)` : append à `openedProjects`, `activeIndex = len-1`.
  3. `removeProject(idx)` : splice ; si `len == 0` → `activeIndex = -1` ; sinon
     `activeIndex = Math.min(idx, len-1)`.
  4. `setActive(idx)` : set `activeIndex`.
  5. `reorderProjects(order)` : réarranger `openedProjects` selon la permutation.
  6. `setOpenedProjects(projects, activeIndex)` : hydratation initiale au mount
     depuis `LoadRegistry()`.
  7. `activeProject(state)` : sélecteur — retourne `openedProjects[activeIndex]`
     ou `null` si `-1`.
- **Tests** : (Vitest, fichier `tabs.test.ts`)
  - `addProject appends and activates`
  - `removeProject last → activeIndex -1`
  - `removeProject middle → shifts active`
  - `setActive sets index`
  - `reorderProjects reorders correctly`
  - `activeProject returns null when empty`

---

### O5 — `TabBar.tsx` (frontend)

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/TabBar.tsx` (nouveau)
- **Signature** :
  ```typescript
  export function TabBar(): JSX.Element
  ```
- **Comportement** :
  1. Consomme `useTabsStore` : `openedProjects`, `activeIndex`, `removeProject`,
     `setActive`, `reorderProjects`.
  2. Si `openedProjects.length === 0` → retourner `null` (TabBar cachée en empty state).
  3. Rend une liste de tabs `<div role="tablist">` ; chaque tab :
     - Nom court (`project.name`)
     - Bouton `✕` (`X` de lucide-react) visible au survol → appelle `CloseProject(idx)`
       puis `removeProject(idx)`.
     - Tab active : `border-t-2 border-primary bg-card` ; inactive : `bg-background`.
     - Click → `SwitchProject(idx)` (binding Wails) + `setActive(idx)`.
  4. Bouton `+` à droite → appelle `OpenProject("")` puis hydrate le store.
  5. Drag-drop horizontal via événements `onDragStart` / `onDragOver` / `onDrop`
     natifs (pas de lib externe) → `ReorderProjects(order)` (Wails) +
     `reorderProjects(order)` (store).
  6. Hauteur fixe `h-8`, style `shrink-0`, même `bg-card` que TitleBar.
- **Tests** : (Vitest + React Testing Library, fichier `TabBar.test.tsx`)
  - `renders tabs for each opened project`
  - `clicking a tab calls SwitchProject and setActive`
  - `clicking X button calls CloseProject and removeProject`
  - `clicking + button calls OpenProject`
  - `renders nothing when no projects are open`

---

### O6 — `FileMenu.tsx` (frontend)

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/FileMenu.tsx` (nouveau)
- **Signature** :
  ```typescript
  export function FileMenu(): JSX.Element
  ```
- **Comportement** :
  1. Utilise le composant `DropdownMenu` de shadcn/ui (déjà présent).
  2. Trigger : bouton `"File"` (texte petit, style `text-xs text-muted-foreground`
     aligné avec le logo yukki dans TitleBar).
  3. Items du menu :
     - **Open Project...** (`Ctrl+O`) → `OpenProject("")` → hydrate `useTabsStore`.
     - Separator
     - **Recent Projects ▶** — sous-menu `DropdownMenuSub` :
       - Consomme `recentProjects` de `useTabsStore`.
       - Si vide → item `"No recent projects"` désactivé.
       - Sinon liste des entries (name + path tronqué) → click = `OpenProject(path)`.
       - Liste rechargée via `ListRecentProjects()` au survol (`onPointerEnter`).
     - Separator
     - **Initialize Project...** — ouvre directory picker, si pas de `.yukki/`
       affiche dialog de confirmation inline avant d'appeler `InitializeYukki`.
  4. Ferme le menu après chaque action.
  5. **Note** : "Close Project" a été retiré du menu ; la fermeture reste disponible
     via `Ctrl+W` (raccourci branché dans `App.tsx`) et via le bouton `✕` de la
     `TabBar`.
- **Tests** : (Vitest + RTL, fichier `FileMenu.test.tsx`)
  - `renders File menu trigger`
  - `Open Project calls OpenProject`
  - `Recent Projects submenu shows recent list`
  - `Recent Projects submenu shows empty state`

---

### O7 — `TitleBar.tsx` + `App.tsx` : intégration TabBar + FileMenu + raccourcis

- **Module** : `frontend/src/components/hub`, `frontend/src/`
- **Fichiers** : `TitleBar.tsx` (modify), `App.tsx` (modify)
- **Signature** :
  ```typescript
  // TitleBar.tsx — inchangé en signature, modifié en JSX :
  export function TitleBar(): JSX.Element

  // App.tsx — inchangé en signature :
  export default function App(): JSX.Element
  ```
- **Comportement** :
  **TitleBar.tsx** :
  1. Ajouter `<FileMenu />` à gauche, **après** le logo yukki et **avant** la
     drag region :
     ```jsx
     <div className="flex items-center gap-2 pl-3">
       <img ... />
       <span>yukki</span>
       <FileMenu />
     </div>
     ```
  2. Aucun autre changement dans TitleBar.

  **App.tsx** :
  1. Importer `TabBar` et `useTabsStore`.
  2. Remplacer la garde `!projectDir` (depuis `useProjectStore`) par :
     `const { openedProjects, activeIndex } = useTabsStore()` ; empty state si
     `openedProjects.length === 0`.
  3. Insérer `<TabBar />` entre `<TitleBar />` et la zone contenu
     (`<ClaudeBanner />` / reste du hub).
  4. `useEffect` au mount : appeler `LoadRegistry()`, puis `useTabsStore.setOpenedProjects(...)`.
  5. `useEffect` pour les raccourcis clavier (`keydown`) :
     - `Ctrl+O` → `OpenProject("")`
     - `Ctrl+W` → `CloseProject(activeIndex)` si `activeIndex >= 0`
     - `Ctrl+Tab` → `SwitchProject((activeIndex + 1) % len)`
     - `Ctrl+Shift+Tab` → `SwitchProject((activeIndex - 1 + len) % len)`
     - `Ctrl+1`–`Ctrl+9` → `SwitchProject(digit - 1)` si dans les bornes
  6. Brancher les events Wails :
     - `EventsOn<ProjectMeta>("project:opened", (meta) => addProject(meta))`
     - `EventsOn<number>("project:closed", (idx) => removeProject(idx))`
     - `EventsOn<ProjectMeta>("project:switched", (meta) => setActive(...))`
     - Cleanup via la fonction de retour de `useEffect`.
  7. Pont de compatibilité legacy : `useEffect` sur `current?.path` qui appelle
     `useProjectStore.setProjectDir(current.path)`, `setHasSpdd(true)` et
     `useArtifactsStore.refresh()` — nécessaire car `HubList`, `SidebarPanel` et
     `StoryViewer` lisent encore `useProjectStore.projectDir`. À retirer lors de
     la migration complète de ces composants vers `useTabsStore`.
  8. `useProjectStore` reste importé pour le pont de compatibilité (point 7).
- **Tests** :
  - `App renders TabBar when projects are open`
  - `App renders empty state when no projects`
  - `App hydrates store from LoadRegistry on mount`
  - `Ctrl+O shortcut calls OpenProject`
  - `Ctrl+W shortcut calls CloseProject`
  - `Ctrl+1 shortcut calls SwitchProject(0)`

---

### O8 — Stubs Wails hand-written + events frontend

- **Module** : `frontend/wailsjs/go/main`, `frontend/src/lib`
- **Fichiers** : `App.js` (modify), `App.d.ts` (modify), `wails-events.ts` (modify)
- **Signature** :
  ```typescript
  // App.d.ts — nouveaux exports :
  export function OpenProject(path: string): Promise<{Path:string, Name:string, LastOpened:string}>;
  export function CloseProject(idx: number): Promise<void>;
  export function SwitchProject(idx: number): Promise<void>;
  export function ListOpenedProjects(): Promise<Array<{Path:string, Name:string, LastOpened:string}>>;
  export function ReorderProjects(order: number[]): Promise<void>;
  export function LoadRegistry(): Promise<{version:number, active_index:number, opened_projects: any[], recent_projects: any[]}>;
  export function ListRecentProjects(): Promise<Array<{Path:string, Name:string, LastOpened:string}>>;

  // wails-events.ts — nouvelles interfaces :
  export interface ProjectOpenedPayload { path: string; name: string; lastOpened: string; }
  export interface ProjectClosedPayload { idx: number; }
  export interface ProjectSwitchedPayload { path: string; name: string; lastOpened: string; }
  ```
- **Comportement** :
  1. `App.js` : ajouter le pattern `go:main.App.OpenProject` pour chaque nouveau
     binding (pattern identique aux stubs existants `RunStory`, `SelectProject`).
  2. `App.d.ts` : ajouter les déclarations TypeScript correspondantes.
  3. `wails-events.ts` : ajouter les 3 nouvelles interfaces de payload. Pas de
     changement à la fonction `EventsOn` (générique, déjà fonctionnelle).
- **Tests** : pas de test unitaire pour les stubs Wails (générés / hand-written
  sans logique propre). Couverts indirectement par les tests des composants qui
  les consomment.

---

### O9 — `ProjectPicker.tsx` : adaptation empty state

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/ProjectPicker.tsx` (modify)
- **Signature** :
  ```typescript
  export function ProjectPicker(): JSX.Element  // signature inchangée
  ```
- **Comportement** :
  1. Remplacer l'appel `SelectProject()` par `OpenProject("")`.
  2. Remplacer `InitializeSPDD(pendingDir)` par `InitializeYukki(pendingDir)`
     (le binding existe déjà, l'import était sur l'ancien nom).
  3. Après succès d'`OpenProject("")`, **ne plus** appeler `setProjectDir` /
     `setHasSpdd` depuis `useProjectStore` — le store `useTabsStore` est mis à
     jour via l'event Wails `project:opened` (branché dans `App.tsx` O7).
  4. Le flow "Initialize" : appeler `InitializeYukki(pendingDir)`, puis
     `OpenProject(pendingDir)` — l'event `project:opened` se chargera
     d'activer le nouveau projet.
  5. Retirer les imports de `useProjectStore` / `useArtifactsStore` si
     ces stores ne sont plus utilisés dans le composant.
- **Tests** :
  - `ProjectPicker calls OpenProject on open button click`
  - `ProjectPicker calls InitializeYukki then OpenProject on initialize`

---

## N — Norms

- **Logging** : backend Go utilise `slog` (pattern `a.logger.Info(...)` existant).
  Aucun `fmt.Println` dans le code produit. Frontend : pas de `console.log` dans le
  code livré — les erreurs transitent via `useToast` ou le mécanisme d'erreur du
  binding Wails.
- **Concurrence Go** : tout accès à `openedProjects` / `activeIndex` doit passer par
  `a.mu.Lock()` (mutation) ou `a.mu.RLock()` (lecture). Ne jamais accéder à ces
  champs sans lock.
- **Sécurité — path** : `canonicalizePath` est appelé systématiquement dans
  `OpenProject` avant tout usage. Ne jamais stocker un path non canonicalisé dans
  `openedProjects`.
- **Format JSON** : `encoding/json` stdlib uniquement. JSON indenté (`json.MarshalIndent`)
  pour lisibilité. Mode fichier `0o600` (user-only).
- **Wails bindings** : les types de retour restent simples (pas de pointeurs, pas
  d'interface{}) pour que la génération Wails TypeScript soit propre. Utiliser des
  structs nommées (pas de `map[string]any`).
- **Frontend — shadcn/ui** : utiliser uniquement les composants déjà présents
  (`DropdownMenu`, `Button`, `X`, etc.). Pas de nouvelle dépendance npm.
- **Drag-drop** : API HTML5 native (`draggable`, `onDragStart`, `onDragOver`,
  `onDrop`). Pas de lib externe.
- **Accessibilité** : `role="tablist"` + `role="tab"` + `aria-selected` sur la
  `TabBar`. `aria-label` sur le bouton `✕` (`"Close project <name>"`).
- **Cap projets** : constante `maxOpenedProjects = 20` dans `bindings.go`. Retourner
  `ErrTooManyProjects` si dépassé.
- **Tests backend** : naming `Test<Type>_<Method>_<Scenario>` (pattern déjà établi
  dans `app_test.go`). Table-driven si ≥ 3 cas similaires. Voir
  [`.yukki/methodology/testing/testing-backend.md`](../../methodology/testing/testing-backend.md).
- **Tests frontend** : Vitest + React Testing Library. Fichiers `*.test.tsx` /
  `*.test.ts` à côté du fichier produit. Voir
  [`.yukki/methodology/testing/testing-frontend.md`](../../methodology/testing/testing-frontend.md).

---

## S — Safeguards

- **Sécurité — Path traversal (Invariant I1 étendu)** — `ReadArtifact` **ne doit
  jamais** retourner le contenu d'un fichier situé hors des dossiers `.yukki/` de
  l'un des projets ouverts. La fonction `hasYukkiPrefix` doit inclure le séparateur
  final pour éviter les faux positifs (`/home/user/.yukki-evil/` ne doit pas matcher
  `/home/user/.yukki/`).
- **Pas de path non canonicalisé** — Ne jamais stocker dans `openedProjects` un
  path provenant directement de l'utilisateur sans passer par `canonicalizePath`.
  Interdit de bypasser cette étape pour "optimiser".
- **Mutex obligatoire** — Ne jamais lire ou écrire `openedProjects` / `activeIndex`
  hors d'un lock `a.mu`. Les helpers `activeProject()` et `buildRegistry()` doivent
  eux-mêmes prendre leur lock ou être appelés uniquement depuis un contexte déjà
  locké (dans ce cas, documenter l'invariant).
- **Registry corrompu — pas de crash** — `loadRegistry` ne doit jamais paniquer ni
  retourner une erreur fatale sur un JSON invalide. Elle doit logger, sauvegarder le
  fichier corrompu, et retourner un registry vide.
- **ErrNoYukki remonté tel quel** — `OpenProject` ne doit pas swallow l'erreur
  `ErrNoYukki`. Elle doit être retournée au frontend pour déclencher le flow
  Initialize / Cancel. Pas de log silencieux ici.
- **Cap dur 20 projets** — `OpenProject` doit vérifier le cap **avant** d'appeler
  `newOpenedProject` (éviter de créer loader/writer inutilement). `ErrTooManyProjects`
  est une erreur normale, pas une panique.
- **Bindings existants non cassés** — Les signatures de `SelectProject`,
  `ListArtifacts`, `ReadArtifact`, `RunStory`, `InitializeYukki`, `GetClaudeStatus`,
  `AllowedKinds` restent identiques. Interdit de changer leurs paramètres ou types
  de retour — ce serait un breaking change Wails sans migration frontend.
- **Pas de state projectDir / loader / writer dans App** — Ces champs doivent être
  retirés de `App` struct et n'exister que dans `OpenedProject`. Tout code qui lit
  encore `a.projectDir` directement (hors migration `SelectProject`) est une violation.
- **Wails events uniquement pour la synchronisation frontend** — Ne jamais modifier
  le state Go directement depuis un callback JS. Toute mutation passe par un binding
  Wails Go → TypeScript (pas l'inverse).

---

## Changelog

- 2026-05-06 — generate — implémentation initiale O1→O9
- 2026-05-06 — sync — O6 : suppression de l'item "Close Project" du FileMenu (demande utilisateur) ; la fermeture reste accessible via `Ctrl+W` et le bouton `✕` de la TabBar, comportement inchangé côté backend. O7 : ajout pont de compatibilité legacy dans App.tsx (`useProjectStore.setProjectDir` + `useArtifactsStore.refresh` au changement de projet actif), nécessaire jusqu'à migration complète de HubList/SidebarPanel/StoryViewer vers `useTabsStore`.
