---
id: CORE-008
slug: llm-suggestion-streaming
story: .yukki/stories/CORE-008-llm-suggestion-streaming.md
analysis: .yukki/analysis/CORE-008-llm-suggestion-streaming.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — Streaming des suggestions IA contextuelles

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

L'éditeur SPDD (UI-014d) propose une UX d'assistance générative avec un LLM
**mocké**. Cette story implémente la couche Go qui :
1. construit un prompt système contextualisé (section SPDD + action + texte sélectionné),
2. lance une goroutine `claude` CLI en mode streaming par session,
3. émet des events Wails `spdd:suggest:chunk/done/error` consommés par le front,
4. supporte l'annulation individuelle par `sessionID`.

### Definition of Done

- [ ] `SpddSuggestStart(req SuggestionRequest) (string, error)` lance une goroutine streaming et retourne un `sessionID`.
- [ ] Chaque chunk text reçu de `claude` est émis immédiatement via `spdd:suggest:chunk`.
- [ ] À la fin, `spdd:suggest:done` est émis avec `{sessionID, fullText, durationMs}`.
- [ ] En cas d'erreur ou d'annulation, `spdd:suggest:error` est émis avec `{sessionID, message, technical}`.
- [ ] `SpddSuggestCancel(sessionID string) error` annule la goroutine correspondante via `context.CancelFunc`.
- [ ] `SpddSuggestPreview(req SuggestionRequest) (string, error)` retourne le prompt construit sans lancer la génération.
- [ ] `promptbuilder.Build(req, defs)` produit un prompt avec les 5 éléments d'AC2 : préambule SPDD, définition de section, critère d'action, texte sélectionné délimité, instruction de format.
- [ ] `SelectedText = ""` dans `SpddSuggestStart` → erreur immédiate (pas de goroutine lancée).
- [ ] `App.OnShutdown` annule toutes les sessions actives.
- [ ] Le log structuré `slog` n'inclut jamais le texte sélectionné ni le prompt complet.
- [ ] Un `ChunkMockProvider` dans `internal/provider` permet de tester le streaming sans subprocess.

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `SuggestionRequest` | Requête de suggestion envoyée par le front | `Section string`, `Action string`, `SelectedText string`, `PreviousSuggestion string` (optionnel, pour régénération) | value object, sérialisé JSON par Wails |
| `SuggestSession` | Session de streaming active | `sessionID string`, `cancel context.CancelFunc`, `startedAt time.Time` | créée dans `SpddSuggestStart`, stockée dans `App.sessions`, supprimée à la fin |
| `SectionDefinitions` | Définitions prose des sections SPDD | `map[string]string` (section → définition) | chargée au démarrage, immutable pendant la vie de l'App |
| `Suggestion` | Résultat final d'une session réussie | `SessionID string`, `FullText string`, `DurationMs int64`, `Section string`, `Action string` | value object, logué (sans texte) à la fin du streaming |
| `ChunkMockProvider` | Test double pour le streaming | `Chunks []string`, `Err error` | appelle `OnChunk` pour chaque chunk, puis retourne `Err` |

### Relations

- `App` ⟶ `SuggestSession` (0..n) : via `sessions sync.Map`, clé = sessionID
- `SpddSuggestStart` ⟶ `promptbuilder.Build` ⟶ `SectionDefinitions` : pipeline prompt
- `SpddSuggestStart` ⟶ goroutine ⟶ `ClaudeProvider` (clone local avec `OnChunk`) ⟶ `runtime.EventsEmit`

---

## A — Approach

**Isolation par clone de provider** : pour chaque session, `SpddSuggestStart` crée un
`*provider.ClaudeProvider` local (clone du provider partagé `App.provider` s'il est un
`*ClaudeProvider`) avec `OnChunk` injecté. Le provider partagé n'est jamais muté.
Si `App.provider` n'est pas un `*ClaudeProvider`, on retourne une erreur "provider
does not support streaming" (usage test/mock).

