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
| [`inbox/`](inbox/) | Inbox — capture brute en discovery zone (META-005) | manuel / `INBOX-001` à venir |
| [`stories/`](stories/) | User stories INVEST + Given/When/Then | `/yukki-story` |
| [`epics/`](epics/) | Epics — regroupements thématiques de stories (META-005) | manuel / `EPIC-001` à venir |
| [`roadmap/`](roadmap/) | Roadmap — vue projection Now/Next/Later (META-005) | manuel / `ROADMAP-001` à venir |
| [`analysis/`](analysis/) | Contexte stratégique (concepts, risques, cas limites) | `/yukki-analysis` |
| [`prompts/`](prompts/) | Canvas REASONS — spec exécutable | `/yukki-reasons-canvas`, `/yukki-prompt-update`, `/yukki-sync` |
| [`tests/`](tests/) | Prompts structurés pour les tests unitaires | étape 6 du workflow |
| [`templates/`](templates/) | Squelettes des artefacts ci-dessus | maintenu manuellement |
| [`methodology/`](methodology/) | **Techniques méthodologiques réutilisables** (DDD, STRIDE, BVA, Y-Statement…) référencées par les skills | maintenu manuellement, voir [`methodology/README.md`](methodology/README.md) |

## Hiérarchie discovery → delivery (META-005)

yukki étend la méthode SPDD au-delà du seul niveau "story" avec une
chaîne complète à 4 niveaux :

```
┌─────────────────┐
│  Inbox          │  ← Discovery zone, capture brute
│  faible friction│     PAS sur la roadmap
└────────┬────────┘
         │  qualification humaine : "ça vaut le coup ?"
         ▼
   Promotion :
   ┌──────────────────────┬──────────────────────┐
   │                      │                      │
 atomique             gros chantier          rejetée
   │                      │
   ▼                      ▼
┌─────────┐          ┌─────────┐
│ Story   │          │  Epic   │  ← Committed work
│ (INVEST)│          │         │     parents de stories
└─────────┘          └────┬────┘
                          │ décomposition INVEST
                          ▼
                     ┌─────────┐
                     │ Stories │
                     └─────────┘
```

La **Roadmap** n'est **pas** un niveau hiérarchique : c'est une **vue
projection** (Now / Next / Later) des Epics et Stories standalone
engagés. Les Inbox **n'apparaissent pas** sur la roadmap (zone
discovery, séparée de l'engagement).

| Artefact | Rôle | Lifecycle |
|---|---|---|
| **Inbox** | Capture brute (discovery zone) | `unsorted → promoted (story\|epic) ou rejected` |
| **Epic** | Regroupement thématique de stories liées | `draft → in-progress → mature → done` |
| **Story** | Niveau actuel SPDD (INVEST), inchangé | `draft → reviewed → implemented` |
| **Roadmap** | Vue projection Now/Next/Later | vivante (mise à jour continue) |

`META-005` pose le **scaffolding fondateur** (3 nouveaux types
reconnus + arbo + templates + doc). Les UX détaillées (capture
rapide, kanban, transitions) sont portées par les stories enfants
`INBOX-001/002`, `EPIC-001`, `ROADMAP-001/002`.

## Convention "skill = procédural, methodology = knowledge"

- **Les skills** (`.claude/commands/yukki-*.md` et
  `.github/skills/yukki-*/SKILL.md`) sont **procéduraux** — ils décrivent les
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
| `/yukki-story` | `<description libre OU brouillon>` | Étape 1 — produit `.yukki/stories/<id>-<slug>.md` | [Claude](../.claude/commands/yukki-story.md) · [Copilot](../.github/skills/yukki-story/SKILL.md) |
| `/yukki-analysis` | `<id-slug>` | Étape 3 — produit `.yukki/analysis/<id>-<slug>.md` | [Claude](../.claude/commands/yukki-analysis.md) · [Copilot](../.github/skills/yukki-analysis/SKILL.md) |
| `/yukki-reasons-canvas` | `<id-slug>` | Étape 4 — produit `.yukki/prompts/<id>-<slug>.md` (canvas) | [Claude](../.claude/commands/yukki-reasons-canvas.md) · [Copilot](../.github/skills/yukki-reasons-canvas/SKILL.md) |
| `/yukki-generate` | `<id-slug>` | Étape 5 — produit / met à jour le code à partir du canvas | [Claude](../.claude/commands/yukki-generate.md) · [Copilot](../.github/skills/yukki-generate/SKILL.md) |
| `/yukki-api-test` | `<id-slug>` | Étape 5b — produit `scripts/yukki/<id>-<slug>.sh` (curl + jq) | [Claude](../.claude/commands/yukki-api-test.md) · [Copilot](../.github/skills/yukki-api-test/SKILL.md) |
| `/yukki-prompt-update` | `<id-slug> <description du changement>` | Boucle logique — met à jour le canvas, status `implemented → reviewed` | [Claude](../.claude/commands/yukki-prompt-update.md) · [Copilot](../.github/skills/yukki-prompt-update/SKILL.md) |
| `/yukki-sync` | `<id-slug>` | Boucle refactor — met à jour le canvas pour refléter un refactor pur, status `implemented → synced` | [Claude](../.claude/commands/yukki-sync.md) · [Copilot](../.github/skills/yukki-sync/SKILL.md) |

