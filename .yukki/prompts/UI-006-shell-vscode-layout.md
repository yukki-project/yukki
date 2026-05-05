---
id: UI-006
slug: shell-vscode-layout
story: spdd/stories/UI-006-shell-vscode-layout.md
analysis: spdd/analysis/UI-006-shell-vscode-layout.md
status: implemented
created: 2026-05-02
updated: 2026-05-02
---

# Canvas REASONS — Shell VS Code-style + theming yukki dark

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> Story de polish post-V1 : refond le shell visuel sans toucher au
> cœur métier. 7 OQs (story) + 8 décisions D-D (analyse) tranchées
> en reco par défaut. Backend Go = 0 changement.

---

## R — Requirements

### Problème

Le shell visuel hérité de UI-001b (sidebar large + onglets-boutons +
collapse en drawer < 768px) est fonctionnel mais visuellement plat,
loin des conventions IDE modernes (VS Code, Cursor, Zed) que
le public cible côtoie. UI-006 le refond en **double sidebar
VS Code-style** (activity bar fixe + panel collapsable) avec un
theming **yukki dark** (sombre + accent violet), sans casser
l'API React des composants existants.

### Definition of Done

- [ ] Composant `<ActivityBar />` créé dans
      `frontend/src/components/hub/ActivityBar.tsx` : colonne fixe
      ~52px, 5 boutons icône (Stories / Analyses / Prompts /
      Tests / Settings), tooltip au hover, indicateur "actif"
      (barre verticale violette + fond accent).
- [ ] Composant `<SidebarPanel />` créé dans
      `frontend/src/components/hub/SidebarPanel.tsx` : panneau
      240px, header avec titre du mode + bouton X close, body
      qui rend `<HubList />` (modes Stories / Analyses / Prompts /
      Tests) ou un placeholder Settings (mode `settings`).
- [ ] Composant `<Tooltip />` shadcn ajouté via
      `npx shadcn@latest add tooltip`.
- [ ] Store `useShellStore` (`frontend/src/stores/shell.ts`, 5ᵉ
      store) créé avec `activeMode`, `sidebarOpen`, et 4 actions
      (`setActiveMode`, `toggleSidebar`, `closeSidebar`,
      `openSidebar`). Wrappé par `zustand/middleware` `persist` →
      localStorage clé `yukki:shell-prefs`.
- [ ] `setActiveMode(mode)` propage à `useArtifactsStore.setKind(mode)`
      uniquement quand `mode` ∈ {stories, analysis, prompts, tests}.
      Mode `'settings'` ne touche pas useArtifactsStore.
- [ ] `setActiveMode(m)` toggle : si `m === activeMode &&
      sidebarOpen` alors `sidebarOpen=false` ; sinon
      `activeMode=m, sidebarOpen=true`.
- [ ] `frontend/src/styles/globals.css` modifié : valeurs `.dark`
      remplacées par la palette yukki dark (fond `~#1A1A1F`, surface
      `~#1F1F26`, surface élevée `~#26262E`, border `~#2E2E36`,
      accent violet `#8B5CF6` → hover `#A78BFA`, texte primaire
      `~#F0F0F2`, secondaire `~#9CA3AF`).
- [ ] `frontend/index.html` (ou `frontend/src/main.tsx` au mount)
      force `<html class="dark">` au load (D-D3).
- [ ] `frontend/src/App.tsx` refactoré : layout
      `<ClaudeBanner />` au-dessus + flex row {`<ActivityBar />`,
      `<SidebarPanel />` (collapsable), `<StoryViewer
      className="flex-1" />`}. `<HubList />` n'est plus rendu
      dans App.tsx — il est maintenant à l'intérieur de
      `<SidebarPanel />`.
- [ ] `<HubList />` (UI-001b/c) **API préservée** : props identiques
      ; bouton *New Story* reste dans son header. Adaptation
      purement visuelle si le bouton dépasse 240px (label réduit
      ou icône-only).
- [ ] `<Sidebar />` (UI-001b) et `<SidebarToggle />` (UI-001b)
      **supprimés** (D-D4). Aucun import résiduel dans le
      frontend.
- [ ] `<StoryViewer />`, `<ClaudeBanner />`, `<NewStoryModal />`,
      `<ProjectPicker />` : 0 changement de code, héritent du
      theming via CSS vars (OQ7 figée).
- [ ] Animation collapse de la sidebar : transition CSS 150ms
      sur la largeur (240px ↔ 0). `overflow-hidden` pour ne pas
      flasher pendant l'animation. D-D6 OQ6 full collapse.
