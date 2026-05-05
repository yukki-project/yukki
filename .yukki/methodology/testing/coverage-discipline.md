---
id: TEST-coverage-discipline
title: Coverage discipline — seuils + 4 anti-cheat
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*, Manning. Chapitre 1 'Why testing matters'."
  - "Henry Coles — PIT Mutation Testing documentation, https://pitest.org"
  - "Martin Fowler (2012) — 'TestCoverage', https://martinfowler.com/bliki/TestCoverage.html"
---

# Coverage discipline — seuils + 4 anti-cheat

## Définition

Le **code coverage** mesure le pourcentage de lignes / branches
/ fonctions du code exécutées par la suite de tests. C'est une
métrique **utile mais piégeuse** : elle révèle ce qui n'est
pas testé, mais ne dit rien sur la **qualité** des tests qui
exercent le reste. Un module avec 100% de coverage et 0
assertion meaningful passe à côté de tous les bugs.

> **Coverage measures what your tests touch, not what they
> verify.** — adage attribué à Martin Fowler.

Cette ref pose :
1. Les **seuils** à viser dans un projet SPDD
2. Les **4 mécanismes anti-cheat** qui empêchent l'agent (ou
   un humain pressé) de gamer les seuils sans tester
   réellement
3. Les **patterns de gaming** connus à reconnaître en review

## Seuils par défaut

| Périmètre | Branch coverage cible | Notes |
|---|---|---|
| **Module global** | **≥ 70%** | Seuil pragmatique sur l'ensemble du package / module |
| **Modules critiques** | **≥ 85%** | Logique métier centrale, sécurité, règles de validation, parsers |
| **Modules de scaffolding** | **non-imposé** | `main()`, `cmd/`, code généré, configuration, factories triviales |
| **Modules legacy non-touchés** | **gel à valeur actuelle** | Pas d'exigence d'amélioration, mais pas de régression non plus |

**Pas de quête du 100%.** Au-delà de 90%, le coût marginal
explose (mocking de cas limites artificiels, tests de getters,
etc.) pour un gain de bug-finding faible. Le temps est mieux
investi en mutation testing sur les zones critiques (cf.
[`mutation-testing.md`](mutation-testing.md)).

## Les 4 anti-cheat obligatoires

Ces 4 mécanismes sont **non-négociables** pour qu'un projet
SPDD revendique une "discipline de coverage". Un projet peut
**affiner les seuils** mais pas désactiver les contrôles.

### Anti-cheat 1 — Mutation testing sur modules critiques

Le coverage exécute le code ; la mutation vérifie que les
**assertions sont effectives**. Sans mutation testing, un test
sans `assert*` / `expect*` monte le coverage à 100% et passe
silencieusement.

Application :
- Modules critiques uniquement (le mutation testing est lent,
  cf. [`mutation-testing.md`](mutation-testing.md))
- Seuil indicatif : **mutation score ≥ 60-70%** sur ces
  modules
- En CI : sur la PR (modules touchés seulement), pas sur main
  (trop coûteux)

### Anti-cheat 2 — Test size limit (smell "Eager Test")

Un test individuel qui dépasse certaines bornes est
suspect — il vérifie probablement plusieurs comportements
cachés et masque des assertions manquantes :

| Métrique | Seuil warning | Seuil bloquant |
|---|---|---|
| Lignes par `it` / `@Test` (corps) | > 30 | > 50 |
| Asserts par test | > 3 | > 5 |
| Setup lignes (Arrange) | > 20 | > 40 |

Détection : règles ESLint custom (`max-lines-per-function`
ciblée sur les fichiers `*.test.*`), `gocyclo` sur les
`Test*` Go, plugins Sonar `qualinsight-mapper-test`. Détail
outils → TEST-002.

Cf. [`test-smells.md`](test-smells.md) §3 "Eager Test".

### Anti-cheat 3 — Forbid patterns lint

Liste de patterns qui, détectés en CI, bloquent le merge :

- **Test sans assertion** : pas de `assert*` / `expect*` /
  `should*` dans le corps du `@Test` / `it` / `func TestX`.
  Détection statique (regex sur le AST).
- **`it.skip()` / `@Disabled` / `t.Skip()` non justifié** :
  doit avoir un commentaire `// TODO(JIRA-NNNN): re-enable
  after X` au-dessus, sinon refusé.
