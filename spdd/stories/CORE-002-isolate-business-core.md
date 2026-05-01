---
id: CORE-002
slug: isolate-business-core
title: Isoler le cœur métier de la CLI pour permettre une exposition MCP future
status: done
created: 2026-05-01
updated: 2026-05-01
owner: Thibaut Sannier
modules:
  - internal/workflow
  - internal/provider
  - internal/templates
  - internal/artifacts
  - tests/integration
  - DEVELOPMENT.md
  - .github/workflows/ci.yml
---

# Isoler le cœur métier de la CLI pour permettre une exposition MCP future

## Background

Aujourd'hui, le cœur métier de yukki (orchestration `RunStory`, abstraction
`Provider`, templates, artifacts writer) vit dans
`internal/{workflow,provider,templates,artifacts}` et est consommé par **deux
surfaces** : la CLI Cobra ([main.go](../../main.go) + [ui.go](../../ui.go))
et le binding Wails ([internal/uiapp/app.go](../../internal/uiapp/app.go)).

L'écosystème Claude / agents IA s'aligne en 2026 sur le **Model Context
Protocol (MCP)** comme standard pour exposer des tools à des clients
agentiques (Claude Desktop, Cursor, Continue, OpenCode, etc.). Pour que
yukki devienne consommable par n'importe quel agent MCP-capable —
*"générer une story SPDD depuis un IDE/agent qui parle MCP"* —
il faut une **3ᵉ surface** : un serveur MCP exposant les opérations
yukki (`yukki.story`, plus tard `yukki.analysis`, etc.) en tools
JSON-RPC.

L'expérience CORE-001 + UI-001a a déjà posé une isolation de fait : les
4 packages internes ne dépendent ni de Cobra, ni de Wails. La présente
story **formalise et garantit** cette isolation pour que l'ajout d'un
serveur MCP demain (story future, vraisemblablement `INT-002`) soit une
addition pure — aucune refactor du cœur ne doit être nécessaire au
moment de l'ajout.

> **Cette story ne livre PAS le serveur MCP.** Elle prépare le terrain.
> L'implémentation effective du serveur MCP (binding du SDK
> github.com/modelcontextprotocol/go-sdk, gestion des tools, lifecycle)
> sera tracée dans une nouvelle ligne TODO `INT-002 — MCP server` qui
> dépend de cette story.

> **Note ID swap (2026-05-01)** : cette story a initialement été écrite
> avec l'ID `CORE-003` (commit `e2676f3` sur l'ancienne branche
> `feature/CORE-003`, jamais poussée). Sur décision utilisateur de la
> prioriser sur le découpage SPIDR, les IDs ont été inversés :
> `CORE-002 = isolate-business-core` (cette story), `CORE-003 =
> spidr-split-cli-commands` (ex-CORE-002, plan de découpage des 6
> sous-cmd restantes).

## Business Value

- **3ᵉ surface possible sans refactor** : quand on ajoutera le serveur
  MCP, on importera `internal/workflow` etc. et on exposera leurs
  méthodes ; aucun changement de signature côté cœur.
- **Garantie de découplage testée** : un test d'intégration prouve que le
  cœur est appelable sans Cobra ni Wails. Tout retour en arrière (un
  contributeur qui inline du `cmd.Println` dans `internal/workflow`)
  casse la CI.
- **Documentation explicite** : un développeur qui débarque sait
  immédiatement *"voici la surface métier, voici les surfaces de
  consommation"*. Réduit le risque d'ajouter un nouvel import indésiré
  au cœur (e.g. côté CLI, on pourrait être tenté d'ajouter un printf de
  debug dans le workflow).
- **Adoption multi-client** : posture défensive face à l'évolution de
  l'écosystème — Cursor, Continue, OpenCode, Zed et d'autres adoptent
  MCP en 2026. Un yukki isolé peut servir tous ces clients via une
  seule implémentation côté serveur.
- **Préfigure une éventuelle publication en lib Go publique** : si un
  jour on déplace le cœur de `internal/` vers `pkg/`, l'isolation
  prouvée maintenant rend la migration triviale.

## Scope In

