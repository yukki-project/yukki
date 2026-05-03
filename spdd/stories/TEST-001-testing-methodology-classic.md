---
id: TEST-001
slug: testing-methodology-classic
title: Refs méthodologiques pour les tests classiques (frontend + backend, langage-agnostique)
status: reviewed
created: 2026-05-03
updated: 2026-05-03
owner: Thibaut Sannier
modules:
  - docs
parent: ~
sibling-stories:
  - META-001-extract-methodology-references
  - META-002-backport-story-techniques
---

# Refs méthodologiques pour les tests classiques

## Background

Le dossier [`spdd/methodology/`](../methodology/) contient déjà 7 refs
versionnées (INVEST, acceptance-criteria, SPIDR, edge-cases,
risk-taxonomy, decisions Y-Statement, domain-modeling) — toutes
**story-side** (qualité d'une user story, modélisation domaine,
risques).

**Aucune ref ne traite le testing.** C'est un gap majeur : quand
`/spdd-generate` produit du code et **doit** embarquer des tests
(les Operations annoncent "Tests : ..." mais sans cadre méthodo
sur quoi tester, comment nommer, quelle pyramide cibler), l'agent
écrit des tests à la louche, et un humain qui review n'a pas de
référentiel partagé pour challenger.

Cette story comble le gap avec un **cluster Testing** complet,
**langage-agnostique** (les patterns valent pour Go, Java, Python,
TypeScript, etc.), structuré en :

- **2 entry-points par contexte** : `testing-frontend.md` (UI
  stateful + browser environment) et `testing-backend.md` (business
  logic + I/O + APIs)
- **7 sub-refs factorisées** mutualisées entre les deux entry-points
  (test-naming, test-smells, coverage-discipline, mutation-testing,
  property-based-testing, contract-testing, snapshot-testing)

Les refs sont **référencées par les skills SPDD** consommatrices
(`/spdd-reasons-canvas`, `/spdd-generate`) via le frontmatter
`applies-to:`. Création éventuelle d'une nouvelle skill
**`/spdd-tests`** (étape 6 du workflow SPDD, prévue mais non
implémentée à date).

L'**outillage concret** (commandes shell, plugins Maven, scripts
CI) est volontairement **hors scope V1** — il fait l'objet d'une
**story sœur TEST-002** dédiée à la découverte des outils par
écosystème (Java/Go/Python/TS/...). Les refs TEST-001 mentionnent
les outils en annexe seulement, pour ne pas dater.

## Catégorisation par cluster (foundation)

TEST-001 introduit aussi le **principe de catégorisation par
sous-dossier** dans `spdd/methodology/`. Aujourd'hui le dossier
est plat (7 refs racine). Avec l'ajout du cluster testing (9
refs) puis les futurs clusters anticipés, on passerait à 30-50
refs flat — non navigable.

Convention adoptée : **1 cluster = 1 sous-dossier**, nommé en
anglais kebab-case par cohérence avec les noms de refs.

| Sous-dossier | Cluster | Contenu cible | Statut TEST-001 |
|---|---|---|---|
| (racine) | story / risk / architecture | INVEST, acceptance-criteria, SPIDR, edge-cases, risk-taxonomy, decisions, domain-modeling | **existant**, non migré V1 |
| `testing/` | qualité des tests | testing-frontend, testing-backend + 7 sub-refs (naming, smells, coverage-discipline, mutation, property-based, contract, snapshot) | **créé par cette story** |
| `code-quality/` | qualité du code applicatif | code review checklist, code smells (Fowler), refactoring catalog, tidy first (Beck), cognitive complexity | futur (CODEQ-001) |
| `operations/` | runtime / déploiement | feature flags, observability (RED metrics, traces structurés), migration strategies (strangler / expand-contract), rollback, versioning (SemVer) | futur (OPS-001) |
| `communication/` | docs et collaboration | conventional commits, PR description quality, README quality, Diátaxis (4 quadrants doc) | futur (COMM-001) |
| `process/` | flux de travail | trunk-based development, estimation (story points / NoEstimates), retrospective (Five Whys / fishbone), pair / mob programming | futur (PROC-001) |
| `ai-aware/` | testing IA-spécifique | LLM evals (golden datasets, LLM-as-judge), prompt regression testing, agent testing (tool routing, traces), drift monitoring | futur (TEST-003) |

**Règles de la catégorisation** :

