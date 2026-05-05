---
id: TEST-smells
title: Test smells — catalogue Meszaros
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Gerard Meszaros (2007) — *xUnit Test Patterns: Refactoring Test Code*, Addison-Wesley, ISBN 978-0131495050"
  - "Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*, Manning"
---

# Test smells — catalogue Meszaros

## Définition

Un **test smell** est un signe visible dans le code de test qui
suggère un problème sous-jacent. Comme les *code smells* de
Fowler, les test smells ne sont pas des bugs en soi — ils
**signalent** que la suite de tests va devenir difficile à
maintenir, lente, ou non-fiable. Le catalogue de référence est
établi par Gerard Meszaros (2007) dans *xUnit Test Patterns*,
qui répertorie une cinquantaine de smells. Ce document liste
les **11 plus fréquents** rencontrés dans les codebases SPDD,
avec pour chacun le **symptôme** observable, la **cause
probable** et le **fix**.

> **Test code is production code.** Un test mal écrit coûte
> autant à maintenir qu'un module mal écrit, et plus longtemps
> (les tests survivent aux refactors). La même rigueur
> s'applique.

## Catalogue

| # | Smell | Symptôme | Cause | Fix |
|---|---|---|---|---|
| 1 | **Fragile Test** | Casse à chaque refactor même quand le comportement n'a pas changé | Test couplé à l'implémentation (mocks excessifs, assertions sur des champs internes) | Tester le comportement observable, pas l'implémentation. Réduire les mocks |
| 2 | **Slow Test** | Suite > 30s pour un module unitaire ; un test individuel > 1s | I/O réseau / DB / disque dans les tests unit, sleeps/timeouts | Mocker les I/O, déplacer en tests d'intégration. > 100ms = warning |
| 3 | **Eager Test** | Un seul `@Test` / `it` qui vérifie 5+ choses | Économie de "boilerplate" perçue, méconnaissance du single-responsibility | Splitter en tests focalisés. 1-3 asserts par test idéal |
| 4 | **Lazy Test** | Test sans assertion, juste un `// TODO` ou un appel sans `expect` | Coverage padding, oubli, refactor incomplet | Ajouter au moins 1 assertion meaningful. Refuser en code review |
| 5 | **Mystery Guest** | Test dépend d'un fichier externe (`fixtures/data.json`) non explicite dans le code du test | Test data setup partagé invisible | Inline les données ou nommer explicitement le fixture (`loadFixture("user-with-3-orders")`) |
| 6 | **Test Code Duplication** | Même bloc de setup copié dans 10 tests | Pas de helper / factory / `beforeEach` | Extraire en `setUp` / `beforeEach` / Object Mother. Ne pas sur-abstraire |
| 7 | **Conditional Test Logic** | `if/else`, `switch`, `try/catch` dans le corps du test | Test qui couvre 2+ scénarios cachés | Splitter en N tests, un par branche. Le test ne doit jamais avoir de logique conditionnelle |
| 8 | **Obscure Test** | Magic numbers, abréviations cryptiques, fixtures opaques | Auteur a "économisé" en lisibilité | Nommer les constantes, utiliser des builders explicites, ajouter des commentaires sur le pourquoi |
| 9 | **Test Interdependence** | Les tests passent dans un ordre, échouent dans un autre | État global partagé, fixtures réutilisées sans cleanup | Isoler chaque test (DB transaction rollback, fresh fixture). `--shuffle` doit passer |
| 10 | **Sensitive Equality** | Test compare des strings entiers (XML, JSON) sur égalité exacte | Pas de désérialisation, `assertEquals(expected, actual)` sur du texte | Comparer la structure objet, pas la sérialisation. Ignorer les whitespaces non-significatifs |
| 11 | **Hidden Test Call** | Le test fait des assertions dans des helpers cachés ; le `@Test` lui-même n'a pas d'assertion visible | Sur-abstraction, helpers "magiques" | Garder les assertions dans le corps du test ou utiliser des helpers très clairs (`assertUserIsLocked(user)`) |

## Smells transversaux (anti-patterns)

Au-delà du catalogue Meszaros, quelques patterns systémiques
qui touchent toute la suite :

- **Test Logic in Production** : du code de test (setters
  visibles, méthodes `forTesting`) qui contamine la prod.
  Symptôme : annotations `@VisibleForTesting`, méthodes
  `setStateForTest`. Fix : refactor pour rendre les
  collaborateurs injectables.
- **Coverage Gaming** : tests qui exercent le code (coverage
  monte) sans vérifier le comportement (asserts manquants ou
  triviaux). Détection : mutation testing (cf.
  [`mutation-testing.md`](mutation-testing.md)).
- **Snapshot Regenerate Auto** : `--update-snapshots` lancé
  systématiquement sans review → les tests deviennent des
  no-ops. Cf. [`snapshot-testing.md`](snapshot-testing.md).
- **Test Pollution** : un test modifie l'état global (env
  vars, singletons, DB partagée) et n'efface pas après lui.
  Variant de Test Interdependence, plus subtil.

## Heuristiques d'application

- **Pendant l'écriture** : si un test devient long (> 30
  lignes) ou conditionnel (`if/else`), arrêter et splitter.
- **Pendant le code review** : grep `it.skip`, `xtest`,
  `@Disabled`, `// TODO` dans les tests = `Lazy Test` à
  challenger.
- **Pendant la maintenance** : si un test casse à chaque
  refactor, vérifier le coupling à l'implémentation
  (`Fragile Test`).
- **En CI** : un job qui échoue parfois = `Test
  Interdependence` ou `Slow Test` avec timeout marginal.
  Reproduire en local avec `--shuffle` (Go : `go test
  -shuffle=on`) ou ordre inverse.

## Voir aussi

- [`test-naming.md`](test-naming.md) — naming smells (test1, testFoo, etc.)
- [`coverage-discipline.md`](coverage-discipline.md) — anti-cheat coverage (lazy / eager)
- [`mutation-testing.md`](mutation-testing.md) — détecte les Lazy Tests effectifs
- *(futur)* `code-quality/code-smells.md` — équivalent côté production code

## Sources

- Gerard Meszaros (2007) — *xUnit Test Patterns: Refactoring Test Code*, Addison-Wesley. Le catalogue de référence (~50 smells).
- Vladimir Khorikov (2020) — *Unit Testing*, Manning. Chapitres 4-5 sur la qualité des tests.
- [Test Smells (Wikipedia)](https://en.wikipedia.org/wiki/Test_smell)

## Changelog

- 2026-05-03 — v1 — création initiale
