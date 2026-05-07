---
id: CORE-008
slug: llm-suggestion-streaming
story: .yukki/stories/CORE-008-llm-suggestion-streaming.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Streaming des suggestions IA contextuelles via ClaudeProvider

> Contexte stratégique pour `CORE-008-llm-suggestion-streaming`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase.

## Mots-clés métier extraits

`SuggestRewrite`, `SuggestionRequest`, `SectionContext`, `promptbuilder`,
`section-definitions`, `SpddSuggestStart`, `SpddSuggestCancel`, `sessionID`,
`OnChunk`, `ChunkFunc`, `stream-json`, `spdd:suggest:chunk`, `spdd:suggest:done`,
`spdd:suggest:error`, `useSpddSuggest`, `durationMs`

## Concepts de domaine

> Selon [`.yukki/methodology/domain-modeling.md`](./../methodology/domain-modeling.md)

### Concepts existants

| Brique | Nom | Où vit-il | Contrainte connue |
|---|---|---|---|
| Integration point | `ClaudeProvider.Generate` | `internal/provider/claude.go` | Supporte déjà `OnChunk ChunkFunc` pour le mode streaming (CORE-006) ; args `--output-format stream-json --verbose` prépendés automatiquement |
| Integration point | `ClaudeProvider.OnChunk` | `internal/provider/claude.go` | Champ de la struct, pas un paramètre — doit être muté avant appel pour activer le streaming |
| Entity | `App` | `internal/uiapp/app.go` | Contient `runStoryCancel context.CancelFunc` + `cancelMu sync.Mutex` — pattern de cancel déjà utilisé pour `RunStory` / `AbortRunning` |
| Value Object | `MockProvider` | `internal/provider/mock.go` | Implémente `Provider` ; `BlockUntil chan struct{}` pour les tests ; **ne supporte pas** `OnChunk` — à étendre |
| Domain event | `runtime.EventsEmit` (Wails) | `internal/uiapp/app.go` | Utilisé pour `"project:opened"` etc. ; même pattern attendu pour `spdd:suggest:chunk/done/error` |

### Concepts nouveaux

| Brique | Nom | Justification |
|---|---|---|
| Value Object | `SuggestionRequest` | Encapsule `Section`, `Action`, `SelectedText`, `PreviousSuggestion` (pour la régénération) — type Go propre, sérialisé en JSON par Wails vers le front |
| Value Object | `SectionContext` | Texte complet de la section + définition SPDD chargée depuis `section-definitions.yaml` — sert à construire le prompt |
| Value Object | `Suggestion` | Résultat final d'une suggestion : `SessionID`, `FullText`, `DurationMs`, `Section`, `Action` — loggé côté Go |
| Operation | `promptbuilder.Build(req SuggestionRequest, defs SectionDefinitions) (string, error)` | Construit le prompt système contextualisé ; séparé dans son propre package pour testabilité indépendante |
| Entity | `SuggestSession` | Goroutine en cours, référencée par `sessionID string` ; contient `cancel context.CancelFunc` ; stockée dans `App.sessions sync.Map` |
| Value Object | `SectionDefinitions` | Map `section -> definition prose` chargée depuis `.yukki/methodology/section-definitions.yaml` ou un embed FS de fallback |
| Domain event | `spdd:suggest:chunk` | Émis à chaque chunk de texte — payload `{sessionID, text}` |
| Domain event | `spdd:suggest:done` | Émis à la fin — payload `{sessionID, fullText, durationMs}` |
| Domain event | `spdd:suggest:error` | Émis sur erreur ou annulation — payload `{sessionID, message, technical}` |

**Invariant** : un seul binding expose la suggestion (`SpddSuggestStart`) ; la goroutine qui stream est entièrement côté Go. Le front ne connaît que les events Wails et le `sessionID`.

**Invariant 2** : `promptbuilder` n'importe ni `internal/uiapp` ni `internal/provider` — c'est une transformation pure string → string.

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](./../methodology/decisions.md)

