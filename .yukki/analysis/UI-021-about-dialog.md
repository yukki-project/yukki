---
id: UI-021
slug: about-dialog
story: .yukki/stories/UI-021-about-dialog.md
status: draft
created: 2026-05-08
updated: 2026-05-08
---

# Analyse — Dialog "À propos" (version, GitHub, license, crédits)

> Contexte stratégique pour la story `UI-021-about-dialog`. Produit
> par `/yukki-analysis` à partir d'un scan ciblé du codebase
> (TitleBar, FileMenu, main.go, ui-build.sh, runtime stub Wails,
> Dialog shadcn).

## Mots-clés métier extraits

`About dialog`, `Help menu` (TitleBar), `version` / `commit SHA` /
`build date`, `ldflags injection`, `GitHub link` (BrowserOpenURL),
`Apache-2.0 license`, `dependencies` (statique + lien GitHub),
`Copy to clipboard` (ClipboardSetText), `F1 / Esc shortcut`,
`yukki --version` (Cobra).

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **Cobra `rootCmd`** (Entity) — `main.go` racine du repo (pas
  `cmd/yukki/main.go` comme indiqué initialement). Le `rootCmd`
  ajoute `newStoryCmd()` et `newUICmd()`. Aucun flag `--version`
  exposé pour l'instant.
- **TitleBar** (Entity composite) —
  `frontend/src/components/hub/TitleBar.tsx` : conteneur flex
  (logo + FileMenu à gauche, window controls à droite). Convention
  : chaque menu top-level est un composant autonome injecté
  comme enfant.
- **FileMenu** (patron de référence) —
  `frontend/src/components/hub/FileMenu.tsx` : utilise
  `DropdownMenu` shadcn (Radix), `useState(false)` pour l'état,
  contenu `align="start"`. HelpMenu suivra ce patron.
- **shadcn Dialog** (Integration point) —
  `frontend/src/components/ui/dialog.tsx` : `Dialog` /
  `DialogTrigger` / `DialogContent` / `DialogHeader` /
  `DialogTitle` / `DialogDescription`. Déjà utilisé par
  `StoryViewer.tsx`. Réutilisable tel quel.
- **Wails runtime stub** (Integration point) —
  `frontend/wailsjs/runtime/runtime.d.ts` : workaround AV qui
  expose `WindowMinimise` / `WindowToggleMaximise` / `Quit`.
  **Manque** `BrowserOpenURL` et `ClipboardSetText`.
- **LICENSE Apache-2.0** — fichier `LICENSE` à la racine, texte
  complet (202 lignes). Aligné avec DOC-002.

### Nouveaux (à introduire)

- **`BuildInfo`** (Value Object) — triplet
  `{ version, commitSHA, buildDate }` injecté au build via
  `-X main.version=... -X main.commitSHA=... -X main.buildDate=...`
  Variables globales `var version, commitSHA, buildDate string`
  déclarées dans `main.go`. Source de vérité pour le dialog
  ET pour `yukki --version`.
- **`HelpMenu`** (Entity composite) — composant top-level dans
  TitleBar, copie adaptée de `FileMenu`, contient un seul item
  initial « À propos » (extensible vers Documentation / Bug
  report en suivi).
- **`AboutDialog`** (Entity) — `Dialog` shadcn enrobant le
  contenu (logo, BuildInfo, lien GitHub, license, dépendances
  statiques + lien). Ouverture déclenchée depuis HelpMenu ou
  par le hook clavier F1.
- **Hook `useKeyboardShortcut`** (Service) — petit hook React
  qui binde une touche (ex. `F1`) à un callback, en respectant
  le focus (pas de déclenchement quand un input est focus).
- **Domain event `aboutDialogOpened`** — pas de persistance, juste
  un signal interne (Zustand ou state local) pour ouvrir/fermer
  la modale.

### Invariants

- **I1 — version par défaut** : si `var version string` n'est
  jamais initialisée (build local sans ldflags, `wails dev`),
  la valeur affichée est `dev` (ou `unknown`), jamais une chaîne
  vide ou un crash (cf. AC4 story).
- **I2 — buildDate UTC** : la date de build est toujours en UTC
  pour la reproductibilité — pas de timezone locale qui ferait
  varier l'affichage selon où le binaire a été compilé.
