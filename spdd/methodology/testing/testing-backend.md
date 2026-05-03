---
id: TEST-backend
title: Testing backend — playbook (pyramide + sub-refs)
version: 1
status: published
category: testing
applies-to: [spdd-reasons-canvas, spdd-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Mike Cohn (2009) — *Succeeding with Agile*, Addison-Wesley, ISBN 978-0321579362"
  - "Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*, Manning"
  - "Martin Fowler (2014) — 'TestPyramid', https://martinfowler.com/bliki/TestPyramid.html"
---

# Testing backend — playbook (pyramide + sub-refs)

## Définition

Le testing backend couvre les artefacts qui s'exécutent côté
serveur ou en CLI : services métier, accès aux données,
APIs (REST / gRPC / messagerie), workers / batch / cron,
parsers / sérialisation. Les contraintes spécifiques :

- **I/O omniprésent** (DB, file, network, queue, cache)
- **Logique métier dense** (règles, workflows, validations)
- **Exécution déterministe attendue** en tests (mais l'I/O
  introduit du non-déterminisme)
- **Coût élevé du test d'intégration** (lancer une DB, un
  broker, une stack complète)

Ce playbook arbitre la stratégie de testing backend pour un
projet SPDD : pyramide cible, intégration des sub-refs
(naming, smells, coverage, mutation, property-based,
contract), annexe outils.

## Pyramide adaptée backend

La pyramide Cohn 70/20/10 reste **plus pertinente** côté
backend que côté frontend : la logique métier dense et le
coût des tests d'intégration justifient une dominante unit
forte.

### Cohn classique (70/20/10) — recommandation par défaut

```
            /\
           /e2e\          ~10%
          /─────\
         /  intg \        ~20%
        /─────────\
       /   unit    \      ~70%
      /─────────────\
```

Justification :
- La logique métier est typiquement isolable (services
  purs, value objects, validators) → unit tests rapides
  et nombreux
- Les tests d'intégration coûtent cher (DB, broker,
  fixtures) → en limiter le nombre, viser les golden paths
- Les e2e (full stack) sont rares et critiques (smoke
  tests de bout en bout, parcours métier majeurs)

**Quand l'utiliser** : projets avec logique métier dense
(banking, billing, scheduling, parsers, règles
réglementaires).

### Variations contextuelles

- **Microservices très fins** (un service = 1 endpoint
  trivial) : ratio peut basculer vers Honeycomb (plus
  d'intégration, moins d'unit) parce que la logique est
  mince et le bug se cache dans l'intégration. Cf.
  [`testing-frontend.md`](testing-frontend.md) §Honeycomb.
- **Frameworks "fat"** (Quarkus, Spring Boot) : la frontière
  unit/intégration est floue (`@QuarkusTest` lance la stack
  complète). Pragmatique : compter les `@QuarkusTest` comme
  intégration, les services purs testés en POJO comme unit.
- **CLI tools** (yukki, kubectl, ...) : pas d'e2e
  navigateur, mais des e2e CLI (lancer le binaire,
  vérifier stdout / stderr / exit code). Comptés comme
  intégration ou e2e selon le coût.

## Spécificités backend

### Logique métier pure (services, value objects)

- Cible **prioritaire** des unit tests
- Idéal pour [`property-based-testing.md`](property-based-testing.md)
  quand la logique a des invariants algébriques (transitions,
  totals, validations)
- Pas de mock nécessaire si le service est pur (entrée →
  sortie) ; les mocks signalent souvent un défaut de
  design (couplage trop large)

### I/O — Database

- **Tests unit avec DB en mémoire** (H2, SQLite) : rapides
  mais divergent du moteur prod ; à éviter pour les
  comportements DB-spécifiques (full-text search, JSON
  ops, locks)
- **Tests d'intégration avec DB réelle** (Testcontainers
  pour Java/Go, ephemeral DB) : plus fidèle, plus lent.
  Idiomatique 2026.
- **Discipline de cleanup** : transaction rollback en fin
  de test, ou DB éphémère par run. Sans ça → smell "Test
  Interdependence" (cf. [`test-smells.md`](test-smells.md))

### I/O — Réseau / APIs externes

- **Tests unit** : mocker au niveau de la frontière
  (interface client) — pas plus loin (sinon couplage à
  l'implémentation)
- **Tests d'intégration** : Testcontainers + mock server
  (WireMock, MSW node), ou contract testing (cf.
  [`contract-testing.md`](contract-testing.md)) si le
  contrat est partagé
- **e2e** : appel réel ; à proscrire en CI sauf golden
  smoke test ciblé

### Workers, jobs, cron

Pattern "I/O orchestrée" :
- Découpler la **logique** (testable en unit) de la
  **planification** (testable en intégration)
- Test unit sur le payload + le résultat
- Test d'intégration sur le déclenchement et le retry

### REST APIs

- Tests **unit** sur les services métier sous-jacents
- Tests **d'intégration** sur les endpoints (request →
  response, codes, schéma)
- Tests **contract** sur l'interface publique (cf.
  [`contract-testing.md`](contract-testing.md))
- La skill SPDD existante `/spdd-api-test` génère un script
  bash de validation API (curl + jq) — **complément**
  pratique au contract testing pour smoke tests rapides

### Messaging (pub/sub, events)

