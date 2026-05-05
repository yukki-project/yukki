---
id: INBOX-003
slug: mcp-servers-support
title: Support MCP servers (Model Context Protocol)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Support MCP servers (Model Context Protocol)

## Idée

Permettre à yukki d'enregistrer et d'invoquer des **MCP servers**
(Model Context Protocol — standard ouvert pour exposer outils /
ressources / contexte à des LLMs). Pendant les commandes SPDD,
yukki transmet la liste des MCPs aux providers (claude CLI / gh
copilot) qui les supportent nativement.

Cas d'usage :
- **MCP code-source** : durant `/yukki-analysis`, le MCP donne accès
  ciblé au repo (au-delà du subagent Explore Claude actuel).
- **MCP Jira** (cf. INBOX-002) : durant `/yukki-story`, accès aux
  tickets et threads de discussion existants.
- **MCP custom équipe** : exposer un wiki interne, une base de
  connaissances, un outil métier propriétaire.

Mécanisme proposé :
- Config locale dans `.yukki/mcp.yaml` (liste des serveurs avec
  leurs commandes de lancement et leurs scopes).
- yukki passe `--mcp-server <config>` (ou équivalent) aux providers
  qui supportent le protocole.
- Resté optionnel : un projet sans `mcp.yaml` fonctionne comme
  aujourd'hui.

## Notes

- Standard MCP : <https://modelcontextprotocol.io/>
- Cohabitation à concevoir avec le subagent `Explore` Claude (qui
  fait déjà du scan ciblé sans MCP).
- Bénéfice secondaire : yukki devient un **orchestrateur** qui
  rassemble plusieurs MCP autour d'un workflow SPDD, plutôt qu'un
  silo isolé.
- À évaluer aussi : yukki **expose** ses propres artefacts SPDD comme
  MCP server pour d'autres outils ?
