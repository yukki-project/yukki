---
id: UI-007
slug: custom-titlebar-dark
story: .yukki/stories/UI-007-custom-titlebar-dark.md
status: synced
created: 2026-05-02
updated: 2026-05-06
---

# Analyse — UI-007 — Custom title bar minimaliste yukki dark

> Story de polish post-UI-006 — passe la fenêtre Wails en frameless et
> ajoute une title bar HTML/CSS de 32px cohérente avec la palette
> yukki dark. La story a déjà tranché 6 OQ (toutes orientées VS Code)
> avant analyse, donc cette analyse se concentre sur les D-D décisions
> architecturales révélées par le scan du code.

## Mots-clés métier extraits

`frameless`, `WindowOptions`, `wails.json`, `WindowMinimise`,
`WindowToggleMaximise`, `WindowIsMaximised`, `Quit`, `appicon`,
`--wails-draggable`, `<TitleBar />`, `App.tsx`, `lucide-react`,
`WebView2`, `build/appicon.png`.

## Concepts de domaine

### Existants (déjà dans le code)

- **`wails.Run(&options.App{...})`** — `ui.go:43-53` (root). Lance la
  fenêtre Wails. Options actuelles : `Title: "yukki"`, `Width: 1280`,
  `Height: 800`, `AssetServer`, `OnStartup/OnShutdown`, `Bind`. Pas de
  `Frameless` ni de `Windows: &windows.Options{...}`. Import :
  `github.com/wailsapp/wails/v2/pkg/options` (Wails v2.12.0).
- **Bindings runtime Wails** —
  `frontend/wailsjs/wailsjs/runtime/runtime.d.ts`. Exporte (signatures
  exactes) :
  - `WindowMinimise(): void`
  - `WindowToggleMaximise(): void`
  - `WindowIsMaximised(): Promise<boolean>`
  - `WindowMaximise() / WindowUnmaximise() / WindowSetTitle(s)`
    (bonus, non utilisés en V1)
  - `Quit(): void` — **pas** de `WindowClose()` ; on utilise `Quit`
    pour fermer l'app.
- **`build/appicon.png`** — convention Wails. Déjà remplacé par le
  logo lapin yukki (1254×1254). Wails régénère
  `build/windows/icon.ico` (21 KB) automatiquement à la compile —
  pas de config explicite dans `wails.json`.
- **`<App />` post-UI-006** — `frontend/src/App.tsx:23-32`. Layout
  actuel :
  ```tsx
  <main className="min-h-screen flex flex-col bg-background text-foreground">
    <ClaudeBanner />
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar />
      <SidebarPanel />
      <section className="flex flex-1 overflow-hidden">
        <StoryViewer className="flex-1" />
      </section>
    </div>
  </main>
  ```
  Point d'insertion UI-007 : **avant** `<ClaudeBanner />` (premier
  enfant du `<main>`).
- **`<ClaudeBanner />`** — `frontend/src/components/hub/ClaudeBanner.tsx`.
  Composant conditionnel (return null si Claude détecté + version OK).
  Affiche une bande amber d'environ 32px (`py-2` + `text-sm`).
  N'occupe pas de place quand Claude est OK. Pas d'overlap à
  craindre avec une title bar 32px posée au-dessus.
- **`<ActivityBar />` (UI-006)** — pattern de référence.
  `<aside className="flex w-13 flex-col border-r border-border bg-card">`.
  Boutons `text-muted-foreground hover:bg-accent hover:text-foreground`
  + indicateur actif `bg-primary` + icônes lucide-react `h-5 w-5` +
  Tooltip Radix `delayDuration={300}`. Patterns à reproduire en
  horizontal pour la title bar.
- **`<Button />` shadcn** — `frontend/src/components/ui/button.tsx`.
  Variants `default | destructive | outline | secondary | ghost | link`
  ; sizes `default | sm | lg | icon`. **`ghost` + `icon`** sera utilisé
  pour les 3 boutons fenêtre.
- **`lucide-react`** — `^0.453.0` dans `frontend/package.json:17`.
  Icônes utilisables pour la title bar : `Minus`, `Square`,
  `Maximize2`, `X`. Déjà déps depuis UI-001a.
