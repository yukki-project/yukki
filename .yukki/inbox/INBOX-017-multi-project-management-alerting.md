---
id: INBOX-017
slug: multi-project-management-alerting
title: Gestion multi-projet — switcher + alerting cross-projets
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Gestion multi-projet — switcher + alerting cross-projets

## Idée

Aujourd'hui yukki gère **un seul projet à la fois** (via le
`SelectProject` du hub Wails). Or un dev typique travaille sur 3-5
repos en parallèle (un projet client A, un side-project OSS, un
fork interne, etc.). Sans visibilité agrégée, des items SPDD se
font **oublier** dans les projets pas ouverts depuis une semaine
(stories `reviewed` qui attendent leur generate, canvas devenus
obsolètes après un merge externe, Inbox items qui pourrissent en
`unsorted`).

Étendre yukki pour devenir un **hub multi-projet** avec :

1. **Registre de projets** — liste des projets yukki connus, persisté
   dans la config utilisateur (`~/.config/yukki/projects.json` ou
   équivalent XDG)
2. **Project switcher** — dropdown / palette pour basculer
   instantanément (style Cursor "Recent Projects" ou VSCode workspaces)
3. **Cross-project dashboard** — vue agrégée de l'état SPDD de tous
   les projets enregistrés
4. **Alerting** — notifications desktop (et in-app) sur événements
   importants : fin d'un generate parallèle, canvas modifié par un
   git pull externe, story bloquée trop longtemps en `reviewed`
5. **Daily digest** — briefing du matin "voici ce qui t'attend
   aujourd'hui sur tes 4 projets"

## Architecture cible

```
   ┌──────────────────────────────────────────────────────┐
   │  yukki UI                                            │
   │                                                      │
   │  ┌─────────────────────────┐                         │
   │  │ [▼] Project: yukki      │  ← switcher en header  │
   │  │     ⚡ 3 alertes        │     avec badges         │
   │  └─────────────────────────┘                         │
   │                                                      │
   │  Cross-project dashboard (mode "Home")               │
   │  ┌──────────────────────────────────────────────┐    │
   │  │ 🟢 yukki                                     │    │
   │  │   • 2 stories à reviewer (META-007, INT-002) │    │
   │  │   • 1 canvas obsolète (META-005, prompt-upd) │    │
   │  │   • 4 Inbox > 30j (à qualifier)              │    │
   │  ├──────────────────────────────────────────────┤    │
   │  │ 🟡 client-portail (last seen 5d ago)         │    │
   │  │   • 1 generate parallèle terminé (PR #42)    │    │
   │  │   • 3 stories en flight                      │    │
   │  ├──────────────────────────────────────────────┤    │
   │  │ ⚫ side-project-x (last seen 14d ago)        │    │
   │  │   • Aging warning : 5 Inbox > 14j unsorted   │    │
   │  └──────────────────────────────────────────────┘    │
   │                                                      │
   │  Cliquer un projet → bascule vers son hub dédié       │
   └──────────────────────────────────────────────────────┘
```

## Features détaillées

### Registre de projets

Fichier de config utilisateur (XDG-compliant) :
```json
{
  "version": 1,
  "projects": [
    {
      "name": "yukki",
      "path": "/c/workspace/yukki",
      "added": "2026-05-01T10:00:00Z",
      "last_opened": "2026-05-05T22:30:00Z",
      "alerts_enabled": true,
      "color": "#10b981"
    },
    {
      "name": "client-portail",
      "path": "/d/work/client-portail",
      "added": "2026-04-15T14:00:00Z",
      "last_opened": "2026-04-30T18:00:00Z",
      "alerts_enabled": true,
      "color": "#3b82f6"
    }
  ]
}
```

Stockage **côté machine de l'utilisateur** uniquement, jamais
uploadé. Pas de multi-user / cloud à ce stade.

### Project switcher (UX)

3 modes d'accès :
1. **Dropdown header** — bouton avec nom du projet courant + flèche
2. **Palette `Ctrl+K`** — fuzzy search style VSCode "Open recent"
3. **Mode "Home" / dashboard** — vue cross-projets accessible
   depuis l'icône yukki (à gauche de la sidebar)

