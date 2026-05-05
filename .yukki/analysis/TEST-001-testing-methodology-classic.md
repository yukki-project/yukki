---
id: TEST-001
slug: testing-methodology-classic
story: .yukki/stories/TEST-001-testing-methodology-classic.md
status: implemented
created: 2026-05-03
updated: 2026-05-06
---

# Analyse — TEST-001 — Refs méthodo testing classique

> Story de tooling méthodo : ajoute un cluster Testing complet
> (2 entry-points + 7 sub-refs) dans `.yukki/methodology/testing/`.
> La story a déjà tranché 8 OQs (toutes en reco A : separation
> code/doc, status published, version 1, descriptive avec recos,
> peer review obligatoire, etc.). Cette analyse complète avec
> les choix d'architecture documentaire (D-D1..D-D7) révélés
> par le scan des refs existantes.

## Mots-clés métier extraits (validés)

`pyramide testing` (Cohn / Honeycomb / Trophy), `coverage
discipline`, `mutation testing`, `property-based testing`,
`contract testing`, `snapshot testing`, `test smells` (Meszaros),
`test naming` (G/W/T / AAA / Osherove), `cluster categorization`
(sous-dossier), `applies-to` frontmatter, `category` frontmatter
(nouveau), `category` README sectionné par cluster.

## Concepts de domaine

### Existants (déjà dans le code)

- **`.yukki/methodology/`** plat, **7 refs** racine :
  `acceptance-criteria.md`, `decisions.md`, `domain-modeling.md`,
  `edge-cases.md`, `invest.md`, `risk-taxonomy.md`, `spidr.md` +
  `README.md`. Toutes en `version: 1`, `lang: fr`,
  `status: published`.
- **Pattern frontmatter ref** (cf. `invest.md`) :
  ```yaml
  ---
  id: METHO-<topic>
  title: <titre humain>
  version: 1
  status: published
  applies-to: [yukki-story, yukki-analysis, ...]
  lang: fr
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  sources:
    - <url ou citation>
  ---
  ```
  **Pas de champ `category:` aujourd'hui** — TEST-001 l'introduit.
- **Pattern de structure ref** (cf. `invest.md` qui est canonique) :
  - `## Définition` (1-3 lignes + source originelle)
  - `## <le contenu factorisé>` (tableau, listes, sections par
    sous-concept)
  - `## Heuristiques d'application` (par étape du workflow SPDD)
  - `## <sections par sous-concept>` (un H2 par concept détaillé)
  - `## Exemple concret` (référence à un artefact existant du repo)
  - `## Sources` (URLs / citations)
  - `## Changelog` (entrée par version)
- **`.yukki/methodology/README.md`** : tableau "Refs disponibles"
  avec `Ref / Résumé / applies-to`. Convention "1 ref = 1
  technique" déclarée. Longueur cible 80-150 lignes.
- **Skills SPDD existantes** :
  - `.claude/commands/yukki-*.md` (commands invocables via slash)
  - `.github/skills/yukki-*/SKILL.md` (skills autoloadables)
  - Commands lues : `yukki-story.md`, `yukki-analysis.md`,
    `yukki-reasons-canvas.md`, `yukki-generate.md`,
    `yukki-prompt-update.md`, `yukki-sync.md`, `yukki-api-test.md`
- **Pas de skill `/yukki-tests`** aujourd'hui — étape 6 du
  workflow SPDD prévue mais non implémentée. Hors scope V1
  (cf. story OQ1).
- **`.yukki/tests/`** dossier existe, vide. Réservé pour les
  prompts de tests générés par `/yukki-tests` futur.

### Nouveaux (à introduire)

- **Sous-dossier `.yukki/methodology/testing/`** — 1ʳᵉ
  catégorie sortie de la racine. Foundation pour les futurs
  clusters (`code-quality/`, `operations/`, etc.).
- **Champ frontmatter `category: <slug>`** — nouveau champ
  optionnel sur les refs. Pour les nouvelles : `category: testing`
  obligatoire. Pour les 7 existantes : back-port en V2 (story
  séparée), pas obligatoire en V1.
- **9 nouvelles refs** :
  - **2 entry-points playbook** : `testing-frontend.md`,
    `testing-backend.md` — overview + arbitrage par contexte
    + liens vers sub-refs
  - **7 sub-refs techniques** : `test-naming.md`,
    `test-smells.md`, `coverage-discipline.md`,
    `mutation-testing.md`, `property-based-testing.md`,
    `contract-testing.md`, `snapshot-testing.md`
