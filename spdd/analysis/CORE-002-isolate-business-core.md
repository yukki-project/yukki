---
id: CORE-002
slug: isolate-business-core
story: spdd/stories/CORE-002-isolate-business-core.md
status: draft
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

## Décisions à prendre avant le canvas

> Recommandations en italique. À valider/contester en revue.

- [ ] **D1 — Forme du linter**.
  *(Reco : script shell `scripts/dev/check-core-isolation.sh`,
  invoqué depuis le step CI `static-checks`. Pure bash, pas de Go,
  pas de dépendances. ~30 lignes. Si trop fragile, v2 = test Go qui
  parse `go list -json` pour analyse plus robuste.)*
- [ ] **D2 — Liste précise des "imports interdits"**.
  *(Reco : v1 = `github.com/spf13/cobra`, `github.com/wailsapp/wails`,
  `github.com/yukki-project/yukki/internal/uiapp`,
  `github.com/yukki-project/yukki/frontend`. Strings exactes, pas
  de pattern fuzzy.)*
- [ ] **D3 — Liste précise des "packages du cœur" auditées**.
  *(Reco : `internal/workflow`, `internal/provider`,
  `internal/templates`, `internal/artifacts`. **Pas** `internal/clilog`
  ni `internal/uiapp`. Documenté dans le commentaire de tête du
  script.)*
- [ ] **D4 — Exclusion `*_test.go` de l'audit**.
  *(Reco : oui. Les tests peuvent légitimement importer `os`, `fmt`
  pour des stubs ou helpers. Le linter cible les imports de production
  uniquement.)*
- [ ] **D5 — Forme du test-témoin**.
  *(Reco : `tests/integration/core_isolation_test.go` à côté du
  `story_integration_test.go` existant. Pas un nouveau dossier.
  Pattern table-driven non requis ici, juste 1-2 cas qui exercent
  `RunStory` end-to-end avec MockProvider.)*
- [ ] **D6 — Doc-package : ton et structure**.
  *(Reco : 1ère phrase mentionne *"part of yukki's business core,
  callable from CLI, UI and (future) MCP server"* littéralement. Liste
  d'invariants en bullets dessous. Cohérent avec les conventions
  existantes des packages CORE-001.)*
- [ ] **D7 — Schéma DEVELOPMENT.md : où exactement ?**
  *(Reco : nouvelle section *## Architecture* après *## Stack*, avant
  *## Build*. Schéma ASCII identique à celui du Background de la story.)*
- [ ] **D8 — `INT-002` placement dans TODO.md**.
  *(Reco : section *"Post-MVP"* à côté d'`INT-001 — Copilot CLI`.
  Avec `depends-on: CORE-002` explicite. Pas dans *"En attente —
  features projet"* puisque pas une priorité immédiate — c'est la
  3ᵉ surface, après que la CLI et l'UI sont livrées.)*
- [ ] **D9 — Note de swap d'ID dans TODO.md historique**.
  *(Reco : ajouter une entrée dans *Historique de ce fichier* du
  TODO.md datée 2026-05-01 mentionnant l'inversion CORE-002 ↔
  CORE-003. Court, factuel.)*
- [ ] **D10 — Ordre des Operations dans le canvas**.
  *(Reco : O1 doc-package × 4, O2 script linter, O3 step CI, O4 test
  d'intégration core-only, O5 schéma DEVELOPMENT.md, O6 entrée TODO
  INT-002 + note swap. Ordre = de l'amont vers l'aval, ce qui
  permet de découper le commit en morceaux atomiques.)*
- [ ] **D11 — Coverage du test-témoin**.
  *(Reco : pas un cible chiffrée. Le test démontre la *capacité*
  d'usage isolé, pas un % de couverture. Les tests existants de
  CORE-001 fournissent déjà la couverture métier.)*
