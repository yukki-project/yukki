---
id: UI-018
slug: harmonize-yk-palette-app-wide
title: Palette canonique unique pour toute l'application (ombrelle)
status: split
created: 2026-05-08
updated: 2026-05-09
owner: Thibaut Sannier
modules:
  - frontend
children:
  - UI-018a-canonical-palette-and-rewire
  - UI-018b-shadcn-classes-migration
---

# Harmonisation palette de couleurs sur les tokens SpddEditor (yk-*)

## Vocabulaire

> Petits rappels pour lever toute ambiguïté pendant la lecture.

- **HubList** — composant qui affiche la liste verticale
  d'artefacts dans le panneau gauche
  ([HubList.tsx](../../frontend/src/components/hub/HubList.tsx)).
  Une seule liste, qui change de contenu selon le mode actif
  (`stories`, `inbox`, `epics`, etc.).
- **Habillage de l'app** *(« chrome » dans le jargon UI)* —
  tout ce qui entoure le contenu utile : barre de titre,
  barre d'icônes à gauche, panneau de liste, menus, modales,
  notifications. Ce qui n'est PAS la chrome : le contenu
  d'un artefact dans le SpddEditor, le PDF généré.
- **Palette `shadcn`** — variables CSS sémantiques fournies
  par la librairie [shadcn/ui](https://ui.shadcn.com/) :
  `--background`, `--foreground`, `--accent`, `--muted`,
  `--border`, `--destructive`. Définies dans le bloc `.dark`
  de [globals.css](../../frontend/src/styles/globals.css).
  Utilisées en Tailwind via `bg-background`, `text-foreground`,
  `bg-accent/40`, etc. Donnent aujourd'hui un dégradé de gris
  neutres dans toute l'habillage de yukki.
- **Tokens `yk-*`** — palette dédiée du SpddEditor, plus riche,
  avec un accent violet (`#8b6cff`). Définie dans
  [spdd-tokens.css](../../frontend/src/styles/spdd-tokens.css)
  (scope `.yk { … }`). Utilisée en Tailwind via `bg-yk-bg-1`,
  `text-yk-text-primary`, `border-yk-line`, `text-yk-primary`,
  etc. Donne au SpddEditor son identité visuelle distinctive.

## Background

Deux systèmes de couleurs cohabitent aujourd'hui dans yukki.
Le premier est la palette par défaut **shadcn** (variables
`--background`, `--foreground`, `--accent`, `--muted`, …) :
elle habille la HubList, la barre d'icônes, le menu File, les
notifications et les modales avec un dégradé de gris neutres.
Le second est la palette **`yk-*`** (variables `--yk-bg-1`,
`--yk-text-primary`, `--yk-primary`, …) consommée par le
SpddEditor et par le pipeline d'export PDF, qui lui donne une
identité visuelle riche avec un accent violet. Le SpddEditor a
donc un caractère propre pendant que tout l'habillage autour
fait fade. On veut une seule palette canonique, alignée sur
`yk-*`, appliquée partout dans l'app.

## Business Value

Cohérence visuelle dans toute l'application : l'utilisateur
perçoit yukki comme un produit unique, au lieu de la juxtaposition
actuelle « SpddEditor riche posé sur un habillage shadcn fade ».
La maintenance est réduite parce qu'on n'a plus qu'un seul système
de tokens à ajuster. Pour les futurs composants, l'ambiguïté sur
quelle famille de couleurs utiliser disparaît.

## Scope In

- Une **palette canonique unique** alignée sur les tokens
  `yk-*` définis dans
  [`spdd-tokens.css`](../../frontend/src/styles/spdd-tokens.css),
  appliquée à tout l'habillage de l'app : barre de titre,
  barre d'icônes (ActivityBar), header et items de la HubList,
  menu File, panneau latéral, modales (NewStoryModal,
  AiPopover, menus contextuels), notifications (Toaster),
  badges de statut, boutons.
- Conservation à l'identique du rendu actuel du **SpddEditor** (il
  est déjà sur yk-*, aucune régression attendue).
- Conservation à l'identique du rendu **PDF export** (pdfTokens
  light mode dédié, hors-scope ici — cf. UI-015).
- Sémantiques claires (success / warning / danger / primary)
  alignées sur les yk-* équivalents (`yk-success`, `yk-warning`,
  `yk-danger`, `yk-primary`).

## Scope Out

- Toggle light mode utilisateur (l'app reste dark, pas de double
  mode système au menu de cette story).
- Thèmes personnalisés (l'utilisateur ne pourra pas overrider la
  palette).
- Refonte typographique (polices Inter / JetBrains Mono inchangées).
- Modification du pipeline PDF (`pdfTokens.ts` reste light mode
  dédié — cf. UI-015).
- Renommage des classes Tailwind shadcn (`bg-background`,
  `text-foreground`, …) — la **stratégie d'alignement** (rewire
  des HSL au niveau CSS vs migration classe par classe) est laissée
  à `/yukki-analysis`.

## Acceptance Criteria

### AC1 — Habillage aligné sur les tokens `yk-*`

- **Given** l'app est ouverte en mode dark sur un projet (état
  par défaut)
- **When** l'utilisateur regarde l'habillage (barre d'icônes
  ActivityBar, header de la HubList, barre de titre, menu File,
  panneau latéral)
- **Then** les fonds, textes et bordures correspondent
  visuellement aux tokens `yk-bg-1` / `yk-text-primary` /
  `yk-line` (et leurs variantes), au lieu des gris shadcn par
  défaut

### AC2 — SpddEditor inchangé visuellement

