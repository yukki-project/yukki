---
id: METHO-spidr
title: SPIDR — découpage de stories trop grosses
version: 1
status: published
applies-to: [yukki-story, yukki-prompt-update]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories
---

# SPIDR — découpage de stories trop grosses

## Définition

Framework de **découpage de user stories** proposé par Mike Cohn quand le
critère **Small** d'INVEST est cassé (voir [`invest.md#small`](invest.md#small)).
Cinq axes à essayer dans cet ordre — Spike est en dernier recours malgré
le S initial.

## Les 5 axes

| Axe | Quand l'appliquer | Exemple |
|---|---|---|
| **P — Paths** | la story couvre plusieurs chemins / variantes de workflow | "Créer / Modifier / Supprimer un X" → 3 stories |
| **I — Interfaces** | la story couvre plusieurs surfaces (CLI, UI, API, OS, navigateurs) | "Export via API + via bouton UI" → 2 stories |
| **D — Data** | on peut livrer en restreignant les données supportées | "Tous types d'utilisateurs" → "Utilisateurs standard d'abord" |
| **R — Rules** | on peut livrer en relâchant temporairement certaines règles | "Avec validation complète" → "Sans validation max-length d'abord" |
| **S — Spike** | aucun axe ci-dessus ne s'applique parce qu'il y a une inconnue technique | livrer une story de recherche / prototype, puis revenir sur la vraie story |

## Signaux d'alerte qui appellent SPIDR

| Signal | Action |
|---|---|
| 8 AC ou plus | Découper par scénario ou par persona |
| 2 modules ou plus sans deliverable partagé | Une story par module quand c'est possible |
| Plusieurs personas avec besoins distincts | Une story par persona |
| Plusieurs verbes métier au cœur | "Créer X" ≠ "Mettre à jour X" ≠ "Supprimer X" → 3 stories (axe **P**) |
| Mix CRUD + UI + auth + reporting | Découper par préoccupation (axe **I**) |
| Estimation > 1-2 jours de dev | Trop gros, découper |

## Stratégies complémentaires (orthogonales à SPIDR)

1. **Tranche verticale** — chaque story livre quelque chose d'utilisable
   de bout en bout, même incomplet. Un endpoint qui retourne un CSV
   vide est plus précieux qu'un backend complet sans UI.
2. **Chemin nominal puis variations** — Story 1 : happy path ;
   Story 2 : cas d'erreur. Combinable avec axe **R**.
3. **Par étape de workflow** — une story par étape d'un processus
   métier multi-étapes. Combinable avec axe **P**.

## Anti-patterns de découpage

- ❌ **Découper par couche technique** (backend / frontend / db) sans
  valeur utilisateur. Une story "écrire le backend de X" qui ne livre
  rien à l'utilisateur n'est **pas** une story SPDD.
- ❌ **Story d'infrastructure pure** ("scaffolder le projet", "ajouter
  Cobra") sans valeur observable. **Exception** : story fondatrice
  explicite (style CORE-001 dans yukki), justifiée comme telle dans le
  Background.
- ❌ **Découper en "préparation + feature"** ("d'abord la migration BDD,
  ensuite l'usage"). La migration *seule* n'a pas de valeur — préférer
  "migrer + utiliser sur 1 cas".
- ❌ **Découper en "happy path" puis "tests"**. Les tests ne sont pas
  une story.
- ❌ **Spike systématique** : SPIDR met S en dernier précisément parce
  qu'on l'utilise trop souvent par défaut. Essayer P / I / D / R d'abord.

## Exemple concret — CORE-002 candidate (yukki)

Story candidate (non encore rédigée) : *"Implémenter les 6 autres
commandes SPDD du CLI yukki (analysis, reasons-canvas, generate,
api-test, prompt-update, sync)"*.

Application des signaux d'alerte :

- 6 commandes × ~5 AC = ~30 AC potentielles → bien au-dessus du seuil 8
- 1 module dominant (`internal/workflow`) mais 6 sous-paths distincts
- estimation > 5 jours → bien au-dessus de 1-2 j

→ **Décision SPIDR : axe P (Paths)** — scinder en 6 stories filles, une
par commande :

- `CORE-002a` — `yukki analysis`
- `CORE-002b` — `yukki reasons-canvas`
- `CORE-002c` — `yukki generate`
- `CORE-002d` — `yukki api-test`
- `CORE-002e` — `yukki prompt-update`
- `CORE-002f` — `yukki sync`

Chaque story fille hérite de l'architecture livrée par CORE-001
(Cobra + provider + template loader + artifact writer) et ajoute la
logique de sa commande. **Livrable incrémental** : on peut déjà utiliser
le binaire après CORE-002a même si CORE-002b-f ne sont pas livrées.

## Sources

- [SPIDR : Five Simple but Powerful Ways to Split User Stories — Mountain Goat Software / Mike Cohn](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories)

## Changelog

- 2026-04-30 — v1 — création initiale
