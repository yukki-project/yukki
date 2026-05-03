---
id: META-003
slug: spdd-tests-skill
title: Skill /spdd-tests — étape 6 du workflow SPDD (génération de tests à partir d'un canvas)
status: reviewed
created: 2026-05-03
updated: 2026-05-03
owner: Thibaut Sannier
modules:
  - docs
parent: ~
sibling-stories:
  - META-001-extract-methodology-references
  - META-002-backport-story-techniques
  - TEST-001-testing-methodology-classic
depends-on:
  - TEST-001-testing-methodology-classic
---

# Skill /spdd-tests — étape 6 du workflow SPDD

## Background

Le workflow SPDD documenté dans [`spdd/README.md`](../README.md) et
[`spdd/GUIDE.md`](../GUIDE.md) définit **6 étapes** :

1. `/spdd-story` — création de la user story
2. revue humaine
3. `/spdd-analysis` — analyse stratégique + scan codebase
4. `/spdd-reasons-canvas` — canvas REASONS exécutable
5. `/spdd-generate` — génération de code (qui inclut des tests inline
   par Operation)
   - `/spdd-api-test` (étape 5b optionnelle, REST endpoints)
6. **`/spdd-tests` — génération d'une suite de tests structurée à
   partir du canvas**, conforme aux refs `spdd/methodology/testing/`
   (TEST-001 livrée).

Les **5 premières étapes sont implémentées**. La **6ᵉ ne l'est pas** :
pas de `.claude/commands/spdd-tests.md`, pas de
`.github/skills/spdd-tests/SKILL.md`, le dossier `spdd/tests/` est
vide. L'écosystème pointe vers cette skill comme un placeholder
(README et GUIDE l'évoquent, TEST-001 OQ1 a tranché qu'elle serait
créée dans une story dédiée).

Cette story livre la skill `/spdd-tests` complète : commande
invocable + skill autoload, qui consomme un canvas REASONS implémenté
et :

- relit les Operations et les **tests annoncés** dans chaque
- vérifie la **conformité aux refs méthodo** (pyramide cible,
  naming convention, anti-cheat coverage discipline)
- génère les **tests manquants** dans la convention de la stack
  (Go : `*_test.go` à côté du source ; TS : `*.test.tsx` à côté ;
  Java : `*Test.java` dans `src/test/java`)
- **lance la suite** post-génération pour vérifier que tout passe
- produit un **rapport de couverture** (incluant le mutation score
  pour les modules critiques si l'outillage est setup, cf.
  [`coverage-discipline.md`](../methodology/testing/coverage-discipline.md))

La skill est **différente de `/spdd-generate`** qui produit code +
tests inline par Operation. `/spdd-tests` est plus large :
- complète les tests manquants par rapport au canvas
- vérifie la pyramide globale du module (ratio unit/intégration/e2e)
- applique les anti-cheat (test size limit, forbid patterns)
- produit le rapport coverage final

## Business Value

- **Boucle SPDD complète** : la 6ᵉ étape passe de "documentée mais
  vide" à "implémentée". Plus de placeholder dans GUIDE.md.
- **Qualité de tests opposable** : tout projet SPDD-ifié peut
  invoquer `/spdd-tests <id-slug>` et obtenir une suite alignée sur
  les refs TEST-001 (pyramide, naming, anti-cheat). Plus de "tests
  écrits à la louche".
- **Foundation pour CI** : une fois la skill stable, on peut câbler
  un job CI qui invoque `/spdd-tests` automatiquement après chaque
  `/spdd-generate` mergé, et bloque le merge si la pyramide ou le
  coverage drift dévient.
- **Cohérence cluster `testing/`** : les 9 refs TEST-001 sont
  utilisables manuellement aujourd'hui (un humain les lit). La
  skill les opérationnalise pour l'agent.

## Scope In

- **Création `.claude/commands/spdd-tests.md`** — commande
  invocable Claude Code (`/spdd-tests <id-slug>`).
- **Création `.github/skills/spdd-tests/SKILL.md`** — skill
  autoloadable, miroir de la commande.
- **Frontmatter conforme** au pattern existant (cf.
  `spdd-api-test.md` qui est le plus proche structurellement) :
  - `name: spdd-tests`
  - `description:` court (rôle dans le workflow + entrée + sortie)
  - `argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"`
  - `user_invocable: true` (commands) / `user-invocable: true`
    (skills — orthographe différente conservée)
- **Étapes documentées dans la skill** :
  1. **Entrée** : un id-slug ou chemin canvas REASONS en statut
     `implemented` ou `synced`. Refus si `draft` ou `reviewed`
     avec confirmation.
  2. **Charger** la story, l'analyse, le canvas + les refs méthodo
     `spdd/methodology/testing/testing-{frontend,backend}.md`
     selon les modules touchés par les Operations.
  3. **Audit de l'existant** : pour chaque Operation, vérifier
     que le test annoncé a bien été écrit par `/spdd-generate`.
     Lister les manques.
  4. **Audit pyramide** : compter unit / intégration / e2e du
     module touché, comparer aux ratios annoncés
     (Cohn / Honeycomb / Trophy selon le contexte).
  5. **Audit anti-cheat** :
     - `test size limit` — refuser tests > 50 lignes ou > 5 asserts
     - `forbid patterns` — tests sans assertion, magic numbers,
       mocks dans le nom
     - `coverage drift` — comparer à la baseline
  6. **Génération des tests manquants** dans la convention de la
     stack (cf. annexe stack-aware ci-dessous).
  7. **Exécution** : lancer la suite via `bash scripts/dev/test-local.sh`
     (Go) ou `npx vitest run --coverage` (frontend, si setup) selon
     les Operations.
  8. **Rapport** : afficher au user :
     - liste des tests générés
     - rapport coverage par module
     - écarts vs canvas (Operations sans tests, anti-cheat
       déclenchés)
     - suggestion d'ajout au canvas si une Operation manque ses
       tests (signal `/spdd-prompt-update` requis)
  9. **Conclusion** : status canvas inchangé (la skill **valide**,
     ne **modifie** pas le canvas) ; bump éventuel `synced` si la
     suite révèle un drift code-canvas.
- **Sauvegarde optionnelle** d'un prompt de tests structuré dans
  `spdd/tests/<id>-<slug>.md` (template réutilisable + checklist
  appliquée) — cf. spdd/GUIDE.md ligne 128 qui mentionne ce
  pattern.
- **Annexe stack-aware** dans la skill : 1 paragraphe par stack
  cible (Go, Java, Python, TS) listant les conventions
  d'emplacement / naming / outillage. Pas exhaustif (renvoi à
  TESTING.md pour le yukki-specific).