Bascule = `SelectProject(path)` mais sans dialog (path déjà connu).
HMR sur le changement de projectDir.

### Cross-project dashboard

Vue agrégée :
- **Carte par projet** avec état SPDD synthétique
- **Indicateur santé** :
  - 🟢 récent + actions claires
  - 🟡 last seen > 7j ou alertes non-critiques
  - 🔴 critique (canvas obsolète depuis 14j, generate échoué)
  - ⚫ archivé (last seen > 30j, opt-in archivage manuel)
- **Lignes d'alertes** par projet :
  - Stories à reviewer
  - Canvas obsolètes (`status=reviewed` après prompt-update)
  - Inbox > N jours `unsorted` (configurable)
  - Generate parallèle terminés en attente de review
  - Builds CI cassés (si yukki sait lire)
- **Dernière activité** : "5 commits cette semaine", "0 commits
  depuis 14j"

### Alerting / notifications desktop

Plusieurs sources d'événements :

1. **Watcher filesystem** — chaque projet enregistré avec
   `alerts_enabled: true` est watché (FSNotify Go) ; détection des
   changements dans `.yukki/` (ex: `git pull` qui apporte un nouveau
   canvas).
2. **Long-running tasks** — un generate parallèle (cf. INBOX-016)
   en cours depuis 10min émet une notif "still running"; à la fin,
   "X PRs prêtes à reviewer".
3. **Aging cron** — daily check à 9h locale : Inbox > 30j unsorted,
   stories bloquées > 14j en `reviewed`, canvas obsolètes > 7j.

Mécanismes UI :
- **Notifications natives OS** via Wails 2.x runtime (toast Windows,
  notification macOS, libnotify Linux)
- **Badge sur l'icône systray** avec compteur (3 = 3 alertes
  actives)
- **In-app banner** dans le hub avec liste résumée
- **Mute / snooze** par projet ou par type d'alerte

### Daily digest (briefing du matin)

Au lancement de yukki la première fois de la journée (ou via
commande `yukki digest`), génère un récap markdown :

```markdown
# Daily digest — 2026-05-05

## Actions urgentes

- [ ] **yukki** : reviewer META-007 (`reviewed` depuis 5j)
- [ ] **client-portail** : merger PR #42 (generate terminé hier)

## À qualifier

- [ ] **yukki** : 4 Inbox > 30j (INBOX-001, 002, 003, 004)
- [ ] **side-project-x** : 5 Inbox > 14j

## Risques

- ⚠️ **yukki** : canvas META-005 obsolète depuis 7j

## Activité de la nuit

- yukki : 0 commits
- client-portail : 3 commits (merge PR #41)
- side-project-x : 0 commits
```

Optionnel : envoi par email / Slack (out of scope v1).

## Vs concurrence

| Outil | Multi-projet | Alerting cross-projets | Open-source |
|---|---|---|---|
| Linear | Oui (cloud) | Oui (web) | Non |
| Jira | Oui | Oui (lourd) | Non |
| Cursor | Multi-workspace mais pas dashboard | Non | Non |
| VSCode workspaces | Oui mais aucun contexte SPDD | Non | Oui (mais pas méthodo) |
| Kiro | ? | ? | Non |
| **yukki** | **Oui, avec contexte SPDD agrégé** | **Oui, local + privacy** | **Oui** |

C'est un **multiplicateur d'usage** : sans gestion multi-projet,
yukki ne sert qu'à un repo à la fois ; avec, il devient le hub
quotidien du dev qui jongle entre 3-5 codebases.

## Pièges

### Privacy / sécurité

- Le registre `.json` ne stocke que des **paths locaux**, jamais le
  contenu des artefacts
- Pas de télémétrie / phone-home
- Watcher actif **uniquement** sur les projets explicitement
  enregistrés
- Confirmation explicite à l'ajout d'un projet ("yukki va surveiller
  les changements dans `.yukki/` de ce dossier — OK ?")

### Coût ressources

N projets watchés = N FSNotify watchers. Pour N raisonnable (2-10),
négligeable. Au-delà, throttler ou désactiver le watcher (consultation
on-demand uniquement).

### Aging cron persistance

Le cron daily doit tourner même si yukki est fermé — sinon le
digest n'arrive jamais. Options :
- **Daemon yukki** (option) en background (systray)
- **Hook OS** (tâche planifiée Windows / launchd macOS / systemd
  user Linux)
- **Lazy** : digest calculé seulement à l'ouverture du hub
  (acceptable v1)

### Conflits sync git

Si l'utilisateur fait `git pull` dans un projet pendant que yukki
est ouvert, le watcher détecte le changement. yukki doit recharger
proprement les artefacts sans perdre l'état UI courant (e.g.,
panneaux 3-panes ouverts).

