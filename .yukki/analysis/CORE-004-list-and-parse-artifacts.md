---
id: CORE-004
slug: list-and-parse-artifacts
story: .yukki/stories/CORE-004-list-and-parse-artifacts.md
status: synced
created: 2026-05-01
updated: 2026-05-08
---

# Analyse — Listing & parsing des artefacts SPDD dans le cœur métier

> Contexte stratégique pour `CORE-004-list-and-parse-artifacts`. Issue
> d'un audit ciblé de [internal/artifacts](../../internal/artifacts/)
> et de la dépendance `gopkg.in/yaml.v3` déjà présente
> (cf. [go.mod](../../go.mod)).

## Mots-clés métier extraits

`ListArtifacts`, `ParseFrontmatter`, `Meta`, `frontmatter`, `kind`,
`ValidateFrontmatter`, `Writer`, `multi-consumer`.

## Concepts de domaine

### Existants — surface actuelle de `internal/artifacts`

| Symbole | Fichier | Signature | Rôle |
|---|---|---|---|
| `ValidatePrefix` | id.go:30 | `(prefix string, strict bool) error` | Valide la chaîne de prefix d'ID (`STORY`, `EXT`, etc.) |
| `NextID` | id.go:53 | `(storiesDir, prefix string) (string, error)` | Calcule le prochain id séquentiel pour un prefix donné en scannant le dossier |
| `AllowedPrefixesString` | id.go:97 | `() string` | Liste les préfixes autorisés (informational) |
| `Slugify` | slug.go:11 | `(title string) string` | Génère un slug kebab-case ASCII-fold |
| `NewWriter` | writer.go:23 | `(storiesDir string) *Writer` | Construit le writer atomic-rename |
| `Writer.Write` | writer.go:30 | `(id, slug, content string) (string, error)` | Écrit un artefact via temp+rename, valide le frontmatter avant rename |
| `ValidateFrontmatter` | writer.go:60 | `(content string) error` | Vérifie présence des délimiteurs `---` et que le YAML parse en non-vide map |
| `ErrInvalidFrontmatter` | writer.go:15 | `error` (sentinel) | Erreur retournée par `ValidateFrontmatter` |
| `ErrInvalidPrefix` | id.go:14 | `error` (sentinel) | Erreur retournée par `ValidatePrefix` |
| `Meta` (struct) | — | n/a | **N'EXISTE PAS** ; à introduire |

**Pattern existant à respecter** :
- Tous les helpers retournent `(value, error)` Go-idiomatique
- Les erreurs sont wrappées avec `%w` autour de sentinels (`ErrInvalidFrontmatter`)
- Les fonctions sont **stateless** ; `Writer` est la seule struct, ne porte que `StoriesDir`
- Le package n'importe que `errors`, `fmt`, `os`, `path/filepath`, `strings`, `gopkg.in/yaml.v3` — aucune dep CLI/UI
- Tests : 1 fichier de tests par fichier source (`writer_test.go`, `id_test.go`, `slug_test.go`)
- Concurrence testée pour `Writer` (`writer_concurrent_test.go`)

**Logique de parsing YAML déjà présente** dans `ValidateFrontmatter` (writer.go:60-79) :
```go
const delim = "---\n"
if !strings.HasPrefix(content, delim) { ... }
rest := content[len(delim):]
end := strings.Index(rest, "\n"+delim[:len(delim)-1])
if end < 0 { ... }
yamlSrc := rest[:end]
var m map[string]any
if err := yaml.Unmarshal([]byte(yamlSrc), &m); err != nil { ... }
if len(m) == 0 { ... }
```

→ **Cible naturelle pour le refactor `ParseFrontmatter[T]`** : extraire les 3 étapes (délimiteur leading / trailing / yaml.Unmarshal) dans la nouvelle fonction générique, et faire de `ValidateFrontmatter` un consumer (`ParseFrontmatter[map[string]any]` + check non-empty).

### Nouveaux à introduire

- **`Meta` struct exportée** :
  - Champs : `ID`, `Slug`, `Title`, `Status`, `Updated` (string), `Path` (absolu),
    `Error` (nil si valide, sinon erreur descriptive sur le fichier seul)
  - **Stable contract** : la forme de `Meta` est une API publique du package. Toute évolution (ex. ajout `Owner`, `Modules`) requiert un canvas-update.
