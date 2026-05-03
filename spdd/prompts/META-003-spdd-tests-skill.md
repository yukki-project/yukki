---
id: META-003
slug: spdd-tests-skill
story: spdd/stories/META-003-spdd-tests-skill.md
analysis: spdd/analysis/META-003-spdd-tests-skill.md
status: reviewed
created: 2026-05-03
updated: 2026-05-03
---

# Canvas REASONS — Skill /spdd-tests (étape 6 SPDD)

> Spec exécutable consommée par `/spdd-generate`. Toute divergence
> code ↔ canvas se résout dans ce fichier d'abord.
>
> Story doc-only : 2 fichiers de procédure miroirs + maj 3 docs
> SPDD. Pattern cohérent avec les 7 skills SPDD existantes.

---

## R — Requirements

### Problème

Le workflow SPDD (cf. `spdd/README.md`) prévoit **6 étapes**, dont
la **6ᵉ — `/spdd-tests`** (génération de tests structurée à partir
d'un canvas REASONS) — n'est pas implémentée. Pas de
`.claude/commands/spdd-tests.md`, pas de `.github/skills/spdd-tests/`.
TEST-001 (cluster testing) a livré la méthodologie, META-003 livre
la skill qui la consomme.

### Definition of Done

- [ ] **`.claude/commands/spdd-tests.md`** créé, frontmatter
      conforme (`name: spdd-tests`, `description:` court (3-4
      phrases), `argument-hint: "<id-slug OU chemin vers
      spdd/prompts/...>"`, `user_invocable: true`).
- [ ] **`.github/skills/spdd-tests/SKILL.md`** créé, **miroir
      strict** de la command sauf orthographe `user-invocable: true`
      et chemins relatifs (`../../../` au lieu de `../../`).
- [ ] **9 étapes numérotées** dans le corps (cf. story Scope In) :
      Entrée → Charger artefacts → Audit existant → Audit pyramide
      → Audit anti-cheat → Génération tests manquants → Run suite
      → Rapport → Conclusion.
- [ ] **Annexe `## Annexe — Conventions par stack`** en tableau
      compact (D-D3) : 1 ligne par stack (Go, Java, Python, TS) avec
      colonnes Emplacement / Naming / Commande run / Lien
      project-doc.
- [ ] **`## Checklist avant de rendre la main`** finale
      (cohérent avec les 7 skills existantes).
- [ ] **Liens vers les refs cluster testing** TEST-001 dans le
      corps : `testing-frontend.md`, `testing-backend.md`,
      `coverage-discipline.md`, `test-naming.md`, `test-smells.md`,
      `mutation-testing.md`.
- [ ] **Format du rapport généré** documenté dans la skill (D-D4) :
      `spdd/tests/<id>-<slug>.md` avec frontmatter
      (`id`, `slug`, `canvas:`, `generated-at`, `status:` audit-only
      / generated / run-failed) + sections (Pyramide constatée,
      Tests générés, Coverage par module, Écarts vs canvas,
      Suggestions next-step).
- [ ] **Flag `--no-run`** documenté dans la skill comme
      échappement (cf. OQ3 → A).
- [ ] **Mention mutation testing comme "voir TEST-002"** seulement
      (OQ4 → A, hors scope V1 skill).
- [ ] **Best-effort sur échec de run** (OQ7 → A) — afficher
      l'échec mais finir l'audit.
- [ ] **Mises à jour documentaires** :
  - `spdd/methodology/README.md` — section "Cluster: testing"
    enrichie : `applies-to:` mentionne `spdd-tests` aux refs
    pertinentes (testing-frontend/backend, coverage-discipline,
    test-naming, test-smells).
  - `spdd/README.md` — étape 6 référencée comme implémentée
    (audit grep "étape 6" / "spdd-tests" / "tests unitaires" pour
    repérer les occurrences à patcher).
  - `spdd/GUIDE.md` — schéma ASCII reste valide ; le wording
    autour de l'étape 6 est mis à jour si "futur" / "à venir" /
    "prévu" est mentionné.
- [ ] **Pas de modification des 7 commands + 7 skills existantes**
      ni de leurs frontmatter (sauf si le grep révèle une mention
      `/spdd-tests` à patcher comme désormais implémenté).
- [ ] **Pas de code applicatif modifié** — story doc-only.
- [ ] **Cap longueur** : 250-350 lignes par fichier (command +
      skill). Si ça déborde, factoriser via liens.

---

## E — Entities

### Entités

| Nom | Description | Champs / sections clés | Cycle de vie |
|---|---|---|---|
| **Skill `/spdd-tests`** (nouvelle, 6ᵉ étape) | Procédure invocable qui consomme un canvas + refs testing pour générer/auditer la suite de tests | frontmatter + 9 étapes + annexe stack + checklist | persistante, consommée à chaque invocation |
| **Command Claude Code** (`.claude/commands/spdd-tests.md`) | Version invocable via `/spdd-tests <arg>` | `name: spdd-tests`, `user_invocable: true` | created par cette story |
| **Skill autoload** (`.github/skills/spdd-tests/SKILL.md`) | Miroir autoloadable | `user-invocable: true`, chemins `../../../` | created par cette story |
| **Rapport `spdd/tests/<id>-<slug>.md`** (format documenté, pas créé V1) | Sortie de la skill : frontmatter + sections audit/génération/coverage/écarts | sections fixes (cf. D-D4) | per-invocation, écrit par l'agent qui exécute la skill |
| **Refs cluster testing TEST-001** (existantes) | Méthodologie consommée par la skill | 9 refs dans `spdd/methodology/testing/` | livrée PR #10, immutable pour META-003 |
| **Workflow doc** (`spdd/README.md`, `spdd/GUIDE.md`, `spdd/methodology/README.md`) | Référencent l'étape 6 | tableau "Clusters disponibles", schéma flow, section workflow | modifiés par cette story (patches ciblés) |

### Relations

- `command` ⟷ `skill` : miroirs stricts, diff = orthographe `_` vs `-`
  + chemins relatifs.
- skill ⟶ refs TEST-001 : consommation par lien markdown.
- skill ⟶ rapport `spdd/tests/<id>-<slug>.md` : produit en sortie.
- skill ⟶ canvas REASONS : entrée (id-slug ou chemin).
- skill ⟶ `scripts/dev/test-local.sh` : référence opérationnelle Go
  pour le run de la suite (cf. annexe stack).
- workflow doc ⟶ skill : passage de "futur" à "implémentée".

### Invariants

- **I1** — **Doc-only** : aucun code applicatif modifié.
  Modifications exclusivement dans `.claude/commands/`,
  `.github/skills/`, `spdd/methodology/README.md`,
  `spdd/README.md`, `spdd/GUIDE.md`.
- **I2** — **Miroir strict** command/skill : sauf orthographe
  `user_invocable: true` (command) vs `user-invocable: true`
  (skill) et chemins relatifs (`../../` vs `../../../`),
  les 2 fichiers ont **un contenu identique** (même
  procédure, mêmes liens, même tonalité).
- **I3** — **Pas de duplication des refs TEST-001** : la skill
  pointe vers les refs via liens, ne réécrit pas les patterns.
- **I4** — **Skill stateless** : pas de mémoire entre
  invocations. Chaque invocation lit le canvas + les refs et
  produit un rapport ad-hoc.
- **I5** — **Validation entrée stricte** : canvas en `draft`
  ou `reviewed` → confirmation explicite (le code n'est
  peut-être pas généré). Canvas inexistant → erreur explicite
  avec proposition de skill upstream.
- **I6** — **Best-effort sur run** (OQ7 → A) : un échec de
  test ou de compilation **n'arrête pas** la skill — elle
  produit le rapport avec les échecs documentés. L'agent juge.
- **I7** — **Pas de moteur custom** : la skill est de la
  documentation procédurale. L'agent qui l'exécute (Claude /
  IDE / humain) génère les tests selon les patterns. Pas de
  Go/TS à écrire dans cette story.
- **I8** — **Mutation testing hors scope V1** (OQ4 → A) :
  la skill mentionne le concept et renvoie à
  `mutation-testing.md` + TEST-002 future. Pas de run
  effectif.

### Integration points

- **Pattern frontmatter** SPDD (cohérent 7 skills existantes).
- **Refs cluster testing** TEST-001 (consommation par lien).
- **Wrapper Go test** `scripts/dev/test-local.sh` (référence
  opérationnelle stack-aware Go).
- **`spdd/tests/`** dossier (existe, prêt à recevoir les
  rapports).
- **Workflow doc** SPDD (3 fichiers à patcher pour cohérence).

---

## A — Approach

### Y-Statement

> Pour résoudre **l'absence d'implémentation de la 6ᵉ étape du
> workflow SPDD (`/spdd-tests`) qui empêche d'opérationnaliser
> les refs méthodologiques TEST-001 livrées dans
> `spdd/methodology/testing/`**, on choisit **de créer 2 fichiers
> miroirs (`.claude/commands/spdd-tests.md` +
> `.github/skills/spdd-tests/SKILL.md`) qui décrivent une
> procédure prescriptive en 9 étapes (Entrée → Charger →
> Auditer existant → Auditer pyramide → Auditer anti-cheat →
> Générer manquants → Run → Rapporter → Conclure), avec annexe
> stack-aware en tableau compact, références aux refs TEST-001
> par lien markdown sans duplication, et de patcher les 3
> fichiers documentaires SPDD (`spdd/README.md`, `spdd/GUIDE.md`,
> `spdd/methodology/README.md`) pour passer la mention de
> l'étape 6 de "future" à "implémentée"**, plutôt que **(a)
> intégrer la procédure tests dans `/spdd-generate` (mélange
> code + tests + audit, viole single-responsibility), (b)
> écrire un moteur custom Go/TS qui automatise la génération
> de tests (over-engineering pour V1, divergence avec le
> pattern doc-only des autres skills SPDD), ou (c) reporter
> à plus tard sans clore le placeholder (workflow incomplet
> persistant)**, pour atteindre **un workflow SPDD 6 étapes
> complet, foundation pour une future intégration CI
> automatique (`/spdd-tests` post-`/spdd-generate`), et
> alignement opérationnel avec les refs méthodologiques
> TEST-001**, en acceptant **(a) un volume de skill plus
> important que la moyenne (~250-350 lignes vs ~120 pour les
> autres skills), justifié par la richesse de la procédure
> (audit + génération + run + rapport), et (b) la skill
> elle-même n'est pas testée par tests automatisés
> (cohérent avec les 7 autres skills SPDD qui sont validées
> par dry-run humain)**.

### Décisions d'architecture (toutes tranchées en revue 2026-05-03)

**Story-level (OQ1..OQ8)** :
- OQ1 → A : skill génère activement (pas juste audit)
- OQ2 → A : sauvegarde rapport markdown `spdd/tests/<id>-<slug>.md`
- OQ3 → A : run suite avec flag `--no-run` documenté
- OQ4 → A : mutation testing mentionné seulement
- OQ5 → A : tonalité prescriptive
- OQ6 → A : argument-hint cohérent `/spdd-api-test`
- OQ7 → A : best-effort avec rapport (pas fail-fast)
- OQ8 → A : peer review obligatoire avant merge

**Analysis-level (D-D1..D-D5)** :
- D-D1 → A : `argument-hint` court, flag `--no-run` dans le corps
- D-D2 → A : 9 étapes numérotées
- D-D3 → A : annexe par stack en tableau compact
- D-D4 → A : rapport avec frontmatter + sections structurées
- D-D5 → A : maj docs = audit grep + patches ciblés

### Alternatives écartées

- **Intégrer la procédure tests dans `/spdd-generate`** —
  viole single-responsibility, `/spdd-generate` devient
  monolithique.
- **Moteur custom (Go/TS)** qui automatise la génération —
  over-engineering, divergence avec les 7 skills existantes
  (toutes doc-only).
- **Reporter à plus tard** — placeholder workflow persistant,
  TEST-001 reste sous-utilisée.
- **Skill sans annexe stack-aware** — l'agent qui exécute n'a
  pas de guidance opérationnelle, doit deviner.
- **Skill avec annexe ultra-détaillée** (commandes
  complètes par stack) — datent vite, dupliquent TESTING.md.

---

## S — Structure

### Modules touchés

| Module | Fichiers | Nature |
|---|---|---|
| `.claude/commands/spdd-tests.md` | nouveau | command Claude Code, ~250-350 lignes |
| `.github/skills/spdd-tests/` | nouveau dossier | contient `SKILL.md` (~250-350 lignes), miroir command |
| `spdd/methodology/README.md` | modif faible | section "Cluster: testing" enrichie (`applies-to:` mentionne `spdd-tests`) |
| `spdd/README.md` | modif minimale | étape 6 désormais implémentée (patch grep ciblé) |
| `spdd/GUIDE.md` | modif minimale | wording autour de l'étape 6 ajusté si "futur"/"à venir" présent |
| `spdd/tests/.gitkeep` | inchangé | dossier prêt |
| `.claude/commands/spdd-{story,analysis,reasons-canvas,generate,api-test,prompt-update,sync}.md` | **nul** | non touchées |
| `.github/skills/spdd-{...}/SKILL.md` (7 existantes) | **nul** | non touchées |
| `spdd/methodology/testing/*.md` (9 refs TEST-001) | **nul** | consommées par lien, non modifiées |
| Code applicatif (Go, TS, frontend, backend) | **nul** | doc-only |
| `wails.json`, `main.go`, `cmd/`, `internal/` | **nul** | scope étranger |

### Schéma flow

```
Workflow SPDD avant META-003 :
  story → analysis → canvas → generate → [api-test] → ??? (étape 6 placeholder)

Workflow SPDD après META-003 :
  story → analysis → canvas → generate → [api-test] → /spdd-tests → rapport
                                                          │
                                                          ▼
                                       consume :
                                       - canvas REASONS (status implemented)
                                       - refs spdd/methodology/testing/ (TEST-001)
                                       - tests existants dans le repo
                                          │
                                          ▼
                                       audite :
                                       - 1. tests annoncés présents ?
                                       - 2. pyramide cohérente ?
                                       - 3. anti-cheat respectés ?
                                          │
                                          ▼
                                       génère manquants (proposé avant écriture)
                                          │
                                          ▼
                                       run suite (sauf --no-run)
                                          │
                                          ▼
                                       rapport spdd/tests/<id>-<slug>.md :
                                       - pyramide constatée
                                       - tests générés
                                       - coverage par module
                                       - écarts vs canvas
                                       - suggestions next-step
```

---

## O — Operations

> Ordre amont → aval. Chaque Operation livrable
> indépendamment (atomic commits possibles).

### O1 — Écrire `.claude/commands/spdd-tests.md`

- **Module** : `.claude/commands/`
- **Fichier** : `.claude/commands/spdd-tests.md` (nouveau)
- **Frontmatter** :
  ```yaml
  ---
  name: spdd-tests
  description: "Étape 6 du workflow SPDD : à partir d'un canvas REASONS implémenté, audite la suite de tests existante (présence, pyramide, anti-cheat coverage), génère les tests manquants conformes aux refs spdd/methodology/testing/, exécute la suite et produit un rapport dans spdd/tests/<id>-<slug>.md. Utilise après /spdd-generate pour valider la couverture testing du canvas."
  argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"
  user_invocable: true
  ---
  ```
- **Sections du corps** :
  1. `# /spdd-tests — <titre>` H1
  2. Paragraphe d'intro (rôle dans le workflow + référence
     `spdd/README.md`)
  3. `## Entrée` — argument format
  4. `## Étape 1 — Charger les artefacts` (story + analyse +
     canvas + refs methodology/testing/)
  5. `## Étape 2 — Valider le statut du canvas`
     (`implemented`/`synced` requis ; demander confirmation
     si `draft`/`reviewed`)
  6. `## Étape 3 — Audit des tests existants` (pour chaque
     Operation, vérifier que les tests annoncés sont
     présents)
  7. `## Étape 4 — Audit de la pyramide` (compter unit /
     intégration / e2e du module touché, comparer aux
     ratios cibles, lien vers `testing-frontend.md` /
     `testing-backend.md`)
  8. `## Étape 5 — Audit anti-cheat` (4 sous-points :
     mutation testing référence, test size limit, forbid
     patterns, coverage drift)
  9. `## Étape 6 — Générer les tests manquants` (pour
     chaque manque listé, proposer la génération + écrire
     en confirmation)
  10. `## Étape 7 — Run la suite` (sauf flag `--no-run`),
      best-effort sur échec
  11. `## Étape 8 — Rapport `spdd/tests/<id>-<slug>.md``
      (frontmatter + sections : pyramide constatée, tests
      générés, coverage, écarts, suggestions next-step)
  12. `## Étape 9 — Conclusion` (suggestions
      `/spdd-prompt-update` si Operation manque ses tests,
      `/spdd-sync` si refactor pur révélé, rien si tout
      aligné)
  13. `## Annexe — Conventions par stack` (tableau compact 4
      stacks : Go / Java / Python / TS)
  14. `## Checklist avant de rendre la main`
