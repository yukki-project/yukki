---
id: META-003
slug: spdd-tests-skill
story: spdd/stories/META-003-spdd-tests-skill.md
status: reviewed
created: 2026-05-03
updated: 2026-05-03
---

# Analyse — META-003 — Skill /spdd-tests (étape 6)

> Story doc-only : crée 2 fichiers miroirs (`commands` + `skills`)
> + maj 3 fichiers documentaires (READMEs + GUIDE). Pattern
> cohérent avec les 7 skills SPDD existantes. La story a tranché
> 8 OQs en reco A. Cette analyse complète avec les D-D
> architecturales révélées par le scan des skills existantes.

## Mots-clés métier extraits

`commands SPDD`, `skills SPDD` (autoload), `frontmatter` (`name`,
`description`, `argument-hint`, `user_invocable`/`user-invocable`),
`miroir command-skill`, `étape 6 workflow`, `audit pyramide`,
`audit anti-cheat`, `génération tests manquants`, `run suite`,
`rapport coverage`, `prompt de tests` (`spdd/tests/`),
`refs cluster testing` (consommation).

## Concepts de domaine

### Existants (déjà dans le code)

- **`.claude/commands/spdd-*.md`** — 7 commands SPDD existantes,
  toutes avec frontmatter `name: spdd-<step>`, `description: "..."`,
  `argument-hint: "..."`, `user_invocable: true`. Longueurs
  88-153 lignes (sweet spot ~120). Pattern de référence le plus
  proche : `spdd-api-test.md` (117 lignes) — étape 5b qui a un
  rôle d'audit + génération d'artefact comme META-003.
- **`.github/skills/spdd-*/SKILL.md`** — 7 skills miroirs des
  commands, frontmatter quasi-identique sauf
  `user-invocable: true` (orthographe différente, un trait
  d'union au lieu d'un underscore). Chemins relatifs ajustés
  (`../../../` au lieu de `../../`) parce que les skills sont
  dans un sous-dossier supplémentaire.
- **Pattern de structure** (cf. `spdd-api-test.md`) :
  1. Frontmatter
  2. `# /spdd-X — <titre>` H1
  3. Paragraphe d'intro (rôle dans le workflow + référence
     `spdd/README.md`)
  4. `## Entrée` — argument format
  5. `## Étape 1`, `## Étape 2`, ... — étapes numérotées (5-9
     selon la complexité)
  6. `## Checklist avant de rendre la main` — bullets de
     validation
- **Workflow SPDD documenté** :
  - `spdd/README.md` — overview workflow + lien vers methodology
  - `spdd/GUIDE.md` — schéma ASCII du flow + détails
    pédagogiques. Mention "étape 6 — tests unitaires
    (template-driven)" ligne ~127-129 avec placeholder
    `[prompt de tests] spdd/tests/<id>-<slug>.md`.
  - `spdd/methodology/README.md` — convention catégorisation
    + clusters disponibles (TEST-001 livré).
- **Cluster testing TEST-001** — 9 refs livrées dans
  `spdd/methodology/testing/`. La skill META-003 les consomme
  via les liens markdown dans son corps.
- **`spdd/tests/`** — dossier déjà créé (vide, avec `.gitkeep`).
  Réservé pour les rapports de tests générés par `/spdd-tests`.
