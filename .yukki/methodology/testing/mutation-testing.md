---
id: TEST-mutation
title: Mutation testing — mesurer la qualité des tests, pas du code
version: 1
status: published
category: testing
applies-to: [spdd-reasons-canvas, spdd-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Henry Coles — *Pitest documentation*, https://pitest.org"
  - "Roland Lichti, Henry Coles (2016) — 'Why mutation testing matters', PIT blog"
  - "Yue Jia, Mark Harman (2011) — 'An Analysis and Survey of the Development of Mutation Testing', IEEE Transactions on Software Engineering"
---

# Mutation testing — mesurer la qualité des tests

## Définition

Le **mutation testing** consiste à introduire automatiquement
des modifications (mutations) dans le code applicatif puis à
exécuter la suite de tests pour vérifier qu'elle **détecte** ces
modifications. Une mutation **tuée** (test fails) = la suite
fait son boulot. Une mutation **survivante** = un trou dans la
suite, malgré le coverage.

Mutations courantes :
- `+` → `-`, `*` → `/` (opérateurs arithmétiques)
- `<` → `<=`, `==` → `!=` (opérateurs de comparaison)
- `if (x)` → `if (true)` / `if (false)` (conditions)
- `return x` → `return null` / `return ""` (boundaries)
- Suppression d'un appel de méthode void
- Inversion d'un booléen

Le **mutation score** = (mutations tuées) / (mutations totales)
× 100.

## Quand l'introduire

Le mutation testing est **lent** (chaque mutation rejoue la
suite) et **bruyant** (faux positifs sur les mutants
équivalents). Critères d'introduction :

- ✅ **Modules critiques** : logique métier centrale, parsers,
  validators, sécurité, règles de prix/quota
- ✅ **Après** que coverage standard a atteint son seuil
  (≥ 70% global, ≥ 85% critiques — cf.
  [`coverage-discipline.md`](coverage-discipline.md))
- ✅ **Sur les PR** qui touchent des modules critiques (CI
  ciblé)
- ❌ **Pas** sur l'ensemble de la codebase (exécution × N
  mutants × tests = explosion)
- ❌ **Pas** en local au quotidien (latence > 5 min souvent)
- ❌ **Pas** en remplacement du coverage standard — c'est un
  complément, pas une alternative

## Seuil indicatif

| Périmètre | Mutation score cible |
|---|---|
| Modules critiques | **≥ 60-70%** |
| Modules secondaires | non-imposé |
| Modules de scaffolding / config | non-applicable (mutation testing désactivé) |

100% est inatteignable en pratique : il existe toujours des
**mutants équivalents** (qui ne changent pas le comportement
observable, ex. `i++` vs `++i` à un endroit où la valeur n'est
pas réutilisée). Un score réaliste plafonne autour de 80% sur
du code bien testé.

## Anti-patterns

- **Activer mutation testing sur tout le repo** : surcoût CI
  prohibitif, faux positifs en pagaille. Cibler.
- **Bloquer le merge si mutation score < 100%** : impossible,
  démotivant. Utiliser comme **signal** (warning), pas comme
  **gate** dur.
- **Cibler le mutation score plutôt que la qualité** : un
  test ajouté juste pour tuer un mutant sans valeur métier
  est un test inutile. Préférer ajouter un cas réel.
- **Ignorer les mutants équivalents** : audit trimestriel
  pour les classer (équivalent / vrai trou) et ajuster.

## Traps courants

- **Lenteur** : sur un projet moyen (~50k LoC), un run
  complet peut prendre 30 min à 2h. Mitigation : incremental
  mutation testing (seulement sur le diff de la PR), parallélisation,
  exécution nocturne.
- **Mutants équivalents** : ~10-20% des mutations sont
  équivalentes selon les études (Jia & Harman 2011). Pas
  d'algorithme général pour les détecter ; revue manuelle
  périodique nécessaire.
- **Tests qui "tuent" un mutant par hasard** : un test mal
  ciblé peut tuer un mutant sans en avoir l'intention. Le
  mutation score peut être trompeur. Mitigation : revoir les
  mutations survivantes ET les mutations tuées sur les
  modules critiques.
- **Configuration restrictive** : si on désactive trop de
  mutateurs (`STDIN`, `EMPTY_RETURNS`, etc.), on perd la
  valeur. Default settings de l'outil sont en général
  raisonnables.

## Quand le mutation testing révèle un problème

Si une mutation survit, 4 réactions possibles :

1. **Ajouter un test** ciblant le comportement non couvert
   (cas le plus fréquent)
2. **Renforcer un test existant** dont l'assertion est trop
   faible (`expect(x).toBeTruthy()` → `expect(x).toBe(42)`)
3. **Supprimer du code** s'il s'avère que la mutation tue un
   path mort / défensif inutile
4. **Marquer le mutant équivalent** dans la config si
   confirmé

## Place dans la pipeline SPDD

- `/spdd-generate` : ne lance **pas** de mutation testing
  pendant la génération (trop lent). Les tests générés
  doivent juste passer la suite normale.
- `/spdd-tests` (étape 6, futur) : peut inclure une passe
  mutation sur les modules critiques annoncés dans le canvas
  comme "critiques" (label à introduire dans le frontmatter
  canvas si TEST-001 le justifie en V2).
- CI : job dédié, déclenché sur les PR qui touchent des
  modules critiques uniquement.

## Voir aussi

- [`coverage-discipline.md`](coverage-discipline.md) — anti-cheat #1, le contexte
- [`test-smells.md`](test-smells.md) — Lazy Test = mutants survivants
- [`property-based-testing.md`](property-based-testing.md) — autre angle pour renforcer les tests

## Sources

- Henry Coles — *Pitest documentation*, [pitest.org](https://pitest.org). PIT est le mutation testing tool de référence pour la JVM.
- Yue Jia, Mark Harman (2011) — *An Analysis and Survey of the Development of Mutation Testing*. Synthèse académique.
- *(outils par stack)* — voir TEST-002 pour les commandes concrètes (Stryker JS/TS, PIT Java, go-mutesting Go, mutmut Python, cargo-mutants Rust).

## Changelog

- 2026-05-03 — v1 — création initiale
