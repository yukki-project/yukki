---
id: META-004
slug: rename-spdd-to-dot-yukki
story: spdd/stories/META-004-rename-spdd-to-dot-yukki.md
status: reviewed
created: 2026-05-03
updated: 2026-05-03
---

# Analyse — Renommer `spdd/` en `.yukki/` et `/spdd-*` en `/yukki-*`

> Contexte stratégique pour `META-004-rename-spdd-to-dot-yukki`. Produit
> par `/spdd-analysis` à partir d'un scan ciblé du codebase
> (10 mots-clés × 7 modules, délégué à un subagent Explore vu la surface).
> Ne duplique ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`spdd` (chaîne littérale) · `/spdd-` (pattern slash command) ·
`InitializeSPDD` (entrée Go) · `applies-to` (cross-ref methodology) ·
`artifacts.NewWriter` / `ListArtifacts` (Go path) · `embed.FS` (templates) ·
`Invariant I1` (path-isolation sécurité) · frontmatter `story:` / `analysis:` ·
composants frontend (`ProjectPicker`, `NewStoryModal`,
`CreateNextStageModal`, `WorkflowPipeline`) · `spdd/research` (gitignored).

## Concepts de domaine

> Modélisation au sens [`spdd/methodology/domain-modeling.md`](../methodology/domain-modeling.md)
> (Entity / Value Object / Invariant / Integration / Domain Event).

### Existants (déjà dans le code)