- **Mise à jour `spdd/methodology/README.md`** : retirer la
  mention "skill /spdd-tests à venir" et ajouter l'entrée dans le
  workflow (étape 6 implémentée).
- **Mise à jour `spdd/README.md`** et **`spdd/GUIDE.md`** :
  s'assurer que la 6ᵉ étape est référencée correctement comme
  implémentée (pas comme placeholder).

## Scope Out

- **Génération de tests effective côté agent** dans cette story —
  la skill décrit la procédure ; l'agent qui exécute la skill
  génère les tests selon les patterns. Pas de moteur custom dans
  Go ou TS qui automatise tout.
- **Intégration CI** automatique de `/spdd-tests` post-PR
  (bloquage merge si pyramide non conforme) — différé. La skill
  V1 est invocable à la main.
- **Outillage mutation testing** (Stryker, PIT, go-mutesting)
  intégré dans la skill — différé (l'outillage par stack est
  dans TEST-002 à venir, pas dans la skill elle-même).
- **Création des refs `spdd/tests/<id>-<slug>.md`** pour les
  features SPDD existantes (UI-001a/b/c, UI-006/007/008, etc.) —
  hors scope. La skill peut les générer rétroactivement, mais
  cette story ne livre que la skill, pas son application.
- **Skill SPDD pour le reste des étapes** (1-5) — déjà
  implémentées, intactes.
- **Modification des refs TEST-001 livrées** — intactes. Cette
  story consomme les refs, ne les modifie pas.
- **Code applicatif modifié** — aucun. Doc + skill uniquement.

## Acceptance Criteria

