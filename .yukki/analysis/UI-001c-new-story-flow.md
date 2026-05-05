---
id: UI-001c
slug: new-story-flow
story: .yukki/stories/UI-001c-new-story-flow.md
parent-analysis: .yukki/analysis/UI-001-init-desktop-app-wails-react.md
status: reviewed
created: 2026-05-02
updated: 2026-05-02
---

# Analyse — UI-001c (delta) — New Story flow : modal + RunStory binding + EventsEmit + cancellation

> **Analyse de delta** — la stratégie globale, les modules, les 16
> décisions structurantes (D1-D16), les 10 risques et les 11 cas limites
> de la famille UI-001 sont dans
> [`.yukki/analysis/UI-001-init-desktop-app-wails-react.md`](UI-001-init-desktop-app-wails-react.md).
> Ce document ne couvre que les choix **spécifiques à UI-001c** (writing
> flow) qui n'ont pas leur place dans une analyse de famille parce qu'ils
> n'engagent pas UI-001a ni UI-001b.

## Mots-clés métier extraits (delta UI-001c)

`RunStory` (binding), `Progress` (interface), `EventsEmit`, `EventsOn`,
`OnShutdown`, `AbortRunning`, `SuggestedPrefixes`, `NewStoryModal`,
`ErrAlreadyRunning`, `provider:start`, `provider:end`.

(Les mots-clés génériques `Wails`, `bindings`, `Cobra`,
`OpenDirectoryDialog`, `MockProvider` sont déjà couverts par la famille
UI-001 ; les artefacts hub `ListArtifacts`, `ReadArtifact`, `ProjectPicker`,
`ClaudeBanner` par UI-001b.)

## Concepts existants exploités par UI-001c

### Cœur métier (CORE-001 + CORE-002)

