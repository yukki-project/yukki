---
id: OPS-001
slug: debug-mode-logs-and-error-boundary
story: .yukki/stories/OPS-001-debug-mode-logs-and-error-boundary.md
analysis: .yukki/analysis/OPS-001-debug-mode-logs-and-error-boundary.md
status: synced
created: 2026-05-09
updated: 2026-05-09
---

# Canvas REASONS — Mode debug + logs persistants + error boundary

> Spécification exécutable. Source de vérité pour `/yukki-generate`
> et `/yukki-sync`. Toute divergence code ↔ canvas se résout dans
> ce fichier d'abord.

---

## R — Requirements

### Problème

L'app yukki (alpha desktop, Go + Wails + React) tombe sur un écran
gris dès qu'un composant React jette une exception non rattrapée,
et ne laisse aucune trace exploitable une fois la fenêtre fermée :
les `console.*` du frontend disparaissent et le `slog` Go écrit
seulement sur `stderr` (rarement consulté). Cette story introduit
trois briques complémentaires : (1) une `ErrorBoundary` React qui
remplace l'écran gris par un panneau d'erreur lisible, (2) un
fichier de log quotidien `<configDir>/yukki/logs/yukki-YYYY-MM-DD.log`
qui agrège les events frontend **et** Go en format texte slog
grep-able, (3) un toggle « Mode debug » persisté qui abaisse le
seuil de WARN à DEBUG et signale son état via un badge orange dans
la TitleBar.

### Definition of Done

- [ ] **DoD1** — Un crash React (ex: bouton « simuler crash » réservé
      au mode debug) affiche un panneau d'erreur lisible avec
      message + stack + 3 boutons (Copier / Ouvrir les logs / Recharger)
      et **non** l'écran gris (cf. AC1 story).
- [ ] **DoD2** — Après n'importe quelle erreur loggée, le fichier
      `<configDir>/yukki/logs/yukki-YYYY-MM-DD.log` existe et contient
      au moins l'event correspondant avec `timestamp`, `level`,
      `source` (`frontend` ou `go`), `msg`, et `stack` si applicable
      (cf. AC2 story).
- [ ] **DoD3** — En mode debug, le fichier de log contient des
      entrées `DEBUG` décrivant les bindings Wails appelés par une
      action utilisateur ordinaire (ex: ouverture de story dans la
      HubList) — entrées absentes en mode normal (cf. AC3 story).
- [ ] **DoD4** — Si le dossier logs est inaccessible (permissions /
      disque plein), un toast s'affiche et l'app retombe sur la
      `console` standard sans planter (cf. AC4 story).
- [ ] **DoD5** — Le bouton « Ouvrir les logs » dans le panneau
      d'erreur ET dans le FileMenu ouvre l'explorateur OS sur le
      dossier `<configDir>/yukki/logs/` (cf. AC5 story).
- [ ] **DoD6** — Le toggle « Mode debug » est accessible via item
      du `FileMenu` ET raccourci global `Ctrl+Shift+D` ; son état
      est persisté dans `<configDir>/yukki/settings.json` ; un
      badge orange « DEBUG ON » apparaît dans la TitleBar tant que
      le mode est actif.
- [ ] **DoD7** — Les fichiers de log de plus de 7 jours sont
      supprimés au démarrage de l'app (rotation par âge mtime,
      pas par décompte).
- [ ] **DoD8** — La suite vitest existante (183/183) reste verte ;
      les nouvelles unités (`configdir`, `settings`, façade logger,
      ErrorBoundary, store settings) ont chacune leurs tests.
- [ ] **DoD9** — Niveau par défaut **INFO** (amendement post-revue) :
      le fichier de log contient au minimum `ui startup` au
      démarrage normal, sans activer le mode debug (cf. AC8).
- [ ] **DoD10** — Surface debug **gated par build tag `devbuild`** :
      `wails build` (sans tag) ne contient ni le menu Developer,
      ni le drawer logs, ni le badge, ni le flag CLI `--debug`.
      `wails build -tags devbuild` réintroduit l'ensemble. Vérifié
      par grep sur le binaire ou par AC7.
- [ ] **DoD11** — **Drawer logs** : en build dev + mode debug,
      cliquer sur le badge `DEBUG ON` ouvre un drawer rétractable
      depuis le bas avec tail des 500 dernières entrées du
      fichier du jour, filtres niveau + source, fermeture `Esc`
      (cf. AC6).
- [ ] **DoD12** — **Menu Developer** dédié à droite de Help dans
      la TitleBar contient les items `Activer le mode debug` et
      `Ouvrir le dossier de logs`. Le FileMenu n'expose plus
      d'item debug (cohérence métier fichier/projet).

---

## E — Entities

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `LogEvent` | Une entrée de log unifiée (frontend ou Go) | `timestamp`, `level`, `source`, `msg`, `stack?` | éphémère — flush sur disque |
| `LogFile` | Le fichier quotidien `yukki-YYYY-MM-DD.log` | path, mtime, size | créé à la première écriture du jour, supprimé au démarrage si > 7 jours |
| `Settings` | État persisté du Mode debug | `debugMode bool` | lu au démarrage, écrit à chaque toggle |
| `ConfigDir` | Racine `<UserConfigDir>/yukki/` | `BaseDir() string` | calculé une fois par session |
| `RuntimeError` | Une exception React/JS rattrapée par l'ErrorBoundary | `error: Error`, `errorInfo: ErrorInfo` | éphémère — affichée + loggée |

### Relations

