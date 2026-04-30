---
name: spdd-story
description: "Étape 1 du workflow SPDD : transforme une exigence libre (paragraphe, ticket, dump Slack) en user story INVEST formatée avec critères Given/When/Then et la sauve dans spdd/stories/<id>-<slug>.md. Utilise quand on démarre une nouvelle feature et qu'on veut produire l'artefact d'intention versionné avant toute analyse ou code."
argument-hint: "<description libre OU chemin vers un brouillon>"
user_invocable: true
---

# /spdd-story — Génération d'une user story SPDD

Première étape du workflow [Structured Prompt-Driven Development](../../spdd/README.md).
Produit une user story versionnée à partir d'une exigence en format libre.

## Entrée

`$ARGUMENTS` peut être :
- une description libre de la feature ("on veut exporter les rapports Trivy en CSV...")
- un chemin vers un fichier brouillon contenant la description
- vide → demander la description à l'utilisateur

## Étape 1 — Charger le template et l'arbo existante

1. Lire [spdd/templates/story.md](../../spdd/templates/story.md) — c'est la structure cible.
2. Lister `spdd/stories/` pour voir les `id` déjà utilisés et éviter une collision.

## Étape 2 — Extraire l'intention

Analyser `$ARGUMENTS` et identifier :
- Le **problème** à résoudre (en 1-2 phrases)
- La **valeur métier** (qui en bénéficie, gain mesurable)
- Le **périmètre** explicite et implicite
- Les **modules** probablement concernés (selon le projet : `backend`, `frontend`, `cmd/<tool>`, `internal/<pkg>`, `helm`, `docs`, etc.)

## Étape 3 — Demander les informations manquantes

Si l'une des informations suivantes est ambiguë, **poser la question avant de générer** :
- ID à attribuer (proposer un préfixe selon le module dominant : `EXT-`, `BACK-`, `FRONT-`, `CTRL-`, `CORE-`, `UI-`, `INT-`, `OPS-`, `DOC-`)
- Périmètre explicite hors scope (Scope Out)
- Public cible / persona si non évident
- Critères de succès mesurables

Une fois ces points levés, **continuer sans demander** pour le reste — il vaut mieux proposer une première version révisable que multiplier les questions.

## Étape 4 — Rédiger la story

Suivre **strictement** la structure du template `spdd/templates/story.md` :
- Front-matter YAML complet (id, slug, title, status: `draft`, created, updated, owner, modules)
- Sections : Background → Business Value → Scope In → Scope Out → Acceptance Criteria → Open Questions → Notes
- **AC en Given / When / Then**, chacun testable
- Slug en kebab-case, dérivé du titre (5 mots max)
- Background : **3 à 6 lignes max** (le contexte étendu va en Notes)

### Règles générales