- **Section `## Voir aussi`** dans le footer des refs avec
  overlap (cf. story OQ7) — convention nouvelle pour gérer
  les croisements sans duplication.
- **Mise à jour `applies-to:`** des skills existantes pour
  référencer les refs testing :
  - `/yukki-reasons-canvas` → ajout `testing-frontend`,
    `testing-backend` (pour la section O — Operations qui
    annonce des tests)
  - `/yukki-generate` → ajout idem
- **Mise à jour `.yukki/methodology/README.md`** :
  - Documentation de la convention catégorisation par cluster
  - Tableau "Clusters disponibles" (story-side racine, testing
    sous-dossier, futurs)
  - Section `## Cluster: testing` listant les 9 nouvelles refs
- **Convention de longueur révisée** : entry-points 150-300
  lignes (playbook), sub-refs 80-200 lignes (technique focused).

## Approche stratégique

TEST-001 est une story **doc-only** : aucun code applicatif
modifié, juste des markdowns dans `.yukki/methodology/testing/` +
mises à jour des skills `applies-to:` + README orchestrateur.

Stratégie en 4 étapes lors du `/yukki-generate` :

1. **Créer le sous-dossier** `.yukki/methodology/testing/` et y
   poser un `.gitkeep` (pas vraiment nécessaire vu qu'il sera
   immédiatement peuplé, mais explicite).
2. **Écrire les 7 sub-refs en premier** (techniques fines :
   naming, smells, coverage-discipline, mutation, property-based,
   contract, snapshot). Chaque ref **autonome** mais avec
   `## Voir aussi` qui pointe vers les overlaps. Tonalité
   descriptive avec recos claires (cf. OQ5).
3. **Écrire les 2 entry-points** (`testing-frontend.md`,
   `testing-backend.md`) : playbooks qui présentent la pyramide
   adaptée au contexte + arbitrage par stack + références aux
   sub-refs pertinentes. Annexe minimale "Tools by ecosystem"
   avec renvoi à TEST-002 future.
4. **Mettre à jour le `README.md`** avec la convention de
   catégorisation + tableau clusters + section dédiée testing.
   **Ne pas migrer** les 7 refs existantes.

**Risque-clé** : densité du contenu (9 refs × ~150 lignes en
moyenne = ~1300 lignes de markdown). Mitigation : générer une
ref à la fois, valider la cohérence frontmatter avant de
passer à la suivante, peer review en bloc à la fin (OQ8).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `.yukki/methodology/testing/` | **fort** | nouveau sous-dossier, 9 fichiers markdown créés (~1300 lignes) |
| `.yukki/methodology/README.md` | **moyen** | refactor pour introduire la section "Clusters disponibles" + sous-section "Cluster: testing" |
| `.claude/commands/yukki-reasons-canvas.md` | **faible** | mise à jour `applies-to:` ou références dans la procédure (1-2 lignes) |
| `.claude/commands/yukki-generate.md` | **faible** | idem |
| `.github/skills/yukki-reasons-canvas/SKILL.md` | **faible** | idem (si le mécanisme `applies-to` est miroir entre commands et skills) |
| `.github/skills/yukki-generate/SKILL.md` | **faible** | idem |
| `.yukki/methodology/*.md` (7 refs existantes) | **nul** | aucune modification (pas de migration) |
| `.yukki/templates/*.md` | **nul** | inchangés |
| `.yukki/stories/`, `.yukki/analysis/`, `.yukki/prompts/` | **nul** | sauf cette story / analyse / canvas eux-mêmes |
| Code applicatif (Go, frontend, backend) | **nul** | TEST-001 est doc-only |
| `wails.json`, `main.go`, `cmd/` | **nul** | scope étranger |

## Dépendances et intégrations

- **Aucune dépendance code** — pas de bindings, pas de tests
  exécutables. Markdown pur.
- **Convention frontmatter** : alignée sur le pattern existant
  (`invest.md` comme canonical). Ajout du champ `category:`.
- **Sources littéraires** : Cohn 2009, Meszaros 2007, Fowler
  2006, Hughes / MacIver (QuickCheck / Hypothesis), Beck
  (Tidy First), Khorikov 2020, Falco (Approval Tests), Coles
  (PIT mutation), Osherove 2014.
- **Pas de framework spécifique** mentionné dans le corps des
  refs (cf. story Q1 = C, multi-stack agnostique). Les noms
  d'outils (Stryker, PIT, Pact, Jest, etc.) restent en annexe
  minimaliste avec renvoi à TEST-002.

