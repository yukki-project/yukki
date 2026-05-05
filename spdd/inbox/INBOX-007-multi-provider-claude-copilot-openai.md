---
id: INBOX-007
slug: multi-provider-claude-copilot-openai
title: Connexion multi-provider — Claude Code CLI / GitHub Copilot / OpenAI API
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Connexion multi-provider — Claude Code CLI / GitHub Copilot / OpenAI API

## Idée

Aujourd'hui yukki s'appuie sur le **wrapper `claude` CLI** (provider
unique). Étendre l'abstraction `internal/provider/Provider` pour
supporter trois modes de connexion au choix de l'utilisateur :

1. **Claude Code CLI** — `claude` binary local (déjà en place)
2. **GitHub Copilot CLI** — `gh copilot` (déjà prévu, story `INT-001`
   au backlog selon CLAUDE.md)
3. **OpenAI API directe** — appel HTTPS avec API key, sans CLI
   intermédiaire (couvre OpenAI + tout fournisseur compatible
   API : Anthropic API directe, Mistral, OpenRouter, locaux via
   Ollama OpenAI-compatible)

Sélection runtime via :
- Variable d'env (`YUKKI_PROVIDER=claude-cli | gh-copilot | openai-api`)
- Ou config locale `.yukki/provider.yaml`
- Ou flag CLI `--provider=...`

Pour la mode API key :
- Lecture depuis `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (env)
- Ou keychain OS (macOS Keychain / Windows Credential Manager /
  libsecret) — **jamais** stockage clair en config repo
- Modèle configurable par étape SPDD (cf. INBOX-006 : haiku pour
  story, sonnet pour analysis, opus pour generate)

## Notes

- Architecture déjà préparée : l'interface `Provider` existe dans
  [`internal/provider/`](../../internal/provider/) avec
  l'implémentation `Claude` (CLI) et un `MockProvider` pour les tests.
  Ajouter `OpenAIAPI` et `GHCopilotCLI` est une extension naturelle.
- Risque sécurité : gestion des secrets (API keys) — voir taxonomie
  STRIDE Information Disclosure. **Jamais** logger une clé,
  **jamais** la stocker en clair dans un artefact versionné.
- Bénéfice : élargit l'audience de yukki (équipes qui n'ont pas le
  CLI Claude installé mais ont accès à OpenAI ou un proxy interne).
- Cohabitation INBOX-006 (subagents) : si subagents implémentés, le
  choix de provider peut être par-agent (story-agent en haiku,
  generate-agent en opus, le tout via le même endpoint OpenAI-
  compatible si l'utilisateur passe par un proxy).
- Probable Epic à découper en 3 stories (une par provider) avec une
  étape préparatoire d'extraction d'interface si nécessaire.
