---
id: UI-016
slug: universal-template-driven-editor
title: "SpddEditor pilote son rendu depuis le template de l'artefact"
status: reviewed
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
  - frontend
---

# SpddEditor pilote son rendu depuis le template de l'artefact

## Background

`SpddEditor` (UI-014) est maintenant branché sur `selectedPath` : quand
l'utilisateur sélectionne un artefact dans le hub, le contenu est chargé
via `ReadArtifact` → `markdownToDraft` (commit af2da04). Mais `markdownToDraft`
est hard-codé pour les stories — il ne connaît que les 8 sections `StoryDraft`.

Le projet dispose déjà d'une couche template-driven (UI-015) : `parseTemplate`
extrait la structure depuis `.yukki/templates/<type>.md`, `parseArtifactContent`
produit un `EditState` générique. Ces fonctions couvrent les 6 types de
templates existants (story, inbox, epic, analysis, canvas-reasons, roadmap).

L'objectif de cette story est de faire lire à `SpddEditor` le template
correspondant au type de l'artefact chargé, et de piloter le rendu de
ses sections via `EditState` — en lieu et place du `StoryDraft` hard-codé.

## Business Value

Un seul éditeur qui s'adapte à tous les types d'artefacts SPDD : ajouter
un nouveau type revient à ajouter un template, sans écrire de code front.
La dette `StoryDraft` / sections hard-codées commence à se résorber.

## Scope In

- Quand `selectedPath` change, `SpddEditor` détecte le type via
  `detectArtifactType(id)`, dérive le chemin template, lit les deux fichiers
  (`ReadArtifact` pour l'artefact + le template), et construit `EditState`
  via `parseTemplate` + `parseArtifactContent`
- `SpddEditor` stocke `editState: EditState | null` et `parsedTemplate:
  ParsedTemplate | null` dans son state local (ou dans le store `spdd.ts`)
- **SpddTOC** se génère depuis `editState.sections` (liste de headings) à
  la place des `SECTIONS` hard-codés
- **SpddDocument** rend les sections depuis `editState.sections` : widget
  `textarea` → `<textarea>` éditable, widget `ac-cards` → cartes
  `GenericAc` (Given/When/Then) ; remplace `SpddFmForm` + `SpddAcEditor`
  pour les types non-story
- **SpddHeader** affiche `fmValues.id`, `fmValues.title`, `fmValues.status`
  depuis `EditState` (à la place de `draft.id`, `draft.title`, `draft.status`)
- Sauvegarde via `serializeArtifact(editState, parsedTemplate)` →
  `WriteArtifact(selectedPath, content)` (bouton Sauvegarder ou `Ctrl+S`)
- Fallback brut si le template est absent ou le type non reconnu : textarea
  sur le contenu brut, bandeau d'avertissement

## Scope Out

- Migration / suppression de `StoryDraft` dans `spdd.ts` — les stores
  `StoryDraft`-based restent en place ; seul le rendu visuel change
- AI Assist (UI-014d) : conservé uniquement pour les stories (passe en no-op
  pour les autres types si `editState` est non-null)
- Toggle Markdown/WYSIWYG : conservé, mais en mode `EditState` le toggle
  "markdown" montre le brut sérialisé (read-only)
- SpddInspector : inchangé (continue d'utiliser le contexte story)
- Support du type **roadmap** (layout kanban incompatible avec SpddDocument)
- Drag-and-drop de sections, Undo/Redo

## Acceptance Criteria

### AC1 — SpddEditor charge le template au changement de selectedPath

- **Given** un projet est ouvert et `selectedPath` change vers un artefact
  de type `story`, `inbox`, `epic` ou `analysis`
- **When** `SpddEditor` reçoit le nouveau `selectedPath`
- **Then** il lit en parallèle l'artefact et le template correspondant,
  construit `EditState`, et affiche les sections issues de ce `EditState`
  (TOC + Document reconfigurés)

### AC2 — SpddTOC reflète les sections du template

- **Given** un artefact de type `inbox` est chargé (template avec sections
  Background, Idée brute, Liens)
- **When** le rendu s'affiche
- **Then** le TOC liste exactement les sections du template `inbox.md`, pas
  les sections story hard-codées (Background, Business Value, Scope In, etc.)

### AC3 — Section textarea éditable, section ac-cards en cartes

- **Given** un artefact de type `story` est affiché
- **When** l'utilisateur fait défiler le document
- **Then** les sections `textarea` s'affichent comme zones de texte
  éditables et la section `Acceptance Criteria` s'affiche en cartes
  `GenericAc` (Given = bleu, When = ambre, Then = vert)

### AC4 — Sauvegarde écrit le fichier via WriteArtifact

- **Given** l'utilisateur a modifié le contenu d'une section en mode édition
- **When** il appuie sur `Ctrl+S` ou clique "Sauvegarder"
- **Then** `serializeArtifact(editState, parsedTemplate)` est appelé,
  `WriteArtifact(selectedPath, result)` écrit le fichier, et un toast
  "Sauvegardé ✓" apparaît

### AC5 — Fallback brut si template absent

- **Given** un artefact dont le type ne correspond à aucun template
  (ex. canvas-reasons)
- **When** `SpddEditor` tente de charger le template
- **Then** un bandeau "Template non disponible — édition brute" s'affiche,
  le contenu brut est éditable dans un textarea, la sauvegarde reste
  possible via `WriteArtifact`

## Open Questions

- [ ] Le store `spdd.ts` (`StoryDraft`) reste-t-il pour les stories ou
  `EditState` le remplace-t-il totalement dans cette story ?
  → Proposé : `EditState` pilote uniquement le rendu ; `StoryDraft` reste
  pour l'AI Assist et l'auto-save CORE-007 (migration dans une story dédiée)
- [ ] `SpddHeader` affiche-t-il le titre / status depuis `EditState.fmValues`
  ou reste-t-il sur `draft.*` pour les stories ?
  → Proposé : header lu depuis `EditState.fmValues` pour tous les types ;
  fallback `draft.*` si `editState` est null

## Notes

### Ce qui a déjà été livré (hors scope de cette story)

- `selectedPath` → `ReadArtifact` → `markdownToDraft` → `resetDraft`
  (commit af2da04)
- Couche `parseTemplate` / `parseArtifactContent` / `serializeArtifact`
  (UI-015, commit 66eb895)
- `detectArtifactType` / `templateNameForType` dans `templateParser.ts`

### Modules impactés

- `frontend/src/components/spdd/SpddEditor.tsx` — ajouter chargement
  template + construction `EditState`
- `frontend/src/components/spdd/SpddDocument.tsx` — rendre sections depuis
  `EditState.sections` (sections dynamiques)
- `frontend/src/components/spdd/SpddTOC.tsx` — TOC depuis
  `EditState.sections`
- `frontend/src/components/spdd/SpddHeader.tsx` — titre/status depuis
  `EditState.fmValues`
- `frontend/src/stores/spdd.ts` — ajouter `editState` + `parsedTemplate`
  (ou store local dans SpddEditor)

### Références croisées

- [UI-015](.yukki/stories/UI-015-template-driven-artifact-editor.md) —
  socle `ParsedTemplate` + `EditState` (déjà livré)
- [UI-014f](.yukki/stories/UI-014f-spdd-editor-wire-to-backend.md) —
  SpddEditor actuel (source du refactor)
