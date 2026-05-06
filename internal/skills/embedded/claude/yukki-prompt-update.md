---
name: yukki-prompt-update
description: "Étape 6a du workflow SPDD : quand la logique métier doit changer (bug, malentendu, raffinement), met à jour de façon ciblée les sections affectées du canvas REASONS sans toucher au reste, puis propose de régénérer uniquement les Operations impactées via /yukki-generate. C'est la voie 'prompt first' — toute évolution comportementale passe ici avant de toucher au code."
argument-hint: "<id-slug> <description du changement>"
user_invocable: true
---

# /yukki-prompt-update — Mise à jour ciblée d'un canvas REASONS

Sixième étape (variante "logique") du workflow [Structured Prompt-Driven Development](../../.yukki/README.md).

**Règle fondamentale SPDD** : tout changement de **comportement** se fait dans le
canvas d'abord, puis on régénère le code. On n'édite **jamais** le code en
premier pour un changement de logique — sinon le canvas devient un mensonge
versionné. Pour un refactor pur (sans changement observable), utiliser `/yukki-sync` à la place.

## Entrée

`$ARGUMENTS` doit contenir :
- l'id-slug de la feature (`EXT-014-trivy-csv-export`) ou un chemin vers le canvas
- une description du changement à opérer ("on veut aussi exporter les CVE de niveau LOW", "le quota Standard passe de 100 à 250 par mois", etc.)

Si l'un manque → demander à l'utilisateur avant de continuer.

## Étape 1 — Charger les artefacts

1. Lire le canvas cible.
2. Vérifier le `status` :
   - `draft` ou `reviewed` → continuer (le canvas n'a pas encore été générée).
   - `implemented` ou `synced` → continuer aussi, mais signaler que la régénération suivra.
3. Lire la story et l'analyse référencées pour comprendre le contexte initial.

## Étape 2 — Cartographier l'impact du changement

Pour le changement décrit, identifier **précisément** quelles sections REASONS sont affectées :

| Type de changement | Sections probablement touchées |
|---|---|
| Nouvelle règle métier (ex. inclure niveau LOW) | R (DoD), A, O (Operations concernées), parfois N |
| Changement de seuil / quota | R (DoD), parfois A, O |
| Nouvelle entité ou attribut | E, S, O |
| Nouveau cas d'erreur ou code retour | O, S (Safeguards) |
| Nouvelle norme / contrainte sécu | N, S |
| Changement de stratégie d'archi | A, S, O |

**Règle d'or** : ne toucher **que** les sections affectées. Les sections
inchangées doivent rester strictement identiques (pas de reformulation cosmétique).

Présenter cette cartographie à l'utilisateur **avant** d'éditer le canvas
("Je vais modifier R.DoD, O3 et S.Safeguards, le reste reste tel quel — OK ?").

## Étape 3 — Éditer le canvas

Pour chaque section impactée :

1. **R — Requirements** : ajouter / modifier / retirer des items de la DoD. Garder le format checkbox.
2. **E — Entities** : ajouter une entité, modifier un champ, ajuster une cardinalité. Ne pas reformuler les entités intactes.
3. **A — Approach** : si la stratégie change, le réécrire ; sinon ne pas y toucher.
4. **S — Structure** : ajouter / retirer / déplacer une ligne dans le tableau. Mettre à jour le schéma ASCII si présent.
5. **O — Operations** :
   - Modifier une Operation existante → garder son numéro, mettre à jour signature / comportement / tests.
   - Ajouter une Operation → numéro suivant disponible (`On+1`).
   - Supprimer une Operation → la marquer `~~On — titre~~ (supprimée le YYYY-MM-DD : raison)` au lieu de la retirer, pour la traçabilité.
6. **N — Norms** : préciser une norme spécifique au changement, sans dupliquer l'existant.
7. **S — Safeguards** : ajouter un invariant si le changement crée un nouveau risque. Ne pas en retirer sans justification explicite dans la sortie.

## Étape 4 — Front-matter et historique

1. `updated` : date du jour.
2. `status` : repasser à `reviewed` si on était en `implemented` (signal que le code n'est plus aligné).
3. **Ajouter un changelog** au fichier (créer la section `## Changelog` à la fin si absente) :
   ```markdown
   ## Changelog
   - 2026-04-30 — `<sections touchées>` — <description courte du changement>
   ```

## Étape 5 — Restituer et chaîner

Afficher :
- Diff des sections modifiées (résumé des changements, pas le diff brut)
- Liste des Operations impactées (à régénérer)
- Suite recommandée :
  - **Si la story est aussi à mettre à jour** (ex. nouveau AC) → le faire en complément, en mettant aussi à jour son `updated`.
  - **Régénération ciblée** : `/yukki-generate <id-slug>` — la commande relira le canvas et appliquera les écarts. **Ne pas régénérer le code des Operations non touchées** (le rappeler à l'utilisateur).
  - **Si tests existants concernés** → les revoir manuellement avant de relancer la suite.

## Checklist avant de rendre la main

- [ ] Cartographie d'impact validée par l'utilisateur avant édition
- [ ] Aucune section non affectée n'a été reformulée
- [ ] Le changement est tracé en bas du canvas dans `## Changelog`
- [ ] `updated` mis à jour, `status` repassé à `reviewed` si nécessaire
- [ ] Operations supprimées sont barrées avec date + raison, pas effacées
- [ ] Suite (`/yukki-generate` ciblé) clairement annoncée à l'utilisateur