- **Project tree (Entity)** — Arbo `<projectDir>/spdd/{stories,analysis,prompts,templates,tests}`
  créée par `app.InitializeSPDD` ([internal/uiapp/app.go:206-253](../../internal/uiapp/app.go#L206-L253)).
  Le segment `"spdd"` apparaît littéralement à 6 endroits dans `app.go`
  (L160, L217, L243, L267, L269, L272) et 1 endroit dans
  [internal/artifacts/lister.go:72](../../internal/artifacts/lister.go#L72).

- **Artifact path (Value Object)** — Chemin canonique
  `<projectDir>/spdd/<kind>/<id>-<slug>.md` produit par `ListArtifacts`
  et `artifacts.NewWriter`. Le segment `"spdd"` est en dur, non
  paramétré.

- **Path-isolation (Invariant I1)** — Tout `ReadArtifact` doit résoudre
  sous `<projectDir>/spdd/` ([app.go:267-272](../../internal/uiapp/app.go#L267-L272)).
  Test associé : `TestReadArtifact_*` dans `app_test.go`. La sécurité du
  rename dépend de basculer **simultanément** la string `"spdd"` dans le
  prefix-check et dans tous les `filepath.Join` qui produisent des
  chemins.

- **Embedded templates (Value Object)** — 4 templates `.md` embarqués
  via `//go:embed embedded/story.md embedded/analysis.md embedded/canvas-reasons.md embedded/tests.md`
  dans `internal/templates/templates.go:16`. Le segment "spdd" n'apparaît
  **pas** dans la directive embed ; seule la **cible runtime de la copie**
  (`<projectDir>/spdd/templates/`) en dépend.

- **Cross-reference frontmatter (Value Object)** — Champ
  `story: spdd/stories/<id>.md` / `analysis: spdd/analysis/<id>.md`
  présent dans le frontmatter de chaque artefact (stories, analysis,
  canvas). **54 occurrences** distribuées sur 13 stories + 13 analysis
  + 13 canvas.

- **Methodology applies-to (Value Object)** — Champ
  `applies-to: [spdd-analysis, spdd-reasons-canvas, …]` dans le
  frontmatter des refs. **17 fichiers methodology** mentionnent
  `applies-to`, **6 combinaisons uniques**, **7 skills cités**
  (`spdd-{story,analysis,reasons-canvas,prompt-update,generate,sync,tests}`).

- **Skill artifact (Entity)** — 8 skills × 2 emplacements miroir :
  `.claude/commands/spdd-*.md` (Claude Code) et
  `.github/skills/spdd-*/SKILL.md` (Copilot). **~477 occurrences** du
  pattern `/spdd-` dans les corps (auto-citation et citations entre skills).

- **Frontend slash-command labels (Value Object)** — Mapping
  `kind → /spdd-<verbe> <args>` dans
  [CreateNextStageModal.tsx:16-19](../../frontend/src/components/workflow/CreateNextStageModal.tsx#L16-L19)
  et mention textuelle ligne 166 de
  [WorkflowPipeline.tsx](../../frontend/src/components/workflow/WorkflowPipeline.tsx#L166).

### Nouveaux (à introduire)

**Aucun concept domaine nouveau.** META-004 est un rename de convention,
pas une évolution sémantique : aucune nouvelle entité, value object, ou
invariant n'apparaît. Tous les concepts existants gardent leur sémantique,
seule la **chaîne** qui les référence change.

## Approche stratégique

> Format Y-Statement selon [`spdd/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** l'incohérence entre le nom de l'outil (`yukki`) et le
nom du dossier de travail / des commandes (`spdd/`, `/spdd-*`),
**on choisit** un **rename mécanique atomique en un seul commit** —
dossier `spdd/` → `.yukki/` via `git mv`, 8 skills `spdd-*` → `yukki-*`
(double miroir Claude/Copilot), ~477 substitutions textuelles dans le
corps des artefacts et 54 cross-refs frontmatter, 6 sites Go de chemins
en dur, 4 composants frontend — **plutôt qu'**une migration progressive
avec compat ascendante (`lit aussi spdd/`) **et plutôt qu'**un rename
limité au seul dossier (commands inchangés), **pour atteindre** une
cohérence outil totale (le dossier `.yukki/` et les commandes `/yukki-*`
forment un même contrat) et une bascule immédiate sans état intermédiaire,
**en acceptant** un commit volumineux (~100 fichiers touchés, ~570+
substitutions) et la non-compatibilité totale avec les projets utilisateurs
encore sur `spdd/` (acceptable car le projet est en dev, cf. story
Scope Out).

**Alternatives écartées** :

- **Migration progressive avec compat ascendante** (lit `spdd/` ET
  `.yukki/`) — Rejetée : double layout = dette permanente, projet en
  dev sans utilisateurs externes installés, cf. story OQ #3 résolue.
- **Rename dossier seul, commands `/spdd-*` inchangées** — Rejetée :
  incohérence outil persistante (`.yukki/` côté fichiers, `/spdd-*`
  côté interaction) ; le SPIDR de la story trace la non-scindabilité
  axe Interfaces.
- **Rename + introduction d'une variable d'env / config (`YUKKI_DIR`)** —
  Rejetée : sur-ingénierie ; pas de besoin actuel d'un dossier configurable,
  et ça déplace le problème (la string par défaut reste à choisir).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp` (app.go) | fort | modif de 6 sites `"spdd"` (chemins + Invariant I1 + messages d'erreur) |
| `internal/artifacts` (lister.go) | fort | modif d'1 site `"spdd"` (`ListArtifacts`) |
| Tests Go (`app_test.go`, `lister_test.go`, `tests/integration/`) | moyen | modif fixtures + assertions (3 fichiers) |
| `internal/templates` (templates.go) | faible | aucune modif code (templates non liés à la string `"spdd"`) |
| `internal/{templates,workflow,provider,artifacts}/doc.go` | faible | modif commentaires de référence |
| `frontend/src/components/hub` | moyen | 2 strings affichées (`NewStoryModal`, `ProjectPicker`) |
| `frontend/src/components/workflow` | moyen | mapping `/spdd-* → /yukki-*` (`CreateNextStageModal`, `WorkflowPipeline`) |
| `.claude/commands/` | fort | rename 8 fichiers + ~half de 477 substitutions internes |
| `.github/skills/` | fort | rename 8 dossiers + miroir des substitutions internes |
| `spdd/` (devient `.yukki/`) | fort | `git mv` + 54 cross-refs frontmatter + 17 `applies-to` + ~half de 477 ref `/spdd-` |
| Configs racine | moyen | 95 occurrences distribuées (`.gitignore` 1, `.golangci.yml` 1, `CLAUDE.md` 45, `DEVELOPMENT.md` 8, `TODO.md` 27, `docs/testing.md` 14) |

## Dépendances et intégrations

- **`embed.FS`** ([internal/templates/templates.go:16](../../internal/templates/templates.go#L16))
  — embed côté **source** inchangé (les `.md` restent dans
  `internal/templates/embedded/`) ; seul l'emplacement runtime de copie
  change.
- **`git mv` pour préservation d'historique** — Le rename du dossier
  `spdd/ → .yukki/` et des 8 skills doit passer par `git mv` pour que
  `git log --follow` continue de marcher. Sinon git interprète add+delete
  et le blame est perdu sur ~80 fichiers.
- **Filesystem case-sensitivity (Windows)** — Le dev tourne sous Windows
  (NTFS, case-insensitive). `git mv spdd .yukki` fonctionne mais la
  casse exacte du nouveau nom dépend de la commande passée.
- **Aucune API externe / aucun CRD / aucun service tiers**.

## Risques et points d'attention

> Catégories selon [`spdd/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md)
> (Sécurité avec STRIDE / Performance / Opérationnel / Intégration / Data /
> Compatibilité).

- **Sécurité — Tampering (STRIDE)** : l'Invariant I1 de path-isolation
  ([app.go:267-272](../../internal/uiapp/app.go#L267-L272)) repose sur
  un check préfixe `<projectDir>/spdd/`. Si une seule des 6 occurrences
  `"spdd"` dans `app.go` n'est pas mise à jour en `".yukki"`, le check
  diverge des `filepath.Join` et un `ReadArtifact` peut soit refuser un
  chemin légitime, soit (pire) accepter un chemin hors sandbox.
  *Impact : élevé* (path traversal). *Probabilité : moyenne*
  (6 sites cohérents nécessaires). *Mitigation* : un seul `const yukkiDirName = ".yukki"`
  partagé entre `app.go` et `lister.go`, et test
  `TestReadArtifact_OutsideProject` ([app_test.go:330+](../../internal/uiapp/app_test.go#L330))
  adapté + un cas explicite "chemin sous l'ancien `spdd/`" qui doit
  échouer.

- **Data — Cohérence cross-refs** : 54 frontmatter `story:` / `analysis:`
  + 17 `applies-to` + ~477 mentions `/spdd-` dans le corps des artefacts
  → ~570 substitutions textuelles. Une seule omission produit un lien
  cassé ou une référence à un skill inexistant.
  *Impact : moyen* (UX dégradée, pas de crash). *Probabilité : élevée*
  (rename mécanique massif). *Mitigation* : grep final `git grep -n "spdd"`
  qui doit revenir à zéro hors d'une whitelist explicite (ex. mention
  historique "anciennement `spdd/`" dans un changelog).

- **Intégration — Embed runtime** : la cible de copie passe de
  `<projectDir>/spdd/templates/` à `<projectDir>/.yukki/templates/`
  ([app.go:243](../../internal/uiapp/app.go#L243)). Si les tests d'init
  (`TestInitializeSPDD_*` dans `app_test.go`) ne basculent pas leur
  assertion en parallèle, ils peuvent passer en vert sur l'ancien chemin
  et masquer une régression.
  *Impact : moyen* (init silencieusement cassée). *Probabilité : faible*
  (1 site en code, ~3 sites en tests). *Mitigation* : tests greppés en
  même temps que le code, aucune string `"spdd"` ne doit subsister dans
  `*_test.go`.

- **Opérationnel — Atomicité du commit** : ~100 fichiers en un seul
  commit est lourd à reviewer ; tentation de scinder par catégorie
  (Go, frontend, skills, artefacts), ce qui casserait l'atomicité (cf.
  SPIDR Notes story).
  *Impact : moyen* (cohérence repo entre commits intermédiaires).
  *Probabilité : moyenne*. *Mitigation* : un seul commit non-négociable ;
  la PR description liste les catégories pour faciliter la review en
  sections (Go / frontend / skills / artefacts / configs).

- **Opérationnel — Préservation `git mv`** : un `mv` shell perd
  l'historique git ; un `git mv` sur le dossier complet préserve le
  blame mais peut être interprété comme rename + modify si les contenus
  changent dans le même commit (heuristique git ≥50 %).
  *Impact : faible* (perte du blame sur certains fichiers). *Probabilité :
  moyenne*. *Mitigation* : faire le `git mv` du dossier **avant** les
  substitutions textuelles dans le même commit, ou idéalement scinder
  en 2 commits (1. `git mv` pur, 2. substitutions) **strictement
  dans la même branche pour rester atomique au merge**.

## Cas limites identifiés

> Selon [`spdd/methodology/edge-cases.md`](../methodology/edge-cases.md)
> (BVA + EP + checklist 7 catégories).

- **Préfixe `.` dans l'explorateur de fichiers** — `.yukki/` masqué par
  défaut dans Windows Explorer (option "afficher les fichiers cachés")
  et certains éditeurs. Vérifier que VSCode + Wails dev workflow
  navigue correctement dans le dossier après `git mv`.

- **Projet sans `.yukki/` ni `spdd/`** — Couvert par AC6 de la story.
  `ProjectPicker` doit afficher le nouveau message "Selected directory
  has no `.yukki/` subtree" et la modale d'init doit pointer vers
  `.yukki/stories/` dans `NewStoryModal`.

- **Auto-citation résiduelle dans un skill renommé** — Un fichier
  `.claude/commands/yukki-story.md` qui citerait encore `/spdd-analysis`
  dans son corps casse la cohérence outil. Le grep final `/spdd-`
  doit revenir à zéro.

- **Liens markdown relatifs profonds** — Les artefacts utilisent des
  liens du type `[invest.md](../methodology/invest.md)` (profondeur
  relative à `spdd/stories/`). Comme l'arbo interne de `.yukki/` est
  identique à `spdd/`, ces liens restent valides. Risque : un lien
  *absolu* `spdd/methodology/...` (pas de `../`) devient mort. À
  greper spécifiquement.

- **`.gitignore` `/spdd/research/`** — Doit devenir `/.yukki/research/`.
  Le contenu `spdd/research/` (50 000 mots locaux non commités) doit
  être déplacé manuellement avant `git mv` (sinon il devient untracked
  sous l'ancien path après le mv).

## Decisions à prendre avant le canvas

- [ ] **Stratégie d'exécution** : un seul commit avec `git mv` puis
  substitutions, ou 2 commits liés (1. `git mv` pur préservant blame
  parfait, 2. substitutions) sur la même branche pour atomicité au
  merge. **Recommandation analyse** : 2 commits dans la même PR — meilleure
  préservation du blame, atomicité préservée par la PR.

- [ ] **Outil de substitution** : un seul script `sed -i` racine
  (rapide, gros risque) vs script ad-hoc avec passes différenciées par
  catégorie (Go strings vs markdown body vs frontmatter) vs édition
  manuelle ciblée. **Recommandation analyse** : script bash dédié
  versionné dans `scripts/migrate/` avec passes typées + dry-run, supprimé
  après merge.

- [ ] **Constante Go partagée** : introduire `const yukkiDirName = ".yukki"`
  dans un package commun (où ?) pour éviter la string en dur dans
  `app.go` ET `lister.go`, ou laisser la string dupliquée. **Recommandation
  analyse** : introduire la constante dans le package qui expose
  `InitializeSPDD` (ou `internal/artifacts`), pour fermer la porte à
  une future divergence des 7 sites. Le canvas Operations doit indiquer
  où.

- [ ] **Renommer aussi `InitializeSPDD` en `InitializeYukki`** ? La
  fonction Go porte le nom de la méthode ; après le rename, l'asymétrie
  est étrange. **Recommandation analyse** : oui, renommer en
  `InitializeYukki` (et le fichier `internal/uiapp/app.go` reste, mais
  le commentaire L206 + la fonction sont mises à jour). À traiter dans
  le canvas Operations comme un sous-axe explicite.