- **Magic numbers / chaînes** dans les assertions :
  `expect(result).toBe(42)` sans explicit `EXPECTED_ANSWER =
  42` est warning. Bloquant si > 3 magic values.
- **Mocks dans le nom du test** : `it('calls userService.find')`
  → renommer pour décrire le comportement, pas l'appel.
- **`console.log` / `fmt.Println` / `System.out`** dans les
  tests committés : trace de debug, à retirer.

### Anti-cheat 4 — Coverage drift gate

CI bloque le merge si la PR fait descendre le coverage
**global** ou **par module touché** de plus de **3 points**
par rapport à la base.

Configuration :
- Seuil tolérable de drift : **-3%** (paramétrable par projet)
- Per-module : -3% sur n'importe quel module touché par la
  PR = blocant (sauf override avec justification écrite)
- Rapport généré : table avant/après par module dans le
  comment de la PR

Effet : empêche l'effet "lazy refactor" où on ajoute du code
sans tests et le coverage descend en silence.

## Patterns de gaming connus

Reconnaître ces patterns en code review :

- **Smoke test géant** : un seul test exécute 80% du code
  applicatif sans assertions précises ; coverage monte à
  90%, mutation score à 15%. → Splitter, ajouter des asserts
  ciblés.
- **Happy path only** : seuls les cas nominaux sont testés ;
  les branches d'erreur (try/catch, validators) ne sont pas
  couvertes. → Ajouter au moins 1 cas par branche d'erreur.
- **Snapshot regenerate auto** : `--update-snapshots` /
  `--write-fixtures` lancés en CI sans review humaine du
  diff. → Snapshot review obligatoire en PR, cf.
  [`snapshot-testing.md`](snapshot-testing.md).
- **Test des getters/setters** : pollue la suite, masque les
  vrais tests, fait gonfler le coverage. → Ne pas tester les
  accesseurs triviaux.
- **Coverage exclusion creep** : les `// istanbul ignore` /
  `//go:build ignore` se multiplient dans la codebase. →
  Auditer trimestriellement, justifier chaque exclusion.

## Que faire en module legacy

Pour un module sans tests qui hérite d'une dette :

1. **Geler la coverage actuelle** comme baseline
2. **Pas d'exigence rétroactive** sur l'ancien code
3. **Tout nouveau code OU tout fix** dans ce module **doit**
   passer les seuils par défaut
4. Caractérisation progressive via **snapshot tests** au
   début (cf. [`snapshot-testing.md`](snapshot-testing.md)),
   migrés vers de vrais tests unitaires au fur et à mesure
5. Mutation testing déclenché dès qu'un module legacy est
   réécrit substantiellement

## Heuristiques pour SPDD

- **Pendant `/yukki-generate`** : pour chaque Operation, écrire
  les tests annoncés dans le canvas avant de marquer
  l'Operation done. Ne pas reporter.
- **Pendant `/yukki-tests`** (étape 6, futur) : la suite
  complète sera générée selon les patterns décrits ici, en
  respectant les 4 anti-cheat.
- **Pendant `/yukki-prompt-update`** : si une Operation
  modifiée touche un module critique, prévoir l'ajout des
  tests mutation correspondants dans le changelog du canvas.

## Voir aussi

- [`mutation-testing.md`](mutation-testing.md) — anti-cheat #1, le détail
- [`test-smells.md`](test-smells.md) — anti-cheat #2 (Eager Test)
- [`test-naming.md`](test-naming.md) — anti-cheat #3 (mocks dans le nom)
- [`snapshot-testing.md`](snapshot-testing.md) — caractérisation legacy
- *(futur)* `code-quality/code-smells.md` — code applicatif

## Sources

- Vladimir Khorikov (2020) — *Unit Testing*, Manning. Chap. 1 sur la valeur du coverage.
- Henry Coles — *Pitest documentation*, [pitest.org](https://pitest.org). Sur la limite du coverage seul.
- Martin Fowler (2012) — *Test Coverage*, [martinfowler.com](https://martinfowler.com/bliki/TestCoverage.html). Position canonique : "coverage as feedback, not target".

## Changelog

- 2026-05-03 — v1 — création initiale
