---
id: OPS-001
slug: debug-mode-logs-and-error-boundary
story: .yukki/stories/OPS-001-debug-mode-logs-and-error-boundary.md
status: reviewed
created: 2026-05-09
updated: 2026-05-09
---

# Analyse — Mode debug + logs persistants + error boundary

> Contexte stratégique pour la story
> `OPS-001-debug-mode-logs-and-error-boundary`. Produit par
> `/yukki-analysis` à partir d'un scan ciblé du codebase
> (`main.go`, `internal/clilog`, `internal/uiapp/app.go`,
> `internal/draft/store.go`, `frontend/src/main.tsx`,
> `frontend/src/components/hub/TitleBar.tsx`,
> `frontend/wailsjs/runtime/`). Toutes les Open Questions de la
> story ont été tranchées (cf. story `accepted` : logs dans
> `UserConfigDir/yukki/logs/`, rotation par jour gardant 7 jours,
> toggle persisté + badge orange « DEBUG ON », niveau par défaut
> WARN bascule DEBUG, format texte slog lisible).

## Mots-clés métier extraits

`ErrorBoundary` React, `slog` Go, `console.*` + `window.onerror`,
`UserConfigDir`, `panic recovery` Wails IPC, `toggle Mode debug`
persisté, `badge DEBUG ON`, `rotation par jour` (7 jours),
`format slog text`, `BrowserOpenURL` (ouvrir dossier logs).

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **`clilog.New()`** (Service Go) —
  `internal/clilog/clilog.go` : factory de `*slog.Logger` avec
  handler texte ou JSON, niveau configurable. Utilisée par
  `main.go` pour le CLI. Pattern à étendre vers une factory
  desktop qui écrit dans un fichier rotatif.
- **`App.logger`** (Integration point) —
  `internal/uiapp/app.go` : champ `*slog.Logger` injecté à la
  construction, déjà utilisé dans certains bindings
  (`OnStartup`, `InitializeYukki`, `UpdateArtifactStatus`,
  `UpdateArtifactPriority`). À enrichir pour couvrir tous les
  bindings.
- **`internal/draft/store.go`** (pattern de référence) — utilise
  `os.UserConfigDir() / "yukki" / "drafts"` ; modèle pour le
  futur store de settings et le dossier de logs.
- **`TitleBar`** (Entity) —
  `frontend/src/components/hub/TitleBar.tsx` : zone draggable +
  logo + FileMenu + boutons fenêtre. De l'espace disponible
  pour ajouter un badge orange « DEBUG ON » avant les boutons
  Min/Max/Close.

### Nouveaux (à introduire)

- **`internal/configdir`** (Service Go) — helper qui retourne
  `BaseDir() = filepath.Join(os.UserConfigDir(), "yukki")`,
  mutualisé entre draft, logs et settings. Évite la
  duplication du chemin dans 3 modules différents.
- **`internal/loginfra` ou extension de `clilog`** (Service
  Go) — factory desktop qui ouvre un fichier rotatif quotidien
  `<configDir>/yukki/logs/yukki-YYYY-MM-DD.log`, applique le
  format texte slog, supprime les fichiers > 7 jours au
  démarrage.
- **`internal/settings`** (Aggregate Go) — store mirror du
  `draft.DraftStore` qui lit / écrit
  `<configDir>/yukki/settings.json`. Champs initiaux :
  `debugMode bool`. Bindings Wails `SaveSettings(s) error` et
  `LoadSettings() (Settings, error)`.
- **`App.LogToBackend`** (Integration point Go) — nouveau
  binding qui accepte un payload structuré
  `{ level, source: "frontend", msg, stack }` depuis le
  frontend et l'écrit via `App.logger`. Permet d'unifier
  frontend + Go dans un seul fichier.
- **`Logger` frontend** (Service TS) —
  `frontend/src/lib/logger.ts` : façade avec méthodes `error /
  warn / info / debug` qui (1) écrivent en `console.*` pendant
  le dev, (2) appellent `App.LogToBackend` en production via
  les bindings Wails.
- **`ErrorBoundary`** (Entity React) —
  `frontend/src/components/hub/ErrorBoundary.tsx` : class
  component qui rattrape les exceptions de rendu, affiche un
  fallback (titre, message, stack dépliable, boutons Copier /
  Ouvrir logs / Recharger), envoie l'erreur via le logger
  frontend.
