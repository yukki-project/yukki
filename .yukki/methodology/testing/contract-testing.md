---
id: TEST-contract
title: Contract testing — consumer-driven vs schema-first
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Martin Fowler (2006) — 'Consumer-Driven Contracts: A Service Evolution Pattern', https://martinfowler.com/articles/consumerDrivenContracts.html"
  - "Ian Robinson — *Pact* documentation, https://docs.pact.io"
  - "OpenAPI Initiative (2024) — *OpenAPI Specification 3.1*, https://spec.openapis.org/oas/v3.1.0"
---

# Contract testing — consumer-driven vs schema-first

## Définition

Le **contract testing** vérifie que **l'interface** entre deux
services (REST / gRPC / events) reste compatible avec ce que
ses consommateurs attendent. C'est une réponse au piège
classique des tests d'intégration mockés : le consommateur
mocke le provider d'une façon qui passe en local mais
diverge de la réalité, et un changement côté provider casse
en prod sans que rien ne signale.

Le contract testing **partage un artefact (le contrat)** entre
consommateur et fournisseur, et vérifie que les deux côtés
restent alignés.

## Les 2 styles

| Style | Source du contrat | Validation | Outils typiques |
|---|---|---|---|
| **Consumer-driven** | Le consommateur écrit ce qu'il attend | Le provider re-joue les attentes du consommateur dans sa CI | Pact (multi-stack), Spring Cloud Contract |
| **Provider-driven (schema-first)** | Le provider publie un schéma (OpenAPI / AsyncAPI / Protobuf / GraphQL SDL) | Les deux côtés valident leurs messages contre le schéma | OpenAPI validators, Buf (gRPC), JSON Schema |

### Consumer-driven (Fowler 2006)

Pattern :
1. Le consommateur écrit ses **expectations** dans son test
   suite (ex. "quand j'appelle GET /users/42, je m'attends à
   recevoir `{id: 42, name: string, email: string}`")
2. L'outil génère un **pact file** (JSON) qui décrit ces
   attentes
3. Le pact file est publié sur un **broker** (serveur central)
4. La CI du provider, à chaque commit, télécharge tous les
   pacts de ses consommateurs et **les rejoue** contre la
   nouvelle version : si un seul casse, le merge est bloqué

Forces :
- Le provider voit immédiatement quel consommateur casse
- Pas besoin de lire le code des consommateurs
- Marche même quand les équipes ne se parlent pas

Faiblesses :
- Nécessite un broker (Pact Broker, infra à maintenir)
- Couplage temporel : le provider attend les pacts mis à jour
- Coûteux à mettre en place sur > 5 consommateurs

### Provider-driven (schema-first)

Pattern :
1. Le provider publie son contrat sous forme de schéma
   (OpenAPI 3.x, AsyncAPI, Protobuf, GraphQL SDL)
2. Le schéma est versionné (semver) et publié comme
   artefact (npm package, Maven artifact, etc.)
3. Les consommateurs **valident** leurs requêtes / réponses
   contre le schéma à l'exécution (en test, voire en prod en
   mode "dry-run")
4. Tout breaking change du schéma est détecté par diff
   automatique (`oasdiff`, `buf breaking`)

Forces :
- Pas de broker — le schéma est publié comme un artefact
  classique
- Génération de clients / serveurs typés possible
- S'inscrit dans une stack API standard (OpenAPI tooling
  riche)

Faiblesses :
- Le schéma doit être maintenu rigoureusement à jour
- Si un consommateur ne valide pas, on revient au mocking
  unilatéral
- Pas de feedback "quel consommateur casse" sans tooling
  additionnel

## Décision context-aware

