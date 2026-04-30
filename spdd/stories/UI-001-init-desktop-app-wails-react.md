---
id: UI-001
slug: init-desktop-app-wails-react
title: Initialiser l'app desktop yukki — Wails v2 + React + bindings Go (skeleton, hub, first story flow)
status: draft
created: 2026-05-01
updated: 2026-05-01
owner: Thibaut Sannier
modules:
  - cmd/yukki
  - internal/uiapp
  - frontend
  - go.mod
---

# Initialiser l'app desktop yukki — Wails v2 + React + bindings Go (skeleton, hub, first story flow)

## Background

`yukki` est aujourd'hui une CLI Go (CORE-001 livré) qui orchestre Claude CLI
pour produire des artefacts SPDD versionnés. La CLI suffit pour les power users
mais reste **opaque pour l'adoption** : un nouvel arrivant ne sait pas par où
commencer, comment relire ses canvas REASONS, comment naviguer entre stories,
analyses et canvas.

Cette story pose la **fondation de l'app desktop yukki**, équivalent
fonctionnel ouvert et provider-agnostique de Kiro. Stack retenue :
**Wails v2 + React 18 + TypeScript + Vite + React Flow v12** (cf. analyse
décisionnelle hors-bande où l'on a comparé Wails+Angular et écarté Angular pour
React + l'écosystème React Flow).

Le scope V1 visé par l'utilisateur (Q1 = V1c) est *Hub + canvas editor
complet*. Pour respecter **INVEST-Small**, on découpe selon SPIDR axe **I**
(Interface) : UI-001 livre le **skeleton + hub + premier flow story
end-to-end** ; UI-002 livrera le **canvas REASONS éditable** ; UI-003 livrera
le **wizard d'install Claude CLI** ; UI-004 le **theming + persistance des
prefs**. La V1c utilisateur = UI-001 + UI-002 + UI-003 livrées ensemble.

## Business Value

- **Adoption** : un nouvel arrivant ouvre `yukki ui`, voit un hub clair,
  comprend en 30 secondes ce que fait l'outil. Le seuil d'entrée chute de
  "lire 8 pages de doc CLI" à "cliquer sur *New Story*".
- **Différenciation marché** : aligne yukki sur les standards visuels
  (Kiro, Cursor, Devin). Sans UI, yukki reste invisible face à ces concurrents.
- **Réutilisation totale du backend Go** : le code `internal/workflow`,
  `internal/provider`, `internal/templates`, `internal/artifacts` est
  exposé tel quel aux bindings Wails — zéro rewrite, la CLI continue à
  fonctionner en parallèle.
- **Fondation pour UI-002, UI-003, UI-004** : le scaffold (Wails build,
  React+Vite+TS, bindings auto-générés, layout principal, routing) est
  posé une fois et amorti par toutes les stories UI suivantes.

## Scope In

- **Sous-commande `yukki ui`** ajoutée à la CLI Cobra existante. Lance la
  fenêtre Wails. Le binaire reste **un seul exécutable**
  (Q2 retenu : un binaire, sous-cmd).
- **Wails v2 scaffold** : `wails.json`, structure `frontend/`, build
  hooks, Go entry exposant la struct `App` à JS via auto-bindings TypeScript.
- **React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui** comme stack
  frontend. Pas de Redux, on commence avec Zustand ou React Context.
- **Project picker au démarrage** : sélecteur de dossier OS-natif (via
  `runtime.OpenDirectoryDialog` Wails), persisté en mémoire le temps de la
  session. *Persistance disque post-MVP* (UI-004).
- **Hub view** :
  - en haut : breadcrumb du projet sélectionné + bouton *Switch project*
  - colonne gauche : navigation entre **Stories**, **Analyses**, **Canvas**,
    **Tests** (1 entrée par dossier `spdd/<x>/`)
  - colonne principale : liste des fichiers `.md` du dossier sélectionné, avec
    `id`, `title`, `status`, `updated` extraits du frontmatter YAML
  - en bas : bouton CTA *New Story* qui ouvre un modal
- **Modal *New Story*** :
  - textarea pour la description libre
  - sélecteur de prefix (CORE / EXT / META / UI / DOC / INT) avec valeur par
    défaut suggérée
  - flag *strict prefix* via toggle
  - bouton *Generate* qui appelle la binding Go
    `App.RunStory(description, prefix, strictPrefix)`
  - barre de progression / spinner pendant l'attente Claude (via
    `EventsEmit` Go → `EventsOn` JS pour streamer le statut)
  - en succès : ferme le modal, rafraîchit la liste, sélectionne la nouvelle
    story
