---
id: METHO-domain-modeling
title: Modélisation de domaine (DDD tactique allégé)
version: 2
status: published
applies-to: [yukki-analysis, yukki-reasons-canvas]
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

| Brique | Identifier en cherchant... | Exemples génériques |
|---|---|---|
| **Entity** | un nom du domaine avec **identité stable** et un **cycle de vie** (créée, mutée, archivée) | `User`, `Order`, `Document`, `Story` |
| **Value Object** | un nom **défini par ses attributs**, sans identité propre, **immutable** | `Email`, `Money`, `Coordinate`, `SemVer` |
| **Invariant** | une règle métier **toujours vraie** ("ne jamais...", "doit toujours...") | "Un solde n'est jamais négatif", "Un id est unique par préfixe" |
| **Integration point** | un **verbe externe** : appel d'API tierce, accès file system, subprocess, message broker | "appelle un sous-processus", "écrit dans un fichier", "publie sur un topic" |
| **Domain event** | un **fait passé** important du métier ("a été créé", "a expiré") | `OrderPlaced`, `DocumentArchived`, `StoryGenerated` |

### Questions à poser pendant l'analyse

- Quel est l'**objet central** dont on suit le cycle de vie ?
- Quels objets sont **interchangeables si leurs attributs sont identiques** (= Value Objects) ?
- Quelle règle métier **ne doit jamais être violée** (= Invariant) ?
- Quelles **frontières externes** la feature traverse (= Integration points) ?
- Quels **événements** déclenchent ou résultent de la feature (= Domain Events) ?

## Exemple concret — Story `CORE-001` de yukki

Story [`CORE-001-cli-story-via-claude`](../stories/CORE-001-cli-story-via-claude.md)
— la commande CLI `yukki story` qui orchestre `claude` pour produire une
user story SPDD :

| Brique | Instance |
|---|---|
| Entity | `Story` (un fichier `.yukki/stories/<id>-<slug>.md`, identifié par son `id`, cycle de vie `draft → reviewed → accepted`) |
| Value Object | `StoryID` (chaîne `<préfixe>-<numéro>`, immutable, deux IDs identiques sont identiques), `Description` (texte d'entrée passé à `claude`) |
| Invariant | "Le numéro d'un id généré est strictement supérieur au plus grand numéro existant pour le préfixe donné" |
| Integration point | `claude` CLI invoqué via `os/exec` (subprocess), file system (lecture du template `templates/story.md`, écriture de la story dans `stories/`) |
| Domain event | `StoryGenerated` — non réifié en v1 mais nommable (déclencheur potentiel d'un commit Git automatique post-MVP) |

Cette grille remplie en 10 minutes guide directement la section *Entities*
du canvas REASONS de CORE-001 et nourrit la section *Approche stratégique*
(par exemple "calcul d'id atomique pour respecter l'invariant d'unicité").

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
- 2026-04-30 — v2 — exemple concret remplacé par CORE-001 de yukki
  (anciennement Trivy/portail). Heuristique table également nettoyée des
  références portail (TrivyReport, Vulnerability, k8s, Stripe, Kafka,
  NamespaceLabelled) au profit d'exemples génériques transverses.
