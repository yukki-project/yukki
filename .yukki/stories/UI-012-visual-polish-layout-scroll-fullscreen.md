---
id: UI-012
slug: visual-polish-layout-scroll-fullscreen
title: Polissage visuel — logo, barre titre, scrollbars, plein écran, liste artefacts
status: draft
created: 2026-05-06
updated: 2026-05-06
owner: yukki contributors
modules:
  - frontend/src/components/hub
  - frontend/styles
  - scripts/dev
---

# Polissage visuel — logo, barre titre, scrollbars, plein écran, liste artefacts

## Background

Après la mise en production de l'éditeur inline (UI-010), plusieurs défauts
visuels restent dans la version desktop :
- le logo yukki est écrasé (ratio non carré dans la TitleBar) ;
- le nom « yukki » s'affiche à côté du logo, occupant inutilement la barre ;
- un scrollbar global apparaît sur la fenêtre principale alors que chaque
  panneau devrait gérer son propre défilement ;
- la liste des artefacts (stories, canvas, inbox…) ne dispose pas de scrollbar
  propre et le contenu markdown / kanban non plus ;
- la liste est encombrée (colonne `updated`, en-tête de tableau, IDs trop larges).

## Business Value

Un utilisateur daily-driver de `yukki ui` dispose d'une interface propre,
sans débordement de contenu ni éléments redondants, et peut basculer en
plein écran d'un clic sur la barre de titre — sans sortir du flux de lecture
ou d'édition d'artefacts.

## Scope In

- **Script `scripts/dev/fix-logo-padding.sh|ps1`** : ajouter des pixels
  transparents au logo yukki pour le rendre carré (format PNG, outil `convert`
  ou `sharp`) — évite le `object-fit: contain` en CSS seul
- **`TitleBar.tsx`** : supprimer le texte « yukki » affiché à côté du logo ;
  garder uniquement l'image du logo
- **Scrollbar principale** : masquer le scrollbar du conteneur racine de
  l'application (fenêtre Wails) — chaque panneau gère son propre overflow
- **Scrollbar liste artefacts** : ajouter `overflow-y: auto` sur le panneau
  `HubList` / `SidebarPanel` contenant la liste des stories, canvas, inbox…
- **Scrollbar contenu** : ajouter `overflow-y: auto` sur `StoryViewer` et la
  vue kanban (si existante) — le défilement reste dans le panneau de contenu
- **Clic barre de titre → plein écran** : sur `mousedown` / `dblclick` sur la
  zone libre de la `TitleBar`, appeler le runtime Wails `WindowToggleMaximise()`
- **Liste artefacts redessinée** :
  - colonne `updated` supprimée
  - en-tête de tableau (`thead`) supprimé
  - ID compact (texte plus petit) et type d'artefact affiché en dessous en
    `text-xs text-muted-foreground`
  - largeur du panneau latéral augmentée pour accommoder le nouveau layout

## Scope Out

- Remplacement du logo par une nouvelle image vectorielle — reporté en DOC-002
- Ajout d'une barre de statut ou d'indicateurs de progression dans la TitleBar
- Scrollbar stylisée (thème custom CSS) — MVP : scrollbar native masquée ou
  standard OS
- Gestion de la fenêtre (déplacer, redimensionner) autre que le plein écran
  au double-clic — couvert par `--frameless` Wails existant

## Acceptance Criteria

### AC1 — Logo carré sans écrasement

- **Given** l'application est lancée avec `yukki ui`
- **When** la TitleBar s'affiche
- **Then** le logo yukki est visible avec son ratio d'aspect intact (ni écrasé
  horizontalement ni verticalement)

### AC2 — Barre de titre : logo seul, pas de texte

- **Given** la TitleBar est affichée
- **When** l'utilisateur regarde la zone gauche de la barre
- **Then** seul le logo est visible ; aucun texte « yukki » n'apparaît à côté

### AC3 — Scrollbar principale absente

- **Given** le contenu de l'un des panneaux dépasse la hauteur de la fenêtre
- **When** l'utilisateur survole la fenêtre principale
- **Then** aucun scrollbar n'apparaît sur le bord droit de la fenêtre entière ;
  seul le panneau concerné présente son propre scrollbar

### AC4 — Scrollbar sur la liste des artefacts

- **Given** le projet ouvert contient plus d'artefacts que la hauteur du
  panneau latéral ne peut en afficher
- **When** l'utilisateur fait défiler dans ce panneau
- **Then** un scrollbar apparaît dans le panneau latéral (pas sur la fenêtre)
  et la liste défile correctement

### AC5 — Scrollbar sur le contenu (markdown / kanban)

- **Given** un artefact long est ouvert dans StoryViewer
- **When** l'utilisateur fait défiler dans la zone de contenu
- **Then** un scrollbar apparaît dans le panneau de contenu uniquement

### AC6 — Clic sur la barre de titre → plein écran

- **Given** l'application est en mode fenêtré
- **When** l'utilisateur double-clique sur la zone libre de la TitleBar
- **Then** la fenêtre bascule en plein écran (ou revient en mode fenêtré si
  déjà en plein écran)

### AC7 — Liste artefacts redessinée

- **Given** le panneau latéral affiche une liste d'artefacts
- **When** l'utilisateur consulte la liste
- **Then** : (a) aucun en-tête de colonne n'est visible, (b) la colonne
  `updated` est absente, (c) l'ID est affiché de manière compacte avec le
  type d'artefact en dessous en texte secondaire

## Open Questions

- Quel outil utiliser pour le rembourrage PNG du logo : `ImageMagick convert`
  (disponible sur les runners CI) ou une dépendance npm `sharp` (déjà utilisé
  par Vite) ?
- Le double-clic sur la TitleBar doit-il aussi déclencher le plein écran sur
  macOS (où le comportement natif est déjà géré par le système) ?
- La largeur du panneau latéral redessiné : valeur fixe ou pourcentage
  responsive ?

## Notes

### Évaluation INVEST

| Critère | Verdict | Justification |
|---|---|---|
| Independent | ✅ | aucune dépendance à d'autres stories en cours |
| Negotiable | ✅ | 3 Open Questions explicites |
| Valuable | ✅ | expérience utilisateur quotidienne améliorée |
| Estimable | ✅ | ~1-2 j — tous frontend-only, aucun binding Go |
| Small | ✅* | *foundatrice : 5 sous-items cohérents, même zone UI, même itération |
| Testable | ✅ | chaque AC est observable visuellement ou via test composant |

### Décision SPIDR

| Axe | Applicable ? | Verdict |
|---|---|---|
| **P — Paths** | non | pas de chemins utilisateur distincts |
| **I — Interfaces** | non | uniquement la surface desktop Wails |
| **D — Data** | non | pas de data, uniquement layout CSS |
| **R — Rules** | non | pas de règles métier à relaxer |
| **S — Spike** | non | technologies connues (Tailwind, Wails runtime) |

**Conclusion** : pas de découpage. Les 5 items sont tous des ajustements
CSS/composants dans la même zone de l'application, livrables ensemble en
1-2 jours. 7 AC justifiés pour une story de polissage fondatrice.
