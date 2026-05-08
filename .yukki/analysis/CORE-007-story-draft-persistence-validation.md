---
id: CORE-007
slug: story-draft-persistence-validation
story: .yukki/stories/CORE-007-story-draft-persistence-validation.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Persistance des brouillons SPDD et validation front-matter côté Go

> Contexte stratégique pour la story `CORE-007-story-draft-persistence-validation`. Produit par `/yukki-analysis`
> à partir d'un scan **ciblé** du codebase (mots-clés métier extraits de la story).
> Ne dupliquer ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`Draft`, `DraftSave`, `DraftLoad`, `DraftList`, `DraftDelete`, `StoryValidate`,
`ValidationReport`, `configDir`, `AcceptanceCriterion`, `storyspec`, `AutoSave`,
`modules.yaml`, `kebab-case`, `ISO8601`

## Concepts de domaine

Identification selon [`.yukki/methodology/domain-modeling.md`](.yukki/methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **`artifacts.Writer`** — `internal/artifacts/writer.go`. Écriture atomique via
  `temp-then-rename` dans un répertoire donné (`StoriesDir`). Couvre déjà l'écriture
  d'artefacts `.md` finaux. Non adapté aux brouillons JSON intermédiaires (pas de
  sérialisation objet, chemin fixé sur `storiesDir`).
- **`artifacts.ParseFrontmatter[T]`** — `internal/artifacts/parser.go`. Décode
  le frontmatter YAML d'un artefact `.md`. Gère LF et CRLF. Retourne
  `ErrInvalidFrontmatter`. Base réutilisable pour la re-validation de CORE-009.
- **`artifacts.Status` + `OrderedStatuses()`** — `internal/artifacts/status.go`.
  Enumération `draft|reviewed|accepted|implemented|synced` + validation de
  transition. La validation du champ `status` d'un brouillon doit s'appuyer
  dessus, pas dupliquer l'énumération.
- **`artifacts.Slugify()`** — `internal/artifacts/slug.go`. Génération kebab-case
  déterministe. La validation de slug de CORE-007 doit s'aligner sur ce qu'elle
  produit, pas définir un dialecte différent.
- **`uiapp.App`** — `internal/uiapp/app.go`. Struct principale Wails avec contexte,
  mutex, projets ouverts. Les nouveaux bindings `DraftSave/Load/List/Delete` +
  `StoryValidate` s'y greffent naturellement comme méthodes supplémentaires.
- **`uiapp.ReadArtifact` / `WriteArtifact`** — `internal/uiapp/app.go`. Accès au
  file system borné au répertoire projet. Modèle de sécurité à reproduire pour
  les opérations Draft (path traversal guard).

### Nouveaux (à introduire)

- **`Draft`** (Entity) — Objet avec identité (`ID`), cycle de vie
  (`draft/reviewed/…`), état partiel. Distinct d'une `Story` finalisée : sa
  sérialisation est JSON (pour mutabilité incrémentale rapide), pas Markdown.
  À loger dans `internal/draft/draft.go`.
- **`DraftStore`** (Integration point) — Lecture/écriture dans
  `<configDir>/yukki/drafts/<id>.json` via `os.UserConfigDir()`. Abstrait le
  path system pour testabilité (interface ou paramètre de chemin de base).
- **`ValidationReport`** (Value Object) — Liste de `FieldError{Field, Severity,
  Message}`. Immutable une fois produit. Doit être JSON-serialisable pour
  passer la frontière Wails.
- **`storyspec.Validator`** — Nouvelle entité Go dans `internal/storyspec/`
  portant les règles SPDD canoniques : `ValidateID`, `ValidateSlug`,
  `ValidateStatus`, `ValidateModules`, `ValidateDates`. Source de vérité
  partagée CLI ↔ UI, ce qui est l'invariant fondamental de la story.
- **`DraftAutoSave`** (Domain Event côté front) — Déclencheur (debounce 2 s)
  côté React qui appelle le binding `DraftSave`. Non modélisé en Go, mais
  son absence de retour d'erreur visible doit être documentée dans le canvas.

## Approche stratégique

Décision selon [`.yukki/methodology/decisions.md`](.yukki/methodology/decisions.md).

