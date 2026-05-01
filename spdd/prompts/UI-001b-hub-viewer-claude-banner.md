---
id: UI-001b
slug: hub-viewer-claude-banner
story: spdd/stories/UI-001b-hub-viewer-claude-banner.md
analysis: spdd/analysis/UI-001b-hub-viewer-claude-banner.md
family-analysis: spdd/analysis/UI-001-init-desktop-app-wails-react.md
status: reviewed
created: 2026-05-01
updated: 2026-05-01
---

# Canvas REASONS — Hub viewer & Claude banner

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> Story fille de UI-001 (famille SPIDR), consume CORE-004 (Go listing
> & parsing). 12 décisions D-B1 à D-B12 tranchées en revue, dont
> **D-B5** (ajout `Provider.Version`) qui touche le cœur CORE-001
> et **D-B9** (layout responsive sidebar collapsable < 768px) qui
> ajoute +0.2j au scope frontend.
>
> **D-B13** *(ajout 2026-05-01, `/spdd-prompt-update`)* : le
> `<StoryViewer>` extrait le frontmatter YAML du contenu et le rend
> séparément en header structuré (titre, badges, listes), tandis que
> le body markdown est rendu en dessous. Parser maison ; pas de dep
> `js-yaml`.

---

## R — Requirements

### Problème

UI-001a a livré la fenêtre vide + scaffold React. UI-001b transforme
cette fenêtre en **hub fonctionnel read-only** : sélection du projet,
sidebar 4 onglets (Stories/Analyses/Canvas/Tests), liste des
artefacts via `artifacts.ListArtifacts` (CORE-004), viewer markdown,
banner non-bloquant si Claude CLI absent, et bootstrap d'un projet
SPDD vide via *Initialize SPDD here*.

### Definition of Done

- [ ] `internal/provider/provider.go` interface `Provider` étendue
      avec `Version(ctx context.Context) (string, error)` ;
      `ClaudeProvider.Version` parse `claude --version` stdout ;
      `MockProvider.Version` retourne `"mock-1.0"` ou `m.VersionErr`
- [ ] `CheckVersion` signature **strictement préservée** (Invariant
      CORE-002 I2) — pas de break public sur l'existant
- [ ] `MockProvider` réorganisé : `CheckErr error` (ex-`VersionErr`,
      drive `CheckVersion`) + `VersionVal string` + `VersionErr error`
      (drive `Version`). Rename test-double interne — l'interface
      Provider reste inchangée.
- [ ] `internal/uiapp/app.go` étendu :
      - 3 nouveaux champs : `projectDir string`, `loader *templates.Loader`,
        `writer *artifacts.Writer`
      - 1 nouveau type : `type ClaudeStatus struct { Available bool;
        Version, Err string }`
      - 6 nouvelles méthodes bindées : `SelectProject() (string, error)`,
        `AllowedKinds() []string`, `ListArtifacts(kind string) ([]Meta, error)`,
        `GetClaudeStatus() ClaudeStatus`, `InitializeSPDD(dir string) error`,
        `ReadArtifact(path string) (string, error)`
- [ ] `App.SelectProject` ouvre `runtime.OpenDirectoryDialog`
      (passe `a.ctx` interne), retourne `""` proprement si annulé,
      met à jour `projectDir` + reconstruit `loader`+`writer`
- [ ] `App.ListArtifacts(kind)` valide le `kind` via
      `artifacts.AllowedKinds()` puis délègue à
      `artifacts.ListArtifacts(projectDir, kind)`. Erreur claire si
      `projectDir` vide.
- [ ] `App.GetClaudeStatus()` mappe `provider.CheckVersion` +
      `Version` (en utilisant `a.ctx`) vers les 3 champs `ClaudeStatus`
- [ ] `App.InitializeSPDD(dir)` crée 6 dossiers
      (`stories, analysis, prompts, tests, methodology, templates`)
      + copie 4 templates depuis `embed.FS` vers
      `<dir>/spdd/templates/`. Idempotent.
- [ ] `App.ReadArtifact(path)` vérifie
      `strings.HasPrefix(absPath, filepath.Join(projectDir, "spdd"))`
      avant `os.ReadFile`. Erreur typée si path-traversal.
- [ ] `App.AllowedKinds() []string` exposée côté front (re-export
      de `artifacts.AllowedKinds`)
- [ ] Tests Go étendus dans `internal/uiapp/app_test.go` (5 groupes
      de sous-fonctions, ~15-20 tests table-driven)
- [ ] `frontend/wailsjs/go/main/App.{d.ts,js}` stubs hand-written
      mis à jour pour les 6 nouvelles méthodes ; runtime path =
      `window.go.uiapp.App.<method>` (Wails dérive le namespace du
      package du struct bindé `*uiapp.App`, **pas** du `package main`
      qui héberge `wails.Run`)
- [ ] `frontend/package.json` gagne `react-markdown` et `remark-gfm`
- [ ] 3 stores Zustand créés dans `frontend/src/stores/` :
      `project.ts`, `artifacts.ts`, `claude.ts`
- [ ] 6 composants React créés dans `frontend/src/components/hub/` :
      `ProjectPicker`, `Sidebar`, `SidebarToggle`, `HubList`,
      `StoryViewer`, `ClaudeBanner`
- [ ] `frontend/src/App.tsx` refactoré en layout 3-zones (top banner,
      left sidebar, main content), **responsive** : sidebar collapsable
      manuellement + auto-collapse < 768px de largeur de fenêtre.
      State `collapsed` lifté dans `App` pour piloter `<Sidebar
      collapsed onSelect>` et `<SidebarToggle collapsed onToggle>`
- [ ] StoryViewer **extrait le frontmatter YAML** (parser maison
      key:value + listes simples) et rend un **header graphique
      structuré** (titre, pills `id`/`status`/`updated`/`owner`/…,
      definition-list pour les listes type `modules`/`depends-on`).
      Le body (post-`---`) est rendu via `react-markdown` + `remark-gfm`
      avec `disallowedElements={['script', 'iframe', 'object', 'embed']}`.
      Aucune dep YAML tierce ajoutée.
- [ ] Auto-refresh post-`InitializeSPDD` : le store
      `useArtifactsStore.refresh()` est invoqué automatiquement
- [ ] Aucune régression : tests existants UI-001a + CORE-001/002/004
      verts ; depguard CORE-002 reste vert (Provider est cœur)
