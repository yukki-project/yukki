---
id: UI-006
slug: shell-vscode-layout
story: .yukki/stories/UI-006-shell-vscode-layout.md
status: reviewed
created: 2026-05-02
updated: 2026-05-02
---

# Analyse — UI-006 (delta) — Shell VS Code-style + theming yukki dark

> **Analyse de delta** — la story UI-006 a déjà tranché 7 décisions
> (OQ1..OQ7 toutes en reco par défaut). Cette analyse complète avec
> les choix architecturaux secondaires (D-D1..D-D8) qui n'apparaissent
> qu'à la lecture du code existant.

## Mots-clés métier extraits (validés)

`ActivityBar`, `SidebarPanel` (collapsable), `VSCode-layout`, `yukki-dark-theme`,
`tooltip` (shadcn), `localStorage`, `lucide-react`, `shadcn CSS vars`,
`responsive overlay <768px`, `activeMode` (state), `dark theme`.

## Concepts existants exploités par UI-006

### Frontend (UI-001a/b/c)

- **`frontend/src/styles/globals.css`** — déjà structuré en CSS
  variables shadcn avec sections `:root` (light) et `.dark` (dark
  theme placeholder, valeurs slate par défaut). UI-006 modifie les
  valeurs `.dark` pour la palette yukki dark et force `dark` sur l'élément
  racine. Le pattern existe, il n'y a qu'à le remplir.
- **`frontend/src/components/hub/Sidebar.tsx`** — composant actuel
  qui mélange icônes + listing. UI-006 le **splite** en :
  - `<ActivityBar />` (extraction des icônes)
  - `<SidebarPanel />` (extraction du listing + titre du mode)
  L'ancien `Sidebar.tsx` peut soit disparaître, soit devenir un
  wrapper de compatibilité (pas nécessaire en V1, on supprime).
- **`useArtifactsStore`** (UI-001b,
  `frontend/src/stores/artifacts.ts`) — possède déjà `kind`, `setKind`,
  qui correspondent au "mode actif" pour les 4 kinds SPDD (stories,
  analysis, prompts, tests). UI-006 **ne duplique pas** ce champ ;
  un nouveau `useShellStore.activeMode` fait la jonction avec un
  5ᵉ mode "settings" qui n'est pas un kind SPDD.
- **`useProjectStore`, `useClaudeStore`, `useGenerationStore`** —
  inchangés. Le shell V2 les consomme tels quels.
- **`<HubList />` (UI-001b/c)** — props inchangés. Le composant est
  rendu **dans** `<SidebarPanel />` (et non plus dans la zone main).
  Conséquence subtile : le bouton *New Story* (UI-001c) reste dans
  le header de HubList, donc visible quand le mode Stories est actif.
- **`<StoryViewer />` (UI-001b)** — props inchangés. Occupe
  désormais tout le main content (n'est plus en split horizontal
  avec HubList).
- **`<ClaudeBanner />` (UI-001b)** — inchangé, reste en haut de
  l'écran (au-dessus de l'activity bar et du panel).
- **`<ProjectPicker />` (UI-001b)** — inchangé. S'affiche quand
  `projectDir === ''`. Bénéficie automatiquement du theming yukki dark
  via les CSS vars (Invariant héritage shadcn).
- **`shadcn/ui` Dialog** (UI-001c) — inchangé. Hérite du theming via
  CSS vars (OQ7 figée).
- **`lucide-react`** (UI-001a) — déjà utilisé. UI-006 ajoute les
  icônes manquantes : `Cog` (Settings), `CheckSquare` (Tests, à la
  place de l'actuel `RefreshCw` qui restera réservé à l'action
  refresh).

### Backend Go

- **Aucun changement.** UI-006 est strictement frontend. Pas de
  nouveau binding, pas de modif des stores Wails. Le `App.AllowedKinds()`
  binding existant suffit pour peupler les 4 icônes principales de
  l'activity bar (l'icône Settings est statique côté front).

## Concepts nouveaux UI-006-spécifiques

- **`<ActivityBar />`** —
  `frontend/src/components/hub/ActivityBar.tsx` (nouveau). Colonne
  fixe ~52px à gauche. Affiche 5 boutons icône (4 kinds + Settings)
  empilés verticalement. Settings séparé par un `flex-grow` pour
  être en bas. Au mount : `await App.AllowedKinds()` pour hydrater
  la liste (cohérent UI-001b D-B3). Indicateur visuel "actif" :
  barre verticale violette à gauche de l'icône (D-D6). Tooltip au
  hover via `<Tooltip />` shadcn (OQ3 figée). Click → appelle
  `useShellStore.setActiveMode(mode)`.