- **`ListArtifacts(dir, kind string) ([]Meta, error)`** :
  - Valide `kind` contre une whitelist {`stories`, `analysis`, `prompts`, `tests`}
  - Construit le path `filepath.Join(dir, "spdd", kind)`
  - Vérifie que le path existe (sinon erreur globale)
  - `os.ReadDir` puis filtre `.md` (extension exact, case-insensitive)
  - Pour chaque `.md` : `os.ReadFile`, `ParseFrontmatter[Meta-shape]`, construit `Meta`
  - Sur frontmatter corrompu : `Meta{Path: ..., Error: err}` ajouté à la liste, scan continue
  - Tri final par `updated` desc avec fallback `id` lexico (cf. OQ1)
  - Retour : `[]Meta` (peut être vide, jamais nil) + erreur globale (nil si scan OK)
- **`ParseFrontmatter[T any](content string) (T, error)`** :
  - Extrait les délimiteurs `---\n...\n---\n`
  - `yaml.Unmarshal([]byte(yamlSrc), &out)` où `out *T`
  - Retourne `out, nil` ou zero(T) + erreur wrappant `ErrInvalidFrontmatter`
- **`ValidateFrontmatter` refactorée** :
  - Devient `ValidateFrontmatter(content string) error { _, err := ParseFrontmatter[map[string]any](content); ... check len > 0 ... }`
  - **Signature publique inchangée** — Invariant CORE-002 préservé.
- **Whitelist `kind`** : constante package
  ```go
  var allowedKinds = []string{"stories", "analysis", "prompts", "tests"}
  ```
  Ou export `AllowedKinds() []string` si besoin externe (consumer veut afficher les choix).
- **Sentinel `ErrInvalidKind`** : nouvelle erreur, sœur de
  `ErrInvalidFrontmatter` / `ErrInvalidPrefix`.
- **Fichiers nouveaux** :
  - `internal/artifacts/lister.go` — `Meta`, `ListArtifacts`, `ErrInvalidKind`
  - `internal/artifacts/parser.go` — `ParseFrontmatter[T]`, refactor de
    `ValidateFrontmatter` (déplacée de writer.go ? ou reste mais wrappe parser ?)
  - `internal/artifacts/lister_test.go` — tests `ListArtifacts`
  - `internal/artifacts/parser_test.go` — tests `ParseFrontmatter[T]`

## Approche stratégique

1. **Pas de refactor structurel des packages** : tout reste dans
   `internal/artifacts`. La depguard allow-list de CORE-002 autorise
   déjà l'auto-référence intra-cœur, donc aucun changement
   `.golangci.yml`.
