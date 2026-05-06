---
id: UI-010
slug: artifact-viewer-editor
title: Artefact viewer — markdown riche, sections pliables, éditeur inline
status: draft
created: 2026-05-06
updated: 2026-05-06
owner: tsannier
modules:
  - frontend
---

# Artefact viewer — markdown riche, sections pliables, éditeur inline

## Background

Le viewer d'artefacts (`StoryViewer`) affiche actuellement le markdown brut
sans styles visibles : les titres, tables, blocs de code et listes sont
indiscernables du texte courant. La cause immédiate est l'absence du plugin
Tailwind Typography (`@tailwindcss/typography`) — les classes `prose` sont
des no-ops. Au-delà du rendu, les artefacts SPDD (canvas REASONS,
analyses, stories) sont de longues pages que l'utilisateur doit lire et
réviser directement dans l'outil.

## Business Value

Permettre aux utilisateurs de lire et modifier les artefacts SPDD sans
quitter yukki : un markdown riche et lisible réduit le va-et-vient éditeur
externe ↔ hub ; les sections pliables rendent les canvas REASONS de 500+
lignes navigables ; l'éditeur inline supprime la friction de la révision.

## Scope In

- Activer `@tailwindcss/typography` (déjà installé) — fix immédiat titres /
  tables / code blocks / blockquotes
- Syntax highlight des blocs de code (Go, TypeScript, YAML, bash, JSON,
  Markdown) via `shiki` ou `rehype-highlight`
- Bouton « Copier » sur chaque bloc de code
- Sections pliables (`<details>`) sur tous les `##` de niveau 2 — état
  mémorisé localement dans le composant (reset à chaque ouverture d'artefact)
- Détection du type de document depuis le frontmatter `id` et `status` :
  - `INBOX-*` → layout carte compacte (pas de sections pliables, juste rendu riche)
  - `UI-*`, `CORE-*`, etc. → rendu standard avec sections pliables
  - Canvas REASONS (présence des sections `## R —`, `## E —`…) → sections
    pliables **avec état par défaut replié sur O (Operations)** si > 3 opérations
- Basculer entre mode **lecture** et mode **édition** (bouton ou raccourci `E`)
  en mode édition : `<textarea>` pleine largeur + bouton Enregistrer (`Ctrl+S`)
  qui appelle un nouveau binding Go `WriteArtifact(path, content)`
- Affichage en mode lecture après Enregistrer (rechargement depuis disque)

## Scope Out

- Éditeur markdown riche type CodeMirror / Monaco avec preview split-pane
  (complexité, à reconsidérer dans une story dédiée UI-011)
- Checklists interactives persistées (cocher les AC dans le frontmatter) —
  story séparée
- Liens internes cliquables (`[texte](.yukki/stories/…)` → navigation hub) —
  story séparée
- Support Mermaid — story séparée
- Collaboration / historique de modifications

## Acceptance Criteria

### AC1 — Titres et tables visibles en lecture

- **Given** un artefact markdown avec des `# Titre`, tables GFM et blocs de code est sélectionné
- **When** le viewer s'affiche en mode lecture
- **Then** les titres ont une hiérarchie visuelle claire, les tables sont
  rendues avec bordures et alternance de lignes, et les blocs de code ont
  une police monospace distincte avec coloration syntaxique

### AC2 — Sections pliables sur les `##`

- **Given** un artefact contenant au moins deux sections `##`
- **When** l'utilisateur clique sur l'en-tête d'une section
- **Then** le contenu de cette section se plie ou se déplie, et l'état des
  autres sections est conservé

### AC3 — Mode édition / lecture

- **Given** un artefact est affiché en mode lecture
- **When** l'utilisateur clique sur le bouton Éditer (ou appuie sur `E`)
- **Then** le contenu devient éditable dans une zone texte pleine largeur
  avec le markdown brut (incluant le frontmatter)

### AC4 — Enregistrement depuis le mode édition

- **Given** l'utilisateur est en mode édition et a modifié le contenu
- **When** il clique sur Enregistrer ou appuie sur `Ctrl+S`
- **Then** le fichier est écrit sur disque, le viewer repasse en mode
  lecture et affiche le contenu mis à jour

### AC5 — Annuler les modifications

- **Given** l'utilisateur est en mode édition
- **When** il clique sur Annuler ou appuie sur `Escape`
- **Then** le viewer repasse en mode lecture sans écrire sur disque, avec
  le contenu original

### AC6 — Erreur d'écriture

- **Given** le binding `WriteArtifact` retourne une erreur (ex. fichier
  en lecture seule)
- **When** l'utilisateur tente d'enregistrer
- **Then** un toast d'erreur s'affiche, le mode édition reste actif et
  le contenu modifié n'est pas perdu

## Open Questions

- [x] Quel lib de highlight préférer → **`shiki`** (qualité VSCode, grammaires
  intégrées, thème `github-dark` cohérent avec le dark mode)
- [x] Mémoriser l'état replié/déplié → **oui, par artefact en localStorage**
  (clé `yukki:sections:<path>`, valeur : ensemble des sections repliées)
- [x] Avertir si on quitte le mode édition avec des modifications non
  enregistrées → **oui** : dialog de confirmation (Enregistrer / Ignorer / Annuler)

## Notes

- INBOX-005 source de cette story : `.yukki/inbox/INBOX-005-improve-markdown-rendering.md`
- `@tailwindcss/typography` est déjà installé (npm, 2026-05-06) et le plugin
  est activé dans `tailwind.config.js`. La classe `prose prose-sm dark:prose-invert`
  est déjà présente dans `StoryViewer.tsx` — le P0 sera visible dès la prochaine
  session wails dev.
- Binding Go `WriteArtifact` à ajouter dans `internal/uiapp/app.go` + stubs
  `App.js`/`App.d.ts`. Validation : refuser les paths hors `.yukki/` (invariant I1).
- SPIDR appliqué : la story est fondatrice (premier rendu utilisable). Les axes
  Paths et Rules pourraient générer des sous-stories (liens internes, checklists
  interactives) mais sont explicitement exclus du scope pour rester Small.
  | Axe SPIDR | Verdict |
  |---|---|
  | **Paths** | Lecture seule vs lecture+édition : inclus les deux (fondateur) |
  | **Interfaces** | Textarea vs éditeur riche : textarea uniquement (Monaco → UI-011) |
  | **Data** | Un seul type de source (fichier disque) |
  | **Rules** | Checklists interactives, liens internes → exclus (scope out) |
  | **Spike** | Aucun — libs connues, pattern établi dans le codebase |
