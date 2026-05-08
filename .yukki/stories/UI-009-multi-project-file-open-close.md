---
id: UI-009
slug: multi-project-file-open-close
title: Ouverture / fermeture de plusieurs projets yukki (File menu)
status: synced
created: 2026-05-06
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
parent: ~
sibling-stories:
  - UI-001b-hub-viewer-claude-banner
  - UI-006-shell-vscode-layout
depends-on: []
inbox-source: INBOX-017
---

# Ouverture / fermeture de plusieurs projets yukki (File menu)

## Background

Aujourd'hui yukki gère **un seul projet** à la fois via le bouton
`SelectProject` du hub. Pour basculer entre 2 projets, l'utilisateur
doit refaire la sélection (et perd l'état de l'autre projet). Or
un dev typique jongle entre 3-5 codebases (client A, side-project
OSS, fork interne…). Cette story livre le **MVP multi-projet** —
File menu standard avec Open / Close / Recent, persistance entre
sessions — sans encore l'alerting cross-projet ni le daily digest
(cf. `INBOX-017` phases 2-4 pour la suite).

## Business Value

Pour les devs qui maintiennent plusieurs repos yukki, élimine la
friction quotidienne du "fermer-relancer-rebasculer". Débloque la
suite (cross-project dashboard, alerting) sans imposer ces
fonctionnalités tout de suite.

## Scope In

- **File menu** dans le titlebar (cf. UI-007 custom titlebar) avec
  entries :
  - `Open Project...` (raccourci `Ctrl+O`) — ouvre le directory
    picker, ajoute le projet à la session active, bascule dessus
  - `Close Project` (raccourci `Ctrl+W`) — ferme le projet courant,
    bascule vers le suivant ou empty state si aucun
  - `Recent Projects ▶` — sous-menu listant les N derniers projets
    (avec leur path, par ordre récence) ; click = ouvrir / réouvrir
- **Persistance** : la liste des projets ouverts est sauvegardée
  côté machine de l'utilisateur (registre `projects.json` style XDG)
  et restaurée au prochain lancement de yukki
- **Tab bar projets** intégrée sous le titlebar (style file tabs
  VSCode mais 1 tab = 1 projet ouvert) :
  - chaque tab affiche le nom court du projet, un dot ● si modifié,
    et un bouton `✕` au survol pour fermer
  - tab actif = surligné (bordure haut couleur primaire + fond
    légèrement plus clair)
  - bouton `+` à droite pour `Open Project` (raccourci visuel
    équivalent à `Ctrl+O`)
  - drag-drop horizontal pour réordonner les tabs
  - raccourcis clavier :
    - `Ctrl+Tab` / `Ctrl+Shift+Tab` : navigue entre tabs
      (ordre récence puis position)
    - `Ctrl+1` à `Ctrl+9` : bascule directement au tab N
    - `Ctrl+W` : ferme le tab courant (équivalent `Close Project`)
    - `Ctrl+O` : ouvre nouveau tab via picker
- **Backend isolation** : chaque projet ouvert a son propre state
  en mémoire (loader, writer, projectDir) — pas de croisement
  involontaire entre projets

## Scope Out

- **Cross-project dashboard** ("Home" view agrégeant l'état SPDD de
  tous les projets) — `INBOX-017` phase 2
- **Alerting / notifications** desktop (canvas obsolète,
  story aging, generate parallèle terminé) — `INBOX-017` phase 3
- **Daily digest** markdown au lancement quotidien — `INBOX-017`
  phase 4
- **Auto-discovery** de projets yukki existants sur le filesystem
  (l'utilisateur ajoute manuellement chaque projet la première fois)
- **Sync cloud** ou multi-user (le registre reste local-machine)
- **Drag-drop d'un dossier** sur la fenêtre yukki pour l'ouvrir
  (nice-to-have, hors MVP)

## Acceptance Criteria

### AC1 — Open Project ajoute et bascule

- **Given** yukki ouvert avec 0 ou N projets actifs
- **When** l'utilisateur clique `File > Open Project...` (ou
  `Ctrl+O`) et sélectionne un dossier contenant `.yukki/`
- **Then** le projet est ajouté à la liste des projets actifs et
  devient le projet courant (sidebar / hub se met à jour pour
  refléter son contenu)

### AC2 — Close Project ferme et bascule

- **Given** yukki ouvert avec ≥ 1 projet(s) actif(s), un projet
  étant le courant
- **When** l'utilisateur clique `File > Close Project` (ou
  `Ctrl+W`)