- `LogEvent` ⟶ `LogFile` : N vers 1 (tous les events d'une journée vont dans le même fichier)
- `Settings` ⟵ `ConfigDir` : 1 vers 1 (un seul `settings.json` par installation)
- `LogFile` ⟵ `ConfigDir` : N vers 1 (jusqu'à 7 fichiers retenus sous `<configDir>/yukki/logs/`)
- `RuntimeError` ⟶ `LogEvent` : 1 vers 1 (chaque exception capturée produit un event de niveau ERROR avec stack)
- `Settings.debugMode` ⟶ niveau slog : si `true` → `slog.LevelDebug`, sinon `slog.LevelWarn`

### Invariants

- **I1 — Logs jamais perdus pour rien** : si l'écriture fichier
  échoue, l'app retombe sur `console`/`stderr` et continue
  (jamais de crash provoqué par le logger lui-même).
- **I2 — Toggle ne change que le seuil** : activer le mode debug
  bascule WARN → DEBUG mais ne change ni le chemin du fichier,
  ni le format. Un seul fichier par jour, peu importe le mode.
- **I3 — ErrorBoundary survit à ses propres erreurs** : le
  fallback est rendu en HTML brut sans dépendance shadcn/Radix.
  Si la lib UI plante, le panneau d'erreur s'affiche quand même.
- **I4 — Source identifiable** : chaque `LogEvent` porte
  `source = "frontend"` ou `"go"`.
- **I5 — Confidentialité best-effort** : les logs peuvent
  contenir des paths utilisateur ou noms de projet — c'est
  attendu (signalé en scope-out de la story). Le panneau
  d'erreur rappelle à l'utilisateur de relire avant partage.
- **I6 — Pas de blocage IO** : l'écriture utilise un writer
  bufferisé flushé à chaque ERROR ou périodiquement, pas de
  fsync par event en mode normal.

---

## A — Approach

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *l'écran gris à chaque crash frontend + l'absence
totale de trace exploitable une fois la fenêtre fermée*, **on
choisit** *d'étendre l'infra slog Go existante (`clilog`) avec une
factory `NewDesktop(cfgDir, debugMode)` qui ouvre un fichier
rotatif quotidien dans `<configDir>/yukki/logs/`, de centraliser
les logs frontend via une façade `logger.ts` qui appelle un
binding Wails `LogToBackend` unique, et d'ajouter une
`ErrorBoundary` React montée à la racine du shell qui rattrape
les exceptions de rendu et affiche un fallback HTML brut*,
**plutôt que** *(B) intégrer Sentry/OpenTelemetry (envoi réseau,
privacy à clarifier), (C) logguer uniquement en `localStorage`
(perd les events Go, accès difficile), (D) garder `console.*` en
l'état (perd la moitié de la traçabilité quand le bug est
frontend)*, **pour atteindre** *un seul fichier de log
consultable contenant les events frontend + Go en format texte
slog grep-able, et un crash frontend qui se transforme en panneau
d'erreur avec un bouton « Ouvrir les logs »*, **en acceptant**
*la création de quatre nouveaux modules Go (`configdir`,
`settings`, extension `clilog` desktop, bindings logging) et
quatre nouveaux fichiers frontend (`logger.ts`, `ErrorBoundary.tsx`,
`stores/settings.ts`, badge inline TitleBar) — et un refactor
mineur de `internal/draft` pour qu'il consomme le helper
`configdir`.*

### Alternatives considérées

- **B — Sentry / OpenTelemetry** : surdimensionné pour une alpha
  mono-utilisateur sans backend, posture privacy à clarifier.
- **C — Logging frontend seul (`localStorage` / IndexedDB)** :
  perd les events Go (la moitié de la pile), accès via devtools
  uniquement.
- **D — Pas d'unification frontend / Go** : laisse `console.*`
  en l'état, écrit seulement côté Go. Ne couvre pas le scénario
  qui motive la story (crash frontend → écran gris).
- **E — Un binding Wails par niveau** (`LogError`, `LogWarn`,
  `LogInfo`, `LogDebug`) : duplique le transport, gain de
  lisibilité mineur. Cf. Q4 analyse → 1 binding générique
  `LogToBackend(payload)` retenu.
- **F — Timer goroutine pour rotation à minuit** : précis mais
  ajoute concurrence. Cf. Q5 analyse → re-évaluation du chemin
  à chaque écriture retenue (plus simple, robuste à un changement
  d'horloge système).

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/configdir` | `configdir.go`, `configdir_test.go` | **create** — helper `BaseDir()` |
| `internal/draft` | `store.go` | modify — consomme `configdir.BaseDir()` au lieu de hardcoder |
| `internal/settings` | `settings.go`, `settings_test.go` | **create** — Settings struct + Store (atomic JSON) |
| `internal/clilog` | `clilog.go`, `clilog_desktop.go`, `clilog_desktop_test.go` | modify + create — factory `NewDesktop(cfgDir, debugMode)` + handler fichier rotatif |
| `internal/uiapp/app.go` | `app.go` | modify — champ `settingsStore *settings.Store`, init dans `OnStartup` |
| `internal/uiapp/settings.go` | `settings.go`, `settings_test.go` | **create** — bindings `LoadSettings`, `SaveSettings` |
| `internal/uiapp/logging.go` | `logging.go`, `logging_test.go` | **create** — bindings `LogToBackend`, `OpenLogsFolder` |
| `ui.go` (racine) | `ui.go` | modify — résout cfgDir, lit settings, `clilog.NewDesktop(cfgDir, settings.DebugMode)`, transmet à `NewApp` |
| `frontend/src/lib/logger.ts` | `logger.ts`, `logger.test.ts` | **create** — façade `error/warn/info/debug` |
| `frontend/src/stores/settings.ts` | `settings.ts`, `settings.test.ts` | **create** — Zustand store hydraté via `LoadSettings` |
| `frontend/src/components/hub/ErrorBoundary.tsx` | `ErrorBoundary.tsx`, `ErrorBoundary.test.tsx` | **create** — class component fallback HTML brut |
| `frontend/src/main.tsx` | `main.tsx` | modify — monter `<ErrorBoundary>`, listeners `window.onerror` + `unhandledrejection` |
| `frontend/src/components/hub/TitleBar.tsx` | `TitleBar.tsx` | modify — badge orange `DEBUG ON` conditionné sur `useSettingsStore` |
| `frontend/src/components/hub/FileMenu.tsx` | `FileMenu.tsx` | modify — item « Activer le mode debug » + indicateur d'état |
| `frontend/src/App.tsx` | `App.tsx` | modify — `useEffect` raccourci global `Ctrl+Shift+D`, hydratation initiale du settings store |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | bindings stub | modify — exposer `LoadSettings`, `SaveSettings`, `LogToBackend`, `OpenLogsFolder`, `IsDevBuild`, `TailLogs` (workaround AV `-skipbindings`) |
| `internal/uiapp/buildflags_dev.go` + `buildflags_prod.go` | const `IsDevBuild` derrière `//go:build devbuild` | **create** (O15) — constante compile-time gardant les surfaces debug |
| `internal/uiapp/logtail.go` + test | `App.TailLogs(maxLines)` + emission event `log:event` | **create** (O18) — backend du drawer logs |
| `frontend/src/lib/buildFlags.ts` | helper `isDevBuild()` qui interroge le binding `IsDevBuild` | **create** (O16) |
| `frontend/src/components/hub/DeveloperMenu.tsx` + test | menu dropdown TitleBar — items toggle, ouvrir logs, ouvrir drawer | **create** (O17) — gated `isDevBuild()` |
| `frontend/src/components/hub/LogsDrawer.tsx` + test | drawer rétractable bas, tail live + filtres niveau / source | **create** (O19) |
| `frontend/src/stores/devTools.ts` + test | Zustand store : drawer open/closed, filtres, buffer circulaire 500 lignes | **create** (O19) |
| `internal/uiapp/trace.go` | Helper `(a *App).traceBinding(name, attrs …)` — log DEBUG d'un appel de binding, no-op hors mode debug | **create** (sync 2026-05-09) — réalisation de la promesse Q4 « traces supplémentaires IPC Wails » |
| `ui_flags_dev.go` (`//go:build devbuild`) + `ui_flags_prod.go` (`//go:build !devbuild`) à la racine | Helper `registerDebugFlag(*cobra.Command) *bool` qui expose `--debug` uniquement en build dev | **create** (sync 2026-05-09) — décomposition compile-time référencée par O7 |

### Schéma de flux

```
                    ┌────────────────────────┐
                    │  React render error    │
                    └──────────┬─────────────┘
                               │ caught by
                               ▼
                    ┌────────────────────────┐    fallback HTML
                    │     ErrorBoundary      │───────► panel + 3 buttons
                    └──────────┬─────────────┘    (Copy / OpenLogs / Reload)
                               │ logger.error(err)
                               ▼
            ┌────────────────────────────────────┐
            │  frontend/src/lib/logger.ts        │  console.* en dev
            │  error / warn / info / debug       │─────────────────►
            └──────────────┬─────────────────────┘
                           │ App.LogToBackend(payload)
                           ▼ (Wails IPC)
            ┌────────────────────────────────────┐
            │  uiapp.App.LogToBackend            │
            │  → a.logger.<Level>(msg, fields…)  │
            └──────────────┬─────────────────────┘
                           │ slog.Handler
                           ▼
            ┌────────────────────────────────────┐
            │  clilog desktop handler            │
            │  → re-eval path (today YYYY-MM-DD) │
            │  → write to <cfgDir>/yukki/logs/   │
            │     yukki-YYYY-MM-DD.log           │
            └────────────────────────────────────┘

    Au démarrage (ui.go):
      cfgDir := configdir.BaseDir()
      s := settings.NewStore(cfgDir).Load()
      logger := clilog.NewDesktop(cfgDir, s.DebugMode)
      app := uiapp.NewApp(prov, logger)
      app.SetSettingsStore(s)  // pour le toggle runtime
      → purge des LogFile > 7j (mtime-based)
```

---

## O — Operations

### O1 — Helper `internal/configdir`

- **Module** : `internal/configdir`
- **Fichier** : `internal/configdir/configdir.go` (création)
- **Signature** :
  ```go
  package configdir

  // BaseDir returns <os.UserConfigDir()>/yukki, mutualisé entre
  // draft, settings et logs. Crée le dossier (mode 0700) s'il
  // n'existe pas. Retourne une erreur si UserConfigDir échoue ou
  // si MkdirAll échoue.
  func BaseDir() (string, error)

  // LogsDir returns <BaseDir()>/logs, ou erreur si BaseDir échoue.
  // Crée le sous-dossier si nécessaire.
  func LogsDir() (string, error)
  ```
- **Comportement** :
  1. Appeler `os.UserConfigDir()` ; wrapper l'erreur si elle remonte.
  2. `filepath.Join(cfg, "yukki")`.
  3. `os.MkdirAll(path, 0o700)` ; wrapper l'erreur.
  4. Retourner le chemin.
  5. `LogsDir()` chaîne : `BaseDir()` puis `filepath.Join(base, "logs")` + `MkdirAll`.
- **Tests** (`configdir_test.go`) :
  - **Cas nominal** : `BaseDir()` crée et retourne `<TempUserConfigDir>/yukki` (utiliser `t.Setenv("XDG_CONFIG_HOME", t.TempDir())` sur Linux/macOS, `APPDATA` sur Windows). Vérifier que le dossier existe.
  - **Idempotence** : appeler `BaseDir()` deux fois → pas d'erreur, même chemin.
  - **`LogsDir()`** : retourne `<BaseDir()>/logs`, sous-dossier créé.
  - **Échec MkdirAll** : non testable de façon portable — accepté.

### O2 — Refactor `internal/draft` pour consommer `configdir`

- **Module** : `internal/draft`
- **Fichier** : `internal/draft/store.go` (modification)
- **Signature** : inchangée (`NewDraftStore(baseDir string)`).
- **Comportement** :
  1. Dans `NewDraftStore`, si `baseDir == ""`, remplacer le bloc actuel par :
     ```go
     base, err := configdir.BaseDir()
     if err != nil {
         return nil, fmt.Errorf("draft: resolve config dir: %w", err)
     }
     baseDir = filepath.Join(base, "drafts")
     ```
  2. Aucune autre modification dans le fichier.
- **Tests** (`internal/draft/store_test.go`) :
  - Tests existants restent inchangés (la signature publique ne bouge pas).
  - Vérifier en revue que la migration n'a pas cassé les tests existants (run vert obligatoire).

### O3 — Store de settings `internal/settings`

- **Module** : `internal/settings`
- **Fichier** : `internal/settings/settings.go` (création)
- **Signature** :
  ```go
  package settings

  type Settings struct {
      DebugMode bool `json:"debugMode"`
  }

  type Store struct{ baseDir string }

  // NewStore returns a Store whose settings.json lives at baseDir.
  // baseDir is typically configdir.BaseDir() (caller resolves once).
  func NewStore(baseDir string) *Store

  // Load reads <baseDir>/settings.json. Returns zero Settings (and
  // nil error) if the file does not exist (first launch). Wraps
  // any other error.
  func (s *Store) Load() (Settings, error)

  // Save serialises into <baseDir>/settings.json via temp-then-rename.
  // Creates baseDir (mode 0700) if missing.
  func (s *Store) Save(settings Settings) error
  ```
- **Comportement** :
  1. `Load` : `os.ReadFile(filepath.Join(s.baseDir, "settings.json"))` ; si `errors.Is(err, os.ErrNotExist)` → retourner `Settings{}`, `nil`. Sinon `json.Unmarshal`.
  2. `Save` : pattern atomique identique à `draft.Save` (temp file dans baseDir + rename), sans la sanitisation (un seul fichier connu).
- **Tests** (`settings_test.go`) :
  - **Première lecture (file absent)** → `Settings{DebugMode: false}`, no error.
  - **Round-trip** : Save({DebugMode: true}) → Load() → `{DebugMode: true}`.
  - **Atomic write** : after Save, no `*.tmp` file in baseDir.
  - **JSON corrompu** : créer `settings.json` avec contenu invalide → Load retourne erreur wrappée.

### O4 — Extension `clilog` avec handler desktop

- **Module** : `internal/clilog`
- **Fichier** : `internal/clilog/desktop.go` (création) ; `clilog.go` inchangé (la factory CLI reste).
- **Signature** :
  ```go
  package clilog

  // NewDesktop returns a slog.Logger that writes to a daily-rotated
  // file <logsDir>/yukki-YYYY-MM-DD.log in slog text format. The
  // returned io.Closer must be closed at app shutdown to flush the
  // buffered writer. logsDir is typically configdir.LogsDir().
  //
  // If the file cannot be opened, falls back to stderr and returns
  // a non-nil error (non-fatal — caller logs a warning and continues
  // with the stderr-only logger).
  //
  // debugMode=true sets level Debug; otherwise Info (cf. story Q4
  // amendement 2026-05-09 — initialement Warn). Lifecycle events
  // sont visibles en INFO par défaut.
  // The handler re-evaluates the target path on every Write so that
  // a session crossing midnight rotates automatically (cf. analysis Q5).
  //
  // Retention: PurgeOldLogs(logsDir, 7) is called once at construction
  // to remove files with mtime older than 7 days.
  //
  // The returned *slog.LevelVar is the live handle backing the
  // handler's level. SaveSettings (O5) calls levelVar.Set(...) to
  // toggle WARN → DEBUG at runtime without recreating the file
  // (cf. invariant I2).
  func NewDesktop(logsDir string, debugMode bool) (*slog.Logger, *slog.LevelVar, io.Closer, error)

  // PurgeOldLogs deletes files matching yukki-*.log under logsDir
  // whose mtime is older than maxAgeDays. Errors on individual files
  // are logged but do not fail the call.
  func PurgeOldLogs(logsDir string, maxAgeDays int) error
  ```
- **Comportement** :
  1. `NewDesktop` :
     - `PurgeOldLogs(logsDir, 7)` (best-effort, log les échecs).
     - Construire un `dailyFileWriter` (struct interne) qui sait :
       - calculer le path du jour `filepath.Join(logsDir, fmt.Sprintf("yukki-%s.log", time.Now().Format("2006-01-02")))` ;
       - garder un `*os.File` + `*bufio.Writer` ouvert + `currentDate string` ;
       - sur `Write([]byte)`, comparer `time.Now().Format("2006-01-02")` à `currentDate` : si différent → flush + close + ouvrir le nouveau fichier.
     - Wrapper le writer dans `slog.NewTextHandler` avec `Level` = Debug ou Warn.
     - Retourner `slog.New(handler)` + le `dailyFileWriter` comme `io.Closer`.
     - En cas d'échec d'ouverture initiale du fichier : retourner un logger stderr (`slog.NewTextHandler(os.Stderr, ...)`), un closer noop, et une erreur non-nil.
  2. `PurgeOldLogs` : `os.ReadDir`, filtrer `yukki-*.log`, comparer mtime à `time.Now().Add(-7 * 24 * time.Hour)`, `os.Remove` les anciens.
- **Tests** (`desktop_test.go`) :
  - **Cas nominal** : NewDesktop dans tempDir, logger.Warn(...) puis closer.Close() → fichier `yukki-<today>.log` contient l'entrée.
  - **Niveau debug** : NewDesktop(.., true), logger.Debug → entrée présente.
  - **Niveau warn (default)** : logger.Debug → entrée absente.
  - **Bascule de jour** : injecter une horloge fake (paramètre interne ou monkey-patch via variable de package), écrire à 23:59 et 00:01 → 2 fichiers distincts.
  - **PurgeOldLogs** : créer 3 fichiers (mtime now, -3j, -10j), appeler PurgeOldLogs(.., 7) → seul le -10j est supprimé.
  - **Fallback stderr** : passer un logsDir non-écrivable (ex: chemin invalide) → erreur non-nil, logger fonctionnel sur stderr.

### O5 — Bindings settings dans `uiapp`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/settings.go` (création)
- **Signature** :
  ```go
  // SetSettingsStore wires the settings store. Called by ui.go
  // after the App is constructed, similar to SetBuildInfo.
  func (a *App) SetSettingsStore(store *settings.Store)

  // LoadSettings returns the persisted settings. Empty Settings on
  // first launch (no file yet). Used by the frontend to hydrate
  // its Zustand store on app startup.
  func (a *App) LoadSettings() (settings.Settings, error)

  // SaveSettings persists the new settings and applies the level
  // change to the runtime logger immediately. Returns wrapped error
  // on disk failure — frontend shows a toast.
  func (a *App) SaveSettings(s settings.Settings) error
  ```
- **Comportement** :
  1. `SetSettingsStore` : assigne `a.settingsStore = store`.
  2. `LoadSettings` : nil-check store → return zero ; sinon `store.Load()`.
  3. `SaveSettings` : nil-check ; `store.Save(s)` ; **propager au logger** : à voir comment dynamiquement (cf. note ci-dessous, l'analyse Q4 a tranché « le toggle bascule WARN → DEBUG sans recréer le fichier »). Implémentation : la factory `clilog.NewDesktop` retourne un handler avec un `slog.LevelVar` dynamique partagé ; `SaveSettings` appelle `levelVar.Set(slog.LevelDebug | slog.LevelWarn)`. Stocker le `*slog.LevelVar` sur `App` (champ `logLevel`).
- **Tests** (`settings_test.go` dans uiapp) :
  - **Cas nominal** : `LoadSettings` après `Save({DebugMode: true})` → `{true}`.
  - **Pas de store** : `LoadSettings` sans `SetSettingsStore` → zero Settings.
  - **`SaveSettings` propage le niveau** : utiliser un fake `*slog.LevelVar` sur l'App, vérifier qu'après `SaveSettings({DebugMode:true})` la valeur est `LevelDebug`.

### O6 — Bindings logging dans `uiapp`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/logging.go` (création)
- **Signature** :
  ```go
  // LogPayload is the IPC envelope for frontend log events.
  type LogPayload struct {
      Level  string // "debug" | "info" | "warn" | "error"
      Source string // typically "frontend"
      Msg    string
      Stack  string // optional, set on error level
  }

  // LogToBackend writes a frontend event to the unified log file
  // via the App's slog.Logger. Unknown Level → treated as Info.
  // Returns nil — errors are swallowed and surfaced via fallback
  // (stderr) to preserve I1 (logs never crash the app).
  func (a *App) LogToBackend(p LogPayload) error

  // OpenLogsFolder opens the OS file explorer on the logs dir.
  // Resolves the path via configdir.LogsDir() then calls
  // runtime.BrowserOpenURL with file:// URI. Returns wrapped
  // error if the path cannot be resolved.
  func (a *App) OpenLogsFolder() error
  ```
- **Comportement** :
  1. `LogToBackend` : map `p.Level` (case-insensitive) → `slog.Level` ; appeler `a.logger.LogAttrs(ctx, level, p.Msg, slog.String("source", p.Source), slog.String("stack", p.Stack))`. Si stack vide, ne pas l'attacher. Retourner `nil`.
  2. `OpenLogsFolder` : `configdir.LogsDir()` → si erreur, wrap et return ; `runtime.BrowserOpenURL(a.ctx, "file://"+path)` (ou `path` direct selon convention Wails — vérifier au générateur). Wrapper toute erreur.
- **Tests** (`logging_test.go`) :
  - **`LogToBackend` mappe les niveaux** : appeler avec `Level="warn"` → handler reçoit `LevelWarn` (utiliser un handler de capture en mémoire).
  - **Niveau inconnu** → `LevelInfo`.
  - **`source` et `stack` attachés** : capture les attrs du record, vérifier la présence.
  - **`LogToBackend` ne retourne jamais d'erreur** (contrat I1).
  - **`OpenLogsFolder` sans cfgDir résolvable** : muter `os.UserConfigDir` via env vide (Linux : `XDG_CONFIG_HOME=""`, `HOME=""`) → erreur wrapped retournée.

### O7 — Initialisation desktop dans `ui.go` *(amendée 2026-05-09)*

- **Module** : racine (`cmd/yukki` virtuel — `ui.go` à la racine)
- **Fichier** : `ui.go` (modification)
- **Signature** : inchangée (la commande Cobra reste `yukki ui`).
- **Comportement** :
  1. Le flag CLI s'appelle `--debug` (renommage 2026-05-09, ex `--verbose`).
     Sa déclaration est conditionnée au build tag `devbuild` :
     deux fichiers `ui_flags_dev.go` (`//go:build devbuild`) et
     `ui_flags_prod.go` (`//go:build !devbuild`) exposent un
     helper `registerDebugFlag(cmd)` qui renvoie un pointeur
     `*bool`. En prod, le pointeur reste à `false` et le flag
     n'apparaît pas dans `--help`.
  2. Résoudre `cfgDir, _ := configdir.BaseDir()`, charger
     `settingsStore.Load()`.
  3. `debugMode := uiapp.IsDevBuild && (persisted.DebugMode || debugFlag)`
     — la const `IsDevBuild` (cf. O15) garantit qu'un binaire de
     release ignore tout `debugMode=true` hérité d'un settings.json.
  4. `logger, level, closer, _ := clilog.NewDesktop(logsDir, debugMode)`.
     **Niveau par défaut INFO** (cf. amendement Q4) — `clilog.NewDesktop`
     fixe `level.Set(slog.LevelInfo)` quand `debugMode=false`.
  5. `app.SetSettingsStore(settingsStore)`, `app.SetLogLevel(level)`,
     `app.SetBuildInfo(...)`, `defer closer.Close()`.
  6. **Premier event INFO** : `logger.Info("ui startup", "version",
     version, "isDevBuild", uiapp.IsDevBuild, "debugMode", debugMode)`.
- **Tests** :
  - Test d'intégration léger sous `internal/uiapp` ou un `ui_test.go` qui smoke-teste la résolution du chemin (peut être skip dans CI si `os.UserConfigDir` non disponible — pattern existant dans `draft`).
  - **Idempotence** : un deuxième `yukki ui` après un premier ouvre toujours le même fichier du jour (pas un nouveau fichier daté différemment).

### O8 — Façade logger frontend

- **Module** : `frontend/src/lib`
- **Fichier** : `frontend/src/lib/logger.ts` (création)
- **Signature** :
  ```ts
  type LogLevel = 'debug' | 'info' | 'warn' | 'error';

  interface LogFields {
    [key: string]: unknown;
  }

  export const logger: {
    debug(msg: string, fields?: LogFields): void;
    info(msg: string, fields?: LogFields): void;
    warn(msg: string, fields?: LogFields): void;
    error(msg: string, errOrFields?: Error | LogFields): void;
  };
  ```
- **Comportement** :
  1. Pour chaque méthode :
     - construire `payload: LogPayload = { level, source: 'frontend', msg, stack: '' }`.
     - Si `error()` reçoit un `Error`, attacher `payload.stack = err.stack ?? ''` et `payload.msg = err.message`.
     - Si `fields` fourni, sérialiser comme `key=value` séparés par espaces dans `msg` (cohérent format slog text).
     - `void App.LogToBackend(payload)` (import depuis `wailsjs/go/main/App`).
     - **En parallèle**, garder un `console.<level>` pour devtools en `wails dev`.
     - Wrapper l'appel dans `try/catch` — si LogToBackend jette (Wails non monté en test/SSR), tomber sur `console`.
- **Tests** (`logger.test.ts`) :
  - **`logger.error(new Error('boom'))`** : LogToBackend reçoit `{level:'error', msg:'boom', stack:'...'}` (mock le binding).
  - **`logger.warn('msg', {k:1})`** : payload.msg contient `msg k=1` (ordre stable).
  - **Wails non disponible** : forcer `App.LogToBackend` à throw → la méthode ne propage pas, console.error appelé en fallback.

### O9 — Store settings frontend

- **Module** : `frontend/src/stores`
- **Fichier** : `frontend/src/stores/settings.ts` (création)
- **Signature** :
  ```ts
  interface SettingsState {
    debugMode: boolean;
    hydrated: boolean;
    hydrate(): Promise<void>;        // appelle LoadSettings, met hydrated=true
    setDebugMode(v: boolean): Promise<void>;  // optimistic update + SaveSettings
  }
  export const useSettingsStore = create<SettingsState>()(...)
  ```
- **Comportement** :
  1. `hydrate` : `App.LoadSettings()` → `set({debugMode: result.DebugMode ?? false, hydrated: true})`. Sur erreur : `set({hydrated: true})` + `logger.warn`.
  2. `setDebugMode(v)` : optimistic `set({debugMode: v})` ; `App.SaveSettings({debugMode: v})` ; sur erreur, rollback + toast (réutiliser `react-hot-toast` ou équivalent custom — voir convention existante).
- **Tests** (`settings.test.ts`) :
  - **`hydrate` succès** : mock `LoadSettings` renvoyer `{DebugMode:true}` → state `{debugMode:true, hydrated:true}`.
  - **`hydrate` erreur** : mock throw → `hydrated:true`, debugMode reste `false`.
  - **`setDebugMode` optimistic + rollback** : mock SaveSettings throw → state revient à la valeur précédente.

### O10 — ErrorBoundary React

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/ErrorBoundary.tsx` (création)
- **Signature** :
  ```tsx
  interface Props { children: ReactNode }
  interface State { error: Error | null; info: ErrorInfo | null }

  export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, info: null };
    static getDerivedStateFromError(error: Error): Partial<State>;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): ReactNode;
  }
  ```
- **Comportement** :
  1. `getDerivedStateFromError` → `{ error }`.
  2. `componentDidCatch(error, info)` → `logger.error(error)` avec `stack=info.componentStack` ajouté.
  3. `render` :
     - Si `error === null` → `this.props.children`.
     - Sinon → fallback **HTML brut** (pas de shadcn/Radix, juste `<div style={...}>`) :
       - Titre : « Une erreur est survenue »
       - `<pre>` avec `error.message`
       - `<details>` dépliable contenant `error.stack` + `info.componentStack`
       - 3 boutons HTML inline-styled :
         - « Copier » → `navigator.clipboard.writeText(message + stack)`
         - « Ouvrir les logs » → `App.OpenLogsFolder()`
         - « Recharger l'app » → `window.location.reload()`
       - Bandeau bas : « Avant de partager : ce log peut contenir des chemins de votre système. Relisez avant envoi. »
- **Tests** (`ErrorBoundary.test.tsx`) :
  - **Cas nominal** : composant enfant qui ne plante pas → enfants rendus, fallback absent.
  - **Crash enfant** : composant `<Crash/>` qui throw → fallback affiché avec message.
  - **Bouton Copier** : mock `navigator.clipboard`, vérifier que le texte attendu est passé.
  - **Bouton Ouvrir les logs** : mock `OpenLogsFolder`, vérifier l'appel.
  - **`logger.error` appelé** : mock le logger, vérifier qu'il reçoit l'Error + stack.

### O11 — Listeners globaux + montage ErrorBoundary

- **Module** : `frontend/src`
- **Fichier** : `frontend/src/main.tsx` (modification)
- **Signature** : inchangée.
- **Comportement** :
  1. Avant le `createRoot(...).render(...)`, attacher :
     ```ts
     window.addEventListener('error', (e) => {
       logger.error(e.message, { stack: e.error?.stack ?? '' });
     });
     window.addEventListener('unhandledrejection', (e) => {
       const reason = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
       logger.error(reason);
     });
     ```
  2. Wrapper `<App />` dans `<ErrorBoundary>`.
- **Tests** :
  - Pas de test unitaire direct sur `main.tsx` (entrypoint). Smoke test e2e via `vitest` qui monte `<ErrorBoundary><App/></ErrorBoundary>` est suffisant — déjà couvert par O10.

### O12 — Hydratation + raccourci clavier global

- **Module** : `frontend/src`
- **Fichier** : `frontend/src/App.tsx` (modification)
- **Comportement** :
  1. Au mount (top-level `useEffect`) : `useSettingsStore.getState().hydrate()`.
  2. Listener clavier global : `Ctrl+Shift+D` (Windows/Linux) ou `Cmd+Shift+D` (macOS) → toggle `debugMode`.
  3. Cleanup au unmount.
- **Tests** :
  - Pas de test direct au niveau App.tsx (rendering global). Le hook `useKeyboardShortcut` (existant, cf. `frontend/src/hooks/useKeyboardShortcut.ts`) a ses propres tests. Vérifier en revue que le binding est ajouté.

### O13 — Badge `DEBUG ON` dans la TitleBar

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/TitleBar.tsx` (modification)
- **Comportement** :
  1. `const debugMode = useSettingsStore(s => s.debugMode);`
  2. Insérer entre `<HelpMenu />` et le drag-region :
     ```tsx
     {debugMode && (
       <span
         aria-label="Debug mode is ON"
         className="ml-2 rounded-sm bg-ykp-warning px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ykp-warning-fg"
       >
         DEBUG ON
       </span>
     )}
     ```
  - Couleur : palette canonique `--ykp-warning` (livré par UI-018a).
