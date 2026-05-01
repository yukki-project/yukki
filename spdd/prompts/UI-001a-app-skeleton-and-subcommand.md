---
id: UI-001a
slug: app-skeleton-and-subcommand
story: spdd/stories/UI-001a-app-skeleton-and-subcommand.md
analysis: spdd/analysis/UI-001a-app-skeleton-and-subcommand.md
family-analysis: spdd/analysis/UI-001-init-desktop-app-wails-react.md
status: implemented
created: 2026-05-01
updated: 2026-05-01
---

# Canvas REASONS — App skeleton & sub-cmd `yukki ui`

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> 1ère story fille de la famille UI-001 (split SPIDR axe **I**). Cette
> story ne livre **aucune feature utilisateur** ; elle pose le scaffold
> Wails + frontend + CI sur lequel UI-001b (hub viewer) et UI-001c
> (new story flow) construiront.
>
> ## Changelog
>
> - **v1 — 2026-05-01** : canvas initial (8 Operations, status `draft`).
> - **v2 — 2026-05-01** : déviation pendant `/spdd-generate`. Wails v2
>   exige que le package `main` (et donc `main.go`) vive **à la racine
>   du repo** (à côté de `wails.json`) — son générateur de bindings
>   TypeScript scanne ce dossier et plante avec
>   `no Go files in C:\workspace\yukki` si le main est sous `cmd/yukki/`.
>   Tous les fichiers package main ont migré : `cmd/yukki/{main,ui,
>   ui_mock,ui_prod,*_test}.go` → racine. `internal/uiapp/`,
>   `frontend/`, `wails.json` inchangés. Tests `ui_mock_test.go` /
>   `ui_prod_test.go` toujours OK (Invariant I1 préservé). E2E test
>   ajusté : `go build "./cmd/yukki"` → `go build "."`. CI step
>   `unit-tests` mock-tagged : `./cmd/yukki/...` → `.`. Status passé
>   `draft → implemented` après validation locale (6/6 uiapp + 2/2
>   build-tag dual + workflow/templates/clilog/integration verts).

---

## R — Requirements

### Problème

`yukki` n'a aujourd'hui qu'une CLI (CORE-001). Pour engager l'app
desktop sans tout livrer en une seule story massive, on pose
maintenant **uniquement** la fondation Wails v2 + frontend
React/TS/Vite/Tailwind/shadcn, exposée via la sous-cmd `yukki ui`.
Un smoke test `Greet()` valide que les 4 ponts critiques fonctionnent
(Cobra → `wails.Run` → frontend rendu → binding Go round-trip).

### Definition of Done

- [ ] Le binaire `yukki` buildé via `wails build` ouvre une fenêtre
      native quand on tape `yukki ui` (titre `yukki`, taille 1280×800,
      placeholder React)
- [ ] Le bouton *Greet* du placeholder appelle `App.Greet()` via les
      bindings auto-générés et affiche `"hello from yukki backend"`
- [ ] Build tag `mock` swap `provider.NewClaude` pour `MockProvider`
      sans changer la signature `newProvider()` ni le code de `App`
- [ ] La sous-cmd `yukki story` reste fonctionnelle, aucun test e2e
      existant ne casse
- [ ] Job CI `ui-build` matrix Linux/macOS/Windows passe au vert via
      `wails build -platform <os>`, dépendant de `static-checks`
- [ ] `frontend/node_modules/`, `frontend/dist/`, `frontend/wailsjs/`,
      `build/bin/` sont gitignorés
- [ ] `DEVELOPMENT.md` documente `wails dev`, `wails build`, prereqs
      (Node 20+, Wails CLI, libwebkit2gtk-4.0-dev sur Linux), build
      tags `mock` vs prod