- **I3 — pas de PII dans le dialog** : aucune info utilisateur
  (path home, email) n'apparaît — uniquement les constantes de
  build et les statiques de l'app.

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *l'absence de point d'accès dans l'app à la
version / commit / license / GitHub repo* (impossible aujourd'hui
de signaler proprement un bug ou de connaître la licence depuis
yukki), **on choisit** *d'injecter trois variables globales via
ldflags Go au build, exposées par un nouveau menu Help dans le
TitleBar qui ouvre un AboutDialog basé sur le `Dialog` shadcn
existant*, **plutôt que** *(B) embarquer un `version.txt` via
go:embed (étape de génération en plus, double source de vérité),
(C) lire dynamiquement depuis l'API GitHub à l'exécution
(fragile : pas de réseau garanti), (D) intégrer l'About dans la
page Settings UI-020 (couplage temporel + découvrabilité dégradée),*
**pour atteindre** *un standard d'app desktop découvrable + une
infra ldflags réutilisée par OPS-002 (release pipeline) + une
maintenance minimale (3 vars Go + 1 menu + 1 dialog + 2 stubs
Wails à compléter)*, **en acceptant** *l'ajout de boilerplate Go
(3 lignes), une modification du script `ui-build.sh` pour passer
les ldflags, et la dette transitoire d'enrichir manuellement le
stub `runtime.d.ts` (workaround AV `-skipbindings`) pour exposer
`BrowserOpenURL` et `ClipboardSetText`.*

### Alternatives écartées

- **B — `version.txt` via `go:embed`** : ajoute une étape de
  génération du fichier au build, double source de vérité avec
  les ldflags Go ; pas d'avantage sur ldflags purs.
- **C — Lire l'API GitHub au runtime** : nécessite un accès
  réseau qui n'est pas garanti dans tous les contextes (offline,
  air-gapped) ; latence visible à l'ouverture du dialog.
- **D — About dans la page Settings (UI-020)** : couple UI-021
  à UI-020 (Settings doit exister avant), et casse la
  découvrabilité (l'utilisateur ne va pas dans Settings pour
  trouver la version — il cherche Help → About).
- **E — Raccourci clavier seul (F1)** : pas découvrable, l'app
  ne peut pas se documenter elle-même.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `main.go` (racine) | faible | modify : ajout `var version, commitSHA, buildDate string` + flag `--version` Cobra |
