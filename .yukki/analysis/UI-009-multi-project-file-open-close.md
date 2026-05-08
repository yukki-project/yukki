---
id: UI-009
slug: multi-project-file-open-close
story: .yukki/stories/UI-009-multi-project-file-open-close.md
status: synced
created: 2026-05-06
updated: 2026-05-08
---

# Analyse — Multi-projet (File menu + tabs)

> Contexte stratégique pour `UI-009-multi-project-file-open-close`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du code Go +
> frontend (beaucoup déjà connu de META-004 / META-005 / UI-007).
> Ne duplique ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`File menu` (Open / Close / Recent) · `Tab bar projets` (style
VSCode files, 1 tab = 1 projet) · `Project switcher` (Ctrl+Tab,
Ctrl+1-9, Ctrl+W, Ctrl+O) · `Registre projects.json` (XDG-style) ·
`Persistance entre sessions` · `App.SelectProject` (binding
existant) · `state per-project` (loader / writer / projectDir) ·
`titlebar custom` (UI-007) · `empty state` · `OpenedProject`
(nouveau type).

## Concepts de domaine

> Modélisation au sens [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **App state mono-projet (Entity)** — `App` Go ([internal/uiapp/app.go:78-103](../../internal/uiapp/app.go#L78-L103))
  porte aujourd'hui un seul triplet `(projectDir, loader, writer)`.
  Toute la chaîne (binding `ListArtifacts`, `ReadArtifact`, `RunStory`)
  consomme `a.projectDir`. **Refactor central** de cette story = passer
  d'un mono-state à un multi-state indexé.

- **`App.SelectProject()` (binding)** — [app.go:147-165](../../internal/uiapp/app.go#L147)
  ouvre un dialog OS et set `projectDir/loader/writer`. Doit évoluer
  pour soit (a) **ajouter** à la liste de projets ouverts, (b) renommer
  en `OpenProject` (signature claire), ou (c) garder comme alias rétro-
  compat.

- **`InitializeYukki(dir)` (binding)** — [app.go:212](../../internal/uiapp/app.go#L212)
  crée l'arbo `.yukki/{...}/`. Reste utilisé par le bouton "Initialize"
  quand un dossier sans `.yukki/` est sélectionné (cf. AC5 de la story).

- **`Invariant I1` (path-isolation, Tampering)** — [app.go:265-279](../../internal/uiapp/app.go#L265)
  `ReadArtifact` refuse les paths hors `<projectDir>/.yukki/`. Avec N
  projets, **doit accepter les paths de N préfixes** : refactor du
  check pour itérer sur les `OpenedProject.path`.

- **Frontend `ProjectPicker.tsx`** — [frontend/src/components/hub/ProjectPicker.tsx](../../frontend/src/components/hub/ProjectPicker.tsx)
  composant initial du flow de sélection. Garde son rôle pour le
  premier projet (empty state) ; complété par le menu File / la tab bar
  pour les ouvertures suivantes.

- **Frontend store `useShellStore`** — [frontend/src/stores/shell.ts](../../frontend/src/stores/shell.ts)
  state actuel (activeMode, sidebarOpen). À étendre OU à coller à un
  nouveau store dédié `useTabsStore` (projets ouverts + tab actif).

- **Frontend `TitleBar`** (UI-007) — emplacement où vit le custom
  titlebar (frameless dark). C'est le candidat naturel pour héberger
  le **File menu** (à gauche) et la **tab bar** (juste sous, avant
  l'activity bar).

### Nouveaux (à introduire)

- **`OpenedProject` (Entity)** — Nouveau type Go modélisant un projet
  ouvert : `path string` (absolu, canonique), `name string` (dérivé
  de `filepath.Base`), `lastOpened time.Time`, `loader *templates.Loader`,
  `writer *artifacts.Writer`. Vit dans `internal/uiapp/`. Match côté
  TS via type généré Wails.

- **`ProjectsRegistry` (Value Object)** — Persisté sur disque dans
  `<userConfigDir>/yukki/projects.json` (XDG-compliant via
  `os.UserConfigDir()`). Structure :
  ```json
  {
    "version": 1,
    "active_index": 0,
    "opened_projects": [
      {"path": "/c/workspace/yukki", "name": "yukki", "last_opened": "2026-05-06T..."}
    ],
    "recent_projects": [
      {"path": "/d/work/old-project", "last_opened": "2026-04-30T..."}
    ]
  }
  ```

- **Multi-state App (Entity évoluée)** — Le `App` Go porte désormais
  `openedProjects []*OpenedProject` (slice ordonnée pour l'ordre des
  tabs) + `activeIndex int`. Les bindings (`ListArtifacts`,
  `ReadArtifact`, etc.) opèrent sur le projet actif courant. Méthodes
  nouvelles : `OpenProject(path)`, `CloseProject(idx)`, `SwitchProject(idx)`,
  `ListOpenedProjects() []ProjectMeta`, `ReorderProjects([]int)`.

- **`useTabsStore` (frontend)** — Store Zustand dédié à l'état des
  tabs (mirror du backend) + persistance hydratée depuis `App.LoadRegistry()`
  au démarrage.

- **`TabBar.tsx` (composant)** — Composant UI sous le titlebar :
  rendu des tabs (nom court + dot modifié + bouton ✕), bouton `+`
  d'ouverture, drag-drop horizontal pour réordonner.

- **`FileMenu.tsx` (composant)** — Menu déroulant intégré au
  titlebar avec entries Open / Close / Recent / Initialize. Géré
  via `useTabsStore.actions`.

- **Keyboard shortcuts (Domain Event)** — Captés via `useEffect` +
  `keydown` listener au niveau `App.tsx`. Routent vers
  `useTabsStore.actions` (`openProject` / `closeProject` /
  `switchToTab(n)`).

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** la limitation "1 projet à la fois" qui force
l'utilisateur à fermer-relancer-rebasculer entre repos, **on choisit**
de **refactorer le state `App` Go en multi-projet indexé** (slice
`openedProjects` + `activeIndex`) et **d'introduire une tab bar
frontend style VSCode** pilotée par un nouveau store Zustand
`useTabsStore` synchronisé avec le backend, **plutôt que** :
- multi-window (1 fenêtre = 1 projet) qui demanderait Wails multi-
  window non-trivial à orchestrer + chrome desktop dupliqué,
- ou wrapper externe (script qui lance N instances yukki) qui ne
  partage pas le state, ne persiste pas l'ordre, et casse l'UX,
**pour atteindre** une UX naturelle (familier VSCode users), une
persistance native entre sessions, et une foundation propre pour les
phases ultérieures (alerting cross-projet INBOX-017 phase 3, daily
digest phase 4), **en acceptant** un refactor central de `App` qui
touche tous les bindings consommant `projectDir` (~10 sites).

### Alternatives considérées

- **Multi-window Wails** — Rejetée : Wails 2.x supporte multi-window
  mais avec une lourdeur de coordination (chaque fenêtre est un Wails
  "app" séparé). Pas compatible avec un titlebar custom unifié, ni
  avec un menu File partagé.
- **Wrapper externe (multi-instance)** — Rejetée : pas de state
  partagé, pas de persistance d'ordre, double l'utilisation RAM, UX
  fragmentée (chaque instance = sa propre fenêtre OS).
- **Mono-projet + commande "switch project" rapide** — Rejetée :
  garde la friction du fermer-rouvrir, ne capitalise pas sur
  l'investissement UI déjà fait.
- **Re-utiliser `SelectProject` sans renommer (alias)** — Acceptable
  mais on perd la sémantique claire "Open" vs "Select". Reco
  analyse : **renommer en `OpenProject`** (et garder `SelectProject`
  comme deprecated alias 1 release pour migration douce du frontend).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp` (app.go) | **fort** | refactor `App` mono-state → multi-state, ~10 sites consommant `projectDir` à updater, `ReadArtifact` Invariant I1 itère sur N préfixes |
| `internal/uiapp` (registry.go nouveau) | **fort** | nouveau fichier — load/save `projects.json` XDG |
| `internal/uiapp` (app_test.go) | **moyen** | tests existants à adapter (multi-state), nouveaux tests `TestApp_OpenProject_*`, `TestApp_CloseProject_*`, `TestApp_PersistRegistry_*` |
| `frontend/src/stores` (tabs.ts nouveau) | **fort** | nouveau store Zustand `useTabsStore` |
| `frontend/src/stores/shell.ts` | **faible** | léger ajustement si activeMode dépend du projet courant |
| `frontend/src/components/hub/ProjectPicker.tsx` | **moyen** | adaptation pour gérer le cas "ouverture additionnelle" vs "premier projet" |
| `frontend/src/components/titlebar/` (UI-007) | **fort** | ajout `FileMenu.tsx` + `TabBar.tsx` |
| Wails bindings (`frontend/wailsjs/go/main/App.d.ts`) | **moyen** | régénération auto + ajustement des stubs hand-written |
| `.yukki/templates/` | aucun | pas de nouveau template SPDD |

## Dépendances et intégrations

- **Wails 2.x EventsEmit** — quand un projet est ouvert/fermé, le
  backend doit émettre un event ("project:opened", "project:closed")
  pour que le frontend se synchronise. Cohérent avec le pattern
  utilisé par UI-001c (events de progression `RunStory`).
- **`os.UserConfigDir()`** — fonction stdlib Go qui retourne
  `%APPDATA%\yukki\` (Windows), `~/.config/yukki/` (Linux),
  `~/Library/Application Support/yukki/` (macOS). Pas de dépendance
  externe.
- **Zustand persist middleware** — déjà utilisé dans `useShellStore`
  ([shell.ts:21](../../frontend/src/stores/shell.ts#L21)). Réutilisable
  pour le miroir frontend du registre.
- **Lucide-react icons** — `FilePlus`, `X`, `Folder`, `MoreHorizontal`
  pour le File menu et la tab bar. Déjà disponible.
- **Aucune lib externe nouvelle** — tout faisable avec Wails 2.x +
  React + Zustand existants.

## Risques et points d'attention

> Catégories selon [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Sécurité — Invariant I1 (Tampering, path-isolation)** — Le check
  actuel `strings.HasPrefix(absPath, prefix)` (app.go:277) doit être
  étendu pour itérer sur les N projets ouverts (`hasPrefixAny(absPath,
  registry.allProjectPaths())`). Si l'itération est mal écrite, on
  peut accidentellement (a) accepter un path hors de tous les projets
  (faux positif), ou (b) refuser un path légitime (faux négatif).
  *Impact : élevé* (path traversal). *Probabilité : moyenne* (refactor
  d'un check critique). *Mitigation* : test exhaustif
  `TestReadArtifact_PathTraversal_MultiProject` qui vérifie acceptance
  par projet et refus hors registry.

- **Opérationnel — Refactor central de `App`** — `App` est consommé
  par 7+ bindings Wails (`ListArtifacts`, `ReadArtifact`, `RunStory`,
  `SelectProject`, `InitializeYukki`, `GetClaudeStatus`, etc.). Tout
  passage à multi-state demande de mettre à jour la signature ou la
  sémantique de chaque binding. *Impact : moyen* (régression
  potentielle UI-001b/c). *Probabilité : moyenne*. *Mitigation* :
  conserver les bindings existants comme **wrappers** sur le projet
  actif courant (signature inchangée), n'introduire les nouveaux
  bindings (`OpenProject`, `CloseProject`, `SwitchProject`,
  `ListOpenedProjects`) que comme additifs.

- **Compatibilité — Persistance breaking** — Si le format
  `projects.json` évolue après v1, un upgrade peut casser les sessions
  des early users. *Impact : faible* (UX dégradée, easy fix). *Probabilité :
  moyenne* (early product). *Mitigation* : champ `"version": 1` dans
  le JSON + migration gracieuse au load (si version inconnue, ignore
  fichier + log + démarre vide).

- **Data — Path canonicalisation** — Un même projet ouvert via deux
  chemins différents (absolu vs relatif, casse différente sur
  Windows, symlink) doit être détecté pour ne pas dupliquer un tab.
  *Impact : moyen* (UX confuse + double watcher futur). *Probabilité :
  élevée* (Windows mixte casse). *Mitigation* : `filepath.Abs() +
  filepath.Clean() + EvalSymlinks() + sur Windows ToLower() pour la
  comparaison`. Tests dédiés.

- **Performance — Mémoire N × loader/writer** — Chaque projet ouvert
  a son `templates.Loader` (~minimal) + `artifacts.Writer` (~minimal)
  + son cache d'artefacts à venir. Pour N=10 projets, négligeable.
  Au-delà (50+), pourrait scaler. *Impact : faible*. *Probabilité :
  faible* (cap N raisonnable). *Mitigation* : limite configurable
  (`max_opened_projects: 20` par défaut, override par l'utilisateur
  averti).

## Cas limites identifiés

> Selon [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Projet supprimé hors yukki entre deux sessions** — Couvert par
  AC6 de la story. Au load du registry, `os.Stat(path)` doit être
  fait pour chaque projet ; en cas d'absence, le projet est retiré
  silencieusement avec un message info dans le log + une notif UI
  ("X a été supprimé, retiré de la session").

- **Même projet ouvert deux fois** — Cliquer "Open Project" sur un
  dossier déjà ouvert ne doit PAS créer un second tab : le tab
  existant doit être activé. Path canonicalisation requise (cf.
  Risque Data ci-dessus).

- **Dossier sans `.yukki/`** — Couvert par AC5. Dialog `Initialize ?`
  / `Cancel` ; si Initialize → `App.InitializeYukki(path)` puis ajout
  comme nouveau projet ouvert.

- **Registry corrompu** (JSON invalide) — Au load, parse error doit
  être catché silencieusement, fichier sauvegardé en `.broken.bak`,
  registry initial vide. yukki ne crashe pas. Test
  `TestRegistry_LoadCorrupted_StartsEmpty`.

- **Concurrent open/close** — UI peut déclencher rapidement plusieurs
  `OpenProject` ou `CloseProject` (clics rapides, raccourcis). Le
  state Go doit être protégé par un mutex ou opérer via canaux pour
  garantir l'ordre. *Mitigation* : lock simple `sync.RWMutex` dans
  `App`, ou serialization via channel (à choisir au canvas).

- **Empty state au démarrage** — Premier lancement (registry vide)
  ou tous les tabs fermés (`Ctrl+W` itéré jusqu'à 0) → vue welcome
  (cf. OQ Empty state).

## Décisions à prendre avant le canvas

- [ ] **Nom du binding Go principal** : `OpenProject` (clean rename)
  vs `SelectProject` (rétro-compat). *Reco analyse* : introduire
  `OpenProject` (nouveau, sémantique claire) ET garder `SelectProject`
  comme deprecated alias qui appelle `OpenProject`. À retirer dans
  une release ultérieure.

- [ ] **Limite max projets simultanés** — cap dur (ex. 20) avec
  message si dépassé, ou illimité avec dégradation graceful ?
  *Reco analyse* : cap soft 20 par défaut + config override
  `.yukki/config.yaml` ou variable d'env (`YUKKI_MAX_PROJECTS`). Le
  cockpit affiche un warning à 15+.

- [ ] **Position de la tab bar** — entre titlebar et activity bar
  (style VSCode files), OU intégrée dans le titlebar custom (UI-007) ?
  *Reco analyse* : **sous le titlebar, au-dessus de l'activity bar**
  (séparation visuelle nette : titlebar = chrome OS, tabs = projets,
  activity bar = mode SPDD intra-projet).

- [ ] **Stratégie de canonicalisation des paths** — Sur Windows
  (case-insensitive), faut-il `ToLower()` pour comparaison OU
  utiliser une comparaison case-insensitive plus malin (paths.Equal
  custom) ? *Reco analyse* : utiliser
  `filepath.EvalSymlinks() + filepath.Clean() + filepath.Abs()` ;
  pour Windows, comparer via `strings.EqualFold` (gère
  case-insensitive sans muter le path stocké).
