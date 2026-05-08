---
id: CORE-008
slug: llm-suggestion-streaming
title: Streaming des suggestions IA contextuelles via ClaudeProvider
status: implemented
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
  - internal/provider
  - internal/uiapp
  - frontend
---

# Streaming des suggestions IA contextuelles via ClaudeProvider

## Background

UI-014d expose une UX d'assistance générative (popover + diff panel) avec un
LLM **mocké** : transformations triviales côté client, délais simulés. Cette
story remplace le mock par un appel réel via `ClaudeProvider` (créé dans
CORE-001 et étendu pour le streaming dans CORE-006). Le prompt système est
construit côté Go à partir du **contexte de la section** (définition SPDD,
contraintes Given/When/Then pour les AC, etc.) + de l'**action demandée**
(*Améliorer la lisibilité*, *Enrichir*, *Reformuler*, *Raccourcir*) + du
**texte sélectionné**. La réponse est streamée token-par-token dans le diff
panel via `OnChunk`.

## Business Value

Donner au rédacteur une assistance générative **réelle** et **contextuelle**.
Le streaming permet à l'utilisateur de juger la qualité de la suggestion en
temps réel et d'arbitrer plus vite (refus précoce sur dérive). C'est le cœur
de la valeur produit qui est **différenciante** : pas un copilote générique
mais un assistant qui connaît le format SPDD.

## Scope In

- Nouvelle fonction Go `internal/provider.SuggestRewrite(ctx, req SuggestionRequest, onChunk func(string)) (Suggestion, error)`
- Type `SuggestionRequest` : `Section string` (FM, Bg, Bv, SI, SO, AC, OQ, Notes), `Action string` (improve|enrich|rephrase|shorten), `SelectedText string`, `SectionContext SectionContext` (texte complet de la section, position de la sélection)
- Construction du prompt système côté Go via `internal/promptbuilder` :
  - Préambule : "Tu es un rédacteur SPDD. Ta réponse doit modifier uniquement la portion sélectionnée, en respectant les conventions de la section *<Section>*."
  - Définition SPDD de la section (chargée depuis `.yukki/methodology/section-definitions.yaml`, à créer)
  - Action demandée : libellé FR + critères mesurables ("Reformuler : changer la structure des phrases sans modifier le sens. Conserver la longueur ±10%.")
  - Texte sélectionné délimité clairement
  - Instruction de format : "Réponds uniquement avec le texte de remplacement, sans guillemets ni explication."
- Bindings Wails :
  - `SpddSuggestStart(req SuggestionRequest) string` — retourne un sessionID, lance la génération en goroutine
  - `SpddSuggestCancel(sessionID string) error` — annule la goroutine via context.CancelFunc
  - Émission d'événements Wails : `spdd:suggest:chunk` (sessionID, chunkText), `spdd:suggest:done` (sessionID, fullText, durationMs), `spdd:suggest:error` (sessionID, message)
- Côté front : `useSpddSuggest(req)` (hook) qui retourne `{state: 'idle'|'streaming'|'done'|'error', text: string, durationMs?: number, error?: string}`
- Affichage : pendant le streaming, le panneau "APRÈS" affiche le texte qui s'écrit en temps réel + spinner discret + libellé "Yuki rédige…"
- Bouton "Arrêter" pendant le streaming (annule via `SpddSuggestCancel`)
- Régénération : nouveau `SpddSuggestStart` avec mêmes params + un compteur d'essai dans le prompt ("Génère une variante différente de la précédente.")
- Lien "Voir le prompt" dans le popover (UI-014d) affiche le **vrai** prompt construit, pas un texte statique

## Scope Out

- Cache de suggestions identiques (action + texte sélectionné identique) — possible amélioration plus tard
- Fine-tuning ou apprentissage à partir des acceptations/refus (hors périmètre)
- Multi-LLM (Anthropic vs OpenAI vs Mistral) — yukki est claude-only par construction (CLAUDE.md)
- Interface CLI pour appeler `SuggestRewrite` directement (le contexte SPDD est lourd à passer en flags)

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Streaming token-par-token visible dans le diff panel

