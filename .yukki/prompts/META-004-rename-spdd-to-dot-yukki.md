---
id: META-004
slug: rename-spdd-to-dot-yukki
story: .yukki/stories/META-004-rename-spdd-to-dot-yukki.md
analysis: .yukki/analysis/META-004-rename-spdd-to-dot-yukki.md
status: draft
created: 2026-05-03
updated: 2026-05-03
---

# Canvas REASONS — Renommer `spdd/` en `.yukki/` et `/yukki-*` en `/yukki-*`

> Spec exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Le projet `yukki` stocke ses artefacts dans un dossier `spdd/` et expose
ses commandes via `/yukki-*`, alors que ces deux noms portent celui de la
**méthode** et non de l'**outil**. On veut basculer atomiquement sur la
convention outil — dossier `.yukki/` + commandes `/yukki-*` — sans compat
ascendante (projet en dev).

### Definition of Done

- [ ] DoD1 — `.yukki/` existe à la racine, contient l'arbo complète de
  l'ancien `spdd/`, et `spdd/` n'existe plus (couvre AC1)
- [ ] DoD2 — `app.InitializeYukki` (nouveau nom) crée
  `<projectDir>/.yukki/{stories,analysis,prompts,templates,tests}` et
  l'Invariant I1 (path-isolation) refuse les chemins hors `<projectDir>/.yukki/`
  (couvre AC2)
- [ ] DoD3 — Tous les frontmatter `story:` / `analysis:` et tous les
  liens markdown internes pointent vers `.yukki/...` (couvre AC3)
- [ ] DoD4 — Les 8 skills existent en `.claude/commands/yukki-*.md` et
  `.github/skills/yukki-*/SKILL.md` (rename via `git mv`), leur corps
  référence `.yukki/...` et leurs auto-citations utilisent `/yukki-*`
  (couvre AC4)
- [ ] DoD5 — `go test ./...` passe ; aucune string `"spdd"` ne subsiste
  dans les sources Go (`*.go`) (couvre AC5)
- [ ] DoD6 — `ProjectPicker` affiche "no `.yukki/` subtree" et propose
  l'init quand aucun `.yukki/` ni `spdd/` n'est présent (couvre AC6)
- [ ] DoD7 — Le mapping `kind → /yukki-<verbe>` est appliqué dans
  `CreateNextStageModal.tsx` et `WorkflowPipeline.tsx` ; aucune occurrence
  `/yukki-` n'apparaît dans le rendu (couvre AC7)
