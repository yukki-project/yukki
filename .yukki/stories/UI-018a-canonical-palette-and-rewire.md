---
id: UI-018a
slug: canonical-palette-and-rewire
title: Construction de la palette canonique + rewire CSS
status: accepted
created: 2026-05-09
updated: 2026-05-09
owner: Thibaut Sannier
modules:
    - frontend
parent: UI-018
---

# Construction de la palette canonique + rewire CSS

## Vocabulaire

- **Habillage de l'app** *(« chrome »)* — tout ce qui entoure
  le contenu utile : barre de titre, barre d'icônes, panneau
  de liste, menus, modales, notifications.
- **Palette `shadcn`** — variables CSS sémantiques fournies par
  la lib [shadcn/ui](https://ui.shadcn.com/) (`--background`,
  `--foreground`, `--accent`, `--muted`, `--border`,
  `--destructive`). Définies dans le bloc `.dark` de
  [globals.css](../../frontend/src/styles/globals.css).
- **Tokens `yk-*`** — palette dédiée actuelle du SpddEditor
  ([spdd-tokens.css](../../frontend/src/styles/spdd-tokens.css))
  avec accent violet `#8b6cff`. Pas reprise telle quelle dans
  cette story — elle sert de point de départ pour la palette
  canonique.

## Background

Yukki utilise aujourd'hui deux jeux de couleurs : la palette
shadcn par défaut pour tout l'habillage et la palette `yk-*` pour
le SpddEditor. Avant de tout aligner, on doit d'abord poser une
**palette canonique** pensée pour l'ensemble de l'application —
pas juste un copier-coller des `yk-*` actuels. Cette palette
définira chaque couleur sémantique (fonds, textes, lignes, accent,
sémantiques success / warning / danger) une seule fois, et sera
appliquée à toute la chrome via le rewire des variables CSS
shadcn dans `globals.css`. Effet visuel immédiat sur l'habillage,
diff minimal côté code.

## Business Value

Donne à yukki une identité visuelle réfléchie et unique au lieu
de la juxtaposition actuelle « shadcn fade + yk-* riche ».
Premier pas vers la cohérence app-wide : l'effet est immédiat
pour l'utilisateur dès cette story livrée, sans attendre la
migration explicite des composants (UI-018b qui suivra).

## Scope In

- **Conception de la palette canonique** dans un nouveau fichier
  dédié (par exemple `frontend/src/styles/palette.css` ou un
  fichier de référence en TypeScript / JSON), avec un nom de
  variables clair (`--ykp-bg-page`, `--ykp-text-primary`, …
  ou autre convention à figer en analyse).
- **Couleurs définies pour toutes les sémantiques** :
  surfaces, textes, lignes, accent principal, sémantiques
  (succès / avertissement / danger / info), états (hover,
  focus, disabled), zones de code.
- **Rewire** des variables shadcn dans
  [globals.css](../../frontend/src/styles/globals.css) (bloc
  `.dark`) pour qu'elles pointent sur les variables de la
  palette canonique. `--background` devient un alias de
  `--ykp-bg-page`, `--accent` de l'accent canonique, etc.
- **Conservation** des variables `yk-*` actuelles du SpddEditor
  (le SpddEditor continue de fonctionner sans régression
  visuelle).
- **Documentation** de la palette : un fichier court
  (`docs/palette.md` ou commentaires dans le CSS) qui liste
  chaque couleur avec son rôle, sa valeur hex, et un exemple
  d'usage. Sert de référence pour UI-018b (migration explicite)
  et pour les futurs composants.

## Scope Out

- **Migration des classes Tailwind** dans les composants
  (`bg-background` → `bg-ykp-bg-page`, …). Couvert par
  UI-018b.
- **Refonte typographique** (polices Inter / JetBrains Mono
  inchangées).
- **Mode light / mode système** (l'app reste dark, pas de
  double mode).
- **Themes utilisateur custom**.
- **Modification du pipeline PDF** (`pdfTokens.ts` reste
  light mode dédié, indépendant de cette palette desktop).

## Acceptance Criteria

### AC1 — Palette canonique définie et documentée

- **Given** la story est livrée
- **When** un développeur ouvre le fichier de palette canonique
- **Then** chaque couleur sémantique attendue (fonds, textes,
  lignes, accent, sémantiques, états, zones de code) y est
  définie une et une seule fois, avec un nom explicite et une
  valeur hex (ou rgba pour les fonds translucides)

### AC2 — Effet visuel immédiat sur l'habillage

- **Given** la story est livrée et l'app est rebuilt
- **When** l'utilisateur ouvre yukki sur un projet
- **Then** la barre de titre, la barre d'icônes, la HubList,
  le menu File, les modales et les notifications utilisent la
  palette canonique (par exemple un accent violet visible sur
  les boutons primaires et les hover) au lieu des gris shadcn
  par défaut

