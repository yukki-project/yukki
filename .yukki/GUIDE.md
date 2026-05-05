# SPDD — Guide pédagogique

> Synthèse en français de la méthode **Structured Prompt-Driven Development**
> (SPDD) introduite par Thoughtworks et Martin Fowler, avec son adaptation
> dans le projet `yukki`. Ce document **explique pourquoi et comment**.
> Pour la **référence opérationnelle** (commandes, conventions, exemple
> concret), voir [`README.md`](README.md).

---

## 1. Le problème que SPDD résout

Quand on laisse un LLM écrire du code à partir d'une demande en langage
naturel sans cadre, on obtient typiquement :

- du code qui **a l'air bon** mais dérive subtilement de l'intention
- des **prompts jetables** dispersés dans des chats Slack, Teams, Cursor…
- une **divergence silencieuse** entre ce qu'on voulait et ce qu'on a, qui
  s'aggrave à chaque itération
- aucune **trace versionnée** de pourquoi telle décision a été prise

> *« Ferrari on muddy roads »* — accélérer la frappe ne sert à rien si le
> système global ne suit pas. (Article original Fowler.)

**SPDD pose une règle simple** : les prompts deviennent des **artefacts de
premier rang**, versionnés au même titre que le code, reviewés en pull
request, et utilisés comme **source de vérité** pour la génération.

### Schéma 1 — Avant / après SPDD

```
SANS SPDD (chat-and-pray)
─────────────────────────
  exigence ──▶ chat éphémère ──▶ code ──▶ drift silencieux
                                            │
                                            ▼ (si problème)
                                      on patch le code
                                      le chat est perdu
                                      personne ne sait pourquoi

AVEC SPDD (prompt-first)
─────────────────────────
  exigence ──▶ story versionée ──▶ analyse ──▶ canvas REASONS
                                                    │
                                                    ▼
                                              code généré
                                                    │
                                                    ▼ (si problème)
                                       on corrige le canvas d'abord,
                                       puis on régénère le code
                                       tout est tracé dans git
```

---

## 2. Les trois niveaux de Spec-Driven Development

SPDD est un cas particulier d'une famille plus large appelée
**Spec-Driven Development (SDD)**. La famille se segmente en trois niveaux,
selon le degré d'autorité donné à la spec :

| Niveau | Rôle de la spec | Outils représentatifs | Position de yukki |
|---|---|---|---|
| **spec-first** | rédigée d'abord, puis le code prend le relais — la spec peut être obsolète au fil du temps | GitHub **Spec-Kit**, AWS **Kiro** | non |
| **spec-anchored** | la spec **vit avec le code**, mise à jour en parallèle, source de vérité partagée | **SPDD** (Thoughtworks) | ✅ **yukki est ici** |
| **spec-as-source** | seule la spec est éditée, le code est entièrement généré et marqué *"DO NOT EDIT"* | **Tessl** (préfiguration) | non — yukki garde la lecture humaine du code |

`yukki` choisit le niveau **spec-anchored** : le canvas REASONS est mis à
jour en boucle (`/yukki-prompt-update`, `/yukki-sync`), mais le code reste
lisible et éditable par un humain.

### Schéma 2 — Position de yukki dans le paysage SDD

```
         spec-first      spec-anchored      spec-as-source
           ↓                 ↓                  ↓
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │ Spec-Kit│       │  SPDD   │       │  Tessl  │
      │  Kiro   │       │ (yukki) │       │         │
      └─────────┘       └─────────┘       └─────────┘
           │                 │                  │
      4 phases:         7 commandes:       1 source unique :
      /specify          /yukki-story        code généré
      /plan             /yukki-analysis     marqué // GENERATED
      /tasks            /yukki-reasons-canvas
      implement         /yukki-generate
                        /yukki-api-test
                        /yukki-prompt-update
                        /yukki-sync
```

---

## 3. Le workflow SPDD pas à pas

SPDD se déroule en **6 étapes**, dont **5 commandes** automatisables et
**1 étape humaine** (la clarification analytique).

### Schéma 3 — Le cycle complet

```
exigence métier brute
        │
        ▼  /yukki-story                                ┐
[user story versionnée]   .yukki/stories/<id>-<slug>.md │ étape 1
        │                                              │
        ▼  ⚠ clarification humaine (PO + dev)         │ étape 2 — humaine
        │                                              │
        ▼  /yukki-analysis                              │
[analyse stratégique]     .yukki/analysis/<id>-<slug>.md │ étape 3
        │                                              │
        ▼  ⚠ revue humaine                            │
        │                                              │
        ▼  /yukki-reasons-canvas                        │ étape 4
[canvas REASONS]          .yukki/prompts/<id>-<slug>.md  │
        │                                              │ ← source de vérité
        ▼  ⚠ revue humaine                            │
        │                                              │
        ▼  /yukki-generate                              │ étape 5
[code source]             src/...  +  tests           │
        │                                              │
        ▼  /yukki-api-test (optionnel, REST seulement) │
[script de validation]    scripts/yukki/<id>.sh        │
        │                                              │
        ▼  ⚠ revue du diff                            │
        │                                              │
        ▼  étape 6 — tests unitaires (template-driven)│
[prompt de tests]         .yukki/tests/<id>-<slug>.md   │
[code de tests]           *_test.go                   ┘
```

