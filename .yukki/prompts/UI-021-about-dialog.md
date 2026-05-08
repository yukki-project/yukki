---
id: UI-021
slug: about-dialog
story: .yukki/stories/UI-021-about-dialog.md
analysis: .yukki/analysis/UI-021-about-dialog.md
status: implemented
created: 2026-05-09
updated: 2026-05-09
---

# Canvas REASONS — Dialog « À propos »

> Spécification exécutable. Source de vérité pour `/yukki-generate`
> et `/yukki-sync`. Toute divergence code ↔ canvas se résout
> dans ce fichier d'abord.

---

## R — Requirements

### Problème

Yukki desktop n'a aucun point d'accès in-app à sa version, son
commit, sa licence ou son repo GitHub. Conséquence : impossible
de signaler un bug avec un identifiant de version utile, et
l'utilisateur ne peut pas vérifier la licence depuis l'app.

### Definition of Done

- [ ] AC1 — Menu **Help** visible dans le TitleBar avec un item
      « À propos » qui ouvre le dialog.
- [ ] AC2 — Dialog affiche : nom yukki, version, commit SHA,
      date de build, lien GitHub, nom de la licence, liste des
      dépendances majeures + lien GitHub vers `package.json` /
      `go.mod`.
- [ ] AC3 — Lien GitHub ouvre le navigateur OS via
      `BrowserOpenURL` Wails (pas une iframe interne).
- [ ] AC4 — Bouton « Copier les infos » écrit version + commit
      + OS dans le presse-papier via `ClipboardSetText` Wails ;
      toast de confirmation s'affiche.
- [ ] AC5 — Si le binaire est compilé sans ldflags (`wails dev`),
      la version affichée est `dev` (pas une chaîne vide ni un
      crash).
- [ ] AC6 — Dialog se ferme via Échap ou clic en dehors ;
      raccourci `F1` (avec garde input) ouvre / ferme le dialog.
- [ ] AC7 — `yukki --version` (CLI) affiche la même version, le
      même commit et la même date de build que le dialog.
- [ ] La CI injecte les ldflags lors des `ui build` jobs (Win /
      macOS / Linux).

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `BuildInfo` | Triplet figé au build | `version`, `commitSHA`, `buildDate` | injecté au compile, lu au runtime |
| `HelpMenu` | Menu top-level dans le TitleBar | `items[]` | rendu permanent |
| `AboutDialog` | Modale qui affiche `BuildInfo` + métas | ouverture booléenne | mounté à l'ouverture, démouté à la fermeture |
| `KeyboardShortcut` | Liaison touche → callback | `key`, `handler` | binde au mount du composant racine, débinde au démount |
| `Dependency entry` | Ligne de la liste de dépendances majeures | `name`, `role` (UI / Build / PDF / …) | statique |

### Relations

- `BuildInfo` ⟶ `AboutDialog` : 1 vers 1 (singleton applicatif,
  consommé par le dialog).
- `HelpMenu` ⟶ `AboutDialog` : déclencheur d'ouverture (clic
  sur l'item « À propos »).
- `KeyboardShortcut(F1)` ⟶ `AboutDialog` : alternative au menu
  pour ouvrir / fermer.
- `AboutDialog` ⟶ `Dependency entry[]` : 1 vers N (~6-8
  entrées statiques).

### Invariants

- **I1 — Version `dev` fallback** : si `var version string` n'est
  jamais initialisée par les ldflags, l'app affiche `dev` partout
  (dialog + `--version`). Aucun crash, aucune chaîne vide.
- **I2 — Date de build UTC** : la `buildDate` injectée est
  systématiquement en UTC ISO-8601 (`date -u +%FT%TZ`).
- **I3 — Échappement strict** : le `commitSHA` (alphanumérique,
  source de build) est rendu via les composants `<Text>` /
  `<span>` standards, jamais via `dangerouslySetInnerHTML`.
- **I4 — Pas de réseau** : le dialog n'interroge aucune API
  externe. Toutes les valeurs sont statiques ou injectées au
  build.