- **`<SidebarPanel />`** —
  `frontend/src/components/hub/SidebarPanel.tsx` (nouveau). Panneau
  240px. Header : titre du mode actif (capitalize) + bouton X close
  (cohérent UX). Body :
  - si `activeMode` ∈ kinds SPDD → render `<HubList />` (UI-001b/c)
  - si `activeMode === 'settings'` → render placeholder "Settings —
    UI-007 à venir" (AC9 figé)
  Animation collapse via Tailwind `transition-[width]` 150ms +
  `width-0` quand `sidebarOpen=false` (D-D6 OQ6 full collapse).
- **`useShellStore`** — 5ᵉ store Zustand
  (`frontend/src/stores/shell.ts`, nouveau). Champs :
  - `activeMode: 'stories' | 'analysis' | 'prompts' | 'tests' | 'settings'`
  - `sidebarOpen: boolean`
  - actions : `setActiveMode(mode)`, `toggleSidebar()`,
    `closeSidebar()`, `openSidebar()`
  Logique de transition : `setActiveMode(m)` → si `m === activeMode
  && sidebarOpen` alors `sidebarOpen=false` (toggle ferme) ; sinon
  `activeMode=m, sidebarOpen=true`. Cohérence avec
  `useArtifactsStore.kind` : si `m` est un kind SPDD, le setter
  appelle aussi `useArtifactsStore.setKind(m)`. Garantit que la liste
  rafraîchit au switch de mode.
- **Persistance via Zustand `persist` middleware** —
  `zustand/middleware`. Sauve `activeMode + sidebarOpen` dans
  `localStorage` clé `yukki:shell-prefs`. (D-D2). Hydratation
  asynchrone gérée par le middleware ; pas de flash visuel.
- **`<Tooltip />` shadcn** — composant ajouté via `npx shadcn add
  tooltip`. Wrappe les boutons de l'activity bar.
- **CSS variables yukki dark** dans `globals.css` (modif) :
  ```css
  .dark {
    --background: 240 10% 11%;        /* #1A1A1F approx */
    --foreground: 240 5% 95%;          /* #F0F0F2 approx */
    --card: 240 10% 13%;               /* surface */
    --card-foreground: 240 5% 95%;
    --popover: 240 10% 13%;
    --popover-foreground: 240 5% 95%;
    --primary: 263 70% 65%;            /* #8B5CF6 violet */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 8% 18%;           /* surface élevée */
    --secondary-foreground: 240 5% 95%;
    --muted: 240 8% 18%;
    --muted-foreground: 240 5% 65%;    /* #9CA3AF approx */
    --accent: 240 8% 22%;
    --accent-foreground: 240 5% 95%;
    --destructive: 0 75% 55%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 8% 22%;              /* #2E2E36 approx */
    --input: 240 8% 22%;
    --ring: 263 70% 65%;               /* violet ring focus */
  }
  ```
  Force `<html class="dark">` au load via `frontend/index.html`
  (ou via `useEffect` dans `App.tsx`). D-D3 reco : forcé dark V1.
- **Refonte `App.tsx`** — layout :
  ```tsx
  <main className="min-h-screen flex flex-col bg-background">
    <ClaudeBanner />
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar />
      <SidebarPanel />
      <section className="flex-1 overflow-hidden">
        <StoryViewer className="flex-1" />
      </section>
    </div>
  </main>
  ```
  Le wrapper actuel `<HubList /> + <StoryViewer />` split horizontal
  disparaît ; HubList passe **dans** SidebarPanel.

## Approche stratégique (delta UI-006)

1. **Splitter sans casser.** L'API React de `<HubList />`,
   `<StoryViewer />`, `<ClaudeBanner />`, `<NewStoryModal />`,
   `<ProjectPicker />` ne change **pas**. Seuls Sidebar.tsx et
   App.tsx sont refactorés. UI-001b/c restent fonctionnels.
2. **State shell isolé.** Nouveau store dédié `useShellStore`
   (D-D1) plutôt que d'enrichir `useArtifactsStore` — Invariant I6
   UI-001b "stores isolés" préservé.
3. **Sync uni-directionnelle activeMode → kind.** Quand l'utilisateur
   switch de mode dans l'activity bar, `setActiveMode` propage à
   `useArtifactsStore.setKind` (qui déclenche le refresh). L'inverse
   n'a pas de sens : `kind` ne change pas en dehors de
   `setActiveMode`.
4. **Theming dark forcé V1.** Pas de toggle light/dark (UI-002
   future story, D-D3). Modifier `.dark` valeurs CSS vars + ajouter
   `<html class="dark">` au load. Toutes les surfaces shadcn
   héritent automatiquement.
