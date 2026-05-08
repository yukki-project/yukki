---
id: UI-018b
slug: shadcn-classes-migration
title: Migration explicite des classes shadcn vers la palette canonique
status: accepted
created: 2026-05-09
updated: 2026-05-09
owner: Thibaut Sannier
modules:
    - frontend
parent: UI-018
depends-on:
    - UI-018a
---

# Migration explicite des classes shadcn vers la palette canonique

## Vocabulaire

- **Habillage de l'app** *(« chrome »)* — tout ce qui entoure
  le contenu utile (barre de titre, barre d'icônes, HubList,
  menus, modales, notifications).
- **Classes shadcn** — classes Tailwind héritées de la lib
  [shadcn/ui](https://ui.shadcn.com/) qui consomment les
  variables CSS shadcn : `bg-background`, `text-foreground`,
  `bg-accent/40`, `bg-muted`, `text-muted-foreground`,
  `border-border`, `bg-destructive`, …
- **Palette canonique** — palette définie par UI-018a, avec ses
  propres variables CSS (par exemple `--ykp-*`) et leurs classes
  Tailwind équivalentes.

## Background

UI-018a a livré une palette canonique unique et l'a branchée
sur les variables shadcn via un rewire CSS — ce qui change
l'apparence sans toucher au code des composants. Mais le code
parle encore le langage shadcn (`bg-background`, `text-foreground`,
…) ce qui crée une indirection trompeuse : un développeur lit
`bg-background` et ne sait pas qu'il s'agit en réalité de la
palette yukki canonique. Cette story remplace, composant par
composant, les classes shadcn par leurs équivalents palette
canonique pour rendre le code lisible et auditable.

## Business Value

Réduit la dette technique et l'ambiguïté pour tout futur
contributeur : on lit `bg-ykp-bg-page` (ou équivalent), on sait
exactement quelle couleur de la palette est utilisée. Évite que
quelqu'un ajoute un nouveau composant avec `bg-background` en
pensant qu'il consomme « le shadcn par défaut ». Permet aussi
de retirer à terme la dépendance à la palette shadcn par défaut
si on le souhaite.

## Scope In

- **Scan** des composants chrome qui utilisent encore des
  classes shadcn après UI-018a : un grep sur
  `bg-background`, `text-foreground`, `bg-accent`, `bg-muted`,
  `text-muted-foreground`, `border-border`, `bg-destructive`,
  `text-destructive`, etc. dans `frontend/src/components/`
  donne la liste.
- **Migration composant par composant** : chaque classe shadcn
  est remplacée par son équivalent palette canonique. Liste
  attendue (à confirmer pendant l'analyse) : barre de titre
  (TitleBar), barre d'icônes (ActivityBar), HubList header /
  items, FileMenu, panneau latéral (SidebarPanel), modales
  (NewStoryModal, AiPopover, dropdowns kebab), notifications
  (Toaster), badges de statut, boutons.
- **Tests visuels** : pour chaque composant migré, un snapshot
  visuel ou un test de rendu confirme que le résultat reste
  identique.
- **Composants shadcn primitifs** importés tels quels (Dialog,
  DropdownMenu, Button, …) : on garde leur source d'origine,
  on n'éditera pas la lib. Ils continuent de fonctionner via
  le rewire CSS posé par UI-018a.

## Scope Out

- **Conception de la palette** elle-même (couvert par UI-018a).
- **Modification de la lib shadcn** importée (les composants
  primitifs `frontend/src/components/ui/*.tsx` restent tels
  quels — leur source vient de shadcn et reste paramétrée par
  les variables shadcn que UI-018a a alignées).
- **Refonte typographique**.
- **Modification du SpddEditor** (déjà sur les `yk-*`).
- **Modification du pipeline PDF** (`pdfTokens.ts` reste
  indépendant).

## Acceptance Criteria

### AC1 — Plus aucune classe shadcn dans la chrome migrée

- **Given** la story est livrée
- **When** un développeur fait un grep sur `bg-background\|
  text-foreground\|bg-accent\|bg-muted\|text-muted-foreground\|
  border-border\|bg-destructive\|text-destructive` dans
  `frontend/src/components/hub/` et
  `frontend/src/components/spdd/` (hors fichiers `ui/*.tsx`
  primitifs shadcn)
- **Then** le grep retourne zéro résultat (toutes les
  occurrences ont été migrées vers la palette canonique)

### AC2 — Rendu visuel identique post-migration

- **Given** un snapshot visuel de la chrome a été capturé
  juste après UI-018a (avant cette story)
- **When** UI-018b est livrée
- **Then** la chrome rend pixel-pour-pixel le même résultat
  que le snapshot UI-018a (la migration est purement textuelle,
  pas de changement de couleur)

### AC3 — Tests existants verts

- **Given** la suite vitest contient des assertions sur le DOM
  ou les classes des composants chrome
- **When** la suite est lancée après la migration
- **Then** tous les tests restent verts (les sélecteurs basés
  sur les classes peuvent être adaptés au passage si nécessaire,
  mais aucun test métier ne casse)

### AC4 — Cas limite : composant primitif shadcn

- **Given** un composant primitif shadcn dans
  `frontend/src/components/ui/*.tsx` (par exemple `dialog.tsx`,
  `dropdown-menu.tsx`)
- **When** on inspecte son code après la migration
- **Then** ses classes shadcn restent inchangées (la
  bibliothèque source n'est pas modifiée), et son rendu
  visuel reste correct grâce au rewire CSS posé par UI-018a

### AC5 — Documentation des correspondances

- **Given** la story est livrée
- **When** un développeur consulte la doc de palette livrée
  par UI-018a
- **Then** un tableau de correspondance shadcn ↔ palette
  canonique y est ajouté (ex.
  `bg-background → bg-ykp-bg-page`,
  `text-foreground → text-ykp-text-primary`, …) pour servir
  de référence aux futurs ajouts ou migrations

## Open Questions

- [x] ~~**Liste exhaustive des composants à migrer**~~ →
      **résolu 2026-05-09** : à produire en analyse via grep
      sur les classes shadcn (`bg-background`,
      `text-foreground`, `bg-accent`, `bg-muted`,
      `text-muted-foreground`, `border-border`,
      `bg-destructive`, `text-destructive`) dans
      `frontend/src/components/`. Estimation initiale :
      15-25 composants chrome + 5-10 modales / panels.
      L'analyse délivrera la liste exacte.
- [x] ~~**Sémantiques `destructive` / `success`** ?~~ → **résolu
      2026-05-09** : classes Tailwind dédiées 1-pour-1
      (`bg-ykp-danger`, `text-ykp-danger`, `bg-ykp-success`,
      `bg-ykp-warning`, `bg-ykp-success-soft`, …) exposées via
      `tailwind.config.js` à partir des variables
      `--ykp-danger`, `--ykp-success`, `--ykp-warning` de la
      palette canonique (UI-018a). Migration mécanique : un
      sed remplace `bg-destructive` → `bg-ykp-danger`, etc.
      Code parle uniquement palette ykp.
- [x] ~~**Ordre de migration**~~ → **résolu 2026-05-09** :
      **une seule PR** qui migre tous les composants chrome
      d'un coup. Le refacto est mécanique (sed avec liste de
      remplacements définie en analyse), homogène (chaque hunk
      fait le même type de remplacement), et validé en bloc
      par les tests vitest + un build local. Évite la période
      transitoire où la moitié de l'app parle ykp et l'autre
      shadcn.
- [x] ~~**Composants tiers réimportés** ?~~ → **résolu
      2026-05-09** : laissés tels quels par défaut. Les tiers
      consomment les variables CSS shadcn que UI-018a a
      rewirées vers la palette canonique, donc ils rendent
      automatiquement avec les bonnes couleurs. L'analyse de
      cette story doit vérifier qu'aucun tiers ne reste
      visiblement hors palette ; si l'un d'eux utilise des
      couleurs hardcodées, documenter l'override nécessaire
      en story de suivi (UI-018c éventuelle), pas dans
      UI-018b.

## Notes

- **Dépend strictement de UI-018a** : sans la palette canonique
  livrée, cette story n'a pas de cible vers laquelle migrer.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : non — dépend de UI-018a.
  - **Negotiable** : ordre et découpe des PRs ouverts.
  - **Valuable** : oui — code lisible, dette retirée.
  - **Estimable** : 2-3 j (gros volume mais homogène).
  - **Small** : borderline — beaucoup de composants à toucher.
    Une seule PR si on s'aligne sur l'option « tout d'un coup »,
    sinon découpée par zone (cf. OQ « ordre de migration »).
  - **Testable** : oui — grep automatisé + tests visuels.
- Décision SPIDR : pas de découpe utile au niveau story (mais
  PR-level découpage par zone autorisé en analyse).

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Tous les composants suivent la même mécanique de remplacement. |
  | Interfaces | non | Une seule palette cible. |
  | Data | non | Pas de données. |
  | Rules | non | AC4 (primitifs shadcn) est le seul cas limite. |
  | Spike | non | Mécanique simple, pas d'inconnue. |