---

## A — Approach

> Repris de l'analyse Y-Statement.

Trois variables globales `var version, commitSHA, buildDate
string` sont déclarées dans `main.go`, alimentées par
`-ldflags "-X main.version=… -X main.commitSHA=… -X
main.buildDate=…"` lors du `wails build`. Côté frontend, un
nouveau composant `HelpMenu` (calqué sur `FileMenu` existant)
est monté dans le `TitleBar` à côté du `FileMenu` et expose
trois items : « À propos », « Documentation », « Reporter un
bug ». L'item « À propos » ouvre un `AboutDialog` basé sur le
`Dialog` shadcn déjà présent ; le dialog lit les valeurs
injectées via une nouvelle binding Wails `App.GetBuildInfo()`,
expose un bouton « Copier » qui appelle `ClipboardSetText`, et
un lien GitHub qui appelle `BrowserOpenURL`. Un hook
`useKeyboardShortcut` minimal binde `F1` au niveau du shell
(avec garde « pas dans un input ») pour ouvrir / fermer.

### Alternatives écartées

- **B — `version.txt` via `go:embed`** : étape de génération
  redondante avec ldflags.
- **C — API GitHub runtime** : fragile offline + latence à
  l'ouverture.
- **D — About dans Settings (UI-020)** : couplage temporel +
  découvrabilité dégradée.
- **E — Raccourci clavier seul** : non découvrable.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `main.go` (racine) | `main.go` | modify : déclarer 3 vars + flag `--version` Cobra + binding Go `GetBuildInfo` |
| Script de build | `scripts/dev/ui-build.sh` | modify : passer les ldflags |
| CI | `.github/workflows/ci.yml` | modify : injecter les ldflags dans les 3 jobs `ui build (windows / macos / ubuntu)` |
| Bindings Wails | `internal/uiapp/about.go` (nouveau) | create : binding `App.GetBuildInfo() BuildInfo` |
| Stubs Wails frontend | `frontend/wailsjs/go/main/App.{d.ts,js}` | modify : ajouter `GetBuildInfo` |
| Stubs Wails runtime | `frontend/wailsjs/runtime/runtime.{d.ts,js}` | modify : ajouter `BrowserOpenURL`, `ClipboardSetText` |
| Hook clavier | `frontend/src/hooks/useKeyboardShortcut.ts` | create : hook minimal F1 avec garde input |
| Menu Help | `frontend/src/components/hub/HelpMenu.tsx` | create : dropdown shadcn 3 items |
| Dialog | `frontend/src/components/hub/AboutDialog.tsx` | create : dialog shadcn |
| TitleBar | `frontend/src/components/hub/TitleBar.tsx` | modify : monter `<HelpMenu />` |
| LICENSE | `LICENSE` | inchangé (Apache-2.0 déjà présent) |

### Schéma de flux

```
Build (CI ou local)
  └─> wails build -ldflags "-X main.version=… -X main.commitSHA=… -X main.buildDate=…"
        └─> binaire yukki avec vars peuplées

Runtime
  ┌─ CLI: yukki --version → stdout "yukki vX.Y.Z (commit ABC1234, built 2026-05-09T12:00:00Z)"
  └─ UI:
       TitleBar
         ├─ FileMenu
         └─ HelpMenu ─────────────────┐
              ├─ "À propos" ──────────┘  (clic)
              ├─ "Documentation"          → BrowserOpenURL(github README)
              └─ "Reporter un bug"        → BrowserOpenURL(github issues)
                                            ↓
                                    AboutDialog (shadcn Dialog)
                                       ├─ App.GetBuildInfo() → {version, commitSHA, buildDate}
                                       ├─ Render: nom, version, commit, date, license, deps
                                       ├─ Lien GitHub  → BrowserOpenURL(repo URL)
                                       ├─ "Copier"      → ClipboardSetText(formatted infos)
                                       └─ Esc / clic dehors / F1 → fermer

Hook
  useKeyboardShortcut('F1', handler)  monté au niveau App.tsx
    └─ event.target ∉ {input, textarea, contenteditable} → toggle dialog
```