5. **Persistance via Zustand persist.** Lib officielle, robuste,
   pas de hand-roll. localStorage clé namespacée `yukki:shell-prefs`.
6. **Suppression `<SidebarToggle />`** (D-D4) — l'activity bar
   suffit pour toggle. Le composant existant peut être supprimé
   ou conservé en fallback si l'utilisateur préfère un bouton
   visible. Reco : supprimer pour réduire la surface.
7. **Responsive overlay <768px** : la sidebar passe en `position:
   fixed` au lieu de `relative` quand viewport < 768px ; un voile
   sombre sur le main content + click pour fermer. AC7 figé.

## Modules impactés (delta UI-006)

| Module | Impact UI-006 | Nature |
|---|---|---|
| `frontend/src/components/hub/Sidebar.tsx` | **fort** | suppression / refactor en 2 composants |
| `frontend/src/components/hub/ActivityBar.tsx` | **nouveau** | composant complet avec icônes + tooltip + barre indicateur |
| `frontend/src/components/hub/SidebarPanel.tsx` | **nouveau** | wrapper de HubList ou placeholder Settings selon `activeMode` |
| `frontend/src/components/hub/SidebarToggle.tsx` | moyen | suppression (D-D4) |
| `frontend/src/components/ui/tooltip.tsx` | nouveau | shadcn add |
| `frontend/src/stores/shell.ts` | **nouveau** | 5ᵉ store Zustand avec `persist` middleware |
| `frontend/src/styles/globals.css` | moyen | overrides palette yukki dark sur `.dark` |
| `frontend/src/App.tsx` | **fort** | refactor complet du layout (ActivityBar + SidebarPanel + main) |
| `frontend/index.html` | faible | ajouter `<html class="dark">` (ou faire au mount via useEffect) |
| `frontend/package.json` | faible | éventuel `+ @radix-ui/react-tooltip` (peer-dep shadcn) si pas déjà tiré |
| Backend Go (tous packages) | nul | aucun changement |
| `<HubList />`, `<StoryViewer />`, `<ClaudeBanner />`, `<NewStoryModal />`, `<ProjectPicker />` | nul | API préservée ; rendu peut visuellement changer via CSS vars |
| `wailsjs/go/main/App.{d.ts,js}` | nul | aucune nouvelle binding |

## Dépendances et intégrations (delta)

- **Frontend** :
  - `@radix-ui/react-tooltip` (peer-dep ajoutée par shadcn add tooltip)
  - `zustand/middleware` (déjà tiré par zustand@4.5.5 UI-001a, juste
    importer le `persist`)
- **Aucune nouvelle dépendance Go**.
- **Wails events** : aucun nouvel event. UI-006 ne touche pas au
  flux events `provider:start`/`provider:end`.

## Risques et points d'attention

- **Cassure du flow UI-001c** *(prob. faible, impact moyen)*. Le
  bouton *New Story* est dans `<HubList />` header. Quand HubList
  passe dans SidebarPanel (240px de large), le bouton risque d'être
  trop comprimé. **Mitigation** : test manuel ; si le bouton dépasse,
  réduire le label ("New" au lieu de "New Story") ou icône-only.
- **localStorage indisponible** *(prob. très faible, impact faible)*.
  En contexte Wails desktop, localStorage est toujours dispo.
  **Mitigation** : Zustand persist a un fallback in-memory natif
  ; pas de crash, juste perte de prefs.
- **Drift entre `useShellStore.activeMode` et `useArtifactsStore.kind`**
  *(prob. moyenne, impact moyen)*. Si un autre composant appelle
  `useArtifactsStore.setKind` directement (court-circuitant
  `setActiveMode`), les deux états divergent. **Mitigation** :
  convention "un seul caller pour `setKind` = `setActiveMode`" ;
  un commentaire `@deprecated, use setActiveMode` sur setKind.
  Ou plus radical : retirer setKind de l'export public et passer
  uniquement par setActiveMode. Reco : commentaire en V1, refactor
  plus dur en future story si dérive.
- **Theming yukki dark qui casse certaines lisibilités** *(prob. moyenne,
  impact faible)*. Une variable mal calibrée peut donner un texte
  invisible sur fond. **Mitigation** : revue manuelle exhaustive
  AC5 ; ajustement itératif des HSL.
- **Animation collapse 0px qui flashe le contenu** *(prob. faible,
  impact faible)*. Si le SidebarPanel rend ses enfants même à
  width:0, le browser peut flasher. **Mitigation** : `overflow-hidden`
  sur le panel + `display:none` quand fully closed (post-animation).