- **1 ref vit dans 1 dossier** — pas de duplication. Si une ref
  appartient à 2 clusters logiques (ex. `risk-taxonomy.md`
  pertinent en story et en testing), elle vit dans un seul, les
  autres la référencent par lien.
- **Frontmatter `category: <slug>`** ajouté à chaque ref pour
  cohérence machine-lisible (= nom du dossier parent).
- **Pas de migration des 7 refs existantes en V1** — elles
  restent à la racine. Une story future fera le ménage si
  besoin, sans urgence (volume modeste, accessible).
- **Le `README.md` de `spdd/methodology/`** orchestre la vue
  d'ensemble par cluster (tableau comme ci-dessus + index par
  topic).
- **Nommage des sous-dossiers** : kebab-case anglais (`testing`,
  `code-quality`, `ai-aware`) — cohérent avec les conventions
  d'arborescence du repo.

## Business Value

- **Qualité de tests opposable** : tout `/spdd-generate` produit
  des tests cohérents avec un référentiel partagé. Plus de "AC
  testé : à voir au cas par cas".
- **Couverture mesurable + non-gamable** : les seuils (70% global,
  85% modules critiques) sont définis dans la ref, et les
  **anti-patterns de gaming** (gros tests sans assertion, mocks
  excessifs, snapshot regenerate sans review) sont catalogués —
  l'agent ne peut pas faire monter le coverage en trichant sans
  qu'un humain ne le repère.
- **Cohérence cross-projet** : les refs valent pour yukki
  (Go + React/TS), pour le portail k8s-portal-csf (Java/Quarkus +
  Angular), et pour tout futur projet (Python, autre stack
  frontend, etc.). SPDD devient portable comme méthodo.
- **Foundation pour AI-aware testing future** : une fois TEST-001
  en place, on peut ajouter **TEST-003** (LLM evals, prompt
  regression testing, agent testing) sans réécrire les patterns
  classiques.

## Scope In

### Refs entry-points (2 fichiers)

