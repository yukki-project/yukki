---
id: META-005
slug: inbox-epic-roadmap-foundation
story: spdd/stories/META-005-inbox-epic-roadmap-foundation.md
analysis: spdd/analysis/META-005-inbox-epic-roadmap-foundation.md
status: implemented
created: 2026-05-04
updated: 2026-05-04
---

# Canvas REASONS — Foundation Inbox / Epic / Roadmap

> Spec exécutable. Source de vérité pour `/spdd-generate` et `/spdd-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

yukki ne reconnaît qu'un seul niveau d'artefact (`stories`). On veut
introduire la **foundation scaffolding-only** des 3 niveaux manquants
de la chaîne discovery → delivery : **Inbox** (capture brute), **Epic**
(regroupement de stories), **Roadmap** (vue projection Now/Next/Later)
— sans implémenter les UX (capture rapide, kanban, transitions), qui
sont des stories enfants.

### Definition of Done

- [ ] DoD1 — `artifacts.AllowedKinds()` retourne 7 entries dans
  l'ordre `["stories", "analysis", "prompts", "tests", "inbox", "epics", "roadmap"]` (couvre AC1)
- [ ] DoD2 — `uiapp.spddSubdirs` contient 9 entries (les 7 kinds +
  `methodology` + `templates`) ; `InitializeSPDD` les crée tous
- [ ] DoD3 — 3 nouveaux templates embarqués (`inbox.md`, `epic.md`,
  `roadmap.md`) chargeables via `Loader.LoadInbox()`, `LoadEpic()`,
  `LoadRoadmap()` (depuis `embed.FS`, fallback project-first)
- [ ] DoD4 — `InitializeSPDD` copie les 7 templates (4 existants + 3
  nouveaux) dans `<projectDir>/spdd/templates/`
- [ ] DoD5 — Frontend : `ShellMode` étend de 6 → 9 valeurs ; `SPDD_KINDS`
  étend de 4 → 7 entries ; `TITLES` map 9 entries (couvre AC1 côté UI)
- [ ] DoD6 — `CLAUDE.md` documente : (a) les 3 nouveaux préfixes
  `INBOX-`, `EPIC-`, `ROADMAP-` dans le tableau de convention, (b) le
  schéma de hiérarchie discovery → delivery, (c) le rôle Roadmap = vue
  projection (couvre AC2)
- [ ] DoD7 — `spdd/README.md` documente la chaîne Inbox → Epic → Story
  → Code (couvre AC2)
- [ ] DoD8 — Un fichier malformé (frontmatter YAML invalide) dans
  `inbox/`, `epics/`, ou `roadmap/` est listé avec `Meta.Error`
  peuplé (couvre AC3)
- [ ] DoD9 — Re-init d'un projet pré-existant (avec déjà
  `stories/analysis/prompts/tests/`) crée les 3 nouveaux dossiers sans
  toucher aux 4 existants ni aux fichiers (couvre AC4)
- [ ] DoD10 — `go test ./...` passe ; `go vet` clean ; smoke `wails dev`
  affiche les 9 modes dans la sidebar

---

## E — Entities

> Aucun comportement métier nouveau dans le code (foundation
> scaffolding-only) — les Entities ci-dessous décrivent les artefacts
> *en tant que types d'artefact dans le système* mais leur cycle de vie
> détaillé (promotion, transitions de status) est porté par les stories
> enfants.

### Entités

| Nom | Description | Champs clés frontmatter | Cycle de vie (déclaré, exécuté par stories enfants) |
|---|---|---|---|
| `Inbox` | Capture brute en discovery zone | `id (INBOX-NNN), slug, title, status, created, updated`, optionnel `promoted-to: <STORY\|EPIC>-NNN` | `unsorted → promoted (story\|epic) ou rejected` |
| `Epic` | Regroupement thématique de stories liées | `id (EPIC-NNN), slug, title, status, child-stories: [STORY-NNN…]`, `created, updated` | `draft → in-progress → mature → done` |
| `Roadmap` | Vue projection Now/Next/Later | `id (roadmap-current), slug, title, status, columns: [{id,label,epics,standalone-stories}]`, `updated` | vivante (mise à jour continue) |

### Relations (déclarées, sans validation cross-cohérence en META-005)

- `Inbox` — `promoted-to` → `Story` ou `Epic` (1..1, optionnel) — relation
  produite par la story enfant `INBOX-002`.
- `Epic` — `child-stories` → `Story` (0..N) — relation produite par
  `EPIC-001`.
- `Roadmap.columns[].epics` → `Epic` (0..N) — relation produite par
  `ROADMAP-001`.
- `Roadmap.columns[].standalone-stories` → `Story` (0..N) — idem.

**META-005 ne force aucune cohérence référentielle** : on déclare les
champs dans les templates, mais leur validation (existence des cibles,
intégrité bidirectionnelle) est hors scope.

---

## A — Approach

> Rappel de l'Y-Statement de l'analyse — repris ici comme rappel
> exécutable.

**Foundation atomique en un seul commit** : on étend simultanément les
3 sources de vérité (`allowedKinds`, `spddSubdirs`, `ShellMode`/
`SPDD_KINDS`/`TITLES`), on ajoute les 3 templates en source canonique
(`internal/templates/embedded/`) + en copie repo (`spdd/templates/`),
on étend `Loader` avec 3 méthodes dédiées (`LoadInbox`, `LoadEpic`,
`LoadRoadmap`) cohérentes avec le pattern existant, et on documente la
chaîne discovery → delivery dans `CLAUDE.md` + `spdd/README.md`. Aucune
UX (capture, kanban, promotion) n'est livrée — les stories enfants
(`INBOX-001`, `INBOX-002`, `EPIC-001`, `ROADMAP-001`, `ROADMAP-002`)
s'appuieront sur cette foundation.

Le **schéma frontmatter de Roadmap** est volontairement plus riche que
`Meta` (champ `columns: [...]` non porté par la struct standard).
`yaml.Unmarshal` ignore silencieusement les champs en trop, donc une
roadmap valide est listée par `ListArtifacts` avec ses champs `Meta`
correctement remplis (`id, slug, title, status, updated`) ; `columns`
reste dans le fichier source pour `ROADMAP-001` qui le rendra en
kanban.

### Alternatives considérées

- **Tout en une story (foundation + capture + promotion + kanban)** —
  Rejetée : SPIDR Small cassé (~5j), mix CRUD + UI + workflow.
- **Démarrer par la roadmap-vue (kanban) sans les types** — Rejetée :
  ordre logique inverse, kanban vide tant qu'aucun Epic/Story
  standalone n'existe.
- **Réutiliser `kind=stories` avec `type: inbox|epic|story`** —
  Rejetée : casse la sémantique « 1 kind = 1 dossier » de
  `AllowedKinds`.
- **Loader générique `Load(name string)`** — Rejetée : refactor du
  pattern existant (4 méthodes dédiées) hors scope ; à traiter dans
  une story `META-006` séparée si jugé utile.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/templates/embedded/` | `inbox.md`, `epic.md`, `roadmap.md` (nouveaux) | create |
