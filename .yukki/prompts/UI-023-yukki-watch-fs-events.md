---
id: UI-023
slug: yukki-watch-fs-events
story: .yukki/stories/UI-023-yukki-watch-fs-events.md
analysis: .yukki/analysis/UI-023-yukki-watch-fs-events.md
status: synced
created: 2026-05-10
updated: 2026-05-10
---

# Canvas REASONS — Auto-rafraîchissement de l'UI sur changement disque (.yukki/)

> Spécification exécutable. Source de vérité pour `/yukki-generate` et
> `/yukki-sync`. Toute divergence code ↔ canvas se résout **dans ce
> fichier d'abord**.

---

## R — Requirements

### Problème

Aujourd'hui, l'UI yukki ne reflète aucune écriture du dossier `.yukki/`
qui ne passe pas par ses propres bindings (VS Code, CLI `/yukki-story`,
`git pull`). L'utilisateur doit fermer/rouvrir le projet pour voir les
changements. UI-023 introduit un watcher Go par projet ouvert qui émet
des events Wails que le frontend consomme pour rafraîchir
automatiquement les vues impactées (HubList, Kanban, SpddEditor).

### Definition of Done

- [ ] **DoD1** — Création d'un fichier `.yukki/<kind>/<NEW>.md` hors de
      yukki déclenche un refresh `useArtifactsStore` du kind
      correspondant en < 500 ms après debounce (cf. AC1 + AC5).
- [ ] **DoD2** — Modification externe du titre d'un artefact non
      ouvert se propage à la HubList (item title à jour, classement
      préservé) (AC2).
- [ ] **DoD3** — Suppression d'un artefact ouvert dans le SpddEditor
      met l'éditeur en état explicite « Cet artefact n'existe plus »
      avec bouton `Fermer` ; l'item disparaît de la HubList (AC3).
- [ ] **DoD4** — Modification disque d'un artefact ouvert avec
      `isDirty === true` affiche un banner conflit avec 2 actions
      « Recharger depuis le disque » / « Garder mes modifs » (AC4).
- [ ] **DoD5** — `git checkout` modifiant N fichiers en rafale
      déclenche **un seul** refresh par store impacté après un
      debounce de 250 ms (AC5).
- [ ] **DoD6** — Watch multi-projet : tous les projets ouverts (>1)
      sont surveillés simultanément ; un event sur le projet inactif
      met sa HubList à jour quand l'utilisateur revient dessus
      (vérification : ouvrir 2 projets, écrire dans le second en
      arrière-plan, switch via TabBar, voir le contenu à jour).
- [ ] **DoD7** — Boucle self-write : Ctrl+S, Accept restructuration,
      Terminer (UI-019) **ne déclenchent pas** de refresh sur le
      fichier édité (vérification : éditer + sauver + vérifier que
      l'editState n'est pas reset).
- [ ] **DoD8** — Cycle de vie : `OnStartup` démarre les watchers de
      tous les projets restaurés ; `OpenProject(path)` démarre le
      watcher du nouveau projet ; `CloseProject(idx)` arrête le
      watcher correspondant ; `OnShutdown` arrête tous les watchers
      proprement (timeout 1 s).
- [ ] **DoD9** — Tests : Go ≥ 8 cas (création/modif/delete, debounce,
      multi-projet, edit-lock filtre, cleanup au close) ;
      frontend vitest ≥ 5 cas (subscriber, conflit, AC3/AC4 SpddEditor).

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `FsEvent` | Event domaine (un changement disque détecté + classifié) | `ProjectPath`, `Path`, `Kind` (create/modify/delete/rename), `Mtime` | éphémère, agrégé par debouncer |
| `FsBatch` | Lot d'events fusionnés après debounce | `ProjectPath`, `Events []FsEvent` | éphémère, transmis à `emitEvent` puis jeté |
| `Watcher` | Aggregate Go : un watcher actif par projet | `projectPath`, `fsnotify.Watcher`, `cancel`, `debouncer` | créé à `OpenProject` ou `OnStartup`, supprimé à `CloseProject` ou `OnShutdown` |
| `EditLock` | Verrou logique sur un path en cours d'édition | `absPath`, `acquiredAt` | acquis à l'entrée du mode édition SpddEditor, libéré à la sortie ou save |
| `ConflictWarning` | Domain event frontend : disque modifié pendant qu'on édite | `path`, `loadedMtime`, `diskMtime` | éphémère, déclenche le banner SpddEditor |

### Relations

