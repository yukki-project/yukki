---
id: UI-001b
slug: hub-viewer-claude-banner
story: spdd/stories/UI-001b-hub-viewer-claude-banner.md
parent-analysis: spdd/analysis/UI-001-init-desktop-app-wails-react.md
status: draft
created: 2026-05-01
updated: 2026-05-01
---

# Analyse — UI-001b (delta) — Hub viewer & Claude banner

> **Analyse de delta** — la stratégie globale, les modules, les 16
> décisions structurantes, les 10 risques et les 11 cas limites de la
> famille UI-001 sont dans
> [`spdd/analysis/UI-001-init-desktop-app-wails-react.md`](UI-001-init-desktop-app-wails-react.md).
> Ce document ne couvre que les choix **spécifiques à UI-001b** (hub
> viewer + Claude banner + init SPDD empty state) qui n'ont pas leur
> place dans une analyse de famille parce qu'ils n'engagent pas
> UI-001a ni UI-001c.
>
> Pré-requis livré : **CORE-004** (`ListArtifacts`, `ParseFrontmatter[T]`,
> `Meta`, `AllowedKinds()`) — UI-001b consomme ces fonctions, ne les
> implémente pas.

## Mots-clés métier extraits (delta UI-001b)

`ProjectPicker`, `SelectProject`, `Sidebar`, `HubList`, `Meta`,
`StoryViewer`, `ClaudeBanner`, `GetClaudeStatus`, `InitializeSPDD`,
`Zustand`.

## Concepts existants exploités par UI-001b

| Symbole | Vit dans | Rôle UI-001b |
|---|---|---|
| `internal/uiapp.App` (UI-001a) | `internal/uiapp/app.go` | À étendre avec 4 nouvelles méthodes bindées (`SelectProject`, `ListArtifacts`/etc., `GetClaudeStatus`, `InitializeSPDD`) + champ `projectDir` mutable |
| `App.OnStartup/OnShutdown` (UI-001a) | idem | Inchangé. La cancellation `OnShutdown` reste utile pour UI-001c (long ops). |
| `App.Greet` (UI-001a) | idem | **Conservé** (D-A6 du delta UI-001a) — survit dans le menu *About → Run smoke test* du hub |
| `internal/artifacts.Meta`, `ListArtifacts`, `AllowedKinds`, `ParseFrontmatter[T]` | `internal/artifacts/{lister,parser}.go` (CORE-004) | Cœur du hub list. `ListArtifacts(projectDir, kind)` invoqué à chaque navigation onglet. `Meta.Error != nil` ⇒ ligne flaggée badge "invalid" |
| `internal/templates.{NewLoader, LoadStory, LoadAnalysis, LoadCanvasReasons, LoadTests}` (CORE-001) | `internal/templates/templates.go` | Utilisé par `InitializeSPDD` pour copier les 4 templates embed.FS dans `<projectDir>/spdd/templates/` |
| `internal/provider.Provider.CheckVersion(ctx) error` (CORE-001) | `internal/provider/provider.go` | Appelé par `GetClaudeStatus` pour détecter Claude CLI absent (`ErrNotFound`) ou version incompatible (`ErrVersionIncompatible`) |
| `runtime.OpenDirectoryDialog` (Wails) | `github.com/wailsapp/wails/v2/pkg/runtime` | Appelé par `App.SelectProject` pour le dialog OS-natif de sélection de dossier |
| `frontend/src/App.tsx` (placeholder UI-001a) | `frontend/src/App.tsx` | Refactoré en layout principal (sidebar + main content + banner) |
| `frontend/src/components/ui/{button,card}.tsx` (UI-001a) | idem | Réutilisés dans tous les nouveaux composants |

## Concepts nouveaux à introduire

### Côté Go (`internal/uiapp/app.go`)

- **Champ `projectDir string`** dans `App` — mutable, mis à jour par
  `SelectProject`. Initialement vide.
