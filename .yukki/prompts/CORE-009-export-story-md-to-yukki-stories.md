---
id: CORE-009
slug: export-story-md-to-yukki-stories
story: .yukki/stories/CORE-009-export-story-md-to-yukki-stories.md
analysis: .yukki/analysis/CORE-009-export-story-md-to-yukki-stories.md
status: synced
created: 2026-05-07
updated: 2026-05-09
---

# Canvas REASONS — Export du fichier .md final dans .yukki/stories/

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

L'éditeur SPDD (UI-014a..e) ne peut exporter une story que sous forme de
téléchargement Blob côté navigateur. Cette story implémente l'export réel dans
`.yukki/stories/` : sérialisation déterministe du `Draft` Go en Markdown SPDD
(`Render`), vérification de conformité post-rendu (`Conform`), écriture atomique
(`WriteAtomic`), et gestion des conflits. Le même chemin de code doit être
emprunté par la CLI `yukki story` pour garantir que les artefacts CLI et UI sont
byte-identiques.

### Definition of Done

- [ ] `storyspec.Render(draft Draft) ([]byte, error)` sérialise un draft en `.md` SPDD avec frontmatter YAML dans l'ordre canonique et sections dans l'ordre du template.
- [ ] `storyspec.Conform(rendered []byte) error` valide qu'un `.md` rendu contient les sections obligatoires dans l'ordre attendu ; retourne une erreur si une section obligatoire est manquante ou hors ordre.
- [ ] `storyspec.WriteAtomic(path string, content []byte) error` écrit atomiquement via `os.CreateTemp` + `os.Rename` dans le même dossier ; crée les dossiers intermédiaires.
- [ ] `StoryExport(draft Draft, options ExportOptions) (ExportResult, error)` appelle `Render` → `Conform` → contrôle conflit → `WriteAtomic`.
- [ ] Si la story existe et `options.Overwrite=false` → retourne `ExportConflictError` (sentinel wrappable) avec `ExistingPath` et `ExistingUpdatedAt`.
- [ ] `StoryExport` crée `.yukki/stories/` si absent (`os.MkdirAll 0755`).
- [ ] Sections `Open Questions` et `Notes` omises du `.md` si absentes ou vides dans le draft.
- [ ] Sections obligatoires (`Background`, `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria`) toujours présentes même vides.
- [ ] `storyspec.ValidateSlug` est appliqué au `Slug` du draft avant de construire le nom de fichier (garde anti-path traversal).
- [ ] Un test table-driven vérifie la byte-identité entre `Render(draft)` et un golden `.md` manuel.

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Draft` | Brouillon SPDD (CORE-007) | `ID`, `Slug`, `Title`, `Status`, `Created`, `Updated`, `Owner`, `Modules []string`, `Sections map[string]string`, `AC []AcceptanceCriterion` | input de `Render` |
| `ExportOptions` | Options de l'export | `Overwrite bool` | value object, passé à `StoryExport` |
| `ExportResult` | Résultat d'un export réussi | `Path string`, `Bytes int64`, `WrittenAt time.Time` | value object, retourné à l'UI |
| `ExportConflictError` | Erreur structurée quand une story existe sans overwrite | `ExistingPath string`, `ExistingUpdatedAt time.Time` — implémente `error` | retourné par `StoryExport`, testé via `errors.As` |

### Relations

- `StoryExport` ⟶ `Render` ⟶ `Conform` ⟶ `WriteAtomic` : pipeline séquentiel, court-circuité à chaque erreur
- `uiapp.App.StoryExport` ⟶ `storyspec.StoryExport` (interne) via `activeProjectStoriesDir()`

---

## A — Approach

**`internal/storyspec`** est enrichi de trois fonctions pures (`Render`, `Conform`,
`WriteAtomic`) qui constituent le pipeline de sérialisation SPDD. Aucune
dépendance vers `internal/uiapp` ni `internal/draft` : le package reste
importable depuis la CLI sans transitively dépendre de Wails.

**Sérialisation YAML** : le frontmatter est écrit manuellement avec
`fmt.Fprintf` dans l'ordre canonique strict (id, slug, title, status, created,
updated, owner, modules). On n'utilise pas `yaml.Marshal` pour garantir l'ordre
des clés et le style block (`- module`) indépendamment des options du marshaller.

**Sérialisation des sections** : `Render` itère sur une liste ordonnée de
`sectionDef{key, heading, required bool}`. Pour chaque section, si la valeur
est non-vide ou si la section est obligatoire, elle est incluse. Les ACs sont
sérialisés sous `## Acceptance Criteria` avec sous-sections `### AC1 — title`.