- **`<html class="dark">`** — `frontend/index.html:2`. Forcé V1
  (UI-006). Pas besoin d'y revenir.
- **CSS palette yukki dark** — `frontend/src/styles/globals.css:36-64`.
  `bg-card` (#1F1F26), `bg-background` (#1A1A1F), `text-foreground`
  (#F0F0F2), `text-muted-foreground` (#9CA3AF), `bg-accent` (#3B3B46),
  `text-destructive` / `bg-destructive` (rouge), `bg-primary`
  (violet #8B5CF6).
- **Tooltip Radix** — `frontend/src/components/ui/tooltip.tsx`. Utilisé
  par ActivityBar UI-006. Disponible pour tooltips minimize / maximize
  / close si on en veut (D-D à trancher).
- **Subcommand `ui`** — `cmd/yukki/ui.go` ou `ui.go` racine, variantes
  par tag `ui_mock.go` / `ui_prod.go`. La struct App injecte le
  provider (Claude réel ou mock). Aucune variante ne touche la config
  Wails — le frameless sera appliqué une seule fois dans `ui.go`
  (commun aux deux variantes).

### Nouveaux (à introduire)

- **`<TitleBar />` composant** — `frontend/src/components/hub/TitleBar.tsx`
  (nouveau). Bande horizontale 32px en haut du `<main>`, premier enfant.
  Layout : `flex items-center justify-between`. Gauche : logo
  (`<img src="@/assets/yukki-logo.png" />` 20×20) + label "yukki".
  Droite : 3 boutons fenêtre `<Button variant="ghost" size="icon">`
  avec icônes `Minus` / `Square` (ou `Maximize2`) / `X`. Bouton close
  hover destructive (`hover:bg-destructive hover:text-destructive-foreground`).
- **CSS `--wails-draggable: drag`** — appliqué sur la zone vide
  centrale de la title bar (entre logo+label et boutons), via
  `style={{ '--wails-draggable': 'drag' }}` ou classe Tailwind
  custom dans `globals.css`. **Pas** sur les boutons (ils doivent
  rester cliquables) ni sur le logo (à valider). Wails runtime
  intercepte le drag automatiquement, pas de JS event listener.
- **`Frameless: true`** dans `options.App` — modification minimale de
  `ui.go`. Ajout d'une ligne. Le `Title` reste défini mais devient
  invisible (pas de chrome native pour l'afficher).
- **Logo asset frontend** — `frontend/src/assets/yukki-logo.png`
  (déjà committé en story review). Importé via `@/assets/yukki-logo.png`
  ou `import logo from '@/assets/yukki-logo.png'`. Vite gère le
  bundling avec hash.
- **Hook `useWindowMaximised`** (optionnel V1) — petit hook React qui
  écoute `WindowIsMaximised()` au mount + sur les events maximize/restore
  pour switcher l'icône `Square` ↔ `Maximize2` (pattern VS Code). Si
  trop complexe en V1, on garde `Square` figé et on règle ça en UI-007.5.
  → **D-D à trancher**.

## Approche stratégique

UI-007 livre la title bar custom yukki dark en **deux modifications
minimales et indépendantes** :

1. **Côté Go (1 ligne)** : `Frameless: true` dans `options.App` au
   `ui.go`. Aucun import nouveau, aucune binding nouvelle, aucun
   refactor. C'est le seul changement Go (lève l'Invariant I5
   d'UI-006 comme prévu dans la story).

2. **Côté frontend (1 nouveau composant + 1 ligne dans App.tsx)** :
   `<TitleBar />` posé en premier enfant du `<main>` au-dessus de
   `<ClaudeBanner />`. Le composant consomme directement les bindings
   `WindowMinimise / WindowToggleMaximise / Quit` exposés dans
   `wailsjs/wailsjs/runtime/runtime.d.ts` (pas besoin de wrapper dans
   un store Zustand — pas d'état partagé).

Réutilise tout le pattern UI-006 (palette CSS vars, Button shadcn,
Tooltip Radix, lucide-react). Aucun nouveau store, aucune nouvelle
dépendance. La nature mono-fichier de chacune des deux modifications
limite drastiquement la surface de risque : si frameless casse sur
une plateforme spécifique, on revient en arrière en supprimant 1
ligne Go.

L'icône maximize/restore est laissée **figée** sur `Square` en V1
(reco par défaut D-D à confirmer) ; le polish "icône change selon
état" est différé pour ne pas alourdir le scope.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `root` (Go) | **faible** | 1 ligne ajoutée dans `ui.go` (`Frameless: true`) — lève Invariant I5 d'UI-006 mais surface minimale |
| `frontend/src/components/hub/TitleBar.tsx` | **fort** | nouveau composant ~80 lignes (logo + label + 3 boutons + drag region) |
| `frontend/src/App.tsx` | **faible** | 1 import + 1 ligne `<TitleBar />` posée en premier enfant du `<main>` |
| `frontend/src/styles/globals.css` | **faible** | éventuelle classe utilitaire `app-region-drag` si on n'inline pas le style — à trancher |
| `frontend/src/assets/yukki-logo.png` | **nul** | déjà committé en story review (64×64) |
| `build/appicon.png` | **nul** | déjà committé en story review (1254×1254) |
| `wails.json` | **nul** | la config frameless se fait dans Go via `options.App.Frameless`, pas dans `wails.json` (Wails v2 convention) |
| `cmd/yukki/ui_mock.go` / `ui_prod.go` | **nul** | aucun changement — la config Wails est dans `ui.go` partagé |
| `frontend/wailsjs/runtime/*.d.ts` | **nul** | bindings déjà exposés (régénérés auto par `wails build`) |
| `main.go` | **nul** | les sous-commandes cobra sont indépendantes ; UI-007 ne touche que `ui.go` |
| Backend Go tous packages (`provider/`, `internal/*`, `artifacts/`) | **nul** | scope étranger |

## Dépendances et intégrations

- **Wails v2.12.0** (`github.com/wailsapp/wails/v2`) — fournit
  `options.App.Frameless` + bindings runtime Window* + Quit. Pas de
  bump de version nécessaire.
- **WebView2 Runtime** (Windows) — déjà installé pour faire tourner
  l'app actuelle. Le frameless est géré par WebView2 sans impact
  fonctionnel en V1 sur HiDPI/snap layouts (limitations notées en
  risques).
- **`@radix-ui/react-tooltip`** (UI-006) — réutilisé si on veut des
  tooltips sur les boutons title bar. Pas obligatoire (D-D).
- **`lucide-react@0.453.0`** — fournit `Minus`, `Square`, `Maximize2`,
  `X`. Aucun ajout dépendance.
- **Vite** — gère le bundling de `yukki-logo.png` via import (asset
  hash auto).
- **Module Go `assetserver`** (`wailsjs/v2/pkg/options/assetserver`) —
  inchangé, sert l'index.html bundled dans le binaire.

## Risques et points d'attention

- **Snap layouts Windows 11 (Win+Z) cassés en frameless** *(prob.
  certaine, impact faible)*. Wails frameless ne propage pas le hover
  hitbox sur le bouton maximize natif vers Windows. Mitigation : V1
  accepte cette régression — Win+ flèches fonctionne toujours pour
  les snaps basiques. Documenter en limitation V1, ouvrir story
  UI-007.5 si feedback.
- **DPI scaling + bordures arrondies Windows 11** *(prob. moyenne,
  impact cosmétique)*. Wails frameless sans `Windows.WindowIsTranslucent`
  peut afficher des coins droits là où un Windows 11 natif ferait des
  coins arrondis. Mitigation : test manuel sur HiDPI ; si ça gêne,
  ajouter `Windows: &windows.Options{WindowIsTranslucent: false}`
  + tester `BackdropType` plus tard. Hors scope V1.
- **WebView2 + drag-region** *(prob. faible, impact bloquant si
  cassé)*. La syntaxe `--wails-draggable: drag` est documentée v2 mais
  pas testée sur ce repo. Mitigation : prévoir une issue de fallback
  vers `style={{ WebkitAppRegion: 'drag' }}` (Electron-style) si
  Wails l'accepte aussi. Test manuel obligatoire en `wails build`
  natif (le `wails dev` peut différer).
- **Hauteur de la title bar quand `<ClaudeBanner />` apparaît** *(prob.
  moyenne, impact UX léger)*. Le banner amber peut empiler 32px au-
  dessus de l'ActivityBar. Avec la title bar 32px avant, ça devient
  64px de bandeaux superposés quand Claude est down. Acceptable
  visuellement mais à valider en revue.
- **Icône maximize/restore figée** *(prob. certaine, impact UX faible)*.
  Si on garde `Square` figé en V1 sans switcher avec `Maximize2`
  selon l'état maximisé, certains utilisateurs peuvent être déroutés.
  Mitigation : labeler explicitement le tooltip "Maximize / Restore"
  ou ajouter le hook `useWindowMaximised` (D-D à trancher).
- **Plateforme macOS / Linux** *(prob. faible, impact UX dégradé Mac)*.
  OQ5 a tranché : title bar custom partout V1. Mac users perdent
  les boutons natifs gauche. Pas de mitigation V1 — feedback utilisateur
  ouvrira UI-007.5 OS-aware si besoin.
- **Re-build du .ico Windows non re-vérifié** *(prob. faible, impact
  cosmétique)*. Wails régénère `build/windows/icon.ico` au build mais
  on n'a pas re-buildé depuis le remplacement de `build/appicon.png`.
  Mitigation : `bash scripts/dev/ui-build.sh` après l'implémentation
  vérifie que la nouvelle icône taskbar / Alt-Tab fonctionne.

## Cas limites identifiés

- **Double-clic rapide sur le logo (zone drag)** : doit déclencher
  toggle maximize Wails-native, pas une sélection de texte. À
  vérifier (`user-select: none` sur la title bar).
- **Drag pendant que la fenêtre est maximisée** : convention OS = un
  drag sur la title bar maximisée fait passer en restored avec la
  position curseur comme nouveau coin haut-gauche. Wails délègue à
  l'OS, à valider.
- **Click sur un bouton fenêtre pendant un drag** : le drag region
  ne doit pas envelopper les boutons (sinon le clic ne les atteint
  pas). Vérifié dans la spec : `--wails-draggable: drag` uniquement
  sur la zone centrale, pas sur les boutons.
- **Resize de la fenêtre** : Wails frameless garde le resize natif
  via `Resizable: true` (default). Vérifier que les bords gardent
  un hitbox de resize même sans bordure visible.
- **Première ouverture sans `<ClaudeBanner />` puis avec** : la title
  bar reste à 32px ; le banner s'insère en dessous. Layout flex
  vertical gère sans casser.
- **Dark theme uniquement** : la title bar utilise `bg-card`. Si
  un jour UI-002 introduit un toggle light, il faudra valider que
  les hover destructive et les vars CSS rendent bien — pas un risque
  V1 (dark forcé).

## Decisions tranchées en revue 2026-05-02 (toutes en reco A)

- [x] **D-D1 → A** : icône maximize/restore **figée sur `Square`**.
      Hook `useWindowMaximised` différé en UI-007.5 si feedback.
- [x] **D-D2 → A** : **pas de tooltip** sur les 3 boutons fenêtre —
      icônes universelles, convention VS Code / Cursor / Discord.
- [x] **D-D3 → A** : drag region en **inline style**
      (`style={{ '--wails-draggable': 'drag' } as React.CSSProperties}`).
      Usage unique, pas besoin d'utility class.
- [x] **D-D4 → A** : **`<img src="@/assets/yukki-logo.png" />`** affiché
      en 20×20. Préserve la signature visuelle pêche+lapin fournie
      par l'utilisateur.
- [x] **D-D5 → A** : bouton close hover utilise
      `hover:bg-destructive hover:text-destructive-foreground` —
      CSS vars yukki dark, respect Invariant I6 d'UI-006.
- [x] **D-D6 → A** : hauteur title bar **`h-8` (32px) figée**, items
      centrés verticalement (`items-center`).
- [x] **D-D7 → A** : composant en
      `frontend/src/components/hub/TitleBar.tsx` (cohérent avec les 4
      autres composants shell UI-006).
- [x] **D-D8 → A** : `Title: "yukki"` **conservé** dans `options.App`.
      Invisible en frameless mais utile pour `wails dev` en mode
      chrome native + logs Wails.
