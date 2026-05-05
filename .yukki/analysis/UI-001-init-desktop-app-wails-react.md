---
id: UI-001
slug: init-desktop-app-wails-react
status: reviewed
created: 2026-05-01
updated: 2026-05-01
covers-stories:
  - spdd/stories/UI-001a-app-skeleton-and-subcommand.md
  - spdd/stories/UI-001b-hub-viewer-claude-banner.md
  - spdd/stories/UI-001c-new-story-flow.md
---

# Analyse — Initialiser l'app desktop yukki (Wails v2 + React)

> **Analyse de famille** — couvre les 3 stories filles UI-001a / UI-001b /
> UI-001c issues du split SPIDR axe **I** (Interface) de la story parente
> UI-001 (décision utilisateur 2026-05-01 *"elle est grosse cette story"*).
> Chaque story fille produira son propre canvas REASONS qui s'appuiera
> sur les décisions D1-D16 ci-dessous.
>
> Contexte stratégique pour la famille `UI-001`. Issue
> d'un scan ciblé de [cmd/yukki](../../cmd/yukki/),
> [internal/workflow](../../internal/workflow/),
> [internal/provider](../../internal/provider/),
> [internal/templates](../../internal/templates/),
> [internal/artifacts](../../internal/artifacts/) et [go.mod](../../go.mod).
> Croisé avec la doc Wails v2 (https://wails.io/docs/) pour les
> patterns de packaging, bindings et events. Recommandations chiffrées
> en §"Décisions à prendre".

## Mots-clés métier extraits

`Wails`, `bindings`, `hub`, `frontmatter`, `Cobra`, `EventsEmit`,
`OpenDirectoryDialog`, `MockProvider`.

## Concepts de domaine

### Existants (déjà dans le code, **réutilisables tels quels**)

- **`provider.Provider` interface** —
  [internal/provider/provider.go](../../internal/provider/provider.go).
  3 méthodes (`Name`, `CheckVersion`, `Generate`). `ClaudeProvider`
  + `MockProvider` déjà fournis. **Critique pour UI-001** : on injecte
  `MockProvider` côté `wails dev` pour tester l'UX sans burn de tokens
  Claude, et `NewClaude(logger)` côté prod. Aucune modification.
- **`provider.ErrNotFound`** —
  [internal/provider/claude.go:51-53](../../internal/provider/claude.go#L51-L53).
  Retourné quand `claude` est absent de PATH. **Branche directement
  l'AC6** : la binding `App.GetClaudeStatus()` appelle `CheckVersion`
  et retourne un `ClaudeStatus{Available bool, Version, Err string}`
  consommé par le banner React.
- **`templates.NewLoader(projectDir)`** —
  [internal/templates/templates.go:40](../../internal/templates/templates.go#L40).
  Prend déjà un `projectDir` paramétrable, parfait pour le pivot après
  `OpenDirectoryDialog`. Stratégie project-first + embed.FS fallback
  garde sa pertinence dans l'UI.
- **`artifacts.NewWriter(storiesDir)`** —
  [internal/artifacts/writer.go:23](../../internal/artifacts/writer.go#L23).
  Atomic rename + validation frontmatter avant rename. **Garantit l'AC7**
  (cohérence CLI ↔ UI) : peu importe qui écrit, le fichier final est
  toujours valide.
- **`artifacts.ValidateFrontmatter(content)`** —
  [internal/artifacts/writer.go:60](../../internal/artifacts/writer.go#L60).
  Exposée publiquement. **À étendre légèrement** pour aussi *extraire*
  les champs (id, title, status, updated) — une fonction sœur
  `ParseFrontmatter[T any](content string) (T, error)` ferait l'affaire.
- **`workflow.RunStory(ctx, opts)`** —
  [internal/workflow/story.go:41](../../internal/workflow/story.go#L41).
  L'orchestration end-to-end. La binding `App.RunStory` n'est qu'un
  shim qui construit `StoryOptions` à partir de l'état App
  (provider, loader, writer rebuiltés sur le projectDir courant) puis
  appelle cette fonction. **Aucune duplication.**
- **Cobra root cmd** — [cmd/yukki/main.go:45-54](../../cmd/yukki/main.go#L45-L54).
  Le `newRootCmd()` ajoute `newStoryCmd()`. On ajoute `newUICmd()` à
  côté. La sous-cmd `ui` blocks sur `wails.Run` jusqu'à fermeture de
  la fenêtre, puis `RunE` rend la main. Pattern standard Cobra.
- **`clilog.New(format, verbose)`** —
  [internal/clilog/clilog.go](../../internal/clilog/clilog.go). Le
  logger reste utilisé par le backend Go côté Wails (les méthodes de
  l'`App` peuvent journaliser sur stderr, qui sera capturable en mode
  dev par `wails dev`).
- **Tests 3 niveaux + CI matrix** —
  [.github/workflows/ci.yml](../../.github/workflows/ci.yml). Pattern
  établi (4 jobs : `static-checks`, `unit-tests`, `integration-tests`,
  `e2e-tests`, matrix 3 OS). **À répliquer** pour le nouveau job
  `ui-build`.

### Nouveaux (à introduire)

- **`internal/uiapp.App` struct** — porte le contexte Wails, le
  `projectDir` courant, le logger, et **références vers les
  composants Provider/Loader/Writer** (re-construits à chaque
  `SelectProject`). Methods exposées au front : `RunStory`,
  `ListStories`, `ListArtifacts(kind)`, `SelectProject`,
  `GetClaudeStatus`, `Refresh`. Wails auto-génère les bindings TS dans
  `frontend/wailsjs/go/main/App`.
- **`internal/uiapp.NewApp(deps)`** factory — accepte les dépendances
  injectables (`provider.Provider`, logger). Permet `MockProvider` en
  dev front et `NewClaude` en prod via deux entrypoints
  `cmd/yukki/main.go` (mode prod) et `cmd/yukki/main_dev.go` (build
  tag `dev`).
- **`internal/uiapp.uiProgress`** — implémentation de `workflow.Progress`
  (cf. nouveau type ci-dessous) qui appelle
  `runtime.EventsEmit(ctx, "provider:start", label)` et
  `runtime.EventsEmit(ctx, "provider:end", err.Error())`. Pour les
  tests Go : `noopProgress` zéro-valeur.
- **`workflow.Progress` interface** — 2 méthodes :
  `Start(label string)`, `End(err error)`. Ajoutée à `StoryOptions` en
  champ optionnel ; `RunStory` l'appelle autour de
  `Provider.Generate`. Si `nil`, fallback `noopProgress`. **Garantit
  zéro couplage `workflow → uiapp`** (le workflow ne connaît que
  `Progress`).
- **`internal/artifacts.ListArtifacts(dir, kind) ([]Meta, error)`** —
  scanne `<dir>/spdd/<kind>/*.md`, parse le frontmatter via
  `gopkg.in/yaml.v3` (déjà dépendance), retourne
  `[]Meta{ID, Slug, Title, Status, Updated, Path}`. Mutualise la lecture
  pour Stories / Analyses / Canvas / Tests.
- **`cmd/yukki/ui.go`** — fichier dédié à la sous-cmd `ui`. Construit
  `uiapp.NewApp(...)`, configure `wails.Run` (titre, taille, options),
  block jusqu'à fermeture de fenêtre.
- **`frontend/`** — répertoire React/TS complet :
  - `frontend/package.json` (React 18, ReactDOM, Vite 5, TS 5,
    Tailwind 3, shadcn/ui dep set, Zustand)
  - `frontend/src/App.tsx` — root component avec layout sidebar
  - `frontend/src/components/` — Hub, Sidebar, ProjectPicker,
    NewStoryModal, StoryViewer, ClaudeBanner
  - `frontend/src/store/` — Zustand stores (project, stories, claude)
  - `frontend/src/lib/api.ts` — wrappers thin autour des bindings
    `wailsjs/go/main/App` + `wailsjs/runtime`
  - `frontend/src/styles/globals.css` — Tailwind + shadcn theme
- **`wails.json`** — config racine du build : pointe `frontend/` ;
  `frontend:build = "npm run build"` ; `frontend:dev = "npm run dev"` ;
  `frontend:dist = "frontend/dist"`.
- **CI job `ui-build`** dans
  [.github/workflows/ci.yml](../../.github/workflows/ci.yml) :
  matrix 3 OS, install Wails CLI (`go install
  github.com/wailsapp/wails/v2/cmd/wails@latest`), install Webkit2GTK
  sur Linux (`apt-get install libwebkit2gtk-4.0-dev`), run
  `wails build -platform <os>`, upload du binaire en artefact CI.
- **Variables d'env / build tags** — option `-tags dev` (ou
  `-tags mock`) qui swap `provider.NewClaude` pour `MockProvider`,
  pour les sessions `wails dev` sans Claude installé.

## Approche stratégique

1. **Cohabitation Cobra ↔ Wails par sous-cmd** : `yukki ui` blocks sur
   `wails.Run`. Aucun changement aux sous-cmd existantes (`yukki story`
   continue de marcher). Un binaire unique, packaging unique.
2. **Réutilisation maximale du backend Go** : `workflow.RunStory`,
   `provider.NewClaude`, `templates.NewLoader`, `artifacts.NewWriter`
   sont consommés tel quel. Le seul ajout *partagé* avec la CLI est
   l'interface `workflow.Progress` (2 méthodes), implémentée par
   `uiProgress` côté UI et `noopProgress` côté CLI.
3. **Project picker → reconstruction des composants** : chaque
   `App.SelectProject(dir)` recrée `templates.NewLoader(dir)` et
   `artifacts.NewWriter(filepath.Join(dir, "spdd/stories"))`. Pas de
   cache, pas de mutex global. Si l'utilisateur switch project, l'état
   suit.
4. **Frontmatter extraction côté Go** : on **n'envoie pas** le markdown
   brut au front pour qu'il le parse — on parse en Go (reuse yaml.v3,
   déjà dep) et on envoie un `[]Meta` typé. Réduit la taille des
   échanges, évite de dupliquer la logique de parsing en TS.
5. **Streaming via Wails Events** : `provider:start` / `provider:end`
   uniquement en V1 (pas de streaming token-par-token, déféré UI-005).
   Permet un spinner correct sans engager d'effort streaming.
6. **MockProvider en dev front** : un build tag `dev` injecte
   `MockProvider` au lieu de `ClaudeProvider`. Permet `wails dev` sans
   Claude installé, sans burn de tokens, et accélère l'itération
   frontend.
7. **Tests** : focus sur `internal/uiapp` (unit + MockProvider) +
   un job CI `ui-build` qui valide juste la compile sur 3 OS. Pas de
   tests UI front en V1 (Playwright/Cypress = post-MVP).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp` | **fort** | création complète : `App`, bindings (`RunStory`, `ListStories`, `ListArtifacts`, `SelectProject`, `GetClaudeStatus`, `Refresh`), `uiProgress`, `NewApp`, build tags `dev` |
| `frontend/` | **fort** | création complète React 18 + TS + Vite + Tailwind + shadcn/ui + Zustand : Sidebar, Hub, ProjectPicker, NewStoryModal, StoryViewer, ClaudeBanner |
| `cmd/yukki` | moyen | nouveau fichier `ui.go` ajoutant `newUICmd()` à la racine, wiring de Wails options et de `uiapp.App` |
| `internal/artifacts` | moyen | ajout `ListArtifacts(dir, kind) []Meta` + `ParseFrontmatter[T]` (extraction typée). Tests unitaires associés. |
| `internal/workflow` | faible | ajout interface `Progress` dans `StoryOptions` ; `RunStory` l'appelle autour de `Provider.Generate` ; `noopProgress` fallback. Tests existants doivent passer sans modif (c'est un champ optionnel) |
| `go.mod` / `go.sum` | moyen | ajout `github.com/wailsapp/wails/v2` (~15-20 deps transitives : leaanthony/u, labstack/echo conditionnel Linux, etc.) |
| `wails.json` | nouveau | config build/dev hooks pointant `frontend/` |
| `.github/workflows/ci.yml` | moyen | nouveau job `ui-build` matrix 3 OS, install Wails CLI + webkit2gtk Linux, `wails build`, upload artefact |
| `.gitignore` | faible | `frontend/node_modules/`, `frontend/dist/`, `build/bin/`, `frontend/wailsjs/` (auto-généré) |
| `DEVELOPMENT.md` | faible | section "Dev de l'UI" : `wails dev` workflow, install prereqs, build tags `dev`/`mock` |
| `internal/provider`, `internal/templates`, `internal/clilog` | nul | aucun changement |
| `tests/integration`, `tests/e2e` | faible | aucun changement obligatoire ; un test optionnel "UI-001 binding contract" peut être ajouté plus tard |

## Dépendances et intégrations

- **Backend Go (nouveaux)** :
  - `github.com/wailsapp/wails/v2` v2.x stable 2026 (MIT)
  - Transitive : `github.com/leaanthony/u`, `github.com/labstack/echo` (Linux runtime),
    `github.com/google/uuid`, `golang.org/x/sys` étendu
- **Backend Go (déjà présents, réutilisés)** : Cobra, yaml.v3
- **Frontend (nouveaux)** :
  - `react@18`, `react-dom@18`, `typescript@5`, `vite@5`, `tailwindcss@3`,
    `zustand@4`, `clsx`, `tailwind-merge`
  - shadcn/ui : `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`,
    `@radix-ui/react-scroll-area`, `lucide-react` (icônes)
  - Pas de React Flow / lipgloss / autres en V1 — réservé UI-004
- **Système requis pour l'utilisateur final** :
  - Windows 10 1803+ ou 11 (Webview2 préinstallé)
  - macOS 11+ (WebKit natif, pas de dep)
  - Linux : `libwebkit2gtk-4.0-37` (apt) ou `webkit2gtk3` (dnf)
- **Système requis pour le développeur yukki** :
  - Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
  - Node.js 20+ (pour Vite + npm)
  - libwebkit2gtk-4.0-dev sur Linux dev box
- **Conventions externes** :
  - Wails v2 events (`runtime.EventsEmit`, `runtime.EventsOn`)
  - Wails v2 dialogs (`runtime.OpenDirectoryDialog`)
  - Vite HMR pour `wails dev`
  - shadcn/ui CLI conventions (composants copiés dans
    `frontend/src/components/ui/`)

## Risques et points d'attention

- **Webview2 absent sur Windows < 1803** *(prob. faible, impact moyen)*.
  Win 10 RTM/1507 n'a pas Webview2. **Mitigation** : doc d'install Webview2
  Bootstrapper + bouton "Install Webview2" dans un futur installer .msi
  (post-MVP). En attendant : message d'erreur clair au lancement.
- **WebKit2GTK 4.0 vs 4.1 sur Linux récents** *(prob. moyenne, impact moyen)*.
  Ubuntu 24.04+ et Fedora 40+ basculent sur 4.1, breaking change. Wails
  v2.10+ supporte les deux via flag de build. **Mitigation** :
  documenter l'install par distro, valider en CI Ubuntu 22.04 et 24.04.
- **CGO + cross-compile** *(prob. moyenne, impact moyen)*. Cross-compile
  Windows depuis Linux nécessite `mingw-w64`. **Mitigation** : on ne
  cross-compile pas — on build **natif sur chaque OS** via la matrix CI.
  Releases : 3 jobs CI parallèles, 3 binaires uploadés.
- **Couplage `workflow → uiapp` involontaire** *(prob. faible, impact
  moyen)*. Si on injecte un type concret au lieu de l'interface
  `Progress`, les tests workflow se tordent. **Mitigation** : lint /
  revue stricte sur l'import graph (interdit `internal/workflow` →
  `internal/uiapp`).
- **Build size 5 MB → 12-15 MB** *(prob. haute, impact faible)*. Acceptable
  pour une desktop app. **Mitigation** : `upx` compression (`wails build
  -upx`) en releases si besoin.
- **Defender SmartScreen sans signing** *(prob. haute Windows, impact
  moyen)*. Premier `.exe` non signé déclenche un warning. **Mitigation** :
  OPS-001 (signing post-MVP, ajouté au TODO). Doc de contournement
  utilisateur ("More info → Run anyway").
- **`wails dev` flaky avec AV Windows** *(prob. moyenne, impact faible)*.
  Le watcher rebuild Go fréquemment dans `.gocache` → AV peut bloquer
  le fork/exec (cf. CORE-001). **Mitigation** : TICKET IT (déjà au TODO),
  WSL en alternative.
- **Versions React/Tailwind churn** *(prob. moyenne, impact faible)*.
  React 19 / Tailwind v4 introduisent des breaking changes. **Mitigation** :
  pin majeurs dans `package.json`, dependabot pour les minors.
- **Cancellation lors de fermeture de fenêtre pendant `RunStory`** *(prob.
  faible, impact moyen)*. L'utilisateur ferme la fenêtre, le subprocess
  `claude` peut leaker. **Mitigation** : `context.WithCancel` détenu par
  l'`App`, annulé sur le hook `OnShutdown` Wails ; `workflow.RunStory`
  propage déjà le `ctx`.
- **NextID race entre CLI et UI ouverts en parallèle** *(prob. faible,
  impact moyen)*. Deux appels `NextID` sur le même prefix peuvent retourner
  le même id, l'atomic rename d'un des deux gagne, l'autre échoue silencieusement.
  **Mitigation** : retry-on-conflict dans `artifacts.Writer.Write` (déjà
  en partie : tmp file unique par PID, mais pas le `final` path). À
  considérer pour un futur fix.
- **Hub liste vide / dossier sans `spdd/`** *(prob. haute, impact faible)*.
  L'utilisateur sélectionne un dossier neuf. **Mitigation** : "empty
  state" UI avec bouton *Initialize SPDD here* qui crée
  `spdd/{stories,analysis,prompts,tests}/` + copie templates depuis
  `embed.FS`. (Optionnel UI-001, peut être un AC bonus.)

## Cas limites identifiés

- Project picker annulé (l'utilisateur ferme le dialog sans choisir) →
  rester sur l'écran de sélection ou afficher un état "no project".
- Sélection du dossier root du repo yukki lui-même → doit fonctionner
  (eat your own dog food : on liste les vraies stories yukki).
- `*.md` corrompus / frontmatter manquant dans `spdd/stories/` →
  skip silencieusement avec un log warn, ou afficher dans le hub avec
  un badge "invalid" ?
- Très grand nombre de stories (>1000) → perf de la liste ; recommandation :
  virtual scrolling via `react-virtual` quand on dépassera 200 entrées
  (post-MVP, pas en V1).
- Path Windows avec espaces (`C:\Mon Projet\yukki-test`) ou caractères
  spéciaux → tester via integration test Go.
- Path UNC `\\server\share\project` → tester ; rare mais possible en
  enterprise.
- Mode `wails dev` : `claude` doit être trouvé via le shell de l'IDE,
  pas via le PATH embed du binaire. Vérifier que `exec.LookPath("claude")`
  fonctionne dans les deux modes.
- Modal *New Story* fermé pendant l'appel Claude → cancel via
  `context.WithCancel`, vérifier que le subprocess `claude` reçoit bien
  `SIGTERM` ou équivalent.
- Multiple instances de `yukki ui` ouvertes sur le même projet →
  écritures concurrentes sur le même `id` (cf. risque NextID race).
- Fenêtre minimisée pendant `RunStory` → EventsEmit doit fonctionner
  même hors-focus (Wails le garantit).
- Stories avec frontmatter en plusieurs langues (mots-clés étrangers,
  emojis dans le titre) → yaml.v3 supporte UTF-8 nativement.
- Hub onglet *Tests* sans aucun fichier `.md` (les tests ne sont pas
  toujours sous `spdd/tests/` mais sous `tests/`) → clarifier le contrat
  "kind" : on liste seulement `spdd/<kind>/*.md`, pas le code de test.

## Decisions à prendre avant le canvas

> Recommandations en italique. À valider/contester en revue ; si
> acceptées, le canvas REASONS les inscrira en Norms / Approach.

- [ ] **D1 — Layout du package UI Go**.
  *(Reco : `internal/uiapp` — testable en isolation, pas exposé dans
  l'API publique du module Go.)*
- [ ] **D2 — Localisation de `ListArtifacts`**.
  *(Reco : `internal/artifacts/lister.go` — cohérent avec où vit déjà
  `ValidateFrontmatter`. Pas de nouveau package juste pour ça.)*
- [ ] **D3 — Forme de `workflow.Progress`**.
  *(Reco : interface 2 méthodes `Start(label string)` / `End(err error)`.
  Nullable dans `StoryOptions`, fallback `noopProgress`. KISS, on
  enrichira en UI-005 pour le streaming token-par-token.)*
- [ ] **D4 — Build tags `dev` / `mock`**.
  *(Reco : tag `mock` qui injecte `MockProvider` ; tag absent = `NewClaude`.
  Évite un flag CLI runtime qui pourrait être utilisé en prod par erreur.)*
- [ ] **D5 — Stratégie cancellation à la fermeture de fenêtre**.
  *(Reco : `context.WithCancel` détenu par `App`, annulé dans
  `OnShutdown` Wails ; logger un warn si une opération est annulée
  brutalement.)*
- [ ] **D6 — Strategy fenêtre vide / dossier sans `spdd/`**.
  *(Reco : empty state + bouton *Initialize SPDD here* qui crée la
  structure de répertoires + copie templates. AC bonus AC9 (à ajouter
  à la story si on accepte).)*
- [ ] **D7 — Refresh hub : manuel vs fsnotify**.
  *(cf. OQ1 story ; reco : bouton manuel + refresh implicite après
  chaque action UI. fsnotify = UI-005.)*
- [ ] **D8 — Layout principal : sidebar dès V1**.
  *(cf. OQ2 story ; reco : sidebar permanente, scalable pour
  Tests/Methodology refs/Settings sans re-architecture.)*
- [ ] **D9 — Component lib**.
  *(cf. OQ3 ; reco : shadcn/ui — copy-paste, zéro runtime dep,
  ownership totale du code.)*
- [ ] **D10 — Routing**.
  *(cf. OQ4 ; reco : state-only via Zustand pour V1. React Router quand
  on attaquera un mode `--web` partagé via URL.)*
- [ ] **D11 — Vérification Claude au démarrage : sync vs async**.
  *(cf. OQ5 ; reco : async — on charge le hub immédiatement, le banner
  apparaît après ~200-500ms si Claude absent.)*
- [ ] **D12 — Provider injection dans `App`**.
  *(cf. OQ6 ; reco : injection via `NewApp(deps)`. Permet MockProvider
  en `wails dev` et test Go en mémoire.)*
- [ ] **D13 — Distribution non signée Windows**.
  *(cf. OQ7 ; reco : doc de contournement en V1, signing = OPS-001
  post-MVP.)*
- [ ] **D14 — Sizing INVEST**.
  *(cf. OQ8 ; reco : monolithique 4j est borderline mais acceptable.
  Si on doit gagner du temps : retirer AC7 (cohérence CLI-UI peut être
  testée à la main pour V1 et formalisée en UI-005 avec fsnotify) →
  ramène à ~3.5j.)*
- [ ] **D15 — CI multi-OS**.
  *(Reco : matrix 3 OS, install Wails CLI à chaque run via `go install`,
  cache `actions/cache@v4` sur `~/go/pkg/mod` et `~/.cache/go-build`.
  Pas de cross-compile.)*
- [ ] **D16 — Tests UI front en V1 ?**
  *(Reco : non, on s'appuie uniquement sur les tests Go des bindings +
  tests manuels via `wails dev`. Playwright/Cypress = post-MVP quand
  l'UI sera stable.)*