- **Then** le projet courant est retiré de la liste active ; si
  d'autres projets restent ouverts, yukki bascule vers le suivant
  (ordre récence) ; sinon yukki affiche un empty state ("Open a
  project to start")

### AC3 — Recent Projects liste les derniers

- **Given** un utilisateur qui a ouvert puis fermé plusieurs
  projets dans des sessions passées
- **When** l'utilisateur ouvre `File > Recent Projects ▶`
- **Then** un sous-menu affiche les N derniers projets (N=10 par
  défaut) avec leur nom + path tronqué ; click sur un item =
  équivalent à `Open Project` sur ce path

### AC4 — Persistance entre sessions

- **Given** un utilisateur avec ≥ 1 projet(s) actif(s) qui ferme
  yukki proprement
- **When** yukki est relancé
- **Then** les mêmes projets sont rouverts automatiquement, et le
  projet qui était courant à la fermeture redevient courant

### AC5 — Erreur user : ouverture d'un dossier sans `.yukki/`

- **Given** yukki ouvert
- **When** l'utilisateur sélectionne via `Open Project...` un
  dossier qui ne contient pas de sous-dossier `.yukki/`
- **Then** une boîte de dialogue propose : (a) `Initialize` (lance
  l'init yukki sur ce dossier), (b) `Cancel` (annule l'ouverture).
  Pas d'ajout à la liste tant que la décision n'est pas prise.
  Aucun crash.

### AC6 — Cas limite : projet supprimé du filesystem entre sessions

- **Given** un projet enregistré dans le registre, mais dont le
  dossier `.yukki/` a été supprimé hors yukki (`rm -rf`, déplacement)
- **When** yukki tente de le rouvrir au démarrage
- **Then** le projet est retiré du registre avec un message info
  ("Project X not found, removed from recent"), pas de crash, les
  autres projets s'ouvrent normalement

## Open Questions

_Décisions tranchées en revue humaine :_

- ✅ **Multi-tab confirmé** (style file tabs VSCode, 1 tab = 1 projet
  ouvert, en haut sous le titlebar). Pas de multi-window.

_Questions restantes :_

- [ ] **Limite N max** — un cap dur sur le nombre de projets
  simultanés (10 ?) ou illimité avec performance dégradée graceful ?
- [ ] **Persistance par défaut** — restaurer les projets de la
  session précédente activé par défaut, ou opt-in via préférence ?
  Reco : on par défaut (UX moderne).
- [ ] **Empty state** — quand aucun projet n'est ouvert, afficher
  une vue "welcome" avec boutons `Open Project` / `Recent Projects`
  ou simplement une zone vide avec hint clavier ?
- [ ] **Position des tabs** — entre titlebar et activity bar (style
  VSCode file tabs), ou intégrées dans le titlebar custom (UI-007) ?

## Notes

### Contexte vis-à-vis de INBOX-017

Cette story livre la **phase 1 MVP** de `INBOX-017` (multi-projet +
alerting cross-projets). Les phases 2-4 (dashboard agrégé,
alerting, daily digest) restent en backlog inbox et nécessiteront
des stories enfants additionnelles après livraison de UI-009.

### Évaluation INVEST

- **Independent** : OK — ne dépend d'aucune story en cours
- **Negotiable** : OK — Scope Out exhaustif (alerting / dashboard /
  digest hors)
- **Valuable** : OK — bénéfice immédiat pour les utilisateurs
  multi-repos
- **Estimable** : OK — ~2-3j (File menu + state per-project +
  persistance + tests)
- **Small** : OK (~10 fichiers touchés : titlebar custom menu,
  store frontend, internal/uiapp registry, persistence layer, tests)
- **Testable** : OK — AC mesurables via tests Go (registry persist)
  + tests frontend (menu rendering, state isolation)

### Décision SPIDR

Story atomique non-scindable à ce niveau de scope. Le découpage
naturel suivant (alerting, dashboard, digest) est déjà pré-tracé
dans `INBOX-017` phases 2-4 et fera l'objet de stories enfants
séparées **après** livraison de UI-009.

| Axe | Verdict |
|---|---|
| Paths (open / close / recent / persist) | gardés ensemble (cohérence MVP) |
| Interfaces (frontend menu + Go registry) | dans la même story (binding direct) |
| Data (registre projects.json) | dans la même story (1 schéma) |
| Rules (transitions état projet courant) | dans la même story |
| Spike | non requis |

### Source

Story dérivée de l'inbox item `INBOX-017-multi-project-management-alerting`
(phase 1 MVP). Le frontmatter `inbox-source: INBOX-017` trace la
filiation pour audit.