**`Conform`** reparse le `.md` produit pour valider l'ordre des sections via
une machine à états simple (pas de regex complexe) : il itère les lignes `## `,
vérifie l'ordre contre la liste canonique, et retourne une erreur si une
section obligatoire est absente ou si une section apparaît hors ordre.

**`WriteAtomic`** : `os.CreateTemp(dir, "*.tmp")` dans le même dossier que
la destination, `io.WriteAll`, `f.Close()`, `os.Rename`. Si `Rename` échoue
(rare sur Windows avec file lock), le tmp est supprimé et l'erreur est
retournée. Pattern identique à `DraftStore.Save`.

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Sérialisation YAML via `yaml.Marshal` avec struct taggée | L'ordre des clés n'est pas garanti sans `yaml.Node` ; surcoût pour 8 clés fixes |
| Réutilisation de `artifacts.Writer.Write` | `Writer.Write` prend un `string` pré-formaté sans `Conform` post-condition ; l'interface ne correspond pas |
| Template `text/template` | Surcoût pour un format fixe et ordonné ; l'ordre sectionnel est statique, mieux géré par une liste ordonnée + `strings.Builder` |

---

## S — Structure

| Module | Fichiers | Nature |
|---|---|---|
| `internal/storyspec` | `render.go` — `Render` + sectionDef | Création |
| `internal/storyspec` | `conform.go` — `Conform` | Création |
| `internal/storyspec` | `atomic.go` — `WriteAtomic` | Création |
| `internal/storyspec` | `export.go` — `ExportOptions`, `ExportResult`, `ExportConflictError` | Création |
| `internal/storyspec` | `render_test.go` — tests Render + Conform + WriteAtomic | Création |
| `internal/uiapp` | `bindings.go` — ajout `StoryExport` + `activeProjectStoriesDir` | Modification |
| `internal/uiapp` | `bindings_test.go` — tests `StoryExport` | Modification |

### Flux d'appel

```
[Frontend TS]
  DraftSave(draft)       ← CORE-007 (auto-save)
  StoryExport(draft, {Overwrite: false})
        │
[internal/uiapp bindings.go]
  a.StoryExport(draft, opts)
        │ Render(draft)
        │   → bytes ([]byte)
        │ Conform(bytes)
        │   → error si sections hors ordre
        │ Check conflict (os.Stat du path final)
        │   → ExportConflictError si Overwrite=false et fichier existe
        │ WriteAtomic(path, bytes)
        │   → ExportResult{Path, Bytes, WrittenAt}
        ↓
[runtime.EventsEmit]  "story:exported" → {path, bytes, writtenAt}
```

---

## O — Operations

### O1 — `storyspec.Render` : sérialisation Draft → Markdown SPDD

**Module** : `internal/storyspec`
**Fichier** : `internal/storyspec/render.go`

**Signature** :
```go
// Render serialises a Draft into a canonical SPDD Markdown artefact.
// The result is suitable for WriteAtomic and is validated by Conform.
// EOL is always '\n' regardless of the OS.
func Render(d draft.Draft) ([]byte, error)
```

