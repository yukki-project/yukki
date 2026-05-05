---
id: <ID>                       # même id que la story
slug: <kebab-case-slug>        # même slug que la story
story: .yukki/stories/<ID>-<slug>.md
status: draft                  # draft | reviewed | accepted
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

# Analyse — <titre>

> Contexte stratégique pour la story `<ID>-<slug>`. Produit par `/yukki-analysis`
> à partir d'un scan **ciblé** du codebase (mots-clés métier extraits de la story).
> Ne dupliquer ni la story ni le canvas REASONS.

## Mots-clés métier extraits

<Liste des termes dérivés de la story qui ont guidé le scan codebase. Ex.
"trivy", "report", "csv", "export", "vulnerability".>

## Concepts de domaine

### Existants (déjà dans le code)

- **<concept>** — <où il vit dans le code (chemin / classe), comment il est
  utilisé aujourd'hui, contraintes connues>
- <...>

### Nouveaux (à introduire)

- **<concept>** — <pourquoi il est nécessaire, en quoi il diffère d'un concept
  existant, où il devrait vivre>
- <...>

## Approche stratégique

<3-8 lignes. Comment on compte adresser la story sans entrer dans les détails
de signature (qui sont du ressort du canvas REASONS). Décisions d'archi
majeures et leur justification.>

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `backend` | <fort/moyen/faible> | <nouvelle resource / modif service / migration> |
| `controller` | ... | ... |
| `frontend` | ... | ... |
| `extensions/<nom>` | ... | ... |
| `common` | ... | ... |
| `helm` / kustomize | ... | <ajout values, RBAC, sidecar...> |
| `docs` | ... | <nouveau module Antora, page, nav> |

## Dépendances et intégrations

- <CRD ou ressource K8s touchée — Application, PortalExtension, etc.>
- <API externe / service tiers — Trivy, OAuth provider, etc.>
- <librairie ou framework spécifique — Fabric8, NgRx, etc.>

## Risques et points d'attention

- **<risque>** — <impact, probabilité, mitigation envisagée>
- <...>

## Cas limites identifiés

- <cas limite à challenger en revue ou à couvrir en test>
- <...>

## Decisions à prendre avant le canvas

- [ ] <choix d'architecture ou de design qui doit être tranché>
- [ ] <...>
