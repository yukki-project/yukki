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

## Workflow en 6 étapes

```
exigence métier → /spdd-story → /spdd-analysis → /spdd-reasons-canvas
              → /spdd-generate → /spdd-api-test → tests unitaires
                          ↑                      ↓
                  /spdd-prompt-update     /spdd-sync (refactor pur)
                  (changement de logique)
```

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

## Quand utiliser SPDD

**Adapté** : logique métier complexe, conformité, refactor structuré, features traversant plusieurs modules, méthodologie qui mérite versionning.

**À éviter** : hotfix urgent, spike exploratoire, script jetable, simple bump de dépendance.

## Voir aussi

- [Article SPDD — Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven/)
- [`methodology/README.md`](methodology/README.md) — index des techniques disponibles
- [`templates/`](templates/) — squelettes des artefacts à produire