### À chaque transition, l'humain valide

Le `status` du frontmatter avance à chaque revue :

```
draft ──▶ reviewed ──▶ accepted ──▶ implemented ──▶ synced
   ↑          ↑           ↑            │
   │          │           │            │
   └ écrit    └ revu      └ accepté    └ généré
                                         │
                                         ↓ (back-edges)
                            implemented ──▶ reviewed (via /yukki-prompt-update)
                            implemented ──▶ synced (via /yukki-sync)
```

---

## 4. Le Canvas REASONS — la pièce centrale

Le canvas REASONS est l'artefact qui pilote la génération de code. Il a
**7 sections** organisées en **3 familles**.

### Schéma 4 — Les 3 familles du canvas

```
╔═══════════════════════════════════════════════════════╗
║  INTENTION & DESIGN  (le pourquoi et le quoi)         ║
║                                                        ║
║  R — Requirements    Problème + Definition of Done    ║
║  E — Entities         Entités métier + relations      ║
║  A — Approach         Y-Statement (stratégie + altern.)║
║  S — Structure        Modules, flux, dépendances      ║
╠═══════════════════════════════════════════════════════╣
║  EXÉCUTION  (le comment, jusqu'à la signature)        ║
║                                                        ║
║  O — Operations       Étapes testables, signatures    ║
║                       complètes (méthodes, types)     ║
╠═══════════════════════════════════════════════════════╣
║  GOUVERNANCE  (transversal, non-négociable)           ║
║                                                        ║
║  N — Norms            Standards projet (logging,      ║
║                       i18n, sécurité, etc.)           ║
║  S — Safeguards       Limites strictes (jamais X,     ║
║                       toujours Y)                     ║
╚═══════════════════════════════════════════════════════╝
```

### Pourquoi cette structure marche

1. **Forcer l'abstraction avant l'exécution** — on ne descend en `O`
   (Operations) qu'après avoir clarifié `R-E-A-S` (intention)
2. **Séparer le métier du transverse** — `N` et `S` capturent ce qui est
   commun à toutes les Operations
3. **Tracer les non-négociables** — les `Safeguards` sont les invariants
   que la génération ne peut jamais violer

---

## 5. Les deux boucles de maintenance

C'est ici que SPDD se distingue des outils concurrents : **après livraison,
les changements suivent un protocole strict**.

### Schéma 5 — Quelle boucle pour quel changement

```
                     ┌──────────────────┐
                     │ status: implemented │
                     └─────────┬─────────┘
                               │
                     divergence détectée ?
                               │
              ┌────────────────┴────────────────┐
              │                                  │
   ┌──────────▼──────────┐         ┌────────────▼──────────┐
   │ Changement de       │         │ Refactor pur          │
   │ LOGIQUE / spec      │         │ (pas de changement    │
   │ (Norms, DoD, AC,    │         │  observable)          │
   │  Operations)        │         │                       │
   └──────────┬──────────┘         └────────────┬──────────┘
              │                                  │
              ▼                                  ▼
      /yukki-prompt-update              /yukki-sync
              │                                  │
              ▼                                  ▼
    canvas mis à jour                  canvas resynchronisé
    status:                            status:
    implemented → reviewed             implemented → synced
              │                                  │
              ▼                                  │
      /yukki-generate ciblé                       │
              │                                  │
              ▼                                  ▼
    code régénéré                  code & canvas alignés
    status:                                  ✓
    reviewed → implemented
```

**Règle d'or** :
> *"When reality diverges, fix the prompt first — then update the code."*
>
> Quand la réalité diverge, on corrige le prompt (le canvas) **d'abord**,
> puis on régénère ou resynchronise le code. **Jamais** l'inverse.

---

## 6. Comparaison avec les autres approches SDD

### Tableau comparatif

