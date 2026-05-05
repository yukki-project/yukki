---
id: TEST-001
slug: testing-methodology-classic
story: spdd/stories/TEST-001-testing-methodology-classic.md
analysis: spdd/analysis/TEST-001-testing-methodology-classic.md
status: implemented
created: 2026-05-03
updated: 2026-05-03
---

# Canvas REASONS — Refs méthodo testing classique

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> code ↔ canvas se résout dans ce fichier d'abord.
>
> Story doc-only : ajoute 9 refs markdown dans
> `spdd/methodology/testing/`, met à jour le README et 2 skills
> SPDD. Aucun code applicatif touché.

---

## R — Requirements

### Problème

Le dossier `spdd/methodology/` ne contient aujourd'hui aucune ref
testing. Quand `/spdd-generate` écrit du code et doit embarquer
des tests, l'agent n'a pas de référentiel partagé sur quoi
tester, comment nommer, quelle pyramide cibler. Les humains qui
review n'ont pas non plus de cadre opposable. TEST-001 livre un
**cluster Testing complet** (2 entry-points + 7 sub-refs)
**langage-agnostique**, dans un nouveau **sous-dossier
`spdd/methodology/testing/`** qui inaugure la convention de
catégorisation par cluster.

### Definition of Done

- [ ] Sous-dossier `spdd/methodology/testing/` créé avec **9
      refs** :
  - `testing-frontend.md` — playbook frontend (entry-point)
  - `testing-backend.md` — playbook backend (entry-point)
  - `test-naming.md` — conventions G/W/T / AAA / Osherove
  - `test-smells.md` — catalogue Meszaros (11+ smells)
  - `coverage-discipline.md` — seuils 70%/85% + 4 anti-cheat
  - `mutation-testing.md` — quand l'introduire, seuils, traps
  - `property-based-testing.md` — patterns d'invariants, tools
  - `contract-testing.md` — consumer-driven vs provider-driven
  - `snapshot-testing.md` — decision tree, anti-patterns
- [ ] Chaque ref : frontmatter conforme avec
  `id: TEST-<topic>` (D-D1), `category: testing` (D-D2),
  `version: 1`, `status: published`, `applies-to: [...]`,
  `lang: fr`, `created`/`updated`, `sources: [...]` complet.
- [ ] Longueur cible : entry-points 150-300 lignes,
  sub-refs 80-200 lignes.
- [ ] Tonalité **descriptive avec recos claires** (style
  Fowler/Beck/Khorikov, pas dogmatique).
- [ ] Section `## Voir aussi` (liste à puces simple, D-D5)
  dans toute ref avec overlap (test-naming ↔ acceptance-criteria,
  test-smells ↔ futur code-quality, etc.).
- [ ] Section `## Sources` complète avec citations académiques
  (auteur + titre + année + ISBN/URL si pertinent).
- [ ] Section `## Changelog` initialisée :
  `- 2026-05-03 — v1 — création initiale`.
- [ ] Section "Exemples concrets" référence des artefacts réels
  du repo yukki quand pertinent (D-D7 — CORE-001, UI-001a/b/c,
  UI-006/007/008).
- [ ] Annexe "Tools by ecosystem" dans les 2 entry-points : **1
  tableau unique** (D-D6) avec 1 ligne par stack, renvoi vers
  TEST-002 pour le détail.
- [ ] `spdd/methodology/README.md` mis à jour :
  - Ajout d'une section `## Convention de catégorisation par
    cluster` qui explique le principe (1 cluster = 1
    sous-dossier) et liste les futurs clusters anticipés.
  - Ajout d'un **tableau "Clusters disponibles"** en tête
    (D-D3) avec ligne par catégorie (story / risk /
    architecture racine, testing sous-dossier, futurs en
    placeholder).
  - Ajout d'une **section `## Cluster: testing`** avec son
    propre tableau listant les 9 nouvelles refs (Ref / Résumé
    / applies-to).
  - Les 7 refs existantes restent listées dans leur tableau
    actuel, **non migrées**.
- [ ] **2 skills mises à jour des 2 côtés** (D-D4) :
  - `.claude/commands/spdd-reasons-canvas.md` : ajout
    références aux refs testing dans la procédure (section
    Operations doit être conforme aux refs pyramide + naming).
  - `.claude/commands/spdd-generate.md` : ajout idem (le code
    généré doit embarquer des tests selon les patterns).
  - `.github/skills/spdd-reasons-canvas/SKILL.md` : miroir.
  - `.github/skills/spdd-generate/SKILL.md` : miroir.
