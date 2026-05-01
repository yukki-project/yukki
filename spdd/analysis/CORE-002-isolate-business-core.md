---
id: CORE-002
slug: isolate-business-core
story: spdd/stories/CORE-002-isolate-business-core.md
status: reviewed
created: 2026-05-01
updated: 2026-05-01
---

# Analyse — Isoler le cœur métier de la CLI pour exposition MCP future

> Contexte stratégique pour `CORE-002-isolate-business-core`. Issue d'un
> audit ciblé des imports dans `internal/{workflow,provider,templates,
> artifacts,uiapp,clilog}` et du package main racine.
>
> **Note ID swap (2026-05-01)** : story originalement écrite sous
> `CORE-003`, swappée en `CORE-002` pour priorisation. La story
> spidr-split-cli-commands (parent vision) prend `CORE-003`.

## Mots-clés métier extraits

`isolation`, `MCP`, `Provider`, `RunStory`, `MockProvider`, `clilog`,
`core_isolation_test`, `import-graph`.

## Concepts de domaine

### Existants — l'isolation est de facto déjà en place

L'**audit** par grep ciblé sur les 4 packages cible (`internal/workflow`,
`internal/provider`, `internal/templates`, `internal/artifacts`) confirme :

| Package | Import `cobra` ? | Import `wails` ? | Import `uiapp` ? | Verdict |
|---|---|---|---|---|
| `internal/workflow` | ❌ | ❌ | ❌ | propre |
| `internal/provider` | ❌ | ❌ | ❌ | propre |
| `internal/templates` | ❌ | ❌ | ❌ | propre |
| `internal/artifacts` | ❌ | ❌ | ❌ | propre |

**Surfaces de consommation actuelles** :

- **CLI Cobra** (root package main) — [main.go](../../main.go) :
  `newRootCmd()` → `root.AddCommand(newStoryCmd())` + `newUICmd()`.
  Construit `workflow.StoryOptions{Provider, Logger, TemplateLoader,
  Writer}` puis `workflow.RunStory(ctx, opts)`.
- **Wails Bindings** (internal/uiapp) — [app.go](../../internal/uiapp/app.go) :
  `App.Greet()` (UI-001a smoke test). UI-001b/c câbleront `RunStory` via
  `App.RunStory(...)` selon le même pattern que la CLI. uiapp **importe
  uniquement** `internal/provider` aujourd'hui ; pas de cobra ni wails
  dans uiapp lui-même (Wails est ré-importé par le package main au-dessus
  via `ui.go`).

**Pattern de DI déjà observé** :
- `workflow.RunStory(ctx, StoryOptions{...})` — la struct contient
  toutes les deps injectables (Provider, Logger, TemplateLoader, Writer).
  Aucune lecture stdin / variable globale dans le workflow.
- `provider.NewClaude(logger)` retourne un `*ClaudeProvider` qui
  implémente l'interface `Provider`. Idem `MockProvider`.
- `templates.NewLoader(projectDir)` paramétrable par dossier projet.
- `artifacts.NewWriter(storiesDir)` paramétrable par dossier sortie.

**Faux positifs grep à attendre par le linter** :
- `internal/provider/claude_test.go` utilise `fmt.Println` / `os.Stdin`
  (stub claude binary buildé via `go run` pour les tests). C'est en
  `_test.go` donc filtrable via `--exclude='*_test.go'`.
- `internal/clilog/clilog.go` utilise `os.Stderr` comme sink par défaut.
  C'est le rôle du package — pont logging. À exempter explicitement.
- `internal/uiapp/app.go` mentionne `cobra`/`wails` dans des **commentaires
  doc** mais sans import. À exempter via `grep --include='*.go'` sur
  les lignes `import` uniquement, pas le corps.

### Nouveaux à introduire

- **`scripts/dev/check-core-isolation.sh`** — script shell exécutable
  qui :
  1. Pour chaque package du cœur, parse les imports (via `go list -f '{{.Imports}}'`
     ou un grep ligne par ligne sur les blocs `import (...)`)
  2. Vérifie qu'aucun n'est dans une liste noire (cobra, wails, uiapp,
     toute lib UI)
  3. Exit 1 + message clair si violation, exit 0 sinon
  4. Utilisable en local (avant commit) ET en CI (step `static-checks`)
- **Step CI dans `static-checks`** qui appelle ce script. Ajout au job
  existant, pas un nouveau job (D-OQ3 reco).
