---
id: META-004
slug: rename-spdd-to-dot-yukki
title: Renommer `spdd/` en `.yukki/` et `/spdd-*` en `/yukki-*`
status: reviewed
created: 2026-05-03
updated: 2026-05-03
owner: Thibaut Sannier
modules:
  - internal/uiapp
  - internal/artifacts
  - frontend
  - .claude/commands
  - .github/skills
  - spdd
  - docs
parent: ~
sibling-stories:
  - META-001-extract-methodology-references
  - META-002-backport-story-techniques
  - META-003-spdd-tests-skill
depends-on: []
---

# Renommer `spdd/` en `.yukki/` et `/spdd-*` en `/yukki-*`

## Background

Le projet `yukki` stocke aujourd'hui ses artefacts (stories, analysis,
prompts, methodology, templates, tests) dans un dossier `spdd/` et expose
ses commandes via les slash `/spdd-*`. Ces deux conventions portent le nom
de la **méthode** (Structured Prompt-Driven Development), pas celui de
l'**outil** (`yukki`). Aligner les deux sur le nom de l'outil — dossier
`.yukki/`, commandes `/yukki-*` — clarifie l'intention : c'est le dossier
de travail et l'interface de yukki, à l'image de `.git/` + `git <verbe>`.
Le préfixe `.` permet en plus de gitignorer une partie du contenu sans
gitignorer le tout (déjà le cas pour `spdd/research/`). Cette bascule
prépare le packaging OSS : un utilisateur tiers fera `yukki init` et
obtiendra un `.yukki/` reconnaissable, manipulé via `/yukki-*`.

## Business Value

Pour les utilisateurs de yukki (équipes adoptant SPDD via cet outil),
un dossier `.yukki/` et des commandes `/yukki-*` alignés sur le nom de
l'outil rendent la convention plus lisible et plus facile à expliquer
("c'est l'outil yukki, son dossier et ses commandes"). Pour les
contributeurs internes au projet, ça sépare la **méthode** SPDD
(théorie, articles, vocabulaire) de l'**outil** yukki (qui matérialise
les artefacts dans `.yukki/` et expose les commandes `/yukki-*`).

## Scope In

- Renommage physique du dossier `spdd/` → `.yukki/` à la racine du repo,
  en préservant l'arbo interne (`stories/`, `analysis/`, `prompts/`,
  `templates/`, `tests/`, `methodology/`, `README.md`, `GUIDE.md`).
- Renommage des skills slash commands `/spdd-* → /yukki-*` :
  - fichiers `.claude/commands/spdd-*.md` → `.claude/commands/yukki-*.md`
    (8 fichiers)
  - dossiers `.github/skills/spdd-*/` → `.github/skills/yukki-*/`
    (8 dossiers, contenu `SKILL.md` synchronisé)
- Mise à jour des **références internes** entre skills (les skills se
  citent mutuellement, ex. "puis `/spdd-analysis`" → "puis `/yukki-analysis`")
  et des `applies-to: [...]` dans le frontmatter des refs methodology.
- Remplacement des chemins en dur dans le code Go : [`internal/uiapp/app.go`](../../internal/uiapp/app.go),
  [`internal/artifacts/lister.go`](../../internal/artifacts/lister.go),
  et leurs tests associés.
- Mise à jour des chaînes affichées dans le frontend :
  - [`frontend/src/components/hub/NewStoryModal.tsx`](../../frontend/src/components/hub/NewStoryModal.tsx)
    et [`frontend/src/components/hub/ProjectPicker.tsx`](../../frontend/src/components/hub/ProjectPicker.tsx)
    (mention du dossier `spdd/` → `.yukki/`)
  - [`frontend/src/components/workflow/CreateNextStageModal.tsx`](../../frontend/src/components/workflow/CreateNextStageModal.tsx)
    et [`frontend/src/components/workflow/WorkflowPipeline.tsx`](../../frontend/src/components/workflow/WorkflowPipeline.tsx)
    (mention des commands `/spdd-*` → `/yukki-*`)
- Mise à jour des liens et chemins dans le contenu des skills (chemins
  `spdd/templates/...`, `spdd/methodology/...` → `.yukki/...`) — miroir
  Claude/Copilot synchronisé.