| Aspect | SPDD (yukki) | GitHub Spec-Kit | AWS Kiro | Tessl |
|---|---|---|---|---|
| **Niveau SDD** | spec-anchored | spec-first | spec-first | spec-as-source |
| **Surface** | CLI + GUI prévu | CLI (Copilot/Claude/Gemini) | VS Code fork | IDE custom |
| **Phases** | 5 étapes + 2 boucles | 4 phases (`/specify`, `/plan`, `/tasks`, implement) | linéaire (requirements/design/tasks) | 1 source unique |
| **Format AC** | Given/When/Then | libre | EARS (Easy Approach to Requirements Syntax) | libre |
| **Versioning prompt** | obligatoire (canvas committé) | optionnel | hooks automatiques | spec = source |
| **Boucle prompt-update** | explicite (`/yukki-prompt-update`) | implicite (édit-prompt-régénère) | hooks réactifs | n/a |
| **Boucle refactor** | explicite (`/yukki-sync`) | n/a | n/a | code = généré |
| **Code marqué DO NOT EDIT** | non | non | non | oui |
| **Multi-provider** | oui (claude, copilot) | oui (Copilot, Claude, Gemini) | AWS only | proprietary |

### Ce qui rend SPDD distinctif

- **Le canvas REASONS structure forte** (7 sections en 3 familles) — les
  autres outils ont des specs plus libres
- **Les deux boucles `/yukki-prompt-update` + `/yukki-sync` explicites** —
  pas de cas implicite, on choisit toujours laquelle on applique
- **L'humain au cœur** — chaque étape clé impose une revue humaine avec
  changement de `status`

---

## 7. Risques de l'AI-coding et comment SPDD les adresse

L'année 2026 a vu plusieurs critiques solides du *AI-assisted coding*.
Voici les principaux risques identifiés et la réponse SPDD.

| Risque (sources 2026) | Symptôme | Réponse SPDD |
|---|---|---|
| **Architecture by autocomplete** | l'IA produit du code qui marche localement mais introduit de la dette technique cachée (microservices inutiles, ORM à la place d'un data lake, etc.) | section `S — Structure` du canvas force la décision d'archi en amont, revue humaine obligatoire avant `/yukki-generate` |
| **Hidden technical debt** | code "qui marche mais qui dérive du domaine" | section `E — Entities` capture le domaine ; `Safeguards` interdisent les écarts |
| **Hallucinated dependencies** (typosquatting) | l'IA invente des packages qui n'existent pas, qu'un attaquant peut squatter ensuite | `Safeguards` explicites : "aucune dépendance externe non listée dans `Approach`" ; `/yukki-generate` ne peut pas ajouter une dep silencieusement |
| **Reliability gaps** (pas de retry, timeout, circuit-breaker) | code dev-quality, casse en prod | section `N — Norms` impose les standards de fiabilité projet ; tests via `/yukki-api-test` valident |
| **Inconsistency à scale** | "comme si 10 devs avaient codé sans se parler" | `Norms` + `Safeguards` versionnés assurent la cohérence inter-stories |
| **Architecture-by-autocomplete** sans rôle architectural | l'IA décide seule, pas de Constraint Persona | `Approach` impose un Y-Statement avec alternatives écartées et trade-off accepté — l'humain garde la décision |
| **Cognitive overhead** ("thinking decelerator") | -19% de vélocité chez les devs expérimentés (data 2025) | la rigueur SPDD coûte au démarrage, mais réduit le debug post-génération |
| **Spec qui pourrit** ("waterfall strikes back") | la spec devient obsolète, le code dérive | `/yukki-prompt-update` + `/yukki-sync` ferment la boucle — les deux artefacts restent alignés |

---

## 8. Les extensions de yukki au-delà du canonical

`yukki` n'est pas une copie servile de SPDD ; nous y ajoutons des
améliorations issues de l'expérience.

### Schéma 6 — Couches yukki

```
                ┌─────────────────────────────────────┐
                │    SPDD canonical (Thoughtworks)    │
                │  7 commandes + Canvas REASONS +     │
                │  workflow + règle "prompt first"    │
                └────────────────┬────────────────────┘
                                 │
                          ┌──────┴──────┐
                          │   yukki     │
                          │ extensions  │
                          └──────┬──────┘
                                 │
   ┌───────────────────┬─────────┼─────────┬───────────────────┐
   ▼                   ▼         ▼         ▼                   ▼
┌─────────┐      ┌──────────┐ ┌──────┐ ┌────────┐      ┌─────────────┐
│methodo- │      │skill =   │ │mirror│ │status  │      │ examples    │
│logy/    │      │procédural│ │Claude│ │explicit│      │ yukki-only  │
│refs     │      │knowledge │ │/Cop. │ │lifecyc.│      │ enforcement │
└─────────┘      └──────────┘ └──────┘ └────────┘      └─────────────┘
```

