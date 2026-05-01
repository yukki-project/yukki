---
id: CORE-002
slug: isolate-business-core
story: spdd/stories/CORE-002-isolate-business-core.md
analysis: spdd/analysis/CORE-002-isolate-business-core.md
status: synced
created: 2026-05-01
updated: 2026-05-01
---

# Canvas REASONS — Isoler le cœur métier de la CLI pour exposition MCP future

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> Story de **prepare the ground** : aucun comportement applicatif n'est
> ajouté. La story formalise l'isolation déjà de facto en place via
> un linter statique `depguard`, doc-packages enrichis et un schéma
> d'architecture documenté.
>
> ## Changelog
>
> - **v1 — 2026-05-01** : canvas initial (6 Operations, status `draft`).
> - **v2 — 2026-05-01** — `/spdd-generate` (commit `0223a69`). 5
>   Operations O1-O5 livrées (O6 déjà appliquée via `22bfc6f`). Status
>   passé `draft → implemented` après validation locale (`go build`,
>   `go vet` clean ; `golangci-lint` non testé localement, validé en CI).
> - **v3 — 2026-05-01** — `/spdd-sync` (refactor seul, comportement
>   inchangé). Une seule dérive détectée et propagée dans Operations :
>   l'O1 a inclus un **cleanup** non-mentionné dans v1 — la suppression
>   des doc-packages dupliqués dans `prompt.go` (workflow),
>   `templates.go` (templates) et `id.go` (artifacts), pour éviter que
>   godoc affiche deux commentaires de package concaténés. Aucun
>   changement de comportement (les fichiers concernés n'ont perdu que
>   leur commentaire de tête, transformé en commentaire de file-level
>   non-doc). Sections **R/E/A/N/Safeguards intactes** (aucun changement
>   d'intention). Status passé `implemented → synced`.

---

## R — Requirements

### Problème

Le cœur métier de yukki (`internal/{workflow,provider,templates,
artifacts}`) est aujourd'hui isolé **de facto** des surfaces CLI/UI
(audit confirmé : zéro import `cobra` / `wails` / `uiapp` dans les
4 packages). Ce statu quo n'est garanti par **aucun mécanisme
automatique**. La présente story matérialise la garantie via un linter
en CI, des doc-packages explicites et un schéma d'architecture, pour
que l'ajout d'un serveur MCP (futur `INT-002`) soit une addition pure
sans refactor.

### Definition of Done

- [ ] Un fichier `.golangci.yml` à la racine déclare une règle `depguard`
      `core-isolation` en `list-mode: strict` qui :
      - applique le filtre aux 4 packages cœur (`internal/workflow`,
        `internal/provider`, `internal/templates`, `internal/artifacts`)
      - exclut les fichiers `*_test.go`
      - n'autorise que la stdlib (`$gostd`), `gopkg.in/yaml.v3` et
        l'intra-cœur
- [ ] Le job CI `static-checks` invoque `golangci-lint` via
      `golangci/golangci-lint-action@v7`
- [ ] Les 4 packages cœur ont un commentaire de tête (file-level
      doc-package) commençant par la phrase canonique
      *"Package X is part of yukki's business core: callable from the
      CLI (root cmd), the Wails UI (internal/uiapp), and the (future)
      MCP server (INT-002). It must not import cobra, wails, or any
      UI-specific package."* + une liste d'invariants en bullets
      (≥ 1 par package)
- [ ] `tests/integration/story_integration_test.go` gagne un header
      explicitant son rôle de *living example* de l'usage isolé du
      cœur (instruction explicite : ne pas y ajouter d'import CLI/UI)
- [ ] `DEVELOPMENT.md` contient une nouvelle section `## Architecture`
      placée juste après `## Stack`, avec un schéma ASCII des 3
      surfaces (CLI, UI, MCP-future) au-dessus du cœur unique + lien
      vers `.golangci.yml`
- [ ] `TODO.md` contient une entrée `INT-002 — Serveur MCP exposant
      les tools yukki` en section *Post-MVP* avec dépendance explicite
      sur CORE-002 (✅ déjà commité `22bfc6f`)
- [ ] Aucun test existant ne casse (CORE-001 + UI-001a tous verts en CI)
- [ ] Aucune signature publique des 4 packages cœur n'est modifiée
      (audit `go doc` avant/après identique modulo le doc-package)

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `BusinessCore` (concept architectural, pas réifié en Go) | L'ensemble des 4 packages `internal/{workflow,provider,templates,artifacts}` qui portent la logique SPDD | RunStory, Provider, Loader, Writer | stable, pas de mutation prévue par CORE-002 |
| `IsolationRule` (concept config) | Règle `core-isolation` dans `.golangci.yml` qui interdit aux 4 packages cœur d'importer `cobra`, `wails`, `uiapp`, `frontend` | `list-mode: strict`, `files`, `allow` | versionnée avec le code, évoluera quand un nouveau package légitime entre dans le cœur |
| `ConsumerSurface` (concept architectural) | Une surface qui consomme le cœur : CLI Cobra (root cmd), Wails UI (internal/uiapp), MCP server (futur INT-002) | direction d'import : surface → cœur | indépendante du cœur, peut évoluer librement |

### Value Objects

| Nom | Description | Type |
|---|---|---|
| `AllowedImport` | Une string représentant un import path autorisé dans le cœur | `string` (path Go) |
| `ForbiddenImport` | Implicite via `list-mode: strict` : tout ce qui n'est pas dans `allow` | n/a |

### Invariants CORE-002

- **I1** — Aucun fichier `.go` non-test des 4 packages cœur n'importe
  `github.com/spf13/cobra`, `github.com/wailsapp/wails*`,
  `github.com/yukki-project/yukki/internal/uiapp`, ou
  `github.com/yukki-project/yukki/frontend`. Vérifié statiquement par
  depguard.
- **I2** — Aucune signature publique de `workflow.RunStory`,
  `provider.Provider`, `templates.NewLoader`, `artifacts.NewWriter` /
  `NextID` / `Slugify` / `ValidateFrontmatter` n'est modifiée par
  cette story. Cohérence garantie par non-régression des tests
  CORE-001 / UI-001a.
- **I3** — Le cœur n'écrit pas directement sur `os.Stderr` /
  `os.Stdout`. Tout output user-facing passe par le `*slog.Logger`
  injecté ou par retour d'erreur Go. (Exception : `internal/clilog`
  qui n'est pas dans la liste cœur — c'est l'utility logging partagé.)
- **I4** — Les fichiers `*_test.go` du cœur sont **exclus** de la
  règle depguard : ils peuvent légitimement importer `os`, `fmt`,
  `io` pour stubs/helpers (cf. `internal/provider/claude_test.go` qui
  build un faux binaire claude via `go run`).

### Integration points

- **`golangci-lint`** v1.62+ — invoqué via
  `golangci/golangci-lint-action@v7` dans le job CI `static-checks`.
  Lit `.golangci.yml` à la racine du repo.
- **`depguard`** — linter intégré à `golangci-lint`, configuré en
  `list-mode: strict`.
- **Pas d'intégration runtime** : la garantie d'isolation est purement
  statique (compile-time, vérifiée en CI).

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **garantir mécaniquement que le cœur
> métier de yukki reste consommable depuis CLI / UI / (futur) MCP
> sans dépendance vers les surfaces CLI/UI**, on choisit
> **`golangci-lint` + linter `depguard` configuré en allow-list
> strict sur les 4 packages cœur, exécuté en CI dans le job
> `static-checks`**, plutôt que d'**écrire un script shell maison**
> ou un **test Go d'introspection des imports**, pour atteindre
> **rigueur enterprise (allow-list explicite plus stricte qu'une
> blocklist), zéro maintenance custom (outil tiers maintenu par la
> communauté Go), 30+ linters bonus disponibles pour DOC-001**, en
> acceptant **une nouvelle dépendance d'outillage CI (golangci-lint)
> et la maintenance de la liste `allow:` à chaque ajout de dep
> légitime au cœur**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-01, cf. analyse)

- **D1 / `golangci-lint` + `depguard`** comme outil. Pas de script
  shell maison. Préparation DOC-001.
- **D2 / allow-list strict** (`list-mode: strict`). Plus rigoureux
  que blocklist : aucun oubli possible.
- **D3 / 4 packages cœur** auditées : `workflow`, `provider`,
  `templates`, `artifacts`. `clilog` et `uiapp` exclus.
- **D4 / `*_test.go` exclus** de la règle.
- **D5 / annotation** du test d'intégration existant (pas de nouveau
  fichier).