**Comportement** :
1. Valider `d.ID` via `storyspec.ValidateID` et `d.Slug` via `storyspec.ValidateSlug`. Retourner une erreur si invalides.
2. Écrire le frontmatter YAML dans un `strings.Builder` :
   ```
   ---
   id: <d.ID>
   slug: <d.Slug>
   title: <d.Title>
   status: <d.Status>
   created: <d.Created>
   updated: <d.Updated>
   owner: <d.Owner>       # omis si vide
   modules:               # omis si vide
     - <module>
   ---
   ```
   `owner` et `modules` sont omis si respectivement `""` et `nil`/vide.
3. Écrire `\n# <d.Title>\n\n`.
4. Pour chaque section dans l'ordre canonique `[bg, bv, si, so, ac, oq, notes]` :
   - Si la section est **obligatoire** (`bg`, `bv`, `si`, `so`, `ac`) : toujours inclure même si le contenu est vide.
   - Si la section est **optionnelle** (`oq`, `notes`) : inclure seulement si la valeur est non-vide (ou pour `ac`, si des ACs existent).
   - Écrire `\n## <Heading>\n\n<content>\n`.
5. Pour la section `ac` : écrire chaque `AcceptanceCriterion` comme :
   ```
   ### AC1 — <title>

   - **Given** <given>
   - **When** <when>
   - **Then** <then>
   ```
6. Retourner `[]byte(sb.String())`, aucun `\r\n`.

**Tests** :
- `TestRender_GoldenFile` : draft complet → comparer avec `testdata/golden_story.md` (`bytes.Equal`).
- `TestRender_EmptyOptionalSections_Omitted` : draft sans `oq`/`notes` → sections absentes du `.md`.
- `TestRender_MandatorySections_AlwaysPresent` : draft avec `bg=""` → `## Background` présent mais vide.
- `TestRender_EOL_LF` : `bytes.Contains(result, []byte("\r\n"))` → false.
- `TestRender_InvalidID_ReturnsError` : `d.ID = "front-001"` → erreur non-nil.

---

### O2 — `storyspec.Conform` : vérification post-rendu de l'ordre des sections

**Module** : `internal/storyspec`
**Fichier** : `internal/storyspec/conform.go`

**Signature** :
```go
// Conform checks that rendered is a valid SPDD Markdown artefact:
// it has a parseable frontmatter and contains the mandatory sections
// in canonical order. Returns nil on success.
func Conform(rendered []byte) error
```

**Comportement** :
1. Appeler `artifacts.ValidateFrontmatter(string(rendered))` — retourner son erreur si non-nil.
2. Scanner les lignes `## <Heading>` dans `rendered`.
3. Vérifier l'ordre contre la liste canonique des sections obligatoires : `Background`, `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria`.
4. Si une section obligatoire est absente → `fmt.Errorf("section %q absente du .md rendu", heading)`.
5. Si une section apparaît avant une section qui devrait la précéder → `fmt.Errorf("section %q attendue avant %q", expected, found)`.
6. Sections optionnelles (`Open Questions`, `Notes`) : tolérées à leur position habituelle, ignorées si absentes.

**Tests** :
- `TestConform_ValidMarkdown_ReturnsNil` : le golden file généré par `Render` → `nil`.
- `TestConform_MissingMandatorySection` : supprimer `## Scope In` → erreur.
- `TestConform_WrongOrder` : réordonner `Background` après `Business Value` → erreur avec message explicite.
- `TestConform_NoFrontmatter` → erreur ErrInvalidFrontmatter.

---

### O3 — `storyspec.WriteAtomic` : écriture atomique sécurisée

**Module** : `internal/storyspec`
**Fichier** : `internal/storyspec/atomic.go`

**Signature** :
```go
// WriteAtomic writes content to path using a temp-file-then-rename pattern.
// It creates all missing parent directories (perm 0755).
// The temp file is created in the same directory as path to ensure
// os.Rename stays on the same volume.
func WriteAtomic(path string, content []byte) error
```

