---
id: METHO-decisions
title: Format Y-Statement pour l'approche stratégique
version: 1
status: published
applies-to: [yukki-analysis, yukki-reasons-canvas]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://adr.github.io/
  - https://martinfowler.com/bliki/ArchitectureDecisionRecord.html
---

# Format Y-Statement pour l'approche stratégique

## Définition

L'*Approche stratégique* d'une analyse SPDD (et la section *A — Approach* du
canvas REASONS) doit suivre un format imposé : le **Y-Statement** (variante
légère d'un ADR de Michael Nygard, conceptualisée par Olaf Zimmermann).
Force la rigueur en exigeant explicitement une alternative écartée et un
trade-off accepté.

## Le format

> Pour résoudre **\<problème\>**, on choisit **\<direction A\>**, plutôt que
> **\<alternative B\>** et **\<alternative C\>**, pour atteindre **\<qualité
> Q\>**, en acceptant **\<coût Z\>**.

Cinq slots, chacun obligatoire.

## Heuristiques

| Slot | Règle |
|---|---|
| `<problème>` | Constat **factuel**, pas une opinion. Une phrase max. |
| `<direction A>` | La direction technique retenue, en termes opérationnels. |
| `<alt B>`, `<alt C>` | **Au moins une** alternative écartée nommée. Pas "on choisit X" sans alternative. |
| `<qualité Q>` | Critère **mesurable** ou **nommable** (latence, lisibilité, traçabilité, coût de maintenance), pas un superlatif ("mieux", "plus moderne"). |
| `<coût Z>` | Trade-off accepté **nommé**. Pas "X est mieux à tout point de vue" — il y a toujours un coût. |

### Anti-patterns

- ❌ **Pas d'alternative nommée** : *"on choisit X parce que c'est mieux"*.
- ❌ **Qualité qualitative vague** : *"pour atteindre une meilleure architecture"*.
- ❌ **Pas de coût** : *"sans inconvénient"*. (Un design sans coût est un design qu'on n'a pas vraiment évalué.)
- ❌ **Alternative paille (straw man)** : *"plutôt que de tout coder à la main"* — une alternative qu'on n'aurait jamais retenue n'est pas une vraie alternative.
- ❌ **Multiplier les Y-Statements pour des micro-décisions** : un seul par section *Approche stratégique*. Les micro-décisions vont en *Operations* du canvas.

## Exemple concret — META-001 (cette story)

> Pour résoudre la **duplication / dérive silencieuse causée par l'inlining
> des techniques dans les skills**, on choisit de créer un dossier
> **`.yukki/methodology/` avec un fichier markdown par technique**, plutôt
> qu'un **fichier monolithique unique** ou que **l'inlining persistant**,
> pour atteindre la **traçabilité bidirectionnelle, la réutilisabilité
> entre skills et le versionning indépendant**, en acceptant **la
> maintenance de N fichiers et un Read supplémentaire par l'agent**.

Cinq slots remplis : problème factuel (duplication/dérive), direction
opérationnelle (`methodology/`), deux alternatives explicites (monolithique,
inlining), qualité nommable (traçabilité, réutilisabilité, versionning),
coût explicite (N fichiers, Read supplémentaire).

## Place dans le canvas REASONS

Le Y-Statement va dans la section **A — Approach**, en tête. Les
alternatives mentionnées dans le Y-Statement sont reprises et **détaillées
en sous-section "Alternatives écartées"** juste en dessous, avec la raison
de chaque rejet.

## Sources

- [adr.github.io — index des formats ADR](https://adr.github.io/)
- [Architecture Decision Record — bliki Martin Fowler](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- Y-Statement — concept d'Olaf Zimmermann (référencé dans `adr.github.io`)

## Changelog

- 2026-04-30 — v1 — création initiale