- **Cap longueur** : 250-350 lignes
- **Tests** : aucun automatisé. Validation : dry-run sur une
  feature SPDD existante du repo (cf. AC11).

### O2 — Écrire `.github/skills/spdd-tests/SKILL.md`

- **Module** : `.github/skills/spdd-tests/`
- **Fichiers** : nouveau dossier + `SKILL.md`
- **Comportement** :
  1. Cloner intégralement le contenu de
     `.claude/commands/spdd-tests.md`
  2. Patch ciblé :
     - `user_invocable: true` → `user-invocable: true`
       (orthographe différente, cohérent avec les 7 autres
       skills)
     - Tous les chemins relatifs `../../` → `../../../`
       (skills sont 1 niveau plus profond)
  3. Aucune autre modification (miroir strict).
- **Validation** : `diff` annoté pour confirmer que les
  seuls écarts sont l'orthographe + chemins.
- **Tests** : aucun.

### O3 — Mettre à jour `spdd/methodology/README.md`

- **Module** : `spdd/methodology/`
- **Fichier** : `spdd/methodology/README.md` (modif)
- **Comportement** :
  1. Dans la section `## Cluster: testing`, le tableau des 9
     refs : ajouter `spdd-tests` à la colonne `applies-to:`
     pour les refs pertinentes :
     - `testing-frontend.md` : `applies-to: ...spdd-generate, spdd-tests`
     - `testing-backend.md` : idem
     - `coverage-discipline.md` : idem
     - `test-naming.md` : idem
     - `test-smells.md` : idem
     - `mutation-testing.md` : idem (mais mention "consultée
       par /spdd-tests, exécutée par TEST-002 future")
  2. Pas de modif des autres tableaux.
- **Tests** : aucun. Validation manuelle.

### O4 — Mettre à jour `spdd/README.md`

- **Module** : `spdd/`
- **Fichier** : `spdd/README.md` (modif minimale)
- **Comportement** :
  1. `grep -n "étape 6\|spdd-tests\|tests unitaires\|template-driven"
     spdd/README.md` pour identifier les occurrences
  2. Patcher chaque mention de l'étape 6 comme "future" /
     "à venir" / "prévue" → "implémentée" / "disponible".
  3. Si le README a un schéma de flow ASCII listant les 6
     étapes, vérifier que `/spdd-tests` est référencée
     comme step 6.
- **Tests** : aucun.

### O5 — Mettre à jour `spdd/GUIDE.md`

- **Module** : `spdd/`
- **Fichier** : `spdd/GUIDE.md` (modif minimale)
- **Comportement** :
  1. Le schéma ASCII à `~ligne 127-129` (étape 6) reste
     valide tel quel ; vérifier qu'il référence bien
     `/spdd-tests` et `spdd/tests/<id>-<slug>.md`.
  2. Si du wording autour parle de l'étape 6 comme
     placeholder, l'ajuster (cohérent avec O4).
  3. Si le GUIDE a une table récapitulative des 6 skills,
     y ajouter `/spdd-tests`.
- **Tests** : aucun.

### O6 — Vérification dry-run sur une feature existante

- **Module** : transverse (validation)
- **Comportement** :
  1. Choisir une feature SPDD existante du repo (UI-008 ou
     TEST-001 idéalement, qui ont des tests Go).
  2. **Lire mentalement** la skill `/spdd-tests` étape par
     étape comme si on l'invoquait.
  3. Vérifier qu'à chaque étape, la procédure est applicable
     **sans ambiguïté** : un agent doit pouvoir suivre les 9
     étapes sans inférer.
  4. Si une étape demande une décision non couverte par la
     skill, **arrêter** et patcher la skill avant de continuer.
- **Tests** : ce dry-run **est** le test de la skill.
- **Critère de succès** : la skill est lisible et applicable
  par un agent (humain ou IA) sans contexte oral
  supplémentaire.

### O7 — Audit final

- **Module** : transverse
- **Comportement** :
  1. **Audit miroir** : `diff .claude/commands/spdd-tests.md
     .github/skills/spdd-tests/SKILL.md` ne montre que
     l'orthographe `user_invocable`/`user-invocable` et les
     chemins `../../` vs `../../../`. Pas d'autre divergence.
  2. **Audit longueur** : `wc -l` sur les 2 fichiers ≤ 350.
  3. **Audit liens** : grep sur les liens markdown des 2
     fichiers, vérifier qu'ils résolvent à des fichiers
     existants (refs TEST-001, scripts, autres docs SPDD).
  4. **Audit pas de régression** : `git diff main..HEAD --
     ':!.claude/commands/spdd-tests.md' ':!.github/skills/spdd-tests' ':!spdd/'`
     ne montre rien (aucun fichier hors scope modifié).
  5. **Audit grep "étape 6"** : aucune mention résiduelle de
     "future" / "à venir" pour l'étape 6.
- **Tests** : ces audits sont les tests de cette story
  (cohérent avec doc-only, comme TEST-001).

---

## N — Norms

- **Markdown propre** : H1 unique pour le titre, H2 pour les
  sections principales, H3+ pour sous-sections.
- **Frontmatter YAML** : indentation cohérente, strings entre
  guillemets si caractères spéciaux. `description:` court mais
  complet (rôle + entrée + sortie).
- **Liens internes** : chemins relatifs depuis le fichier qui
  contient le lien.
- **Citations refs TEST-001** : par lien markdown direct
  (`[testing-frontend.md](../../spdd/methodology/testing/testing-frontend.md)`).
- **Tonalité prescriptive** (cf. OQ5 → A) : étapes numérotées,
  "STOP and signal" si invariant cassé, cohérent avec les 7
  autres skills.
- **Pas de framework spécifique mentionné dans le corps de la
  skill** : les outils par stack restent dans l'annexe (en
  tableau compact, 1 ligne par stack).
