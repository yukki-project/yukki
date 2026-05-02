---
id: UI-007
slug: custom-titlebar-dark
story: spdd/stories/UI-007-custom-titlebar-dark.md
analysis: spdd/analysis/UI-007-custom-titlebar-dark.md
status: reviewed
created: 2026-05-02
updated: 2026-05-02
---

# Canvas REASONS — Custom title bar minimaliste yukki dark

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**
> (via `/spdd-prompt-update`).
>
> Polish post-UI-006 : passe la fenêtre Wails en frameless et
> ajoute une `<TitleBar />` HTML/CSS de 32px alignée sur la palette
> yukki dark. 6 OQ (story) + 8 D-D (analyse) toutes tranchées en
> reco par défaut (orientation VS Code minimaliste). Lève
> volontairement l'Invariant I5 d'UI-006 (1 ligne Go modifiée).

---

## R — Requirements

### Problème

La fenêtre Wails utilise actuellement le chrome natif Windows : barre
titre gris-clair, boutons système. Cette zone tranche au-dessus de
l'ActivityBar sombre (UI-006) et casse l'identité yukki dark sur ~32px
verticaux. UI-007 livre une title bar HTML/CSS frameless qui hérite du
theming applicatif, à l'image de VS Code / Cursor / Discord / Zed.

### Definition of Done

- [ ] `ui.go` modifié : ajout d'**une seule ligne** `Frameless: true`
      dans la struct `&options.App{...}` passée à `wails.Run`. Aucune
      autre modif Go.
- [ ] Composant `<TitleBar />` créé en
      `frontend/src/components/hub/TitleBar.tsx`. Hauteur 32px (`h-8`),
      `bg-card`, `border-b border-border`, `items-center`,
      `justify-between`. Pas de tooltip sur les boutons (D-D2).
- [ ] **Gauche de la title bar** : `<img>` du logo yukki (`@/assets/yukki-logo.png`,
      affiché en 20×20 via `h-5 w-5`) suivi d'un `<span>yukki</span>`
      en `text-xs text-muted-foreground`. Padding gauche `pl-3`.
- [ ] **Centre de la title bar** : zone de drag avec
      `style={{ '--wails-draggable': 'drag' } as React.CSSProperties}`,
      `flex-1` pour occuper l'espace résiduel.
- [ ] **Droite de la title bar** : 3 boutons fenêtre
      `<Button variant="ghost" size="icon" className="h-8 w-12 rounded-none">` :
      - `Minus` → `WindowMinimise()`
      - `Square` (figée, D-D1) → `WindowToggleMaximise()`
      - `X` → `Quit()`, hover `bg-destructive text-destructive-foreground` (D-D5)
- [ ] `frontend/src/App.tsx` modifié : import + `<TitleBar />` posé en
      **premier enfant** du `<main>`, avant `<ClaudeBanner />`. Aucun
      autre changement de layout.
- [ ] `build/appicon.png` (logo lapin yukki) déjà committé en story
      review — Wails régénère automatiquement `build/windows/icon.ico`
      à la compile.
- [ ] `Title: "yukki"` **conservé** dans `options.App` (D-D8).
- [ ] Pas de régression UI-006 : l'ActivityBar, la SidebarPanel, le
      StoryViewer, le ClaudeBanner et le NewStoryModal fonctionnent
      tous identiquement.
- [ ] `tsc --noEmit` ✓, `vite build` ✓, `bash scripts/dev/ui-build.sh` ✓.
- [ ] Validation manuelle via le binaire mock (`build/bin/yukki-ui.exe ui`) :
      AC1..AC9 de la story passent.

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `<TitleBar />` (composant, nouveau) | Bande horizontale 32px en haut du `<main>`, première enfant. Logo + label à gauche, drag region centrale, 3 boutons à droite. | props : aucune (consume directement les bindings runtime Wails) | mount avec App, jamais démonté |
| `WindowMinimise` (binding Wails, existant) | `(): void` — minimise la fenêtre | exposé `wailsjs/wailsjs/runtime/runtime.d.ts` | runtime Wails |
| `WindowToggleMaximise` (binding Wails, existant) | `(): void` — bascule entre normal et maximisé | idem | idem |
| `Quit` (binding Wails, existant) | `(): void` — ferme l'app proprement | idem | idem |
| `options.App.Frameless` (champ Wails, existant) | `bool` — passe la fenêtre en mode frameless (sans chrome OS native) | `github.com/wailsapp/wails/v2/pkg/options` (v2.12.0) | config compile-time |
| `yukki-logo.png` (asset, existant) | Logo lapin sur fond pêche, 64×64 PNG | `frontend/src/assets/yukki-logo.png` | bundlé Vite avec hash |
| `appicon.png` (asset, existant) | Source 1254×1254 du logo pour Wails app icon | `build/appicon.png` | converti en `.ico` au build par Wails |

