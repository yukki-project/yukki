---
id: CORE-004
slug: list-and-parse-artifacts
title: Listing & parsing des artefacts SPDD dans le cœur métier (Go-only, multi-consumer)
status: synced
created: 2026-05-01
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - internal/artifacts
  - tests/integration
consumed-by:
  - UI-001b-hub-viewer-claude-banner
  - INT-002-mcp-server (futur)
  - CORE-005-yukki-list (futur, si jugée pertinente)
---

# Listing & parsing des artefacts SPDD dans le cœur métier (Go-only)

## Background

`internal/artifacts` (CORE-001) sait **écrire** des artefacts SPDD :
`Writer.Write` (atomic rename), `NextID`, `Slugify`,
`ValidateFrontmatter`. Il ne sait pas **lire / lister** : aucune
fonction n'énumère `<projet>/spdd/<kind>/*.md` ni n'extrait les
métadonnées du frontmatter (`id`, `title`, `status`, `updated`) pour
en faire une liste typée consommable par une UI ou un agent.

UI-001b (Hub viewer) avait initialement embarqué cette logique Go
dans son scope, mélangeant *cœur métier* et *consumer Wails/React*.
**Anti-pattern SPDD** : la fonction est multi-consumer par nature
(future CLI `yukki list <kind>`, hub UI Wails, futur tool MCP
`yukki.list_stories` côté INT-002), donc elle mérite sa propre story
Go-only — comme CORE-002 a posé l'isolation que INT-002 consommera.

CORE-004 livre **uniquement la couche Go** (`ListArtifacts`,
`ParseFrontmatter[T]`, tests, doc-package étoffé). UI-001b est
réduite à la part Wails/React qui consomme ce nouveau cœur.

> **Cette story ne touche ni Wails ni React.** Elle livre une fonction
> Go pure dans `internal/artifacts`, plus ses tests unitaires, plus
> les invariants documentés. UI-001b importera et exposera via
> `App.ListStories(...)`. INT-002 (post-MVP) exposera via tool MCP.

## Business Value

- **Réutilisation par 3 surfaces minimum** : UI hub (UI-001b), futur
  serveur MCP (INT-002), éventuelle future cmd CLI `yukki list`.
  Une seule implémentation, testée une seule fois.
- **Cohérence avec le pattern CORE-002** : on continue d'isoler la
  logique métier dans `internal/<pkg>` avant que les consumers
  arrivent. Le cœur reste consommable depuis CLI / UI / MCP sans
  refactor.
- **Testabilité Go pure** : pas de Wails à mocker, pas de React à
  rendre, juste `t.TempDir()` + écriture de fichiers fixtures + assert
  sur la `[]Meta` retournée.
- **Découplage du calendrier** : UI-001b peut être livrée
  indépendamment, après CORE-004. Si l'UI prend du retard, CORE-004
  bénéficie déjà à un éventuel `yukki list` CLI livré en parallèle.
- **Préparation MCP** : `yukki.list_stories` est un des premiers tools
  MCP qu'on exposera. Avoir la fonction Go prête réduit INT-002 à du
  pur wiring JSON-RPC.

## Scope In

- **`internal/artifacts.ListArtifacts(dir, kind string) ([]Meta, error)`**
  - Scanne `<dir>/spdd/<kind>/*.md` (où `kind` ∈ {`stories`,
    `analysis`, `prompts`, `tests`} — validé par fonction)
  - Pour chaque `.md`, lit le contenu + extrait le frontmatter via
    `ParseFrontmatter`
  - Retourne `[]Meta` triée (probablement par `updated` desc, à
    confirmer en analyse)
  - Comportement sur fichier malformé : inclure dans la liste avec un
    `Error` non-nil sur le `Meta` (cohérent avec UI-001b AC5
    "frontmatter corrompu = ligne flaggée, pas crash")
- **`internal/artifacts.ParseFrontmatter[T any](content string) (T, error)`**
  - Helper générique : décode le bloc `---\n...\n---\n` en début de
    fichier vers `T` via `gopkg.in/yaml.v3`
  - Réutilise `ValidateFrontmatter` existant pour la délimitation
  - Retourne `T` zéro + erreur si frontmatter absent/malformé