- [ ] Responsive < 768px : `<SidebarPanel />` passe en
      `position: fixed` au-dessus du main content avec voile
      sombre (z-40, sous le Dialog UI-001c z-50). Click hors
      sidebar → ferme. Activity bar reste visible.
- [ ] Persistance : au lancement, l'état `activeMode +
      sidebarOpen` est restauré depuis localStorage.
- [ ] Pas de régression UI-001a/b/c : tests Go inchangés
      (29/29 PASS), `tsc --noEmit` ✓, `vite build` ✓.
- [ ] Validation manuelle via `wails build -tags mock
      -skipbindings && yukki-ui ui` : tous les AC1..AC9 de la
      story passent (cf. story §AC).

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `useShellStore` (Zustand, nouveau) | État global du shell visuel : mode actif et état ouverture sidebar. Persistant en localStorage. | `activeMode: ShellMode, sidebarOpen: boolean, setActiveMode, toggleSidebar, closeSidebar, openSidebar` | global app lifetime, hydraté depuis localStorage au mount |
| `ShellMode` (TS union, nouveau) | Type de mode actif | `'stories' \| 'analysis' \| 'prompts' \| 'tests' \| 'settings'` | constant ; les 4 premiers viennent de `artifacts.AllowedKinds()`, le 5ᵉ est figé côté front |
| `<ActivityBar />` (composant, nouveau) | Colonne fixe gauche ~52px avec 5 icônes empilées | props : aucune (consume `useShellStore`) | mount avec App, jamais démonté |
| `<SidebarPanel />` (composant, nouveau) | Panneau 240px à droite de l'ActivityBar, contient HubList ou placeholder Settings | props : aucune (consume `useShellStore`) | mount avec App, son contenu varie selon `activeMode` |
| `<Tooltip />` (shadcn, nouveau) | Tooltip Radix accessible | API shadcn standard | per-instance |
| `Sidebar` (UI-001b) | (supprimé) | — | retiré du codebase |
| `SidebarToggle` (UI-001b) | (supprimé) | — | retiré du codebase |
| `useArtifactsStore.kind` (UI-001b) | Toujours là, mais piloté **uniquement** via `useShellStore.setActiveMode` | inchangé | inchangé |

### Relations

- `<ActivityBar />` ⟶ `useShellStore` : lit `activeMode` (pour
  l'indicateur visuel), appelle `setActiveMode` au click.
- `<SidebarPanel />` ⟶ `useShellStore` : lit `activeMode` et
  `sidebarOpen` ; `closeSidebar` au click sur X.
- `useShellStore.setActiveMode` ⟶ `useArtifactsStore.setKind` :
  propagation conditionnelle (mode ∈ kinds SPDD).
- `<App />` ⟶ `useShellStore.sidebarOpen` : pilote la classe
  Tailwind de la sidebar (width 0 vs 240px).

### Invariants UI-006

- **I1** — `useShellStore` est un store **isolé** au sens
  Invariant I6 UI-001b. **Aucun import croisé** vers les 4
  autres stores depuis ses méthodes ; la propagation
  `setActiveMode → setKind` se fait dans le *setter* du
  store en utilisant `useArtifactsStore.getState().setKind` —
  call inversé OK, pas un import croisé.
- **I2** — APIs React de `<HubList />`, `<StoryViewer />`,
  `<ClaudeBanner />`, `<NewStoryModal />`, `<ProjectPicker />`
  **strictement préservées** : pas de changement de props ni
  de comportement. Seul leur rendu visuel évolue via les CSS
  vars.
- **I3** — Le mode `'settings'` ne touche **jamais** à
  `useArtifactsStore`. Pas de refresh, pas de setKind.
  Garantit que basculer Settings → Stories restaure la liste
  précédente sans re-fetch inutile.
- **I4** — `useShellStore` est l'**unique caller** de
  `useArtifactsStore.setKind`. Tout autre call site est un
  bug à reporter en revue (D-D drift mitigation).
- **I5** — Backend Go : **0 changement**. depguard CORE-002
  reste vert ; aucune nouvelle binding Wails ; les tests
  Go restent verts sans toucher.
- **I6** — Theming : la palette yukki dark est définie **uniquement**
  dans `globals.css` `.dark`. Aucun composant ne hardcode une
  couleur de la palette en Tailwind ou en style inline ; tout passe par
  les classes shadcn (`bg-background`, `text-foreground`,
  `border-border`, etc.) qui résolvent en CSS vars.
- **I7** — `<html class="dark">` est posée **une seule fois**
  au load (`index.html` ou `main.tsx`). Pas de toggle
  light/dark en V1 (D-D3).

### Integration points

- **`zustand/middleware` `persist`** — appelé pour wrapper
  `useShellStore`. Clé `yukki:shell-prefs`, storage par
  défaut (`localStorage`).
- **`localStorage`** — persistance auto via `persist`. Fallback
  in-memory si indisponible (Wails desktop garantit la
  présence).
- **`shadcn/ui Tooltip`** (`@radix-ui/react-tooltip` peer-dep) —
  ajouté par `npx shadcn add tooltip`. Wrappe les boutons
  d'`<ActivityBar />`.
- **`useArtifactsStore.setKind`** — appelé depuis
  `useShellStore.setActiveMode` via `getState()` (pas
  d'import direct dans le store, juste un effet de bord
  contrôlé).

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **moderniser le shell visuel de yukki
> et l'aligner sur les conventions IDE (VS Code / Cursor / Zed)
> que les utilisateurs cibles connaissent**, on choisit
> **une activity bar fixe à gauche + une sidebar collapsable type
> VS Code, avec un 5ᵉ store Zustand `useShellStore` (persisté
> en localStorage via `persist` middleware), des CSS vars
> yukki dark sur `.dark` (forcé `<html class="dark">`), et la
> suppression des composants Sidebar/SidebarToggle UI-001b
> remplacés par le couple ActivityBar/SidebarPanel**, plutôt
> que de **garder l'ancienne sidebar avec un nouveau theme** ou
> de **refactorer le store useArtifactsStore pour porter le shell
> state**, pour atteindre **familiarité immédiate avec l'IDE
> quotidien, densité d'information accrue (sidebar collapsable
> libère 240px), identité visuelle distinctive (palette yukki dark), et
> extensibilité (l'activity bar accepte des modes futurs comme
> Search ou MCP status sans repenser le layout)**, en acceptant
> **une refonte non-triviale de App.tsx + Sidebar.tsx, l'ajout
> d'un 5ᵉ store, et le risque de drift activeMode ↔ kind mitigé
> par la convention "useShellStore est l'unique caller de
> setKind" (Invariant I4)**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-02)

**Story-level (OQ1..OQ7)** :
- **OQ1 → A** : activity bar à **gauche** (VS Code-conforme).
- **OQ2 → A** : Settings en bas de l'activity bar.
- **OQ3 → A** : tooltips via `npx shadcn add tooltip` (Radix).
- **OQ4 → A** : icônes lucide-react (déjà déps).
- **OQ5 → A** : persistance localStorage (V1).
- **OQ6 → A** : animation collapse full à 0px.
- **OQ7 → A** : palette yukki dark s'applique aussi au Dialog (CSS vars).

**Analysis-level (D-D1..D-D8)** :
- **D-D1 → A** : nouveau store dédié `useShellStore` (Invariant I6).
- **D-D2 → A** : `zustand/middleware` `persist`.
- **D-D3 → A** : dark forcé V1 (toggle light = UI-002 future).
- **D-D4 → A** : suppression `<SidebarToggle />` et `<Sidebar />`.
- **D-D5 → A** : sidebar ouverte par défaut.
- **D-D6 → A** : indicateur barre verticale violette + fond accent
  léger.
- **D-D7 → A** : tooltip label simple.
- **D-D8 → A** : Settings placeholder visible dès UI-006.

### Alternatives écartées

- **Garder `<Sidebar />` UI-001b et juste appliquer le theming yukki dark**
  — ne livre pas la double sidebar VS Code-style demandée par la
  story.
- **Activity bar à droite** — non conforme à VS Code/Cursor/Zed.
- **Toggle light/dark dans Settings dès UI-006** — alourdit le scope ;
  UI-002 dédiée est plus propre.
- **Champ shell ajouté dans `useArtifactsStore`** — casse l'isolation
  des stores (Invariant I6 UI-001b). Refusé.
- **Persistance via binding Go `App.SaveUIPrefs`** — ajoute 2
  bindings Wails et un fichier hors-projet à gérer pour un gain
  faible (cross-projet). localStorage suffit en V1.
- **Animation collapse avec width:24px (peek)** — non standard ;
  VS Code fait full collapse.
- **Drag-to-resize sidebar** — différé post-MVP (story future).

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `frontend/src/components/hub/Sidebar.tsx` | (existant) | **suppression** |
| `frontend/src/components/hub/SidebarToggle.tsx` | (existant) | **suppression** |
| `frontend/src/components/hub/ActivityBar.tsx` | nouveau | composant complet 5 icônes + tooltip + indicateur actif |
| `frontend/src/components/hub/SidebarPanel.tsx` | nouveau | header titre + close + body conditionnel (HubList ou Settings placeholder) |
| `frontend/src/components/ui/tooltip.tsx` | nouveau | shadcn add |
| `frontend/src/stores/shell.ts` | nouveau | 5ᵉ store Zustand + persist middleware |
| `frontend/src/styles/globals.css` | modif | overrides palette yukki dark sur `.dark` |
| `frontend/src/App.tsx` | refactor | layout {ClaudeBanner / [ActivityBar SidebarPanel main]} ; suppression du split horizontal HubList+StoryViewer |
| `frontend/index.html` | modif minimale | `<html lang="en" class="dark">` |
| `frontend/package.json` / `package-lock.json` | faible | `+ @radix-ui/react-tooltip` (peer-dep shadcn add tooltip) |
| `frontend/src/components/hub/HubList.tsx` | nul | API préservée ; rendu visuel adapté via CSS vars (header, badges, table) |
| `frontend/src/components/hub/StoryViewer.tsx` | nul | API préservée ; le wrapper `<article className="prose dark:prose-invert">` rend déjà bien sur dark |
| `frontend/src/components/hub/ClaudeBanner.tsx` | nul | hérite des CSS vars |
| `frontend/src/components/hub/NewStoryModal.tsx` | nul | Dialog shadcn hérite des CSS vars |
| `frontend/src/components/hub/ProjectPicker.tsx` | nul | hérite des CSS vars (à valider visuellement) |
| `frontend/src/stores/{project,artifacts,claude,generation}.ts` | nul | aucun changement |
| Backend Go (tous packages), `wailsjs/go/main/App.{d.ts,js}` | nul | aucun changement, aucune nouvelle binding |

### Schéma de flux

```
   ┌─ FENÊTRE WAILS ──────────────────────────────────────────┐
   │  <ClaudeBanner />  (top, conditionnel, hérite dark vars) │
   ├──────────────────────────────────────────────────────────┤
   │ ┌─ ActivityBar ─┐ ┌─ SidebarPanel ─────┐ ┌─ Main ─────┐ │
   │ │  ●  Stories   │ │ Stories     [×]    │ │            │ │
   │ │  ○  Analyses  │ │ ───────────────────│ │            │ │
   │ │  ○  Canvas    │ │  <HubList />       │ │ <Story-    │ │
   │ │  ○  Tests     │ │  - id  title  ...  │ │  Viewer /> │ │
   │ │               │ │  ...               │ │            │ │
   │ │               │ │                    │ │            │ │
   │ │  ○  Settings  │ │                    │ │            │ │
   │ │  (~52px)      │ │  (240px)           │ │  (flex-1)  │ │
   │ └───────────────┘ └────────────────────┘ └────────────┘ │
   └──────────────────────────────────────────────────────────┘

   useShellStore                    useArtifactsStore
   ─────────────                    ──────────────────
   activeMode: 'stories'            kind: 'stories'   ◄────┐
   sidebarOpen: true                items: [...]            │
   setActiveMode(m) ───────────────► setKind(m) ────────────┘
                                    (sync uni-directionnelle, I4)

   Sidebar collapsed:
   ┌─ ActivityBar ─┐ ┌─ Main (full width) ─────────────────┐
   │  ○  Stories   │ │                                     │
   │  ○  ...       │ │  <StoryViewer /> takes 100%        │
   │               │ │                                     │
   └───────────────┘ └─────────────────────────────────────┘

   Click sur l'icône du mode actif → sidebarOpen=false (animation 150ms)
   Click sur une autre icône     → activeMode=m, sidebarOpen=true (instantané)

   Persistance :
   ─────────────
   useShellStore (persist middleware) ──► localStorage:'yukki:shell-prefs'
                                                     │
                                                     ▼
                                          {activeMode, sidebarOpen}

   Au load suivant : hydratation auto par persist middleware,
   défaut {activeMode:'stories', sidebarOpen:true} si vide.
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation livrable indépendamment
> en 1 commit atomique.

