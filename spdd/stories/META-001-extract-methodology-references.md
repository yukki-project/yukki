---
id: META-001
slug: extract-methodology-references
title: Extraire les références méthodologiques des skills vers spdd/methodology/
status: draft
created: 2026-04-30
updated: 2026-04-30
owner: Thibaut Sannier
modules:
  - spdd/methodology
  - .claude/commands/spdd-analysis.md
  - .github/skills/spdd-analysis/SKILL.md
  - spdd/README.md
---

# Extraire les références méthodologiques des skills vers spdd/methodology/

## Background

Les skills SPDD (`/spdd-story` enrichi récemment) commencent à embarquer
*inline* des techniques méthodologiques (SPIDR, INVEST, formulation des AC).
Avant d'enrichir `/spdd-analysis` avec quatre techniques supplémentaires (DDD
tactique, taxonomie de risques, BVA/EP, Y-Statements), on extrait toute cette
connaissance dans un dossier `spdd/methodology/` réutilisable. Les skills
deviennent **procéduraux** (étapes + checklist), la **connaissance** vit
ailleurs et est référencée par lien.

## Business Value

- **Single source of truth** pour chaque technique méthodologique : si STRIDE
  ou BVA évolue, on touche un seul fichier au lieu de N skills
- **Réutilisabilité** : la taxonomie de risques sert à `/spdd-analysis` mais
  aussi à `/spdd-reasons-canvas` (section Safeguards) et à `/spdd-prompt-update`
  (impact d'un changement)
- **Skills allégés** : la procédure d'exécution reste lisible, sans noyer
  l'agent ou le contributeur dans la théorie
- **Cohérence avec le pattern canvas** : les Operations d'un canvas REASONS
  référencent les Norms, elles ne les redéfinissent pas — on applique le même
  principe au niveau méta (skills ↔ techniques)

## Scope In

- Création du dossier `spdd/methodology/` à la racine du repo
- Quatre fichiers de référence, chacun couvrant une technique :
  - **`domain-modeling.md`** — DDD tactique allégé (Entity / Value Object /
    Invariant / Integration / Domain Event), avec heuristiques d'identification
  - **`risk-taxonomy.md`** — Six catégories de risques (Sécurité / Performance
    / Reliability / Opérationnel / Intégration / Data / Compatibilité) avec
    STRIDE en sous-cadre pour la branche Sécurité
  - **`edge-cases.md`** — Boundary Value Analysis + Equivalence Partitioning,
    plus une checklist en sept catégories (boundaries, classes d'équivalence,
    null/empty, concurrence, failure modes, scale, security)
  - **`decisions.md`** — Format Y-Statement adapté pour la section *Approche
    stratégique* d'une analyse, en français
- **Front-matter normalisé** sur chaque fichier : `id`, `title`, `version`,
  `status`, `applies-to` (liste des skills consommateurs), `created`,
  `updated`, `sources` (liens bibliographiques)
- Mise à jour du skill `/spdd-analysis` (versions Claude **et** Copilot) pour
  **référencer** les quatre fichiers aux endroits pertinents au lieu d'inliner
  les techniques
- Mention courte dans `spdd/README.md` qui annonce le dossier `methodology/`
  et la règle de séparation "skill = procédure, methodology = technique"

## Scope Out

- Backport des techniques déjà inlinées dans `/spdd-story` (SPIDR, INVEST,
  formulation des AC) vers `spdd/methodology/` → **META-002**
- Vérification automatisée que les skills n'inlinent plus de méthodologie
  (script CI ou hook pre-commit) → **META-003** ou ultérieur
- Refs avancées : Event Storming complet, ATAM, FMEA, threat modeling diagrams
  → post-MVP
- Refs pour les autres skills (`/spdd-reasons-canvas`, `/spdd-generate`, etc.)
  → stories dédiées au moment où chaque skill est enrichi

## Acceptance Criteria

### AC1 — Les quatre refs existent et sont auto-suffisantes

- **Given** un développeur qui adopte SPDD sur un nouveau projet et clone le
  repo `yukki`
- **When** il ouvre le dossier `spdd/methodology/`
- **Then** il y trouve les quatre fichiers `domain-modeling.md`,
  `risk-taxonomy.md`, `edge-cases.md`, `decisions.md`, chacun lisible
  indépendamment, avec un front-matter complet (id, title, version, status,
  applies-to, created, updated, sources) et au moins une source bibliographique
  citée par fichier

### AC2 — Le skill `/spdd-analysis` référence sans inliner

- **Given** un agent qui exécute le skill `/spdd-analysis` sur une story
- **When** il atteint l'étape de modélisation domaine, d'identification des
  risques, d'énumération des cas limites, ou de rédaction de l'approche
  stratégique
- **Then** le skill l'invite à consulter `spdd/methodology/<technique>.md`
  via un lien markdown cliquable, et le skill **ne redéfinit pas** la
  technique dans son corps

### AC3 — Les deux formats Claude et Copilot restent synchronisés

- **Given** le skill `/spdd-analysis` existe en deux formats
  (`.claude/commands/spdd-analysis.md` et `.github/skills/spdd-analysis/SKILL.md`)
- **When** un contributeur compare les deux fichiers
- **Then** les deux pointent vers les mêmes refs `spdd/methodology/*.md`, et
  les seules différences sont les conventions de chaque format (frontmatter
  `user_invocable` vs `user-invocable`, chemins relatifs `../../` vs
  `../../../`, mention de `Explore subagent` vs `#codebase`)

### AC4 — La convention est documentée

- **Given** un contributeur lit `spdd/README.md`
- **When** il cherche où vivent les techniques de la méthodologie (DDD,
  STRIDE, BVA, etc.)
- **Then** il y trouve une mention de `spdd/methodology/` avec la règle
  explicite : *"les skills sont procéduraux, les techniques vivent dans
  `methodology/` et sont référencées par lien — pas d'inlining"*

## Open Questions

- [ ] **Format du champ `version`** dans le front-matter : `v1.0` (semver),
  `1` (entier simple), ou la date de dernière modif majeure ? — affecte la
  lisibilité d'un éventuel changelog en cas d'évolution d'une technique
- [ ] **Index `spdd/methodology/README.md`** : faut-il un fichier d'index qui
  liste les refs disponibles avec leur résumé, ou la convention de nommage par
  fichier suffit ? — affecte la découverte par un nouveau contributeur

## Notes

- Référentiel de méthode SPDD :
  <https://martinfowler.com/articles/structured-prompt-driven/>
- Templates de référence : [`templates/story.md`](../templates/story.md),
  [`templates/analysis.md`](../templates/analysis.md),
  [`templates/canvas-reasons.md`](../templates/canvas-reasons.md)
- Story consommatrice immédiate : aucune feature spécifique, mais
  `/spdd-analysis` enrichi sera consommé dès la prochaine analyse stratégique
  (probablement sur CORE-001)
- Tests : revue manuelle uniquement (pas d'AC quantitative pour cette story).
  La testabilité automatique (vérifier qu'aucun skill ne contient les chaînes
  "STRIDE", "BVA", "DDD", etc.) est portée par **META-003**.

### Découpage SPIDR — analyse et décision

Story à 4 AC, donc dans le sweet spot 3-5. Pas de signal d'alerte SPIDR.

| Axe | Application | Verdict |
|---|---|---|
| **P** — Paths | n/a | une seule branche : extraction + référencement |
| **I** — Interfaces | les 4 refs sont 4 fichiers indépendants, mais ils forment un ensemble cohérent (un seul commit logique) | n/a — pas pertinent de scinder |
| **D** — Data | n/a | n/a |
| **R** — Rules | possible : "3 refs d'abord, decisions.md ensuite" | inutile, le coût de chaque ref est faible |
| **S** — Spike | n/a — la web research a déjà servi de spike | n/a |

**Décision** : garder en l'état. Les 4 refs forment un ensemble cohérent
nécessaire à l'enrichissement du skill `/spdd-analysis` ; les scinder créerait
des états intermédiaires où le skill référence des refs inexistantes.

### Architecture pressentie (indicatif)

> Indicatif pour `/spdd-analysis`. Le canvas REASONS section *Operations*
> tranchera la structure définitive.

- `spdd/methodology/domain-modeling.md`
- `spdd/methodology/risk-taxonomy.md`
- `spdd/methodology/edge-cases.md`
- `spdd/methodology/decisions.md`
- Mise à jour de `.claude/commands/spdd-analysis.md`
- Mise à jour de `.github/skills/spdd-analysis/SKILL.md`
- Mention dans `spdd/README.md` (≤ 5 lignes)

### Sources bibliographiques pressenties

À citer dans les refs de méthodologie :

- DDD — [Wikipedia](https://en.wikipedia.org/wiki/Domain-driven_design),
  [Microsoft Learn intro DDD](https://learn.microsoft.com/en-us/archive/msdn-magazine/2009/february/best-practice-an-introduction-to-domain-driven-design)
- STRIDE / OWASP — [OWASP Threat Modeling Process](https://owasp.org/www-community/Threat_Modeling_Process),
  [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- BVA / EP — [Guru99 BVA + EP](https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html),
  [Aqua Cloud edge case testing](https://aqua-cloud.io/edge-cases-in-software-testing/)
- ADR / Y-Statements — [adr.github.io](https://adr.github.io/),
  [Nygard original post](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
  [Fowler bliki ADR](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)

### Décisions de scope verrouillées

- **Périmètre** : 4 techniques nécessaires à `/spdd-analysis` uniquement.
  Le backport des techniques de `/spdd-story` est hors scope (META-002).
- **Nom du dossier** : `spdd/methodology/` (validé en discussion 2026-04-30)
- **Granularité** : 1 fichier = 1 technique (pas de regroupement par step)
- **Front-matter** : normalisé sur tous les fichiers de méthodologie
- **Préfixe d'ID story** : `META-` pour toute story qui touche la méthodologie
  SPDD elle-même (skills, templates, refs, scaffolding)