Pour résoudre le problème d'**intégration entre l'UX de suggestion (UI-014d) et le streaming LLM réel** sans modifier l'interface `Provider`, on choisit d'**ajouter une méthode `GenerateStream(ctx, prompt, onChunk)` sur `ClaudeProvider`** (ou d'utiliser `OnChunk` comme actuellement) et d'**orchestrer la session dans `App.SpddSuggestStart`** via `sync.Map` de `SuggestSession`, plutôt que de modifier l'interface `Provider` pour y injecter un callback ou d'utiliser un channel Go exposé au front, pour atteindre **l'isolation entre la mécanique de streaming et le contrat Provider existant** (CORE-001 ne casse pas), en acceptant **un couplage App → ClaudeProvider** (cast `provider.(interface{Stream...})` ou méthode dédiée sur `App`) — mitigé par le fait qu'en prod yukki est claude-only.

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Modifier l'interface `Provider` pour ajouter `GenerateStream` | Casse `MockProvider` + tout le code qui implémente `Provider` ; CORE-002 interdit les dépendances circulaires ; l'interface doit rester simple |
| Utiliser `ClaudeProvider.OnChunk` (champ mutable) directement depuis le binding | `OnChunk` est un champ de struct, pas thread-safe si plusieurs sessions concurrentes ; mutation de l'objet partagé `App.provider` |
| Exposer un channel Go au front via Wails | Wails ne sérialise pas les channels ; il faut passer par `runtime.EventsEmit` — c'est le pattern retenu |
| Streamer via HTTP/SSE depuis l'App | Surcoût d'un serveur HTTP embarqué ; inutile dans le contexte Wails desktop |

**Décision retenue** : `App` crée un `ClaudeProvider` local par session (ou clone le provider avec `OnChunk` injecté), exécute la goroutine, et émet des events Wails. Ainsi le provider partagé `App.provider` n'est jamais muté.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/provider` | Moyen | Modification : ajout `SuggestionRequest`, `Suggestion` types + `SuggestRewrite` fonction (ou méthode) |
| `internal/uiapp` | Fort | Modification : `app.go` ajoute `sessions sync.Map` ; `bindings.go` ajoute `SpddSuggestStart`, `SpddSuggestCancel`, `SpddSuggestPreview` |
| `internal/promptbuilder` | Fort | Création : nouveau package — `Build(req, defs) string` + `LoadSectionDefs(dir) SectionDefinitions` |
| `frontend` | Moyen | Modification : hook `useSpddSuggest` remplace `useFakeSuggestion` — dépend de UI-014f, pas directement généré ici |

## Dépendances et intégrations

- `ClaudeProvider` existant : réutilisé via clone local par session (`*ClaudeProvider` avec `OnChunk` injecté)
- `runtime.EventsEmit(ctx, event, payload)` : pattern Wails identique à `"project:opened"`
- `sync.Map` : pour stocker les `SuggestSession` actives — thread-safe sans mutex explicite
- `.yukki/methodology/section-definitions.yaml` : nouveau fichier YAML à créer ; fallback via `embed.FS`
- `gopkg.in/yaml.v3` : déjà en `go.mod`

## Risques

> Catégories selon [`.yukki/methodology/risk-taxonomy.md`](./../methodology/risk-taxonomy.md)

| # | Catégorie | Risque | Impact | Proba | Mitigation |
|---|---|---|---|---|---|
| R1 | **Performance-Reliability** | Goroutine orpheline si l'app ferme pendant un streaming actif | Moyen | Moyen | `App.OnShutdown` annule tous les contextes de session via `sync.Map.Range` |
| R2 | **Sécurité (STRIDE — Info Disclosure)** | Le texte sélectionné (contenu de story) est logué côté Go | Haut | Faible | Safeguard CORE-001 : logs uniquement `sessionID, section, action, durationMs` — jamais le texte |
| R3 | **Intégration** | `MockProvider` ne supporte pas `OnChunk` — les tests App seraient non-représentatifs | Haut | Certain | Créer `ChunkMockProvider` qui appelle `OnChunk` token par token (test double dédié) |
| R4 | **Compatibilité** | La sérialisation Wails de `SuggestionRequest` peut échouer si le front envoie des champs inconnus | Faible | Faible | Champs `omitempty` sur `SuggestionRequest` + Wails ignore les champs inconnus |
| R5 | **Opérationnel** | `section-definitions.yaml` absent : la suggestion plante au runtime | Moyen | Moyen | Embed FS de fallback (même pattern que `default-modules.yaml` dans CORE-007) |

## Cas limites

> Catégories selon [`.yukki/methodology/edge-cases.md`](./../methodology/edge-cases.md)

| # | Catégorie | Cas limite | Attendu |
|---|---|---|---|
| E1 | **Concurrence** | Deux `SpddSuggestStart` simultanés sur sessions différentes | Deux goroutines indépendantes ; `sync.Map` gère l'isolation par `sessionID` |
| E2 | **Annulation** | `SpddSuggestCancel` appelé avant que le premier chunk soit reçu | Le `ctx.Done()` coupe le subprocess `claude` avant toute émission ; `spdd:suggest:error` avec `"cancelled by user"` |
| E3 | **Erreur CLI** | `claude` retourne exit code non-zéro | `spdd:suggest:error` émis avec message FR user-facing + message technique loggé (slog) |
| E4 | **Texte vide** | `SelectedText = ""` | Erreur retournée par `SpddSuggestStart` avant de lancer la goroutine |
| E5 | **SessionID inconnu** | `SpddSuggestCancel("unknown-session")` | Pas d'erreur (idempotent) ; erreur si le sessionID n'est pas dans la map |

## Décisions à prendre avant le canvas

1. **Interface `Provider` vs méthode dédiée** : ne pas modifier `Provider` — `App` crée un `*ClaudeProvider` local avec `OnChunk` injecté par session. Décision ferme.

2. **Format de `sessionID`** : `uuid.New().String()` ou `fmt.Sprintf("suggest-%d", time.Now().UnixNano())`? → **Proposition** : `fmt.Sprintf("spdd-%d", time.Now().UnixNano())` — zéro dépendance externe, collision quasi-impossible en usage desktop.

3. **`promptbuilder` vs inline dans `bindings.go`** : package séparé `internal/promptbuilder` pour testabilité indépendante. Décision ferme.

4. **`section-definitions.yaml` dans `.yukki/methodology/` vs embed** : fichier versionnée dans le repo + embed FS fallback (même pattern CORE-007). Décision ferme — le fichier est créé dans `.yukki/methodology/` lors du generate.