- **Listeners globaux frontend** —
  `window.addEventListener('error')` et
  `window.addEventListener('unhandledrejection')` dans
  `frontend/src/main.tsx`, pour capturer les erreurs hors
  React.
- **`useSettingsStore`** (Service Zustand) —
  `frontend/src/stores/settings.ts` : store hydraté au
  démarrage via `LoadSettings`, persisté via `SaveSettings`
  à chaque mutation. Source de vérité pour `debugMode`.
- **Badge « DEBUG ON »** — composant visuel inline dans
  `TitleBar.tsx`, conditionné sur `useSettingsStore(s =>
  s.debugMode)`.

### Invariants

- **I1 — Logs jamais perdus pour rien** : si l'écriture
  fichier échoue (permissions, disque plein), l'app retombe
  sur la `console` standard et ne crashe pas (cf. AC4 story).
- **I2 — Toggle ne change pas l'emplacement** : activer le
  mode debug change le **seuil** (WARN → DEBUG) mais pas le
  chemin du fichier. Un seul fichier par jour, peu importe
  le mode.
- **I3 — ErrorBoundary survit à ses propres erreurs** : si
  l'affichage du fallback plante (lib UI cassée), l'app ne
  doit pas boucler. Mitigation : fallback en HTML brut sans
  composant React complexe.
- **I4 — Source clairement identifiée** : chaque entrée de
  log porte un champ `source = "frontend"` ou `"go"` pour
  qu'on retrouve l'origine d'un message en un coup d'œil.
- **I5 — Confidentialité best-effort** : les logs peuvent
  contenir des paths utilisateur (chemins de projet) — c'est
  attendu pour le diagnostic, signalé dans le scope-out story.

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *l'écran gris à chaque crash frontend + l'absence
totale de trace exploitable une fois la fenêtre fermée*, **on
choisit** *d'étendre l'infra slog Go existante (`clilog`) vers
un handler fichier rotatif quotidien dans `<configDir>/yukki/logs/`,
de centraliser les logs frontend via une façade `logger.ts` qui
appelle un nouveau binding `LogToBackend`, et d'ajouter une
`ErrorBoundary` globale au shell React qui rattrape les exceptions
de rendu et affiche un panneau d'erreur lisible*, **plutôt que**
*(B) intégrer Sentry ou OpenTelemetry (envoi réseau, complexité
opérationnelle, posture privacy à clarifier), (C) logguer
uniquement côté frontend dans `localStorage` ou IndexedDB (perd
les events Go, accès difficile à l'utilisateur), (D) garder les
`console.*` en l'état et ajouter juste un fichier Go (perd la
moitié de la traçabilité quand le bug est frontend)*, **pour
atteindre** *un seul fichier de log consultable contenant les
events frontend + Go en format texte slog grep-able, et un
crash frontend qui se transforme en panneau d'erreur lisible
avec un bouton « Ouvrir les logs »*, **en acceptant** *la
création de cinq nouveaux modules (helper `configdir`, store
`settings` Go + frontend, `loginfra` desktop, façade `logger`
frontend, `ErrorBoundary` React) — et un couplage temporel
avec UI-020 (Settings page) que cette story doit dénouer en
livrant un toggle minimal réutilisé plus tard.*

### Alternatives écartées

- **B — Sentry / OpenTelemetry** : surdimensionné pour une
  alpha mono-utilisateur sans backend ; pose des questions
  de privacy non résolues.
- **C — Logging frontend seul** (`localStorage`, IndexedDB) :
  perd les events Go (la moitié de la pile), accès utilisateur
  via devtools uniquement.