- **D6 / doc-package canonique** : 1ʳᵉ phrase figée + invariants en
  bullets.
- **D7 / section `## Architecture`** dans DEVELOPMENT.md après `## Stack`.
- **D8 / `INT-002` en post-MVP** côte à côte avec `INT-001`.
- **D9 / pas d'entrée historique TODO.md** (commit `22bfc6f` déjà
  appliqué le swap CORE-002↔003 + ajout INT-002).
- **D10 / Operations amont → aval** (O1-O6 décrites en section O).
- **D11 / imports directs uniquement** (transitive déféré v2).

### Alternatives écartées

- **Script shell maison** (`scripts/dev/check-core-isolation.sh`) —
  fragile parsing grep, pas de support deps transitives en v2,
  bit-rot. golangci-lint + depguard fait mieux pour le même budget.
- **Test Go natif** (`go/parser` + `go list -json`) — robuste mais
  ~80 lignes Go à maintenir, ne profite pas des 30+ autres linters.
- **`go-arch-lint`** (fe3dback) — outil dédié archi DDD/hexagonal,
  excellent mais 1 dep externe juste pour ça. golangci-lint est plus
  universel.
- **`import-boss`** (k8s) — fichiers `.import-restrictions` per-dir.
  Mainstream Kubernetes mais pas adopté hors écosystème k8s.