### O1 — Theming yukki dark dans `globals.css` + `<html class="dark">`

- **Module** : `frontend/src/styles` + `frontend/index.html`
- **Fichiers** :
  - `frontend/src/styles/globals.css` (modif)
  - `frontend/index.html` (modif minimale)
- **Comportement** :
  1. Dans `globals.css`, remplacer la section `.dark { ... }`
     par les valeurs yukki dark :
     ```css
     .dark {
       --background: 240 10% 11%;
       --foreground: 240 5% 95%;
       --card: 240 10% 13%;
       --card-foreground: 240 5% 95%;
       --popover: 240 10% 13%;
       --popover-foreground: 240 5% 95%;
       --primary: 263 70% 65%;
       --primary-foreground: 0 0% 100%;
       --secondary: 240 8% 18%;
       --secondary-foreground: 240 5% 95%;
       --muted: 240 8% 18%;
       --muted-foreground: 240 5% 65%;
       --accent: 240 8% 22%;
       --accent-foreground: 240 5% 95%;
       --destructive: 0 75% 55%;
       --destructive-foreground: 0 0% 100%;
       --border: 240 8% 22%;
       --input: 240 8% 22%;
       --ring: 263 70% 65%;
     }
     ```
  2. Dans `frontend/index.html`, ajouter `class="dark"` sur la
     balise `<html>` :
     ```html
     <html lang="en" class="dark">
     ```
