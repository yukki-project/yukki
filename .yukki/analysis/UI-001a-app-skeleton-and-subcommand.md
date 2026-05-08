---
id: UI-001a
slug: app-skeleton-and-subcommand
story: .yukki/stories/UI-001a-app-skeleton-and-subcommand.md
parent-analysis: .yukki/analysis/UI-001-init-desktop-app-wails-react.md
status: synced
created: 2026-05-01
updated: 2026-05-08
---

# Analyse — UI-001a (delta) — App skeleton & sub-cmd `yukki ui`

> **Analyse de delta** — la stratégie globale, les modules, les 16
> décisions structurantes, les 10 risques et les 11 cas limites de la
> famille UI-001 sont dans
> [`.yukki/analysis/UI-001-init-desktop-app-wails-react.md`](UI-001-init-desktop-app-wails-react.md).
> Ce document ne couvre que les choix **spécifiques à UI-001a** (skeleton)
> qui n'ont pas leur place dans une analyse de famille parce qu'ils
> n'engagent pas UI-001b ni UI-001c.

## Mots-clés métier extraits (delta UI-001a)

`scaffold`, `wails.json`, `wails build`, `wails dev`, `Greet`,
`build tag mock`, `webkit2gtk`, `Webview2`, `package.json`, `Vite HMR`.

(Les mots-clés génériques `Wails`, `bindings`, `Cobra`, `EventsEmit`,
`OpenDirectoryDialog`, `MockProvider` sont déjà couverts par la
famille.)

## Concepts existants exploités par UI-001a

- **`cmd/yukki/main.go`** : `newRootCmd()` + `newStoryCmd()`. UI-001a
  ajoute `newUICmd()` à la racine via `root.AddCommand(newUICmd())`.
  Aucune modification du root cmd lui-même.
- **`internal/clilog.New(format, verbose)`** : réutilisé tel quel par
  l'`App` Wails pour journaliser sur stderr.
- **`provider.Provider` interface (NewClaude / MockProvider)** :
  l'injection est posée par UI-001a (build tags `mock`/!`mock`)
  même si UI-001a n'appelle pas `Generate`. Permet d'amortir la
  plomberie de DI dès la skeleton.
- **`tests/e2e/`** : les tests E2E existants doivent continuer à
  passer (AC4 de la story). Aucune modif de leur côté.

## Concepts nouveaux UI-001a-spécifiques

- **`internal/uiapp.App.Greet()`** — méthode bindée smoke test :
  retourne `"hello from yukki backend"`. **Volatile** : sera
  potentiellement retirée par UI-001b une fois remplacée par
  `SelectProject`/`ListStories`. Peut rester en V1 comme test de santé
  manuel via un menu "About → Run smoke test".
- **`wails.json` racine** — fichier de config Wails avec les hooks
  build/dev/dist pointant vers `frontend/`.
- **Layout `frontend/`** :
  ```
  frontend/
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  ├── tailwind.config.js
  ├── postcss.config.js
  ├── components.json          (config shadcn/ui)
  ├── index.html
  ├── src/
  │   ├── main.tsx
  │   ├── App.tsx              (placeholder UI-001a)
  │   ├── components/
  │   │   └── ui/              (shadcn primitives : button, card)
  │   ├── lib/
  │   │   └── utils.ts         (cn() de shadcn)
  │   └── styles/
  │       └── globals.css      (Tailwind directives + shadcn theme)
  └── wailsjs/                 (auto-généré, gitignored)
  ```
- **Build tags `mock` / défaut prod** dans `cmd/yukki/` :
  - `ui_mock.go` (`//go:build mock`) : `func newProvider(...) provider.Provider { return &provider.MockProvider{...} }`
  - `ui_prod.go` (`//go:build !mock`) : `func newProvider(...) provider.Provider { return provider.NewClaude(...) }`
  - Tests : un fichier de test guardé `//go:build mock` qui assert le
    type concret retourné.

## Approche stratégique (delta UI-001a)

1. **`yukki ui` est cosmétique en UI-001a** : la sous-cmd câble Wails,
   ouvre une fenêtre, mais ne fournit aucune feature utilisateur. C'est
   intentionnel — on minimise la surface pour valider scaffold + CI sans
   bruit de logique métier.