- **Blocklist explicite** (D2 option A) — moins rigoureuse que
  allow-list ; il suffit d'oublier un nom dans la blocklist pour
  qu'un import indésirable passe.
- **Activer tous les linters golangci-lint d'un coup** (govet,
  errcheck, staticcheck, gosec, misspell, ...) — déféré DOC-001.
  CORE-002 livre uniquement `depguard` pour ne pas exploser le scope.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| racine | `.golangci.yml` (nouveau) | création — config `depguard` règle `core-isolation` allow-list strict |
| `.github/workflows/ci.yml` | mod | nouveau step `golangci-lint` ajouté à `static-checks` après le step `gofmt check` |
| `internal/workflow` | `doc.go` (nouveau ou inséré dans `prompt.go` existant) | ajout file-level package doc canonique + invariants |
| `internal/provider` | idem | idem |
| `internal/templates` | idem | idem |
| `internal/artifacts` | idem | idem |
| `tests/integration/story_integration_test.go` | mod | ajout d'un header de commentaire au-dessus du `package integration_test` explicitant le rôle de *living example* d'isolation |
| `DEVELOPMENT.md` | mod | nouvelle section `## Architecture` (schéma ASCII + 3 lignes prose) après `## Stack`, avant `## Build` |
| `TODO.md` | mod | ✅ déjà appliqué commit `22bfc6f` — entrée `INT-002` en post-MVP côte INT-001 + swap CORE-002↔003 + sous-bullets renommés CORE-003a-f |

