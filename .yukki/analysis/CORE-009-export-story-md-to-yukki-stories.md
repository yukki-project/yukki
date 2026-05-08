---
id: CORE-009
slug: export-story-md-to-yukki-stories
story: .yukki/stories/CORE-009-export-story-md-to-yukki-stories.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Export du fichier .md final dans .yukki/stories/

> Contexte stratégique pour `CORE-009-export-story-md-to-yukki-stories`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase.
> Ne duplique ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`Render`, `WriteAtomic`, `Conform`, `ExportResult`, `ExportOptions`, `Overwrite`,
`StoryExport`, `byte-identical`, `sections`, `frontmatter`, `conflict`, `slug`,
`Draft.Sections`, `artifacts.Writer`, `storyspec`

## Concepts de domaine

> Selon [`.yukki/methodology/domain-modeling.md`](./../methodology/domain-modeling.md)

### Concepts existants

| Brique | Nom | Où vit-il | Contrainte connue |
|---|---|---|---|
| Entity | `Draft` | `internal/draft/draft.go` | `Sections map[string]string` — clés reconnues : `"bg"`, `"bv"`, `"si"`, `"so"`, `"oq"`, `"notes"` |
| Value Object | `AcceptanceCriterion` | `internal/draft/draft.go` | Immutable par intention ; id du critère en string `"AC1"`, `"AC2"`… |
| Integration point | `artifacts.Writer.Write` | `internal/artifacts/writer.go` | Atomic rename via `os.Rename` ; vérifie le frontmatter YAML avant rename ; `ValidateFrontmatter` déjà en place |
| Value Object | `ValidationReport` | `internal/storyspec/validate.go` | Retourné par `Validate(draft Draft)` — liste de `FieldError` |

### Concepts nouveaux

| Brique | Nom | Justification |
|---|---|---|
| Value Object | `ExportOptions` | Encapsule `Overwrite bool` ; prévu pour extension (option git-add future) sans modifier la signature du binding |
| Value Object | `ExportResult` | Retour structuré : `Path`, `Bytes int64`, `WrittenAt time.Time` — évite de parser le chemin côté front |
| Value Object | `ConflictInfo` | Retourné quand `Overwrite=false` et story existante : `Kind="conflict"`, `ExistingPath`, `ExistingUpdatedAt` |
| Operation | `storyspec.Render(draft Draft) ([]byte, error)` | Sérialisation déterministe Draft → Markdown SPDD ; chemin unique CLI+UI |
| Operation | `storyspec.Conform(rendered []byte) error` | Post-condition de `Render` : vérifie sections présentes dans l'ordre du template |
| Operation | `storyspec.WriteAtomic(path string, content []byte) error` | Abstraction de l'écriture atomique orientée storyspec (createTemp + rename + mkdirAll) |
| Domain event | `StoryExported` | Émis côté Wails pour notifier l'UI après écriture réussie (chemin + métadonnées) |

**Invariant clé** : `Render` + `Conform` = post-condition systématique. On n'écrit jamais un `.md` sans avoir passé `Conform`. Le fichier final est toujours valide.

**Invariant 2** : le même chemin de code (`Render`) est emprunté par la CLI `yukki story` et par `StoryExport` Wails. Aucun chemin parallèle.

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](./../methodology/decisions.md)

