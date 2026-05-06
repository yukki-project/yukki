---
id: CORE-005
slug: scaffold-skills-on-init
story: .yukki/stories/CORE-005-scaffold-skills-on-init.md
analysis: .yukki/analysis/CORE-005-scaffold-skills-on-init.md
status: draft
created: 2026-05-06
updated: 2026-05-06
---

# Canvas REASONS — Scaffolding des skills Claude/Copilot lors de l'initialisation d'un projet

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Après `InitializeYukki(dir)`, un nouveau projet yukki reçoit le dossier `.yukki/`
avec ses sous-répertoires et ses templates, mais pas les 7 slash commands SPDD
(`.claude/commands/yukki-*.md` et `.github/skills/yukki-*/SKILL.md`). L'utilisateur
doit les copier manuellement, ce qui crée une friction inutile à l'onboarding.

### Definition of Done

- [ ] `InitializeYukki("")` continue de retourner une erreur (non-régression)
- [ ] `InitializeYukki(dir)` sur répertoire vide crée `.claude/commands/yukki-*.md`
  pour les 7 skills (yukki-story, yukki-analysis, yukki-reasons-canvas, yukki-generate,
  yukki-api-test, yukki-prompt-update, yukki-sync)
- [ ] `InitializeYukki(dir)` sur répertoire vide crée `.github/skills/yukki-*/SKILL.md`
  pour les 7 skills
- [ ] Si un fichier skill existe déjà, `InitializeYukki` ne l'écrase pas
- [ ] Si seulement certains skills sont présents, les manquants sont créés sans
  toucher les existants
- [ ] `.github/` existant avec d'autres fichiers n'est pas modifié
- [ ] Répertoires parents manquants (`.claude/commands/`, `.github/skills/yukki-*/`)
  sont créés via `os.MkdirAll`

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `SkillEntry` | Représentation d'un skill à scaffolder | `destPath string` (relatif à `dir`), `content []byte` | Créé au chargement de la liste embarquée ; consommé par `scaffoldSkills` |
| `embed.FS` (skills) | FS embarqué dans le binaire portant les 14 fichiers skills | — | Initialisé au link-time via `//go:embed` ; en lecture seule |

### Relations

- `InitializeYukki` ⟶ `scaffoldSkills(dir, skillEntries)` : appel interne,
  `scaffoldSkills` ne connaît pas `App`
- `internal/skills` ⟶ `embed.FS` : le package expose `Entries() []SkillEntry`
  qui lit depuis `embeddedFS`
- `internal/uiapp` ⟶ `internal/skills` : import unidirectionnel, cohérent
  avec la règle `depguard` existante

---

## A — Approach

`InitializeYukki` appelle en fin de fonction un nouveau helper `scaffoldSkills(dir string, entries []SkillEntry) error`.
Ce helper reçoit la liste des skills depuis `skills.Entries()` et pour chacun :
1. Calcule le chemin absolu destination (`filepath.Join(dir, entry.DestPath)`)
2. Crée les dossiers parents via `os.MkdirAll`
3. Teste l'existence du fichier via `os.Stat` — si le fichier existe déjà, skip
4. Écrit le contenu avec `os.WriteFile(dst, entry.Content, 0o644)`
5. Fail-fast à la première erreur (cohérent avec la boucle templates existante)

Le package `internal/skills` est créé sur le modèle de `internal/templates` :
- `//go:embed` sur un sous-répertoire `embedded/` contenant les 14 fichiers
- Une fonction `Entries() []SkillEntry` retourne les entrées avec leur chemin cible
- Pas de `Loader` (pas de fallback projet) : les skills sont always-embedded

Les 14 fichiers dans `internal/skills/embedded/` sont des **copies** des originaux
(`.claude/commands/yukki-*.md` et `.github/skills/yukki-*/SKILL.md`). Un `go generate`
les synchronise.

### Alternatives considérées

- **Package `skills/` à la racine** — évite la duplication mais sort du pattern
  `internal/` et expose le package hors du module. Écarté pour cohérence avec
  `internal/templates`.
- **Download réseau à l'init** — nécessite un accès internet, impossible en
  environnement air-gap. Écarté.
- **`//go:embed ../../.claude/`** — interdit par la spec Go (`//go:embed` ne peut
  pas remonter hors du module directory de son package). Écarté.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/skills` | `skills.go`, `doc.go`, `embedded/` (14 fichiers) | **Création** |
| `internal/uiapp` | `app.go`, `app_test.go` | **Modification** — extension `InitializeYukki` + 4 tests |

### Schéma de flux

```
InitializeYukki(dir)
  │
  ├─ [existant] os.MkdirAll × 9 (.yukki/subdirs)
  ├─ [existant] os.WriteFile × 7 (templates — toujours écrasés)
  │
  └─ [nouveau]  scaffoldSkills(dir, skills.Entries())
                  │
                  └─ pour chaque SkillEntry:
                       os.MkdirAll(parent(dst))
                       os.Stat(dst) → skip si existe
                       os.WriteFile(dst, content, 0o644)

