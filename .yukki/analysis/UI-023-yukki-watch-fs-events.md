---
id: UI-023
slug: yukki-watch-fs-events
story: .yukki/stories/UI-023-yukki-watch-fs-events.md
status: synced
created: 2026-05-10
updated: 2026-05-10
---

# Analyse — Auto-rafraîchissement de l'UI sur changement disque (.yukki/)

> Contexte stratégique pour la story `UI-023-yukki-watch-fs-events`. Produit
> par `/yukki-analysis` à partir d'un scan ciblé du codebase. Ne duplique ni
> la story ni le canvas REASONS.

## Mots-clés métier extraits

- **fsnotify** (lib watcher cross-platform Go)
- **EventsEmit** (canal Wails déjà utilisé pour `provider:*`, `spdd:restructure:*`)
- **`.yukki/`** (racine watch, par projet)
- **OpenedProject / activeProjectDir** (concept existant `internal/uiapp/registry.go`)
- **`useArtifactsStore.refresh()`** (consumer principal frontend)
- **isDirty / SpddEditor** (cas conflit AC4)
- **mtime / hash content** (heuristique conflit)
- **debounce** (regroupement events `git checkout`)
- **edit-lock** (filtre self-write — issu de la décision user Q1 option A)
- **multi-projet parallèle** (un watcher par projet ouvert — décision user)

## Concepts de domaine

### Existants (déjà dans le code)

- **`OpenedProject`** — [internal/uiapp/registry.go:47-53](../../internal/uiapp/registry.go) : struct avec `Path string`. La liste vit dans `App.openedProjects []*OpenedProject` + `activeIndex int`. **Multi-projet déjà supporté** par le modèle ; UI-023 doit juste s'y greffer (un watcher par entrée de la slice).
- **`activeProjectDir()`** — [internal/uiapp/bindings.go:420-427](../../internal/uiapp/bindings.go) : getter du path actif. UI-023 a besoin d'un getter équivalent qui itère **tous** les projets ouverts pour gérer le multi-watch.
- **Hooks Wails `OnStartup` / `OnShutdown`** — [internal/uiapp/app.go:168-216](../../internal/uiapp/app.go) : déjà câblés (restore registry, cancel sessions). Points d'ancrage du cycle de vie watcher : `OnStartup` démarre les watchers de tous les projets restaurés, `OnShutdown` les arrête tous proprement.
- **`SwitchProject(idx)`** — [internal/uiapp/bindings.go:148-165](../../internal/uiapp/bindings.go) : émet déjà `project:switched`. Avec multi-watch, ce binding **ne change plus rien au cycle de vie watcher** (tous les projets sont déjà watchés) — il met juste à jour `activeIndex` pour la lecture UI.
- **`emitEvent` indirection** — [internal/uiapp/progress.go:14-43](../../internal/uiapp/progress.go) : `atomic.Pointer` autour de `runtime.EventsEmit` pour la testabilité. UI-023 doit passer par cet helper, jamais par `runtime.EventsEmit` directement (cf. invariant established UI-019).
- **`useArtifactsStore.refresh()`** — [frontend/src/stores/artifacts.ts](../../frontend/src/stores/artifacts.ts) : déjà exposé. UI-023 le câble derrière l'event Wails. Contrat existant non touché.
- **`useSpddEditorStore.isDirty`** — [frontend/src/stores/spdd.ts](../../frontend/src/stores/spdd.ts) : flag existant. UI-023 le lit pour décider si on déclenche le warning de conflit (AC4).

### Nouveaux (à introduire)

- **`fsWatcher` (Go)** — composant `internal/uiapp/fswatch.go` (à créer). Encapsule `fsnotify.Watcher` + goroutine qui agrège les events, applique le debounce, filtre via `editLocks`, et appelle `emitEvent`. Une instance par projet ouvert ; gérées dans `App.fsWatchers sync.Map[projectPath]*fsWatcher`.
- **`editLocks` (Go)** — `App.editLocks sync.Map[absPath]struct{}`. Set des paths actuellement en mode édition côté UI. Le watcher consulte le set avant d'émettre — si présent, drop l'event (résout la boucle yukki-écrit-soi-même). Pas de marqueur disque, pas d'OS readonly (cf. décision user Q1 option A).
- **Bindings `AcquireEditLock(path)` / `ReleaseEditLock(path)`** — wrapper minimaliste sur `editLocks`. Appelés par `SpddEditor` à l'entrée/sortie du mode édition. Idempotents.
- **Event Wails `yukki:fs:changed`** — payload : `{ projectPath: string, kind: "create"|"modify"|"delete"|"rename", path: string }`. Path absolu pour que le frontend puisse cibler le bon projet (multi-projet) sans re-déduire.
- **`useFsWatchSubscriber` (frontend)** — hook React qui s'abonne à l'event et dispatche vers les stores impactés (`useArtifactsStore.refresh()`, et un nouveau handler de conflit dans `useSpddEditorStore`). Centralise le wiring pour ne pas dupliquer l'`EventsOn` dans chaque composant.
- **`SpddEditor` conflict warning** — composant léger (banner ou modal) déclenché quand `isDirty && lastDiskMtime > loadedMtime` pour le path courant. Affiche les 2 boutons AC4.

