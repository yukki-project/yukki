---
id: UI-008
slug: workflow-pipeline-view
title: Vue pipeline SPDD — progression d'une feature à travers les étapes (kanban-like, gating progressif)
status: reviewed
created: 2026-05-02
updated: 2026-05-02
owner: Thibaut Sannier
modules:
    - frontend
    - root
depends-on:
    - UI-006-shell-vscode-layout
    - UI-007-custom-titlebar-dark
---

# Vue pipeline SPDD — progression d'une feature à travers les étapes

## Background

Le hub yukki actuel (UI-001b/c + UI-006) liste les artefacts SPDD à plat
par "kind" : un mode pour `Stories`, un pour `Analyses`, un pour
`Canvas`, un pour `Tests`. Pour suivre où en est *une feature donnée*
(ex. UI-007), l'utilisateur doit naviguer entre les modes et
recouper mentalement les `id` partagés. Et pour **avancer** une feature
dans le workflow (story.draft → story.reviewed → analyse créée →
analyse.reviewed → canvas créé → ...), il faut aujourd'hui :

- éditer le front-matter à la main (changer `status:`) ou
- lancer la commande slash suivante via Claude Code (`/spdd-analysis`,
  `/spdd-reasons-canvas`, ...).

Aucune visualisation de la progression, aucun garde-fou contre les
skips d'étape. Les outils que le public cible utilise au quotidien
(Jira, Linear, Trello) résolvent ce point depuis longtemps :
**vue pipeline / swim-lanes** où chaque ligne est une feature et
chaque colonne une étape, avec drag-and-drop progressif et gating
explicite ("impossible de passer à `accepted` sans passer par
`reviewed`", inspiration Jira `conditions+validators`).

UI-008 livre cette vue pour SPDD. Le drag d'une carte ou le click
sur une action de transition met à jour le `status:` du front-matter
côté Go (nouvelle binding) et le rend visible dans tous les autres
modes immédiatement. La création d'une étape suivante (story →
analyse, …) reste hors V1 (Scope Out — c'est le pont avec un futur
"trigger AI" : V1 affiche la commande slash à copier, une story
ultérieure câblera l'appel direct).

## Business Value

- **Lisibilité immédiate** de l'avancement projet : vue *globale*
  vs. un mode/kind à la fois. Reproduire le confort des roadmaps
  Linear / Jira / Trello que le public cible côtoie déjà.
- **Vélocité** : changer un status passe de "ouvrir le fichier,
  éditer le YAML, sauver" à "drag une carte dans une colonne" ou
  "cmd+J → mark as reviewed". Inspiration command palette Linear
  (raccourci K) — out of scope V1, mais foundation posée.
- **Process compliance** : aujourd'hui rien n'empêche de bumper
  `status: implemented` sur une story qui n'a ni analyse ni canvas.
  UI-008 enforce le gating : interdit de skip une étape, à la
  Jira (workflow validators).
- **Foundation pour l'intégration AI** : les boutons "→ next
  stage" deviendront des triggers directs pour
  `/spdd-analysis` / `/spdd-reasons-canvas` / `/spdd-generate`
  via le SDK Claude Agent — story future. UI-008 expose les bons
  points d'accroche dans l'UI.

## Scope In

- **Nouveau mode "Workflow"** dans l'ActivityBar (UI-006) en
  position après `Tests`, avant `Settings`. Icône lucide-react
  `Workflow` ou `LayoutGrid`. Étend `ShellMode` à 6 valeurs.
- **Vue Kanban-style** (cf. Jira/Trello) affichée dans le main
  content area (à la place du `<StoryViewer />` quand mode =
  `workflow`). Layout :
  - **Header sticky** : 5 colonnes nommées **Story** / **Analysis**
    / **Canvas** / **Implementation** / **Tests** (ordre flow
    SPDD).
  - **Pas de lignes alignées horizontalement** : chaque colonne
    est un **stack vertical indépendant** de cards. Les colonnes
    ne réservent **pas** d'espace pour les features qui ne sont
    pas dans cet état — comme dans Jira/Trello où une colonne
    `IN PROGRESS` est juste vide si aucune issue ne s'y trouve.
  - **Une feature = une seule card**, placée dans la colonne
    qui correspond à son **état actuel** (= étape la plus
    avancée atteinte) :
    - feature avec story uniquement → colonne `Story`
    - feature avec analysis → colonne `Analysis`
    - feature avec canvas (status non-implemented/synced) →
      colonne `Canvas`
    - feature avec canvas en `implemented` ou `synced` →
      colonne `Implementation`
    - feature avec tests → colonne `Tests`
  - **Card** affiche `id`, slug tronqué, badge status coloré
    (mapping `STATUS_BADGE` cohérent avec `<HubList />`), date
    `updated`. Pas de badge kind (la colonne est le kind).
  - **Tri vertical dans chaque colonne** : par `priority asc`
    (champ `priority: int` sur le front-matter de la story,
    `0`/absent → fin), tie-break `updated desc`.
  - **Une seule cellule active par ligne** = celle de l'**étape
    la plus avancée** atteinte par la feature. Si la feature
    a une analyse mais pas de canvas, l'analyse est la cellule
    active. Si elle a un canvas implémenté, c'est lui. Cellule
    active = carte compacte avec `id`, `slug` tronqué, badge
    status coloré (draft/reviewed/accepted/implemented/synced),
    date `updated`.
  - **Cellules avant l'étape active** (étapes déjà passées) :
    rendues comme un placeholder discret `—` (juste une ligne
    horizontale grise). Pas de carte. L'historique reste
    lisible via le viewer markdown.
  - **Cellule immédiatement après l'étape active** :
    **drop target** pour drag-and-drop (zone dashed discrète au
    repos, surlignée violet `bg-primary/10` + `border-primary`
    quand une carte la survole pendant un drag). **Pas de
    bouton `Plus`** — la création de l'étape suivante se fait
    uniquement par drop de la carte active sur cette cellule.
    Si gating fermé (status active < `reviewed`), le drop est
    refusé silencieusement (toast destructive "Mark <stage> as
    reviewed first").
  - **Cellules plus loin** que l'étape active+1 : vides
    complètement (pas de drop target — on n'expose que la
    prochaine étape).
- **Click sur une carte** → ouvre l'artefact dans le viewer en
  side panel (réutilise le `<StoryViewer />` actuel adapté pour
  s'afficher en overlay/drawer quand mode = workflow). Click hors
  carte ou `Escape` → ferme le panel.
- **Drag-and-drop d'une card entre colonnes** : drop d'une card
  d'une colonne vers la **colonne immédiatement à droite** →
  ouverture du modal `Create next stage` avec la commande slash
  à copier (gating ouvert : status active ≥ `reviewed`). Drop
  sur une colonne non-adjacente (skip) → toast destructive
  "Cannot skip stages — drop on the next column". Drop sur
  `Implementation` (qui est un état dérivé, pas un kind) → idem.
- **Changement de status par drag** : drag d'une carte
  *verticalement* dans la **même colonne** (= même kind) la déplace
  vers une zone "next status" qui apparaît au-dessus / en dessous
  pendant le drag (drop targets explicites, conformément aux
  bonnes pratiques d'accessibilité kanban). Cas concret : drag
  une story `draft` vers la zone "Mark reviewed" → status = reviewed.
- **Changement de status par click** (alternative au drag) :
  click droit sur une carte (ou bouton `MoreHorizontal` au hover)
  → menu contextuel `Mark draft / reviewed / accepted /
  implemented / synced`. Les transitions invalides (skip) sont
  **désactivées** dans le menu (grisées + tooltip "Cannot skip
  status — go through reviewed first").
- **Création d'étape suivante (V1 read-only trigger)** :
  drag-and-drop la carte active sur la cellule drop target
  immédiatement à droite → modal qui affiche :
  - Le nom de la commande slash à exécuter (`/spdd-analysis`,
    `/spdd-reasons-canvas`, ...) avec un bouton "Copy command"
  - Le chemin de l'artefact source (à copier avec)
  - **Pas** d'exécution AI directe en V1 (Scope Out, story
    future câblera l'appel via Claude Agent SDK).
  - **Plus de bouton `Plus`** : la seule manière de déclencher
    cette modal est le drop. Cohérence "tout est drag" avec le
    reorder de rows (qui utilise aussi dnd-kit).
- **Gating progressif** (règle dure, partagée code+UI) :
  - Une cellule colonne N+1 reste **verrouillée** tant que la
    cellule colonne N (même `id`) n'a pas un status ≥ `reviewed`
    (l'analyse ne peut pas démarrer tant que la story n'est pas
    relue, etc.).
  - Une transition de status invalide (ex. `draft` → `accepted`
    en sautant `reviewed`) est **bloquée** par le validator côté
    Go (la binding refuse) **et** affichée comme désactivée dans
    le menu UI (cohérence belt-and-suspenders).
  - Cellule verrouillée → curseur `not-allowed`, tooltip explicite,
    impossible d'y déposer une carte par drag.
- **Backend Go** :
  - Nouvelle binding `UpdateArtifactStatus(path, newStatus) error` qui :
    1. Lit l'artefact via `artifacts.ParseArtifact` existant.
    2. Valide la transition (`draft → reviewed`, `reviewed →
       accepted`, ..., `implemented → synced`). Refuse les skips.
    3. Réécrit le front-matter en place avec le nouveau status
       et `updated` à la date du jour.
    4. Retourne l'erreur ou `nil`.
    - Tests unitaires Go pour les transitions valides + invalides
      + gating cross-stage.
  - Nouvelle binding `UpdateArtifactPriority(path, priority int) error`
    (mirror de `UpdateArtifactStatus` mais pour le champ `priority:`).
    Pas de validation métier (priorité = entier libre, conventionnellement
    >= 1, mais on accepte 0 = unset). Atomic write via `yaml.Node`
    round-trip comme `UpdateArtifactStatus` (préserve les autres
    champs). Bumpe `updated` à la date du jour aussi.
  - **Extension de `Meta`** dans `internal/artifacts/lister.go` :
    ajout du champ `Priority int yaml:"priority,omitempty"`. Si
    le YAML n'a pas le champ, default 0 = unset.
- **Frontend store** : nouveau `useWorkflowStore` (6ᵉ store,
  Invariant I6 d'UI-001b) qui :
  - Agrège les `Meta` de tous les kinds (4 appels parallèles à
    `ListArtifacts`).
  - Indexe par `id` pour produire les rows du pipeline.
  - Calcule l'état de gating (verrou cellule N+1).
  - **Trie les rows par `row.cells.stories?.Priority` ascending**
    (avec `0`/absent → `Infinity`, donc fin de liste), tie-break
    `updated desc`.
  - Expose `advanceStatus(path, newStatus)` qui appelle la
    nouvelle binding Go et rafraîchit l'index.
  - Expose `reorderRows(fromIdx, toIdx)` qui calcule le nouvel
    ordre visuel post-drop, **renumérote** les priorités de
    toutes les rows visibles (1..N), et batch-call
    `UpdateArtifactPriority` pour chaque row dont la priorité
    a changé. Optimistic update + rollback sur erreur (pattern
    cohérent avec `advanceStatus`).
- **Accessibilité** :
  - Tab navigue entre les cartes ; arrow keys déplacent dans la
    grille (left/right entre colonnes, up/down entre rows).
  - `Space`/`Enter` ouvre le panel viewer.
  - Drag aussi déclenchable au clavier : sélection au focus +
    `Space` pour "pick up" + arrow keys pour déplacer + `Space`
    ou `Enter` pour drop, `Escape` pour cancel (pattern
    `dnd-kit`).
  - Annonces ARIA : `aria-roledescription="card"`, live region
    "Moved UI-007 story to reviewed".
- **Ergonomie polish** :
  - Drag overlay = clone de la carte avec ombre portée violette
    (`shadow-primary/30`).
  - Drop target highlight = bordure dashed `border-primary`
    + fond `bg-primary/10`.
  - Toast de confirmation court ("Marked UI-007 story as
    reviewed", 2s, `bg-card`) — ajout d'un composant Toast
    shadcn (deps `@radix-ui/react-toast`).
  - Animation 150ms ease-out sur le swap entre colonnes (cohérent
    avec UI-006 collapse).
- **Pas de régression** : les 4 modes existants (Stories,
  Analyses, Canvas, Tests) continuent à fonctionner identiquement
  (read-only sur le status). Settings inchangé.

## Scope Out

- **Trigger AI direct** depuis l'UI (click "Create analysis"
  qui exécute `/spdd-analysis` via Claude Agent SDK) — V2,
  story future. V1 affiche juste la commande à copier-coller.
- **Command palette** (Linear-style cmd+K) — différé, pas un
  bloqueur pour la vue pipeline.
- **Multi-sélection / bulk actions** (déplacer plusieurs cartes
  d'un coup) — différé.
- **Filtres / search dans le pipeline** (par status, par module,
  par texte) — différé.
- **Tri custom** des rows (autre que `updated` desc) — différé.
- **Activity log per artifact** ("UI-007 status changed by you
  on 2026-05-02") — différé, on s'appuie sur git log pour V1.
- **Drag entre colonnes** (drag une story vers la colonne
  Analysis pour créer l'analyse) — V2, lié au trigger AI.
- **Undo (Ctrl+Z) après changement de status** — différé. V1
  on remet la cellule manuellement.
- **Persistance des preferences workflow view** (largeur des
  colonnes, ordre custom) — différé.
- **Vue alternative roadmap timeline** (Gantt) — hors scope.
- **Synchronisation distribuée** (plusieurs utilisateurs
  éditant le même status simultanément) — yukki est mono-user
  desktop, non applicable.

## Acceptance Criteria

> Format Given / When / Then. Validation manuelle via
> `bash scripts/dev/ui-build.sh && build/bin/yukki-ui.exe ui`
> sur le repo yukki lui-même (qui a déjà ~10 features SPDD).

### AC1 — Mode Workflow visible dans l'ActivityBar

- **Given** la fenêtre yukki ouverte avec un projet sélectionné
- **When** je regarde l'ActivityBar UI-006
- **Then** une 5ᵉ icône `Workflow` (lucide-react) est visible
  entre `Tests` et `Settings`. Tooltip "Workflow" au hover.

### AC2 — Vue Kanban (5 colonnes, cards stackées par état)

- **Given** je clique sur l'icône `Workflow`
- **When** la sidebar bascule sur ce mode
- **Then** le main content affiche un layout **Kanban** avec
  **5 colonnes côte à côte** : `Story` / `Analysis` / `Canvas`
  / `Implementation` / `Tests`. Header sticky avec ces noms.
  Chaque colonne est un **stack vertical indépendant** de
  cards (style Jira/Trello). **Pas de lignes alignées
  horizontalement** — chaque colonne pack ses cards à partir
  du haut, sans espace réservé pour les features absentes
  (comme une colonne `IN PROGRESS` vide en Jira reste juste
  vide). Au moins UI-001a, UI-001b, UI-001c, UI-006, UI-007
  sont distribuées dans les colonnes selon leur état actuel.

### AC3 — Une feature = une seule card dans sa colonne d'état

- **Given** la vue Kanban ouverte avec UI-007 (story + analysis
  + canvas en `implemented`)
- **When** je regarde le tableau
- **Then** UI-007 apparaît **uniquement** dans la colonne
  `Implementation` (= état actuel, dérivé de canvas.status =
  implemented). Pas de duplication dans `Story` / `Analysis` /
  `Canvas`. La card affiche :
  - `id` font-mono xs en haut-gauche
  - Badge status coloré selon le mapping `STATUS_BADGE` (ici
    `implemented` → vert)
  - Slug tronqué
  - Date `updated`
  - **Pas de badge kind** (la colonne fait office de label kind)

### AC3 bis — Distribution selon l'état actuel

- **Given** un projet avec features dans des états variés
- **When** je regarde le tableau
- **Then** :
  - feature avec story uniquement → colonne `Story`
  - feature avec analysis (peu importe le status canvas absent)
    → colonne `Analysis`
  - feature avec canvas en `draft`/`reviewed`/`accepted` →
    colonne `Canvas`
  - feature avec canvas en `implemented`/`synced` → colonne
    `Implementation`
  - feature avec tests → colonne `Tests`
- Une feature ne peut être que dans **exactement une** colonne.

### AC4 — Drag entre colonnes pour avancer (gating adjacent only)

- **Given** UI-008 dans la colonne `Story` (status = `reviewed`)
- **When** je drag la card UI-008 et la drop sur la **colonne
  immédiatement à droite** (`Analysis`)
- **Then** modal `Create next stage` s'ouvre avec la commande
  slash `/spdd-analysis spdd/stories/UI-008-...md` et le
  disclaimer "Coming in a future version: this will run
  automatically."
- **Given** la même UI-008 dans `Story`
- **When** je drag-and-drop la card sur `Canvas`,
  `Implementation`, ou `Tests` (skip)
- **Then** **toast destructive** "Cannot skip stages — drop on
  the next column (Analysis)" et la card retourne à sa colonne
  d'origine.
- **Given** UI-008 dans `Story` avec status = `draft`
- **When** je drop sur `Analysis`
- **Then** toast destructive "Mark Story as reviewed first" et
  pas d'ouverture de modal.

### AC5 — Click sur carte ouvre le viewer en panel

- **Given** la vue pipeline avec UI-007 visible
- **When** je clique sur la carte UI-007 colonne `Story`
- **Then** un panel side (drawer droit, ~600px) s'ouvre avec le
  rendu markdown de `spdd/stories/UI-007-custom-titlebar-dark.md`
  via le `<StoryViewer />` existant. Click hors panel ou
  `Escape` → ferme.

### AC6 — Drag carte dans même colonne change le status

- **Given** une story `draft` (ex. UI-008 elle-même au début)
- **When** je drag-and-drop la carte vers la zone "Mark reviewed"
  qui apparaît au-dessus pendant le drag
- **Then** :
  - le status passe à `reviewed` côté front-matter (vérifiable
    en relisant le `.md`)
  - la carte montre maintenant le badge bleu `reviewed`
  - un toast `bg-card` "Marked UI-008 story as reviewed" apparaît
    2 secondes
  - la modification est synchronisée dans le mode `Stories`
    (HubList rafraîchi)

### AC7 — Click droit propose menu de transition

- **Given** une carte `draft` sélectionnée
- **When** je fais click droit dessus (ou bouton `MoreHorizontal`
  au hover)
- **Then** un menu shadcn DropdownMenu s'affiche avec les options :
  - `Mark as draft` (item courant, désactivé)
  - `Mark as reviewed` (cliquable)
  - `Mark as accepted` (**désactivé**, tooltip "Cannot skip —
    go through reviewed first")
  - `Mark as implemented` (désactivé idem)
  - `Mark as synced` (désactivé idem)

### AC8 — Skip de status bloqué côté backend

- **Given** je modifie le `.md` à la main pour passer
  `draft` → `accepted` directement (en sautant `reviewed`),
  puis je `relance yukki` et je tente `Mark as accepted`
  depuis l'UI alors que la carte est en `draft`
- **When** la binding `UpdateArtifactStatus(path, "accepted")`
  est appelée
- **Then** la binding retourne une erreur
  `invalid status transition: draft → accepted (must go through reviewed)`
  affichée comme toast destructive dans l'UI. Le front-matter
  n'est pas modifié.

### AC9 — Drop sur cellule next-stage affiche modal slash command

- **Given** UI-008 a une story `reviewed` mais pas d'analyse
- **When** je drag la carte story et la drop sur la cellule
  drop target colonne `Analysis`
- **Then** un modal shadcn Dialog s'ouvre avec :
  - Titre "Create next stage"
  - Texte explicatif référençant l'`id` de la feature
  - Code block monospace
    `\/spdd-analysis spdd/stories/UI-008-workflow-pipeline-view.md`
  - Bouton `Copy command` qui copie dans le clipboard
  - Bouton `Close`
  - Disclaimer "Coming in a future version: this will run
    automatically."
  - **Pas** d'exécution AI directe (Scope Out V1)
- **And** si la story a status `draft` au moment du drop, le
  modal **ne s'ouvre pas** ; un toast destructive apparaît
  ("Mark stories as reviewed first").

### AC10 — Pas de régression UI-006/007

- **Given** UI-008 livré
- **When** je navigue dans les autres modes (Stories, Analyses,
  Canvas, Tests, Settings) via l'ActivityBar
- **Then** tous fonctionnent identiquement à avant. La title bar
  UI-007 reste visible. Aucun crash quand je rebascule sur
  Workflow puis sur un autre mode.

### AC11 — Accessibilité minimum

- **Given** la vue pipeline ouverte
- **When** je navigue uniquement au clavier
- **Then** :
  - `Tab` me déplace de carte en carte
  - les `arrow keys` déplacent dans la grille (haut/bas/gauche/
    droite)
  - `Space` ou `Enter` ouvre le viewer panel
  - `Escape` le ferme
  - `Space` sur une carte initie un mode "drag clavier" : arrow
    keys déplacent l'overlay, `Space` ou `Enter` drop, `Escape`
    cancel
  - chaque transition annoncée dans une live region ARIA

### AC12 — Drag-to-reorder des lignes via drag handle

- **Given** la vue pipeline avec 3+ features visibles
- **When** je drag-and-drop une ligne (depuis la drag handle
  `GripVertical` à gauche) au-dessus ou en-dessous d'une autre
- **Then** :
  - la ligne se déplace visuellement à la nouvelle position
    (animation 150ms ease-out)
  - les priorités de toutes les rows visibles sont **renumérotées**
    de `1` à `N` selon le nouvel ordre visuel (lazy : assigne
    aussi des priorités aux rows qui n'en avaient pas)
  - la binding Go `UpdateArtifactPriority(storyPath, priority)`
    est appelée pour chaque row dont la priorité a changé
  - le numéro de position visible à gauche de chaque ligne
    (`1.`, `2.`, `3.`, ...) reflète l'ordre nouveau
  - un toast court ("Reordered N items", 2s) confirme

### AC13 — Numéro de position visible et tri par priority

- **Given** la vue pipeline ouverte avec features ayant des
  priorités diverses (ou toutes à 0 par défaut)
- **When** je regarde la colonne gauche
- **Then** chaque ligne affiche un petit numéro de position
  (`1.`, `2.`, `3.`, ...) en `text-muted-foreground/50`
  font-mono, **basé sur l'ordre visuel actuel** (rows triées
  par `priority asc, updated desc`).
- **And** sur première ouverture (toutes les stories ont
  `priority: 0` par défaut, pas de champ dans le YAML), l'ordre
  est entièrement piloté par `updated desc` — les numéros
  reflètent juste cet ordre.
- **And** dès que l'utilisateur fait un premier reorder
  (AC12), toutes les rows visibles reçoivent une priorité
  explicite (1..N), persistée dans le front-matter de leur
  story respective (`priority: 1`, `priority: 2`, ...).

## Open Questions — toutes tranchées en revue 2026-05-02

> Direction validée : **Linear/Jira hybride** — pipeline fluide
> visuellement, gating dur sur les transitions (validators côté
> Go binding + UI désactive les options invalides).

- [x] **OQ1 → A** : icône `Workflow` en **5ᵉ slot principal** entre
      `Tests` et `Settings`. `Stories` reste le default au mount
      (préserve l'habitude UI-006).
- [x] **OQ2 → A** : drag-and-drop via **`@dnd-kit/core` +
      `@dnd-kit/sortable`** (~14 KB gzip, accessibilité ARIA
      native, pattern keyboard drag intégré). Nouvelle dépendance
      assumée.
- [x] **OQ3 → A** : notifications via **shadcn Toast**
      (`@radix-ui/react-toast`, ~6 KB) — cohérent avec
      l'écosystème shadcn UI-001b/c, pattern réutilisable.
- [x] **OQ4 → A** : nouveau composant **`<WorkflowDrawer />`**
      (Radix Dialog en variant drawer droit). Séparation des
      concerns clean, primitive Radix déjà déps via NewStoryModal.
- [x] **OQ5 → A** : modal "Create analysis" affiche la **commande
      slash** à copier (`/spdd-analysis spdd/stories/<id>-<slug>.md`)
      + bouton `Copy command` + **disclaimer explicite** :
      "Coming in a future version: this will run automatically."
- [x] **OQ6 → A** : tri par défaut des rows = **`updated` desc**
      (plus récent en haut, intuition Linear "work in progress
      first").
- [x] **OQ7 → A** : transitions de status — **forward + downgrade
      1 cran** autorisé (`reviewed → draft`, `accepted → reviewed`,
      etc., mais pas multi-cran). Validator côté Go binding refuse
      les autres. Reflète le cas réel "j'ai validé trop vite, je
      remets en draft pour ré-éditer".

## Notes

- Dépendance dure : UI-006 (ActivityBar / SidebarPanel /
  ShellMode), UI-007 (TitleBar pour cohérence visuelle au-dessus
  de la pipeline view).
- Référence visuelle : Linear's project view, Trello swim-lanes,
  Jira workflow board. Pour le gating, le pattern Jira
  `validators on transitions` est notre boussole.
- Inspirations recherche web (2026) :
  - [Atlassian Jira workflow validators](https://support.atlassian.com/jira-cloud-administration/docs/configure-advanced-issue-workflows/)
    — pattern conditions+validators+post-functions pour bloquer
    les transitions invalides côté backend.
  - [Linear vs Jira 2026](https://prommer.net/en/tech/guides/linear-vs-jira-vs-trello/)
    — Linear privilégie la fluidité (pas de validators), Jira
    le contrôle. Yukki choisit Jira-style (gating dur) parce
    que SPDD a des prérequis durs entre étapes.
  - [LogRocket drag and drop best practices](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/)
    — drag overlay, drop target tinting, optimistic update,
    keyboard fallback.
  - [UX patterns for developers — Kanban](https://uxpatterns.dev/patterns/data-display/kanban-board)
    — ARIA roles, screen reader announcements, focus management.
- Risques pressentis (à creuser en `/spdd-analysis`) :
  - Aggrégation cross-kind dans `useWorkflowStore` : 4 calls
    parallèles à `ListArtifacts` au mount, attention à la
    concurrence + race conditions sur le rafraîchissement
    après un `advanceStatus`.
  - Gating partagé code+UI : risque de divergence si la règle
    bouge d'un côté seul. → exposer la table des transitions
    valides côté Go via une nouvelle binding read-only
    `AllowedTransitions(currentStatus) []string` que le UI
    consomme pour griser le menu.
  - Performance : le repo yukki a déjà ~10 features × 4 kinds
    = 40 cellules. Pas un souci. Attention si on dépasse
    100 features (pagination ou virtualization à prévoir).
  - Accessibilité du drag : `dnd-kit` couvre, mais à valider
    en revue contre lecteur d'écran (NVDA/JAWS).

## Estimation

~3 jours frontend (vue pipeline + drag + toast + drawer +
accessibilité) + ~0.5 jour backend Go (UpdateArtifactStatus +
AllowedTransitions + tests). Soit ~3.5 j total.
