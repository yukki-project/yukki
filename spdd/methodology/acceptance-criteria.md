---
id: METHO-acceptance-criteria
title: Formulation des Acceptance Criteria (Given/When/Then, déclaratif)
version: 1
status: published
applies-to: [spdd-story, spdd-prompt-update, spdd-reasons-canvas]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://martinfowler.com/bliki/GivenWhenThen.html
  - https://cucumber.io/docs/bdd/better-gherkin/
  - https://www.parallelhq.com/blog/what-acceptance-criteria
---

# Formulation des Acceptance Criteria

## Définition

Règles de rédaction des critères d'acceptation pour qu'ils soient
**testables, observables, non ambigus**. Format imposé : **Given / When /
Then** (Daniel Terhorst-North, popularisé par Cucumber et Martin Fowler).

## Format Given / When / Then

Chaque AC suit la structure :

- **Given** — pré-conditions **observables** (état système, fichiers
  présents, droits, données existantes). **Pas d'implémentation** :
  - ❌ "Given un objet `User` instancié avec `role=admin`"
  - ✅ "Given un utilisateur authentifié avec le rôle admin"
- **When** — un **seul** déclencheur (action utilisateur OU événement
  système), pas une séquence :
  - ❌ "When il se connecte puis clique Export puis confirme"
  - ✅ "When il clique sur Export" (les étapes précédentes vont en Given)
- **Then** — résultat **observable** : sortie, fichier créé, code
  retour, état UI, message. **Pas de détail interne** :
  - ❌ "Then la méthode `exportCsv()` est invoquée avec `BufferedWriter`"
  - ✅ "Then un fichier CSV est téléchargé contenant N lignes"

## Style déclaratif vs impératif

Le style **déclaratif** décrit *quoi*, l'impératif décrit *comment*
clic-par-clic. Toujours préférer le déclaratif.

| Impératif (à éviter) | Déclaratif (cible) |
|---|---|
| "When l'utilisateur ouvre Chrome, navigue vers /login, tape `admin` dans le champ user, `secret` dans password, clique Submit" | "When l'utilisateur se connecte en tant qu'admin" |
| "Then le DOM contient `<div class='success'>` qui n'a pas de `display:none`" | "Then un message de succès apparaît" |

Le déclaratif est plus court, plus stable face aux changements d'UI, et
focalisé sur le **comportement métier**.

## Mots et tournures à bannir

- **"should"** → préférer des assertions observables
  ("*est* créé", "*apparaît*", "*retourne* 200")
- **"etc.", "...", "et plus"** → être exhaustif ou écrire une AC séparée
- **Termes vagues** : "rapide", "sécurisé", "bien formaté",
  "performant" → quantifier ou détailler
- **Plusieurs comportements dans une même AC** ("le fichier est créé ET
  le mail est envoyé ET le log est écrit") → **AC distinctes**

**Règle d'or** : *une AC = un cas testable*. Si tu peux écrire 2 tests
indépendants pour la même AC, scinde-la.

## Granularité : combien d'AC ?

| Nombre d'AC | Diagnostic |
|---|---|
| 1 | story trop pauvre — peut-être une tâche, pas une story |
| **3-5** | **sweet spot** ([Parallel HQ](https://www.parallelhq.com/blog/what-acceptance-criteria), Mike Cohn) |
| 6-7 | acceptable pour story fondatrice ou multi-personas, mais à challenger via [`invest.md`](invest.md) |
| 8+ | **alarme** — la story est probablement trop grosse, scinder via [`spidr.md`](spidr.md) |

## Couverture minimale

Dans les 3-5 AC, viser au minimum :

- au moins **1 cas nominal** (happy path)
- au moins **1 cas d'erreur utilisateur** (input invalide, droit manquant)
- au moins **1 cas limite** (vide, max, edge case fonctionnel) — voir
  [`edge-cases.md`](edge-cases.md) pour les techniques d'identification

## Exemple concret — CORE-001 de yukki

Story [`CORE-001-cli-story-via-claude`](../stories/CORE-001-cli-story-via-claude.md). Trois AC représentatives, une par angle de couverture :

### AC nominal (happy path) — AC1

> **Given** un utilisateur a `claude` CLI installé et authentifié, et un
> répertoire `stories/` (vide ou non) dans son projet
>
> **When** il lance `yukki story "ajouter un export CSV des
> vulnérabilités Trivy"`
>
> **Then** un fichier `stories/STORY-001-export-csv-trivy.md` est créé
> respectant le template, et le chemin est affiché sur stdout

### AC erreur utilisateur — AC4

> **Given** l'utilisateur lance `yukki story` sans argument et sans stdin
>
> **When** la commande s'exécute
>
> **Then** un message d'usage est affiché sur stderr, le code retour
> signale une erreur utilisateur, aucun appel à `claude`, aucun fichier
> créé

### AC cas limite — AC6 (template manquant)

> **Given** le binaire est lancé dans un répertoire **sans**
> `templates/story.md` ni configuration spécifique
>
> **When** la commande s'exécute
>
> **Then** le template embarqué dans le binaire est utilisé en fallback,
> et un message informatif sur stderr indique cette source

Trois ACs, trois angles de couverture (nominal / erreur user / cas
limite), chacune en Given/When/Then **déclaratif**, **observable**, sans
"should" ni détail d'implémentation.

## Sources

- [Given When Then — bliki Martin Fowler](https://martinfowler.com/bliki/GivenWhenThen.html)
- [Writing better Gherkin — Cucumber](https://cucumber.io/docs/bdd/better-gherkin/)
- [What Is Acceptance Criteria — Parallel HQ](https://www.parallelhq.com/blog/what-acceptance-criteria)

## Changelog

- 2026-04-30 — v1 — création initiale