### Relations

- `<App />` ⟶ `<TitleBar />` : rendu en premier enfant du `<main>`,
  au-dessus du `<ClaudeBanner />` existant.
- `<TitleBar />` ⟶ `WindowMinimise / WindowToggleMaximise / Quit` :
  appel direct depuis les `onClick` des 3 boutons.
- `wails.Run(&options.App{...})` ⟶ WebView2 : `Frameless: true` indique
  à Wails de ne pas demander la chrome native Windows.
- `build/appicon.png` ⟶ `build/windows/icon.ico` : régénération
  automatique par `wails build` (icône taskbar / Alt-Tab / installer).

### Invariants UI-007

- **I1** — `<TitleBar />` est **stateless** en V1 (pas de `useState`,
  pas de hook `useWindowMaximised`). L'icône maximize/restore reste
  figée sur `Square` (D-D1). Le hook dynamique sera ajouté en
  UI-007.5 si feedback.
- **I2** — Le composant n'utilise **aucun nouveau store Zustand** ni
  contexte React. Les 3 actions appellent directement les bindings
  Wails.
- **I3** — APIs React de tous les composants UI-006 (`<ActivityBar />`,
  `<SidebarPanel />`, `<StoryViewer />`, `<ClaudeBanner />`,
  `<NewStoryModal />`, `<ProjectPicker />`) **strictement préservées**.
