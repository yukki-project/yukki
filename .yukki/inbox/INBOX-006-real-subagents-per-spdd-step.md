---
id: INBOX-006
slug: real-subagents-per-spdd-step
title: Vrais subagents dédiés par étape SPDD (story, canvas, generate…)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Vrais subagents dédiés par étape SPDD

## Idée

Aujourd'hui, les skills `/yukki-*` sont des **slash commands** qui
exécutent dans le **contexte principal** de Claude / Copilot —
le LLM voit toute la conversation, tous les artefacts précédents,
toute l'arbo lue. Ça pollue le contexte et dilue la spécialisation.

Proposition : chaque étape SPDD est portée par un **subagent dédié**
avec son propre contexte, ses propres outils autorisés, son propre
prompt système optimisé pour la tâche.

| Étape | Subagent dédié | Tools autorisés (proposition) |
|---|---|---|
| `/yukki-story` | `yukki-story-agent` | Read template, Write story, **pas** d'accès code |
| `/yukki-analysis` | `yukki-analysis-agent` | Read story, Glob/Grep code, Write analysis (read-only sur code) |
| `/yukki-reasons-canvas` | `yukki-canvas-agent` | Read analysis + story, Read code (1-3 fichiers ciblés), Write canvas |
| `/yukki-generate` | `yukki-generate-agent` | Read canvas, Read+Write code, run tests |
| `/yukki-prompt-update` | `yukki-prompt-update-agent` | Read+Write canvas seulement |
| `/yukki-sync` | `yukki-sync-agent` | Read code, Read+Write canvas |
| `/yukki-tests` | `yukki-tests-agent` | Read canvas + code, Read+Write tests |

Bénéfices :

- **Isolation contextuelle** : le `story-agent` n'est pas pollué par
  le code (il rédige juste une intention). L'`analysis-agent` ne voit
  pas l'implémentation (il fait du discovery).
- **Spécialisation** : chaque agent a un prompt système optimisé
  pour sa tâche (et un model adapté — `haiku` pour story, `sonnet`
  pour analysis, `opus` pour canvas/generate ?).
- **Coût** : downscale automatique pour les phases simples
  (story = haiku suffit), upscale pour les phases lourdes
  (generate = opus).
- **Parallélisme possible** : sur une story complexe, lancer
  l'analysis-agent en parallèle d'un research-agent qui scan
  le codebase — accélère le cycle.
- **Provider-agnostic** : la même API d'agent peut s'implémenter
  sur Claude (subagents Code) ou Copilot (skills Copilot) ou
  un futur provider.

## Notes

- Cohabitation avec les **slash commands** existantes : les
  commandes `/yukki-*` continuent d'exister côté UX, mais en interne
  elles invoquent un subagent dédié plutôt que d'exécuter dans le
  contexte principal.
- Préfigure aussi l'**orchestration multi-agent** : un meta-agent
  yukki qui pilote la séquence story → analysis → canvas → generate
  sans intervention humaine pour les cas simples (avec checkpoints
  pour la revue humaine sur les cas complexes).
- Lien avec INBOX-001 (aide IA à la génération) : les subagents
  spécialisés sont la *brique infrastructure* qui rend INBOX-001
  praticable.
- Lien avec INBOX-003 (MCP servers) : les MCPs deviennent des
  **outils** disponibles à chaque subagent selon son scope (l'analysis-
  agent a accès au MCP code-source, le story-agent non).
- Probable Epic à découper en 7 stories (1 par skill SPDD) — possibilité
  de livrer agent par agent sans tout livrer d'un coup.
