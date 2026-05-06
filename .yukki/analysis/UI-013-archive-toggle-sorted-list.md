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
story: .yukki/stories/UI-013-archive-toggle-sorted-list.md
---

# Analyse — UI-013 Archive toggle & tri par création dans la HubList

## Décision stratégique (Y-Statement)

> Facing **une liste d'artefacts qui mélange travaux actifs et terminés sans
> moyen de les filtrer**, we decided **d'ajouter un toggle archive côté
> frontend et de changer le tri backend vers `created` desc**, to achieve
> **un backlog compact, focalisé sur les travaux en cours**, accepting **que
> le toggle ne persiste pas entre sessions** (état local uniquement, MVP).

## Concepts existants réutilisés

| Concept | Localisation | Rôle dans UI-013 |
|---|---|---|
| `Meta.Status` | `internal/artifacts/lister.go` | Critère d'archivage (`synced`) |
| `Meta.Updated` | `internal/artifacts/lister.go` | Remplacé par `Created` pour le tri |
| `HubList` | `frontend/src/components/hub/HubList.tsx` | Composant enrichi (toggle + filtre + opacité) |
| `STATUS_BADGE` | `HubList.tsx` | Inchangé |
| `ListArtifacts` | `internal/uiapp/app.go` + `lister.go` | Tri modifié |

## Nouveaux concepts

| Concept | Nature | Description |
|---|---|---|
| `Meta.Created` | Value (champ Go + TS stub) | Date de création parsée depuis le frontmatter |
| `showArchived` | État local React (`useState<boolean>`) | Toggle archive dans HubList |
| Archived item | Règle de rendu | `status === "synced"` → `opacity-40` quand visible |

## Risques identifiés

| Risque | Catégorie | Mitigation |
|---|---|---|
| `created` absent du frontmatter d'un ancien artefact | Data integrity | Fallback sur `""` → tri en fin de liste (stable) |
| Confusion "synced = archivé" pour un nouvel utilisateur | UX | Icône archive explicite + tooltip éventuel |
| Stub TS non régénéré (AV workaround) | Build | Mise à jour manuelle de `App.d.ts` comme les fois précédentes |

## Cas limites

- Tous les items sont archivés → la liste affiche « No {kind} yet. » avec le toggle actif
- `created` identique sur plusieurs items → sort secondaire par `slug` asc (stable)
- Status inconnu (`""`) → non archivé (conservatif)

## Plan d'implémentation

### P1 — Backend `internal/artifacts/lister.go`

1. Ajouter `Created string \`yaml:"created"\`` à la struct `Meta`
2. Modifier le tri : `Created` desc → `Slug` asc (remplace `Updated` desc → `ID` asc)

### P2 — Stub TS `frontend/wailsjs/go/main/App.d.ts`

1. Ajouter `Created?: string` à l'interface `Meta`

### P3 — Frontend `frontend/src/components/hub/HubList.tsx`

1. Ajouter `import { Archive } from 'lucide-react'`
2. Ajouter `const [showArchived, setShowArchived] = useState(false)`
3. Définir `const ARCHIVED_STATUSES = new Set(['synced'])`
4. Filtrer : `const visible = showArchived ? items : items.filter(m => !ARCHIVED_STATUSES.has(m.Status))`
5. Compteur dans le header : `visible.length` (non archivés quand toggle = false)
6. Bouton toggle icône `Archive` dans le header, à côté du compteur
7. Dans le rendu de chaque `<li>` : ajouter `opacity-40` si `ARCHIVED_STATUSES.has(m.Status)`

## Décisions résolues

| Question | Décision |
|---|---|
| Quel(s) statuts sont archivés ? | `synced` uniquement (MVP) ; `done` exclu |
| Où vibre le toggle ? | État local `HubList`, non persisté |
| Opacité des archivés | `opacity-40` (Tailwind) |
| Tri : frontend ou backend ? | Backend (`lister.go`) — source de vérité, cohérent avec les tests existants |