- [ ] Tests Go unit sur `internal/uiapp.NewApp` + `App.Greet` + tests
      build-tag dual (`ui_mock_test.go` / `ui_prod_test.go`) au vert

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `App` (struct Go, `internal/uiapp`) | Porteur du contexte Wails, du logger, du provider injecté | `ctx context.Context`, `logger *slog.Logger`, `provider provider.Provider`, hooks `OnStartup(ctx)` / `OnShutdown(ctx)`, méthode bindée `Greet() string` | unique par invocation `yukki ui`, vit le temps de la fenêtre |
| `Frontend bundle` (artefact, pas réifié en Go) | Build Vite produit `frontend/dist/` consommé par Wails embed | `index.html`, `assets/*.js`, `assets/*.css` | reconstruit à chaque `wails build` ou `wails dev` |
| `Wails bindings` (artefact auto-généré) | Fichiers TS générés par Wails dans `frontend/wailsjs/go/main/` | `App.ts` (méthode `Greet`) + `runtime.ts` | régénérés à chaque build, jamais commités |

### Value Objects

| Nom | Description | Type |
|---|---|---|
| `BuildTag` | `mock` ou défaut prod (sans tag) — choix du provider | conditionnel compile-time |
| `WindowOptions` | Titre, dimensions, redimensionnement, frameless | `wails/v2/pkg/options.App` (struct externe) |

### Invariants UI-001a

- **I1** — Le binaire prod (sans tag `mock`) **n'embarque pas** le
  type `*provider.MockProvider`. Vérifiable par test build-tag dual.
- **I2** — `App.Greet()` ne dépend d'aucun état (stateless) :
  appelable N fois en parallèle sans race.
- **I3** — `frontend/wailsjs/` est régénéré à chaque build — son
  contenu n'est **jamais** committé.
- **I4** — Aucune signature publique du package `internal/workflow`,
  `internal/provider`, `internal/templates`, `internal/artifacts` ne
  change. UI-001a est purement additif côté Go existant.

### Integration points

- **Wails v2 runtime** — `wails.Run(opts)` dans `ui.go (racine)`,
  fenêtre native gérée par Wails (Webview2 sur Windows, WebKit sur
  macOS/Linux)
- **Cobra** — `newUICmd()` enregistré dans `newRootCmd()` à côté du
  `newStoryCmd()` existant
- **Vite** — pendant `wails dev`, Vite tourne en HMR mode et Wails
  proxy vers son port (5173 par défaut)
- **`exec.LookPath`** — `provider.NewClaude` continue d'utiliser
  `claude` du PATH ; injecté via `newProvider()` dans UI-001a,
  effectivement utilisé en UI-001c

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **poser une fondation desktop sans
> régression sur la CLI ni explosion de scope**, on choisit
> **Wails v2 (Go backend + WebView frontend) accessible via une
> sous-commande Cobra `yukki ui`, avec un build tag `mock` pour la
> DI provider et un job CI matrix qui valide la compile sur 3 OS**,
> plutôt que de **livrer hub + canvas + new story flow en une seule
> story** ou **forker en deux binaires distincts**, pour atteindre
> **time-to-first-window minimal, vérification incrémentale du
> packaging cross-platform, et amortissement du scaffold sur les 2
> stories filles suivantes**, en acceptant **une fenêtre placeholder
> sans valeur utilisateur en V1.5 et l'ajout de ~15-20 dépendances
> Go transitives Wails**.

### Décisions d'architecture (déjà tranchées par l'analyse de famille D1-D16 et le delta D-A1 à D-A9)

- **D1 / `internal/uiapp`** comme home du package App.
- **D4 / Build tags `mock` (présent) / `!mock` (absent)** : factory
  `newProvider()` dans `ui_mock.go (racine)` + `ui_prod.go`. Pas de
  flag CLI, pas d'env var.
- **D9 / shadcn/ui** comme component lib (CLI init, copy-paste dans
  `frontend/src/components/ui/`).
- **D-A2 / `npm`** comme package manager frontend.
- **D-A3 / TypeScript strict mode** ON dans `tsconfig.json`.
- **D-A5 / CI caching** via `actions/cache@v4` sur `~/go/pkg/mod`,
  `~/.cache/go-build`, `frontend/node_modules`.
