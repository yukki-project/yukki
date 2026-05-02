---
id: UI-007
slug: custom-titlebar-kiro
title: Custom title bar minimaliste intégré au theming Kiro
status: draft
created: 2026-05-02
updated: 2026-05-02
owner: yukki-frontend
modules:
  - frontend
depends-on:
  - UI-006-shell-vscode-layout
---

# Custom title bar minimaliste intégré au theming Kiro

## Background

UI-006 a livré le shell VS Code-style avec la palette Kiro (fond `#1A1A1F`,
accent violet `#8B5CF6`) sur tout le contenu de la fenêtre Wails. **Mais la
barre titre native Windows reste en chrome système** (fond clair/gris,
boutons natifs) : elle tranche visuellement au-dessus de l'ActivityBar
sombre et casse l'identité Kiro recherchée. Les IDE de référence
(VS Code, Cursor, Kiro, Discord) résolvent ce point en passant la
fenêtre en *frameless* + en réimplémentant une barre titre HTML/CSS qui
hérite du theming applicatif. UI-007 fait pareil pour yukki.

## Business Value

- **Cohérence visuelle complète** du shell : plus de zone "système" qui
  tranche avec la palette Kiro sombre + violet livrée en UI-006.
- **Densité d'écran** : ~32px verticaux récupérés sur la zone barre
  titre (réduction de la hauteur, intégration du logo dans la même
  bande, plus de double-bandeau titre + ClaudeBanner).
- **Identité visuelle distinctive** : aligne yukki sur la signature des
  IDE modernes (VS Code, Cursor, Kiro) que le public cible utilise au
  quotidien — renforce la perception "outil pro".

## Scope In

- Fenêtre Wails passée en mode **frameless** (`wails.json` →
  `frameless: true`, `WindowStartState`/options Go ajustés si besoin).
- Composant React `<TitleBar />` sombre de hauteur fixe ~32px, posé en
  premier dans le `<main>` de App.tsx (au-dessus du ClaudeBanner).
- **Zone de drag** Wails (`--wails-draggable: drag`) couvrant la majorité
  de la barre titre — permet de déplacer la fenêtre par souris.
- 3 boutons fenêtre **à droite**, convention Windows :
  **minimize**, **maximize / restore**, **close**. Icônes lucide-react
  ou SVG inline minimalistes, palette Kiro (hover discret sauf close →
  rouge destructive Kiro).
- **Double-clic** sur la zone drag → toggle maximize/restore (convention
  Windows native conservée).
- Logo + label "yukki" à gauche de la barre titre, en `text-muted-foreground`
  ou équivalent — densité visuelle légère.
- Bindings Wails minimalistes côté Go : `WindowMinimise`,
  `WindowToggleMaximise`, `WindowClose` (déjà disponibles dans
  `wailsjs/runtime` — pas de nouvelle binding métier à écrire).
- Cible plateforme V1 : **Windows** (env de dev courant). Macros conditionnelles
  pour Linux/macOS si triviales, sinon différées.

## Scope Out

- Menu bar applicatif (File / Edit / View / Help) — différé en story
  ultérieure ; UI-007 livre la coque, pas le contenu menu.
- Tabs intégrés dans la title bar (style Cursor/VS Code multi-onglets) —
  hors scope, c'est sa propre story.
- Toggle "revenir à la chrome native" en settings — pas en V1, le
  frameless est forcé comme le dark mode l'est en UI-006.
- Customisation OS-spécifique (Mac vibrancy + boutons natifs gauche, Linux
  GTK conventions, taskbar Windows preview thumbnails) — V1 = Windows-first
  ; macOS/Linux peuvent rendre une version générique imparfaite si on les
  livre, ou être différés.
- Indicateur de focus de la fenêtre (titre grisé quand inactive) — gain
  marginal, différé.
- Drag-to-resize personnalisé sur les bords (le frameless Wails gère déjà
  le resize natif via `Resizable: true`) — V1 reste sur le comportement
  Wails.

## Acceptance Criteria

> Format Given / When / Then. Tous testables manuellement via le binaire
> mock (`scripts/dev/ui-build.sh && build/bin/yukki-ui ui`).

### AC1 — Fenêtre frameless au lancement

- **Given** un build yukki frais après UI-007
- **When** je lance `yukki ui`
- **Then** la fenêtre s'affiche **sans** la barre titre Windows native
  (pas de bandeau "yukki" système, pas de boutons système gris/blancs).

### AC2 — Title bar custom visible et thématisée

- **Given** la fenêtre yukki ouverte
- **When** je regarde le haut de la fenêtre
- **Then** une bande sombre `~32px` est visible, palette Kiro
  (`bg-background` ou `bg-card`), avec à gauche un label "yukki"
  discret et à droite trois boutons icône (minimize, maximize, close).
  Aucune zone gris-clair Windows n'est visible.

### AC3 — Drag déplace la fenêtre

- **Given** la fenêtre yukki ouverte non maximisée
- **When** je clique-glisse depuis la zone vide centrale de la title bar
- **Then** la fenêtre suit le pointeur et se déplace à l'écran.

### AC4 — Minimize iconifie la fenêtre

