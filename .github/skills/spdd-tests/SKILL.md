---
name: spdd-tests
description: "Étape 6 du workflow SPDD : à partir d'un canvas REASONS implémenté, audite la suite de tests existante (présence, pyramide, anti-cheat coverage), génère les tests manquants conformes aux refs spdd/methodology/testing/, exécute la suite et produit un rapport dans spdd/tests/<id>-<slug>.md. Utilise après /spdd-generate pour valider la couverture testing du canvas."
argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"
user-invocable: true
---

# /spdd-tests — Audit + génération de tests à partir d'un canvas

Sixième et dernière étape du workflow [Structured Prompt-Driven Development](../../../spdd/README.md).

Audite l'alignement entre la suite de tests réelle et les **tests
annoncés** dans la section `O — Operations` du canvas REASONS,
applique les patterns du cluster méthodologique
[`spdd/methodology/testing/`](../../../spdd/methodology/testing/), génère
les tests manquants, exécute la suite, et produit un rapport
structuré dans `spdd/tests/<id>-<slug>.md`.

À distinguer de :
- `/spdd-generate` (étape 5) qui produit code **+** tests inline
  par Operation. `/spdd-tests` audite **après** et complète.
- `/spdd-api-test` (étape 5b) qui produit un script bash de
  validation REST. Plus étroit, complémentaire.

## Entrée

`$ARGUMENTS` doit pointer vers un canvas REASONS :
- `EXT-014-trivy-csv-export` (id-slug) → résolu en
  `spdd/prompts/EXT-014-trivy-csv-export.md`
- `spdd/prompts/EXT-014-trivy-csv-export.md` (chemin direct)

Le canvas doit être en statut **`implemented`** ou **`synced`**
(le code est là, on peut auditer ses tests). Un canvas en `draft`
ou `reviewed` déclenche une **demande de confirmation explicite**
avant de continuer.

**Flag optionnel** : `--no-run` pour skipper l'exécution de la
suite (utile quand l'environnement local ne peut pas builder,
ou en CI où la suite tourne déjà ailleurs).

## Étape 1 — Charger les artefacts

1. Résoudre l'argument vers un chemin de canvas.
2. Lire le canvas REASONS, vérifier `status: implemented` ou
   `synced`. Si `draft` ou `reviewed` → demander confirmation.
3. Lire la story (`story:` du frontmatter) et l'analyse
   (`analysis:`) pour le contexte.
4. Lire les refs méthodologie testing pertinentes selon les
   modules touchés par les Operations :
   - frontend → [`testing-frontend.md`](../../../spdd/methodology/testing/testing-frontend.md)
   - backend → [`testing-backend.md`](../../../spdd/methodology/testing/testing-backend.md)
   - les deux → les deux
5. Lire la convention naming et anti-cheat appliquées au projet
   (cf. `TESTING.md` ou `docs/testing.md` du projet, instance
   yukki par exemple).

## Étape 2 — Inventorier les tests annoncés

Pour chaque Operation `O1...On` du canvas :
1. Extraire la sous-section "Tests" (ce que le canvas dit qui
   doit être testé).
2. Localiser les fichiers de tests correspondants dans le repo :
   - **Go** : `*_test.go` à côté du fichier sous test
   - **TS/JS** : `*.test.ts` / `*.test.tsx` / `*.spec.ts` à côté
     du fichier
   - **Java** : `*Test.java` dans `src/test/java` au mirror du
     package
   - **Python** : `test_*.py` dans `tests/` ou à côté
3. **Construire le tableau de couverture annoncée vs réelle** :
   - Operation / Test annoncé / Fichier attendu / Présent ?

Si > 30% des tests annoncés manquent : **STOP et signaler** —
c'est probablement un `/spdd-generate` incomplet plutôt qu'un
job pour `/spdd-tests`. Proposer de relancer `/spdd-generate`.

## Étape 3 — Audit de la pyramide

