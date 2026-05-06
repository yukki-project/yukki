---
id: UI-001b
slug: hub-viewer-claude-banner
title: Hub viewer — project picker, sidebar, liste read-only des stories, banner Claude, init SPDD (frontend & bindings, consume CORE-004)
status: synced
created: 2026-05-01
updated: 2026-05-01
owner: Thibaut Sannier
modules:
  - internal/uiapp
  - frontend
parent: UI-001
sibling-stories:
  - UI-001a-app-skeleton-and-subcommand
  - UI-001c-new-story-flow
analysis: .yukki/analysis/UI-001-init-desktop-app-wails-react.md
depends-on:
  - UI-001a-app-skeleton-and-subcommand
  - CORE-004-list-and-parse-artifacts
---

# Hub viewer — project picker, sidebar, liste read-only des stories, banner Claude, init SPDD

## Background

Deuxième story fille de UI-001, après UI-001a (skeleton). UI-001b transforme
la fenêtre vide de UI-001a en **hub fonctionnel read-only** :

- l'utilisateur sélectionne un dossier projet (OS-natif)
- il voit la liste des stories existantes (via `artifacts.ListArtifacts`
  livrée par **CORE-004**)
- il sait si Claude CLI est installé (banner non-bloquant async)
- il peut initialiser un dossier vide en projet SPDD valide
  (création de la structure `spdd/{stories,analysis,prompts,tests}/`
  + copie des templates depuis embed.FS)

**Encore aucune écriture vers Claude** : c'est UI-001c qui apporte le
flow *New Story*. UI-001b est entièrement *read-side* : viewer + diagnostic.

> **Note de scope** *(2026-05-01)* : la couche Go pure de listing
> (`internal/artifacts.ListArtifacts`, `ParseFrontmatter[T]`) a été
> **extraite** vers **CORE-004** pour permettre sa réutilisation par
> INT-002 (serveur MCP) et un éventuel futur `yukki list` CLI sans
> refactor. UI-001b **consomme** ces fonctions Go déjà livrées, ne
> les implémente pas. Estimation passée de ~1.5j (Go + UI) à ~1j
> (UI uniquement, depuis CORE-004 livrée).

## Business Value

- **Adoption immédiate** : un nouvel arrivant ouvre `yukki ui`, pointe son
  repo, voit ses artefacts SPDD existants. Avant même de générer quoi que
  ce soit, il a une **vue centralisée** que la CLI ne donne pas.
- **Diagnostic clair** : le banner *"Claude CLI not detected"* enlève
  la frustration *"pourquoi mon bouton Generate ne marche pas ?"* avant
  même qu'elle survienne (UI-001c).
- **Onboarding "fresh repo"** : le bouton *Initialize SPDD here* permet de
  bootstrapper un projet en un clic, sans relire la doc de structure.

## Scope In

- **`App.SelectProject(ctx) (string, error)`** binding Go → ouvre
  `runtime.OpenDirectoryDialog` ; retourne le chemin choisi ou erreur si
  annulé. Met à jour `app.projectDir`, recrée
  `templates.NewLoader(projectDir)` et
  `artifacts.NewWriter(filepath.Join(projectDir, "spdd/stories"))`.
- *(Le scope Go pur — `internal/artifacts.ListArtifacts` et
  `ParseFrontmatter[T]` — a été extrait dans **CORE-004** pour
  permettre la réutilisation par INT-002 / future CLI `yukki list`
  sans refactor. UI-001b consomme ces fonctions, ne les implémente
  pas.)*
- **Bindings Go de listing** exposés au front pour le hub : permet à
  React d'appeler les 4 kinds (stories, analyses, prompts, tests).
  Forme exacte (4 méthodes typées symétriques `App.ListStories` /
  `ListAnalyses` / `ListPrompts` / `ListTests`, **ou** une seule
  `App.ListArtifacts(kind string)` paramétrée) à trancher en canvas
  via OQ5. Quel que soit le choix, la fonction délègue à
  `internal/artifacts.ListArtifacts(projectDir, kind)` (livrée par
  CORE-004).
- **`App.GetClaudeStatus(ctx) ClaudeStatus`** binding Go.
  `ClaudeStatus{Available bool, Version, Err string}`. Appelle
  `provider.CheckVersion(ctx)` ; mappe `ErrNotFound`/`ErrVersionIncompatible`
  vers les champs.