| Extension | Description | Pourquoi |
|---|---|---|
| **`.yukki/methodology/`** — refs versionnées (DDD, STRIDE, BVA, Y-Statement, INVEST, SPIDR, AC formulation) | bibliothèque de techniques transverses, citées par les skills | éviter l'inlining (anti-pattern) — single source of truth |
| **Convention "skill = procédural, methodology = knowledge"** | les skills sont des procédures, les techniques sont externalisées | DRY au niveau méta + cohérence inter-skills |
| **Examples yukki-only** dans les refs | enforcé par les `Norms` du canvas META-001 v1.2 | éviter la dérive de scope vers d'autres projets |
| **Mirror Claude / Copilot** | chaque skill existe dans `.claude/commands/` et `.github/skills/` | multi-provider, pas de lock-in |
| **Status lifecycle explicite** (`draft → reviewed → accepted → implemented → synced`) | le `status` du frontmatter avance à chaque transition humaine ou automatique | machine-parseable, traçable |
| **Section `## Changelog`** dans les canvas | obligatoire à chaque `/yukki-prompt-update` ou `/yukki-sync` | trace fine des évolutions |
| **`TODO.md`** (racine du repo) versionné | matérialise le backlog que SPDD canonical ne formalise pas | combler le gap roadmap du canonical |

---

## 9. Quand utiliser SPDD (et quand ne pas)

### Schéma 7 — Matrice d'usage

```
                  Logique                          Logique
                  simple                           complexe
                     │                                │
                     │                                │
    ───────────────────────────────────────────────────────────▶
    │                                                            │
    │                                                            │
    │  ❌ overhead trop élevé              ⭐⭐⭐⭐⭐ idéal       │
    │     (hotfix, bump dep,                  (billing, RGPD,    │
    Court│      script jetable)              workflow critique) │
    terme│                                                       │
    │                                                            │
    │  ⭐⭐ acceptable                       ⭐⭐⭐⭐ très adapté  │
    │     (refactor structuré,             (feature multi-modules │
    Long │      doc majeure)                qui doit vivre 5 ans)│
    terme│                                                       │
    ▼                                                            ▼
```

**SPDD est rentable** quand :
- la logique métier est complexe ou réutilisée (billing, conformité, RGPD)
- la feature traverse plusieurs modules et doit rester cohérente
- la maintenabilité long-terme prime sur le time-to-market
- l'équipe est répartie ou tourne (la trace versionnée évite les pertes
  de contexte)

**SPDD est trop lourd** quand :
- hotfix urgent en prod
- spike exploratoire ou POC jetable
- script de migration unique
- bump trivial de dépendance
- domaine flou ou travail purement créatif (UI, design)

---

## 10. Synthèse en une phrase

> SPDD impose qu'on **écrive d'abord le canvas REASONS** (intention, design,
> normes, garde-fous), qu'on le **fasse reviewer** par un humain, et que
> ce canvas reste la **source de vérité** : tout changement de logique
> passe par le canvas avant le code, et tout refactor pur synchronise le
> canvas après le code. **Aucune divergence silencieuse n'est tolérée**.

---

## Sources

### Article original
- [Structured-Prompt-Driven Development — Martin Fowler / Thoughtworks](https://martinfowler.com/articles/structured-prompt-driven/)

### Synthèses tierces
- [Treating AI Prompts Like Code — mgks.dev](https://mgks.dev/blog/2026-04-29-treating-ai-prompts-like-code-what-i-learned-from-thoughtworks-spdd-method/) — retour d'expérience individuel récent
- [Booboone — SPDD synthesis](https://booboone.com/structured-prompt-driven-development-spdd/)

### Comparaisons d'outils SDD
- [Understanding Spec-Driven-Development: Kiro, spec-kit, Tessl — Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [cameronsjo/spec-compare — recherche comparative 6 outils](https://github.com/cameronsjo/spec-compare)
- [6 Best SDD Tools 2026 — Augment Code](https://www.augmentcode.com/tools/best-spec-driven-development-tools)

### Critiques et risques
- [Spec-Driven Development: The Waterfall Strikes Back — Marmelab](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html)
- [AI-Assisted Development risks 2026 — DEV Community](https://dev.to/austinwdigital/ai-assisted-development-in-2026-best-practices-real-risks-and-the-new-bar-for-engineers-3fom)
- [AI Code Generation Vulnerabilities 2026 — DEV Community](https://dev.to/olivier-coreprose/ai-code-generation-vulnerabilities-in-2026-an-architecture-first-defense-plan-a0i)

### Discussion communauté
- [Hacker News — SDD tools thread](https://news.ycombinator.com/item?id=45610996)

### Références méthodologiques utilisées
- [INVEST — Agile Alliance](https://www.agilealliance.org/glossary/invest/) (Bill Wake / Mike Cohn)
- [SPIDR — Mountain Goat Software](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories) (Mike Cohn)
- [Given/When/Then — bliki Martin Fowler](https://martinfowler.com/bliki/GivenWhenThen.html)
- [adr.github.io](https://adr.github.io/) (Y-Statements & ADR)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling_Process) (STRIDE)
- [Boundary Value Analysis — Guru99](https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html)
