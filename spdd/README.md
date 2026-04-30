# SPDD — Structured Prompt-Driven Development

> Adaptation au projet `yukki` de la méthode décrite par [Structured
> Prompt-Driven Development](https://martinfowler.com/articles/structured-prompt-driven/)
> de **martinfowler.com**.

Les **prompts sont des artefacts versionnés** au même titre que le code.
Toute divergence entre l'intention et l'implémentation se corrige **dans le
prompt d'abord**, puis on régénère ou resynchronise le code.

## Arborescence

| Dossier | Contenu | Produit par |
|---|---|---|
| [`stories/`](stories/) | User stories INVEST + Given/When/Then | `/spdd-story` |
| [`analysis/`](analysis/) | Contexte stratégique (concepts, risques, cas limites) | `/spdd-analysis` |
| [`prompts/`](prompts/) | Canvas REASONS — spec exécutable | `/spdd-reasons-canvas`, `/spdd-prompt-update`, `/spdd-sync` |
| [`tests/`](tests/) | Prompts structurés pour les tests unitaires | étape 6 du workflow |
| [`templates/`](templates/) | Squelettes des artefacts ci-dessus | maintenu manuellement |
| [`methodology/`](methodology/) | **Techniques méthodologiques réutilisables** (DDD, STRIDE, BVA, Y-Statement…) référencées par les skills | maintenu manuellement, voir [`methodology/README.md`](methodology/README.md) |

## Convention "skill = procédural, methodology = knowledge"

- **Les skills** (`.claude/commands/spdd-*.md` et
  `.github/skills/spdd-*/SKILL.md`) sont **procéduraux** — ils décrivent les
  étapes d'une commande SPDD et la checklist à respecter.
- **Les techniques méthodologiques** (DDD, STRIDE, Boundary Value Analysis,
  Y-Statement, etc.) **vivent dans [`methodology/`](methodology/)** et sont
  **référencées par lien** depuis les skills.
- **Aucun skill ne redéfinit une technique** — single source of truth,
  traçabilité, réutilisabilité entre commandes.

## Les 7 commandes SPDD

Chaque commande existe en deux formats miroirs synchronisés sur le contenu :
**Claude Code** (`.claude/commands/`) et **GitHub Copilot Skills**
(`.github/skills/<name>/SKILL.md`). Différences strictes : frontmatter
(`user_invocable` vs `user-invocable`), profondeur de chemin relatif, et
mention de subagent (Claude) vs `#codebase` (Copilot).

| Commande | Argument | Rôle | Skill (Claude / Copilot) |
|---|---|---|---|
| `/spdd-story` | `<description libre OU brouillon>` | Étape 1 — produit `spdd/stories/<id>-<slug>.md` | [Claude](../.claude/commands/spdd-story.md) · [Copilot](../.github/skills/spdd-story/SKILL.md) |
| `/spdd-analysis` | `<id-slug>` | Étape 3 — produit `spdd/analysis/<id>-<slug>.md` | [Claude](../.claude/commands/spdd-analysis.md) · [Copilot](../.github/skills/spdd-analysis/SKILL.md) |
| `/spdd-reasons-canvas` | `<id-slug>` | Étape 4 — produit `spdd/prompts/<id>-<slug>.md` (canvas) | [Claude](../.claude/commands/spdd-reasons-canvas.md) · [Copilot](../.github/skills/spdd-reasons-canvas/SKILL.md) |
| `/spdd-generate` | `<id-slug>` | Étape 5 — produit / met à jour le code à partir du canvas | [Claude](../.claude/commands/spdd-generate.md) · [Copilot](../.github/skills/spdd-generate/SKILL.md) |
| `/spdd-api-test` | `<id-slug>` | Étape 5b — produit `scripts/spdd/<id>-<slug>.sh` (curl + jq) | [Claude](../.claude/commands/spdd-api-test.md) · [Copilot](../.github/skills/spdd-api-test/SKILL.md) |
| `/spdd-prompt-update` | `<id-slug> <description du changement>` | Boucle logique — met à jour le canvas, status `implemented → reviewed` | [Claude](../.claude/commands/spdd-prompt-update.md) · [Copilot](../.github/skills/spdd-prompt-update/SKILL.md) |
| `/spdd-sync` | `<id-slug>` | Boucle refactor — met à jour le canvas pour refléter un refactor pur, status `implemented → synced` | [Claude](../.claude/commands/spdd-sync.md) · [Copilot](../.github/skills/spdd-sync/SKILL.md) |

> L'étape 2 (clarification analytique) est **humaine** et conversationnelle — pas de commande SPDD dédiée.

## Workflow visuel

```
exigence métier brute
     │
     ▼ /spdd-story
spdd/stories/<id>-<slug>.md
     │
     ▼ clarification humaine (étape 2)
     │
     ▼ /spdd-analysis
spdd/analysis/<id>-<slug>.md
     │
     ▼ revue humaine
     │
     ▼ /spdd-reasons-canvas
spdd/prompts/<id>-<slug>.md  ← source de vérité
     │
     ▼ revue humaine
     │
     ▼ /spdd-generate
src/...  + tests + (si REST) /spdd-api-test
     │
     ▼ revue du diff
     │
     ├─ logique change   → /spdd-prompt-update + /spdd-generate ciblé
     └─ refactor pur     → édit code + /spdd-sync
```

## Exemple complet — META-001 (cycle + boucle)

La story [`META-001-extract-methodology-references`](stories/META-001-extract-methodology-references.md) sert d'exemple complet. C'est elle qui a créé le dossier [`methodology/`](methodology/) en dogfoodant SPDD.

### Cycle initial — création + livraison v1

```bash
# Étape 1 — Story
/spdd-story "extraire les techniques méthodologiques (DDD, STRIDE, BVA, Y-Statement) hors des skills vers spdd/methodology/ pour servir /spdd-analysis"
# → spdd/stories/META-001-extract-methodology-references.md (status: draft)

# Étape 2 — Clarification (HUMAIN, dialogue, pas de commande)
# Résolution des Open Questions : version=entier, index README=oui
# → status: draft → reviewed

# Étape 3 — Analyse stratégique
/spdd-analysis META-001-extract-methodology-references
# → spdd/analysis/META-001-extract-methodology-references.md (status: draft)

# (REVUE HUMAINE de l'analyse)
# Affinage : drop 2 risques mous, ajout du Guide de style des refs
# → status: draft → reviewed

# Étape 4 — Canvas REASONS
/spdd-reasons-canvas META-001-extract-methodology-references
# → spdd/prompts/META-001-extract-methodology-references.md

# (REVUE HUMAINE du canvas)
# → status: draft → reviewed (ou accepted)

# Étape 5 — Génération
/spdd-generate META-001-extract-methodology-references
# → 4 refs dans spdd/methodology/ (v1)
# → spdd/methodology/README.md (index)
# → maj .claude/commands/spdd-analysis.md (référence les refs)
# → maj .github/skills/spdd-analysis/SKILL.md (miroir Copilot)
# → création spdd/README.md (ce fichier !)
# → status canvas: reviewed → implemented (changelog v1.1)
```

### Boucle de maintenance — divergence post-livraison

Constat humain : *"les exemples des refs doivent être yukki uniquement, pas portail"*. C'est un changement des **Norms** du canvas → on choisit `/spdd-prompt-update` (logique change) plutôt que `/spdd-sync` (refactor pur).

```bash
# Étape 5b — Prompt-update du canvas
/spdd-prompt-update META-001-extract-methodology-references "Norms et DoD : exemples yukki uniquement, portail interdit dans les refs publiées. Touche O1, O2, O3."
# → canvas mis à jour (Norms + Operations O1/O2/O3 + DoD)
# → status canvas: implemented → reviewed (signale les refs comme stale)
# → changelog v1.2

# Étape 5c — Régénération ciblée
/spdd-generate META-001-extract-methodology-references
# → la commande détecte status=reviewed et régénère les Operations modifiées
# → 3 refs passent en v2 (domain-modeling, risk-taxonomy, edge-cases)
# → 1 ref inchangée (decisions.md, déjà yukki-native)
# → status canvas: reviewed → implemented (changelog v1.3)
```

### Bilan

- **6 invocations** de slash commands (`/spdd-story`, `/spdd-analysis`, `/spdd-reasons-canvas`, `/spdd-generate` ×2, `/spdd-prompt-update`)
- **3 étapes humaines** (clarification + 2 revues)
- **8 commits Git** versionnés avec préfixes conventionnels (`feat(spdd):`, `chore(spdd):`, `prompt-update(spdd):`, `generate(spdd):`, `review(spdd):`)
- **Aucune édition de code hors du cycle SPDD**

Cette même séquence s'applique à toute story du projet — c'est le contrat SPDD.

## Convention de nommage

`<id>-<slug>.md` partagé entre les artefacts d'une même feature
(story / analysis / prompt / tests).

| Préfixe `<id>` | Module dominant |
|---|---|
| `CORE-<n>` | engine / commandes principales du CLI |
| `UI-<n>` | canvas editor graphique |
| `INT-<n>` | intégrations (providers, MCP, etc.) |
| `DOC-<n>` | documentation |
| `META-<n>` | méthodologie SPDD elle-même (templates, skills, refs) |

## Cycle de vie des artefacts (status)

```
draft → reviewed → accepted → implemented → synced
                                  │
                                  └─ (back-edges)
                                     /spdd-prompt-update : status redescend à `reviewed`
                                     /spdd-sync           : status passe à `synced`
```

Toute transition arrière (`implemented → reviewed`) ajoute une entrée dans la
section `## Changelog` du canvas, qui trace qui a changé quoi quand.

## Quand utiliser SPDD

**Adapté** : logique métier complexe, conformité, refactor structuré, features traversant plusieurs modules, méthodologie qui mérite versionning.

**À éviter** : hotfix urgent, spike exploratoire, script jetable, simple bump de dépendance.

## Voir aussi

- [Article SPDD — Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven/)
- [**`GUIDE.md`**](GUIDE.md) — guide pédagogique complet en français (pourquoi SPDD, comparaison Kiro/Spec-Kit/Tessl, risques 2026, schémas explicatifs, extensions yukki)
- [`methodology/README.md`](methodology/README.md) — index des techniques disponibles
- [`templates/`](templates/) — squelettes des artefacts à produire
- [`stories/META-001-extract-methodology-references.md`](stories/META-001-extract-methodology-references.md) — l'exemple complet
- [`TODO.md`](TODO.md) — backlog SPDD (stories à venir + état)
- [Root `CLAUDE.md`](../CLAUDE.md) — guide pour un agent qui débarque dans le repo
