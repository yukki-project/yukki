---
id: UI-022
slug: human-action-notifications
title: Notifications d'actions humaines + highlights Kanban
status: draft
created: 2026-05-09
updated: 2026-05-09
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
---

# Notifications d'actions humaines + highlights Kanban

## Background

Le workflow SPDD repose sur des **revues humaines obligatoires** entre
chaque étape (`/yukki-story` → revue → `/yukki-analysis` → revue →
`/yukki-reasons-canvas` → revue → `/yukki-generate` → revue de code).
Aujourd'hui rien dans l'UI ne signale ces points d'attente : un
canvas en `draft` après génération LLM peut rester bloqué des jours
avant que l'utilisateur ne se souvienne qu'il faut le relire et le
passer en `reviewed`. On veut un **système de notifications** qui
liste les artefacts en attente d'action humaine, et un **highlight
visuel dans le Kanban** pour les faire ressortir.

## Business Value

Discipline SPDD préservée : aucune story ne reste indéfiniment
en `draft` parce qu'on a oublié sa revue. Réduit le temps « entre
la génération LLM et la mise en oeuvre ». Améliore la lisibilité
du Kanban : l'utilisateur voit instantanément où il doit agir,
plutôt que de scroller toutes les colonnes pour trouver les items
bloqués.

## Scope In

- **Détection « action humaine attendue »** côté backend ou frontend :
  un artefact est marqué « pending » selon des règles par
  kind / status (à figer en analyse, par exemple « story `draft`
  → revue à faire », « canvas `reviewed` → prêt pour
  /yukki-generate »).
- **Indicateur global** dans le TitleBar (icône cloche / bouton)
  avec un badge numérique du nombre d'artefacts pending.
- **Panneau de notifications** ouvert au clic sur la cloche :
  liste des items pending avec, pour chacun : id, titre, kind,
  statut courant, action suggérée (« Revoir », « Lancer
  /yukki-analysis », …), et un bouton « Ouvrir » qui charge
  l'artefact dans le SpddEditor.
- **Highlight visuel dans le Kanban** : les cartes correspondant
  à des artefacts pending ont un badge / une bordure / une
  couleur distincte (à arbitrer en analyse) pour les faire
  ressortir.
- **Mise à jour temps réel** : quand l'utilisateur passe un
  artefact en `reviewed`, la notification disparaît sans refresh
  manuel.

## Scope Out

- **Notifications OS-level** (system tray, push) — yukki est
  un desktop app, l'utilisateur est devant la fenêtre quand il
  travaille.
- **Notifications externes** (email, Slack, Discord) — hors
  périmètre v1.
- **Notifications pour les erreurs / crashs** — déjà couvert
  par le toast (`useToast`) et l'ErrorBoundary OPS-001.
- **Auto-action sur la notification** : la notification SURFACE
  les pending, l'utilisateur agit ensuite manuellement. Pas
  d'auto-promotion `draft` → `reviewed` depuis le panneau.
- **Notifications pour les inboxes** non triées — couvert par
  une autre story (INBOX-001 triage), ou peut être inclus si
  les règles de pending l'attrapent naturellement (à arbitrer).
- **Historique des notifications** (lues / non lues, archive) —
  v1 affiche juste la liste courante des pending.

## Acceptance Criteria

### AC1 — Badge de notifications visible

- **Given** un projet ouvert avec 3 artefacts en `draft` dont la
  règle de détection les classe « action humaine attendue »
- **When** l'utilisateur regarde le TitleBar
- **Then** l'icône cloche affiche un badge `3` cliquable

### AC2 — Liste des notifications + lien vers l'artefact

- **Given** la cloche affiche un badge non nul
- **When** l'utilisateur clique sur la cloche puis sur l'item
  « UI-016 — story en attente de revue »
- **Then** le panneau se ferme, l'app navigue dans le mode
  `stories`, sélectionne UI-016, et le SpddEditor s'ouvre en
  mode read-only sur cet artefact

### AC3 — Highlight Kanban

- **Given** la vue Kanban (UI-017) est ouverte et contient des
  cartes en `draft` détectées comme pending
