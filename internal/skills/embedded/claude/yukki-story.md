---
name: yukki-story
description: "Étape 1 du workflow SPDD : transforme une exigence libre (paragraphe, ticket, dump Slack) en user story INVEST formatée avec critères Given/When/Then et la sauve dans .yukki/stories/<id>-<slug>.md. Utilise quand on démarre une nouvelle feature et qu'on veut produire l'artefact d'intention versionné avant toute analyse ou code."
argument-hint: "<description libre OU chemin vers un brouillon>"
user_invocable: true
---

# /yukki-story — Génération d'une user story SPDD

Première étape du workflow [Structured Prompt-Driven Development](../../.yukki/README.md).
Produit une user story versionnée à partir d'une exigence en format libre.

> Les techniques mobilisées par cette commande (INVEST, SPIDR, formulation
> des AC) **vivent dans** [`.yukki/methodology/`](../../.yukki/methodology/) —
> pas dans ce skill. **Le skill orchestre, les refs définissent.** Aucune
> technique n'est redéfinie ici.

## Entrée

`$ARGUMENTS` peut être :
- une description libre de la feature
- un chemin vers un fichier brouillon contenant la description
- vide → demander la description à l'utilisateur

## Étape 1 — Charger le template et l'arbo existante

1. Lire [`.yukki/templates/story.md`](../../.yukki/templates/story.md) — c'est la structure cible.
2. Lister `.yukki/stories/` pour voir les `id` déjà utilisés et éviter une collision.

## Étape 2 — Extraire l'intention

Analyser `$ARGUMENTS` et identifier :
- Le **problème** à résoudre (en 1-2 phrases)
- La **valeur métier** (qui en bénéficie, gain mesurable)
- Le **périmètre** explicite et implicite
- Les **modules** probablement concernés (selon le projet : `backend`, `frontend`, `cmd/<tool>`, `internal/<pkg>`, `helm`, `docs`, etc.)

## Étape 3 — Demander les informations manquantes

Si l'une des informations suivantes est ambiguë, **poser la question avant de générer** :
- ID à attribuer (proposer un préfixe selon le module dominant : `EXT-`, `BACK-`, `FRONT-`, `CTRL-`, `CORE-`, `UI-`, `INT-`, `OPS-`, `DOC-`, `META-`)
- Périmètre explicite hors scope (Scope Out)
- Public cible / persona si non évident
- Critères de succès mesurables

Une fois ces points levés, **continuer sans demander** pour le reste — il vaut mieux proposer une première version révisable que multiplier les questions.

## Étape 4 — Rédiger la story

Suivre **strictement** la structure du template `.yukki/templates/story.md` :
- Front-matter YAML complet (id, slug, title, status: `draft`, created, updated, owner, modules)
- Sections : Background → Business Value → Scope In → Scope Out → Acceptance Criteria → Open Questions → Notes
- Slug en kebab-case, dérivé du titre (5 mots max)
- Background : **3 à 6 lignes max** (le contexte étendu va en Notes)

### Règles générales

- Ne pas spéculer sur le design ou l'implémentation — c'est le rôle de `/yukki-analysis` et `/yukki-reasons-canvas`
- Ne pas inventer de métriques ou de chiffres absents de l'entrée — utiliser `<à confirmer>` ou ajouter en Open Questions
- Évaluer la story contre les **6 critères INVEST** selon
  [`.yukki/methodology/invest.md`](../../.yukki/methodology/invest.md). Si un
  critère échoue, reformuler ou — si "Small" est cassé — invoquer SPIDR
  (étape 4bis)

### Formulation des Acceptance Criteria

Suivre **strictement** les règles de
[`.yukki/methodology/acceptance-criteria.md`](../../.yukki/methodology/acceptance-criteria.md) :

- Format **Given / When / Then** (un seul déclencheur en When, résultat observable en Then)
- Style **déclaratif**, jamais impératif
- Mots et tournures bannis ("should", "etc.", termes vagues, multi-comportements ET/OU)
- **Granularité 3-5 AC** (sweet spot ; 6-7 acceptable si fondatrice ; 8+ → SPIDR)
- **Couverture minimale** : ≥1 happy + ≥1 erreur user + ≥1 cas limite
  (techniques de détection des cas limites : voir
  [`.yukki/methodology/edge-cases.md`](../../.yukki/methodology/edge-cases.md))

## Étape 4bis — Story trop grosse : scinder via SPIDR

Si l'évaluation INVEST révèle que le critère **Small** est cassé (8+ AC,
2+ modules sans deliverable partagé, plusieurs verbes métier, mix CRUD +
UI + auth + reporting, estimation > 1-2 j), évaluer le découpage selon
[`.yukki/methodology/spidr.md`](../../.yukki/methodology/spidr.md) (axes
Paths / Interfaces / Data / Rules / Spike, dans cet ordre).

**Tracer la décision SPIDR** dans la section *Notes* de la story (tableau
des 5 axes avec verdict pour chacun), même si la conclusion est "ne pas
scinder" pour les stories fondatrices justifiées.

## Étape 5 — Sauvegarder

1. Écrire le fichier `.yukki/stories/<id>-<slug>.md`.
2. Afficher à l'utilisateur :
   - Le chemin créé (lien cliquable)
   - Un résumé : id, titre, nombre d'AC, modules touchés, Open Questions restantes
   - Si la demande a été scindée : la liste des autres stories à rédiger
3. Proposer la suite : `/yukki-analysis .yukki/stories/<id>-<slug>.md`

## Checklist avant de rendre la main

- [ ] Front-matter YAML valide et complet
- [ ] Background dans la fenêtre 3-6 lignes
- [ ] **3 à 5 AC** en Given/When/Then conformes à `acceptance-criteria.md` (au-delà de 7 = découpage SPIDR à proposer)
- [ ] Couverture minimale : ≥1 happy path + ≥1 erreur utilisateur + ≥1 cas limite
- [ ] Évaluation INVEST faite et tracée si l'un des critères demande justification (cf. `invest.md`)
- [ ] Décision SPIDR tracée dans *Notes* si la story est fondatrice ou en limite haute (cf. `spidr.md`)
- [ ] Aucune décision d'implémentation dans le corps (modules, frameworks, signatures restent en `/yukki-analysis` et `/yukki-reasons-canvas`)
- [ ] Open Questions strictement comportementales (les questions de design vont en analyse / canvas)
- [ ] **Aucune redéfinition d'une technique** dans le corps (INVEST, SPIDR, Given/When/Then) — uniquement liens vers `.yukki/methodology/`
- [ ] Lien cliquable vers le fichier créé affiché à l'utilisateur

## Sources de référence

- Workflow SPDD : <https://martinfowler.com/articles/structured-prompt-driven/>
- [`.yukki/methodology/`](../../.yukki/methodology/) — techniques utilisées par cette commande :
  - [`invest.md`](../../.yukki/methodology/invest.md) — étape 4 (règles générales) + checklist
  - [`acceptance-criteria.md`](../../.yukki/methodology/acceptance-criteria.md) — étape 4 (formulation des AC)
  - [`spidr.md`](../../.yukki/methodology/spidr.md) — étape 4bis (découpage)
  - [`edge-cases.md`](../../.yukki/methodology/edge-cases.md) — couverture minimale (cas limite)
- [`.yukki/methodology/README.md`](../../.yukki/methodology/README.md) — index des refs
