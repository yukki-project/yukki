---
id: CORE-005
slug: scaffold-skills-on-init
title: Scaffolding des skills Claude/Copilot lors de l'initialisation d'un projet
status: draft
created: 2026-05-06
updated: 2026-05-06
owner: Thibaut Sannier
modules:
  - internal/uiapp
  - internal/templates
---

# Scaffolding des skills Claude/Copilot lors de l'initialisation d'un projet

## Background

`InitializeYukki` crée le dossier `.yukki/` avec ses sous-répertoires et
copie les templates embarqués. Mais un nouveau projet ne reçoit pas les
skills yukki (`.claude/commands/yukki-*.md` et `.github/skills/yukki-*/SKILL.md`)
qui permettent d'utiliser `/yukki-story`, `/yukki-analysis`, etc.
L'utilisateur doit les copier manuellement depuis un projet existant ou le
repo yukki — friction inutile à l'onboarding d'un nouveau projet.

## Business Value

Un utilisateur qui initialise un projet via `yukki ui` (bouton "Initialize")
ou `yukki init` (CLI) dispose immédiatement des 7 slash commands SPDD dans
son IDE (Claude Code et GitHub Copilot), sans étape manuelle. Le temps
d'onboarding passe de plusieurs minutes à zéro.

## Scope In

- **Étendre `InitializeYukki`** dans `internal/uiapp/app.go` pour scaffolder
  en plus de `.yukki/` :
  - `.claude/commands/yukki-*.md` — 7 fichiers (un par skill)
  - `.github/skills/yukki-*/SKILL.md` — 7 dossiers, un fichier `SKILL.md` chacun
- **Non-écrasement** : si un fichier destination existe déjà, il est conservé
  tel quel (contrairement aux templates `.yukki/templates/` qui sont toujours
  remis à jour depuis `embed.FS`)
- **Embarquement** : les 14 fichiers skills sont embarqués dans le binaire
  yukki via `embed.FS` (même mécanisme que `internal/templates/embedded/`)
- **`internal/templates`** : exposer un `LoadSkills() []SkillFile` ou adapter
  `Loader` pour retourner les contenus des skills par nom
- Les dossiers parents (`.claude/commands/`, `.github/skills/yukki-*/`) sont
  créés via `os.MkdirAll` si absents

## Scope Out

- Mise à jour des skills existants (`--force` pour écraser) — reporté
- CLI `yukki init` standalone (sans UI Wails) — couvert par CORE-001/002
- Scaffolding de fichiers hors skills (.editorconfig, .gitignore yukki…)
- Versionning des skills (détection d'une version plus récente à proposer)

## Acceptance Criteria

### AC1 — Initialisation complète d'un projet vide

- **Given** un répertoire de projet sans `.claude/` ni `.github/` existants
- **When** `InitializeYukki(dir)` est appelé
- **Then** `.claude/commands/yukki-*.md` (7 fichiers) et
  `.github/skills/yukki-*/SKILL.md` (7 dossiers + fichiers) sont créés
  avec le contenu embarqué correspondant

### AC2 — Idempotence : fichiers skills déjà présents

- **Given** un projet où `.claude/commands/yukki-story.md` existe avec un contenu
  personnalisé par l'utilisateur
- **When** `InitializeYukki(dir)` est appelé à nouveau
- **Then** `.claude/commands/yukki-story.md` conserve son contenu personnalisé
  (aucun écrasement)

### AC3 — Initialisation partielle : certains skills manquants

- **Given** un projet où seuls 3 des 7 skills Claude sont présents
- **When** `InitializeYukki(dir)` est appelé
- **Then** les 4 skills manquants sont créés, les 3 existants sont inchangés

### AC4 — Répertoires parents manquants créés sans conflit

- **Given** un projet où `.github/` existe mais pas `.github/skills/`
- **When** `InitializeYukki(dir)` est appelé
- **Then** `.github/skills/yukki-*/` est créé sans toucher le contenu
  existant de `.github/`

## Open Questions

*(aucune)*

## Notes

### Évaluation INVEST

| Critère | Verdict |
|---|---|
| Independent | ✓ — peut être livré sans bloquer d'autre story |
| Negotiable | ✓ — scope Out bien délimité |
| Valuable | ✓ — réduit la friction onboarding à zéro |
| Estimable | ✓ — 1-2j (extension d'une fonction existante + embed) |
| Small | ✓ — 4 AC, 2 modules, 1 fonction étendue |
| Testable | ✓ — tests unitaires avec `t.TempDir()` existants dans `app_test.go` |

### Contexte technique

- `InitializeYukki` est dans `internal/uiapp/app.go` (ligne ~530)
- Les templates sont embarqués via `embed.FS` dans `internal/templates/embedded/`
- Le même mécanisme servira pour les skills : un nouveau package
  `internal/skills/embedded/` (ou une extension de `internal/templates/embedded/`)
- Les 7 skills : `yukki-story`, `yukki-analysis`, `yukki-reasons-canvas`,
  `yukki-generate`, `yukki-api-test`, `yukki-prompt-update`, `yukki-sync`
- Fichiers source à embarquer : `.claude/commands/yukki-*.md` (Claude) et
  `.github/skills/yukki-*/SKILL.md` (Copilot)