Pour résoudre le problème de **divergence de format entre CLI et UI** (risque de `.md` non-conformes générés uniquement par l'UI), on choisit d'**extraire `Render`/`Conform`/`WriteAtomic` dans `internal/storyspec`** comme fonctions pures réutilisées par CLI et binding Wails, plutôt qu'une sérialisation inline dans `bindings.go` ou une sérialisation côté front en TypeScript, pour atteindre **l'unicité de source de vérité** du format `.md` SPDD, en acceptant **un couplage `internal/uiapp` → `internal/storyspec` légèrement plus fort** (mitigé par le fait que `storyspec` ne dépend jamais de `internal/uiapp` — sens unique).

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Sérialisation côté TypeScript (template literal) | Risque de divergence avec la CLI ; deux sources de vérité ; encodage UTF-8 / EOL non garanti cross-platform |
| Réutilisation directe de `artifacts.Writer.Write` | `Writer.Write` prend un `string` pré-formaté sans contrainte d'ordre des sections — pas de `Conform` possible |
| Génération via template Go `text/template` | Surcoût pour un format fixe ; l'ordre des sections est statique, un `fmt.Fprintf` séquentiel est plus lisible et plus testable |

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/storyspec` | Fort | Création : `render.go`, `conform.go`, `atomic.go` |
| `internal/uiapp` | Fort | Modification : `bindings.go` — ajout `StoryExport` + helper `activeProjectStoriesDir` |
| `internal/artifacts` | Faible | Lecture seule : `Writer.Write` sert de modèle pour `WriteAtomic` mais n'est pas modifié |
| `internal/draft` | Faible | Lecture seule : `Draft` est le type d'entrée de `Render` |

## Dépendances et intégrations

- `gopkg.in/yaml.v3` — déjà en `go.mod` ; utilisé pour sérialiser le frontmatter YAML dans `Render`
- `os.CreateTemp` + `os.Rename` — même pattern que `DraftStore.Save` (CORE-007) ; sur Windows, le fichier `.tmp` doit être fermé avant `Rename`
- Wails `runtime.EventsEmit` — émission de `"story:exported"` après écriture ; déjà utilisé dans `app.go`
- Template `.yukki/templates/story.md` — sert de référence de sections à `Conform`
- `internal/artifacts.ValidateFrontmatter` — réutilisé dans `Conform` pour le parse YAML (pas de duplication)

## Risques

> Catégories selon [`.yukki/methodology/risk-taxonomy.md`](./../methodology/risk-taxonomy.md)

| # | Catégorie | Risque | Impact | Proba | Mitigation |
|---|---|---|---|---|---|
| R1 | **Data** | Render produit un .md avec EOL `\r\n` sur Windows → bytes non-identiques entre OS | Haut | Moyen | Forcer `\n` dans `Render` via `strings.ReplaceAll` ou `fmt.Fprintf` sans jamais écrire `\r\n` ; test golden cross-platform en CI Linux + Windows |
| R2 | **Intégration** | `os.Rename` échoue si le tmp et la destination sont sur des volumes différents (Windows avec TMP sur autre drive) | Haut | Faible | `os.CreateTemp` dans le même dossier que la destination (pattern identique à `DraftStore`) |
| R3 | **Compatibilité** | Sections `Draft.Sections` manquantes (clé absente vs valeur vide) — Render omet-il les sections obligatoires ? | Moyen | Moyen | Distinguer "clé absente" de "valeur vide" : sections obligatoires (`Background`, `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria`) toujours présentes même vides dans le rendu, puis `Conform` les valide |
| R4 | **Sécurité (STRIDE — Tampering)** | Path traversal via `draft.Slug` utilisé pour construire le nom de fichier | Haut | Faible | Réutiliser `sanitiseID` analogue de CORE-007 + valider `Slug` avec la regex `slugRE` déjà dans `storyspec.ValidateSlug` avant de construire le chemin |
| R5 | **Opérationnel** | Conflit silencieux : story existante écrasée sans que l'UI ne le montre | Moyen | Moyen | Contrôle `Overwrite=false` par défaut dans `StoryExport` ; retour structuré `ConflictInfo` consommé par le front avant d'autoriser l'overwrite |

## Cas limites

> Catégories selon [`.yukki/methodology/edge-cases.md`](./../methodology/edge-cases.md) (BVA + EP + checklist 7 catégories)

| # | Catégorie | Cas limite | Attendu |
|---|---|---|---|
| E1 | **Valeurs limites (BVA)** | Draft avec titre = 0 char (vide) | `Render` produit `# ` (titre vide), `Conform` passe (pas de contrainte de longueur titre dans le template) |
| E2 | **Partition d'équivalence** | `AC` vide (`[]`) | Section `## Acceptance Criteria` présente mais vide dans le `.md` |
| E3 | **Concurrence** | Deux `StoryExport` simultanés pour le même `id` | Dernier `Rename` gagne (atomicité OS) ; pas de corruption ; le test de race (comme CORE-007) valide |
| E4 | **Filesystem** | `.yukki/stories/` inexistant | `WriteAtomic` crée le dossier via `os.MkdirAll(0755)` avant `CreateTemp` |
| E5 | **Contenu** | Section `Sections["bg"]` contient `---` (trois tirets) | Pas de conflit avec le frontmatter car les sections sont écrites après le second `---\n` délimiteur |

## Décisions à prendre avant le canvas

1. **`Conform` vs test table** : est-ce que `Conform` est une fonction publique testée indépendamment, ou est-ce juste une assertion interne de `Render` (test via `Render` uniquement) ? → **Proposition** : fonction publique pour permettre des tests de régression indépendants (AC3 de la story l'exige explicitement).

2. **Sections obligatoires dans `Render`** : quelles sections sont toujours présentes même si vides ? → **Proposition** : `Background`, `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria` toujours présentes ; `Open Questions` et `Notes` omises si absentes du map (comme spécifié dans AC2 de la story).

3. **`WriteAtomic` dans `storyspec` vs `artifacts`** : dupliquer la logique temp+rename, ou créer une fonction générique dans `artifacts` ? → **Proposition** : conserver la logique dans `storyspec` (identique à `DraftStore.Save`) ; l'extraction dans `artifacts` est prématurée — à faire si un troisième appelant émerge (règle YAGNI).

4. **Hook git dans ce scope** : l'AC6 de la story mentionne `--git=true` optionnel. → **Proposition** : **hors scope CORE-009** — bindings Go ne lancent pas de subprocess dans ce cycle (dépend de `internal/provider` pour l'exec) ; mettre en Open Question du canvas.
