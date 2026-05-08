---
id: ROADMAP-001
slug: kanban-now-next-later-drag-drop
title: Vue Kanban Roadmap Now / Next / Later avec drag-drop
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
---

# Vue Kanban Roadmap Now / Next / Later avec drag-drop

## Background

META-005 a posé la fondation pour la roadmap (`.yukki/roadmap/` créé
à l'init, mode `'roadmap'` dans le ShellMode, icône Map dans
l'ActivityBar) en promettant une vue projection « Now / Next /
Later » des Epics et Stories engagées. À ce jour, le mode `roadmap`
est juste une HubList comme les autres — aucune colonne projection,
aucun drag-drop. On veut livrer la vraie vue Kanban promise par
META-005 : 3 colonnes pré-définies, items déplaçables d'une colonne
à l'autre, persistance dans le front-matter de l'artefact roadmap.

## Business Value

Permet aux PMs et leads techniques de visualiser en un coup d'œil
où en est la priorisation des chantiers — distinction entre ce qui
est en cours, ce qui suit, et ce qui peut attendre. Réduit la
friction de communication produit et matérialise concrètement la
promesse META-005.

## Scope In

- Vue mode `roadmap` rend une **disposition à 3 colonnes** :
  « Now » / « Next » / « Later » au lieu de la HubList linéaire.
- Chaque carte de la roadmap correspond à un fichier dans
  `.yukki/roadmap/` — soit un epic, soit une story standalone
  engagée.
- Le **front-matter** de chaque artefact roadmap porte un champ
  dédié (par exemple `column: now | next | later`) qui détermine
  la colonne d'affichage.
- **Drag-drop** pour déplacer une carte d'une colonne à l'autre ;
  le champ front-matter est mis à jour et persiste sur disque.
- Les cartes affichent les méta visibles dans la HubList : id,
  status, titre tronqué, dernière mise à jour.
- Un **clic** sur une carte ouvre l'aperçu read-only dans le
  panneau de droite (cohérent avec UI-017 — SpddEditor read-only
  unifié).
- Si l'utilisateur ouvre la roadmap d'un projet sans artefacts
  dans `.yukki/roadmap/`, état vide explicite avec un CTA
  « Promouvoir une story / un epic ».

## Scope Out

- Création de cartes roadmap depuis cette story (création
  couverte par INBOX-001 / un futur ROADMAP-002 promotion-flow).
- Filtrage / recherche dans la roadmap (peut venir plus tard).
- Vue calendrier ou Gantt (Q1/Q2/Q3) — la promesse META-005 ne
  porte que sur Now/Next/Later, pas sur le temps absolu.
- Autorisation / RBAC sur qui peut déplacer une carte (yukki est
  mono-utilisateur).
- Synchronisation temps réel multi-instance (si plusieurs fenêtres
  yukki sur le même projet, pas de live-update — l'utilisateur
  refresh).

## Acceptance Criteria

### AC1 — 3 colonnes affichées avec leurs cartes

- **Given** un projet ouvert dont `.yukki/roadmap/` contient au
  moins une carte avec `column: now`, une avec `column: next`
  et une avec `column: later`
- **When** l'utilisateur sélectionne le mode `roadmap` dans
  l'ActivityBar
- **Then** trois colonnes s'affichent côte à côte (Now / Next /
  Later) et chaque carte apparaît sous son intitulé de colonne

### AC2 — Drag-drop persiste la colonne

- **Given** une carte est dans la colonne « Next »
- **When** l'utilisateur la glisse dans la colonne « Now »
- **Then** le fichier markdown sur disque a son front-matter
  `column: now`, la carte reste affichée en « Now » au prochain
  refresh, et l'`updated:` est bumpé à la date du jour

### AC3 — Clic ouvre l'aperçu read-only

- **Given** la vue roadmap affiche au moins une carte
- **When** l'utilisateur clique sur une carte sans la déplacer
- **Then** l'aperçu read-only de l'artefact s'ouvre dans le
  panneau de droite, cohérent avec le rendu UI-017 (front-matter
  card + sections stylées, pas le composant bespoke)

### AC4 — Erreur de drag : retour à la colonne d'origine

- **Given** un drag-drop en cours
- **When** l'écriture sur disque échoue (permissions, fichier
  verrouillé) ou l'utilisateur lâche en dehors d'une colonne
- **Then** la carte retourne à sa colonne d'origine et un toast
  signale l'erreur sans casser la session

### AC5 — État vide

- **Given** un projet ouvert dont `.yukki/roadmap/` est vide ou
  n'existe pas
- **When** l'utilisateur ouvre la vue roadmap
- **Then** les 3 colonnes sont visibles mais vides, et un message
  central propose une action (« Aucune carte sur la roadmap pour
  l'instant ») sans erreur ni écran gris

## Open Questions

- [ ] Nom du champ front-matter pour la colonne : `column`,
      `roadmap-column`, `priority`, `lane` ? À standardiser dans
      le template `.yukki/templates/` correspondant.
- [ ] Une carte peut-elle être **sans colonne** (et alors
      affichée dans une 4e colonne « Backlog » ou ignorée) ? Ou
      la colonne est-elle obligatoire dès la création ?
- [ ] Drag-drop entre `roadmap` et d'autres dossiers (par exemple
      promouvoir un inbox vers la roadmap) — hors scope ici, mais
      à clarifier comme évolution future.
- [ ] Limite douce sur le nombre de cartes par colonne (warning
      au-delà de 10 dans « Now » ?) ou pas de limite ?
- [ ] Lib drag-drop côté React : `@dnd-kit/core` (moderne,
      accessible), `react-beautiful-dnd` (mature mais en
      maintenance only), ou natif HTML5 drag-drop ? À trancher
      en analyse.

## Notes

- Story enfant logique de META-005 (qui a posé la fondation
  filesystem). Repose aussi sur UI-017 pour l'aperçu read-only.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur META-005, UI-017 (à livrer).
  - **Negotiable** : champ front-matter + lib DnD ouverts.
  - **Valuable** : oui, matérialise la promesse META-005.
  - **Estimable** : ~2 j.
  - **Small** : 5 AC, un seul livrable visuel + persistance.
  - **Testable** : oui — assertion sur le HTML rendu, simulation
    de drag-drop via testing-library, vérification du
    front-matter post-drop.
- Décision SPIDR : pas de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | 3 colonnes partagent le même rendu / persistance. |
  | Interfaces | non | Une seule vue cible. |
  | Data | non | Le front-matter `column` est central. |
  | Rules | non | AC4 (drag KO) et AC5 (vide) tiennent en 2 AC. |
  | Spike | possible | Si la lib DnD pose souci dans Wails / WebView2, sortir un spike — sinon non. |