- **Langue** : français (cohérent avec les 7 autres skills).
- **Convention de commit** : `feat(spdd):` pour la création de
  la skill ; `docs(spdd):` pour les patches docs.

---

## S — Safeguards

> Limites non-négociables.

- **Pas de modification des 7 commands + 7 skills SPDD existantes
  (Invariant I1)** — leurs frontmatter, contenu, emplacement
  restent intacts.
- **Pas de code applicatif modifié (Invariant I1)** — `internal/`,
  `cmd/`, `frontend/src/`, `wails.json`, `main.go`,
  `package.json`, etc. : 0 changement.
- **Pas de duplication des refs TEST-001 (Invariant I3)** — la
  skill pointe vers les refs via liens, ne réécrit pas les
  patterns. Si tentation de réexpliquer, **arrêter** et raccourcir.
- **Pas de moteur custom (Invariant I7)** — la skill est de la
  documentation procédurale. Pas de Go/TS écrit dans cette
  story. Si une étape semble obliger à écrire du code applicatif,
  signaler la contradiction.
- **Pas de mutation testing exécuté (Invariant I8)** — V1
  mention seulement, lien `mutation-testing.md` + TEST-002
  future. Pas d'invocation de `go-mutesting`/Stryker dans la
  skill.
- **Miroir strict command/skill (Invariant I2)** — sauf
  orthographe et chemins relatifs, les 2 fichiers ont contenu
  **identique**. Si divergence subtile s'introduit,
  audit `diff` final la rattrape.
- **Cap longueur 350 lignes** — si un fichier dépasse,
  factoriser via liens, ne pas pousser le cap.
- **Pas de feature flag, pas de retro-compat fictive** — la
  skill est écrite comme si elle existait depuis le début.
- **Best-effort sur échec de run (Invariant I6)** — un test qui
  fail n'arrête pas la skill, elle finit le rapport.
- **Pas de modification de `spdd/templates/`, `spdd/stories/`,
  `spdd/analysis/`, `spdd/prompts/` autres** — sauf cette
  story / analyse / canvas eux-mêmes.

---

## Changelog

- **2026-05-03 — création** — canvas v1 issu de l'analyse
  META-003 reviewed. 8 OQs (story) + 5 D-D (analyse) toutes en
  reco par défaut. 7 Operations livrables (1 command + 1 skill
  + 3 maj docs + 1 dry-run + 1 audit). 8 invariants Safeguards.
