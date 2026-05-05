# CLAUDE.md — Guide pour agent

Ce fichier est lu automatiquement par Claude Code (et utile pour tout autre
agent IA) dès qu'il travaille dans le repo `yukki`. Il décrit **le projet** et
**la démarche SPDD** que ce projet utilise pour son propre développement.

---

## Le projet `yukki`

`yukki` est un outil **open source en Go** qui implémente la méthode
[Structured Prompt-Driven Development (SPDD)](https://martinfowler.com/articles/structured-prompt-driven/).
Il fournit un toolkit avec **deux surfaces** :

- une **CLI** (`yukki story`, `yukki analysis`, `yukki generate`…) pour scripter le cycle SPDD
- un **canvas editor graphique standalone** pour visualiser, éditer, naviguer entre les artefacts (story → analysis → canvas → code)

Le projet **orchestre** les CLI providers existants (`claude` CLI, `gh copilot` CLI) plutôt que d'embarquer un SDK — pas de gestion d'authentification, de rate limiting, ou de versioning d'API à faire.

### Stack et architecture pressentie

- **Go 1.24+**, monorepo
- `cmd/yukki/` — entrée Cobra, binaire unique
- `internal/workflow/` — logique des 7 commandes SPDD
- `internal/provider/` — abstraction `Provider` + wrappers `claude` et `gh copilot`
- `internal/templates/` — chargement template (avec fallback `embed.FS`)
- `internal/artifacts/` — écriture des artefacts SPDD avec calcul d'id

### Repo et organisation GitHub

- Org : [`yukki-project`](https://github.com/yukki-project)
- Repo principal : [`yukki-project/yukki`](https://github.com/yukki-project/yukki) (monorepo v1)
- Module Go : `github.com/yukki-project/yukki`
- Binaire : `yukki` (sans suffixe `-cli`)

### État actuel

- `CORE-001` (foundation : `yukki story` end-to-end via `claude` CLI) → story prête, analyse + canvas + génération à venir
- `META-001` (extraire techniques méthodologiques vers `.yukki/methodology/`) → **livré** (8 commits)
- Stories restantes prévues : `CORE-002` (les 6 autres commandes), `UI-001` (canvas editor), `INT-001` (Copilot CLI), `DOC-001` (publication OSS), `META-002` (backport `/yukki-story`), `META-003` (CI no-inlining)

---

## La démarche SPDD

Le projet `yukki` se construit lui-même via SPDD. Tous les artefacts vivent dans le repo, versionnés avec le code.

### Règles non-négociables

1. **Prompt first, code after** — quand la réalité diverge de l'intention, on **corrige le canvas d'abord**, puis on régénère le code. **Ne jamais** éditer le code pour un changement de logique sans toucher au canvas.
2. **Skill = procédural, methodology = knowledge** — les skills (`.claude/commands/yukki-*.md` et `.github/skills/yukki-*/SKILL.md`) ne redéfinissent **jamais** une technique. Ils référencent [`.yukki/methodology/<technique>.md`](.yukki/methodology/) par lien.
3. **Examples yukki uniquement** — toute ref méthodologique illustre avec une story du projet `yukki` (ex. CORE-001), pas avec d'autres projets.
4. **Miroir Claude / Copilot synchronisé** — chaque skill existe en **deux fichiers identiques** au contenu. Les seules différences autorisées sont :
   - frontmatter `user_invocable: true` (Claude) vs `user-invocable: true` (Copilot)
   - profondeur de chemin relatif `../../.yukki/...` vs `../../../.yukki/...`
   - mention `subagent Explore` (Claude) vs `#codebase` (Copilot)
5. **Pas d'inlining** — toute mention de DDD, STRIDE, BVA, Y-Statement, SPIDR, INVEST dans un skill **doit être suivie d'un lien** vers la ref correspondante dans [`.yukki/methodology/`](.yukki/methodology/).

### Les 7 commandes SPDD

Toutes les commandes existent en double format Claude / Copilot.

| Commande | Argument | Rôle | Skill (Claude / Copilot) |
|---|---|---|---|
| `/yukki-story` | `<description libre>` | Étape 1 — produit `.yukki/stories/<id>-<slug>.md` | [Claude](.claude/commands/yukki-story.md) · [Copilot](.github/skills/yukki-story/SKILL.md) |
| `/yukki-analysis` | `<id-slug>` | Étape 3 — produit `.yukki/analysis/<id>-<slug>.md` | [Claude](.claude/commands/yukki-analysis.md) · [Copilot](.github/skills/yukki-analysis/SKILL.md) |
| `/yukki-reasons-canvas` | `<id-slug>` | Étape 4 — produit le canvas REASONS | [Claude](.claude/commands/yukki-reasons-canvas.md) · [Copilot](.github/skills/yukki-reasons-canvas/SKILL.md) |
| `/yukki-generate` | `<id-slug>` | Étape 5 — produit / met à jour le code | [Claude](.claude/commands/yukki-generate.md) · [Copilot](.github/skills/yukki-generate/SKILL.md) |
| `/yukki-api-test` | `<id-slug>` | Étape 5b — produit `scripts/yukki/<id>.sh` | [Claude](.claude/commands/yukki-api-test.md) · [Copilot](.github/skills/yukki-api-test/SKILL.md) |
| `/yukki-prompt-update` | `<id-slug> <change>` | Boucle logique — met à jour le canvas | [Claude](.claude/commands/yukki-prompt-update.md) · [Copilot](.github/skills/yukki-prompt-update/SKILL.md) |
| `/yukki-sync` | `<id-slug>` | Boucle refactor — sync canvas ← code | [Claude](.claude/commands/yukki-sync.md) · [Copilot](.github/skills/yukki-sync/SKILL.md) |

### Les 4 références méthodologiques

Toutes dans [`.yukki/methodology/`](.yukki/methodology/), versionnées (`version: <int>` dans le frontmatter) et référencées via `applies-to`.

| Ref | Sujet | applies-to |
|---|---|---|
| [`domain-modeling.md`](.yukki/methodology/domain-modeling.md) | DDD tactique allégé (Entity / Value Object / Invariant / Integration / Domain Event) | `yukki-analysis`, `yukki-reasons-canvas` |
| [`risk-taxonomy.md`](.yukki/methodology/risk-taxonomy.md) | 6 catégories de risques + STRIDE en sous-cadre sécurité | `yukki-analysis`, `yukki-reasons-canvas`, `yukki-prompt-update` |
| [`edge-cases.md`](.yukki/methodology/edge-cases.md) | BVA + EP + checklist 7 catégories | `yukki-analysis`, `yukki-reasons-canvas` |
| [`decisions.md`](.yukki/methodology/decisions.md) | Format Y-Statement pour l'approche stratégique | `yukki-analysis`, `yukki-reasons-canvas` |

Index : [`.yukki/methodology/README.md`](.yukki/methodology/README.md).

### Workflow d'une feature

```
exigence brute
  → /yukki-story <description>             # .yukki/stories/<id>-<slug>.md (draft)
  → (clarification humaine)               # status: draft → reviewed
  → /yukki-analysis <id-slug>              # .yukki/analysis/<id>-<slug>.md (draft)
  → (revue humaine)                        # status: draft → reviewed
  → /yukki-reasons-canvas <id-slug>        # .yukki/prompts/<id>-<slug>.md (canvas)
  → (revue humaine)                        # status: draft → reviewed
  → /yukki-generate <id-slug>              # produit le code, status: reviewed → implemented
  → /yukki-api-test <id-slug>              # produit scripts/yukki/<id>.sh (si REST)

  Boucles de maintenance :
  → /yukki-prompt-update <id-slug> "<change>"  # logique change, status: implemented → reviewed
  → /yukki-generate <id-slug>                  # régénération ciblée, status: reviewed → implemented
  → /yukki-sync <id-slug>                      # refactor pur, status: implemented → synced
```

Voir [`.yukki/README.md`](.yukki/README.md) pour l'exemple complet illustré sur META-001.

### Frontmatter normalisé

Tous les artefacts portent un frontmatter YAML valide (parseable par `yq`).

**Stories / Analysis / Canvas** :
```yaml
---
id: <PRÉFIXE>-NNN
slug: <kebab-case>
title: <titre court>
status: draft | reviewed | accepted | implemented | synced
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: <nom>
modules: [<liste>]
# références croisées :
story: .yukki/stories/<id>-<slug>.md      # dans analysis/canvas
analysis: .yukki/analysis/<id>-<slug>.md  # dans canvas
---
```

**Refs methodology** :
```yaml
---
id: METHO-<technique>
title: <titre>
version: <entier monotone>
status: published
applies-to: [<liste de skills>]
lang: fr
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - <url 1>
  - <url 2>
---
```

### Conventions Git

- **Commits conventionnels** :
  - `feat(spdd):` — nouvel artefact ou nouvelle fonctionnalité
  - `fix(spdd):` — correctif
  - `docs(spdd):` — documentation
  - `chore(spdd):` — maintenance (résolutions Open Questions, scaffolding)
  - `review(spdd):` — itération suite à revue humaine
  - `prompt-update(spdd):` — `/yukki-prompt-update` exécuté
  - `generate(spdd):` — `/yukki-generate` exécuté
  - `refactor(spdd):` — refactor d'un artefact existant
- **Pas de `git add -A`** — ajouter explicitement les fichiers
- **Pas de `--no-verify`, pas de `--amend`** — créer un nouveau commit
- **Messages multi-lignes** : HEREDOC
- **Footer obligatoire** quand un agent contribue :
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

### Préfixes d'id (convention de nommage)

| Préfixe | Module dominant |
|---|---|
| `CORE-<n>` | engine / commandes principales du CLI |
| `UI-<n>` | canvas editor graphique |
| `INT-<n>` | intégrations (providers, MCP, etc.) |
| `DOC-<n>` | documentation |
| `META-<n>` | méthodologie SPDD elle-même (templates, skills, refs) |
| `INBOX-<n>` | inbox / capture brute (discovery zone) |
| `EPIC-<n>` | epic — regroupement thématique de stories |
| `ROADMAP-<n>` | roadmap — vue projection (kanban Now/Next/Later) |

---

## Hiérarchie discovery → delivery

yukki étend la méthode SPDD avec une chaîne complète à 4 niveaux
(discovery → delivery), introduits par `META-005` :

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
projection** (Now / Next / Later, ou Q1/Q2/Q3) qui montre les Epics et
les Stories standalone engagés sur un axe temporel. Les Inbox
**n'apparaissent pas** sur la roadmap.

| Artefact | Rôle | Granularité | Lifecycle |
|---|---|---|---|
| **Inbox** | Capture brute (discovery zone) | Titre + 1 paragraphe | `unsorted → promoted (story\|epic) ou rejected` |
| **Epic** | Regroupement thématique de stories liées | Vision + AC haut niveau + liste de stories enfants | `draft → in-progress → mature → done` |
| **Story** | Niveau actuel SPDD (INVEST), inchangé | Existant (story.md) | `draft → reviewed → implemented` |
| **Roadmap** | Vue projection des Epics + Stories standalone | Kanban Now/Next/Later (frontmatter YAML structuré) | vivante (mise à jour continue) |

Les UX détaillées (capture rapide, kanban, transitions) sont portées
par les stories enfants `INBOX-001/002`, `EPIC-001`, `ROADMAP-001/002`.

---

## Pour un agent qui débarque

1. Lire **[`.yukki/README.md`](.yukki/README.md)** pour la philosophie SPDD complète + exemple META-001 illustré
2. Lire **[`.yukki/methodology/README.md`](.yukki/methodology/README.md)** pour l'index des techniques
3. Consulter les **stories en cours** dans [`.yukki/stories/`](.yukki/stories/)
4. Pour chaque action, **suivre le canvas REASONS** — c'est la source de vérité
5. **Respecter les Norms et Safeguards** du canvas (jamais d'inlining, toujours mirror Claude/Copilot, examples yukki only)
6. **Ne jamais** modifier du code généré sans passer par `/yukki-prompt-update` ou `/yukki-sync`

---

## Liens essentiels

- [Article SPDD — Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven/)
- [`.yukki/README.md`](.yukki/README.md) — méthodologie + exemple META-001
- [`.yukki/methodology/README.md`](.yukki/methodology/README.md) — index des techniques
- [`.yukki/templates/`](.yukki/templates/) — squelettes des artefacts
- [`.claude/commands/`](.claude/commands/) — skills Claude Code
- [`.github/skills/`](.github/skills/) — skills GitHub Copilot
- [`.yukki/stories/META-001-extract-methodology-references.md`](.yukki/stories/META-001-extract-methodology-references.md) — la story exemple