- **`tests/integration/core_isolation_test.go`** — test Go qui :
  1. N'importe **que** `internal/{workflow,provider,templates,artifacts}` +
     `testing` + stdlib (`context`, `os`, `path/filepath`)
  2. Ne référence ni `cmd/`, ni `internal/uiapp`, ni `cobra`, ni `wails`
  3. Build un `MockProvider` avec une réponse stub
  4. Build `templates.NewLoader(t.TempDir())` (avec embed.FS fallback)
  5. Build `artifacts.NewWriter(filepath.Join(tempDir, "stories"))`
  6. Compose `workflow.StoryOptions{...}` et appelle `workflow.RunStory(ctx, opts)`
  7. Assert : path retourné existe, contient un frontmatter valide,
     contient le titre attendu
- **Doc-package amélioré** sur les 4 packages : commentaire de tête
  qui mentionne *"part of yukki's business core, callable from CLI, UI
  and (future) MCP server"* + liste les invariants du package.
- **Schéma d'architecture** dans `DEVELOPMENT.md` (section *Architecture*
  à créer).
- **Ligne TODO** `INT-002 — MCP server` avec dépendance explicite.

## Approche stratégique

1. **Pas de refactor structurel** : le cœur est déjà isolé. La story
   *formalise* avec un linter + un test-témoin. Aucune signature publique
   n'est modifiée. Aucun fichier déplacé.
2. **Linter en CI** plutôt que convention de revue : un script grep
   est plus fiable qu'un humain qui review. Le coût est ~30 lignes de
   shell + 1 step CI.
3. **Test-témoin** comme garantie *runtime* : si quelqu'un un jour
   ajoute un import cobra dans `internal/workflow` mais que le linter
   est buggué, le test d'intégration core-only échoue à compile time
   (non, en fait il continuerait à compiler — mais il documenterait
   la frontière). En réalité le test-témoin sert surtout à montrer
   "voici comment le cœur s'utilise sans CLI/UI" — c'est de la doc
   exécutable.
4. **Doc-package** comme première ligne de défense : un dev qui ouvre
   `internal/workflow/story.go` voit immédiatement *"this package is
   the business core, do not import CLI/UI"*. Empêche 80 % des leaks
   par construction.
5. **Pas d'interface `Service` unifiée** : chaque opération SPDD aura
   sa propre `RunX` fonction. L'unification émergera de CORE-003a-f
   quand on aura 5+ opérations, pas avant.