- **`internal/artifacts.Meta` struct exportée** :
  ```go
  type Meta struct {
      ID      string
      Slug    string
      Title   string
      Status  string
      Updated string
      Path    string  // chemin absolu du fichier
      Error   error   // non-nil si le frontmatter est corrompu
  }
  ```
- **Tests unit** dans `internal/artifacts/lister_test.go` (nouveau
  fichier) couvrant :
  - Cas nominal : 3 fichiers valides, retour trié, longueur correcte
  - Frontmatter manquant : ligne incluse avec `Error` non-nil
  - YAML corrompu : idem
  - Dossier inexistant : erreur globale (pas un zero-meta)
  - Dossier vide : `[]Meta{}` (pas une erreur)
  - Dossier avec sous-dossiers / fichiers non-`.md` : ignorés
  silencieusement
- **Tests unit** sur `ParseFrontmatter[T]` :
  - Type concret valide (e.g. struct avec champ `ID string`)
  - Champs manquants (zero value attendu)
  - Champs supplémentaires (ignorés silencieusement par yaml.v3)
- **Doc-package mis à jour** : `internal/artifacts/doc.go` ajoute un
  invariant sur `ListArtifacts` (e.g. *"ListArtifacts is read-only and
  does not modify any file"*)
- **Annotation** dans `tests/integration/story_integration_test.go`
  pour démontrer un usage isolé : un test optionnel qui appelle
  `ListArtifacts` après `RunStory` et vérifie que la story produite
  apparaît dans la liste (déjà living example d'isolation cœur).

## Scope Out

- **Wails bindings** (`App.ListStories`, `App.ListAnalyses`, etc.)
  → c'est UI-001b. CORE-004 ne touche **pas** à `internal/uiapp`.
- **Composants React** (`<HubList>`, `<StoryViewer>`, etc.)
  → UI-001b.
- **Sous-cmd CLI `yukki list`** → potentielle future story `CORE-005`,
  pas dans le scope CORE-004.
- **Tool MCP `yukki.list_stories`** → INT-002 (post-MVP).
- **Édition / mutation des artefacts** → reste hors-scope (Writer
  existant suffit pour l'écriture).
- **Filtrage avancé** (par status, par owner, par date) → première
  itération retourne tout, le filtrage se fait côté consumer (UI ou
  CLI). Si une analyse révèle un besoin de filtrage côté core (e.g.
  pour perf sur 1000+ artefacts), on ouvrira une story dédiée.
- **File watcher / fsnotify** → différé à UI-005 (cf. backlog).
- **Pagination** → pas en V1, à reconsidérer si projets dépassent
  500 artefacts (rare).
- **Cache en mémoire** → pas en V1, chaque appel re-scanne. À mesurer
  si perf devient un problème.

## Acceptance Criteria

> Format Given / When / Then. Tous testables en unit pur, sans
> Wails ni React.

### AC1 — Listing nominal d'un dossier `.yukki/stories/`

- **Given** un dossier `<dir>/.yukki/stories/` contenant 3 fichiers
  `*.md` valides avec frontmatter complet
- **When** `ListArtifacts(dir, "stories")` est appelé
- **Then** le retour est `[]Meta{}` de longueur 3, chaque entrée a
  `ID`, `Slug`, `Title`, `Status`, `Updated`, `Path` non-vides, et
  `Error == nil` partout. La liste est triée (ordre à valider en
  analyse).

### AC2 — Frontmatter corrompu n'arrête pas le scan

- **Given** un dossier contenant 2 fichiers valides + 1 fichier
  `BROKEN-001.md` avec frontmatter YAML invalide
- **When** `ListArtifacts(dir, "stories")` est appelé
- **Then** le retour est `[]Meta{}` de longueur 3, l'entrée
  correspondant à `BROKEN-001.md` a `Error != nil` (avec un message
  descriptif), les 2 entrées valides ont `Error == nil`. Aucune
  erreur globale n'est retournée.

### AC3 — Dossier inexistant retourne une erreur

- **Given** un dossier qui n'existe pas
- **When** `ListArtifacts(dir, "stories")` est appelé
- **Then** la fonction retourne `nil, err` avec une erreur
  descriptive (probablement wrappant `os.ErrNotExist`).

### AC4 — Dossier vide retourne une slice vide

- **Given** un dossier qui existe mais est vide (ou ne contient que
  des fichiers non-`.md`)
- **When** `ListArtifacts(dir, "stories")` est appelé
- **Then** le retour est `[]Meta{}` (slice vide, pas nil),
  `error == nil`.

### AC5 — `ParseFrontmatter[T]` extrait les champs typés

- **Given** un contenu markdown avec frontmatter YAML
  `---\nid: CORE-001\ntitle: Hello\n---\n# Body`
- **When** `ParseFrontmatter[struct{ ID string; Title string }](content)`
  est appelé
- **Then** retourne `{ID: "CORE-001", Title: "Hello"}, nil`.

### AC6 — `kind` invalide rejeté en amont

- **Given** un appel `ListArtifacts(dir, "invalid-kind")`
- **When** le `kind` n'est pas dans la whitelist (`stories`,
  `analysis`, `prompts`, `tests`)
- **Then** retourne `nil, err` avec un message
  *"invalid kind: <name> (allowed: stories, analysis, prompts, tests)"*.

### AC7 — Aucune régression sur `ValidateFrontmatter` ni `Writer.Write`

- **Given** la PR CORE-004 est mergée
- **When** la CI lance `go test ./internal/artifacts/...`
- **Then** tous les tests CORE-001 (`TestValidateFrontmatter_*`,
  `TestWriter_*`, `TestNextID_*`, `TestSlugify_*`) passent inchangés.
  Aucune signature publique préexistante n'est modifiée.

## Open Questions

- [ ] **OQ1 — Ordre de tri par défaut** : par `updated` desc (récent
  d'abord) ou par `id` lexico ? *Reco : `updated` desc — la consommation
  UI montre le plus récent en haut. Si pas de `updated`, fallback sur
  `id` lexico.*
- [ ] **OQ2 — Localisation du frontmatter parser** : étendre
  `ValidateFrontmatter` ou créer `ParseFrontmatter[T]` à côté ?
  *Reco : nouveau fichier `internal/artifacts/parser.go` avec
  `ParseFrontmatter[T]` ; `ValidateFrontmatter` existant **utilise**
  `ParseFrontmatter[map[string]any]` puis check non-empty. Refactor
  léger.*
- [ ] **OQ3 — Champ `Error` ou retour séparé ?**
  - A : `Meta.Error` interne (proposé)
  - B : `ListArtifacts(...) ([]Meta, []error, error)` avec slice
    d'erreurs partielles
  - C : `[]Result` où `Result` = `Meta | error` (sum type via
    interface)
  *Reco : A. Plus simple à consommer côté UI/CLI/MCP, pas besoin de
  zip 2 slices.*
- [ ] **OQ4 — Path absolu ou relatif dans `Meta.Path`** ?
  *Reco : absolu. Le consumer peut toujours `filepath.Rel` si
  besoin.*
- [ ] **OQ5 — Fonction `ListAllArtifacts(dir) map[string][]Meta`** qui
  scanne les 4 kinds en une fois ? Pratique pour le hub UI qui
  charge tout d'un coup.
  *Reco : pas en V1. Le consumer peut faire 4 appels parallèles. À
  reconsidérer si profilage révèle un goulot.*
- [ ] **OQ6 — Filtre `*_test.go` ou `*.draft.md`** sur le scan ?
  *Reco : pour V1, on scanne tout `*.md`. La convention SPDD ne
  prévoit pas de fichiers `_test` dans `spdd/`. Si un jour on en a,
  on filtrera.*

## Notes

- **Type de story** : *refactor architectural + ajout API Go*. Pas de
  feature utilisateur visible — préparation des consumers.
- **Filiation** :
  - **Bloque** : `UI-001b` (consume `ListArtifacts`), futur
    `INT-002` (consume), futur `CORE-005 yukki list` (consume si
    créé)
  - **Co-livré avec** : modification de `UI-001b` story pour réduire
    son scope (commit dans la même PR)
- **Précédent** : suit le pattern `CORE-002` (préparation MCP) ou
  `CORE-001` (cœur métier livré avant les consumers).
- **Estimation** : ~0.5-1j (≈ 80 lignes de Go en `lister.go` +
  `parser.go` + 100 lignes de tests + ajustement doc-package).
- **Lien futur** :
  - Analyse à venir : `.yukki/analysis/CORE-004-list-and-parse-artifacts.md`
  - Canvas REASONS : `.yukki/prompts/CORE-004-list-and-parse-artifacts.md`
  - UI-001b modifiée pour `depends-on: CORE-004`
