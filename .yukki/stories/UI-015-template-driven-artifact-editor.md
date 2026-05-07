---
id: UI-015
slug: template-driven-artifact-editor
title: Mode édition structuré dans StoryViewer piloté par template
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
  - .yukki/templates/
---

# Mode édition structuré dans StoryViewer piloté par template

## Background

`StoryViewer` affiche actuellement les artefacts en lecture avec un bouton
Edit (icône crayon, haut droite) qui bascule vers un textarea brut. L'éditeur
SPDD dédié (UI-014) couvre uniquement les stories via un store et un parser
spécialisés. Le projet dispose de 6 templates dans `.yukki/templates/` qui
décrivent exactement la structure de chaque type d'artefact. Cette story
remplace le textarea brut du mode édition de `StoryViewer` par un formulaire
structuré construit à la volée depuis le template : sections → textareas,
sections contenant `Given / When / Then` → cartes `SpddAcEditor`, frontmatter
→ inputs typés.

## Business Value

Permettre d'éditer n'importe quel type d'artefact (story, inbox, epic…) avec
une interface adaptée à sa structure, sans développer un composant dédié par
type. Ajouter un nouveau type = ajouter un template ; zéro code front
supplémentaire. Le flux actuel (lire → bouton Edit haut droite → éditer →
sauvegarder) est conservé tel quel.

## Scope In

- Remplacement du textarea brut dans le mode edit de `StoryViewer` par un
  formulaire structuré piloté par le template du type courant
- Détection du type depuis le frontmatter `id:` (préfixe `INBOX-` → inbox,
  `UI-`/`CORE-`/etc. → story, `EPIC-` → epic) ou par chemin du fichier
- Parsing du template correspondant dans `.yukki/templates/<type>.md` :
  sections `##` → zones de texte ou composants spécialisés
- Détection automatique Given / When / Then : toute section dont le corps
  de template contient `- **Given**` est rendue avec `SpddAcEditor` (cartes
  colorées : Given = bleu, When = ambre, Then = vert)
- Toutes les autres sections → `AutoTextarea` redimensionnable
- Frontmatter → inputs typés (voir Notes — tableau de mapping)
- Bouton "+ Ajouter un AC" en bas d'une section G/W/T
- Support prioritaire des types **story** et **inbox** ; epic en best-effort
- Fallback textarea brut si aucun template ne correspond au type détecté

## Scope Out

- Changement du pattern de navigation (le bouton Edit haut droite est conservé
  tel quel ; pas de "clic liste = ouvre éditeur directement")
- Création de nouveaux artefacts depuis l'éditeur structuré (hors story —
  déjà gérée par `NewStoryModal`)
- Éditeur de templates (modifier `.yukki/templates/*.md` depuis l'UI)
- Templates analysis et canvas-reasons avec composants dédiés
- Drag-and-drop de sections
- Validation backend dans l'éditeur structuré (CORE-007 déjà couvre story)
- Roadmap (layout kanban trop différent)

## Acceptance Criteria

### AC1 — Le mode édition affiche un formulaire structuré, pas un textarea brut

- **Given** un artefact est sélectionné dans la liste et affiché en lecture
- **When** l'utilisateur clique sur le bouton Edit (haut droite)
- **Then** le panneau de droite bascule en mode édition avec des sections
  labellisées séparées, et non un unique textarea brut sur tout le contenu

### AC2 — Les sections sont dérivées du template du type courant

- **Given** le template `.yukki/templates/inbox.md` définit deux sections
  (Idée, Notes) sans ligne `Given / When / Then`
- **When** l'utilisateur passe en mode édition sur un item Inbox
- **Then** l'éditeur affiche exactement ces deux sections sous forme de
  textareas ; aucune carte AC n'est présente

### AC3 — Une section G/W/T est rendue en cartes structurées colorées

- **Given** le template `.yukki/templates/story.md` contient dans la section
  `## Acceptance Criteria` des lignes `- **Given**`, `- **When**`,
  `- **Then**`
- **When** l'utilisateur passe en mode édition sur une story
- **Then** la section AC affiche une carte par critère existant, avec trois
  champs labellisés (Given = bleu, When = ambre, Then = vert)

### AC4 — Ajout d'un AC depuis l'éditeur

- **Given** l'éditeur est ouvert sur une story en mode édition
- **When** l'utilisateur clique sur "+ Ajouter un AC" en bas de la section AC
- **Then** une carte vide s'ajoute et le focus se positionne sur son champ Given

### AC5 — Sauvegarde reconstruit le fichier `.md` correctement

- **Given** l'utilisateur a modifié plusieurs sections et/ou des cartes AC
- **When** il clique sur Sauvegarder
- **Then** le fichier `.md` sur disque est reconstruit avec le frontmatter
  intact et les sections dans le même ordre que le template ; les cartes AC
  sont sérialisées au format `- **Given** … / - **When** … / - **Then** …`

### AC6 — Fallback brut si template inconnu

- **Given** un fichier `.md` est ouvert dont le type ne correspond à aucun
  fichier dans `.yukki/templates/`
- **When** l'utilisateur passe en mode édition
- **Then** l'éditeur affiche un textarea générique sur tout le contenu, avec
  une notice "Template inconnu — édition en mode brut"

## Open Questions

- [ ] Le type d'artefact est-il toujours détectable depuis le préfixe de `id:`
  dans le frontmatter, ou faut-il aussi inspecter le chemin du fichier
  (ex. `.yukki/inbox/*.md`) comme fallback ?
- [ ] Pour le frontmatter, une annotation dans le template (ex. commentaire
  `# type: enum[draft|reviewed|done]`) est-elle acceptable pour piloter le
  rendu des champs, ou préfère-t-on une heuristique (valeur avec `|` → select,
  champ `created`/`updated` → date) ?

## Notes

### Décision SPIDR

| Axe SPIDR | Verdict |
|---|---|
| Paths (story d'abord, puis inbox) | Acceptable — mais le mécanisme générique n'est validé qu'avec deux types ; garder les deux |
| Interfaces (template parsing séparé) | Non — UI et parser sont co-dépendants ici |
| Data (types de champs frontmatter avancés) | Reporté en Open Questions |
| Rules (validation backend) | Out of scope explicite |
| Spike (faisabilité) | Non nécessaire — `parser.ts` existe déjà |

Décision : **conserver les deux types (story + inbox)** dans la même story —
le mécanisme générique n'a de sens que validé sur au moins deux structures
différentes. Charge estimée < 1,5 j.

### Mapping template → composant UI

| Ce que le template contient | Composant rendu |
|---|---|
| Section `##` sans ligne `**Given**` dans le corps | `AutoTextarea` redimensionnable |
| Section `##` avec `- **Given**` / `- **When**` / `- **Then**` | `SpddAcEditor` (cartes colorées) |
| Champ frontmatter avec `\|` dans la valeur template | `<select>` avec options extraites |
| Champ frontmatter nommé `created` ou `updated` | `<input type="date">` |
| Champ frontmatter dont la valeur template est `~` ou liste | tag-input ou `<input>` multi-valeur |
| Tous les autres champs frontmatter | `<input type="text">` |

### Templates prioritaires

- `.yukki/templates/story.md` — section AC → cartes G/W/T
- `.yukki/templates/inbox.md` — sections Idée + Notes → textareas simples
- `.yukki/templates/epic.md` — best-effort (contient-il des AC ?)
- `.yukki/templates/analysis.md` — hors périmètre (trop riche pour cette itération)