- **Champs `loader *templates.Loader` + `writer *artifacts.Writer`**
  reconstruits à chaque `SelectProject(newDir)` via
  `templates.NewLoader(newDir)` et
  `artifacts.NewWriter(filepath.Join(newDir, "spdd/stories"))`.
  *(Note : le Writer reste utilisé par UI-001c pour `RunStory`. UI-001b
  ne l'appelle pas directement mais le pré-cable pour cohérence.)*
- **`type ClaudeStatus`** struct exposée :
  ```go
  type ClaudeStatus struct {
      Available bool
      Version   string
      Err       string  // empty si Available, message si non
  }
  ```
- **`func (a *App) SelectProject(ctx) (string, error)`** — appelle
  `runtime.OpenDirectoryDialog`, met à jour `a.projectDir`, recrée
  loader+writer. Retourne le path choisi (ou `""` si annulé). Pas
  d'erreur sur annulation.
- **`func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error)`**
  — délègue à `artifacts.ListArtifacts(a.projectDir, kind)` après
  vérification que `projectDir != ""`. **Décision OQ5 retenue**
  (cf. story) : 1 méthode paramétrée `ListArtifacts(kind)` plutôt que
  4 méthodes typées symétriques. Permet à la sidebar Zustand de
  passer le `kind` actif sans switch côté frontend.
- **`func (a *App) GetClaudeStatus(ctx) ClaudeStatus`** — appelle
  `a.provider.CheckVersion(ctx)`, mappe le sentinel `ErrNotFound` ou
  `ErrVersionIncompatible` vers `ClaudeStatus.Err`. Sur succès,
  remplit `Available: true` et `Version` (à extraire — la signature
  actuelle de `CheckVersion` ne retourne pas la version. Cf. risque
  R1 ci-dessous).
- **`func (a *App) InitializeSPDD(dir string) error`** — crée
  `<dir>/spdd/{stories,analysis,prompts,tests,methodology,templates}/`
  via `os.MkdirAll`, puis copie 4 templates depuis `embed.FS` (via
  `loader.LoadStory/Analysis/CanvasReasons/Tests`) vers
  `<dir>/spdd/templates/{story,analysis,canvas-reasons,tests}.md`.
  Idempotent. Note : la liste de 6 dossiers déborde des 4 kinds de
  `AllowedKinds` (qui n'inclut pas `methodology` et `templates`) —
  cohérent (on liste 4 kinds mais on crée 6 dossiers fonctionnels).
- **`func (a *App) ReadArtifact(absPath string) (string, error)`**
  *(nouveau, à trancher D2 ci-dessous)* — lit le contenu markdown
  d'un fichier pour le `<StoryViewer />`. Vérifie que `absPath` est
  bien sous `a.projectDir/spdd/` (anti path-traversal).

### Côté frontend (`frontend/src/`)

- **Layout `App.tsx` refactoré** : remplace le placeholder par un
  layout 3-zones (top-banner / left-sidebar / main-content), driven
  par les stores Zustand.
- **`<ProjectPicker />`** : composant initial si `projectDir` vide.
  Bouton *Open project* → `App.SelectProject`. Vue empty state si
  dossier sans `spdd/` détecté → bouton *Initialize SPDD here* →
  `App.InitializeSPDD`.
- **`<Sidebar />`** : navigation permanente. Construite depuis un
  array typé `SidebarItem[]` (cf. story OQ4 reco) lu depuis
  `App.AllowedKinds` ou hardcoded 4 entries. *Reco : appel binding
  `App.AllowedKinds()` pour avoir une seule source de vérité avec
  CORE-004.*
- **`<HubList />`** : tableau des `Meta` du `kind` courant. Colonnes
  `id`, `title`, `status` (badge), `updated`. Click ligne → ouvre
  `<StoryViewer />` avec le `Meta.Path`. `Meta.Error != nil` ⇒
  badge rouge "invalid" + message d'erreur en hover.
- **`<StoryViewer />`** : panneau read-only. Reçoit `Meta.Path`,
  appelle `App.ReadArtifact(path)`, rend le markdown via
  `react-markdown` + `remark-gfm` (cf. story OQ1).
- **`<ClaudeBanner />`** : banner persistant en haut. Affiché ssi
  `useClaudeStore.status.Available === false`. Texte selon `Err` :
  *"Claude CLI not detected — install it"* ou *"Claude CLI version
  incompatible"*. Lien externe vers la doc d'install.
- **3 stores Zustand** :
  - `useProjectStore` : `projectDir, setProjectDir, hasSpdd`
  - `useArtifactsStore` : `kind, items[], refresh, selectedPath`
  - `useClaudeStore` : `status, refresh`
- **Lib markdown** : `react-markdown` + `remark-gfm` (lourdeur ~80kb
  brotli). Ajout dans `frontend/package.json`.
- **Bindings TypeScript regénérées** — Wails va produire des nouveaux
  fichiers dans `frontend/wailsjs/go/main/App.{js,d.ts}`. Comme
  CORE-002 a livré des stubs hand-written committed (workaround AV),
  il faut soit régénérer en CI puis committer, soit hand-écrire les
  signatures pour les 4 nouvelles méthodes.

## Approche stratégique

1. **Tout le métier sur `internal/uiapp.App`** : 4 nouvelles méthodes,
   pas de nouveau package. La taille de `App` reste raisonnable (~150
   lignes après UI-001b vs ~70 actuellement).
2. **`projectDir` mutable** : la racine de l'`App` change quand l'user
   sélectionne un projet. Loader + Writer reconstruits à chaque
   changement (pattern `SelectProject` → `app.projectDir = newDir; app.loader = templates.NewLoader(newDir)`).
3. **`ListArtifacts(kind)` paramétrée** (OQ5 = 1 méthode unique) :
   simplicité côté frontend (Zustand passe `kind` actif), validation
   côté Go via `slices.Contains(allowedKinds, kind)`. Erreur claire
   `ErrInvalidKind` (CORE-004) si invalide.
4. **`ReadArtifact` avec garde anti path-traversal** : seuls les
   chemins sous `projectDir/spdd/` sont lisibles. Prévient un attaque
   où un artefact malicieux pointerait vers `/etc/passwd` via un
   `Path` falsifié.
5. **`InitializeSPDD` idempotent** : `os.MkdirAll` ne fait rien si le
   dossier existe ; `os.WriteFile` overwrite les templates si déjà
   présents (cohérent — l'embed.FS est la source de vérité, ré-écrire
   ne casse rien si le user n'a pas customisé).
6. **`GetClaudeStatus` async côté front** : appel via `useClaudeStore.refresh()`
   au mount du `<App />`. Banner s'affiche après ~200-500ms. Pas
   bloquant pour le rendu initial du hub.
7. **Refresh manuel + post-action** (Q1=B famille) : pas de fsnotify.
   Bouton *Refresh* dans le header du HubList. Aussi déclenché
   automatiquement après `InitializeSPDD` (vu que ça change l'état
   "spdd existe ou non").
8. **react-markdown + remark-gfm** (OQ1 reco) : standard 2026, support
   tableaux/strike/checklist, ~80kb brotli. Acceptable pour un viewer
   read-only. Alternative `marked` plus léger mais demande wrapper
   manuel pour React.
9. **Tests Go uniquement** (pas de Playwright UI en V1) : on valide
   les 4 bindings via tests `internal/uiapp/app_test.go` avec
   `MockProvider` + `t.TempDir()` + filesystem réel. Le frontend est
   validé manuellement via `wails dev -tags mock`.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp/app.go` | **fort** | extension : 4 méthodes (`SelectProject`, `ListArtifacts`, `GetClaudeStatus`, `InitializeSPDD`, `ReadArtifact`), 1 type (`ClaudeStatus`), 3 champs (`projectDir`, `loader`, `writer`) |
| `internal/uiapp/app_test.go` | **fort** | nouveaux tests pour les 5 méthodes (avec mock Wails runtime, MockProvider, `t.TempDir()`) |
| `frontend/src/App.tsx` | **fort** | refactor complet — placeholder UI-001a remplacé par layout 3-zones |
| `frontend/src/components/` (nouveau dossier `hub/`) | **fort** | création — `ProjectPicker.tsx`, `Sidebar.tsx`, `HubList.tsx`, `StoryViewer.tsx`, `ClaudeBanner.tsx` (5 composants) |
| `frontend/src/stores/` (nouveau dossier) | **fort** | création — 3 stores Zustand (`project.ts`, `artifacts.ts`, `claude.ts`) |
| `frontend/src/lib/api.ts` (nouveau) | moyen | wrappers thin autour des bindings + helpers (e.g. `safeReadArtifact` qui catch et retourne `{content, error}`) |
| `frontend/package.json` | faible | + `react-markdown`, `remark-gfm` |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | moyen | régen Wails ou hand-update des stubs (cf. workaround AV CORE-002) |
| `cmd/yukki`, autres `internal/*`, CI, `.golangci.yml`, `TODO.md` | nul | aucun changement |

## Dépendances et intégrations

- **Aucune nouvelle dépendance Go**. `internal/artifacts` (Meta,
  ListArtifacts) et `internal/templates` (Loader) déjà disponibles.
  `runtime.OpenDirectoryDialog` fait partie de Wails v2.12.0 (déjà
  en `go.mod`).
- **2 nouvelles dep npm** :
  - `react-markdown` (~50kb brotli, MIT)
  - `remark-gfm` (~30kb brotli, MIT, plugin GFM tableaux/strike)
- **Conventions externes** :
  - Wails events : *aucun* en UI-001b (UI-001c apportera EventsEmit/EventsOn)
  - `runtime.OpenDirectoryDialog` retourne `""` sans erreur si l'user
    annule → comportement attendu côté front (rester sur ProjectPicker)
  - GFM markdown via `remark-gfm` : tableaux pipe-syntax, strike `~~`,
    task lists `- [ ]`

## Risques et points d'attention

- **R1 — `Provider.CheckVersion` ne retourne pas la version**
  *(prob. haute, impact moyen)*. Aujourd'hui CORE-001 a
  `func CheckVersion(ctx) error` qui retourne juste l'erreur sentinelle.
  Pour `ClaudeStatus.Version` UI-001b a besoin de la chaîne version
  réelle (e.g. *"claude 1.2.3"*).
  **Mitigation** : 2 options — (a) modifier la signature de
  `CheckVersion` pour qu'elle retourne `(version string, error)` —
  rupture publique, déclenche un canvas-update CORE-001 ; (b) ajouter
  une nouvelle méthode `Provider.Version(ctx) (string, error)` qui
  cohabite — moins disruptive, à pencher.
  **Reco V1** : option (b) — ajouter `Version(ctx)` au Provider sans
  casser la signature de `CheckVersion`. Décision en canvas (D-B5).
- **R2 — Path traversal via `Meta.Path` falsifié** *(prob. faible,
  impact moyen)*. Si un artefact malicieux a un `Path` qui pointe
  hors `projectDir/spdd/`, `ReadArtifact` pourrait lire `/etc/passwd`.
  **Mitigation** : `ReadArtifact` valide `strings.HasPrefix(absPath,
  filepath.Join(a.projectDir, "spdd"))` avant `os.ReadFile`. Sinon
  retourne erreur typée.
- **R3 — Bindings TypeScript stubs vs auto-régénération** *(prob.
  haute, impact faible)*. CORE-002 a livré des stubs hand-written
  pour les fichiers `frontend/wailsjs/go/main/App.{d.ts,js}` (workaround
  AV Defender qui quarantine le helper Wails). UI-001b ajoute 5
  méthodes ; il faut hand-mettre-à-jour les stubs **OU** documenter
  explicitement le besoin de regen sur une machine non-AV-bloquée.
  **Mitigation** : hand-écrire les stubs comme pour UI-001a (~10
  lignes par méthode). Documenter dans le canvas.
- **R4 — `ProjectPicker` annulé par l'user** *(prob. moyenne, impact
  faible)*. `OpenDirectoryDialog` retourne `""` sans erreur. Le
  frontend doit gérer ce cas (rester sur l'écran picker, pas
  d'erreur affichée).
  **Mitigation** : test UI manuel via `wails dev -tags mock` ; binding
  Go retourne `""` proprement.
- **R5 — `InitializeSPDD` overwrite des templates customisés**
  *(prob. moyenne, impact moyen)*. Si un user a customisé
  `<projet>/spdd/templates/story.md` puis re-clique *Initialize SPDD here*,
  son template custom est overwrité par celui de `embed.FS`.
  **Mitigation** : v1 = on overwrite (cohérent avec idempotence
  stricte). v2 si user feedback = check existence avant overwrite,
  ou ajouter un flag `force`.
- **R6 — Markdown XSS via artefact malicieux** *(prob. faible, impact
  moyen)*. `react-markdown` rend du HTML. Un artefact avec
  `<script>...</script>` dans le frontmatter ou le body pourrait
  s'exécuter dans la WebView Wails. Wails est sandboxed mais...
  **Mitigation** : `react-markdown` désactive HTML brut par défaut
  (option `disallowedElements`). Confirmer la config en canvas.
- **R7 — Performance HubList sur >500 artefacts** *(prob. faible,
  impact faible)*. Render d'une grosse table peut être lent.
  **Mitigation** : reporté, virtual scrolling via `react-virtual`
  si profilage révèle un goulot.
- **R8 — Multi-instance yukki ui** *(prob. faible, impact faible)*.
  2 fenêtres ouvertes sur le même projet, l'une rafraîchit le
  HubList, l'autre est désynchronisée. Hors scope V1.

## Cas limites identifiés

- **CL1** — `SelectProject` annulé : retour `""`, pas d'erreur,
  ProjectPicker reste affiché.
- **CL2** — Project sans dossier `spdd/` : empty state +
  bouton *Initialize SPDD here*.
- **CL3** — Project avec dossier `spdd/` mais kinds vides :
  `ListArtifacts` retourne `[]Meta{}`, HubList affiche état "no
  artifacts yet".
- **CL4** — Frontmatter corrompu : couvert par CORE-004 (`Meta.Error`),
  HubList badge rouge.
- **CL5** — Claude CLI absent : banner async non-bloquant (cf.
  D11 famille, async).
- **CL6** — User clique *Refresh* pendant scan en cours : pas de
  blocage en V1 (scan synchrone, court < 100ms typique).
- **CL7** — Path Windows avec espaces ou caractères spéciaux : géré
  via `filepath.Join` + `filepath.Abs` (CORE-004 le fait déjà).
- **CL8** — Rendu Markdown de gros fichier (> 1 MB) : possible mais
  rare pour des artefacts SPDD. Pas testé V1.
- **CL9** — `InitializeSPDD` sur un dossier read-only : `os.MkdirAll`
  retourne erreur, propagée au frontend qui l'affiche.
- **CL10** — `ReadArtifact` sur un fichier supprimé entre le scan
  et le click : `os.ErrNotExist`, retourné au frontend.
- **CL11** — Rendu Markdown avec image relative `![](./img.png)` :
  react-markdown ne charge pas (pas de file:// dans WebView). Pas
  bloquant pour V1, à voir.
- **CL12** — `useClaudeStore.refresh()` appelé en boucle (re-render
  React) : on doit éviter le hammering. Reco useEffect avec dependency
  array vide → 1 fois au mount.

## Décisions à prendre avant le canvas

> Recommandations en italique. Validation/contestation en revue
> avant `/spdd-reasons-canvas`.

- [ ] **D-B1 — Forme du binding listing** *(OQ5 story)*.
  *(Reco : 1 méthode `App.ListArtifacts(kind string) ([]artifacts.Meta, error)`
  paramétrée. Validation côté Go via `AllowedKinds`. Frontend Zustand
  passe le `kind` actif. Plus simple que 4 méthodes symétriques pour
  4 kinds qui font la même chose.)*
- [ ] **D-B2 — Binding `App.ReadArtifact(path) (string, error)`**.
  *(Reco : oui. Sans cette méthode, `<StoryViewer />` ne peut rien
  afficher. Inclut un check anti path-traversal —
  `strings.HasPrefix(absPath, projectDir+"/spdd")`.)*
- [ ] **D-B3 — Sidebar : `AllowedKinds()` côté Go ou hardcodé front** ?
  *(Reco : appel binding `App.AllowedKinds() []string` (déjà exposé
  via CORE-004). Une seule source de vérité, DRY.)*
- [ ] **D-B4 — `InitializeSPDD` scope dirs** : 4 (kinds) ou 6 (kinds
  + methodology + templates) ?
  *(Reco : 6 — la story le demande, et le user attend une structure
  prête à recevoir des refs de méthodologie + ses propres templates.
  `methodology/` reste vide sauf si l'user copie des refs depuis le
  repo yukki ; `templates/` contient les 4 templates copiés depuis
  embed.FS.)*
- [ ] **D-B5 — Comment obtenir la version Claude pour `ClaudeStatus`** ?
  *(Reco : ajouter `Provider.Version(ctx) (string, error)` au CORE-001
  Provider interface (sans casser `CheckVersion`). Décliné en
  ClaudeProvider (parse `claude --version` stdout) et MockProvider
  (retourne `"mock-1.0"`). Modification de l'interface = touche le
  cœur métier — à vérifier que CORE-002 depguard accepte (il accepte,
  c'est intra-cœur).)*
- [ ] **D-B6 — Choix de la lib markdown** *(OQ1 story)*.
  *(Reco : `react-markdown` + `remark-gfm`. Standard 2026, ~80kb,
  support GFM. Alternatives écartées : `marked` (manque wrapper
  React), `mdx-bundler` (overkill).)*
- [ ] **D-B7 — XSS protection markdown**.
  *(Reco : `react-markdown` avec `disallowedElements={['script', 'iframe']}`
  + `unwrapDisallowed` pour fallback texte. Aucun HTML brut autorisé
  dans le rendu.)*
- [ ] **D-B8 — Stubs `wailsjs/go/main/App.{d.ts,js}`**.
  *(Reco : hand-écrire les stubs pour les 5 nouvelles méthodes,
  cohérent avec le workaround AV de CORE-002. ~10 lignes par méthode.
  Documenter en doc-comment du fichier.)*
- [ ] **D-B9 — Layout responsive ?**
  *(Reco : non en V1. Wails n'est pas une web app classique ; la
  fenêtre est typiquement 1280×800. Pas de mobile/tablet à supporter.
  Layout flex CSS classique suffit.)*
- [ ] **D-B10 — Stratégie de tests Go pour les 5 méthodes**.
  *(Reco : un fichier `app_test.go` étendu avec des sous-fonctions
  par méthode :
  - `TestApp_SelectProject` (mock Wails runtime via interface)
  - `TestApp_ListArtifacts_Delegates` (assert appel à
    `artifacts.ListArtifacts` avec MockProvider)
  - `TestApp_GetClaudeStatus_*` (3 cas : Available, ErrNotFound,
    ErrVersionIncompatible)
  - `TestApp_InitializeSPDD_*` (idempotent, dossiers + templates
    créés, échec si read-only)
  - `TestApp_ReadArtifact_*` (succès, path traversal bloqué,
    fichier inexistant).)*
- [ ] **D-B11 — Auto-refresh post-`InitializeSPDD`** ?
  *(Reco : oui — store hub appelle `refresh()` automatique après
  succès `InitializeSPDD`. Sinon l'user voit l'empty state même
  après init réussi.)*
- [ ] **D-B12 — `ClaudeStatus` shape**.
  *(Reco : `{Available bool, Version string, Err string}` —
  3 champs distincts, simple à JSON-serialize. Pas d'enum
  `Status: ok|missing|incompatible` qui complique côté front.)*