| `internal/templates` | `templates.go` | modify (`//go:embed` + 3 méthodes Loader) |
| `internal/artifacts` | `lister.go` | modify (étendre `allowedKinds`) |
| `internal/uiapp` | `app.go` | modify (étendre `spddSubdirs` + liste templates copiés) |
| `frontend/src/stores` | `shell.ts` | modify (`ShellMode` + `SPDD_KINDS`) |
| `frontend/src/components/hub` | `SidebarPanel.tsx` | modify (`TITLES` map) |
| Tests Go | `internal/artifacts/lister_test.go`, `internal/uiapp/app_test.go`, `internal/templates/templates_test.go` (si existe) | modify (fixtures + assertions sur 7 kinds / 9 subdirs / 7 templates) |
| `spdd/templates/` | `inbox.md`, `epic.md`, `roadmap.md` (copies repo) | create |
| `spdd/README.md` | section méthodologie | modify (chaîne discovery → delivery) |
| `CLAUDE.md` | tableau préfixes + section vocabulaire | modify (3 nouveaux préfixes + schéma hiérarchie) |

### Schéma de flux (init du projet)

```
yukki ui  →  InitializeSPDD(projectDir)
                │
                ├─ os.MkdirAll  pour chaque sub ∈ spddSubdirs (9 dirs)
                │     stories/, analysis/, prompts/, tests/,
                │     inbox/, epics/, roadmap/,           ← META-005
                │     methodology/, templates/
                │
                └─ os.WriteFile pour chaque template ∈ {7}
                      templates.go: Loader.Load{Story,Analysis,
                      CanvasReasons,Tests,Inbox,Epic,Roadmap}() ← + 3 META-005
                          │
                          └─ embed.FS  (fallback si projet n'a pas
                                         son propre <projectDir>/templates/)
```