- **Tests** : ajouter à `TitleBar.test.tsx` :
  - **Badge absent en mode normal** (settings.debugMode=false).
  - **Badge présent quand debugMode=true** (mock du store).

### O14 — FileMenu *(amendée 2026-05-09 — items debug retirés, déplacés vers O17)*

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/FileMenu.tsx` (modification)
- **Comportement** : **revenir à la version pré-OPS-001** —
  retirer les items `Activer le mode debug` et `Ouvrir le dossier
  de logs` ainsi que les imports correspondants (`useSettingsStore`,
  `OpenLogsFolder`, icônes `Bug`/`FileText`). Le FileMenu retrouve
  sa cohérence métier : Open Project, Recent Projects, Initialize
  Project. Toutes les surfaces debug vivent désormais dans
  `DeveloperMenu` (O17).
- **Tests** : retirer les 3 cas OPS-001 ajoutés (« toggle debug »,
  « label flippe », « Ouvrir le dossier de logs »). Garder les
  tests Open Project + Recent Projects.

---

### O15 — Build flags Go (`devbuild` tag)

- **Module** : `internal/uiapp`
- **Fichiers** : `internal/uiapp/buildflags_dev.go` (création) +
  `internal/uiapp/buildflags_prod.go` (création)
- **Signature** :
  ```go
  // buildflags_dev.go
  //go:build devbuild
  package uiapp

  // IsDevBuild is true when the binary was compiled with -tags devbuild.
  const IsDevBuild = true
  ```

  ```go
  // buildflags_prod.go
  //go:build !devbuild
  package uiapp

  const IsDevBuild = false
  ```
- **Binding Wails** dans `app.go` (ou un fichier dédié `buildflags_binding.go`,
  pas gated, juste expose la const) :
  ```go
  // IsDevBuildBinding returns the compile-time IsDevBuild flag to
  // the frontend so it can hide developer surfaces in release builds.
  func (a *App) IsDevBuild() bool { return IsDevBuild }
  ```
- **Tests** : pas de test unitaire — la const est validée par
  `go test -tags devbuild` produisant des fichiers test différents,
  ce qui n'apporte rien. Les tests d'intégration en aval (O17, O19)
  dépendent du build tag et confirment le comportement.

### O16 — Frontend `lib/buildFlags.ts`

- **Module** : `frontend/src/lib`
- **Fichier** : `frontend/src/lib/buildFlags.ts` (création)
- **Signature** :
  ```ts
  /** Cached result of App.IsDevBuild — fetched once at App.tsx mount. */
  export function isDevBuild(): boolean;

  /** Sets the cached value (called by hydrateBuildFlags at startup). */
  export function setDevBuildFlag(v: boolean): void;

  /** Hydrates the flag from the Wails binding. Idempotent. */
  export function hydrateBuildFlags(): Promise<void>;
  ```
- **Comportement** : module-scope `let cached: boolean | null = null`.
  `hydrateBuildFlags` appelle `App.IsDevBuild()` (binding Wails),
  cache le résultat. `isDevBuild()` retourne `cached ?? false` —
  fail-safe : si la binding n'a pas encore résolu (race rare), on
  considère qu'on est en prod (cache la surface debug).
- **Tests** (`buildFlags.test.ts`) :
  - **`hydrateBuildFlags` succès** : mock `IsDevBuild()` → `true`,
    `isDevBuild()` retourne `true`.
  - **`hydrateBuildFlags` erreur** : mock throw → `isDevBuild()`
    retourne `false` (fail-safe).
  - **Idempotent** : un deuxième appel ne refait pas l'IPC.

### O17 — `DeveloperMenu` dans la TitleBar

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/DeveloperMenu.tsx` (création)
- **Comportement** :
  1. Si `!isDevBuild()` → render `null` (le menu disparaît du DOM).
  2. Sinon, `DropdownMenu` shadcn avec trigger « Developer » (police
     identique à FileMenu/HelpMenu) contenant :
     - `Activer le mode debug` / `Désactiver le mode debug` (toggle)
       avec hint `Ctrl+Shift+D`.
     - `Ouvrir le drawer de logs` (visible **uniquement** quand
       `debugMode=true`) avec hint `Esc pour fermer`.
     - `Ouvrir le dossier de logs` (toujours visible).
  3. Monté dans `TitleBar.tsx` à droite de `<HelpMenu />` (et avant
     le badge `DEBUG ON` de O13).