- **D-A7 / `ui.go (racine)`** (pas `cmd_ui.go`).
- **D-A9 / Erreur Wails sans display** mappée vers `exitIO` (3) via
  `mapErrorToExitCode`.

### Alternatives écartées

- **Deux binaires séparés `yukki` + `yukki-ui`** — packaging double,
  duplication de la `main()`, friction utilisateur "lequel installer
  pour quoi". Q2 utilisateur retenue : un binaire, sous-cmd.
- **Fyne / Gio / Tauri / Electron** — Fyne et Gio limitent le canvas
  graphique futur (UI-002 React Flow). Tauri imposerait un rewrite
  Rust côté backend. Electron alourdit le binaire (~120 MB vs ~12 MB
  Wails) et impose Node runtime.
- **Storybook ou Ladle pour développer les composants en iso** —
  utile mais pas nécessaire au skeleton ; à ouvrir si l'UI grossit
  significativement.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `cmd/yukki` | `ui.go` (nouveau), `ui_mock.go` (nouveau, build tag `mock`), `ui_prod.go` (nouveau, build tag `!mock`) | création |
| `internal/uiapp` | `app.go` (nouveau), `app_test.go` (nouveau) | création package complet |
| `frontend/` | `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `components.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/lib/utils.ts`, `src/components/ui/{button,card}.tsx`, `src/styles/globals.css` | création projet Vite complet |
| racine | `wails.json` (nouveau) | création |
| `.github/workflows/ci.yml` | ajout du job `ui-build` matrix 3 OS | modification |
| `.gitignore` | + `frontend/node_modules/`, `frontend/dist/`, `frontend/wailsjs/`, `build/bin/` | modification |
| `go.mod` / `go.sum` | + `github.com/wailsapp/wails/v2` (~15-20 deps transitives) | modification |
| `DEVELOPMENT.md` | nouvelle section *"Développer l'UI"* | modification |

### Schéma de flux — sous-cmd `yukki ui`

```
$ yukki ui
       │
       ▼
┌──────────────────────────┐
│ cmd/yukki/main.go        │
│   newRootCmd()           │
│     ├─ story  (CORE-001) │
│     └─ ui     (UI-001a) ◄┼── newUICmd()
└────────────┬─────────────┘
             │
             ▼ RunE
┌──────────────────────────────────────┐
│ ui.go (racine)                      │
│   provider := newProvider(logger) ◄──┼── ui_mock.go OU ui_prod.go
│   app := uiapp.NewApp(provider, log) │   (selon build tag)
│   wails.Run(options.App{             │
│     Title: "yukki",                  │
│     Width: 1280, Height: 800,        │
│     Bind: []any{app},                │
│     OnStartup: app.OnStartup,        │
│     OnShutdown: app.OnShutdown,      │
│   })                                 │
└────────────┬─────────────────────────┘
             │ blocks until window close
             ▼
┌─────────────────────────────────┐
│ Webview native + frontend/dist  │
│   App.tsx ──► (click "Greet")   │
│   wailsjs/go/main/App.ts        │
│   .Greet() ─bindings──► Go      │
│                ▲                │
│                └ "hello from..." │
└─────────────────────────────────┘
```

---

## O — Operations

> Ordre d'exécution explicite. Chaque Operation est testable et
> indépendamment livrable au sein de la story.

### O1 — Sous-commande Cobra `ui`

- **Module** : `cmd/yukki`
- **Fichier** : `ui.go (racine)` (nouveau)
- **Signature** :
  ```go
  func newUICmd() *cobra.Command
  ```
  Le `RunE` appelle `wails.Run(opts)` avec :
  ```go
  wailsOpts := &options.App{
      Title:  "yukki",
      Width:  1280,
      Height: 800,
      OnStartup:  app.OnStartup,
      OnShutdown: app.OnShutdown,
      Bind:       []any{app},
      AssetServer: &assetserver.Options{Assets: assets}, // embed.FS
  }
  if err := wails.Run(wailsOpts); err != nil { return fmt.Errorf("wails: %w", err) }
  ```
- **Comportement** :
  1. Lit les flags persistents `--verbose`, `--log-format` (hérités de root).
  2. Construit un `*slog.Logger` via `clilog.New(format, verbose)`.
  3. Appelle `newProvider(logger)` — résolu par build tag.
  4. Construit `app := uiapp.NewApp(provider, logger)`.
  5. Charge l'`embed.FS` du frontend depuis `cmd/yukki/frontend.go`
     (généré par Wails) ou via une déclaration `//go:embed frontend/dist`.
  6. Appelle `wails.Run` ; blocks jusqu'à fermeture de fenêtre.
  7. Si `wails.Run` retourne une erreur (e.g. pas de display) →
     wrap en erreur Go classique, mappée par `mapErrorToExitCode`
     vers `exitIO` (3).