- [ ] Aucune modification des **7 refs existantes** (INVEST, AC,
  SPIDR, edge-cases, risk-taxonomy, decisions, domain-modeling)
  ni de leurs frontmatter. Pas de back-port `category:` en V1.
- [ ] Aucun code applicatif (Go, frontend) modifié.
  TEST-001 est **doc-only**.
- [ ] Peer review obligatoire avant merge (≥ 1 reviewer humain
  externe à l'auteur).

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| **Cluster `testing/`** (sous-dossier nouveau) | 1ʳᵉ catégorie sortie de la racine `spdd/methodology/`. Foundation pour les futurs clusters. | chemin `spdd/methodology/testing/` | created par cette story, persiste |
| **Ref entry-point** (2 instances) | Playbook par contexte (frontend / backend) : présente la pyramide adaptée + arbitrage par stack + références aux sub-refs | frontmatter `id: TEST-frontend` / `id: TEST-backend` ; sections : Définition, Pyramide, Heuristiques par étape, Sub-refs liées, Annexe Tools, Sources, Changelog | created par cette story |
| **Ref sub-technique** (7 instances) | Technique focalisée et autonome | frontmatter `id: TEST-<topic>`, `category: testing`, `version: 1`, `status: published` ; sections : Définition, technique, Heuristiques, Sections détaillées, Voir aussi, Sources, Changelog | created par cette story |
| **Champ `category:` frontmatter** (nouveau) | Catégorie du cluster d'appartenance | type `string` slug, value `testing` pour les 9 refs | introduit en V1 sur les 9 nouvelles, back-port futur |
| **Section `## Voir aussi`** (footer convention) | Footer optionnel des refs avec overlap, liste mutuelle des refs liées | liste à puces (D-D5) | per-ref, optionnel |
| **Section `## Cluster: testing`** dans README | Sous-section qui liste les 9 refs testing dans un tableau dédié | tableau Ref / Résumé / applies-to | added par cette story |
| **Tableau "Clusters disponibles"** dans README | Vue panoramique des catégories (existantes + futures placeholder) | tableau Sous-dossier / Cluster / Statut | added par cette story |
| **Skills SPDD existantes** | Consommatrices des nouvelles refs via `applies-to:` | `.claude/commands/spdd-{reasons-canvas,generate}.md` + `.github/skills/spdd-{reasons-canvas,generate}/SKILL.md` | modifiées par cette story (ajout références dans la procédure) |

### Relations

- `cluster testing/` ⟶ contient 9 refs (2 entry-points + 7 sub-refs)
- `entry-point testing-frontend.md` ⟶ référence (lien) sub-refs : test-naming, test-smells, coverage-discipline, snapshot-testing, property-based-testing
- `entry-point testing-backend.md` ⟶ référence sub-refs : test-naming, test-smells, coverage-discipline, mutation-testing, property-based-testing, contract-testing
- `sub-ref test-naming.md` ⟵ `## Voir aussi` ⟶ `acceptance-criteria.md` (existante racine)
- `sub-ref test-smells.md` ⟵ `## Voir aussi` ⟶ futurs `code-quality/code-smells.md` + `code-quality/refactoring-catalog.md`
- `sub-ref coverage-discipline.md` ⟵ inclut les 4 anti-cheat (mutation, test size, forbid patterns, drift gate) ; les 2 derniers sont des forks tooling renvoyés à TEST-002
- README ⟶ tableau "Clusters disponibles" + tableau par cluster (story-side racine + testing sous-dossier)
- skills `/spdd-{reasons-canvas,generate}` ⟶ `applies-to:` testing-frontend + testing-backend

### Invariants

- **I1** — **Doc-only** : aucun code applicatif (Go, TS, Java)
  modifié par TEST-001. Modules touchés exclusivement dans
  `spdd/methodology/`, `.claude/commands/`, `.github/skills/`.
- **I2** — **Pas de migration des 7 existantes** : leurs
  frontmatter, leur emplacement (racine), leur contenu sont
  intacts. Le champ `category:` n'est PAS back-porté en V1.
- **I3** — **Langage-agnostique** : aucune ref ne dépend d'un
  framework spécifique (Stryker, Jest, JUnit, etc.). Les noms
  d'outils n'apparaissent que dans l'annexe "Tools by
  ecosystem", avec renvoi à TEST-002.
- **I4** — **Convention frontmatter respectée** : pattern
  identique aux 7 refs existantes (cf. `invest.md`), enrichi
  d'un champ `category:` nouveau.
- **I5** — **Liens mutuels, pas de duplication** : si un
  concept est traité dans 2 refs (ex. Given/When/Then dans
  test-naming et acceptance-criteria), chacune garde son angle
  et pointe vers l'autre via `## Voir aussi`. Pas de copy-paste
  cross-ref.
- **I6** — **Sources tracées** : chaque ref a un champ
  frontmatter `sources:` avec citations académiques complètes
  (auteur + titre + année + ISBN/URL).
- **I7** — **Tonalité descriptive** : pas de "vous DEVEZ" ;
  "on observe que / on recommande X dans le contexte Y, sauf
  Z où on préfère W". Anti-patterns en `## Anti-patterns` font
  exception (ils peuvent être prescriptifs : "ne jamais X").

---

## A — Approach

### Y-Statement

> Pour résoudre **l'absence de référentiel méthodologique
> testing dans `spdd/methodology/` (gap qui rend toute
> génération de tests via `/spdd-generate` non-opposable et
> non-vérifiable)**, on choisit **de créer un cluster
> `testing/` sous-dossier dans `spdd/methodology/` contenant 2
> entry-points playbook (frontend / backend) + 7 sub-refs
> techniques factorisées (naming, smells, coverage-discipline,
> mutation, property-based, contract, snapshot), tous
> langage-agnostiques avec annexe minimale renvoyant outils à
> TEST-002, frontmatter standardisé incluant un nouveau champ
> `category: testing`, et de mettre à jour le README ainsi que
> 2 skills SPDD (`/spdd-reasons-canvas`, `/spdd-generate`) pour
> les rendre découvrables**, plutôt que **(a) inliner les
> patterns testing dans chaque skill (anti-DRY, hard à
> maintenir), (b) écrire une seule ref `testing.md` méga-fichier
> de 1500 lignes (illisible), ou (c) écrire des refs spécifiques
> par stack (Stryker.md, Jest.md, etc., qui datent vite et
> obligent à dupliquer les patterns)**, pour atteindre **un
> référentiel partagé et opposable, langage-agnostique donc
> portable hors yukki, foundation pour la catégorisation
> cross-cluster (futurs CODEQ-001, OPS-001, COMM-001, PROC-001,
> TEST-002, TEST-003)**, en acceptant **(a) un volume initial
> dense (~1300 lignes de markdown), (b) un état mixte
> temporaire dans `spdd/methodology/` (7 racine + 9
> sous-dossier testing/) jusqu'à ce qu'une story future migre
> les 7 existantes vers leurs clusters respectifs, et (c) une
> peer review obligatoire avant merge (overhead modéré pour
> un référentiel à fort levier)**.

### Décisions d'architecture (tranchées en revue 2026-05-03)

**Story-level (OQ1..OQ8)** :
- OQ1 → A : skill `/spdd-tests` différée
- OQ2 → A : a11y mention 1 paragraphe dans testing-frontend
- OQ3 → A : `status: published` direct
- OQ4 → A : `version: 1`
- OQ5 → A : tonalité descriptive avec recos
- OQ6 → A : citation académique complète
- OQ7 → A : liens mutuels, pas de duplication
- OQ8 → A : peer review obligatoire

**Analysis-level (D-D1..D-D7)** :
- D-D1 → A : préfixe `id: TEST-<topic>`
- D-D2 → A : `category: testing`
- D-D3 → A : README orchestré (clusters en tête + sections)
- D-D4 → A : update commands ET skills (synchronisés)
- D-D5 → A : `## Voir aussi` en liste à puces simple
- D-D6 → A : annexe "Tools by ecosystem" en 1 tableau unique
- D-D7 → A : exemples réels yukki

### Alternatives écartées

- **Inline testing patterns dans chaque skill** — anti-DRY,
  divergence cross-skill garantie.
- **1 méga-ref `testing.md`** — illisible, perd la convention
  "1 technique = 1 ref".
- **Refs par stack** (`testing-go.md`, `testing-jest.md`) —
  datent vite, dupliquent les patterns, casse multi-stack.
- **Catégorisation par tags multi-valued en flat** — moins
  visuel, moins navigable, redondant avec un dossier qui dit
  la même chose au prix d'1 mv.
- **Migration immédiate des 7 refs racine** — disruption pour
  zéro gain V1 (les 7 marchent très bien), risque de casser
  les liens existants. Différée.
- **Création concurrente de la skill `/spdd-tests`** —
  séparation propre code/doc, voir OQ1.

---

## S — Structure

### Modules touchés

| Module | Fichiers | Nature du changement |
|---|---|---|
| `spdd/methodology/testing/testing-frontend.md` | nouveau | playbook entry-point, ~250 lignes |
| `spdd/methodology/testing/testing-backend.md` | nouveau | playbook entry-point, ~250 lignes |
| `spdd/methodology/testing/test-naming.md` | nouveau | sub-ref, ~150 lignes |
| `spdd/methodology/testing/test-smells.md` | nouveau | sub-ref, ~180 lignes (catalogue dense) |
| `spdd/methodology/testing/coverage-discipline.md` | nouveau | sub-ref, ~180 lignes (4 anti-cheat) |
| `spdd/methodology/testing/mutation-testing.md` | nouveau | sub-ref, ~120 lignes |
| `spdd/methodology/testing/property-based-testing.md` | nouveau | sub-ref, ~140 lignes (5-6 patterns invariants) |
| `spdd/methodology/testing/contract-testing.md` | nouveau | sub-ref, ~140 lignes |
| `spdd/methodology/testing/snapshot-testing.md` | nouveau | sub-ref, ~100 lignes (decision tree) |
| `spdd/methodology/README.md` | modif | refactor : ajout sections "Convention catégorisation" + tableau "Clusters disponibles" + section `## Cluster: testing` |
| `.claude/commands/spdd-reasons-canvas.md` | modif faible | ajout référence aux refs testing dans la procédure (1-2 lignes) |
| `.claude/commands/spdd-generate.md` | modif faible | idem |
| `.github/skills/spdd-reasons-canvas/SKILL.md` | modif faible | miroir de la command |
| `.github/skills/spdd-generate/SKILL.md` | modif faible | miroir |
| `spdd/methodology/{invest,acceptance-criteria,spidr,edge-cases,risk-taxonomy,decisions,domain-modeling}.md` | **nul** | inchangées (pas de migration, pas de back-port `category:` V1) |
| `spdd/templates/*.md`, `spdd/stories/*.md` (autres), `spdd/analysis/*.md` (autres), `spdd/prompts/*.md` (autres), `spdd/tests/` | **nul** | inchangés |
| Code applicatif (Go : `internal/`, `cmd/`, root ; frontend : `frontend/src/`, etc.) | **nul** | scope étranger, story doc-only |
| `wails.json`, `main.go`, `cmd/yukki/` | **nul** | inchangés |

### Schéma de structure

```
spdd/methodology/
├── README.md                       (modif : convention + tableau clusters + section testing)
├── invest.md                       (inchangé)
├── acceptance-criteria.md          (inchangé)
├── spidr.md                        (inchangé)
├── edge-cases.md                   (inchangé)
├── risk-taxonomy.md                (inchangé)
├── decisions.md                    (inchangé)
├── domain-modeling.md              (inchangé)
└── testing/                        (nouveau sous-dossier, créé par TEST-001)
    ├── testing-frontend.md         (entry-point, ~250 lignes)
    ├── testing-backend.md          (entry-point, ~250 lignes)
    ├── test-naming.md              (sub-ref)
    ├── test-smells.md              (sub-ref)
    ├── coverage-discipline.md      (sub-ref, 4 anti-cheat)
    ├── mutation-testing.md         (sub-ref)
    ├── property-based-testing.md   (sub-ref)
    ├── contract-testing.md         (sub-ref)
    └── snapshot-testing.md         (sub-ref)
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation livrable indépendamment
> ou en lot par paire (commit par paire pour limiter le bruit
> git).

### O1 — Créer le sous-dossier `spdd/methodology/testing/`

- **Module** : `spdd/methodology`
- **Fichier** : `spdd/methodology/testing/.gitkeep` (transient,
  supprimé après le 1er fichier réel committé)
- **Comportement** : `mkdir -p spdd/methodology/testing/` (Bash
  ou via Write).
- **Tests** : aucun (filesystem only).

### O2 — Écrire `test-naming.md`

- **Module** : `spdd/methodology/testing`
- **Fichier** : `spdd/methodology/testing/test-naming.md`
- **Frontmatter** :
  ```yaml
  ---
  id: TEST-naming
  title: Test naming — conventions G/W/T, AAA, MethodName_State_Expected
  version: 1
  status: published
  category: testing
  applies-to: [spdd-reasons-canvas, spdd-generate]
  lang: fr
  created: 2026-05-03
  updated: 2026-05-03
  sources:
    - "Roy Osherove (2014) — *The Art of Unit Testing*, 2nd ed."
    - "Vladimir Khorikov (2020) — *Unit Testing: Principles, Practices, and Patterns*"
  ---
  ```
- **Sections** :
  1. `## Définition` — pourquoi le naming compte
  2. `## Les 3 conventions` — tableau Given/When/Then,
     AAA, MethodName_State_Expected (forces, faiblesses,
     contexte d'usage)
  3. `## Heuristiques par stack` — recommandation
     descriptive : Go = `TestX_When_Y_Should_Z`, Java JUnit
     = `should_X_when_Y`, Jest/Vitest = `describe/it`
  4. `## Anti-patterns` — `test1`, `testFoo`, `it('works')`,
     mocks dans le nom, magic numbers
  5. `## Lien avec les Acceptance Criteria` — Given/When/Then
     côté code vs côté contrat user (renvoi
     `acceptance-criteria.md` racine)
  6. `## Exemple concret` — un test Go du repo yukki
     (`internal/artifacts/status_test.go`) bien nommé
     vs un cas générique mauvais
  7. `## Voir aussi` (D-D5 liste à puces)
  8. `## Sources` (citations complètes)
  9. `## Changelog`
- **Longueur cible** : ~150 lignes
- **Tests** : aucun automatisé. Validation manuelle :
  frontmatter conforme, tonalité descriptive, sections
  présentes, longueur respectée.

### O3 — Écrire `test-smells.md`

- **Frontmatter** : `id: TEST-smells`, `category: testing`, etc.
- **Sources** : `Gerard Meszaros (2007) — xUnit Test Patterns: Refactoring Test Code`
- **Sections** :
  1. Définition
  2. Catalogue (tableau des 11+ smells : Fragile, Slow,
     Eager, Lazy, Mystery Guest, Test Code Duplication,
     Conditional Test Logic, Obscure Test, Test
     Interdependence, Sensitive Equality, Hidden Test
     Call, Test Logic in Production)
  3. Pour chaque smell : symptôme + fix
  4. Anti-patterns transversaux (test code is production
     code, no `if/else` in tests, etc.)
  5. Voir aussi (futur `code-quality/code-smells.md`)
  6. Sources
  7. Changelog
- **Longueur cible** : ~180 lignes
- **Tests** : aucun.

### O4 — Écrire `coverage-discipline.md`

- **Frontmatter** : `id: TEST-coverage-discipline`,
  `applies-to: [spdd-reasons-canvas, spdd-generate]`
- **Sources** : Khorikov 2020 (chap. 11), Henry Coles (PIT docs)
- **Sections** :
  1. Définition (coverage ≠ qualité de tests)
  2. **Seuils** : branch coverage ≥ 70% global, ≥ 85% modules
     critiques, ignorer `main()` / generated code / scaffolding
  3. **4 anti-cheat obligatoires** :
     - Mutation testing sur modules critiques (renvoi
       `mutation-testing.md`)
     - Test size limit (> 50 lignes ou > 5 asserts par
       `it`/`@Test` = smell Eager)
     - Forbid patterns lint (tests sans `assert*`/`expect*`,
       `it.skip()` non justifié, magic numbers)
     - Coverage drift gate (CI bloque si coverage descend
       de plus de 3 points sur la PR)
  4. Patterns de gaming connus (smoke test géant, happy path
     only, snapshot regenerate auto)
  5. Que faire en module legacy (caractérisation,
     incrémental)
  6. Voir aussi (`mutation-testing.md`, `test-smells.md`)
  7. Sources
  8. Changelog
- **Longueur cible** : ~180 lignes
- **Tests** : aucun.

### O5 — Écrire `mutation-testing.md`

- **Frontmatter** : `id: TEST-mutation`
- **Sources** : Henry Coles (PIT), Stryker docs, Roland Lichti
- **Sections** :
  1. Définition (mesure qualité des tests, pas du code)
  2. Quand l'introduire (post-coverage standard, modules
     critiques only)
  3. Seuil indicatif : mutation score ≥ 60-70% sur critiques
  4. Traps (lent, mutants équivalents, non substituable à
     architecture/e2e)
  5. Anti-patterns
  6. Voir aussi (`coverage-discipline.md`)
  7. Sources
  8. Changelog
- **Longueur cible** : ~120 lignes
- **Tests** : aucun.

### O6 — Écrire `property-based-testing.md`

- **Frontmatter** : `id: TEST-property-based`
- **Sources** : John Hughes (QuickCheck), David MacIver
  (Hypothesis), Hillel Wayne
- **Sections** :
  1. Définition (invariant vs example-based)
  2. Les 5-6 patterns d'invariants (round-trip, oracle test,
     équivalence de modèles, métamorphique, idempotence,
     commutativité)
  3. Quand l'utiliser (parsers, sérialisation, structures
     algorithmiques, math)
  4. Quand éviter (I/O, business workflow, GUI)
  5. Discipline shrinking + reproducible seeds
  6. Anti-patterns
  7. Voir aussi
  8. Sources
  9. Changelog