2. **Le smoke test `Greet()` est volontairement minimaliste** : il
   prouve que les 3 ponts critiques fonctionnent (Cobra → Wails Run →
   Frontend → Binding Go round-trip → réponse rendue). Si on casse l'un
   des 4, AC2 plante visiblement.
3. **Frontend = projet Vite isolé** : `frontend/` a son propre
   `package.json` et son propre `tsconfig.json`. Pas de monorepo
   complexe (lerna/nx/turborepo). Wails s'en moque, il appelle juste
   `npm run build` et embed le `dist/` final.
4. **CI : un seul job `ui-build`** matrix 3 OS, dépendant de
   `static-checks`. Pas de tests UI front (différé). Le job échoue si
   `wails build -platform <os>` retourne non-zéro.
5. **Pas d'ESLint / Prettier en UI-001a** : différé. Vite + TS strict
   mode suffisent à attraper les bugs syntaxiques. ESLint/Prettier =
   future story polish (UI-001x).

## Modules impactés (delta UI-001a)

> Voir analyse de famille pour les impacts globaux ; ce delta liste
> uniquement ce que **UI-001a** touche (vs ce que UI-001b/c laisseront
> pour plus tard).

| Module | Impact UI-001a | Note |
|---|---|---|
| `cmd/yukki` | moyen | nouveau `ui.go` + 2 fichiers build-tagged `ui_mock.go`/`ui_prod.go` |
| `internal/uiapp` | moyen | création `App` minimaliste + `Greet()` ; **pas** encore de `SelectProject`/`ListStories`/`RunStory` (c'est b/c) |
| `frontend/` | **fort** | création complète du projet Vite ; placeholder content |
| `go.mod` / `go.sum` | moyen | + `github.com/wailsapp/wails/v2` (~15-20 transitives) |
| `wails.json` | nouveau | config build/dev hooks |
| `.github/workflows/ci.yml` | moyen | nouveau job `ui-build` matrix |
| `.gitignore` | faible | `frontend/node_modules/`, `frontend/dist/`, `frontend/wailsjs/`, `build/bin/` |
| `DEVELOPMENT.md` | faible | section *"Dev de l'UI"* — `wails dev`, `wails build`, prereqs (Node 20+, Wails CLI, libwebkit2gtk-4.0-dev) |

## Dépendances et intégrations (delta)

- **Backend Go nouveau** : `github.com/wailsapp/wails/v2` (la version
  exacte est en OQ3 de la story — voir D-A1 ci-dessous).
- **Frontend nouveau** : `react@18`, `react-dom@18`, `typescript@5`,
  `vite@5`, `tailwindcss@3`, `zustand@4`, `clsx`, `tailwind-merge`,
  `lucide-react` (icônes), shadcn/ui via init-CLI (copy-paste de
  `button` + `card`).
- **Pas de dépendance** vers React Flow, react-markdown, fsnotify,
  `wailsjs/runtime` features (events) — tout ça vient en UI-001b/c.

## Risques spécifiques UI-001a

- **Pin Wails v2 instable** *(prob. moyenne, impact moyen)*. Wails évolue
  vite (v2.5 → v2.10 sur 2024-2026). **Mitigation** : pin sur la dernière
  v2 stable connue avec changelog vérifié, dependabot pour les patches.
  D-A1 ci-dessous.
- **Layout `frontend/` redondant avec un futur monorepo** *(prob.
  faible, impact faible)*. Si on un jour split en sous-paquets,
  on devra bouger `frontend/`. **Mitigation** : c'est un coût de
  refactor acceptable, pas de prévention en V1.
- **Smoke test `Greet()` qui devient mort en V1.5** *(prob. haute,
  impact faible)*. Une fois UI-001b livre `SelectProject`/`ListStories`,
  `Greet` n'est plus exercé par l'UI principale. **Mitigation** :
  le garder dans un menu *About → Smoke test* ou le supprimer en
  UI-001b. Décision tranchée plus tard.
- **CI cache miss sur premier run** *(prob. haute, impact faible)*.
  Le premier run UI-001a sur main n'aura pas de cache → ~5-8 min de
  CI. **Mitigation** : acceptable une fois.
- **Air-gap / firewall corporate empêchant `npm install`** *(prob.
  faible, impact moyen)*. Pas de mitigation en V1 (on assume internet
  dispo en CI GitHub Actions).
- **Vite port collision (`5173` par défaut)** *(prob. faible, impact
  faible)*. `wails dev` lance Vite ; si le port est pris localement,
  ça plante. **Mitigation** : Vite tente le port suivant
  automatiquement, OK.

## Cas limites UI-001a

- **`yukki ui` dans un terminal sans display server (SSH headless)** :
  Wails échoue à créer la fenêtre. Doit retourner une erreur claire
  (pas un silent crash). À tester manuellement.
- **`wails build` sur runner avec espace disque limité** : `frontend/dist/`
  + binaire intermédiaire peuvent dépasser 500 MB transitoires. Acceptable
  sur GitHub Actions (14 GB), à surveiller pour les self-hosted runners.
- **Bouton *Greet* cliqué N fois rapidement** : N appels concurrents à
  `App.Greet()`. Doit fonctionner sans race (la méthode est stateless,
  OK).
- **`yukki ui --verbose` ou autres flags** : Cobra passe les flags
  globaux, mais Wails ne les voit pas. **Reco** : la sous-cmd `ui`
  hérite des flags `--verbose` / `--log-format`, les passe à
  `clilog.New` pour le logger backend, mais ne les exporte pas à JS.

## Décisions UI-001a-spécifiques (delta — à prendre avant canvas)

> Les 16 décisions de famille D1-D16 (analyse parente) restent valides ;
> ces D-A* additionnent.

- [ ] **D-A1 — Version Wails à pin**.
  *(Reco : pin sur la dernière v2 stable au moment du canvas, vérifier
  changelog `BREAKING` et bug ouverts. Idéalement v2.10+ qui supporte
  webkit2gtk-4.1.)*
- [ ] **D-A2 — Package manager frontend** : `npm`, `pnpm` ou `yarn` ?
  *(Reco : `npm` — par défaut Wails template, dispo partout, cache
  CI standard. `pnpm` plus rapide mais introduit une étape `corepack
  enable` en CI. `yarn` plus rare en 2026.)*
- [ ] **D-A3 — TypeScript strict mode**.
  *(Reco : `"strict": true` dans `tsconfig.json` dès le scaffold.
  Coût négligeable maintenant, énorme plus tard à activer
  rétroactivement.)*
- [ ] **D-A4 — ESLint / Prettier en UI-001a ?**
  *(Reco : non, différé. Pas dans le scope skeleton ; ajout possible
  via une story polish UI-001x post-001a.)*
- [ ] **D-A5 — CI caching**.
  *(Reco : `actions/cache@v4` sur `~/.cache/go-build`,
  `~/go/pkg/mod`, `frontend/node_modules`, key basée sur
  `go.sum` + `frontend/package-lock.json`. Sans cache, CI > 8 min sur
  3 OS.)*
- [ ] **D-A6 — Sort de `Greet()` après UI-001b**.
  *(Reco : la garder dans un menu caché *About → Smoke test* en
  UI-001b. Coût zéro et utilité diagnostic.)*
- [ ] **D-A7 — `cmd/yukki/ui.go` ou `cmd/yukki/cmd_ui.go`** ?
  *(Reco : `ui.go` — cohérent avec `main.go` (pas de préfixe `main_`
  ou `cmd_main.go`).)*
- [ ] **D-A8 — Test de l'injection build-tag**.
  *(Reco : un fichier `cmd/yukki/ui_mock_test.go` guardé `//go:build mock`
  qui assert que `newProvider()` retourne un `*provider.MockProvider`,
  et un autre `ui_prod_test.go` (`//go:build !mock`) qui assert
  `*provider.ClaudeProvider`. Coût ~10 lignes, valide le contrat.)*
- [ ] **D-A9 — Comportement de `yukki ui` en absence de display**.
  *(Reco : Wails retourne une erreur d'init ; la wrapper de l'UI cmd
  la mappe vers `exitIO` (3) avec un message clair. Aucun changement
  à `mapErrorToExitCode`.)*
