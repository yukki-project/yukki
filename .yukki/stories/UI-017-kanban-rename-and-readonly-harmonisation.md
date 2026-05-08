---
id: UI-017
slug: kanban-rename-and-readonly-harmonisation
title: Renommage Workflow → Kanban + harmonisation aperçu read-only
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
---

# Renommage Workflow → Kanban + harmonisation aperçu read-only

## Background

Le mode « Workflow » de l'UI affiche déjà une vue kanban à colonnes
(Story / Analysis / Canvas / …) — c'est `<WorkflowPipeline>` rendu
quand `activeMode === 'workflow'`. Le label « Workflow » prête à
confusion par rapport à cette représentation. Par ailleurs, quand
l'utilisateur clique sur une carte dans cette vue, l'app ouvre un
panneau d'aperçu sur la moitié droite de l'écran via un composant
bespoke qui dédouble le rendu read-only déjà fourni par le
SpddEditor (UI-014). On veut renommer le label et harmoniser
l'aperçu sur le SpddEditor read-only — puis supprimer les
composants devenus inutiles.

## Business Value

Cohérence visuelle et baisse de la dette UI : un seul code path
read-only pour tous les artefacts, peu importe l'endroit où ils
s'affichent. Renommer « Roadmap » en « Kanban » aligne le label
sur ce que l'utilisateur voit (colonnes type kanban) et simplifie
la communication produit.

## Scope In

- Renommer toutes les **occurrences UI** du label « Workflow » en
  « Kanban » (ActivityBar, header de la vue, tooltips, textes
  affichés). Le mode interne reste `ShellMode = 'workflow'` et le
  composant `<WorkflowPipeline>` garde son nom de fichier — c'est
  uniquement le libellé visible qui bouge.
- Quand l'utilisateur clique sur une carte d'artefact (story, canvas,
  analyse, inbox, epic, …) dans la vue Kanban (ex-Workflow), ouvrir
  le SpddEditor en **mode read-only** dans le panneau de droite,
  au lieu du composant d'aperçu bespoke actuel.
- L'aperçu read-only montre le même rendu visuel que le SpddEditor
  read-only ouvert depuis la HubList (front-matter card, sections
  prose / AC stylées, badges status — cohérence absolue).
- Supprimer le ou les composants d'aperçu bespoke devenus inutiles
  après l'harmonisation (si un import / une référence existe encore
  ailleurs, en pré-conditions à la story c'est à analyser).

## Scope Out

- Édition depuis le panneau d'aperçu (le clic ouvre en read-only ;
  pour éditer, l'utilisateur passe par le bouton « Modifier » du
  SpddEditor — comportement déjà existant).
- Renommage de la clé `ShellMode = 'workflow'` ou du fichier
  `WorkflowPipeline.tsx` / `stores/workflow.ts`. Le label visible
  change uniquement.
- Le mode `roadmap` (séparé) reste tel quel — cette story ne le
  touche pas.
- Refonte du layout 50/50 (le drawer continue de prendre la moitié
  droite — seul son contenu change).
- Multi-aperçu (un seul artefact ouvert à la fois dans le drawer,
  comme aujourd'hui).

## Acceptance Criteria

### AC1 — Label « Kanban » dans l'ActivityBar

- **Given** l'app est ouverte sur un projet
- **When** l'utilisateur regarde l'ActivityBar et survole l'icône
  qui ouvre l'ex-vue « Workflow »
- **Then** le tooltip et le label affichent « Kanban » (le mode
  interne reste `'workflow'`, mais aucun « Workflow » n'apparaît
  plus dans le texte visible)

### AC2 — Clic sur une story dans la vue Kanban → SpddEditor read-only

- **Given** la vue Kanban affiche au moins une story dans une de
  ses colonnes
- **When** l'utilisateur clique sur la carte de cette story
- **Then** le panneau de droite affiche le SpddEditor en mode
  read-only sur cette story, avec le même rendu que celui obtenu
  en cliquant sur cette même story depuis la HubList

### AC3 — Clic sur un canvas → SpddEditor read-only

- **Given** la vue Kanban affiche au moins un canvas
- **When** l'utilisateur clique sur la carte du canvas
- **Then** le panneau de droite affiche le SpddEditor read-only
  sur ce canvas (front-matter card + sections REASONS, mêmes
  styles que dans la HubList)

### AC4 — Composant d'aperçu bespoke supprimé

- **Given** la story est livrée
- **When** on inspecte le code source frontend
- **Then** le composant d'aperçu read-only bespoke utilisé avant
  la story (à identifier en analyse) n'est plus présent dans le
  code, et aucun import résiduel n'y fait référence

### AC5 — Cas vide : pas de carte sélectionnée

- **Given** la vue Kanban est ouverte mais aucune carte n'est
  cliquée
- **When** l'utilisateur regarde le panneau de droite
- **Then** le panneau est soit caché soit affiche un état vide
  explicite (pas le SpddEditor « monté à blanc » avec un fichier
  inexistant)

## Open Questions

- [ ] Quel est précisément le composant bespoke à supprimer ?
      `StoryViewer` ? Un autre composant utilisé seulement par la
      vue Kanban (`<WorkflowPipeline>`) ? À identifier en analyse.
- [ ] Le panneau de droite reste-t-il toujours à 50 % ou s'adapte-t-il
      à la taille du SpddEditor (qui peut avoir un inspector étroit
      à droite) ?
- [ ] Quand l'utilisateur quitte la vue Kanban (clic sur un autre
      mode dans l'ActivityBar), le panneau de droite (aperçu) se
      ferme-t-il ou conserve-t-il le dernier artefact affiché ?
- [ ] Le SpddEditor en mode read-only ouvert depuis la vue Kanban
      doit-il pouvoir basculer en mode édition (bouton « Modifier »)
      ou est-il verrouillé en read-only depuis ce point d'entrée ?

## Notes

- Le rendu read-only « cible » est livré par UI-014h (template-driven
  universal editor) et UI-014i (WYSIWYG markdown rendering), donc
  toutes les briques visuelles existent. La story est essentiellement
  un **branchement** + **suppression de code mort**.
- Renommage UI uniquement : pas d'impact sur les artefacts disque
  (`.yukki/roadmap/`), les bindings Go (`AllowedKinds()`,
  `ListArtifacts('roadmap')`), ou le `ShellMode` côté frontend
  (`'roadmap'` reste la clé interne).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur UI-014, UI-014h, UI-014i, UI-008
    (workflow pipeline) — toutes mergées. Pas de bloqueur amont.
  - **Negotiable** : la suppression du composant bespoke peut
    être faite dans la même PR ou en suivi (`/yukki-sync`). La
    story garde l'option ouverte.
  - **Valuable** : oui — cohérence visuelle + baisse de dette.
  - **Estimable** : oui, ~½ j (rename de label + branchement
    SpddEditor read-only + suppression).
  - **Small** : 5 AC, périmètre serré, un seul livrable visuel.
  - **Testable** : oui — assertions simples (label visible, rendu
    read-only chargé sur clic, code mort retiré).
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) : la
  story est petite — pas de découpe justifiée.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Rename label et harmonisation aperçu se livrent ensemble (touchent la même vue, même PR). |
  | Interfaces | non | Un seul type d'aperçu (read-only), pas de variantes. |
  | Data | non | Pas de modèle ni d'API à découper, juste un branchement composant. |
  | Rules | non | L'AC5 (état vide) est le seul cas limite et tient en un AC. |
  | Spike | non | Pas d'inconnue technique majeure (briques toutes existantes). |