- **Story viewer** : panneau read-only qui rend le markdown de la story
  sélectionnée (pas d'édition en UI-001 — sera dans une future story UI-005).
- **Source de vérité = fichiers `.md`** (Q3 retenu) : aucune base de
  données, aucune cache. Lecture/écriture directe dans
  `<projet>/spdd/stories/*.md`. Identique à la CLI.
- **Vérification Claude CLI au démarrage** : si `claude --version` échoue,
  un banner non-bloquant s'affiche en haut de l'app avec un lien vers la
  doc d'install. *Wizard guidé* = UI-003 (Q4 retenu : wizard, mais déféré
  pour respecter INVEST-Small).
- **Build cross-platform** :
  - dev : `wails dev` (HMR Vite + recompile Go)
  - prod : `wails build` produit un binaire natif Win/macOS/Linux
- **CI** : un nouveau job `ui-build` dans `.github/workflows/ci.yml` qui
  exécute `wails build` sur les 3 OS pour valider que le binaire compile.
  Pas de tests UI en CI pour cette story (cf. Scope Out).
- **Tests unitaires Go** sur les bindings (`internal/uiapp`) avec
  MockProvider, comme pour le workflow CLI.

## Scope Out

- **Canvas REASONS éditable** = **UI-002**. React Flow v12, drag&drop des
  7 blocs R/E/A/S/O/N/S, save → `.md`. Story dédiée car non-triviale.
- **Wizard d'install Claude CLI** = **UI-003**. Détection de l'OS, lien
  vers les bons binaires Anthropic, vérification post-install.
- **Theming light/dark + prefs persistées** = **UI-004**.
- **Édition des stories en UI** (markdown editor) = **UI-005** (proposé,
  pas encore au TODO).
- **Workflow complet (`yukki analysis`, `generate`, etc. via UI)** —
  ces commandes ne sont pas encore livrées côté CLI (CORE-002a–f). UI-001
  ne couvre que le flow `story` qui existe.
- **Auto-update** : pas en V1, releases manuelles via GitHub Releases.
- **Signing binaires** (Authenticode Windows / notarization Apple) : pas
  en V1 — un ticket dédié sera ouvert plus tard (Defender râlera en
  attendant).
- **Tests E2E UI** (Playwright / Cypress) : différé tant que l'UI bouge
  rapidement. Tests Go sur les bindings suffisent pour cette story.
- **i18n** : EN-only V1 (cohérent avec les prompts SPDD existants).
- **Multi-projet workspace** : 1 projet à la fois, bouton *Switch* pour
  changer.

## Acceptance Criteria

> Format Given / When / Then. Chaque AC est testable en unit (bindings Go +
> MockProvider) ou manuellement en dev (`wails dev`).

### AC1 — Sous-commande `yukki ui` lance la fenêtre Wails

- **Given** un binaire `yukki` buildé en mode embed (`wails build` ou
  équivalent qui produit le binaire avec frontend embedded)
- **When** l'utilisateur tape `yukki ui` dans un terminal
- **Then** une fenêtre native s'ouvre sur le hub (titre `yukki`, taille
  par défaut 1280×800, redimensionnable, fermable). La CLI rend la main
  uniquement quand la fenêtre est fermée.

### AC2 — Project picker au démarrage si aucun projet sélectionné

