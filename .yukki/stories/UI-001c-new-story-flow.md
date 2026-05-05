---
id: UI-001c
slug: new-story-flow
title: New Story flow — modal, RunStory binding, EventsEmit streaming, cancellation
status: draft
created: 2026-05-01
updated: 2026-05-01
owner: Thibaut Sannier
modules:
  - cmd/yukki
  - internal/uiapp
  - internal/workflow
  - frontend
parent: UI-001
sibling-stories:
  - UI-001a-app-skeleton-and-subcommand
  - UI-001b-hub-viewer-claude-banner
analysis: .yukki/analysis/UI-001-init-desktop-app-wails-react.md
depends-on:
  - UI-001a-app-skeleton-and-subcommand
  - UI-001b-hub-viewer-claude-banner
---

# New Story flow — modal, RunStory binding, EventsEmit streaming, cancellation

## Background

Troisième et dernière story fille de UI-001. UI-001a a posé le scaffold,
UI-001b a livré le hub read-only ; UI-001c apporte enfin **l'écriture** :
l'utilisateur peut générer une story via Claude depuis l'UI, voir un
spinner pendant l'attente, et la nouvelle story apparaît dans le hub.

C'est cette story qui *ferme la boucle V1 minimal* : l'utilisateur peut
tout faire depuis l'UI sans toucher la CLI (pour le flow `story` du moins ;
les autres flows SPDD viendront via CORE-002a-f puis UI-005+).

## Business Value

- **First end-to-end flow UI** : une fois UI-001c mergée, on peut
  démontrer l'app à un utilisateur ou en captures écran, et il voit
  une story se générer en temps réel. Indispensable pour la promo
  / DOC-001.
- **Validation du contrat workflow ↔ ui** : l'interface
  `workflow.Progress` posée en UI-001c sert de référence pour les 5
  flows SPDD restants (CORE-002a-f côté CLI, UI-005+ côté UI).
- **Zero token waste en dev front** : grâce au build tag `mock` posé en
  UI-001a, on développe le modal et le streaming UI sans appeler
  Claude réellement (MockProvider retourne une story stub).

## Scope In

- **`workflow.Progress` interface** dans
  [internal/workflow/story.go](../../internal/workflow/story.go) :
  ```go
  type Progress interface {
      Start(label string)
      End(err error)
  }
  ```
  Champ `Progress Progress` (nullable) ajouté à `StoryOptions`.
  `RunStory` appelle `progress.Start("Asking Claude")` avant
  `Provider.Generate`, `progress.End(err)` après. Si `Progress == nil`,
  fallback `noopProgress` interne.
- **`internal/uiapp.uiProgress`** : implémente `workflow.Progress` en
  appelant `runtime.EventsEmit(ctx, "provider:start", label)` et
  `runtime.EventsEmit(ctx, "provider:end", payload)`. Le payload de fin
  inclut `{success: bool, error?: string}`.
- **`App.RunStory(description, prefix string, strictPrefix bool) (string, error)`**
  binding Go. Construit `StoryOptions` à partir de l'état App
  (provider, loader, writer, logger, **uiProgress**, ctx cancellable).
  Appelle `workflow.RunStory(ctx, opts)`. Retourne le path absolu.
