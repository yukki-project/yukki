---
id: METHO-invest
title: INVEST — critères de qualité d'une user story
version: 1
status: published
applies-to: [spdd-story, spdd-analysis]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://www.agilealliance.org/glossary/invest/
---

# INVEST — critères de qualité d'une user story

## Définition

Six critères proposés par Bill Wake (2003), popularisés par Mike Cohn dans
*User Stories Applied* (2004). Appliqués au moment de la rédaction d'une
story (`/spdd-story`) et au moment de la revue (`/spdd-analysis` peut
escalader vers `/spdd-story` si INVEST est cassé).

## Les 6 critères

| Critère | Signification | Question-test |
|---|---|---|
| **I**ndependent | indépendante des autres stories du backlog | "Peut-on livrer cette story seule ?" |
| **N**egotiable | sujette à discussion, pas un contrat figé | "Y a-t-il des Open Questions explicites ?" |
| **V**aluable | livre une valeur identifiable à un utilisateur | "À qui ça sert ? quel gain ?" |
| **E**stimable | suffisamment claire pour être estimée | "Peut-on chiffrer en jours ?" |
| **S**mall | tient dans une itération (1-2 jours de dev) | "Estimation > 2 jours ?" → SPIDR |
| **T**estable | chaque AC est observable et vérifiable | "Peut-on écrire un test pour chaque AC ?" |

## Heuristiques d'application

### Au moment de la rédaction (`/spdd-story`)

- Lire la story brute (paragraphe, ticket Jira, dump Slack).
- Pour **chaque critère**, poser la question-test et noter la réponse.
- Si **un critère échoue**, deux options :
  1. Reformuler la story pour que le critère passe (cas le plus fréquent)
  2. Si "Small" échoue → invoquer **SPIDR** (voir [`spidr.md`](spidr.md)) pour scinder

### Au moment de l'analyse (`/spdd-analysis`)

Si pendant le scan codebase on découvre que la story :
- contredit l'existant (Independent cassé)
- demande un refactor préliminaire majeur (Independent cassé)
- a un périmètre flou (Estimable cassé)
- requiert un travail >2 jours (Small cassé)

→ **escalader vers `/spdd-story`** pour reformuler ou scinder.

## Independent

Une story doit pouvoir être livrée indépendamment des autres. Les
dépendances explicites (autre story doit être livrée avant) sont un
signe de découpage incorrect.

## Negotiable

Une story n'est pas un contrat. Les Open Questions explicites montrent
qu'il reste de la latitude. Si tout est figé, on est dans la
spécification, plus dans la story.

## Valuable

La valeur doit être **identifiable** : pour qui ? quel gain mesurable ?
Une story d'infrastructure pure (sans valeur utilisateur observable) est
suspecte — sauf cas de **story fondatrice explicite** (ex. CORE-001 dans
yukki).

## Estimable

L'estimable suppose que l'analyse a été faite (étape 3 SPDD). Une story
non-estimable signale qu'il manque des informations — la résoudre soit en
clarifiant (étape 2), soit en lançant un *Spike* (axe **S** de SPIDR,
voir [`spidr.md`](spidr.md)).

## Small

Une story doit tenir dans une itération (1-2 jours de dev). Si elle est
trop grosse, **scinder via SPIDR** ([`spidr.md`](spidr.md)).

Signaux concrets que "Small" est cassé :

- 8+ AC (sweet spot 3-5)
- 2+ modules sans deliverable partagé
- plusieurs verbes métier ("créer X" + "modifier X" + "supprimer X")
- estimation > 1-2 jours

## Testable

Chaque AC doit être **observable** et **vérifiable**. Un AC qui dit "le
système doit être performant" n'est pas testable. Un AC en
Given/When/Then est testable par construction (voir
[`acceptance-criteria.md`](acceptance-criteria.md)).

## Exemple concret — CORE-001 de yukki

Story [`CORE-001-cli-story-via-claude`](../stories/CORE-001-cli-story-via-claude.md)
— la commande CLI `yukki story`. Application d'INVEST :

| Critère | Verdict | Justification |
|---|---|---|
| Independent | ✅ | aucune dépendance vers une story antérieure |
| Negotiable | ✅ | 2 Open Questions explicites (stratégie prompt à `claude`, politique préfixes) |
| Valuable | ✅ | permet de générer une story SPDD dans n'importe quel projet sans copier-coller |
| Estimable | ✅ | architecture pressentie listée, modules identifiés |
| Small | ⚠️ | 7 AC, à la limite haute. Justifié dans le canvas comme **story fondatrice** (Cobra + provider abstraction + writer indissociables). Décision SPIDR analysée et tracée — les 5 axes ne s'appliquent pas |
| Testable | ✅ | chaque AC est en Given/When/Then avec résultat observable (fichier créé, code retour, message stderr) |

INVEST passe sur 5/6, le 6e (Small) est *justifié* via SPIDR analysé
plutôt que satisfait littéralement — pattern admissible pour les stories
fondatrices.

## Sources

- [INVEST — Agile Alliance](https://www.agilealliance.org/glossary/invest/) (Bill Wake, 2003 ; popularisé par Mike Cohn, *User Stories Applied*, 2004)

## Changelog

- 2026-04-30 — v1 — création initiale
