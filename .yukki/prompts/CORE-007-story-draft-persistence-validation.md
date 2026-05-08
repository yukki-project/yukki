---
id: CORE-007
slug: story-draft-persistence-validation
story: .yukki/stories/CORE-007-story-draft-persistence-validation.md
analysis: .yukki/analysis/CORE-007-story-draft-persistence-validation.md
status: implemented
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — Persistance des brouillons SPDD et validation front-matter côté Go

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

L'éditeur SPDD (UI-014a..e) conserve son état **uniquement en mémoire** : fermer
l'application détruit le brouillon en cours. De plus, les règles de validation du
front-matter sont implémentées en JavaScript côté front — elles peuvent diverger
silencieusement des règles Go utilisées par la CLI `yukki story`.

### Definition of Done

- [ ] Un brouillon SPDD sauvegardé via `DraftSave` est restitué byte-pour-byte par `DraftLoad` avec le même id.
- [ ] Au démarrage de l'app, si des brouillons existent, un dialog de restoration propose les n brouillons triés par `updated` décroissant.
- [ ] `StoryValidate` retourne une `ValidationReport` avec au moins un `FieldError{Field:"id", Severity:"error"}` pour un id malformé.
- [ ] `ValidateID`, `ValidateSlug`, `ValidateStatus`, `ValidateDates` renvoient `nil` sur les entrées valides et une erreur explicite sur les invalides.
- [ ] `ValidateModules` retourne un `ModuleWarning` pour chaque module absent de la liste connue, et une erreur (pas un warning) pour chaque module syntaxiquement invalide (double `/`, espace, etc.).
- [ ] `DraftSave` crée `<configDir>/yukki/drafts/` s'il n'existe pas (premier lancement).
- [ ] `DraftSave` avec un id vide écrit sous la clé `unsaved-<epoch-ms>.json` sans erreur.
- [ ] `DraftLoad(id)` avec un id contenant `../` retourne une erreur (`ErrPathTraversal`).
- [ ] Roundtrip `DraftSave` → `DraftLoad` est idempotent sous appels concurrents (go test -race).
- [ ] Le package `internal/storyspec` est importable par la CLI sans dépendance vers `internal/uiapp`.

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Draft` | Brouillon SPDD en cours de rédaction, état partiel possible | `ID string`, `Slug string`, `Title string`, `Status string`, `Created string`, `Updated string`, `Owner string`, `Modules []string`, `Sections map[string]string`, `AC []AcceptanceCriterion`, `SavedAt time.Time` | créé implicitement à la première frappe → sauvegardé → éventuellement exporté (CORE-009) ou supprimé |
| `AcceptanceCriterion` | Un critère AC G/W/T rattaché à un draft | `ID string`, `Title string`, `Given string`, `When string`, `Then string` | créé, modifié, supprimé dans Draft |
| `DraftSummary` | Vue allégée d'un draft pour le dialog de restoration | `ID string`, `Title string`, `UpdatedAt time.Time` | lecture seule |
| `FieldError` | Une erreur ou warning de validation sur un champ précis | `Field string`, `Severity string` (`"error"\|"warning"`), `Message string` | produit par `Validator`, consommé par UI |
| `ValidationReport` | Agrégat de `FieldError` pour un draft complet | `Errors []FieldError` | value object, immuable une fois créé |
| `ModuleWarning` | Warning pour un module non reconnu (distinct d'une erreur syntaxique) | `Module string`, `Message string` | produit par `ValidateModules`, inclus dans `ValidationReport` |

### Relations

- `Draft` ⟶ `[]AcceptanceCriterion` : un draft contient 0..n ACs (composition)
- `DraftStore` ⟶ `Draft` : lit/écrit 1 draft par id dans le file system (repository)
- `Validator` ⟶ `ValidationReport` : produit un rapport à partir d'un `Draft` (factory)
- `uiapp.App` ⟶ `DraftStore` + `Validator` : orchestrateur, les deux sont injectés dans l'App via ses champs (ou via paramètre de basedir)

---

## A — Approach

Deux packages Go indépendants sont créés :

**`internal/draft`** : gère le cycle de vie des brouillons sur disque.
`DraftStore` est une struct avec un champ `BaseDir string` (par défaut
`os.UserConfigDir()/yukki/drafts`). Toutes les méthodes acceptent un `id`
qui est nettoyé via `filepath.Clean` + garde anti-traversal avant toute
opération I/O. Sérialisation en JSON strict (`encoding/json`) avec
`omitempty` sur les champs optionnels pour la compatibilité forward.

**`internal/storyspec`** : porte les règles de validation SPDD canoniques.
Aucune dépendance vers `internal/uiapp` ni vers `internal/draft` — ce package
est conçu pour être importé aussi bien par la CLI que par l'UI. Il s'appuie
sur `artifacts.Status` et `artifacts.Slugify` pour éviter la duplication des
règles existantes. La liste des modules connus est chargée depuis
`.yukki/modules.yaml` (à créer dans le projet, pas dans `.yukki/methodology/`)
avec un fallback sur une liste embarquée (`embed.FS`) si le fichier est absent.

**Décisions tranchées** :
- Chemin drafts : `os.UserConfigDir()/yukki/drafts` (hors repo). Pas de `.yukki/drafts/`.
- `ModuleWarning` vs erreur : un module syntaxiquement invalide (espace, `//`, etc.) → erreur ; un module syntaxiquement valide mais absent de la liste → warning.
- `DraftList()` trié par `UpdatedAt` décroissant (plus récent en tête du dialog).
- `modules.yaml` dans `.yukki/` (racine du projet), pas dans `.yukki/methodology/` (qui ne contient que des refs SPDD normatives).