2. **Refactor léger sans changement de contrat** : `ValidateFrontmatter`
   garde sa signature et son comportement publique observable (mêmes
   sentinels, mêmes messages d'erreur). En interne, elle délègue à
   `ParseFrontmatter[map[string]any]`. **Aucune ligne de test
   `writer_test.go` n'est à modifier.** Vérifié par non-régression.
3. **Generics Go 1.22+** acquis : la story CORE-001 a déjà figé
   `go 1.22` dans `go.mod`, les generics sont OK.
4. **`Meta` minimaliste** en V1 (6 champs + `Error`). On ajoute les
   métadonnées au fil du besoin (UI-001b verra peut-être qu'il
   manque `Owner` ou `Modules` — on étendra alors via un canvas-update).
5. **Whitelist `kind` strict** (`stories`, `analysis`, `prompts`,
   `tests`) — pas de wildcard. Si on ajoute un kind plus tard
   (e.g. `methodology`), on update la whitelist.
6. **Pas de cache mémoire en V1** : chaque appel re-scanne. Le coût
   est négligeable jusqu'à ~500 artefacts. On mesurera si UI-001b
   ressent une lag.
7. **Tri par `updated` desc** par défaut, fallback `id` lexico
   (cf. OQ1 reco). Le tri se fait côté Go pour que les 3 consumers
   (UI / CLI / MCP) reçoivent toujours la même ordonnance.
8. **Test-témoin annoté en CORE-002** suffit pour démontrer l'usage
   isolé du cœur. La story CORE-004 ajoute juste ses propres tests
   unit dans `internal/artifacts/`.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/artifacts/lister.go` | **fort** | création — `Meta`, `ListArtifacts`, `ErrInvalidKind`, `AllowedKinds` |
| `internal/artifacts/parser.go` | **fort** | création — `ParseFrontmatter[T]` + (déplacement de la logique parse de writer.go vers ici) |
| `internal/artifacts/writer.go` | faible | `ValidateFrontmatter` refactorée pour appeler `ParseFrontmatter[map[string]any]` ; signature publique inchangée |
| `internal/artifacts/lister_test.go` | **fort** | création — 7+ cas de test |
| `internal/artifacts/parser_test.go` | **fort** | création — 4-5 cas de test |
| `internal/artifacts/writer_test.go` | nul | aucun changement attendu (non-régression sur la signature et le comportement) |
| `internal/artifacts/doc.go` | faible | ajout d'un invariant doc-package mentionnant `ListArtifacts is read-only` |
| `tests/integration/story_integration_test.go` | nul | optionnel : pourrait gagner un sous-test qui exerce `ListArtifacts` après `RunStory`. À trancher (cf. OQ4) |
| `go.mod` / `go.sum` | nul | aucune nouvelle dep (yaml.v3 déjà là) |
| `.golangci.yml` | nul | aucun changement (allow-list intra-cœur déjà OK) |
| `.github/workflows/ci.yml` | nul | aucun nouveau step (les tests unit sont couverts par le job `unit-tests` existant) |

## Dépendances et intégrations

- **Aucune nouvelle dépendance Go** ajoutée. `gopkg.in/yaml.v3` déjà
  présente (CORE-001).
- **Aucune nouvelle dépendance CI/outillage**. Tests unit Go classiques.
- **Conventions externes** :
  - YAML 1.2 via `gopkg.in/yaml.v3`
  - Frontmatter pattern `---\n...\n---\n` (cohérent avec `ValidateFrontmatter`
    existant et le template `.yukki/templates/story.md`)
  - Path Go `filepath.Join` (cross-OS)
- **Compatibilité** : Go 1.22+ pour les generics. Déjà figé dans `go.mod`.

## Risques et points d'attention

- **R1 — Refactor de `ValidateFrontmatter` introduit une régression
  silencieuse** *(prob. faible, impact moyen)*. La nouvelle implémentation
  via `ParseFrontmatter[map[string]any]` doit retourner exactement les
  mêmes erreurs (mêmes sentinels, mêmes messages) que l'actuelle.
  **Mitigation** : aucun test `writer_test.go` n'est modifié ; ils
  passent inchangés = preuve de non-régression.
- **R2 — Tri instable sur `updated` égaux** *(prob. moyenne, impact
  faible)*. Si 2 artefacts ont le même `updated`, l'ordre dépend du
  fallback `id` lexico — qui doit être déterministe. **Mitigation** :
  test explicite avec 2 fichiers de même `updated`.
- **R3 — Frontmatter avec champs incompatibles** *(prob. moyenne,
  impact faible)*. Un frontmatter qui contient `id: 42` (number)
  échoue le decode vers `Meta{ID string}`. **Mitigation** : yaml.v3
  retourne une erreur claire ; `Meta.Error` est non-nil, l'entrée
  reste dans la liste avec le path. Documenté dans AC2.
- **R4 — Path absolu vs relatif** *(prob. moyenne, impact faible)*.
  `filepath.Abs(path)` peut échouer (rare). **Mitigation** : si
  abs échoue, fallback path relatif tel-quel + log debug. Documenté
  dans Meta.
- **R5 — Sous-dossier inattendu dans `spdd/<kind>/`** *(prob. faible,
  impact faible)*. E.g. un user crée `.yukki/stories/archive/` pour
  ranger des old. **Mitigation** : `os.ReadDir` retourne les
  entries ; on filtre sur `entry.Type().IsRegular()` pour ignorer
  dirs et symlinks.
- **R6 — Symlink résolution** *(prob. faible, impact moyen)*. Un
  fichier `.md` qui est un symlink vers ailleurs : on suit ou on
  ignore ? **Mitigation** : V1 ignore les symlinks (filtre
  `IsRegular()`). Si besoin réel émerge, on étendra.
- **R7 — Caractères non-ASCII dans les paths** *(prob. faible,
  impact faible)*. Tests sur des paths avec espaces ou accents.
  **Mitigation** : test explicite avec un dossier
  `t.TempDir()/Mon Project SPDD/.yukki/stories/`.
- **R8 — Évolution du contrat `Meta`** *(prob. moyenne sur le long
  terme, impact moyen)*. Ajouter un champ à `Meta` casserait les
  consumers qui font de la décomposition struct (rare en Go car les
  fields zero-value). **Mitigation** : `Meta` est une struct exportée,
  pas une interface — l'ajout de champ est rétrocompatible. La
  suppression non, mais on ne supprimera pas en V1.

## Cas limites identifiés

- **CL1** — Fichier `.MD` (uppercase extension) : à filter ou ignorer ?
  Reco : case-insensitive (`strings.EqualFold(filepath.Ext(name), ".md")`)
- **CL2** — Frontmatter sans champ `id` : `Meta.ID == ""`. Pas une
  erreur ; le consumer décide quoi en faire.
- **CL3** — Fichier `.md` vide : ParseFrontmatter retourne
  `ErrInvalidFrontmatter` (pas de delimiter), `Meta.Error` non-nil.
- **CL4** — Frontmatter qui occupe tout le fichier (pas de body
  markdown) : OK, `ParseFrontmatter` ne se soucie que du bloc YAML.
- **CL5** — Fichier sur un système avec EOL Windows (`\r\n`) au lieu
  de `\n` : le delimiter `---\n` ne match pas. **Important pour
  Windows.** Mitigation : normaliser EOL avant parse, ou supporter
  les deux.
- **CL6** — Très grand fichier (>10 MB) : `os.ReadFile` charge tout
  en mémoire. Acceptable pour les artefacts SPDD (typiquement < 50 KB).
- **CL7** — Permission refusée sur un fichier : `os.ReadFile`
  retourne `*PathError` ; on inclut l'entrée dans la liste avec
  `Error: err`.
- **CL8** — Race read/write : un autre process écrit pendant qu'on
  scanne. `os.ReadFile` peut retourner un fichier partiel. Rare en
  V1 (mono-utilisateur).
- **CL9** — Path UNC Windows (`\\server\share\...`) : `filepath.Join`
  + `os.ReadDir` doivent gérer. À tester si critique.
- **CL10** — Frontmatter avec multi-line strings (e.g. `description:
  | foo bar`) : yaml.v3 supporte. Pas un problème.

## Décisions tranchées (revue 2026-05-01)

Les 11 décisions ont été tranchées en revue interactive. Recap :

- [x] **D1 — Tri par défaut** : **`updated` desc + fallback `id` lexico**.
  Récent en haut (UX hub), déterministe sur les égalités.
- [x] **D2 — Localisation de la logique frontmatter** : **tout dans
  `parser.go`**. `ParseFrontmatter[T]` ET `ValidateFrontmatter` vivent
  dans le nouveau fichier `internal/artifacts/parser.go`.
  `writer.go` ne garde que `Writer` + son `Write`. Cohésion maximale,
  zéro dispersion. La fonction `ValidateFrontmatter` est physiquement
  déplacée mais sa signature publique reste **strictement identique**
  (Invariant CORE-002 I2 préservé).
- [x] **D3 — Erreurs partielles dans le scan** : **champ `Error error`
  dans `Meta`**. `ListArtifacts` retourne une `[]Meta` complète ;
  les entrées corrompues ont `Error != nil`. Consumer itère une
  seule fois. Cohérent avec UI-001b AC5 (badge "invalid" sur ligne
  corrompue).
- [x] **D4 — `Meta.Path`** : **absolu via `filepath.Abs`**.
  Fallback sur le path tel-quel si Abs échoue (rare). Consumer peut
  faire `filepath.Rel` si besoin de relatif.
- [x] **D5 — Filtre des entrées** : **`entry.Type().IsRegular()`**.
  Ignore silencieusement les sous-dossiers (`archive/`) et les
  symlinks. KISS V1, comportement attendu pour un listing à plat.
- [x] **D6 — EOL Windows** : **délimiteurs étendus**, pas de mutation
  du contenu. `ParseFrontmatter` accepte indifféremment `"---\n"` et
  `"---\r\n"` comme délimiteur leading et trailing. Plus chirurgical
  que le replace-all (préserve le contenu original pour éventuels
  futurs hash-based caches).
- [x] **D7 — Whitelist `kind`** : **fonction
  `AllowedKinds() []string`** exportée qui retourne une **copie**
  de la slice interne. Cohérent avec `AllowedPrefixesString()`
  existant. UI-001b construira sa sidebar via cet appel.
- [x] **D8 — Sous-test integration optionnel** : **non**. Tests unit
  `lister_test.go` + tests `story_integration_test.go` existants
  couvrent. Pas de redondance cross-feature.
- [x] **D9 — Sentinel `ErrInvalidKind`** : **oui exporté**, cohérent
  avec `ErrInvalidPrefix` (id.go) et `ErrInvalidFrontmatter`
  (writer.go/parser.go). Permet `errors.Is(err, ErrInvalidKind)`.
  Évolution future vers type `InvalidKindError` possible sans break.
- [x] **D10 — Doc-package** : **ajouter un invariant** dans
  `internal/artifacts/doc.go` (existant via CORE-002) :
  *"ListArtifacts is read-only and never modifies any file. A
  corrupted frontmatter never aborts the scan; the offending entry
  carries the error in Meta.Error."*
- [x] **D11 — Tests generics** : **table-driven sur 3 types
  concrets** instanciés explicitement : `map[string]any`, `Meta`,
  et `struct{ ID, Title string }` (struct minimal). Couvre champ
  manquant (zero value), type incompatible (erreur YAML), champs
  supplémentaires (ignorés silencieusement), frontmatter manquant.

## Approche stratégique (mise à jour post-revue)

Trois ajustements vs version pré-revue :

1. **D2** : `ValidateFrontmatter` migre physiquement vers `parser.go`
   (était : reste dans writer.go avec wrapper). Plus propre, pas de
   dispersion frontmatter logic across deux fichiers. Signature
   publique strictement inchangée — `writer_test.go` passe sans
   modification, garantie de non-régression.
2. **D6** : pas de mutation `\r\n → \n` du contenu (était reco initiale).
   À la place, le test des délimiteurs accepte les 2 formes en parallèle.
   Préserve le contenu original (utile si on ajoute un hash de
   contenu plus tard, ou pour la lisibilité d'un dump debug).
3. **D7** : `AllowedKinds()` (fonction) vs `AllowedKinds` (variable).
   Fonction retourne copie → impossibilité de muter accidentellement
   la liste depuis un consumer. Cohérent avec `AllowedPrefixesString()`.

## Modules impactés (mise à jour D2)

| Module | Impact | Nature |
|---|---|---|
| `internal/artifacts/lister.go` | **fort** | création — `Meta`, `ListArtifacts`, `ErrInvalidKind`, `AllowedKinds()` |
| `internal/artifacts/parser.go` | **fort** | création — `ParseFrontmatter[T]` **+ déménagement de `ValidateFrontmatter` depuis writer.go** |
| `internal/artifacts/writer.go` | faible | retrait de `ValidateFrontmatter` (déménagée) ; signature publique préservée car la fonction existe toujours dans le package, juste dans un autre fichier. `Writer.Write` continue de l'appeler en intra-package |
| `internal/artifacts/lister_test.go` | **fort** | création — 7+ cas de test |
| `internal/artifacts/parser_test.go` | **fort** | création — 4-5 cas de test, table-driven sur 3 types concrets |
| `internal/artifacts/writer_test.go` | nul | aucun changement (non-régression preuve du déménagement de `ValidateFrontmatter`) |
| `internal/artifacts/doc.go` | faible | ajout d'un invariant `ListArtifacts is read-only` |
| `tests/integration/story_integration_test.go` | nul | aucun changement (D8) |
| `go.mod`, `.golangci.yml`, `.github/workflows/ci.yml` | nul | aucun changement |
