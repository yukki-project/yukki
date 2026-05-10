---
id: META-008
slug: typed-status-and-workflow
title: Refonte du système de status — typage par type d'artefact et workflow de transitions
status: draft
created: 2026-05-10
updated: 2026-05-10
owner: Thibaut Sannier
modules:
  - frontend
  - .yukki/templates
  - .yukki/methodology
  - docs
---

# Refonte du système de status — typage par type d'artefact et workflow de transitions

## Background

Le frontmatter normalisé du repo (cf. [CLAUDE.md](../../CLAUDE.md)) déclare une palette unique de status — `draft | reviewed | accepted | implemented | synced` — appliquée à toutes les stories, analyses et canvas. En pratique chaque type d'artefact n'utilise qu'un sous-ensemble : une story ne devient jamais `implemented` (c'est le canvas qui passe à cet état après `/yukki-generate`). L'introduction d'Inbox / Epic / Roadmap par [META-005](META-005-inbox-epic-roadmap-foundation.md) ajoute des vocabulaires disjoints (`unsorted | promoted | rejected`, `draft | in-progress | mature | done`, `live`). Le sélecteur de status de l'éditeur SPDD propose aujourd'hui le même menu pour tous les artefacts, sans contrainte de type ni de transition — l'utilisateur peut basculer une story sur `synced` ou faire repasser un canvas `implemented` directement à `unsorted`.

## Business Value

Donner à l'utilisateur SPDD (humain qui révise) et aux agents un vocabulaire de status **cohérent par type d'artefact** + un **workflow guidé** : moins d'erreurs en revue, lecture immédiate du "où on en est" par type d'artefact, et base claire sur laquelle brancher plus tard les transitions automatiques (`/yukki-generate` → `implemented`, etc.).

## Scope In

- Définir l'ensemble des status valides par type d'artefact (story, analysis, canvas, inbox, epic, roadmap)
- Définir les transitions autorisées entre status pour chaque type (workflow)
- L'éditeur SPDD (sélecteur de status dans le frontmatter) n'expose que les status valides pour le type courant
- L'éditeur SPDD n'expose, depuis le status courant, que les transitions autorisées
- Les templates (`.yukki/templates/*.md`) reflètent le typage retenu (commentaire enum aligné)

## Scope Out

- Migration automatique des artefacts existants portant un status invalide (ex. stories à `implemented`) — sera traité par un outil de lint séparé
- Déclenchement automatique de transitions par les commandes SPDD (`/yukki-generate` → `implemented`, `/yukki-sync` → `synced`, etc.) — laissé aux commandes
- Validation backend bloquante à l'écriture du fichier — la v1 reste une garantie UI
- Restyling des badges de status (couleurs, icônes) — `statusBadge.ts` reste tel quel

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Sélecteur de status restreint pour une story

- **Given** une story SPDD ouverte dans l'éditeur, status courant `draft`
- **When** l'utilisateur déroule le sélecteur de status
- **Then** seules les valeurs autorisées pour les stories sont proposées (ni `implemented`, ni `synced`, ni `unsorted`, ni vocabulaire epic/roadmap)

### AC2 — Sélecteur de status restreint pour un canvas REASONS

- **Given** un canvas REASONS ouvert dans l'éditeur, status courant `reviewed`
- **When** l'utilisateur déroule le sélecteur de status
- **Then** les valeurs spécifiques au canvas sont proposées, incluant `implemented` et `synced`

### AC3 — Transitions autorisées depuis le status courant

- **Given** un artefact dont le status courant est défini
- **When** l'utilisateur déroule le sélecteur de status
- **Then** seules les transitions sortantes autorisées depuis le status courant sont sélectionnables (les autres apparaissent désactivées ou ne sont pas listées)

### AC4 — Status invalide déjà présent dans le fichier

- **Given** un fichier dont le frontmatter porte un status hors-palette pour son type (ex. story.md à `implemented`)
- **When** l'éditeur ouvre l'artefact
- **Then** le status courant est affiché tel quel mais signalé comme invalide, et le sélecteur propose la palette valide pour le type

### AC5 — Tentative de transition non autorisée

- **Given** un artefact dont le status courant n'autorise pas la transition vers `X`
- **When** l'utilisateur tente d'appliquer la valeur `X` (manipulation du formulaire ou édition directe)
- **Then** la modification est refusée et un message explique pourquoi cette transition n'est pas autorisée

## Open Questions

- [ ] Une ref methodology dédiée `.yukki/methodology/status-workflow.md` (matrice "status par type" + table de transitions) doit-elle être produite, ou la définition vit-elle uniquement dans les templates et le code UI ?
- [ ] La présence d'un status hors-palette est-elle un blocage dur (artefact non éditable tant que non corrigé) ou un avertissement non-bloquant (statut marqué invalide, édition possible) ?
- [ ] Les transitions doivent-elles s'appliquer aussi aux artefacts modifiés hors UI (édition manuelle d'un .md, commit direct) — donc nécessiter un linter / CI — ou rester guidées uniquement par l'UI en v1 ?
- [ ] Le type "canvas" doit-il distinguer son cycle propre (`draft | reviewed | accepted | implemented | synced`) ou être considéré comme un sous-cas de la "spec exécutable" partagée avec analysis ?

## Notes

### Évaluation INVEST

Selon [`.yukki/methodology/invest.md`](../methodology/invest.md) :

| Critère | Verdict | Justification |
|---|---|---|
| Independent | ✅ | s'appuie sur les types d'artefact déjà introduits ([META-005](META-005-inbox-epic-roadmap-foundation.md)) ; pas de pré-requis non livré |
| Negotiable | ✅ | 4 Open Questions (ref methodology, blocage vs warn, scope CI, typage canvas) |
| Valuable | ✅ | cohérence vocabulaire + guidage des transitions = moins d'erreurs en revue |
| Estimable | ✅ | surface UI identifiée (sélecteur de status frontmatter), templates connus |
| Small | ⚠️ | matrice à définir pour 6 types, pattern UI répété ; tient en 1-2 jours si scope reste UI + templates |
| Testable | ✅ | chaque AC est observable (menu déroulé, message refus, badge invalide) |

### Décision SPIDR

Selon [`.yukki/methodology/spidr.md`](../methodology/spidr.md) — pas de découpage retenu :

| Axe | Verdict | Raison |
|---|---|---|
| Paths | non | un seul verbe métier : "typer + contraindre les status" |
| Interfaces | non | scope UI seul en v1 ; CLI/API/CI restent en Scope Out (Open Question) |
| Data | non | un seul concept (status), pas de variantes de format |
| Rules | non | toutes les règles tiennent dans la matrice unique `(type, status_courant) → status_cibles_autorisés` |
| Spike | non | surface bien identifiée, pas d'inconnue technique majeure |

### Couverture des AC

- Happy path : AC1 (story typée), AC2 (canvas typé)
- Workflow : AC3 (transitions limitées)
- Cas limite : AC4 (status invalide pré-existant) — voir [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md)
- Erreur utilisateur : AC5 (transition refusée)

### Pointeurs codebase (pour `/yukki-analysis`)

- Sélecteur de status frontmatter : `frontend/src/components/spdd/SpddFmForm.tsx`
- Badge de status partagé : `frontend/src/lib/statusBadge.ts`
- Templates concernés : `.yukki/templates/{story,analysis,canvas-reasons,inbox,epic,roadmap}.md`
- Définition normalisée actuelle : section "Frontmatter normalisé" de [`CLAUDE.md`](../../CLAUDE.md)