internal/skills/embedded/
  ├── claude/yukki-story.md          → dest: .claude/commands/yukki-story.md
  ├── claude/yukki-analysis.md       → dest: .claude/commands/yukki-analysis.md
  ├── claude/yukki-reasons-canvas.md → dest: .claude/commands/yukki-reasons-canvas.md
  ├── claude/yukki-generate.md       → dest: .claude/commands/yukki-generate.md
  ├── claude/yukki-api-test.md       → dest: .claude/commands/yukki-api-test.md
  ├── claude/yukki-prompt-update.md  → dest: .claude/commands/yukki-prompt-update.md
  ├── claude/yukki-sync.md           → dest: .claude/commands/yukki-sync.md
  ├── copilot/yukki-story.md         → dest: .github/skills/yukki-story/SKILL.md
  ├── copilot/yukki-analysis.md      → dest: .github/skills/yukki-analysis/SKILL.md
  ├── copilot/yukki-reasons-canvas.md→ dest: .github/skills/yukki-reasons-canvas/SKILL.md
  ├── copilot/yukki-generate.md      → dest: .github/skills/yukki-generate/SKILL.md
  ├── copilot/yukki-api-test.md      → dest: .github/skills/yukki-api-test/SKILL.md
  ├── copilot/yukki-prompt-update.md → dest: .github/skills/yukki-prompt-update/SKILL.md
  └── copilot/yukki-sync.md          → dest: .github/skills/yukki-sync/SKILL.md
