---
id: METHO-edge-cases
title: Identification des cas limites (BVA + EP + checklist)
version: 2
status: published
applies-to: [yukki-analysis, yukki-reasons-canvas]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html
  - https://aqua-cloud.io/edge-cases-in-software-testing/
---

# Identification des cas limites (BVA + EP + checklist)

## Définition

Lister les **inputs ou conditions** qui sortent du chemin nominal et que la
feature doit gérer correctement. Les cas limites identifiés en analyse
deviennent des AC dans la story (s'ils sont visibles utilisateur) ou des
tests dans la canvas Operations (s'ils sont techniques).

## Boundary Value Analysis (BVA)

Pour tout input avec un domaine borné, tester aux **frontières** : les bugs
nichent dans les `<` vs `<=`. Six valeurs à considérer pour chaque borne :

| Position | Exemple pour un quota mensuel `[0, 100]` |
|---|---|
| just-below-min | `-1` |
| min | `0` |
| nominal (mid) | `50` |
| just-below-max | `99` |
| max | `100` |
| just-above-max | `101` |

## Equivalence Partitioning (EP)

Découper l'espace d'entrée en **classes d'équivalence** : tous les inputs
d'une classe se comportent pareil ; un test par classe suffit.

Exemple sur la commande `yukki story` selon le préfixe d'id passé :

| Classe | Représentant | Comportement attendu |
|---|---|---|
| préfixe par défaut | absence de `--prefix` | `STORY-NNN` |
| préfixe valide explicite | `--prefix=EXT` | `EXT-NNN` |
| préfixe invalide (numérique) | `--prefix=123` | rejet, code 1 |
| préfixe vide | `--prefix=` | rejet, code 1 |

## Checklist 7 catégories

À parcourir systématiquement pour chaque feature non-triviale :

1. **Boundaries** — appliquer BVA sur tous les inputs numériques ou bornés
2. **Equivalence classes** — un représentant par classe d'entrée significative
3. **Null / empty / zero** — `null`, `""`, `[]`, `{}`, `0`, valeur absente, headers manquants
4. **Concurrence** — appels simultanés sur la même ressource (race conditions, double exécution, lecture pendant écriture)
5. **Failure modes** — dépendance down, timeout, OOM, disque plein, réseau coupé en plein traitement
6. **Scale** — volume 10× ou 100× du nominal (pagination, mémoire, durée)
7. **Security / negative testing** — input malformé, injection, path traversal, charset hostile, dépassement de longueur

## Exemple concret — Story `CORE-001` de yukki

Story [`CORE-001-cli-story-via-claude`](../stories/CORE-001-cli-story-via-claude.md)
— la commande CLI `yukki story` qui orchestre `claude` :

| Catégorie | Cas limite identifié |
|---|---|
| Boundaries | `stories/` vide → premier id `STORY-001` ; 999 stories existantes → `STORY-1000` (largeur du padding préservée) ; au-delà de 9 999 → format `STORY-10000` |
| Classes d'équivalence | préfixe par défaut `STORY` / préfixe valide explicite `EXT` / préfixe invalide `123-FOO` (rejet) |
| Null / empty | `yukki story ""` (chaîne vide) → erreur user code 1 ; `yukki story` sans argument et stdin vide → message d'usage code 1 |
| Concurrence | deux exécutions parallèles de `yukki story` avec le même `--prefix` → ne pas écraser le même fichier (lock file ou timestamp dans le nom de travail) |
| Failure modes | `claude` absent du `PATH` → code 2 message explicite ; `claude` crash en cours de génération → propager l'erreur, ne pas créer de fichier story orphelin |
| Scale | `stories/` contenant 10 000 fichiers → le scan d'IDs existants doit rester sous la seconde (regex sur `os.ReadDir`, pas de `stat` individuel) |
| Security | description contenant des backticks, `\n` ou caractères YAML ambigus → ne pas casser le frontmatter du fichier produit (échappement strict côté templating) |

Chaque cas limite identifié devient soit une **AC dans la story** (s'il est
visible utilisateur — ex. message d'erreur, code retour), soit un **test
dans la canvas Operations** (s'il est technique — ex. mémoire constante,
pas de fichier orphelin).

## Bonnes pratiques

- **3-5 cas limites majeurs** par story suffisent. Au-delà, la story est
  probablement trop grosse — voir le découpage SPIDR.
- **Chaque cas limite a un résultat attendu observable**, pas un "le système
  doit gérer". *"Code retour 2, message stderr `claude not found in PATH`,
  aucun fichier créé"* est observable.
- **Un cas limite n'est pas un bug** : c'est une **condition prévue** que la
  feature doit gérer. Si l'analyse révèle un cas non géré, retour vers la
  story (escalade).

## Sources

- [Boundary Value Analysis et Equivalence Partitioning — Guru99](https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html)
- [Edge Case Testing — Aqua Cloud](https://aqua-cloud.io/edge-cases-in-software-testing/)

## Changelog

- 2026-04-30 — v1 — création initiale
- 2026-04-30 — v2 — exemples (EP + concret) remplacés par CORE-001 de yukki
  (anciennement export CSV Trivy / RoleBinding du portail). Bonnes pratiques
  ajustées avec un exemple `claude not found` au lieu d'un code HTTP 403.