- **Tests** (`DeveloperMenu.test.tsx`) :
  - **Build prod** (`isDevBuild()=false`) : le menu est absent du DOM.
  - **Build dev** : trigger `Developer` présent ; toggle item
    appelle `setDebugMode`.
  - **Drawer item visible si debugMode=true uniquement**.
  - **Open logs folder item** appelle `OpenLogsFolder`.

### O18 — Backend logs tail + event push

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/logtail.go` (création) +
  `internal/uiapp/logtail_test.go`
- **Signature** :
  ```go
  // LogLine is the parsed shape of a single slog text-handler line
  // exposed to the drawer frontend.
  type LogLine struct {
      Timestamp string // raw timestamp string from slog
      Level     string // "DEBUG" | "INFO" | "WARN" | "ERROR"
      Source    string // "frontend" | "go"
      Msg       string
      Raw       string // full original line (for "show raw" toggle)
  }

  // TailLogs returns the last `maxLines` lines of today's log file
  // parsed into LogLine. Returns empty slice (not error) when the
  // file does not yet exist. maxLines is clamped to [1, 2000].
  // Gated: returns ErrNotDevBuild when IsDevBuild is false.
  func (a *App) TailLogs(maxLines int) ([]LogLine, error)
  ```
- **Comportement** :
  1. Si `!IsDevBuild` → return `nil, errors.New("not a dev build")`.
  2. Resolve file path via `configdir.LogsDir()` + today's date.
  3. Open + read last N lines (efficient: read full file then slice
     last N — alpha desktop, files < 10 MB typique). Tolerate file
     absent.
  4. Parser slog text format : split sur `level=`, `source=`, `msg=`
     pattern. Fallback sur le `Raw` complet si parsing échoue.
- **Live event** : étendre le `dailyFileWriter` (O4) avec une
  méthode optionnelle `SetEventEmitter(func(LogLine))`. `ui.go`
  câble cet emitter pour appeler `runtime.EventsEmit(ctx,
  "log:event", line)` à chaque write. **Gated** au runtime :
  l'emitter est nil dans un build sans `devbuild`. Pas de surcoût
  IPC en prod.
- **Tests** :
  - **Build prod (mocked via build flag swap)** : `TailLogs`
    retourne erreur — non testable directement avec un seul flag,
    skip ce cas et compter sur la couverture qualitative.
  - **Build dev, fichier absent** : returns `[]LogLine{}, nil`.
  - **Build dev, fichier présent** : parse N lignes correctement.
  - **maxLines clamping** : 0 → 1 ligne, 99999 → 2000.
  - **Parsing slog text** : extrait level / source / msg.

### O19 — Frontend `LogsDrawer` + store

- **Modules** : `frontend/src/components/hub`, `frontend/src/stores`
- **Fichiers** :
  - `frontend/src/stores/devTools.ts` (création) + test
  - `frontend/src/components/hub/LogsDrawer.tsx` (création) + test
- **Store `useDevToolsStore`** :
  ```ts
  interface DevToolsState {
    drawerOpen: boolean;
    buffer: LogLine[];          // ring buffer 500 entries max
    levelFilter: Set<LogLevel>; // default: all 4 levels
    sourceFilter: Set<string>;  // default: ['frontend', 'go']
    autoScroll: boolean;        // default: true

    openDrawer: () => Promise<void>;  // hydrates buffer via TailLogs
    closeDrawer: () => void;
    pushEntry: (line: LogLine) => void;  // FIFO drop oldest
    setLevelFilter: (l: LogLevel, on: boolean) => void;
    setSourceFilter: (s: string, on: boolean) => void;
    toggleAutoScroll: () => void;
  }
  ```
  Au mount global (App.tsx ou main.tsx) : `EventsOn('log:event', pushEntry)`.
- **Composant `LogsDrawer`** :
  1. Si `!isDevBuild() || !drawerOpen` → render `null`.
  2. Sinon, `<aside>` fixed bottom, hauteur 30vh ajustable
     (drag-handle haut) :
     - Header : titre `Logs (live)`, filtres niveau (chips),
       filtres source, toggle `Pause auto-scroll`, bouton fermer (`×`).
     - Body : liste virtualisée (sinon perf KO sur 500 entrées x scroll
       continu) — utiliser `react-window` ou implémentation maison
       simple (alpha — 500 entrées tient en DOM brut sans virt).
     - Footer : info « 234 / 500 entrées · DEBUG OFF/ON ».
  3. Listener `Esc` fermé + clic sur badge DEBUG ON ouvre/toggle.
- **Tests `devTools.test.ts`** :
  - `openDrawer` hydrate via `TailLogs(500)` mock.
  - `pushEntry` respecte le ring buffer 500 max.
  - Filtres niveau/source mutent le set.
- **Tests `LogsDrawer.test.tsx`** :
  - Build prod → drawer absent.
  - Build dev + drawerOpen=true → drawer visible avec entrées.
  - Clic `×` ferme.
  - Filtre niveau actif → entrées filtrées correspondantes.

---

## N — Norms

- **Logging Go** : `slog` standard library uniquement, pas de
  dépendance externe (`logrus`, `zap`, `lumberjack`, …). La factory
  `clilog.NewDesktop` reste auto-portée — pas d'introduction d'une
  3rd-party de rotation à ce stade.
- **Logging frontend** : `console.*` **interdit** dans le code de
  production hors du fallback de `logger.ts`. Tout passe par
  `frontend/src/lib/logger.ts`. Les tests vitest peuvent garder
  `console.error` pour debug local.
- **Persistance** : tout fichier sous `<configDir>/yukki/` est écrit
  via le pattern atomique temp-then-rename (cohérent avec
  `internal/draft`). Mode `0700` pour les dossiers, `0600` pour
  les fichiers.
- **Bindings Wails** : tout binding public (`PascalCase` sur `*App`)
  qui peut échouer doit retourner `error`. Les bindings
  `LogToBackend` font exception au profit de l'invariant I1 (les
  logs ne plantent jamais l'app).
- **Tests Go** : niveau service (factory, store) en
  `*_test.go` co-localisés. Cf.
  [`.yukki/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md) — pyramide unitaire prioritaire,
  pas de mocks superflus, capture du `slog.Handler` en mémoire pour
  les assertions sur le logger.