- **`workflow.RunStory(ctx, opts)`** —
  [internal/workflow/story.go:41](../../internal/workflow/story.go#L41).
  L'orchestration end-to-end fonctionne déjà. UI-001c **étend
  `StoryOptions`** avec un champ `Progress workflow.Progress` *optionnel*.
  `RunStory` appelle `progress.Start("Asking Claude")` avant
  `Provider.Generate` et `progress.End(err)` après. Si `Progress == nil`,
  fallback `noopProgress` interne. Garantit que les tests CORE-001
  passent sans modification.
- **`workflow.StoryOptions`** —
  [internal/workflow/story.go:21-29](../../internal/workflow/story.go#L21-L29).
  Struct existante (7 champs). UI-001c ajoute le 8ᵉ champ : `Progress`.
- **`workflow.ErrEmptyDescription`** —
  [internal/workflow/story.go:18](../../internal/workflow/story.go#L18).
  Sentinel déjà exporté. Le binding `App.RunStory` propage cette erreur
  vers le frontend qui peut la mapper en message UX.
- **`provider.Provider` (interface) + `MockProvider`** —
  [internal/provider/provider.go](../../internal/provider/provider.go).
  Pas de modif d'interface. UI-001c **étend MockProvider** avec un champ
  optionnel `BlockUntil chan struct{}` (ou équivalent) pour tester la
  cancellation : `Generate` attend `<-BlockUntil` ou `ctx.Done()` selon
  le premier qui se résout. Default nil = comportement UI-001b inchangé.
- **`artifacts.AllowedPrefixes`** —
  [internal/artifacts/id.go:19-21](../../internal/artifacts/id.go#L19-L21).
  La liste `["STORY", "EXT", "BACK", "FRONT", "CTRL", "CORE", "UI", "INT", "OPS", "DOC", "META"]`
  est déjà publique. `App.SuggestedPrefixes()` re-exporte cette slice
  triée pour le combo prefix du modal.
- **`artifacts.ValidatePrefix(prefix, strict)`** —
  [internal/artifacts/id.go:30](../../internal/artifacts/id.go#L30).
  Validation déjà fournie. `App.RunStory` la délègue via
  `workflow.RunStory` qui l'appelle ligne 45.

### Surface UI (UI-001a + UI-001b)

- **`internal/uiapp.App` struct** —
  [internal/uiapp/app.go](../../internal/uiapp/app.go).
  Contient déjà `ctx`, `cancel`, `logger`, `provider`, `projectDir`,
  `loader`, `writer`. UI-001c **ajoute 2 champs** : `running atomic.Bool`
  (lock anti-concurrent) et `runStoryCancel context.CancelFunc` (sous-ctx
  cancelable indépendamment du shutdown).
- **`OnStartup` / `OnShutdown` hooks** —
  [internal/uiapp/app.go:88-99](../../internal/uiapp/app.go#L88-L99).
  Pattern déjà branché par UI-001a. `OnShutdown` appelle `a.cancel()`
  qui propage au sous-ctx `runStoryCtx` dérivé (donc le subprocess
  `claude` reçoit l'annulation via `exec.CommandContext`).
- **`openDirectoryDialog` indirection** —
  [internal/uiapp/app.go](../../internal/uiapp/app.go).
  Pattern testabilité posé par UI-001b D-B5b. UI-001c n'introduit
  *pas* d'autre fonction Wails runtime à mocker (`EventsEmit` ne reçoit
  pas de réponse, on peut l'invoquer en best-effort sans wrapper).
- **`ClaudeStatus` type** —
  [internal/uiapp/app.go](../../internal/uiapp/app.go) (UI-001b).
  Le bouton *Generate* du modal lit `useClaudeStore.status.Available`
  pour activer/désactiver (AC2). Aucune modif côté Go.
- **Stubs hand-written `frontend/wailsjs/go/main/App.{d.ts,js}`** —
  pattern UI-001b D-B8b. UI-001c **ajoute 3 méthodes** : `RunStory`,
  `AbortRunning`, `SuggestedPrefixes`. Runtime path
  `window.go.uiapp.App.<method>` (D-B8b figé).
- **Stores Zustand isolés** —
  [frontend/src/stores/](../../frontend/src/stores/).
  UI-001c **ajoute 1 store** `useGenerationStore` (état du modal :
  `phase`, `error`, `lastResult`) ou enrichit `useArtifactsStore` avec
  `setSelectedPath` post-success. Reco : nouveau store dédié.
- **Composants shadcn/ui** —
  [frontend/src/components/ui/](../../frontend/src/components/ui/).
  `Button` et `Card` déjà copiés (UI-001a). `Dialog` à ajouter via
  `npx shadcn add dialog` (sera la première extension shadcn post-UI-001a).

## Concepts nouveaux UI-001c-spécifiques

### Backend Go

- **`workflow.Progress` interface** —
  [internal/workflow/story.go](../../internal/workflow/story.go).
  2 méthodes : `Start(label string)` / `End(err error)`. Vit dans le
  cœur ; implémentée par `internal/uiapp.uiProgress` (et par le
  `noopProgress` interne au package workflow). **Garantit zéro couplage
  `workflow → uiapp`** — depguard CORE-002 vérifie le sens des imports.
- **`workflow.noopProgress`** — type *unexported* dans
  [internal/workflow/story.go](../../internal/workflow/story.go).
  Injecté quand `StoryOptions.Progress == nil`. Méthodes vides.
- **`internal/uiapp.uiProgress` struct** —
  [internal/uiapp/progress.go](../../internal/uiapp/progress.go) (nouveau
  fichier). Implémente `workflow.Progress` en émettant des events Wails :
  `runtime.EventsEmit(ctx, "provider:start", payload)` et
  `runtime.EventsEmit(ctx, "provider:end", payload)` (cf. D-C2 pour le
  format du payload).
- **`uiapp.ErrAlreadyRunning`** — sentinel exporté.
  Retourné par `App.RunStory` si `running.Load() == true`.
- **`App.RunStory(description, prefix string, strictPrefix bool) (string, error)`**
  binding Go bindé. Construit `StoryOptions` (description/prefix +
  state App : provider/loader/writer + uiProgress), pose
  `runStoryCtx, runStoryCancel := context.WithCancel(a.ctx)`, appelle
  `workflow.RunStory(runStoryCtx, opts)`, retourne le path absolu.
- **`App.AbortRunning() error`** binding Go bindé. Appelle
  `a.runStoryCancel()` si non-nil ; retourne nil ou `errors.New("nothing to abort")`.
- **`App.SuggestedPrefixes() []string`** binding Go bindé. Re-export de
  `artifacts.AllowedPrefixes` trié alphabétiquement.
- **MockProvider extension** : champ optionnel `BlockUntil chan struct{}`
  dans
  [internal/provider/mock.go](../../internal/provider/mock.go).
  Si non-nil, `Generate` attend `<-BlockUntil` ou `ctx.Done()`. Permet
  AC5 (cancellation testée déterministe sans timing-dependent).

### Frontend

- **`<NewStoryModal />`** —
  [frontend/src/components/hub/NewStoryModal.tsx](../../frontend/src/components/hub/NewStoryModal.tsx)
  (nouveau). Dialog shadcn ; textarea description (max 10 000 chars,
  counter visible) ; combo prefix (peuplé par `App.SuggestedPrefixes()`
  ou input libre) ; toggle strict prefix ; bouton *Generate* (disabled
  si `useClaudeStore.status.Available === false` ou description vide) ;
  bouton *Cancel*. Phase *generating* : spinner + label live + bouton
  *Abort*. Phase *error* : message + boutons *Retry* / *Close*.
- **`useGenerationStore`** —
  [frontend/src/stores/generation.ts](../../frontend/src/stores/generation.ts)
  (nouveau). State : `phase: 'idle' | 'running' | 'success' | 'error'`,
  `currentLabel: string`, `error: string`, `lastResult: { path, durationMs }`.
- **Listener Wails Events** dans `<NewStoryModal />` ou hook dédié :
  `useEffect` qui souscrit à `provider:start` et `provider:end` au mount
  via `runtime.EventsOn(...)`, unsubscribe au unmount.
- **Stub d'API** dans
  [frontend/src/lib/wails-events.ts](../../frontend/src/lib/wails-events.ts)
  (nouveau, hand-written) : wrapper `EventsOn` / `EventsOff` côté JS,
  cohérent avec le pattern hand-written des stubs `App.{d.ts,js}`.
- **Bouton *New Story*** dans le hub UI-001b — ajouté en header de
  `<HubList />` ou en floating action button. Ouvre `<NewStoryModal />`.
- **Auto-refresh + auto-select post-success** — à la fin de
  `provider:end{success:true}`, `useArtifactsStore.refresh("stories")`
  est invoqué, puis `useArtifactsStore.setSelectedPath(payload.path)`
  pour ouvrir la story dans `<StoryViewer />`.

## Approche stratégique (delta UI-001c)

1. **Progress comme contrat minimal** : interface 2-méthodes
   (Start/End) dans le cœur workflow. Pas de Update/streaming
   token-par-token (déféré UI-005). Le payload de `provider:end`
   contient assez d'info (success, path, error, durationMs) pour piloter
   le modal sans aller-retour supplémentaire.
2. **Cancellation à 2 niveaux** : un `runStoryCancel` séparé du
   `app.cancel`. `AbortRunning` annule juste la génération en cours,
   l'app reste utilisable. `OnShutdown` cancel le ctx racine, qui
   propage au sous-ctx (donc le subprocess `claude` est tué via
   `exec.CommandContext`).
3. **Lock concurrence par `atomic.Bool`** : plus léger qu'un mutex,
   suffisant pour gate 0/1. `App.RunStory` `Swap(true)` au début, gate
   `false` au defer. Si déjà true, retourne `ErrAlreadyRunning`.
4. **MockProvider testable end-to-end pour cancellation** : ajout d'un
   `BlockUntil chan struct{}` qui bloque `Generate` jusqu'à signal du
   test ou `ctx.Done()`. Permet AC5 sans timing-dependent flaky.
5. **Validation prefix laisse remonter** : pas de duplication regex en
   TS. Le frontend envoie le string brut, le Go le valide via
   `artifacts.ValidatePrefix`, l'erreur remonte avec un message clair.
6. **Frontend → backend via 3 nouveaux bindings, pas plus** :
   `RunStory`, `AbortRunning`, `SuggestedPrefixes`. Le reste passe par
   les events Wails.
7. **`Greet()` peut être supprimé** (UI-001a D-A6 prévoyait sa survie
   en *About → Smoke test*). Avec `RunStory` couvrant un smoke test
   plus large (et `Generate` mock), `Greet` devient redondant. Reco :
   le retirer en UI-001c (à valider en revue, cf. D-C11).

## Modules impactés (delta UI-001c)

> Voir analyse de famille pour les impacts globaux ; ce delta liste
> uniquement ce que **UI-001c** touche (vs ce que UI-001a et UI-001b
> ont déjà livré).

| Module | Impact UI-001c | Note |
|---|---|---|
| `internal/workflow` | **moyen** | + interface `Progress` (2 méthodes) + champ `Progress` dans `StoryOptions` + appels `progress.Start/End` autour de `Provider.Generate` + type interne `noopProgress`. **Tests CORE-001 doivent passer sans modif** (champ optionnel) |
| `internal/uiapp` | **fort** | + 2 champs (`running atomic.Bool`, `runStoryCancel context.CancelFunc`) + sentinel `ErrAlreadyRunning` + struct `uiProgress` + 3 méthodes bindées (`RunStory`, `AbortRunning`, `SuggestedPrefixes`) |
| `internal/uiapp/app_test.go` | moyen | + ~10 tests : RunStory success path, RunStory ErrAlreadyRunning, AbortRunning during generation, OnShutdown cancellation, SuggestedPrefixes return |
| `internal/provider/mock.go` | faible | + champ optionnel `BlockUntil chan struct{}` ; `Generate` attend `<-BlockUntil` ou `ctx.Done()` si non-nil |
| `frontend/src/components/hub/NewStoryModal.tsx` | nouveau | composant Dialog shadcn complet |
| `frontend/src/components/hub/HubList.tsx` | faible | ajout bouton *New Story* en header |
| `frontend/src/stores/generation.ts` | nouveau | store Zustand `useGenerationStore` |
| `frontend/src/lib/wails-events.ts` | nouveau | wrapper hand-written `EventsOn`/`EventsOff` |
| `frontend/src/components/ui/dialog.tsx` | nouveau | composant shadcn (`npx shadcn add dialog`) |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | faible | + 3 export functions (RunStory, AbortRunning, SuggestedPrefixes) hand-written |
| `frontend/package.json` | faible | éventuellement `+ @radix-ui/react-dialog` (peer-dep shadcn) si pas déjà tiré |
| `cmd/yukki`, `internal/artifacts`, `internal/templates`, `internal/clilog`, `internal/provider/claude.go` | nul | aucun changement |

## Dépendances et intégrations (delta)

- **Backend Go** : aucune nouvelle dépendance externe. Reuse
  `github.com/wailsapp/wails/v2/pkg/runtime` pour `EventsEmit` (déjà tiré
  par UI-001b).
- **Frontend** :
  - `@radix-ui/react-dialog` (peer-dep shadcn Dialog component)
  - éventuellement `lucide-react` icônes additionnelles (déjà dans
    `package.json` UI-001a)
- **Conventions** :
  - Nom des events Wails : `provider:start`, `provider:end` (namespace
    par préfixe `provider:` pour ne pas coller avec d'éventuels events
    `hub:*` ou `claude:*` futurs).
  - Payload JSON-able via `runtime.EventsEmit` (Wails sérialise auto
    selon les tags JSON du struct Go émis).

## Risques spécifiques UI-001c

- **Couplage workflow → uiapp involontaire** *(prob. faible, impact moyen)*.
  Si `Progress` est mal défini ou si `uiProgress` est référencé par le
  workflow, depguard CORE-002 le détecte. **Mitigation** : test CI
  existant (`golangci-lint depguard`) interdit déjà
  `internal/workflow → internal/uiapp`. Aucune action additionnelle.
- **Test cancellation flaky par timing** *(prob. moyenne, impact moyen)*.
  Si on attend "100ms puis cancel", on teste le scheduler, pas la
  logique. **Mitigation** : `MockProvider.BlockUntil chan struct{}`
  signalable par le test ; cancellation déterministe.
- **EventsEmit après OnShutdown** *(prob. haute, impact faible)*.
  Si la fenêtre se ferme mid-generate, les events `provider:end` sont
  émis vers une fenêtre détruite. **Mitigation** : Wails ignore
  silencieusement (vérifier en test manuel). Pas d'erreur fatale.
- **Modal fermé mid-generate** *(prob. moyenne, impact faible)*.
  L'utilisateur clique en dehors du modal ou sur Esc pendant la
  génération. **Mitigation** : reco D-C12 ci-dessous : laisser
  RunStory continuer en background, le store met à jour
  `lastResult`, le hub se rafraîchit ; ou intercepter Esc → AbortRunning.
- **Double-clic *Generate*** *(prob. moyenne, impact faible)*.
  L'utilisateur clique deux fois sur Generate avant que le bouton se
  désactive (race UI). **Mitigation** : `atomic.Bool` côté Go
  (belt-and-suspenders avec `disabled` côté front).
- **Generate retourne markdown sans frontmatter** *(prob. faible, impact
  moyen)*. Claude peut produire du contenu hors-template (rare).
  **Mitigation** : `artifacts.Writer.Write` rejette via
  `ValidateFrontmatter`, l'erreur remonte au modal qui affiche
  "Frontmatter invalide".
- **Description > 10 000 chars** *(prob. faible, impact faible)*.
  **Mitigation** : `maxLength={10000}` sur le textarea + counter visible.
  Côté Go : pas de validation explicite (le prompt construit accepte
  arbitrairement long).
- **Subprocess `claude` qui fuit après cancellation** *(prob. faible,
  impact moyen)*. `exec.CommandContext` envoie `SIGTERM` au cancel,
  mais sur Windows c'est `TerminateProcess` qui peut laisser des
  enfants orphelins. **Mitigation** : `exec.CommandContext` est suffisant
  pour `claude --print` qui ne spawn pas de sous-procs (vérifié CORE-001).

## Cas limites UI-001c

- **Description vide** : bouton *Generate* `disabled` côté front ; côté
  Go `RunStory` retournerait `ErrEmptyDescription` mais ne devrait pas
  être appelé.
- **Prefix vide ou invalide** : `Generate` `disabled` si combo vide ;
  custom invalide (ex. `"123"`, `"a-b"`) → `artifacts.ValidatePrefix`
  rejette avec `ErrInvalidPrefix`.
- **Strict prefix activé sur custom non-whitelist** : ex. `MARK` →
  `ErrInvalidPrefix` avec message listant la whitelist.
- **Cancellation pendant `CheckVersion`** : si le user clique *Abort*
  pendant la phase `provider.CheckVersion(ctx)` (avant `Generate`), le
  ctx est annulé, `CheckVersion` retourne avec `ctx.Err() == context.Canceled`,
  `RunStory` propage. Pas de subprocess à tuer (CheckVersion a déjà fini).
- **Cancellation pendant `LoadStory` template** : peu probable (lecture
  fichier rapide), mais le ctx est respecté par `os.ReadFile` indirect ?
  Non, mais c'est instantané, donc négligeable.
- **NextID race entre 2 fenêtres yukki** : déjà noté UI-001 famille.
  Cas limite déjà couvert.
- **Generate très long (> 60s)** : pas de timeout dans UI-001c V1 ;
  l'utilisateur peut cliquer *Abort*. `MockProvider` (mode dev) répond
  instantanément. `ClaudeProvider` a un default timeout de 5min
  (`DefaultClaudeTimeout` CORE-001).
- **Wifi coupé pendant Generate** : Claude CLI échoue avec une erreur
  réseau, `Generate` retourne `ErrGenerationFailed`, l'erreur remonte
  vers le modal.
- **Modal Esc-fermé pendant generation** *(D-C12)* : 2 designs possibles
  — (a) auto-AbortRunning sur Esc/click-outside ; (b) laisser
  RunStory continuer en background, modal réouvrable. Reco (b) :
  Génération qui tourne 30s ne doit pas être perdue par un Esc
  involontaire.
- **Description avec triples backticks ou frontmatter inline** : potentielle
  collision avec le parser. **Mitigation** : `BuildStructuredPrompt` de
  CORE-001 escape correctement (vérifier dans
  [internal/workflow/prompt.go](../../internal/workflow/prompt.go)).
- **Combo prefix vide initialement** : pré-remplir avec `"CORE"` ou le
  préfixe le plus utilisé du projet courant ? Reco : default `"STORY"`
  (alphabétiquement premier de `AllowedPrefixes`).
- **Story créée mais hub en attente de refresh** : auto-refresh post-event
  garantit la visibilité. Si l'event est manqué (modal détruit avant ?),
  le hub bouton *refresh* manuel reste. Pas critique.

## Décisions UI-001c-spécifiques (delta — à prendre avant canvas)

> Les 16 décisions de famille D1-D16 (analyse parente) restent valides ;
> ces D-C* additionnent.

- [ ] **D-C1 — Signature de `Progress`**.
  *(Reco : `Start(label string)` + `End(err error)` (KISS, 2 méthodes).
  Pas de `Update(chunk string)` en V1 — déféré UI-005 streaming.)*
- [ ] **D-C2 — Format du payload `provider:end`**.
  *(Reco : `{success bool, path string, error string, durationMs int64}`.
  4 champs. `path` vide si !success ; `error` vide si success.
  `durationMs` toujours présent — utile pour télémétrie locale future.)*
- [ ] **D-C3 — `AbortRunning` binding public**.
  *(Reco : oui, public, séparé du `OnShutdown`. L'utilisateur veut pouvoir
  abandonner sans fermer la fenêtre. OQ2 user reco.)*
- [ ] **D-C4 — Lock concurrence**.
  *(Reco : `running atomic.Bool` dans `App` + `Swap(true)` au début de
  `RunStory`, `Store(false)` au defer. Plus léger qu'un mutex, suffisant
  pour gate 0/1. Sentinel `ErrAlreadyRunning` retourné si déjà true.)*
- [ ] **D-C5 — `SuggestedPrefixes`**.
  *(Reco : re-export simple de `artifacts.AllowedPrefixes` trié
  alphabétiquement dans une nouvelle méthode bindée. Pas de logique
  métier, juste sort + clone.)*
- [ ] **D-C6 — Validation prefix front**.
  *(Reco : laisser remonter du Go via `ValidatePrefix`. Pas de duplication
  regex en TS. Erreur affichée en bandeau dans le modal. OQ4 user reco.)*
- [ ] **D-C7 — Mock cancellation pour tests**.
  *(Reco : étendre `MockProvider` avec `BlockUntil chan struct{}`. Si
  non-nil, `Generate` attend `<-BlockUntil` ou `ctx.Done()` ; default
  nil = comportement UI-001b inchangé. Test cancellation déterministe.)*
- [ ] **D-C8 — Comportement si Generate retourne markdown sans frontmatter**.
  *(Reco : `artifacts.Writer.Write` rejette via `ValidateFrontmatter`,
  l'erreur remonte. Modal affiche message clair "Generated content
  invalid: missing frontmatter — try Retry".)*
- [ ] **D-C9 — Modal layout**.
  *(Reco : `Dialog` shadcn-ui (composant à ajouter via `npx shadcn add
  dialog`). Cohérent avec le reste de l'UI. Centré, modal-blocking.)*
- [ ] **D-C10 — Auto-refresh + auto-select post-success**.
  *(Reco : à `provider:end{success:true}`, `useArtifactsStore.refresh("stories")`
  + `setSelectedPath(payload.path)`. UX immédiat : la story apparaît
  ouverte dans le viewer.)*
- [ ] **D-C11 — Survivance de `Greet()` post-UI-001c**.
  *(UI-001a D-A6 prévoyait sa survie en menu *About → Smoke test*.
  Reco : **supprimer** dans UI-001c — `RunStory` (mode mock) couvre un
  smoke test plus large et `Greet` est devenu redondant. Réduit la
  surface API.)*
- [ ] **D-C12 — Modal Esc-fermé / click-outside pendant generation**.
  *(Reco : laisser `RunStory` continuer en background. Le store garde
  `phase: 'running'` ; le hub se rafraîchit à l'arrivée de
  `provider:end`. Une notification toast post-success serait utile mais
  reportable UI-005. **Ne pas** auto-AbortRunning sur Esc — risque de
  perdre 30s de génération sur un mauvais clic.)*
- [ ] **D-C13 — Default prefix dans le combo**.
  *(Reco : `"STORY"` (alphabétiquement premier de `AllowedPrefixes`).
  Alternative : "CORE" si on veut biaiser vers le préfixe le plus utilisé
  yukki. Reco neutre = `STORY`.)*
- [ ] **D-C14 — Tests Go étendus**.
  *(Reco : ~10 tests dans `internal/uiapp/app_test.go` étendu, table-driven :
  `TestApp_RunStory_Success`, `_AlreadyRunning`, `_NoProject`,
  `_AbortMidFlight`, `_ShutdownDuringGeneration`,
  `TestApp_AbortRunning_NothingToAbort`,
  `TestApp_SuggestedPrefixes_Sorted`, `TestUiProgress_EmitsEvents`
  (mock runtime.EventsEmit), `TestRunStory_NoopProgressFallback`
  (workflow_test.go avec `Progress=nil`).)*
- [ ] **D-C15 — Telemetry post-MVP ou opt-in maintenant ?**
  *(Reco : ne rien tracker en V1. Le `durationMs` du payload est dans
  l'event Wails mais pas persisté. Si OSS un jour, télémetrie locale
  type `spdd/.telemetry.sqlite` opt-in — recommandation Section L de
  la revue de recherche, à reconsidérer post-OSS.)*
