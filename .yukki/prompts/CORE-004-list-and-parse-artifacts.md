---
id: CORE-004
slug: list-and-parse-artifacts
story: .yukki/stories/CORE-004-list-and-parse-artifacts.md
analysis: .yukki/analysis/CORE-004-list-and-parse-artifacts.md
status: synced
created: 2026-05-01
updated: 2026-05-01
---

# Canvas REASONS — Listing & parsing des artefacts SPDD dans le cœur métier

> Spec exécutable consommée par `/yukki-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.
>
> Story Go-only multi-consumer (UI-001b, futur INT-002 MCP, futur
> CLI `yukki list`). Aucun changement de comportement applicatif —
> ajout d'API publique au package `internal/artifacts`.
>
> ## Changelog
>
> - **v1 — 2026-05-01** : canvas initial (4 Operations, status `draft`).
> - **v2 — 2026-05-01** — `/yukki-generate` (commit `b5ac922`).
>   4 Operations livrées (parser.go, lister.go, tests, doc.go).
>   Status `draft → implemented`. 22 nouveaux tests passent ; aucun
>   test existant cassé (Invariant I7 préservé : signature publique
>   de `ValidateFrontmatter` strictement préservée au déménagement).
> - **v3 — 2026-05-01** — `/yukki-sync` (refactor seul, comportement
>   inchangé). 4 dérives mineures détectées et propagées dans
>   Operations :
>   1. **O1** : 2 helpers internes non-exportés ajoutés
>      (`matchLeadingDelim`, `indexClosingDelim`) qui factorisent la
>      détection LF/CRLF — implémentation pure, exprime en code la
>      détection décrite en prose dans le canvas v1.
>   2. **O2** : tags `yaml:"id"`, `yaml:"slug"`, etc. effectivement
>      apposés sur `Meta` (les Norms mentionnaient "optionnels" pour
>      kebab-case = lowercase ; appliqués pour clarté de contrat).
>   3. **O3** : +1 test bonus `TestAllowedKinds_ReturnsCopy` qui
>      valide explicitement l'invariant I6 (mutation de la slice
>      retournée n'affecte pas les appels suivants). +1 test
>      `TestListArtifacts_IgnoresNonMD` (filtre `.md` extension).
>   4. **O3** : `writer_test.go` ne retire pas simplement
>      `TestValidateFrontmatter` mais ajoute un commentaire de
>      redirection vers `parser_test.go` (meilleure DX pour les
>      futurs lecteurs qui chercheraient la fonction).
>   Sections **R/E/A/N/Safeguards intactes** (aucun changement
>   d'intention). Status `implemented → synced`.

---

## R — Requirements

### Problème

`internal/artifacts` (CORE-001) sait **écrire** des artefacts SPDD
mais n'a aucune fonction pour les **lire / lister / extraire le
frontmatter typé**. Un consumer qui veut afficher la liste des
stories d'un projet (UI-001b hub, futur `yukki list`, futur MCP tool
`yukki.list_stories`) doit aujourd'hui réinventer le scan + parse
YAML. CORE-004 livre une fois pour toutes la couche Go pure :
`ListArtifacts(dir, kind) []Meta` + `ParseFrontmatter[T any]`.

### Definition of Done

- [ ] `internal/artifacts/parser.go` (nouveau) contient
      `ParseFrontmatter[T any](content string) (T, error)` qui décode
      le bloc frontmatter YAML vers le type `T` paramétré
- [ ] `parser.go` accepte indifféremment `"---\n"` et `"---\r\n"`
      comme délimiteur leading et trailing (compat EOL Windows)
- [ ] `ValidateFrontmatter(content string) error` est **déménagée**
      de `writer.go` vers `parser.go` ; sa signature publique reste
      strictement identique ; elle devient un wrapper de
      `ParseFrontmatter[map[string]any]` + check non-empty map
- [ ] `internal/artifacts/lister.go` (nouveau) contient :
      - `Meta` struct exportée avec champs `ID`, `Slug`, `Title`,
        `Status`, `Updated`, `Path`, `Error`
      - `ListArtifacts(dir, kind string) ([]Meta, error)` qui scanne
        `<dir>/spdd/<kind>/*.md`, parse le frontmatter de chaque
        fichier régulier, retourne la liste typée
      - `AllowedKinds() []string` qui retourne une **copie** de la
        whitelist `{stories, analysis, prompts, tests}`
      - `ErrInvalidKind` sentinel exporté
- [ ] `ListArtifacts` retourne `[]Meta` triée par `Updated` desc avec
      fallback `ID` lexico ascendant pour les égalités
- [ ] `ListArtifacts` filtre `entry.Type().IsRegular()` (ignore
      sous-dossiers et symlinks)
- [ ] `ListArtifacts` continue le scan en cas de frontmatter corrompu
      sur un fichier individuel : l'entrée est incluse dans la liste
      avec `Meta.Error != nil`, le scan global ne fail pas
- [ ] `Meta.Path` est absolu via `filepath.Abs(path)` (fallback path
      tel-quel si `Abs` échoue)
- [ ] `ListArtifacts(dir, "invalid-kind")` retourne `nil, err` où
      `errors.Is(err, ErrInvalidKind) == true`
- [ ] `ListArtifacts` sur un dossier inexistant retourne `nil, err`
- [ ] `ListArtifacts` sur un dossier vide retourne `[]Meta{}` (slice
      vide, non-nil) avec `error == nil`
- [ ] `internal/artifacts/parser_test.go` (nouveau) : tests
      table-driven sur `ParseFrontmatter[T]` instancié avec 3 types
      concrets (`map[string]any`, `Meta`, `struct{ID,Title string}`)
- [ ] `internal/artifacts/lister_test.go` (nouveau) : 7+ cas
      (nominal, frontmatter corrompu, kind invalide, dossier
      inexistant, dossier vide, sous-dir ignoré, EOL Windows)
- [ ] `internal/artifacts/writer_test.go` **passe inchangé** (preuve
      de non-régression du déménagement de `ValidateFrontmatter`)
- [ ] `internal/artifacts/doc.go` gagne un invariant
      `"ListArtifacts is read-only and never modifies any file. A
      corrupted frontmatter never aborts the scan; the offending
      entry carries the error in Meta.Error."`
- [ ] Aucun test existant (CORE-001, UI-001a, CORE-002) ne casse
- [ ] Aucune nouvelle dépendance Go ajoutée (`yaml.v3` déjà présente)
- [ ] `golangci-lint` (depguard CORE-002) reste vert sur le cœur

---

## E — Entities

### Entités

| Nom | Description | Champs / Méthodes clés | Cycle de vie |
|---|---|---|---|
| `Meta` (struct exportée, nouvelle) | Représentation typée du frontmatter d'un artefact SPDD listé | `ID, Slug, Title, Status, Updated string`, `Path string` (absolu), `Error error` | construite à chaque scan, immutable après retour |
| `Kind` (string typé implicite) | L'une des 4 valeurs de la whitelist `stories`, `analysis`, `prompts`, `tests` | n/a | constante package |
| `Frontmatter` (concept, pas réifié comme struct dédiée) | Bloc YAML entre les délimiteurs `---\n...\n---\n` | n/a | parsé via `ParseFrontmatter[T]` |
| `ArtifactFile` (concept, pas réifié) | Un fichier `<dir>/spdd/<kind>/*.md` régulier | n/a | scanné par `os.ReadDir` |

### Value Objects

| Nom | Description | Type Go |
|---|---|---|
| `AbsolutePath` | Chemin absolu vers un artefact | `string` (résultat `filepath.Abs`) |
| `KindWhitelist` | La liste figée `{stories, analysis, prompts, tests}` | `[]string` interne, retournée par copie via `AllowedKinds()` |

### Invariants CORE-004

- **I1** — `ListArtifacts` est strictement read-only : aucun appel
  à `os.Create`, `os.Rename`, `os.Remove`, `os.WriteFile`, ou tout
  autre primitive de modification du filesystem.
- **I2** — Un frontmatter corrompu sur un fichier **n'abort pas** le
  scan global. L'entrée est conservée dans la liste avec
  `Meta.Error != nil`. Permet à un consumer (UI hub) d'afficher la
  ligne avec un badge "invalid".
- **I3** — `ParseFrontmatter[T]` accepte les 2 EOL (`"---\n"` et
  `"---\r\n"`) en délimiteur. Le contenu original n'est **pas muté**
  pendant le parse.
- **I4** — `Meta.Path` est toujours un chemin **absolu**, sauf
  fallback si `filepath.Abs` échoue (très rare). Documenté dans la
  doc-comment de la fonction.
- **I5** — Les sous-dossiers et symlinks dans `<dir>/spdd/<kind>/`
  sont **ignorés silencieusement**. Permet aux users de créer
  `.yukki/stories/archive/` sans pollution du listing.
- **I6** — `AllowedKinds()` retourne une **copie** ; toute mutation
  par un consumer n'affecte pas l'état interne du package.
- **I7** — `ValidateFrontmatter` (déménagée vers parser.go) garde
  sa signature publique strictement identique (Invariant CORE-002 I2
  sur les signatures publiques préservé).

### Integration points

- **`gopkg.in/yaml.v3`** — déjà dépendance, utilisée pour
  `yaml.Unmarshal([]byte(yamlSrc), &out)`.
- **stdlib** : `errors`, `fmt`, `os`, `path/filepath`, `sort`,
  `strings` (toutes déjà autorisées par la depguard allow-list de
  CORE-002).
- **Aucune intégration externe** : pas de réseau, pas de subprocess,
  pas d'I/O autre que filesystem read-only.

---

## A — Approach

### Y-Statement

> Pour résoudre le besoin de **listing typé multi-consumer des
> artefacts SPDD** (UI hub, future CLI `yukki list`, futur tool MCP
> `yukki.list_stories`), on choisit **une couche Go pure dans
> `internal/artifacts` exposant `ListArtifacts(dir, kind) []Meta` et
> `ParseFrontmatter[T any]` generic**, plutôt que de **dupliquer la
> logique scan+parse dans chaque consumer** ou de **coupler la fonction
> à un consumer particulier (e.g. UI Wails)**, pour atteindre **une
> seule implémentation testée Go-pure, réutilisable sans refactor par
> 3 surfaces, et préservant l'isolation cœur posée par CORE-002**, en
> acceptant **un refactor léger de `ValidateFrontmatter` (déménagée
> de writer.go vers parser.go, signature publique préservée) et un
> coût de scan O(n) à chaque appel sans cache mémoire en V1**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-01)

- **D1 / Tri `Updated` desc + fallback `ID` lexico**.
- **D2 / Tout dans `parser.go`** : `ParseFrontmatter[T]` ET
  `ValidateFrontmatter` (déménagée). `writer.go` ne garde que `Writer`.
- **D3 / `Meta.Error` champ interne** : un seul retour `[]Meta`,
  consumer itère une fois.
- **D4 / Path absolu** via `filepath.Abs`, fallback rel si échec.
- **D5 / `entry.Type().IsRegular()`** filtre dirs + symlinks.
- **D6 / Délimiteurs étendus** `"---\n"` ET `"---\r\n"`, pas de
  mutation du contenu.
- **D7 / `AllowedKinds() []string`** fonction qui retourne une copie.
- **D8 / Pas de sous-test integration optionnel** — couvert par
  unit + tests existants.
- **D9 / `ErrInvalidKind` sentinel exporté**.
- **D10 / Invariant `ListArtifacts read-only`** dans doc-package.
- **D11 / Tests generics table-driven** sur 3 types concrets.

### Alternatives écartées

- **Réinvention dans chaque consumer** (UI hub écrit son propre
  scan+parse, idem CLI, idem MCP) — 3× le code, 3× la dette de tests.
- **Cache mémoire** des résultats — V1 KISS. À reconsidérer si profilage
  révèle un goulot.
- **Filtrage avancé** (par status, par owner) côté `ListArtifacts` —
  reporté ; les consumers filtrent eux-mêmes la `[]Meta`.
- **Watcher fsnotify** — explicitement reporté à UI-005.
- **`Result` interface (sum type Meta | Error)** — non-idiomatique en
  Go (pas de sum types natifs). Le champ `Meta.Error` couvre le besoin
  plus simplement.
- **Slice d'erreurs séparée `([]Meta, []ScanError, error)`** — force
  le consumer à zip 2 slices pour reconstruire le contexte par fichier.
- **Mutation `\r\n → \n`** du contenu pour normaliser EOL — perd le
  contenu original (utile pour hash futur).

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/artifacts/parser.go` | `ParseFrontmatter[T]`, `ValidateFrontmatter` (déménagée) | création |
| `internal/artifacts/lister.go` | `Meta`, `ListArtifacts`, `ErrInvalidKind`, `AllowedKinds()` | création |
| `internal/artifacts/writer.go` | retrait de `ValidateFrontmatter` (déménagée vers parser.go) ; `Writer.Write` continue de l'appeler intra-package | modification |
| `internal/artifacts/parser_test.go` | tests `ParseFrontmatter[T]` table-driven 3 types concrets, tests `ValidateFrontmatter` (déplacés depuis writer_test.go) | création |
| `internal/artifacts/lister_test.go` | 7+ cas de test (nominal, corrompu, kind invalide, dossier inexistant/vide, sous-dir ignoré, EOL Windows) | création |
| `internal/artifacts/writer_test.go` | retrait des tests de `ValidateFrontmatter` (déplacés vers parser_test.go) ; tests de `Writer.Write` inchangés | modification mineure |
| `internal/artifacts/doc.go` | ajout d'un invariant `ListArtifacts is read-only` dans le commentaire | modification |
| `tests/integration/`, `cmd/`, `internal/uiapp`, `internal/workflow`, `internal/templates`, `internal/provider`, `internal/clilog`, `frontend/`, `.github/workflows/ci.yml`, `.golangci.yml`, `go.mod`, `TODO.md` | nul | aucun changement |

### Schéma de flux — chaîne d'appels

```
Consumer (UI-001b / yukki list / INT-002 MCP)
              │
              ▼ ListArtifacts(dir, kind)
┌──────────────────────────────────────────────┐
│ internal/artifacts/lister.go                │
│   1. validateKind(kind) → ErrInvalidKind ?  │
│   2. dir = filepath.Join(dir, "spdd", kind) │
│   3. os.ReadDir(dir) → entries              │
│   4. for each entry where IsRegular():      │
│        os.ReadFile(entry)                   │
│        → ParseFrontmatter[Meta-shape]       │
│        → Meta{...} (or Meta{Error: ...})    │
│   5. sort by Updated desc / ID asc          │
│   6. return []Meta                          │
└──────────────────────────────────────────────┘
              │ uses
              ▼
┌──────────────────────────────────────────────┐
│ internal/artifacts/parser.go                │
│   ParseFrontmatter[T any]:                  │
│     accept "---\n" OR "---\r\n" delim       │
│     yaml.Unmarshal → T                      │
│   ValidateFrontmatter (wrapper):            │
│     ParseFrontmatter[map[string]any]        │
│     + non-empty check                       │
└──────────────────────────────────────────────┘
              │ also called by
              ▼
┌──────────────────────────────────────────────┐
│ internal/artifacts/writer.go (existing)     │
│   Writer.Write(...) calls ValidateFrontmatter│
│   before atomic rename — unchanged behavior  │
└──────────────────────────────────────────────┘
```

---

## O — Operations

> Ordre amont → aval (D10). Chaque Operation est livrable
> indépendamment en 1 commit atomique.

### O1 — `parser.go` : `ParseFrontmatter[T]` + déménagement de `ValidateFrontmatter`

- **Module** : `internal/artifacts`
- **Fichiers** :
  - `internal/artifacts/parser.go` (nouveau) — exporte `ParseFrontmatter[T]`,
    `ValidateFrontmatter`, `ErrInvalidFrontmatter` ; helpers internes
    non-exportés `matchLeadingDelim` (renvoie le newline LF/CRLF + sa
    longueur byte) et `indexClosingDelim` (cherche `\n---\n` ou
    `\r\n---\n` ou `\n---\r\n` ou `\r\n---\r\n` selon le leading
    détecté + fallback robuste mixed-EOL). *Helpers ajoutés en v3
    `/yukki-sync` pour factoriser la détection.*
  - `internal/artifacts/writer.go` (modification : retrait de
    `ValidateFrontmatter` et `ErrInvalidFrontmatter` qui vivent
    désormais dans `parser.go` ; `Writer.Write` continue de l'appeler
    intra-package)
- **Signature** :
  ```go
  // ParseFrontmatter decodes the YAML frontmatter block delimited
  // by `---` lines at the start of `content` into a fresh value of
  // type T. Both LF (`---\n`) and CRLF (`---\r\n`) delimiters are
  // accepted to remain portable across Windows checkouts with
  // autocrlf enabled.
  //
  // Returns the zero value of T plus an error wrapping
  // ErrInvalidFrontmatter when the delimiters are missing or the
  // YAML cannot be unmarshalled into T.
  func ParseFrontmatter[T any](content string) (T, error)

  // ValidateFrontmatter checks that content starts with a non-empty
  // YAML frontmatter block. Public signature preserved from CORE-001
  // (Invariant CORE-002 I2). Implemented as a thin wrapper over
  // ParseFrontmatter[map[string]any] + non-empty check.
  func ValidateFrontmatter(content string) error
  ```
- **Comportement `ParseFrontmatter[T]`** :
  1. Détecter le délimiteur leading : tester `strings.HasPrefix(content, "---\n")`
     puis `strings.HasPrefix(content, "---\r\n")`. Si aucun match,
     retourner `zero T, fmt.Errorf("%w: missing leading frontmatter delimiter", ErrInvalidFrontmatter)`.
  2. Avancer après le délimiteur leading.
  3. Détecter le délimiteur trailing : chercher `"\n---\n"` puis
     `"\n---\r\n"` (et `"\r\n---\n"`, `"\r\n---\r\n"` pour les EOL
     mixtes éventuels — décision de simplicité : on cherche `"\n---"`
     suivi d'un caractère EOL ou EOF, plus robuste).
  4. Si pas trouvé, retourner
     `zero T, fmt.Errorf("%w: missing closing frontmatter delimiter", ErrInvalidFrontmatter)`.
  5. Extraire le bloc YAML entre les 2 délimiteurs.
  6. `var out T; err := yaml.Unmarshal([]byte(yamlSrc), &out)`.
  7. Si erreur, retourner `zero T, fmt.Errorf("%w: %v", ErrInvalidFrontmatter, err)`.
  8. Sinon retourner `out, nil`.
- **Comportement `ValidateFrontmatter`** :
  1. `m, err := ParseFrontmatter[map[string]any](content)`
  2. Si `err != nil`, retourner err.
  3. Si `len(m) == 0`, retourner `fmt.Errorf("%w: empty frontmatter", ErrInvalidFrontmatter)`.
  4. Sinon retourner nil.
- **Tests** : voir O3.

### O2 — `lister.go` : `Meta`, `ListArtifacts`, `ErrInvalidKind`, `AllowedKinds()`

- **Module** : `internal/artifacts`
- **Fichier** : `internal/artifacts/lister.go` (nouveau)
- **Signatures** :
  ```go
  // Meta is the typed view of a SPDD artifact's frontmatter, as
  // returned by ListArtifacts. A non-nil Error means the artifact's
  // frontmatter could not be parsed; the entry is still returned in
  // the list with a usable Path so the consumer can flag it (e.g.
  // a "broken" badge in a hub UI) without aborting the scan.
  type Meta struct {
      ID      string
      Slug    string
      Title   string
      Status  string
      Updated string
      Path    string // absolute when filepath.Abs succeeded
      Error   error  // non-nil if frontmatter parsing failed
  }

  // ErrInvalidKind is returned by ListArtifacts when the `kind`
  // argument is not one of the values returned by AllowedKinds().
  var ErrInvalidKind = errors.New("invalid artifact kind")

  // AllowedKinds returns a fresh copy of the artifact-kind whitelist
  // (stories, analysis, prompts, tests). Mutations on the returned
  // slice do not affect subsequent calls.
  func AllowedKinds() []string

  // ListArtifacts scans <dir>/spdd/<kind>/*.md, parses the YAML
  // frontmatter of each regular file, and returns the typed list
  // sorted by Updated desc with ID lexico ascending as fallback.
  //
  // A corrupted frontmatter on a single file is surfaced via
  // Meta.Error and does not abort the scan. An invalid `kind`
  // returns (nil, err) where errors.Is(err, ErrInvalidKind) is true.
  // A non-existent dir returns (nil, err) wrapping os.ErrNotExist.
  // An empty (or all-non-regular) dir returns ([]Meta{}, nil).
  func ListArtifacts(dir, kind string) ([]Meta, error)
  ```
- **Comportement `AllowedKinds`** :
  1. Retourner `slices.Clone([]string{"stories", "analysis", "prompts", "tests"})`
     (ou `append([]string(nil), allowed...)` pour Go pre-1.21 — ici
     1.22+ donc `slices.Clone` OK).
- **Comportement `ListArtifacts`** :
  1. Valider `kind` contre la whitelist interne. Si invalide,
     retourner `nil, fmt.Errorf("%w: %q (allowed: %v)", ErrInvalidKind, kind, AllowedKinds())`.
  2. Construire `target := filepath.Join(dir, "spdd", kind)`.
  3. `entries, err := os.ReadDir(target)`. Si erreur (typiquement
     `os.ErrNotExist`), retourner `nil, fmt.Errorf("read dir %s: %w", target, err)`.
  4. `out := []Meta{}` (pas nil).
  5. Pour chaque `entry` :
     - Si `!entry.Type().IsRegular()`, skip silencieusement.
     - Si `!strings.EqualFold(filepath.Ext(entry.Name()), ".md")`, skip.
     - `path := filepath.Join(target, entry.Name())`
     - `abs, err := filepath.Abs(path); if err != nil { abs = path }`
     - `data, err := os.ReadFile(path)`. Si erreur, ajouter
       `Meta{Path: abs, Error: err}` et continuer.
     - `meta, err := ParseFrontmatter[Meta](string(data))`. (Note :
       `ParseFrontmatter[Meta]` décode le YAML directement vers les
       champs de `Meta`, modulo le tag yaml — voir Norms ci-dessous.)
     - Set `meta.Path = abs` (overwrite ce que YAML aurait pu mettre).
     - Si `err != nil`, set `meta.Error = err` mais on l'ajoute quand
       même (les champs YAML décodés jusqu'à l'erreur restent).
     - Append `meta` à `out`.
  6. Trier `out` :
     ```go
     sort.SliceStable(out, func(i, j int) bool {
         if out[i].Updated != out[j].Updated {
             return out[i].Updated > out[j].Updated  // desc
         }
         return out[i].ID < out[j].ID  // asc fallback
     })
     ```
  7. Retourner `out, nil`.
- **Note sur le tag YAML** : la struct `Meta` doit avoir des tags
  pour matcher les noms YAML kebab-case du frontmatter (`updated`,
  `status`) tout en gardant les noms Go PascalCase. Cf. Norms.
- **Tests** : voir O3.

### O3 — Tests `parser_test.go` et `lister_test.go`

- **Module** : `internal/artifacts`
- **Fichiers** :
  - `internal/artifacts/parser_test.go` (nouveau)
  - `internal/artifacts/lister_test.go` (nouveau)
  - `internal/artifacts/writer_test.go` (modification : retrait des
    tests de `ValidateFrontmatter`, déplacés vers `parser_test.go`)
- **Cas couverts dans `parser_test.go`** :
  - `TestParseFrontmatter_Map_Valid` : YAML simple, type `map[string]any`,
    assert keys/values
  - `TestParseFrontmatter_Meta_Valid` : YAML complet (id, slug,
    title, status, updated), type `Meta`, assert champs
  - `TestParseFrontmatter_CustomStruct_Valid` : type `struct{ID,Title string}`,
    assert champs (démontre le typage strict)
  - `TestParseFrontmatter_LF_Delimiter` : délimiteur `---\n`
  - `TestParseFrontmatter_CRLF_Delimiter` : délimiteur `---\r\n`
    (compat Windows)
  - `TestParseFrontmatter_MissingLeading` : pas de `---` au début →
    `errors.Is(err, ErrInvalidFrontmatter)`
  - `TestParseFrontmatter_MissingTrailing` : `---\n` au début mais
    pas de fermeture → idem
  - `TestParseFrontmatter_InvalidYAML` : YAML mal formé → idem
  - `TestParseFrontmatter_TypeMismatch` : YAML qui ne décode pas vers
    `T` (e.g. `id: 42` int vers `struct{ID string}`) → erreur
  - `TestValidateFrontmatter_*` : 4 cas hérités de
    `writer_test.go`, testent le wrapper (delimiter manquant, YAML
    corrompu, frontmatter vide, frontmatter valide non-vide)
- **Cas couverts dans `lister_test.go`** :
  - `TestListArtifacts_Nominal` : 3 fichiers valides → `len(out) == 3`,
    chaque entrée a `Error == nil`, ordre par `Updated` desc respecté
  - `TestListArtifacts_TieOnUpdatedSortedByID` : 2 fichiers même
    `Updated` → fallback `ID` ascendant
  - `TestListArtifacts_CorruptedFrontmatter` : 2 valides + 1
    `BROKEN-001.md` avec YAML cassé → `len(out) == 3`, l'entrée
    cassée a `Error != nil`, les autres `nil`, scan ne fail pas
    globalement
  - `TestListArtifacts_InvalidKind` : `kind = "wrong"` →
    `errors.Is(err, ErrInvalidKind)`
  - `TestListArtifacts_DirNotExist` : dossier inexistant → `nil, err`
  - `TestListArtifacts_EmptyDir` : dossier existe mais vide →
    `[]Meta{}, nil` (slice vide non-nil)
  - `TestListArtifacts_IgnoresSubDirs` : dossier contient
    `archive/old.md` (sub-dir) + 1 fichier régulier → `len(out) == 1`
    (sub-dir ignoré silencieusement)
  - `TestListArtifacts_IgnoresNonMD` : dossier contient `note.txt` +
    1 `.md` → `len(out) == 1`
  - `TestListArtifacts_CRLFFile` : un fichier avec EOL `\r\n` →
    parsé correctement, `Error == nil`
  - `TestListArtifacts_PathIsAbsolute` : assert `filepath.IsAbs(meta.Path)`
- **Cas retirés de `writer_test.go`** :
  - `TestValidateFrontmatter_*` (4-5 cas) → déplacés vers
    `parser_test.go`. Les autres tests (`TestWriter_Write_*`,
    `TestWriter_Concurrent_*`, etc.) restent dans `writer_test.go`
    sans modification.
- **Convention table-driven** sur `ParseFrontmatter[T]` : 1 fonction
  de test par type concret (vu la généricité, pas une seule fonction
  table-driven multi-type).

### O4 — `doc.go` : ajout invariant `ListArtifacts is read-only`

- **Module** : `internal/artifacts`
- **Fichier** : `internal/artifacts/doc.go` (modification)
- **Nature** : ajout d'un bullet à la liste d'invariants existante
  (créée par CORE-002).
- **Texte exact à ajouter** (après les invariants CORE-001) :
  ```
  //   - ListArtifacts is read-only and never modifies any file.
  //     A corrupted frontmatter never aborts the scan; the offending
  //     entry carries the error in Meta.Error.
  ```
- **Comportement** : statique (commentaire). Aucun effet runtime.
- **Tests** : aucun. Validation manuelle via `go doc github.com/yukki-project/yukki/internal/artifacts`.

---

## N — Norms

- **Logging Go** : aucun appel à un `slog.Logger` dans `lister.go`
  ou `parser.go`. Le cœur retourne des erreurs ; le logging est la
  responsabilité du consumer (CLI, UI, MCP).
- **Nommage des fichiers** : `lister.go`, `parser.go` (singulier,
  cohérent avec `writer.go`, `id.go`, `slug.go`).
- **Tests** : 1 fichier `_test.go` par fichier source. Convention
  table-driven pour les cas multiples sur la même fonction.
  `t.TempDir()` pour l'I/O — pas de fixtures hard-coded en repo.
- **YAML tags** : la struct `Meta` doit déclarer des tags `yaml:"..."`
  pour matcher les clés frontmatter en kebab-case si nécessaire.
  Pour V1, tous les champs (`id`, `slug`, `title`, `status`,
  `updated`) sont déjà en kebab-case = lowercase, et yaml.v3 fait du
  case-insensitive matching par défaut. Pas besoin de tags explicites
  sauf préférence stylistique.
- **Erreurs** : sentinel + wrap (`%w`). `ErrInvalidKind` rejoint la
  famille `ErrInvalidPrefix`, `ErrInvalidFrontmatter`. Toutes
  exportées.
- **Imports** : strict respect de la depguard allow-list de CORE-002
  (`$gostd` + `gopkg.in/yaml.v3` + intra-cœur). Aucune nouvelle
  dépendance.
- **Generics** : `func ParseFrontmatter[T any](content string) (T, error)`
  — paramètre type unique, contrainte `any`. Cohérent avec Go 1.22+
  idiomatique.
- **Tri** : `sort.SliceStable` pour préserver l'ordre original des
  égalités `Updated` + `ID`. (Bien qu'on ait fallback `ID`, deux
  fichiers même Updated + même ID est un edge case impossible en
  pratique — `NextID` garantit unicité.)
- **Convention de commit** : `feat(artifacts)` pour O1, O2, O3 ;
  `docs(artifacts)` pour O4.
- **Doc-comments** : commentaire au-dessus de chaque symbole exporté,
  `// FunctionName ...` style godoc. Retours et erreurs documentés.
- **CI** : aucun nouveau step. Le job `static-checks` (depguard) +
  `unit-tests` (matrix 3 OS) couvrent.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Pas de modification de signature publique existante**
  - `ValidateFrontmatter(content string) error` garde sa signature
    **exacte** au déménagement vers `parser.go`. Aucun ajout de
    paramètre, aucun retour différent. Le `writer_test.go` qui
    teste cette fonction continue de passer **sans modification**.
  - `Writer.Write`, `NextID`, `Slugify`, `ValidatePrefix`,
    `AllowedPrefixesString` ne bougent pas.
- **Pas de mutation du contenu lors du parse**
  - `ParseFrontmatter[T]` lit le contenu mais ne le réécrit pas, ne
    le normalise pas (pas de `strings.ReplaceAll(content, "\r\n", "\n")`),
    ne le hashe pas. Le contenu original est préservé pour usages
    futurs (caching, debug dump).
- **Pas d'écriture filesystem dans `lister.go`**
  - Aucun `os.Create`, `os.Rename`, `os.Remove`, `os.MkdirAll`,
    `os.WriteFile`. Vérifié par grep CI optionnel (mais Invariant
    I1 est documenté dans `doc.go`).
- **Pas de réseau, pas de subprocess**
  - Aucun import de `net`, `net/http`, `os/exec`, `crypto/tls`.
    Hors scope d'un module de listing.
- **Pas de cache mémoire**
  - Chaque `ListArtifacts` re-scanne. Si quelqu'un est tenté
    d'ajouter un cache "pour la perf", il faut une story dédiée
    (avec invalidation, race conditions, etc.). Pas dans CORE-004.
- **Pas de filtrage avancé côté core**
  - `ListArtifacts` retourne tout. Pas de paramètre `statusFilter`,
    `ownerFilter`, etc. Le consumer filtre la `[]Meta` retournée.
- **Pas de récursion**
  - Le scan reste à plat. Sous-dossiers ignorés silencieusement
    (Invariant I5). Si un user veut lister
    `.yukki/stories/archive/*.md`, il appelle
    `ListArtifacts(<archive-parent>, "stories")` explicitement.
- **Pas d'évolution de `Meta` sans canvas-update**
  - Ajouter un champ à `Meta` (ex. `Owner`, `Modules`) est une
    modification de contrat exporté. Nécessite un nouveau cycle
    SPDD (`/yukki-prompt-update` du présent canvas, puis
    re-`/yukki-generate`).
- **Pas de dépendance externe ajoutée**
  - `gopkg.in/yaml.v3` reste la seule dep non-stdlib utilisée.
    Refusé : `mapstructure`, `viper`, `sigs.k8s.io/yaml`, etc.
- **Pas de logging dans le cœur**
  - Si `os.ReadFile` échoue sur un fichier individuel, l'erreur va
    dans `Meta.Error`, pas dans un `slog.Warn`. Le consumer décide
    de logger ou pas.
- **Pas de modification de `internal/artifacts/doc.go` autre que
  l'ajout de l'invariant**
  - Le doc-package canonique (CORE-002) n'est pas réécrit. Seul
    l'ajout d'un bullet d'invariant est autorisé en O4.