- Schema-first contracts (AsyncAPI, Avro, Protobuf) —
  cf. [`contract-testing.md`](contract-testing.md)
- Tests unit sur le handler (consommateur d'event)
- Tests d'intégration sur la propagation (publication →
  consommation) avec broker éphémère

## Sub-refs liées

Cluster testing, applicables au backend :

- [`test-naming.md`](test-naming.md) — conventions Go,
  Java JUnit, Python pytest
- [`test-smells.md`](test-smells.md) — catalogue Meszaros
  (Mystery Guest particulièrement fréquent côté backend
  avec les fixtures DB)
- [`coverage-discipline.md`](coverage-discipline.md) —
  seuils + 4 anti-cheat (modules critiques côté backend
  = règles métier, parsers, validateurs)
- [`mutation-testing.md`](mutation-testing.md) — applicable
  surtout aux modules critiques backend
- [`property-based-testing.md`](property-based-testing.md) —
  patterns d'invariants pour la logique métier algébrique
- [`contract-testing.md`](contract-testing.md) — pour les
  APIs et events

Moins applicable directement :
- [`snapshot-testing.md`](snapshot-testing.md) — utile
  surtout pour le code généré ou la sérialisation, peu
  pertinent en business logic standard

## Exemple concret — yukki `internal/artifacts/`

Le module [`internal/artifacts/`](../../../internal/artifacts/)
du repo yukki implémente :
- `ListArtifacts(dir, kind)` — listing + parse front-matter
- `Writer.Write(...)` — écriture atomic d'un artefact
- `Status` typed + `IsValidTransition` / `AllowedTransitions`
  (UI-008)

Application de la pyramide :

| Couche | Volume | Cibles concrètes |
|---|---|---|
| Unit (~70%) | `status_test.go` (8 tests, voir `internal/artifacts/status_test.go`) couvre `IsValidTransition` (forward / backward / skip / no-op / unknown) et `AllowedTransitions` (endpoints / middle / unknown) | Tous purs Go, < 1s total |
| Intégration (~20%) | `parser_test.go`, `lister_test.go`, `writer_test.go` (existent) avec fichiers temp + parse YAML | filesystem requis, ~quelques secondes |
| e2e (~10%) | `main_test.go` à la racine — lance la CLI yukki et vérifie le comportement bout en bout | binaire compilé requis |

Tests Go nommés en convention `Test<MethodName>_<Scenario>`
(cf. [`test-naming.md`](test-naming.md)). Coverage standard
attendu ≥ 70% global, ≥ 85% sur `internal/artifacts/` qui
est un module critique (toute évolution SPDD touche ces
fichiers).

`internal/artifacts/status.go` est un **candidat idéal pour
mutation testing** (cf. [`mutation-testing.md`](mutation-testing.md))
quand ce sera mis en place : la logique de transition est
algorithmique, le test suite est exhaustive (8 tests), un
mutation score > 80% devrait être atteignable.

## Annexe — Tools by ecosystem

> **V1 minimal** : 1 ligne par stack avec l'outil dominant
> 2026. Détail des commandes, configurations, intégration CI
> → **TEST-002** (story sœur dédiée).

| Stack | Unit | Intégration | Mocking | Mutation | Property-based | Contract |
|---|---|---|---|---|---|---|
| **Go** | `testing` (stdlib) | testify + Testcontainers-Go | gomock / testify mocks | `go-mutesting` | `gopter`, `quick` (stdlib) | `pact-go` ou OpenAPI validators |
| **Java (JUnit 5)** | JUnit 5 + AssertJ | `@QuarkusTest` / `@SpringBootTest` + Testcontainers | Mockito | PIT | `jqwik` | `pact-jvm`, Spring Cloud Contract |
| **Python (pytest)** | pytest | pytest + Testcontainers Python | unittest.mock / pytest-mock | mutmut | Hypothesis | `pact-python`, schemathesis |
| **Rust** | `cargo test` | testcontainers-rs | mockall | `cargo-mutants` | `proptest`, `quickcheck` | OpenAPI validators |
| **Node.js / TS** | Vitest / Jest | idem + Testcontainers Node | Vitest mocks / Jest mocks | Stryker | `fast-check` | Pact JS |

Pour les commandes concrètes (`go test ./... -cover`,
`mvn test jacoco:report`, `pytest --cov`, etc.), les
configurations CI, les seuils par stack : voir **TEST-002 —
outils de coverage par écosystème**.

## Voir aussi

- [`testing-frontend.md`](testing-frontend.md) — pendant
  côté frontend
- [`coverage-discipline.md`](coverage-discipline.md) — seuils
  appliqués aux modules backend
- [`contract-testing.md`](contract-testing.md) — APIs et
  events
- *(skill SPDD existante)* `/spdd-api-test` — script de
  smoke test API (curl + jq)

## Sources

- Mike Cohn (2009) — *Succeeding with Agile*, Addison-Wesley. Pyramide canonique.
- Vladimir Khorikov (2020) — *Unit Testing*, Manning. Référence backend moderne.
- Martin Fowler (2014) — *TestPyramid*, [martinfowler.com](https://martinfowler.com/bliki/TestPyramid.html). Synthèse à jour.

## Changelog

- 2026-05-03 — v1 — création initiale
