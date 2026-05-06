---
id: UI-013
slug: archive-toggle-sorted-list
title: Archive toggle & tri par création dans la HubList
status: implemented
created: 2026-05-06
updated: 2026-05-06
owner: yukki contributors
modules:
  - frontend/src/components/hub
  - internal/artifacts
---

# Archive toggle & tri par création dans la HubList

## Background

La HubList affiche tous les artefacts d'un kind sans distinction de cycle
de vie. Les artefacts au statut `synced` (travail terminé, canvas aligné
sur le code) encombrent la liste alors qu'ils ne nécessitent plus d'action.
Par ailleurs l'ordre actuel (tri par `updated` desc) mélange anciens et
nouveaux travaux — le tri par `created` desc reflète mieux l'ordre d'arrivée
des stories et donne une lecture plus naturelle du backlog.

## Business Value

L'utilisateur daily-driver de `yukki ui` voit un backlog compact focalisé sur
les travaux actifs ; les items terminés (`synced`) sont masqués par défaut et
consultables à la demande via un toggle discret, sans quitter la vue ni changer
de panneau.

## Scope In

- **Archive automatique** : tout item dont le `status === "synced"` est
  considéré archivé
- **Toggle "show archived"** : bouton icône dans l'en-tête de la HubList ;
  état local au composant, `false` par défaut
- **Rendu des archivés** : quand le toggle est actif, les items archivés
  s'affichent avec `opacity-40` (distincts visuellement des actifs)
- **Tri par `created` desc** : le backend (`lister.go`) tri désormais par
  champ `created` descendant, puis `slug` ascendant en fallback
- **Champ `Created`** ajouté à la struct `Meta` (Go + binding TS stub) pour
  exposer la date au frontend si besoin

## Scope Out

- Archivage manuel (action utilisateur pour archiver un item non-synced) —
  reporté
- Filtres supplémentaires (par status, par owner, par date) — reporté
- Persistance de l'état du toggle entre sessions — MVP local uniquement
- Animation de transition (fade in/out) — hors scope MVP

## Acceptance Criteria

### AC1 — Items synced masqués par défaut

- **Given** la HubList affiche des items dont certains ont le status `synced`
- **When** l'utilisateur ouvre le panneau (toggle archivés = false par défaut)
- **Then** les items `synced` ne sont pas visibles dans la liste

### AC2 — Toggle affiche les archivés

- **Given** le toggle "show archived" est sur `false`
- **When** l'utilisateur clique sur le bouton toggle dans l'en-tête
- **Then** les items `synced` apparaissent dans la liste avec `opacity-40`

### AC3 — Toggle masque les archivés

- **Given** des items `synced` sont visibles (toggle = true)
- **When** l'utilisateur reclique sur le toggle
- **Then** les items `synced` disparaissent à nouveau de la liste

### AC4 — Tri par date de création décroissante

- **Given** la HubList charge des artefacts
- **When** la liste s'affiche
- **Then** l'item créé le plus récemment apparaît en premier ; en cas d'égalité
  de date, les items sont triés par slug alphabétique croissant

### AC5 — Compteur d'items actifs

- **Given** des items archivés sont masqués
- **When** l'en-tête de la HubList s'affiche
- **Then** le compteur indique le nombre d'items actifs (non archivés),
  pas le total

## Open Questions

*(aucune)*

## Notes

- Le statut `done` n'est pas archivé dans cette story (usage rare ; à réévaluer)
- L'icône toggle peut être `Archive` ou `EyeOff` de lucide-react
- Le champ `created` est déjà présent dans les frontmatters existants ;
  il faut l'ajouter à la struct `Meta` pour le parser et l'exposer
