---
id: UI-001c
slug: new-story-flow
story: spdd/stories/UI-001c-new-story-flow.md
analysis: spdd/analysis/UI-001c-new-story-flow.md
family-analysis: spdd/analysis/UI-001-init-desktop-app-wails-react.md
status: draft
created: 2026-05-02
updated: 2026-05-02
---

# Canvas REASONS — New Story flow : modal + RunStory binding + EventsEmit + cancellation

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> Story fille de UI-001 (famille SPIDR), conclut le cycle UI-001a/b/c.
> 15 décisions D-C1..D-C15 tranchées en revue 2026-05-02 (toutes
> recos par défaut acceptées). Étend `internal/workflow` avec
> `Progress` (additif, non-breaking), `internal/uiapp` avec
> `RunStory`/`AbortRunning`/`SuggestedPrefixes` bindings.

---

## R — Requirements

### Problème

UI-001a a livré la fenêtre vide + scaffold, UI-001b le hub read-only.
UI-001c ferme la **boucle V1 utilisateur** : un PO/dev peut générer
une story SPDD via Claude **depuis l'UI** (modal *New Story*), voir
un spinner pendant l'attente, abandonner si nécessaire, et la
nouvelle story apparaît automatiquement sélectionnée dans le hub.
Le tout sans toucher la CLI.

### Definition of Done

- [ ] `internal/workflow/story.go` étendu avec interface `Progress`
      (2 méthodes : `Start(label string)` + `End(path string, err
      error)`) et type interne `noopProgress` (zero-value). Note :
      `End` reçoit aussi le `path` du fichier créé (vide si err)
      pour que le payload `provider:end` puisse l'inclure ; sans cela
      `uiProgress` n'aurait pas accès au résultat de `Writer.Write`.
- [ ] `workflow.StoryOptions` gagne un 8ᵉ champ `Progress
      workflow.Progress` *optionnel* (zero-value = `noopProgress`).
- [ ] `workflow.RunStory` appelle `progress.Start("Asking Claude")`
      avant `Provider.Generate` et `progress.End(path, err)` après
      (avec `path == ""` si err).
- [ ] **Tests CORE-001** existants (`internal/workflow/story_test.go`)
      passent **sans modification** — Progress est strictement
      additif.
- [ ] `provider.MockProvider` gagne un champ optionnel
      `BlockUntil chan struct{}`. Si non-nil, `Generate` attend
      `<-BlockUntil` ou `<-ctx.Done()` selon le premier qui se résout.
      Default nil = comportement UI-001b inchangé.
- [ ] `internal/uiapp.App` étendu :
      - 2 nouveaux champs : `running atomic.Bool`,
        `runStoryCancel context.CancelFunc`
      - 1 sentinel exporté : `ErrAlreadyRunning`
      - 3 nouvelles méthodes bindées : `RunStory(description, prefix
        string, strictPrefix bool) (string, error)`,
        `AbortRunning() error`, `SuggestedPrefixes() []string`
- [ ] `App.RunStory` :
      1. exige `projectDir != ""` (sinon erreur claire)
      2. swap `running` à true via `Swap(true)` ; si déjà true,
         retourne `ErrAlreadyRunning`
      3. dérive `runStoryCtx, runStoryCancel := context.WithCancel(a.ctx)`
      4. construit `StoryOptions` (provider, loader, writer du state
         App + uiProgress + Description/Prefix/StrictPrefix)
      5. appelle `workflow.RunStory(runStoryCtx, opts)`
      6. defer : `running.Store(false)` + `runStoryCancel = nil`
      7. retourne le path absolu de la story créée
- [ ] `App.AbortRunning()` :
      - si `runStoryCancel != nil`, appelle la `CancelFunc` et
        retourne nil
      - sinon retourne nil (idempotent, no-op safe)
- [ ] `App.SuggestedPrefixes()` retourne une copie triée de
      `artifacts.AllowedPrefixes` (pas de mutation du slice cœur).
- [ ] **Greet() est supprimé** (D-C11) ; les tests existants qui
      l'utilisaient (`TestApp_Greet_*`) sont supprimés ou retirés.
- [ ] `internal/uiapp/progress.go` (nouveau fichier) implémente
      `uiProgress` : struct `{ ctx context.Context; logger *slog.Logger;
      started time.Time }` avec méthodes `Start(label string)` /
      `End(err error)` qui appellent `runtime.EventsEmit`.
- [ ] Event `provider:start` payload : `{label: string}`.
- [ ] Event `provider:end` payload : `{success: bool, path: string,
      error: string, durationMs: int64}` (D-C2). `path` rempli si
      success ; `error` rempli si !success ; `durationMs` toujours
      présent (calculé via `time.Since(started)`).
- [ ] Tests Go ~10 cas table-driven dans `internal/uiapp/app_test.go`
      étendu : `TestApp_RunStory_Success`, `_AlreadyRunning`,
      `_NoProject`, `_AbortMidFlight`, `_ShutdownDuringGeneration`,
      `TestApp_AbortRunning_NothingToAbort`,
      `TestApp_SuggestedPrefixes_Sorted_Distinct`,
      `TestUiProgress_EmitsStartAndEnd_OnSuccess`,
      `TestUiProgress_EmitsEnd_WithError_OnFailure`. Plus 1 test dans
      `internal/workflow/story_test.go` :
      `TestRunStory_NoopProgressFallback` (Progress=nil, comportement
      identique à avant).
- [ ] `frontend/wailsjs/go/main/App.{d.ts,js}` stubs hand-written
      mis à jour avec 3 nouvelles méthodes + interfaces TypeScript
      `RunStoryArgs`, `RunStoryResult`. Runtime path
      `window.go.uiapp.App.<method>` (D-B8b figé).
- [ ] `frontend/src/lib/wails-events.ts` (nouveau, hand-written)
      expose `EventsOn<T>(name, handler) => () => void` (return
      unsubscribe) + types `ProviderStartPayload` /
      `ProviderEndPayload`.
- [ ] `frontend/src/components/ui/dialog.tsx` ajouté via `npx shadcn
      add dialog` (composant shadcn standard).
- [ ] `frontend/src/stores/generation.ts` (nouveau) crée
      `useGenerationStore` Zustand avec `phase: 'idle' | 'running' |
      'success' | 'error'`, `currentLabel: string`, `error: string`,
      `lastResult: { path, durationMs } | null`, `startedAt: number`,
      et actions `start(label)`, `succeed(path, durationMs)`,
      `fail(error)`, `reset()`.