**Comportement** :
1. `os.MkdirAll(filepath.Dir(path), 0o755)`.
2. `f, err := os.CreateTemp(filepath.Dir(path), "*.tmp")` — dans le même dossier que `path`.
3. `f.Write(content)` ; `f.Close()`.
4. `os.Rename(f.Name(), path)` — si échec, `os.Remove(f.Name())` + retourner l'erreur.

**Tests** :
- `TestWriteAtomic_CreatesFile` : fichier absent → créé avec contenu correct.
- `TestWriteAtomic_OverwritesExisting` : fichier existant → remplacé.
- `TestWriteAtomic_CreatesMissingDirs` : dossier inexistant → créé.

---

### O4 — `storyspec.ExportConflictError` et types `ExportOptions` / `ExportResult`

**Module** : `internal/storyspec`
**Fichier** : `internal/storyspec/export.go`

**Signatures** :
```go
// ExportOptions controls the behaviour of StoryExport.
type ExportOptions struct {
    Overwrite bool
}

// ExportResult is returned by a successful StoryExport call.
type ExportResult struct {
    Path      string
    Bytes     int64
    WrittenAt time.Time
}

// ExportConflictError is returned by StoryExport when a story file already
// exists and Overwrite is false. Use errors.As to extract the details.
type ExportConflictError struct {
    ExistingPath      string
    ExistingUpdatedAt time.Time
}

func (e *ExportConflictError) Error() string

// StoryExport is the single entry point for both CLI and UI export.
// It calls Render → Conform → conflict check → WriteAtomic.
func StoryExport(d draft.Draft, opts ExportOptions, storiesDir string) (ExportResult, error)
```

**Comportement de `StoryExport`** :
1. `rendered, err := Render(d)` — retourner si err != nil.
2. `if err := Conform(rendered); err != nil` — retourner (ne jamais écrire un .md non conforme).
3. Construire `path = filepath.Join(storiesDir, d.ID+"-"+d.Slug+".md")`.
4. Garder anti-traversal : `storyspec.ValidateSlug(d.Slug)` déjà fait dans `Render` à l'étape 1 ; ajouter `filepath.Clean` + vérifier que le path est bien dans `storiesDir`.
5. Si `!opts.Overwrite` : `os.Stat(path)` → si le fichier existe, retourner `&ExportConflictError{ExistingPath: path, ExistingUpdatedAt: info.ModTime()}`.
6. `WriteAtomic(path, rendered)`.
7. Retourner `ExportResult{Path: path, Bytes: int64(len(rendered)), WrittenAt: time.Now()}`.

**Tests** :
- `TestStoryExport_NewStory_WritesFile` : draft valide, storiesDir vide → fichier créé, `ExportResult.Path` correct.
- `TestStoryExport_ConflictWithoutOverwrite` : fichier existant + `Overwrite=false` → `errors.As(..., *ExportConflictError)`.
- `TestStoryExport_ConflictWithOverwrite` : fichier existant + `Overwrite=true` → fichier écrasé, pas d'erreur.
- `TestStoryExport_InvalidSlug_ReturnsError` : `d.Slug = "../../../etc"` → erreur (ValidateSlug échoue avant Render).

---

### O5 — Binding Wails `App.StoryExport`

**Module** : `internal/uiapp`
**Fichier** : `internal/uiapp/bindings.go`

**Signature** :
```go
// StoryExport renders the draft to Markdown SPDD and writes it atomically
// to <activeProject>/.yukki/stories/<id>-<slug>.md.
// If the story already exists and options.Overwrite is false, it returns
// an ExportConflictError wrapped in a regular error (serialised as JSON
// by the Wails runtime).
func (a *App) StoryExport(d draft.Draft, options storyspec.ExportOptions) (storyspec.ExportResult, error)
```

**Comportement** :
1. `storiesDir := filepath.Join(a.activeProjectDir(), ".yukki", "stories")`.
2. Si `a.activeProjectDir() == ""` → retourner une erreur "no active project".
3. `result, err := storyspec.StoryExport(d, options, storiesDir)`.
4. Si `err == nil` : `runtime.EventsEmit(a.ctx, "story:exported", result)`.
5. Retourner `result, err`.

