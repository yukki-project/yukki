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
<!-- spdd: required help="Termes dérivés de la story qui ont guidé le scan codebase. Servent de point d'entrée pour /yukki-analysis." -->

<Liste des termes dérivés de la story qui ont guidé le scan codebase. Ex.
"trivy", "report", "csv", "export", "vulnerability".>

## Concepts de domaine
<!-- spdd: required help="Concepts métier identifiés. Distingue ce qui existe (avec son chemin actuel) de ce qui doit être introduit." -->

### Existants (déjà dans le code)

- **<concept>** — <où il vit dans le code (chemin / classe), comment il est
  utilisé aujourd'hui, contraintes connues>
- <...>

### Nouveaux (à introduire)

- **<concept>** — <pourquoi il est nécessaire, en quoi il diffère d'un concept
  existant, où il devrait vivre>
- <...>

## Approche stratégique
<!-- spdd: required help="3-8 lignes. Comment on adresse la story sans entrer dans les détails de signature (réservés au canvas REASONS). Décisions d'archi et leur justification." -->

<3-8 lignes. Comment on compte adresser la story sans entrer dans les détails
de signature (qui sont du ressort du canvas REASONS). Décisions d'archi
majeures et leur justification.>

## Modules impactés
<!-- spdd: required help="Tableau des modules touchés avec impact (fort/moyen/faible) et nature du changement." -->

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
<!-- spdd: help="CRDs/ressources K8s, APIs externes, librairies/frameworks spécifiques." -->

- <CRD ou ressource K8s touchée — Application, PortalExtension, etc.>
- <API externe / service tiers — Trivy, OAuth provider, etc.>
- <librairie ou framework spécifique — Fabric8, NgRx, etc.>

## Risques et points d'attention
<!-- spdd: required help="Risques identifiés selon la taxonomie .yukki/methodology/risk-taxonomy.md (impact, probabilité, mitigation)." -->

- **<risque>** — <impact, probabilité, mitigation envisagée>
- <...>

## Cas limites identifiés
<!-- spdd: required help="Cas limites identifiés via BVA + EP (cf. .yukki/methodology/edge-cases.md). À challenger en revue ou couvrir en test." -->

- <cas limite à challenger en revue ou à couvrir en test>
- <...>

## Decisions à prendre avant le canvas
<!-- spdd: help="Choix d'architecture ou de design à trancher avec le PO/archi avant de produire le canvas REASONS." -->

- [ ] <choix d'architecture ou de design qui doit être tranché>
- [ ] <...>
