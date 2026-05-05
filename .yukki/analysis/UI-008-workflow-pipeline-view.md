---
id: UI-008
slug: workflow-pipeline-view
story: .yukki/stories/UI-008-workflow-pipeline-view.md
status: reviewed
created: 2026-05-02
updated: 2026-05-02
---

# Analyse — UI-008 — Vue pipeline SPDD

> Story de tooling/feature post-V1 : ajoute un 5ᵉ mode `Workflow`
> dans l'ActivityBar (UI-006) qui affiche une vue swim-lane
> Linear/Jira-style. La story a déjà tranché 7 OQs en revue
> (toutes en reco A : pipeline visuelle Linear-style + gating dur
> Jira-style). Cette analyse complète avec les décisions
> architecturales secondaires (D-D1..D-D8) révélées par le scan
> du code existant.
>
> **Note 2026-05-02 (post-implem)** : la stratégie de rendu des
> cellules a été simplifiée — désormais **une seule cellule
> active par ligne** (l'étape la plus avancée), les cellules
> antérieures rendent un placeholder `—`, la cellule `+1`
> rend un `Plus` si gating ouvert, le reste est vide. Pas
> d'impact sur les D-D existantes ; impact uniquement sur
> O8 (WorkflowRow). Cf. canvas changelog.
>
> **Note 2026-05-03 (post-implem)** : (a) la colonne Feature
> sticky leftmost a été supprimée — l'`id` est déjà visible dans
> la cellule active, et la colonne sticky créait un gros scroll
> horizontal. (b) Ajout de la **réorganisation des lignes
> par drag-and-drop** : nouveau champ `priority: int` sur le
> front-matter de la story, nouvelle binding Go
> `UpdateArtifactPriority(path, priority)` (mirror de
> `UpdateArtifactStatus`), `Meta.Priority int` ajouté au struct,
> `useWorkflowStore` étendu avec `reorderRows(fromIdx, toIdx)`
> (renumérotation lazy de toutes les visible rows). UI : drag
> handle `GripVertical` à gauche de chaque row + numéro de
> position visible. Pas d'impact sur les D-D existantes ;
> nouvelle Operation O11 ajoutée au canvas.
>
> **Note 2026-05-03 bis (post-implem)** : suppression des
> boutons `Plus` au profit du **drag-and-drop pour la création
> d'étape suivante**. La cellule immédiatement à droite de
> l'active devient un drop target `useDroppable` (pas un
> bouton). Drop d'une carte active → ouverture de
> `<CreateNextStageModal />` si gating ouvert (story.status ≥
> reviewed), toast destructive sinon. Modal state remontée
> dans `useWorkflowStore` (au lieu de l'état local de
> `<WorkflowRow />`) car le drop est géré au niveau
> `<WorkflowPipeline />`. Pas d'impact sur D-D ; modif O7 +
> O8 + onDragEnd de Pipeline.
>
> **Note 2026-05-03 quater (post-implem)** : layout packed
> Linear-style — suppression des **colonnes par kind**
> (Story/Analysis/Canvas/Tests). Chaque ligne a 3 zones
> alignées à gauche : carte active (large) + drop target
> compact (label "→ Analysis", "→ Canvas", ...) + marker
> Implementation. Plus de placeholder `—` pour les stages
> passés, plus d'espace réservé à droite des cards. Le kind
> de l'artefact actif devient un **badge sur la carte**
> ("Story" / "Analysis" / "Canvas" / "Tests" en outline
> `border-border`). Justification UX : capture utilisateur
> avec rouge crossing out les espaces vides — "je ne veux pas
> réserver de place pour passer les cards d'un endroit à
> l'autre". Impact : O8 (WorkflowRow re-render) +
> WorkflowPipeline header (3 cols seulement). E / N /
> Safeguards intacts.
>
> **Note 2026-05-03 quinquies (post-implem)** : pivot vers un
> vrai **layout Kanban** (cf. Jira/Trello, capture utilisateur
> avec board DEVOPS Sprint). Retour à 5 colonnes par kind
> (Story / Analysis / Canvas / Implementation / Tests) MAIS
> chaque colonne est un **stack vertical indépendant** —
> pas de lignes alignées entre colonnes, pas d'espace
> réservé pour les features absentes. Une feature = une
> seule card dans la colonne de son état actuel.
> Conséquences :
> - `<WorkflowRow />` supprimé (plus de notion de ligne)
> - `<WorkflowColumn />` créé (stack de cards par kind)
> - `useWorkflowStore` regroupe les features par état actuel
>   plutôt que par id (résultat = `columns: Record<state,
>   WorkflowItem[]>`)
> - Drag-and-drop : drop d'une card sur une colonne adjacente
>   à droite → modal Create next stage. Skip → toast
>   destructive.
> - Drag-to-reorder rows supprimé (notion de "rows" disparue,
>   priority sort dans chaque colonne uniquement, pas de
>   manual reorder en V1).

