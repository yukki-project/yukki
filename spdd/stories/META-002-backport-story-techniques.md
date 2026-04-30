---
id: META-002
slug: backport-story-techniques
title: Extraire SPIDR / INVEST / formulation des AC depuis /spdd-story vers spdd/methodology/
status: draft
created: 2026-04-30
updated: 2026-04-30
owner: Thibaut Sannier
modules:
  - spdd/methodology
  - .claude/commands/spdd-story.md
  - .github/skills/spdd-story/SKILL.md
  - spdd/methodology/README.md
---

# Extraire SPIDR / INVEST / formulation des AC depuis /spdd-story vers spdd/methodology/

## Background

META-001 a posé la convention "skill = procédural, methodology = knowledge"
mais n'a refondé que `/spdd-analysis`. Le skill `/spdd-story` contient encore
**inline** trois techniques méthodologiques : **SPIDR** (découpage de stories),
**INVEST** (critères de qualité d'une story), et les **règles de formulation
des AC** (Given/When/Then, déclaratif vs impératif, mots bannis, granularité
3-5). Cette story extrait ces 3 techniques vers `spdd/methodology/` et met à
jour `/spdd-story` pour qu'il les référence par lien — supprimant ainsi le
dernier inlining résiduel.

## Business Value

- **Cohérence** avec la convention META-001 : aucun skill ne redéfinit une
  technique
- **Réutilisabilité** : SPIDR sera référencé par `/spdd-prompt-update` (quand
  un changement révèle un découpage manqué), INVEST par `/spdd-analysis`
  (signaux d'escalade vers la story), formulation des AC par
  `/spdd-reasons-canvas` (la DoD du canvas reformule les AC)
- **Précédent reproductible** : la procédure d'extraction (canvas + 3 refs +
  maj skill) sert de patron pour tout futur enrichissement de skill
- **Skill `/spdd-story` allégé** : la procédure devient lisible, les
  techniques détaillées vivent ailleurs

## Scope In

- Création de 3 nouvelles refs dans `spdd/methodology/` :
  - `spidr.md` — SPIDR (Paths / Interfaces / Data / Rules / Spike) +
    signaux d'alerte + stratégies de découpage + anti-patterns
  - `invest.md` — les 6 critères Independent / Negotiable / Valuable /
    Estimable / Small / Testable + heuristiques d'application
  - `acceptance-criteria.md` — règles Given/When/Then + style déclaratif vs
    impératif + mots et tournures bannis + granularité 3-5
- Frontmatter normalisé identique à celui des refs META-001
  (`id`, `title`, `version: 1`, `status: published`, `applies-to`,
  `lang: fr`, `created`, `updated`, `sources`)
- Mise à jour du skill `/spdd-story` dans ses **deux formats** (Claude +
  Copilot) pour **référencer** ces 3 refs au lieu d'inliner
- Mise à jour de `spdd/methodology/README.md` (index) pour ajouter les 3
  refs avec leur résumé et leur `applies-to`

## Scope Out

- Backport des techniques d'autres skills (`/spdd-reasons-canvas`,
  `/spdd-generate`, `/spdd-api-test`, `/spdd-prompt-update`, `/spdd-sync`)
  — stories dédiées au moment où chaque skill est enrichi
- Vérification automatisée que les skills n'inlinent plus de méthodologie
  (script CI ou hook pre-commit) → reste META-003
- Nouvelle technique méthodologique non présente actuellement dans
  `/spdd-story`

## Acceptance Criteria

### AC1 — Les 3 nouvelles refs existent et sont auto-suffisantes

- **Given** un développeur consulte `spdd/methodology/` après ce changement
- **When** il liste le contenu du dossier
- **Then** il y trouve les 3 nouveaux fichiers (`spidr.md`,
  `invest.md`, `acceptance-criteria.md`), chacun lisible indépendamment, avec un
  frontmatter complet conforme à la convention META-001 et au moins une
  source bibliographique citée par fichier

### AC2 — Le skill `/spdd-story` référence sans inliner

- **Given** un agent exécute le skill `/spdd-story`
- **When** il atteint l'étape de formulation des AC, l'évaluation INVEST,
  ou la décision de découpage
- **Then** le skill l'invite à consulter
  `spdd/methodology/<technique>.md` via un lien markdown cliquable, et le
  skill ne redéfinit pas la technique dans son corps

### AC3 — Les deux formats Claude et Copilot restent synchronisés

- **Given** le skill `/spdd-story` existe en deux formats
  (`.claude/commands/spdd-story.md` et `.github/skills/spdd-story/SKILL.md`)
- **When** un contributeur compare les deux fichiers
- **Then** les deux pointent vers les mêmes refs `spdd/methodology/*.md`,
  et les seules différences sont les conventions de chaque format
  (frontmatter, chemins relatifs, mention `subagent Explore` vs `#codebase`)

### AC4 — L'index `methodology/README.md` reflète les ajouts

