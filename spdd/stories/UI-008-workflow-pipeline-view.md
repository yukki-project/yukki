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
- **Vue pipeline (swim-lane)** affichée dans le main content area
  (à la place du `<StoryViewer />` quand mode = `workflow`).
  Layout :
  - Header sticky : 5 colonnes nommées **Story** / **Analysis** /
    **Canvas** / **Implementation** / **Tests**, qui correspondent
    aux 4 kinds SPDD (`stories`, `analysis`, `prompts`, `tests`)
    + un 5ᵉ marker "Implementation" déduit du status `implemented`
    du canvas (pas un kind séparé).
  - Lignes : **une par `id` distinct** trouvé dans le repo
    (groupement transverse aux 4 kinds). L'ordre par défaut est
    chronologique inverse (id le plus récent en haut, basé sur
    `updated:` du front-matter).
  - Cellule (ligne × colonne) :
    - Vide → cellule grisée avec icône `Lock` ou `Plus` selon
      gating (cf. règles AC).
    - Remplie → carte compacte avec : `id`, `slug` tronqué,
      badge status coloré (draft/reviewed/accepted/implemented/synced),
      et la date `updated`.
- **Click sur une carte** → ouvre l'artefact dans le viewer en
  side panel (réutilise le `<StoryViewer />` actuel adapté pour
  s'afficher en overlay/drawer quand mode = workflow). Click hors
  carte ou `Escape` → ferme le panel.
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
- **Création d'étape suivante (V1 read-only trigger)** : click
  sur une cellule **vide** → modal qui affiche :
  - Le nom de la commande slash à exécuter (`/spdd-analysis`,
    `/spdd-reasons-canvas`, ...) avec un bouton "Copy command"
  - Le chemin de l'artefact source (à copier avec)
  - **Pas** d'exécution AI directe en V1 (Scope Out, story
    future câblera l'appel via Claude Agent SDK).
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
- **Backend Go** : nouvelle binding `UpdateArtifactStatus(path,
  newStatus) error` qui :
  1. Lit l'artefact via `artifacts.ParseArtifact` existant.
  2. Valide la transition (`draft → reviewed`, `reviewed →
     accepted`, ..., `implemented → synced`). Refuse les skips.
  3. Réécrit le front-matter en place avec le nouveau status
     et `updated` à la date du jour.
  4. Retourne l'erreur ou `nil`.
  - Tests unitaires Go pour les transitions valides + invalides
    + gating cross-stage.
- **Frontend store** : nouveau `useWorkflowStore` (6ᵉ store,
  Invariant I6 d'UI-001b) qui :
  - Agrège les `Meta` de tous les kinds (4 appels parallèles à
    `ListArtifacts`).
  - Indexe par `id` pour produire les rows du pipeline.
  - Calcule l'état de gating (verrou cellule N+1).
  - Expose `advanceStatus(path, newStatus)` qui appelle la
    nouvelle binding Go et rafraîchit l'index.
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

### AC2 — Vue pipeline rendue avec swim-lanes

- **Given** je clique sur l'icône `Workflow`
- **When** la sidebar bascule sur ce mode
- **Then** le main content affiche un tableau avec 5 colonnes
  (Story / Analysis / Canvas / Implementation / Tests) en header
  sticky, et une ligne par `id` SPDD distinct trouvé dans
  `spdd/`. Au moins UI-001a, UI-001b, UI-001c, UI-006, UI-007
  sont visibles si le repo yukki est ouvert.

### AC3 — Cartes affichent status badge coloré

- **Given** la vue pipeline ouverte
- **When** je regarde une cellule remplie
- **Then** elle affiche `id`, `slug` tronqué, et un badge coloré
  selon le status :
  - `draft` → gris (`bg-muted text-muted-foreground`)
  - `reviewed` → bleu (`bg-blue-500/15 text-blue-300`)
  - `accepted` → violet (`bg-purple-500/15 text-purple-300`)
  - `implemented` → vert (`bg-green-500/15 text-green-300`)
  - `synced` → teal (`bg-teal-500/15 text-teal-300`)
  - (couleurs cohérentes avec `STATUS_BADGE` de `<HubList />`)

### AC4 — Cellules vides montrent gating

- **Given** une feature `UI-008` qui n'a qu'une story
  (pas d'analyse ni de canvas)
- **When** je regarde sa ligne
- **Then** la cellule colonne `Analysis` affiche un bouton
  `Plus` cliquable (status story = `draft` ou plus, gating non
  atteint car prerequisite story.draft existe). Les colonnes
  `Canvas` / `Implementation` / `Tests` affichent un icône `Lock`
  grisé avec tooltip "Complete previous stage first" (gating).

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

### AC9 — Cellule "Create analysis" affiche modal slash command

- **Given** UI-008 a une story `reviewed` mais pas d'analyse
- **When** je clique sur la cellule vide colonne `Analysis`
- **Then** un modal shadcn Dialog s'ouvre avec :
  - Titre "Create analysis for UI-008"
  - Texte explicatif "V1 : copy this command and run it via Claude Code"
  - Code block monospace `\/spdd-analysis spdd/stories/UI-008-workflow-pipeline-view.md`
  - Bouton `Copy command` qui copie dans le clipboard
  - Bouton `Close`
  - **Pas** d'exécution AI directe (Scope Out V1)

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