- Mise à jour des cross-références de frontmatter (`story:`, `analysis:`)
  et des liens markdown dans tous les artefacts existants (stories,
  analysis, canvas, methodology, README, GUIDE).
- Mise à jour des configs et docs : `.gitignore`, `.golangci.yml`,
  `CLAUDE.md`, `DEVELOPMENT.md`, `TODO.md`, `docs/testing.md`.
- Préservation de l'historique git via `git mv` (ou équivalent) pour
  garder le suivi des renommages.

## Scope Out

- Modification du nom du **module Go** (`github.com/yukki-project/yukki`).
- Restructuration interne de `.yukki/` (sous-dossiers identiques à
  `spdd/`).
- Compatibilité ascendante "lit aussi `spdd/` si présent" ou "fallback
  vers `/spdd-*`" — projet en phase dev, on bascule franchement, un seul
  layout supporté.
- Migration de `spdd/research/` (déjà gitignored) : le rename physique
  s'applique, aucun travail spécifique n'est dû.
- Évolution de la **méthode** SPDD elle-même (vocabulaire, sémantique
  des étapes, etc.).

## Acceptance Criteria

### AC1 — Le dossier physique est renommé

- **Given** le repo en l'état actuel avec un dossier `spdd/` à la racine
- **When** la story est implémentée et commitée
- **Then** un dossier `.yukki/` existe à la racine, contient l'intégralité
  de l'arbo précédente, et `spdd/` n'existe plus

### AC2 — Le code Go cible `.yukki/` au lieu de `spdd/`

- **Given** un projet yukki initialisé via `app.InitializeSPDD`
- **When** l'init s'exécute
- **Then** l'arbo créée est `<projectDir>/.yukki/{stories,analysis,prompts,templates,tests}`
  et le path-checking de sécurité refuse les chemins hors `.yukki/`

### AC3 — Les liens internes des artefacts SPDD sont cohérents

- **Given** les frontmatter `story: spdd/stories/<id>.md` et
  `analysis: spdd/analysis/<id>.md` actuellement présents dans canvas
  et analyses
- **When** la story est implémentée
- **Then** chaque cross-référence pointe vers `.yukki/`, et tous les
  liens markdown relatifs entre methodology, templates et artefacts
  résolvent correctement (vérifiable par parcours d'un linter de liens
  ou inspection ciblée)

### AC4 — Les skills sont renommés et alignés sur `.yukki/`

- **Given** les skills actuellement nommés `.claude/commands/spdd-*.md`
  et `.github/skills/spdd-*/SKILL.md`
- **When** un utilisateur invoque `/yukki-story` (ou n'importe lequel
  des 8 skills) après implémentation
- **Then** le skill existe sous le préfixe `yukki-` dans les deux
  emplacements, son contenu lit le template depuis `.yukki/templates/...`,
  écrit l'artefact dans `.yukki/<kind>/...`, et toutes les références
  croisées internes (skill → skill, skill → methodology) utilisent
  `/yukki-*` et `.yukki/...`

### AC7 — Le frontend affiche les commandes `/yukki-*`

- **Given** la pipeline workflow visible dans l'app yukki
- **When** l'utilisateur ouvre le hub ou le workflow
- **Then** les libellés affichés sont `/yukki-story`, `/yukki-analysis`,
  `/yukki-reasons-canvas`, `/yukki-tests`, etc., et plus aucune
  occurrence `/spdd-*` n'apparaît dans le rendu

### AC5 — La suite de tests Go passe

- **Given** la suite de tests existante (`internal/uiapp/app_test.go`,
  `internal/artifacts/lister_test.go`, `tests/integration/...`)
- **When** on lance `go test ./...`
- **Then** tous les tests passent et aucune chaîne `"spdd"` ne reste
  codée en dur dans le code, les fixtures ou les assertions

### AC6 — Cas limite : projet sans dossier `.yukki/`

- **Given** un projet yukki ouvert dans l'app qui ne contient ni
  `.yukki/` ni `spdd/`
- **When** l'utilisateur sélectionne ce projet via `ProjectPicker`
- **Then** l'app affiche un message indiquant l'absence de `.yukki/`
  (texte mis à jour) et propose l'init, sans crash

## Open Questions

_Aucune question ouverte — les 3 décisions de cadrage initiales sont
tranchées :_