Les bindings Wails sont ajoutés sur `uiapp.App` dans `internal/uiapp/bindings.go`
(pattern existant de `ReadArtifact` / `WriteArtifact`). `DraftStore` et
`Validator` sont construits au `OnStartup` avec le `configDir` réel.

### Alternatives considérées

- **Étendre `internal/artifacts`** — écarté : le package a l'invariant fort "frontmatter valide" incompatible avec des brouillons partiels en JSON.
- **Persistance localStorage/IndexedDB côté front** — écartée : limite ~5 Mo, non partageable, duplique la validation JS.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/draft` | `draft.go`, `store.go`, `store_test.go` | création |
| `internal/storyspec` | `validate.go`, `validate_test.go` | création |
| `internal/uiapp` | `bindings.go`, `bindings_test.go`, `app.go` | modification (nouveaux bindings + champs `store`/`validator`) |
| `internal/artifacts` | — | lecture seule (import `Status`, `Slugify`) |
| `frontend` | `stores/spdd.ts`, nouveau hook `useAutoSave.ts`, `SpddEditor.tsx` | modification |

### Schéma de flux

```
[React store mutation]
       │  debounce 2s
       ▼
useAutoSave hook
       │  DraftSave(Draft)  ← Wails binding
       ▼
uiapp.App.DraftSave()
       │
       ▼
draft.DraftStore.Save(draft)
       │  MkdirAll + temp-then-rename
       ▼
<configDir>/yukki/drafts/<id>.json

[App startup]
uiapp.App.OnStartup()
       │  DraftList()
       ▼
Si brouillons → EventsEmit("draft:restore-available", []DraftSummary)
       │
       ▼