- **`App.OnShutdown(ctx)`** hook Wails : appelle `app.cancel()`
  (la `CancelFunc` détenue par l'App). Le ctx passe en `Done`,
  `Provider.Generate` (qui propage `ctx`) annule le subprocess `claude`.
  Cohérent avec Q5=A retenue.
- **Composant React `<NewStoryModal />`** :
  - textarea pour la description (validation : non-vide, ≤ 10 000 chars)
  - sélecteur prefix (combo : *Suggested* / *Custom*) avec valeurs
    suggérées du `artifacts.AllowedPrefixesString()` (déjà exposé via
    une nouvelle binding `App.SuggestedPrefixes() []string`)
  - toggle *strict prefix*
  - bouton *Generate* (disabled si `ClaudeStatus.Available === false`)
    + bouton *Cancel*
  - phase *generating* : spinner + label live (mis à jour par les
    events `provider:start` / `provider:end`) + bouton *Abort* qui
    appelle `App.AbortRunning()` (qui call `app.cancel()`)
- **Listener Wails Events côté React** : `useEffect` qui souscrit aux
  events `provider:start`/`provider:end` au mount du modal,
  unsubscribe au unmount.
- **Refresh post-action** : à la fin d'un `RunStory` réussi, ferme le
  modal, déclenche `useArtifactsStore.refresh("stories")`, sélectionne
  la nouvelle story dans `<HubList />`.
- **Tests Go** unit :
  - `internal/uiapp.uiProgress.Start/End` émet bien les events Wails
    (mock `runtime.EventsEmit`)
  - `internal/uiapp.App.RunStory` câble correctement `Progress` dans
    `StoryOptions` ; bout-en-bout avec MockProvider qui retourne
    une story stub valide ; assert le path retourné, le contenu
    écrit, l'event `provider:end` émis avec `success:true`
  - cancellation : `App.OnShutdown` annule un `RunStory` en cours ;
    `MockProvider` configuré pour bloquer ~100ms, `OnShutdown` doit
    interrompre proprement et émettre `provider:end{success:false,
    error:"context canceled"}`
  - tests existants `internal/workflow/story_test.go` doivent
    continuer à passer (Progress nullable, fallback noopProgress)

## Scope Out

- **Streaming token-par-token** de la sortie Claude (pour afficher
  la génération en temps réel) = UI-005. UI-001c se contente de
  `start`/`end` events.
- **Édition d'une story existante** (revue + modif inline en UI) =
  UI-005.
- **Workflow analysis / canvas / generate** via UI = CORE-002 + future
  story UI-006+ qui apporteront ces flows à l'UI.
- **Prefix custom validation côté UI** : on délègue à
  `artifacts.ValidatePrefix` côté Go ; les erreurs remontent via le
  retour de `App.RunStory`.
- **Persistance "draft de description en cours"** entre sessions : pas
  en V1, perdu si l'utilisateur ferme la fenêtre.
- **Prévisualisation du prompt structuré** envoyé à Claude (debug) :
  pas en V1.

## Acceptance Criteria

### AC1 — Modal *New Story* est ouvert via un bouton dans le hub

- **Given** un projet sélectionné, le hub affiché, `ClaudeStatus.Available
  === true`
- **When** l'utilisateur clique sur le bouton *New Story* du hub
- **Then** le modal `<NewStoryModal />` s'ouvre par-dessus le hub avec
  textarea, sélecteur de prefix (par défaut *CORE*), toggle strict
  prefix off, bouton *Generate*. Le bouton *Generate* est disabled tant
  que la textarea est vide.

### AC2 — Modal disabled quand `ClaudeStatus.Available === false`

- **Given** Claude CLI n'est pas détecté (banner UI-001b actif)
- **When** l'utilisateur ouvre `<NewStoryModal />`
- **Then** le bouton *Generate* est disabled avec un tooltip *"Install
  Claude CLI first (see banner)"*. La textarea reste utilisable mais
  aucune génération ne peut être lancée.

### AC3 — Génération réussie via `App.RunStory` + MockProvider

- **Given** build tag `mock` actif (`wails dev -tags mock`),
  `MockProvider` configuré avec une story stub valide, modal ouvert
  avec description *"Test story"* et prefix *CORE*
- **When** l'utilisateur clique *Generate*
- **Then** :
  1. Phase *generating* affichée : spinner + label *"Asking Claude…"*
  2. Event `provider:start` reçu côté front, label updated
  3. Event `provider:end` reçu avec `{success:true}`
  4. Modal se ferme
  5. `<HubList />` est rafraîchie ; la nouvelle story apparaît
     sélectionnée
  6. `App.RunStory` retourne le path du fichier créé

### AC4 — Erreur de génération affichée dans le modal sans crash

- **Given** `MockProvider` configuré pour retourner
  `provider.ErrGenerationFailed`
- **When** l'utilisateur clique *Generate*
- **Then** le modal affiche un état d'erreur *"Generation failed:
  <message>"* avec un bouton *Retry* (re-call `App.RunStory`) et un
  bouton *Close*. Pas d'écriture côté disque, pas de refresh hub.

### AC5 — Cancellation propre via `OnShutdown` Wails

- **Given** un appel `App.RunStory` en cours, `MockProvider` configuré
  pour bloquer 5 secondes
- **When** l'utilisateur ferme la fenêtre Wails (cliquer la croix /
  Cmd-W / Alt-F4)