- **Tests** : aucun automatisé. Validation manuelle AC5 (palette
  visible dans toutes les surfaces).

### O2 — Tooltip shadcn

- **Module** : `frontend/src/components/ui`
- **Fichier** : `frontend/src/components/ui/tooltip.tsx` (nouveau)
- **Comportement** :
  - Ajouter via `cd frontend && npx shadcn@latest add tooltip`.
  - Le fichier généré exporte `TooltipProvider`, `Tooltip`,
    `TooltipTrigger`, `TooltipContent`.
  - Aucune modification post-add ; on consomme tel quel.
  - Si `@radix-ui/react-tooltip` pas déjà dans `package.json`,
    `shadcn add` l'ajoute auto (peer-dep).
- **Tests** : aucun.

### O3 — `useShellStore` Zustand store + persist

- **Module** : `frontend/src/stores`
- **Fichier** : `frontend/src/stores/shell.ts` (nouveau)
- **Signatures** :
  ```typescript
  import { create } from 'zustand';
  import { persist } from 'zustand/middleware';
  import { useArtifactsStore } from './artifacts';

  export type ShellMode = 'stories' | 'analysis' | 'prompts' | 'tests' | 'settings';

  const SPDD_KINDS: ShellMode[] = ['stories', 'analysis', 'prompts', 'tests'];

  interface ShellState {
    activeMode: ShellMode;
    sidebarOpen: boolean;

    setActiveMode: (mode: ShellMode) => void;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    openSidebar: () => void;
  }

  export const useShellStore = create<ShellState>()(
    persist(
      (set, get) => ({
        activeMode: 'stories',
        sidebarOpen: true,

        setActiveMode: (mode) => {
          const { activeMode, sidebarOpen } = get();
          // Toggle si même mode et sidebar ouverte → ferme
          if (mode === activeMode && sidebarOpen) {
            set({ sidebarOpen: false });
            return;
          }
          // Sinon : bascule contenu, ouvre la sidebar
          set({ activeMode: mode, sidebarOpen: true });
          // Sync uni-directionnelle vers useArtifactsStore (I4)
          if (SPDD_KINDS.includes(mode)) {
            useArtifactsStore.getState().setKind(mode);
          }
        },

        toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
        closeSidebar: () => set({ sidebarOpen: false }),
        openSidebar: () => set({ sidebarOpen: true }),
      }),
      { name: 'yukki:shell-prefs' },
    ),
  );
  ```