- **Given** la fenêtre yukki ouverte
- **When** je clique sur le bouton **minimize**
- **Then** la fenêtre est minimisée dans la barre des tâches Windows ;
  un clic sur l'icône taskbar la restaure.

### AC5 — Maximize / restore toggle

- **Given** la fenêtre yukki ouverte (state normal)
- **When** je clique sur le bouton **maximize**
- **Then** la fenêtre prend tout l'écran (collée aux bords), et l'icône
  du bouton change pour `restore`. Un nouveau clic remet la fenêtre à
  sa taille précédente.

### AC6 — Close ferme l'application

- **Given** la fenêtre yukki ouverte
- **When** je clique sur le bouton **close**
- **Then** la fenêtre se ferme et le process `yukki-ui.exe` se termine
  proprement (vu via `tasklist`).

### AC7 — Double-clic sur drag region toggle maximize

- **Given** la fenêtre yukki ouverte (state normal)
- **When** je double-clique sur la zone drag de la title bar
  (pas sur les boutons)
- **Then** la fenêtre passe en maximized (équivalent au clic bouton
  maximize). Re-double-clic → restore.

### AC8 — Bouton close hover destructive

- **Given** la title bar visible
- **When** je passe la souris au-dessus du bouton close
- **Then** le fond du bouton devient rouge destructive (`bg-destructive`
  CSS var) ; les autres boutons en hover restent sur un accent neutre
  (`bg-accent`) cohérent avec le reste du shell.

### AC9 — Pas de régression UI-006

- **Given** UI-007 livré
- **When** je lance `yukki ui` et navigue dans le shell (activity bar
  → mode → sidebar collapse → New Story modal → viewer)
- **Then** tous les AC d'UI-006 (AC1..AC9) passent toujours sans
  changement de comportement. La title bar custom n'occulte pas le
  ClaudeBanner ni l'activity bar.

## Open Questions

- [ ] **OQ1** — Position des boutons fenêtre : à droite (convention Windows,
      cohérent UI-006 / VS Code / Cursor / Kiro) ou à gauche (convention macOS
      pour ressembler à un IDE Mac) ?
      — Reco **A** : à droite (Windows-first, le dev tourne sur Windows).
- [ ] **OQ2** — Identité de gauche : label texte "yukki" simple, icône
      SVG, ou label + icône ?
      — Reco **A** : label texte simple "yukki" en `text-xs text-muted-foreground`,
      pas d'icône en V1 (pas de logo SVG validé).
- [ ] **OQ3** — Hauteur exacte de la title bar : 32px (Cursor / VS Code)
      ou 28px (Discord / plus dense) ?
      — Reco **A** : 32px (cohérent activity bar 52px et lisibilité du
      texte yukki + boutons cliquables sans précision millimétrique).
- [ ] **OQ4** — Logo applicatif yukki côté Wails (taskbar, alt-tab,
      icône window) : on garde celui par défaut Wails pour V1, ou on
      en fournit un Kiro-friendly maintenant ?
      — Reco **A** : on garde Wails default, story icône dédiée plus
      tard si besoin.
- [ ] **OQ5** — Boutons fenêtre cibles macOS/Linux (cas où un dev y
      builderait yukki) : on conditionne par GOOS pour cacher la title
      bar custom et laisser la chrome native, ou on impose la même
      title bar custom partout ?
      — Reco **A** : title bar custom partout (one-look), accepte que
      Mac perde les boutons macOS gauche en V1 — UI-007.5 / OS-aware
      en story future.
- [ ] **OQ6** — Comportement quand la fenêtre est maximisée : on garde
      la title bar custom au top (logique frameless) ou on rétrécit /
      cache pour gagner du place ?
      — Reco **A** : on garde, c'est ce que font VS Code / Cursor /
      Kiro ; cacher la title bar maximisée nécessiterait un mode
      séparé qui détourne du minimalisme demandé.

## Notes

- Dépendance dure : UI-006 (activity bar / shell) doit être en place,
  UI-007 vit *au-dessus* (la title bar est rendue avant le ClaudeBanner
  dans le `<main>`).
- Référence visuelle : VS Code, Cursor, Kiro, Discord — tous frameless
  Windows avec custom title bar minimaliste.
- Bindings Wails utilisés (déjà fournis par `wailsjs/runtime`) :
  `WindowMinimise()`, `WindowToggleMaximise()`, `WindowIsMaximised()`,
  `Quit()` ou `WindowClose()`.
- Touche les Safeguards UI-006 : I5 (Backend Go = 0 changement) **est
  levé** ici — `wails.json` et `main.go` sont modifiés (création de
  `WindowOptions{Frameless: true, ...}`). À tracer dans l'analyse +
  canvas UI-007.
- Risques pressentis (à creuser en `/spdd-analysis`) :
  - DPI scaling Windows + fenêtre frameless : bordures, snap zones.
  - Comportement maximize sur écran multi-moniteur (collage bords).
  - Perte des conventions OS pour les utilisateurs power-users (raccourcis
    Win+haut/bas, snap layouts Windows 11).
  - WebView2 et drag-region CSS : `--wails-draggable: drag` doit être
    correctement appliqué (et pas overridé par les enfants).