## Mots-clés métier extraits

`Workflow mode` (5ᵉ ShellMode), `pipeline swim-lane`, `gating
progressif`, `agrégation cross-kind`, `useWorkflowStore` (6ᵉ store),
`UpdateArtifactStatus` (nouvelle binding Go), `AllowedTransitions`
(nouvelle binding Go), `dnd-kit`, `STATUS_BADGE` (UI-001b),
`Dialog`/`Drawer`/`Toast` (shadcn), `Create analysis modal`,
`forward + downgrade-1-cran`.

## Concepts de domaine

### Existants (déjà dans le code)

- **`useShellStore`** (`frontend/src/stores/shell.ts`, UI-006) —
  Invariant I3 conditionne `setKind` à `SPDD_KINDS.includes(mode)`.
  Extensible : il suffit de **ne pas** ajouter `'workflow'` à
  `SPDD_KINDS` pour que le mode workflow respecte automatiquement
  l'invariant (zero-friction).
- **`useArtifactsStore`** (`frontend/src/stores/artifacts.ts`,
  UI-001b) — expose `kind`, `items: Meta[]`, `refresh()`,
  `setKind` (caller unique = useShellStore I4). Pas
  d'agrégation cross-kind, c'est mono-kind par design.
- **`<ActivityBar />`** (`frontend/src/components/hub/ActivityBar.tsx`,
  UI-006) — `PRIMARY_ITEMS: ActivityItem[]` ligne 17–22, pattern
  d'ajout : push d'un objet `{mode, label, Icon}`. Type
  `ActivityItem.Icon: LucideIcon`. `SETTINGS_ITEM` séparé après
  `flex-1` pour le pin en bas.
- **`<HubList />`** (`frontend/src/components/hub/HubList.tsx`,
  UI-001b) — contient `STATUS_BADGE: Record<string, string>`
  (lignes 10–17) avec mapping status → classes Tailwind. **À
  réutiliser tel quel** dans la pipeline view (export ou copie
  sémantique).
- **`<SidebarPanel />`** (`frontend/src/components/hub/SidebarPanel.tsx`,
  UI-006) — render conditionnel `activeMode === 'settings' ?
  <placeholder /> : <HubList />`. **Pattern à étendre** : ajouter
  une 3ᵉ branche pour `'workflow'`. Wait — la pipeline view est
  rendue dans le **main content** pas dans la sidebar (cf. story
  Scope In). À revérifier en D-D.
- **`<App />`** (`frontend/src/App.tsx`, post-UI-007) — main
  content actuel = `<StoryViewer />`. La pipeline view remplacera
  ça quand `activeMode === 'workflow'`. Refactor du conditional
  rendering.
