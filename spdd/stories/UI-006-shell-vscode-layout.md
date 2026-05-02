---
id: UI-006
slug: shell-vscode-layout
title: Shell VS Code-style — activity bar + sidebar collapsable + theming Kiro-inspired
status: draft
created: 2026-05-02
updated: 2026-05-02
owner: Thibaut Sannier
modules:
  - frontend
parent: ~
sibling-stories:
  - UI-001a-app-skeleton-and-subcommand
  - UI-001b-hub-viewer-claude-banner
  - UI-001c-new-story-flow
analysis: ~
depends-on:
  - UI-001b-hub-viewer-claude-banner
  - UI-001c-new-story-flow
---

# Shell VS Code-style — activity bar + sidebar collapsable + theming Kiro-inspired

## Background

V1 utilisateur livrée (UI-001a/b/c) : hub fonctionnel + writing flow. Le
shell visuel actuel hérite directement du scaffolding UI-001b : une
sidebar large avec onglets-boutons, qui se collapse en drawer < 768px.
C'est fonctionnel mais visuellement **plat** et **mono-niveau**, loin
des conventions des outils desktop modernes (VS Code, Cursor, Kiro,
Zed) que l'utilisateur cible côtoie au quotidien.

Cette story refond le **shell** sans toucher au cœur métier
(`<HubList />`, `<StoryViewer />`, `<NewStoryModal />`,
`<ClaudeBanner />` restent intacts dans leur API). On extrait l'activity
bar de la sidebar existante, on transforme la sidebar en panneau
collapsable type VS Code, et on aligne la palette de couleurs sur une
inspiration **Kiro / Cursor dark theme** (sombre, accent violet,
typographie compacte).

Référence visuelle fournie par l'utilisateur : capture Kiro spec mode
(implementation plan view) — fond très sombre, bordures fines,
panneau droit séparé, accent violet sur les éléments actifs.

## Business Value