### Schéma de flux — Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│  Surfaces de consommation (cobra, wails, mcp/go-sdk)    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ CLI Cobra│  │ Wails UI     │  │ MCP server       │   │
│  │ (root    │  │ (internal/   │  │ (INT-002,        │   │
│  │ main.go) │  │  uiapp)      │  │  POST-MVP)       │   │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘   │
│       └───────────────┴───────────────────┘             │
│                       │                                 │
│                       ▼   imports autorisés             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Cœur métier (internal/) — depguard strict       │   │
│  │                                                  │   │
│  │  internal/workflow      RunStory + Progress      │   │
│  │  internal/provider      Provider + Claude + Mock │   │
│  │  internal/templates     Loader + embed.FS        │   │
│  │  internal/artifacts     NextID + Slug + Writer   │   │
│  │                                                  │   │
│  │  Allow-list :                                    │   │
│  │   ✓ stdlib ($gostd)                              │   │
│  │   ✓ gopkg.in/yaml.v3                             │   │
│  │   ✓ intra-cœur (les 4 packages entre eux)        │   │
│  │   ✗ cobra, wails, uiapp, frontend (DENY)         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

   Garantie statique : .golangci.yml + golangci-lint en CI
```

---

## O — Operations

> Ordre amont → aval (D10). Chaque Operation est livrable indépendamment
> en 1 commit atomique.

### O1 — Doc-package canonique sur les 4 packages cœur

- **Module** : `internal/workflow`, `internal/provider`,
  `internal/templates`, `internal/artifacts`
- **Fichier** : `doc.go` (nouveau) dans chacun des 4 packages
  *(alternative : insérer le doc-package au-dessus du fichier
  alphabétiquement premier — `prompt.go`, `claude.go`, `templates.go`,
  `id.go`. Décision : `doc.go` dédié, plus visible et cohérent avec
  la convention Go.)*
- **Cleanup associé** *(ajouté en v3 sync)* : 3 packages avaient déjà
  un doc-package (`// Package X ...`) au-dessus de leur fichier
  alphabétiquement premier (`prompt.go`, `templates.go`, `id.go`).
  Ces commentaires sont **retirés** lors de la création des `doc.go`
  dédiés, pour éviter que godoc concatène deux blocs de doc-package.
  Le commentaire restant dans le fichier devient un file-level comment
  non-doc (toujours informatif sur le rôle du fichier dans CORE-001).
  `provider/` n'avait pas de doc-package préalable — pas de cleanup.
- **Signature** :
  ```go
  // Package <name> is part of yukki's business core: callable from the
  // CLI (root cmd), the Wails UI (internal/uiapp), and the (future)
  // MCP server (INT-002). It must not import cobra, wails, or any
  // UI-specific package — enforced statically by the `core-isolation`
  // depguard rule in .golangci.yml.
  //
  // Invariants:
  //   - <invariant 1, package-specific>
  //   - <invariant 2, optional>
  //
  // See spdd/stories/CORE-002-isolate-business-core.md for the
  // rationale of this isolation.
  package <name>
  ```
- **Comportement** : statique (commentaire). Pas d'effet runtime.
- **Invariants par package** (≥ 1 chacun) :
  - `workflow` : *"RunStory is idempotent on read paths and atomic
    on write paths. All side effects flow through injected
    dependencies."*
  - `provider` : *"Provider.Generate is idempotent from yukki's POV:
    a same input MAY be replayed safely. Concrete impls (Claude,
    Mock) own their own retry/timeout semantics."*
  - `templates` : *"Loader resolution is project-first with embed.FS
    fallback. Project templates take precedence even if embedded
    template was newer."*
  - `artifacts` : *"Writer.Write is atomic via temp-then-rename. A
    malformed file is never left in the final location. NextID is
    monotonic per prefix."*
- **Tests** : aucun test code-level (commentaire pur). Validation
  manuelle via `go doc github.com/yukki-project/yukki/internal/<pkg>`.

### O2 — `.golangci.yml` config depguard allow-list strict