- ✅ **Préfixe `.`** confirmé. Le `.` est délibéré : il permet de
  gitignorer une partie du contenu (`.yukki/research/` aujourd'hui ;
  potentiellement d'autres sous-dossiers demain) sans gitignorer
  l'ensemble.
- ✅ **Renommage des slash commands `/spdd-* → /yukki-*`** intégré au
  Scope In (cf. AC4 + AC7). Cohérence outil totale.
- ✅ **Pas de compat ascendante** : projet en dev, bascule franche, un
  seul layout supporté.

## Notes

### Évaluation INVEST

- **Independent** : OK — touche tout le repo mais ne dépend d'aucune
  autre story en cours
- **Negotiable** : OK — Scope Out clarifie ce qu'on ne fait pas (module
  Go, compat ascendante, sémantique méthode)
- **Valuable** : OK — alignement complet outil (dossier + commands) +
  signal packaging OSS
- **Estimable** : OK — ~1 j (rename mécanique homogène, mais surface
  élargie par les commands)
- **Small** : à la limite haute (~100 fichiers touchés une fois les
  skills + frontend commands inclus) — le rename doit rester atomique
  pour éviter tout état intermédiaire incohérent
- **Testable** : OK — AC mesurables via `go test ./...`, check arbo,
  grep "spdd" résiduel

### Décision SPIDR

| Axe | Verdict | Raison |
|---|---|---|
| **Paths** (happy / erreur / cas limite) | Non scindable | Un seul chemin : rename mécanique unique |
| **Interfaces** (CLI / UI / API) | Non scindable | Dossier + commands forment un même bloc de convention ; les séparer crée un état mixte (dossier renommé mais commands toujours `/spdd-*`, ou inverse) |
| **Data** (formats / variantes) | Non scindable | Pas de variantes de format |
| **Rules** (règles métier) | Non scindable | Règle unique "tout `spdd` → `yukki` (dossier `.yukki/` + commands `/yukki-*`)" |
| **Spike** | Non requis | Périmètre connu, pas de question d'archi ouverte |

**Conclusion** : story fondatrice **non-scindable** — atomicité requise
pour cohérence du repo. Un seul commit évite l'état intermédiaire où
le code pointe `.yukki/` alors que les artefacts sont encore en `spdd/`,
ou où le dossier est renommé mais les commands restent `/spdd-*`. Trace
SPIDR conservée car la story dépasse la borne basse INVEST "Small".

### Modules touchés (vue rapide)

| Zone | Fichiers principaux |
|---|---|
| Code Go | [`internal/uiapp/app.go`](../../internal/uiapp/app.go), [`internal/artifacts/lister.go`](../../internal/artifacts/lister.go), tests `*_test.go`, [`tests/integration/story_integration_test.go`](../../tests/integration/story_integration_test.go) |
| Doc Go | [`internal/workflow/doc.go`](../../internal/workflow/doc.go), [`internal/templates/doc.go`](../../internal/templates/doc.go), [`internal/provider/doc.go`](../../internal/provider/doc.go), [`internal/artifacts/doc.go`](../../internal/artifacts/doc.go) |
| Frontend (dossier) | [`frontend/src/components/hub/NewStoryModal.tsx`](../../frontend/src/components/hub/NewStoryModal.tsx), [`frontend/src/components/hub/ProjectPicker.tsx`](../../frontend/src/components/hub/ProjectPicker.tsx) |
| Frontend (commands) | [`frontend/src/components/workflow/CreateNextStageModal.tsx`](../../frontend/src/components/workflow/CreateNextStageModal.tsx), [`frontend/src/components/workflow/WorkflowPipeline.tsx`](../../frontend/src/components/workflow/WorkflowPipeline.tsx) |
| Skills (rename + contenu) | `.claude/commands/spdd-*.md` → `yukki-*.md` (8 fichiers), `.github/skills/spdd-*/` → `yukki-*/` (8 dossiers) |
| Artefacts SPDD | l'intégralité de `spdd/` (devient `.yukki/`) — frontmatter, liens, applies-to |
| Configs / docs | [`.gitignore`](../../.gitignore), [`.golangci.yml`](../../.golangci.yml), [`CLAUDE.md`](../../CLAUDE.md), `DEVELOPMENT.md`, `TODO.md`, `docs/testing.md` |