- **`newRootCmd()` modifié** ([cmd/yukki/main.go:52](../../cmd/yukki/main.go#L52)) :
  ajouter `root.AddCommand(newUICmd())`.
- **Tests** : pas de test unitaire direct de `newUICmd` (couplage
  fort à `wails.Run` qui ouvre une fenêtre). Validation via AC1 / AC5
  manuelle + CI build.

### O2 — Factory provider build-tagged

- **Module** : `cmd/yukki`
- **Fichiers** : `ui_mock.go (racine)` (nouveau, build tag `mock`),
  `ui_prod.go (racine)` (nouveau, build tag `!mock`)
- **Signature** (identique dans les deux fichiers) :
  ```go
  func newProvider(logger *slog.Logger) provider.Provider
  ```
- **Comportement** :
  - `ui_mock.go` retourne `&provider.MockProvider{NameVal: "mock"}`
    avec une réponse stub par défaut (vide pour UI-001a, sera
    surchargée en UI-001c).
  - `ui_prod.go` retourne `provider.NewClaude(logger)`.
- **Build tags exacts** :
  ```go
  //go:build mock
  // +build mock
  ```
  et inversement `!mock`.
- **Tests** : voir O8 (tests build-tag dual).

### O3 — Struct App + smoke test Greet

- **Module** : `internal/uiapp` (nouveau package)
- **Fichier** : `internal/uiapp/app.go`
- **Signature** :
  ```go
  package uiapp

  type App struct {
      ctx      context.Context
      cancel   context.CancelFunc
      logger   *slog.Logger
      provider provider.Provider
  }

  func NewApp(p provider.Provider, logger *slog.Logger) *App
  func (a *App) OnStartup(ctx context.Context)
  func (a *App) OnShutdown(ctx context.Context)
  func (a *App) Greet() string
  ```
- **Comportement** :
  - `NewApp` retourne `&App{logger: logger, provider: p}` (pas de
    ctx ici, posé par `OnStartup`).
  - `OnStartup(ctx)` : crée un `context.WithCancel` à partir de `ctx`,
    stocke `a.ctx` et `a.cancel`. Logge `"ui startup"`.
  - `OnShutdown(ctx)` : appelle `a.cancel()` si non nil. Logge
    `"ui shutdown"`. (Cancel fera son office en UI-001c quand des
    opérations long-running tourneront.)
  - `Greet()` : retourne la string littérale
    `"hello from yukki backend"`. **Stateless**, pas d'accès
    `a.provider` ni `a.ctx`.
- **Tests** :
  - `TestNewApp_AssignsDeps` : assert `app.provider` et `app.logger`
    sont les valeurs passées.
  - `TestApp_Greet_ReturnsLiteral` : assert `app.Greet() ==
    "hello from yukki backend"`.
  - `TestApp_OnStartup_StoresContext` : `OnStartup(parent)` puis
    vérifier que `app.ctx.Done()` n'est pas fermé, puis `OnShutdown`
    et vérifier que `app.ctx.Done()` est fermé (`<-app.ctx.Done()`
    avec timeout court).
  - `TestApp_Greet_Concurrent` : 100 goroutines appellent `Greet()`
    en parallèle, aucune race (vérifié avec `-race`).

### O4 — Wails config + frontend scaffold (Vite + React + TS + Tailwind + shadcn)

- **Module** : racine + `frontend/`
- **Fichiers nouveaux** :
  - `wails.json` à la racine
  - `frontend/package.json`
  - `frontend/tsconfig.json` (`strict: true`)
  - `frontend/vite.config.ts`
  - `frontend/tailwind.config.js`
  - `frontend/postcss.config.js`
  - `frontend/components.json` (config shadcn)
  - `frontend/index.html`
- **Comportement** :
  - `wails.json` :
    ```json
    {
      "name": "yukki",
      "outputfilename": "yukki",
      "frontend:install": "npm install",
      "frontend:build": "npm run build",
      "frontend:dev:watcher": "npm run dev",
      "frontend:dev:serverUrl": "auto",
      "wailsjsdir": "./frontend/wailsjs"
    }
    ```
  - `frontend/package.json` (extrait) :
    ```json
    {
      "name": "yukki-frontend",
      "private": true,
      "type": "module",
      "scripts": { "dev": "vite", "build": "tsc -b && vite build" },
      "dependencies": {
        "react": "^18", "react-dom": "^18",
        "zustand": "^4", "clsx": "^2", "tailwind-merge": "^2",
        "lucide-react": "^0.x"
      },
      "devDependencies": {
        "@types/react": "^18", "@types/react-dom": "^18",
        "typescript": "^5", "vite": "^5", "@vitejs/plugin-react": "^4",
        "tailwindcss": "^3", "postcss": "^8", "autoprefixer": "^10"
      }
    }
    ```
  - `tsconfig.json` : `"strict": true`, `"jsx": "react-jsx"`,
    `"target": "ES2022"`, `"moduleResolution": "Bundler"`.
  - shadcn/ui : `components.json` avec `style: default`, alias
    `@/components`, `@/lib`. Composants `button` et `card` initialisés
    via `npx shadcn-ui@latest add button card` (mais checked-in
    statiquement dans le commit, pas généré au build).
- **Tests** : aucun test Go ; validation via `npm run build` qui
  doit produire `frontend/dist/` sans erreur (vérifié par CI).

### O5 — Frontend placeholder (App.tsx + smoke test Greet button)

- **Module** : `frontend/src/`
- **Fichiers nouveaux** :
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/lib/utils.ts` (cn() de shadcn)
  - `frontend/src/components/ui/button.tsx` (shadcn primitive)
  - `frontend/src/components/ui/card.tsx` (shadcn primitive)
  - `frontend/src/styles/globals.css` (Tailwind directives + theme)
- **Comportement de `App.tsx`** :
  ```tsx
  import { useState } from 'react';
  import { Greet } from '../wailsjs/go/main/App';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent } from '@/components/ui/card';

  export default function App() {
    const [greeting, setGreeting] = useState<string>('');
    async function handleGreet() {
      setGreeting(await Greet());
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-2xl font-bold">yukki — placeholder</h1>
            <p className="text-sm text-muted-foreground">
              UI-001b coming next.
            </p>
            <Button onClick={handleGreet}>Greet</Button>
            {greeting && <p data-testid="greeting">{greeting}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }
  ```
- **Tests** : pas de tests UI front en V1 (D-A4 / D16) ; validé
  manuellement via AC2 et `wails dev`.

### O6 — CI job `ui-build` matrix 3 OS

- **Module** : `.github/workflows/ci.yml`
- **Fichier** : modification
- **Nature du changement** : ajout d'un job après `e2e-tests`
- **Pseudo-yaml** :
  ```yaml
  ui-build:
    name: ui build (${{ matrix.os }})
    needs: static-checks
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22', cache: true }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: install webkit2gtk (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.0-dev
      - name: install Wails CLI
        run: go install github.com/wailsapp/wails/v2/cmd/wails@<pinned-version>
        shell: bash
      - name: cache npm
        uses: actions/cache@v4
        with:
          path: frontend/node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('frontend/package-lock.json') }}
      - name: wails build
        run: wails build -platform <auto> -o yukki-ui
        shell: bash
      - uses: actions/upload-artifact@v4
        with:
          name: yukki-ui-${{ matrix.os }}
          path: build/bin/yukki-ui*
  ```
- **Tests** : le job lui-même est le test (vert ↔ AC5).

### O7 — `.gitignore` + `DEVELOPMENT.md`

- **Module** : racine
- **Fichiers** : `.gitignore` (modification), `DEVELOPMENT.md`
  (modification)
- **`.gitignore`** : ajouter
  ```
  # Wails / frontend artefacts
  /frontend/node_modules/
  /frontend/dist/
  /frontend/wailsjs/
  /build/bin/
  ```
- **`DEVELOPMENT.md`** : nouvelle section *"Dev de l'UI"* après la
  section *"CI"* :
  - Prereqs : Node 20+, Wails CLI, libwebkit2gtk-4.0-dev (Linux)
  - `wails dev` : commande de dev avec HMR. Mention WSL en
    workaround si AV bloque sur Windows (cf. TICKET IT au TODO).
  - `wails build` : build prod cross-platform.
  - Build tags `mock` vs prod : `wails dev -tags mock` pour
    développer le frontend sans Claude installé.
- **Tests** : aucun.

### O8 — Tests Go unit + tests build-tag dual

- **Module** : `internal/uiapp`, `cmd/yukki`
- **Fichiers** :
  - `internal/uiapp/app_test.go` (nouveau)
  - `cmd/yukki/ui_mock_test.go` (nouveau, build tag `mock`)
  - `cmd/yukki/ui_prod_test.go` (nouveau, build tag `!mock`)
- **Signatures** :
  ```go
  // internal/uiapp/app_test.go
  func TestNewApp_AssignsDeps(t *testing.T)
  func TestApp_Greet_ReturnsLiteral(t *testing.T)
  func TestApp_OnStartup_StoresContext(t *testing.T)
  func TestApp_OnShutdown_CancelsContext(t *testing.T)
  func TestApp_Greet_Concurrent(t *testing.T)

  // cmd/yukki/ui_mock_test.go (//go:build mock)
  func TestNewProvider_ReturnsMockUnderMockTag(t *testing.T)

  // cmd/yukki/ui_prod_test.go (//go:build !mock)
  func TestNewProvider_ReturnsClaudeWithoutMockTag(t *testing.T)
  ```
- **Comportement des tests build-tag** :
  - `ui_mock_test.go` : assert via type-switch ou
    `reflect.TypeOf(p).String() == "*provider.MockProvider"`.
  - `ui_prod_test.go` : assert
    `reflect.TypeOf(p).String() == "*provider.ClaudeProvider"`.
- **Exécution CI** : le job `unit-tests` doit lancer les tests sans
  tag (couvre `ui_prod_test.go`) **et** avec `-tags mock` (couvre
  `ui_mock_test.go`). Ajouter une seconde étape au job `unit-tests`
  ou un nouveau micro-job `unit-tests-mock`.

---

## N — Norms

> Standards transversaux à respecter dans cette story.

- **Logging Go** : `log/slog` via `clilog.New` injecté dans `App`.
  Pas de `fmt.Println`, pas de `log` package legacy. Logs
  user-facing seulement quand pertinent (`OnStartup`, `OnShutdown`),
  pas un log par méthode bindée.
- **Nommage Go** : `cmd/yukki/ui*.go` pour la sous-cmd ; package
  `internal/uiapp` ; struct `App` ; méthode `Greet` (PascalCase
  obligatoire pour les bindings Wails). Tests : `Test<Func>_<Case>`.
- **Build tags** : `//go:build mock` (Go 1.17+), conserver aussi la
  ligne `// +build mock` pour la compat outillage. Idem `!mock`.
- **TypeScript** : `"strict": true`, pas d'`any` non documenté.
  Components fonction uniquement, pas de class. Hooks pour l'état.
  Imports absolus via alias `@/...` (configuré dans `tsconfig.json`
  + `vite.config.ts`).
- **Tailwind** : pas d'arbitrary values (`bg-[#abc]`) en V1 — sticker
  à la palette par défaut. Si un design token spécifique est requis,
  ajouter à `tailwind.config.js`.
- **shadcn/ui** : composants copy-paste dans
  `frontend/src/components/ui/`. **Ne pas modifier** les primitives
  Radix sous-jacentes ; modifier uniquement le wrapper local.
- **Tests Go** : `-race` enabled. Coverage attendue ≥ 70 % sur
  `internal/uiapp` (équivalent CORE-001 sur les autres internal/).
- **CI** : tous les nouveaux steps utilisent `shell: bash` (cf. fix
  CORE-001 sur PowerShell parsing). Aucun cross-compile : build natif
  par OS.
- **Docs** : `DEVELOPMENT.md` est la cible documentaire ;
  `README.md` racine non-modifié (DOC-001 dédiée).
- **Commits** : Conventional Commits, `feat(ui)` pour les nouveaux
  fichiers, `chore(ci)` pour le job, `docs` pour DEVELOPMENT.md.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Aucune régression CLI**
  - Les tests existants `tests/e2e/`, `tests/integration/`,
    `internal/.../*_test.go` doivent **tous** continuer à passer
    sans modification.
  - Aucun changement de signature publique dans `internal/workflow`,
    `internal/provider`, `internal/templates`, `internal/artifacts`.
- **Étanchéité du build prod**
  - Le binaire buildé sans tag `mock` **ne contient pas** le type
    `*provider.MockProvider`. Test `ui_prod_test.go` est la garantie.
  - Le binaire buildé avec tag `mock` est explicitement non-prod ;
    documenté dans `DEVELOPMENT.md`.
- **Étanchéité du périmètre UI-001a**
  - Pas d'appel à `provider.Generate` depuis l'UI en UI-001a.
    `Greet()` est une string littérale, le provider est juste *câblé*
    pour préparer UI-001c.
  - Pas de feature *project picker*, *hub list*, *new story modal*
    en UI-001a — ces ajouts en UI-001a déclencheraient un rejet de
    revue (scope creep).
- **Anti-fuite de credentials / paths**
  - `wails.json` ne contient **aucun** secret, aucun path absolu
    machine-spécifique. Tous les paths sont relatifs.
  - `frontend/wailsjs/` ne sera **jamais** committée (gitignored).
- **Sécurité runtime**
  - Pas d'exposition de méthode bindée non-intentionnelle : seules
    les méthodes de `App` qui retournent des types serializables JSON
    sont bindées par Wails. `Greet()` retourne `string` — OK.
  - Pas d'eval / exec arbitraire côté frontend.
- **Concurrence**
  - `App.Greet()` reste stateless (Invariant I2). Toute évolution qui
    introduirait un état partagé déclenche un *prompt-update* avant
    génération.
- **Compatibilité plate-forme**
  - `wails build` doit fonctionner sur Linux / macOS / Windows. Si
    une plate-forme nécessite un workaround spécifique, il est
    documenté dans `DEVELOPMENT.md`, **pas** caché en condition
    sournoise dans le code Go.
  - Pas de cross-compile depuis Linux vers Windows en V1 — uniquement
    `wails build` natif via la matrix CI.
- **Périmètre méthodologique**
  - Aucune lib UI externe au-delà du choix figé : pas de
    `fatih/color`, pas de `mattn/go-isatty`, pas de framework UI
    full-screen Bubble Tea (réservé à un éventuel futur mode TUI
    qui n'est pas dans la roadmap).
- **Versions épinglées**
  - Wails v2 pinné à une version stable connue (D-A1, à valider en
    revue avant générer). Pas de `latest`.
  - React 18.x, TypeScript 5.x, Vite 5.x, Tailwind 3.x : pinned
    majeurs, dependabot pour les minors.
