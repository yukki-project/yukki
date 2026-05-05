---
id: <ID>
slug: <kebab-case-slug>
story: .yukki/stories/<ID>-<slug>.md
canvas: .yukki/prompts/<ID>-<slug>.md
status: draft
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

# Tests — <titre>

> Prompt structuré pour la génération des tests unitaires associés à la story
> `<ID>-<slug>`. Étape 6 du workflow SPDD (template-driven).

## Cibles

Pour chaque Operation du canvas (`.yukki/prompts/<ID>-<slug>.md` section O) :

- Module / fichier sous test
- Niveaux : unitaire (logique pure) / intégration (modules collaborant) / contrat (provider mocké)
- Cas couverts : ≥ 1 happy path + erreurs + cas limites identifiés en analyse

## Règles de rédaction

- Tests **table-driven** quand applicable (entrées multiples avec même logique)
- Helpers de test isolés dans `*_test.go` du même package
- Mocks injectés via interfaces (cf. `Provider` du canvas)
- Pas d'invocation réelle de dépendances externes (`claude`, API tierce) en CI
- Coverage cible : ≥ 70 % sur les packages métier

## Cas à couvrir

Tableau dérivé de la section *Cas limites identifiés* de l'analyse + des
*Tests* annoncés dans chaque Operation du canvas.

| Source | Cas | Niveau | Module / fichier |
|---|---|---|---|
| analyse §Boundaries | … | unitaire | … |
| canvas Op N — Tests | … | intégration | … |

## Sources

- Méthodologie SPDD : <https://martinfowler.com/articles/structured-prompt-driven/>
- Cas limites : `.yukki/methodology/edge-cases.md`

## Changelog

- <YYYY-MM-DD> — v1 — création initiale