## Risques et points d'attention

- **Volume** *(prob. certaine, impact effort)* — 9 refs × 150
  lignes = ~1300 lignes de markdown structuré, dense en
  références littéraires. Mitigation : générer ref par ref,
  valider chacune, ne pas batcher mentalement.
- **Cohérence transverse** *(prob. moyenne, impact qualité)* —
  les 9 refs doivent renvoyer entre elles correctement et
  vers les 7 existantes. Risque de liens cassés ou de
  recommandations contradictoires. Mitigation : checklist
  `## Voir aussi` à la fin de chaque ref + grep sur les liens
  morts en post-écriture.
- **Drift vs littérature** *(prob. faible, impact crédibilité)* —
  paraphraser sans dénaturer. Mitigation : citations
  inline avec attribution, sections "Sources" avec URLs
  vérifiables.
- **Tonalité** *(prob. moyenne, impact UX)* — mauvais équilibre
  prescriptif/descriptif rend la ref soit dogmatique soit
  inactionable (cf. OQ5). Mitigation : revue d'une ref initiale
  (ex. `test-naming.md`) avant d'écrire les 8 autres pour
  caler le style.
- **Catégorisation V1** *(prob. faible, impact évolutivité)* —
  introduire `category:` sur les 9 nouvelles sans back-porter
  les 7 existantes crée un état mixte. Acceptable car
  documenté en story (V2 fera le ménage), mais à tracer dans
  README pour ne pas surprendre.
- **Convention de nommage des sous-dossiers** — kebab-case
  anglais (`testing`, `code-quality`, `ai-aware`) cohérent avec
  le repo. Risque si une catégorie en français reste préférée
  ailleurs.

## Cas limites identifiés

- **Ref future avec overlap multi-cluster** (ex. une ref
  `error-handling.md` qui touche testing + code-quality +
  operations) : convention dit "1 ref vit dans 1 dossier",
  les autres la référencent par lien. Le choix du dossier
  d'attache se fait par cluster dominant.
- **Skill SPDD qui ne lit que le frontmatter** (pas le corps) :
  l'agent doit pouvoir filtrer les refs par `applies-to:` et
  `category:` sans avoir à lire chaque fichier complet. Vérif
  que le frontmatter est suffisant.
- **README qui reste plat malgré la sous-folder structure** :
  le README de `.yukki/methodology/` doit lister les refs
  testing dans une section dédiée, pas dans le tableau global.
  Sinon le sous-dossier perd son sens.
- **Migration future des 7 refs** : si on les déplace en V2
  vers `story/`, `risk/`, `architecture/`, les liens dans le
  reste du repo (skills, autres refs, stories) cassent. Anticiper
  via un audit de liens avant migration.
- **Ref vide ou stub** : si une sub-ref s'avère trop courte
  (< 80 lignes) ou trop longue (> 250 lignes), repenser la
  factorisation (peut-être merger ou split).

## Decisions tranchées en revue 2026-05-03 (toutes en reco A)

- [x] **D-D1 → A** : préfixe `id: TEST-<topic>` pour les 9
      nouvelles refs (cluster visible dans le frontmatter,
      `grep "id: TEST-"` trouve toutes les refs testing).
- [x] **D-D2 → A** : `category: testing` (full word kebab-case,
      sans ambiguïté avec le kind SPDD `tests` qui désigne les
      artefacts générés à l'étape 6).
- [x] **D-D3 → A** : README orchestré — tableau "Clusters
      disponibles" en tête + sections par cluster avec leur
      tableau détaillé.
- [x] **D-D4 → A** : update **les deux** — `.claude/commands/
      spdd-*.md` ET `.github/skills/yukki-*/SKILL.md`. Synchros
      pour cohérence Claude Code (commands) + autoload (skills).
- [x] **D-D5 → A** : `## Voir aussi` en **liste à puces simple**.
      Pas de tableau pour 4-5 liens.
- [x] **D-D6 → A** : annexe "Tools by ecosystem" = **1 tableau
      unique** (1 ligne par stack, renvoi à TEST-002 pour
      le détail).
- [x] **D-D7 → A** : **exemples réels du repo yukki** quand
      pertinent (CORE-001 pour fondatrice, UI-001a/b/c et
      UI-006/007/008 pour patterns frontend/backend), sinon
      pseudocode minimal. `test-naming.md` doit citer un test
      Go ou TS concret du repo.