- **Audit du couplage** : vérifier qu'**aucun** import dans
  `internal/workflow`, `internal/provider`, `internal/templates`,
  `internal/artifacts` ne référence :
  - `github.com/spf13/cobra`
  - `github.com/wailsapp/wails/v2`
  - `os.Stdin` / `os.Stdout` / `os.Stderr` (sauf `clilog` qui est
    nominalement le pont logging — voir cas limite)
  - `fmt.Print*` à destination utilisateur
- **Audit du flux de données** : vérifier que toutes les entrées
  utilisateur (description, prefix, project dir) arrivent au cœur via
  des **paramètres explicites** d'une struct ou d'une signature de
  fonction — pas de lecture stdin, pas de variable globale.
- **Documentation des packages** : enrichir le `// Package X ...`
  doc-comment de chaque package du cœur (`workflow`, `provider`,
  `templates`, `artifacts`) pour expliciter :
  - le rôle métier
  - le statut "surface consommable depuis CLI / UI / MCP"
  - les invariants (e.g. "Provider.Generate() est idempotent côté yukki :
    une même requête peut être rejouée")
- **Linter / check CI** : un nouveau script
  `scripts/dev/check-core-isolation.sh` (ou intégré au job
  `static-checks` du CI) qui exécute les greps interdisant les imports
  CLI/UI dans le cœur. Échec CI si un import indésirable apparaît.
- **Test d'intégration "core-only"** : nouveau fichier
  `tests/integration/core_isolation_test.go` qui :
  - importe **uniquement** `internal/{workflow,provider,templates,artifacts}`
  - **ne touche pas** à `cmd/`, `internal/uiapp`, ni Cobra, ni Wails
  - exécute un `RunStory` end-to-end avec `MockProvider` + filesystem
    réel (`t.TempDir()`)
  - assert le fichier produit + son frontmatter
  - sert de **témoin vivant** que le cœur peut être consommé en
    isolation
- **Schéma d'architecture** dans `DEVELOPMENT.md` (et idéalement
  `spdd/GUIDE.md`) :
  ```
  ┌─────────────────────────────────────────────────┐
  │  Surfaces de consommation                       │
  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
  │  │ CLI Cobra│  │ Wails UI │  │ MCP server   │   │
  │  │ (root)   │  │ (uiapp)  │  │ (INT-002,TBD)│   │
  │  └────┬─────┘  └─────┬────┘  └──────┬───────┘   │
  │       └──────────┬───┴──────────────┘           │
  │                  ▼                              │
  │  ┌────────────────────────────────────────┐     │
  │  │  Cœur métier (internal/)              │     │
  │  │  - workflow.RunStory + Progress       │     │
  │  │  - provider.{Provider,Mock,Claude}    │     │
  │  │  - templates.Loader                   │     │
  │  │  - artifacts.{NextID,Slug,Writer,...} │     │
  │  └────────────────────────────────────────┘     │
  └─────────────────────────────────────────────────┘
  ```
- **TODO update** : ajouter `INT-002 — MCP server (yukki story
  exposé en tool MCP)` qui pointe vers cette story comme prérequis.
  Aussi ajouter une note de swap d'ID dans l'historique TODO.md.

## Scope Out

- **Implémentation du serveur MCP** : pas dans cette story.
  Future story `INT-002`. Aucune ligne de code MCP n'est ajoutée ici.
- **Déplacement des packages vers `pkg/`** : si on voulait exposer le
  cœur comme **lib Go publique** importable depuis l'extérieur du
  module, il faudrait sortir d'`internal/`. Pas le scope ici (le MCP
  server vivra *dans* yukki, sous-cmd `yukki mcp`, et importe
  l'`internal/` directement).
- **Refactor des signatures publiques** existantes : `RunStory`,
  `NewLoader`, `NewWriter`, `NewClaude` restent **strictement** comme
  ils sont aujourd'hui. Si l'audit révèle un défaut, c'est un signal
  pour un `/spdd-prompt-update` du canvas CORE-001, pas une dérive
  silencieuse.