> Pour résoudre **l'absence de persistance des brouillons SPDD et la duplication
> des règles de validation entre CLI et UI**, on choisit **d'introduire deux
> packages Go indépendants (`internal/draft` et `internal/storyspec`) exposés
> via des méthodes Wails sur `uiapp.App`**, plutôt que **(a) étendre
> `internal/artifacts` avec la sémantique draft** ou **(b) stocker les
> brouillons côté front (localStorage / IndexedDB)**, pour atteindre **une
> source de vérité unique des règles SPDD réutilisable par la CLI**, en
> acceptant **un couplage léger entre `internal/uiapp` et les deux nouveaux
> packages (dépendance unidirectionnelle tolérée par l'architecture)**.

**Alt (a) — Étendre `internal/artifacts`** : ce package gère des artefacts
`.md` finaux avec invariants forts (frontmatter valide, nommage
`<id>-<slug>.md`). Les brouillons sont partiels et en JSON — les y mêler
briserait la cohésion du package et l'invariant de frontmatter valide.

**Alt (b) — Persistance côté front** : localStorage est limité à ~5 Mo,
non partageable entre sessions Wails futures (multi-fenêtres), et imposerait
une deuxième implémentation de la validation JS — exactement la duplication
que la story veut éliminer.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/draft` | fort | création (package complet) |
| `internal/storyspec` | fort | création (package complet) |
| `internal/uiapp` | moyen | modification (nouveaux bindings sur `App`) |
| `internal/artifacts` | faible | lecture seule (réutilisation `Status`, `Slugify`) |
| `frontend` | moyen | modification (hook auto-save, restore dialog) |

## Dépendances et intégrations

- **`os.UserConfigDir()`** (stdlib) — retourne `%APPDATA%` sur Windows,
  `~/.config` sur Linux. La dépendance doit être injectable pour les tests
  (`os.TempDir()` ou paramètre explicite).
- **`encoding/json`** (stdlib) — sérialisation Draft. Pas de lib externe.
- **`gopkg.in/yaml.v3`** — déjà dans `go.mod`. Pour `ValidateModules` qui
  charge `modules.yaml`.
- **Wails `runtime.EventsEmit`** — pour les événements futurs (hors scope
  CORE-007 ; utiliser des bindings synchrones à ce stade).

## Risques et points d'attention

Grille selon [`.yukki/methodology/risk-taxonomy.md`](.yukki/methodology/risk-taxonomy.md).

- **Data** — *Impact moyen, probabilité moyenne* — Corruption d'un brouillon
  JSON si crash entre écriture temp et rename. **Mitigation** : WriteAtomic
  (temp-then-rename) identique au pattern de `artifacts.Writer`.
- **Data** — *Impact fort, probabilité faible* — Draft avec `id` vide ou
  `slug` vide crée un fichier `.json` innommable. **Mitigation** : valider
  ID non-vide avant d'écrire ; si vide, utiliser `"unsaved-<timestamp>"` comme
  clé de fichier.
- **Sécurité (Tampering / Information disclosure)** — *Impact moyen,
  probabilité faible* — Path traversal sur `DraftLoad(id)` : un id contenant
  `../../../etc/passwd` lirait hors du répertoire drafts. **Mitigation** :
  `filepath.Clean` + vérification que le chemin résolu reste sous `draftsDir`.
- **Compatibilité** — *Impact moyen, probabilité faible* — Changement du type
  Go `Draft` casse la désérialisation des `.json` existants (champ renommé,
  type changé). **Mitigation** : dès v1, utiliser `omitempty` sur les champs
  optionnels et écrire un test de roundtrip avec un fixture JSON statique.
- **Opérationnel** — *Impact faible, probabilité moyenne* — Accumulation de
  brouillons orphelins dans `configDir` (drafts jamais exportés). **Mitigation** :
  `DraftList()` exposé à l'UI pour permettre le ménage ; une TTL automatique
  est hors scope v1.

## Cas limites identifiés

Checklist selon [`.yukki/methodology/edge-cases.md`](.yukki/methodology/edge-cases.md).

- **Null / empty** — Draft avec tous les champs vides (`ID=""`, `Title=""`,
  sections vides). `DraftSave` doit accepter des brouillons partiels sans
  planter (c'est justement le cas nominal du rédacteur débutant).
- **Concurrence** — Auto-save debounced toutes les 2 s et export manuel
  simultanés. Le `DraftSave` doit être safe sous concurrence légère (Wails
  appelle les bindings sur un seul goroutine JS→Go à la fois, mais valider
  l'hypothèse en test).
- **Failure modes** — `configDir` inexistant (premier lancement) : `DraftSave`
  doit créer le répertoire `<configDir>/yukki/drafts/` s'il n'existe pas.
- **Boundaries** — `ValidateSlug` : slug de 80 caractères exactement (valide),
  81 caractères (erreur). Slug ne commençant pas par un chiffre vs commençant
  par un chiffre (erreur selon la story).
- **Equivalence classes** — `ValidateID` : `CORE-007` ✓, `UI-014a` ✓ (lettre
  minuscule en suffixe tolérée selon la regex de la story), `core-007` ✗,
  `007-CORE` ✗, `CORE-` ✗.

## Décisions à prendre avant le canvas

- [ ] **Chemin du `DraftStore`** : utiliser `os.UserConfigDir()` (partagé avec
  les préfs utilisateur) ou un chemin dérivé du projet ouvert (`.yukki/drafts/`
  dans le repo) ? L'option repo est plus portative (pas de config système) mais
  pollue le versionnement si le PO ajoute `.yukki/drafts/` au `.gitignore`.
  → Recommandation : `configDir` en v1 (hors repo), add `.yukki/drafts/` au
  `.gitignore` pour v2 si l'option repo est adoptée.
- [ ] **Format des `ModuleWarning`** : distinguer *inconnu* (warning) vs
  *invalide* (erreur) ? La story dit "inconnu = warning", mais un module avec
  `/` double ou espace est probablement une faute de frappe (erreur). Trancher.
- [ ] **Gestion du `restore dialog`** : c'est du ressort du front, mais le
  binding `DraftList()` doit-il retourner les brouillons triés par `updated`
  décroissant ? (Impact sur l'UX du dialog de restoration.)
- [ ] **`modules.yaml`** : fichier à créer dans `.yukki/methodology/` ou dans
  `.yukki/` directement ? La story dit `.yukki/methodology/modules.yaml` ; valider
  que c'est cohérent avec l'arborescence existante (`.yukki/methodology/` ne
  contient actuellement que des refs SPDD, pas de config opérationnelle).