- **Longueur cible** : ~140 lignes
- **Tests** : aucun.

### O7 — Écrire `contract-testing.md`

- **Frontmatter** : `id: TEST-contract`
- **Sources** : Martin Fowler (Consumer-Driven Contracts,
  2006), Ian Robinson, Pact docs
- **Sections** :
  1. Définition (interface vs implémentation)
  2. 2 styles : consumer-driven (Pact) vs provider-driven
     (schema-first OpenAPI/AsyncAPI)
  3. Décision context-aware (microservices, cross-team)
  4. Versioning, breaking changes, expand-contract
  5. Traps (drift, broker non maintenu, contracts rigides)
  6. Voir aussi (`testing-backend.md`)
  7. Sources
  8. Changelog
- **Longueur cible** : ~140 lignes
- **Tests** : aucun.

### O8 — Écrire `snapshot-testing.md`

- **Frontmatter** : `id: TEST-snapshot`
- **Sources** : Llewellyn Falco (Approval Tests), critique
  Kent C. Dodds, Jest docs
- **Sections** :
  1. Définition (caractérisation, golden output)
  2. Decision tree : quand utiliser (legacy, output stable),
     quand éviter (UI dynamique, métier)
  3. Anti-pattern "regenerate sans review"
  4. Alternative golden-files
  5. Snapshot review en code review
  6. Voir aussi (`testing-frontend.md`)
  7. Sources
  8. Changelog