## Approche stratégique

**Pour résoudre** *l'absence de synchronisation entre l'UI yukki et le disque qui force des refresh manuels et casse l'illusion de source de vérité unique*, **on choisit** *un watcher Go par projet ouvert basé sur `fsnotify` (un seul watcher cross-platform Linux/macOS/Windows, déjà battle-tested dans l'écosystème Go), avec debounce 250 ms et émission d'un event Wails granulaire (path absolu) consommé par un hook frontend central qui dispatche vers `useArtifactsStore.refresh()` et le SpddEditor pour la détection de conflit ; la boucle self-write est cassée par un set in-memory `editLocks` côté Go consulté par le watcher avant émission*, **plutôt que** *(B) polling périodique (latence > 1 s, coût CPU sur gros repo), (C) refresh manuel uniquement (KO le besoin), (D) bus d'events transitant par disque type `.yukki/.events.log` (réinvente fsnotify), (E) lock fichier readonly côté OS (surprise UX, zombie post-crash), (F) un seul watcher sur le projet actif uniquement (rejeté par décision user 2026-05-10)*, **pour atteindre** *latence < 500 ms en nominal, zéro intervention utilisateur, support multi-outils (yukki + VS Code + CLI + git) sans friction, et compatibilité multi-projet pour les workflows où plusieurs repos sont ouverts en parallèle*, **en acceptant** *(1) la dette d'un fallback polling à prévoir si `fsnotify` se révèle peu fiable sur volumes réseau / WSL (issue connue, à challenger en spike), (2) la complexité du multi-watcher (un par projet, cleanup au close), (3) l'invariant « toute écriture disque par yukki passe par `WriteArtifact` » qui doit être documenté côté Norms canvas pour que l'edit-lock fonctionne.*

### Alternatives considérées

