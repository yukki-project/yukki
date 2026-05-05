---
name: yukki-analysis
description: "Étape 3 du workflow SPDD : à partir d'une user story SPDD, scanne le codebase de manière ciblée (mots-clés métier + modules listés dans le front-matter), distingue les concepts existants des nouveaux, identifie risques et cas limites en s'appuyant sur les techniques de .yukki/methodology/, puis sauve l'analyse dans .yukki/analysis/<id>-<slug>.md. Utilise après /yukki-story et avant /yukki-reasons-canvas."
argument-hint: "<id-slug OU chemin vers .yukki/stories/...>"
user-invocable: true
---

# /yukki-analysis — Analyse stratégique d'une story SPDD

Troisième étape du workflow [Structured Prompt-Driven Development](../../../.yukki/README.md).
Produit le contexte stratégique nécessaire à la génération du canvas REASONS.

> Les techniques mobilisées par cette commande (modélisation domaine,
> taxonomie de risques, cas limites, format de décision) **vivent dans**
> [`.yukki/methodology/`](../../../.yukki/methodology/) — pas dans ce skill.
> **Le skill orchestre, les refs définissent.** Aucune technique n'est
> redéfinie ici.

## Entrée

L'argument doit pointer vers une story existante :
- `EXT-014-trivy-csv-export` (id-slug) → résolu en `.yukki/stories/EXT-014-trivy-csv-export.md`
- `.yukki/stories/EXT-014-trivy-csv-export.md` (chemin direct)

Si la story n'existe pas → afficher l'erreur et proposer `/yukki-story`.

## Étape 1 — Charger les artefacts

1. Lire le template [`.yukki/templates/analysis.md`](../../../.yukki/templates/analysis.md).
2. Lire la story cible.
3. Extraire du front-matter : `id`, `slug`, `modules`, `title`.

## Étape 2 — Extraire les mots-clés métier

À partir du corps de la story (Background, Business Value, AC) :
- Identifier 5 à 10 termes saillants (entités, actions, formats, rôles, acronymes).
- **Exclure** les mots vides (`utilisateur`, `système`, `feature`, etc.).
- Conserver les acronymes et noms propres (Trivy, OIDC, CSV, RBAC, …).

Afficher la liste à l'utilisateur **avant de scanner** pour qu'il puisse corriger.

## Étape 3 — Scan ciblé du codebase

Pour chaque module listé dans le front-matter de la story, **dériver les chemins depuis la convention du projet courant** — ne pas hardcoder une stack particulière. Heuristiques :

| Type de module (suivant la stack) | Glob typique |
|---|---|
| `cmd/<binaire>` (Go) | `cmd/<binaire>/**/*.go` |
| `internal/<package>` (Go) | `internal/<package>/**/*.go` |
| `backend/...` (Java/Quarkus) | `backend/src/main/java/**`, `*Resource.java`, `*Service.java` |
| `frontend/...` (Angular/React/Vue) | `frontend/**/*.{ts,html,scss}` |
| `extensions/<nom>` | `extensions/<nom>/**` |
| `helm/`, `kustomize/` | `**/values.yaml`, `**/templates/*.yaml` |
| `docs/` | `docs/**/*.{md,adoc}` |

**Règles** :
- **Scan ciblé**, pas exhaustif : poser un diagnostic, pas tout lire.
- Si un mot-clé renvoie >50 résultats, raffiner avec un autre mot-clé combiné.
- Préférer plusieurs requêtes `#search` précises à une lecture intégrale via `#codebase`.

## Étape 4 — Synthétiser

Remplir le template `.yukki/templates/analysis.md`. Chaque section s'appuie sur **une technique de** [`.yukki/methodology/`](../../../.yukki/methodology/) :

### 4.1 — Concepts de domaine

Identifier les **entités, value objects, invariants, integration points et domain events** selon [`.yukki/methodology/domain-modeling.md`](../../../.yukki/methodology/domain-modeling.md). Distinguer :

- **Concepts existants** : nom, où ils vivent (chemin/classe), comment ils sont utilisés, contraintes connues
- **Concepts nouveaux** : à introduire, justifier pourquoi ils ne sont pas couverts par l'existant

### 4.2 — Approche stratégique

Rédiger l'approche **au format Y-Statement** selon [`.yukki/methodology/decisions.md`](../../../.yukki/methodology/decisions.md) :

> *Pour résoudre **\<problème\>**, on choisit **\<direction A\>**, plutôt que **\<alt B\>** et **\<alt C\>**, pour atteindre **\<qualité Q\>**, en acceptant **\<coût Z\>**.*

