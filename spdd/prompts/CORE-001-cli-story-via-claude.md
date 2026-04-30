---
id: CORE-001
slug: cli-story-via-claude
story: spdd/stories/CORE-001-cli-story-via-claude.md
analysis: spdd/analysis/CORE-001-cli-story-via-claude.md
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Canvas REASONS — Commande CLI `yukki story` génère une user story SPDD via Claude CLI

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Permettre à un utilisateur de générer une user story SPDD bien
structurée depuis n'importe quel projet sans copier-coller un prompt
dans Claude Code ou un autre client. La rigueur SPDD (INVEST, G/W/T
déclaratif, sweet spot 3-5 AC, couverture happy/erreur/limite) doit
être garantie par construction.

### Definition of Done

- [ ] Un binaire Go unique `yukki` est buildable sur Linux / macOS /
      Windows via `go build ./cmd/yukki`
- [ ] La sous-commande `yukki story "<description>"` produit un fichier
      `stories/STORY-NNN-<slug>.md` (ou `<préfixe>-NNN-<slug>.md` selon
      `--prefix`) dans le répertoire courant
- [ ] Le fichier produit a un frontmatter YAML parseable par `yq` et
      respecte le template `templates/story.md` (7 sections, ≥ 2 AC en
      G/W/T)
- [ ] La commande supporte stdin (`echo "..." | yukki story`) et la
      détection est canonique (`os.Stdin.Stat() & os.ModeCharDevice`)
- [ ] La commande détecte l'absence de `claude` dans le `PATH` et
      retourne un code distinct (catégorie *erreur provider*) avec un
      message stderr explicite, sans créer de fichier
- [ ] La commande génère un message d'usage si description vide (catégorie
      *erreur utilisateur*)
- [ ] Le template `templates/story.md` projet-courant est utilisé en
      priorité ; sinon fallback sur le template embarqué (`embed.FS`)
      avec un message stderr informatif
- [ ] Deux invocations parallèles avec le même `--prefix` ne s'écrasent
      pas (rename atomique avec id calculé in-flight)
- [ ] Logs structurés disponibles via `--log-format=json` ; texte
      simple par défaut ou avec `--verbose`
- [ ] Tests unitaires sur les composants pure-Go (id calculator, slug
      generator, template loader, prompt builder) + un test
      d'intégration end-to-end avec un `Provider` moqué qui renvoie un
      stub markdown
- [ ] CI GitHub Actions cross-platform (Linux, macOS, Windows) qui
      build et exécute `go test ./...`

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `Story` (artefact, pas réifié en Go) | Fichier `stories/<id>-<slug>.md` produit par la commande | frontmatter YAML + corps markdown 7 sections | créé une fois, jamais muté par `yukki` (édition humaine ensuite) |
| `Provider` (interface Go) | Abstraction d'un LLM CLI accessible en subprocess | `Name() string`, `CheckVersion(ctx) error`, `Generate(ctx, prompt string) (string, error)` | injectable, v1 implémente `claude` ; INT-001 ajoutera Copilot |
| `StoryWriter` (struct Go) | Calcule l'id, génère le slug, écrit la story | `NextID(prefix) (string, error)`, `Slug(title) string`, `Write(id, slug, content) (path, error)` | éphémère par invocation |
| `TemplateLoader` (struct Go) | Charge `story.md` depuis le projet courant ou embed.FS | `LoadStory() (content string, source string, error)` | éphémère par invocation |

### Value Objects

| Nom | Description | Type Go |
|---|---|---|
| `StoryID` | `<préfixe>-NNN`, immutable | `string` (typed alias optionnel) |
| `Slug` | kebab-case, ≤ 5 mots | `string` |
| `Description` | input texte (argument ou stdin) | `string` |

### Invariants

- **I1** — Le numéro d'un id généré est strictement supérieur au plus
  grand numéro existant pour le préfixe donné dans `stories/`.
