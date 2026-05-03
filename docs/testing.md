# Testing — guide opérationnel yukki

> **Doc projet** (instance), pas méthodo. Pour le **pourquoi** et
> les **patterns**, voir [`spdd/methodology/testing/`](../spdd/methodology/testing/)
> (cluster TEST-001). Ce document liste les **outils choisis pour
> yukki** (Go + TypeScript/React + Wails) et leurs commandes.

## Stack yukki

- **Backend Go** — `internal/`, `cmd/`, root (`main.go`, `ui.go`)
- **Frontend TypeScript + React** — `frontend/src/`
- **Bridge Wails v2.12** — `frontend/wailsjs/` (stubs AV-workaround)

Toutes les pratiques ci-dessous **respectent** les seuils
méthodologiques de
[`coverage-discipline.md`](../spdd/methodology/testing/coverage-discipline.md)
(70% global, 85% modules critiques) et le catalogue de
[`test-smells.md`](../spdd/methodology/testing/test-smells.md).

---

## Backend Go

### Outils

| Concern | Outil | Statut |
|---|---|---|
| Test runner | `testing` (stdlib) | actif |
| Coverage | `go test -cover` (stdlib) | actif |
| Mocking | manual interfaces, pas de gomock V1 | actif |
| Property-based | `gopter` (à introduire selon besoin) | candidat — voir [`property-based-testing.md`](../spdd/methodology/testing/property-based-testing.md) |
| Mutation testing | `go-mutesting` ciblé sur `internal/artifacts/` | candidat — voir [`mutation-testing.md`](../spdd/methodology/testing/mutation-testing.md) |
| Lint | `go vet`, `gofmt`, `staticcheck` (via `golangci-lint`) | actif |

### Commandes

**Run tests** (avec workaround AV pour Defender Windows) :

```bash
export GOCACHE="$(pwd)/.gocache" GOTMPDIR="$(pwd)/.gotmp" \
       TMP="$(pwd)/.gotmp" TEMP="$(pwd)/.gotmp"
mkdir -p "$GOCACHE" "$GOTMPDIR"
go test ./...
```

**Coverage report** :

```bash
go test ./... -cover -coverprofile=cover.out
go tool cover -func=cover.out                 # synthèse par fonction
go tool cover -html=cover.out -o cover.html   # rapport HTML
```

**Test ciblé sur un package** :

```bash
go test ./internal/artifacts/... -v
go test ./internal/artifacts/... -run "TestIsValid|TestAllowed" -v
```

**Race detector** (sur tests qui touchent au concurrent) :

```bash
go test ./... -race
```

### Modules critiques (seuil ≥ 85%)

Modules SPDD-critiques où la coverage doit être >= 85% :

- `internal/artifacts/` — parser, lister, writer, status (cœur SPDD)
- `internal/uiapp/` — bindings Wails exposés au frontend
- `internal/workflow/` — orchestration de génération via Claude

Modules secondaires (≥ 70%) : `internal/clilog`, `internal/templates`,
`internal/provider`, `cmd/yukki/`.

### Conventions

- **Naming** : `Test<MethodName>_<Scenario>` (cf.
  [`test-naming.md`](../spdd/methodology/testing/test-naming.md))
- **Sous-tests** via `t.Run(name, func(t *testing.T) {...})`
  pour grouper plusieurs cas
- **Fichiers** : `*_test.go` à côté du fichier sous test
- **Fixtures** : `testdata/` à côté du package (golden files Go convention)

---

## Frontend TypeScript + React + Vitest

### Outils

| Concern | Outil | Statut |
|---|---|---|
| Test runner | **Vitest** (Vite-native) | candidat — pas encore installé |
| Component testing | `@testing-library/react` + `@testing-library/jest-dom` | candidat |
| Coverage | `@vitest/coverage-v8` (V8 native) | candidat |
| Mocking API | `MSW` (Mock Service Worker) | candidat |
| Property-based | `fast-check` | candidat — voir [`property-based-testing.md`](../spdd/methodology/testing/property-based-testing.md) |
| Mutation testing | `Stryker` ciblé sur `frontend/src/stores/` | candidat — voir [`mutation-testing.md`](../spdd/methodology/testing/mutation-testing.md) |
| a11y | `@axe-core/react` (via test setup) | candidat — voir
  [`testing-frontend.md`](../spdd/methodology/testing/testing-frontend.md) §a11y |
| Lint | ESLint + TypeScript strict | actif (TS strict, ESLint pas encore) |
| Type-check | `tsc --noEmit` | actif via `npm run build` |