---

## O — Operations

> 11 Operations atomiques, ordonnées du bas du stack vers le haut.
> `/spdd-generate` doit produire les Operations dans cet ordre dans
> un seul commit (atomicité requise pour cohérence triple-source).

### O1 — Créer les 3 templates source dans `internal/templates/embedded/`

- **Module** : `internal/templates/embedded/`
- **Fichiers** : `inbox.md`, `epic.md`, `roadmap.md` (nouveaux)
- **Contenu attendu** :
  - `inbox.md` (minimal, capture brute) :
    ```yaml
    ---
    id: INBOX-<NNN>
    slug: <kebab-case>
    title: <titre court>
    status: unsorted        # unsorted | promoted | rejected
    created: <YYYY-MM-DD>
    updated: <YYYY-MM-DD>
    promoted-to: ~          # STORY-NNN | EPIC-NNN si promoted
    ---

    # <titre>

    ## Idée

    <1 paragraphe — capture brute, faible friction>

    ## Notes

    <contexte, source — Slack, ticket, brainstorm>
    ```
  - `epic.md` (regroupement, plus fourni) :
    ```yaml
    ---
    id: EPIC-<NNN>
    slug: <kebab-case>
    title: <titre court>
    status: draft           # draft | in-progress | mature | done
    created: <YYYY-MM-DD>
    updated: <YYYY-MM-DD>
    child-stories: []       # [STORY-NNN, ...]
    ---

    # <titre>

    ## Vision

    <1-3 phrases — but business / produit>

    ## Acceptance Criteria (haut niveau)

    - <critère mesurable au niveau epic>

    ## Stories enfants

    - [ ] STORY-NNN — <titre court>

    ## Notes
    ```
  - `roadmap.md` (singleton, kanban Now/Next/Later) :
    ```yaml
    ---
    id: roadmap-current
    slug: current
    title: Current Roadmap
    status: live
    updated: <YYYY-MM-DD>
    columns:
      - id: now
        label: "Now"
        epics: []
        standalone-stories: []
      - id: next
        label: "Next"
        epics: []
        standalone-stories: []
      - id: later
        label: "Later"
        epics: []
        standalone-stories: []
    ---

    # Notes

    <hypothèses, dépendances visibles, contexte trimestriel>
    ```
- **Comportement** : ces fichiers sont la **source canonique** du
  contenu embarqué. Toute modification ultérieure de leur contenu
  passe par ce dossier.
