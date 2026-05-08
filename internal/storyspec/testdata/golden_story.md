---
id: CORE-009
slug: export-story-md-to-yukki-stories
title: Export du fichier .md final dans .yukki/stories/
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - internal/storyspec
  - internal/uiapp
---

# Export du fichier .md final dans .yukki/stories/

## Background

Le contenu du background.

## Business Value

La valeur métier.

## Scope In

- Point un
- Point deux

## Scope Out

- Hors périmètre.

## Acceptance Criteria

### AC1 — Export écrit le fichier

- **Given** un draft valide
- **When** StoryExport est appelé
- **Then** le fichier est créé dans .yukki/stories/
