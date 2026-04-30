---
name: spdd-story
description: "Étape 1 du workflow SPDD : transforme une exigence libre (paragraphe, ticket, dump Slack) en user story INVEST formatée avec critères Given/When/Then et la sauve dans spdd/stories/<id>-<slug>.md. Utilise quand on démarre une nouvelle feature et qu'on veut produire l'artefact d'intention versionné avant toute analyse ou code."
argument-hint: "<description libre OU chemin vers un brouillon>"
user-invocable: true
---

# /spdd-story — Génération d'une user story SPDD

Première étape du workflow [Structured Prompt-Driven Development](../../../spdd/README.md).
Produit une user story versionnée à partir d'une exigence en format libre.

## Entrée

L'argument peut être :
- une description libre de la feature ("on veut exporter les rapports Trivy en CSV...")
- un chemin vers un fichier brouillon contenant la description
- vide → demander la description à l'utilisateur

## Étape 1 — Charger le template et l'arbo existante

1. Lire [spdd/templates/story.md](../../../spdd/templates/story.md) — c'est la structure cible.
2. Lister `spdd/stories/` (via `#codebase`) pour voir les `id` déjà utilisés et éviter une collision.

## Étape 2 — Extraire l'intention

Analyser l'argument et identifier :
- Le **problème** à résoudre (en 1-2 phrases)
- La **valeur métier** (qui en bénéficie, gain mesurable)
- Le **périmètre** explicite et implicite
- Les **modules portail** probablement concernés (`backend`, `controller`, `frontend`, `extensions/<nom>`, `common`, `helm`, `docs`)

## Étape 3 — Demander les informations manquantes

Si l'une des informations suivantes est ambiguë, **poser la question avant de générer** :
- ID à attribuer (proposer un préfixe selon le module dominant : `EXT-` pour extension, `BACK-` pour backend, `FRONT-` pour frontend, `CTRL-` pour controller, `OPS-` pour helm/infra)
- Périmètre explicite hors scope (Scope Out)
- Public cible / persona si non évident
- Critères de succès mesurables

Une fois ces points levés, **continuer sans demander** pour le reste — il vaut mieux proposer une première version révisable que multiplier les questions.

## Étape 4 — Rédiger la story

Suivre **strictement** la structure du template `spdd/templates/story.md` :
- Front-matter YAML complet (id, slug, title, status: `draft`, created, updated, owner, modules)
- Sections : Background → Business Value → Scope In → Scope Out → Acceptance Criteria → Open Questions → Notes
- **AC en Given / When / Then**, chacun testable. Au minimum 2 AC.
- Slug en kebab-case, dérivé du titre (5 mots max).

Règles :
- Ne pas spéculer sur le design ou l'implémentation — c'est le rôle de `/spdd-analysis` et `/spdd-reasons-canvas`.
- Ne pas inventer de métriques ou de chiffres absents de l'entrée — utiliser `<à confirmer>` ou ajouter en Open Questions.
- Si la demande est trop floue pour respecter INVEST (Independent/Negotiable/Valuable/Estimable/Small/Testable), **scinder en plusieurs stories** et le signaler.

## Étape 5 — Sauvegarder

1. Écrire le fichier `spdd/stories/<id>-<slug>.md`.
2. Afficher à l'utilisateur :
   - Le chemin créé (lien cliquable)
   - Un résumé : id, titre, nombre d'AC, modules touchés, Open Questions restantes
3. Proposer la suite : `/spdd-analysis spdd/stories/<id>-<slug>.md`

## Checklist avant de rendre la main

- [ ] Front-matter YAML valide et complet
- [ ] Au moins 2 AC en Given/When/Then
- [ ] Aucune décision d'implémentation dans le corps
- [ ] Open Questions explicites pour chaque ambiguïté résiduelle
- [ ] Lien cliquable vers le fichier créé affiché à l'utilisateur