- **Familiarité immédiate** : un dev qui ouvre yukki pour la première
  fois retrouve les codes de son IDE quotidien (activity bar à gauche,
  sidebar à droite de l'activity bar, contenu principal à droite).
  Réduit le coût d'apprentissage à zéro pour le public cible.
- **Densité d'information accrue** : la sidebar collapsable libère
  ~240px de largeur quand l'utilisateur veut se concentrer sur le
  contenu (lecture d'un canvas REASONS de 300 lignes, par exemple).
- **Identité visuelle cohérente** : palette dark accent violet aligne
  yukki sur Cursor/Kiro/Zed plutôt que sur le default shadcn slate
  neutre — distingue l'outil sans réinventer les codes UX.
- **Préparation des extensions futures** : l'activity bar typée par
  icône permet d'ajouter facilement de nouveaux "modes" dans la
  trajectoire (`Search`, `Settings`, `MCP server status`, `Telemetry`,
  …) sans repenser le layout.

## Scope In

- **Activity bar** (nouveau composant `<ActivityBar />`) — colonne
  fixe à gauche, largeur ~48-56px. Boutons icône verticaux pour
  chaque "kind" SPDD (Stories, Analyses, Prompts/Canvas, Tests) plus
  un bouton settings/about en bas. Icônes lucide-react. Tooltip au
  hover. Indicateur visuel discret (barre verticale violette à
  gauche de l'icône) pour le mode actif. Toujours visible.
- **Sidebar collapsable** (refactor du `<Sidebar />` actuel) —
  panneau de 240-280px à droite de l'activity bar. Affiche le
  *contenu* du mode actif (ex. la liste des stories quand le mode
  Stories est actif). **Click sur une icône de l'activity bar** :
  - si le mode cliqué = mode actif et sidebar ouverte → ferme la
    sidebar (toggle)
  - si le mode cliqué ≠ mode actif → bascule le contenu et garde la
    sidebar ouverte
  - si sidebar fermée → ouvre avec le mode cliqué
- **Contenu principal** : ce qui était dans `<HubList /> +
  <StoryViewer />` reste, mais se reorganise :
  - `<HubList />` devient le contenu de la sidebar (titre
    "Stories" / "Analyses" / etc., + listing)
  - `<StoryViewer />` occupe tout le main content (plein largeur quand
    sidebar collapsée)
- **Theming Kiro-inspired** :
  - palette dark : fond `#1A1A1F` (très sombre, légère teinte bleutée),
    surface `#1F1F26`, surface élevée `#26262E`, border `#2E2E36`
  - accent violet : `#8B5CF6` (primary) avec hover `#A78BFA`
  - texte primaire `#F0F0F2`, secondaire `#9CA3AF`, désactivé
    `#4B5563`
  - banner amber pour les warnings (existant ClaudeBanner) ajusté pour
    contraste sur fond sombre
- **Animation toggle sidebar** : transition CSS ~150ms ease-out sur la
  largeur (240px ↔ 0). Pas d'overlay, pas de drawer ; la sidebar
  *prend ou rend* sa place dans le layout.
- **Persistance UI prefs** : l'état "sidebar ouverte/fermée" + "mode
  actif" persistent entre relancements de yukki (localStorage suffit
  en V1 ; un futur store Wails-side viendra avec UI-002 prefs si
  jugé nécessaire).
- **Responsive** : < 768px, l'activity bar reste visible, la sidebar
  passe en mode overlay (couvre le main content) — pattern VS Code
  "narrow viewport" pris tel quel.
- **Tests UI manuels** documentés dans le canvas. Pas de Playwright
  en V1 (différé post-MVP, cohérent avec UI-001b/c).

## Scope Out

- **Settings page** elle-même = différé. UI-006 ajoute le bouton
  *settings* dans l'activity bar mais le clic ouvre une placeholder
  empty state ; le contenu réel = future story `UI-007`.
- **Right panel / bottom panel** type VS Code = différé. UI-006 ne
  fait que la double sidebar gauche.
- **Theming light** = différé UI-002 si demandé un jour ; UI-006 ne
  livre que le dark theme Kiro-inspired.
- **Personnalisation des couleurs par utilisateur** = différé. La
  palette est figée en V1.
- **Drag-to-resize de la sidebar** = différé post-MVP. Largeur figée
  à 240px en V1.
- **Multi-fenêtres / multi-projets côte-à-côte** = hors scope.
- **Backend Go** : 0 changement. Le scope est strictement
  `frontend/src/`. Aucune binding nouvelle.
- **Stories existantes UI-001b/c** : leur API React (props) ne change
  pas. Leur *style interne* peut s'aligner sur la nouvelle palette
  (couleurs des badges, hover states) mais aucune logique modifiée.

## Acceptance Criteria

> Given / When / Then. Validation manuelle via `wails build -tags mock
> -skipbindings && yukki-ui ui` (cohérent UI-001a/b/c).

### AC1 — Activity bar permanente avec icône par kind SPDD

- **Given** un projet sélectionné, l'app yukki ouverte
- **When** l'utilisateur observe la fenêtre
- **Then** une colonne étroite (~48-56px) est visible en bord gauche,
  affichant 5 icônes verticalement empilés : Stories (BookOpen),
  Analyses (Lightbulb), Canvas/Prompts (FileText), Tests (CheckSquare
  ou similaire), et en bas Settings (Cog). Chaque icône a un tooltip
  au hover indiquant son label complet.

### AC2 — Click sur icône active toggle la sidebar du même mode

- **Given** la sidebar est ouverte sur le mode *Stories*
- **When** l'utilisateur clique sur l'icône *Stories* dans l'activity
  bar
- **Then** la sidebar se ferme avec animation 150ms ; le main content
  s'élargit pour occuper l'espace libéré ; l'icône *Stories* perd son
  indicateur visuel "actif" mais reste cliquable.

### AC3 — Click sur icône d'un autre mode bascule le contenu sans refermer

- **Given** la sidebar est ouverte sur le mode *Stories*
- **When** l'utilisateur clique sur l'icône *Analyses*
- **Then** le contenu de la sidebar bascule vers la liste des
  analyses (sans refermer/reouvrir l'animation) ; l'indicateur
  visuel "actif" se déplace de Stories à Analyses ; le titre de la
  sidebar passe à "Analyses".

### AC4 — Sidebar fermée puis click ouvre sur le mode cliqué

- **Given** la sidebar est fermée
- **When** l'utilisateur clique sur l'icône *Tests*
- **Then** la sidebar s'ouvre avec animation 150ms, contenant la liste
  des tests ; l'indicateur "actif" est sur Tests.

### AC5 — Theming Kiro-inspired sur fond dark

- **Given** l'app ouverte
- **When** on inspecte les surfaces
- **Then** le fond global est très sombre (`~#1A1A1F`), les bordures
  fines (`~#2E2E36`), l'accent visuel des éléments actifs / hover est
  violet (`~#8B5CF6` à `~#A78BFA`), le texte primaire est clair
  (`~#F0F0F2`). Aucune surface n'utilise plus le slate par défaut
  shadcn.

### AC6 — Persistance de l'état sidebar entre relancements

- **Given** l'utilisateur a fermé la sidebar puis quitté yukki
- **When** il relance `yukki ui`
- **Then** la sidebar est rouverte dans l'état où il l'avait laissée
  (même mode actif, même état ouvert/fermé).

### AC7 — Responsive < 768px : sidebar en overlay

- **Given** la fenêtre est redimensionnée à < 768px de largeur
- **When** l'utilisateur ouvre la sidebar via l'activity bar
- **Then** la sidebar s'affiche en *overlay* au-dessus du main content
  (pas en push-layout), avec un voile noir 50% sur le main content.
  Click hors sidebar la ferme. L'activity bar reste visible.

### AC8 — Aucune régression sur le hub fonctionnel

- **Given** une story est sélectionnée dans le hub, le viewer affiche
  son contenu, le bouton *New Story* est visible
- **When** on switch entre les modes via l'activity bar et qu'on
  revient sur Stories
- **Then** la story sélectionnée est toujours active, le viewer
  affiche toujours son contenu (pas de re-fetch ni reset). Le bouton
  *New Story* fonctionne identiquement à UI-001c.

### AC9 — Settings ouvre placeholder

- **Given** l'utilisateur clique sur l'icône *Settings* en bas de
  l'activity bar
- **When** la sidebar s'ouvre en mode Settings
- **Then** la sidebar affiche un titre "Settings" et un placeholder
  *"Settings panel — UI-007 (à venir)"*. Pas de fonctionnalité
  réelle. Aucun crash.

## Open Questions

- [ ] **OQ1 — Activity bar à droite ou à gauche ?**
  *(Reco : à gauche, conforme VS Code / Cursor / Zed. Le panneau droit
  serait pour un futur "outline" ou "session" panel.)*
- [ ] **OQ2 — Position du bouton Settings : bas de l'activity bar ou
  en dehors ?**
  *(Reco : bas, séparé du reste par un espace. Pattern VS Code.)*
- [ ] **OQ3 — Tooltip d'activity bar : library shadcn ou custom CSS ?**
  *(Reco : `npx shadcn add tooltip` — Radix-based, accessible,
  cohérent avec Dialog UI-001c.)*
- [ ] **OQ4 — Icônes : lucide-react existant suffit, ou besoin
  d'icônes plus expressives (heroicons, tabler) ?**
  *(Reco : lucide-react — déjà déps UI-001a, cohérent. Iconographie
  validée à la revue du canvas.)*
- [ ] **OQ5 — Persistance prefs : localStorage côté front ou
  binding Go côté backend (`App.SaveUIPrefs`) ?**
  *(Reco : localStorage en V1 — pas de besoin cross-projet, latence
  zéro. Backend prefs = futur si on en a vraiment besoin.)*
- [ ] **OQ6 — Animation collapse : largeur 0px (full collapse) ou
  reste à ~24px (peek) ?**
  *(Reco : full collapse à 0 — VS Code le fait. L'utilisateur
  rouvre via l'activity bar, simple et clair.)*
- [ ] **OQ7 — La palette Kiro doit-elle s'appliquer aussi au
  `<NewStoryModal />` Dialog ?**
  *(Reco : oui, cohérence visuelle. Les surfaces shadcn héritent du
  theme via les variables CSS — il suffit de les modifier dans
  `globals.css`, pas chaque composant.)*

## Notes

- **Filiation** : story de polish post-V1. Pas une fille de UI-001.
  Touche le shell uniquement. Dépend de UI-001b (Sidebar / HubList /
  ClaudeBanner) et UI-001c (NewStoryModal Dialog) pour ne pas casser
  leur intégration.
- **Référence visuelle** fournie par l'utilisateur : screenshot Kiro
  spec mode — fond très sombre, accent violet, typographie compacte,
  panneau droit "New Session" séparé. Capture conservée hors-repo
  (référence design uniquement).
- **Inspiration code** : pas de fork. Les couleurs sont reverse-engineered
  approximativement (palette dark + violet ne sont pas brevetables).
  Le pattern double-sidebar VS Code est documenté publiquement sur
  code.visualstudio.com.
- **Estimation** : ~1.5j (refactor `<App.tsx>` + `<Sidebar />` →
  `<ActivityBar />` + `<SidebarPanel />` 0.5j ; theming variables
  CSS globales + ajustement composants 0.4j ; persistance prefs +
  animation 0.3j ; tests manuels + ajustements 0.3j).
- **Lien vers le canvas REASONS** (à venir) :
  `spdd/prompts/UI-006-shell-vscode-layout.md`