| Contexte | Recommandation |
|---|---|
| **Microservices internes**, < 5 consommateurs, équipe unique | Schema-first (OpenAPI), simple, peu de friction |
| **Microservices internes**, > 5 consommateurs, équipes multiples | Consumer-driven (Pact), retour direct sur qui casse |
| **API publique** | Schema-first (OpenAPI), versioning explicite, doc générée |
| **Pub/sub events** | Schema-first (AsyncAPI / Avro / Protobuf) |
| **gRPC** | Schema-first natif (Protobuf + Buf breaking) |
| **Monolithe** sans frontière de service | Pas de contract testing (over-engineering) |

## Versioning et breaking changes

Le contrat est versionné (semver). Pour gérer les évolutions :

- **Patch** (1.0.0 → 1.0.1) : pas de breaking change, ajout
  optionnel
- **Minor** (1.0.0 → 1.1.0) : ajout backward-compatible
  (nouveau endpoint, champ optionnel)
- **Major** (1.0.0 → 2.0.0) : breaking change (suppression de
  champ, type changé, endpoint retiré)

Pattern **Expand-Contract** pour migration sans downtime :

1. **Expand** : ajouter le nouveau champ / endpoint en plus
   de l'ancien
2. Migrer tous les consommateurs vers le nouveau
3. **Contract** : retirer l'ancien quand plus aucun
   consommateur ne l'utilise

Cf. [`code-quality/refactoring-catalog`](#) (futur, COMM-001
ou OPS-001) pour le pattern complet.

## Anti-patterns

- **Contract drift** : le contrat est figé en v1 mais le
  provider évolue silencieusement → tests passent, prod
  casse. Mitigation : générer le schéma à partir du code
  (OpenAPI annotation-based) plutôt que le maintenir
  manuellement.
- **Broker non maintenu** : le Pact Broker tombe en panne →
  tous les builds bloquent. Mitigation : le broker est un
  service prod-grade, monitoré et HA.
- **Contracts trop rigides** : ajouter `additionalProperties:
  false` partout dans un OpenAPI bloque toute évolution.
  Préférer ouvert par défaut, fermé là où c'est critique
  (auth, billing).
- **Test des champs non utilisés** : un consommateur asserte
  sur un champ qu'il n'utilise pas → le provider est
  obligé de le maintenir. Discipline : le pact ne contient
  que les champs effectivement consommés.
- **Pact unilatéral** : le consommateur écrit le pact mais
  le provider ne le rejoue jamais. Vérifier que le job
  provider-verify tourne en CI avant de revendiquer du
  contract testing.

## Heuristiques pour SPDD

- Une feature qui ajoute un endpoint REST → annoncer dans
  les Operations du canvas qu'un test contract est attendu
  (`/yukki-api-test` peut générer un script de validation,
  cf. la skill existante).
- Un module SPDD qui consomme une API externe (Claude API,
  par exemple) → schema-first (OpenAPI ou validation locale
  du JSON retourné) plutôt que mock unilatéral.
- Pour les bindings Wails (yukki) : pas de contract testing
  classique nécessaire, le binding TS/Go est généré à
  partir de la même source. Le "contrat" est l'AST Go lu
  par Wails.

## Voir aussi

- [`testing-backend.md`](testing-backend.md) — playbook backend complet
- *(skill SPDD existante)* `/yukki-api-test` — génère un script
  bash de validation API (curl + jq) ; complément au contract
  testing pour les endpoints REST simples
- [`coverage-discipline.md`](coverage-discipline.md) — les
  tests contract n'entrent pas dans le coverage standard
  (boundary tests)

## Sources

- Martin Fowler (2006) — *Consumer-Driven Contracts: A Service Evolution Pattern*, [martinfowler.com](https://martinfowler.com/articles/consumerDrivenContracts.html). Article fondateur.
- Ian Robinson — *Pact* documentation, [docs.pact.io](https://docs.pact.io). Implémentation de référence.
- OpenAPI Initiative (2024) — *OpenAPI Specification 3.1*, [spec.openapis.org](https://spec.openapis.org/oas/v3.1.0). Schema-first standard.

## Changelog

- 2026-05-03 — v1 — création initiale