État actuel : **aucun test automatisé** sur le frontend yukki.
Cohérent avec la décision SPDD V1 (UI-001b/c/UI-006/UI-007/UI-008
ont validé manuellement). Cette section décrit la **stack cible**
quand `/spdd-tests` (étape 6 SPDD, future) sera implémentée.

### Commandes (cible)

**Setup** (à faire) :

```bash
cd frontend
npm install -D vitest @vitest/coverage-v8 @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event jsdom
```

**Run tests** :

```bash
cd frontend
npm test                      # mode watch
npm run test:run              # one-shot
npm run test:coverage         # avec coverage V8
```

**Coverage HTML report** :

```bash
cd frontend
npm run test:coverage -- --reporter=html
# → coverage/index.html
```

### Modules critiques (seuil ≥ 85%)

- `frontend/src/stores/` — Zustand stores (artifacts, shell,
  workflow, claude, project, generation)
- `frontend/src/components/workflow/` — pipeline view
- `frontend/src/components/hub/` — composants metier critiques
  (HubList, NewStoryModal, StoryViewer)

Modules secondaires : composants UI primitifs (`components/ui/`
shadcn — déjà testés en amont par shadcn).

### Conventions

- **Naming** : `describe('<sujet>', () => { it('<comportement>') })`
  (cf. [`test-naming.md`](../spdd/methodology/testing/test-naming.md)
  §Frontend)
- **Fichiers** : `*.test.ts` ou `*.test.tsx` à côté du fichier
  sous test
- **Mocks Wails bindings** : `vi.mock('@/wailsjs/go/main/App')`
  pour stub les bindings Go-côté-front en test
- **Pas de snapshot tests par défaut** (cf.
  [`snapshot-testing.md`](../spdd/methodology/testing/snapshot-testing.md)
  decision tree — seulement si caractérisation legacy ou
  output stable)

---

## Anti-cheat appliqués (cf. [`coverage-discipline.md`](../spdd/methodology/testing/coverage-discipline.md))

| Anti-cheat | Statut yukki |
|---|---|
| **Mutation testing** sur modules critiques | candidat — pas encore configuré (`go-mutesting` planifié sur `internal/artifacts/`) |
| **Test size limit** (> 50 lignes / > 5 asserts par test) | manuel V1, à automatiser via `golangci-lint` rules |
| **Forbid patterns lint** (test sans assert, `it.skip()` non justifié) | candidat — règles ESLint et `staticcheck` à configurer |
| **Coverage drift gate** (CI bloque si -3%) | candidat — à câbler dans `.github/workflows/` |

---

## CI

GitHub Actions — workflow `CI` (cf. `.github/workflows/`) :

- `static checks` — `gofmt`, `go vet`, `staticcheck` sur Go ;
  `tsc --noEmit` sur TS
- `unit tests` (ubuntu / macos / windows) — `go test ./...`
- `integration tests` (ubuntu / macos / windows) — tests qui
  touchent au filesystem
- `e2e tests` (ubuntu / macos / windows) — `main_test.go` à la racine
- `ui build` (ubuntu / macos / windows) — `wails build -tags
  mock -skipbindings`

Tous les jobs doivent passer pour merger une PR (sauf
override explicite documenté).

---

## Roadmap testing yukki

**Phase 1 (actuel)** — tests Go unit existants sur les modules
backend ; pas de tests frontend automatisés.

**Phase 2 (next)** — installer Vitest + Testing Library sur le
frontend, écrire les tests des stores Zustand (modules critiques).

**Phase 3** — câbler les 4 anti-cheat de
[`coverage-discipline.md`](../spdd/methodology/testing/coverage-discipline.md)
en CI :
- mutation testing sur `internal/artifacts/`
- test size limit lint
- forbid patterns lint
- coverage drift gate

**Phase 4** — implémenter la skill SPDD `/spdd-tests` (étape 6
du workflow) qui consomme TEST-001 + ce TESTING.md pour générer
des tests conformes pour toute Operation.

---

## Voir aussi

- [`spdd/methodology/testing/`](../spdd/methodology/testing/) — cluster
  méthodo TEST-001 (patterns langage-agnostiques)
- [`README.md`](../README.md) — overview yukki
- [`DEVELOPMENT.md`](../DEVELOPMENT.md) — environnement de dev (Wails,
  workarounds AV Defender)
- [`spdd/README.md`](../spdd/README.md) — workflow SPDD général