---

## O — Operations

> 8 opérations dans l'ordre d'exécution recommandé. Backend Go
> d'abord pour poser la version, puis stubs Wails, puis hook,
> puis composants UI dans l'ordre top-down (HelpMenu →
> AboutDialog → TitleBar wiring).

### O1 — Variables de build et flag `--version` dans `main.go`

- **Module** : Go racine
- **Fichier** : `main.go`
- **Signature** :
  ```go
  // BuildInfo variables — populées via -ldflags au build.
  // Valeurs par défaut "dev" / "" si non injectées (build local
  // type `wails dev` ou `go run`).
  var (
      version    = "dev"
      commitSHA  = ""
      buildDate  = ""
  )

  func newRootCmd() *cobra.Command {
      root := &cobra.Command{
          Use:           "yukki",
          Short:         "SPDD toolkit: generate, evolve and sync structured prompt artifacts",
          SilenceUsage:  true,
          SilenceErrors: false,
          Version:       formatVersion(),  // active --version automatiquement
      }
      root.SetVersionTemplate("yukki {{.Version}}\n")
      root.AddCommand(newStoryCmd())
      root.AddCommand(newUICmd())
      return root
  }

  // formatVersion compose "vX.Y.Z (commit ABC1234, built
  // 2026-05-09T12:00:00Z)" avec fallback "dev" si version vide.
  func formatVersion() string
  ```
- **Comportement** :
  1. Déclarer les 3 vars au niveau package `main`.
  2. Activer `Version` sur le `rootCmd` Cobra (le flag
     `--version` devient automatique).
  3. `formatVersion()` retourne :
     - `dev` si `version == "" || version == "dev"` (cas
       développement).
     - `vX.Y.Z` si seul `version` est rempli.
     - `vX.Y.Z (commit <sha-tronqué>, built <date>)` si tous
       les champs sont remplis.
- **Tests** : `main_test.go` —
  - `TestFormatVersion_Dev` : vars zéro → `"dev"`.
  - `TestFormatVersion_FullInfo` : vars peuplées → format
    complet.
  - `TestFormatVersion_OnlyVersion` : commit / date vides →
    `vX.Y.Z` simple.
  Cf. [`testing-backend.md`](../methodology/testing/testing-backend.md).

### O2 — Binding Wails `App.GetBuildInfo`

- **Module** : `internal/uiapp/`
- **Fichier** : `internal/uiapp/about.go` (nouveau)
- **Signature** :
  ```go
  package uiapp

  // BuildInfo is the typed payload returned to the frontend.
  type BuildInfo struct {
      Version   string
      CommitSHA string
      BuildDate string
  }

  // GetBuildInfo returns the build-time variables injected via
  // ldflags into the main package. The frontend consumes this
  // via the AboutDialog. Returns "dev" / "" when the build was
  // not stamped (e.g. `wails dev`).
  func (a *App) GetBuildInfo() BuildInfo
  ```
- **Comportement** :
  1. Lire les variables exportées (à exposer via un getter
     dans `main` package, par exemple `main.Version()`,
     `main.CommitSHA()`, `main.BuildDate()` — ou plus simple,
     paramètres passés à `NewApp` au démarrage).
  2. Préférer la 2ᵉ option : `NewApp` reçoit en paramètre
     `info BuildInfo`, le stocke, le retourne. Évite la
     dépendance circulaire `internal/uiapp` → `main`.
  3. Retourner la struct.
- **Tests** : `internal/uiapp/about_test.go` —
  - `TestGetBuildInfo_FullInfo` : injection valeurs connues →
    payload identique.
  - `TestGetBuildInfo_DevDefault` : injection valeurs vides →
    `Version = "dev"`, `CommitSHA = ""`, `BuildDate = ""`.

### O3 — Injection ldflags dans le script de build