- **Then** :
  1. Wails appelle `app.OnShutdown(ctx)`
  2. `app.cancel()` est invoqué, le `ctx` passé à `RunStory` passe
     en `Done`
  3. Le subprocess (ou le mock) est annulé proprement
  4. `provider:end{success:false, error:"context canceled"}` est émis
     (mais la fenêtre est en cours de fermeture, le frontend ne le
     verra pas)
  5. La CLI rend la main avec exit code 0 (fermeture propre, pas un
     crash)

### AC6 — Bouton *Abort* annule sans fermer la fenêtre

- **Given** un appel `App.RunStory` en cours dans le modal
- **When** l'utilisateur clique *Abort* dans le modal
- **Then** `App.AbortRunning()` est appelé, qui invoque `app.cancel()`.
  Le modal repasse en état initial (textarea + bouton *Generate*).
  Aucun fichier écrit. Banner notification temporaire :
  *"Generation aborted"*.

### AC7 — `Progress=nil` n'altère pas le comportement de `RunStory` côté CLI

- **Given** la CLI `yukki story "..."` (CORE-001) qui ne passe pas de
  `Progress` dans `StoryOptions`
- **When** elle s'exécute après l'ajout de l'interface `Progress`
- **Then** le comportement est identique à avant (tests existants
  `internal/workflow/story_test.go` passent sans modif). Le
  `noopProgress` est invoqué silencieusement.

## Open Questions

- [ ] **OQ1 — Format de l'event `provider:end` payload** :
  `{success:true, path:"/abs/path"}` ou `{success:false, error:"msg"}` ?
  *Reco : oui, et en plus `{durationMs: number}` pour permettre une
  télémétrie locale (durée des appels Claude).*
- [ ] **OQ2 — `App.AbortRunning()` une méthode publique vs privée** :
  exposer une binding *abort* dédiée ou se contenter du shutdown
  cancel ?
  *Reco : binding publique séparée — l'utilisateur veut pouvoir
  abandonner sans fermer l'app.*
- [ ] **OQ3 — Que faire d'un appel `RunStory` parallèle (l'utilisateur
  ouvre 2 modals en double-clic) ?**
  *Reco : verrouiller — `App.RunStory` retourne `ErrAlreadyRunning`
  si une opération est déjà en cours. Le modal ne permet de toute
  façon pas le double-clic UI.*
- [ ] **OQ4 — Validation prefix côté front avant l'appel Go** :
  on duplique la regex `artifacts.ValidatePrefix` en TS, ou on laisse
  l'erreur remonter du Go ?
  *Reco : laisser remonter — pas de duplication, l'erreur est de toute
  façon affichée côté UI.*

## Notes

- **Filiation** : 3ème et dernière story fille de **UI-001**.
  Sœurs : UI-001a (skeleton), UI-001b (hub viewer).
- **Dépendances** : nécessite UI-001a + UI-001b mergées. Par construction
  UI-001c est la dernière à livrer dans la famille.
- **Analyse partagée** : [`.yukki/analysis/UI-001-init-desktop-app-wails-react.md`](../analysis/UI-001-init-desktop-app-wails-react.md).
  Les décisions D3 (interface Progress 2 méthodes), D5 (cancellation
  via OnShutdown), D12 (provider injection) sont déjà tranchées.
- **Estimation** : ~1.5j (interface Progress + uiProgress 0.3j +
  binding RunStory + cancellation 0.4j + modal React + EventsOn 0.5j
  + tests 0.3j).
- **Décision Q3 (initialisation `spdd/`)** était assignée à UI-001b
  mais pourrait migrer ici si UI-001b devient trop grosse en revue.
  Pour l'instant elle reste en UI-001b.
- **Lien vers le canvas REASONS** (à venir) :
  `.yukki/prompts/UI-001c-new-story-flow.md`