- **Longueur cible** : ~100 lignes
- **Tests** : aucun.

### O9 — Écrire `testing-frontend.md` (entry-point playbook)

- **Frontmatter** : `id: TEST-frontend`,
  `applies-to: [spdd-reasons-canvas, spdd-generate]`
- **Sources** : Cohn 2009, Spotify Engineering (Honeycomb),
  Kent C. Dodds (Trophy)
- **Sections** :
  1. Définition (UI stateful, browser environment)
  2. **Pyramide adaptée frontend** : présenter les 3
     variantes (Cohn 70/20/10, Honeycomb Spotify, Testing
     Trophy KCD) avec critères de choix par contexte
  3. Anti-pattern "ice-cream cone" (trop d'e2e fragiles)
  4. Spécificités : DOM testing, component vs integration,
     e2e via browser
  5. **Accessibility (a11y)** — 1 paragraphe (OQ2 reco A) :
     WCAG 2.1 AA testable, intégrer en e2e ou component
     (axe-core, pa11y mentionnés en annexe Tools)
  6. **Sub-refs liées** (liste à puces) :
     - test-naming, test-smells, coverage-discipline,
       snapshot-testing, property-based-testing
  7. Exemple concret (UI-001b ou UI-007 du repo yukki)
  8. **Annexe "Tools by ecosystem"** (D-D6) — 1 tableau
     unique avec 1 ligne par stack (Angular, React, Vue),
     renvoi à TEST-002 pour le détail
  9. Voir aussi
  10. Sources
  11. Changelog
- **Longueur cible** : ~250 lignes
- **Tests** : aucun.

### O10 — Écrire `testing-backend.md` (entry-point playbook)

- **Frontmatter** : `id: TEST-backend`,
  `applies-to: [spdd-reasons-canvas, spdd-generate]`
- **Sources** : Cohn 2009, Khorikov 2020
- **Sections** :
  1. Définition (business logic, I/O, APIs)
  2. **Pyramide adaptée backend** : 70/20/10 plus classique,
     justifie pourquoi
  3. Spécificités : business logic, I/O (DB, file, network),
     APIs REST/gRPC, message-driven, workers/jobs
  4. **Sub-refs liées** :
     - test-naming, test-smells, coverage-discipline,
       mutation-testing, property-based-testing,
       contract-testing
  5. Exemple concret (CORE-001 / `internal/artifacts/` du
     repo yukki — story status_test.go avec 8 tests Go)
  6. **Annexe "Tools by ecosystem"** (D-D6) — 1 tableau (Go,
     Java, Python), renvoi TEST-002
  7. Voir aussi
  8. Sources
  9. Changelog
- **Longueur cible** : ~250 lignes
- **Tests** : aucun.

### O11 — Mettre à jour `spdd/methodology/README.md`

- **Module** : `spdd/methodology`
- **Fichier** : `spdd/methodology/README.md` (modif)
- **Comportement** :
  1. Ajouter une section `## Convention de catégorisation par
     cluster` qui explique :
     - 1 cluster = 1 sous-dossier
     - Frontmatter `category: <slug>` (nouveau)
     - "1 ref vit dans 1 dossier" (pas de duplication)
     - Lien vers les futurs clusters anticipés (placeholder)
  2. Ajouter (ou refondre) la section "Refs disponibles" en :
     - **Tableau "Clusters disponibles"** (D-D3) en tête :
       Sous-dossier / Cluster / Statut
     - Ligne "(racine) / story / risk / architecture / 7 refs
       existantes / **stable**"
     - Ligne "`testing/` / qualité des tests / 9 refs / **stable**
       (créé par TEST-001)"
     - Lignes placeholder pour `code-quality/`, `operations/`,
       `communication/`, `process/`, `ai-aware/` (avec statut
       "futur, story <ID>")
  3. Ajouter une section `## Cluster: testing` avec son tableau
     dédié (Ref / Résumé / applies-to) listant les 9 refs.
  4. Garder la section actuelle qui liste les 7 refs racine
     (ne PAS migrer).
  5. La convention en bas du README ("1 ref = 1 technique",
     longueur, frontmatter, etc.) est conservée et enrichie
     pour mentionner le champ `category:` nouveau.
- **Tests** : aucun automatisé. Validation manuelle :
  - section convention présente
  - tableau "Clusters disponibles" complet
  - section "Cluster: testing" liste les 9 nouvelles refs
  - les 7 existantes sont toujours listées dans le tableau
    initial

### O12 — Mettre à jour les commands SPDD

- **Module** : `.claude/commands`
- **Fichiers** :
  - `.claude/commands/spdd-reasons-canvas.md` (modif faible)
  - `.claude/commands/spdd-generate.md` (modif faible)
- **Comportement** :
  - Pour chaque command, dans la section "Méthodologie" ou
    équivalente, ajouter un renvoi explicite aux refs testing :
    "Pour la section `O — Operations` et son sous-champ
    'Tests', se référer à
    [`spdd/methodology/testing/testing-frontend.md`](...)
    ou [`spdd/methodology/testing/testing-backend.md`](...)
    selon le contexte."
  - Diff minimal (1-3 lignes ajoutées) — ne pas refondre la
    structure de la command.
- **Tests** : aucun automatisé. Validation manuelle :
  les liens existent et pointent vers les fichiers créés en
  O9-O10.

### O13 — Mettre à jour les skills SPDD (miroir des commands)

- **Module** : `.github/skills`
- **Fichiers** :
  - `.github/skills/spdd-reasons-canvas/SKILL.md` (modif faible)
  - `.github/skills/spdd-generate/SKILL.md` (modif faible)
- **Comportement** : miroir exact de O12. Si la convention du
  repo est que skills et commands ont du contenu différent,
  adapter (la command sert l'invocation Claude Code, le SKILL
  sert l'autoload). Pour TEST-001, garder le même renvoi
  testué.
- **Tests** : aucun. Validation manuelle.

### O14 — Vérifications finales

- **Module** : transverse
- **Comportement** :
  1. **Audit cohérence** : grep tous les liens internes des 9
     nouvelles refs et du README — vérifier qu'aucun n'est
     mort. `find spdd/methodology/testing -name "*.md" -exec
     grep -l "\[\[" {} \;` ne retourne rien (pas de wiki-links
     malformés).
  2. **Audit frontmatter** : tous les 9 fichiers ont
     `id`, `version`, `status`, `category: testing`,
     `applies-to`, `lang: fr`, `sources`, `created`,
     `updated`. Aucun champ manquant.
  3. **Audit longueur** : `wc -l` sur les 9 fichiers,
     vérifier que les seuils (entry-points 150-300, sub-refs
     80-200) sont respectés.
  4. **Audit catégorisation** : `grep -r "category: testing"
     spdd/methodology/testing/ | wc -l` retourne 9.
  5. **Audit pas de régression** : les 7 refs existantes ont
     leurs frontmatter `created` / `updated` inchangés
     (`git log --oneline -1 spdd/methodology/invest.md` etc.).
- **Tests** : ces audits sont les "tests" de TEST-001 (story
  doc-only, pas de tests Go/TS automatisés à écrire).

---

## N — Norms

- **Markdown propre** : H1 unique pour le titre, H2 pour les
  sections, H3+ pour les sous-sections. Pas de niveau H4 sauf
  cas exceptionnel.
- **Frontmatter YAML** : indentation 2 spaces, listes en
  bullet (`- ...`), strings entre guillemets si caractères
  spéciaux.
- **Liens internes** : chemins relatifs depuis le fichier qui
  contient le lien (`../acceptance-criteria.md` depuis une
  sub-ref vers une ref racine ; `./test-naming.md` entre
  sub-refs).
- **Citations académiques** : format
  "Auteur (Année) — *Titre*" en italique, dans le frontmatter
  `sources:` et inline si nécessaire.
- **Tonalité** : descriptive avec recos claires (cf. OQ5).
  Anti-patterns peuvent être prescriptifs ("ne jamais X").
- **Langue** : français (`lang: fr`). Les noms propres (Cohn,
  Meszaros, Beck, Fowler, etc.) restent originaux. Le
  vocabulaire technique anglo (smell, snapshot, mutation, etc.)
  reste en anglais.
- **Pas de jargon SPDD non-défini** : si une ref référence
  un concept SPDD spécifique (ex. "AC", "Operation", "Safeguard"),
  un lien vers la définition (story / canvas template /
  README SPDD) est requis.
- **Pas de référence framework dans le corps** : les noms
  d'outils (Stryker, Jest, JUnit, Pact, Hypothesis, fast-check,
  etc.) n'apparaissent que dans l'annexe "Tools by ecosystem"
  (entry-points uniquement) avec renvoi à TEST-002.
- **Pas de PII / secrets / liens internes Sopra** dans les
  refs — référentiel public-ready.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas**
> faire.

- **Pas de modification des 7 refs existantes (Invariant I2)**
  - `invest.md`, `acceptance-criteria.md`, `spidr.md`,
    `edge-cases.md`, `risk-taxonomy.md`, `decisions.md`,
    `domain-modeling.md` : leurs frontmatter, leur contenu,
    leur emplacement (racine `spdd/methodology/`) restent
    intacts.
  - Pas de back-port du champ `category:` sur ces 7 refs en
    V1. Ce sera l'objet d'une story future si pertinent.
- **Pas de code applicatif modifié (Invariant I1)**
  - `internal/`, `cmd/`, `frontend/src/`, `wails.json`,
    `main.go`, `go.mod`, `package.json`, etc. : 0 changement.
  - Si une opération génère un import Go ou modifie un .go,
    c'est un bug à signaler.
- **Pas de framework spécifique mentionné dans le corps des
  refs (Invariant I3)**
  - Les noms d'outils (Stryker, Jest, Vitest, JUnit, PIT,
    Pact, Hypothesis, fast-check, etc.) n'apparaissent que
    dans **l'annexe "Tools by ecosystem"** des 2 entry-points
    (`testing-frontend.md`, `testing-backend.md`).
  - Le corps des refs sub-techniques reste 100%
    framework-agnostique.