- **Module** : Scripts dev
- **Fichier** : `scripts/dev/ui-build.sh`
- **Signature** : modifier la commande `wails build` :
  ```bash
  YUKKI_VERSION="${YUKKI_VERSION:-dev}"
  YUKKI_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '')"
  YUKKI_DATE="$(date -u +%FT%TZ)"
  LDFLAGS="-X main.version=${YUKKI_VERSION} \
           -X main.commitSHA=${YUKKI_COMMIT} \
           -X main.buildDate=${YUKKI_DATE}"

  wails build -tags mock -skipbindings -ldflags "${LDFLAGS}" ...
  ```
- **Comportement** :
  1. `git rev-parse --short HEAD` capture le SHA tronqué (7
     chars) ; échec silencieux → `""` (cas shallow clone).
  2. `date -u +%FT%TZ` capture la date UTC ISO-8601.
  3. `YUKKI_VERSION` peut être surchargée par variable
     d'environnement (utilisée par la CI release).
  4. Les ldflags sont passés au `wails build` via le flag
     `-ldflags` officiel Wails CLI.
- **Tests** : pas de test unitaire (script bash), validation
  manuelle :
  - Build local : `./build/bin/yukki --version` retourne
    `yukki vX.Y.Z (commit ABCDEFG, built 2026-05-09T…)`.

### O4 — Stubs Wails frontend

- **Module** : Frontend bindings
- **Fichier** : `frontend/wailsjs/go/main/App.{d.ts,js}` +
  `frontend/wailsjs/runtime/runtime.{d.ts,js}`
- **Signature** (additions) :
  ```typescript
  // App.d.ts — ajouter
  export function GetBuildInfo(): Promise<BuildInfo>;
  export interface BuildInfo {
    Version: string;
    CommitSHA: string;
    BuildDate: string;
  }

  // runtime.d.ts — ajouter
  export function BrowserOpenURL(url: string): void;
  export function ClipboardSetText(text: string): Promise<boolean>;
  ```
- **Comportement** : stubs manuels (workaround AV
  `-skipbindings`) qui appellent
  `window['go']['main']['App']['GetBuildInfo']()` et
  `window['runtime']['BrowserOpenURL']` / `['ClipboardSetText']`.
- **Tests** : N/A (stubs JS).

### O5 — Hook clavier `useKeyboardShortcut`

- **Module** : Frontend hooks
- **Fichier** : `frontend/src/hooks/useKeyboardShortcut.ts`
- **Signature** :
  ```typescript
  /**
   * Binde une touche clavier au niveau document. Ignore les
   * events dont la cible est un input / textarea /
   * contenteditable pour ne pas voler les touches dans les
   * formulaires.
   */
  export function useKeyboardShortcut(
    key: string,
    handler: (event: KeyboardEvent) => void,
  ): void;
  ```
- **Comportement** :
  1. `useEffect(() => { ... }, [key, handler])` qui ajoute un
     listener `keydown` sur `document`.
  2. Le listener vérifie `event.key === key`.
  3. Si la cible (`event.target`) est un `HTMLInputElement`,
     `HTMLTextAreaElement`, ou un élément
     `[contenteditable]`, on **n'appelle pas** le handler.
  4. Sinon, `event.preventDefault()` + `handler(event)`.
  5. Cleanup : `removeEventListener` au démount.