[React] → RestoreDialog propose les drafts
```

---

## O — Operations

### O1 — Définir les types `Draft`, `AcceptanceCriterion`, `DraftSummary` dans `internal/draft`

- **Module** : `internal/draft`
- **Fichier** : `internal/draft/draft.go`
- **Signature** :
  ```go
  package draft

  import "time"

  type AcceptanceCriterion struct {
      ID    string `json:"id"`
      Title string `json:"title"`
      Given string `json:"given"`
      When  string `json:"when"`
      Then  string `json:"then"`
  }

  type Draft struct {
      ID       string                        `json:"id"`
      Slug     string                        `json:"slug"`
      Title    string                        `json:"title"`
      Status   string                        `json:"status"`
      Created  string                        `json:"created,omitempty"`
      Updated  string                        `json:"updated,omitempty"`
      Owner    string                        `json:"owner,omitempty"`
      Modules  []string                      `json:"modules,omitempty"`
      Sections map[string]string             `json:"sections,omitempty"`
      AC       []AcceptanceCriterion         `json:"ac,omitempty"`
      SavedAt  time.Time                     `json:"savedAt"`
  }

  type DraftSummary struct {
      ID        string    `json:"id"`
      Title     string    `json:"title"`
      UpdatedAt time.Time `json:"updatedAt"`
  }
  ```
- **Comportement** : types purs, aucune logique. `Sections` accepte les clés SPDD (`bg`, `bv`, `si`, `so`, `ac`, `oq`, `notes`).
- **Tests** : test de roundtrip JSON (`TestDraft_JSONRoundtrip`) — marshal/unmarshal avec tous les champs → égalité field-by-field. Test avec champs omitempty vides → les clés absentes du JSON n'apparaissent pas (vérification que `omitempty` fonctionne bien sur les slices/maps).

---

### O2 — Implémenter `DraftStore` avec `Save`, `Load`, `List`, `Delete`

- **Module** : `internal/draft`
- **Fichier** : `internal/draft/store.go`
- **Signature** :
  ```go
  // ErrPathTraversal est retourné quand l'id contient des séquences
  // de traversal (../, ..\, etc.) après filepath.Clean.
  var ErrPathTraversal = errors.New("draft: path traversal detected")

  // NewDraftStore crée un DraftStore dont les fichiers JSON sont stockés
  // dans baseDir. Si baseDir == "", os.UserConfigDir()+"/yukki/drafts" est utilisé.
  func NewDraftStore(baseDir string) (*DraftStore, error)

  // Save sérialise draft en JSON dans <baseDir>/<sanitisedID>.json via
  // écriture atomique (temp-then-rename). Crée baseDir avec MkdirAll si absent.
  // Si draft.ID == "", utilise "unsaved-<epoch-ms>" comme nom de fichier.
  func (s *DraftStore) Save(draft Draft) error

  // Load désérialise et retourne le draft identifié par id.
  // Retourne ErrPathTraversal si id contient "../" ou "..\" après Clean.
  // Retourne os.ErrNotExist (wrappé) si le fichier est absent.
  func (s *DraftStore) Load(id string) (Draft, error)

  // List retourne les DraftSummary de tous les fichiers *.json présents
  // dans baseDir, triés par UpdatedAt décroissant.
  func (s *DraftStore) List() ([]DraftSummary, error)

  // Delete supprime le fichier JSON associé à id.
  // Retourne ErrPathTraversal si id contient "../" ou "..\" après Clean.
  // Retourne nil si le fichier était déjà absent (idempotent).
  func (s *DraftStore) Delete(id string) error
  ```
- **Comportement** :
  1. `sanitiseID(id string) (string, error)` : `filepath.Clean(id)`, rejette si le résultat commence par `..` ou contient un séparateur de répertoire (`/` ou `\`).
  2. `Save` : `MkdirAll(s.baseDir, 0o700)`, marshal JSON avec `json.MarshalIndent` (lisibilité), écriture atomique via `os.CreateTemp(s.baseDir, "*.tmp")` + `os.Rename`.
  3. `Load` : `sanitiseID` puis `os.ReadFile` + `json.Unmarshal`.
  4. `List` : `os.ReadDir(s.baseDir)`, filtrer `*.json`, lire chaque fichier, construire `DraftSummary{ID: id, Title: draft.Title, UpdatedAt: draft.SavedAt}`, `sort.Slice` par `UpdatedAt` décroissant.
  5. `Delete` : `sanitiseID` puis `os.Remove`, ignorer `os.ErrNotExist`.
- **Tests** (selon [`.yukki/methodology/testing/testing-backend.md`](.yukki/methodology/testing/testing-backend.md) — pyramide 70/20/10, naming `Test<Type>_<Method>_<Scenario>`) :
  - `TestDraftStore_Save_CreatesFileOnFirstLaunch` — baseDir inexistant → fichier créé
  - `TestDraftStore_Save_EmptyID_UsesUnsavedKey` — id vide → fichier nommé `unsaved-*.json`
  - `TestDraftStore_Load_ReturnsStoredDraft` — Save+Load → égalité
  - `TestDraftStore_Load_PathTraversal_ReturnsError` — id `"../secret"` → `ErrPathTraversal`
  - `TestDraftStore_List_SortedByUpdatedAtDesc` — 3 drafts avec SavedAt différents → ordre décroissant
  - `TestDraftStore_Delete_IdempotentWhenAbsent` — Delete d'un id inexistant → nil
  - `TestDraftStore_Save_Load_RaceCondition` (avec `t.Parallel()` + goroutines) → `go test -race` ne signale aucun race

---

### O3 — Implémenter `internal/storyspec/validate.go`

- **Module** : `internal/storyspec`
- **Fichier** : `internal/storyspec/validate.go`
- **Signature** :
  ```go
  package storyspec

  import "github.com/yukki-project/yukki/internal/artifacts"

  // ModuleWarning décrit un module non reconnu (warning, pas une erreur).
  type ModuleWarning struct {
      Module  string
      Message string
  }

  // FieldError décrit une erreur ou warning de validation sur un champ.
  type FieldError struct {
      Field    string // "id", "slug", "status", "modules", "created", "updated"
      Severity string // "error" | "warning"
      Message  string
  }

  // ValidationReport agrège les FieldError produits par Validate.
  type ValidationReport struct {
      Errors []FieldError
  }

  // ValidateID vérifie que id correspond à ^[A-Z]+(-[A-Z]+)*-\d+[a-z]?$
  func ValidateID(id string) error

  // ValidateSlug vérifie le format kebab-case strict :
  //   - caractères [a-z0-9-] uniquement
  //   - ne commence et ne finit pas par '-'
  //   - pas de '--' consécutifs
  //   - pas de chiffre en tête du premier segment
  //   - longueur ≤ 80 caractères
  func ValidateSlug(slug string) error

  // ValidateStatus vérifie que status est dans artifacts.OrderedStatuses().
  func ValidateStatus(status string) error

  // ValidateModules vérifie chaque module :
  //   - format valide : [a-z0-9/_-]+ (pas d'espace, pas de '//' consécutifs)
  //   - retourne une erreur par module syntaxiquement invalide
  //   - retourne un ModuleWarning par module absent de knownModules
  func ValidateModules(modules []string, knownModules []string) ([]ModuleWarning, []error)

  // ValidateDates vérifie que created et updated sont en ISO 8601 (YYYY-MM-DD),
  // et que updated >= created.
  func ValidateDates(created, updated string) error

  // Validate produit un ValidationReport complet pour un draft.Draft.
  // Dépend de draft.Draft via import — ou accepte les champs individuellement
  // pour éviter le couplage cyclique.
  func Validate(id, slug, status, created, updated string, modules []string, knownModules []string) ValidationReport
  ```
- **Comportement** :
  - `ValidateID` : regex compilée au `init()` ou en `var`. Cas valides : `CORE-007`, `UI-014a`, `META-001`. Invalides : `core-007`, `007-CORE`, `CORE-`.
  - `ValidateSlug` : regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` + longueur ≤ 80. Pas de chiffre en tête = le premier char après Clean doit être `[a-z]`.
  - `ValidateStatus` : itère `artifacts.OrderedStatuses()`, retourne erreur si absent.
  - `ValidateModules` : regex module `^[a-z0-9][a-z0-9/_-]*$` (pas de `//`, pas d'espace). Entrées syntaxiquement invalides → `[]error`. Entrées valides mais inconnues → `[]ModuleWarning`.
  - `ValidateDates` : `time.Parse("2006-01-02", ...)` pour les deux, puis comparaison `updated >= created`.
  - `Validate` : appelle les 5 fonctions, agrège en `ValidationReport` ; les `ModuleWarning` sont inclus comme `FieldError{Field:"modules", Severity:"warning", ...}`.
- **Tests** (pyramide 70 % unit — logique pure, pas d'I/O) :
  - `TestValidateID_ValidCases` — table-driven : `CORE-007` ✓, `UI-014a` ✓, `META-001` ✓
  - `TestValidateID_InvalidCases` — `core-007` ✗, `007-CORE` ✗, `CORE-` ✗, `""` ✗
  - `TestValidateSlug_BoundaryLength` — 80 chars ✓, 81 chars ✗
  - `TestValidateSlug_StartsWithDigit` — `1foo` ✗
  - `TestValidateStatus_ValidAndInvalid` — `"draft"` ✓, `"unknown"` ✗
  - `TestValidateModules_UnknownIsWarning` — module valide mais absent → warning, pas erreur
  - `TestValidateModules_SyntaxErrorIsError` — `"my module"` (espace) → erreur
  - `TestValidateDates_UpdatedBeforeCreated` — retourne erreur
  - `TestValidate_ProducesReport_WithAllFieldErrors` — draft entièrement invalide → rapport avec chaque field représenté

---

### O4 — Charger `modules.yaml` depuis le projet ou fallback embed

- **Module** : `internal/storyspec`
- **Fichier** : `internal/storyspec/modules.go`
- **Signature** :
  ```go
  //go:embed default-modules.yaml
  var defaultModulesFS embed.FS

  // LoadKnownModules charge la liste des modules connus depuis
  // projectDir/.yukki/modules.yaml si le fichier existe,
  // sinon retourne la liste embarquée (default-modules.yaml).
  func LoadKnownModules(projectDir string) ([]string, error)
  ```
- **Comportement** :
  1. Tenter `os.ReadFile(filepath.Join(projectDir, ".yukki", "modules.yaml"))`.
  2. Si `os.ErrNotExist` → lire `defaultModulesFS` (embed).
  3. Parser le YAML : structure `{modules: [string]}`.
  4. Retourner la slice.
- **Fichier embarqué** : `internal/storyspec/default-modules.yaml` :
  ```yaml
  modules:
    - frontend
    - internal/uiapp
    - internal/provider
    - internal/artifacts
    - internal/draft
    - internal/storyspec
    - internal/workflow
    - internal/templates
    - internal/skills
    - internal/clilog
    - cmd/yukki
    - docs
  ```
- **Tests** :
  - `TestLoadKnownModules_FallbackWhenNoFile` — projectDir sans `modules.yaml` → liste embarquée non vide
  - `TestLoadKnownModules_ReadsProjectFile` — projectDir avec `modules.yaml` custom → liste custom

---

### O5 — Ajouter les bindings Wails sur `uiapp.App`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/bindings.go` (section ajoutée après les bindings existants)
- **Signature** :
  ```go
  // DraftSave persiste le brouillon dans <configDir>/yukki/drafts/.
  // Retourne une erreur si la sérialisation ou l'écriture échoue.
  func (a *App) DraftSave(d draft.Draft) error

  // DraftLoad recharge le brouillon identifié par id.
  // Retourne draft.ErrPathTraversal si id contient des séquences de traversal.
  // Retourne os.ErrNotExist (wrappé) si aucun brouillon ne correspond.
  func (a *App) DraftLoad(id string) (draft.Draft, error)

  // DraftList retourne les brouillons disponibles, triés par UpdatedAt décroissant.
  func (a *App) DraftList() ([]draft.DraftSummary, error)

  // DraftDelete supprime le brouillon identifié par id (idempotent).
  func (a *App) DraftDelete(id string) error

  // StoryValidate retourne un ValidationReport complet pour le draft passé.
  // Charge les modules connus depuis le projet actif (.yukki/modules.yaml)
  // avec fallback embed.
  func (a *App) StoryValidate(d draft.Draft) storyspec.ValidationReport
  ```
- **Comportement** :
  - `App` reçoit un champ `draftStore *draft.DraftStore` initialisé dans `OnStartup` avec `os.UserConfigDir()`.
  - `StoryValidate` appelle `storyspec.LoadKnownModules(a.activeProjectDir())` puis `storyspec.Validate(...)`.
  - Aucun mutex supplémentaire requis : `DraftStore` est safe (atomic rename) ; `storyspec.Validate` est sans état.
  - `OnStartup` émet `runtime.EventsEmit(a.ctx, "draft:restore-available", summaries)` si `DraftList()` retourne au moins 1 brouillon.
- **Tests** :
  - `TestApp_DraftSave_RoundtripViaDraftLoad` — save + load via bindings → égalité
  - `TestApp_StoryValidate_ReturnsFielErrorForBadID` — draft avec id `"bad"` → `ValidationReport` avec field `"id"` en `Severity: "error"`
  - `TestApp_DraftSave_PathTraversal_ReturnsError` — draft avec id `"../evil"` → erreur (propagation de `ErrPathTraversal`)

---

### O6 — Hook React `useAutoSave` et dialog de restoration

- **Module** : `frontend`
- **Fichier** : `frontend/src/hooks/useAutoSave.ts`
- **Signature** :
  ```ts
  /**
   * Déclenche DraftSave toutes les 2s d'inactivité (debounce).
   * @param draft Le brouillon courant du store Zustand.
   * @param enabled Active/désactive le hook (false pendant l'export).
   */
  export function useAutoSave(draft: Draft, enabled: boolean): void
  ```
- **Comportement** :
  1. `useEffect` sur `draft` avec `debounce` de 2000 ms.
  2. Appelle `DraftSave(draft)` (binding Wails généré dans `wailsjs/go/main/App.ts`).
  3. Erreur silencieuse dans la console (pas de toast — l'auto-save ne doit pas distraire).
  4. Cleanup : annuler le debounce au démontage.
- **Fichier** : `frontend/src/components/spdd/RestoreDialog.tsx`
- **Signature** :
  ```ts
  interface Props {
    summaries: DraftSummary[];
    onRestore: (id: string) => void;
    onDismiss: () => void;
  }
  export function RestoreDialog({ summaries, onRestore, onDismiss }: Props): JSX.Element
  ```
- **Comportement** : Dialog Radix UI. Liste les brouillons avec titre, date relative. Bouton "Reprendre" → `DraftLoad(id)` → dispatch dans le store Zustand. Bouton "Plus tard" → dismiss. Écouté via `runtime.EventsOn("draft:restore-available", ...)` dans `App.tsx` au montage.
- **Intégration** : `SpddEditor.tsx` importe `useAutoSave` et l'appelle avec le draft courant du store.
- **Tests** (selon [`.yukki/methodology/testing/testing-frontend.md`](.yukki/methodology/testing/testing-frontend.md)) :
  - `useAutoSave.test.ts` : mock de `DraftSave`, vérifier que l'appel est déclenché après 2s, pas avant ; vérifier le cleanup à l'unmount (vitest + fake timers).
  - `RestoreDialog.test.tsx` : render avec 2 summaries → 2 lignes ; click "Reprendre" → `onRestore` appelé avec le bon id.

---

## N — Norms

- **Go** : style idiomatique Go 1.22+. Pas de dépendances externes hors stdlib + `gopkg.in/yaml.v3` (déjà dans `go.mod`). Pas de `encoding/gob` (JSON uniquement pour interopérabilité).
- **Nommage Go** : `*Store` (accès data), `Validate*` (fonctions de validation pures), `Err*` pour les sentinelles d'erreur exportées, `Test<Type>_<Method>_<Scenario>` pour les tests (selon [`.yukki/methodology/testing/test-naming.md`](.yukki/methodology/testing/test-naming.md)).
- **Sécurité** : tout accès file system via `id` externe passe par `sanitiseID` avant `filepath.Join`. Pas de `fmt.Sprintf` pour construire des chemins avec des données utilisateur non nettoyées.
- **Tests Go** : pyramide 70/20/10 (logique pure en unit, I/O en integration via `t.TempDir()`). Pas de mocks pour l'I/O — utiliser `t.TempDir()`. Pas de `t.Skip` sauf sur contrainte OS documentée.
- **Frontend** : bindings Wails consommés depuis `wailsjs/go/main/App.ts` (généré). Ne pas appeler l'IPC directement. Debounce via `setTimeout`/`clearTimeout` natif (pas de lib externe).
- **Pas de breaking change** : les bindings Wails existants (`ReadArtifact`, `WriteArtifact`, `RunStory`, etc.) restent inchangés en signature.

---

## S — Safeguards

- **Ne jamais** construire un chemin file system avec `id` brut sans passer par `sanitiseID` — path traversal guard obligatoire (risque Sécurité de l'analyse).
- **Ne jamais** créer `internal/storyspec` avec une import de `internal/uiapp` — dépendance cyclique et violation du principe "CLI-importable".
- **Ne jamais** dupliquer l'énumération des statuts SPDD — toujours déléguer à `artifacts.OrderedStatuses()`.
- **Ne jamais** dupliquer la logique de slug — toujours aligner `ValidateSlug` sur ce que `artifacts.Slugify` peut produire (pas de dialecte différent).
- **Ne jamais** écrire un fichier draft directement avec `os.WriteFile` sans passer par le pattern temp-then-rename (risque de corruption Data).
- **Ne jamais** laisser un `.tmp` orphelin en cas d'erreur de rename — `defer os.Remove(tmp)` ou nettoyage explicite.
- **Interdit** de sauvegarder des données sensibles (tokens, clés API) dans le draft JSON — le draft ne porte que le contenu rédactionnel de la story.
- **Interdit** de valider syntaxiquement les modules avec une règle plus permissive que `^[a-z0-9][a-z0-9/_-]*$` — risque d'injection de chemin dans `LoadKnownModules`.