- **Given** l'app démarre pour la première fois (pas de projet en mémoire)
- **When** la fenêtre s'ouvre
- **Then** un dialog OS-natif de sélection de dossier s'affiche.
  L'utilisateur choisit un dossier ; ce dossier devient le "current project"
  et le hub se charge avec son contenu `spdd/`.

### AC3 — Hub liste les stories du projet courant

- **Given** un projet contenant `spdd/stories/CORE-001-...md` et
  `spdd/stories/META-001-...md` (frontmatter YAML valide)
- **When** l'utilisateur navigue sur l'onglet *Stories*
- **Then** il voit deux entrées listées avec leur `id`, `title`, `status`
  et `updated`. Cliquer sur une entrée ouvre le viewer markdown read-only.

### AC4 — Création d'une story via l'UI invoque le backend Go

- **Given** l'utilisateur clique sur *New Story* sur le hub, saisit une
  description libre, choisit le prefix `CORE` et clique *Generate*
- **When** la binding Go `App.RunStory(description, "CORE", false)` est
  appelée
- **Then** elle invoque `workflow.RunStory` avec un `provider.Provider`
  réel (Claude) ou un MockProvider en test, écrit `<projet>/spdd/stories/<id>-<slug>.md`
  via `artifacts.NewWriter`, et retourne le chemin du fichier créé. Le hub
  rafraîchit automatiquement la liste et sélectionne la nouvelle story.

### AC5 — Streaming du statut provider via Wails Events

- **Given** un appel `App.RunStory` en cours
- **When** le backend Go atteint l'étape "calling claude"
- **Then** un évènement `provider:start` est émis vers le frontend, qui
  affiche un spinner avec le label *"Asking Claude…"*. À la fin, un
  évènement `provider:end` (success ou error) est émis et le spinner
  disparaît. *(Le streaming token-par-token de la sortie est out-of-scope
  ici — ce sera UI-005.)*

### AC6 — Banner non-bloquant si `claude` CLI absent

- **Given** `claude --version` échoue (binaire absent ou non sur PATH) au
  démarrage de l'app
- **When** la fenêtre se charge
- **Then** un banner persistant s'affiche en haut de l'app : *"Claude CLI
  not detected — install it to generate artifacts."* avec un lien vers
  la doc d'install. L'app reste utilisable en mode lecture (parcourir les
  artefacts existants), mais les actions de génération sont disabled.

### AC7 — Source de vérité = fichiers `.md`, cohérence avec la CLI

- **Given** un projet où `yukki story "..."` (CLI) a créé une story
  pendant que l'app desktop est ouverte
- **When** l'utilisateur revient sur l'onglet *Stories* (ou un mécanisme
  de refresh / file watcher déclenche un reload)
- **Then** la nouvelle story créée par la CLI apparaît dans la liste de
  l'UI sans qu'aucune sync explicite ne soit nécessaire. *(Auto-refresh
  via fsnotify déférable à UI-005 si trop coûteux ici ; sinon bouton
  *Refresh* manuel.)*

### AC8 — Build cross-platform en CI

- **Given** une PR sur `feature/UI-001` ou `main`
- **When** le job `ui-build` du CI s'exécute (matrix Linux/macOS/Windows)
- **Then** `wails build -platform <os>` produit un binaire sans erreur sur
  les 3 OS. Le binaire est uploadé en artefact CI pour test manuel.
  Pas de test UI automatisé requis pour cette story.

## Open Questions

- [ ] **OQ1 — Refresh hub : file watcher ou bouton manuel ?**
  Auto-refresh via `github.com/fsnotify/fsnotify` est élégant mais pose
  des questions de perf et de noise events sur Windows. Bouton manuel +
  refresh implicite après chaque action UI est plus simple. *Recommandation
  pour UI-001 : bouton manuel ; fsnotify en UI-005.*
- [ ] **OQ2 — Layout principal : Sidebar permanente ou tabs ?**
  Sidebar (style VS Code, Slack) plus scalable pour les futurs onglets
  (Tests, Methodology refs, Settings). Tabs plus simples au début. *Reco :
  sidebar dès UI-001 pour ne pas re-architecturer en UI-005.*