- **B — polling toutes les 1-2 s** : latence visible, coût CPU + I/O sur gros repos, pas de détection fine du type d'event.
- **C — refresh manuel** : casse le besoin business central de la story.
- **D — bus d'events disque (`.yukki/.events.log`)** : ré-implémente fsnotify avec moins de garanties, ajoute un fichier d'état partagé qui pollue le repo git.
- **E — lock OS readonly du fichier en édition** : surprise UX (« pourquoi VS Code refuse d'éditer ? »), zombie possible si yukki crash, casse sur FS réseau / NTFS sans permissions.
- **F — single watcher du projet actif** : rejetée par retour user 2026-05-10. Watch des projets en arrière-plan demandé pour les workflows multi-repo (commit dans repo A pendant qu'on bosse dans repo B).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp` | **fort** | création `fswatch.go` + `editlock.go` ; modif `app.go` (cycle hook), `bindings.go` (Acquire/Release + getter all-projects-paths) |
| `internal/artifacts` | faible | aucun changement structurel ; sera juste relu par `ListArtifacts` après event |
| `frontend/src/stores` | moyen | nouveau hook `useFsWatchSubscriber` ; ajout d'un sous-état `conflictWarning` dans `useSpddEditorStore` |
| `frontend/src/components/spdd` | moyen | banner conflit dans `SpddEditor` ; appel `AcquireEditLock`/`Release` à l'entrée/sortie du mode édition |
| `frontend/wailsjs/go/main` | faible | bindings TS stub regénérés (`AcquireEditLock`, `ReleaseEditLock`) |
| `go.mod` | faible | ajout dépendance `github.com/fsnotify/fsnotify` |
| `docs` | aucun | dette CLAUDE.md à éventuellement enrichir mais hors scope |

## Dépendances et intégrations

- **`github.com/fsnotify/fsnotify` v1.7+** — lib cross-platform recommandée (inotify Linux, FSEvents macOS, ReadDirectoryChangesW Windows). License BSD-3, maintenue, > 9 k stars. Aucune dépendance native runtime.
- **Wails `runtime.EventsEmit`** — canal IPC déjà utilisé. Passer **toujours** par l'indirection `emitEvent` (cf. UI-019 incident race-condition CI).
- **Pas de dépendance frontend nouvelle** — le hook `useFsWatchSubscriber` consomme `(window as any).runtime.EventsOn` comme tous les autres hooks (`useRestructureSession`, `useSpddSuggest`).
- **Contrainte plateforme** : sur **WSL** (Windows Subsystem for Linux), `fsnotify` peut ne pas remonter les events si le repo est sur le FS Windows (`/mnt/c/...`) — limitation documentée upstream. Mitigation : fallback polling en option (cf. Décisions D2).
- **Contrainte volume réseau** (SMB / NFS) : pareille limitation — events FS non propagés. Probablement hors scope MVP.

## Risques et points d'attention

> Selon la taxonomie [`risk-taxonomy.md`](../methodology/risk-taxonomy.md) (Sécurité, Performance/Reliability, Opérationnel, Intégration, Data, Compatibilité).

- **Performance/Reliability — Tempête d'events sur `git checkout` de branche** :
  *Impact* moyen (stutter UI, refresh excessif), *Probabilité* haute (cas usage très fréquent), *Mitigation* debounce 250 ms côté Go + flag « refresh global » qui agrège plusieurs paths en un seul event si > N en rafale.
- **Compatibilité — `fsnotify` peu fiable sur WSL/volume réseau** :
  *Impact* fort (la story devient sans valeur sur ces setups), *Probabilité* moyenne (subset utilisateurs), *Mitigation* spike pour évaluer la fréquence d'utilisation + fallback polling 2 s opt-in si nécessaire (Décision D2).
- **Reliability — Boucle self-write yukki-écrit / watcher-fire / refresh-trigger** :
  *Impact* fort (reset editState, perte saisie), *Probabilité* certaine sans protection, *Mitigation* `editLocks` set in-memory consulté par le watcher avant émission (cf. décision user Q1 option A).
- **Data — Conflit silencieux édition locale + écriture externe** :
  *Impact* fort (perte de modifs utilisateur), *Probabilité* faible (rare), *Mitigation* AC4 — comparaison mtime au load vs mtime disque pour déclencher le warning, choix utilisateur explicite reload/garder.
- **Opérationnel — Watcher zombie au crash de yukki** :
  *Impact* faible (le process exit nettoie les FDs OS), *Probabilité* faible, *Mitigation* defer cleanup dans `OnShutdown` + `os.Signal` handler ; `editLocks` étant en mémoire, naturellement reset.

## Cas limites identifiés

> Selon [`edge-cases.md`](../methodology/edge-cases.md) (BVA + EP + checklist 7 catégories).

- **Création + suppression rapides du même fichier** (touch + rm en < debounce) : le watcher doit émettre un event final cohérent (ou aucun). Tester avec un script qui fait `touch && rm` en boucle.
- **Renommage `.yukki/stories/UI-001.md` → `.yukki/stories/UI-001-renamed.md`** : `fsnotify` émet `RENAME` puis `CREATE`. Le frontend doit gérer l'item qui disparaît + apparait. Risque : si le SpddEditor tient le path original ouvert, AC3 doit s'appliquer (« cet artefact n'existe plus »).
- **Symlink dans `.yukki/`** : suivre ou ignorer ? Décision : ignorer pour MVP — ajouter au scope out canvas.
- **Fichier non-`.md` dans `.yukki/`** (ex. `.gitkeep`, `.DS_Store`) : filter sur extension `.md` côté watcher pour éviter le bruit.
- **Multi-projet : 5 projets ouverts × 100 fichiers chacun** : 5 watchers + 500 paths à surveiller. `fsnotify` sait gérer, mais attention à la limite `fs.inotify.max_user_watches` Linux (8 192 par défaut). Ajouter un check au démarrage si on dépasse → log warning.
- **Projet ouvert dont le `.yukki/` n'existe pas** (projet vide) : créer le dossier au démarrage du watcher OU watcher idle prêt à se réveiller à la création — choix d'archi à trancher (Décision D5).
- **Quitter yukki pendant qu'un event est en flight** : `OnShutdown` doit attendre les goroutines watcher (avec timeout), pas juste cancel + return.

## Décisions à prendre avant le canvas

- [ ] **D1 — Granularité du payload Wails** : path complet du fichier modifié (frontend cible le bon store) **OU** signal générique `refresh` qui force un `ListArtifacts` global (plus simple, moins efficace). Recommandation analyse : **path complet**, le frontend a besoin de discriminer pour AC3 (fichier ouvert supprimé) et AC4 (conflit sur edit en cours).
- [ ] **D2 — Fallback polling pour WSL/réseau** : livrer dès UI-023 ou attendre un retour utilisateur ? Recommandation analyse : **opt-in via setting** plus tard (UI-020 settings exists), pas dans le scope MVP.
- [ ] **D3 — Détection conflit AC4** : comparer **mtime** disque (simple, faux positif si même contenu réécrit) **OU** hash sha256 du contenu (plus juste, coût lecture disque). Recommandation analyse : **mtime** pour le MVP, hash en suivi si false-positives.
- [ ] **D4 — Délai de debounce** : 100 ms (réactif, risque stutter), 250 ms (sweet spot), 500 ms (latence visible). Recommandation analyse : **250 ms**, calibrable via constante.
- [ ] **D5 — `.yukki/` absent au démarrage du watcher** : le créer en silence OU watcher idle qui se réveille à la création parent. Recommandation analyse : **idle + création tardive** — ne pas modifier le projet à la simple ouverture (l'utilisateur pourrait l'avoir intentionnellement vide).

## Notes

Décisions user déjà tranchées en revue avant analyse (2026-05-10) :

- **Q1 — boucle self-write** → option A (lock implicite côté Go via `editLocks sync.Map`, pas d'action OS).
- **Watch multi-projet** → tous les projets ouverts en parallèle, pas seulement l'actif (overrride initial Scope Out).

Évaluation INVEST : la story reste borderline-Small (multi-modules + détection conflit), mais SPIDR Paths (a/b watcher base + b detection conflit) reste un fallback en place si le canvas révèle > 8 Operations. À arbitrer en `/yukki-reasons-canvas`.