**Helper** `activeProjectStoriesDir()` : déjà découpé dans `activeProjectDir()` (CORE-007 O5), une ligne ajoutée.

**Tests** :
- `TestApp_StoryExport_NewStory_WritesFile` : draft valide, projet ouvert avec `.yukki/stories/` → fichier créé.
- `TestApp_StoryExport_Conflict_ReturnsConflictError` : fichier existant + `Overwrite=false` → `errors.As` match.

---

### O6 — Golden file `testdata/golden_story.md`

**Module** : `internal/storyspec`
**Fichier** : `internal/storyspec/testdata/golden_story.md`

**Contenu** : un `.md` SPDD complet rédigé à la main, correspondant byte-pour-byte au `Draft` défini dans `TestRender_GoldenFile`. Sert de référence immuable : si `Render` change le format, ce test rouge force une mise à jour explicite du golden.

**Technique** : lire le golden via `os.ReadFile("testdata/golden_story.md")` dans le test ; comparer avec `bytes.Equal`. Le golden est commité dans le repo.

---

## N — Norms

- **Go 1.22+, module `github.com/yukki-project/yukki`** : interfaces standard, tests `_test.go`, `t.TempDir()`.
- **Pas de dépendances externes nouvelles** : `gopkg.in/yaml.v3` n'est pas utilisé dans `render.go` (sérialisation manuelle) ; `fmt`, `strings`, `os`, `path/filepath`, `time` suffisent.
- **`internal/storyspec` n'importe jamais `internal/uiapp`** : invariant CORE-002 préservé (CLI-importable).
- **Importation `internal/draft`** : `internal/storyspec` peut importer `internal/draft` (sans cycle, draft ne dépend pas de storyspec).
- **EOL `\n` strict** : `Render` n'émet jamais `\r\n`. Validé par un test dédié.
- **Sections YAML** : `owner` et `modules` omis si vides (cohérence avec les drafts partiels).
- **Tests table-driven** pour `Render` et `Conform` (naming `Test<Func>_<Context>`).
- **`testdata/`** : golden files commités, jamais générés dynamiquement en test CI.

---

## S — Safeguards

- **Ne jamais écrire un `.md` sans avoir passé `Conform`** : le pipeline `Render → Conform → WriteAtomic` est indivisible dans `StoryExport`.
- **Ne jamais construire un chemin fichier depuis un slug non validé** : `ValidateSlug` est appelé dans `Render` avant toute concaténation de chemin.
- **Ne jamais appeler `StoryExport` depuis `internal/storyspec` avec une `storiesDir` vide** : le binding Wails vérifie `activeProjectDir() != ""` avant d'appeler `StoryExport`.
- **Ne jamais importer `internal/uiapp` depuis `internal/storyspec`** (dépendance unidirectionnelle obligatoire pour la CLI).
- **Ne jamais modifier `testdata/golden_story.md` sans régénérer le test** : un commentaire en tête du golden rappelle "Ce fichier est la référence de régression pour TestRender_GoldenFile".
- **Ne jamais silencier l'erreur de `Conform`** : si `Render` produit un `.md` non conforme, c'est un bug à corriger dans `Render`, pas à contourner.

---

## Open Questions

- [ ] **Hook git** : l'AC de la story mentionne `--git=true` optionnel. Décision : **hors scope CORE-009** — ne pas lancer de subprocess dans ce binding ; une story `CORE-010` ultérieure peut ajouter cette option via `internal/provider` si le besoin est confirmé.
- [ ] **Slug changé après premier export** : si le slug du draft change entre deux exports, `StoryExport` crée un nouveau fichier (nouveau nom) sans supprimer l'ancien. L'UI doit avertir l'utilisateur (`DraftLoad` → comparer slug du draft précédent avec le nouveau). À gérer dans UI-014f.