- **D — Pas d'unification frontend / Go** : laisser
  `console.*` en l'état et n'écrire que côté Go. Ne couvre
  pas le scénario crash frontend qui est l'origine du
  problème (écran gris).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/clilog/clilog.go` | faible | modify : ajouter une factory `NewDesktop(cfgDir, debugMode)` qui ouvre le fichier rotatif et applique le format texte slog |
| `internal/configdir/configdir.go` | moyen | **create** : helper `BaseDir()` mutualisé draft / logs / settings |
| `internal/settings/settings.go` + tests | moyen | **create** : store mirror du draft store, lecture/écriture `settings.json` |
| `internal/uiapp/app.go` | moyen | modify : enrichir les loggings dans bindings + ajouter `LogToBackend(payload)` |
| `internal/uiapp/settings.go` | moyen | **create** : bindings Wails `SaveSettings` / `LoadSettings` qui appellent `internal/settings` |
| `main.go` (racine) | faible | modify : sous-commande `ui` initialise la factory desktop avec le file handler |
| `frontend/src/lib/logger.ts` | moyen | **create** : façade `error / warn / info / debug` qui appelle `LogToBackend` |
| `frontend/src/components/hub/ErrorBoundary.tsx` | **fort** | **create** : class component avec fallback UI + boutons |
| `frontend/src/main.tsx` ou `App.tsx` | faible | modify : monter `ErrorBoundary`, ajouter listeners `window.onerror` + `unhandledrejection` |
| `frontend/src/stores/settings.ts` | moyen | **create** : Zustand store hydraté via `LoadSettings` |
| `frontend/src/components/hub/TitleBar.tsx` | faible | modify : badge orange « DEBUG ON » conditionnel sur `useSettingsStore` |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | faible | modify : exposer `SaveSettings`, `LoadSettings`, `LogToBackend` (workaround AV `-skipbindings`) |
| `frontend/wailsjs/runtime/runtime.{d.ts,js}` | faible | modify : exposer `BrowserOpenURL` (déjà identifié comme manquant par UI-021) |

## Dépendances et intégrations

- **`slog`** Go (standard library, déjà utilisé par `clilog`).
- **Pas de nouvelle dépendance npm** — la façade `logger.ts`
  est maison, l'`ErrorBoundary` est une simple class component.
- **Wails runtime `BrowserOpenURL`** — déjà built-in côté Wails,
  à exposer dans le stub local (cohérent avec UI-021).
- **`internal/draft`** — modèle de référence pour le futur
  `internal/settings` (même pattern fichier JSON, même chemin
  parent `<configDir>/yukki/`).
- **Couplage UI-020** : le toggle Mode debug a besoin d'une
  surface UI. La story OPS-001 livre un emplacement minimal
  (par exemple bouton dans le FileMenu ou raccourci) que la
  page Settings UI-020 reprendra et enrichira plus tard.
- **Couplage UI-021** : les deux stories ont besoin du stub
  Wails `BrowserOpenURL`. L'une des deux le livre, l'autre
  consomme. À arbitrer côté ordonnancement.

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Sécurité — données dans les logs** : un log peut contenir
  un path utilisateur (`C:\Users\...`), un nom de projet, un
  contenu d'artefact partiellement loggé. *Impact* : moyen
  (l'utilisateur partage potentiellement plus qu'il ne pense
  dans un signalement). *Probabilité* : haute en cas de
  partage. *Mitigation* : message dans le panneau d'erreur
  avant le copier / partage qui rappelle à l'utilisateur de
  relire avant d'envoyer.

- **Performance — écriture synchrone** : un log écrit à chaque
  binding Wails peut ajouter de la latence si le disque est
  lent. *Impact* : moyen. *Probabilité* : moyenne (écritures
  fréquentes). *Mitigation* : `bufio.NewWriter` + flush
  périodique (par exemple toutes les secondes ou à chaque
  ERROR), close propre dans `OnShutdown`.

- **Opérationnel — dossier inaccessible** : permissions,
  disque plein, AV qui bloque l'écriture dans `%APPDATA%`.
  *Impact* : feature non fonctionnelle. *Probabilité* : faible
  mais réelle. *Mitigation* : couverte par AC4 story (toast +
  fallback console).

- **Compatibilité — bascule de jour à minuit** : si le
  programme tourne au passage 23:59 → 00:00, le writer ouvert
  pointe sur le fichier de la veille jusqu'à recréation.
  *Impact* : 1 jour de logs mal classés. *Probabilité* :
  faible (nécessite une session > 24 h). *Mitigation* :
  re-évaluer le path au début de chaque écriture ou monter un
  watcher daté qui rotate à minuit.

- **Intégration — ErrorBoundary cassée** : si la lib qui
  affiche le fallback plante elle-même (par exemple shadcn
  Dialog avec un bug), on peut entrer en boucle. *Impact* :
  haut (l'app reste cassée). *Probabilité* : faible.
  *Mitigation* : fallback UI en HTML brut sans dépendance React
  complexe (juste `<div>` avec `style` inline).

## Cas limites identifiés

> Détectés via BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Première écriture du jour** : le fichier
  `yukki-YYYY-MM-DD.log` n'existe pas encore → création
  automatique avec permissions standard.
- **Bascule de jour pendant la session** (minuit) : le writer
  doit rotate proprement vers le nouveau fichier sans perdre
  un event ni dupliquer une entrée.
- **Mode debug activé pendant l'exécution** : le seuil bascule
  WARN → DEBUG sans recréer le fichier ni interrompre les
  writes en cours.
- **Crash très tôt** (avant init du logger) : log perdu, mais
  le panic recovery Go produit au moins une trace dans
  `stderr` du process.
- **Plus de 7 fichiers présents au démarrage** : suppression
  des fichiers > 7 jours par âge (mtime), pas par décompte
  (un utilisateur qui n'a pas ouvert l'app pendant un mois
  ne perd pas tout).
- **L'utilisateur supprime manuellement un fichier de log
  pendant la session** : le writer renvoie une erreur lors
  du prochain flush, l'app retombe sur la console.

## Decisions à prendre avant le canvas

> Les 5 OQ de la story sont tranchées. Toutes les décisions
> résiduelles soulevées par l'analyse ont été tranchées en
> revue (cf. tableau ci-dessous), l'analyse passe en `reviewed`.

- [x] ~~**Scission SPIDR**~~ → **résolu 2026-05-09** :
      OPS-001 reste **monolithique**. Les 3 axes (ErrorBoundary,
      logs persistants, toggle debug) partagent l'infra
      (`configdir` helper, `settings` store, façade `logger`) ;
      les scinder créerait 3 PRs avec couplage temporel fort
      sans bénéfice de livraison incrémentale réelle.
      L'estimation 2-3j tient en une story.
- [x] ~~**Couplage avec UI-020 (Settings page)**~~ → **résolu
      2026-05-09** : OPS-001 livre un toggle minimal sous deux
      formes complémentaires : (1) item « Activer le mode debug »
      dans le `FileMenu` existant, (2) raccourci clavier
      `Ctrl+Shift+D`. Le badge orange « DEBUG ON » dans
      `TitleBar` confirme l'état. UI-020 reprendra plus tard
      l'action dans une section Settings dédiée sans casser le
      contrat (mêmes bindings `LoadSettings`/`SaveSettings`).
- [x] ~~**Helper `internal/configdir` mutualisé**~~ → **résolu
      2026-05-09** : créer **maintenant** `internal/configdir/configdir.go`
      avec `BaseDir() string`, et **migrer `internal/draft`** dans
      la même story pour qu'il consomme le helper. Coût trivial
      (1 fichier + 1 fonction + 1 import + 1 substitution dans
      draft) ; évite la dette de 3 endroits qui calculent le
      même chemin.
- [x] ~~**`LogToBackend` — granularité du binding**~~ → **résolu
      2026-05-09** : **un seul binding générique**
      `LogToBackend(payload struct{ Level, Source, Msg, Stack string }) error`.
      Le frontend choisit le niveau dans le payload. La façade
      `frontend/src/lib/logger.ts` expose `error / warn / info /
      debug` qui appellent toutes `LogToBackend` avec le bon niveau.
      Évite la duplication du transport et reste flexible si on
      ajoute un niveau plus tard.
- [x] ~~**Bascule de jour à minuit**~~ → **résolu 2026-05-09** :
      **re-évaluer le chemin à chaque écriture** (`today :=
      time.Now().Format("2006-01-02")` au début de chaque appel,
      rouvrir le writer si différent). Simple, pas de goroutine
      ni timer, naturellement robuste à un changement d'horloge
      système. Overhead négligeable face à l'écriture disque.
- [x] ~~**Stub `BrowserOpenURL`**~~ → **obsolète 2026-05-09** :
      déjà livré par UI-021 (#27). OPS-001 consomme directement
      `wailsjs/runtime/runtime.{d.ts,js}`.