> L'étape 2 (clarification analytique) est **humaine** et conversationnelle — pas de commande SPDD dédiée.

## Workflow visuel

```
exigence métier brute
     │
     ▼ /yukki-story
.yukki/stories/<id>-<slug>.md
     │
     ▼ clarification humaine (étape 2)
     │
     ▼ /yukki-analysis
.yukki/analysis/<id>-<slug>.md
     │
     ▼ revue humaine
     │
     ▼ /yukki-reasons-canvas
.yukki/prompts/<id>-<slug>.md  ← source de vérité
     │
     ▼ revue humaine
     │
     ▼ /yukki-generate
src/...  + tests + (si REST) /yukki-api-test
     │
     ▼ revue du diff
     │
     ├─ logique change   → /yukki-prompt-update + /yukki-generate ciblé
     └─ refactor pur     → édit code + /yukki-sync
```

## Exemple complet — META-001 (cycle + boucle)

La story [`META-001-extract-methodology-references`](stories/META-001-extract-methodology-references.md) sert d'exemple complet. C'est elle qui a créé le dossier [`methodology/`](methodology/) en dogfoodant SPDD.

### Cycle initial — création + livraison v1

```bash
# Étape 1 — Story
/yukki-story "extraire les techniques méthodologiques (DDD, STRIDE, BVA, Y-Statement) hors des skills vers .yukki/methodology/ pour servir /yukki-analysis"
# → .yukki/stories/META-001-extract-methodology-references.md (status: draft)

# Étape 2 — Clarification (HUMAIN, dialogue, pas de commande)
# Résolution des Open Questions : version=entier, index README=oui
# → status: draft → reviewed

# Étape 3 — Analyse stratégique
/yukki-analysis META-001-extract-methodology-references
# → .yukki/analysis/META-001-extract-methodology-references.md (status: draft)

# (REVUE HUMAINE de l'analyse)
# Affinage : drop 2 risques mous, ajout du Guide de style des refs
# → status: draft → reviewed

# Étape 4 — Canvas REASONS
/yukki-reasons-canvas META-001-extract-methodology-references
# → .yukki/prompts/META-001-extract-methodology-references.md

# (REVUE HUMAINE du canvas)
# → status: draft → reviewed (ou accepted)

# Étape 5 — Génération
/yukki-generate META-001-extract-methodology-references
# → 4 refs dans .yukki/methodology/ (v1)
# → .yukki/methodology/README.md (index)
# → maj .claude/commands/yukki-analysis.md (référence les refs)
# → maj .github/skills/yukki-analysis/SKILL.md (miroir Copilot)
# → création .yukki/README.md (ce fichier !)
# → status canvas: reviewed → implemented (changelog v1.1)
```

### Boucle de maintenance — divergence post-livraison

Constat humain : *"les exemples des refs doivent être yukki uniquement, pas portail"*. C'est un changement des **Norms** du canvas → on choisit `/yukki-prompt-update` (logique change) plutôt que `/yukki-sync` (refactor pur).

```bash
# Étape 5b — Prompt-update du canvas
/yukki-prompt-update META-001-extract-methodology-references "Norms et DoD : exemples yukki uniquement, portail interdit dans les refs publiées. Touche O1, O2, O3."
# → canvas mis à jour (Norms + Operations O1/O2/O3 + DoD)
# → status canvas: implemented → reviewed (signale les refs comme stale)
# → changelog v1.2

# Étape 5c — Régénération ciblée
/yukki-generate META-001-extract-methodology-references
# → la commande détecte status=reviewed et régénère les Operations modifiées
# → 3 refs passent en v2 (domain-modeling, risk-taxonomy, edge-cases)
# → 1 ref inchangée (decisions.md, déjà yukki-native)
# → status canvas: reviewed → implemented (changelog v1.3)
```

### Bilan

- **6 invocations** de slash commands (`/yukki-story`, `/yukki-analysis`, `/yukki-reasons-canvas`, `/yukki-generate` ×2, `/yukki-prompt-update`)
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
                                     /yukki-prompt-update : status redescend à `reviewed`
                                     /yukki-sync           : status passe à `synced`
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
- [`../TODO.md`](../TODO.md) — backlog SPDD à la racine du repo (stories à venir + état)
- [Root `CLAUDE.md`](../CLAUDE.md) — guide pour un agent qui débarque dans le repo