6. **MCP est hors scope** : la story ne livre que la *préparation*.
   `INT-002` (à créer en TODO via AC5) portera la livraison MCP
   effective.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/workflow` | faible | doc-package étoffé (1ère phrase + invariants liste) |
| `internal/provider` | faible | idem |
| `internal/templates` | faible | idem |
| `internal/artifacts` | faible | idem |
| `tests/integration` | moyen | nouveau fichier `core_isolation_test.go` (~80 lignes) |
| `scripts/dev` | moyen | nouveau script `check-core-isolation.sh` (~30 lignes) |
| `.github/workflows/ci.yml` | faible | un step ajouté dans `static-checks` qui invoque le script |
| `DEVELOPMENT.md` | faible | nouvelle section *Architecture* avec schéma ASCII |
| `TODO.md` | faible | ajout ligne `INT-002` + note swap d'ID |
| `internal/uiapp`, `cmd/yukki` racine, `frontend/`, `internal/clilog` | nul | aucun changement |

## Dépendances et intégrations

- **Aucune nouvelle dépendance Go** ajoutée. Le linter est shell pur,
  le test utilise stdlib + packages cœur.
- **Outils utilisés** :
  - `go list -f '{{.Imports}}' ./internal/<pkg>` (stdlib Go) pour
    énumérer les imports d'un package
  - Alternative : `grep -E '^\s*"' fichier.go` sur les blocs import
- **Conventions externes** :
  - Modèle de check CI inspiré de l'existant `gofmt -l .` step de
    [.github/workflows/ci.yml:27-35](../../.github/workflows/ci.yml#L27-L35)
  - Pattern de "core test" inspiré de
    [tests/integration/story_integration_test.go](../../tests/integration/story_integration_test.go)
    (déjà core-only à 99 % — la nouvelle version sera juste plus
    explicite sur l'absence d'import UI/CLI)

## Risques et points d'attention

- **Linter false positive** *(prob. moyenne, impact faible)*. Si un
  fichier `_test.go` du cœur importe par erreur cobra (ex. pour tester
  l'intégration via stub), le linter doit le détecter mais aussi
  permettre une exception documentée (e.g. un fichier
  `tests_use_cobra.go` autorisé).
  **Mitigation** : exclure `*_test.go` de l'audit par défaut (cohérent
  avec l'idée que les tests du cœur peuvent dépendre d'aux outils de
  setup).
- **Linter false negative** *(prob. faible, impact moyen)*. Un import
  indirect (e.g. via réflexion ou via un package transitif qui importe
  cobra) ne sera pas détecté.
  **Mitigation** : `go list -f '{{.Deps}}'` permet d'inspecter les
  dépendances transitives — à considérer en v2 du linter si le faux
  négatif se matérialise. V1 = imports directs uniquement.
- **`internal/uiapp` dépend du cœur** *(par design)*. uiapp importe
  `internal/provider`. C'est la direction correcte (UI → core), pas
  un leak. Le linter doit auditer **uniquement** le cœur (4 packages
  cibles), pas uiapp.
- **`clilog` est dans le cœur ou en dehors ?** Décision : **en dehors**.
  `clilog` est un utility partagé (loggers slog) consommé par CLI/UI/MCP.
  Il n'a rien à voir avec la logique métier SPDD. Pas dans la liste
  des 4 packages auditées. À documenter dans la doc-package.
- **Régression silencieuse via `go.mod` indirect** *(prob. faible,
  impact moyen)*. Si quelqu'un ajoute une lib qui dépend de cobra en
  transitif, et le cœur importe cette lib, on aurait un leak indirect.
  **Mitigation** : v1 ne couvre pas. Surveillance manuelle des PRs.
  v2 du linter si problème.
- **Coût de maintenance du linter** *(prob. faible, impact faible)*.
  Un script shell de 30 lignes peut bit-rot.
  **Mitigation** : tests unitaires du script (un `bats` minimal ou
  juste un test Go qui exec le script et check exit code).
- **Désalignement entre la doc-package et la réalité** *(prob.
  moyenne sur le long terme, impact moyen)*. Si on ajoute un nouveau
  package sous `internal/` (e.g. `internal/api`), il faut mettre à
  jour le linter ET la doc-package.
  **Mitigation** : documenter dans le script lui-même (commentaire
  de tête) la liste des packages "cœur" et inviter à mettre à jour
  quand un nouveau package métier apparaît.

## Cas limites identifiés

- Test d'intégration core-only qui *par accident* importe un package
  CLI/UI via une dépendance transitive (e.g. import de `tests/integration`
  qui réfère à `tests/e2e` qui réfère à `cmd/`).
  **Solution** : revue stricte des imports dans le test-témoin.
- Linter qui passe localement mais échoue en CI (différence de chemin
  Windows/Linux dans les paths grep). **Solution** : le script utilise
  `bash` (cohérent avec les wrappers existants) + `shell: bash` dans
  le step CI (cohérent avec CORE-001).
- Doc-package qui mentionne *"callable from CLI/UI/MCP"* avant que MCP
  existe. **Décision** : on l'écrit *"and (future) MCP server"* — c'est
  honnête et anticipe sans mentir.
- Un package du cœur qui décide légitimement d'utiliser `os.Stderr`
  pour un message d'erreur fatale (e.g. lors d'un panic recovery).
  **Décision** : interdit. Le cœur retourne des erreurs via valeurs
  Go ; c'est l'appelant (CLI/UI/MCP) qui décide d'écrire sur stderr.
- Migration future des packages vers `pkg/` (publication lib publique).
  **Décision** : hors scope. Si on bouge, le linter suit (ajustement
  des paths).
- Nouveau type de provider (e.g. `INT-001 Copilot CLI`) qui n'existe
  pas encore. **Solution** : la story ne touche pas l'interface
  `Provider`. INT-001 ajoutera juste un `provider.NewCopilot(logger)`
  sibling de `NewClaude`.

## Décisions tranchées (revue 2026-05-01)

Les 11 décisions ont été tranchées en revue interactive. Recap :

- [x] **D1 — Forme du linter** : **`golangci-lint` + linter `depguard`**.
  Préparation OSS (DOC-001 attendra de toute façon golangci-lint),
  bonus 30+ linters (govet, errcheck, staticcheck, gosec, misspell, …).
  Step CI ajouté à `static-checks` via
  `golangci/golangci-lint-action@v7`. Aucun script shell maison.
- [x] **D2 — Forme de la règle** : **allow-list strict**
  (`list-mode: strict`). On déclare ce que les 4 packages cœur
  ont le droit d'importer : `$gostd` (stdlib), `gopkg.in/yaml.v3`,
  les 4 packages cœur eux-mêmes (intra-cœur autorisé). Tout le
  reste — y compris cobra/wails/uiapp/frontend implicitement —
  est dénié.
- [x] **D3 — Packages auditées** : **`internal/workflow`,
  `internal/provider`, `internal/templates`, `internal/artifacts`**.
  Le filtre `files:` de la règle depguard cible ces 4 packages.
  `internal/clilog` (utility logging) et `internal/uiapp` (consommateur)
  exclus.
- [x] **D4 — Exclusion `*_test.go`** : **oui**. Les tests peuvent
  légitimement importer `os`, `fmt`, `io` pour des stubs (cf.
  `internal/provider/claude_test.go` qui build un faux binaire claude).
  La règle depguard cible les imports de production uniquement.
- [x] **D5 — Forme du test-témoin** : **annotation seule**, pas de
  nouveau fichier. `tests/integration/story_integration_test.go`
  existant gagne un commentaire de tête explicitant son rôle de
  *living example* d'usage isolé du cœur. depguard fournit la
  garantie statique ; le test sert de documentation exécutable.
- [x] **D6 — Doc-package : ton et structure** : **1ʳᵉ phrase canonique**
  *"Package X is part of yukki's business core: callable from the CLI
  (root cmd), the Wails UI (internal/uiapp), and the (future) MCP
  server (INT-002). It must not import cobra, wails, or any
  UI-specific package."* + bullets d'invariants par package
  (≥ 1 invariant par package).
- [x] **D7 — Schéma DEVELOPMENT.md** : **nouvelle section
  `## Architecture`** placée après `## Stack`, avant `## Build`.
  Schéma ASCII (3 surfaces CLI/UI/MCP au-dessus du cœur unique) +
  3 lignes de prose + lien vers `.golangci.yml`.