- **Comportement** :
  1. `activeMode` et `sidebarOpen` persistés en `localStorage`
     clé `yukki:shell-prefs` via le middleware `persist`.
  2. `setActiveMode(m)` :
     - si `m === activeMode && sidebarOpen` → ferme la sidebar
       (toggle).
     - sinon → bascule mode + ouvre la sidebar.
     - propagation à `useArtifactsStore.setKind(m)` ssi `m`
       ∈ `SPDD_KINDS` (Invariant I3).
  3. `toggleSidebar/closeSidebar/openSidebar` : actions simples.
- **Tests** : aucun en V1. Validation manuelle.

### O4 — `<ActivityBar />` composant

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/ActivityBar.tsx` (nouveau)
- **Signatures** :
  ```typescript
  import { BookOpen, CheckSquare, Cog, FileText, Lightbulb, type LucideIcon } from 'lucide-react';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from '@/components/ui/tooltip';
  import { cn } from '@/lib/utils';
  import { useShellStore, type ShellMode } from '@/stores/shell';

  interface ActivityItem {
    mode: ShellMode;
    label: string;
    Icon: LucideIcon;
  }

  const PRIMARY_ITEMS: ActivityItem[] = [
    { mode: 'stories',  label: 'Stories',  Icon: BookOpen },
    { mode: 'analysis', label: 'Analyses', Icon: Lightbulb },
    { mode: 'prompts',  label: 'Canvas',   Icon: FileText },
    { mode: 'tests',    label: 'Tests',    Icon: CheckSquare },
  ];

  const SETTINGS_ITEM: ActivityItem = {
    mode: 'settings', label: 'Settings', Icon: Cog,
  };

  export function ActivityBar(): JSX.Element
  ```
- **Comportement** :
  1. Render `<aside>` flex-col `w-13` (52px), `bg-card`,
     `border-r border-border`.
  2. Rendre les 4 `PRIMARY_ITEMS` empilés au-dessus, puis un
     `flex-grow` spacer, puis `SETTINGS_ITEM` en bas.
  3. Chaque item :
     ```tsx
     <TooltipProvider delayDuration={300}>
       <Tooltip>
         <TooltipTrigger asChild>
           <button
             type="button"
             onClick={() => setActiveMode(item.mode)}
             className={cn(
               'relative flex h-12 w-full items-center justify-center transition-colors',
               'hover:bg-accent text-muted-foreground hover:text-foreground',
               isActive && 'bg-accent/50 text-foreground',
             )}
           >
             {isActive && (
               <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-primary" />
             )}
             <item.Icon className="h-5 w-5" />
           </button>
         </TooltipTrigger>
         <TooltipContent side="right">{item.label}</TooltipContent>
       </Tooltip>
     </TooltipProvider>
     ```
  4. `isActive = item.mode === activeMode` ; lit `activeMode` du
     store via `useShellStore((s) => s.activeMode)`.
  5. Click → `useShellStore.getState().setActiveMode(item.mode)`.
- **Tests** : aucun. Validation manuelle AC1-AC4.

### O5 — `<SidebarPanel />` composant

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/SidebarPanel.tsx` (nouveau)
- **Signatures** :
  ```typescript
  import { X } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';
  import { useShellStore } from '@/stores/shell';
  import { HubList } from './HubList';

  const TITLES: Record<string, string> = {
    stories: 'Stories',
    analysis: 'Analyses',
    prompts: 'Canvas',
    tests: 'Tests',
    settings: 'Settings',
  };

  export function SidebarPanel(): JSX.Element
  ```
