---
id: EPIC-<NNN>                 # ex. EPIC-001
slug: <kebab-case-slug>
title: <titre court>
status: draft                  # draft | in-progress | mature | done
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
child-stories: []              # [STORY-NNN, STORY-NNN, ...]
---

# <titre>

## Vision

<1-3 phrases — but business / produit, public visé, gain attendu.
Pas de design ni d'implémentation — c'est l'intention au niveau epic.>

## Acceptance Criteria (haut niveau)

> Critères mesurables au niveau epic. Granularité = "épopée terminée"
> (pas du Given/When/Then story-level — ce niveau-là vit dans les
> stories enfants).

- <critère mesurable, ex. "Toutes les stories enfants livrées et
  utilisées en production pendant 1 sprint sans régression critique">
- <...>

## Stories enfants

> Liste des stories qui décomposent cet Epic. Mise à jour au fur et
> à mesure de la décomposition INVEST.

- [ ] STORY-NNN — <titre court>
- [ ] STORY-NNN — <titre court>

## Notes

<contexte produit, dépendances externes, contraintes timing.>