- **Pas de duplication cross-ref (Invariant I5)**
  - Si un concept est traité dans 2 refs, les sections sont
    courtes et pointent l'une vers l'autre via
    `## Voir aussi`. Pas de copy-paste de paragraphes.
- **Pas de création de la skill `/spdd-tests` (différée)**
  - TEST-001 est doc-only. La skill `/spdd-tests` (étape 6
    SPDD) sera l'objet d'une story dédiée future.
- **Pas de création / modification d'autres clusters**
  - `code-quality/`, `operations/`, `communication/`, etc.
    sont **mentionnés** dans le README comme placeholder, mais
    aucun fichier n'est créé pour ces clusters en V1.
- **Pas de migration des 7 refs existantes**
  - Elles restent à la racine. Une story future fera le
    ménage si besoin.
- **Pas de modification de `spdd/templates/`** ni de
  `spdd/stories/`, `spdd/analysis/`, `spdd/prompts/` (sauf
  les fichiers de cette story).
- **Pas de modification de `wails.json`, `main.go`, `cmd/`**.
- **Tonalité descriptive (Invariant I7)** — pas de "vous
  DEVEZ" généralisé. Les anti-patterns peuvent être
  prescriptifs.
- **Pas de feature flag, pas de retro-compat fictive** — les
  refs sont écrites comme si elles existaient depuis le début,
  pas de "v1 → v2" interne.
- **Pas de tests automatisés écrits** — story doc-only ; les
  refs servent à *informer* les tests futurs, elles ne sont
  pas des tests.
- **Peer review obligatoire avant merge** (OQ8) — pas de
  self-merge sur cette PR.

---

## Changelog

- **2026-05-03 — création** — canvas v1 issu de l'analyse
  TEST-001 reviewed. 8 OQs (story) + 7 D-D (analyse) toutes
  en reco par défaut. 14 Operations livrables (1 mkdir + 7
  sub-refs + 2 entry-points + 1 README + 2 commands + 2
  skills + 1 vérifs). 7 invariants Safeguards.