- **I2** — Le frontmatter YAML de la story produite est parseable par
  `yq` (vérifié post-génération avant d'écrire le fichier final).
- **I3** — La story produite respecte les règles de
  [`acceptance-criteria.md`](../methodology/acceptance-criteria.md) —
  garanti par le **prompt structuré** qui injecte ces règles avant le
  template.

### Integration points

- `claude` CLI invoqué via `os/exec` (stdin = prompt structuré +
  template + description ; stdout = markdown brut de la story)
- File system : lecture du template, écriture de la story
- Stdin / stdout / stderr (CLI POSIX)

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **générer des user stories SPDD
> rigoureuses depuis n'importe quel projet sans copier-coller manuel
> dans Claude Code**, on choisit une **CLI Go monolithique en Cobra
> qui orchestre `claude` CLI comme subprocess**, avec un **prompt
> système structuré injectant les règles SPDD avant le template puis
> la description**, plutôt que d'**embarquer un SDK Anthropic** ou de
> **passer le template brut à `claude` sans pré-prompting**, pour
> atteindre **portabilité, maintenabilité, et rigueur de sortie
> garantie**, en acceptant **une dépendance externe à `claude` CLI
> préinstallé et un prompt verbeux qui consomme plus de tokens**.

### Alternatives écartées

- **SDK Anthropic embarqué** — gestion auth/rate-limit/version-API,
  lock-in vendor, perte de la flexibilité multi-provider promise par
  INT-001 (Copilot CLI).
- **Template brut sans pré-prompting** — qualité variable selon
  l'humeur du modèle, on rate la valeur centrale (rigueur SPDD).
- **Mode interactif Q&A** — reporté en post-MVP, hors scope CORE-001.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature |
|---|---|---|
| `cmd/yukki/` | `main.go` | création (entrypoint Cobra) |
| `internal/workflow/` | `story.go`, `prompt.go`, `prompts/story-system.md` (embed) | création |
| `internal/provider/` | `provider.go`, `claude.go`, `mock.go` | création |
| `internal/templates/` | `templates.go`, `embedded/story.md`, `embedded/analysis.md`, `embedded/canvas-reasons.md`, `embedded/tests.md` | création + embed des 4 templates depuis `spdd/templates/` |
| `internal/artifacts/` | `writer.go`, `id.go`, `slug.go` | création |
| `internal/clilog/` | `clilog.go` | création (setup `slog` text/JSON) |
| `go.mod`, `go.sum` | (créés au bootstrap) | initialisation |
| `.github/workflows/` | `ci.yml` | CI cross-platform |

### Schéma de flux (génération nominale)

```
[user] yukki story "ajouter un export CSV trivy"
    │
    ▼
cmd/yukki/main.go (Cobra)
    │
    ▼
internal/workflow/StoryCommand
    │
    ├─▶ internal/provider/ClaudeProvider.CheckVersion()  → erreur si claude absent
    │
    ├─▶ internal/templates/TemplateLoader.LoadStory()
    │       └─ project ./templates/story.md OR embed fallback
    │
    ├─▶ internal/workflow/BuildStructuredPrompt(rules, template, description)
    │
    ├─▶ internal/provider/ClaudeProvider.Generate(ctx, prompt)
    │       └─ os/exec claude (stdin = prompt, stdout = markdown)
    │
    ├─▶ validate frontmatter parseable (yaml.v3)
    │
    ├─▶ internal/artifacts/StoryWriter.NextID(prefix)
    │
    ├─▶ internal/artifacts/StoryWriter.Slug(title extracted from markdown)
    │
    └─▶ internal/artifacts/StoryWriter.Write(id, slug, content)
            └─ rename atomique : write to .tmp, then rename
```

### Schéma de flux (échec `claude` absent)

```
yukki story "..."
    │
    ▼
ClaudeProvider.CheckVersion() returns ErrClaudeNotFound
    │
    ▼
print stderr: "error: 'claude' CLI not found in PATH..."
exit code: <code provider> (cf. Norms)
no file created
```

---

## O — Operations

> Ordre d'exécution : O1 (bootstrap) → O2 (logger) → O3 (templates) →
> O4 (artifacts) → O5 (provider) → O6 (workflow) → O7 (cmd) → O8 (CI).

### O1 — Bootstrap du module Go

- **Module** : racine
- **Fichiers** : `go.mod`, `.gitignore`
- **Comportement** :
  - `go mod init github.com/yukki-project/yukki`
  - Go 1.22+ (pour `slog` stable et `range over int`)
  - `.gitignore` : `/yukki`, `/yukki.exe`, `/dist/`, `/.idea/`, `/.vscode/`
- **Tests** : aucun (bootstrap)

### O2 — `internal/clilog/clilog.go` — logger structuré

- **Signature** :
  ```go
  package clilog

  type Format string
  const (
      FormatText Format = "text"
      FormatJSON Format = "json"
  )

  func New(format Format, verbose bool) *slog.Logger
  ```
- **Comportement** : retourne un `*slog.Logger` configuré sur `os.Stderr`,
  format text (par défaut) ou JSON, niveau Info par défaut, Debug si
  `verbose`.
- **Tests** : table-driven (`format`, `verbose`) → vérification du
  `Handler` retourné via cast.

### O3 — `internal/templates/templates.go` — loader avec embed

- **Signature** :
  ```go
  package templates

  //go:embed embedded/story.md embedded/analysis.md embedded/canvas-reasons.md embedded/tests.md
  var embeddedFS embed.FS

  type Source string
  const (
      SourceProject  Source = "project"
      SourceEmbedded Source = "embedded"
  )

  type Loader struct{ ProjectDir string }

  func NewLoader(projectDir string) *Loader
  func (l *Loader) LoadStory() (content string, source Source, err error)
  ```
- **Comportement** :
  1. Tenter `<projectDir>/templates/story.md` ; si présent → `SourceProject`
  2. Sinon, lire `embedded/story.md` depuis `embeddedFS` → `SourceEmbedded`
  3. Si embed manquant → erreur (ne devrait pas arriver à build-time)
- **Tests** : 3 cas (présent, absent → embed, embed corrompu → erreur).

### O4 — `internal/artifacts/{writer.go, id.go, slug.go}` — story writer

- **Signatures** :
  ```go
  package artifacts

  // id.go
  func NextID(storiesDir, prefix string) (string, error)
  // Scanne <storiesDir>/<prefix>-NNN-*.md, extrait NNN max,
  // retourne fmt.Sprintf("%s-%03d", prefix, max+1).
  // Si max+1 >= 1000, élargit le padding (max+1 → "%04d", etc.)
  // ValidatePrefix(prefix string, strict bool) error
  func ValidatePrefix(prefix string, strict bool) error

  // slug.go
  func Slugify(title string) string
  // kebab-case, ≤ 5 mots, ASCII-fold pour les accents (é → e, etc.),
  // strip caractères non [a-z0-9-].

  // writer.go
  type Writer struct{ StoriesDir string }
  func NewWriter(storiesDir string) *Writer
  func (w *Writer) Write(id, slug, content string) (path string, err error)
  // Écrit dans <storiesDir>/<id>-<slug>.md via rename atomique :
  // 1. write to <id>-<slug>.md.tmp.<pid>
  // 2. validate frontmatter parseable (gopkg.in/yaml.v3)
  // 3. os.Rename(.tmp, final)
  ```
- **Comportement** : voir signatures ci-dessus.
- **Tests** :
  - `NextID` : table avec 0 / 1 / 999 / 1000 stories existantes, plusieurs préfixes
  - `Slugify` : table avec accents, ponctuation, longueur > 5 mots
  - `ValidatePrefix` : `[A-Z]+` accepté ; `123-FOO` rejeté ; en mode strict, hors liste blanche rejeté
  - `Writer.Write` : succès + frontmatter invalide → erreur + rename atomique

### O5 — `internal/provider/{provider.go, claude.go, mock.go}` — abstraction provider

- **Signatures** :
  ```go
  package provider

  type Provider interface {
      Name() string
      CheckVersion(ctx context.Context) error
      Generate(ctx context.Context, prompt string) (string, error)
  }

  // Sentinel errors
  var ErrNotFound = errors.New("provider CLI not found in PATH")
  var ErrVersionIncompatible = errors.New("provider CLI version incompatible")
  var ErrGenerationFailed = errors.New("provider generation failed")

  // claude.go
  type ClaudeProvider struct{ logger *slog.Logger }
  func NewClaude(logger *slog.Logger) *ClaudeProvider

  // mock.go (test only, build tag `test` ou exporté pour tests externes)
  type MockProvider struct{ Response string; Err error }
  func (m *MockProvider) Generate(...) ...
  ```
- **Comportement** :
  - `ClaudeProvider.CheckVersion` : `exec.LookPath("claude")` puis
    `claude --version` → parse + log Info ; renvoie `ErrNotFound` ou
    `ErrVersionIncompatible`
  - `ClaudeProvider.Generate` : `exec.CommandContext(ctx, "claude",
    "--print")` (ou flag équivalent pour non-interactive), stdin =
    prompt, capture stdout
- **Tests** :
  - `MockProvider` utilisé partout en test
  - `ClaudeProvider` testé via fake `PATH` (script shell qui simule
    `claude --version` / `claude` dans un répertoire temp)

### O6 — `internal/workflow/{story.go, prompt.go, prompts/story-system.md}` — orchestration

- **Signatures** :
  ```go
  package workflow

  //go:embed prompts/story-system.md
  var systemPromptTemplate string

  type StoryOptions struct {
      Description string
      Prefix      string
      StrictPrefix bool
      Force       bool
      ForcedID    string
      Logger      *slog.Logger
      Provider    provider.Provider
      TemplateLoader *templates.Loader
      Writer      *artifacts.Writer
  }

  func RunStory(ctx context.Context, opts StoryOptions) (path string, err error)

  func BuildStructuredPrompt(template, description string) string
  ```
- **Comportement** :
  1. Validate options (description non vide, etc. — sinon `ErrEmptyDescription`)
  2. `provider.CheckVersion`
  3. `templateLoader.LoadStory`
  4. `BuildStructuredPrompt(template, description)` : préfixe le template
     avec les règles SPDD (lues depuis `prompts/story-system.md` embed)
  5. `provider.Generate(ctx, prompt)` → markdown
  6. Extract title (1ʳᵉ ligne `# ...`) → `Slugify`
  7. `artifacts.NextID(storiesDir, prefix)` (sauf si `Force` + `ForcedID`)
  8. `writer.Write(id, slug, content)`
  9. Return path
- **Contenu de `prompts/story-system.md`** : prompt système qui
  injecte les règles INVEST, G/W/T déclaratif, sweet spot 3-5 AC,
  couverture happy/erreur/limite, slug kebab-case, frontmatter YAML
  exact attendu. Référence les refs methodology par leur nom (DDD,
  STRIDE, BVA, Y-Statement) pour que Claude puisse appliquer les
  techniques sans avoir besoin de relire les refs (le prompt résume
  les règles essentielles).
- **Tests** :
  - `BuildStructuredPrompt` : output contient les sections clés (INVEST, G/W/T)
  - `RunStory` : test d'intégration avec `MockProvider` qui renvoie un
    stub markdown valide → vérifie le fichier produit (frontmatter
    parseable, chemin correct)

### O7 — `cmd/yukki/main.go` — entrypoint Cobra

- **Comportement** :
  ```go
  func main() {
      var (
          prefix       string
          strictPrefix bool
          force        bool
          forcedID     string
          verbose      bool
          logFormat    string
      )
      rootCmd := &cobra.Command{Use: "yukki"}
      storyCmd := &cobra.Command{
          Use:   "story [description]",
          Short: "Generate a SPDD user story from a free-form description",
          Args:  cobra.MaximumNArgs(1),
          RunE: func(cmd *cobra.Command, args []string) error {
              desc := readDescription(args)  // arg or stdin
              if desc == "" { return ErrUserUsage }
              logger := clilog.New(clilog.Format(logFormat), verbose)
              cwd, _ := os.Getwd()
              opts := workflow.StoryOptions{
                  Description: desc, Prefix: prefix, StrictPrefix: strictPrefix,
                  Force: force, ForcedID: forcedID,
                  Logger: logger,
                  Provider: provider.NewClaude(logger),
                  TemplateLoader: templates.NewLoader(cwd),
                  Writer: artifacts.NewWriter(filepath.Join(cwd, "stories")),
              }
              path, err := workflow.RunStory(cmd.Context(), opts)
              if err != nil { return err }
              fmt.Fprintln(cmd.OutOrStdout(), path)
              return nil
          },
      }
      storyCmd.Flags().StringVar(&prefix, "prefix", "STORY", "...")
      storyCmd.Flags().BoolVar(&strictPrefix, "strict-prefix", false, "...")
      storyCmd.Flags().BoolVar(&force, "force", false, "...")
      storyCmd.Flags().StringVar(&forcedID, "id", "", "...")
      storyCmd.Flags().BoolVar(&verbose, "verbose", false, "...")
      storyCmd.Flags().StringVar(&logFormat, "log-format", "text", "text|json")
      rootCmd.AddCommand(storyCmd)
      if err := rootCmd.Execute(); err != nil {
          os.Exit(mapErrorToExitCode(err))
      }
  }
  ```
  - `mapErrorToExitCode` : `ErrUserUsage` → 1, `provider.ErrNotFound` /
    `ErrVersionIncompatible` / `ErrGenerationFailed` → 2, erreurs I/O → 3,
    succès → 0.
- **Tests** : test d'intégration via `cobra.Command.Execute()` avec args
  + `MockProvider` injecté.

### O8 — CI GitHub Actions

- **Fichier** : `.github/workflows/ci.yml`
- **Comportement** :
  - Build matrix : `ubuntu-latest`, `macos-latest`, `windows-latest`
  - Steps : checkout, setup-go (1.22), `go build ./...`, `go test ./...`,
    `gofmt -l . | grep . && exit 1 || true`
- **Tests** : exécuté par GitHub Actions, valide le ✅ vert sur PR.

---

## N — Norms

- **Stack** : Go 1.22+, idiomatique. `gofmt` strict.
- **Module path** : `github.com/yukki-project/yukki`.
- **Logging** : `log/slog` (stdlib), texte par défaut, JSON via
  `--log-format=json`. Niveau Info par défaut, Debug avec `--verbose`.
- **Codes de retour** : 0 succès, 1 erreur utilisateur, 2 erreur
  provider, 3 erreur I/O. Mappés via `mapErrorToExitCode` dans
  `cmd/yukki/main.go`.
- **Padding des id** : `STORY-001` (3 chiffres) par défaut, élargissement
  automatique à `STORY-1000`, `STORY-10000` au-delà (pas de repadding
  rétroactif).
- **Détection stdin piped** : `os.Stdin.Stat()` puis check
  `& os.ModeCharDevice == 0` (pattern canonique Go).
- **Templates embarqués** : 4 templates dès maintenant (`story`,
  `analysis`, `canvas-reasons`, `tests`) via `embed.FS` dans
  `internal/templates/embedded/`. Source de vérité = `spdd/templates/`
  copié au build via `go generate` ou via tâche CI.
- **Concurrence** : rename atomique pour l'écriture
  (`<id>-<slug>.md.tmp.<pid>` → `<id>-<slug>.md`). Pas de lock file —
  si deux invocations calculent le même id, la seconde écrase la
  première au moment du rename ; `os.Rename` est atomique sur ext4 /
  NTFS / APFS, mais le risque résiduel est accepté en v1 (probabilité
  faible, mitigation par convention humaine).
- **Frontmatter validation** : post-génération, `yaml.Unmarshal` du
  frontmatter (entre les deux `---`) ; si erreur → `ErrInvalidFrontmatter`
  (catégorie I/O).
- **Erreurs** : sentinel errors exportées
  (`provider.ErrNotFound`, `workflow.ErrEmptyDescription`,
  `artifacts.ErrInvalidPrefix`, etc.) ; toujours wrappées avec
  `fmt.Errorf("...: %w", err)`.
- **Cross-platform** : `path/filepath` partout (jamais `path`).
  Newlines normalisées en LF dans les fichiers produits.
- **Encodage** : UTF-8.
- **Tests** :
  - Table-driven là où applicable
  - `MockProvider` pour tous les tests workflow
  - Pas de test qui invoque réellement `claude` (CI sans secret)
  - Coverage cible : ≥ 70 % sur `internal/`
- **Pas de Makefile obligatoire en v1** — `go build`, `go test`
  suffisent. Un `Makefile` viendra dans une story dédiée si besoin.
- **Préfixes d'ID** : free-form `[A-Z]+` par défaut (validation regex)
  ; flag `--strict-prefix` pour activer la liste blanche
  `STORY|EXT|BACK|CORE|UI|INT|DOC|OPS|META`.

---

## S — Safeguards

- **Aucun SDK Anthropic embarqué** — la dépendance est exclusivement le
  `claude` CLI externe. `go.sum` ne doit jamais contenir
  `github.com/anthropics/...`.
- **Aucune assumption sur la version de `claude`** — toujours appeler
  `CheckVersion` au démarrage, warner si majeure différente de la
  version testée (à figer dans le code).
- **Aucun fichier story orphelin** en cas d'échec — si `claude` crash
  ou si la validation frontmatter échoue, aucun fichier final ne doit
  exister dans `stories/`. Le `.tmp.<pid>` peut subsister mais sera
  ignoré par `NextID` (seuls les fichiers matchant `<prefix>-NNN-*.md`
  exact sont scannés).
- **Aucun secret loggé** — même en `--verbose`, ne pas logger la
  description complète (pourrait contenir des données sensibles).
  Logger les métadonnées (longueur, hash court) à la place.
- **Aucun chemin absolu hardcodé** — toujours relatif au cwd ou via
  `filepath`.
- **Aucun breaking change** sur le frontmatter convention SPDD posée
  par les artefacts existants (story / analysis / canvas / refs).
- **Aucune dépendance externe** au-delà de Cobra + stdlib + `yaml.v3`
  pour la validation. Si on a besoin d'autre chose, c'est un signe
  qu'on s'éloigne de la philosophie *"orchestration légère"*.
- **Aucun mode interactif Q&A** — out of scope CORE-001 (post-MVP).
- **Aucune écriture en dehors de `<cwd>/stories/`** — pas de
  configuration globale, pas de cache disque hors du projet courant.

---

## Changelog

- 2026-04-30 — v1 — création initiale (status: draft, prêt pour
  `/spdd-generate`)