- **When** l'utilisateur regarde les colonnes
- **Then** les cartes pending ont un indicateur visuel distinct
  (badge / bordure / couleur) qui les fait ressortir au premier
  coup d'œil par rapport aux cartes non pending

### AC4 — Mise à jour temps réel post-action

- **Given** la cloche affiche un badge `3` et le SpddEditor
  est ouvert sur une story en `draft`
- **When** l'utilisateur passe le statut de la story en
  `reviewed` et sauve
- **Then** la cloche affiche `2` sans intervention manuelle
  supplémentaire et la carte de cette story dans le Kanban
  perd son highlight

### AC5 — Aucun pending : état vide explicite

- **Given** un projet où tous les artefacts sont au-delà de
  `draft` selon les règles
- **When** l'utilisateur regarde la cloche puis l'ouvre
- **Then** la cloche n'affiche pas de badge et le panneau,
  s'il est ouvert, montre un message « Aucune action en
  attente » (pas une liste vide silencieuse)

## Open Questions

- [ ] **Règles exactes de détection** « action humaine attendue » :
      faut-il une règle par couple (kind × status) figée
      (`story:draft → "à revoir"`, `analysis:draft → "à revoir"`,
      `prompts:reviewed → "à générer"`, etc.) ou bien un champ
      libre `next-action` dans le front-matter de chaque
      artefact ? À trancher en analyse.
- [ ] **Position de la cloche** : dans le TitleBar à droite près
      des window controls, ou à gauche près du logo / FileMenu /
      futur HelpMenu (UI-021) ? Standard d'app desktop varie.
- [ ] **Rendu du highlight Kanban** : badge en haut à droite de
      la carte (« revue ! »), bordure colorée, fond translucide,
      ou icône cloche dans la carte ? À arbitrer en analyse pour
      cohérence visuelle avec UI-018 (palette yk-*).
- [ ] **Refresh** : recalcul à chaque modification (event
      Wails déclenché par `WriteArtifact`) ou polling périodique
      (toutes les N secondes) ?
- [ ] **Inboxes non triées** doivent-elles être incluses dans
      les notifications, ou réservées à INBOX-001 (triage
      dédié) ?

## Notes

- Briques mobilisables : ListArtifacts (CORE-004) pour récupérer
  les statuts, Kanban (UI-017 — Workflow → Kanban + aperçu
  read-only à venir), EventsEmit Wails pour push temps réel
  vers le frontend, useToast pour les feedback ponctuels (mais
  notifications = panneau persistant, pas un toast éphémère).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur UI-017 (highlight Kanban) qui
    n'est pas encore livré → cette story bloque côté Kanban
    tant que UI-017 n'est pas mergé. Le panneau de notifications
    seul peut être livré indépendamment.
  - **Negotiable** : règles de détection + position cloche +
    rendu highlight sont ouverts.
  - **Valuable** : oui — débloque la discipline SPDD.
  - **Estimable** : ~2 j (frontend cloche + panneau + Kanban
    highlight + binding Go pour calculer la liste pending).
  - **Small** : borderline — multi-zones (TitleBar + Kanban +
    règles backend) mais cohésif autour d'un seul concept
    « pending ».
  - **Testable** : oui — assertion sur le badge count, mock
    des règles de détection, simulation d'une transition de
    statut.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** en 2 stories.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | Cloche + panneau (TitleBar) ET highlight Kanban sont 2 paths indépendants. Découpe potentielle : (a) UI-022a panneau de notifications + détection ; (b) UI-022b highlight Kanban (qui réutilise les règles de a). À garder pour l'analyse. |
  | Interfaces | non | Une seule UI cible (l'app desktop), pas de variantes. |
  | Data | non | Les règles de détection sont une seule donnée pour les deux paths. |
  | Rules | non | AC4 (refresh temps réel) et AC5 (vide) sont les deux cas limites, tiennent en 2 AC. |
  | Spike | possible | Si le mécanisme de push events Wails (EventsEmit) est nouveau dans le contexte « liste d'artefacts », un spike peut être utile pour valider la perf — sinon non. |