- **Given** le SpddEditor a été ouvert en mode read-only ou édition
  avant la livraison de cette story (snapshot visuel pris)
- **When** la story est livrée et l'utilisateur ouvre à nouveau
  le SpddEditor sur le même artefact
- **Then** le rendu pixel-pour-pixel des sections, cards, AC,
  badges et toolbar est identique au snapshot pré-livraison
  (tolérance : antialiasing, pas de différence de couleur)

### AC3 — Modales et menus contextuels alignés

- **Given** l'app est ouverte
- **When** l'utilisateur ouvre une modale (NewStoryModal, modale
  de choix de type UI-016) ou un menu contextuel (kebab dans la
  HubList barre d'action UI-015)
- **Then** la modale / le menu utilisent le même fond, les mêmes
  bordures et les mêmes accents que le SpddEditor (fond yk-bg-2,
  bordure yk-line, accent yk-primary sur action principale)

### AC4 — Sémantiques status / toast cohérentes

- **Given** un toast d'erreur ou un badge status `draft` /
  `reviewed` / `implemented` / `synced` est affiché dans n'importe
  quelle vue de l'app
- **When** l'utilisateur regarde la couleur du toast / badge
- **Then** la couleur appartient à la famille yk-* attendue
  (`yk-danger` pour les erreurs, `yk-warning` pour `draft`,
  `yk-primary` pour `reviewed`, `yk-success` pour
  `implemented`/`synced`) — pas de rouge / vert shadcn « brut »
  qui détone

### AC5 — Cas limite : composant tiers non migrable

- **Given** un composant tiers (popover Radix natif, scrollbar
  custom de l'OS, …) ne peut pas être stylé via les tokens yk-*
- **When** on inspecte le rendu de ce composant
- **Then** soit son apparence par défaut est tolérée et documentée
  (whitelist explicite dans la story), soit un override CSS le
  ramène dans la palette yk-* — pas de zone grise

## Open Questions

- [x] ~~**Stratégie d'alignement** : rewire CSS (a) ou migration
      classe par classe (b) ?~~ → **résolu 2026-05-09** : option
      mixte avec **deux sous-stories** :
      - **UI-018a** — Construire une **véritable palette
        canonique** (pas un copier-coller des `yk-*` actuels,
        mais une refonte pensée) puis rewirer les variables
        HSL shadcn vers cette palette dans `globals.css`.
        Effet visuel immédiat sur tout l'habillage. Diff minimal
        (1 fichier).
      - **UI-018b** — Migration explicite des classes shadcn
        (`bg-background`, `text-foreground`, …) vers leurs
        équivalents palette canonique dans chaque composant
        chrome. Rend le code lisible et auditable, supprime la
        dette « les classes shadcn cachent des couleurs
        yukki ».
      Cette story-ci (UI-018) devient l'**ombrelle** et n'est
      pas livrable directement ; les deux filles le sont.
- [ ] Le scope `.yk` actuel sur les yk-* (CSS variables scopées à
      `.yk`) — faut-il les promouvoir au `:root` global pour qu'ils
      soient consommables hors SpddEditor ?
- [ ] Quels tokens yk-* manquent par rapport aux sémantiques shadcn
      (`focus ring`, `input border`, `popover`, `card-foreground`) —
      à enrichir ou à mapper sur des yk-* existants ?
- [ ] Statut « accepted » est-il aussi associé au violet
      (`yk-primary`) comme `reviewed`, ou à une autre teinte ? À
      figer en analyse.

## Notes

- Tokens yk-* déjà documentés et utilisés :
  [`frontend/src/styles/spdd-tokens.css`](../../frontend/src/styles/spdd-tokens.css)
  + équivalent TS pour le pipeline PDF dans
  [`frontend/src/components/spdd/pdf/pdfTokens.ts`](../../frontend/src/components/spdd/pdf/pdfTokens.ts).
- Variables shadcn actuelles à harmoniser :
  [`frontend/src/styles/globals.css`](../../frontend/src/styles/globals.css)
  (HSL dans `.dark`).
- Périmètre sentinelle : avant la story, la barre d'icônes,
  le header de la HubList, le menu File et le Toaster utilisent
  des classes shadcn (`bg-background`, `text-foreground`,
  `bg-accent/40`, `bg-muted`, `text-muted-foreground`, …). Le
  scan est trivial : un grep sur ces noms de classes dans
  `frontend/src` donne la liste des composants à harmoniser.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : aucune dépendance amont (pure refacto visuelle).
  - **Negotiable** : la stratégie (rewire CSS vs migration classes)
    est une question ouverte explicite.
  - **Valuable** : oui, identité visuelle unifiée + dette réduite.
  - **Estimable** : oui, ½ à 1 j si stratégie (a), 2-3 j si (b).
  - **Small** : 5 AC, un seul livrable visuel ; le périmètre est
    large mais homogène (un seul changement structurel).
  - **Testable** : oui — snapshot visuel + assertions de couleurs
    via un test E2E ou par inspection des variables CSS.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) : pas
  de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Tous les composants partagent la même variable d'entrée (palette CSS) ; ne se découpent pas par flux. |
  | Interfaces | non | Une seule palette, pas de variantes utilisateur. |
  | Data | non | Pas de modèle ni d'API à découper. |
  | Rules | non | L'AC5 (composants tiers non stylables) est le seul cas limite, tient en un AC. |
  | Spike | possible | Si la stratégie (a) (rewire HSL) cause des régressions cachées sur des composants tiers, sortir un `UI-018s` spike — sinon non. |