- **`App.InitializeSPDD(dir string) error`** binding Go. Crée
  `<dir>/spdd/{stories,analysis,prompts,tests,methodology,templates}/`
  + copie les 4 templates depuis `embed.FS`. Idempotent (no-op si
  déjà existe). Retourne erreur si écriture impossible.
- **Composants React** :
  - `<ProjectPicker />` : si `app.projectDir` vide, bouton *Open project*
    qui appelle `SelectProject`. Vue empty state si dossier sans
    `spdd/` détecté → propose *Initialize SPDD here* (appelle
    `InitializeSPDD`).
  - `<Sidebar />` : navigation permanente, 4 entrées (Stories, Analyses,
    Canvas, Tests). Sélectionnée → reflète sur la vue principale.
  - `<HubList />` : tableau des `Meta` du `kind` courant, colonnes
    `id`, `title`, `status` (badge coloré), `updated`. Cliquer une ligne
    ouvre `<StoryViewer />`.
  - `<StoryViewer />` : rend le markdown du fichier sélectionné en
    read-only via `marked` ou `react-markdown` (lib légère, à valider en
    canvas).
  - `<ClaudeBanner />` : banner persistant en haut de l'app, affiché si
    `ClaudeStatus.Available === false`. Non-bloquant. Lien vers la doc
    d'install Claude CLI.
- **Stores Zustand** :
  - `useProjectStore` (projectDir, setProjectDir, hasSpdd)
  - `useArtifactsStore` (kind courant, items, refresh)
  - `useClaudeStore` (status, refresh)
- **Refresh manuel** : un bouton *Refresh* dans le header ; appelle
  `useArtifactsStore.refresh()` qui re-call `App.ListArtifacts(kind)`.
  Pas de fsnotify (Q1=B retenue, fsnotify déféré UI-005).
- **Tests Go** unit sur :
  - `internal/uiapp.App.SelectProject` (avec mock Wails runtime)
  - `internal/uiapp.App.ListStories` / `ListAnalyses` / etc. (assert
    qu'elles délèguent correctement à `artifacts.ListArtifacts` —
    livrée par **CORE-004**, déjà testée)
  - `internal/uiapp.App.GetClaudeStatus` avec MockProvider qui retourne
    `ErrNotFound`
  - `internal/uiapp.App.InitializeSPDD` avec dir temp + check de la
    structure créée
  - *(les tests sur `ListArtifacts` et `ParseFrontmatter[T]`
    eux-mêmes sont livrés par CORE-004, pas dupliqués ici)*

## Scope Out

- **Modal *New Story*** = UI-001c
- **`workflow.Progress` / streaming** = UI-001c
- **Cancellation `OnShutdown`** = UI-001c
- **Édition markdown des stories** = UI-005 (le viewer reste read-only)
- **Auto-refresh fsnotify** = UI-005
- **Theming light/dark** = UI-002
- **Persistance du dernier projet ouvert** = UI-002
- **Pagination / virtual scrolling pour > 200 stories** : différé (rare
  en V1)

## Acceptance Criteria

### AC1 — Project picker au démarrage si aucun projet en mémoire

- **Given** l'app démarre (skeleton de UI-001a est posé) sans projet en
  mémoire
- **When** la fenêtre s'ouvre
- **Then** le composant `<ProjectPicker />` s'affiche avec un bouton
  *Open project*. Cliquer le bouton ouvre `runtime.OpenDirectoryDialog`.
  Choisir un dossier l'enregistre dans `useProjectStore` et bascule
  vers le hub.

### AC2 — Hub liste les stories d'un projet existant

- **Given** un projet contenant `.yukki/stories/CORE-001-...md` et
  `.yukki/stories/META-001-...md` (frontmatter YAML valide)
- **When** l'utilisateur navigue sur l'onglet *Stories* du `<Sidebar />`
- **Then** `<HubList />` affiche 2 lignes avec `id`, `title`, `status`
  (badge coloré : draft=gris, reviewed=bleu, accepted=violet,
  implemented=vert, synced=teal), `updated`. Cliquer une ligne ouvre
  `<StoryViewer />` qui rend le markdown.

### AC3 — Empty state + initialisation SPDD

- **Given** l'utilisateur sélectionne un dossier sans `spdd/`
- **When** le hub se charge
- **Then** une vue empty state s'affiche : *"This folder is not initialized
  for SPDD yet. Click below to create the standard structure."* + bouton
  *Initialize SPDD here*. Cliquer crée `spdd/{stories,analysis,prompts,tests,
  methodology,templates}/` + copie 4 templates depuis embed.FS. Le hub
  bascule sur la liste *Stories* (vide).