> Format Given/When/Then. Validation par lecture humaine + dry-run
> de la skill sur une feature SPDD existante du repo.

### AC1 — Skill commands créée et frontmatter conforme

- **Given** un état actuel à 7 commands SPDD dans `.claude/commands/`
- **When** META-003 est livré
- **Then** un fichier `.claude/commands/spdd-tests.md` existe avec :
  - frontmatter `name: spdd-tests`, `description:` court (3-4
    phrases résumant rôle + entrée + sortie)
  - `argument-hint: "<id-slug OU chemin vers spdd/prompts/...>"`
  - `user_invocable: true`
  - corps décrivant les 9 étapes du Scope In
  - longueur 150-300 lignes (cohérent avec `spdd-api-test.md`)

### AC2 — Skill autoload créée et miroir conforme

- **Given** un état actuel à 7 skills SPDD dans `.github/skills/`
- **When** META-003 est livré
- **Then** un fichier `.github/skills/spdd-tests/SKILL.md` existe
  avec frontmatter et corps **identiques** à la commande (sauf
  `user-invocable: true` orthographe différente, et chemins
  relatifs ajustés `../../../` au lieu de `../../`).

### AC3 — Étape 6 référencée comme implémentée

- **Given** les fichiers `spdd/README.md`, `spdd/GUIDE.md`, et
  `spdd/methodology/README.md`
- **When** META-003 est livré
- **Then** chacun référence `/spdd-tests` comme **étape 6
  implémentée** (pas placeholder). En particulier :
  - `spdd/GUIDE.md` ligne ~127-129 : la mention "étape 6 — tests
    unitaires (template-driven)" est conservée et le placeholder
    `[prompt de tests] spdd/tests/<id>-<slug>.md` reste valide
    (la skill peut le générer).
  - `spdd/methodology/README.md` : la convention catégorisation
    fait référence à `/spdd-tests` parmi les skills consommatrices
    des refs `testing/`.

### AC4 — Skill consomme les refs méthodo TEST-001

- **Given** la skill `/spdd-tests` créée
- **When** je lis son corps
- **Then** elle référence explicitement (par lien markdown) les
  refs cluster testing pertinentes :
  - `spdd/methodology/testing/testing-frontend.md` ou
    `testing-backend.md` selon le contexte
  - `coverage-discipline.md` pour les seuils + 4 anti-cheat
  - `test-naming.md` pour les conventions
  - `test-smells.md` pour les anti-patterns

### AC5 — Annexe stack-aware

- **Given** la skill créée
- **When** je cherche les conventions par stack
- **Then** une section finale `## Annexe — Conventions par stack`
  liste 1 paragraphe par stack cible (Go, Java, Python, TS) avec :
  - emplacement des fichiers de tests
  - convention de nommage des tests
  - commande de run (renvoi à `scripts/dev/test-local.sh` pour
    Go yukki, ou aux scripts projet pour les autres)
  - lien vers TESTING.md ou équivalent project-doc

### AC6 — Validation entrée canvas