- **I4** — Theming : la title bar utilise **uniquement** des classes
  shadcn / CSS vars (`bg-card`, `text-foreground`, `text-muted-foreground`,
  `bg-destructive`, `hover:bg-accent`). Aucun hex color ni couleur
  hardcodée (continuité Invariant I6 d'UI-006).
- **I5** — Côté Go : **une seule modification**, l'ajout du champ
  `Frameless: true` dans `&options.App{...}` au `ui.go:43`. Aucun
  nouvel import, aucune nouvelle fonction, aucune modification de
  `main.go`, `ui_mock.go`, `ui_prod.go`, `wails.json` (le frameless
  se configure côté Go pour Wails v2, pas dans le JSON).
- **I6** — Drag region : `--wails-draggable: drag` appliqué
  **uniquement** sur la zone centrale (entre logo+label et boutons).
  Pas sur les boutons (sinon clics interceptés), pas sur le logo
  (zone trop petite pour drag utile).
- **I7** — Logo : `<img>` du PNG `yukki-logo.png` utilisé tel quel
  (D-D4). Pas d'extraction du lapin sur fond transparent en V1, pas
  de remplacement par une icône monochrome `Rabbit` lucide.

### Integration points

- **Wails runtime** (`wailsjs/wailsjs/runtime/runtime.d.ts`) — bindings
  `WindowMinimise`, `WindowToggleMaximise`, `Quit` consommés
  directement par `<TitleBar />`. Pas de wrapper.
- **Vite asset import** — `import yukkiLogo from '@/assets/yukki-logo.png'`
  fournit l'URL hashée à utiliser comme `<img src={yukkiLogo} />`.
- **Tailwind / shadcn classes** — `h-8`, `bg-card`, `border-b`,
  `border-border`, `text-foreground`, `text-muted-foreground`,
  `bg-destructive`, `hover:bg-accent`, `flex`, `items-center`,
  `justify-between`, `flex-1`, `pl-3`. Toutes existantes.
- **lucide-react** — icônes `Minus`, `Square`, `X` (déps `^0.453.0`,
  pas d'ajout).
- **shadcn Button** (`frontend/src/components/ui/button.tsx`) —
  `variant="ghost"` + `size="icon"` réutilisés tels quels.

---

## A — Approach

### Y-Statement

> Pour résoudre **la dissonance visuelle entre la chrome native
> Windows gris-clair et le shell yukki dark**, on choisit
> **de passer la fenêtre Wails en `Frameless: true` côté Go (1 ligne)
> et de poser un composant React `<TitleBar />` stateless en premier
> enfant du `<main>`, qui consomme directement les bindings runtime
> Wails (`WindowMinimise`, `WindowToggleMaximise`, `Quit`) et expose
> une zone de drag CSS (`--wails-draggable: drag`)**, plutôt que
> **de garder la chrome native** ou **d'introduire un wrapper de
> store/contexte pour piloter la fenêtre**, pour atteindre **une
> identité visuelle one-look conforme aux IDE de référence (VS Code,
> Cursor, Discord) avec la surface de modification minimale possible
> (1 ligne Go + 1 composant + 1 ligne dans App.tsx)**, en acceptant
> **(a) la perte des snap layouts Win+Z natifs sur Windows 11
> (limitation V1, UI-007.5 OS-aware si feedback) et (b) la dégradation
> UX sur macOS où les boutons natifs gauche disparaîtront (OQ5 → A
> tranché story)**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-02)

**Story-level (OQ1..OQ6)** — orientation VS Code minimaliste :
- **OQ1 → A** : boutons à droite (convention Windows / VS Code)
- **OQ2 → B** : logo `<img>` + label "yukki" à gauche
- **OQ3 → A** : hauteur 32px (`h-8`)
- **OQ4 → B** : logo lapin yukki en `build/appicon.png` (Wails)
- **OQ5 → A** : title bar custom partout V1 (Mac inclus)
- **OQ6 → A** : title bar visible quand maximisée (VS Code-like)

**Analysis-level (D-D1..D-D8)** :
- **D-D1 → A** : icône maximize figée `Square` (V1), hook en UI-007.5
- **D-D2 → A** : pas de tooltip sur les 3 boutons (convention OS)
- **D-D3 → A** : drag region en inline style (usage unique)
- **D-D4 → A** : `<img>` PNG (signature pêche+lapin préservée)
- **D-D5 → A** : bouton close hover `bg-destructive` (CSS vars)
- **D-D6 → A** : hauteur `h-8` figée
- **D-D7 → A** : composant en `frontend/src/components/hub/`
- **D-D8 → A** : `Title: "yukki"` conservé dans Wails options

### Alternatives écartées

- **Garder la chrome native + theming Windows registry** — touche le
  système de l'utilisateur, hors scope d'une app desktop sandboxée.
- **Wrapper Zustand `useWindowStore`** pour piloter la fenêtre — pas
  d'état partagé à mémoriser (les bindings Wails sont fire-and-forget),
  c'est de la sur-ingénierie pour 3 boutons.
- **Hook dynamique `useWindowMaximised` dès V1** — alourdit le scope
  pour un gain UX faible (on voit que la fenêtre est maximisée parce
  qu'elle remplit l'écran). Différé en UI-007.5.
- **Extraction du lapin sur fond transparent** — nécessite un outil
  image (ImageMagick / Photoshop), pas dispo en environnement dev
  courant. Le PNG fourni a déjà sa propre identité (carré pêche
  arrondi, façon Discord/Slack), on la garde.
- **Frameless conditionnel par GOOS** (Windows-only) — OQ5 a tranché
  pour one-look partout. UI-007.5 traitera le retour Mac/Linux si
  feedback.
- **Custom resize hitbox** sur les 4 bords (Wails frameless conserve
  le resize natif via `Resizable: true`) — non nécessaire, la default
  Wails marche.
- **Tabs intégrés dans la title bar** type Cursor/VS Code multi-onglets —
  hors scope V1, future story.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `root` (Go) | `ui.go` | **modif minimale** : ajout d'une ligne `Frameless: true` dans `&options.App{...}` |
| `frontend/src/components/hub/TitleBar.tsx` | nouveau | composant complet ~80 lignes (logo + label + drag + 3 boutons) |
| `frontend/src/App.tsx` | modif | 1 import + 1 ligne `<TitleBar />` posée avant `<ClaudeBanner />` |
| `frontend/src/assets/yukki-logo.png` | **nul** | déjà committé en story review (64×64 PNG) |
| `build/appicon.png` | **nul** | déjà committé en story review (1254×1254 PNG) |
| `wails.json` | **nul** | la config frameless se fait dans Go via `options.App.Frameless` |
| `cmd/yukki/` (s'il existe) / `main.go` | **nul** | aucun changement |
| `ui_mock.go` / `ui_prod.go` | **nul** | aucun changement |
| `frontend/wailsjs/runtime/*.d.ts` | **nul** | bindings déjà exposés |
| `frontend/src/styles/globals.css` | **nul** | pas de nouvelle classe utilitaire (D-D3 = inline) |
| `frontend/package.json` / `package-lock.json` | **nul** | aucune dépendance ajoutée |
| Tous les composants UI-006 (`<ActivityBar />`, `<SidebarPanel />`, `<HubList />`, `<StoryViewer />`, `<ClaudeBanner />`, `<NewStoryModal />`, `<ProjectPicker />`) | **nul** | API et code inchangés |
| Backend Go (tous packages : `provider/`, `internal/*`, `artifacts/`) | **nul** | scope étranger |

### Schéma de flux

```
   ┌─ FENÊTRE WAILS (frameless) ─────────────────────────────────────┐
   │ ┌─ <TitleBar /> ──────────────────────────────────────────────┐ │
   │ │ 🐰 yukki        [drag region...........]   [─] [□] [×]      │ │  32px
   │ └────────────────────────────────────────────────────────────┘ │
   │ ┌─ <ClaudeBanner /> (conditionnel, return null si Claude OK) ─┐ │
   │ └────────────────────────────────────────────────────────────┘ │
   ├──────────────────────────────────────────────────────────────────┤
   │ ┌ Activity─┐ ┌─ SidebarPanel ─┐ ┌─ Main (StoryViewer) ────────┐ │
   │ │   Bar    │ │  (collapsable)  │ │                            │ │
   │ │  (52px)  │ │    (240px)     │ │       flex-1               │ │
   │ │          │ │                │ │                            │ │
   │ └──────────┘ └────────────────┘ └────────────────────────────┘ │
   └──────────────────────────────────────────────────────────────────┘

   <TitleBar /> détail :
   ─────────────────────
   bg-card  border-b border-border  flex items-center justify-between
   ┌──────────────────────────────────────────────────────────────────┐
   │ 🐰 yukki │ ─── drag region (--wails-draggable:drag) ─── │ [─][□][×] │
   │  ↑       │  ↑                                          │  ↑    ↑   │
   │  pl-3    │  flex-1                                     │  ghost │   │
   │  img     │  → drag déplace la fenêtre Wails           │  size  │   │
   │  20×20   │                                              │  icon  │   │
   │  +       │                                              │        │   │
   │  span    │                                              │        │   │
   │  text-xs │                                              │ X hover│   │
   │          │                                              │ bg-destr   │
   └──────────────────────────────────────────────────────────────────┘

   Boutons (gauche → droite) :
   - [─] Minus  → WindowMinimise()
   - [□] Square → WindowToggleMaximise()
   - [×] X      → Quit()  (hover destructive)

   Côté Go :
   ─────────
   ui.go:43-53 — wails.Run(&options.App{
       Title:      "yukki",   // conservé (D-D8), invisible en frameless
       Width:      1280,
       Height:     800,
       Frameless:  true,      // ← UI-007 (la seule ligne ajoutée)
       AssetServer: ...,
       OnStartup:  app.OnStartup,
       OnShutdown: app.OnShutdown,
       Bind:       []any{app},
   })
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation livrable indépendamment en
> 1 commit atomique.

### O1 — Frameless dans `ui.go`

- **Module** : `root` (Go)
- **Fichier** : `ui.go` (modif minimale)
- **Signature / diff** :
  ```go
  err := wails.Run(&options.App{
      Title:  "yukki",
      Width:  1280,
      Height: 800,
+     Frameless: true,
      AssetServer: &assetserver.Options{
          Assets: frontend.Assets,
      },
      OnStartup:  app.OnStartup,
      OnShutdown: app.OnShutdown,
      Bind:       []any{app},
  })
  ```
- **Comportement** :
  1. Ajout d'**une seule ligne** `Frameless: true,` après `Height: 800`.
  2. Aucun nouvel import (le champ existe déjà dans
     `github.com/wailsapp/wails/v2/pkg/options.App`).
  3. Aucune autre modification de `ui.go`.
- **Tests** :
  - Compilation Go : `go build ./...` doit passer (test indirect via
    `bash scripts/dev/ui-build.sh`).
  - Tests Go existants (`main_test.go` notamment) : doivent rester
    verts sans modification.

### O2 — Composant `<TitleBar />`

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/TitleBar.tsx` (nouveau)
- **Signatures** :
  ```typescript
  import type { CSSProperties } from 'react';
  import { Minus, Square, X } from 'lucide-react';
  import yukkiLogo from '@/assets/yukki-logo.png';
  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';
  import {
    Quit,
    WindowMinimise,
    WindowToggleMaximise,
  } from '../../../wailsjs/wailsjs/runtime/runtime';

  const DRAG_REGION: CSSProperties = {
    // Wails v2 contract : la propriété CSS custom --wails-draggable
    // appliquée à un élément le rend draggable côté OS (Wails runtime
    // intercepte les events au niveau WebView2, pas de JS handler).
    ['--wails-draggable' as never]: 'drag',
  };

  export function TitleBar(): JSX.Element
  ```
- **Comportement** :
  1. Render `<header>` racine :
     ```tsx
     <header
       aria-label="Title bar"
       className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-card select-none"
     >
       {/* Gauche : logo + label */}
       <div className="flex items-center gap-2 pl-3">
         <img src={yukkiLogo} alt="yukki" className="h-5 w-5" draggable={false} />
         <span className="text-xs text-muted-foreground">yukki</span>
       </div>

       {/* Centre : drag region */}
       <div className="flex-1 self-stretch" style={DRAG_REGION} />

       {/* Droite : 3 boutons fenêtre */}
       <div className="flex h-full">
         <Button
           variant="ghost"
           size="icon"
           aria-label="Minimize"
           className="h-8 w-12 rounded-none"
           onClick={() => WindowMinimise()}
         >
           <Minus className="h-3.5 w-3.5" />
         </Button>
         <Button
           variant="ghost"
           size="icon"
           aria-label="Maximize"
           className="h-8 w-12 rounded-none"
           onClick={() => WindowToggleMaximise()}
         >
           <Square className="h-3 w-3" />
         </Button>
         <Button
           variant="ghost"
           size="icon"
           aria-label="Close"
           className={cn(
             'h-8 w-12 rounded-none',
             'hover:bg-destructive hover:text-destructive-foreground',
           )}
           onClick={() => Quit()}
         >
           <X className="h-3.5 w-3.5" />
         </Button>
       </div>
     </header>
     ```
  2. Le `select-none` sur `<header>` empêche la sélection de texte
     accidentelle pendant un drag (cas limite identifié en analyse).
  3. `draggable={false}` sur le `<img>` empêche le drag-and-drop HTML5
     natif de l'image (qui interfère avec `--wails-draggable`).
  4. Pas de tooltip Radix (D-D2). `aria-label` sur chaque bouton pour
     l'accessibilité.
  5. Bouton close : hover destructive uniquement (D-D5), via classes
     CSS vars yukki dark (Invariant I4).
- **Tests** : aucun en V1. Validation manuelle AC1..AC9 de la story.

### O3 — Intégration dans `App.tsx` (avec wrapper ProjectPicker)

- **Module** : `frontend/src`
- **Fichier** : `frontend/src/App.tsx` (refactor léger)
- **Signature / diff** :
  ```tsx
  import { useEffect } from 'react';
  import { ActivityBar } from '@/components/hub/ActivityBar';
  import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
  import { ProjectPicker } from '@/components/hub/ProjectPicker';
  import { SidebarPanel } from '@/components/hub/SidebarPanel';
  import { StoryViewer } from '@/components/hub/StoryViewer';
  import { TitleBar } from '@/components/hub/TitleBar';
  import { useClaudeStore } from '@/stores/claude';
  import { useProjectStore } from '@/stores/project';

  export default function App() {
    const projectDir = useProjectStore((s) => s.projectDir);
    const refreshClaude = useClaudeStore((s) => s.refresh);

    useEffect(() => {
      void refreshClaude();
    }, [refreshClaude]);

    return (
      <main className="min-h-screen flex flex-col bg-background text-foreground">
        <TitleBar />
        {!projectDir ? (
          <ProjectPicker />
        ) : (
          <>
            <ClaudeBanner />
            <div className="flex flex-1 overflow-hidden">
              <ActivityBar />
              <SidebarPanel />
              <section className="flex flex-1 overflow-hidden">
                <StoryViewer className="flex-1" />
              </section>
            </div>
          </>
        )}
      </main>
    );
  }
  ```
- **Comportement** :
  1. Import de `TitleBar` (5ᵉ import depuis `@/components/hub/`).
  2. Suppression de l'early `return <ProjectPicker />` au profit d'un
     branchement conditionnel **dans** le JSX du `<main>`. La
     TitleBar reste rendue **dans tous les cas** (shell global).
  3. Le `<ClaudeBanner />` est rendu uniquement quand `projectDir`
     est défini (cohérent avec le comportement actuel — pas de
     banner Claude tant qu'aucun projet n'est ouvert).
  4. Le wrapper `<>...</>` (Fragment) groupe ClaudeBanner + le shell
     UI-006 sans introduire de div en plus.
- **Tests** : aucun. Validation manuelle AC2 (title bar visible) +
  AC9 (no regression UI-006). Test additionnel : ouvrir l'app sans
  projet sélectionné → la TitleBar doit être visible et les boutons
  minimize/maximize/close doivent fonctionner.

### O4 — Vérifications post-génération

- **Module** : transverse
- **Fichier** : aucun
- **Comportement** :
  1. `cd frontend && npx tsc --noEmit` — type-check (doit passer).
  2. `cd frontend && npx vite build` — bundle Vite (doit passer, taille
     comparable à UI-006 + ~5 KB pour le logo PNG bundlé).
  3. `bash scripts/dev/ui-build.sh` — compile le binaire mock complet
     (vérifie que le code Go modifié compile + que Wails accepte le
     `Frameless: true`).
  4. Lancement manuel : `build/bin/yukki-ui.exe ui` — la fenêtre doit
     s'ouvrir sans la chrome Windows native, avec la title bar yukki
     dark visible. Tester :
     - drag depuis la zone centrale → la fenêtre suit
     - clic minimize → fenêtre dans la taskbar, restorable
     - clic maximize → plein écran, re-clic → état précédent
     - double-clic sur drag region → toggle maximize/restore
     - clic close → fenêtre fermée, process terminé (vu via
       `tasklist | findstr yukki-ui`)
     - hover sur close → fond rouge destructive
- **Tests** : aucun automatisé. Manuel uniquement (cohérent UI-006).

---

## N — Norms

- **TypeScript strict** (déjà config UI-001a) : pas d'`any`. Le cast
  `['--wails-draggable' as never]` est volontaire pour contourner la
  limitation TS sur les CSS custom properties — pas d'`any` glissé.
- **CSS variables shadcn uniquement** : aucun hex color hardcodé dans
  `<TitleBar />`. Tout passe par `bg-card`, `text-foreground`,
  `text-muted-foreground`, `bg-destructive`, `border-border`,
  `hover:bg-accent` (Invariant I4).
- **lucide-react** : icônes uniques `Minus`, `Square`, `X` (D-D1
  fixe `Square`, pas de switch dynamique).
- **shadcn Button** : réutilisé tel quel via `variant="ghost" size="icon"`.
  Surcharge via `className="h-8 w-12 rounded-none"` pour aligner sur
  la title bar.
- **Wails bindings** : import direct depuis
  `frontend/wailsjs/wailsjs/runtime/runtime` (notez le double
  `wailsjs/wailsjs/` — c'est la convention chemin actuelle du repo).
  Pas de wrapper.
- **Accessibilité** : `aria-label` sur `<header>` ("Title bar") et sur
  chaque `<Button>` ("Minimize", "Maximize", "Close"). Pas de tooltip
  visible (D-D2) mais l'aria-label suffit pour les screen readers.
- **Animation** : aucune en V1 (pas de transition sur le toggle
  maximize, pas de fade-in du hover destructive — Tailwind transition
  par défaut sur les colors suffit).
- **Tests UI** : aucun automatisé en V1 (Playwright/Cypress = post-MVP,
  cohérent UI-001b/c/d).
- **Convention de commit** : `feat(ui-007)` pour le commit
  d'implémentation final, ou un commit par Operation si on veut
  préserver la granularité (3 commits : O1 frameless, O2 composant,
  O3 intégration). À trancher au moment du `/spdd-generate`.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de modification Go au-delà d'1 ligne (Invariant I5 UI-007)**
  - `ui.go` : ajout strict de `Frameless: true,` dans la struct
    `options.App`. Aucun nouvel import, aucun nouvelle fonction,
    aucun champ supplémentaire (pas de `Windows: &windows.Options{...}`,
    pas de `MinWidth`, pas de modification du `Title` ni des autres
    champs).
  - `main.go`, `ui_mock.go`, `ui_prod.go`, `wails.json`, `cmd/yukki/`,
    `internal/*`, `provider/`, `artifacts/` : **0 changement**.
  - Tests Go (`main_test.go` etc.) : pas relancés (scope Go étranger
    à UI-007 sauf l'1 ligne).
- **APIs React des composants UI-001/UI-006 préservées (Invariant I3)**
  - Pas de modification de props sur `<HubList />`, `<StoryViewer />`,
    `<ClaudeBanner />`, `<NewStoryModal />`, `<ProjectPicker />`,
    `<ActivityBar />`, `<SidebarPanel />`. Aucun import retiré dans
    App.tsx en dehors de l'ajout de TitleBar.
- **Pas de nouveau store Zustand (Invariant I2)**
  - Le composant `<TitleBar />` ne crée ni store ni contexte.
  - Pas de `useWindowMaximised`, pas de `useWindowState`. L'état
    maximize/restore reste figé via `Square` (D-D1).
- **Pas de tooltip Radix (D-D2)**
  - `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`
    ne sont **pas importés** dans `<TitleBar />`. Convention OS pour
    les boutons fenêtre.
- **Theming hardcodé interdit (Invariant I4)**
  - Aucun composant n'écrit de hex color (`#1A1A1F`, `#8B5CF6`,
    `#FF0000`, etc.) dans son JSX, son `className` ou un style inline.
    Tout passe par les classes shadcn / vars CSS.
  - Le hover destructive du bouton close passe par
    `hover:bg-destructive`, **pas** par `hover:bg-red-600` ni
    `style={{backgroundColor: 'red'}}`.
- **Pas de drag region sur les zones interactives (Invariant I6)**
  - `--wails-draggable: drag` est appliqué **uniquement** sur le `<div>`
    central. Pas sur le logo (`<img>`), pas sur les `<Button>`. Sinon
    les clics ne passent pas.
- **Pas de toggle frameless / chrome native runtime**
  - Le mode `Frameless: true` est figé V1. Pas de bouton settings,
    pas de raccourci pour repasser en chrome native. Si l'utilisateur
    veut chrome native, c'est UI-007.5 future.
- **Pas de drag-to-resize custom**
  - Wails frameless conserve le resize natif via `Resizable: true`
    (default). Pas de poignée custom, pas de zones hitbox écrites
    en CSS sur les bords.
- **Pas de modification des artefacts SPDD existants**
  - Les fichiers `spdd/stories/*.md`, `spdd/analysis/*.md`,
    `spdd/prompts/*.md` (sauf cette story / analyse / canvas eux-mêmes)
    ne sont pas touchés.
- **Pas de logging frontend bavard**
  - `<TitleBar />` ne log pas via `console.log` au mount, au click,
    ou ailleurs. Les bindings Wails sont silencieux.
- **Pas de feature flag, pas de retro-compat fictive**
  - Le canvas est la spec, le code la suit. Pas de
    `if (DISABLE_FRAMELESS) return null`.

---

## Open Questions tranchées en revue 2026-05-02

- [x] **OQ-canvas-1 → A** : `<TitleBar />` est rendue **aussi** pendant
      l'écran `<ProjectPicker />`. App.tsx est refactoré : la title bar
      est posée en premier enfant du `<main>` **avant** le branchement
      conditionnel sur `projectDir`. Le ProjectPicker passe en
      sous-arbre (plus en early `return`) pour que le shell global
      reste interactif (minimize / close fonctionnent dès l'ouverture).
      Pattern dans Operation O3 ci-dessous.

---

## Changelog

- **2026-05-02 — création** — canvas v1 issu de l'analyse UI-007
  reviewed. 6 OQ (story) + 8 D-D (analyse) toutes en reco par défaut
  (orientation VS Code minimaliste). 4 Operations livrables (1 ligne
  Go + 1 nouveau composant + 1 ligne App.tsx + vérifications). 7
  invariants Safeguards. 1 OQ résiduelle (visibilité TitleBar pendant
  ProjectPicker) à arbitrer en `/spdd-generate`.
