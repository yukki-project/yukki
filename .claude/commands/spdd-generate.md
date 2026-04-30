---
name: spdd-generate
description: "Étape 5 du workflow SPDD : à partir d'un canvas REASONS validé, génère le code module par module en suivant strictement la section Operations (O1 → On), en respectant les Norms et les Safeguards. Crée ou modifie les fichiers Java/TS/YAML/Helm correspondants. Utilise après /spdd-reasons-canvas et la revue humaine du canvas."
argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"
user_invocable: true
---

# /spdd-generate — Génération de code depuis un canvas REASONS

Cinquième étape du workflow [Structured Prompt-Driven Development](../../spdd/README.md).

Le canvas est la **source de vérité**. Cette commande ne fait que projeter ce
qu'il décrit en code. **Si la réalité diverge du canvas pendant la génération,
on s'arrête et on signale** — la divergence se résout dans le canvas via
`/spdd-prompt-update`, pas en s'écartant du prompt en cours.

## Entrée

`$ARGUMENTS` doit pointer vers un canvas existant :
- `EXT-014-trivy-csv-export` (id-slug)
- `spdd/prompts/EXT-014-trivy-csv-export.md` (chemin direct)

## Étape 1 — Charger et valider le canvas

1. Lire le canvas cible.
2. Vérifier le `status` du front-matter :
   - `draft` → demander confirmation explicite (revue humaine probablement non faite).
   - `reviewed` ou `accepted` → continuer.
   - `implemented` ou `synced` → la génération a déjà eu lieu. Demander si on régénère (risque d'écraser des refactors).
3. Lire la story et l'analyse référencées dans le front-matter pour le contexte.
4. Vérifier qu'aucune section R-E-A-S-O-N-S n'est restée en placeholder. Si oui, **arrêter** et signaler — il faut compléter le canvas avant de générer.

## Étape 2 — Plan d'exécution

Avant d'écrire du code :

1. Lister chaque Operation `O1, O2, ..., On` du canvas avec :
   - Module cible
   - Fichier (chemin précis)
   - Action (création / modification)
2. Présenter ce plan à l'utilisateur sous forme de checklist.
3. Pour chaque fichier qui sera **modifié** (pas créé), le lire d'abord pour comprendre l'existant.
4. Si le canvas demande de modifier un fichier qui n'existe pas, ou de créer un fichier qui existe déjà avec un contenu non-trivial, **arrêter** et confirmer avec l'utilisateur.

## Étape 3 — Générer Operation par Operation

Pour chaque Operation dans l'ordre du canvas :

1. **Implémenter strictement la signature** déclarée. Pas de paramètre supplémentaire,
   pas de retour différent. Si la signature s'avère insuffisante en pratique, **arrêter**
   et signaler — c'est un signal qu'il faut mettre à jour le canvas d'abord.
2. **Respecter les Norms** du canvas : logging, nommage, observabilité, i18n, sécurité.
3. **Respecter les Safeguards** : ils sont non-négociables. Si une Operation
   semble obliger à enfreindre un Safeguard, **arrêter** et signaler la contradiction.
4. **Écrire les tests** annoncés dans la sous-section "Tests" de l'Operation, dans
   le module de tests approprié :
   - backend : `backend/src/test/java/...`
   - controller : `controller/src/test/java/...`
   - frontend : `*.spec.ts` à côté du fichier produit
   - extensions : selon la convention de l'extension
5. **Mettre à jour la checklist** affichée à l'utilisateur (`O1 ✓`, `O2 …`).

Règles transverses :
- **Pas de code mort** : ne pas générer une méthode pour une éventuelle Operation
  future absente du canvas.
- **Pas de feature flag, pas de retro-compat fictive** : le canvas est la spec, le
  code la suit littéralement.
- **Pas de TODO sans propriétaire** : si un détail manque, lever une Open Question
  dans la story et stopper, plutôt que d'écrire `TODO: à voir`.

## Étape 4 — Vérifications post-génération

Une fois toutes les Operations implémentées :

1. **Compiler / type-check** les modules touchés :
   - backend / controller / common : `mvn -pl <module> -am compile -DskipTests` (utiliser le skill `/build` si pertinent)
   - frontend : `yarn --cwd frontend tsc --noEmit` ou la commande équivalente du projet
2. **Lancer les tests unitaires** des modules touchés. En cas d'échec :
   - Si l'échec révèle une erreur de génération (signature mal respectée, oubli) → corriger directement dans le code généré.
   - Si l'échec révèle un défaut de **spec** (le canvas est imprécis ou contradictoire) → **arrêter** et proposer `/spdd-prompt-update`.
3. Si la feature ajoute un endpoint REST → proposer `/spdd-api-test` pour la validation fonctionnelle.

## Étape 5 — Mettre à jour le canvas et restituer

1. Dans le front-matter du canvas, passer `status: implemented` et mettre `updated` à la date du jour.
2. Afficher à l'utilisateur :
   - La checklist des Operations (toutes cochées)
   - La liste des fichiers créés / modifiés (liens cliquables)
   - Le résultat des compilations / tests
   - La suite suggérée :
     - `/spdd-api-test <id-slug>` si endpoints REST
     - revue de code humaine sur le diff
     - `/spdd-sync <id-slug>` après tout refactor manuel

## Checklist avant de rendre la main

- [ ] Toutes les Operations du canvas sont implémentées (aucune skippée silencieusement)
- [ ] Aucune méthode publique générée n'a une signature différente de celle déclarée
- [ ] Tous les Safeguards ont été respectés
- [ ] Tests unitaires annoncés écrits et au vert
- [ ] Compilation / type-check OK sur les modules touchés
- [ ] `status` du canvas passé à `implemented`
- [ ] Aucun TODO sans propriétaire ni Open Question pendante non levée
