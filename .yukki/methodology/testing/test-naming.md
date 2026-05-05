---
id: TEST-naming
title: Test naming — conventions G/W/T, AAA, MethodName_State_Expected
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Roy Osherove (2014) — *The Art of Unit Testing*, 2nd ed., Manning, ISBN 978-1617290893"
  - "Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*, Manning, ISBN 978-1617296277"
---

# Test naming — conventions G/W/T, AAA, MethodName_State_Expected

## Définition

Le nom d'un test est sa **première ligne de documentation**. Quand
un test échoue en CI à 3h du matin, le seul indice immédiat sur
ce qu'il vérifie est son nom. Un bon nom décrit **ce qui est
testé**, **dans quelles conditions**, et **quel résultat est
attendu** — sans avoir à lire le corps. Un mauvais nom (`test1`,
`testFoo`, `it('works')`) coûte du temps à chaque révision.

## Les 3 conventions

| Convention | Forme | Forces | Faiblesses |
|---|---|---|---|
| **Given/When/Then** (BDD/Gherkin) | `Given <state>, When <action>, Then <result>` | Lisible par non-tech, aligné avec les Acceptance Criteria | Verbeux, lourd à frapper, indenté souvent |
| **AAA** (Arrange/Act/Assert) | structure du test, pas du nom | Implicite dans le corps, nom libre | Force aucune discipline sur le naming lui-même |
| **MethodName_State_Expected** (Osherove) | `should_X_when_Y` ou `MethodName_When_State_ShouldExpected` | Court, scannable, IDE-friendly | Anglais-centré, parfois cryptique |

Aucune convention n'est universellement supérieure : le choix
dépend du **contexte** (stack, audience, conventions
préexistantes du repo).

## Heuristiques par stack

### Frontend (Jest, Vitest, Jasmine, Karma)

`describe` / `it` est idiomatique. La forme recommandée dans le
contexte SPDD :

- `describe('<sujet>', () => { it('<comportement attendu>', ...) })`
- Les `it` se lisent comme des phrases : `it('renders the
  status badge with the correct color when status is reviewed')`
- Pour les composants, `describe` = nom du composant, `it` =
  comportement observable

### Backend Go (`testing.T`)

Convention idiomatique Go :

- `TestX_When_Y_Should_Z` (camelCase concaténé) ou
  `TestX/Y_should_Z` avec sous-tests via `t.Run`
- Exemple repo yukki : `TestIsValidTransition_Forward`,
  `TestAllowedTransitions_Endpoints` (cf. `internal/artifacts/
  status_test.go`)
- Sous-tests préférés aux variations dans le nom du test parent

### Backend Java (JUnit 5)

`should_X_when_Y` ou `MethodName_When_State_ShouldExpected` —
la convention Osherove fonctionne bien avec les annotations
`@DisplayName` pour l'humain et le nom de méthode pour l'IDE.

### Backend Python (pytest)

`test_<sujet>_<contexte>_<résultat_attendu>` en snake_case.
`pytest` affiche le nom directement, donc le nom est l'output.

## Anti-patterns

- **`test1`, `test2`, `testFoo`** : pas d'information, à bannir
  systématiquement.
- **`it('works')`, `it('does the thing')`** : non-actionnable,
  ne dit rien sur le quoi.
- **Nom qui mentionne le mock** : `it('calls userService.find')`
  teste l'implémentation, pas le comportement. Renommer en
  `it('returns the user matching the id')`.
- **Magic numbers / chaînes** : `it('returns 42 when X')` —
  pourquoi 42 ? Préférer `it('returns the answer to life when
  asked')` ou expliciter `it('returns the count of items when
  the list is non-empty')`.
- **Mention de l'implémentation** : `it('uses recursion to
  ...')`, `it('calls Promise.all')`. Le test ne devrait pas
  casser quand l'implémentation change.
- **Plusieurs comportements dans un seul test** :
  `it('creates and updates and deletes the user')` — c'est 3
  tests cachés. Splitter.

## Lien avec les Acceptance Criteria

Les AC en Given/When/Then (cf. [`acceptance-criteria.md`](../acceptance-criteria.md))
décrivent le **contrat utilisateur**. Les tests, eux, vérifient
ce contrat — leur nom peut soit refléter le contrat (Given/
When/Then dans le nom du test), soit décrire le comportement
sous-jacent (style Osherove).

Quand un AC dit "Given un projet sans `spdd/`, When je clique
Initialize, Then les 6 sous-dossiers sont créés", un test Go
correspondant pourrait être nommé :

- BDD-style : `TestInitializeSPDD_GivenEmptyProject_WhenInitializeIsCalled_ThenSixSubdirsExist`
- Osherove-style : `TestInitializeSPDD_OnEmptyProject_CreatesSixSubdirs`

Les deux sont valides ; le second est plus court et plus
idiomatique Go.

## Exemple concret — `internal/artifacts/status_test.go`

Tests Go du repo yukki, écrits dans le cadre d'UI-008
(transitions de status SPDD) :

```go
func TestIsValidTransition_Forward(t *testing.T) { ... }
func TestIsValidTransition_Backward(t *testing.T) { ... }
func TestIsValidTransition_Skip(t *testing.T) { ... }
func TestIsValidTransition_NoOp(t *testing.T) { ... }
func TestIsValidTransition_Unknown(t *testing.T) { ... }
func TestAllowedTransitions_Endpoints(t *testing.T) { ... }
func TestAllowedTransitions_Middle(t *testing.T) { ... }
func TestAllowedTransitions_Unknown(t *testing.T) { ... }
```

Pattern observé : `Test<MethodName>_<State|Scenario>`. Court,
scannable, l'IDE Go (avec `gopls`) navigue directement, et le
nom suffit à comprendre l'intention sans ouvrir le corps.

Anti-exemple (à proscrire) :
```go
func TestStatus(t *testing.T) {
    // 47 lignes de subtests inline avec if/else
}
```

## Voir aussi

- [`acceptance-criteria.md`](../acceptance-criteria.md) — Given/When/Then côté contrat user
- [`test-smells.md`](test-smells.md) — anti-patterns au-delà du naming
- [`coverage-discipline.md`](coverage-discipline.md) — naming et lisibilité comptent dans la review
- *(futur)* `code-quality/code-smells.md` — equivalent côté production code

## Sources

- Roy Osherove (2014) — *The Art of Unit Testing*, 2nd ed., Manning. Chapitre 2 sur les naming conventions.
- Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*, Manning. Chapitre 3 "Anatomy of a unit test".

## Changelog

- 2026-05-03 — v1 — création initiale