- **Tests** : aucun test direct ; validés par O2 (chargement) et O5
  (copie à l'init).

### O2 — Étendre `embed.FS` directive + 3 méthodes Loader

- **Module** : `internal/templates`
- **Fichier** : [internal/templates/templates.go:16](../../internal/templates/templates.go#L16)
- **Signature** :
  ```go
  //go:embed embedded/story.md embedded/analysis.md embedded/canvas-reasons.md embedded/tests.md embedded/inbox.md embedded/epic.md embedded/roadmap.md
  var embeddedFS embed.FS

  // LoadInbox returns the inbox template.
  func (l *Loader) LoadInbox() (string, Source, error) {
      return l.load("inbox.md")
  }

  // LoadEpic returns the epic template.
  func (l *Loader) LoadEpic() (string, Source, error) {
      return l.load("epic.md")
  }

  // LoadRoadmap returns the roadmap template.
  func (l *Loader) LoadRoadmap() (string, Source, error) {
      return l.load("roadmap.md")
  }
  ```
- **Comportement** : 3 nouvelles méthodes dédiées (cohérent avec le
  pattern fermé existant `LoadStory/LoadAnalysis/LoadCanvasReasons/LoadTests`).
  Chacune délègue à `l.load(name)` qui essaie d'abord
  `<projectDir>/templates/<name>` (project-first override) puis fallback
  `embedded/<name>`.
- **Tests** :
  - `TestLoader_LoadInbox_FromEmbed` — Loader sans `ProjectDir`,
    vérifie que `LoadInbox()` retourne `(content, SourceEmbedded, nil)`
    et que `content` contient le frontmatter `id: INBOX-<NNN>`
  - `TestLoader_LoadEpic_FromEmbed` — idem pour epic.md
  - `TestLoader_LoadRoadmap_FromEmbed` — idem pour roadmap.md
  - `TestLoader_LoadInbox_FromProject` — Loader avec `ProjectDir`
    contenant un `templates/inbox.md` custom, vérifie que `LoadInbox()`
    retourne `(content, SourceProject, nil)` avec le contenu custom
- **Référence testing** : [`spdd/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md)
  + [`spdd/methodology/testing/test-naming.md`](../methodology/testing/test-naming.md).

### O3 — Étendre `allowedKinds` (4 → 7 entries)

- **Module** : `internal/artifacts`
- **Fichier** : [internal/artifacts/lister.go:24](../../internal/artifacts/lister.go#L24)
- **Signature** :
  ```go
  var allowedKinds = []string{
      "stories",
      "analysis",
      "prompts",
      "tests",
      "inbox",
      "epics",
      "roadmap",
  }
  ```
- **Comportement** : `AllowedKinds()` retourne désormais 7 entries (copie
  fraîche). `ListArtifacts(dir, kind)` accepte les 3 nouveaux kinds et
  scanne le dossier correspondant ; les frontmatter sont parsés via la
  même struct `Meta` (champs supplémentaires comme `columns:` ou
  `child-stories:` ignorés silencieusement par `yaml.Unmarshal`).
- **Tests** :
  - `TestAllowedKinds_Returns7Entries` — `assert(len(AllowedKinds()) == 7)`
    avec ordre stable
  - `TestListArtifacts_Inbox` — fixture `<dir>/spdd/inbox/INBOX-001-foo.md`
    avec frontmatter Inbox valide → `Meta.ID == "INBOX-001"`,
    `Meta.Error == nil`
  - `TestListArtifacts_Epics` — fixture `EPIC-001-bar.md` valide
  - `TestListArtifacts_Roadmap` — fixture `roadmap/current.md` avec
    `columns: [...]` → `Meta.ID == "roadmap-current"`, `Meta.Error == nil`
    (vérifie que le frontmatter divergent ne casse pas le listing)
  - `TestListArtifacts_InvalidKind_Rejected` (existant, étendre) —
    `kind="invalid"` retourne `ErrInvalidKind`, et la liste d'erreur
    inclut les 7 nouveaux kinds dans son message
- **Référence testing** : [`spdd/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md).

### O4 — Étendre `spddSubdirs` (6 → 9 entries)

- **Module** : `internal/uiapp`
- **Fichier** : [internal/uiapp/app.go:54](../../internal/uiapp/app.go#L54)
- **Signature** :
  ```go
  var spddSubdirs = []string{
      "stories",
      "analysis",
      "prompts",
      "tests",
      "inbox",
      "epics",
      "roadmap",
      "methodology",
      "templates",
  }
  ```
- **Comportement** : `InitializeSPDD` itère sur ces 9 entries et
  appelle `os.MkdirAll(filepath.Join(dir, "spdd", sub), 0o755)`.
  Idempotent (existant).
- **Tests** : couverts par O5.

### O5 — Étendre la liste de templates copiés par `InitializeSPDD`

- **Module** : `internal/uiapp`
- **Fichier** : [internal/uiapp/app.go:228-237](../../internal/uiapp/app.go#L228-L237)
- **Signature** :
  ```go
  all := []tpl{
      {"story.md", loader.LoadStory},
      {"analysis.md", loader.LoadAnalysis},
      {"canvas-reasons.md", loader.LoadCanvasReasons},
      {"tests.md", loader.LoadTests},
      {"inbox.md", loader.LoadInbox},
      {"epic.md", loader.LoadEpic},
      {"roadmap.md", loader.LoadRoadmap},
  }
  ```
- **Comportement** : `InitializeSPDD` copie 7 templates (4 existants
  + 3 nouveaux) sous `<projectDir>/spdd/templates/` à chaque appel.
  `os.WriteFile` overwrite à chaque fois — le binaire embedded est la
  source de vérité (Invariant I4 existant).
- **Tests** :
  - `TestInitializeSPDD_Creates9Subdirs` — appelle `InitializeSPDD(tmpDir)`,
    vérifie l'existence de `<tmpDir>/spdd/{stories,analysis,prompts,tests,inbox,epics,roadmap,methodology,templates}`
  - `TestInitializeSPDD_Copies7Templates` — vérifie que
    `<tmpDir>/spdd/templates/` contient les 7 fichiers `.md`
    (`story.md`, `analysis.md`, `canvas-reasons.md`, `tests.md`,
    `inbox.md`, `epic.md`, `roadmap.md`)
  - `TestInitializeSPDD_PreExistingProject` — setup
    `<tmpDir>/spdd/stories/foo.md` (fichier d'artefact existant), appelle
    `InitializeSPDD`, vérifie que `<tmpDir>/spdd/stories/foo.md` existe
    toujours (non écrasé) et que les 3 nouveaux subdirs sont créés
    (couvre AC4)
  - `TestInitializeSPDD_Idempotent` (existant si présent) — 2 appels
    consécutifs n'écrasent pas un fichier custom dans
    `<tmpDir>/spdd/inbox/X.md`
- **Référence testing** : [`spdd/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md).

### O6 — Étendre `ShellMode` + `SPDD_KINDS` (frontend)

- **Module** : `frontend/src/stores`
- **Fichier** : [frontend/src/stores/shell.ts:5,9](../../frontend/src/stores/shell.ts#L5)
- **Signature** :
  ```ts
  export type ShellMode =
    | 'stories' | 'analysis' | 'prompts' | 'tests'
    | 'inbox' | 'epics' | 'roadmap'
    | 'settings' | 'workflow';

  const SPDD_KINDS: ShellMode[] = [
    'stories', 'analysis', 'prompts', 'tests',
    'inbox', 'epics', 'roadmap',
  ];
  ```
- **Comportement** : le store accepte 9 modes au total (7 SPDD kinds +
  `settings` + `workflow`). `SPDD_KINDS` (utilisé par le `setKind` de
  l'artifacts store, cf. shell.ts:46-47) inclut les 7 kinds.
- **Tests** :
  - `shell.test.ts` — assertion `expect(SPDD_KINDS).toHaveLength(7)` et
    `expect(SPDD_KINDS).toContain('inbox')` (idem epics, roadmap)
  - Type-checking : tout consommateur qui fait `switch (mode)
    { case 'stories': ... }` sans gérer les 3 nouveaux modes échouera
    en TypeScript (couverture exhaustive avec `Record<ShellMode, T>` en
    O7) — propagation automatique
- **Référence testing** : [`spdd/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O7 — Étendre `TITLES` (SidebarPanel) + `PRIMARY_ITEMS` (ActivityBar)

- **Module** : `frontend/src/components/hub`
- **Fichiers** :
  - [frontend/src/components/hub/SidebarPanel.tsx:7-14](../../frontend/src/components/hub/SidebarPanel.tsx#L7-L14)
    — map `TITLES` (titre du panneau de droite)
  - [frontend/src/components/hub/ActivityBar.tsx:17-23](../../frontend/src/components/hub/ActivityBar.tsx#L17-L23)
    — array `PRIMARY_ITEMS` (icônes de l'activity bar verticale style
    VS Code) **— oublié dans le canvas v1, ajouté en review post-impl**
- **Signature** :
  ```ts
  // SidebarPanel.tsx
  const TITLES: Record<ShellMode, string> = {
    stories: 'Stories', analysis: 'Analyses', prompts: 'Canvas', tests: 'Tests',
    inbox: 'Inbox', epics: 'Epics', roadmap: 'Roadmap',
    settings: 'Settings', workflow: 'Workflow',
  };

  // ActivityBar.tsx — icônes lucide-react (Inbox, Layers, Map)
  const PRIMARY_ITEMS: ActivityItem[] = [
    { mode: 'inbox', label: 'Inbox', Icon: Inbox },           // META-005
    { mode: 'stories', label: 'Stories', Icon: BookOpen },
    { mode: 'epics', label: 'Epics', Icon: Layers },          // META-005
    { mode: 'analysis', label: 'Analyses', Icon: Lightbulb },
    { mode: 'prompts', label: 'Canvas', Icon: FileText },
    { mode: 'tests', label: 'Tests', Icon: CheckSquare },
    { mode: 'roadmap', label: 'Roadmap', Icon: Map },         // META-005
    { mode: 'workflow', label: 'Workflow', Icon: Workflow },
  ];
  ```
- **Comportement** : l'ActivityBar (gauche, icônes) et la sidebar
  (droite, contenu) ont chacune leur source de modes. L'ActivityBar
  range les 8 items dans l'ordre discovery → delivery (Inbox d'abord,
  Roadmap juste avant Workflow). Le type `Record<ShellMode, string>`
  garantit l'exhaustivité côté `TITLES`.
- **Tests** :
  - Visual smoke (`wails dev -appargs ui`) : 8 icônes visibles dans
    l'activity bar verticale, click sur chacune affiche le titre
    correspondant dans le panneau
  - tsc clean : `Record<ShellMode, string>` compile sans erreur
- **Référence testing** : [`spdd/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md).

> **Note correction post-impl** : la version initiale du canvas ne
> mentionnait que `TITLES` ; en pratique l'ActivityBar (`PRIMARY_ITEMS`)
> est la 4e source de vérité frontend (en plus de `ShellMode`,
> `SPDD_KINDS`, `TITLES`). À ajouter aux Norms de cohérence dans une
> future itération si la spec doit être encore plus rigoureuse.

### O8 — Adapter les tests Go existants

- **Module** : `internal/artifacts`, `internal/uiapp`,
  `internal/templates` (tests)
- **Fichiers** :
  - `internal/artifacts/lister_test.go` — fixtures + assertions sur les
    7 kinds, scanner les 3 nouveaux dossiers
  - `internal/uiapp/app_test.go` — assertions sur les 9 subdirs et 7
    templates copiés
  - `internal/templates/templates_test.go` (si existe) — étendre
    pour les 3 nouvelles méthodes
- **Signature** : substitutions et ajouts de cas
- **Comportement** : `go test ./...` passe entièrement après update.
- **Tests** : c'est l'Operation de tests elle-même.

### O9 — Créer les 3 copies repo dans `spdd/templates/`

- **Module** : `spdd/templates/` (artefacts du repo yukki lui-même)
- **Fichiers** : `inbox.md`, `epic.md`, `roadmap.md` (copies identiques
  aux versions embedded créées en O1)
- **Signature** : copier le contenu de `internal/templates/embedded/{inbox,epic,roadmap}.md`
- **Comportement** : ces copies sont visibles dans l'arborescence du
  repo pour qu'un contributeur qui parcourt `spdd/templates/` voie les
  3 nouveaux templates sans avoir à exécuter `InitializeSPDD`. Elles
  jouent aussi le rôle de **project-first override** pour le repo
  yukki lui-même (cf. comportement de `Loader.load`).
- **Tests** : aucun test automatisé ; vérifier visuellement la
  cohérence avec O1 (même contenu).

### O10 — Documenter dans `CLAUDE.md`

- **Module** : repo root
- **Fichier** : `CLAUDE.md`
- **Modifications** :
  1. Étendre le **tableau "Préfixes d'id"** (section "Préfixes d'id —
     convention de nommage") avec 3 nouvelles lignes :
     ```markdown
     | `INBOX-<n>`   | inbox / capture brute (discovery zone) |
     | `EPIC-<n>`    | epic — regroupement thématique de stories |
     | `ROADMAP-<n>` | roadmap — vue projection (kanban Now/Next/Later) |
     ```
  2. Ajouter une **section "Hiérarchie discovery → delivery"** (avant
     ou après la section "Les 7 commandes SPDD") qui inclut le schéma
     ASCII de la story (chaîne Inbox → Story OU Epic → Stories ;
     Roadmap = vue projection) et le tableau de vocabulaire des 4
     artefacts.
- **Comportement** : un contributeur qui lit `CLAUDE.md` sait
  immédiatement (a) qu'il existe 3 nouveaux préfixes d'ID, (b) la
  chaîne discovery → delivery, (c) que la Roadmap est une vue, pas
  un container.
- **Tests** : grep `git grep -l "INBOX-" CLAUDE.md` retourne 1 ligne ;
  visual review pour le schéma.

### O11 — Documenter dans `spdd/README.md`

- **Module** : repo `spdd/`
- **Fichier** : `spdd/README.md`
- **Modifications** : ajouter une section sur la chaîne **discovery →
  delivery** (Inbox → Story ou Inbox → Epic → Stories) avec mention
  explicite de la place de la Roadmap (vue projection). Reprendre le
  schéma ASCII et le tableau vocabulaire.
- **Comportement** : la doc méthodologique du repo SPDD est cohérente
  avec `CLAUDE.md` ; un contributeur qui ouvre `spdd/README.md` voit
  les 4 niveaux d'artefact (au lieu d'un seul aujourd'hui).
- **Tests** : visual review.

---

## N — Norms

- **Triple-source de vérité étendue ensemble** : tout commit qui
  modifie l'un des 3 (allowedKinds, spddSubdirs, ShellMode/SPDD_KINDS)
  doit modifier les 3 dans le **même commit**. Sinon désync UI ↔
  backend.
- **Loader pattern fermé** : 1 méthode dédiée par template
  (`LoadInbox`, `LoadEpic`, `LoadRoadmap` cohérent avec `LoadStory`
  etc.). Pas de refactor générique `Load(name string)` dans cette
  story.
- **Schéma frontmatter Roadmap divergent accepté** : la struct `Meta`
  Go ne porte pas le champ `columns`. `yaml.Unmarshal` ignore
  silencieusement ce champ ; la roadmap est listée sans erreur, son
  rendu kanban dédié est `ROADMAP-001`. Aucune introduction d'une
  variante `RoadmapMeta` à ce stade.
- **Templates embedded canoniques** : `internal/templates/embedded/*.md`
  est la **source de vérité** du contenu (Invariant I4 existant).
  `spdd/templates/*.md` du repo yukki est une copie commit-trackée
  pour visibilité ; doit rester identique à l'embedded.
- **Tests Go** : naming `Test<Symbol>_<Behavior>` (cf.
  [`spdd/methodology/testing/test-naming.md`](../methodology/testing/test-naming.md)).
  Coverage cible des packages `internal/` : ≥ 70 % (existant).
  Tests de fixtures basés sur `t.TempDir()` pour isolation.
- **Tests frontend** : assertions sur l'existence des 7 kinds dans
  `SPDD_KINDS` et le matching `Record<ShellMode, T>` typé pour
  `TITLES` (compile-time exhaustivity, voir
  [`spdd/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md)).
- **Convention IDs nouveaux** : l'ordre dans `allowedKinds` est
  **stable** (4 historiques + 3 nouveaux à la fin) — toute consommation
  qui dépend de l'ordre (ex. tableau de tests) doit pouvoir lire en
  l'état.
- **Documentation** : `CLAUDE.md` reste la doc canonique pour les
  conventions ; `spdd/README.md` complète avec la pédagogie. Les deux
  doivent rester cohérents.

---

## S — Safeguards

- **Atomicité du commit triple-source**
  - Ne **jamais** committer un état où `allowedKinds.length != 7`,
    `spddSubdirs.length != 9`, ou `SPDD_KINDS.length != 7` : la sidebar
    UI montrerait un mode rejeté par le backend, ou un dossier non
    initialisé serait listé.
  - Ne **jamais** scinder Go vs frontend en 2 commits sur la même
    branche : la cohérence binding-frontend doit être garantie à
    chaque commit.

- **Schéma frontmatter Roadmap**
  - Ne **jamais** modifier la struct `Meta` pour y ajouter `columns:`
    dans cette story : changement non rétro-compatible qui casse les
    artefacts existants (stories/analysis/canvas/tests).
    `yaml.Unmarshal` ignore les champs en trop par design.
  - Ne **jamais** rejeter un fichier roadmap qui contient `columns:`
    bien formé (Roadmap rendue inutilisable). Le test
    `TestListArtifacts_Roadmap` doit explicitement vérifier qu'un
    fichier avec `columns: [...]` valide est listé sans `Meta.Error`.

- **Périmètre — out of scope**
  - Ne **jamais** introduire dans cette PR : (a) un workflow de
    promotion (Inbox → Epic) — `INBOX-002`, (b) une UX de capture
    rapide — `INBOX-001`, (c) une vue kanban de la Roadmap —
    `ROADMAP-001`, (d) un workflow de transitions de status d'epic —
    `ROADMAP-002`, (e) une variante `RoadmapMeta` typée Go, (f) un
    refactor générique du Loader, (g) une validation cross-cohérence
    (ex. vérifier que `Epic.child-stories[]` pointe vers des stories
    existantes).

- **Préservation des artefacts existants**
  - Ne **jamais** modifier le contenu des 4 templates existants
    (`story.md`, `analysis.md`, `canvas-reasons.md`, `tests.md`) en
    embedded ou en repo : aucun changement sémantique de l'existant
    n'est dans le scope.
  - Ne **jamais** rompre l'idempotence d'`InitializeSPDD` : un
    re-init sur un projet contenant des artefacts existants doit
    préserver tous les fichiers (`MkdirAll` + `WriteFile` overwrite
    seulement sur les templates, pas sur les artefacts custom).

- **Loader fail-fast**
  - Ne **jamais** ajouter un fichier à la liste de templates copiés
    par `InitializeSPDD` (O5) sans son équivalent dans la directive
    `//go:embed` (O2) : le binaire ne build pas ou plante au runtime
    avec `ErrEmbedMissing`. La compilation Go est le garde-fou.

- **Documentation cohérente**
  - Ne **jamais** committer un changement aux préfixes d'ID
    (`CLAUDE.md`) sans son pendant dans `spdd/README.md` : la doc
    diverge, les contributeurs apprennent des conventions
    contradictoires.
