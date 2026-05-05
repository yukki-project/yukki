---
id: TEST-property-based
title: Property-based testing — invariants vs example-based
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "John Hughes (2000) — 'QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs', ICFP"
  - "David MacIver — *Hypothesis* documentation, https://hypothesis.readthedocs.io"
  - "Hillel Wayne (2018) — 'Property-Based Testing With Hypothesis', https://www.hillelwayne.com/post/property-testing-1-the-basics/"
---

# Property-based testing — invariants vs example-based

## Définition

Le **property-based testing** (PBT) consiste à exprimer un
**invariant** que la fonction doit satisfaire pour **toutes**
les entrées d'un domaine, plutôt qu'une liste d'exemples
écrits à la main. Le runner :

1. Génère N entrées aléatoires (typiquement 100-1000) du
   domaine déclaré
2. Vérifie que l'invariant tient pour chacune
3. Si une entrée échoue, **shrink** automatiquement vers le
   contre-exemple minimal reproductible

Né avec **QuickCheck** (Hughes 2000) en Haskell, popularisé
par **Hypothesis** (MacIver) en Python. Implémentations
modernes : `fast-check` (TS/JS), `jqwik` (Java), `gopter`
(Go), `cargo-quickcheck` (Rust).

> Example-based : "pour `reverse([1, 2, 3])`, on attend
> `[3, 2, 1]`."
>
> Property-based : "pour tout liste `xs`, `reverse(reverse(xs))
> == xs`."

## Patterns d'invariants courants

| Pattern | Forme | Exemple |
|---|---|---|
| **Round-trip** | `decode(encode(x)) == x` | sérialisation JSON, parse/format, encrypt/decrypt |
| **Oracle test** | `optimised(x) == naive(x)` | fonction optimisée comparée à l'implémentation naïve évidente |
| **Équivalence de modèles** | `impl1(x) == impl2(x)` | refactor : nouvelle implémentation comparée à l'ancienne sur N cas |
| **Métamorphique** | `f(transform(x)) == transform(f(x))` | tri stable : trier puis filter == filter puis trier (sur un sous-ensemble qualifié) |
| **Idempotence** | `f(f(x)) == f(x)` | normalisation, déduplication, canonicalisation |
| **Commutativité** | `f(a, b) == f(b, a)` | union d'ensembles, addition, max |
| **Identité** | `f(x, identity) == x` | concat avec chaîne vide, somme avec 0, multiplication par 1 |
| **Inversion** | `g(f(x)) == x` | encrypt/decrypt, encode/decode quand applicable |

Souvent une fonction satisfait plusieurs invariants ; les
combiner = couverture forte.

## Quand l'utiliser

- ✅ **Parsers, serializers** : round-trip naturel
- ✅ **Structures algorithmiques** : tri, recherche, hash,
  graphes
- ✅ **Math / numérique** : opérations dont les invariants
  algébriques sont évidents
- ✅ **Validators** : tester les boundaries automatiquement
- ✅ **Code stateful déterministe** : générer des séquences
  d'opérations et vérifier des invariants après chaque

## Quand éviter

- ❌ **I/O lourd** (réseau, DB, file) : trop lent à 1000 runs
- ❌ **Business workflow stateful complexe** : difficile
  d'exprimer un invariant simple
- ❌ **GUI** : les invariants sont rarement bien définis pour
  une interface
- ❌ **Code dont la spec est uniquement par exemples** :
  utiliser example-based, c'est la bonne réponse
- ❌ **Tests rapides à itérer** : PBT ralentit le feedback,
  garder pour un sous-ensemble ciblé

## Discipline shrinking + reproducible seeds

Quand un test échoue, le **shrinking** réduit l'entrée
fautive à sa forme minimale. Pour que cela marche bien :

- **Générateurs orientés** : déclarer le domaine précisément
  (`integer().between(-100, 100)`) plutôt que
  `integer()` complet — shrinking plus rapide
- **Seed reproductible** : sauvegarder la seed du run
  d'échec dans le rapport, ré-exécuter avec la même seed
  pour debugging
- **Pré-conditions filtrantes** vs **générateurs ciblés** :
  préférer générer le bon domaine plutôt que générer large
  et filtrer (perte d'efficacité × 1000)

## Exemple — invariant sur les transitions de status SPDD

Le module `internal/artifacts/status.go` du repo yukki définit
les transitions entre les 5 status SPDD (draft → reviewed →
accepted → implemented → synced) avec les règles "forward 1
cran ou downgrade 1 cran" (cf. UI-008).

Test example-based actuel :
```go
func TestIsValidTransition_Forward(t *testing.T) { ... }
func TestIsValidTransition_Backward(t *testing.T) { ... }
func TestIsValidTransition_Skip(t *testing.T) { ... }
```

Test property-based équivalent (avec `gopter`) :

```go
func TestIsValidTransition_OnlyAdjacentAllowed(t *testing.T) {
    parameters := gopter.DefaultTestParameters()
    properties := gopter.NewProperties(parameters)

    properties.Property("identity is never valid", prop.ForAll(
        func(s artifacts.Status) bool {
            if !isKnown(s) { return true }
            return !artifacts.IsValidTransition(s, s)
        },
        statusGen(),
    ))

    properties.Property("transition valid iff adjacent in OrderedStatuses", prop.ForAll(
        func(from, to artifacts.Status) bool {
            d := delta(from, to)
            return artifacts.IsValidTransition(from, to) == (d == 1 || d == -1)
        },
        statusGen(), statusGen(),
    ))

    properties.TestingRun(t)
}
```

L'avantage : couverture exhaustive de tous les couples
(from, to), pas seulement ceux écrits à la main.

## Anti-patterns

- **Invariants triviaux** : `result.length >= 0` n'apporte
  rien, exprime un type pas un comportement
- **Générateurs sans contrainte** : `integer()` puis filtrer
  les valeurs trop grandes → 99% des runs sont rejetés,
  shrinking inefficace
- **Mélanger PBT et I/O** : un test qui fait 1000 appels DB =
  feedback inacceptable
- **Pas de seed sauvée** : un échec en CI non-reproductible
  en local = debugging impossible

## Voir aussi

- [`mutation-testing.md`](mutation-testing.md) — autre angle pour renforcer les tests
- [`coverage-discipline.md`](coverage-discipline.md) — PBT améliore le mutation score sans inflation du coverage
- [`test-smells.md`](test-smells.md) — PBT mal écrit = Mystery Guest (générateur opaque)

## Sources

- John Hughes (2000) — *QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs*. Article fondateur, ICFP.
- David MacIver — *Hypothesis* documentation, [hypothesis.readthedocs.io](https://hypothesis.readthedocs.io). Référence Python.
- Hillel Wayne (2018) — *Property-Based Testing With Hypothesis*, [hillelwayne.com](https://www.hillelwayne.com/post/property-testing-1-the-basics/). Introduction pédagogique.

## Changelog

- 2026-05-03 — v1 — création initiale