- **Comportement** :
  1. Lit `activeMode` et `sidebarOpen` de `useShellStore`.
  2. Render `<aside>` avec animation de largeur :
     ```tsx
     <aside
       className={cn(
         'border-r border-border bg-card transition-[width] duration-150 ease-out overflow-hidden',
         sidebarOpen ? 'w-60' : 'w-0',
         // responsive overlay < 768px
         'max-md:fixed max-md:inset-y-0 max-md:left-13 max-md:z-40',
       )}
       aria-label="Mode panel"
     >
     ```
  3. Header :
     ```tsx
     <header className="flex h-10 items-center justify-between border-b border-border px-3">
       <h2 className="text-sm font-semibold">{TITLES[activeMode]}</h2>
       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeSidebar}>
         <X className="h-4 w-4" />
       </Button>
     </header>
     ```
  4. Body conditionnel :
     - si `activeMode !== 'settings'` → `<HubList className="flex-1" />`
     - si `activeMode === 'settings'` → placeholder
       ```tsx
       <div className="p-4 text-sm text-muted-foreground">
         Settings panel — UI-007 (à venir).
       </div>
       ```
  5. Si `sidebarOpen === false`, le `width-0` cache visuellement
     ; pas besoin de `display:none`. `overflow-hidden` empêche
     les enfants de déborder pendant l'animation.
- **Tests** : aucun. Validation manuelle AC2-AC4 + AC7-AC9.

### O6 — Refactor `App.tsx`