- **Nouvelle surface de tests** au-delà de l'intégration core-only :
  pas d'API contract test, pas de fuzz, pas de bench. La couverture
  reste celle livrée par CORE-001.
- **Standardisation des erreurs** entre les surfaces : déjà couvert par
  les sentinels `provider.ErrNotFound`, `artifacts.ErrInvalidPrefix`,
  etc. dans CORE-001. La présente story confirme leur usage, pas une
  refonte.
- **Generation de code MCP-ready** (e.g. génération auto des schemas
  des tools depuis les signatures Go) : reporté à `INT-002`, ou plus
  loin.

## Acceptance Criteria

> Format Given / When / Then. Chaque AC est testable en CI.

### AC1 — Aucun import CLI/UI dans le cœur

- **Given** une PR sur `feature/CORE-002` ou tout PR future
- **When** le job `core-isolation` du CI s'exécute
- **Then** un grep sur `internal/workflow`, `internal/provider`,
  `internal/templates`, `internal/artifacts` ne retourne aucun match
  pour `cobra`, `wails`, `internal/uiapp`. Un match déclenche un
  échec CI explicite *"core isolation broken: <package> imports
  <forbidden>"*.

### AC2 — Test d'intégration core-only au vert

- **Given** le test `tests/integration/core_isolation_test.go` est
  livré
- **When** le CI lance `go test ./tests/integration/...`
- **Then** le test exécute un `workflow.RunStory` end-to-end avec
  `MockProvider`, lit/écrit dans un dossier temporaire, et assert
  le fichier produit + son frontmatter. Le test **n'importe** ni
  `cmd/`, ni `internal/uiapp`, ni Cobra, ni Wails.

### AC3 — Doc-package commentaires enrichis

- **Given** les 4 packages du cœur
- **When** on lit `go doc github.com/yukki-project/yukki/internal/workflow`
  (et idem pour les 3 autres)
- **Then** la première phrase mentionne explicitement *"part of
  yukki's business core, callable from CLI, UI and (future) MCP
  server"*. La doc liste les invariants du package (≥ 1 par package).

### AC4 — Schéma d'architecture dans DEVELOPMENT.md

- **Given** la PR est mergée
- **When** on lit `DEVELOPMENT.md` section *"Architecture"*
- **Then** un schéma ASCII y figure montrant les 3 surfaces (CLI, UI,
  MCP-future) au-dessus du cœur unique. Mention explicite que MCP est
  *"non-livré, INT-002"* pour ne pas mentir sur l'état actuel.

### AC5 — TODO `INT-002` créée + note de swap d'ID