### AC4 — Banner non-bloquant si `claude` CLI absent

- **Given** `claude --version` échoue (binaire absent ou non sur PATH)
- **When** l'app démarre et `App.GetClaudeStatus` est appelé en async
- **Then** le `<ClaudeBanner />` apparaît en haut de l'app après
  ~200-500 ms (sans bloquer le rendu initial du hub) avec le texte
  *"Claude CLI not detected — install it to generate artifacts."* + lien
  vers https://docs.anthropic.com/en/docs/claude-code/. L'app reste
  utilisable en mode lecture.

### AC5 — Frontmatter corrompu = ligne flaggée, pas crash

- **Given** un projet contient un `.yukki/stories/BROKEN-001.md` avec
  frontmatter YAML invalide
- **When** `App.ListStories()` est appelé
- **Then** la liste retourne les stories valides + une `Meta` avec un
  champ `Error: "invalid frontmatter"` pour le fichier cassé. Le
  `<HubList />` affiche cette ligne avec un badge rouge "invalid", mais
  ne crash pas. Cliquer la ligne ouvre le viewer en mode raw markdown.

### AC6 — Refresh manuel via bouton dans le header

- **Given** une story créée par la CLI pendant que l'app desktop est
  ouverte
- **When** l'utilisateur clique sur le bouton *Refresh* du header
- **Then** la liste se recharge via `App.ListArtifacts(kind)` et la
  nouvelle story apparaît. Auto-refresh post-action UI : également
  appliqué après chaque écriture (par exemple après `InitializeSPDD`
  qui ne crée pas de stories mais rafraîchit l'état empty/non-empty).

### AC7 — Sidebar permanente avec navigation entre 4 kinds

- **Given** un projet sélectionné avec stories + analyses + prompts
- **When** l'utilisateur clique sur les onglets *Analyses*, *Canvas*,
  *Tests* dans la sidebar
- **Then** `<HubList />` recharge les artefacts correspondants
  (`.yukki/analysis/`, `.yukki/prompts/`, `.yukki/tests/`). L'onglet actif est
  visuellement marqué.

## Open Questions

- [ ] **OQ1 — Lib markdown viewer** : `react-markdown` (le standard,
  ~50kb), `marked` (plus léger mais nécessite une lib séparée pour le
  rendu React), `mdx-bundler` (overkill pour read-only) ?
  *Reco : `react-markdown` + `remark-gfm` (tableaux, GFM strikethrough).*
- [ ] **OQ2 — Comportement quand `App.ListStories` rencontre un
  frontmatter corrompu** : skip silencieux ? Inclure un `Meta.Error` ?
  *Reco : inclure dans la liste avec flag `Error` (cf. AC5) — meilleure
  UX que skip silencieux.*
- [ ] **OQ3 — Stockage du `projectDir` entre sessions** : persisté en
  V1 ou re-prompt à chaque ouverture ?
  *Reco : V1 = re-prompt. Persistance OS-config = UI-002.*
- [ ] **OQ4 — Sidebar : 4 onglets fixes ou extensible ?** Future story
  pourrait ajouter *Methodology refs*, *Settings*, *Help*. La sidebar
  doit être *array of items* dans Zustand pour faciliter les ajouts.
  *Reco : array typé `SidebarItem[]` dès UI-001b.*

## Notes

- **Filiation** : story fille de **UI-001**, sœur de UI-001a (skeleton)
  et UI-001c (new story flow).
- **Dépendances** :
  - **UI-001a** (scaffold Wails + frontend React) — déjà livrée
  - **CORE-004** (Go listing/parsing) — à livrer avant UI-001b ;
    extraite du scope UI-001b le 2026-05-01 pour permettre la
    réutilisation par INT-002 / future CLI sans refactor
- **Analyse partagée** : [`.yukki/analysis/UI-001-init-desktop-app-wails-react.md`](../analysis/UI-001-init-desktop-app-wails-react.md).
  Les décisions structurantes (D11 async Claude check, D6 empty state
  init) sont déjà tranchées. La D2 *"ListArtifacts dans
  `internal/artifacts`"* a été honorée mais via la story dédiée
  CORE-004.
- **Estimation** : ~1j (composants React 0.5j + bindings Go Wails
  + tests Go uiapp 0.5j). *Estimation réduite de 1.5j à 1j depuis
  l'extract du Go core vers CORE-004.*
- **Lien vers le canvas REASONS** (à venir) :
  `.yukki/prompts/UI-001b-hub-viewer-claude-banner.md`