- **`<NewStoryModal />`** (`frontend/src/components/hub/NewStoryModal.tsx`,
  UI-001c) — pattern Dialog shadcn avec phases (idle / running /
  success / error). Référence pour `<CreateAnalysisModal />` (mais
  V1 pipeline view = juste copy-clipboard, pas d'orchestration AI).
- **`<StoryViewer />`** (`frontend/src/components/hub/StoryViewer.tsx`,
  UI-001b) — `props { className?: string }`. **Réutilisable**
  pour le contenu du drawer.
- **shadcn `Dialog`** (`frontend/src/components/ui/dialog.tsx`,
  UI-001c) + **`Tooltip`** (UI-006) + **`Button`** (UI-001b) —
  primitives prêtes.
- **`internal/uiapp/App`** (`internal/uiapp/app.go`) — struct des
  bindings exposées via `Bind: []any{app}`. 11 méthodes publiques
  actuellement (`OnStartup`, `OnShutdown`, `SelectProject`,
  `AllowedKinds`, `ListArtifacts`, `GetClaudeStatus`,
  `InitializeSPDD`, `ReadArtifact`, `RunStory`, `AbortRunning`,
  `SuggestedPrefixes`). **Aucune méthode pour modifier un artefact
  existant** (gap critique pour UI-008).
- **`internal/artifacts/`** :
  - `parser.go:28-48` `ParseFrontmatter[T any](content string) (T, error)`
    — décode YAML.
  - `parser.go:57-66` `ValidateFrontmatter(content) error` — valide
    YAML non-vide. **Aucune validation des statuts ou transitions.**
  - `lister.go:36-44` `Meta` struct (ID, Slug, Title, Status,
    Updated, Path, Error).
  - `writer.go:22-48` `Writer.Write(id, slug, content) (path, error)`
    — atomic write (temp + rename). **Création uniquement, pas
    de modification.**
  - `id.go:19-21` `AllowedPrefixes` (whitelist préfixes ID, ≠
    statuts).
  - **Pas de constant pour les statuts valides** (`draft`,
    `reviewed`, `accepted`, `implemented`, `synced`).
  - **Pas de fonction de transition validation.**
- **Lib YAML** : `gopkg.in/yaml.v3` (`go.mod:8`).
- **Pattern AV-workaround** : `frontend/wailsjs/go/main/App.{d.ts,js}`
  — stub manuel, signature TS + wrapper JS
  `window['go']['uiapp']['App']['<method>']()`. UI-008 étendra
  ces 2 fichiers pour les 2 nouvelles bindings.

### Nouveaux (à introduire)

- **`useWorkflowStore`** (6ᵉ store Zustand, Invariant I6 UI-001b) —
  agrège les 4 kinds en lignes indexées par `id`, gère le gating,
  expose `advanceStatus(path, newStatus)`. **Aucun import** des
  autres stores ; appel `useArtifactsStore.getState().refresh()`
  via `getState()` après chaque update (sync cross-mode), même
  pattern qu'`useShellStore` UI-006 (continuité I4).
- **`UpdateArtifactStatus(path, newStatus string) error`** —
  nouvelle binding Go dans `internal/uiapp/app.go`. Logique :
  1. Lire le fichier `.md` au path donné.
  2. Parser le front-matter (ParseFrontmatter[Meta]).
  3. Valider la transition `currentStatus → newStatus` (forward
     ou downgrade 1 cran, OQ7 tranchée A).
  4. Réécrire le front-matter avec status modifié + `updated:` à
     `time.Now().Format("2006-01-02")`.
  5. Atomic write (temp + rename comme Writer.Write).
- **`AllowedTransitions(currentStatus string) []string`** —
  nouvelle binding Go read-only. Retourne les statuts vers
  lesquels on peut transitionner depuis `currentStatus` (forward
  next + downgrade prev). Permet au frontend de **griser** les
  options invalides du DropdownMenu (belt-and-suspenders avec
  le validator backend).
- **Constants Go SPDD statuses + transitions** —
  `internal/artifacts/status.go` (nouveau fichier) :
  ```go
  // Pseudo, à raffiner en canvas
  type Status string
  const (
    StatusDraft Status = "draft"
    StatusReviewed Status = "reviewed"
    // ...
  )
  var statusOrder = []Status{StatusDraft, StatusReviewed, StatusAccepted, StatusImplemented, StatusSynced}
  func IsValidTransition(from, to Status) bool { /* forward + 1-prev */ }
  func AllowedTransitions(from Status) []Status { /* ... */ }
  ```
- **`<WorkflowPipeline />`** (composant React, nouveau) — tableau
  swim-lane DnD. Header sticky 5 colonnes, body lignes par `id`.
- **`<WorkflowRow />`** (composant interne) — une ligne du
  pipeline = 5 cellules (Story / Analysis / Canvas / Implementation /
  Tests). Chaque cellule = `<WorkflowCard />` ou placeholder vide
  (Lock ou Plus selon gating).
- **`<WorkflowCard />`** (composant interne) — carte draggable
  avec `id`, slug tronqué, status badge (réutilise STATUS_BADGE),
  date `updated`. Click → `useWorkflowStore.openDrawer(path)`.
  Right-click ou hover MoreHorizontal → DropdownMenu transitions.
- **`<WorkflowDrawer />`** (composant nouveau) — Radix Dialog en
  variant drawer droit (`Sheet` shadcn ou Dialog avec
  `position: fixed`). Contient un `<StoryViewer />`. Close au
  click hors / Escape.
- **`<CreateNextStageModal />`** (composant nouveau) — Dialog
  shadcn affichant la commande slash + bouton Copy + disclaimer
  "Coming in a future version: this will run automatically."
- **shadcn `dropdown-menu`** + **`toast`** + **`sheet`** (drawer) —
  3 nouveaux composants à ajouter via `npx shadcn add`.
- **`@dnd-kit/core` + `@dnd-kit/sortable`** — nouvelle dépendance
  npm (~14 KB gzip).
- **`@radix-ui/react-toast`** — peer-dep ajoutée par `shadcn add toast`.
- **Stages mapping** (constant TS) — convention `STAGES = ['stories',
  'analysis', 'prompts', 'tests']` + label affiché. Définie côté
  frontend (cf. D-D6) car c'est de la présentation UI, pas du
  domaine Go.

## Approche stratégique

UI-008 livre la vue pipeline en **deux flux parallèles** :

1. **Côté Go (~150 lignes)** — un nouveau fichier
   `internal/artifacts/status.go` (constants + IsValidTransition
   + AllowedTransitions) + 2 méthodes ajoutées à `internal/uiapp/App`
   (`UpdateArtifactStatus` et `AllowedTransitions`). Tests
   unitaires Go pour les transitions valides + invalides + I/O
   atomique. Étend les stubs `wailsjs/go/main/App.{d.ts,js}`
   (pattern AV-workaround).

2. **Côté frontend (~600 lignes)** — un nouveau store
   `useWorkflowStore` (Zustand, agrège 4 kinds en parallèle,
   indexe par `id`, expose `advanceStatus`/`openDrawer`/`close
   Drawer`/`refresh`). 4-5 nouveaux composants
   (`<WorkflowPipeline />`, `<WorkflowRow />`, `<WorkflowCard />`,
   `<WorkflowDrawer />`, `<CreateNextStageModal />`). Étend
   `useShellStore` avec `'workflow'` dans `ShellMode` (mais pas
   dans `SPDD_KINDS` pour respecter Invariant I3). Étend
   `<ActivityBar />` avec un 5ᵉ item. Refactor mineur de
   `<App />` ou `<SidebarPanel />` pour brancher la pipeline
   view quand mode = workflow.

**Flux drag-and-drop** :
- DndContext global au niveau `<WorkflowPipeline />`.
- DragOverlay = clone de la `<WorkflowCard />` avec `shadow-primary/30`.
- Drop targets explicites pendant le drag (zones "Mark <status>"
  qui apparaissent au-dessus de la carte source dans la même
  colonne).
- Optimistic update (setRows immédiat), rollback si la binding
  Go renvoie une erreur, toast destructive en cas d'erreur.

**Gating** = `useWorkflowStore.canAdvance(row, stage)` calcule
si une cellule N+1 est débloquée (= cellule N a status ≥
reviewed). Le frontend grise les zones non-droppables et le
DropdownMenu désactive les transitions invalides. **La règle
canonique vit côté Go** (`AllowedTransitions`) que le frontend
appelle au mount + après chaque update pour rafraîchir
l'affichage.

**Refresh cross-mode** : après chaque `advanceStatus` réussi,
`useWorkflowStore` appelle `useArtifactsStore.getState().refresh()`
via `getState()` (pattern continuité Invariant I4 UI-006). Le
mode `Stories` (HubList) verra le status mis à jour dès qu'on y
revient.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/stores/workflow.ts` | **fort** | nouveau (6ᵉ store, ~120 lignes) |
| `frontend/src/stores/shell.ts` | **faible** | extension `ShellMode` à 6 valeurs (1 ligne) |
| `frontend/src/components/hub/ActivityBar.tsx` | **faible** | ajout d'un item dans `PRIMARY_ITEMS` (4 lignes) |
| `frontend/src/components/workflow/WorkflowPipeline.tsx` | **fort** | nouveau (~250 lignes — header + body + DndContext) |
| `frontend/src/components/workflow/WorkflowRow.tsx` | **fort** | nouveau (~80 lignes) |
| `frontend/src/components/workflow/WorkflowCard.tsx` | **fort** | nouveau (~100 lignes — draggable + DropdownMenu) |
| `frontend/src/components/workflow/WorkflowDrawer.tsx` | **moyen** | nouveau (~80 lignes — Sheet + StoryViewer) |
| `frontend/src/components/workflow/CreateNextStageModal.tsx` | **moyen** | nouveau (~70 lignes — Dialog + Copy command) |
| `frontend/src/App.tsx` | **faible** | branchement `mode === 'workflow' ? <WorkflowPipeline /> : <StoryViewer />` |
| `frontend/src/components/hub/HubList.tsx` | **faible** | export du `STATUS_BADGE` (1 ligne) pour réutilisation |
| `frontend/src/components/ui/dropdown-menu.tsx` | **moyen** | nouveau (shadcn add) |
| `frontend/src/components/ui/toast.tsx` + `toaster.tsx` + `use-toast.ts` | **moyen** | nouveaux (shadcn add toast — 3 fichiers) |
| `frontend/src/components/ui/sheet.tsx` | **moyen** | nouveau (shadcn add sheet) |
| `frontend/src/main.tsx` ou `App.tsx` | **faible** | wrap `<Toaster />` au root pour les notifications |
| `frontend/package.json` / `package-lock.json` | **moyen** | ajout `@dnd-kit/core`, `@dnd-kit/sortable`, `@radix-ui/react-toast`, `@radix-ui/react-dropdown-menu` |
| `internal/artifacts/status.go` | **fort** | nouveau (~80 lignes — constants + IsValidTransition + AllowedTransitions + tests) |
| `internal/uiapp/app.go` | **moyen** | 2 méthodes ajoutées (`UpdateArtifactStatus`, `AllowedTransitions`) ~50 lignes |
| `internal/uiapp/app_test.go` (s'il existe, sinon créer) | **moyen** | tests des 2 nouvelles bindings |
| `frontend/wailsjs/go/main/App.d.ts` | **faible** | 2 signatures ajoutées (pattern stub UI-007) |
| `frontend/wailsjs/go/main/App.js` | **faible** | 2 wrappers ajoutés |
| `internal/artifacts/writer.go` | **nul** | inchangé (Writer.Write reste pour la création) |
| `internal/artifacts/parser.go` / `lister.go` / `id.go` | **nul** | inchangés |
| `ui.go` / `main.go` / `ui_mock.go` / `ui_prod.go` / `wails.json` | **nul** | aucun changement |
| Backend Go autres packages | **nul** | scope étranger |

## Dépendances et intégrations

- **`@dnd-kit/core` + `@dnd-kit/sortable`** (nouveau, ~14 KB gzip)
  — accessibilité ARIA native, keyboard drag intégré (cf. story
  AC11). Pattern recommandé 2026 pour kanban React.
- **`@radix-ui/react-toast`** (nouveau, peer-dep shadcn add toast)
  — notifications.
- **`@radix-ui/react-dropdown-menu`** (nouveau, peer-dep shadcn
  add dropdown-menu) — menu contextuel transitions.
- **`@radix-ui/react-dialog`** (existant, UI-001c) — utilisé pour
  Sheet (drawer) et CreateNextStageModal.
- **`gopkg.in/yaml.v3`** (existant, `go.mod`) — pour le rewrite
  de front-matter dans `UpdateArtifactStatus`.
- **`Wails runtime`** (existant) — `EventsEmit` non utilisé en
  V1 (sync front-back via direct binding return + frontend
  refresh). À envisager si on veut multi-fenêtres futures.

## Risques et points d'attention

- **Race conditions sur `advanceStatus`** *(prob. moyenne, impact
  UX léger)* — multi-clics rapides peuvent envoyer 2 updates avant
  que le premier ne se confirme. Mitigation : `pendingUpdates:
  Set<path>` dans le store, désactiver le bouton/drag pendant
  une update en cours. Optimistic update + rollback sur erreur.
- **Divergence règle gating code/UI** *(prob. moyenne, impact
  bug)* — si la règle bouge d'un côté seul. Mitigation : règle
  canonique côté Go (`AllowedTransitions`), frontend la consomme
  via la binding au mount, ne réimplémente pas. Cache en mémoire
  côté frontend acceptable (la règle ne change pas pendant la
  session).
- **Performance avec N features** *(prob. faible, impact
  ergonomie)* — agrégation cross-kind = 4 calls parallèles
  `ListArtifacts`. Yukki actuel ~10 features × 4 kinds = 40
  cellules → OK. Seuil d'alerte ~100+ features (V2 : pagination
  ou virtualization avec `@tanstack/react-virtual`).
- **Pas de constant Go pour les statuts** *(prob. certaine, impact
  maintenabilité)* — la story SPDD docs liste 5 statuses
  (`draft`, `reviewed`, `accepted`, `implemented`, `synced`)
  mais c'est nulle part dans le code Go. UI-008 introduit la
  centralisation dans `internal/artifacts/status.go`. Risque
  nul de divergence avec les artefacts existants car c'est
  juste une enum + valeur par défaut.
- **Drag accessibilité screen reader** *(prob. faible, impact
  conformité)* — `dnd-kit` couvre par défaut, mais la live region
  ARIA doit annoncer "Moved UI-007 story to reviewed". À tester
  manuellement avec NVDA / Voice Over en revue.
- **Synchronisation cross-mode après update** *(prob. faible,
  impact UX)* — si l'utilisateur change un status en mode
  Workflow puis bascule en mode Stories, le HubList doit refléter
  le nouveau status. Mitigation : `useArtifactsStore.getState()
  .refresh()` après chaque update (pattern continuité I4 UI-006).
- **Composant rendu dans le main vs sidebar** *(prob. faible,
  impact archi)* — la sidebar UI-006 contient HubList/Settings.
  La vue workflow est plus large qu'une sidebar 240px. Décision
  D-D : **rendre la pipeline view dans le main content** (à la
  place du `<StoryViewer />` quand mode = workflow). La sidebar
  reste collapsée ou affiche un résumé optionnel. Cf. D-D2.
- **Modification `App.js`/`App.d.ts` AV-workaround** *(prob.
  certaine, impact opérationnel)* — pattern UI-007 confirmé.
  Pas un risque, juste à ne pas oublier.

## Cas limites identifiés

- **Feature avec story uniquement (pas d'analyse, pas de canvas,
  pas de tests)** : 4 cellules sur 5 vides. La cellule analyse
  doit être *débloquée* si story.status ≥ reviewed (= bouton Plus
  cliquable), les autres bloquées (icône Lock).
- **Feature avec ID introuvable dans aucun kind** (cas
  théorique) : ne devrait pas arriver, mais le store doit gérer
  proprement (ligne vide).
- **Feature avec analyse mais sans story** (orphan) : afficher
  ligne avec cellule story vide + cellule analyse remplie. Gating
  : la cellule story devrait afficher "missing source artifact"
  (placeholder spécial). Edge case rare, à confirmer.
- **Status invalide dans le YAML** (ex. `status: WIP`) : le badge
  STATUS_BADGE retombe sur `'bg-muted text-muted-foreground'`
  (default UI-001b). Le menu propose les transitions standard
  comme si c'était `draft`.
- **Drag d'une carte vers la même status** (drop sur la zone
  "Mark <currentStatus>") : no-op silencieux (pas de toast).
- **Réseau / file I/O échoue pendant `advanceStatus`** : toast
  destructive avec le message d'erreur Go, rollback de
  l'optimistic update.
- **Double-click sur une cellule vide** : la modal ne s'ouvre
  qu'une fois (gérer `<Dialog open={...}>` proprement).
- **Le projet n'a pas de dossier `spdd/`** : la pipeline view
  affiche un empty state "No SPDD artifacts yet" + bouton
  "Initialize SPDD" qui appelle `InitializeSPDD` existante.

## Decisions tranchées en revue 2026-05-02 (toutes en reco A)

- [x] **D-D1 → A** : pipeline view dans le **main content**
      (remplace `<StoryViewer />` quand `activeMode === 'workflow'`).
      Sidebar reste collapsable, libre pour résumés/filtres futurs.
- [x] **D-D2 → A** : drawer via **`npx shadcn add sheet`**
      (composant officiel, animations built-in, ARIA gérée).
- [x] **D-D3 → A** : nouveau fichier
      **`internal/artifacts/status.go`** dédié (constants
      typés + `IsValidTransition` + `AllowedTransitions`),
      cohérent avec `id.go`. Tests unitaires `status_test.go`.
- [x] **D-D4 → A** : `UpdateArtifactStatus` réécrit
      **uniquement le bloc front-matter** (parse YAML → mute
      Status + Updated → re-serialize → recolle au body
      inchangé). Atomic (temp + rename comme Writer.Write).
- [x] **D-D5 → A** : préserver les autres champs YAML
      (`owner`, `modules`, `depends-on`, etc.) via
      **`yaml.Node`** d'abord (round-trip idempotent qui
      préserve l'ordre des clés + commentaires). Fallback
      regex ciblé sur lignes `status:` / `updated:` si
      impractical en implémentation.
- [x] **D-D6 → A** : mapping `kind ↔ stage column` côté
      **frontend uniquement** (constant TS), c'est de la
      présentation UI pas du domaine.
- [x] **D-D7 → A** : double refresh — `useWorkflowStore`
      rafraîchit sa propre row **et** appelle
      `useArtifactsStore.getState().refresh()` pour que
      HubList soit à jour à la prochaine activation mode
      Stories.
- [x] **D-D8 → A** : `<Toaster />` posé au **root dans
      `<App />`** (pattern shadcn standard, réutilisable
      ailleurs).

## Estimation post-analyse

- Backend Go : ~0.5 j (status.go + 2 bindings + tests)
- Frontend stores + composants : ~2 j (store, 5 composants,
  drag-and-drop, toast)
- shadcn add 3 composants + dnd-kit deps : ~0.5 j (incluant
  intégration Toaster root)
- Validation manuelle + ajustements : ~0.5 j

**Total** : ~3.5 j (cohérent avec l'estimation de la story).