Compter dans le module touché :
- **Tests unit** (logique pure, pas d'I/O) — typiquement
  `*_test.go` qui n'imite pas filesystem/network/db
- **Tests d'intégration** (I/O réel ou mock par MSW /
  Testcontainers) — typiquement préfixés ou marqués
  `Integration*`
- **Tests e2e** (binaire réel, navigateur, ou stack complète)
  — typiquement dans un `e2e/` dédié

Comparer aux ratios cibles du contexte (cf.
[`testing-frontend.md`](../../../spdd/methodology/testing/testing-frontend.md)
ou [`testing-backend.md`](../../../spdd/methodology/testing/testing-backend.md))
:
- **Backend** : Cohn 70/20/10 par défaut
- **Frontend** : Testing Trophy (intégration domine)

Signaler les **anti-patterns pyramide** :
- "Ice-cream cone" : trop d'e2e fragiles (suite > 30 min,
  reruns > 50%)
- Trop d'unit triviaux (getters/setters padding)

## Étape 4 — Audit anti-cheat (cf. `coverage-discipline.md`)

Pour chaque module, vérifier les **4 anti-cheat obligatoires**
de [`coverage-discipline.md`](../../../spdd/methodology/testing/coverage-discipline.md)
:

1. **Mutation testing** (mention seulement V1, run effectif
   différé à TEST-002) — lister les modules critiques où la
   mutation devrait tourner, signaler "voir
   [`mutation-testing.md`](../../../spdd/methodology/testing/mutation-testing.md)
   + outillage TEST-002 future".

2. **Test size limit** : refuser tests > 50 lignes ou > 5
   asserts par `it`/`@Test`/`func TestX`. Lister les violations.

3. **Forbid patterns** :
   - tests sans assertion (`assert*` / `expect*`)
   - `it.skip()` / `t.Skip()` / `@Disabled` sans justification
     en commentaire
   - magic numbers / chaînes en assertion
   - mocks dans le nom du test
   Lister les violations.

4. **Coverage drift gate** : comparer le coverage actuel à la
   baseline (si disponible). Signaler si le module touché par
   la PR a perdu > 3 points.

## Étape 5 — Run la suite (sauf `--no-run`)

Lancer la suite via la commande projet (cf. `TESTING.md` ou
équivalent du projet) :

- **Go** : `bash scripts/dev/test-local.sh ./<module>/...
  -coverprofile=cover.out` (workaround AV Defender Windows)
- **TS Vitest** : `npx vitest run --coverage` depuis le dossier
  frontend
- **Java Maven** : `mvn test jacoco:report -pl <module>`
- **Python pytest** : `pytest --cov=<module>`

Capturer :
- Tests passants / échouants / skippés
- Coverage % global et par module
- Durée d'exécution

**Best-effort** sur échec : si la suite ne build pas ou un test
fail, **continuer** l'audit avec ce qui est récupérable, NE PAS
arrêter. L'agent qui invoque la skill juge si reprendre.

## Étape 6 — Générer les tests manquants

Pour chaque test annoncé manquant repéré à l'étape 2 :

1. Identifier le pattern à utiliser :
   - cas nominal → unit test simple
   - cas limites → property-based si invariant clair (cf.
     [`property-based-testing.md`](../../../spdd/methodology/testing/property-based-testing.md))
   - I/O → intégration avec mock / fixture
   - API REST → contract test (cf.
     [`contract-testing.md`](../../../spdd/methodology/testing/contract-testing.md))
2. **Proposer la génération** au user (afficher l'extrait de
   code) **avant** d'écrire. Confirmation explicite par
   Operation, pas batch silencieux.
3. Respecter le naming projet (cf.
   [`test-naming.md`](../../../spdd/methodology/testing/test-naming.md))
   et éviter les smells (cf.
   [`test-smells.md`](../../../spdd/methodology/testing/test-smells.md)).
4. Écrire dans le fichier au bon emplacement (Étape 2 mapping).
5. Re-run la suite (rapide, juste les nouveaux tests) pour
   vérifier qu'ils passent.