- **Tests frontend** : composants visuels (TitleBar badge, FileMenu
  item) testés via `@testing-library/react` ; logger.ts testé en
  unité avec mock du binding Wails. Cf.
  [`.yukki/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md) —
  privilégier les assertions par rôle ARIA aux requêtes par classe
  CSS.
- **Nommage** :
  - Go : `Store`, `NewStore`, `Settings`, `LogPayload`, `BuildInfo` —
    cohérent avec les patterns existants (`DraftStore`, `Draft`,
    `BuildInfo`, `ClaudeStatus`).
  - Frontend : `useSettingsStore`, `logger` (singleton),
    `ErrorBoundary` (class component conventionnelle React).
- **Format de log** : `slog.NewTextHandler` par défaut (équivalent
  story Q5 : `2026-05-09T18:32:14Z WARN frontend HubList refresh
  failed err="no project"`). Pas de JSON en mode desktop (la
  factory CLI `clilog.New` garde le mode JSON pour les commandes
  scriptées).
- **Observabilité** : pas de métriques Prometheus à ce stade
  (alpha desktop mono-process). Ré-évaluer si l'app gagne un
  serveur d'export plus tard.
- **i18n** : strings UI (`Activer le mode debug`, `Une erreur est
  survenue`) en français — cohérent avec le code existant
  (FileMenu déjà bilingue, AboutDialog FR). Pas d'extraction i18n
  formelle à ce stade.
- **Docs** : pas de page docs dédiée (l'app expose le toggle dans
  l'UI). Mentionner dans le `CHANGELOG` ou dans un futur guide
  utilisateur si le projet s'en dote.

---

## S — Safeguards

- **Sécurité**
  - Aucune écriture en dehors de `<configDir>/yukki/`. Le helper
    `configdir.BaseDir()` est la **seule** porte d'entrée pour
    résoudre ce chemin.
  - Aucun secret loggué : interdit de logguer un payload de
    binding qui contient un mot-clé `password`, `token`, `key`
    (vérification visuelle en revue ; pas de scrubbing automatique
    à ce stade — signalé en scope-out story).
  - `ErrorBoundary` n'envoie **jamais** la stack par réseau
    (interdiction implicite : pas d'appel `fetch` ni `Wails Browser*`
    dans le composant à part `OpenLogsFolder` et `clipboard`).
- **Compatibilité**
  - Pas de breaking change sur la signature publique de
    `internal/draft.NewDraftStore` (juste l'implémentation interne
    change).
  - Pas de breaking change sur `clilog.New` (la factory CLI reste,
    `NewDesktop` est ajoutée).
  - Le format texte slog reste stable inter-versions (les
    utilisateurs qui grep des logs ne doivent pas avoir à changer
    leurs scripts).
- **Performance**
  - Le writer fichier est bufferisé (`bufio.NewWriter`, taille
    par défaut). Flush sur `Close` + sur chaque event de niveau
    ERROR (ou supérieur).
  - Pas d'I/O synchrone bloquante dans le rendu React :
    `ErrorBoundary.componentDidCatch` appelle `logger.error` qui
    revient immédiatement (l'IPC Wails est non-bloquant, fire-and-
    forget).
  - La purge des logs > 7 jours s'exécute une seule fois au
    démarrage, pas à chaque écriture.
- **Périmètre**
  - **Ne jamais** envoyer les logs vers un serveur distant : pas
    de télémétrie réseau dans cette story (cf. scope-out).
  - **Ne jamais** masquer un crash : si l'écriture du log échoue,
    l'app continue mais l'utilisateur **doit** voir un toast
    (AC4 story).
  - **Ne jamais** dépendre d'une lib React complexe pour le
    fallback ErrorBoundary (I3 — HTML brut + style inline
    obligatoire).
- **Données**
  - Le fichier `settings.json` ne contient **que** des préférences
    UI (à ce stade : `debugMode`). Pas de données utilisateur
    métier (drafts, projets) — celles-ci ont leurs propres stores.
  - Format JSON simple, lisible par un humain. Pas de
    chiffrement (alpha desktop mono-utilisateur).
- **Concurrence**
  - Le `dailyFileWriter` interne au handler `clilog` doit être
    sûr en concurrence (le slog handler peut être appelé depuis
    plusieurs goroutines via les bindings Wails). Mutex sur les
    opérations `Write` / `rotate`.
- **Reprise sur erreur**
  - Si `clilog.NewDesktop` échoue à l'init : fallback stderr
    silencieux, l'app démarre quand même. La feature « ouvrir
    les logs » affiche un toast « Pas de fichier de log
    disponible ».
  - Si `settings.Load` échoue (JSON corrompu) : fallback à
    `Settings{}` (debugMode=false), l'utilisateur peut re-toggler
    et le fichier sera réécrit proprement.
- **Build-time gating** *(amendement 2026-05-09)*
  - **Interdit** : exposer une surface debug (menu, drawer,
    badge, flag CLI) dans un binaire compilé sans le tag
    `devbuild`. Vérifier par `grep -c "DEBUG ON\|DeveloperMenu\|TailLogs"`
    sur le binaire de release (résultat attendu : 0 — les chaînes
    n'existent pas dans le bundle).
  - **Interdit** : faire confiance à un `debugMode=true` hérité
    de `settings.json` dans un build de release. Le calcul
    d'effective debug mode est `IsDevBuild && (persisted ||
    flag)` — la const compile-time domine.
  - `App.TailLogs` retourne une erreur en build prod même si la
    binding est exposée par accident — défense en profondeur.

---

## Changelog

- **2026-05-09 — initial generation** — 14 Operations livrées,
  status passé `draft` → `accepted` → `implemented` après
  vérifications (203/203 vitest, 5/5 packages Go, tsc clean).
- **2026-05-09 — prompt-update post-revue utilisateur** —
  status `implemented` → `reviewed`. 4 décisions amendées :
  - **Q1 niveau par défaut** : WARN → **INFO** (events
    cycle de vie visibles sans toggle). Renommage flag CLI
    `--verbose` → `--debug`.
  - **Q2 surface UI** : items debug retirés du FileMenu,
    déplacés dans un nouveau menu **Developer** (O17) à
    droite de Help.
  - **Q3 visualiseur** : scope-out → scope-in. Drawer logs
    intégré rétractable bas, tail live + filtres niveau/source
    (O18 backend, O19 frontend).
  - **Q4 build gating** : tout l'attirail debug derrière le
    build tag Go `devbuild` (O15 const `IsDevBuild`,
    O16 helper frontend `isDevBuild()`, gating systématique
    sur menu/drawer/badge/flag CLI).
  - 5 nouvelles Operations (O15-O19), 3 amendements (O4, O7, O14).
  - Story passe à 8 AC (5 originales + AC6 drawer + AC7 build
    tag + AC8 niveau INFO par défaut).
  - DoD9-DoD12 ajoutés à la section Requirements.
- **2026-05-09 — fix instrumentation post-revue user** —
  L'utilisateur n'observait aucun event DEBUG en navigant en mode
  debug (le seuil bascule à DEBUG mais aucun call site n'émettait
  à ce niveau). Ajout d'un helper `(a *App).traceBinding(name,
  attrs…)` dans `internal/uiapp/trace.go` et instrumentation des
  bindings les plus chauds : `OnStartup`, `OpenProject`,
  `CloseProject`, `SwitchProject`, `LoadRegistry`,
  `ListRecentProjects`, `ListArtifacts`, `ReadArtifact`,
  `WriteArtifact`, `UpdateArtifactStatus`, `UpdateArtifactPriority`,
  `LoadSettings`, `SaveSettings`, `TailLogs`. `SaveSettings` émet
  aussi un INFO stable « debug mode toggled » pour tracer le
  flip dans le fichier même hors mode debug.
  Pas de nouvelle Operation : le canvas O5/O6 promettait déjà des
  « traces supplémentaires IPC Wails » via la Q4 de la story —
  cette instrumentation réalise la promesse. Norm correspondante
  à respecter pour les futurs bindings : appeler `traceBinding`
  en première ligne.
- **2026-05-09 — sync — refactor pur, comportement inchangé** —
  `status: implemented` → `synced`. Trois additions structurelles
  livrées pendant le post-revue mais absentes du tableau Section
  S sont désormais documentées :
  - `internal/uiapp/trace.go` (helper `traceBinding`).
  - `ui_flags_dev.go` + `ui_flags_prod.go` à la racine
    (séparation compile-time du flag `--debug`, déjà référencée
    par O7).
  - `frontend/src/main.tsx` adopte un bootstrap async
    (`await hydrateBuildFlags()` avant `createRoot.render()`)
    pour éliminer une race avec `isDevBuild()` lors du premier
    render — observable utilisateur strictement inchangé (la
    fenêtre s'ouvre toujours sur l'App, le coût IPC est < 5 ms),
    couvert par O11 / O16.
  - `frontend/src/App.tsx` : la souscription au `log:event` est
    désormais inconditionnelle (le backend gate déjà l'émission
    via `EmitLogEventListener` qui retourne nil hors `devbuild`),
    couvert par O19. Pas de gate frontend = pas de race.
  Aucune section R / E / A / N / Safeguards modifiée. La signature
  publique des Operations existantes est inchangée.
