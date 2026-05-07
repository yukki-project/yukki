---
id: UI-016
slug: universal-template-driven-editor
title: SpddEditor universel piloté par template avec mode lecture intégré
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
---

# SpddEditor universel piloté par template avec mode lecture intégré

## Background

L'éditeur SPDD actuel (`SpddEditor`, UI-014) utilise des sections et un
modèle de données hard-codés (`StoryDraft`, `SECTIONS`, `markdownToDraft`/
`draftToMarkdown`) qui ne couvrent que les stories. Le projet dispose d'une
couche `ParsedTemplate` + `EditState` (UI-015) qui extrait la structure
dynamiquement depuis `.yukki/templates/*.md`.

Par ailleurs, `StoryViewer` affiche les artefacts en lecture sous forme de
prose Markdown — une vue sans contexte structurel qui ne tire aucun parti
de la sémantique des sections.

Cette story migre `SpddEditor` vers un modèle entièrement piloté par
template (en réutilisant `EditState`) et y ajoute un **mode lecture**
(view-only) qui remplace la vue Markdown de `StoryViewer`. L'objectif est
un éditeur unique, adaptable à tous les types d'artefacts, dont l'interface
se reconfigure à la volée selon le template du type courant.

## Business Value

- **Zéro code front à écrire** pour supporter un nouveau type d'artefact :
  ajouter un template suffit.
- **Expérience cohérente** : même interface riche (TOC, cartes AC, toggle
  Markdown/WYSIWYG) quel que soit le type d'artefact édité.
- **Suppression de dette** : `StoryDraft`, `SECTIONS`, `markdownToDraft`,
  `draftToMarkdown` et la vue Markdown prose (`ReactMarkdown`) remplacés
  par la couche générique déjà existante.

## Scope In

- Remplacement de `StoryDraft` + `SECTIONS` hard-codés dans le store `spdd.ts`
  par `ParsedTemplate` + `EditState` (déjà produits par UI-015)
- `SpddEditor` chargé dynamiquement depuis `selectedPath` (store artifacts) :
  lecture du fichier + chargement du template correspondant au type détecté
- **Mode lecture (view-only)** du `SpddEditor` : sections non éditables,
  sans boutons de mutation ; remplace la vue Markdown `StoryViewer` pour
  tous les types d'artefacts couverts par un template
- Save via `WriteArtifact` sur `selectedPath` avec `serializeArtifact`
- Support des types : **story**, **inbox**, **epic** (templates déjà présents)
  ; analysis et canvas en best-effort (template présent mais sections complexes)
- Bouton retour dans le header (← depuis le mode édition vers le mode lecture ;
  depuis le mode lecture vers la liste)
