---
name: spdd-analysis
description: "Étape 3 du workflow SPDD : à partir d'une user story SPDD, scanne le codebase de manière ciblée (mots-clés métier + modules listés dans le front-matter), distingue les concepts existants des nouveaux, identifie risques et cas limites, puis sauve l'analyse dans spdd/analysis/<id>-<slug>.md. Utilise après /spdd-story et avant /spdd-reasons-canvas."
argument-hint: "<id-slug OU chemin vers spdd/stories/...>"
user_invocable: true
---

# /spdd-analysis — Analyse stratégique d'une story SPDD

Troisième étape du workflow [Structured Prompt-Driven Development](../../spdd/README.md)
(la deuxième — clarification analytique humaine — se fait à l'oral / en revue).

Produit le contexte stratégique nécessaire à la génération du canvas REASONS.

## Entrée

`$ARGUMENTS` doit pointer vers une story existante :
- `EXT-014-trivy-csv-export` (id-slug) → résolu en `spdd/stories/EXT-014-trivy-csv-export.md`
- `spdd/stories/EXT-014-trivy-csv-export.md` (chemin direct)

Si la story n'existe pas → afficher l'erreur et proposer `/spdd-story`.

## Étape 1 — Charger les artefacts

1. Lire le template [spdd/templates/analysis.md](../../spdd/templates/analysis.md).
2. Lire la story cible.
3. Extraire du front-matter de la story : `id`, `slug`, `modules`, `title`.

## Étape 2 — Extraire les mots-clés métier

À partir du corps de la story (Background, Business Value, AC) :
- Identifier 5 à 10 termes métier saillants (entités, actions, formats, rôles).
- **Exclure** les mots vides (`utilisateur`, `système`, `feature`, etc.).
- Conserver les acronymes et noms propres (Trivy, OIDC, CSV, RBAC, …).

Afficher la liste à l'utilisateur **avant de scanner** pour qu'il puisse corriger.

## Étape 3 — Scan ciblé du codebase

Pour chaque module listé dans le front-matter de la story :

| Module | Où chercher | Outils |
|---|---|---|
| `backend` | `backend/src/main/java/**`, `backend/src/main/resources/**` | Grep sur les mots-clés, Glob sur `*Resource.java`, `*Service.java` |
| `controller` | `controller/src/main/java/**` | Grep + Glob sur `*Reconciler.java`, `*Controller.java` |
| `common` | `common/src/main/java/**` | Grep sur DTOs, modèles CRD |
| `frontend` | `frontend/projects/**/*.ts`, `*.html`, `*.scss` | Grep sur services, reducers, effects, composants |
| `extensions/<nom>` | `extensions/<nom>/**` | Grep sur `manifest.yaml`, `index.js`, sources |
| `helm` | `helm/`, `examples/overlays/**` | Grep sur `values.yaml`, templates |
| `docs` | `docs/modules/**/*.adoc` | Grep |

**Règles importantes** :
- **Scan ciblé, pas exhaustif** — l'objectif est de poser un diagnostic, pas de tout lire.
- Si plus de 3 modules × 5 mots-clés à explorer, **déléguer à un subagent `Explore`** avec une consigne précise (mots-clés, modules, ce qu'on cherche). Ne pas tout faire dans le contexte principal.
- Si un mot-clé renvoie >50 résultats, raffiner avec un autre mot-clé combiné, ne pas tout lire.

## Étape 4 — Synthétiser

Remplir le template `spdd/templates/analysis.md` avec :

1. **Mots-clés métier extraits** — la liste validée à l'étape 2.
2. **Concepts existants** — pour chaque concept déjà présent dans le code : nom, où il vit (chemin/classe), comment il est utilisé, contraintes connues.
3. **Concepts nouveaux** — à introduire, et pourquoi ils ne sont pas couverts par l'existant.
4. **Approche stratégique** — 5 à 8 lignes, choix d'architecture majeurs, sans descendre dans les signatures (ce sera le rôle du canvas).
5. **Modules impactés** — tableau avec impact (fort/moyen/faible) + nature (création / modif / migration).
6. **Dépendances** — CRDs, APIs externes, librairies clés.
7. **Risques** — chaque risque avec impact, probabilité, mitigation.
8. **Cas limites** — à challenger en revue ou couvrir en test.
9. **Décisions à prendre avant le canvas** — checklist actionnable.

Front-matter : reprendre `id`/`slug` de la story, `story:` pointe vers le fichier story, `status: draft`, `created`/`updated` à la date du jour.

## Étape 5 — Sauvegarder

1. Écrire `spdd/analysis/<id>-<slug>.md`.
2. Afficher :
   - Le chemin créé (lien cliquable)
   - Le tableau des modules impactés
   - La liste des décisions à prendre (Étape 4 point 9)
3. Proposer : `/spdd-reasons-canvas spdd/analysis/<id>-<slug>.md` — mais **rappeler** qu'une revue humaine de l'analyse est attendue avant de générer le canvas.

## Checklist avant de rendre la main

- [ ] Mots-clés validés par l'utilisateur avant le scan
- [ ] Tous les modules listés dans le front-matter de la story ont été scannés
- [ ] Concepts existants distingués clairement des concepts nouveaux
- [ ] Au moins 1 risque et 1 cas limite identifiés (sinon : la story est-elle assez complexe pour SPDD ?)
- [ ] Décisions à trancher explicitées
- [ ] Pas de signature ni de détail d'implémentation dans l'analyse (réservé au canvas)
