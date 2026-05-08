---
id: CORE-006
slug: streaming-claude-cli
title: Streaming live de la réponse Claude dans l'UI
status: implemented
created: 2026-05-07
updated: 2026-05-08
owner: thibaut
modules:
  - internal/provider
  - internal/uiapp
  - frontend
---

# Streaming live de la réponse Claude dans l'UI

## Background

Quand l'utilisateur lance `/yukki-story` (ou toute autre commande SPDD), l'UI
affiche un spinner et reste muette jusqu'à la fin de la génération — jusqu'à 30
secondes pour un canvas REASONS. Le `claude` CLI supporte `--output-format stream-json`
qui émet un événement JSON par ligne au fil de la génération. yukki n'exploite
pas encore ce flux : le provider Go attend la fin du processus (`cmd.Run()`)
avant de retourner le texte complet.

Cette story ajoute le streaming ligne par ligne dans le provider Claude, et
propage le texte partiel jusqu'à l'UI via un nouvel événement Wails `provider:text`,
de sorte que l'utilisateur voit la réponse s'écrire en temps réel.

## Business Value

Réduire la perception de latence lors des générations SPDD. L'utilisateur voit
que Claude travaille et peut détecter tôt une dérive ou un malentendu, sans
attendre la fin complète pour corriger via `/yukki-prompt-update`.

## Scope In

- Modifier `ClaudeProvider.Generate` pour passer de `cmd.Run()` + stdout buffer
  à `cmd.Start()` + lecture ligne par ligne de stdout
- Passer `--output-format stream-json` au CLI claude et parser les events JSON :
  extraire le texte des events `type=assistant` (champ `.message.content[].text`)
  et ignorer les autres types (`system`, `result`, `tool_use`, `tool_result`)
- Exposer un callback optionnel `OnChunk func(text string)` sur `ClaudeProvider`
  (ou `Provider` interface) pour recevoir les chunks au fil de la génération
- Émettre un événement Wails `provider:text` avec payload `{chunk: string}` depuis
  `uiProgress` à chaque chunk reçu
- Afficher les chunks dans l'UI : dans `NewStoryModal` / zone de génération active,
  accumuler le texte et l'afficher progressivement (textarea ou zone scrollable)
- Le texte final retourné par `Generate` reste le texte complet assemblé (non-régression
  avec le comportement existant)

## Scope Out

- Pas de changement du mode `gh copilot` (pas de stream-json disponible pour ce provider)
- Pas de markdown rendering dans le stream (texte brut suffit pour cette story)
- Pas d'interruption mid-stream depuis l'UI (AbortRunning existant reste le mécanisme)
- Pas de nouveau test e2e ou d'intégration réseau
- Pas de modification du format des artefacts écrits (stream ne change pas le fichier produit)

## Acceptance Criteria

### AC1 — Le texte s'affiche progressivement pendant la génération

- **Given** un projet yukki ouvert et le modal de génération affiché
- **When** l'utilisateur lance une génération (`RunStory`)
- **Then** le texte de la réponse Claude s'affiche progressivement dans l'UI
  au fur et à mesure de la génération, sans attendre la fin

### AC2 — Le fichier artefact produit est identique au comportement actuel

- **Given** une génération complétée avec streaming activé
- **When** l'événement `provider:end` est émis avec `success: true`
- **Then** le fichier `.yukki/stories/<id>-<slug>.md` contient exactement le
  texte complet assemblé des chunks, sans différence avec le mode non-stream

### AC3 — Les events non-texte sont ignorés silencieusement

- **Given** le CLI claude émet des events `type=system`, `type=tool_use`,
  `type=tool_result` ou `type=result` dans le flux stream-json
- **When** le provider parse le flux
- **Then** seuls les events `type=assistant` avec un contenu texte incrémentent
  le résultat — les autres sont ignorés sans erreur

### AC4 — Une ligne JSON malformée n'interrompt pas la génération

- **Given** le flux stream-json contient une ligne qui n'est pas du JSON valide
  (ex. message de debug du CLI)
- **When** le provider rencontre cette ligne
- **Then** la ligne est ignorée (logged au niveau Debug), la génération continue
  et le texte accumulé avant et après est préservé

### AC5 — Le provider `gh copilot` n'est pas affecté

- **Given** le provider actif est `gh copilot` (pas `claude`)
- **When** une génération est lancée
- **Then** le comportement est identique à avant cette story (`cmd.Run()` sans stream)
  et aucun `provider:text` n'est émis

### AC6 — Timeout et annulation fonctionnent en mode stream

- **Given** une génération en cours en mode stream
- **When** l'utilisateur clique sur Abort ou le timeout de 5 min est atteint
- **Then** le processus `claude` est tué (`cmd.Process.Kill()`), le contexte
  est annulé, et `provider:end` est émis avec `success: false`

## Open Questions

- [ ] Le format exact des events `stream-json` du CLI claude — à vérifier avec
  `claude -p --output-format stream-json "test"` en local (la doc mentionne
  `type=assistant` mais le schéma exact des champs n'est pas publié)
- [ ] `OnChunk` doit-il être sur l'interface `Provider` ou seulement sur `ClaudeProvider` ?
  Impact : le mock dans les tests unitaires devrait-il aussi l'implémenter ?

## Notes

- Doc CLI : `claude -p --output-format stream-json "query"` — chaque ligne stdout
  est un objet JSON. Events observés : `system_prompt`, `assistant`, `tool_use`,
  `tool_result`, `result`
- L'event `result` porte le champ `result` (texte complet final) et `subtype`
  (`success` | `error`) — alternative à l'assemblage des chunks pour le texte final
- Pattern à suivre : `cmd.Start()` + `bufio.Scanner` sur `cmd.Stdout` + goroutine
  pour lire stderr + `cmd.Wait()` après drain du scanner
- Wails event existant : `provider:start` et `provider:end` dans `internal/uiapp/progress.go`
  → ajouter `provider:text` sur le même pattern
- Le callback `OnChunk` peut être nil-safe (vérifier avant d'appeler) pour rester
  rétrocompatible avec les tests existants qui ne le fournissent pas