- [ ] `frontend/src/components/hub/NewStoryModal.tsx` (nouveau) :
      Dialog shadcn ; textarea description (`maxLength={10000}` +
      counter visible) ; Select shadcn ou combo natif pour prefix
      (peuplé via `await SuggestedPrefixes()` au mount) avec option
      *Custom* + input libre ; toggle strict prefix ; bouton *Generate*
      (`disabled` si `useClaudeStore.status.Available === false`,
      description vide, ou prefix vide) ; bouton *Cancel* ferme le
      modal.
- [ ] Phase *generating* dans `<NewStoryModal />` : spinner + label
      live (mis à jour par `provider:start`) + bouton *Abort*.
- [ ] Phase *error* : message + bouton *Retry* (re-call `App.RunStory`
      avec mêmes args) + bouton *Close*.
- [ ] Phase *success* : modal se ferme automatiquement,
      `useArtifactsStore.refresh("stories")` invoqué, puis
      `useArtifactsStore.setSelectedPath(payload.path)` pour ouvrir
      la nouvelle story dans `<StoryViewer />` (D-C10).
- [ ] Listener events `useEffect` dans `<NewStoryModal />` (au mount) :
      souscrit `provider:start` → `useGenerationStore.start(label)` ;
      souscrit `provider:end` → si success appelle `succeed(path,
      durationMs)`, sinon `fail(error)`. Unsubscribe au unmount.
- [ ] Esc / click-outside pendant `phase === 'running'` : laisse
      `RunStory` continuer en background (D-C12). Le modal peut être
      réouvert ; le store reflète l'état. Pas d'auto-Abort.
- [ ] Bouton *New Story* ajouté en header de `<HubList />` ou en
      floating action button. Disabled si `projectDir === ''`.
- [ ] Aucune régression : tests existants UI-001a + UI-001b +
      CORE-001/002/004 verts ; depguard CORE-002 reste vert
      (l'interface `Progress` vit dans `internal/workflow`, pas dans
      `internal/uiapp`).
- [ ] Validation manuelle via `wails dev -tags mock` :
      - Bouton *New Story* ouvre le modal
      - Generate avec MockProvider succeed → modal ferme, story
        sélectionnée, hub rafraîchi
      - Generate avec MockProvider qui retourne `ErrGenerationFailed`
        → modal phase error, *Retry* fonctionne
      - Generate avec MockProvider `BlockUntil` + Abort → cancellation
        propre, modal phase error "context canceled"
      - Cmd-W pendant generation → fenêtre se ferme proprement,
        subprocess (mock) tué via cancel ctx

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `App` (étendu UI-001b) | Struct Wails Bind. Devient stateful sur la génération en cours | + 2 champs (`running atomic.Bool`, `runStoryCancel context.CancelFunc`) + 3 méthodes bindées | recréé à chaque lancement `yukki ui` |
| `Progress` (interface, nouveau) | Contrat de feedback du `workflow` vers ses consommateurs (UI / CLI / MCP) | `Start(label string)`, `End(err error)` | défini une fois, implémenté plusieurs fois |
| `noopProgress` (struct, unexported, nouveau) | Implémentation par défaut quand `StoryOptions.Progress == nil` | méthodes vides | injecté par `RunStory` au début si nil |
| `uiProgress` (struct, nouveau) | Implémentation `Progress` qui émet des events Wails | `ctx`, `logger`, `started time.Time` | construit pour chaque `App.RunStory` |
| `MockProvider` (étendu) | Test double pour cancellation déterministe | + champ `BlockUntil chan struct{}` (optionnel) | inchangé |
| `useGenerationStore` (Zustand, nouveau) | État du modal *New Story* | `phase`, `currentLabel`, `error`, `lastResult`, `startedAt` + 4 actions | global app lifetime |
| `ProviderStartPayload` (TS interface) | Payload de l'event `provider:start` | `{ label: string }` | construit par `uiProgress.Start` |
| `ProviderEndPayload` (TS interface) | Payload de l'event `provider:end` | `{ success: bool, path: string, error: string, durationMs: int64 }` | construit par `uiProgress.End` |

### Relations

- `workflow.RunStory` ⟶ `Progress` : un appel `Start` au début, un appel `End` à la fin (succès ou échec). Cardinalité 1:1 par génération.
- `App.RunStory` ⟶ `uiProgress` : crée une instance avant d'appeler `workflow.RunStory`, l'injecte dans `StoryOptions.Progress`. 1:1 par génération.
- `uiProgress` ⟶ `runtime.EventsEmit` : 2 émissions par génération (`provider:start` + `provider:end`).
- `<NewStoryModal />` ⟶ `useGenerationStore` : lit `phase`, dispatche `start/succeed/fail/reset` selon les events reçus.
- `<NewStoryModal />` ⟶ `runtime.EventsOn` : souscrit aux 2 events au mount, unsubscribe au unmount.

### Invariants UI-001c

- **I1** — `workflow.Progress` est défini dans `internal/workflow`,
  **jamais** dans `internal/uiapp`. Garantit `depguard` CORE-002 :
  `internal/workflow → internal/uiapp` reste interdit.
- **I2** — `StoryOptions.Progress = nil` produit un comportement
  strictement identique à CORE-001 v0 (avant UI-001c). `noopProgress`
  est un détail d'implémentation interne, jamais exposé.
- **I3** — `App.running` est un `atomic.Bool` (pas un mutex). Une
  seule génération à la fois par `App`. `Swap(true)` au début,
  `Store(false)` au defer. Si déjà true, `ErrAlreadyRunning`.
- **I4** — `App.runStoryCancel` est posé **avant** l'appel à
  `workflow.RunStory` et nettoyé (mis à nil) au defer. `AbortRunning`
  appelle ce cancel s'il est non-nil, no-op sinon.
- **I5** — `OnShutdown` cancel `app.cancel` (le ctx racine), qui
  propage automatiquement à `runStoryCtx` (dérivé). Pas besoin
  d'appeler `runStoryCancel` séparément dans `OnShutdown`.
- **I6** — `MockProvider.BlockUntil` quand non-nil est un canal lu
  *avant* la sortie de `Generate`. Le test ferme le canal pour
  débloquer ; le `ctx.Done()` débloque aussi (cancellation).
- **I7** — `<StoryViewer />` (UI-001b) ne rend **jamais** d'HTML
  brut (Invariant I5 UI-001b figé). Le canvas UI-001c n'altère pas
  cette garantie.
- **I8** — Le payload `provider:end` contient toujours `durationMs`
  (ne jamais émettre 0 par défaut — calcul `time.Since(started)`).
- **I9** — Aucun event Wails émis par `uiProgress` ne contient le
  prompt complet ni la réponse Claude (Safeguard "no secret loggué"
  CORE-001 préservé). Seuls `label` (court) et résumé d'erreur.