Si une Operation **n'a pas de tests annoncés** dans le canvas :
**STOP et signaler** au user. C'est un canvas incomplet,
proposer `/spdd-prompt-update` pour ajouter la sous-section
Tests à l'Operation, plutôt que générer des tests "à
l'aveugle".

## Étape 7 — Rapport `spdd/tests/<id>-<slug>.md`

Écrire un fichier markdown structuré :

```yaml
---
id: <ID>
slug: <slug>
canvas: spdd/prompts/<id>-<slug>.md
generated-at: <YYYY-MM-DD HH:MM>
status: <generated | audit-only | run-failed>
---
```

Sections :

1. `## Résumé` — 3-5 lignes : combien de tests existaient,
   combien générés, coverage avant/après, run OK ou échec.
2. `## Pyramide constatée` — tableau unit/intégration/e2e
   du module avec ratios actuels et cibles.
3. `## Tests générés` — liste des tests créés par cette
   skill (chemin / fonction / asserts).
4. `## Coverage par module` — % global + % par sous-package
   critique. Mettre en évidence les modules sous le seuil 70%
   ou 85% (critiques).
5. `## Écarts vs canvas` — Operations sans tests annoncés,
   anti-cheat déclenchés, smells détectés.
6. `## Suggestions next-step` :
   - `/spdd-prompt-update` si une Operation manque ses tests
   - `/spdd-sync` si le canvas a drift sur la structure du code
     (renommage, etc.)
   - Aucune action si tout est aligné.

## Étape 8 — Conclusion

Restituer au user (output direct) :
- Lien cliquable vers le rapport généré
- Synthèse en 3 lignes : tests OK / écarts notables / next-step
- Status du canvas (inchangé — la skill **valide**, ne **modifie**
  pas le canvas).

## Étape 9 — Bump optionnel `synced`

Si la skill révèle un drift code-canvas pur (refactor sans
changement comportemental), **suggérer** au user d'invoquer
`/spdd-sync` pour passer le canvas en `synced`. Ne pas le faire
automatiquement (séparation des responsabilités).

## Annexe — Conventions par stack

| Stack | Emplacement tests | Naming | Run | Project doc |
|---|---|---|---|---|
| **Go** | `*_test.go` à côté du source | `Test<Method>_<Scenario>` | `bash scripts/dev/test-local.sh ./... -cover` | [`docs/testing.md`](../../../docs/testing.md) (yukki) |
| **TypeScript** (Vitest/Jest) | `*.test.ts(x)` ou `*.spec.ts(x)` à côté du source | `describe('<sujet>', () => it('<comportement>'))` | `npx vitest run --coverage` | project-specific (TESTING.md ou docs/testing.md) |
| **Java** (JUnit 5) | `src/test/java/<package>/<Class>Test.java` | `should_X_when_Y` ou `@DisplayName` | `mvn test jacoco:report` | project-specific |
| **Python** (pytest) | `tests/test_<module>.py` ou `<module>/test_*.py` | `test_<sujet>_<contexte>_<résultat>` | `pytest --cov=<module>` | project-specific |

Pour les commandes outillage détaillées par écosystème (mutation,
contract, property-based) → voir TEST-002 (story future) + le
project doc équivalent.

## Checklist avant de rendre la main

- [ ] Canvas validé en statut `implemented` ou `synced` (ou
      confirmation explicite si `draft`/`reviewed`)
- [ ] Tableau de couverture annoncée vs réelle restitué
- [ ] Pyramide auditée et écarts vs cible signalés
- [ ] 4 anti-cheat passés en revue (mutation mention seulement)
- [ ] Tests manquants générés avec confirmation par Operation
      (jamais batch silencieux)
- [ ] Suite exécutée (sauf flag `--no-run`), résultats
      capturés en best-effort sur échec
- [ ] Rapport `spdd/tests/<id>-<slug>.md` créé avec
      frontmatter + 6 sections
- [ ] Conclusion synthétique restituée au user
- [ ] Aucune modification du canvas (la skill audite, ne
      modifie pas — sauf suggestion `/spdd-sync` si drift pur)
- [ ] Aucun code applicatif modifié hors tests générés