- `Watcher` ⟶ `FsEvent` : 1:N (un watcher émet plusieurs events sur sa durée de vie).
- `Watcher` ⟶ `FsBatch` : 1:N (debouncer agrège, émet un batch tous les ~250 ms si activité).
- `OpenedProject` ⟶ `Watcher` : 1:1 (un watcher par projet ouvert).
- `EditLock` ⟶ `FsEvent` : N:1 par filtrage (un lock en place fait drop l'event sur ce path).
- `useArtifactsStore` ⟵ `FsBatch` : N:1 (le batch déclenche `refresh()` du store dont le `kind` correspond aux paths modifiés).
- `useSpddEditorStore.conflictWarning` ⟵ `FsEvent` : 1:1 (un event sur le path ouvert avec `isDirty === true` produit un warning).

### Invariants

- **I1 — `editLocks` consulté avant émission** : tout event dont le `Path` est dans `editLocks` est silencieusement droppé (la goroutine de debounce filtre avant `emitEvent`).
- **I2 — Une session watcher par projet** : `app.fsWatchers sync.Map[projectPath]*Watcher` ; ouvrir 2 fois le même projet est déjà bloqué par `OpenProject` (pas de doublon possible).
- **I3 — Cleanup obligatoire** : tout `OnShutdown` ou `CloseProject` arrête les watchers concernés et attend leurs goroutines (timeout 1 s, log si dépassé).
- **I4 — Path absolu uniquement** : tout `FsEvent.Path` et toute clé d'`editLocks` sont des paths absolus (résolus via `filepath.Abs`).
- **I5 — Filtre extension `.md`** : seuls les events sur fichiers `.md` sous `.yukki/` sont considérés ; `.yukki/.events.log` ou `.gitkeep` sont ignorés.
- **I6 — Pas de notification toast** : le refresh est silencieux côté UI (Scope Out story).
- **I7 — Pas de replay au boot** : à `OnStartup`, on lit l'état actuel via `ListArtifacts`, on ne tente pas de comparer avec un état précédent (Scope Out story).
- **I8 — Symlinks ignorés** : la story scope-out symlink ; le watcher resolve `evalSymlinks` au start mais ne suit pas dynamiquement les changements de target.

---

## A — Approach

**Pour résoudre** *l'absence de synchronisation entre l'UI yukki et le
disque qui force des refresh manuels et casse l'illusion de source de
vérité unique*, **on choisit** *un watcher Go par projet ouvert basé
sur `github.com/fsnotify/fsnotify` (cross-platform inotify/FSEvents/
ReadDirectoryChangesW), avec debounce 250 ms côté Go, émission d'un
event Wails `yukki:fs:changed` granulaire (path absolu + kind +
projectPath), consommé par un hook frontend central
`useFsWatchSubscriber` qui dispatche vers les stores impactés ; la
boucle self-write est cassée par un set `editLocks sync.Map[absPath]`
côté Go consulté par le watcher avant émission, alimenté par 2
bindings `AcquireEditLock(path)` / `ReleaseEditLock(path)` appelés
par le SpddEditor à l'entrée/sortie du mode édition*, **plutôt que**
*(B) polling périodique (latence > 1 s, coût CPU sur gros repo),
(C) refresh manuel uniquement (KO le besoin), (D) bus d'events disque
type `.yukki/.events.log` (réinvente fsnotify, pollue git),
(E) lock OS readonly du fichier en édition (surprise UX, zombie
post-crash, casse FS réseau), (F) un seul watcher sur le projet actif
(rejeté par décision user 2026-05-10 — multi-projet en parallèle
demandé pour les workflows multi-repo)*, **pour atteindre** *latence
< 500 ms en nominal, zéro intervention utilisateur, support
multi-outils (yukki + VS Code + CLI + git) sans friction, et
multi-projet pour les workflows à plusieurs repos*, **en acceptant**
*(1) la dette d'un fallback polling à prévoir si fsnotify se révèle
peu fiable sur volumes réseau / WSL (à challenger en spike post-MVP),
(2) la complexité du multi-watcher (un par projet + cleanup à chaque
close), (3) l'invariant « toute écriture disque par yukki passe par
WriteArtifact entouré d'un edit-lock » qui doit être documenté côté
Norms pour que le filtre fonctionne.*

### Alternatives considérées

- **B — Polling 1-2 s** : latence visible, coût CPU/IO sur gros repos.
- **C — Refresh manuel** : casse le besoin business central.
- **D — Bus d'events disque (`.yukki/.events.log`)** : ré-implémente
  fsnotify, pollue git, fragile.
- **E — Lock OS readonly** : surprise UX, zombie crash, FS réseau KO.
- **F — Single watcher projet actif** : rejeté par retour user
  2026-05-10 (multi-projet demandé pour workflows multi-repo).

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/uiapp` | `fswatch.go` + `fswatch_test.go` | **create** — `Watcher`, debouncer, lifecycle `start/stop`, agrégation events fsnotify, filtre extension `.md` |
| `internal/uiapp` | `editlock.go` + `editlock_test.go` | **create** — set `editLocks sync.Map`, méthodes `acquireEditLock` / `releaseEditLock` / `isLocked` |
| `internal/uiapp` | `app.go` | modify — ajout champ `fsWatchers sync.Map[string]*fsWatcher` dans `App` ; câblage `OnStartup` (start tous les projets restaurés), `OnShutdown` (stop all) |
| `internal/uiapp` | `bindings.go` | modify — `OpenProject` start watcher ; `CloseProject` stop watcher ; nouveaux bindings `AcquireEditLock`/`ReleaseEditLock` |
| `internal/uiapp` | `events.go` (à créer si absent, sinon dans `progress.go`) | modify — déclaration constante `eventFsChanged = "yukki:fs:changed"` + struct `FsChangedPayload` |
| `frontend/src/hooks` | `useFsWatchSubscriber.ts` + `.test.tsx` | **create** — abonnement event Wails, dispatch vers stores |
| `frontend/src/stores/artifacts.ts` | store existant | inchangé en signature ; déjà expose `refresh()` |
| `frontend/src/stores/spdd.ts` | store existant | modify — ajout sous-état `conflictWarning: { path, loadedMtime } \| null` + méthodes `setConflictWarning` / `clearConflictWarning` ; lecture/écriture `loadedMtime` au load via nouveau champ |
| `frontend/src/components/spdd/SpddEditor.tsx` | composant | modify — appel `AcquireEditLock(selectedPath)` à l'entrée du mode édition (`setIsEditMode(true)`), `ReleaseEditLock` à la sortie ou unmount ; rendu banner conflit |
| `frontend/src/components/spdd/SpddEditor.tsx` | composant | modify — état « artefact n'existe plus » quand event `delete` reçu sur le path courant |
| `frontend/src/App.tsx` | composant racine | modify — instanciation unique de `useFsWatchSubscriber()` |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | bindings stub | modify (regénéré auto) — exposer `AcquireEditLock`, `ReleaseEditLock` |
| `go.mod` | dépendances | modify — ajout `github.com/fsnotify/fsnotify v1.7+` |

### Schéma de flux

```
        ┌─────────────────────────────┐
        │  fsnotify.Watcher (per      │
        │  project under .yukki/)     │
        └────────────┬────────────────┘
                     │ raw events (CREATE/WRITE/REMOVE/RENAME)
                     ▼
        ┌─────────────────────────────┐
        │  fswatch.go goroutine       │
        │  1. filter ext == ".md"     │
        │  2. consult editLocks       │
        │  3. accumulate in batch     │
        │  4. debounce 250ms          │
        └────────────┬────────────────┘
                     │ emitEvent("yukki:fs:changed", payload)
                     ▼
        ┌─────────────────────────────┐
        │  Wails IPC                   │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ useFsWatchSubscriber (App)  │
        │ - if event.path matches      │
        │   active store kind →        │
        │   useArtifactsStore.refresh()│
        │ - if event.path === editor   │
        │   path && isDirty →          │
        │   setConflictWarning         │
        │ - if event.kind === delete   │
        │   && editor open path →      │
        │   set "artefact disparu"     │
        └─────────────────────────────┘
```

---

## O — Operations

### O1 — Domain types et constantes

- **Module** : `internal/uiapp`
- **Fichier** : `fswatch.go` (création)
- **Signature** :
  ```go
  package uiapp

  import (
      "context"
      "log/slog"
      "path/filepath"
      "strings"
      "sync"
      "time"

      "github.com/fsnotify/fsnotify"
  )

  // FsChangeKind classifie un event filesystem agrégé. Mappé depuis
  // fsnotify.Op (Create/Write/Remove/Rename).
  type FsChangeKind string

  const (
      FsCreate FsChangeKind = "create"
      FsModify FsChangeKind = "modify"
      FsDelete FsChangeKind = "delete"
      FsRename FsChangeKind = "rename"
  )

  // FsChangedPayload est le payload du event Wails "yukki:fs:changed".
  // Path est absolu, ProjectPath est le chemin racine du projet.
  type FsChangedPayload struct {
      ProjectPath string       `json:"projectPath"`
      Path        string       `json:"path"`
      Kind        FsChangeKind `json:"kind"`
      Mtime       int64        `json:"mtime"` // Unix nano, 0 pour delete
  }

  // eventFsChanged — wire contract Wails. Stable, ne pas renommer
  // sans synchroniser useFsWatchSubscriber.ts.
  const eventFsChanged = "yukki:fs:changed"

  // fsWatchDebounce contrôle la fenêtre de regroupement des events.
  // 250 ms = sweet spot entre réactivité (perçu instantané par
  // l'utilisateur) et anti-stutter sur git checkout (cf. Décision D4).
  const fsWatchDebounce = 250 * time.Millisecond
  ```
- **Comportement** : déclarations seules. Ces types sont consommés par les Operations suivantes.
- **Tests** : pas de test unitaire dédié (couverture par O2-O5 indirectement).

### O2 — Edit-lock store

- **Module** : `internal/uiapp`
- **Fichier** : `editlock.go` + `editlock_test.go` (création)
- **Signature** :
  ```go
  package uiapp

  import (
      "path/filepath"
      "sync"
  )

  // editLocks holds the set of absolute paths currently in edit mode
  // in the SpddEditor. The fsWatcher consults this set and drops
  // events on locked paths to avoid the self-write loop (Ctrl+S /
  // Accept restructuration / Terminer trigger a write that would
  // otherwise re-fire a refresh and reset the editState).
  //
  // Stored on App.editLocks sync.Map[string]struct{} where keys are
  // absolute paths.

  // acquireEditLock registers absPath in editLocks. Idempotent : a
  // second call on the same path is a no-op (returns nil).
  func (a *App) acquireEditLock(path string) error {
      abs, err := filepath.Abs(path)
      if err != nil {
          return err
      }
      a.editLocks.Store(abs, struct{}{})
      return nil
  }

  // releaseEditLock removes absPath from editLocks. Idempotent.
  func (a *App) releaseEditLock(path string) error {
      abs, err := filepath.Abs(path)
      if err != nil {
          return err
      }
      a.editLocks.Delete(abs)
      return nil
  }

  // isEditLocked reports whether absPath is in editLocks. Used by
  // the fsWatch debouncer to filter out self-writes.
  func (a *App) isEditLocked(absPath string) bool {
      _, ok := a.editLocks.Load(absPath)
      return ok
  }
  ```
- **Comportement** : 3 méthodes thread-safe (`sync.Map` lock-free pour read, exclusive pour write). `filepath.Abs` normalise (résout les `./`, supprime les doubles slashes) — invariant I4.
- **Tests** (`editlock_test.go`) :
  - `TestAcquireRelease_Roundtrip` — acquire puis release, isEditLocked false avant et après, true entre.
  - `TestAcquire_Idempotent` — 2 acquire successifs, 1 release, isEditLocked false.
  - `TestRelease_OnUnlocked_NoError` — release sur path jamais acquis, pas d'erreur.
  - `TestAcquire_NormalizesPath` — `./foo/bar.md` et `<cwd>/foo/bar.md` produisent la même clé.

### O3 — Watcher per-project (cycle de vie)

- **Module** : `internal/uiapp`
- **Fichier** : `fswatch.go` + `fswatch_test.go`
- **Signature** :
  ```go
  // fsWatcher encapsule un fsnotify.Watcher + sa goroutine de debounce
  // pour un projet donné. La goroutine consomme les events fsnotify,
  // les filtre (extension, edit-lock), les accumule dans un batch et
  // émet un Wails event par batch après le debounce.
  type fsWatcher struct {
      projectPath string
      watcher     *fsnotify.Watcher
      cancel      context.CancelFunc
      done        chan struct{}
      logger      *slog.Logger
  }

  // startFsWatcher démarre un watcher récursif sur projectPath/.yukki.
  // Renvoie nil + log warning si le dossier n'existe pas (idle —
  // sera créé plus tard, démarrer un watcher tardif est hors scope MVP,
  // cf. Décision D5).
  // L'instance est stockée sur App.fsWatchers ; plusieurs watchers
  // coexistent (un par projet ouvert).
  func (a *App) startFsWatcher(projectPath string) error

  // stopFsWatcher arrête le watcher associé à projectPath. Idempotent.
  // Attend la goroutine (timeout 1 s) avant de retourner ; log warn
  // si dépassement.
  func (a *App) stopFsWatcher(projectPath string) error

  // stopAllFsWatchers itère sur App.fsWatchers et appelle
  // stopFsWatcher pour chacun. Utilisé par OnShutdown.
  func (a *App) stopAllFsWatchers()
  ```
- **Comportement `startFsWatcher`** :
  1. Calculer `yukkiDir = filepath.Join(projectPath, ".yukki")`. Si absent (`os.Stat` ENOENT), log warn « .yukki absent — watcher idle » et return nil (Décision D5).
  2. `watcher, err := fsnotify.NewWatcher()`. Sur erreur retourner.
  3. `filepath.WalkDir(yukkiDir, ...)` — ajouter chaque sous-répertoire au watcher (fsnotify ne récursive pas seul). Ignorer les erreurs (dossier supprimé pendant walk).
  4. `ctx, cancel := context.WithCancel(a.ctx)`. Allouer `done := make(chan struct{})`.
  5. Stocker `fsw := &fsWatcher{projectPath, watcher, cancel, done, a.logger}` dans `a.fsWatchers.Store(projectPath, fsw)`.
  6. Lancer goroutine `go fsw.runDebounce(ctx, a)` (cf. O4).
  7. Return nil.
- **Comportement `stopFsWatcher`** :
  1. `val, ok := a.fsWatchers.LoadAndDelete(projectPath)`. Si !ok, return nil.
  2. `fsw.cancel()` — signal goroutine.
  3. `fsw.watcher.Close()` — libère les FDs OS.
  4. Attendre `<-fsw.done` avec `time.After(1*time.Second)` ; log warn si timeout.
- **Comportement `stopAllFsWatchers`** : range sur `a.fsWatchers`, appeler `stopFsWatcher` pour chaque clé.
- **Tests** (`fswatch_test.go`) :
  - `TestStartFsWatcher_NoYukkiDir_Idle` — start sur un projet sans `.yukki` → pas d'erreur, pas de watcher actif dans la map.
  - `TestStartStop_Roundtrip` — `t.TempDir() + .yukki/`, start, écrire un fichier `.md`, asserter event reçu, stop, asserter goroutine done.
  - `TestStopAll_AcrossMultipleProjects` — 3 projets, start 3 watchers, `stopAllFsWatchers`, asserter map vide.
  - `TestStop_Idempotent` — stop sur projectPath inconnu, return nil.

### O4 — Debounce + filter + emit

- **Module** : `internal/uiapp`
- **Fichier** : `fswatch.go` (suite)
- **Signature** :
  ```go
  // runDebounce consomme les events fsnotify, filtre, accumule, et
  // émet un FsChangedPayload par event individuel après debounce
  // (groupé en goroutine batch à 250 ms d'inactivité).
  // Termine quand ctx.Done() OU watcher.Events fermé. Signale via
  // close(fsw.done).
  func (fsw *fsWatcher) runDebounce(ctx context.Context, a *App)
  ```
- **Comportement** :
  1. `defer close(fsw.done)` — signal end.
  2. `pending := map[string]FsChangeKind{}` — clé absPath, valeur dernier kind observé (les events plus récents écrasent les plus anciens : create+modify devient modify, modify+delete devient delete).
  3. `var timer *time.Timer` — timer paresseux, créé au 1er event d'un batch.
  4. Loop `for {}` avec select sur `ctx.Done()`, `fsw.watcher.Events`, `fsw.watcher.Errors`, et `<-timer.C` (si timer non-nil).
  5. Sur event fsnotify :
     - Filtrer si extension ≠ `.md` (`!strings.HasSuffix(ev.Name, ".md")`).
     - Calculer absPath via `filepath.Abs(ev.Name)`.
     - Consulter `a.isEditLocked(absPath)` — si true, drop.
     - Mapper `ev.Op` → `FsChangeKind` (CREATE→create, WRITE→modify, REMOVE→delete, RENAME→rename, fallback modify).
     - Si event est CREATE sur un répertoire (stat type Dir), ajouter au watcher (`fsw.watcher.Add(ev.Name)`) — gestion récursive.
     - `pending[absPath] = kind`.
     - Reset/start le timer à `fsWatchDebounce`.
  6. Sur tick du timer (`<-timer.C`) :
     - Pour chaque entrée de `pending`, émettre un event Wails `yukki:fs:changed` avec `FsChangedPayload`.
     - Vider `pending`. Timer = nil.
  7. Sur `ctx.Done()` ou Events fermé : flush le pending une dernière fois si non-vide, exit.
- **Tests** (`fswatch_test.go` suite) :
  - `TestDebounce_GroupsRapidEvents` — écrire 5 fichiers en < 50 ms, asserter qu'un seul flush émet 5 events Wails (pas 5 flushes).
  - `TestEditLock_FiltersEvent` — acquire un lock sur `<tmp>/.yukki/stories/X.md`, écrire le fichier, asserter aucun event Wails émis.
  - `TestKindMapping_RenameThenCreate` — rename émet fsnotify.RENAME puis CREATE → 2 events Wails (le 1er sur ancien path = delete, le 2ᵉ sur nouveau = create).
  - `TestNonMdFile_Ignored` — écrire `.yukki/.gitkeep` ou `.DS_Store` → aucun event.

### O5 — App field + lifecycle wiring

- **Module** : `internal/uiapp`
- **Fichier** : `app.go` (modify)
- **Signature** :
  ```go
  // Dans App struct (champs ajoutés) :
  type App struct {
      // ... existants
      fsWatchers sync.Map // map[string]*fsWatcher, key = projectPath
      editLocks  sync.Map // map[string]struct{}, key = abs path
  }

  // Dans OnStartup (ajout après restoreRegistry) :
  for _, p := range a.openedProjects {
      if err := a.startFsWatcher(p.Path); err != nil && a.logger != nil {
          a.logger.Warn("fswatch start failed", "path", p.Path, "err", err)
      }
  }

  // Dans OnShutdown (avant cancel) :
  a.stopAllFsWatchers()
  ```
- **Comportement** : wiring pur. Les hooks Wails OnStartup/OnShutdown deviennent les points d'ancrage du cycle de vie watcher. Erreur de start = log warn (ne bloque pas le démarrage de l'app).
- **Tests** : couverts par les tests d'intégration de O3 (start/stop roundtrip).

### O6 — OpenProject / CloseProject hooks

- **Module** : `internal/uiapp`
- **Fichier** : `bindings.go` (modify)
- **Signature** :
  ```go
  // Dans OpenProject (après ajout à openedProjects, avant return) :
  if err := a.startFsWatcher(p.Path); err != nil && a.logger != nil {
      a.logger.Warn("fswatch start on OpenProject failed", "path", p.Path, "err", err)
  }

  // Dans CloseProject (avant la mutation de openedProjects) :
  if closed := a.openedProjects[idx]; closed != nil {
      _ = a.stopFsWatcher(closed.Path)
  }
  ```
- **Comportement** : à chaque ouverture/fermeture de projet via la UI, le watcher associé suit. Pas de modification du contrat existant des bindings (toujours `error` en retour).
- **Tests** (`bindings_test.go` modify) :
  - `TestOpenProject_StartsWatcher` — open via la binding, asserter que `a.fsWatchers.Load(path)` renvoie un watcher non-nil.
  - `TestCloseProject_StopsWatcher` — open puis close, asserter `a.fsWatchers.Load(path)` renvoie zéro / not loaded.

### O7 — Bindings AcquireEditLock / ReleaseEditLock

- **Module** : `internal/uiapp`
- **Fichier** : `bindings.go` (modify) — section éditeur
- **Signature** :
  ```go
  // AcquireEditLock marque le path absolu comme étant en cours
  // d'édition côté UI. Le watcher fsnotify filtre les events sur
  // ce path tant que le lock est posé. Idempotent.
  func (a *App) AcquireEditLock(path string) error {
      a.traceBinding("AcquireEditLock", slog.String("path", path))
      return a.acquireEditLock(path)
  }

  // ReleaseEditLock retire le lock. Idempotent (no-op si inconnu).
  func (a *App) ReleaseEditLock(path string) error {
      a.traceBinding("ReleaseEditLock", slog.String("path", path))
      return a.releaseEditLock(path)
  }
  ```
- **Comportement** : trampolines simples vers les helpers privés de O2. Tracés via `traceBinding` (cohérent OPS-001).
- **Tests** (`bindings_test.go` modify) :
  - `TestAcquireBinding_Stores` — appel binding, asserter `a.isEditLocked(path)` true.
  - `TestReleaseBinding_Removes` — acquire puis release, asserter false.

### O8 — Frontend hook `useFsWatchSubscriber`

- **Module** : `frontend/src/hooks`
- **Fichier** : `useFsWatchSubscriber.ts` + `.test.tsx` (création)
- **Signature** :
  ```ts
  import { useEffect } from 'react';
  import { useArtifactsStore } from '@/stores/artifacts';
  import { useSpddEditorStore } from '@/stores/spdd';
  import { useArtifactsStoreKindFromPath } from '@/lib/artifactPath';
  import { logger } from '@/lib/logger';

  interface FsChangedPayload {
    projectPath: string;
    path: string;
    kind: 'create' | 'modify' | 'delete' | 'rename';
    mtime: number;
  }

  /**
   * Abonnement central à l'event Wails `yukki:fs:changed`. Doit
   * être instancié une seule fois (App.tsx racine). Dispatche les
   * events vers les stores impactés :
   *   - useArtifactsStore.refresh() si le path tombe sous un kind
   *     actuellement listé.
   *   - useSpddEditorStore.setConflictWarning si le path est ouvert
   *     dans le SpddEditor avec isDirty === true.
   *   - useSpddEditorStore.setDeleted si le path est ouvert et
   *     event = 'delete'.
   */
  export function useFsWatchSubscriber(): void;
  ```
- **Comportement** :
  1. `useEffect` au mount, abonnement via `(window as unknown as { runtime?: WailsRuntime }).runtime?.EventsOn('yukki:fs:changed', cb)`.
  2. Dans le callback, parser le payload `FsChangedPayload`.
  3. Dériver `kind` de l'artefact via le path (regex sur `/.yukki/<kind>/...` — helper `artifactKindFromPath` à co-créer dans `lib/artifactPath.ts` si pas déjà existant).
  4. Si `kind === currentArtifactsKind` → `useArtifactsStore.getState().refresh()`.
  5. Si `path === useArtifactsStore.getState().selectedPath` :
     - Si event.kind === 'delete' → `useSpddEditorStore.getState().setDeleted(true)`.
     - Sinon, si `useSpddEditorStore.getState().isDirty === true` → `useSpddEditorStore.getState().setConflictWarning({ path, diskMtime: event.mtime })`.
     - Sinon (read-only ou non-dirty) → `useArtifactsStore.refresh()` + recharger via `ReadArtifact`.
  6. Cleanup : appel de la fonction de désabonnement renvoyée par `EventsOn`.
- **Tests** (`useFsWatchSubscriber.test.tsx`) :
  - `dispatches refresh on create event of current kind` — mock event, assert `useArtifactsStore.refresh` called once.
  - `triggers conflict warning when isDirty + open path modified` — set selectedPath + isDirty=true, mock modify event, assert `setConflictWarning` called.
  - `marks deleted when open path removed` — set selectedPath, mock delete event, assert `setDeleted(true)`.
  - `ignores events for non-current kind` — current kind = 'stories', mock event on `.yukki/inbox/X.md`, assert refresh NOT called.
  - `unsubscribes on unmount` — render + unmount, assert unsubscribe fn called.

### O9 — `useSpddEditorStore` ajout sous-état conflit

- **Module** : `frontend/src/stores`
- **Fichier** : `spdd.ts` (modify) + `spdd.test.ts` (modify)
- **Signature** :
  ```ts
  // Dans SpddEditorState (champs ajoutés) :
  conflictWarning: { path: string; diskMtime: number } | null;
  deleted: boolean;
  loadedMtime: number | null; // posé au load via ReadArtifact

  setConflictWarning: (w: { path: string; diskMtime: number } | null) => void;
  clearConflictWarning: () => void;
  setDeleted: (next: boolean) => void;
  setLoadedMtime: (m: number | null) => void;
  ```
- **Comportement** : 4 setters minimaux. `loadedMtime` est posé par le code de chargement (`ReadArtifact` retourne déjà la mtime ? vérifier le binding ; sinon, ajouter un binding `StatArtifact` ou enrichir `ReadArtifact` avec un retour `{content, mtime}` — décision résiduelle D6 si elle apparaît, sinon remplir au load best-effort via une heuristique côté frontend).
- **Tests** (`spdd.test.ts` modify) :
  - `setConflictWarning sets the field` — asserter état après appel.
  - `clearConflictWarning resets it` — set puis clear, asserter null.
  - `setDeleted toggles flag` — set true puis false.

### O10 — `SpddEditor` lifecycle edit-lock + UI conflit

- **Module** : `frontend/src/components/spdd`
- **Fichier** : `SpddEditor.tsx` (modify) + `SpddEditor.test.tsx` (modify)
- **Comportement** :
  1. `useEffect` qui watch `[isEditMode, selectedPath]` :
     - À l'entrée du mode édition (`isEditMode === true && selectedPath !== ''`) → `void AcquireEditLock(selectedPath)`.
     - À la sortie (`isEditMode === false`) ou changement de `selectedPath` → `void ReleaseEditLock(prevPath)`.
     - Cleanup return : `ReleaseEditLock(selectedPath)` si lock acquis.
  2. Ajouter rendu d'un banner `ConflictWarningBanner` (composant interne) quand `useSpddEditorStore(s => s.conflictWarning)` ≠ null. 2 boutons :
     - **« Recharger depuis le disque »** → `ReadArtifact(path)` → `parseArtifactContent` → `setEditState(reparsed)` + `setDirty(false)` + `clearConflictWarning()`.
     - **« Garder mes modifs »** → `clearConflictWarning()` (le prochain Save écrasera disque).
  3. Ajouter rendu d'un état explicite « Cet artefact n'existe plus » + bouton `Fermer` quand `useSpddEditorStore(s => s.deleted) === true`. Click → `useArtifactsStore.setSelectedPath('')` + `setDeleted(false)`.
  4. Au changement de `selectedPath`, reset `deleted` et `conflictWarning` (artefact différent → état neuf).
- **Tests** (`SpddEditor.test.tsx` modify) :
  - `acquires edit lock on entering edit mode` — mock `AcquireEditLock`, set isEditMode=true, asserter call avec selectedPath.
  - `releases on exiting edit mode` — set isEditMode=true puis false, asserter `ReleaseEditLock`.
  - `releases on selectedPath change` — change path en edit mode, asserter release sur prev + acquire sur new.
  - `renders conflict banner when conflictWarning set` — asserter présence des 2 boutons.
  - `reload button calls ReadArtifact and resets` — click reload, asserter call + state propre.
  - `renders deleted state when deleted=true` — asserter texte « Cet artefact n'existe plus » + bouton Fermer.

### O11 — App.tsx instanciation hook

- **Module** : `frontend/src`
- **Fichier** : `App.tsx` (modify)
- **Comportement** :
  ```tsx
  import { useFsWatchSubscriber } from '@/hooks/useFsWatchSubscriber';

  export function App() {
    useFsWatchSubscriber(); // single instance — must be at root
    // ... reste du composant
  }
  ```
- **Tests** : pas de test dédié à cette ligne (couvert par les tests du hook).

### O12 — `go.mod` ajout dépendance `fsnotify`

- **Module** : root
- **Fichiers** : `go.mod`, `go.sum`
- **Comportement** : `go get github.com/fsnotify/fsnotify@latest`. Vérifier license (BSD-3) + version (≥ v1.7.0).
- **Tests** : `go mod tidy`, `go build ./...` doit passer.

---

## N — Norms

- **Logging Go** : utiliser `a.logger` slog injecté + helper
  `traceBinding` (cohérent avec UI-019/OPS-001) pour tous les nouveaux
  bindings (`AcquireEditLock`, `ReleaseEditLock`). Les warnings du
  watcher (start failed, debounce timeout, fsnotify error) en
  `slog.Warn`. Les events fsnotify individuels en `slog.Debug` pour
  diagnostic — jamais `Info` (trop bruyant).
- **Logging frontend** : passer par `logger` de
  `frontend/src/lib/logger.ts` (interdit `console.*` cf. OPS-001). Le
  hook log en `info` les transitions notables (« fs subscriber up »,
  « received fs event »), en `debug` chaque event individuel.
- **Bindings Wails** : tous les bindings publics retournent `error` ;
  signature TypeScript regénérée auto par `wails generate module`.
- **Cycle de vie hooks** : tout `EventsOn` doit avoir son `useEffect`
  cleanup qui appelle la fonction de désabonnement renvoyée. Pas de
  fuite d'abonnement.
- **Indirection `emitEvent`** : tout event Wails passe par l'helper
  `emitEvent(a.ctx, ...)` du package, **jamais** `runtime.EventsEmit`
  direct. Sinon les tests sous `-race` voient « cannot call EventsEmit »
  (incident résolu UI-019 PR #32).
- **Tests Go** : pyramide unitaire prioritaire (cf.
  [`testing-backend.md`](../methodology/testing/testing-backend.md)).
  Pour tester le watcher de bout en bout, créer un `t.TempDir()`,
  écrire un fichier réel, capturer l'event Wails via
  `recordEmits(t)` (helper UI-019). Pas de mock fsnotify — la lib est
  rapide et déterministe en test si on attend un peu plus que le
  debounce.
- **Tests frontend** : composants testés via `@testing-library/
  react` + `vi.mock('@/wailsjs/go/main/App')`. Mock event Wails via
  `(window as any).runtime = { EventsOn: vi.fn() }` (pattern
  useRestructureSession).
- **Nommage** :
  - Go : `fsWatcher` (struct), `startFsWatcher` / `stopFsWatcher` /
    `stopAllFsWatchers` (méthodes App), `acquireEditLock` /
    `releaseEditLock` / `isEditLocked` (privées), `AcquireEditLock` /
    `ReleaseEditLock` (publiques bindings).
  - Frontend : `useFsWatchSubscriber` (hook), `conflictWarning` /
    `setConflictWarning` (store), `ConflictWarningBanner`
    (composant interne SpddEditor).
- **i18n** : strings UI en français (cohérent SPDD existant). « Cet
  artefact n'existe plus », « Recharger depuis le disque (perdre mes
  modifs) », « Garder mes modifs (écraser le disque au prochain
  Save) ».
- **Pas de nouvelle dépendance frontend** ; côté Go, ajout unique
  `github.com/fsnotify/fsnotify v1.7+` (BSD-3, maintenue, > 9 k stars).
- **Path absolu** : invariant I4 — toujours `filepath.Abs` côté Go,
  jamais de path relatif dans `editLocks` ou `FsChangedPayload`.

---

## S — Safeguards

- **Sécurité (STRIDE — Tampering)**
  - **Interdit** : exposer côté frontend des paths absolus de **fichiers
    hors de `.yukki/` du projet ouvert**. Le watcher Go filtre par
    construction (il ne watch que `<projectPath>/.yukki/`), mais une
    régression possible (ex. evalSymlinks pointant ailleurs) est
    rejetée par check explicite : `strings.HasPrefix(absPath,
    filepath.Join(projectPath, ".yukki"))`.
  - **Interdit** : suivre dynamiquement un symlink dont la target
    sort de `.yukki/` (cf. invariant I8).
- **Compatibilité**
  - **Interdit** : breaking change sur la signature de `OpenProject`
    / `CloseProject` / autres bindings existants. UI-023 ajoute des
    bindings nouveaux et hooke à l'intérieur des existants sans
    changer leur contrat.
  - **Interdit** : modifier le format du registry `projects.json`
    (UI-009). UI-023 n'a pas besoin de persister d'état.
- **Performance**
  - **Interdit** : émettre un event Wails par event fsnotify brut
    (dégrade l'UX sur git checkout). Toujours passer par le
    debouncer (invariant I1 implicite via O4).
  - **Interdit** : laisser un watcher actif sur un projet fermé
    (invariant I3 — cleanup obligatoire).
  - **Interdit** : créer plus d'un watcher par projet (invariant
    I2 — `sync.Map` LoadOrStore équivalent côté start).
- **Périmètre**
  - **Interdit** : émettre un event sur un fichier non-`.md`
    (invariant I5).
  - **Interdit** : afficher une notification toast à chaque event
    (cf. story Scope Out — refresh silencieux).
  - **Interdit** : tenter un merge automatique des conflits
    (cf. story Scope Out — choix utilisateur uniquement).
- **Concurrence / cycle de vie**
  - **Interdit** : émettre un event Wails après que `OnShutdown`
    a été appelé. Le `cancel()` du contexte de chaque watcher fait
    sortir la goroutine de runDebounce avant.
  - **Interdit** : appeler `runtime.EventsEmit` directement
    (cf. Norms + incident UI-019 race CI).
- **Self-write loop**
  - **Interdit** : émettre un event Wails sur un path actuellement
    dans `editLocks` (invariant I1). Le filtre est obligatoire dans
    `runDebounce` avant `pending[absPath] = kind`.
- **Build-time gating**
  - **Pas de gate `IsDevBuild`** sur UI-023. La feature est livrée
    pour tous les builds.

---

## Changelog

- **2026-05-10 — initial generation** — 12 Operations livrées
  (status `draft`). 5 décisions résiduelles tranchées (D1 path
  complet, D2 polling hors MVP, D3 mtime, D4 debounce 250 ms,
  D5 idle si `.yukki/` absent) + 2 décisions user pre-analyse
  (Q1 lock implicite Go, multi-projet parallèle).

- **2026-05-10 — sync — live re-load du fichier ouvert
  (alignement code ↔ canvas)** — `status: implemented → synced`.
  Le canvas O8 spécifiait déjà « Sinon (read-only ou non-dirty)
  → recharger via ReadArtifact », mais l'implémentation initiale
  ratait ce branch et ne faisait que `useArtifactsStore.refresh()`.
  Symptôme observé en smoke test : modifier un .md d'inbox hors
  yukki ne mettait pas à jour le texte de l'éditeur ; il fallait
  changer d'inbox puis revenir pour voir le contenu disque.

  ### Operations existantes amendées

  - **O8 useFsWatchSubscriber** : nouveau branch « open file
    modifié sans modifs locales » qui appelle
    `useSpddEditorStore.bumpExternalReloadCounter()` en parallèle
    du `refresh()` de la HubList. Sans ce branch, le contenu de
    l'éditeur restait stale post-event externe.
  - **O9 useSpddEditorStore** : ajout du champ
    `externalReloadCounter: number` + action
    `bumpExternalReloadCounter()`. Compteur monotone observé par
    le `SpddEditor` pour déclencher un re-load live. Pas un signal
    booléen pour rester React-friendly (chaque bump produit une
    nouvelle valeur, le useEffect re-fire à coup sûr même si la
    précédente lecture n'avait pas fini).
  - **O10 SpddEditor** : nouveau `useEffect` qui watch
    `externalReloadCounter` et appelle
    `ReadArtifact(selectedPath)` → `parseArtifactContent` →
    `setEditState(reparsed)` + reset `isDirty=false`. Cleanup
    `aborted` flag pour éviter race si l'utilisateur change
    d'artefact pendant le reload. Erreurs disque loguées en
    `warn` (pas de toast — refresh silencieux par contrat
    Scope Out).

  ### Tests ajoutés

  - Frontend : `bumps externalReloadCounter when open path is
    modified without dirty` — assert que l'event modify sur le
    path ouvert (isDirty=false) incrémente le counter et
    n'allume pas le conflictWarning. 6/6 vitest verts.

  ### Suite

  - Aucun comportement utilisateur observable n'a divergé du
    contrat des AC story (l'AC2 « modification externe d'un
    artefact non ouvert » ne mentionne pas l'éditeur ; le live
    reload de l'éditeur ouvert s'inscrit comme un cas dérivé
    naturellement attendu).
  - Le branch ne s'applique pas au story-legacy path
    (editState === null) — le useEffect early-return si
    parsedTemplate est null. À traiter en `/yukki-prompt-update`
    si retour utilisateur sur story legacy.