```

---

## O — Operations

### O1 — Créer `internal/skills/embedded/` et copier les 14 fichiers sources

- **Module** : `internal/skills`
- **Fichiers** :
  - `internal/skills/embedded/claude/yukki-{story,analysis,reasons-canvas,generate,api-test,prompt-update,sync}.md`
  - `internal/skills/embedded/copilot/yukki-{story,analysis,reasons-canvas,generate,api-test,prompt-update,sync}.md`
- **Signature** : opération filesystem (pas de code Go)
- **Comportement** :
  1. Créer `internal/skills/embedded/claude/` et `internal/skills/embedded/copilot/`
  2. Copier `.claude/commands/yukki-*.md` → `internal/skills/embedded/claude/`
     (renommer : `yukki-story.md` → `yukki-story.md`, etc.)
  3. Copier `.github/skills/yukki-*/SKILL.md` → `internal/skills/embedded/copilot/`
     (renommer : `SKILL.md` → `yukki-story.md` / `yukki-analysis.md` / etc.)
- **Tests** : vérifier que les 14 fichiers existent et sont non-vides (test de build)

### O2 — Créer le package `internal/skills`

- **Module** : `internal/skills`
- **Fichiers** : `internal/skills/skills.go`, `internal/skills/doc.go`
- **Signature** :
  ```go
  package skills

  import (
      "embed"
      "path/filepath"
  )

  //go:embed embedded/claude embedded/copilot
  var embeddedFS embed.FS

  // SkillEntry is a skill file to be written to a project directory.
  type SkillEntry struct {
      // DestPath is the path relative to the project root where the skill
      // should be written (e.g. ".claude/commands/yukki-story.md").
      DestPath string
      // Content is the raw file content from the embedded FS.
      Content  []byte
  }

  // Entries returns the list of all embedded skill entries with their
  // destination paths relative to the project root. The list is stable
  // (alphabetical within each provider group).
  func Entries() []SkillEntry
  ```
- **Comportement de `Entries()`** :
  1. Itérer sur `embedded/claude/*.md` via `embeddedFS.ReadDir("embedded/claude")`
  2. Pour chaque fichier `embedded/claude/yukki-X.md` :
     - lire le contenu via `embeddedFS.ReadFile`
     - créer un `SkillEntry{DestPath: ".claude/commands/yukki-X.md", Content: data}`
  3. Itérer sur `embedded/copilot/*.md`
  4. Pour chaque fichier `embedded/copilot/yukki-X.md` :
     - créer un `SkillEntry{DestPath: filepath.Join(".github", "skills", "yukki-X", "SKILL.md"), Content: data}`
  5. Retourner la slice (14 entrées)
- **Tests** :
  - `TestEntries_Count` : `len(Entries()) == 14`
  - `TestEntries_NoneEmpty` : aucun `Content` vide
  - `TestEntries_DestPaths` : vérifier la présence de `.claude/commands/yukki-story.md`
    et `.github/skills/yukki-story/SKILL.md`

### O3 — Ajouter `scaffoldSkills` dans `internal/uiapp/app.go`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go`
- **Signature** :
  ```go
  // scaffoldSkills writes each SkillEntry from entries into dir, skipping
  // any file that already exists. Parent directories are created as needed.
  // Returns the first error encountered (fail-fast).
  func scaffoldSkills(dir string, entries []skills.SkillEntry) error
  ```
- **Comportement** :
  1. Pour chaque `entry` dans `entries` :
     a. `dst := filepath.Join(dir, entry.DestPath)`
     b. `if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil { return fmt.Errorf(...) }`
     c. `_, err := os.Stat(dst)` :
        - `err == nil` → fichier existe → `continue`
        - `errors.Is(err, os.ErrNotExist)` → écrire
        - autre erreur → `return fmt.Errorf("stat %s: %w", dst, err)`
     d. `if err := os.WriteFile(dst, entry.Content, 0o644); err != nil { return fmt.Errorf(...) }`
  2. Retourner `nil`
- **Tests** :
  - `TestScaffoldSkills_WritesAll` : sur `t.TempDir()`, 2 entrées fictives → vérifier présence
  - `TestScaffoldSkills_SkipsExisting` : fichier pré-existant avec contenu custom → contenu inchangé après appel
  - `TestScaffoldSkills_CreatesParentDirs` : chemin avec sous-dossiers inexistants → créés
  - `TestScaffoldSkills_PropagatesWriteError` : `os.WriteFile` sur répertoire en lecture seule → erreur non-nil

### O4 — Étendre `InitializeYukki` pour appeler `scaffoldSkills`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go`
- **Signature** : `func (a *App) InitializeYukki(dir string) error` (inchangée)
- **Comportement** — ajouter après la boucle templates existante :
  ```go
  if err := scaffoldSkills(dir, skills.Entries()); err != nil {
      return fmt.Errorf("scaffold skills: %w", err)
  }
  if a.logger != nil {
      a.logger.Info("yukki initialized", "dir", dir)
  }
  return nil
  ```
  (Le `logger.Info` existant est déplacé après `scaffoldSkills`)
- **Tests** — étendre `TestApp_InitializeYukki_Success` :
  - Vérifier `filepath.Join(dir, ".claude", "commands", "yukki-story.md")` existe
  - Vérifier `filepath.Join(dir, ".github", "skills", "yukki-story", "SKILL.md")` existe
- **Tests** — nouveaux dans le bloc `--- InitializeYukki ---` :
  - `TestApp_InitializeYukki_SkillsCreated` : projet vide → 7 skills Claude + 7 Copilot créés
  - `TestApp_InitializeYukki_SkillsNotOverwritten` : un skill pré-existant custom → contenu préservé
  - `TestApp_InitializeYukki_PartialSkills` : 3 skills Claude présents → les 4 manquants créés

---

## N — Norms

- **Package `internal/`** : le package `internal/skills` ne doit pas importer `cobra`,
  `wails`, ni aucun package UI — cohérent avec la règle `depguard` de `internal/templates`.
- **`embed.FS`** : la directive `//go:embed` ne peut référencer que des chemins
  descendants du répertoire du package. Les fichiers embarqués sont une copie
  des sources dans `embedded/`.
- **Fail-fast** : toute erreur dans `scaffoldSkills` est retournée immédiatement
  et wrappée avec `fmt.Errorf("scaffold skills: %w", err)`.
- **Idempotence** : `InitializeYukki` reste idempotent — un second appel ne
  doit pas modifier les fichiers existants (ni templates, ni skills).
- **Tests** : pattern `t.TempDir()` + assertions `os.Stat` / `os.ReadFile`,
  cohérent avec les tests existants dans `app_test.go`.
- **Logging** : `slog` via `a.logger` uniquement dans les méthodes `App` ; pas
  de logging dans `scaffoldSkills` ni `skills.Entries()`.

---

## S — Safeguards

- **Sécurité** — Ne jamais écrire en dehors de `dir` : `filepath.Join(dir, entry.DestPath)`
  doit rester sous `dir`. Si `entry.DestPath` contient `..`, le résultat remonterait
  hors de `dir`. Invariant : `Entries()` ne retourne que des chemins relatifs sans
  composante `..` — à garantir dans le test `TestEntries_DestPaths`.
- **Non-écrasement** — `scaffoldSkills` ne doit **jamais** appeler `os.WriteFile`
  sur un fichier dont `os.Stat` a retourné `nil` (fichier existant). Cette règle
  est non-négociable : elle protège les customisations utilisateur.
- **Périmètre** — `scaffoldSkills` n'écrit que des fichiers dont le chemin cible
  commence par `.claude/` ou `.github/skills/yukki-*/`. Il ne crée pas de
  `.yukki/` ni aucun autre chemin non listé dans `skills.Entries()`.
- **Cohérence embed** — Les fichiers dans `internal/skills/embedded/` sont la
  copie canonique des skills. **Ne jamais les modifier directement** : toujours
  modifier la source (`.claude/commands/` ou `.github/skills/`) puis
  re-synchroniser via `go generate`.
- **Compatibilité** — Ne pas modifier la signature de `InitializeYukki` ni
  le comportement existant sur la partie `.yukki/` (sous-dossiers + templates).
  Les tests `TestApp_InitializeYukki_*` existants doivent tous passer sans
  modification.