- **`spdd/methodology/testing/testing-frontend.md`** — playbook frontend
  - Pyramide adaptée frontend : présenter les 3 patterns (Cohn
    classique 70/20/10, Honeycomb Spotify, Testing Trophy
    Kent C. Dodds) et les critères de choix par contexte.
  - Anti-pattern "ice-cream cone" (trop d'e2e fragiles).
  - Spécificités : DOM testing, component vs integration, e2e
    via browser, accessibility (a11y) comme preuve testable.
  - Liens vers les sub-refs pertinentes : test-naming,
    test-smells, coverage-discipline, snapshot-testing,
    property-based-testing.
  - Annexe outils : 1-3 lignes par stack frontend (Angular,
    React, Vue) avec lien vers TEST-002 pour le détail.
- **`spdd/methodology/testing/testing-backend.md`** — playbook backend
  - Pyramide adaptée backend : 70/20/10 plus classique, justifie
    pourquoi.
  - Spécificités : business logic, I/O (DB, file, network),
    APIs REST/gRPC, message-driven, workers/jobs.
  - Liens vers les sub-refs : test-naming, test-smells,
    coverage-discipline, mutation-testing, property-based-testing,
    contract-testing.
  - Annexe outils : 1-3 lignes par stack backend (Java, Go,
    Python) avec lien vers TEST-002.

### Sub-refs factorisées (7 fichiers)

- **`spdd/methodology/testing/test-naming.md`** — conventions de nommage
  - 3 conventions concurrentes : Given/When/Then, AAA,
    `MethodName_StateUnderTest_ExpectedBehavior` (Osherove).
  - Anti-patterns : `test1`, `testFoo`, `it('works')`, magic
    numbers, mocks dans le nom.
  - Décision : **convention par stack** (français vs anglais
    cohérent avec le repo, framework idiomatique respecté).
  - Lien fort avec les AC story (Given/When/Then).
- **`spdd/methodology/testing/test-smells.md`** — catalogue (Meszaros)
  - 11 smells : Fragile, Slow, Eager, Lazy, Mystery Guest,
    Test Code Duplication, Conditional Test Logic, Obscure
    Test, Test Interdependence, etc.
  - Tableau : smell → symptôme → fix.
  - "Test code is production code" (Khorikov).
- **`spdd/methodology/testing/coverage-discipline.md`** — seuils + anti-cheat
  - **Seuils** : branch coverage **≥ 70% global**, **≥ 85%
    modules critiques**. Ignore `main()`, code généré,
    scaffolding.
  - **4 mécanismes anti-cheat obligatoires** :
    1. **Mutation testing** sur modules critiques (révèle
       les tests sans assertions effectives) — voir
       `mutation-testing.md`
    2. **Test size limit** : refuser tests > 50 lignes ou
       > 5 asserts par `it`/`@Test` (smell "Eager test")
    3. **Forbid patterns** lint : tests sans `assert*` /
       `expect*`, `it.skip()` non justifié, magic numbers
    4. **Coverage drift gate** : CI bloque si coverage
       descend de plus de 3 points sur la PR
  - Patterns de gaming à connaître : "smoke test géant",
    "happy path only", "snapshot regenerate auto".
  - Décision : ces 4 mécanismes sont **non-négociables** ; un
    projet peut affiner les seuils mais pas désactiver les
    contrôles.
- **`spdd/methodology/testing/mutation-testing.md`**
  - Idée : mesurer la **qualité** des tests (pas du code) en
    injectant des mutations.
  - Quand l'introduire : **après** que coverage standard
    atteigne le seuil ; **uniquement sur modules critiques**.
  - Seuil indicatif : mutation score ≥ 60-70% sur critiques.
  - Traps : lent (× nombre de mutants), mutants équivalents,
    non substituable à des tests d'architecture / e2e.
- **`spdd/methodology/testing/property-based-testing.md`**
  - Idée : exprimer un invariant, le runner génère N cas +
    shrinking.
  - 5-6 patterns d'invariants : round-trip, oracle test,
    équivalence de modèles, métamorphique, idempotence,
    commutativité.
  - Quand l'utiliser : parsers, sérialisation, structures
    algorithmiques, math.
  - Quand éviter : I/O lourd, business workflow stateful, GUI.
  - Discipline shrinking + reproducible seeds.
- **`spdd/methodology/testing/contract-testing.md`** (utilisé surtout
  backend mais ref autonome)
  - 2 styles : consumer-driven (Pact-like) vs provider-driven
    (schema-first OpenAPI / AsyncAPI).
  - Décision context-aware (microservices ? cross-team ?
    boundary externe ?).
  - Versioning du contrat, breaking changes, expand-contract.
  - Traps : contract drift, broker non maintenu, contracts
    trop rigides.
- **`spdd/methodology/testing/snapshot-testing.md`** (utilisé surtout
  frontend)
  - Decision tree : quand utiliser, quand éviter.
  - Quand : caractérisation legacy, output stable
    (HTML canonical, JSON, code généré).
  - Quand pas : UI dynamique avec timestamps/IDs, tests métier.
  - Anti-pattern "regenerate sans review", alternative
    golden-files, snapshot review en code review.

### Frontmatter `applies-to:` mis à jour

Les skills SPDD pertinents reçoivent un nouvel item
`applies-to:` qui pointe vers les refs testing :

- `/spdd-reasons-canvas` — pour que la section `O — Operations`
  annonce des tests conformes à la pyramide + naming
- `/spdd-generate` — pour que le code généré embarque les tests
  selon les patterns
- (Future) `/spdd-tests` — étape 6, à créer dans une story
  ultérieure

Le `README.md` du dossier `spdd/methodology/` est aussi mis à
jour pour référencer les 9 nouvelles refs dans son tableau.

### Création optionnelle skill `/spdd-tests`

Pas dans le scope V1 — story future. Mention seulement dans le
README qu'elle est prévue (étape 6 du workflow SPDD).

## Scope Out

- **Outils concrets de coverage / mutation / lint par stack** —
  story sœur **TEST-002** dédiée. Les refs TEST-001 mentionnent
  les outils en annexe minimaliste (≤ 3 lignes par stack), avec
  lien vers TEST-002 pour le détail.
- **AI-aware testing** (LLM evals, prompt regression, agent
  testing, snapshot tolerances sémantiques) — différé à
  **TEST-003** (post-TEST-001 + TEST-002).
- **Création effective de la skill `/spdd-tests`** — différée. La
  ref `testing-backend.md` / `testing-frontend.md` est conçue
  pour être consommée par `/spdd-tests` quand cette skill sera
  écrite, mais la skill elle-même n'est pas dans le scope.
- **Tests de performance / load testing** — différé (cluster
  méthodo dédié).
- **Tests d'accessibilité (a11y)** approfondis — mentionné en
  passant dans `testing-frontend.md` (WCAG 2.1 AA comme
  preuve testable) mais pas une ref dédiée en V1.
- **Tests de sécurité (DAST/SAST/pentest)** — couvert
  partiellement par `risk-taxonomy.md` (STRIDE) ; pas dupliqué.
- **CI/CD intégration concrète** (GitHub Actions, GitLab CI,
  Jenkins) — hors scope V1, traité par TEST-002 si besoin.
- **Coaching utilisateurs** sur l'écriture de tests
  (training material) — la ref est une référence, pas un cours.

## Acceptance Criteria

> Format Given/When/Then. Validation par lecture humaine + check
> que les skills consommatrices référencent bien les refs.

### AC1 — 9 refs créées dans `spdd/methodology/`

- **Given** un état actuel à 7 refs dans `spdd/methodology/`
- **When** TEST-001 est livré
- **Then** **9 nouvelles refs** existent (en plus des 7
  existantes) :
  - `testing-frontend.md`, `testing-backend.md`
  - `test-naming.md`, `test-smells.md`,
    `coverage-discipline.md`
  - `mutation-testing.md`, `property-based-testing.md`,
    `contract-testing.md`, `snapshot-testing.md`

### AC2 — Frontmatter conforme

- **Given** chaque nouvelle ref
- **When** je lis son frontmatter YAML
- **Then** elle contient : `id`, `version: 1`, `status: stable`,
  `category: testing` (foundation pour la catégorisation
  cross-cluster), `applies-to: [...]` (skills consommatrices),
  `lang: fr`, `sources: [...]` (auteurs/livres référencés).
  Cohérent avec les 7 refs existantes (sauf le champ
  `category:` nouveau, qui sera back-porté aux 7 existantes
  dans une story future si besoin).

### AC3 — Longueur cible respectée

- **Given** chaque ref
- **When** je `wc -l`
- **Then** les **2 entry-points** font 150-300 lignes (playbook
  + références aux sub-refs) ; les **7 sub-refs** font 80-200
  lignes (technique focalisée).

### AC4 — Pyramide testing présente avec 3 variantes

- **Given** `testing-frontend.md` et `testing-backend.md`
- **When** je cherche la pyramide
- **Then** chaque entry-point présente les 3 variantes (Cohn,
  Honeycomb, Trophy) avec critères de choix par contexte. **Pas
  de prescription dogmatique d'un seul ratio**.

### AC5 — Coverage discipline avec seuils et 4 anti-cheat

- **Given** `coverage-discipline.md`
- **When** je le lis
- **Then** il déclare explicitement :
  - Seuil global ≥ 70%, modules critiques ≥ 85%
  - Les 4 anti-cheat (mutation, test size limit, forbid
    patterns, coverage drift gate) avec critères d'application
  - Patterns de gaming connus à éviter

### AC6 — Test smells au moins 11

- **Given** `test-smells.md`
- **When** je compte les smells listés
- **Then** au moins 11 smells (catalogue Meszaros) avec pour
  chacun : symptôme + fix.

### AC7 — Naming conventions avec 3 styles

- **Given** `test-naming.md`
- **When** je le lis
- **Then** les 3 conventions (Given/When/Then, AAA, MethodName)
  sont décrites + critères de choix + anti-patterns.

### AC8 — Refs liées aux skills via `applies-to:`

- **Given** les frontmatters des skills `/spdd-reasons-canvas`
  et `/spdd-generate` (et leur `.claude/commands/*.md` /
  `.github/skills/*/SKILL.md`)
- **When** je les lis
- **Then** ils référencent **explicitement** les refs testing
  pertinentes (au moins `testing-frontend.md` ou
  `testing-backend.md` selon le contexte).
- **And** le `README.md` de `spdd/methodology/` liste les 9
  nouvelles refs dans son tableau.

### AC9 — Annexe outils minimaliste (renvoi à TEST-002)

- **Given** les 2 entry-points
- **When** je cherche les commandes shell concrètes
- **Then** je trouve une **annexe minimale** : 1-3 lignes par
  stack avec un placeholder du genre "voir TEST-002 pour les
  outils détaillés". Aucune commande complète dans le corps
  de la ref. Aucune dépendance dure à un framework spécifique.

### AC10 — Langue cohérente

- **Given** toutes les refs créées
- **When** je les lis
- **Then** elles sont en **français** (cohérent avec les 7
  existantes), `lang: fr` dans le frontmatter. Les noms propres
  (Cohn, Meszaros, Hughes, Beck, Fowler) restent originaux.

### AC11 — Pas de régression sur les 7 refs existantes

- **Given** les 7 refs préexistantes (INVEST, AC, SPIDR,
  edge-cases, risk-taxonomy, decisions, domain-modeling)
- **When** TEST-001 est livré
- **Then** aucune n'est modifiée (à part éventuellement le
  `applies-to:` du frontmatter si une ref existante référence
  désormais une ref testing — peu probable en V1).