- [ ] **OQ3 — Component library : shadcn/ui, Radix UI brut, ou Material ?**
  shadcn/ui est l'évidence 2026 (copy-paste de composants Radix + Tailwind,
  zéro runtime dep, ownership totale du code). Material UI est lourd.
  *Reco : shadcn/ui.*
- [ ] **OQ4 — Routing React : React Router v7 ou state-only ?**
  Avec une sidebar et un seul niveau de navigation, un simple state
  Zustand suffit. React Router devient utile si on ajoute des deep links
  (pour partager une URL d'une story dans un futur mode `--web`).
  *Reco : Zustand / state-only en UI-001 ; React Router quand on attaque
  le mode `--web` post-MVP.*
- [ ] **OQ5 — Vérification Claude CLI au démarrage : sync ou async ?**
  Sync = on bloque le splash 200-1000ms. Async = on charge le hub et le
  banner apparaît après. *Reco : async, pour ne pas dégrader le perceived
  performance.*
- [ ] **OQ6 — Provider injection dans l'`App` Wails**
  L'`App` doit-elle créer son `provider.Provider` (couplage à Claude) ou
  recevoir un `Provider` injecté via `wails.Run` ? Le second permet un
  MockProvider en dev front sans burn de tokens — gros gain DX.
  *Reco : injection, comme on l'a fait pour `workflow.StoryOptions`.*
- [ ] **OQ7 — Distribution OS** : `.exe` non signé sur Windows va déclencher
  Defender SmartScreen. On documente le contournement (clic *More info* →
  *Run anyway*) ou on attaque le signing tout de suite ? *Reco : doc en
  V1, signing dans une story dédiée (OPS-001 à créer).*
- [ ] **OQ8 — INVEST-Small : la story tient-elle en ≤ 3 jours ?**
  Estimation : Wails scaffold (1d) + hub view (1.5d) + bindings + flow
  story (1d) + CI build matrix (0.5d) = ~4j. Borderline. À challenger
  en revue : peut-on encore retirer quelque chose (e.g. AC7 cohérence
  CLI-UI) sans casser la story ?

## Notes

- **Pivot depuis CLI-001** : la story CLI-001 (terminal niceties — couleurs,
  spinner, bannière) a été abandonnée le 2026-05-01 sur décision
  utilisateur ("je veux une UI web ou software"). La branche
  `feature/CLI-001` a été supprimée localement (jamais poussée). Les
  besoins terminal éventuels seront réouverts plus tard si la CLI
  reste utilisée comme moteur en standalone.
- **Convention de prefix `UI-`** : déjà réservée dans `TODO.md` pour
  *"Canvas editor graphique standalone"*. Cette story redéfinit
  l'identité de UI-001 vers la **fondation app desktop globale** ;
  le canvas devient UI-002. Mise à jour de `TODO.md` à faire en même
  temps que cette story (commit séparé ou dans le même feat).
- **Stack confirmée** :
  - Backend Go : Wails v2 + cohabite avec la CLI Cobra (sous-cmd `yukki ui`)
  - Frontend : React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui +
    Zustand
  - Canvas (UI-002) : React Flow v12 (`@xyflow/react`)
- **Inspiration directe** : Kiro (AWS) pour le pitch general (spec-driven
  desktop app), mais réinterprété en **OSS, Go-cored, provider-agnostique,
  artefacts en .md git**.
- **Stories suivantes prévues** :
  - **UI-002** — Canvas REASONS éditable (React Flow + save .md)
  - **UI-003** — Wizard d'install Claude CLI
  - **UI-004** — Theming light/dark + persistance prefs
  - **UI-005** — Édition markdown des stories + auto-refresh fsnotify +
    streaming token-par-token du provider
- **Lien vers l'analyse** (à venir) : `spdd/analysis/UI-001-init-desktop-app-wails-react.md`
- **Lien vers le canvas REASONS** (à venir) : `spdd/prompts/UI-001-init-desktop-app-wails-react.md`