- **`scripts/dev/test-local.sh`** (fix BASH_SOURCE livré PR #12)
  — wrapper Go test avec AV-workaround. Référence opérationnelle
  pour le run effectif côté Go (cf. `docs/testing.md`).

### Nouveaux (à introduire)

- **`.claude/commands/spdd-tests.md`** — nouvelle command,
  ~150-300 lignes (un peu plus longue que la moyenne car la
  procédure a 9 étapes + annexe stack-aware).
- **`.github/skills/spdd-tests/SKILL.md`** — miroir, **identique**
  sauf orthographe `user-invocable` et chemins relatifs.
- **`spdd/tests/<id>-<slug>.md`** — format de rapport généré
  par la skill (pas créé en V1, mais documenté dans la skill).
  Frontmatter et structure à définir dans la skill elle-même.
- **Mises à jour documentaires** (3 fichiers) :
  - `spdd/README.md` — passage de la mention "étape 6 future"
    à "étape 6 implémentée" (probablement minimal — le README
    actuel ne dit pas "future" explicitement, à vérifier).
  - `spdd/GUIDE.md` — la section sur l'étape 6 reste valide,
    le placeholder `[prompt de tests]` devient produit par la
    skill plutôt qu'à venir.
  - `spdd/methodology/README.md` — la table "Clusters
    disponibles" doit-elle référencer la skill ?
    Probablement non (table = catégories de refs, pas de
    skills). Mais le tableau "Cluster: testing" devrait
    indiquer que `/spdd-tests` est désormais consommatrice.

## Approche stratégique

META-003 est une story **structurellement simple** mais
**procédurellement riche** : 2 fichiers de procédure à écrire,
qui décrivent ce qu'un agent (humain ou IA) fait quand il
invoque la skill. La complexité est dans **le contenu de la
procédure** (9 étapes bien pensées), pas dans la mécanique du
fichier.

Stratégie en 3 temps :

1. **Écrire la command `.claude/commands/spdd-tests.md`** d'abord
   (canonique). Étapes 1-9 + annexe stack-aware + checklist
   finale. Tonalité prescriptive (cf. OQ5 → A) cohérente avec
   les 7 existantes.
2. **Cloner en skill `.github/skills/spdd-tests/SKILL.md`** avec
   sed-style replace : `user_invocable` → `user-invocable`,
   `../../` → `../../../` pour les chemins relatifs.
3. **Patcher les 3 docs** (README + GUIDE + methodology README)
   pour refléter que l'étape 6 est implémentée.

**Risque-clé** : volume de la skill. La procédure a 9 étapes,
chacune potentiellement longue (audit anti-cheat = 4 sous-étapes
internes). Plafonner à **350 lignes max** (cf. story OQ5 et
risque pressenti). Si on déborde, factoriser en référençant les
refs `spdd/methodology/testing/` plutôt que dupliquer.

**Pas de moteur custom** : la skill décrit la procédure, l'agent
(qui exécute la skill) génère les tests selon les patterns. Pas
de Go ou TS à écrire dans cette story.

## Modules impactés

| Module | Fichiers | Nature |
|---|---|---|
| `.claude/commands/spdd-tests.md` | nouveau | command Claude Code, ~250-350 lignes |
| `.github/skills/spdd-tests/SKILL.md` | nouveau | miroir skill autoload, ~250-350 lignes |
| `spdd/methodology/README.md` | modif minimale | mention `/spdd-tests` parmi les skills consommatrices du cluster testing |
| `spdd/README.md` | modif minimale | clarification que l'étape 6 est implémentée (si phrasing actuel le suggère "futur") |
| `spdd/GUIDE.md` | modif minimale | idem, schéma ASCII inchangé (déjà valide), juste le wording autour si besoin |
| `spdd/tests/.gitkeep` | inchangé | dossier prêt pour la skill |
| Les 7 commands + 7 skills existantes | **nul** | non touchées |
| Refs cluster testing TEST-001 | **nul** | consommées via liens, non modifiées |
| Code applicatif (Go, TS, frontend) | **nul** | story doc-only |
| `wails.json`, `main.go`, `cmd/`, `internal/` | **nul** | scope étranger |

## Dépendances et intégrations

- **TEST-001 mergée** (cluster testing 9 refs) — sans elle, la
  skill n'a pas de méthodo à consommer. ✓ Statut : implémenté
  (PR #10 mergée le 2026-05-03).
- **Pattern frontmatter** (cohérent avec les 7 skills
  existantes) — pas de divergence.
- **`scripts/dev/test-local.sh`** (PR #12 mergée) — référence
  opérationnelle Go pour la skill (étape "run la suite").
  Statut : robuste (BASH_SOURCE fix).
- **`spdd/tests/`** — dossier de destination du rapport
  généré. Existe déjà (`.gitkeep`).

## Risques et points d'attention

- **Volume de la skill** *(prob. moyenne, impact lisibilité)* —
  9 étapes + annexe + checklist peut déraper à 400+ lignes.
  Mitigation : cap à 350 lignes, factorisation dans les refs
  TEST-001 plutôt que duplication.
- **Drift command/skill** *(prob. faible, impact bug subtil)* —
  les 2 fichiers doivent rester strictement miroirs. Mitigation :
  écrire la command d'abord, cloner avec patch ciblé
  (orthographe + chemins). Audit final via `diff` annoté.
- **Phrasing "étape 6 future" vs "implémentée"** *(prob. faible,
  impact cohérence doc)* — il faut grep tous les fichiers SPDD
  pour repérer où l'étape 6 est marquée comme à venir, et
  patcher.
- **Procédure trop abstraite ou trop concrète** *(prob.
  moyenne, impact utilisabilité)* — si la skill est trop
  abstraite (juste des "audit", "génère"), l'agent qui exécute
  manque de guidance. Si trop concrète (commandes Go/TS
  hardcodées), elle devient stack-specific. Mitigation :
  procédure abstraite + annexe stack-aware concrète, séparées.
- **Commandes par stack qui datent** *(prob. faible, impact
  maintenance)* — si on hardcode `npm test:coverage` dans
  l'annexe, ça peut diverger des choix de TESTING.md. Mitigation :
  l'annexe pointe vers TESTING.md / TEST-002 plutôt que
  dupliquer.
- **Skill trop bavarde sur la pyramide** *(prob. moyenne,
  impact volume)* — la pyramide est déjà couverte par
  testing-{frontend,backend}.md. La skill ne doit pas la
  redocumenter, juste la référencer. Mitigation : règle stricte
  "1 lien par concept, pas de réexplication".

## Cas limites identifiés

- **Canvas en `draft` ou `reviewed`** : la skill demande
  confirmation avant de continuer (cf. AC6). Si l'utilisateur
  insiste, elle continue mais signale qu'elle audite contre un
  code potentiellement absent.
- **Canvas sans Operations** (théorique) : skill arrête
  immédiatement avec erreur "no operations to test".
- **Operation sans tests annoncés dans le canvas** : skill
  signale et propose `/spdd-prompt-update` pour ajouter les
  tests à l'Operation. Ne génère pas à l'aveugle.
- **Tests existants déjà conformes** : skill ne génère rien,
  produit juste un rapport "tout est bon".
- **Mutation testing pas configuré sur la stack** : skill
  passe l'étape mutation et le mentionne dans le rapport
  ("mutation testing skipped, voir TEST-002").
- **Run suite échoue (compilation, dependency manquante)** :
  best-effort (cf. OQ7 → A) — afficher l'échec et finir
  l'audit.
- **Skill invoquée sans argument** : aide affichée + exemples
  d'usage.
- **Argument inconnu** (id-slug qui ne match aucune story) :
  erreur explicite, propose `/spdd-story` ou liste les
  artefacts disponibles.
- **Mutation testing hors scope V1** : annoncer clairement
  dans la skill qu'elle est mentionnée seulement.

## Decisions tranchées en revue 2026-05-03 (toutes en reco A)

- [x] **D-D1 → A** : `argument-hint` = `"<id-slug OU chemin
      vers spdd/prompts/...>"` (cohérent `/spdd-api-test`).
      Flag `--no-run` documenté dans le corps, pas dans le hint.
- [x] **D-D2 → A** : étapes **1-9** dans la skill (cohérent
      avec story Scope In, scope riche audit + génération + run
      + rapport justifie plus que les 5-6 étapes des autres
      skills).
- [x] **D-D3 → A** : `## Annexe — Conventions par stack` =
      **tableau compact** (cohérent avec testing-frontend/backend
      annexe Tools), 1 ligne par stack (emplacement / naming /
      commande run / lien project-doc).
- [x] **D-D4 → A** : rapport `spdd/tests/<id>-<slug>.md` avec
      **frontmatter + sections structurées** (cohérent avec
      analysis/canvas). Sections : pyramide constatée, tests
      générés, coverage, écarts vs canvas, suggestions
      next-step.
- [x] **D-D5 → A** : maj docs = **audit + patches ciblés** (grep
      "étape 6", "spdd-tests", "tests unitaires" pour identifier
      toutes les occurrences). Léger probable (GUIDE schémas
      déjà valides).