- **Module** : `frontend/src`
- **Fichier** : `frontend/src/App.tsx` (refactor complet)
- **Comportement** :
  1. Suppression des imports `Sidebar` et `SidebarToggle`.
  2. Suppression du state local `[collapsed, setCollapsed]` et
     du listener `matchMedia` (le responsive overlay est géré
     par les classes Tailwind `max-md:*` du SidebarPanel).
  3. Nouveau layout :
     ```tsx
     import { useEffect } from 'react';
     import { ActivityBar } from '@/components/hub/ActivityBar';
     import { ClaudeBanner } from '@/components/hub/ClaudeBanner';
     import { ProjectPicker } from '@/components/hub/ProjectPicker';
     import { SidebarPanel } from '@/components/hub/SidebarPanel';
     import { StoryViewer } from '@/components/hub/StoryViewer';
     import { useClaudeStore } from '@/stores/claude';
     import { useProjectStore } from '@/stores/project';

     export default function App() {
       const projectDir = useProjectStore((s) => s.projectDir);
       const refreshClaude = useClaudeStore((s) => s.refresh);

       useEffect(() => {
         void refreshClaude();
       }, [refreshClaude]);

       if (!projectDir) {
         return <ProjectPicker />;
       }

       return (
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
       );
     }
     ```
  4. `<HubList />` n'est plus importé ici — il est rendu
     **dans** `<SidebarPanel />`.
- **Tests** : aucun. Validation AC8 (no regression).

### O7 — Suppression `<Sidebar />` + `<SidebarToggle />`

- **Module** : `frontend/src/components/hub`
- **Fichiers supprimés** :
  - `frontend/src/components/hub/Sidebar.tsx`
  - `frontend/src/components/hub/SidebarToggle.tsx`
- **Comportement** :
  1. `git rm` les deux fichiers.
  2. Vérifier `grep -r "from.*Sidebar'" frontend/src/` → doit
     retourner 0 résultat (sauf SidebarPanel qui est
     un nouveau composant).
- **Tests** : `tsc --noEmit` doit rester vert (pas d'import
  orphelin).

### O8 — Adaptations cosmétiques `<HubList />` (si nécessaire)

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/HubList.tsx` (modif
  minimale conditionnelle)
- **Comportement** :
  1. Le composant est rendu dans une sidebar de 240px (au lieu
     de 50% main). Le bouton *New Story* (UI-001c) avec son icône
     + label "New Story" peut dépasser. **Si test manuel
     confirme dépassement**, réduire à icône-only ou label "New".
  2. La table actuelle a 4 colonnes (id, title, status, updated).
     Dans 240px, c'est très serré. **Si test manuel confirme
     illisibilité**, soit :
     - réduire à 2 colonnes (id + title), status badge inline
       sous le title, updated tooltip
     - soit accepter le scroll horizontal
  3. Aucune modification proactive en O8 — le Operation existe
     comme **placeholder de revue** ; si AC8 + manual test
     révèlent un problème, on patch ici. Sinon, no-op.
- **Tests** : validation manuelle AC8.

---

## N — Norms

- **TypeScript strict** (déjà config UI-001a) : pas d'`any`.
- **CSS variables shadcn uniquement** : aucun composant ne hardcode
  un hex color de la palette. Tout passe par `bg-background`, `text-foreground`,
  `border-border`, `bg-accent`, `text-primary`, etc. (Invariant I6).
- **Tailwind** : pas d'arbitrary values en V1, sauf pour la largeur
  exacte de l'activity bar (`w-13` = 52px) et la sidebar
  (`w-60` = 240px) qui sont des classes Tailwind standards.
- **lucide-react** : seule iconothèque autorisée (D-D OQ4).
- **Zustand** : 5 stores isolés (Invariant I6 UI-001b ; UI-006
  ajoute le 5ᵉ). Pas de mega-store.
- **shadcn/ui** : composants ajoutés via `npx shadcn add <component>`,
  pas réécrits à la main. Tooltip ajouté en O2.
- **Animation** : transition CSS Tailwind 150ms ease-out, pas
  de `framer-motion` ni autre lib. Cohérent avec UI-001b.
- **Accessibilité** : `aria-label` sur les `<aside>`, tooltips
  Radix accessibles par défaut, focus visible géré par
  `focus-visible:ring-ring`.
- **Tests UI** : aucun en V1 (Playwright/Cypress = post-MVP,
  cohérent UI-001b/c).
- **CI** : aucun nouveau step. `static-checks` couvre
  `tsc --noEmit`, `ui-build` couvre `vite build`.
- **Convention de commit** : `style(ui)` ou `feat(ui)` selon que
  c'est purement visuel ou que ça apporte un comportement.
  UI-006 mélange les deux ; un `feat(ui-006)` global est OK.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Backend Go : 0 changement (Invariant I5)**
  - Aucun fichier sous `internal/`, `cmd/yukki/`, ou autre Go
    n'est modifié. Si une Operation génère un import Go ou
    modifie un .go, c'est un bug à signaler.
  - depguard CORE-002 reste vert sans avoir besoin d'être
    re-vérifié — on ne touche rien.
  - Tests Go ne sont pas relancés (gain CI ; le scope est
    étranger).
- **APIs React des composants UI-001b/c préservées (Invariant I2)**
  - Pas de modification de props sur `<HubList />`,
    `<StoryViewer />`, `<ClaudeBanner />`, `<NewStoryModal />`,
    `<ProjectPicker />`. Modifications visuelles uniquement
    via CSS vars.
  - Si une adaptation visuelle dans HubList (O8) est nécessaire,
    c'est interne au composant ; les props consumées par
    SidebarPanel restent celles d'UI-001b.
- **Stores Zustand isolés (Invariant I1)**
  - `useShellStore` n'**importe** pas les autres stores.
    L'appel à `useArtifactsStore.getState().setKind` est fait
    via `getState()` (pattern Zustand officiel pour
    cross-store), pas via un `import { useArtifactsStore }`.
  - Aucun autre store n'importe `useShellStore`.
- **Caller unique de `setKind` (Invariant I4)**
  - `useArtifactsStore.setKind` n'est appelé QUE depuis
    `useShellStore.setActiveMode`. Tout autre call est un
    bug à reporter en revue. Marqueur : ajouter un commentaire
    `// @internal — call only via useShellStore.setActiveMode`
    sur `setKind` dans `artifacts.ts` (sans le rendre privé,
    pour ne pas casser les tests internes éventuels).
