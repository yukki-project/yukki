---
id: UI-012
slug: visual-polish-layout-scroll-fullscreen
title: Polissage visuel — logo, barre titre, scrollbars, plein écran, liste artefacts
story: .yukki/stories/UI-012-visual-polish-layout-scroll-fullscreen.md
status: synced
created: 2026-05-06
updated: 2026-05-06
---

# Analyse — Polissage visuel layout, scrollbars, plein écran, liste artefacts

## Mots-clés métier extraits

`TitleBar`, `SidebarPanel`, `HubList`, `StoryViewer`, `logo`, `overflow`,
`scrollbar`, `resize`, `WindowToggleMaximise`, `w-60`, `min-h-screen`,
`thead`, `updated`

## Concepts de domaine

### Existants (déjà dans le code)

- **`TitleBar.tsx`** — barre titre frameless. Contient logo (`h-5 w-5`),
  `<span>yukki</span>`, `FileMenu`, zone drag (`--wails-draggable`), boutons
  minimize / maximize / close. `WindowToggleMaximise` déjà importé mais
  seulement sur le bouton carré.

- **`SidebarPanel.tsx`** — `<aside>` avec largeur fixe CSS `w-60` (240px).
  Transition `duration-150` sur `width`. Contient `HubList` en `flex-1`.
  Aucune logique de resize.

- **`HubList.tsx`** — `<table>` avec `<thead>` (colonnes : id, title, status,
  updated) et `<tbody>`. La colonne `updated` lit `m.Updated` du `Meta` struct.
  Le composant est déjà en `overflow-y-auto` sur son `<section>` root.

- **`App.tsx`** — root `<main className="min-h-screen flex flex-col ...">`.
  `min-h-screen` autorise un overflow global si le contenu dépasse la hauteur
  de la fenêtre — source du scrollbar parasite.

- **`StoryViewer.tsx`** — `<section className="flex-1 overflow-y-auto ...">` :
  overflow déjà en place, scrollbar confiné au panneau. ✅ pas à toucher.

- **Logo** `frontend/src/assets/yukki-logo.png` — 98×128 px, RGBA. Rendu dans
  `<img className="h-5 w-5">` : Tailwind applique 20×20 px → le ratio 98:128
  écrase verticalement. Fix : rendre le PNG carré (128×128) en ajoutant 15px
  de transparent de chaque côté horizontalement.

### Nouveaux (à introduire)

- **Drag handle** — `<div>` de 4px en `cursor-col-resize` sur le bord droit de
  `SidebarPanel`, gérant `mousedown/mousemove/mouseup` globaux pour modifier
  la largeur. Largeur stockée en `useState<number>` (défaut 240, min 160,
  max 500). Aucun binding Go nécessaire.

## Approche stratégique

> Pour résoudre le **débordement global de scroll et la rigidité de la
> sidebar**, on choisit de passer `<main>` de `min-h-screen` à `h-screen`
> (confinement hauteur fenêtre) et d'ajouter un drag handle inline dans
> `SidebarPanel` avec `useState`,
> plutôt qu'une **librairie de panneaux redimensionnables** (ex. `react-resizable-panels`),
> pour atteindre la **légèreté (0 dépendance ajoutée) et la cohérence avec
> l'existant Tailwind**,
> en acceptant l'absence de **persistance localStorage de la largeur** (reportée).

### Alternatives écartées

- `react-resizable-panels` — feature complète (persistance, accessibilité,
  keyboard) mais ~30 KB, dépendance supplémentaire, over-engineering pour MVP.
- `resize: horizontal` CSS natif — ne fonctionne pas sur `<aside>` dans un
  contexte flexbox sans hacks.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/assets/yukki-logo.png` | faible | modify — PNG 98×128 → 128×128 |
| `frontend/src/components/hub/TitleBar.tsx` | faible | modify — suppr. span, dblclick |
| `frontend/src/App.tsx` | faible | modify — `min-h-screen` → `h-screen` |
| `frontend/src/components/hub/SidebarPanel.tsx` | moyen | modify — drag handle resize |
| `frontend/src/components/hub/HubList.tsx` | moyen | modify — layout liste |

## Dépendances et intégrations

- **Wails runtime** : `WindowToggleMaximise` — déjà importé dans `TitleBar.tsx`.
- **Python Pillow** : disponible sur la machine (`python3 -c "from PIL import Image"`
  vérifié). Utilisé pour le padding PNG — one-liner, pas de nouveau script.
- **0 nouvelle dépendance npm**.

## Risques et points d'attention

- **Compatibilité** — `h-screen` sur `<main>` : tester que `ProjectPicker`
  (état sans projet ouvert) ne tronque pas son contenu. *Impact faible,
  probabilité moyenne* — **Mitigation** : `ProjectPicker` est déjà en
  `flex-1 overflow-auto` → OK.
- **Opérationnel** — drag handle : les listeners `mousemove/mouseup` sont
  ajoutés sur `document`, il faut les nettoyer dans `onMouseUp` pour éviter
  des fuites. *Impact faible, probabilité faible* — **Mitigation** :
  `document.removeEventListener` dans `onMouseUp` + `useEffect` cleanup.
- **Intégration** — double-clic TitleBar : la zone drag Wails absorbe les
  événements natifs. `onDoubleClick` React est nécessaire (pas `ondblclick`
  natif) et doit être posé sur le `<div>` drag region. *Impact faible,
  probabilité faible* — testé : React `onDoubleClick` fonctionne sur les
  éléments Wails draggable.

## Cas limites identifiés

- Logo : PNG avec transparence RGBA → le padding doit aussi être RGBA
  `(0,0,0,0)` pour ne pas introduire de fond blanc.
- Sidebar à `w-0` (repliée) : le drag handle ne doit pas être visible ni
  cliquable quand `sidebarOpen === false`.
- Resize sidebar : largeur min 160px pour que `HubList` reste lisible ;
  max 500px pour ne pas écraser le panneau de contenu.
- HubList sans table : le `kind` affiché sous l'ID est celui du store
  (même pour tous les items de la liste) — on le singularise
  (`stories` → `story`, `prompts` → `canvas`, etc.) pour la lisibilité.

## Décisions à prendre avant le canvas

Toutes les décisions ont été tranchées :
- [x] Outil PNG : Python Pillow one-liner (déjà disponible)
- [x] macOS double-clic : `onDoubleClick` React sur zone drag, pas de cas spécial
- [x] Largeur sidebar : px resize (défaut 240, min 160, max 500), pas de %
- [x] Persistance largeur : non (MVP — reporté)