Lister les alternatives écartées en sous-section, chacune avec sa raison de rejet.

### 4.3 — Modules impactés

Tableau `Module / Impact (fort|moyen|faible) / Nature (création|modification|migration)`.

### 4.4 — Dépendances et intégrations

CRDs, APIs externes, librairies clés, contraintes non-fonctionnelles (parseabilité, encodage…).

### 4.5 — Risques

Identifier les risques selon les **6 catégories** de [`.yukki/methodology/risk-taxonomy.md`](../../../.yukki/methodology/risk-taxonomy.md) (Sécurité — avec STRIDE en sous-cadre / Performance-Reliability / Opérationnel / Intégration / Data / Compatibilité). Chaque risque : *Impact, Probabilité, Mitigation*.

### 4.6 — Cas limites

Énumérer les cas limites selon [`.yukki/methodology/edge-cases.md`](../../../.yukki/methodology/edge-cases.md) (BVA + EP + checklist 7 catégories).

### 4.7 — Décisions à prendre avant le canvas

Checklist actionnable des décisions à trancher en revue humaine avant `/yukki-reasons-canvas`.

### Granularité

| Élément | Sweet spot | Au-delà |
|---|---|---|
| Concepts (existants + nouveaux) | **3-7** | scinder ou simplifier la story |
| Risques majeurs | **3-5** | concentrer sur ceux qui changent l'archi |
| Cas limites | **3-5** | la story est probablement trop grosse, escalade |
| Décisions à prendre | **2-4** | trancher en revue avant le canvas |

### Front-matter de l'analyse

Reprendre `id`/`slug` de la story, `story:` pointe vers le fichier story, `status: draft`, `created`/`updated` à la date du jour.

## Étape 5 — Sauvegarder

1. Écrire `.yukki/analysis/<id>-<slug>.md`.
2. Afficher :
   - Le chemin créé (lien cliquable)
   - Le tableau des modules impactés
   - La liste des décisions à prendre
3. Proposer : `/yukki-reasons-canvas <id-slug>` — en rappelant qu'**une revue humaine est attendue** avant de générer le canvas.

## Signaux d'escalade vers `/yukki-story`

Si l'analyse révèle :
- Story floue ou contradictoire avec le code existant
- AC manquante pour un cas critique découvert pendant le scan
- Découpage SPIDR évident raté (story aurait dû être 2-3 stories)
- Périmètre dérivant (l'analyse veut tirer plus large que la story)
- Nouveau bounded context absent de la story

→ **Stopper** et proposer un retour `/yukki-story` plutôt que produire une analyse incohérente.

## Checklist avant de rendre la main

- [ ] Mots-clés validés par l'utilisateur avant le scan
- [ ] Tous les modules du front-matter de la story ont été scannés
- [ ] Concepts identifiés selon les 5 briques de `domain-modeling.md` (Entity / Value Object / Invariant / Integration / Domain Event)
- [ ] Approche stratégique au format Y-Statement de `decisions.md` (≥1 alternative + trade-off nommé)
- [ ] Risques couvrent les catégories pertinentes de `risk-taxonomy.md` (3-5 risques majeurs)
- [ ] Cas limites issus de la checklist 7 catégories de `edge-cases.md` (3-5 cas limites)
- [ ] Granularité respectée (3-7 concepts / 3-5 risques / 3-5 cas limites / 2-4 décisions)
- [ ] Pas de signature ni de détail d'implémentation (réservé au canvas)
- [ ] **Aucune redéfinition d'une technique** dans le corps de l'analyse (DDD, STRIDE, BVA, Y-Statement) — uniquement liens vers `.yukki/methodology/`

## Sources de référence

- Workflow SPDD : <https://martinfowler.com/articles/structured-prompt-driven/>
- [`.yukki/methodology/`](../../../.yukki/methodology/) — techniques utilisées par cette commande :
  - [`domain-modeling.md`](../../../.yukki/methodology/domain-modeling.md) — étape 4.1
  - [`decisions.md`](../../../.yukki/methodology/decisions.md) — étape 4.2
  - [`risk-taxonomy.md`](../../../.yukki/methodology/risk-taxonomy.md) — étape 4.5
  - [`edge-cases.md`](../../../.yukki/methodology/edge-cases.md) — étape 4.6
- [`.yukki/methodology/README.md`](../../../.yukki/methodology/README.md) — index des refs