- **Given** un contributeur consulte `spdd/methodology/README.md`
- **When** il regarde la table des refs disponibles
- **Then** les 3 nouvelles refs apparaissent avec un résumé d'une phrase
  chacune et leur champ `applies-to` correctement renseigné

## Open Questions

- [x] **Granularité d'INVEST** : ~~ref autonome ou sous-cadre de
  `spidr.md` ?~~ → **`invest.md` autonome** (3 refs au final).
  Justification : INVEST a une portée plus large que SPIDR — il sert aussi
  en escalade `/spdd-analysis` (signal "story qui ne respecte pas INVEST"
  → retour `/spdd-story`). Cohérent avec "1 ref = 1 technique transverse".
- [x] **Anti-patterns de découpage** : ~~dans `spidr.md` ou dans le
  skill ?~~ → **dans `spidr.md`**. Justification : les anti-patterns
  décrivent *comment appliquer SPIDR correctement*, c'est de la
  méthodologie, pas de la procédure du skill. Le skill reste procédural
  pur ("évaluer SPIDR via `spidr.md`, scinder si signaux d'alerte").

## Notes

- Référentiel de méthode SPDD :
  <https://martinfowler.com/articles/structured-prompt-driven/>
- Templates de référence : [`templates/story.md`](../templates/story.md),
  [`templates/analysis.md`](../templates/analysis.md),
  [`templates/canvas-reasons.md`](../templates/canvas-reasons.md)
- Story sœur : [META-001](META-001-extract-methodology-references.md) —
  établit la convention que META-002 reproduit
- Story consommatrice : la prochaine invocation de `/spdd-story` qui
  bénéficiera des refs (ex. CORE-002, INT-001, DOC-001…)
- Tests : revue manuelle uniquement (pas d'AC quantitative). Vérifications :
  - `grep -E "SPIDR|INVEST|Given/When/Then" .claude/commands/spdd-story.md`
    ne doit pas matcher en dehors d'un contexte avec lien vers la ref
  - `yq` parse correctement le frontmatter des 3 nouvelles refs

### Découpage SPIDR — analyse et décision

Story à 4 AC, donc dans le sweet spot 3-5. Pas de signal d'alerte SPIDR.

| Axe | Application | Verdict |
|---|---|---|
| **P** — Paths | n/a — un seul chemin (extraction + référencement) | n/a |
| **I** — Interfaces | les 3 refs sont 3 fichiers indépendants, mais elles forment un ensemble cohérent (toutes consommées par `/spdd-story`) | n/a — pas pertinent de scinder |
| **D** — Data | n/a | n/a |
| **R** — Rules | possible : "2 refs d'abord, la 3e ensuite" | inutile, le coût de chaque ref est faible et l'ensemble ne livre de valeur qu'entier |
| **S** — Spike | n/a — la web research a déjà servi de spike pour META-001, les sources sont identiques | n/a |

**Décision** : garder en l'état. Les 3 refs forment l'ensemble cohérent
nécessaire à l'enrichissement complet de `/spdd-story` ; les scinder
créerait des états intermédiaires où le skill référence des refs
inexistantes.

### Architecture pressentie (indicatif)

> Indicatif pour `/spdd-analysis`. Le canvas REASONS section *Operations*
> tranchera la structure définitive.

- `spdd/methodology/spidr.md`
- `spdd/methodology/invest.md` (sous réserve de la résolution de l'OQ
  granularité)
- `spdd/methodology/acceptance-criteria.md`
- Mise à jour de `.claude/commands/spdd-story.md` (suppression de l'inlining,
  ajout de liens vers les 3 refs)
- Mise à jour de `.github/skills/spdd-story/SKILL.md` (miroir Copilot)
- Mise à jour de `spdd/methodology/README.md` (index, +3 lignes)

### Sources bibliographiques pressenties

À citer dans les refs (déjà identifiées par la web research de META-001) :

- INVEST — [Agile Alliance](https://www.agilealliance.org/glossary/invest/)
  (Bill Wake, 2003 ; popularisé par Mike Cohn, *User Stories Applied*, 2004)
- SPIDR — [Mountain Goat Software / Mike Cohn](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories)
- Given/When/Then — [bliki Martin Fowler](https://martinfowler.com/bliki/GivenWhenThen.html),
  [Cucumber better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/)
- Granularité AC — [Parallel HQ — *What Is Acceptance Criteria*](https://www.parallelhq.com/blog/what-acceptance-criteria)

### Décisions de scope verrouillées

- **Périmètre** : `/spdd-story` uniquement. Autres skills feront l'objet de
  leurs propres stories (ex. META-004 pour `/spdd-generate`).
- **Préfixe** : `META-` (cohérent avec META-001 et META-003 prévue).
- **Convention** : même structure de frontmatter que les refs META-001
  (`version` entier, `## Changelog`, `lang: fr`, `applies-to` liste de strings).
- **Examples** : exclusivement issus du projet `yukki` (cf. règle resserrée
  par META-001 v1.2 — pas de portail).