### Integration points

- **`runtime.EventsEmit`** (Wails) — appelé par `uiProgress.Start/End`. Best-effort : Wails ignore silencieusement si la fenêtre est en cours de fermeture.
- **`runtime.EventsOn`** (Wails) — appelé par le wrapper hand-written `frontend/src/lib/wails-events.ts`, qui retourne une fonction unsubscribe.
- **`exec.CommandContext`** (`provider/claude.go`) — déjà utilisé en CORE-001. La cancellation `runStoryCancel` propage via `ctx.Done()` qui tue le subprocess `claude`.
- **`artifacts.AllowedPrefixes`** — slice public, lu par `App.SuggestedPrefixes` (clone + sort).
- **`workflow.ErrEmptyDescription`** — sentinel CORE-001, propagé via `RunStory` au modal qui affiche "Description required".
- **`artifacts.ErrInvalidPrefix`** — sentinel CORE-001, propagé via `RunStory` au modal qui affiche "Prefix invalid: ...".

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **fermer la boucle V1 utilisateur (writing
> flow depuis l'UI)**, on choisit **un binding `App.RunStory` qui
> orchestre `workflow.RunStory` + un `uiProgress` qui émet des events
> Wails, plus 2 bindings auxiliaires (`AbortRunning`, `SuggestedPrefixes`),
> plus un modal Dialog shadcn avec listener events**, plutôt que de
> **dupliquer la logique d'orchestration côté UI** ou d'**injecter
> Wails directement dans `internal/workflow`**, pour atteindre
> **réutilisation maximale du cœur métier (CORE-001), zéro couplage
> workflow → wails (depguard CORE-002 préservé), feedback UX correct
> pendant la génération, et cancellation propre**, en acceptant
> **une extension additive de `StoryOptions` (champ `Progress`
> optionnel) et l'introduction d'une 8ᵉ commande Wails-event-driven
> côté frontend**.

### Décisions d'architecture (toutes tranchées 2026-05-02)

- **D-C1** : `workflow.Progress` interface 2 méthodes `Start(label)` + `End(err)` (KISS, pas de `Update` streaming en V1).
- **D-C2** : payload `provider:end` = `{success, path, error, durationMs}` (4 champs, télémétrie locale future-friendly).
- **D-C3** : `AbortRunning` binding **public** séparé de `OnShutdown`.
- **D-C4** : lock concurrence par `running atomic.Bool` (pas de `sync.Mutex`).
- **D-C5** : `SuggestedPrefixes` re-export trié de `artifacts.AllowedPrefixes`.
- **D-C6** : validation prefix laissée au Go via `ValidatePrefix`, pas de duplication regex en TS.
- **D-C7** : `MockProvider.BlockUntil chan struct{}` pour test cancellation déterministe.
- **D-C8** : markdown sans frontmatter → rejet via `ValidateFrontmatter`, message clair propagé.
- **D-C9** : Modal = `Dialog` shadcn (composant ajouté via `npx shadcn add dialog`).
- **D-C10** : auto-refresh + auto-select post-success.
- **D-C11** : **suppression** de `Greet()` et de ses tests (devenu redondant avec `RunStory` mock).
- **D-C12** : Esc / click-outside pendant generation laisse `RunStory` continuer en background (pas d'auto-Abort).
- **D-C13** : default prefix combo = `"STORY"` (alpha first).
- **D-C14** : ~10 tests Go table-driven dans `app_test.go` étendu + 1 test workflow_test.go pour le fallback noop.
- **D-C15** : pas de telemetry persistée en V1 (`durationMs` dans event mais pas de SQLite).

### Alternatives écartées

- **Injecter `runtime.EventsEmit` dans `internal/workflow`** — casse depguard CORE-002 et tire Wails dans le binaire CLI pure.
- **2 méthodes `Progress` Start/Update/End** (3 méthodes) — alourdit l'interface pour un besoin V1 inexistant ; UI-005 streaming pourra ajouter `Update` plus tard sans casser l'existant grâce à un type-assert ou une 2ᵉ interface.
- **`sync.Mutex` au lieu d'`atomic.Bool`** — un double-clic deviendrait deux générations en série au lieu d'une erreur claire.
- **`AbortRunning` ride sur shutdown** — UX hostile, l'utilisateur ne peut pas annuler sans tout fermer.
- **Validation prefix dupliquée en TS** (regex côté front + Go) — anti-DRY, source de divergence.
- **Pas de mock cancellation** — tests timing-dependent flaky, refusés.
- **Modal alertdialog (modal-blocking total)** au lieu de Dialog — empêche Esc et click-outside, mais en V1 on veut justement laisser ces gestures sans annuler. Dialog standard répond mieux.
- **Toast post-success au lieu d'auto-select** — UX OK mais nécessite un composant Toast (déféré). L'auto-select dans le hub fournit le feedback gratuit.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/workflow/story.go` | interface `Progress`, type `noopProgress`, champ `StoryOptions.Progress`, appels dans `RunStory` | additif (champ optionnel, méthodes nouvelles) |
| `internal/workflow/story_test.go` | + `TestRunStory_NoopProgressFallback` | extension |
| `internal/uiapp/app.go` | + 2 fields, sentinel `ErrAlreadyRunning`, 3 méthodes (`RunStory`, `AbortRunning`, `SuggestedPrefixes`) ; **suppression de `Greet()`** | extension + suppression |
| `internal/uiapp/progress.go` | nouveau fichier : `uiProgress` struct + méthodes `Start`/`End` | création |
| `internal/uiapp/app_test.go` | + ~10 tests RunStory / AbortRunning / SuggestedPrefixes ; **suppression** des tests `TestApp_Greet_*` | extension + suppression |
| `internal/uiapp/progress_test.go` | nouveau fichier : `TestUiProgress_*` (mock `runtime.EventsEmit` via indirection) | création |
| `internal/provider/mock.go` | + champ `BlockUntil chan struct{}` ; `Generate` attend `<-BlockUntil` ou `<-ctx.Done()` si non-nil | extension additive |
| `internal/provider/provider_test.go` | + `TestMockProvider_Generate_BlocksOnBlockUntil`, `TestMockProvider_Generate_RespectsCtxCancelOverBlockUntil` | extension |
| `frontend/wailsjs/go/main/App.d.ts` | + 3 export functions + interfaces `RunStoryArgs`, `RunStoryResult` | hand-written |
| `frontend/wailsjs/go/main/App.js` | + 3 wrapper functions runtime path `uiapp.App` ; **retrait de `Greet`** (D-C11) | hand-written |
| `frontend/src/lib/wails-events.ts` | nouveau : `EventsOn<T>` typé + types payload | création |
| `frontend/src/components/ui/dialog.tsx` | ajout via `npx shadcn add dialog` | shadcn standard |
| `frontend/src/stores/generation.ts` | nouveau : `useGenerationStore` Zustand | création |
| `frontend/src/components/hub/NewStoryModal.tsx` | nouveau : Dialog complet avec textarea + prefix combo + boutons + listener events | création |
| `frontend/src/components/hub/HubList.tsx` | + bouton *New Story* en header (disabled si `!projectDir`) | modification minimale |
| `frontend/src/App.tsx` | aucun changement (le modal est consommé depuis HubList) | nul |
| `frontend/package.json` | éventuellement `+ @radix-ui/react-dialog` si pas déjà tiré par shadcn add | dépendance shadcn |
| `cmd/yukki`, `internal/artifacts`, `internal/templates`, `internal/clilog`, `internal/provider/claude.go` | aucun changement | nul |

### Schéma de flux

```
   ┌─ FRONTEND ───────────────────────────────────────────┐
   │  HubList                                             │
   │     │ click [New Story]                              │
   │     ▼                                                │
   │  <NewStoryModal />                                   │
   │     │ mount: await SuggestedPrefixes() → combo       │
   │     │ mount: EventsOn('provider:start',...)          │
   │     │ mount: EventsOn('provider:end',...)            │
   │     │                                                │
   │     │ user fills description, picks prefix           │
   │     │ click [Generate]                               │
   │     ▼                                                │
   │  await App.RunStory(desc, prefix, strict)            │
   └─────────────┬────────────────────────────────────────┘
                 │ Wails JSON-RPC
                 ▼
   ┌─ BACKEND Go ─────────────────────────────────────────┐
   │  App.RunStory (uiapp/app.go)                         │
   │    1. validate projectDir != ""                      │
   │    2. running.Swap(true) → ErrAlreadyRunning si déjà │
   │    3. runStoryCtx, runStoryCancel = WithCancel(a.ctx)│
   │    4. uiProgress = newUiProgress(runStoryCtx, ...)   │
   │    5. opts = StoryOptions{..., Progress: uiProgress} │
   │    6. workflow.RunStory(runStoryCtx, opts)           │
   │       │                                              │
   │       ▼                                              │
   │  workflow.RunStory (workflow/story.go)               │
   │    progress.Start("Asking Claude") ──┐               │
   │       │                              │               │
   │       │                              ▼               │
   │       │              uiProgress.Start emits          │
   │       │              EventsEmit('provider:start',    │
   │       │                {label: "Asking Claude"})     │
   │       │                              │               │
   │       │                              ▼               │
   │       │  ┌─── WAILS RUNTIME ─────────────┐           │
   │       │  │ broadcasts to all listeners   │           │
   │       │  └───────────────┬───────────────┘           │
   │       │                  ▼                           │
   │       │           ┌─ FRONTEND ─┐                     │
   │       │           │ EventsOn   │                     │
   │       │           │ updates    │                     │
   │       │           │ store →    │                     │
   │       │           │ phase=     │                     │
   │       │           │ 'running'  │                     │
   │       │           └────────────┘                     │
   │       │                                              │
   │    Provider.Generate(ctx, prompt) ←─ MockProvider    │
   │       │                              ou ClaudeProv   │
   │       │ 5-30s (or BlockUntil if mock)                │
   │       ▼                                              │
   │    Writer.Write(id, slug, output)                    │
   │       │                                              │
   │       ▼                                              │
   │    progress.End(path, err) ─→ EventsEmit('provider:end', │
   │                            {success, path, error,    │
   │                             durationMs})             │
   │                                                      │
   │    7. defer running.Store(false), runStoryCancel=nil │
   │    return path or err                                │
   └─────────────┬────────────────────────────────────────┘
                 │ JSON-RPC return
                 ▼
   ┌─ FRONTEND ──────────────────────────────────────────┐
   │  EventsOn('provider:end', payload):                 │
   │    if success:                                      │
   │      generationStore.succeed(path, durationMs)      │
   │      artifactsStore.refresh('stories')              │
   │      artifactsStore.setSelectedPath(path)           │
   │      modal closes                                   │
   │    else:                                            │
   │      generationStore.fail(error)                    │
   │      modal phase='error' [Retry] [Close]            │
   └─────────────────────────────────────────────────────┘

   Cancellation paths
   ──────────────────
   user clicks [Abort]:
     → App.AbortRunning() → runStoryCancel()
     → runStoryCtx.Done()
     → exec.CommandContext kills `claude` (SIGTERM)
     → workflow.RunStory returns ctx.Err()
     → uiProgress.End(ctx.Err()) emits provider:end{success:false}

   user closes window (Cmd-W):
     → OnShutdown → app.cancel() (parent ctx)
     → propagates to runStoryCtx (derived)
     → same kill chain as above
     → fenêtre détruite, EventsEmit ignoré silencieusement par Wails
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation est livrable indépendamment
> en 1 commit atomique.

### O1 — `workflow.Progress` interface + `noopProgress` fallback

- **Module** : `internal/workflow`
- **Fichier** : `internal/workflow/story.go` (modification)
- **Signatures** :
  ```go
  // Progress reports lifecycle events of a long-running workflow
  // operation (Provider.Generate). Implementations must be safe to
  // call from the workflow goroutine. nil-safe via noopProgress
  // fallback in StoryOptions.
  type Progress interface {
      Start(label string)
      End(path string, err error)
  }

  type noopProgress struct{}

  func (noopProgress) Start(label string)            {}
  func (noopProgress) End(path string, err error)    {}
  ```
- **Comportement** :
  1. Interface `Progress` exportée. Pas de `Update(chunk)` en V1.
  2. `noopProgress` est un type *unexported*, instancié par
     valeur zéro. Méthodes vides.
  3. `StoryOptions` gagne un champ `Progress workflow.Progress`
     (optionnel, default = nil → fallback noop).
  4. Dans `RunStory`, juste avant `Provider.Generate` : si
     `opts.Progress == nil`, utiliser `noopProgress{}` ; sinon
     l'instance fournie. Appeler `progress.Start("Asking Claude")`.
  5. Après `Writer.Write` (et dans tous les chemins de retour
     amont — erreur de template load, prefix invalide, generate fail,
     etc.) appeler `progress.End(path, err)`. `path` est le retour
     de `Writer.Write` si succès, `""` sinon. Idéalement via une
     variable locale `var resultPath string` capturée par un `defer`
     qui appelle `progress.End(resultPath, returnErr)`.
- **Tests** :
  - `TestRunStory_NoopProgressFallback` (nouveau dans
    `story_test.go`) : `Progress=nil` → comportement identique au
    happy path existant. Aucune assertion sur Progress (juste que
    le test ne panique pas).
  - **Aucun test existant ne change** (Progress nil par défaut).

### O2 — `MockProvider` extension : `BlockUntil chan struct{}`

- **Module** : `internal/provider`
- **Fichier** : `internal/provider/mock.go` (modification)
- **Signatures** :
  ```go
  type MockProvider struct {
      NameVal    string
      Response   string
      Err        error
      CheckErr   error
      VersionVal string
      VersionErr error
      Calls      []string
      BlockUntil chan struct{} // NOUVEAU, optionnel
  }

  func (m *MockProvider) Generate(ctx context.Context, prompt string) (string, error)
  ```
- **Comportement `Generate`** (modifié) :
  1. `m.Calls = append(m.Calls, prompt)` (inchangé).
  2. **NOUVEAU** : si `m.BlockUntil != nil`, attendre :
     ```go
     select {
     case <-m.BlockUntil:
         // released by test, proceed
     case <-ctx.Done():
         return "", ctx.Err()
     }
     ```
  3. Si `m.Err != nil`, retourne `"", m.Err` (inchangé).
  4. Retourne `m.Response, nil` (inchangé).
- **Tests** (nouveaux dans `provider_test.go`) :
  - `TestMockProvider_Generate_BlocksOnBlockUntil` : crée un channel,
    lance `Generate` dans une goroutine, vérifie qu'il bloque ~50ms,
    ferme le channel, vérifie qu'il rend `Response, nil`.
  - `TestMockProvider_Generate_RespectsCtxCancelOverBlockUntil` :
    crée un `context.WithCancel`, BlockUntil non fermé, lance
    `Generate` en goroutine, cancel le ctx, vérifie retour
    `("", context.Canceled)`.
  - Tests existants `TestMockProvider_RecordsCalls`,
    `TestMockProvider_PropagatesError` doivent passer **sans modif**
    (BlockUntil nil = comportement inchangé).

### O3 — `internal/uiapp.uiProgress` : impl `Progress` via Wails events

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/progress.go` (nouveau)
- **Signatures** :
  ```go
  package uiapp

  import (
      "context"
      "log/slog"
      "time"

      "github.com/wailsapp/wails/v2/pkg/runtime"
  )

  // emitEvent is a package-level indirection for runtime.EventsEmit
  // so unit tests can capture emissions without spinning up a Wails
  // context. Production callers hit the Wails runtime directly.
  var emitEvent = runtime.EventsEmit

  // ProviderStartPayload is the payload of the "provider:start" event.
  type ProviderStartPayload struct {
      Label string `json:"label"`
  }

  // ProviderEndPayload is the payload of the "provider:end" event.
  type ProviderEndPayload struct {
      Success    bool   `json:"success"`
      Path       string `json:"path"`
      Error      string `json:"error"`
      DurationMs int64  `json:"durationMs"`
  }

  // uiProgress implements workflow.Progress by emitting Wails events.
  type uiProgress struct {
      ctx     context.Context
      logger  *slog.Logger
      started time.Time
  }

  func newUiProgress(ctx context.Context, logger *slog.Logger) *uiProgress

  func (p *uiProgress) Start(label string)
  func (p *uiProgress) End(path string, err error)
  ```
- **Comportement** :
  - `newUiProgress` : alloue + record `time.Now()` dans `started`.
  - `Start(label)` :
    1. emit `emitEvent(p.ctx, "provider:start", ProviderStartPayload{Label: label})`.
    2. log debug `"progress start"` avec label.
  - `End(path, err)` :
    1. compute `durationMs = time.Since(p.started).Milliseconds()`.
    2. construire payload :
       - si `err == nil` : `{Success: true, Path: path, Error: "", DurationMs: durationMs}`
       - si `err != nil` : `{Success: false, Path: "", Error: err.Error(), DurationMs: durationMs}`
    3. emit `emitEvent(p.ctx, "provider:end", payload)`.
    4. log debug `"progress end"` avec success bool et durationMs.
- **Tests** (nouveaux dans `progress_test.go`) :
  - `TestUiProgress_EmitsStartAndEnd_OnSuccess` : remplace `emitEvent`
    par un fake qui capture `(name, payload)` ; appelle Start("foo"),
    sleep 10ms, End(nil) avec succeed retournant "/abs/path" ; assert
    2 events captés, payloads valides, `durationMs >= 10`.
  - `TestUiProgress_EmitsEnd_WithError_OnFailure` : End(errors.New("boom")) ;
    assert payload `{Success: false, Error: "boom", Path: "", DurationMs > 0}`.

### O4 — `App` étendu : `RunStory`, `AbortRunning`, `SuggestedPrefixes` + suppression `Greet`

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go` (modification)
- **Signatures** :
  ```go
  import (
      "errors"
      "sort"
      "sync/atomic"
  )

  // ErrAlreadyRunning is returned by App.RunStory when a previous
  // generation is still in progress.
  var ErrAlreadyRunning = errors.New("a generation is already running")

  type App struct {
      ctx              context.Context
      cancel           context.CancelFunc
      logger           *slog.Logger
      provider         provider.Provider
      projectDir       string
      loader           *templates.Loader
      writer           *artifacts.Writer
      running          atomic.Bool      // NOUVEAU
      runStoryCancel   context.CancelFunc // NOUVEAU
  }

  // 3 nouvelles méthodes bindées (pas de paramètre context.Context —
  // Wails 2.12 D-B5b figé)
  func (a *App) RunStory(description, prefix string, strictPrefix bool) (string, error)
  func (a *App) AbortRunning() error
  func (a *App) SuggestedPrefixes() []string

  // Greet est SUPPRIMÉ (D-C11)
  ```
- **Comportement `RunStory`** :
  1. Si `a.projectDir == ""` → `return "", errors.New("no project selected")`.
  2. Si `a.running.Swap(true) == true` → `return "", ErrAlreadyRunning`.
  3. `defer a.running.Store(false)`.
  4. `runStoryCtx, cancel := context.WithCancel(a.ctx)`.
  5. `a.runStoryCancel = cancel` ; `defer func() { a.runStoryCancel = nil; cancel() }()`.
  6. `prog := newUiProgress(runStoryCtx, a.logger)`.
  7. `opts := workflow.StoryOptions{
        Description: description, Prefix: prefix, StrictPrefix: strictPrefix,
        Logger: a.logger, Provider: a.provider, TemplateLoader: a.loader,
        Writer: a.writer, Progress: prog,
     }`.
  8. `path, err := workflow.RunStory(runStoryCtx, opts)`.
  9. Retourne `path, err`. (Note : `workflow.RunStory` a déjà appelé
     `progress.End(path, err)` avant de retourner, le frontend reçoit
     l'event `provider:end` avec le path correct ; le binding return
     est juste une copie pour la promesse JS-Go.)

- **Comportement `AbortRunning`** :
  1. Si `a.runStoryCancel != nil` : appelle `a.runStoryCancel()`.
  2. Retourne `nil` toujours (idempotent, no-op safe).
- **Comportement `SuggestedPrefixes`** :
  1. `out := make([]string, len(artifacts.AllowedPrefixes))`.
  2. `copy(out, artifacts.AllowedPrefixes)`.
  3. `sort.Strings(out)`.
  4. Retourne `out`.

- **Suppression `Greet`** :
  1. Méthode `Greet()` retirée du fichier.
  2. Tests `TestApp_Greet_ReturnsLiteral`, `TestApp_Greet_Concurrent`
     supprimés du test file.
  3. Stub `frontend/wailsjs/go/main/App.{d.ts,js}` : retirer
     `Greet`.
  4. `frontend/src/App.tsx` UI-001a placeholder n'utilise plus Greet
     (déjà refactoré en UI-001b en layout 3-zones).

- **Tests** :
  - `TestApp_RunStory_Success` : mock provider retourne `stubStory`,
    project dir set, assert path retourné non-vide + fichier sur
    disque + `running` revenu à false.
  - `TestApp_RunStory_AlreadyRunning` : `running.Store(true)` à la
    main, appel RunStory → assert `ErrAlreadyRunning`.
  - `TestApp_RunStory_NoProject` : `projectDir == ""`, assert erreur
    "no project selected".
  - `TestApp_RunStory_AbortMidFlight` : `MockProvider.BlockUntil =
    make(chan struct{})`, lance RunStory en goroutine, sleep 10ms,
    appelle `AbortRunning()`, assert RunStory retourne `context.Canceled`,
    `running` revenu à false.
  - `TestApp_RunStory_ShutdownDuringGeneration` :
    `MockProvider.BlockUntil` pareil, `OnStartup` puis lance RunStory,
    `OnShutdown` mid-flight, assert RunStory retourne ctx err, fichier
    non créé.
  - `TestApp_AbortRunning_NothingToAbort` : pas de RunStory en cours,
    `AbortRunning()` retourne nil sans panic.
  - `TestApp_SuggestedPrefixes_Sorted_Distinct` : appel, assert slice
    triée alpha + len == len(`AllowedPrefixes`) + pas de mutation
    de `AllowedPrefixes`.

### O5 — `frontend/wailsjs/go/main/App.{d.ts,js}` stubs hand-written

- **Module** : `frontend/wailsjs/go/main`
- **Fichiers** :
  - `frontend/wailsjs/go/main/App.d.ts` (modification, hand-update)
  - `frontend/wailsjs/go/main/App.js` (modification, hand-update)
- **Contenu `App.d.ts`** (delta UI-001c) :
  ```typescript
  // RETIRÉ: export function Greet(): Promise<string>;

  export function SelectProject(): Promise<string>;            // existant
  export function AllowedKinds(): Promise<string[]>;           // existant
  export function ListArtifacts(kind: string): Promise<Meta[]>; // existant
  export function GetClaudeStatus(): Promise<ClaudeStatus>;    // existant
  export function InitializeSPDD(dir: string): Promise<void>;  // existant
  export function ReadArtifact(path: string): Promise<string>; // existant

  // NOUVEAU UI-001c
  export function RunStory(description: string, prefix: string, strictPrefix: boolean): Promise<string>;
  export function AbortRunning(): Promise<void>;
  export function SuggestedPrefixes(): Promise<string[]>;

  export interface Meta { /* existant */ }
  export interface ClaudeStatus { /* existant */ }
  ```
- **Contenu `App.js`** (delta UI-001c) :
  ```javascript
  // @ts-check
  // AV-WORKAROUND STUB — see App.d.ts.

  // Greet wrapper RETIRÉ

  export function SelectProject() { return window['go']['uiapp']['App']['SelectProject'](); }
  export function AllowedKinds()  { return window['go']['uiapp']['App']['AllowedKinds'](); }
  export function ListArtifacts(kind) { return window['go']['uiapp']['App']['ListArtifacts'](kind); }
  export function GetClaudeStatus()   { return window['go']['uiapp']['App']['GetClaudeStatus'](); }
  export function InitializeSPDD(dir) { return window['go']['uiapp']['App']['InitializeSPDD'](dir); }
  export function ReadArtifact(path)  { return window['go']['uiapp']['App']['ReadArtifact'](path); }

  // NOUVEAU UI-001c
  export function RunStory(description, prefix, strictPrefix) {
    return window['go']['uiapp']['App']['RunStory'](description, prefix, strictPrefix);
  }
  export function AbortRunning() {
    return window['go']['uiapp']['App']['AbortRunning']();
  }
  export function SuggestedPrefixes() {
    return window['go']['uiapp']['App']['SuggestedPrefixes']();
  }
  ```
- **Tests** : aucun ; validation via `tsc --noEmit` + `vite build`.

### O6 — `frontend/src/lib/wails-events.ts` wrapper hand-written

- **Module** : `frontend/src/lib`
- **Fichier** : `frontend/src/lib/wails-events.ts` (nouveau)
- **Signatures** :
  ```typescript
  export interface ProviderStartPayload { label: string }
  export interface ProviderEndPayload {
    success: boolean
    path: string
    error: string
    durationMs: number
  }

  // Subscribe to a Wails event. Returns an unsubscribe function.
  export function EventsOn<T>(name: string, handler: (payload: T) => void): () => void

  // Emit (rarely used from frontend; primarily backend → frontend in SPDD)
  export function EventsEmit(name: string, payload: unknown): void
  ```
- **Comportement** :
  - Wrapper hand-written sur `window.runtime.EventsOn` et
    `window.runtime.EventsOff` que Wails injecte dans la fenêtre.
    Cohérent avec le pattern stubs `App.{d.ts,js}` (D-B8b).
  - `EventsOn` retourne une fonction qui appelle
    `window.runtime.EventsOff(name, handler)` au moment du cleanup.
  - Type-paramétré pour que les callsite récupèrent un payload typé.
- **Tests** : aucun ; validation via `tsc --noEmit`.

### O7 — `frontend/src/components/ui/dialog.tsx` (shadcn add)

- **Module** : `frontend/src/components/ui`
- **Fichier** : `frontend/src/components/ui/dialog.tsx` (nouveau)
- **Comportement** :
  - Ajouter via `npx shadcn@latest add dialog` dans `frontend/`.
  - Le fichier généré contient `Dialog`, `DialogTrigger`,
    `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`,
    `DialogFooter`, `DialogClose`.
  - Aucune modification post-add ; on consomme tel quel.
  - Si `@radix-ui/react-dialog` n'est pas déjà dans `package.json`,
    `shadcn add` l'ajoute automatiquement.
- **Tests** : aucun (shadcn standard).

### O8 — `frontend/src/stores/generation.ts`

- **Module** : `frontend/src/stores`
- **Fichier** : `frontend/src/stores/generation.ts` (nouveau)
- **Signatures** :
  ```typescript
  import { create } from 'zustand'

  export type GenerationPhase = 'idle' | 'running' | 'success' | 'error'

  interface GenerationState {
    phase: GenerationPhase
    currentLabel: string
    error: string
    lastResult: { path: string; durationMs: number } | null
    startedAt: number

    start: (label: string) => void
    succeed: (path: string, durationMs: number) => void
    fail: (error: string) => void
    reset: () => void
  }

  export const useGenerationStore = create<GenerationState>((set) => ({
    phase: 'idle',
    currentLabel: '',
    error: '',
    lastResult: null,
    startedAt: 0,
    start: (label) => set({ phase: 'running', currentLabel: label, error: '', startedAt: Date.now() }),
    succeed: (path, durationMs) => set({
      phase: 'success',
      lastResult: { path, durationMs },
      currentLabel: '',
    }),
    fail: (error) => set({ phase: 'error', error, currentLabel: '' }),
    reset: () => set({ phase: 'idle', currentLabel: '', error: '', startedAt: 0 }),
  }))
  ```
- **Tests** : aucun en V1 (D-C14 pas de test UI front).

### O9 — `frontend/src/components/hub/NewStoryModal.tsx`

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/NewStoryModal.tsx` (nouveau)
- **Signatures** :
  ```typescript
  interface NewStoryModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
  }

  export function NewStoryModal({ open, onOpenChange }: NewStoryModalProps)
  ```
- **Comportement** :
  1. State local : `description: string`, `prefix: string` (default
     `"STORY"` D-C13), `strictPrefix: boolean` (default false),
     `customPrefix: string` (input quand `prefix === '__custom__'`).
  2. State `prefixes: string[]` chargé au mount via
     `await SuggestedPrefixes()`. Fallback `['STORY']` si l'appel
     échoue.
  3. Listener events au mount (`useEffect` avec deps `[]`) :
     - `EventsOn<ProviderStartPayload>('provider:start', p =>
       useGenerationStore.start(p.label))`.
     - `EventsOn<ProviderEndPayload>('provider:end', p => {
         if (p.success) {
           useGenerationStore.succeed(p.path, p.durationMs)
           useArtifactsStore.refresh('stories')
           useArtifactsStore.setSelectedPath(p.path)
           onOpenChange(false)
         } else {
           useGenerationStore.fail(p.error)
         }
       })`.
     - Return une cleanup function appelant les unsubscribes.
  4. Lecture `useClaudeStore.status.Available` pour disabled du
     bouton *Generate* + tooltip "Install Claude CLI first".
  5. Fonction `handleGenerate` :
     - Validation min côté front : description non-vide.
     - `effectivePrefix = prefix === '__custom__' ? customPrefix.trim() : prefix`.
     - `useGenerationStore.reset()` puis le store sera mis en
       'running' par l'event `provider:start`.
     - `try { await RunStory(description, effectivePrefix, strictPrefix) }
       catch (e) { useGenerationStore.fail(String(e)) }`.
     - Le payload `provider:end` arrive aussi en parallèle ; les deux
       chemins (catch + event) ont le même résultat (set phase=error
       avec le même message). Pas de double-rendering — `set` est
       idempotent.
  6. Fonction `handleAbort` : `await AbortRunning()`. Le store
     phase reviendra à 'error' via `provider:end{success:false,
     error:"context canceled"}`.
  7. Fonction `handleRetry` : appelle `handleGenerate` avec les
     mêmes valeurs encore présentes dans le state.
  8. Render selon `phase` :
     - `'idle'` ou `'error'` : formulaire complet (textarea + prefix +
       toggle) + boutons *Cancel* + *Generate* (ou *Retry* si error).
     - `'running'` : spinner + label `currentLabel` + bouton *Abort*.
     - `'success'` : modal se ferme automatiquement (`onOpenChange(false)`
       déjà appelé par le handler event).
  9. Esc / click-outside pendant `running` : ne pas appeler
     `AbortRunning` automatiquement (D-C12). Le `Dialog` shadcn
     accepte `onOpenChange={(open) => { if (!open && phase !== 'running') onOpenChange(false) }}`
     (ignore close en mode running).
- **Imports lucide-react** : `Loader2`, `X`, `RotateCw` (Retry).
- **Tests** : aucun en V1. Validation manuelle.

### O10 — Intégration dans `<HubList />`

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/HubList.tsx` (modification minimale)
- **Comportement** :
  1. Import `<NewStoryModal />` et `useState` pour `[modalOpen, setModalOpen]`.
  2. Bouton *New Story* en header (à côté du compteur "X items").
     Disabled si `useProjectStore.projectDir === ''`.
     ```tsx
     <Button
       size="sm"
       onClick={() => setModalOpen(true)}
       disabled={!projectDir}
     >
       <Plus className="mr-2 h-4 w-4" /> New Story
     </Button>
     ```
  3. `<NewStoryModal open={modalOpen} onOpenChange={setModalOpen} />` rendu en bas du composant.
  4. Aucun changement à la table, au listing, au statut badge.
- **Tests** : aucun.

---

## N — Norms

- **Logging Go** : `internal/uiapp.App` continue d'utiliser le
  `*slog.Logger` injecté. `uiProgress.Start` log `Debug` avec label,
  `End` log `Debug` avec success bool + durationMs. Pas de log du
  prompt ni de la réponse Claude (Safeguard "no secret loggué"
  CORE-001 préservé).
- **Nommage Go** : méthodes bindées en PascalCase (Wails). Sentinel
  `ErrAlreadyRunning` exporté avec préfixe `Err`. Champs internes
  lowercase (`running`, `runStoryCancel`).
- **Erreurs Go** : `ErrAlreadyRunning` est un `errors.New`. Les
  erreurs propagées de `workflow.RunStory` (ErrEmptyDescription,
  ErrInvalidPrefix, ErrGenerationFailed, ErrInvalidFrontmatter)
  remontent telles quelles avec `%w` quand un wrap est utile.
  `errors.Is` au call-site front (test).
- **Tests Go** : `t.TempDir()`, table-driven, mock runtime.EventsEmit
  via indirection `var emitEvent` (cohérent avec
  `var openDirectoryDialog` UI-001b D-B5b). Mock cancellation via
  `MockProvider.BlockUntil chan` (D-C7).
- **Concurrence Go** : `atomic.Bool` privilégié au mutex. Pas de
  goroutine spawn dans `App.RunStory` — l'appel est synchrone côté
  Go, le frontend gère l'asynchrone via la promesse Wails.
- **TypeScript** : `strict: true` (UI-001a). Types explicites pour
  les payloads `ProviderStartPayload`, `ProviderEndPayload`,
  `RunStoryArgs`, `RunStoryResult`. Aucun `any`.
- **Tailwind / shadcn** : Dialog standard, pas d'override. Couleurs
  héritées du theme UI-001a. Pas d'arbitrary values.
- **Zustand** : 1 nouveau store dédié (`useGenerationStore`),
  isolé des 3 autres (Invariant I6 UI-001b figé).
- **react-markdown** : non touché (réservé `<StoryViewer />`).
- **Tests UI** : aucun en V1. Validation manuelle via `wails dev -tags mock`.
- **CI** : aucun nouveau step. `unit-tests` couvre les nouveaux
  tests Go ; `ui-build` couvre la compile frontend (tsc + vite + Dialog
  shadcn).
- **Convention de commit** : `feat(workflow)` pour O1+O2,
  `feat(uiapp)` pour O3+O4, `feat(ui)` pour O5-O10, `chore(uiapp)`
  pour la suppression `Greet`.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de couplage `internal/workflow → internal/uiapp` (Invariant I1)**
  - L'interface `Progress` vit **dans `internal/workflow`**, pas dans
    `internal/uiapp`. `uiProgress` vit dans `internal/uiapp` et
    *implémente* `workflow.Progress`. Le sens de l'import est donc
    `uiapp → workflow`, jamais l'inverse.
  - `depguard` CORE-002 vérifie cette règle au CI ; toute violation
    casse le build.
- **Pas de modification de signature publique existante**
  - `workflow.RunStory(ctx, opts) (string, error)` garde sa
    signature. Le 8ᵉ champ `Progress` est *additif* dans `StoryOptions`.
  - `provider.MockProvider.Generate(ctx, prompt) (string, error)`
    garde sa signature. Le champ `BlockUntil` est *additif*.
  - `App.NewApp(p, logger)` signature inchangée.
  - **Tests CORE-001 passent sans modification** — Invariant I2.
- **Lock concurrence obligatoire (Invariant I3)**
  - `App.RunStory` ne doit JAMAIS lancer une 2ᵉ génération
    concurrente sur la même App. `running atomic.Bool` est la
    seule défense ; si elle est contournée (typo, oubli du
    `defer Store(false)`), le test `TestApp_RunStory_AlreadyRunning`
    échouera.
- **Pas de fuite de subprocess (Invariant I5)**
  - `OnShutdown` propage `cancel()` au ctx racine, qui propage à
    `runStoryCtx`, qui propage au `exec.CommandContext` du provider.
    Le subprocess `claude` reçoit SIGTERM. Aucun `Cmd.Run` sans
    contexte (CORE-001 garantit cela déjà).
- **Pas de log du prompt ni de la réponse Claude**
  - `uiProgress.Start/End` n'inclut **jamais** le prompt complet,
    le contenu de la réponse, ou un fragment quelconque du contenu
    sensible (Invariant I9). Seuls `label` (court, fixe) et un
    résumé d'erreur.
  - Côté front, le store `useGenerationStore` ne stocke pas
    description ni prefix au-delà du form local.
- **Pas de telemetry persistée en V1**
  - `durationMs` est dans le payload de l'event, pas écrit sur disque.
    Pas de SQLite, pas d'OTel exporter (D-C15). Recommandation Section L
    de la revue de recherche : opt-in post-OSS uniquement.
- **Pas de cancellation auto sur Esc / click-outside (D-C12)**
  - Le `Dialog` shadcn doit explicitement *ignorer* `onOpenChange(false)`
    quand `phase === 'running'`. Sinon une fermeture involontaire
    perd 30s de génération. Test manuel obligatoire pre-merge.
- **Pas de validation prefix dupliquée en TS**
  - La regex `^[A-Z]+$` et la whitelist `AllowedPrefixes` sont
    définies UNIQUEMENT dans `internal/artifacts/id.go`. Le frontend
    envoie le string brut, le Go valide et propage l'erreur. Aucun
    fallback côté front qui pourrait diverger (D-C6).
- **Pas de feature flag, pas de retro-compat fictive**
  - Le canvas est la spec. Si quelque chose semble manquer,
    `/spdd-prompt-update` plutôt que TODO inline.
- **Pas de dépendance npm tierce au-delà des additions shadcn**
  - `@radix-ui/react-dialog` (peer-dep shadcn Dialog) est la seule
    addition possible. Refusé : tout autre composant Dialog (headless-ui,
    react-modal, etc.).
- **Pas de Toast / Notification globale en V1**
  - Auto-refresh + auto-select sont silencieux. Toast component
    différé.
- **Pas de modification des fichiers UI-001a/b hors `HubList.tsx`**
  - `App.tsx`, `Sidebar.tsx`, `SidebarToggle.tsx`, `StoryViewer.tsx`,
    `ClaudeBanner.tsx`, `ProjectPicker.tsx` restent intacts.
    Le scope UI-001c est strictement additif sauf pour le bouton
    *New Story* dans `<HubList />`.
- **Pas de modification des stores UI-001b (`project`, `artifacts`, `claude`)**
  - Aucun champ ajouté à ces 3 stores. Le nouveau store
    `useGenerationStore` est isolé. Invariant I6 UI-001b figé.
- **Suppression `Greet()` doit être complète (D-C11)**
  - Méthode Go retirée + tests Go retirés + stub `App.{d.ts,js}`
    nettoyé + aucune référence orpheline dans le frontend (`grep
    -r "Greet" frontend/src/` doit ne rien retourner).
- **Tests Go ne doivent pas dupliquer ceux de CORE-001**
  - `App.RunStory` est testée pour le **wiring** (ErrAlreadyRunning,
    cancellation, NoProject, succeed=path), pas pour la logique
    `workflow.RunStory` elle-même (couverte par
    `internal/workflow/story_test.go`).

---

## Changelog

- **2026-05-02 — création** — canvas v1 issu de l'analyse UI-001c
  reviewed, 15 décisions D-C1..D-C15 toutes en reco par défaut
  (validées en revue interactive). 10 Operations livrables.