- [x] **D8 — `INT-002` placement** : **section "Post-MVP"** à côté
  d'`INT-001 — Provider Copilot CLI`. SDK retenu :
  `github.com/modelcontextprotocol/go-sdk`. Sous-cmd `yukki mcp` en
  stdio. Dépend explicitement de CORE-002. Clients cibles 2026 :
  Claude Desktop, Cursor, Continue, OpenCode, Zed, Cody.
- [x] **D9 — Note swap d'ID** : **pas d'entrée historique TODO.md**.
  Les commits git + body des stories tracent suffisamment. TODO.md
  reste tactique. *(Mise à jour du TODO appliquée commit `22bfc6f`.)*
- [x] **D10 — Ordre Operations** : **amont → aval**. O1
  doc-package × 4 → O2 `.golangci.yml` config → O3 step CI
  golangci-lint → O4 annotation `story_integration_test.go` → O5
  schéma DEVELOPMENT.md → O6 entrée TODO INT-002 (déjà appliquée).
  Permet de découper le commit en 6 commits atomiques au moment du
  `/spdd-generate` si voulu.
- [x] **D11 — Imports transitifs** : **non vérifiés en v1**.
  L'allow-list strict (D2=C) limite tellement les directs que le
  risque transitif est quasi-nul. Reconsidérer en v2 si un leak
  émerge en pratique.

## Approche stratégique (mise à jour post-revue)

1. **`golangci-lint` adopté en bonus de l'isolation** : la story livre
   un `.golangci.yml` avec **uniquement** la règle `depguard` configurée
   pour CORE-002. Les 30+ autres linters (govet, errcheck, staticcheck,
   gosec, misspell, …) restent **désactivés par défaut** dans cette
   story pour ne pas bruiter le scope. DOC-001 pourra activer plus
   tard les linters complémentaires.
2. **`list-mode: strict`** maximise la rigueur : impossible d'oublier
   un import indésirable. Trade-off : maintenance — chaque ajout de
   dep légitime (e.g. un futur `golang.org/x/term` côté cœur, peu
   probable) demande une mise à jour de la allow-list.
3. **Pas de refactor structurel** : le cœur est déjà isolé. La story
   *formalise* avec depguard + doc + schéma. Aucune signature publique
   modifiée. Aucun fichier déplacé.
4. **6 Operations atomiques** (D10) ordonnées amont → aval, chacune
   livrable indépendamment.

## Modules impactés (mise à jour D1, D5, D7)

| Module | Impact | Nature |
|---|---|---|
| `internal/workflow` | faible | doc-package étoffé (1ère phrase canonique + invariants) |
| `internal/provider` | faible | idem |
| `internal/templates` | faible | idem |
| `internal/artifacts` | faible | idem |
| `.golangci.yml` (racine) | **nouveau** | configuration du linter `depguard` (allow-list strict, 4 fichiers cibles) |
| `.github/workflows/ci.yml` | faible | nouveau step `golangci-lint` ajouté à `static-checks` via `golangci/golangci-lint-action@v7` |
| `tests/integration/story_integration_test.go` | faible | header de commentaire ajouté (rôle de *living example* isolé) |
| `DEVELOPMENT.md` | faible | nouvelle section `## Architecture` (schéma ASCII + 3 lignes prose) |
| `TODO.md` | faible | ✅ déjà mis à jour (CORE-002↔003 swap + INT-002 post-MVP) — commit `22bfc6f` |
| `internal/uiapp`, racine package main, `frontend/`, `internal/clilog` | nul | aucun changement |