**Goroutine + `sync.Map`** : chaque session est une goroutine indépendante référencée
par un `sessionID` généré via `fmt.Sprintf("spdd-%d", time.Now().UnixNano())`.
La `SuggestSession` est insérée dans `App.sessions sync.Map` avant le lancement de la
goroutine, supprimée dans un `defer` à la fin. Pas de limite de sessions simultanées
(usage desktop, jamais plus de 2 en pratique).

**`internal/promptbuilder`** : package pur (pas d'I/O) qui construit le prompt. Reçoit
`SuggestionRequest` + `SectionDefinitions`, retourne une `string`. Testable sans mock.

**Événements Wails** : pattern identique à `"project:opened"` — `emitEvent(a.ctx, event, payload)`.
Trois events : `spdd:suggest:chunk` → `{sessionID, text}`, `spdd:suggest:done` →
`{sessionID, fullText, durationMs}`, `spdd:suggest:error` → `{sessionID, message, technical}`.

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Modifier l'interface `Provider` pour `GenerateStream` | Casse `MockProvider` et le contrat CORE-001 ; interface reste simple |
| Muter `ClaudeProvider.OnChunk` sur le provider partagé | Non thread-safe pour sessions concurrentes |
| Channel Go exposé au front | Wails ne sérialise pas les channels ; events sont le seul mécanisme |

---

## S — Structure

| Module | Fichiers | Nature |
|---|---|---|
| `internal/provider` | `suggest.go` — `SuggestionRequest`, `Suggestion`, `ChunkMockProvider` | Création |
| `internal/promptbuilder` | `promptbuilder.go` — `Build`, `ActionCriteria`, `SectionDefinitions` | Création |
| `internal/promptbuilder` | `loader.go` — `LoadSectionDefs(dir) (SectionDefinitions, error)` + embed | Création |
| `internal/promptbuilder` | `default-section-defs.yaml` — fallback embed | Création |
| `internal/promptbuilder` | `promptbuilder_test.go` — tests Build | Création |
| `internal/uiapp` | `app.go` — ajout champ `sessions sync.Map` + `sectionDefs` + `OnShutdown` cleanup | Modification |
| `internal/uiapp` | `suggest.go` — `SpddSuggestStart`, `SpddSuggestCancel`, `SpddSuggestPreview` | Création |
| `internal/uiapp` | `suggest_test.go` — tests bindings suggestion | Création |
| `.yukki/methodology` | `section-definitions.yaml` — définitions SPDD des sections | Création |

### Flux d'appel

```
[Frontend TS]
  SpddSuggestStart(req)
        │ validate req.SelectedText != ""
        │ sessionID = fmt.Sprintf("spdd-%d", now.UnixNano())
        │ prompt = promptbuilder.Build(req, a.sectionDefs)
        │ clone = cloneProviderWithChunk(a.provider, onChunk)
        │ store SuggestSession in a.sessions
        │ go func() {
        │   defer a.sessions.Delete(sessionID)
        │   clone.Generate(ctx, prompt)
        │     → onChunk → EventsEmit("spdd:suggest:chunk", {sessionID, text})
        │   → EventsEmit("spdd:suggest:done", {sessionID, fullText, durationMs})
        │   [error] → EventsEmit("spdd:suggest:error", {sessionID, msg, technical})
        │ }()
        ↓ return sessionID, nil

  SpddSuggestCancel(sessionID)
        │ load from a.sessions
        │ call cancel()
        ↓ return nil (or error if not found)

  SpddSuggestPreview(req)
        ↓ return promptbuilder.Build(req, a.sectionDefs), nil
```

---

## O — Operations

### O1 — `SuggestionRequest`, `Suggestion`, `ChunkMockProvider` dans `internal/provider`

**Module** : `internal/provider`
**Fichier** : `internal/provider/suggest.go`

**Signatures** :
```go
// SuggestionRequest is the input to SpddSuggestStart.
type SuggestionRequest struct {
    Section            string `json:"section"`            // "bg"|"bv"|"si"|"so"|"ac"|"oq"|"notes"
    Action             string `json:"action"`             // "improve"|"enrich"|"rephrase"|"shorten"
    SelectedText       string `json:"selectedText"`
    PreviousSuggestion string `json:"previousSuggestion,omitempty"`
}

// Suggestion is the result of a completed suggestion session (logged, never sent to front).
type Suggestion struct {
    SessionID  string
    FullText   string
    DurationMs int64
    Section    string
    Action     string
}

// ChunkMockProvider is a test double for streaming-capable providers.
// It calls onChunk for each element of Chunks, then returns Err.
type ChunkMockProvider struct {
    Chunks []string
    Err    error
}

func (m *ChunkMockProvider) GenerateWithChunk(ctx context.Context, prompt string, onChunk func(string)) (string, error)
```

**Comportement de `ChunkMockProvider.GenerateWithChunk`** :
1. Concaténer les chunks dans `full`.
2. Pour chaque chunk en `m.Chunks` : appeler `onChunk(chunk)`.
3. Si `ctx.Done()` est fermé avant la fin → retourner `ctx.Err()`.
4. Retourner `full, m.Err`.

**Tests** :
- `TestChunkMockProvider_CallsOnChunkInOrder` : 3 chunks → onChunk appelé 3 fois dans l'ordre.
- `TestChunkMockProvider_RespectsContextCancellation` : contexte annulé → retour immédiat.

---

### O2 — `internal/promptbuilder` : construction du prompt système

**Module** : `internal/promptbuilder`
**Fichier** : `internal/promptbuilder/promptbuilder.go`

**Signatures** :
```go
package promptbuilder

// SectionDefinitions maps a SPDD section key to its prose definition.
type SectionDefinitions map[string]string

// ActionCriteria maps an action key to its measurable criterion (FR).
var ActionCriteria = map[string]string{
    "improve":  "Améliorer la lisibilité : simplifier les formulations, réduire le jargon, conserver le sens. Longueur ±20%.",
    "enrich":   "Enrichir : ajouter des précisions ou exemples pertinents. Longueur +20% à +50%.",
    "rephrase": "Reformuler : changer la structure des phrases sans modifier le sens. Longueur ±10%.",
    "shorten":  "Raccourcir : supprimer les redondances, conserver l'essentiel. Longueur −20% à −40%.",
}

// Build constructs the system prompt for a SPDD suggestion request.
// Returns an error if the action or section is unrecognised.
func Build(req provider.SuggestionRequest, defs SectionDefinitions) (string, error)
```

**Comportement de `Build`** :
1. Vérifier que `req.Action` est dans `ActionCriteria` → erreur sinon.
2. Récupérer la définition de section `defs[req.Section]` (peut être vide si section inconnue — non bloquant).
3. Construire le prompt :
   ```
   Tu es un rédacteur SPDD. Ta réponse doit modifier uniquement la portion sélectionnée,
   en respectant les conventions de la section « <section> ».

   Définition de la section :
   <sectionDef ou "Non définie.">

   Action demandée : <ActionCriteria[req.Action]>

   Texte sélectionné (à modifier) :
   <<<
   <req.SelectedText>
   >>>
   <si PreviousSuggestion != "">
   Génère une variante différente de la précédente :
   <<<
   <req.PreviousSuggestion>
   >>>
   </si>
   Réponds uniquement avec le texte de remplacement, sans guillemets ni explication.
   ```
4. Retourner le prompt.

**Tests** :
- `TestBuild_ContainsFiveElements` : vérifier que le prompt contient : "Tu es un rédacteur SPDD", définition de section, critère d'action, texte sélectionné délimité, instruction de format.
- `TestBuild_UnknownAction_ReturnsError` : `Action = "dance"` → erreur.
- `TestBuild_PreviousSuggestion_IncludesVariantInstruction` : `PreviousSuggestion` non-vide → prompt contient "variante différente".
- `TestBuild_EmptySection_NotBlocking` : section inconnue → pas d'erreur, "Non définie." dans le prompt.

---

### O3 — `promptbuilder.LoadSectionDefs` + `default-section-defs.yaml`

**Module** : `internal/promptbuilder`
**Fichiers** : `internal/promptbuilder/loader.go`, `internal/promptbuilder/default-section-defs.yaml`

**Signature** :
```go
// LoadSectionDefs loads section definitions from <projectDir>/.yukki/methodology/section-definitions.yaml.
// Falls back to the embedded default-section-defs.yaml if the file is absent.
func LoadSectionDefs(projectDir string) (SectionDefinitions, error)
```

**Contenu de `default-section-defs.yaml`** :
```yaml
bg: "Background : contexte métier ou technique, 3-6 lignes. Répond à 'Pourquoi cette story existe ?'"
bv: "Business Value : gain mesurable, à qui ça sert. Ex. 'permettre aux équipes Run d'exporter les vulnérabilités Trivy au format CSV'."
si: "Scope In : liste de points, chacun commençant par '-', décrivant ce qui est dans le périmètre."
so: "Scope Out : liste de points explicitement exclus et justifiés."
ac: "Acceptance Criteria : format Given/When/Then. Chaque critère doit être testable indépendamment."
oq: "Open Questions : liste de questions ouvertes pour le PO ou l'archi, format '- [ ] question'."
notes: "Notes : liens, références externes, screenshots, captures Bruno, threads Slack."
```

**Tests** :
- `TestLoadSectionDefs_FallbackWhenNoFile` : projectDir vide → defs non-vides (fallback).
- `TestLoadSectionDefs_ReadsProjectFile` : fichier custom → defs du fichier.

---

### O4 — `App` : champ `sessions` + `sectionDefs` + cleanup `OnShutdown`

**Module** : `internal/uiapp`
**Fichier** : `internal/uiapp/app.go`

**Modifications** :
```go
// Dans App struct, ajouter :
sessions    sync.Map        // map[sessionID string]*suggestSession
sectionDefs promptbuilder.SectionDefinitions

// Dans OnStartup, après draftStore init :
defs, err := promptbuilder.LoadSectionDefs(a.activeProjectDir())
if err != nil && a.logger != nil {
    a.logger.Warn("could not load section definitions", "err", err)
}
a.sectionDefs = defs

// Dans OnShutdown (à créer ou modifier si existante) :
a.sessions.Range(func(_, v any) bool {
    if s, ok := v.(*suggestSession); ok {
        s.cancel()
    }
    return true
})
```

**Type interne** :
```go
type suggestSession struct {
    cancel    context.CancelFunc
    startedAt time.Time
}
```

**Tests** :
- `TestApp_OnShutdown_CancelsActiveSessions` : démarrer une session → shutdown → vérifier ctx annulé.

---

### O5 — Bindings Wails `SpddSuggestStart`, `SpddSuggestCancel`, `SpddSuggestPreview`

**Module** : `internal/uiapp`
**Fichier** : `internal/uiapp/suggest.go`

**Signatures** :
```go
// SpddSuggestStart launches a streaming suggestion goroutine and returns a sessionID.
// Returns an error immediately if req.SelectedText is empty or the provider does not support streaming.
func (a *App) SpddSuggestStart(req provider.SuggestionRequest) (string, error)

// SpddSuggestCancel cancels the active streaming session identified by sessionID.
// Returns an error if the sessionID is not found.
func (a *App) SpddSuggestCancel(sessionID string) error

// SpddSuggestPreview returns the prompt that would be sent for req, without starting a generation.
func (a *App) SpddSuggestPreview(req provider.SuggestionRequest) (string, error)
```

**Comportement de `SpddSuggestStart`** :
1. Valider `req.SelectedText != ""` → `errors.New("selectedText must not be empty")`.
2. Valider `req.Action` via `promptbuilder.ActionCriteria` → erreur si inconnu.
3. `sessionID = fmt.Sprintf("spdd-%d", time.Now().UnixNano())`.
4. `prompt, err := promptbuilder.Build(req, a.sectionDefs)` → retourner si err.
5. Cloner le provider : si `App.provider` est `*provider.ClaudeProvider` → créer une copie locale `c := *cp ; c.OnChunk = onChunk` ; sinon → `errors.New("provider does not support streaming")`.
6. Créer `ctx, cancel := context.WithCancel(a.ctx)`.
7. Stocker `a.sessions.Store(sessionID, &suggestSession{cancel: cancel, startedAt: time.Now()})`.
8. Lancer goroutine :
   ```go
   go func() {
       defer a.sessions.Delete(sessionID)
       start := time.Now()
       var full strings.Builder
       c.OnChunk = func(text string) {
           full.WriteString(text)
           emitEvent(a.ctx, "spdd:suggest:chunk", map[string]any{"sessionID": sessionID, "text": text})
       }
       _, err := c.Generate(ctx, prompt)
       durationMs := time.Since(start).Milliseconds()
       if err != nil {
           msg, technical := friendlyError(err)
           emitEvent(a.ctx, "spdd:suggest:error", map[string]any{"sessionID": sessionID, "message": msg, "technical": technical})
           a.logger.Warn("suggest error", "sessionID", sessionID, "section", req.Section, "action", req.Action, "durationMs", durationMs, "err", technical)
           return
       }
       a.logger.Info("suggest done", "sessionID", sessionID, "section", req.Section, "action", req.Action, "durationMs", durationMs)
       emitEvent(a.ctx, "spdd:suggest:done", map[string]any{"sessionID": sessionID, "fullText": full.String(), "durationMs": durationMs})
   }()
   ```
9. Retourner `sessionID, nil`.

**`friendlyError(err error) (userMsg, technical string)`** :
- Si `errors.Is(err, context.Canceled)` → `"Suggestion annulée.", "cancelled by user"`.
- Si `errors.Is(err, provider.ErrGenerationFailed)` → message FR + `err.Error()` technique.
- Sinon → message générique + `err.Error()`.

**Tests** :
- `TestApp_SpddSuggestStart_EmptySelectedText_ReturnsError` : `SelectedText = ""` → erreur immédiate.
- `TestApp_SpddSuggestStart_StreamsChunks` : `ChunkMockProvider` avec 3 chunks → vérifier 3 events `spdd:suggest:chunk` émis + 1 event `done`.
- `TestApp_SpddSuggestCancel_CancelsSession` : démarrer session bloquante → cancel → event `spdd:suggest:error` avec "annulée".
- `TestApp_SpddSuggestPreview_ReturnsPrompt` : prompt contient "Tu es un rédacteur SPDD".

---

## N — Norms

- **Go 1.22+** : `sync.Map`, `context.WithCancel`, `strings.Builder`.
- **`internal/promptbuilder` n'importe jamais `internal/uiapp` ni `internal/provider/claude.go`** — uniquement les types partagés (`SuggestionRequest`).
- **Logs structurés `slog`** : `sessionID`, `section`, `action`, `durationMs` — jamais `selectedText`, `prompt`, `fullText`.
- **Events Wails** : payloads sérialisés en `map[string]any` (compatibilité JSON Wails).
- **Clonage provider** : copier la struct `ClaudeProvider` par valeur (`c := *cp`) avant d'injecter `OnChunk` — ne jamais muter le provider partagé.
- **Tests table-driven** pour `promptbuilder.Build`.
- **`ChunkMockProvider` dans `internal/provider`** pour tester le streaming sans subprocess.

---

## S — Safeguards

- **Ne jamais logguer `selectedText` ni le prompt complet** : log de session limité à `sessionID`, `section`, `action`, `durationMs`.
- **Ne jamais muter `App.provider`** : cloner localement avant d'injecter `OnChunk`.
- **Ne jamais lancer la goroutine si `req.SelectedText = ""`** : validation avant lancement.
- **`App.OnShutdown` annule toutes les sessions** : `sessions.Range(cancel())` — pas de goroutine orpheline.
- **`promptbuilder` ne fait jamais d'I/O** (sauf `LoadSectionDefs`) : `Build` est une transformation pure.
- **Ne jamais retourner le texte sélectionné dans une erreur** : les erreurs contiennent uniquement le contexte technique (section, action, sessionID).

---

## Open Questions

- [ ] **Contexte complet de la story dans le prompt** : fournir uniquement `selectedText + section` ou toutes les sections déjà rédigées ? Décision reportée à UI-014f (l'UI sait quelles sections sont remplies).
- [ ] **Limite de sessions simultanées** : en pratique 1 session à la fois (UX), mais aucune limite technique. Ajouter une limite si les tests de charge révèlent un problème.
