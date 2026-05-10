---
id: UI-023
slug: yukki-watch-fs-events
title: Auto-rafraîchissement de l'UI sur changement disque (.yukki/)
status: synced
created: 2026-05-09
updated: 2026-05-10
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
  - internal/artifacts
---

# Auto-rafraîchissement de l'UI sur changement disque (.yukki/)

## Background

Yukki desktop affiche les artefacts du dossier `.yukki/` du projet
actif (HubList, vue Kanban, SpddEditor). Aujourd'hui, si l'utilisateur
édite un artefact en dehors de l'app — VS Code ouvert en parallèle,
commande CLI `/yukki-story` lancée depuis un terminal, `git pull`
qui ramène de nouveaux artefacts — l'UI ne reflète rien tant que
l'utilisateur ne change pas de mode ou ne ferme/rouvre le projet.
Cela casse l'illusion d'une « source de vérité unique » et oblige
des refresh manuels. On veut un watcher disque qui émet des events
vers le frontend pour rafraîchir automatiquement les vues impactées.

## Business Value

L'UI de yukki devient le miroir vivant du projet, peu importe
l'outil utilisé en parallèle. Permet les workflows multi-outils
(yukki + VS Code + CLI + git) sans friction. Améliore la confiance
dans ce qui est affiché — pas besoin de se demander « est-ce que
c'est encore à jour ? ».

## Scope In

- **Watcher disque côté Go** sur le dossier `.yukki/` du projet
  actif (récursif, tous fichiers `.md`).
- **Détection des évenements** : création, modification,
  suppression, renommage.
- **Émission d'events Wails** vers le frontend
  (par exemple `yukki:fs:changed`) avec un payload structuré
  contenant le type d'event et le path du fichier.
- **Debouncing** côté Go : si plusieurs events arrivent en rafale
  (git checkout, branch switch), les regrouper et n'émettre qu'un
  signal unifié.
- **Refresh automatique côté frontend** des stores impactés :
  HubList items, vue Kanban, SpddEditor (lecture seule).
- **Détection de conflit** : si l'utilisateur édite un artefact
  dans le SpddEditor (modifications locales non sauvées) et que
  ce même fichier change sur disque, afficher un warning de
  conflit avec choix « Recharger depuis le disque » /
  « Garder mes modifications ».
- **Cycle de vie** propre : un watcher démarre par projet ouvert,
  s'arrête quand le projet se ferme (ou que yukki quitte).
- **Watch multi-projet en parallèle** : **tous les projets ouverts**
  sont surveillés simultanément, pas seulement le projet actif.
  Permet de voir un commit / pull dans un projet inactif et de
  retrouver l'UI à jour quand on revient dessus. Fermer un projet
  arrête son watcher associé.

## Scope Out

- **Watch hors `.yukki/`** (par exemple `.git/`, `frontend/`,
  `internal/`). Pas pertinent pour la vue artefacts.
- **Notifications utilisateur sur chaque event** (toast) : trop
  bruyant, le refresh est silencieux.
- **Replay des events qui ont eu lieu pendant que yukki était
  fermé** : à l'ouverture, on lit l'état actuel sans savoir ce
  qui s'est passé entre-temps.
- **Merge automatique des conflits** : la story livre la
  détection + le choix utilisateur, pas de fusion intelligente
  (texte 3-way) ni d'historique d'undo.
- **Auto-reload dans l'AiDiffPanel ou des widgets actifs en
  cours d'IA streaming** : si un appel LLM est en cours, on
  attend qu'il termine avant de proposer le reload (pour ne
  pas casser la session).

## Acceptance Criteria

### AC1 — Création d'un artefact externe apparaît dans la HubList

- **Given** la HubList est ouverte en mode `stories` et liste
  10 stories, et yukki est focus sur le projet `yukki`
- **When** l'utilisateur crée un nouveau fichier
  `.yukki/stories/UI-099-test.md` en dehors de yukki (VS Code,
  CLI, …)
- **Then** la HubList affiche un 11ᵉ item « UI-099 » sans
  qu'aucun refresh manuel ne soit nécessaire

### AC2 — Modification externe d'un artefact non ouvert

- **Given** un artefact `UI-016` n'est pas ouvert dans le
  SpddEditor