### Multi-user pas dans scope

Pour l'instant **un seul utilisateur** par instance yukki. Pas de
sync entre devs (utilisez git + linear/jira pour ça). À évaluer
plus tard via Linear-like server cloud, mais hors scope OSS v1.

## Synergies fortes avec d'autres inbox

- **INBOX-015 (cockpit SPDD)** — la vue "Cockpit Today" devient
  cross-projet par défaut, pas uniquement courant projet
- **INBOX-016 (parallel multi-branch)** — les notifications de fin
  de generate parallèle alimentent l'alerting
- **INBOX-014 (positionnement vs Kiro)** — multi-projet est un
  argument de vente naturel pour devs jonglant entre repos client
- **INBOX-008 (graph RAG)** — un graphe **cross-projet** détecte
  des patterns (mêmes concepts dans plusieurs codebases, refactor
  croisé)
- **INBOX-013 (stack RAG progressif)** — le linter et le search
  peuvent tourner cross-projet pour le digest

## Décisions à trancher (revue produit)

- [ ] **Path config** — `~/.config/yukki/projects.json` (Linux/Mac)
  ou `%APPDATA%\yukki\projects.json` (Windows) ? Probablement les
  deux selon l'OS, via XDG-compliant lib Go (`adrg/xdg` par exemple).
- [ ] **Auto-discovery** des projets yukki — yukki scanne automa-
  tiquement le home dir pour trouver des `.yukki/`, ou registration
  manuelle obligatoire ? Auto-discovery = utile mais privacy-
  intrusive.
- [ ] **Watcher per-project** ou **watcher central** ? Per-project
  plus simple et résilient ; central plus performant mais plus
  complexe.
- [ ] **Daily digest** — interactif au lancement (chouette) ou
  envoyé par email (out of scope) ?
- [ ] **Mode "Home"** par défaut au lancement de yukki, ou
  ouverture sur le dernier projet utilisé ?

## Phasage proposé

### Phase 1 — Multi-projet basique (MVP)

- Registre `projects.json` + ajout/suppression manuel
- Project switcher dropdown header
- Bascule `SelectProject(path)` sans dialog
- Pas encore de dashboard cross-projet, juste switching rapide

### Phase 2 — Cross-project dashboard

- Vue "Home" avec cartes par projet
- Calcul état SPDD agrégé (stories à reviewer, canvas obsolètes,
  Inbox aging) au load
- Indicateurs santé 🟢/🟡/🔴/⚫
- Lien "ouvrir" qui bascule vers le projet

### Phase 3 — Alerting + notifications

- Watcher FSNotify per-project
- Notifications natives OS (Wails 2.x runtime)
- Badge systray + compteur
- In-app banner

### Phase 4 — Daily digest + cron

- Markdown digest au premier lancement de la journée
- Optionnel : tâche planifiée OS pour digest même hors yukki
- Format export (markdown + clipboard pour partage)

## Notes

- **Argument de vente OSS fort** : "yukki = ton **cockpit produit
  multi-projet** pour les devs qui jonglent entre 3-5 codebases
  avec rigueur SPDD" — phrase marketing claire, vide de marché
  manifeste.
- **Banc de test idéal Sopra HR** : un dev plateforme typique chez
  Sopra HR a 5+ repos en parallèle (helm-charts, backend java,
  controller Kubernetes, doc Antora, scripts, etc.). yukki
  multi-projet adresse ça directement.
- Lien fort avec INBOX-014 (trajectoire) : le multi-projet déplace
  yukki d'un "outil pour un repo" vers un "hub méthodologique
  personnel" — change le pitch.
- Probable Epic à découper en 6-8 stories enfants (registre,
  switcher, dashboard, watcher, alerts, digest, settings,
  archivage).