- **Responsive overlay z-index conflict avec Dialog** *(prob.
  faible, impact moyen)*. Le NewStoryModal Dialog a un z-index
  élevé (shadcn défaut 50). L'overlay sidebar < 768px doit être
  *en-dessous* du Dialog. **Mitigation** : sidebar overlay z=40,
  Dialog z=50 (shadcn défaut). Vérifier l'ordre de stacking.
- **Première ouverture sans projet sélectionné** *(prob. haute,
  impact faible)*. Si `projectDir === ''`, on render
  `<ProjectPicker />` plein écran (UI-001b). UI-006 ne change pas
  ce comportement, mais le ProjectPicker doit aussi être themed
  yukki dark. Vérifier au test.
- **Re-render coûteux du store persist** *(prob. faible, impact
  faible)*. Zustand persist écrit à chaque mutation. Pas de risque
  de perf en V1 (mutations rares — clic icône, toggle).

## Cas limites

- **Première ouverture (localStorage vide)** : default state
  `activeMode='stories'`, `sidebarOpen=true`. Sidebar visible
  avec liste des stories.
- **Mode "settings" actif au lancement précédent** : restauré tel
  quel ; sidebar affiche le placeholder Settings.
- **Resize fenêtre traversant 768px en cours d'utilisation** : la
  sidebar passe de push (>=768px) à overlay (<768px) ou inverse.
  Tester transition smooth (pas de saut visuel).
- **localStorage corrompu (JSON invalide)** : Zustand persist parse
  fails → fallback default state. Acceptable, pas de crash.
- **Click sur icône activity bar pendant que le NewStoryModal est
  ouvert** : la sidebar bascule en arrière-plan (Dialog au-dessus).
  L'utilisateur ferme le modal et voit le nouveau mode actif.
- **Click sur Settings sans projectDir sélectionné** : on est en
  ProjectPicker, l'activity bar n'est pas rendue (cohérent UI-001b).
  Donc cas impossible.
- **Tooltip au hover sur viewport très étroit (<400px)** : peut
  déborder. Radix gère le placement automatique ; pas de mitigation.
- **Theme dark forcé sans `<html class="dark">`** : si on oublie
  l'ajout, le default light s'applique et casse le visuel. AC5
  bloque ce cas en revue.

## Décisions UI-006-spécifiques (delta — à prendre avant canvas)

> Les 7 décisions OQ1..OQ7 de la story restent valides ; ces D-D*
> additionnent les choix architecturaux secondaires révélés par le
> scan code.

- [ ] **D-D1 — Nouveau store `useShellStore` ou champ ajouté à
  `useArtifactsStore` ?**
  *(Reco : nouveau store dédié `frontend/src/stores/shell.ts`.
  Préserve l'Invariant I6 UI-001b "stores isolés", sépare les
  préoccupations shell vs artefacts.)*
- [ ] **D-D2 — Persistance via Zustand `persist` middleware ou
  hand-roll subscribe + localStorage ?**
  *(Reco : `persist` middleware. Lib officielle, gère
  hydratation/parse/fallback nativement, ~5 lignes
  d'implémentation.)*
- [ ] **D-D3 — Mode dark forcé V1 ou toggle light/dark dans
  Settings dès UI-006 ?**
  *(Reco : forcé dark en V1. UI-002 Theming = future story dédiée
  pour le toggle. Réduit le scope UI-006 et évite de devoir tester
  les 2 thèmes maintenant.)*
- [ ] **D-D4 — Garder `<SidebarToggle />` ou supprimer ?**
  *(Reco : supprimer. L'activity bar suffit ; un bouton
  redondant alourdit l'UI.)*
- [ ] **D-D5 — Sidebar ouverte ou fermée par défaut au premier
  lancement ?**
  *(Reco : ouverte. Le premier lancement utilisateur doit montrer
  immédiatement que yukki est un hub d'artefacts.)*
- [ ] **D-D6 — Indicateur "mode actif" dans l'activity bar : barre
  verticale violette / fond plein violet / les deux ?**
  *(Reco : barre verticale violette à gauche de l'icône (pattern VS
  Code) + fond légèrement plus clair que la surface (subtil). Pas
  de fond plein violet — trop chargé.)*
- [ ] **D-D7 — Tooltip de l'icône : label simple ("Stories") ou
  texte enrichi ("Browse stories — Ctrl+1") ?**
  *(Reco : label simple en V1. Raccourcis clavier = future story
  UI-008 ou similaire.)*
- [ ] **D-D8 — Mode "settings" expose un placeholder ou est-il
  caché jusqu'à UI-007 ?**
  *(Reco : placeholder visible (AC9 figé). L'icône Settings dans
  l'activity bar reste, click → SidebarPanel affiche "Settings —
  UI-007 à venir". Permet de valider l'extensibilité du pattern
  dès UI-006.)*