### AC3 — SpddEditor inchangé

- **Given** le SpddEditor a été ouvert sur un artefact avant la
  livraison (snapshot visuel pris)
- **When** la story est livrée et l'utilisateur ouvre à nouveau
  le même artefact
- **Then** le rendu pixel-pour-pixel des sections, cards, AC,
  badges et toolbar du SpddEditor reste identique au snapshot
  pré-livraison

### AC4 — Composant tiers non stylable : tolérance documentée

- **Given** un composant tiers (popover Radix natif,
  scrollbar OS, …) ne peut pas être stylé via la palette
  canonique
- **When** on inspecte le rendu de ce composant
- **Then** soit son apparence par défaut est documentée
  explicitement comme tolérée dans la doc de palette, soit un
  override CSS le ramène dans la palette — pas de zone grise

### AC5 — Aucune régression sur les tests visuels existants

- **Given** la suite de tests vitest contient des assertions
  sur le rendu de composants
- **When** la story est livrée et la suite est lancée
- **Then** tous les tests existants restent verts (la palette
  change le rendu visuel mais les classes / le DOM restent
  identiques)

## Open Questions

- [x] ~~**Convention de nommage** des variables de la palette
      canonique ?~~ → **résolu 2026-05-09** : préfixe `--ykp-*`
      (yukki palette). Distingue clairement la palette canonique
      app-wide de l'ancien `--yk-*` SpddEditor, permet la
      dépréciation progressive des vieux noms, et autorise des
      noms plus parlants (par exemple `--ykp-bg-page` /
      `--ykp-bg-elevated` au lieu de `--yk-bg-1` / `--yk-bg-2`).
- [x] ~~**Scope CSS** ?~~ → **résolu 2026-05-09** : palette
      définie au `:root` global. Convention CSS standard,
      consommable partout sans condition de classe parent. Si
      un futur mode light est ajouté, il sera implémenté via un
      sélecteur `[data-theme="light"]` qui surcharge les
      valeurs — pas de refacto nécessaire au moment de cette
      story.
- [x] ~~**Tokens à compléter** vs shadcn ?~~ → **résolu
      2026-05-09** : palette canonique **riche**, couvre
      explicitement toutes les sémantiques shadcn (focus ring,
      input border / focus, popover bg / fg, card bg / fg,
      secondary bg / fg, danger fg, success fg, warning fg, …).
      Le rewire shadcn → palette est 1-pour-1, pas de fallback
      ni d'opacité bricolée. ~15-20 variables au total dans la
      palette, à figer en analyse.
- [x] ~~**Statut « accepted »** : violet ou teinte propre ?~~ →
      **résolu 2026-05-09** : même `--ykp-primary` que
      `reviewed`. La distinction `reviewed` / `accepted` est
      sémantique (revue technique versus validation formelle),
      pas un changement d'état visuel. Toute la chaîne
      « reviewed / accepted / implemented / synced » reste
      dans la famille violet, badge cohérent avec le rendu PDF
      (UI-015) et les notifications (UI-022).
- [x] ~~**Zones de code SpddEditor** (`--yk-code-*`)~~ → **résolu
      2026-05-09** : intégrées dans la palette canonique sous
      `--ykp-code-key`, `--ykp-code-string`, `--ykp-code-heading`,
      `--ykp-code-subheading`. Préserve les valeurs actuelles
      bien calibrées, garde des noms déjà connus, et ramène
      tout dans la palette canonique unique au `:root` global.

## Notes

- Repose sur l'audit visuel actuel (yk-* riches, shadcn fades).
  La palette canonique peut s'inspirer des `yk-*` mais peut
  aussi corriger ce qui paraît mal calibré (par exemple
  contraste insuffisant sur tel statut, ou redondance entre
  `--yk-bg-1`, `--yk-bg-2`, `--yk-bg-3`).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : aucune dépendance amont.
  - **Negotiable** : convention de nommage et scope CSS sont
    explicitement ouverts.
  - **Valuable** : oui — identité visuelle posée + base de
    référence pour la suite (UI-018b, futures stories UI).
  - **Estimable** : ½ à 1 j (réflexion design + écriture du
    fichier de palette + rewire).
  - **Small** : oui, périmètre serré (un seul fichier de
    palette + un fichier de rewire).
  - **Testable** : oui — assertion sur les variables CSS
    définies, snapshot visuel sur la chrome.
- Décision SPIDR : pas de découpe utile (un seul livrable
  cohérent).

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Définir la palette et la brancher est un seul flux. |
  | Interfaces | non | Une seule palette, pas de variantes. |
  | Data | non | Un seul fichier de palette. |
  | Rules | non | AC4 (tiers) et AC5 (non-régression) sont les cas limites. |
  | Spike | possible | Si l'analyse révèle qu'il faut mocker plusieurs propositions de palette pour choisir, sortir un mini-spike — sinon non. |
