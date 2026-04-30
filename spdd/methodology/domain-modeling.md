---
id: METHO-domain-modeling
title: Modélisation de domaine (DDD tactique allégé)
version: 1
status: published
applies-to: [spdd-analysis, spdd-reasons-canvas]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://en.wikipedia.org/wiki/Domain-driven_design
  - https://learn.microsoft.com/en-us/archive/msdn-magazine/2009/february/best-practice-an-introduction-to-domain-driven-design
---

# Modélisation de domaine (DDD tactique allégé)

## Définition

Identifier les briques métier d'une feature avant d'écrire la moindre ligne
de code : *quels objets ont une identité, quelles règles sont sacrées, où
sont les frontières externes*. C'est la matière première des sections
**Concepts** (analyse) et **Entities** (canvas REASONS).

## Heuristiques d'identification

Pour chaque feature, parcourir cette grille à 5 entrées :

| Brique | Identifier en cherchant... | Exemples |
|---|---|---|
| **Entity** | un nom du domaine avec **identité stable** et un **cycle de vie** (créée, mutée, archivée) | `User`, `Order`, `TrivyReport`, `Application` (k8s) |
| **Value Object** | un nom **défini par ses attributs**, sans identité propre, **immutable** | `Email`, `Money`, `Vulnerability`, `Coordinate` |
| **Invariant** | une règle métier **toujours vraie** ("ne jamais...", "doit toujours...") | "Un solde n'est jamais négatif", "Toute vulnérabilité a un CVE" |
| **Integration point** | un **verbe externe** : appel d'API tierce, lecture/écriture k8s, accès file system, message broker | "lit les pods k8s", "écrit dans Stripe", "publie sur Kafka" |
| **Domain event** | un **fait passé** important du métier ("a été créé", "a expiré") | `OrderPlaced`, `ReportGenerated`, `NamespaceLabelled` |

### Questions à poser pendant l'analyse

- Quel est l'**objet central** dont on suit le cycle de vie ?
- Quels objets sont **interchangeables si leurs attributs sont identiques** (= Value Objects) ?
- Quelle règle métier **ne doit jamais être violée** (= Invariant) ?
- Quelles **frontières externes** la feature traverse (= Integration points) ?
- Quels **événements** déclenchent ou résultent de la feature (= Domain Events) ?

## Exemple concret — Export CSV des vulnérabilités Trivy

Story `EXT-014` (portail k8s) :

| Brique | Instance |
|---|---|
| Entity | `TrivyReport` (CR k8s scopé à un pod, cycle de vie géré par l'opérateur Trivy) |
| Value Object | `Vulnerability` (immutable, définie par CVE + sévérité + package + version), `TrivyExportRow` (projection plate pour CSV) |
| Invariant | "Aucun CSV ne sort sans validation RBAC `get pods` sur le namespace cible" |
| Integration point | API Kubernetes (lecture des CR `TrivyReport`), filtre OIDC `JwtAuthFilter`, service `AuditLogService` |
| Domain event | aucun en v1 (l'export est synchrone, pas de webhook). Candidat futur : `TrivyExportEmitted` pour la corrélation audit. |

Cette grille remplie en 10 minutes guide directement la section *Entities*
du canvas REASONS et nourrit la section *Approche stratégique* (par exemple
"on streame ligne par ligne pour respecter l'invariant de mémoire").

## Bonnes pratiques

- **Privilégier l'identification, pas l'exhaustivité** : 3 entités bien
  nommées valent mieux que 10 entités hésitantes.
- **Nommer dans la langue du domaine** (en français pour un domaine FR,
  technique pour un domaine technique) — éviter le franglais artificiel.
- **Un invariant par phrase** : "ne jamais X" ou "toujours Y", pas une
  conjonction. C'est ce qui devient une **Safeguard** dans le canvas.
- **Distinguer Entity et Value Object dès le départ** : la confusion entre
  les deux est la source d'erreur la plus fréquente. Test rapide :
  *"deux instances avec les mêmes attributs sont-elles identiques ?"* — oui
  → VO, non → Entity.

## Sources

- [Domain-driven design — Wikipedia](https://en.wikipedia.org/wiki/Domain-driven_design)
- [An Introduction to Domain-Driven Design — Microsoft Learn](https://learn.microsoft.com/en-us/archive/msdn-magazine/2009/february/best-practice-an-introduction-to-domain-driven-design)

## Changelog

- 2026-04-30 — v1 — création initiale