- **When** l'utilisateur modifie le titre de cet artefact
  via VS Code et sauvegarde
- **Then** l'item correspondant dans la HubList affiche le
  nouveau titre dans la seconde qui suit, sans intervention
  utilisateur

### AC3 — Suppression d'un artefact ouvert

- **Given** un artefact `UI-099` est ouvert dans le SpddEditor
  en mode read-only et aucune modification locale n'est en
  cours
- **When** l'utilisateur supprime ce fichier en dehors de
  yukki (`rm` ou `git checkout` qui le retire)
- **Then** l'item disparaît de la HubList et le SpddEditor
  affiche un état explicite « Cet artefact n'existe plus »
  (au lieu de planter ou de garder l'ancien contenu)

### AC4 — Conflit : édition locale + modif disque

- **Given** l'utilisateur édite un artefact dans le SpddEditor
  avec des modifications non sauvées (badge orange « modifié
  non sauvé »)
- **When** ce même fichier est modifié et sauvegardé
  ailleurs (VS Code)
- **Then** un warning de conflit s'affiche dans le SpddEditor
  avec deux boutons : « Recharger depuis le disque (perdre
  mes modifs) » et « Garder mes modifs (écraser le disque
  au prochain Save) »

### AC5 — Bulk change debouncé

- **Given** la HubList est ouverte avec 50 stories visibles
- **When** l'utilisateur fait un `git checkout autre-branche`
  qui modifie 30 fichiers `.yukki/` en quelques millisecondes
- **Then** la HubList se met à jour en un seul refresh
  (pas 30 refreshs successifs qui causeraient un stutter
  visible) après le debounce

## Open Questions

- [ ] **Librairie de watch** côté Go : `fsnotify` (standard
      community) ou un autre choix ? À trancher en analyse selon
      la compatibilité Windows / macOS / Linux et la perf sur
      gros dossiers.
- [ ] **Délai de debounce** : 100 ms, 250 ms, 500 ms ? Trade-off
      réactivité ↔ stutter. À calibrer en analyse / test.
- [ ] **Granularité du payload Wails** : envoyer le path complet
      du fichier modifié (le frontend cible le store précis) ou
      juste un signal générique « refresh » qui force un
      `ListArtifacts` global (plus simple mais moins efficace) ?
- [ ] **Comportement si le projet actif est sur un volume
      réseau / WSL** où `fsnotify` peut être moins fiable.
      Fallback polling à prévoir ?
- [ ] **Détection de conflit** : on compare la mtime du
      fichier au moment du load avec celle au moment de la
      modif disque, ou on garde un hash du contenu pour
      détecter les vrais conflits sémantiques ?

## Notes

- Briques mobilisables : EventsEmit Wails (déjà utilisé en
  CORE-008 pour le streaming), `internal/artifacts/lister.go`
  pour la liste qui sera invalidée, store Zustand
  `useArtifactsStore` côté frontend (méthode `refresh`).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont. Améliore tout
    le reste de l'app de façon transverse.
  - **Negotiable** : choix de la lib de watch + délai de
    debounce + granularité du payload sont ouverts.
  - **Valuable** : oui — UX qualitative + débloque les
    workflows multi-outils.
  - **Estimable** : ~2-3 j (watcher Go + events + 3-4 refresh
    handlers frontend + détection conflit).
  - **Small** : borderline — multi-modules (Go watcher + Wails
    events + Zustand stores + détection conflit SpddEditor).
    Voir SPIDR : scission possible.
  - **Testable** : oui — simulation d'écriture fichier dans
    `.yukki/` via fs Go en test, assertion sur l'event Wails
    émis et sur le state du store frontend.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** mais non figée — à arbitrer en analyse.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | (a) UI-023a watcher Go + events + refresh HubList simple ; (b) UI-023b détection de conflit SpddEditor + bouton recharger / garder. Découpe naturelle si l'analyse révèle > 7 AC ou > 2 j. |
  | Interfaces | non | Une seule UI cible (l'app desktop). |
  | Data | non | Une seule donnée (les artefacts disque). |
  | Rules | non | AC4 (conflit) et AC5 (debounce) sont les cas limites, tiennent en 2 AC. |
  | Spike | **possible** | Si `fsnotify` pose problème sur WSL ou volume réseau, sortir un spike pour tester un fallback polling — sinon non. |