- **Module** : racine
- **Fichier** : `.golangci.yml` (nouveau)
- **Contenu** :
  ```yaml
  # golangci-lint configuration for yukki.
  #
  # CORE-002 scope : only the `depguard` linter is enabled, with a
  # single rule (`core-isolation`) that enforces the architectural
  # boundary defined in spdd/stories/CORE-002-isolate-business-core.md.
  #
  # Other useful linters (govet, errcheck, staticcheck, gosec,
  # misspell, ...) are intentionally NOT enabled here — they will be
  # activated when DOC-001 (OSS publication) lands.
  #
  # See https://golangci-lint.run/docs/linters/configuration/ for
  # the full schema.

  version: "2"

  linters:
    default: none
    enable:
      - depguard
    settings:
      depguard:
        rules:
          core-isolation:
            list-mode: strict
            files:
              - "**/internal/workflow/**"
              - "**/internal/provider/**"
              - "**/internal/templates/**"
              - "**/internal/artifacts/**"
              - "!**/*_test.go"
            allow:
              - $gostd
              - gopkg.in/yaml.v3
              - github.com/yukki-project/yukki/internal/workflow
              - github.com/yukki-project/yukki/internal/provider
              - github.com/yukki-project/yukki/internal/templates
              - github.com/yukki-project/yukki/internal/artifacts
  ```
- **Comportement** :
  1. Quand `golangci-lint run` s'exécute, il lit `.golangci.yml`
  2. Il parcourt tous les fichiers `*.go` du repo
  3. Pour chaque fichier qui matche un pattern de
     `linters.settings.depguard.rules.core-isolation.files`, il vérifie
     que tous ses imports sont dans `allow`
  4. Si non : échec avec message *"core-isolation: <import path> not
     in allowed list (file: <path>)"*
- **Tests** : voir O3 (le step CI EST le test).

### O3 — Step CI `golangci-lint` dans `static-checks`

- **Module** : `.github/workflows/ci.yml`
- **Fichier** : `.github/workflows/ci.yml`
- **Nature** : modification — ajout d'un step après `gofmt check` et
  avant `build`
- **Pseudo-yaml** :
  ```yaml
  - name: golangci-lint (depguard core isolation)
    uses: golangci/golangci-lint-action@v7
    with:
      version: v1.62
      args: --timeout=3m
  ```
- **Comportement** :
  1. L'action installe `golangci-lint` v1.62 (cache GitHub Actions
     intégré)
  2. Lance `golangci-lint run` qui lit `.golangci.yml`
  3. Échec CI si une violation `core-isolation` est trouvée, avec
     annotation inline sur la PR
- **Tests** : la CI elle-même est le test (vert ↔ AC1 satisfait).
  Test négatif manuel (à faire avant de merger) : ajouter
  temporairement `import _ "github.com/spf13/cobra"` dans
  `internal/workflow/story.go` et vérifier que la CI échoue avec un
  message clair.

### O4 — Annotation `tests/integration/story_integration_test.go`

- **Module** : `tests/integration`
- **Fichier** : `tests/integration/story_integration_test.go`
- **Nature** : modification — ajout d'un header de commentaire en
  tête du fichier, avant la déclaration `package`.
- **Contenu du header** :
  ```go
  // Package integration_test exercises the yukki business core
  // (internal/workflow, internal/provider, internal/templates,
  // internal/artifacts) end-to-end with a MockProvider, deliberately
  // *without* involving cobra, wails, or any UI surface.
  //
  // This file is the **living example** of the core isolation
  // guarantee defined in CORE-002: if a future contributor finds
  // themselves adding imports of cmd/, internal/uiapp,
  // github.com/spf13/cobra, or github.com/wailsapp/wails here, that
  // would defeat the test's purpose. The same imports in
  // internal/workflow et al. are also rejected statically by the
  // `core-isolation` depguard rule (.golangci.yml).
  //
  // See spdd/stories/CORE-002-isolate-business-core.md for the
  // rationale.
  package integration_test
  ```
