# spdd/methodology/

Bibliothèque versionnée de **techniques méthodologiques** SPDD. Chaque
technique vit dans un fichier autonome et est référencée par les skills qui
la consomment. **Aucune technique n'est inlinée dans un skill.**

## Convention de catégorisation par cluster

À partir de TEST-001, le dossier `spdd/methodology/` adopte une
**organisation par cluster thématique** :

- **1 cluster = 1 sous-dossier** (`testing/`, futurs `code-quality/`,
  `operations/`, `communication/`, `process/`, `ai-aware/`)
- **Frontmatter `category: <slug>`** sur chaque ref (= nom du
  sous-dossier parent), pour cohérence machine-lisible
- **1 ref vit dans 1 dossier** — pas de duplication. Si une ref
  appartient à 2 clusters logiques, elle vit dans son cluster
  dominant et les autres la référencent via `## Voir aussi`
- **Migration progressive** : les 7 refs racine historiques (INVEST,
  AC, SPIDR, edge-cases, risk-taxonomy, decisions, domain-modeling)
  **restent à la racine** en V1 ; pas de back-port `category:`
  obligatoire en V1. Une story future fera le ménage si besoin.

## Clusters disponibles

| Sous-dossier | Cluster | Statut | Story |
|---|---|---|---|
| (racine) | story / risk / architecture (mixte historique) | **stable** | META-001, META-002 |
| [`testing/`](testing/) | qualité des tests (frontend + backend) | **stable** | TEST-001 |
| `code-quality/` | qualité du code applicatif (review, smells prod, refactoring catalog, tidy first, cognitive complexity) | futur | CODEQ-001 |
| `operations/` | runtime / déploiement (feature flags, observability, migrations, rollback, versioning) | futur | OPS-001 |
| `communication/` | docs et collaboration (conventional commits, PR description, README, Diátaxis) | futur | COMM-001 |
| `process/` | flux de travail (trunk-based dev, estimation, retrospective, pair / mob) | futur | PROC-001 |
| `ai-aware/` | testing IA-spécifique (LLM evals, prompt regression, agent testing, drift monitoring) | futur | TEST-003 |

## Refs racine (story / risk / architecture)

| Ref | Résumé | applies-to |
|---|---|---|
| [acceptance-criteria.md](acceptance-criteria.md) | Formulation des AC : Given/When/Then, style déclaratif, mots bannis, granularité 3-5 | `spdd-story`, `spdd-prompt-update`, `spdd-reasons-canvas` |
| [decisions.md](decisions.md) | Format Y-Statement pour l'approche stratégique | `spdd-analysis`, `spdd-reasons-canvas` |
| [domain-modeling.md](domain-modeling.md) | Identifier entités, value objects, invariants, intégrations et events d'une feature (DDD tactique allégé) | `spdd-analysis`, `spdd-reasons-canvas` |
| [edge-cases.md](edge-cases.md) | BVA + EP + checklist 7 catégories pour identifier les cas limites | `spdd-analysis`, `spdd-reasons-canvas` |
| [invest.md](invest.md) | Les 6 critères de qualité d'une user story (Independent / Negotiable / Valuable / Estimable / Small / Testable) | `spdd-story`, `spdd-analysis` |
| [risk-taxonomy.md](risk-taxonomy.md) | 6 catégories de risques + STRIDE en sous-cadre sécurité | `spdd-analysis`, `spdd-reasons-canvas`, `spdd-prompt-update` |
| [spidr.md](spidr.md) | SPIDR — 5 axes de découpage (Paths / Interfaces / Data / Rules / Spike) quand "Small" d'INVEST est cassé | `spdd-story`, `spdd-prompt-update` |

## Cluster: testing

Refs sur la qualité des tests (frontend + backend). Langage-agnostiques —
les patterns valent pour Go, Java, Python, TS, etc. L'outillage concret
par écosystème est traité dans une **story sœur TEST-002** (différée).

| Ref | Résumé | applies-to |
|---|---|---|
| [testing/testing-frontend.md](testing/testing-frontend.md) | **Playbook frontend** — pyramide adaptée (Cohn / Honeycomb / Trophy), arbitrage par contexte, sub-refs liées, annexe outils | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/testing-backend.md](testing/testing-backend.md) | **Playbook backend** — pyramide 70/20/10, spécificités I/O / DB / messaging / APIs, annexe outils | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/test-naming.md](testing/test-naming.md) | Conventions de nommage : G/W/T, AAA, MethodName_State_Expected (Osherove). Heuristiques par stack. Anti-patterns | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/test-smells.md](testing/test-smells.md) | Catalogue Meszaros : 11 smells fréquents (Fragile, Slow, Eager, Lazy, Mystery Guest, etc.) avec symptôme + fix | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/coverage-discipline.md](testing/coverage-discipline.md) | Seuils 70% / 85% critiques. **4 anti-cheat obligatoires** (mutation, test size limit, forbid patterns, drift gate). Patterns de gaming | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/mutation-testing.md](testing/mutation-testing.md) | Mesurer la qualité des tests via injection de mutants. Quand l'introduire (modules critiques), seuil 60-70%, traps | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/property-based-testing.md](testing/property-based-testing.md) | Invariants vs example-based. 7 patterns (round-trip, oracle, équivalence, métamorphique, idempotence, commutativité, identité) | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/contract-testing.md](testing/contract-testing.md) | Consumer-driven (Pact) vs schema-first (OpenAPI). Décision context-aware. Versioning, expand-contract | `spdd-reasons-canvas`, `spdd-generate` |
| [testing/snapshot-testing.md](testing/snapshot-testing.md) | Decision tree : caractérisation legacy / output stable. Anti-pattern "regenerate sans review" | `spdd-reasons-canvas`, `spdd-generate` |

## Convention

- **1 ref = 1 technique** d'usage transverse aux skills
- **Frontmatter normalisé** (`id`, `version`, `status`, `category`, `applies-to`, `lang`, `sources`)
- **Longueur cible** : entry-points playbook 150-300 lignes ; sub-refs techniques 80-200 lignes ; refs racine 80-150 lignes
- **Versionning** : entier monotone par fichier, tracé via `## Changelog`
- **Langue** : français en v1 (`lang: fr`) ; internationalisation future possible
- **Skills** ne redéfinissent jamais une technique : ils la **référencent par lien**
- **Naming** : par technique propre (nom propre comme `spidr`, `invest`) ou par sujet précis si plusieurs techniques convergent (`edge-cases`, `acceptance-criteria`) ; pas d'abréviation jargon
- **Sous-dossier** : kebab-case anglais (`testing`, `code-quality`, `ai-aware`)
- **Refs avec overlap** : section `## Voir aussi` en footer (liste à puces simple), pas de duplication de contenu

Voir [`spdd/README.md`](../README.md) pour la philosophie générale SPDD.