- [ ] Validation manuelle via `wails dev -tags mock` : tous les flows
      hub fonctionnent (sélection projet, listing, banner Claude
      absent, init SPDD, viewer markdown, refresh manuel)

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `App` (étendu UI-001a) | Struct Wails Bind exposée au front. Devient stateful (projectDir + loader + writer mutables) | + 6 nouvelles méthodes bindées (signatures sans `ctx` — utilisent `a.ctx` interne posé par `OnStartup`, voir D-B5b) | recréé à chaque lancement `yukki ui` |
| `ClaudeStatus` (nouveau, exporté) | Vue typée du résultat `CheckVersion` + `Version` à destination du banner UI | `Available bool, Version string, Err string` | construit à chaque appel `GetClaudeStatus` |
| `Provider` (étendu CORE-001) | Interface du LLM CLI abstraite. Gagne 1 méthode `Version` | `Name`, `CheckVersion`, **`Version`**, `Generate` | inchangé |
| `Meta` (CORE-004) | Vue typée d'un artefact listé | `ID, Slug, Title, Status, Updated, Path, Error` | construit par `ListArtifacts` |
| `useProjectStore` (Zustand, nouveau) | État global frontend du projet courant | `projectDir, setProjectDir, hasSpdd, setHasSpdd` | global app lifetime |
| `useArtifactsStore` (Zustand, nouveau) | État global de la liste d'artefacts du `kind` courant | `kind, items[], selectedPath, refresh(), setKind, setSelectedPath` | global app lifetime |
| `useClaudeStore` (Zustand, nouveau) | État global du status Claude CLI | `status: ClaudeStatus, refresh()` | global app lifetime |

### Value Objects

| Nom | Description | Type |
|---|---|---|
| `Kind` | Une des 4 valeurs `AllowedKinds()` | `string` (intra-cœur) |
| `AbsolutePath` | Chemin absolu d'un artefact | `string` |
| `MarkdownContent` | Texte markdown brut d'un artefact | `string` |
| `Frontmatter` (UI-only) | Vue parsée du bloc YAML frontmatter, scindé en scalaires + listes pour rendu structuré dans `<StoryViewer>` | `{ scalars: Record<string,string>; lists: Record<string,string[]> }` (TS) |

### Invariants UI-001b

- **I1** — `App.ReadArtifact(path)` rejette tout path qui n'a pas
  `filepath.Join(projectDir, "spdd")` comme préfixe absolu. Empêche
  l'attaque où un `Meta.Path` falsifié pointerait vers
  `/etc/passwd`.
- **I2** — `Provider.CheckVersion(ctx) error` garde sa signature
  exacte. L'ajout de `Version(ctx) (string, error)` est purement
  additif. Vérifié par non-régression des tests CORE-001 sur
  ClaudeProvider et MockProvider.
- **I3** — `App.SelectProject` retourne `(string, error)` où une
  annulation utilisateur renvoie `("", nil)` (pas une erreur).
  Permet au front de distinguer `cancelled` de `failed`.
- **I3b** — Les méthodes Wails-bindées `SelectProject` et
  `GetClaudeStatus` n'acceptent **pas** de paramètre `context.Context`.
  Wails 2.12 ne ré-injecte pas auto le ctx (contre-doc) ; il le
  compterait comme un arg JS et lèverait
  `received 0 arguments to method ..., expected 1` au premier appel.
  Le ctx utilisé en interne reste celui posé par `OnStartup` (`a.ctx`).
