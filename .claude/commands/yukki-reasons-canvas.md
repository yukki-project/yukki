---
name: yukki-reasons-canvas
description: "Étape 4 du workflow SPDD : à partir d'une analyse SPDD validée, génère le canvas REASONS complet (Requirements-Entities-Approach-Structure-Operations-Norms-Safeguards) avec signatures concrètes en section Operations, et le sauve dans .yukki/prompts/<id>-<slug>.md. C'est la spec exécutable consommée par /yukki-generate. Utilise après /yukki-analysis et la revue humaine."
argument-hint: "<id-slug OU chemin vers .yukki/analysis/...>"
user_invocable: true
---

# /yukki-reasons-canvas — Génération du canvas REASONS

Quatrième étape du workflow [Structured Prompt-Driven Development](../../.yukki/README.md).

Produit la **spec exécutable** (canvas REASONS) qui sert de source de vérité
pour la génération de code. Tout changement de logique ultérieur passera **d'abord**
par ce fichier (via `/yukki-prompt-update`), pas par le code.

## Entrée

`$ARGUMENTS` doit pointer vers une analyse existante :
- `EXT-014-trivy-csv-export` (id-slug)
- `.yukki/analysis/EXT-014-trivy-csv-export.md` (chemin direct)

L'analyse doit être en statut `reviewed` ou `accepted` dans son front-matter.
Si elle est encore en `draft` → demander confirmation avant de continuer.

## Étape 1 — Charger les artefacts

1. Lire le template [.yukki/templates/canvas-reasons.md](../../.yukki/templates/canvas-reasons.md).
2. Lire l'analyse cible.
3. Lire la story référencée dans le front-matter de l'analyse (`story:`).
4. Vérifier qu'aucun canvas n'existe déjà à `.yukki/prompts/<id>-<slug>.md`. Si oui :
   - Soit la story est en cours d'itération → proposer `/yukki-prompt-update` à la place.
   - Soit demander explicitement à l'utilisateur s'il veut écraser.

## Étape 2 — Lecture ciblée du code de référence

Pour chaque module listé en `Modules impactés` de l'analyse, lire les fichiers
les plus représentatifs (1 à 3 par module) afin d'aligner les signatures
proposées en section `O — Operations` sur les conventions existantes :

- backend : un `*Resource.java` similaire + son `*Service.java`
- controller : un `*Reconciler.java` similaire
- frontend : un `*.service.ts` + son trio reducer/effect/selector
- extensions : `manifest.yaml` + `index.js` d'une extension proche

But : que les signatures du canvas reflètent **réellement** les conventions du repo
(types Fabric8, retours `Response`/`Uni`, NgRx Actions/Effects, etc.).

## Étape 3 — Remplir les 7 sections REASONS

> Ordre recommandé. Chaque section construit sur les précédentes.

### R — Requirements
- Reformuler le problème en 1-3 phrases.
- DoD : une checklist testable, alignée sur les AC de la story.

### E — Entities
- Tableau des entités métier (existantes + nouvelles).
- Relations et cardinalités.
- **Pas** de structure de classe Java/TS — c'est du domaine.

### A — Approach
- Stratégie de résolution (5-15 lignes).
- Alternatives écartées + raison.
- Reprendre les arbitrages déjà tranchés dans la section "Approche stratégique" de l'analyse.

### S — Structure
- Tableau `Module / Fichiers principaux / Nature du changement`.
- Schéma ASCII si le flux est non-trivial (REST → service → CRD → UI).

### O — Operations
- **Le cœur du canvas** — c'est ce que `/yukki-generate` consommera.
- Une opération = une unité testable, avec :
  - Module concerné
  - Fichier (chemin précis)
  - **Signature complète** (types, annotations, exceptions)
  - Comportement étape par étape
  - Tests à écrire (cas nominal + 1-2 cas limites). Pour le **format
    et la nature des tests** — pyramide cible, naming, smells à
    éviter, seuils de coverage, choix unit/integration/e2e — se
    référer aux refs cluster testing :
    [`.yukki/methodology/testing/testing-frontend.md`](../../.yukki/methodology/testing/testing-frontend.md)
    pour les Operations frontend (UI / composants /
    state management) et
    [`.yukki/methodology/testing/testing-backend.md`](../../.yukki/methodology/testing/testing-backend.md)
    pour les Operations backend (services / I/O / APIs / CLI).
- Ordre d'exécution explicite (O1 → O2 → ... — utile pour bâtir incrémentalement).

### N — Norms
- Récupérer les normes par défaut du template.
- **Adapter** au cas d'espèce : si la feature ne touche pas le frontend, retirer
  les normes Angular ; si elle ajoute un endpoint REST, expliciter les exigences
  de pagination, scopes OIDC, en-têtes de cache.

### S — Safeguards
- Reprendre les invariants par défaut du template.
- **Ajouter** les invariants spécifiques à la story (souvent issus de la section
  "Risques" de l'analyse). Formulation négative : "ne jamais...", "interdit de...".

## Étape 4 — Front-matter et cohérence

- `id`, `slug` : identiques à l'analyse et la story.
- `story:` et `analysis:` : pointer vers les fichiers correspondants.
- `status: draft`.
- `created` / `updated` : date du jour.

## Étape 5 — Sauvegarder et restituer

1. Écrire `.yukki/prompts/<id>-<slug>.md`.
2. Afficher :
   - Lien cliquable vers le fichier
   - Liste des Operations (numéros + titres)
   - Liste des Safeguards critiques ajoutés (au-delà du template)
3. Proposer la suite : `/yukki-generate .yukki/prompts/<id>-<slug>.md` — en rappelant
   qu'une revue humaine du canvas est attendue avant génération de code.

## Checklist avant de rendre la main

- [ ] Les 7 sections R-E-A-S-O-N-S sont remplies (aucune ne reste en placeholder)
- [ ] La DoD couvre 100 % des AC de la story
- [ ] Chaque Operation a une signature complète (pas seulement un nom de méthode)
- [ ] Chaque Operation indique au moins un test à écrire
- [ ] Les Safeguards reflètent les risques majeurs de l'analyse
- [ ] Front-matter cohérent (id/slug/story/analysis pointent au bon endroit)
- [ ] Aucune contradiction avec la story ni l'analyse — sinon, lever une Open Question dans la story et stopper avant génération