- Ne pas spéculer sur le design ou l'implémentation — c'est le rôle de `/spdd-analysis` et `/spdd-reasons-canvas`
- Ne pas inventer de métriques ou de chiffres absents de l'entrée — utiliser `<à confirmer>` ou ajouter en Open Questions
- Si la demande est trop floue ou trop large pour respecter **INVEST** ([Bill Wake / Agile Alliance](https://www.agilealliance.org/glossary/invest/)) — Independent / Negotiable / Valuable / Estimable / Small / Testable — **scinder en plusieurs stories** (voir étape 4bis : SPIDR)

### Formulation des Acceptance Criteria

Chaque AC suit le format **Given / When / Then** ([bliki Martin Fowler](https://martinfowler.com/bliki/GivenWhenThen.html), guide [Cucumber](https://cucumber.io/docs/bdd/better-gherkin/)) :

- **Given** — pré-conditions **observables** (état système, fichiers présents, droits utilisateur, données existantes). Pas d'implémentation :
  - ❌ "Given un objet `User` instancié avec `role=admin`"
  - ✅ "Given un utilisateur authentifié avec le rôle admin"
- **When** — un **seul** déclencheur (action utilisateur OU événement système), pas une séquence :
  - ❌ "When il se connecte puis clique sur Export puis confirme"
  - ✅ "When il clique sur le bouton Export" (les étapes précédentes vont en Given)
- **Then** — résultat **observable** : sortie, fichier créé, code retour, état UI, message affiché. Pas de détail interne :
  - ❌ "Then la méthode `exportCsv()` est invoquée avec `BufferedWriter`"
  - ✅ "Then un fichier CSV est téléchargé contenant N lignes"

### Style déclaratif, pas impératif

Le style **déclaratif** décrit *quoi*, le style **impératif** décrit *comment* clic-par-clic. Toujours préférer le déclaratif.

| Impératif (à éviter) | Déclaratif (cible) |
|---|---|
| "When l'utilisateur ouvre Chrome, navigue vers /login, tape `admin` dans le champ user, `secret` dans password, clique Submit" | "When l'utilisateur se connecte en tant qu'admin" |
| "Then le DOM contient `<div class='success'>` qui n'a pas de `display:none`" | "Then un message de succès apparaît" |

Le déclaratif est plus court, plus lisible, plus stable face aux changements d'UI, et focalisé sur le **comportement métier**.

### Mots et tournures à bannir

- "should" → préférer des assertions observables ("*est* créé", "*apparaît*", "*retourne* 200")
- "etc.", "...", "et plus" → être exhaustif ou écrire une AC séparée
- Termes vagues : "rapide", "sécurisé", "bien formaté", "performant" → quantifier ou détailler
- Plusieurs comportements dans une même AC ("le fichier est créé ET le mail est envoyé ET le log est écrit") → **3 AC distinctes** (1 comportement = 1 AC, [Cucumber best practice](https://cucumber.io/docs/bdd/better-gherkin/))

**Règle d'or** : *une AC = un cas testable*. Si tu peux écrire 2 tests indépendants pour la même AC, scinde-la.

### Granularité : combien d'AC ?

| Nombre d'AC | Diagnostic |
|---|---|
| 1 | story trop pauvre — peut-être une tâche, pas une story |
| **3-5** | **sweet spot** ([Parallel HQ](https://www.parallelhq.com/blog/what-acceptance-criteria), recommandation Mike Cohn) |
| 6-7 | acceptable pour une story fondatrice ou multi-personas, mais à challenger |
| 8+ | **alarme** — la story est probablement trop grosse, scinder via SPIDR (étape 4bis) |

**Couverture minimale** à viser dans les 3-5 AC :
- au moins **1 cas nominal** (happy path)
- au moins **1 cas d'erreur utilisateur** (input invalide, droit manquant)
- au moins **1 cas limite** (vide, max, edge case fonctionnel)

Les autres AC se rajoutent quand la feature a plusieurs personas, plusieurs déclencheurs, ou plusieurs modes.

## Étape 4bis — Story trop grosse : scinder avec SPIDR

Le framework de référence est **SPIDR** ([Mike Cohn / Mountain Goat Software](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories)). Il propose 5 axes de découpe à essayer dans cet ordre — Spike est en dernier recours malgré le S initial :

| Axe | Quand l'appliquer | Exemple |
|---|---|---|
| **P — Paths** | la story couvre plusieurs chemins / variantes de workflow | "Créer / Modifier / Supprimer un X" → 3 stories |
| **I — Interfaces** | la story couvre plusieurs surfaces (CLI, UI, API, OS, navigateurs) | "Export CSV via API + via bouton UI" → 2 stories |
| **D — Data** | on peut livrer en restreignant les données supportées | "Tous les types d'utilisateurs" → "Utilisateurs standard d'abord, premium plus tard" |
| **R — Rules** | on peut livrer en relâchant temporairement certaines règles | "Avec validation complète" → "Sans validation max-length d'abord" |
| **S — Spike** | aucun axe ci-dessus ne s'applique parce qu'il y a une inconnue technique | livrer une story de recherche / prototype, puis revenir sur la vraie story |

### Signaux d'alerte qui appellent SPIDR

| Signal | Action |
|---|---|
| 8 AC ou plus | Découper par scénario ou persona |
| 2 modules ou plus sans deliverable partagé | Une story par module quand c'est possible |
| Plusieurs personas avec besoins distincts | Une story par persona |
| Plusieurs verbes métier au cœur | "Créer X" ≠ "Mettre à jour X" ≠ "Supprimer X" → 3 stories (axe **P**) |
| Mix CRUD + UI + auth + reporting | Découper par préoccupation (axe **I**) |
| Estimation > 1-2 jours de dev | Trop gros, découper |

### Stratégies complémentaires (orthogonales à SPIDR)

1. **Tranche verticale** — chaque story livre quelque chose d'utilisable de bout en bout, même incomplet. Un endpoint qui retourne un CSV vide est plus précieux qu'un backend complet sans UI.
2. **Chemin nominal puis variations** — Story 1 : happy path ; Story 2 : cas d'erreur. Combinable avec axe **R** de SPIDR.
3. **Par étape de workflow** — une story par étape d'un processus métier multi-étapes (combinable avec axe **P**).

### Anti-patterns de découpage

- ❌ **Découper par couche technique** (backend / frontend / db) sans valeur utilisateur. Une story "écrire le backend d'export" qui ne livre rien à l'utilisateur n'est **pas** une story SPDD.
- ❌ **Story d'infrastructure pure** ("scaffolder le projet", "ajouter Cobra") sans valeur observable. Exception : **story fondatrice** explicite (style CORE-001) justifiée comme telle dans le Background.
- ❌ **Découper en "préparation + feature"** ("d'abord la migration BDD, ensuite l'usage"). La migration *seule* n'a pas de valeur ; préférer "migrer + utiliser sur 1 cas".
- ❌ **Découper en "happy path" puis "tests"**. Les tests ne sont pas une story.
- ❌ **Spike systématique** : SPIDR met S en dernier précisément parce qu'on l'utilise trop souvent par défaut. Essayer P / I / D / R d'abord.

### Exemple de découpage

Demande brute (trop grosse) :
> *"Permettre aux équipes d'exporter les vulnérabilités Trivy de leurs namespaces vers un CSV, avec RBAC, audit log, gestion du volume, export programmé hebdomadaire et notification SecOps."*

Découpage SPIDR proposé :
- `EXT-014` — Export CSV manuel d'un namespace (RBAC + audit + volume) **— Path nominal**
- `EXT-015` — Export programmé hebdomadaire **— Path planifié (axe P)**
- `EXT-016` — Notification SecOps post-export **— Path nominal + email (axe I)**
- `EXT-017` — Export multi-namespaces agrégé **— Data élargi (axe D)**

Chaque story livre une valeur isolée. On peut en livrer 1, 2, ou les 4. Indiquer en `EXT-014.Notes` les stories suivantes pour la traçabilité.

## Étape 5 — Sauvegarder

1. Écrire le fichier `spdd/stories/<id>-<slug>.md`.
2. Afficher à l'utilisateur :
   - Le chemin créé (lien cliquable)
   - Un résumé : id, titre, nombre d'AC, modules touchés, Open Questions restantes
   - Si la demande a été scindée : la liste des autres stories à rédiger
3. Proposer la suite : `/spdd-analysis spdd/stories/<id>-<slug>.md`

## Checklist avant de rendre la main

- [ ] Front-matter YAML valide et complet
- [ ] Background dans la fenêtre 3-6 lignes
- [ ] **3 à 5 AC** en Given/When/Then (au-delà de 7 = découpage SPIDR à proposer)
- [ ] Chaque AC est **déclarative** (pas impérative), 1 comportement, observable, sans "should" ni détail d'implémentation
- [ ] Couverture minimale : ≥1 happy path + ≥1 erreur utilisateur + ≥1 cas limite
- [ ] Aucune décision d'implémentation dans le corps (modules, frameworks, signatures restent en `/spdd-analysis` et `/spdd-reasons-canvas`)
- [ ] Open Questions strictement comportementales (les questions de design vont en analyse / canvas)
- [ ] Lien cliquable vers le fichier créé affiché à l'utilisateur

## Sources de référence

- INVEST — [Agile Alliance](https://www.agilealliance.org/glossary/invest/) (Bill Wake, 2003 ; popularisé par Mike Cohn, *User Stories Applied*, 2004)
- SPIDR — [Mountain Goat Software / Mike Cohn](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories)
- Given/When/Then — [bliki Martin Fowler](https://martinfowler.com/bliki/GivenWhenThen.html), [Cucumber better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/)
- Granularité AC — [Parallel HQ — *What Is Acceptance Criteria*](https://www.parallelhq.com/blog/what-acceptance-criteria)
- Anti-patterns backlog — [Age of Product — 28 Backlog Anti-Patterns](https://age-of-product.com/28-product-backlog-anti-patterns/)
