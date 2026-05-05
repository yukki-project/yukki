# DEVELOPMENT.md

Guide rapide pour développer `yukki` en local. Pour la méthodologie SPDD,
voir [`.yukki/README.md`](.yukki/README.md) et
[`.yukki/GUIDE.md`](.yukki/GUIDE.md). Pour la roadmap, voir
[`TODO.md`](TODO.md).

## Stack

### Backend Go
- **Go 1.22+** (le module est `github.com/yukki-project/yukki`)
- **Cobra** v1.8.0 pour la CLI
- **gopkg.in/yaml.v3** pour la validation de frontmatter
- **Wails v2.12.0** pour la sous-cmd `yukki ui` (UI-001a)

### Frontend (sous `frontend/`)
- **React 18** + **TypeScript 5** (strict mode) + **Vite 5**
- **Tailwind CSS 3** + **shadcn/ui** (composants copy-paste dans `frontend/src/components/ui/`)
- **Zustand** (state) + **lucide-react** (icônes)
- Aucune lib UI lourde (pas de Material, pas de Bubble Tea — cf. canvas UI-001a Safeguards)

## Architecture

yukki est composé d'**un cœur métier** (4 packages internes) et de
**3 surfaces de consommation** :

```
┌─────────────────────────────────────────────────┐
│  Surfaces de consommation                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ CLI Cobra│  │ Wails UI │  │ MCP server   │   │
│  │ (root)   │  │ (uiapp)  │  │ (INT-002,    │   │
│  │          │  │          │  │  post-MVP)   │   │
│  └────┬─────┘  └─────┬────┘  └──────┬───────┘   │
│       └──────────┬───┴──────────────┘           │
│                  ▼                              │
│  ┌────────────────────────────────────────┐     │
│  │  Cœur métier (internal/)               │     │
│  │  - workflow   RunStory + Progress      │     │
│  │  - provider   Provider + Claude + Mock │     │
│  │  - templates  Loader                   │     │
│  │  - artifacts  NextID + Slug + Writer   │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

L'isolation du cœur (interdiction d'importer `cobra`, `wails` ou
`internal/uiapp`) est **enforcée statiquement** par
[.golangci.yml](.golangci.yml) — règle `depguard` `core-isolation`
configurée en allow-list strict (seuls la stdlib, `gopkg.in/yaml.v3`
et l'intra-cœur sont autorisés). Le job CI `static-checks` invoque
`golangci-lint` à chaque PR.

La 3ᵉ surface (serveur MCP, `INT-002`) n'est **pas livrée** —
préparée par CORE-002, à implémenter en post-MVP. Voir
[.yukki/stories/CORE-002-isolate-business-core.md](.yukki/stories/CORE-002-isolate-business-core.md).

## Build

```bash
go build .          # produit ./yukki(.exe) à la racine
go build ./...      # build tout (binaires + packages)
```

**Note layout** : le package `main` (entrée du binaire) vit **à la
racine du repo** (`main.go`, `ui.go`, etc.), pas dans `cmd/yukki/`.
Cette convention est imposée par Wails v2 dont le générateur de
bindings TypeScript scanne le dossier où vit `wails.json`.

## Tests

Le projet a **trois tiers de tests** :

| Tiers | Localisation | Contenu | Commande |
|---|---|---|---|
| **Unit** | `internal/<pkg>/*_test.go`, `main_test.go`, `ui_*_test.go` (racine) | un seul package, mocks aux frontières | `go test ./internal/... .` |
| **Integration** | `tests/integration/` | plusieurs packages internes collaborant, MockProvider, file system réel | `go test ./tests/integration/...` |
| **End-to-End (E2E)** | `tests/e2e/` | build + run du binaire `yukki` avec un faux `claude` | `go test ./tests/e2e/...` |

Lancement en une fois :

```bash
go test ./...
```

### Wrappers locaux (cache + tempdir dans le repo)

Sur Windows en environnement corporate, l'AV bloque souvent l'exécution
de binaires fraîchement compilés depuis `%TEMP%`. Pour garder tous les
artefacts de build dans le repo :

```bash
# Linux / macOS / WSL
scripts/dev/test-local.sh
scripts/dev/test-local.sh ./internal/clilog/...   # restreint

# Windows (cmd ou PowerShell)
scripts\dev\test-local.bat
scripts\dev\test-local.bat ./internal/clilog/...
```

Ces scripts pointent `GOCACHE=$(repo)/.gocache` et
`GOTMPDIR=$(repo)/.gotmp` (ignorés par Git). Cela ne **bypasse pas** l'AV
— mais ça localise tout au même endroit pour qu'une **seule exclusion**
suffise.

### Si l'AV bloque malgré tout (« Access is denied » sur fork/exec)

Trois contournements, par ordre de préférence :

1. **Demander à l'IT/admin** une exclusion Microsoft Defender (ou
   équivalent) pour le chemin du repo : `C:\workspace\yukki\` (ou son
   équivalent local). Une seule exclusion couvre cache, tempdir et
   binaires.
2. **Travailler depuis WSL** (Ubuntu / Debian sous Windows) : Linux
   subsystem échappe au scan Defender qui cible Win32. Cloner le repo
   sous WSL et utiliser les commandes Linux.
3. **Pousser tôt et laisser la CI valider** : les runners GitHub
   Actions (Linux / macOS / Windows VMs) n'ont pas cette restriction.
   La CI tourne les trois tiers en parallèle (cf.
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

### Couverture

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out      # rapport visuel
```

Cible SPDD pour les packages métier (`internal/`) : ≥ 70 %.

## Structure du repo

```
yukki/
├── main.go ui.go                    package main à la racine (Wails v2 exige
│                                    que le main package vive là où réside
│                                    wails.json) — CLI Cobra + sous-cmd `yukki ui`
├── ui_prod.go (default)             factory provider Claude
├── ui_mock.go (-tags mock)          factory provider Mock (dev)
├── main_test.go ui_*_test.go        tests unit + tests build-tag dual
├── internal/
│   ├── artifacts/                   id calculator + slug + writer
│   ├── clilog/                      slog text/JSON
│   ├── provider/                    Provider interface + Claude impl + Mock
│   ├── templates/                   loader project-first + embed.FS fallback
│   │   └── embedded/                copies des templates SPDD pour le binaire
│   ├── uiapp/                       App struct exposée à Wails (UI-001a)
│   └── workflow/                    StoryOptions + RunStory + structured prompt
├── frontend/                        projet Vite (React 18 + TS + Tailwind + shadcn)
│   ├── package.json tsconfig.json vite.config.ts
│   ├── tailwind.config.js postcss.config.js components.json
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx main.tsx
│   │   ├── components/ui/           primitives shadcn (button, card)
│   │   ├── lib/utils.ts             cn() helper
│   │   └── styles/globals.css       Tailwind + theme tokens
│   ├── dist/.gitkeep                placeholder pour //go:embed (CI sans wails build)
│   └── wailsjs/                     auto-généré (gitignored)
├── wails.json                       config Wails (build/dev hooks)
├── tests/
│   ├── integration/                 cross-package avec MockProvider
│   └── e2e/
│       ├── e2e_test.go              build + run subprocess
│       └── fakeclaude/              faux binaire claude
├── .yukki/                            artefacts SPDD versionnés (méthodologie)
│   ├── stories/ analysis/ prompts/ tests/
│   ├── methodology/                 7 refs (DDD, STRIDE, BVA, Y-Statement, INVEST, SPIDR, AC)
│   ├── templates/                   squelettes
│   ├── README.md                    référence opérationnelle
│   └── GUIDE.md                     synthèse pédagogique
├── scripts/dev/                     wrappers locaux (.sh + .bat)
├── .github/workflows/ci.yml         CI multi-OS, 5 jobs
├── CLAUDE.md                        guide pour agent IA
├── TODO.md                          backlog SPDD versionné
└── DEVELOPMENT.md                   ce fichier
```

## Convention de commit

Voir CLAUDE.md (sera extrait vers `.yukki/methodology/commits.md` via
**META-005**, cf. [`TODO.md`](TODO.md)). En résumé :

- `feat`, `fix`, `docs`, `chore`, `refactor`, `test` (Conventional Commits)
- Spécifiques SPDD : `prompt-update`, `generate`, `review`, `sync`
- Footer obligatoire si un agent contribue :
  ```
  Co-Authored-By: <Agent name> <noreply@anthropic.com>
  ```
- Pas de `--amend`, pas de `--no-verify` (interdits par convention)
- Messages multi-lignes via HEREDOC : voir l'historique git récent

## Développer l'UI (sous-cmd `yukki ui`, Wails v2)

### Prereqs

- **Node.js 20+** (pour Vite + npm)
- **Wails CLI** : `go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0`
- **Linux uniquement** : `sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev`
  (ou équivalent dnf/pacman). Sur Ubuntu < 24.04, utiliser
  `libwebkit2gtk-4.0-dev` à la place. Le build CI passe le tag
  `-tags webkit2_41` automatiquement quand il détecte un Ubuntu 24+.
- Windows / macOS : Webview2 / WebKit déjà inclus par l'OS

Vérifier l'install : `wails doctor` doit afficher tout en vert.

### Workflow

```bash
# Mode dev avec HMR (Vite recharge le frontend, Wails recompile le Go)
wails dev

# Mode dev sans Claude installé (build tag mock injecte MockProvider)
wails dev -tags mock

# Build prod (binaire dans build/bin/yukki-ui[.exe|.app])
wails build
wails build -platform linux/amd64           # ou darwin/universal, windows/amd64
```

### Wrapper local Wails (cache + tempdir dans le repo, AV-friendly)

Mêmes raisons que pour les tests : sur Windows corporate, le helper
binary que Wails build dans `%TEMP%` se fait quarantaine par Defender
(`Access is denied` sur l'`a.out.exe` de la phase *Generating bindings*).
Le wrapper `scripts/dev/ui-build.{sh,bat}` redirige `GOCACHE`,
`GOTMPDIR`, `TMP` et `TEMP` vers `<repo>/.gocache` et `<repo>/.gotmp`,
ajoute `-tags mock` et `-skipbindings` (qui réutilise les stubs
hand-written dans `frontend/wailsjs/` au lieu de relancer la
génération AV-bloquée).

```bash
# Linux / macOS / WSL
scripts/dev/ui-build.sh
scripts/dev/ui-build.sh -- -clean             # forwarder n'importe quel flag wails

# Windows (cmd ou PowerShell)
scripts\dev\ui-build.bat
scripts\dev\ui-build.bat -clean
```

Une fois le TICKET IT (exclusion Defender) en place, retirer
`-skipbindings` du wrapper pour laisser Wails régénérer les bindings
TypeScript proprement.

Sur Windows en environnement corporate, `wails dev` peut être bloqué
par le scan AV (cf. § *Si l'AV bloque malgré tout* ci-dessus). Plan B :
WSL ou attente du TICKET IT (exclusion Defender).

### Build tags `mock` vs prod

- **Sans tag** (défaut) : `ui_prod.go` (racine) injecte
  `provider.NewClaude` → invocation réelle de Claude CLI.
- **Avec tag `mock`** : `ui_mock.go` injecte un
  `MockProvider` → développement frontend sans installer Claude
  ni brûler de tokens.

Le binaire prod **ne doit jamais embarquer le MockProvider** —
garantie par les tests duals `ui_mock_test.go` / `ui_prod_test.go`.

## CI

5 jobs sur GitHub Actions :

1. `static-checks` (Linux only) : `go vet`, `gofmt -l`, `go build`
2. `unit-tests` (matrix Linux/macOS/Windows) : `go test ./internal/... ./cmd/...` avec `-race` et coverage **+** un step `-tags mock` pour exercer `ui_mock_test.go`
3. `integration-tests` (matrix Linux/macOS/Windows) : `go test ./tests/integration/...` avec `-race` et coverage
4. `e2e-tests` (matrix Linux/macOS/Windows) : `go test ./tests/e2e/...` (sans `-race` car les tests forkent le binaire)
5. `ui-build` (matrix Linux/macOS/Windows) : `wails build -platform <os>`, upload du binaire en artefact

`unit-tests`, `integration-tests`, `e2e-tests` et `ui-build` dépendent
de `static-checks` (`needs:`) pour fail-fast.

## Pour un agent IA qui débarque

1. Lire [`CLAUDE.md`](CLAUDE.md) (guide projet + méthodologie SPDD)
2. Lire [`.yukki/README.md`](.yukki/README.md) (référence opérationnelle)
3. Lire [`.yukki/GUIDE.md`](.yukki/GUIDE.md) (vision pédagogique)
4. Lire [`TODO.md`](TODO.md) (état du backlog)
5. Pour toute nouvelle feature : suivre le cycle SPDD strict
   (story → clarification → analyse → canvas → generate)