- **Given** la skill invoquée avec un id-slug
- **When** la skill résout le canvas correspondant
- **Then** elle vérifie le `status:` du frontmatter :
  - `implemented` ou `synced` → continue
  - `draft` ou `reviewed` → demande confirmation explicite avant
    de continuer (le code n'est peut-être pas encore là)
  - canvas inexistant → erreur explicite, propose
    `/spdd-reasons-canvas` ou `/spdd-generate` selon ce qui manque

### AC7 — Audit anti-cheat documenté

- **Given** la skill créée
- **When** je cherche la procédure d'audit
- **Then** la skill décrit explicitement les **4 anti-cheat
  obligatoires** de TEST-001 :
  - mutation testing (renvoi `mutation-testing.md`, mention que
    l'outillage est candidat — hors scope skill V1)
  - test size limit (> 50 lignes ou > 5 asserts)
  - forbid patterns lint
  - coverage drift gate

### AC8 — Output / rapport au user

- **Given** la skill exécutée jusqu'au bout
- **When** elle conclut
- **Then** elle restitue au user :
  - liste des tests générés (chemin + nombre d'asserts)
  - rapport coverage par module (% global, % critique)
  - écarts vs canvas (Operations sans test, anti-cheat
    déclenchés)
  - suggestion next-step (`/spdd-prompt-update` si Operation
    manque ses tests, `/spdd-sync` si refactor pur,
    rien si tout est aligné)

### AC9 — Pas de régression sur les 7 skills existantes

- **Given** les 7 commands + 7 skills existantes
- **When** META-003 est livré
- **Then** aucune n'est modifiée, sauf les 3 fichiers
  documentaires (`spdd/README.md`, `spdd/GUIDE.md`,
  `spdd/methodology/README.md`) qui passent la mention
  `/spdd-tests` de "futur" à "implémentée".

### AC10 — Pas de code applicatif modifié

- **Given** META-003 livré
- **When** je `git diff main..HEAD --stat -- ':!spdd' ':!.claude' ':!.github'`
- **Then** aucun fichier modifié hors `spdd/`, `.claude/`,
  `.github/`. La story est doc + skill only.

### AC11 — Dry-run de validation

- **Given** la skill `/spdd-tests` créée
- **When** je l'invoque mentalement (revue humaine) sur une
  feature existante du repo (ex. `UI-008-workflow-pipeline-view`)
- **Then** la procédure documentée dans la skill est applicable
  sans ambiguïté : un agent (humain ou IA) peut suivre les 9
  étapes step-by-step sans avoir à inférer.

## Open Questions — toutes tranchées en revue 2026-05-03

- [x] **OQ1 → A** : skill **génère activement** les tests
      manquants (pas juste auditer), avec confirmation explicite
      avant chaque écriture. Pattern similaire à `/spdd-generate`.
- [x] **OQ2 → A** : sauvegarde **in-scope V1** d'un résumé
      markdown dans `spdd/tests/<id>-<slug>.md` (rapport tests
      générés + pyramide + coverage). Pas un prompt template
      ré-exécutable (autre niveau d'abstraction).
- [x] **OQ3 → A** : **run la suite** post-génération, mais flag
      `--no-run` documenté pour échappement. Sans run on perd
      le rapport coverage final.
- [x] **OQ4 → A** : mutation testing **mentionné** seulement
      (lien vers `mutation-testing.md`), pas exécuté en V1
      (outillage par stack appartient à TEST-002 future).
- [x] **OQ5 → A** : tonalité **prescriptive** (étapes numérotées,
      "STOP and signal" si invariant cassé), cohérent avec les
      7 autres commands SPDD.
- [x] **OQ6 → A** : `argument-hint: "<id-slug OU chemin vers
      spdd/prompts/...>"` (cohérent avec `/spdd-api-test`).
- [x] **OQ7 → A** : **best-effort avec rapport** — afficher
      les échecs mais finir l'audit pour ne pas perdre le
      contexte. L'agent qui exécute juge si reprendre.
- [x] **OQ8 → A** : peer review **obligatoire** avant merge
      (≥ 1 reviewer humain externe à l'auteur), référentiel
      à fort levier.

## Notes

- **Dépendance dure** : TEST-001 livrée (cluster testing).
  Sans ça, la skill n'a pas de méthodologie à consommer.
- **Pattern de référence** : `/spdd-api-test` (étape 5b) est
  le plus proche structurellement (même rôle d'audit + génération
  d'artefact dans `scripts/spdd/` ou `spdd/tests/`).
- **Estimation** : ~1.5 jours
  - 2 fichiers commands + skills = ~250-350 lignes chacun
  - Maj de 3 fichiers de doc (README + GUIDE + methodology
    README) = ~30 min
  - Dry-run de validation sur UI-008 ou TEST-001 = ~2-3h
  - Peer review et révisions = ~3h
- **Risque pressenti** : tonalité trop bavarde (la skill peut
  tenter de tout couvrir et devenir illisible). Mitigation :
  cap à 350 lignes max, sinon factoriser dans des sub-refs.
- **Pas de breaking change** sur les skills existantes — la
  nouvelle skill est additive.
- **Foundation pour TEST-002** : une fois `/spdd-tests` livrée,
  TEST-002 (outils par stack) peut compléter avec les commandes
  concrètes par stack que la skill invoquera.
