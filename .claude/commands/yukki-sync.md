---
name: spdd-sync
description: "Étape 6b du workflow SPDD : après un refactor manuel du code (renommage, extraction de helper, déplacement de fichier, modernisation syntaxique) qui ne change PAS le comportement observable, resynchronise les sections descriptives du canvas REASONS sur le code. Ne jamais utiliser pour un changement de logique — c'est /spdd-prompt-update qu'il faut alors."
argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"
user_invocable: true
---

# /spdd-sync — Resynchronisation canvas ← code (refactor seul)

Sixième étape (variante "refactor") du workflow [Structured Prompt-Driven Development](../../spdd/README.md).

Quand le code a été refactoré **sans changer le comportement observable**
(renommage, extraction d'un helper, déplacement d'un fichier, switch de framework,
modernisation syntaxique…), le canvas peut devenir périmé sur les **détails**
(signatures, chemins, noms) tout en restant juste sur **l'intention**.

Cette commande met à jour les sections **descriptives** du canvas (Structure, Operations)
pour qu'elles reflètent le code, **sans toucher** aux sections d'intention
(Requirements, Approach, Norms, Safeguards) qui n'ont pas bougé.

> **Cette commande est interdite si le comportement a changé.** Dans ce cas,
> utiliser `/spdd-prompt-update` à la place — la règle SPDD est "prompt first"
> pour tout changement de logique.

## Entrée

`$ARGUMENTS` doit pointer vers un canvas en statut `implemented` (ou `synced`) :
- `EXT-014-trivy-csv-export` (id-slug)
- `spdd/prompts/EXT-014-trivy-csv-export.md` (chemin direct)

## Étape 1 — Charger les artefacts et le code courant

1. Lire le canvas cible et vérifier que `status` est `implemented` ou `synced`. Sinon → arrêter, on n'est pas au bon point du cycle.
2. Pour chaque Operation `O1...On` listée dans le canvas, lire le fichier qu'elle référence :
   - Si le fichier existe toujours au chemin indiqué → comparer les signatures.
   - Si le fichier a disparu → repérer s'il a été renommé/déplacé (Glob sur le nom de classe ou méthode).
   - Si la méthode/fonction a disparu → lever une alerte (peut-être déplacée dans un helper).

## Étape 2 — Détecter la dérive

Construire un tableau de dérive :

| Op | Ancien chemin / signature (canvas) | Nouveau chemin / signature (code) | Type de dérive |
|---|---|---|---|
| O1 | `backend/...UserResource.exportCsv(...)` | `backend/...UserExportResource.exportCsv(...)` | fichier renommé |
| O2 | `service.computeQuota(plan)` | `quotaCalculator.compute(plan)` | extraction de helper |
| O3 | `Response.ok(data)` | `Response.ok(data).header(...)` | header ajouté |

Si une dérive **modifie le comportement observable** (statut HTTP, payload, side
effect, validation…) :
- **Arrêter immédiatement.**
- Demander à l'utilisateur de confirmer : si oui changement comportemental → `/spdd-prompt-update` ; si juste cosmétique → expliquer et reprendre.

## Étape 3 — Mettre à jour le canvas

Pour chaque dérive validée comme refactor pur :

1. **S — Structure** : mettre à jour le tableau (chemins, fichiers principaux, helpers extraits).
2. **O — Operations** : mettre à jour la signature, le chemin, le comportement décrit, **sans changer** :
   - le nom logique de l'Operation
   - les tests annoncés (s'ils sont restés sémantiquement les mêmes)
   - l'ordre des Operations
3. **Ne pas toucher** : `R`, `E`, `A`, `N`, `S — Safeguards`. Si tu te sens obligé d'y toucher, c'est probablement que ce n'était pas un refactor pur → revoir l'étape 2.

## Étape 4 — Front-matter et changelog

1. `updated` : date du jour.
2. `status` : `synced`.
3. Ajouter au `## Changelog` :
   ```markdown
   - 2026-04-30 — sync — refactor : <ce qui a bougé>, comportement inchangé
   ```

## Étape 5 — Restituer

Afficher :
- Tableau de dérive avant/après (résumé)
- Sections modifiées (Structure, Operations seulement attendues)
- Confirmation explicite : **aucun changement comportemental n'a été propagé**
- Suggestion : relancer le script `scripts/spdd/<id>-<slug>.sh` si présent, pour confirmer que les tests passent toujours (le contrat externe n'ayant pas bougé, ils doivent passer).

## Checklist avant de rendre la main

- [ ] Aucune section d'intention (R / E / A / N / Safeguards) n'a été modifiée
- [ ] Toutes les dérives détectées ont été classées "refactor pur" avec preuve
- [ ] Numérotation des Operations préservée (pas de renumérotation)
- [ ] `status: synced` et changelog enrichi
- [ ] Tests API (si existants) toujours au vert (sinon : c'était pas un refactor pur)