- **Given** la PR est mergée
- **When** on lit `TODO.md`
- **Then** (a) une ligne `INT-002 — Serveur MCP exposant les tools
  yukki (story / analysis / ...)` apparaît dans la section appropriée
  (post-MVP ou en attente, selon l'urgence). Elle dépend explicitement
  de CORE-002 (`depends-on: CORE-002`).
  (b) L'historique TODO.md mentionne le swap CORE-002 ↔ CORE-003 du
  2026-05-01 pour traçabilité.

### AC6 — Aucune régression sur les tests existants

- **Given** la PR est mergée
- **When** la CI complète tourne (5 jobs : static-checks, unit-tests
  prod + mock-tagged, integration-tests, e2e-tests, ui-build matrix)
- **Then** tous les jobs passent au vert. Aucun test existant
  (CORE-001, UI-001a) n'a été modifié pour faire passer cette story.

### AC7 — `clilog` reste l'unique pont logging

- **Given** l'audit
- **When** on grep `import.*log/slog` dans le cœur
- **Then** seul `clilog` peut être importé (et est en fait
  *appelé* via les `*slog.Logger` injectés). Aucun package du cœur
  n'instancie un logger lui-même ; tout passe par DI.

## Open Questions

- [ ] **OQ1 — Préfixe ID** : `CORE-002` (continuité features cœur)
  ou nouveau préfixe `ARCH-001` (architecture pure) ? *Reco :
  `CORE-002` — c'est une story qui prépare un `INT-002`, et reste
  dans la lignée CORE-001 (initial). Pas la peine de multiplier les
  préfixes. ID confirmé après swap 2026-05-01.*
- [ ] **OQ2 — Approche d'exposition MCP future (informationnel)** :
  - **A** — Sous-commande `yukki mcp` qui démarre un serveur MCP local
    (stdio ou TCP). Internal/ packages restent internal/. **Reco**.
  - **B** — Binaire séparé `yukki-mcp` au repo ou autre repo, importe
    yukki en lib publique (donc move des packages vers `pkg/`).
  - **C** — Hybride : sous-cmd `yukki mcp` dans le binaire principal +
    library Go publique exposée via un alias `pkg/yukki` qui re-exporte
    `internal/`. Lourd mais flexible.
  *Reco : A pour `INT-002`. B/C reportés si demande externe émerge.*
- [ ] **OQ3 — Lieu du linter / check CI** : intégré au step
  `static-checks` (un grep de plus) ou dans un job dédié `core-isolation`
  qui dépend de `static-checks` ? *Reco : intégré à `static-checks`
  (un step, ~10 lignes shell). Job dédié est over-engineered pour ce
  contrôle.*
- [ ] **OQ4 — Granularité du grep** : on interdit les noms exacts
  (`spf13/cobra`, `wailsapp/wails`) ou un pattern plus large
  (`grep -E "cobra|wails|uiapp"`) ? *Reco : noms exacts. Le pattern
  large risque de matcher dans des commentaires ou des stubs.*
- [ ] **OQ5 — Faut-il une interface unifiée `Service` qui abstrait
  les futures opérations (`Story`, `Analysis`, `Canvas`, `Generate`)** ?
  Aujourd'hui chaque opération aura sa propre fonction `RunX`. Une
  interface unique faciliterait l'exposition MCP (un dispatcher générique).
  *Reco : non en CORE-002. La story garde le scope minimal — auditer +
  documenter. L'interface unifiée naîtra organiquement quand
  CORE-003a-f (ex-CORE-002a-f) livreront 5+ opérations et qu'on verra
  le pattern.*
- [ ] **OQ6 — Versioning de la "core API"** : doit-on figer un
  contrat semver sur le cœur ?
  *Reco : non en CORE-002. yukki est encore en pré-1.0. Versioning
  semver formel quand DOC-001 publiera la 1.0.*

## Notes

- **Type de story** : *refactor + audit + tests* (peu de code, beaucoup
  de discipline). Estimation : ~0.5j (audit grep + 1 test
  d'intégration + doc-comments + schéma DEVELOPMENT.md + entrée TODO
  + step CI). INVEST-Small confortablement.
- **Filiation** : prérequis explicite de la future `INT-002 — Serveur
  MCP`. Sans CORE-002, INT-002 risque d'introduire des dépendances
  circulaires ou des leaks accidentels.
- **Précédent** : la story applique le pattern *"prepare the ground"*
  utilisé par UI-001a (skeleton). Pas de feature visible utilisateur,
  juste de la dette technique anticipée et un test-témoin.
- **Swap d'ID 2026-05-01** : story originalement écrite avec
  ID `CORE-003` (ancien commit `e2676f3` sur ancienne branche
  `feature/CORE-003`, jamais poussée). Inversée avec l'ex-CORE-002
  (split SPIDR) sur décision utilisateur pour prioriser cette story.
  La story SPIDR vit désormais en `CORE-003-spidr-split-cli-commands.md`.
- **Lien futur** :
  - Analyse à venir : `spdd/analysis/CORE-002-isolate-business-core.md`
  - Canvas REASONS à venir : `spdd/prompts/CORE-002-isolate-business-core.md`
  - Story future : `spdd/stories/INT-002-mcp-server.md` (à créer après
    livraison de CORE-002)
- **MCP context (informationnel)** :
  - SDK Go référent : [github.com/modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk)
  - Spec officielle : [modelcontextprotocol.io](https://modelcontextprotocol.io/)
  - Clients adoptants (2026) : Claude Desktop, Cursor, Continue,
    OpenCode, Zed, Cody. La surface MCP rendrait yukki accessible
    depuis tous ces environnements en parallèle de la CLI Cobra
    actuelle.
