---
id: CORE-006
slug: streaming-claude-cli
story: .yukki/stories/CORE-006-streaming-claude-cli.md
analysis: .yukki/analysis/CORE-006-streaming-claude-cli.md
status: implemented
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — Streaming live de la réponse Claude dans l'UI

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

L'UI yukki reste muette pendant toute la durée d'une génération (jusqu'à ~30 s).
Le provider Go attend la fin complète du processus `claude` avant de retourner le
texte. L'utilisateur ne peut pas détecter tôt une dérive de la réponse.

### Definition of Done

- [ ] Le texte s'affiche progressivement dans `NewStoryModal` pendant la génération
- [ ] Le fichier artefact produit est identique au comportement actuel (texte complet)
- [ ] Les events `stream-json` non-texte (`system`, `tool_use`, `result`) sont ignorés
- [ ] Une ligne JSON malformée n'interrompt pas la génération
- [ ] Le provider `gh copilot` (ou tout provider sans `OnChunk`) n'est pas affecté
- [ ] Timeout et annulation ctx fonctionnent en mode stream
- [ ] Tous les tests existants passent sans modification

---

## E — Entities

| Entité | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `ChunkFunc` | Alias de type pour le callback texte | `func(text string)` | Nil par défaut ; set par `App.RunStory` avant génération |
| `streamEvent` | Struct de désérialisation minimale d'un event `stream-json` | `Type string`, `Message struct{ Content []struct{ Text string } }`, `Result string`, `Subtype string` | Créé à chaque ligne JSON parsée ; discardé après traitement |
| `ProviderTextPayload` | Payload Wails de l'event `provider:text` | `Chunk string \`json:"chunk"\`` | Créé à chaque chunk non-vide ; consommé par le frontend |

### Relations

- `ClaudeProvider.OnChunk ChunkFunc` ← set par `App.RunStory` via wiring dans `uiProgress`
- `uiProgress.Chunk(text)` → émet `provider:text` → `NewStoryModal` EventsOn → accumule dans state local
- `Progress.Chunk(text)` ← méthode ajoutée à l'interface `workflow.Progress`
- `noopProgress.Chunk(text)` → no-op (CLI callers non affectés)

---

## A — Approach

`ClaudeProvider` reçoit un champ optionnel `OnChunk ChunkFunc`. Quand il est
non-nil, `Generate` passe `--output-format stream-json` aux args et bascule de
`cmd.Run()` + `bytes.Buffer` vers `cmd.Start()` + `bufio.Scanner` sur stdout.
Chaque ligne est parsée minimalement ; seuls les events `type=assistant` avec
un `content[].text` non-vide appellent `OnChunk`. L'event `type=result` avec
`subtype=success` fournit le texte final — c'est lui qui est retourné par
`Generate` (pas la concaténation des chunks, cf. D4). Une goroutine drainant
stderr est lancée en parallèle ; `cmd.Wait()` est appelé après le drain du scanner.

L'interface `workflow.Progress` reçoit une méthode `Chunk(text string)`.
`uiProgress` l'implémente en émettant `provider:text`. `noopProgress` en fait
un no-op. Le wiring se fait dans `App.RunStory` : après avoir créé `uiProgress`,
on set `ClaudeProvider.OnChunk = uiProgress.Chunk` — uniquement si le provider
actif est un `*ClaudeProvider`.

Côté frontend, `NewStoryModal` écoute `provider:text` et accumule les chunks
dans un state `liveText string`, affiché dans une zone scrollable.

### Alternatives écartées

- **Ajouter `StreamGenerate` à l'interface `Provider`** — cassant pour `MockProvider`
  et futurs providers. Écarté.
- **Utiliser l'event `type=result` uniquement (ignorer le streaming)** — ne résout
  pas le problème de latence perçue. Écarté.
- **io.Writer passé via context** — opaque, non idiomatique. Écarté.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/provider` | `claude.go`, `provider.go`, `mock.go` | Modification — `ChunkFunc`, champ `OnChunk`, streaming dans `Generate` |
| `internal/workflow` | `story.go` | Modification — ajout `Chunk(text)` à `Progress` + `noopProgress` |
| `internal/uiapp` | `progress.go`, `app.go` | Modification — `uiProgress.Chunk`, wiring `OnChunk`, event `provider:text` |
| `frontend` | `wails-events.ts`, `NewStoryModal.tsx` | Modification — `ProviderTextPayload`, accumulation `liveText` |

### Schéma de flux

```
App.RunStory
  │
  ├─ crée uiProgress
  ├─ cast ClaudeProvider → set OnChunk = uiProgress.Chunk
  │
  └─ workflow.RunStory(opts{Progress: uiProgress})
       │
       └─ provider.Generate(ctx, prompt)
            │
            ├─ cmd.Start() + bufio.Scanner(stdout)
            ├─ goroutine: drain stderr
            │
            └─ pour chaque ligne:
                 json.Unmarshal → streamEvent
                 type=assistant → OnChunk(text) → uiProgress.Chunk
                                                      └─ emitEvent("provider:text", {chunk})
                                                           └─ NewStoryModal: liveText += chunk
                 type=result → stocker result, break
                 autre / malformé → log Debug, continue
            │
            └─ cmd.Wait() → return result, nil
```

---

## O — Operations

### O1 — Ajouter `ChunkFunc` et champ `OnChunk` dans `ClaudeProvider`

- **Module** : `internal/provider`
- **Fichier** : `internal/provider/claude.go`
- **Signature** :
  ```go
  // ChunkFunc is the callback type invoked with each text chunk received
  // from the claude CLI stream-json output. text is always non-empty.
  type ChunkFunc func(text string)

  type ClaudeProvider struct {
      // ... champs existants inchangés ...

      // OnChunk, when non-nil, activates streaming mode: --output-format
      // stream-json is added to Args, and each text chunk from the assistant
      // is passed to OnChunk before Generate returns. nil = non-streaming
      // (backward-compatible).
      OnChunk ChunkFunc
  }
  ```
- **Comportement** : ajout du type alias et du champ. Aucune logique modifiée ici.
- **Tests** : aucun test unitaire direct — couvert par O2.

### O2 — Implémenter le streaming dans `ClaudeProvider.Generate`

- **Module** : `internal/provider`
- **Fichier** : `internal/provider/claude.go`
- **Signature** : `func (p *ClaudeProvider) Generate(ctx context.Context, prompt string) (string, error)` (inchangée)
- **Comportement** :
  1. Si `p.OnChunk == nil` → comportement identique à l'actuel (`cmd.Run()` + `bytes.Buffer`) → retourner `stdout.String()`
  2. Si `p.OnChunk != nil` :
     a. Prepend `--output-format stream-json` dans args si absent
     b. `cmd.Start()` ; `cmd.Stdin = strings.NewReader(prompt)`
     c. Goroutine : `io.Copy(io.Discard, cmd.Stderr)` (stderr drainé, non loggué ligne par ligne)
     d. `scanner := bufio.NewScanner(cmd.Stdout)` ; `scanner.Buffer(make([]byte, 1<<20), 1<<20)`
     e. Pour chaque `scanner.Scan()` :
        - `json.Unmarshal(line, &ev)` ; si erreur → `p.logger.Debug("stream-json: skip malformed line")` ; `continue`
        - Si `ev.Type == "assistant"` → pour chaque `c` dans `ev.Message.Content` : si `c.Text != ""` → `p.OnChunk(c.Text)`
        - Si `ev.Type == "result"` → stocker `finalText = ev.Result` ; `break`
     f. `cmd.Wait()` (après drain scanner)
     g. Si `ctx.Err() != nil` → `return "", fmt.Errorf("%w: ...", ErrGenerationFailed)`
     h. Si exit error → propager comme avant
     i. Retourner `finalText, nil`
- **Tests** (étendre `claude_test.go`, stub binary) :
  - `TestClaudeProvider_Generate_Streaming_HappyPath` : stub émet 3 lignes `type=assistant` + 1 `type=result` → vérifie chunks reçus + texte final
  - `TestClaudeProvider_Generate_Streaming_MalformedLine` : stub émet une ligne non-JSON entre deux events valides → génération continue, chunks corrects
  - `TestClaudeProvider_Generate_Streaming_EmptyChunk` : stub émet `content[].text=""` → `OnChunk` pas appelé
  - `TestClaudeProvider_Generate_NoStreaming_Unchanged` : `OnChunk=nil` → comportement identique à avant (smoke test non-régression)

### O3 — Ajouter `Chunk(text string)` à `workflow.Progress`

- **Module** : `internal/workflow`
- **Fichier** : `internal/workflow/story.go`
- **Signature** :
  ```go
  type Progress interface {
      Start(label string)
      End(path string, err error)
      // Chunk delivers a partial text chunk from the provider stream.
      // Called from the provider goroutine; implementations must be safe
      // to call concurrently with Start and End.
      Chunk(text string)
  }

  type noopProgress struct{}
  func (noopProgress) Start(label string)         {}
  func (noopProgress) End(path string, err error) {}
  func (noopProgress) Chunk(text string)          {}
  ```
- **Comportement** : ajout de la méthode à l'interface et au noop. Aucune logique métier.
- **Tests** :
  - `TestNoopProgress_Chunk_NoOp` : appeler `Chunk` sur `noopProgress{}` ne panique pas.
  - Vérifier que `MockProvider` ne nécessite pas de changement (il n'implémente pas `Progress`).

### O4 — Implémenter `uiProgress.Chunk` et event `provider:text`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/progress.go`
- **Signature** :
  ```go
  const eventProviderText = "provider:text"

  // ProviderTextPayload is the JSON payload of the "provider:text" event.
  type ProviderTextPayload struct {
      Chunk string `json:"chunk"`
  }

  // Chunk emits the "provider:text" event with the partial text chunk.
  // Never emits an empty chunk.
  func (p *uiProgress) Chunk(text string) {
      if text == "" {
          return
      }
      emitEvent(p.ctx, eventProviderText, ProviderTextPayload{Chunk: text})
  }
  ```
- **Comportement** : guard sur `text == ""` ; appel à `emitEvent` sur le pattern existant.
- **Tests** (étendre `progress_test.go` ou créer) :
  - `TestUiProgress_Chunk_EmitsEvent` : vérifier que `emitEvent` est appelé avec le bon nom et payload.
  - `TestUiProgress_Chunk_EmptySkipped` : `Chunk("")` → `emitEvent` pas appelé.

### O5 — Wirer `OnChunk` dans `App.RunStory`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go`
- **Signature** : `func (a *App) RunStory(description, prefix string, strictPrefix bool) (string, error)` (inchangée)
- **Comportement** — après création de `uiProgress`, ajouter :
  ```go
  // Wire streaming chunk callback if the active provider supports it.
  if cp, ok := a.provider.(*provider.ClaudeProvider); ok {
      cp.OnChunk = prog.Chunk
      defer func() { cp.OnChunk = nil }()
  }
  ```
  Le `defer` remet `OnChunk` à nil après la génération pour éviter
  qu'un prochain appel ne reçoive un callback d'un `uiProgress` périmé.
- **Tests** :
  - `TestApp_RunStory_SetsOnChunk` : utiliser un `*ClaudeProvider` stub (ou sous-type) et vérifier que `OnChunk` est non-nil pendant `Generate`.
  - `TestApp_RunStory_ClearsOnChunkAfter` : après retour de `RunStory`, `cp.OnChunk == nil`.
  - `TestApp_RunStory_MockProviderUnaffected` : avec `MockProvider`, pas de panic (le cast échoue silencieusement).

### O6 — Ajouter `ProviderTextPayload` dans `wails-events.ts` et écouter dans `NewStoryModal`

- **Module** : `frontend`
- **Fichiers** : `frontend/src/lib/wails-events.ts`, `frontend/src/components/hub/NewStoryModal.tsx`
- **Signature** :
  ```typescript
  // wails-events.ts
  export interface ProviderTextPayload {
    chunk: string;
  }

  // NewStoryModal.tsx — dans useEffect events
  const offText = EventsOn<ProviderTextPayload>('provider:text', (p) => {
    setLiveText((prev) => prev + p.chunk);
  });
  // ...cleanup:
  offText();

  // state
  const [liveText, setLiveText] = useState<string>('');
  ```
  Réinitialiser `liveText` à `''` dans le `useEffect` qui resets l'état au
  réouverture du modal (`open && phase !== 'running'`).
- **Comportement** : afficher `liveText` dans une `<pre>` ou `<textarea readOnly>`
  scrollable dans le corps du modal quand `phase === 'running'` et `liveText !== ''`.
  Zone : `max-h-60 overflow-y-auto text-xs font-mono`.
- **Tests** : aucun test unitaire frontend pour cette story (le rendu progressif
  est difficilement testable sans runner Wails) — couvert par test e2e manuel.

---

## N — Norms

- **Logging** : `slog` via `p.logger` dans `ClaudeProvider` ; niveau `Debug` pour les
  lignes malformées. Jamais le contenu du prompt ni des chunks dans les logs.
- **Nil-safety** : `OnChunk` et `p.logger` peuvent être nil — vérifier avant appel.
- **Thread-safety** : `uiProgress.Chunk` peut être appelé depuis la goroutine du scanner ;
  `emitEvent` (= `runtime.EventsEmit`) est thread-safe dans Wails.
- **Rétrocompatibilité** : `Generate` avec `OnChunk=nil` doit avoir un comportement
  **bit-à-bit identique** à l'actuel. Aucun test existant ne doit être modifié.
- **Interface `Provider`** : la signature de `Generate` ne change pas. Seul `Progress`
  reçoit `Chunk` — les providers qui n'implémentent pas `Progress` ne sont pas affectés.
- **Tests** : les nouveaux tests du stub binary dans `claude_test.go` suivent le pattern
  `stubMainSource` existant (ajout de `case "--stream-json"` dans le `switch`).

---

## S — Safeguards

- **Jamais `OnChunk` appelé avec un chunk vide** — guard dans `Generate` et dans
  `uiProgress.Chunk`. Un chunk vide provoquerait un event Wails inutile et une
  concaténation parasite côté frontend.
- **Jamais `finalText` depuis la concaténation des chunks** — utiliser exclusivement
  le champ `result` de l'event `type=result`. Si l'event `result` est absent (flux
  coupé), retourner `ErrGenerationFailed`.
- **Jamais de log du contenu des chunks** — les chunks contiennent le texte généré
  par Claude (potentiellement des secrets dans des prompts). Seuls les métadonnées
  (type d'event, taille en octets) peuvent être loggées au niveau Debug.
- **Jamais modifier `ClaudeProvider.Args` en place** — créer une copie locale des
  args avant d'y ajouter `--output-format stream-json` pour éviter les mutations
  concurrentes si `NewClaude` partage la slice.
- **Jamais laisser `cmd.Wait()` bloqué** — drainer stderr dans une goroutine avant
  d'appeler `Wait()` ; si le scanner est interrompu par ctx, `cmd.Process.Kill()`
  est appelé par `exec.CommandContext`.
- **Périmètre frontend** : `liveText` affiché en `<pre>` ou `<textarea readOnly>` —
  jamais via `dangerouslySetInnerHTML` (risque XSS si le CLI injecte du HTML).
- **Compatibilité** : si `--output-format stream-json` n'est pas supporté par une
  version ancienne du CLI, le processus sort avec un code non-nul → `ErrGenerationFailed`
  propagé normalement. L'utilisateur verra un message d'erreur explicite.