- **Given** je sélectionne 3 mots dans Background, je clique "Améliorer la lisibilité"
- **When** la requête part vers `claude` CLI via `ClaudeProvider`
- **Then** le panneau APRÈS du diff panel affiche les chunks au fil de la
  réponse (≥ 3 mises à jour DOM observables via `MutationObserver` en e2e),
  spinner visible jusqu'au `done`, durée affichée à la fin (`2.1s`)

### AC2 — Prompt système construit avec contexte de section

- **Given** action `rephrase` sur sélection dans la section AC
- **When** je consulte `Voir le prompt` dans le popover ouvert juste avant l'action
- **Then** le prompt affiché contient : (1) "Tu es un rédacteur SPDD", (2) la
  définition de la section AC (Given/When/Then, testable), (3) le critère de
  l'action `rephrase`, (4) le texte sélectionné délimité, (5) l'instruction
  de format

### AC3 — Annulation pendant le streaming

- **Given** une suggestion est en cours, le panel affiche du texte partiel
- **When** je clique sur "Arrêter"
- **Then** `SpddSuggestCancel(sessionID)` est appelé, la goroutine Go reçoit
  l'annulation via `ctx.Done()`, l'événement `spdd:suggest:error` est émis
  avec message `"cancelled by user"`, le panel revient à un état neutre sans
  perdre la sélection initiale

### AC4 — Régénération produit une variante distincte

- **Given** une 1re suggestion a été affichée et n'a pas été acceptée
- **When** je clique sur "↻ Régénérer"
- **Then** un nouveau `SpddSuggestStart` est lancé, le prompt système inclut
  "Génère une variante différente de la précédente : <texte de la suggestion 1>",
  le panel APRÈS affiche un nouveau streaming et la suggestion finale est
  textuellement distincte (en pratique : comparaison Levenshtein > 5%, à
  faire via test d'intégration sur un mock LLM déterministe)

### AC5 — Erreur LLM remontée à l'UI avec contexte

- **Given** `claude` CLI retourne un exit code non-zéro (ex : pas authentifié,
  rate limit, network error)
- **When** la goroutine Go reçoit l'erreur
- **Then** `spdd:suggest:error` est émis avec un message FR utilisateur-final
  ("Yuki n'a pas pu joindre le modèle. Vérifie que `claude auth status` retourne OK,
  puis relance la suggestion.") **et** un message technique séparé loggé
  côté Go (stderr complet)

### AC6 — Définitions de sections versionnées

- **Given** le fichier `.yukki/methodology/section-definitions.yaml` n'existe pas
- **When** `SpddSuggestStart` est appelé
- **Then** une erreur `definitions file missing` est levée au démarrage de
  l'app (pas à l'usage), et un script `scripts/yukki/generate-section-definitions.sh`
  permet de le créer à partir du template SPDD

### AC7 — Token usage logué pour observabilité

- **Given** une suggestion réussit
- **When** la réponse est complète
- **Then** un log structuré est émis côté Go avec : `sessionID`, `section`,
  `action`, `inputTokens` (estimé), `outputTokens` (compté côté CLI),
  `durationMs`, `model` ; aucune mention du contenu (privacy)

## Open Questions

- [ ] Définition des **critères mesurables** par action : *Améliorer la
      lisibilité* (Flesch ?), *Enrichir* (longueur +30% ?), *Reformuler*
      (longueur ±10%), *Raccourcir* (longueur -30%) — doit être validé avec
      des PO réels avant de figer.
- [ ] Doit-on *fournir au LLM tout le contexte de la story* (toutes les
      sections déjà rédigées) ou juste la section courante ? Trade-off :
      qualité vs coût en tokens.
- [ ] Cache mémoire des suggestions par `(action, selectedText)` pour ne pas
      relancer le LLM si l'utilisateur ferme et rouvre la même sélection ?
- [ ] Faut-il streamer en SSE via un endpoint HTTP plutôt que via Wails event ?
      Wails event est plus simple, SSE serait nécessaire seulement si on
      ouvre l'éditeur en mode web (hors scope CORE-008).

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md) — backend IA
- Dépend de CORE-006 (streaming `claude` CLI déjà en place pour les commandes
  SPDD ; on étend l'usage à la suggestion contextuelle)
- Réutilise les patterns de `internal/provider/claude.go` (subprocess + stdout streaming)
- L'UI cible (UI-014d) doit être prête pour bénéficier de ce streaming ;
  intégration effective en UI-014f