- **Comportement** : statique. Aucun changement runtime du test.
- **Tests** : le test existant `TestStoryIntegration_*` continue de
  passer sans modification fonctionnelle (AC6).

### O5 — Section `## Architecture` dans DEVELOPMENT.md

- **Module** : racine doc
- **Fichier** : `DEVELOPMENT.md`
- **Nature** : modification — insertion d'une nouvelle section
  `## Architecture` placée juste après `## Stack` et avant `## Build`.
- **Contenu** :
  ```markdown
  ## Architecture

  yukki est composé d'**un cœur métier** (4 packages internes) et
  de **3 surfaces de consommation** :

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
  │  │  Cœur métier (internal/)              │     │
  │  │  - workflow   RunStory + Progress     │     │
  │  │  - provider   Provider + Claude + Mock│     │
  │  │  - templates  Loader                  │     │
  │  │  - artifacts  NextID + Slug + Writer  │     │
  │  └────────────────────────────────────────┘     │
  └─────────────────────────────────────────────────┘
  ```

  L'isolation du cœur (interdiction d'importer cobra, wails ou
  internal/uiapp) est **enforcée statiquement** par
  [.golangci.yml](.golangci.yml) — règle `depguard` `core-isolation`
  configurée en allow-list strict. Le job CI `static-checks` invoque
  `golangci-lint` à chaque PR.

  La 3ᵉ surface (serveur MCP, INT-002) n'est **pas livrée** —
  préparée par CORE-002, à implémenter en post-MVP. Voir
  [spdd/stories/CORE-002-isolate-business-core.md](spdd/stories/CORE-002-isolate-business-core.md).
  ```
- **Tests** : aucun test code-level. Validation manuelle de la
  cohérence du schéma avec le code.

### O6 — Entrée TODO `INT-002` (déjà appliquée)

- **Module** : racine
- **Fichier** : `TODO.md`
- **Nature** : ✅ **déjà appliqué dans le commit `22bfc6f`**
  (commit antérieur à ce canvas, posé pendant la phase d'analyse).
  L'Operation est listée pour traçabilité — `/spdd-generate` ne fera
  **rien** ici, seulement vérifier que l'entrée existe bien.
- **Contenu de l'entrée** (rappel) :
  ```markdown
  - ⬜ **INT-002** — Serveur MCP exposant les tools yukki (`yukki.story`,
    puis `yukki.analysis`, etc.) via le SDK
    [github.com/modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk).
    Sous-cmd `yukki mcp` qui démarre le serveur en stdio. **Dépend de
    CORE-002** (cœur métier isolé). Clients cibles : Claude Desktop,
    Cursor, Continue, OpenCode, Zed, Cody.
  ```
- **Tests** : non applicable. Validation manuelle :
  `grep "INT-002" TODO.md` retourne ≥ 1 match incluant *"Serveur MCP"*
  et *"depends on CORE-002"* (textuel ou implicite).

---

## N — Norms

> Standards transversaux à respecter dans cette story.

- **Doc-package style** : commentaire de tête en anglais (cohérent avec
  les autres doc-packages Go du repo, e.g. `clilog`). Phrase canonique
  textuelle (D6) — ne pas paraphraser. Liste d'invariants en bullets,
  pas en prose.
- **YAML config** : indentation 2 espaces, pas de tabs. Commentaires
  en anglais. Schéma `golangci-lint` v2 (cf. doc 2026).
- **CI step** : `shell: bash` n'est pas requis (l'action gère elle-même)
  mais le commentaire YAML ci-dessus le step explique le rôle.
- **Linter version** : pin `v1.62` (latest stable golangci-lint au
  moment de l'écriture). Bumpable via dependabot.
- **Convention de commit** : `prompt-update(spdd)` ou `feat(spdd)`
  selon que la story est en pre/post merge. Pour cette story (pre-merge),
  préférer `feat(core)` pour O1-O5 (touchent le cœur ou la doc) et
  `chore(ci)` pour O3.
- **Tests** : aucun test unitaire ajouté. AC6 est vérifié via la CI
  globale (les tests existants passent inchangés).
- **Diff minimal** : O1 ajoute 4 fichiers `doc.go` ; O2 ajoute 1
  fichier `.golangci.yml` ; O3 modifie ~6 lignes du CI ; O4 ajoute
  ~15 lignes de commentaire ; O5 ajoute ~25 lignes au DEVELOPMENT.md.
  Total : ~150 lignes de doc/config + 0 ligne de logique métier.
- **Pas de refactor** : O1-O5 ne touchent à aucune signature publique
  ni à aucune logique. Si l'auditeur de la PR ressent le besoin de
  refactor une fonction *"pendant qu'on y est"*, c'est une dérive —
  faire une story séparée.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de modification de signature publique**
  - Les fonctions/méthodes exportées de `internal/{workflow,provider,
    templates,artifacts}` (`RunStory`, `NewClaude`, `NewLoader`,
    `NewWriter`, `NextID`, `Slugify`, `ValidateFrontmatter`,
    `BuildStructuredPrompt`, etc.) **gardent leur signature exacte**.
  - `go doc` avant/après la PR doit montrer un diff vide pour la
    section signatures (modulo le doc-package). Vérifié manuellement.
- **Pas d'autres linters activés en V1**
  - `.golangci.yml` n'active que `depguard`. Pas de `govet`, pas
    d'`errcheck`, pas de `staticcheck`. Activation différée à DOC-001.
  - Si `/spdd-generate` est tenté d'activer d'autres linters
    *"pendant qu'on y est"*, **arrêter** et lever une Open Question.
- **Pas de refactor du cœur**
  - Aucun fichier déplacé, aucun package renommé, aucune fonction
    extraite ou inlinée. La story est pure ajout de doc + config.
- **Allow-list explicite**
  - L'ajout d'une nouvelle dépendance Go à un package cœur (e.g.
    `golang.org/x/text`) implique d'updater la `allow:` dans
    `.golangci.yml`. Pas de bypass via `nolint:depguard` dans le
    code source.
- **Exclusion `*_test.go` rigoureuse**
  - Le pattern `!**/*_test.go` dans `files:` doit fonctionner correctement
    sur les 3 OS (Linux, macOS, Windows). Si depguard v1.62 a un bug de
    parsing de ce pattern, on revoit la config — pas un workaround
    via flag CLI ou autre hack.
- **Anti-fuite Wails côté cœur**
  - L'import `github.com/wailsapp/wails/v2/pkg/...` (sub-packages) est
    automatiquement bloqué par `list-mode: strict` (puisqu'il n'est
    pas dans `allow`). Validation par test négatif manuel avant merge.
- **CI doit échouer visiblement**
  - Si depguard détecte un import indésirable, le step CI `golangci-lint`
    DOIT échouer avec un message **lisible** (mention du package
    cible, du fichier en infraction, et de l'import banni). Pas
    d'output silencieux ou tronqué.
- **Pas de modification du flow CORE-001 / UI-001a**
  - Aucun test existant n'est *modifié* pour faire passer cette
    story. Le test `tests/integration/story_integration_test.go`
    voit uniquement un header de commentaire ajouté ; ses assertions
    et fixtures restent identiques.
- **Pas de note historique TODO.md**
  - D9 = C : pas d'entrée *"2026-05-01 — swap ID"* dans
    *Historique de ce fichier*. Les commits git tracent le swap.
- **`internal/clilog` reste en dehors de la liste cœur**
  - Pas tenté de l'ajouter à `files:` même si "logique de logging"
    pourrait sembler s'apparenter au métier. clilog est utility
    transverse (CLI/UI/MCP).
- **Pas de tooling shell maison**
  - Aucun script `scripts/dev/check-*.sh` ajouté. Tout passe par
    golangci-lint via l'action GitHub officielle. La doctrine "un seul
    outil tiers maintenu" s'applique.
