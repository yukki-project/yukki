---
id: UI-001a
slug: app-skeleton-and-subcommand
title: App skeleton — `yukki ui` sub-cmd lance une fenêtre Wails vide + scaffold React
status: draft
created: 2026-05-01
updated: 2026-05-01
owner: Thibaut Sannier
modules:
  - cmd/yukki
  - internal/uiapp
  - frontend
  - go.mod
parent: UI-001
sibling-stories:
  - UI-001b-hub-viewer-claude-banner
  - UI-001c-new-story-flow
analysis: spdd/analysis/UI-001-init-desktop-app-wails-react.md
---

# App skeleton — `yukki ui` sub-cmd lance une fenêtre Wails vide + scaffold React

## Background

Première de 3 stories filles issues du split SPIDR axe **I** (Interface) de
la story parente UI-001 (cf. [`spdd/analysis/UI-001-init-desktop-app-wails-react.md`](../analysis/UI-001-init-desktop-app-wails-react.md)).

Cette story pose **uniquement le scaffold** : une fenêtre Wails vide qui
s'ouvre via `yukki ui`, le projet React/TS/Vite/Tailwind/shadcn-ui prêt à
recevoir des composants, et le job CI qui valide la compile sur 3 OS.
**Aucune feature utilisateur n'est livrée ici** ; c'est la fondation que
UI-001b (hub viewer) et UI-001c (new story flow) vont compléter.

L'analyse stratégique commune aux 3 stories filles UI-001a/b/c reste
[`spdd/analysis/UI-001-init-desktop-app-wails-react.md`](../analysis/UI-001-init-desktop-app-wails-react.md) ;
elle couvre toutes les décisions structurantes (D1-D16) et les risques
de la famille.

## Business Value

- **Fondation amortie sur les 3 stories** : poser Wails + Vite + Tailwind +
  shadcn une seule fois ; UI-001b et UI-001c ajoutent uniquement leurs
  composants/bindings.
- **Validation early de l'intégration Cobra ↔ Wails** : confirmer qu'un
  binaire unique peut servir CLI + GUI sans régression sur les sous-cmd
  existantes (`yukki story`, etc.).
- **CI green sur 3 OS dès UI-001a** : on découvre les surprises de packaging
  Wails (Webview2 sur Windows, libwebkit2gtk-4.0 sur Linux) tôt, pas le
  jour où on essaie de livrer.

## Scope In

- **Sous-commande `yukki ui`** ajoutée à la CLI Cobra existante (nouveau
  fichier [cmd/yukki/ui.go](../../cmd/yukki/ui.go)). Lance `wails.Run`,
  blocks jusqu'à fermeture de fenêtre.
- **Wails v2 scaffold** : `wails.json` + entrée Go côté `internal/uiapp/app.go`
  avec une struct `App` minimaliste (ctx, logger), méthode bindée `Greet()`
  qui retourne `"hello from yukki backend"` (smoke test).
- **`internal/uiapp.NewApp(deps)`** factory — accepte `provider.Provider`
  (pas utilisé en UI-001a, juste signature posée pour UI-001c) et un
  `*slog.Logger`.
- **Frontend scaffold** dans `frontend/` :
  - `package.json` avec React 18, ReactDOM, TypeScript 5, Vite 5,
    Tailwind 3, Zustand 4
  - shadcn/ui CLI initialisé (composants `Button`, `Card` minimaux dans
    `frontend/src/components/ui/`)
  - `frontend/src/App.tsx` affiche un placeholder *"yukki — placeholder,
    UI-001b coming"* + un bouton `Greet` qui appelle la binding Go
- **Build tag `mock`** posé (drapeau Q2=A) :
  `cmd/yukki/ui_mock.go` (build tag `mock`) injecte `MockProvider`,
  `cmd/yukki/ui_prod.go` (build tag `!mock`) injecte `ClaudeProvider`.
  En UI-001a aucun appel provider, mais le câblage est testé.
- **CI job `ui-build`** dans [.github/workflows/ci.yml](../../.github/workflows/ci.yml) :
  - matrix Linux/macOS/Windows
  - install Wails CLI via `go install`
  - install `libwebkit2gtk-4.0-dev` sur Linux
  - run `wails build -platform <os>` puis upload artefact
  - dépend de `static-checks` (cohérent avec les autres jobs)
- **`.gitignore`** étendu : `frontend/node_modules/`, `frontend/dist/`,
  `build/bin/`, `frontend/wailsjs/` (auto-généré par Wails à chaque
  build/dev — bindings TypeScript).
- **`DEVELOPMENT.md`** : nouvelle section *"Dev de l'UI"* expliquant
  `wails dev`, `wails build`, prereqs (Node 20+, Wails CLI, webkit2gtk
  sur Linux), build tags `mock` vs prod.
- **Tests Go** unit sur `internal/uiapp` :
  - `NewApp` retourne une struct valide
  - `App.Greet()` retourne le string attendu (smoke test bindings)

## Scope Out

