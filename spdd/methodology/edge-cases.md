---
id: METHO-edge-cases
title: Identification des cas limites (BVA + EP + checklist)
version: 1
status: published
applies-to: [spdd-analysis, spdd-reasons-canvas]
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

Exemple sur un export selon le rôle utilisateur :

| Classe | Représentant | Comportement attendu |
|---|---|---|
| admin | `admin@corp.com` | accès total |
| viewer du namespace cible | `dev1@corp.com` (avec RoleBinding) | accès lecture |
| user sans droit | `dev2@corp.com` (sans RoleBinding) | 403 |
| token invalide | header forgé | 401 |

## Checklist 7 catégories

À parcourir systématiquement pour chaque feature non-triviale :

1. **Boundaries** — appliquer BVA sur tous les inputs numériques ou bornés
2. **Equivalence classes** — un représentant par classe d'entrée significative
3. **Null / empty / zero** — `null`, `""`, `[]`, `{}`, `0`, valeur absente, headers manquants
4. **Concurrence** — appels simultanés sur la même ressource (race conditions, double exécution, lecture pendant écriture)
5. **Failure modes** — dépendance down, timeout, OOM, disque plein, réseau coupé en plein traitement
6. **Scale** — volume 10× ou 100× du nominal (pagination, mémoire, durée)
7. **Security / negative testing** — input malformé, injection, path traversal, charset hostile, dépassement de longueur

## Exemple concret — Export CSV Trivy

| Catégorie | Cas limite identifié |
|---|---|
| Boundaries | namespace avec 0 vuln, 1 vuln, 5 000 vulns, 5 001 vulns |
| Classes d'équivalence | namespace existant et autorisé / existant et refusé / inexistant |
| Null / empty | `?namespace=` (chaîne vide) → 400 ; pas de header `Authorization` → 401 |
| Concurrence | 2 exports simultanés du même namespace par 2 utilisateurs → les deux doivent réussir indépendamment |
| Failure modes | API k8s qui timeout en plein streaming → fermer proprement le stream et logger l'incident |
| Scale | namespace à 10 000 vulnérabilités → vérifier mémoire constante (streaming respecté) |
| Security | `?namespace=../../etc/passwd` → rejet par validation k8s name regex |

Chaque cas limite identifié devient soit une **AC dans la story** (s'il est
visible utilisateur — ex. erreur 403, 400, fichier vide), soit un **test
dans la canvas Operations** (s'il est technique — ex. mémoire constante).

## Bonnes pratiques

- **3-5 cas limites majeurs** par story suffisent. Au-delà, la story est
  probablement trop grosse — voir le découpage SPIDR.
- **Chaque cas limite a un résultat attendu observable**, pas un "le système
  doit gérer". *"403 retourné, audit log enregistré, aucun fichier généré"*
  est observable.
- **Un cas limite n'est pas un bug** : c'est une **condition prévue** que la
  feature doit gérer. Si l'analyse révèle un cas non géré, retour vers la
  story (escalade).

## Sources

- [Boundary Value Analysis et Equivalence Partitioning — Guru99](https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html)
- [Edge Case Testing — Aqua Cloud](https://aqua-cloud.io/edge-cases-in-software-testing/)

## Changelog

- 2026-04-30 — v1 — création initiale