| `scripts/dev/ui-build.sh` | faible | modify : capturer SHA / date et passer `-ldflags "-X main.version=… -X main.commitSHA=… -X main.buildDate=…"` au `wails build` |
| `.github/workflows/ci.yml` | faible | modify : injecter les mêmes ldflags dans les jobs `ui build` (coordonné avec OPS-002) |
| `frontend/src/components/hub/TitleBar.tsx` | faible | modify : ajouter `<HelpMenu />` à côté de `<FileMenu />` |
| `frontend/src/components/hub/HelpMenu.tsx` | moyen | create : DropdownMenu shadcn calqué sur FileMenu, item « À propos » |
| `frontend/src/components/hub/AboutDialog.tsx` | moyen | create : Dialog shadcn avec BuildInfo, lien GitHub, license, dépendances |
| `frontend/wailsjs/runtime/runtime.d.ts` | faible | modify : ajout signatures `BrowserOpenURL(url: string): void` et `ClipboardSetText(text: string): void` |
| `frontend/wailsjs/runtime/runtime.js` | faible | modify : exposer ces deux fonctions via le pont Wails (idem stub JS) |
| `frontend/src/hooks/useKeyboardShortcut.ts` | faible | create : hook minimal `(key, callback) => void` respectant le focus input |
| `wails.json` | aucun | inchangé (Wails n'injecte pas les ldflags via config) |
| `LICENSE` | aucun | déjà présent (Apache-2.0), juste référencé |

## Dépendances et intégrations

- **`@radix-ui/react-dialog`** (déjà installé via shadcn) — base
  du `Dialog`.
- **Wails v2 runtime** : `BrowserOpenURL` (lance le navigateur OS
  par défaut sur l'URL passée) et `ClipboardSetText` (écrit dans
  le presse-papier OS). Built-in dans Wails — il faut juste les
  exposer dans le stub local (workaround AV `-skipbindings`).
- **`git rev-parse --short HEAD`** au build pour le commit SHA.
- **`date -u +%FT%TZ`** au build pour la date UTC ISO-8601.
- **Pas d'API externe au runtime**, pas de CRD K8s, pas de réseau.

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Sécurité (STRIDE — minimal)** : surface quasi-nulle car les
  valeurs affichées sont hardcodées au build, pas
  user-controlled. Seul vecteur résiduel : injection HTML dans
  un commit SHA mal échappé. *Probabilité* : faible (le SHA est
  alphanumérique). *Mitigation* : utiliser `<Text>` React qui
  échappe automatiquement, jamais `dangerouslySetInnerHTML`.

- **Opérationnel — ldflags non appliqués** : si le script de
  build est utilisé sans les ldflags (dev local rapide,
  contributeur qui appelle `wails build` à la main), `version`
  reste vide. *Impact* : dialog affiche `dev` au lieu d'une
  vraie version. *Probabilité* : haute en dev local. *Mitigation*
  : valeur fallback explicite dans le code Go (`if version == ""
  { version = "dev" }`) — couvert par AC4 story.

- **Data — `git rev-parse` échoue** : CI avec shallow clone, ou
  build dans un dossier sans `.git`. *Impact* : commitSHA vide.
  *Probabilité* : moyenne (CI shallow clone est commun).
  *Mitigation* : capturer l'erreur dans le script de build et
  passer `unknown` plutôt qu'une chaîne vide.

- **Intégration — stub `runtime.d.ts` divergent** : si Wails
  régénère le stub un jour (exclusion AV obtenue), nos ajouts
  manuels seront écrasés. *Impact* : régression silencieuse
  (BrowserOpenURL / ClipboardSetText disparaissent). *Probabilité*
  : moyenne. *Mitigation* : commenter clairement dans le stub
  que les fonctions ajoutées sont built-in Wails (donc cohérentes
  avec ce que Wails régénérera).

- **Compatibilité — F1 capté par WebView2** : sur Windows, la
  touche F1 est parfois interceptée par le WebView2 (aide
  système). *Impact* : le hook ne se déclenche pas. *Probabilité*
  : moyenne. *Mitigation* : préférer `Ctrl+?` ou un autre
  raccourci, ou capturer F1 via `event.preventDefault()` dans
  le handler.

## Cas limites identifiés

> Détectés via BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Build sans `git` dans le PATH** ou sans `.git/` accessible
  (shallow clone CI) → commitSHA `unknown`, build continue.
- **Build en `wails dev`** (pas de ldflags) → version `dev`,
  commitSHA `unknown`, buildDate `unknown` ; dialog reste
  fonctionnel.
- **F1 capté par le WebView2** ou conflit avec un autre composant
  qui binde F1 → bouton du HelpMenu reste l'accès principal.
- **`BrowserOpenURL` échoue** (sandbox / WebView2 restrictif) →
  toast utilisateur signalant l'erreur, lien copié dans le
  presse-papier comme fallback ?
- **`ClipboardSetText` refusé** (rare, sandbox) → toast d'erreur,
  l'utilisateur peut sélectionner / copier manuellement le texte
  affiché.
- **Date de build en timezone locale** au lieu d'UTC →
  incohérence d'affichage d'un build à l'autre (un dev en CET
  vs un autre en JST). Forcer `date -u`.

## Decisions à prendre avant le canvas

> Les 4 OQ de la story sont déjà tranchées (cf. story `reviewed`).
> Voici les décisions résiduelles soulevées par l'analyse.

- [ ] **Format du `--version` CLI** : `yukki --version` (flag global
      Cobra `rootCmd.Version`) ou `yukki version` (sous-commande
      dédiée) ? Le flag est plus standard et 1 ligne ; la
      sous-commande permet une sortie structurée si besoin futur.
      → recommandation : flag.
- [ ] **Scope du hook clavier** : global (binde au document) ou
      scoped (binde au composant root et descend) ? Trade-off :
      global capture partout mais peut conflicter avec les inputs ;
      scoped respecte mieux le focus mais risque de rater l'event
      hors focus. → recommandation : global avec garde
      `event.target` pas dans `input` / `textarea` / `[contenteditable]`.
- [ ] **Items du HelpMenu dès UI-021** : juste « À propos » ou
      aussi « Documentation » (lien README GitHub) et « Reporter
      un bug » (lien Issues GitHub) ? Trois items d'un coup
      donnent un menu vivant ; un seul = MVP plus simple. →
      recommandation : 3 items dès UI-021, marginal en effort.
- [ ] **Cohérence version `package.json` ↔ Go** : la version
      doit-elle aussi apparaître dans `frontend/package.json` (pour
      les outils npm) ? Si oui, qui la met à jour (script de
      release ?) ? → recommandation : reporter à OPS-002 si besoin,
      la version Go est la source de vérité pour cette story.