- **Project picker** = UI-001b
- **Hub list (frontmatter parsing)** = UI-001b
- **Banner Claude absent** = UI-001b
- **Empty state init `spdd/`** = UI-001b
- **Modal *New Story*** = UI-001c
- **Streaming via EventsEmit/EventsOn** = UI-001c
- **Cancellation `OnShutdown`** = UI-001c
- **`workflow.Progress` interface** = UI-001c (pas posée tant qu'aucun
  appel `RunStory` ne traverse l'UI)
- **Theming light/dark, persistance prefs** = UI-004
- **Édition markdown des stories** = UI-005
- **Tests UI front (Playwright/Cypress)** : différé.
- **Signing binaires Windows/macOS** = OPS-001 post-MVP.

## Acceptance Criteria

> Format Given / When / Then. AC testables en unit (Go) + manuellement
> via `wails dev` + en CI via `wails build`.

### AC1 — Sous-commande `yukki ui` lance la fenêtre Wails

- **Given** un binaire `yukki` buildé via `wails build` (frontend embedded)
- **When** l'utilisateur tape `yukki ui` dans un terminal
- **Then** une fenêtre native s'ouvre (titre `yukki`, taille par défaut
  1280×800, redimensionnable, fermable). Le contenu est le placeholder
  React de UI-001a (titre + bouton *Greet*). La CLI rend la main quand la
  fenêtre se ferme (exit code 0).

### AC2 — Bouton *Greet* exerce les bindings Go ↔ JS

- **Given** la fenêtre est ouverte sur le placeholder
- **When** l'utilisateur clique sur *Greet*
- **Then** le frontend appelle `App.Greet()` via les bindings auto-générés
  Wails et affiche le retour `"hello from yukki backend"` en dessous du
  bouton. Confirme que le pont Go ↔ JS fonctionne.

### AC3 — Build tag `mock` swap le provider sans changer l'UI

- **Given** la build tag `mock` est active (`go build -tags mock ./cmd/yukki`
  ou `wails dev -tags mock`)
- **When** on examine `internal/uiapp.NewApp` à l'exécution
- **Then** le `provider.Provider` injecté est `MockProvider` ; sans tag
  `mock`, c'est `ClaudeProvider`. Vérifié par un test Go avec
  un build tag de test ou via reflection sur le type concret.

### AC4 — `yukki story` reste fonctionnel après ajout de la sous-cmd `ui`

- **Given** un binaire buildé avec UI-001a
- **When** l'utilisateur tape `yukki story "test"`
- **Then** la commande s'exécute exactement comme avant (CORE-001) ;
  aucune régression sur la CLI existante. Vérifié par les tests
  e2e existants qui doivent continuer à passer dans `tests/e2e/`.

### AC5 — Le job CI `ui-build` passe au vert sur les 3 OS

- **Given** une PR sur `feature/UI-001a` ou `main`
- **When** le job `ui-build` du CI s'exécute (matrix Linux/macOS/Windows)
- **Then** `wails build -platform <os>` produit un binaire sans erreur
  sur les 3 OS. Le binaire est uploadé en artefact CI sous le nom
  `yukki-ui-<os>` pour permettre un test manuel.

## Open Questions

- [ ] **OQ1 — Wails dev experience sur Windows + AV corporate** :
  Le watcher `wails dev` recompile fréquemment dans `.gocache` ; risque
  AV bloquant identique à CORE-001. Plan B testé ?
  *Reco : documenter dans DEVELOPMENT.md que `wails dev` peut nécessiter
  WSL, ou attendre TICKET IT (exclusion Defender déjà au TODO).*
- [ ] **OQ2 — Caching CI** : `actions/cache@v4` sur `~/go/pkg/mod` et
  `~/.cache/go-build` + `~/.npm` ? Réduit fortement le temps de CI mais
  ajoute de la complexité.
  *Reco : oui pour `~/go/pkg/mod` et `node_modules`, indispensable sur 3
  OS pour rester sous 5 min par job.*
- [ ] **OQ3 — Version Wails à pin** : v2 stable a évolué pendant 2024-2026.
  Pin sur la dernière minor stable connue (à confirmer en revue) pour
  éviter le churn.

## Notes

- **Filiation** : story fille de **UI-001** (parent splittée par décision
  utilisateur 2026-05-01 *"elle est grosse cette story"*). Sœurs :
  [UI-001b-hub-viewer-claude-banner.md](UI-001b-hub-viewer-claude-banner.md)
  + [UI-001c-new-story-flow.md](UI-001c-new-story-flow.md). La V1 utilisateur
  *"Hub + canvas editor"* nécessite UI-001a + 001b + 001c + UI-002 (canvas).
- **Analyse partagée** : [`spdd/analysis/UI-001-init-desktop-app-wails-react.md`](../analysis/UI-001-init-desktop-app-wails-react.md)
  couvre la famille UI-001a/b/c. Les 16 décisions ont déjà été tranchées
  par l'utilisateur (Q1=B, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A acceptées).
- **Estimation** : ~1.5j (scaffold Wails 0.5j + scaffold React/Vite/Tailwind/
  shadcn 0.5j + CI matrix + DEVELOPMENT.md 0.5j).
- **Lien vers le canvas REASONS** (à venir) :
  `spdd/prompts/UI-001a-app-skeleton-and-subcommand.md`