- **I4** — `App.InitializeSPDD` est idempotent : appel répété sur
  un dossier déjà initialisé n'échoue pas et n'altère pas le
  contenu existant des dossiers (sauf overwrite des templates copiés
  depuis `embed.FS`, ce qui est cohérent avec "embed = source de
  vérité").
- **I5** — `<StoryViewer />` ne rend **jamais** de HTML brut, ni
  `<script>`, `<iframe>`, `<object>`, `<embed>`. Garantie par
  config `react-markdown` + `disallowedElements`.
- **I6** — Les 3 stores Zustand sont **strictement isolés** : ne
  pas créer un méga-store ; pas d'imports croisés entre stores.
  Permet de remplacer/tester chaque store individuellement.
- **I7** — `App.AllowedKinds()` re-export pur de
  `artifacts.AllowedKinds()` (CORE-004) — DRY, pas de duplication
  de la liste côté uiapp.

### Integration points

- **`runtime.OpenDirectoryDialog`** (Wails) — appelé par
  `SelectProject`. Retour `""` sans erreur si annulé par l'user.
- **`os.ReadFile`** — appelé par `ReadArtifact` après check
  path-traversal.
- **`os.MkdirAll` + `os.WriteFile`** — appelés par `InitializeSPDD`
  pour les 6 dossiers + 4 templates copiés.
- **`provider.Provider.CheckVersion` + `Version`** — appelés par
  `GetClaudeStatus`.
- **`artifacts.ListArtifacts` + `AllowedKinds`** (CORE-004) —
  appelés par `App.ListArtifacts` et `App.AllowedKinds`.
- **`templates.NewLoader` + `LoadStory/Analysis/CanvasReasons/Tests`**
  (CORE-001) — appelés par `InitializeSPDD` pour copier les 4
  templates depuis `embed.FS`.

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **donner à l'utilisateur une vue
> centralisée de ses artefacts SPDD avec diagnostic Claude et
> bootstrap projet**, on choisit **un hub Wails read-only :
> `App` étendu avec 5 bindings (SelectProject, ListArtifacts,
> GetClaudeStatus, InitializeSPDD, ReadArtifact), 3 stores Zustand
> isolés, 6 composants React (ProjectPicker, Sidebar, SidebarToggle,
> HubList, StoryViewer, ClaudeBanner), layout responsive avec
> sidebar collapsable < 768px, lib markdown `react-markdown` +
> `remark-gfm` avec disallowedElements anti-XSS, et ajout d'une
> méthode `Provider.Version` sibling de `CheckVersion` sur le cœur**,
> plutôt que d'**embarquer la logique de listing dans uiapp** ou
> de **dupliquer le binding par kind**, pour atteindre **réutilisation
> directe de CORE-004, cohérence cross-platform Wails, sécurité
> path-traversal, et anticipation MCP (`Provider.Version` aussi
> utile pour INT-002)**, en acceptant **une modification de
> l'interface `Provider` du cœur (additive, non-breaking) et la
> maintenance de stubs hand-written pour `frontend/wailsjs/`
> tant que TICKET IT n'est pas livré**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-01)

- **D-B1** : `App.ListArtifacts(kind string)` paramétrée (vs 4
  méthodes typées symétriques)
- **D-B2** : `App.ReadArtifact` + check anti path-traversal obligatoire
- **D-B3** : `App.AllowedKinds()` re-export de CORE-004 (DRY)
- **D-B4** : `InitializeSPDD` crée 6 dossiers (kinds + methodology +
  templates)
- **D-B5** : `Provider.Version(ctx) (string, error)` ajoutée sibling
  de `CheckVersion` (modif intra-cœur compatible CORE-002 depguard)
- **D-B6** : `react-markdown` + `remark-gfm`
- **D-B7** : `disallowedElements={['script', 'iframe', 'object', 'embed']}`
- **D-B8** : Stubs `wailsjs/go/main/App.{d.ts,js}` hand-written
  (cohérent CORE-002 workaround AV)
- **D-B9** : Layout responsive avec sidebar collapsable < 768px
  (+0.2j vs reco initiale non-responsive)
- **D-B10** : Tests Go ~15-20 dans `app_test.go` étendu, table-driven
- **D-B11** : Auto-refresh post-`InitializeSPDD`
- **D-B12** : `ClaudeStatus{Available, Version, Err}` 3 champs
- **D-B5b** *(découverte runtime 2026-05-01)* : Wails 2.12 ne
  ré-injecte pas automatiquement `context.Context` pour les méthodes
  bindées (contre-doc). `SelectProject(ctx)` et `GetClaudeStatus(ctx)`
  doivent abandonner le paramètre ctx ; les méthodes utilisent `a.ctx`
  posé par `OnStartup`. Pas de changement comportemental côté JS
  (le runtime context utilisé reste celui de la session UI).
- **D-B8b** *(découverte runtime 2026-05-01)* : le runtime path
  des bindings est `window.go.uiapp.App.<method>` — Wails dérive le
  namespace du package du struct bindé (`*uiapp.App` → `uiapp`),
  pas du `package main` qui héberge `wails.Run`. Les stubs
  hand-written restent à `frontend/wailsjs/go/main/App.{d.ts,js}`
  (location de fichier sans impact runtime), seul le path interne
  passe par `uiapp`.
- **D-B13** *(ajout 2026-05-01, prompt-update)* : `<StoryViewer>`
  extrait le frontmatter YAML du markdown lu et le rend en header
  graphique structuré (titre `<h1>`, pills colorées pour
  `id/status/updated/owner/...`, definition-list pour les valeurs
  array type `modules/depends-on/sibling-stories`). Le body
  post-frontmatter est ensuite rendu via `react-markdown` + `remark-gfm`.
  Parser maison ~30 lignes (regex sur `---\n...\n---\n` puis
  ligne par ligne `key:` ou `  - item`), pas de dep `js-yaml`.

### Alternatives écartées

- **4 méthodes typées symétriques** (`ListStories`, `ListAnalyses`,
  ...) — duplication, frontend doit faire un switch sur kind, gain
  de typage nul puisque toutes retournent `[]Meta`.
- **`Provider.CheckVersion` modifiée pour retourner `(version, error)`**
  — break public, casse les tests CORE-001 + l'usage dans
  `cmd/yukki`. D-B5 préfère la cohabitation.
- **Sidebar items hardcodés côté frontend** — viole DRY avec
  CORE-004. D-B3 lit `AllowedKinds()` depuis Go.
- **Mega-store Zustand unique** — moins isolé, harder à tester.
  D-B12 + l'invariant I6 imposent 3 stores séparés.
- **`marked` + wrapper React maison** — XSS facile, GFM payant.
  D-B6 préfère `react-markdown`.
- **Layout non-responsive** (reco initiale D-B9 = A) — abandonné
  au profit de B (responsive). +0.2j frontend.
- **Auto-régen `wailsjs/`** — bloqué par AV Defender (cf. CORE-002).
  D-B8 hand-write.
- **`js-yaml` côté frontend pour parser le frontmatter** — ajoute
  ~10KB gzipped, override de Safeguard "pas de dep tierce au-delà
  de react-markdown + remark-gfm". D-B13 retient un parser maison
  scalaire + listes simples, suffisant pour le format SPDD.
- **Rendre tout le contenu (frontmatter inclus) brut via
  react-markdown** — ce que la première impl a fait : remark-gfm
  rendait la frontmatter comme un thematic-break + texte plat,
  illisible. Visuellement inutilisable. Justifie D-B13.
- **Conserver `ctx context.Context` sur méthodes Wails-bindées
  pour cohérence Go-idiomatique** — incompatible Wails 2.12
  runtime ; D-B5b acte le compromis.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/provider/provider.go` | interface `Provider` | + méthode `Version(ctx) (string, error)` |
| `internal/provider/claude.go` | `ClaudeProvider` | implémentation `Version` (parse `claude --version`) |
| `internal/provider/mock.go` | `MockProvider` | renommage `VersionErr → CheckErr` (drive `CheckVersion`) ; ajout `VersionVal string` + `VersionErr error` (drive `Version`) ; nouvelle méthode `Version` |
| `internal/provider/provider_test.go` + `claude_test.go` + `mock_test.go` | tests | + cas pour `Version` ; aucun changement aux tests `CheckVersion` existants |
| `internal/uiapp/app.go` | `App` | + 3 champs (`projectDir`, `loader`, `writer`) + 1 type (`ClaudeStatus`) + 6 méthodes (`SelectProject() (string, error)`, `AllowedKinds() []string`, `ListArtifacts(kind) ([]Meta, error)`, `GetClaudeStatus() ClaudeStatus`, `InitializeSPDD(dir) error`, `ReadArtifact(path) (string, error)`) ; signatures sans `ctx` (D-B5b) ; `openDirectoryDialog` indirection package-level pour testabilité |
| `internal/uiapp/app_test.go` | tests | + 15-20 tests table-driven sur les 5 nouvelles méthodes |
| `frontend/wailsjs/go/main/App.d.ts` | stubs TS | + 6 export function declarations + interfaces `Meta`, `ClaudeStatus` |
| `frontend/wailsjs/go/main/App.js` | stubs JS | + 6 wrapper functions ; runtime path = `window.go.uiapp.App.<method>` (D-B8b) |
| `frontend/package.json` | deps | + `react-markdown@^9`, `remark-gfm@^4` |
| `frontend/src/stores/project.ts` | nouveau | Zustand store `useProjectStore` |
| `frontend/src/stores/artifacts.ts` | nouveau | Zustand store `useArtifactsStore` |
| `frontend/src/stores/claude.ts` | nouveau | Zustand store `useClaudeStore` |
| `frontend/src/components/hub/ProjectPicker.tsx` | nouveau | empty state + bouton *Open project* / *Initialize SPDD here* |
| `frontend/src/components/hub/Sidebar.tsx` | nouveau | nav 4 kinds (depuis `AllowedKinds`) + responsive |
| `frontend/src/components/hub/SidebarToggle.tsx` | nouveau | bouton ←/→ pour collapsable manuel (D-B9) |
| `frontend/src/components/hub/HubList.tsx` | nouveau | tableau `Meta` avec badges + click row |
| `frontend/src/components/hub/StoryViewer.tsx` | nouveau | parser frontmatter maison + sub-component `<FrontmatterHeader>` (titre + pills + dl) + body via `react-markdown` + `remark-gfm` (D-B13) |
| `frontend/src/components/hub/ClaudeBanner.tsx` | nouveau | banner conditionnel non-bloquant |
| `frontend/src/lib/api.ts` | nouveau | wrappers thin sur les bindings |
| `frontend/src/App.tsx` | refactor | layout 3-zones responsive (top-banner / left-sidebar / main-content), driven par stores ; state local `collapsed` lifté pour piloter `<Sidebar collapsed onSelect>` et `<SidebarToggle collapsed onToggle>` |
| `cmd/yukki`, autres modules, CI, `.golangci.yml`, `TODO.md` | nul | aucun changement |

### Schéma de flux — Hub viewer

```
                  ┌─────────────────────────────────────────────────┐
                  │  yukki ui — Wails window 1280×800               │
                  ├─────────────────────────────────────────────────┤
                  │  <ClaudeBanner /> (top, conditionnel)           │
                  ├──────────────┬──────────────────────────────────┤
                  │              │                                  │
                  │  <Sidebar /> │  <ProjectPicker />               │
                  │  (240px)     │     ─OR─                         │
                  │  ┌──────┐    │  <HubList /> + <StoryViewer />   │
                  │  │Stories│   │  (split horizontal)              │
                  │  │Analys.│   │                                  │
                  │  │Canvas │   │                                  │
                  │  │Tests  │   │                                  │
                  │  └──────┘    │                                  │
                  │  [collapse]  │                                  │
                  │              │                                  │
                  └──────────────┴──────────────────────────────────┘

      Driven by 3 Zustand stores                Bindings Go (Wails)
      ┌────────────────────────┐               ┌─────────────────────────┐
      │ useProjectStore        │ ──┐           │ App.SelectProject       │
      │   projectDir, hasSpdd  │   │           │ App.AllowedKinds        │
      ├────────────────────────┤   │           │ App.ListArtifacts(kind) │
      │ useArtifactsStore      │   ├──reads──► │ App.GetClaudeStatus     │
      │   kind, items[], selectedPath │        │ App.InitializeSPDD      │
      ├────────────────────────┤   │           │ App.ReadArtifact(path)  │
      │ useClaudeStore         │ ──┘           └─────────────────────────┘
      │   status: ClaudeStatus │                         │
      └────────────────────────┘                         ▼
                                              ┌──────────────────────┐
                                              │ artifacts.ListArtifacts │
                                              │ artifacts.AllowedKinds  │
                                              │ provider.CheckVersion   │
                                              │ provider.Version        │
                                              │ templates.NewLoader     │
                                              │ os.ReadFile (guarded)   │
                                              └──────────────────────┘
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation est livrable indépendamment
> en 1 commit atomique.

### O1 — `Provider.Version(ctx)` ajoutée à l'interface (cœur métier)

- **Module** : `internal/provider`
- **Fichiers** :
  - `internal/provider/provider.go` (modification interface)
  - `internal/provider/claude.go` (modification `ClaudeProvider`)
  - `internal/provider/mock.go` (modification `MockProvider`)
- **Signature** :
  ```go
  // Dans provider.go (interface étendue)
  type Provider interface {
      Name() string
      CheckVersion(ctx context.Context) error
      Version(ctx context.Context) (string, error)  // NOUVEAU
      Generate(ctx context.Context, prompt string) (string, error)
  }

  // Dans claude.go
  func (p *ClaudeProvider) Version(ctx context.Context) (string, error)

  // Dans mock.go — restructuration des champs d'erreur :
  //   - `VersionErr` historique (drive CheckVersion) → renommé `CheckErr`
  //   - `VersionVal`/`VersionErr` nouveaux → drive Version
  type MockProvider struct {
      NameVal    string
      Response   string
      Err        error    // drive Generate (existant)
      CheckErr   error    // drive CheckVersion (renommé depuis VersionErr)
      VersionVal string   // drive Version (NOUVEAU, default "mock-1.0")
      VersionErr error    // drive Version (NOUVEAU)
      Calls      []string
  }
  func (m *MockProvider) Version(ctx context.Context) (string, error)
  ```
  Le rename `VersionErr → CheckErr` est interne au test-double ;
  l'interface `Provider` reste inchangée. Un seul site d'usage
  externe (`internal/workflow/story_test.go`) doit suivre le rename.
- **Comportement `ClaudeProvider.Version`** :
  1. Vérifie `exec.LookPath(p.Binary)` (sinon retourne `"", ErrNotFound`)
  2. `exec.CommandContext(ctx, p.Binary, "--version")`
  3. Capture stdout via `cmd.Output()` (timeout via ctx)
  4. Trim whitespace, retourne le string brut (typiquement
     `"claude 1.2.3"` ou `"@anthropic-ai/claude-code/1.0.45 (cli)"`)
  5. Si non-zero exit ou stdout vide, retourne `"", ErrVersionIncompatible`
- **Comportement `MockProvider.Version`** :
  1. Si `m.VersionErr != nil`, retourne `"", m.VersionErr`
  2. Si `m.VersionVal != ""`, retourne `m.VersionVal, nil`
  3. Sinon retourne `"mock-1.0", nil`
- **Tests** :
  - `TestClaudeProvider_Version_StubSucceeds` : utilise le stub claude
    de TestMain (existant), vérifie que `Version(ctx)` retourne la
    chaîne attendue
  - `TestClaudeProvider_Version_NotFound` : binaire absent → `ErrNotFound`
  - `TestMockProvider_Version_Default` : VersionVal vide → `"mock-1.0"`
  - `TestMockProvider_Version_Custom` : VersionVal défini
  - `TestMockProvider_Version_Error` : VersionErr set → propagation
  - **Aucun test existant ne change** — `CheckVersion` signature
    préservée

### O2 — `App` étendu : 6 méthodes + `ClaudeStatus` + 3 champs

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go` (modification)
- **Signatures** :
  ```go
  type ClaudeStatus struct {
      Available bool
      Version   string  // empty si non Available
      Err       string  // empty si Available
  }

  type App struct {
      ctx        context.Context
      cancel     context.CancelFunc
      logger     *slog.Logger
      provider   provider.Provider
      projectDir string                  // NOUVEAU
      loader     *templates.Loader        // NOUVEAU
      writer     *artifacts.Writer        // NOUVEAU
  }

  // 6 nouvelles méthodes bindées (PascalCase obligatoire pour Wails ;
  // pas de paramètre context.Context — D-B5b ; les méthodes utilisent
  // a.ctx posé par OnStartup)
  func (a *App) SelectProject() (string, error)
  func (a *App) AllowedKinds() []string
  func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error)
  func (a *App) GetClaudeStatus() ClaudeStatus
  func (a *App) InitializeSPDD(dir string) error
  func (a *App) ReadArtifact(path string) (string, error)
  ```
- **Comportement `SelectProject`** :
  1. Appelle `runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select SPDD project root"})`
  2. Si `dir == ""` (annulé par l'user), retourne `"", nil`
  3. Sinon : `a.projectDir = dir`,
     `a.loader = templates.NewLoader(dir)`,
     `a.writer = artifacts.NewWriter(filepath.Join(dir, "spdd/stories"))`
  4. Logge `"project selected"` avec le path
  5. Retourne `dir, nil`
- **Comportement `AllowedKinds`** :
  1. Retourne `artifacts.AllowedKinds()` (re-export direct)
- **Comportement `ListArtifacts(kind)`** :
  1. Si `a.projectDir == ""`, retourne `nil, errors.New("no project selected")`
  2. Délègue à `artifacts.ListArtifacts(a.projectDir, kind)`
  3. Retourne le résultat tel quel (incluant `ErrInvalidKind`)
- **Comportement `GetClaudeStatus`** :
  1. `ctx := a.ctx` ; si nil (méthode appelée hors lifecycle Wails),
     fallback `context.Background()`
  2. `err := a.provider.CheckVersion(ctx)`
  3. Si `err != nil` (typiquement `ErrNotFound` ou `ErrVersionIncompatible`),
     retourne `ClaudeStatus{Available: false, Err: err.Error()}`
  4. Sinon : `version, vErr := a.provider.Version(ctx)`
  5. Si `vErr != nil`, retourne `ClaudeStatus{Available: true, Version: "", Err: vErr.Error()}`
  6. Sinon retourne `ClaudeStatus{Available: true, Version: version, Err: ""}`
- **Comportement `InitializeSPDD`** :
  1. Pour chaque dir dans `[stories, analysis, prompts, tests, methodology, templates]` :
     `os.MkdirAll(filepath.Join(dir, "spdd", subdir), 0o755)`
  2. Charge les 4 templates via `a.loader.LoadStory/Analysis/CanvasReasons/Tests()`
     *(note : si `a.loader == nil` parce que pas de SelectProject avant,
     on construit un Loader temporaire `templates.NewLoader(dir)`)*
  3. Pour chaque template, `os.WriteFile(filepath.Join(dir, "spdd/templates", name), content, 0o644)`
  4. Logge `"spdd initialized"` avec le path
- **Comportement `ReadArtifact(path)`** :
  1. `absPath, err := filepath.Abs(path)` (fail-safe au cas où relatif)
  2. `prefix := filepath.Join(a.projectDir, "spdd")` ; si `prefix == "spdd"` (projectDir vide),
     retourne `"", errors.New("no project selected")`
  3. Si `!strings.HasPrefix(absPath, prefix)`,
     retourne `"", fmt.Errorf("path outside project spdd: %s", absPath)`
  4. `data, err := os.ReadFile(absPath)` ; propagation erreur
  5. Retourne `string(data), nil`
- **Tests** : voir O3.

### O3 — Tests Go étendus pour les 5 méthodes

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app_test.go` (extension)
- **Cas couverts** (5 groupes table-driven) :
  - **`TestApp_SelectProject_*`** :
    - `_Success` : runtime.OpenDirectoryDialog mocké, retour de path,
      assert `a.projectDir`, `a.loader`, `a.writer` mis à jour
    - `_Cancelled` : runtime mocké pour retourner `""`, assert
      `(string, error) == ("", nil)`, `a.projectDir` reste vide
    - *(Note implementation : Wails runtime peut être mocké via une
      var function-pointer remplaçable. À voir en `/spdd-generate`.)*
  - **`TestApp_ListArtifacts_*`** :
    - `_Delegation` : crée fixtures via `artifacts.Writer.Write`,
      appelle `App.ListArtifacts("stories")`, assert le retour
      matche celui de `artifacts.ListArtifacts(projectDir, "stories")`
    - `_NoProject` : `projectDir == ""`, assert erreur claire
    - `_InvalidKind` : `kind = "wrong"`, assert
      `errors.Is(err, artifacts.ErrInvalidKind)`
  - **`TestApp_GetClaudeStatus_*`** :
    - `_Available` : `MockProvider{VersionVal: "mock-1.0"}` → assert
      `ClaudeStatus{Available: true, Version: "mock-1.0", Err: ""}`
    - `_NotFound` : `MockProvider{Err: provider.ErrNotFound}` *(via
      override de CheckVersion mock)* → assert
      `ClaudeStatus{Available: false, Err: contains "not found"}`
    - `_VersionFailedAfterCheck` : CheckVersion OK mais Version
      retourne erreur → assert `Available: true, Err: <vErr>`
  - **`TestApp_InitializeSPDD_*`** :
    - `_Success` : sur `t.TempDir()`, assert 6 dossiers créés +
      4 templates dans `spdd/templates/`
    - `_Idempotent` : appel x2 sur même dir, assert pas d'erreur
      et pas de duplication
    - `_ReadOnlyDir` : crée un dir read-only (chmod 0o555 ou
      équivalent Windows), assert erreur retournée
  - **`TestApp_ReadArtifact_*`** :
    - `_Success` : écrit un fichier sous `<tempDir>/spdd/stories/X.md`,
      `App.SelectProject` mocké pour set `projectDir = tempDir`,
      `App.ReadArtifact(absPath)` retourne le contenu
    - `_PathTraversal` : `App.ReadArtifact("/etc/passwd")` ou
      `App.ReadArtifact("../etc/passwd")` → assert erreur "path outside project spdd"
    - `_FileNotExist` : path valide sous spdd/ mais fichier absent
      → assert erreur wrapping `os.ErrNotExist`
    - `_NoProject` : `projectDir == ""`, assert erreur claire

### O4 — Stubs `wailsjs/go/main/App.{d.ts,js}`

- **Module** : `frontend/wailsjs/go/main`
- **Fichiers** :
  - `frontend/wailsjs/go/main/App.d.ts` (modification, hand-update)
  - `frontend/wailsjs/go/main/App.js` (modification, hand-update)
- **Contenu `App.d.ts`** (ajout aux exports existants) :
  ```typescript
  export function Greet(): Promise<string>;  // existant UI-001a
  export function SelectProject(): Promise<string>;
  export function AllowedKinds(): Promise<string[]>;
  export function ListArtifacts(kind: string): Promise<Meta[]>;
  export function GetClaudeStatus(): Promise<ClaudeStatus>;
  export function InitializeSPDD(dir: string): Promise<void>;
  export function ReadArtifact(path: string): Promise<string>;

  export interface Meta {
      ID: string;
      Slug: string;
      Title: string;
      Status: string;
      Updated: string;
      Path: string;
      Error?: string;
  }

  export interface ClaudeStatus {
      Available: boolean;
      Version: string;
      Err: string;
  }
  ```
- **Contenu `App.js`** (ajout aux exports existants ; runtime path
  `window.go.uiapp.App.<method>` — Wails 2.12 dérive le namespace
  du package du struct bindé `*uiapp.App`, **pas** du `package main`
  de `wails.Run`) :
  ```javascript
  // @ts-check
  // AV-WORKAROUND STUB — see App.d.ts.

  export function Greet() {
    return window['go']['uiapp']['App']['Greet']();
  }
  export function SelectProject() {
    return window['go']['uiapp']['App']['SelectProject']();
  }
  export function AllowedKinds() {
    return window['go']['uiapp']['App']['AllowedKinds']();
  }
  export function ListArtifacts(kind) {
    return window['go']['uiapp']['App']['ListArtifacts'](kind);
  }
  export function GetClaudeStatus() {
    return window['go']['uiapp']['App']['GetClaudeStatus']();
  }
  export function InitializeSPDD(dir) {
    return window['go']['uiapp']['App']['InitializeSPDD'](dir);
  }
  export function ReadArtifact(path) {
    return window['go']['uiapp']['App']['ReadArtifact'](path);
  }
  ```
- **Tests** : aucun ; validation via `tsc -b` lors de `wails build`.

### O5 — Deps frontend `react-markdown` + `remark-gfm`

- **Module** : `frontend`
- **Fichier** : `frontend/package.json` (modification)
- **Ajouts** :
  ```json
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
  ```
- **Action** : `npm install` régénère `package-lock.json`. Commit
  les deux fichiers ensemble.
- **Tests** : aucun ; validation via `npm run build` lors de
  `wails build`.

### O6 — 3 Stores Zustand

- **Module** : `frontend/src/stores`
- **Fichiers** (nouveaux) :
  - `frontend/src/stores/project.ts`
  - `frontend/src/stores/artifacts.ts`
  - `frontend/src/stores/claude.ts`
- **`project.ts`** :
  ```typescript
  import { create } from 'zustand';

  interface ProjectState {
    projectDir: string;
    hasSpdd: boolean;
    setProjectDir: (dir: string) => void;
    setHasSpdd: (yes: boolean) => void;
  }

  export const useProjectStore = create<ProjectState>((set) => ({
    projectDir: '',
    hasSpdd: false,
    setProjectDir: (dir) => set({ projectDir: dir }),
    setHasSpdd: (yes) => set({ hasSpdd: yes }),
  }));
  ```
- **`artifacts.ts`** :
  ```typescript
  import { create } from 'zustand';
  import { ListArtifacts, type Meta } from '../../wailsjs/go/main/App';

  interface ArtifactsState {
    kind: string;
    items: Meta[];
    selectedPath: string;
    error: string | null;
    setKind: (k: string) => void;
    setSelectedPath: (p: string) => void;
    refresh: () => Promise<void>;
  }

  export const useArtifactsStore = create<ArtifactsState>((set, get) => ({
    kind: 'stories',
    items: [],
    selectedPath: '',
    error: null,
    setKind: (k) => { set({ kind: k }); get().refresh(); },
    setSelectedPath: (p) => set({ selectedPath: p }),
    refresh: async () => {
      try {
        const items = await ListArtifacts(get().kind);
        set({ items, error: null });
      } catch (e) {
        set({ items: [], error: String(e) });
      }
    },
  }));
  ```
- **`claude.ts`** :
  ```typescript
  import { create } from 'zustand';
  import { GetClaudeStatus, type ClaudeStatus } from '../../wailsjs/go/main/App';

  interface ClaudeState {
    status: ClaudeStatus;
    refresh: () => Promise<void>;
  }

  export const useClaudeStore = create<ClaudeState>((set) => ({
    status: { Available: false, Version: '', Err: '' },
    refresh: async () => {
      const status = await GetClaudeStatus();
      set({ status });
    },
  }));
  ```
- **Tests** : aucun en V1 (D-B10 pas de test UI front). Validés
  via `wails dev -tags mock` manuellement.

### O7 — 6 Composants React

- **Module** : `frontend/src/components/hub`
- **Fichiers** (nouveaux) :
  - `frontend/src/components/hub/ProjectPicker.tsx` — empty state
    + bouton *Open project* qui appelle `App.SelectProject` ;
    si retour `""` (annulé), reste sur l'écran. Si retour path,
    set `useProjectStore.projectDir` puis check existence
    `<dir>/spdd/` ; si absent, propose *Initialize SPDD here*
    qui appelle `App.InitializeSPDD` puis trigger
    `useArtifactsStore.refresh()` (D-B11).
  - `frontend/src/components/hub/Sidebar.tsx` — au mount, `await
    AllowedKinds()` (D-B3) pour construire la liste d'onglets.
    Utilise `useArtifactsStore.kind` pour highlight l'onglet actif.
    Click → `setKind(k)` (qui déclenche refresh).
    **Responsive** : auto-collapse via Tailwind `lg:translate-x-0
    -translate-x-full` < 768px (D-B9).
  - `frontend/src/components/hub/SidebarToggle.tsx` — bouton
    icône ←/→ (lucide-react `ChevronLeft`/`ChevronRight`).
    **Stateless** : reçoit `collapsed: boolean` et `onToggle: ()=>void`
    en props, ne stocke rien. State `collapsed` est lifté dans
    `App.tsx` (cf. O8) pour rester source-of-truth unique partagée
    avec `<Sidebar collapsed onSelect>`.
  - `frontend/src/components/hub/HubList.tsx` — tableau (`<table>`
    + Tailwind grid) des `useArtifactsStore.items`. Colonnes :
    `id`, `title`, `status` (badge coloré : draft=gris, reviewed=
    bleu, accepted=violet, implemented=vert, synced=teal, done=
    emerald, ?=rouge), `updated`. Click ligne →
    `setSelectedPath(item.Path)` qui ouvre `<StoryViewer />`.
    Si `item.Error`, affiche un badge rouge "invalid" + tooltip avec
    le message d'erreur.
  - `frontend/src/components/hub/StoryViewer.tsx` — panneau read-only
    en deux zones (D-B13). Lit `useArtifactsStore.selectedPath`,
    appelle `await ReadArtifact(path)`, puis :
    1. **Parser frontmatter** local (~30 lignes, regex
       `^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$`). Distingue
       scalaires (`key: value`) et listes (`key:` suivie de
       `  - item`). Quotes `'`/`"` strippées si entourantes.
       Pas de YAML imbriqué profond, suffisant pour le format SPDD.
       Aucune dep tierce ; `eval`/`Function` interdits.
    2. **`<FrontmatterHeader meta title>`** (sub-component) : rend
       au-dessus du body, sur un fond `bg-muted/20` séparé par un
       `border-b` :
       - `<h1>` avec le `title` du frontmatter (gros, semibold)
       - Pills compactes pour les scalaires dans l'ordre
         `id, slug, status, updated, created, owner` puis tout
         autre scalaire alphabétique. Pill `status` colorée selon
         valeur (palette STATUS_BADGE existante de `<HubList>`).
         Autres pills : `<key>: <value>` en monospace.
       - `<dl>` 2 cols pour les listes (`modules`, `depends-on`,
         `sibling-stories`, …) : chaque valeur en chip mono-spaced.
    3. **Body** : `body` (post-`---`) rendu via `react-markdown` :
       ```tsx
       <ReactMarkdown
         remarkPlugins={[remarkGfm]}
         disallowedElements={['script', 'iframe', 'object', 'embed']}
         unwrapDisallowed
       >
         {body}
       </ReactMarkdown>
       ```
    4. Si pas de frontmatter (regex ne match pas), rend
       `body = content` brut, header n'apparaît pas.
    5. Si erreur de lecture (path traversal ou file not exist),
       affiche un message d'erreur clair à la place du contenu.
  - `frontend/src/components/hub/ClaudeBanner.tsx` — banner persistant
    en haut de `<App />`, affiché ssi
    `useClaudeStore.status.Available === false`. Texte :
    *"Claude CLI not detected — install it to generate artifacts"*
    + lien vers `https://docs.anthropic.com/en/docs/claude-code/`.
    Si `Available && Err != ""` (cas où Version a échoué), affiche
    *"Claude CLI detected but version unreadable: <Err>"*. Sinon
    pas affiché.
- **Imports lucide-react** : `Folder`, `FileText`, `BookOpen`,
  `Lightbulb`, `ChevronLeft`, `ChevronRight`, `AlertCircle`,
  `RefreshCw`. Lib déjà dans `package.json` UI-001a.
- **Tests** : aucun en V1. Validation manuelle.

### O8 — Refactor `App.tsx` en layout 3-zones responsive

- **Module** : `frontend/src/App.tsx` (refactor complet)
- **Fichier** : `frontend/src/App.tsx`
- **Comportement** :
  1. State local `[collapsed, setCollapsed] = useState(false)` —
     source-of-truth unique, partagée avec `<Sidebar>` et
     `<SidebarToggle>`.
  2. Au mount (`useEffect` avec `[refreshClaude]`), invoque
     `useClaudeStore.refresh()` en async (non-bloquant pour le rendu)
  3. `useEffect` responsive : `window.matchMedia('(max-width: 767px)')`
     auto-positionne `collapsed` (true < 768px, false >= 768px).
     Listener `change` pour suivre les resize.
  4. Si `useProjectStore.projectDir === ''`, render `<ProjectPicker />`
     (full-screen)
  5. Sinon render le layout hub :
     ```tsx
     <main className="min-h-screen flex flex-col bg-background">
       <ClaudeBanner />
       <div className="flex flex-1 relative overflow-hidden">
         <Sidebar collapsed={collapsed} onSelect={() => setCollapsed(true)} />
         <div className="flex flex-1">
           <div className="absolute top-1 left-1 z-50">
             <SidebarToggle
               collapsed={collapsed}
               onToggle={() => setCollapsed(c => !c)}
             />
           </div>
           <section className="flex flex-1">
             <HubList className="w-1/2 lg:w-2/5 border-r" />
             <StoryViewer className="flex-1" />
           </section>
         </div>
       </div>
     </main>
     ```
  6. `<Sidebar>` reçoit `collapsed` (Tailwind `-translate-x-full`
     si true) + `onSelect` (callback fermeture auto en mode drawer
     mobile après pick d'un kind).
- **Tests** : validation manuelle via `wails dev -tags mock` :
  - Resize window de 1280 → 600 px : sidebar passe en drawer
  - Toggle manuel via SidebarToggle
  - Si projectDir vide : ProjectPicker
  - Sinon : layout hub avec banner conditionnel

---

## N — Norms

- **Logging Go** : `internal/uiapp.App` continue d'utiliser le
  `*slog.Logger` injecté. Pas de `fmt.Println` user-facing — tout
  retour passe par valeur de retour Go ou `slog.Info/Debug` côté
  observabilité.
- **Nommage Go** : méthodes bindées en PascalCase (Wails
  obligatoire). Champs internes lowercase (Go convention).
- **Erreurs Go** : sentinels exportés via wrap `%w` quand pertinent.
  Pas de nouveau sentinel dans uiapp (les erreurs sont propagées
  depuis CORE-001/CORE-004 ou créées inline pour cas locaux).
- **Tests Go** : `t.TempDir()`, table-driven là où ça fait sens
  (3 cas pour `GetClaudeStatus`). Mocks Wails runtime via
  function-pointer var (à finaliser en `/spdd-generate`).
- **TypeScript** : `strict: true` (déjà config UI-001a). Pas
  d'`any` non documenté. Imports relatifs depuis `wailsjs/go/main/App`
  uniquement (pas d'import absolu via Wails runtime API).
- **Tailwind** : pas d'arbitrary values en V1 (sticker palette).
  Breakpoints utilisés : `lg:` (>= 1024px) pour la sidebar fixe,
  `md:` (>= 768px) pour le toggle visible.
- **shadcn/ui** : continuité — les composants viennent du dossier
  `frontend/src/components/ui/` (button, card existants UI-001a).
  Si besoin de `Tooltip`, `Dropdown`, etc. : ajouter via `npx
  shadcn add tooltip` au moment du besoin.
- **react-markdown config** : `remarkPlugins={[remarkGfm]}`,
  `disallowedElements`, `unwrapDisallowed`. Pas d'override de
  composants markdown en V1 (rendu HTML standard).
- **Frontmatter parser** (`<StoryViewer>`) : implémentation maison
  scalaire + listes simples (regex + split de lignes). Format SPDD
  est volontairement plat ; pas besoin de gestion YAML complète
  (anchors, refs, mappings imbriqués). Aucun `eval`/`Function`/`new
  Function`. Si un format YAML plus riche émerge un jour, ouvrir
  une nouvelle story (re-discutera la dep `js-yaml`).
- **Zustand** : 1 store par concern (3 stores). Pas de mega-store.
  Pas d'imports croisés entre stores (Invariant I6).
- **Tests UI** : aucun en V1 (Playwright/Cypress = post-MVP).
  Validation manuelle via `wails dev -tags mock`.
- **CI** : aucun nouveau step. Le job `unit-tests` existant couvre
  `internal/uiapp/app_test.go` étendu, le job `ui-build` couvre
  le frontend (npm install + tsc + vite build).
- **Convention de commit** : `feat(uiapp)` pour O1-O3, `feat(ui)`
  pour O4-O8.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de modification de signature publique existante**
  - `Provider.CheckVersion` garde sa signature exacte. L'ajout de
    `Version` est strictement additif (Invariant I2).
  - `App.Greet` (UI-001a) reste en place — D-A6 du delta UI-001a
    le préserve dans un futur menu *About → Smoke test*.
  - `App.NewApp(p, logger)` signature inchangée.
  - Tests CORE-001 sur Provider passent **sans modification**.
- **Garde anti path-traversal obligatoire (Invariant I1)**
  - `ReadArtifact` rejette tout path qui ne commence pas par
    `filepath.Join(projectDir, "spdd")`. Implémenté avec
    `filepath.Abs` + `strings.HasPrefix`. **Aucun bypass** via
    flag, env var, ou option.
- **Pas de HTML brut dans le viewer markdown (Invariant I5)**
  - `react-markdown` configuré avec
    `disallowedElements={['script', 'iframe', 'object', 'embed']}`
    + `unwrapDisallowed`. **Aucun composant ne doit override**
    cette config.
- **Pas de mega-store Zustand (Invariant I6)**
  - 3 stores isolés. Aucun store ne doit en importer un autre.
    Si un store a besoin de l'état d'un autre, le composant qui
    consomme les deux le fait au render (pas au store level).
- **Pas de cache local des artefacts**
  - `useArtifactsStore` re-fetch à chaque `setKind` ou `refresh()`.
    Pas de cache mémoire qui pourrait afficher du stale post-CLI-write
    sur disque.
- **Pas de write côté `ReadArtifact`**
  - Read-only. Ne touche pas le filesystem en écriture.
- **Pas de feature flag, pas de retro-compat fictive**
  - Le canvas est la spec, le code la suit littéralement. Si
    quelque chose semble manquer, `/spdd-prompt-update` plutôt
    que TODO inline.
- **Pas de dépendance npm tierce au-delà des 2 ajoutées**
  - `react-markdown` + `remark-gfm` uniquement. Refusé : `marked`,
    `mdx-bundler`, `dompurify`, `js-yaml`, etc.
- **Frontmatter parser sans évaluation dynamique**
  - Le parser maison du `<StoryViewer>` ne doit jamais utiliser
    `eval`, `Function`, `new Function`, ni invoquer un parser YAML
    arbitraire chargé au runtime. Sa surface d'attaque doit rester
    nulle même si un fichier markdown contient du contenu hostile
    en frontmatter.
- **Pas de logging frontend bavard**
  - Les stores ne loggent pas via `console.log`. Erreurs stockées
    dans `error` field du store, affichées par les composants
    consumers (pas console).
- **Pas d'accès filesystem direct côté JS**
  - Tout passe par `ReadArtifact` (cf. D-B2). Pas de
    `runtime.???` filesystem natif Wails (qui n'existe pas en v2.12
    de toute façon).
- **Pas de Toast / Notification globale en V1**
  - L'auto-refresh post-`InitializeSPDD` (D-B11) est silencieux —
    le hub bascule visuellement, pas de toast. Toast component
    différé.
- **Sidebar responsive sans casser la version desktop**
  - Le toggle manuel et l'auto-collapse < 768px ne doivent pas
    altérer le rendu sur écran 1280px (sidebar visible par défaut).
    Test manuel obligatoire pre-merge.
- **Tests Go ne doivent pas dupliquer ceux de CORE-004**
  - `App.ListArtifacts` est testée pour la **délégation**, pas
    pour la logique de scan (couverte par `lister_test.go` CORE-004).
- **Pas de modification des fichiers UI-001a hors `App.tsx`**
  - `main.tsx`, `globals.css`, `lib/utils.ts`, `components/ui/*`
    restent intacts. Le scope UI-001b est strictement additif sur
    le scaffold UI-001a.

---

## Changelog

- **2026-05-01 — `R, E, A, S, O1, O2, O4, O7, O8, N, Safeguards`** —
  prompt-update post-implémentation pour intégrer :
  - **D-B13 (comportemental)** : `<StoryViewer>` extrait le frontmatter
    YAML et le rend en header structuré (titre, pills colorées,
    definition-list pour les listes), body markdown séparé. Parser
    maison ~30 lignes, pas de dep `js-yaml`. Nouveau Safeguard
    "frontmatter parser sans évaluation dynamique".
  - **D-B5b (refactor contraint Wails 2.12)** : `SelectProject` et
    `GetClaudeStatus` perdent le paramètre `ctx context.Context` ;
    utilisent `a.ctx` posé par `OnStartup`. Wails 2.12 ne ré-injecte
    pas auto le ctx (contre-doc). Nouvel invariant I3b.
  - **D-B8b (refactor)** : runtime path stub `window.go.uiapp.App`
    (et non `main`) — Wails dérive le namespace du package du struct
    bindé.
  - **MockProvider rename** : `VersionErr → CheckErr` (drive
    CheckVersion) ; nouveaux `VersionVal/VersionErr` pour `Version`.
    Rename interne au test-double, interface `Provider` inchangée.
  - **State `collapsed` lifté dans `App.tsx`** (O8) : props
    `collapsed`/`onToggle` sur `<SidebarToggle>` ; `collapsed`/`onSelect`
    sur `<Sidebar>`. Source-of-truth unique partagée.
  - Status remis à `reviewed` pour signaler que `/spdd-generate` doit
    régénérer (a minima O7) — les autres Operations sont déjà alignées
    par les fixes commités sur la branche `feature/UI-001b`.