- **Theming hardcodé interdit**
  - Aucun composant n'écrit de hex color (`#1A1A1F`, `#8B5CF6`,
    etc.) dans son JSX ou son CSS. Tout passe par les classes
    shadcn ou les vars CSS. Si une couleur de la palette doit être
    affinée, c'est dans `globals.css`, point.
- **Pas de hold-over UI-001b**
  - Les fichiers `Sidebar.tsx` et `SidebarToggle.tsx` sont
    **supprimés** (D-D4). Aucun import résiduel autorisé.
- **Pas de toggle light/dark en V1**
  - Le mode dark est forcé. Aucun bouton, raccourci, ou setting
    ne permet de basculer en light en UI-006. Si l'utilisateur
    veut light, c'est UI-002 future story.
- **Pas de drag-to-resize**
  - La sidebar fait 240px figée. Pas de poignée de resize, pas
    de raccourci. Différé post-MVP.
- **Pas de feature flag, pas de retro-compat fictive**
  - Le canvas est la spec, le code la suit. Aucun `if (oldShell)
    return <Sidebar/>`.
- **Pas de logging frontend bavard**
  - Le store ne log pas via `console.log`. Erreurs (ex.
    `localStorage` indispo) sont absorbées par `persist`
    middleware silencieusement.
- **Pas de modification des artefacts SPDD existants**
  - Les fichiers `spdd/stories/*.md`, `spdd/analysis/*.md`,
    `spdd/prompts/*.md` ne sont pas touchés (sauf cette story
    elle-même, son analyse, son canvas).
- **Pas de modification de `cmd/yukki/`, `ui_mock.go`, `ui_prod.go`,
  `ui.go`, `wails.json`, `main.go`, `main_test.go`**
  - Tous les fichiers du root et de `cmd/yukki/` restent
    intacts. Le scope est strictement `frontend/src/` et
    `frontend/index.html`.

---

## Changelog

- **2026-05-02 — création** — canvas v1 issu de l'analyse UI-006
  reviewed, 7 OQs (story) + 8 D-D (analyse) toutes en reco par
  défaut. 8 Operations livrables.
- **2026-05-02 — implementation** — O1..O7 livrés. O8 no-op
  (HubList rend correctement dans 240px). Ajustements internes
  vs canvas : (a) `tailwind.config.js` étendu avec
  `spacing.13 = 3.25rem` (la classe `w-13` annoncée par le
  canvas n'existe pas dans la scale Tailwind par défaut, qui
  saute de `w-12` à `w-14` ; on garde donc `w-13` côté JSX
  conformément au canvas en l'ajoutant à la theme — pas
  d'arbitrary value). (b) `useShellStore` augmenté d'un
  hook `onRehydrateStorage` qui appelle `setKind` après
  rehydration depuis localStorage si `activeMode` ∈ SPDD_KINDS,
  pour que `useArtifactsStore.kind` soit aligné dès le mount —
  sinon AC1/AC2 cassent au second lancement quand
  `activeMode` rehydraté ≠ `'stories'` (default kind). Reste
  dans Invariant I4 (useShellStore = unique caller). `tsc
  --noEmit` ✓, `vite build` ✓.