- [ ] DoD8 — `git grep -n "\bspdd\b"` revient à zéro hors d'une whitelist
  documentée (mention historique, lien externe vers l'article SPDD)
- [ ] DoD9 — `wails dev` lance l'app, le hub s'ouvre sur un projet
  fraîchement réinitialisé en `.yukki/`, la création d'une story passe

---

## E — Entities

> Aucune entité métier nouvelle. META-004 est un rename de convention,
> pas une évolution sémantique. Les entités existantes (Project tree,
> Artifact path, Skill artifact, Cross-reference) gardent leur sémantique ;
> seul le **token** qui les nomme bascule.

### Entités (rappel — inchangées sémantiquement)

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Project tree` | Arbo `<projectDir>/.yukki/{stories,analysis,prompts,templates,tests}` | racine `.yukki/`, sous-dirs fixes | créé par `InitializeYukki`, idempotent |
| `Artifact path` | Chemin canonique `<projectDir>/.yukki/<kind>/<id>-<slug>.md` | `kind ∈ AllowedKinds()`, `id`, `slug` | écrit par `artifacts.NewWriter`, lu par `ListArtifacts` |
| `Skill artifact` | Skill SPDD nommé `yukki-<verbe>` | nom (`yukki-story`, `yukki-analysis`, …), corps Markdown | présent en double miroir (Claude / Copilot) |
| `Cross-reference` | Frontmatter `story:` / `analysis:` / `applies-to:` | chemin relatif vers `.yukki/...` ou nom de skill `yukki-<verbe>` | écrit à la création de l'artefact, mis à jour si renommage |

### Relations

- `Skill artifact` ⟶ `Skill artifact` (1..N) : auto-citations dans le corps
  (ex. `yukki-analysis` cite `/yukki-story` et `/yukki-reasons-canvas`)
- `Methodology ref` ⟶ `Skill artifact` (1..N) : via `applies-to:` frontmatter
- `Artifact (analysis|prompt|tests)` ⟶ `Story` (1..1) : via `story:` frontmatter

---

## A — Approach

> Reprend l'Y-Statement de l'analyse — repris ici comme rappel exécutable.

**Rename mécanique atomique en une seule PR, en deux commits préservant
le blame** :

1. **Commit 1 — `git mv` pur** : déplace physiquement le dossier `spdd/ → .yukki/`
   et les 16 skills (8 Claude + 8 Copilot) `spdd-* → yukki-*`. Aucun
   contenu n'est touché → `git log --follow` reste exploitable et la
   heuristique de rename git (≥50 % similarité) joue à plein.

2. **Commit 2 — substitutions de contenu** : remplace toutes les
   références internes (`"spdd"` Go → `artifacts.ProjectDirName`,
   `/yukki-* → /yukki-*` dans skills et frontend, `spdd/...` → `.yukki/...`
   dans frontmatter et corps des artefacts, `applies-to: [spdd-*]` →
   `[yukki-*]` dans methodology, `InitializeSPDD → InitializeYukki`).

L'atomicité est garantie par la PR (un seul merge-commit ; pas d'état
intermédiaire dans `main`). Les deux commits sont préservés à l'historique
pour faciliter `git log --follow` après merge.

Une **constante partagée** `artifacts.ProjectDirName = ".yukki"` est
introduite dans `internal/artifacts/dirname.go` (nouveau fichier court).
Elle est consommée par `internal/artifacts/lister.go` (en local) et
`internal/uiapp/app.go` (via import). Cela ferme la porte à une future
divergence des 7 sites Go aujourd'hui codés en dur.

### Alternatives considérées

- **Migration progressive avec compat ascendante** (lit `spdd/` ET
  `.yukki/`) — Rejetée : double layout = dette permanente, pas
  d'utilisateurs externes installés.
- **Rename dossier seul, commands `/yukki-*` inchangées** — Rejetée :
  incohérence outil persistante, SPIDR axe Interfaces non-scindable
  dans la story.
- **Un seul commit (mv + subst)** — Rejetée : la heuristique git rename
  peut basculer add+delete si la similarité passe sous 50 % après
  substitutions massives (~570 sur les artefacts) → blame perdu.
- **Variable d'env `YUKKI_DIR` configurable** — Rejetée : sur-ingénierie,
  pas de besoin actuel.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/artifacts` | `dirname.go` (nouveau), `lister.go` | create + modify |
| `internal/uiapp` | `app.go`, `app_test.go` | modify (6 sites + rename `InitializeSPDD → InitializeYukki`) |
| `internal/{templates,workflow,provider,artifacts}` | `doc.go` (4 fichiers) | modify (commentaires) |
| Tests Go | `internal/artifacts/lister_test.go`, `tests/integration/story_integration_test.go`, `ui_mock.go` | modify (fixtures + assertions) |
| `frontend/src/components/hub` | `NewStoryModal.tsx`, `ProjectPicker.tsx` | modify (2 strings) |
| `frontend/src/components/workflow` | `CreateNextStageModal.tsx`, `WorkflowPipeline.tsx` | modify (mapping `/yukki-*`) |
| `.claude/commands/` | `yukki-*.md` (8 fichiers) | rename + modify body |
| `.github/skills/` | `yukki-*/SKILL.md` (8 dossiers) | rename + modify body |
| `.yukki/` (ex-`spdd/`) | tout l'arbo (~80 fichiers `.md`) | rename + modify (frontmatter + body) |
| Configs racine | `.gitignore`, `.golangci.yml`, `CLAUDE.md`, `DEVELOPMENT.md`, `TODO.md`, `docs/testing.md` | modify |

### Schéma de flux

```
   PR META-004
   ├── Commit 1 : git mv (rename pur)
   │     ├── git mv spdd .yukki
   │     ├── git mv .claude/commands/yukki-X.md → yukki-X.md  (×8)
   │     └── git mv .github/skills/yukki-X     → yukki-X     (×8)
   │
   └── Commit 2 : substitutions de contenu
         ├── O2 : add internal/artifacts/dirname.go (const ProjectDirName)
         ├── O3 : update Go runtime (app.go, lister.go) — use const
         ├── O4 : update Go tests + doc comments
         ├── O5 : update frontend (4 fichiers)
         ├── O6 : rewrite skill bodies (16 fichiers)
         ├── O7 : rewrite artifact frontmatter cross-refs (~39 fichiers)
         ├── O8 : rewrite methodology applies-to (17 fichiers)
         ├── O9 : rewrite artifact body content (~80 fichiers)
         ├── O10 : update root configs (6 fichiers)
         └── O11 : final verification (tests + grep + UI smoke)
```

---

## O — Operations

> Décomposition exécutable. Les Operations sont ordonnées en 2 commits
> (cf. Approach) : O1 = commit 1 (rename pur), O2..O11 = commit 2
> (substitutions). `/yukki-generate` doit produire les 2 commits dans
> cet ordre.

### O1 — Rename physique : `git mv spdd .yukki` + 16 skills

- **Module** : repo root, `.claude/commands/`, `.github/skills/`
- **Fichiers** : tout `spdd/` ; 8 fichiers `.claude/commands/yukki-*.md` ;
  8 dossiers `.github/skills/yukki-*/`
- **Commandes** :
  ```bash
  git mv spdd .yukki
  for f in story analysis reasons-canvas generate api-test prompt-update sync tests; do
    git mv ".claude/commands/yukki-$f.md" ".claude/commands/yukki-$f.md"
    git mv ".github/skills/yukki-$f"      ".github/skills/yukki-$f"
  done
  ```
- **Comportement** : exclusivement des renames physiques, **aucun
  contenu modifié**. Le commit 1 doit être committé tel quel pour que
  git enregistre proprement les renames (similarité 100 %).
- **Tests** :
  - `git status --short` après `git mv` : toutes les lignes commencent par `R` (rename) ou `R100` (rename 100 % similar), aucune ligne `??` (untracked) ni `D` (delete)
  - `git diff --stat HEAD~1 HEAD` post-commit : `0 insertions(+), 0 deletions(-)` sur les renames purs
  - Aucun test Go ne tourne à cette étape (le code pointe encore `spdd/`,
    intentionnel — la suite passe **après commit 2**)

### O2 — Constante `artifacts.ProjectDirName = ".yukki"`

- **Module** : `internal/artifacts`
- **Fichier** : `internal/artifacts/dirname.go` (nouveau, ~10 lignes)
- **Signature** :
  ```go
  package artifacts

  // ProjectDirName is the canonical name of the per-project directory
  // that holds yukki artifacts (stories, analysis, prompts, templates,
  // tests). It is the single source of truth for path construction and
  // path-isolation checks (see uiapp.App.ReadArtifact, Invariant I1).
  const ProjectDirName = ".yukki"
  ```
- **Comportement** : constante exportée, immutable. Importée par
  `uiapp/app.go` via `artifacts.ProjectDirName` ; consommée localement
  par `lister.go` via `ProjectDirName` (même package).
- **Tests** : aucune assertion directe — la constante est validée par
  les tests des Operations qui la consomment (O3, O4).
- **Référence testing** : règles de naming et anti-cheat coverage selon
  [`.yukki/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md).

### O3 — Use const `ProjectDirName` dans le code Go runtime

- **Module** : `internal/artifacts`, `internal/uiapp`
- **Fichiers** : `internal/artifacts/lister.go:72` ;
  `internal/uiapp/app.go:160, 217, 243, 267, 269, 272`
- **Signatures impactées** :
  ```go
  // internal/artifacts/lister.go (in-package, just ProjectDirName)
  target := filepath.Join(dir, ProjectDirName, kind)

  // internal/uiapp/app.go (cross-package, artifacts.ProjectDirName)
  a.writer = artifacts.NewWriter(filepath.Join(dir, artifacts.ProjectDirName, "stories"))
  // ... idem pour les 5 autres sites
  prefix, err := filepath.Abs(filepath.Join(a.projectDir, artifacts.ProjectDirName))
  return "", fmt.Errorf("resolve project yukki prefix: %w", err)   // L269
  return "", fmt.Errorf("path outside project yukki: %s", absPath) // L272
  ```
- **Comportement** : remplace **tous** les segments littéraux `"spdd"`
  par la constante. Met à jour les 2 messages d'erreur (L269, L272) en
  remplaçant "spdd" → "yukki". Renomme la fonction
  `InitializeSPDD → InitializeYukki` (signature `func (a *App) InitializeYukki(dir string) error`),
  met à jour la doc comment L206-210 et le log L250 (`a.logger.Info("yukki initialized", "dir", dir)`).
- **Tests** :
  - L'Invariant I1 doit rester strict : un test
    `TestReadArtifact_OutsideYukkiDir` (renommé depuis l'ancien
    `TestReadArtifact_OutsideProject`) injecte un chemin sous
    `<projectDir>/spdd/...` (l'ancien) et **doit échouer** avec l'erreur
    "path outside project yukki"
  - Les tests existants `TestInitializeSPDD_*` doivent être renommés en
    `TestInitializeYukki_*` et leurs assertions vérifient que l'arbo
    créée est `<dir>/.yukki/{stories,analysis,prompts,templates,tests}`
- **Référence testing** : [`.yukki/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md)
  + [`.yukki/methodology/testing/test-naming.md`](../methodology/testing/test-naming.md)
  pour le renommage des tests.

### O4 — Tests Go + doc comments

- **Module** : `internal/uiapp`, `internal/artifacts`, `tests/integration`,
  `internal/{templates,workflow,provider,artifacts}/doc.go`, `ui_mock.go`
- **Fichiers** : `internal/uiapp/app_test.go` (lignes 31, 181, 195, 265, 271, 301, 330, 343, 349, 357, 409, 434) ;
  `internal/artifacts/lister_test.go` (lignes 14, 140, 154, 177) ;
  `tests/integration/story_integration_test.go` (ligne 16) ;
  `internal/templates/doc.go` (l. 22) ; `internal/workflow/doc.go` (l. 14) ;
  `internal/provider/doc.go` (l. 20) ; `internal/artifacts/doc.go` (l. 26) ;
  `ui_mock.go` (l. 53)
- **Signature** : substitutions textuelles
  - `"spdd"` → `artifacts.ProjectDirName` (dans les calls Go) **OU**
    `".yukki"` (dans les fixtures où ré-importer la const seulement pour
    1 test serait du bruit ; choisir au cas par cas, la const reste
    obligatoire pour le code de prod)
  - `.yukki/stories/...` → `.yukki/stories/...` dans les chaînes de
    commentaire et messages
- **Comportement** : `go test ./...` passe ; `go vet ./...` clean ;
  `golangci-lint run` clean.
- **Tests** : la suite existante après update doit passer, ainsi qu'un
  nouveau cas dans `TestReadArtifact_OutsideYukkiDir` qui injecte
  `<projectDir>/spdd/x.md` (l'ancien chemin) et vérifie le rejet (cf. O3).
- **Référence testing** : [`.yukki/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md).

### O5 — Frontend : strings dossier + slash commands

- **Module** : `frontend/src/components/{hub,workflow}`
- **Fichiers** :
  - `frontend/src/components/hub/NewStoryModal.tsx:157` —
    `.yukki/stories/` → `.yukki/stories/`
  - `frontend/src/components/hub/ProjectPicker.tsx:72` —
    `spdd/` → `.yukki/`
  - `frontend/src/components/workflow/CreateNextStageModal.tsx:16-19` —
    mapping `kind → /yukki-<verbe>` :
    ```ts
    stories:  () => '/yukki-story <description>',
    analysis: (p) => `/yukki-analysis ${p}`,
    prompts:  (p) => `/yukki-reasons-canvas ${p}`,
    tests:    () => '/yukki-tests <id-slug> (V2)',
    ```
  - `frontend/src/components/workflow/WorkflowPipeline.tsx:166` —
    `/yukki-story` → `/yukki-story`
- **Comportement** : les libellés affichés dans l'UI sont alignés
  outil ; aucun comportement runtime ne change (les valeurs ne sont pas
  parsées ailleurs).
- **Tests** :
  - Tests composants existants doivent passer après update (assertions
    sur les libellés rendus)
  - Smoke test manuel via `wails dev` : lancer le hub sans projet → le
    `ProjectPicker` annonce "no `.yukki/` subtree" ; ouvrir le workflow
    de pipeline → les 4 boutons "Create next stage" affichent
    `/yukki-*`
- **Référence testing** : [`.yukki/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O6 — Skill bodies (Claude + Copilot)

- **Module** : `.claude/commands/`, `.github/skills/`
- **Fichiers** : 16 (8 fichiers `.claude/commands/yukki-*.md` + 8
  fichiers `.github/skills/yukki-*/SKILL.md` ; déjà renommés en O1)
- **Substitutions** :
  - `.yukki/templates/` → `.yukki/templates/`
  - `.yukki/methodology/` → `.yukki/methodology/`
  - `.yukki/stories/` → `.yukki/stories/` (et `analysis/`, `prompts/`,
    `tests/`)
  - `/yukki-` → `/yukki-` (auto-citations + cross-citations entre skills)
  - mention "SPDD directory" dans les commentaires de doc → "yukki
    directory" si elle pointait clairement vers le dossier
- **Comportement** : les skills lisent les templates depuis
  `.yukki/templates/...`, écrivent dans `.yukki/<kind>/...`, et leur
  texte cite `/yukki-*` partout.
- **Tests** :
  - Grep : `git grep -nE "(/yukki-|spdd/(templates|methodology|stories|analysis|prompts|tests))" .claude/ .github/skills/` → 0
  - Miroir Claude/Copilot : pour chaque verbe, un `diff` côte-à-côte
    `.claude/commands/yukki-X.md` vs `.github/skills/yukki-X/SKILL.md`
    montre uniquement les écarts attendus (frontmatter `user_invocable`
    vs `user-invocable`, profondeur de chemin relatif, mention `Explore`
    vs `#codebase`)
- **Référence testing** : pas de test automatisé ; vérification par
  grep et revue manuelle (cf. CLAUDE.md règle non-négociable #4).

### O7 — Frontmatter cross-refs `story:` / `analysis:`

- **Module** : `.yukki/{stories,analysis,prompts,tests}/`
- **Fichiers** : ~39 artefacts (13 stories + 13 analysis + 13 canvas
  + tests s'ils existent)
- **Substitutions** :
  - `story: .yukki/stories/` → `story: .yukki/stories/`
  - `analysis: .yukki/analysis/` → `analysis: .yukki/analysis/`
- **Comportement** : tous les frontmatter pointent vers la nouvelle arbo.
- **Tests** :
  - Grep : `git grep -nE "^(story|analysis): spdd/" .yukki/` → 0
  - Yaml-parse smoke : `yq` parse chaque `.md` sans erreur sur le
    frontmatter

### O8 — Methodology `applies-to:` (skills renommés)

- **Module** : `.yukki/methodology/` (incl. sous-dossier `testing/`)
- **Fichiers** : 17 fichiers methodology
- **Substitutions** : pour chacun des 7 noms cités —
  `yukki-story → yukki-story`, `yukki-analysis → yukki-analysis`,
  `yukki-reasons-canvas → yukki-reasons-canvas`, `yukki-prompt-update →
  yukki-prompt-update`, `yukki-generate → yukki-generate`,
  `yukki-sync → yukki-sync`, `yukki-tests → yukki-tests`
- **Comportement** : les `applies-to:` listent les skills sous leur
  nouveau nom, cohérent avec O6 (skill bodies renommés) et O1 (fichiers
  renommés).
- **Tests** :
  - Grep : `git grep -nE "applies-to:.*spdd-" .yukki/methodology/` → 0
  - Le set des skills cités après substitution = `{yukki-story,
    yukki-analysis, yukki-reasons-canvas, yukki-prompt-update,
    yukki-generate, yukki-sync, yukki-tests}` (vérifié par script ad-hoc
    ou inspection)

### O9 — Body content des artefacts (~477 références)

- **Module** : `.yukki/` (tout l'arbo : stories, analysis, prompts,
  methodology, README, GUIDE, et templates si applicable)
- **Fichiers** : ~80 fichiers `.md`
- **Substitutions** :
  - `/yukki-` → `/yukki-` (≈400+ occurrences dans les corps)
  - `.yukki/methodology/` → `.yukki/methodology/`
  - `.yukki/stories/` → `.yukki/stories/` (idem analysis/prompts/tests/templates)
  - `.yukki/README.md` → `.yukki/README.md` (et `GUIDE.md`)
  - mentions textuelles littérales "le dossier `spdd/`" → "le dossier
    `.yukki/`" (sauf dans les passages historiques explicitement
    documentés ou whitelist `<<<voir whitelist DoD8>>>`)
- **Comportement** : les artefacts sont cohérents avec le nouveau nom
  outil ; leurs liens markdown relatifs continuent de résoudre (l'arbo
  interne est inchangée).
- **Tests** :
  - Grep résiduel : `git grep -n "\bspdd\b" .yukki/` retourne uniquement
    la whitelist (lien externe vers article SPDD martinfowler.com,
    mention historique dans un changelog dédié)
  - Inspection visuelle de 3 stories au hasard : tous les liens
    `[texte](.yukki/...)` sont cliquables (les chemins relatifs résolvent)

### O10 — Configs racine

- **Module** : repo root + `docs/`
- **Fichiers** :
  - `.gitignore` (1 ligne : `/spdd/research/` → `/.yukki/research/`)
  - `.golangci.yml` (1 commentaire : référence à `.yukki/stories/CORE-002...`)
  - `CLAUDE.md` (45 occurrences — la grosse majorité dans le body
    "démarche SPDD", à traiter au cas par cas : les mentions de la
    **méthode** SPDD restent ; les chemins `spdd/...` deviennent
    `.yukki/...` ; les commandes `/yukki-*` deviennent `/yukki-*`)
  - `DEVELOPMENT.md` (8 lignes — chemins + workflow)
  - `TODO.md` (27 lignes — chemins + commandes)
  - `docs/testing.md` (14 lignes — refs methodology + workflow `/yukki-tests`)
- **Substitutions** : alignées sur O9 (mêmes règles)
- **Comportement** : le repo est cohérent de bout en bout ; un nouveau
  contributeur lisant `CLAUDE.md` voit la convention `.yukki/` + `/yukki-*`.
- **Tests** :
  - `cat .gitignore | grep yukki` : ligne `/.yukki/research/` présente
  - Visual diff sur `CLAUDE.md` pour s'assurer que la **méthode** SPDD
    est encore mentionnée (vocabulaire, articles, INVEST/SPIDR/etc.)
    mais que les chemins et commandes basculent

### O11 — Vérification finale (gate avant merge)

- **Module** : repo entier
- **Fichier** : aucun (Operation de validation)
- **Commandes** :
  ```bash
  go test ./...
  go vet ./...
  golangci-lint run
  cd frontend && pnpm test  # ou npm/yarn selon convention projet
  git grep -n "\bspdd\b"     # doit retourner whitelist seulement
  git grep -nE "/yukki-"      # doit retourner 0
  wails dev                   # smoke manuel : hub + workflow + init
  ```
- **Comportement** : sortie obligatoire = tous les checks passent ; le
  grep résiduel retourne **uniquement** la whitelist documentée
  (lien externe martinfowler.com vers l'article SPDD, et mention
  pédagogique de la méthode dans les corps de skills/README qui
  citent SPDD comme nom de méthode — pas comme chemin).
- **Tests** : c'est l'Operation de tests elle-même.
- **Référence testing** : [`.yukki/methodology/testing/coverage-discipline.md`](../methodology/testing/coverage-discipline.md)
  pour la stratégie de gate (smoke + grep + suites unitaires) avant
  merge.

---

## N — Norms

- **Constante unique** : tout chemin Go qui mentionne le dossier outil
  passe par `artifacts.ProjectDirName` (jamais de string `".yukki"` en
  dur en dehors de ce fichier `dirname.go`).
- **Préservation `git mv`** : tout rename de fichier ou dossier passe
  par `git mv` (pas `mv` shell). Les renames sont committés **avant**
  les substitutions de contenu (commit 1 vs commit 2) pour que git
  enregistre la similarité 100 %.
- **Miroir Claude / Copilot** : toute modification d'un skill
  `.claude/commands/yukki-X.md` est répliquée à l'identique (modulo
  les écarts autorisés CLAUDE.md règle #4) dans
  `.github/skills/yukki-X/SKILL.md`.
- **Tests Go** : naming et structure conformes à
  [`.yukki/methodology/testing/testing-backend.md`](../methodology/testing/testing-backend.md)
  + [`.yukki/methodology/testing/test-naming.md`](../methodology/testing/test-naming.md).
  Les tests doivent porter le nom du nouveau symbole
  (`TestInitializeYukki_*`, `TestReadArtifact_OutsideYukkiDir`).
- **Tests frontend** : changements de libellés vérifiés par les tests
  composants existants (cf.
  [`.yukki/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md)).
- **Logging** : message d'init `slog.Info` passe de `"spdd initialized"`
  à `"yukki initialized"`.
- **Whitelist explicite** : la liste des occurrences `spdd` autorisées
  après merge est documentée en commentaire dans la PR description
  (typiquement : lien externe martinfowler.com + mention pédagogique
  "SPDD = Structured Prompt-Driven Development" dans `CLAUDE.md` /
  `.yukki/README.md`).

---

## S — Safeguards

- **Atomicité PR**
  - Ne **jamais** merger commit 1 (rename pur) sans commit 2 (substitutions)
    sur `main` : le repo serait dans un état où le code Go pointe
    `spdd/` mais le dossier est `.yukki/` → init et toutes les commandes
    cassées.
  - Ne **jamais** scinder en 2 PR séparées (cf. SPIDR Notes story —
    convention dossier + commands forme un même contrat indivisible).

- **Sécurité — Tampering (Invariant I1)**
  - Ne **jamais** laisser un site `filepath.Join(..., "spdd", ...)` en
    dur dans le code Go. Le check `strings.HasPrefix(absPath, prefix)`
    et la construction de `prefix` doivent utiliser **la même** valeur
    (`artifacts.ProjectDirName`).
  - Ne **jamais** désactiver ou alléger le test `TestReadArtifact_OutsideYukkiDir` :
    il doit rejeter explicitement les chemins sous l'**ancien**
    `<projectDir>/spdd/...` après bascule.

- **Cohérence cross-refs**
  - Ne **jamais** committer un état où `git grep -nE "/yukki-"` retourne
    > 0 hors whitelist : un seul skill mal renommé casse la chaîne de
    citations.
  - Ne **jamais** committer un `applies-to:` qui mélange `spdd-X` et
    `yukki-Y` dans la même liste (cohérence frontmatter requise par
    l'éventuel futur linter).

- **Préservation historique git**
  - Ne **jamais** faire un `mv` shell sur le dossier `spdd/` ou les
    skills : l'historique git serait perdu (add+delete au lieu de
    rename). Toujours `git mv`.
  - Ne **jamais** modifier le contenu d'un fichier dans le **même**
    commit que son `git mv` : la similarité chute sous 50 % et git
    bascule en add+delete (cf. Approach — c'est pourquoi 2 commits).

- **Périmètre**
  - Ne **jamais** introduire dans cette PR : (a) une variable d'env
    `YUKKI_DIR` configurable, (b) une compat ascendante "lit aussi
    `spdd/`", (c) un renommage du module Go `github.com/yukki-project/yukki`,
    (d) une évolution sémantique de la méthode SPDD elle-même —
    tous explicitement Scope Out de la story.
  - Ne **jamais** toucher au contenu des templates embarqués
    (`internal/templates/embedded/*.md`) : ces 4 fichiers ne mentionnent
    pas `"spdd"` et leur sémantique est hors scope.

- **Whitelist disciplinée**
  - Ne **jamais** étendre la whitelist `spdd` par commodité : chaque
    mention restante doit être justifiée (lien externe, mention
    pédagogique de la méthode) et listée explicitement dans la PR
    description.