### AC12 — Sous-dossier `testing/` créé + README mis à jour

- **Given** un dossier `spdd/methodology/` plat à 7 refs au
  départ
- **When** TEST-001 est livré
- **Then** :
  - le sous-dossier `spdd/methodology/testing/` existe avec
    les 9 nouvelles refs dedans
  - le `README.md` de `spdd/methodology/` est mis à jour pour :
    - documenter la **convention de catégorisation par
      cluster** (1 cluster = 1 sous-dossier)
    - ajouter un tableau "Clusters disponibles" avec ligne
      par catégorie (story/risk/architecture racine, testing
      sous-dossier, futurs clusters listés en placeholder)
    - lister les 9 nouvelles refs dans une section
      `## Cluster: testing`
  - les 7 refs existantes restent à la racine (pas de
    migration).

## Open Questions — toutes tranchées en revue 2026-05-03

- [x] **OQ1 → A** : skill `/spdd-tests` **différée** à une story
      dédiée (séparation propre code/doc). TEST-001 reste 100%
      méthodo.
- [x] **OQ2 → A** : a11y/WCAG mentionné en **1 paragraphe** dans
      `testing-frontend.md`, ref dédiée différée en V2 (peut
      relever d'un cluster `accessibility/` à part).
- [x] **OQ3 → A** : `status: stable` directement — refs issues
      de littérature canonique consolidée. Peer review (OQ8) est
      l'équivalent fonctionnel du passage stable.
- [x] **OQ4 → A** : `version: 1` (cohérent INVEST/SPIDR existants),
      bumps via `## Changelog` au pied de la ref.
- [x] **OQ5 → A** : tonalité **descriptive avec recos claires**
      (style Fowler / Beck / Khorikov), aligne avec philosophie
      SPDD "le canvas est négociable, pas dogmatique".
- [x] **OQ6 → A** : citation académique **complète** dans
      frontmatter `sources:` (auteur + titre + année + ISBN/URL),
      "voir Meszaros 2007" inline pour la lisibilité, optionnel
      `## Pour aller plus loin` en bas si dense.
- [x] **OQ7 → A** : refs avec overlap = **liens mutuels en
      footer** (`## Voir aussi`), chaque ref garde son angle.
      Pas de duplication ni de ref pivot supplémentaire.
- [x] **OQ8 → A** : **peer review obligatoire** avant merge
      (≥ 1 reviewer humain externe à l'auteur). Une ref méthodo
      doit être opposable.

## Notes

- **Liens vers la littérature canonique** :
  - Cohn (2009) "Succeeding with Agile" — pyramide originale
  - Meszaros (2007) "xUnit Test Patterns" — catalogue smells
  - Hughes / MacIver — QuickCheck / Hypothesis (property-based)
  - Osherove (2014) "The Art of Unit Testing" — naming
  - Khorikov (2020) "Unit Testing : Principles, Practices, Patterns" — coverage discipline
  - Falco (2014) "Approval Tests" — snapshot
  - Fowler (2006) "Consumer-Driven Contracts"
  - Henry Coles — PIT mutation testing
- **Inspirations 2026** : Honeycomb (Spotify Engineering),
  Testing Trophy (Kent C. Dodds), Pyramide v2.
- **Estimation** : ~1.5 jours
  - 9 refs × ~150 lignes en moyenne = ~1300 lignes de markdown
  - Mise à jour skills (frontmatter) + README = ~1h
  - Peer review et révisions = ~3-4h
- **Dépendance dure** : aucune (méthodo pure, pas de code).
- **Risque pressenti** : redondance avec les 7 refs existantes.
  Mitigation : faire un audit de chevauchement (OQ7) avant de
  rédiger.
