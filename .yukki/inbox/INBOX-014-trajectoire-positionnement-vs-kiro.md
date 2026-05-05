---
id: INBOX-014
slug: trajectoire-positionnement-vs-kiro
title: Trajectoire yukki — orchestration SPDD au-dessus des agents existants (vs Kiro)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Trajectoire yukki — orchestration SPDD au-dessus des agents existants

## Problème stratégique

Le marché des "agents codeurs" (Claude Code, GitHub Copilot, Cursor,
Windsurf, Kiro, Aider…) se consolide vite autour d'équipes à 20+
ingés et des budgets cloud énormes. Pour yukki, **recoder un agent
généraliste = lutte perdue d'avance** (6-18 mois pour atteindre
du sub-par, marché qui se ferme entre-temps).

Mais ces agents partagent une **lacune commune** : ils sont
**génératifs ad hoc**. Aucun n'impose une **rigueur méthodologique
discovery → delivery versionnée en git**. C'est l'angle yukki.

## Le moat = la méthode explicite, pas la génération

| Commodité (l'agent qui y met le budget) | Différenciation yukki |
|---|---|
| Lecture de codebase | Cadre SPDD opinionné (Inbox → Epic → Story → Roadmap) |
| Génération de code | Artefacts versionnés en git (story / analysis / canvas / tests) |
| Subagents intégrés | Linter qui force la cohérence cross-artefacts |
| Indexation IDE | Hiérarchie discovery → delivery imposée par l'outil |
| | Workflow `prompt-update` / `sync` (boucles de maintenance) |
| | Multi-provider (jamais lock-in) |

## Architecture cible : orchestrateur, pas agent

yukki **délègue le heavy lifting** (lecture code, génération) à 3
backends interchangeables, et garde la **méthode** comme cœur de
valeur :

```
                          ┌─────────────────────────┐
                          │  yukki (méthode SPDD)   │
                          │  artefacts .yukki/      │
                          │  hub UI / CLI           │
                          │  linter / search / graph│
                          └────────────┬────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
          ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
          │ Claude Code  │   │ GH Copilot   │   │ OpenAI API   │
          │ CLI subproc. │   │ CLI subproc. │   │ direct HTTP  │
          └──────────────┘   └──────────────┘   └──────────────┘
```

3 modes d'intégration par backend :

1. **CLI subprocess** — yukki shell-out vers `claude` ou `gh copilot
   suggest` avec un prompt structuré (le mode actuel CORE-001).
2. **MCP server** — yukki **expose** `.yukki/` comme MCP que Claude
   Code / Copilot consomment dans leur propre conversation
   ("le contexte SPDD du repo est disponible").
3. **MCP client** — yukki **consomme** des MCPs externes (Jira,
   Slack, code repo, doc interne) pour enrichir ses workflows.

## Vs Kiro spécifiquement

| Axe | Kiro | yukki |
|---|---|---|
| Backend | Bedrock (lock-in AWS) | Claude / Copilot / OpenAI / Ollama (libre) |
| On-premise | Non (cloud AWS) | Oui (artefacts en git, provider local possible) |
| Format spec | Propriétaire | Markdown + frontmatter YAML (portable) |
| Structure produit | "Spec-driven" générique | Hiérarchie SPDD explicite (Inbox → Epic → Story) |
| OSS | Non | Oui |
| IDE | Intégré | Standalone (Wails desktop) + CLI |

## Cible utilisateur claire

**Pour les équipes structurées en secteur réglementé** (banque,
assurance, défense, public, santé) qui veulent :
- la rigueur méthodologique sans le lock-in cloud d'AWS
- un format de spec versionnable et portable (markdown + YAML)
- la possibilité de tourner sur LLM on-premise (Mistral local,
  Ollama) pour des codebases sensibles
- un workflow ouvert et auditable (artefacts en git, pas dans une
  base proprio)

**Pas pour** : les startups en mode fast & loose qui partent sur
Cursor, ou les solo devs qui font du Claude Code direct.

## Trajectoire en phases (proposition)

### Phase 1 — Foundation (livrée, état actuel)
- 7 slash commands `/yukki-*`
- Hub Wails desktop + CLI
- `.yukki/` directory (META-004)
- Hiérarchie Inbox / Epic / Story / Roadmap (META-005)
- Provider abstraction Go (claude CLI + Mock)

### Phase 2 — Multi-provider robuste (cf. INBOX-007)
- Renforcer `internal/provider/` pour supporter :
  - Claude CLI (existant)
  - GitHub Copilot CLI (planned `INT-001`)
  - OpenAI API directe (avec API key + key chain OS)
- Sélection runtime via env / config / flag
- Permet de **router chaque step SPDD vers le backend optimal**
  (haiku pour story, sonnet pour analysis, opus pour canvas)

### Phase 3 — yukki as MCP server
- Exposer `.yukki/` via Model Context Protocol
- Un dev avec Claude Code branche le MCP yukki et son LLM voit :
  - les stories en cours
  - les analyses passées
  - les canvas REASONS
  - les Inbox items en discovery zone
- **Bénéfice clé** : Claude Code / Copilot deviennent **clients de la
  méthode yukki** sans qu'on aie besoin de leur demander quoi que
  ce soit. Plug & play.

### Phase 4 — yukki as MCP client (cf. INBOX-003)
- Config `.yukki/mcp.yaml` qui liste les MCPs externes consommés
- Cas d'usage :
  - MCP Jira → `/yukki-story` voit les tickets liés
  - MCP code-source → `/yukki-analysis` a accès au scan ciblé
    en plus du subagent Explore Claude
  - MCP wiki interne → `/yukki-reasons-canvas` voit la doc maison

### Phase 5 — Stack RAG progressif (cf. INBOX-013)
- Linter (cohérence) → Search (FT+facettes) → Graph (arêtes
  explicites) → Semantic (embeddings hybrid)
- Active selon volumétrie : auto à 50 / 500 artefacts.

### Phase 6 — Subagents dédiés par étape (cf. INBOX-006)
- `yukki-story-agent`, `yukki-analysis-agent`, etc.
- Chacun avec son scope d'outils + son model + son prompt système
- Optimise coût (haiku pour story, opus pour generate).

### Phase 7 — Productisation OSS
- Doc utilisateur soignée (`yukki-project.dev` ?)
- Packaging cross-platform (brew, scoop, apt)
- Templates de projets de démarrage par secteur (backend Java,
  frontend React, infra K8s, doc tech…)
- Communauté GitHub Discussions / Discord

## Risques stratégiques

| Risque | Probabilité | Mitigation |
|---|---|---|
| Provider CLI casse l'API (claude / gh copilot) | Moyenne | Abstraction `Provider` + tests d'intégration mock + multi-provider redondance |
| "Pas un produit complet" perçu comme yet-another-tool | Élevée | Doc qui martèle la valeur méthodologique, pas la gen ; cible explicite réglementé |
| Kiro accélère et ferme l'angle "spec versionné" | Moyenne | OSS first, communauté de contributeurs, vitesse d'itération |
| MCP standard évolue et brise le contrat | Faible | MCP est un standard ouvert ; suivre les versions ; abstraire en interne |
| Sopra HR (employeur user) refuse le projet OSS | Moyenne | Discuter formellement le contour OSS vs interne avant de pousser publiquement |

## Décisions à trancher (revue produit)

- [ ] **Repo OSS public maintenant ou plus tard ?** Avantage immédiat :
  feedback communauté + visibilité. Inconvénient : pression de
  maintenir une roadmap externe avant que la foundation soit
  stable.
- [ ] **Cible Phase 1 stable** : combien d'utilisateurs internes
  (Sopra HR ?) avant de viser une cible OSS plus large ?
- [ ] **Naming** : "yukki" reste le nom OSS, ou rebrand pour
  l'externe ? (ex. "spec-forge", "method-first")
- [ ] **Stack RAG** : on attend la phase 5 ou on l'amorce dès la
  phase 2 ? (lien INBOX-013)
- [ ] **Devra-t-on ajouter un onboarding `yukki init` simple** pour
  qu'un nouvel utilisateur reproduise le setup en 30 secondes ?

## Notes

- Cette inbox est plus stratégique que tactique — elle ne se
  promeut pas en Story atomique, mais probablement en **Epic
  "yukki market positioning v1"** qui regrouperait :
  - Une story DOC-001 (publication OSS, README, landing page)
  - Une story `STRATEGY-001` (matrice comparative vs Kiro / Cursor /
    Aider, claim positioning)
  - Une story `INT-001` (Copilot CLI provider, déjà au backlog)
  - Une story `INT-002` (yukki as MCP server, nouveau)
  - Une story `INT-003` (yukki as MCP client, lien INBOX-003)
- Les **vrais utilisateurs** Sopra HR sont le banc de test idéal —
  cas réel, codebase corporate, contraintes on-premise, équipes
  structurées. Tester yukki dessus avant de pousser OSS.
- Un **manifesto** court ("yukki = méthode > génération") publié
  en blog post pourrait amorcer la traction OSS et clarifier le
  positionnement vis-à-vis de Kiro.