- Suppression de `NewStoryModal` et du bouton "+ Nouvelle story" (la
  création passe désormais par le workflow CLI `/yukki-story`, pas par l'UI)
- Suppression de la vue `ReactMarkdown` prose dans `StoryViewer` pour les
  types couverts par un template
- L'ActivityBar perd le bouton "SPDD Editor" (déjà fait dans `dcbcbf7`) ;
  navigation : cliquer un item de la liste → mode lecture ; cliquer "Éditer"
  → mode édition

## Scope Out

- Drag-and-drop de sections
- Validation backend en temps réel dans l'éditeur (CORE-007 couvre les stories)
- Éditeur de templates depuis l'UI
- AI Assist (UI-014d) dans l'éditeur universel — conservé uniquement pour les
  stories tant que le refactor n'est pas terminé
- SpddTOC navigation scroll (simplifiée : liste statique de sections cliquables)
- Support du type **roadmap** (layout kanban incompatible)
- Undo/Redo

## Acceptance Criteria

### AC1 — Cliquer un item de la liste affiche la vue lecture template

- **Given** un projet est ouvert et la liste montre des stories
- **When** l'utilisateur clique sur un item de la liste
- **Then** le panneau principal affiche le contenu de l'artefact en mode
  lecture structuré (sections du template avec leur contenu, frontmatter
  en résumé en-tête) sans aucun contrôle d'édition

### AC2 — Le bouton "Éditer" bascule en mode édition template

- **Given** un artefact est affiché en mode lecture
- **When** l'utilisateur clique le bouton "Éditer" (ou appuie sur `E`)
- **Then** chaque section devient éditable selon son widget (textarea ou
  cartes AC), le frontmatter est éditable via des inputs typés, et le bouton
  "Enregistrer" est visible

### AC3 — Enregistrer écrit le fichier et revient en lecture

- **Given** l'utilisateur est en mode édition et a modifié au moins un champ
- **When** il clique "Enregistrer" (ou `Ctrl+S`)
- **Then** le fichier sur disque est mis à jour via `WriteArtifact`, la vue
  bascule en mode lecture avec le contenu rafraîchi, et un toast confirme
  la sauvegarde

### AC4 — Les sections AC affichent les cartes Given/When/Then

- **Given** une story dont le template marque la section "Acceptance Criteria"
  avec widget `ac-cards`
- **When** l'artefact est affiché en mode lecture ou édition
- **Then** chaque critère `### ACn — …` est rendu sous forme de carte colorée
  (Given = bleu, When = ambre, Then = vert) identique à `SpddAcEditor`

### AC5 — Fallback textarea si aucun template ne correspond

- **Given** un artefact dont le type ne correspond à aucun template connu
  (ex. canvas-reasons)
- **When** l'utilisateur clique "Éditer"
- **Then** l'éditeur affiche un textarea brut avec un bandeau "Template non
  disponible — édition en mode brut" et une sauvegarde reste possible

## Open Questions

- [ ] Faut-il conserver l'AI Assist (UI-014d) dans le nouvel éditeur universel
  pour les stories, ou le désactiver jusqu'à UI-017 ?
- [ ] Le toggle Markdown/WYSIWYG doit-il rester pour les stories, ou est-il
  simplifié en "mode brut" = fallback ?

## Notes

### Décision SPIDR

Évaluation des 5 axes pour décider si cette story doit être scindée :

| Axe | Verdict |
|---|---|
| **Paths** | Un seul chemin : voir → éditer → sauvegarder. Pas de split. |
| **Interfaces** | Une seule UI (SpddEditor universel). Pas de split. |
| **Data** | Deux modèles (StoryDraft → EditState) à migrer ensemble — split fragmenterait l'état. |
| **Rules** | Règles homogènes (template → widget). Pas de split. |
| **Spike** | Pas de technologie nouvelle — `ParsedTemplate`/`EditState` déjà validés. |

**Conclusion** : story fondatrice justifiée. Le refactor des données et
l'UI lecture/édition doivent être livrés ensemble pour éviter un état
intermédiaire incohérent. Taille estimée : 2 j.

### Modules impactés

- `frontend/src/stores/spdd.ts` — remplacer par store générique ou supprimer
- `frontend/src/stores/artifacts.ts` — `selectedPath` devient la source de
  vérité pour le chargement
- `frontend/src/components/spdd/SpddEditor.tsx` — refactor majeur
- `frontend/src/components/spdd/SpddDocument.tsx` — sections dynamiques
- `frontend/src/components/spdd/SpddInspector.tsx` — widget-aware
- `frontend/src/components/hub/StoryViewer.tsx` — remplacé pour types couverts
- `frontend/src/components/hub/NewStoryModal.tsx` — supprimé
- `frontend/src/components/hub/HubList.tsx` — supprimer bouton "+" création
- `frontend/src/components/hub/SidebarPanel.tsx` — supprimer bouton "+"

### Références croisées

- [UI-015](.yukki/stories/UI-015-template-driven-artifact-editor.md) —
  couche `ParsedTemplate` + `EditState` + `TemplatedEditor` (socle)
- [UI-014f](.yukki/stories/UI-014f-spdd-editor-wire-to-backend.md) —
  état actuel du SpddEditor (source pour le refactor)