- **Tests** :
  `frontend/src/hooks/useKeyboardShortcut.test.tsx` —
  - `triggers handler on matching key outside input` : render
    un composant test, dispatch `keydown` F1 → handler appelé.
  - `ignores when focus is in input` : render avec un input
    focus, dispatch F1 → handler NON appelé.
  - `cleans up on unmount` : unmount → dispatch F1 → handler
    NON appelé (listener retiré).
  Cf. [`testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O6 — Composant `HelpMenu`

- **Module** : Frontend hub
- **Fichier** : `frontend/src/components/hub/HelpMenu.tsx`
- **Signature** :
  ```tsx
  /**
   * Menu top-level "Help" dans le TitleBar. Calqué sur le
   * pattern de FileMenu (DropdownMenu shadcn). Trois items
   * livrés : "À propos" (ouvre AboutDialog),
   * "Documentation" (BrowserOpenURL → README GitHub),
   * "Reporter un bug" (BrowserOpenURL → issues GitHub).
   */
  export function HelpMenu(): JSX.Element;
  ```
- **Comportement** :
  1. Wrap dans `<DropdownMenu>` shadcn avec `<DropdownMenuTrigger
     asChild>` sur un `<Button variant="ghost">` portant le
     label « Help ».
  2. `<DropdownMenuContent align="start">` avec 3
     `<DropdownMenuItem>`.
  3. État `aboutOpen` géré localement (useState) — ouvre
     `AboutDialog`.
  4. URLs GitHub : constantes
     `https://github.com/yukki-project/yukki` et
     `https://github.com/yukki-project/yukki/issues`.
- **Tests** : `frontend/src/components/hub/HelpMenu.test.tsx` —
  - `renders the menu trigger labeled Help`.
  - `clicking À propos opens AboutDialog` (mock du sub-composant).
  - `clicking Reporter un bug calls BrowserOpenURL` (mock du
    binding).

### O7 — Composant `AboutDialog`

- **Module** : Frontend hub
- **Fichier** : `frontend/src/components/hub/AboutDialog.tsx`
- **Signature** :
  ```tsx
  export interface AboutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  export function AboutDialog(props: AboutDialogProps): JSX.Element;
  ```
- **Comportement** :
  1. Récupère `BuildInfo` via `App.GetBuildInfo()` au mount
     (useEffect sur `open === true`).
  2. Affiche : nom yukki, version, commit, date de build,
     lien GitHub cliquable, ligne « Apache-2.0 — Voir le
     fichier LICENSE » avec lien GitHub vers le fichier,
     liste statique de 7-8 dépendances majeures (Wails v2,
     React 18, Tiptap, @react-pdf/renderer, Vite, Tailwind,
     Zustand) + lien « Voir toutes les dépendances » qui
     pointe vers `package.json` et `go.mod` du repo.
  3. Bouton « Copier » : compose une chaîne
     `yukki vX.Y.Z\nCommit: ABC1234\nBuilt: …\nOS: …`
     (l'OS est récupéré via `navigator.userAgent` ou laissé
     vide), appelle `ClipboardSetText`, montre un toast
     `useToast({ title: "Infos copiées" })`.
  4. Esc / clic dehors géré par Dialog shadcn.
  5. Si `BuildInfo.Version === "dev"`, afficher un badge
     « build de développement » à côté de la version.
- **Tests** :
  `frontend/src/components/hub/AboutDialog.test.tsx` —
  - `renders version and commit when build info is provided`.
  - `shows "dev" badge when version is "dev"`.
  - `clicking copy calls ClipboardSetText with formatted infos`.
  - `clicking GitHub link calls BrowserOpenURL`.
  - `closes when Escape is pressed` (via Dialog shadcn).

### O8 — Wiring dans `TitleBar`

- **Module** : Frontend hub
- **Fichier** : `frontend/src/components/hub/TitleBar.tsx`
- **Signature** : modifier le composant existant pour
  monter `<HelpMenu />` à côté de `<FileMenu />`. Aussi
  monter `useKeyboardShortcut('F1', toggleAbout)` au niveau
  shell ou App si plus pertinent.
- **Comportement** :
  1. Importer `HelpMenu` et le rendre après `FileMenu` dans
     la zone gauche du TitleBar.
  2. Le hook clavier F1 peut vivre dans `App.tsx` plutôt que
     `TitleBar.tsx` (cible plus haute) — à arbitrer dans la
     génération.
- **Tests** : `frontend/src/components/hub/TitleBar.test.tsx`
  (à étendre si déjà présent) —
  - `renders both FileMenu and HelpMenu`.

---

## N — Norms

> Adaptées au contexte yukki desktop : Go + React + Wails,
> pas de CRD K8s, pas d'OIDC, pas de docs Antora pour cette
> story (DOC-003 viendra plus tard).

- **Logging** : Go via `slog` (pattern existant) — un info
  log à chaque démarrage `slog.Info("about info", "version",
  v, "commit", c, "buildDate", d)`. Frontend : pas de log
  particulier, utilisation de `useToast` pour le feedback
  utilisateur (succès du copier).
- **Sécurité** : pas de `dangerouslySetInnerHTML`. Le SHA est
  alphanumérique, mais on échappe quand même via les
  composants React standards. Liens GitHub en dur dans le
  code, pas construits depuis user input.
- **Tests** : pyramide unit > integration. Vitest côté
  frontend (3 hooks tests + 3 composants tests), `go test`
  côté Go (formatVersion + GetBuildInfo). Pas d'e2e
  spécifique. Cf.
  [`testing-frontend.md`](../methodology/testing/testing-frontend.md)
  et
  [`testing-backend.md`](../methodology/testing/testing-backend.md).
- **Nommage** : `HelpMenu` / `AboutDialog` cohérent avec
  `FileMenu` / `NewStoryModal` existants. Hook
  `useKeyboardShortcut` en camelCase, fichier `.ts` (pas
  `.tsx` car pas de JSX).
- **Observabilité** : pas de Micrometer / OTel. Le `slog`
  desktop suffit. Si `OPS-001` est déjà livré, `GetBuildInfo`
  est appelé dans le panneau d'erreur pour aider le
  diagnostic.
- **i18n** : tous les textes UI en français (cohérent avec
  l'app actuelle). Si META-006 est livrée, ces chaînes
  seront extraites dans `fr.json` plus tard.
- **Docs** : pas de doc Antora à mettre à jour (DOC-003
  viendra). Le glossaire de DOC-003 mentionnera
  `BuildInfo`, `HelpMenu`, `AboutDialog`.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit
> pas** faire.

- **Sécurité**
  - **Ne jamais** rendre le `commitSHA` ou la `buildDate`
    via `dangerouslySetInnerHTML` ni les passer à
    `eval()`.
  - **Ne jamais** appeler `BrowserOpenURL` avec une URL
    construite depuis user input. Les seules URLs sont les
    constantes vers `github.com/yukki-project/yukki/...`.
  - **Ne jamais** stocker la chaîne copiée
    (`ClipboardSetText`) dans un log persistant.

- **Compatibilité**
  - **Ne pas** modifier la signature de `NewApp` sans
    propager partout (notamment `cmd/yukki/ui.go` ou
    équivalent qui instantie l'App).
  - **Ne pas** casser les bindings Wails existants
    (`SelectProject`, `ListArtifacts`, …) — `GetBuildInfo`
    est un ajout, pas un remplacement.
  - **Ne pas** retirer ni renommer `LICENSE` à la racine
    (Apache-2.0 doit rester accessible).

- **Performance**
  - **Ne pas** charger le `BuildInfo` au démarrage de l'app
    (lazy au mount du dialog) — évite d'alourdir le startup.
  - **Ne pas** binder le hook clavier au-dessus du `<main>`
    de l'App (sinon il capture aussi les événements pendant
    qu'aucun projet n'est ouvert, ce qui est OK mais
    documenté).

- **Périmètre**
  - **Ne jamais** introduire un mécanisme d'auto-update ou
    de check de version distant — Scope Out story.
  - **Ne pas** afficher la liste exhaustive des dépendances
    (juste les majeures + lien GitHub) — Scope Out story
    (Q4).
  - **Ne pas** intégrer le toggle Mode debug (OPS-001) dans
    le HelpMenu — il vit dans le FileMenu / Settings
    (UI-020).
  - **Ne pas** faire de l'AboutDialog un composant qui se
    monte au démarrage de l'app — montage lazy au clic
    uniquement.
