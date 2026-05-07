---
id: META-002
slug: backport-story-techniques
story: .yukki/stories/META-002-backport-story-techniques.md
analysis: .yukki/analysis/META-002-backport-story-techniques.md
status: synced
created: 2026-04-30
updated: 2026-05-06
---

# Canvas REASONS — Extraire SPIDR / INVEST / formulation des AC depuis /yukki-story vers .yukki/methodology/

> Spec exécutable consommée par `/yukki-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Le skill `/yukki-story` contient encore inline trois techniques méthodologiques
(SPIDR, INVEST, formulation des AC), ce qui viole la convention
*"skill = procédural, methodology = knowledge"* posée par META-001 et publiée
dans `.yukki/README.md`. Tant que cet inlining résiduel existe, la convention
n'est qu'une intention partielle.

### Definition of Done

- [ ] Trois nouvelles refs créées dans `.yukki/methodology/` : `spidr.md`,
      `invest.md`, `acceptance-criteria.md`, chacune avec frontmatter
      normalisé complet (`id`, `title`, `version: 1`, `status: published`,
      `applies-to`, `lang: fr`, `created`, `updated`, `sources`)
- [ ] Chaque ref respecte le **Guide de style** hérité de META-001 v1.2 :
      80-150 lignes, structure type frontmatter → définition opérationnelle
      → heuristiques → exemple → sources → `## Changelog`, ton
      pratique-d'abord, **exemples exclusivement issus du projet yukki**
- [ ] Le skill `/yukki-story` (Claude **et** Copilot) ne contient plus
      aucune redéfinition de SPIDR / INVEST / Given/When/Then / déclaratif
      vs impératif / mots bannis / granularité 3-5 — uniquement des liens
      markdown vers les refs correspondantes
- [ ] L'index `.yukki/methodology/README.md` liste les 3 nouvelles refs
      avec un résumé d'une phrase et leur `applies-to` correctement
      renseigné
- [ ] Toutes les valeurs de `applies-to` pointent vers des skills
      existants : `yukki-story`, `yukki-analysis`, `yukki-prompt-update`,
      `yukki-reasons-canvas`
- [ ] Le miroir Claude / Copilot du skill `/yukki-story` reste synchronisé
      à l'octet près (différences strictes : frontmatter `_` vs `-`,
      profondeur de chemin relatif, mention `subagent Explore` vs
      `#codebase`)
- [ ] Aucune ref n'excède 200 lignes (signal de scinder sinon)
- [ ] **Critère de revue manuelle** (non-AC) : un agent qui invoque
      `/yukki-story` après ce changement produit une story avec la même
      qualité INVEST + format Given/When/Then + granularité 3-5 que
      l'ancien skill (régression nulle)

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `MethodologyReference` (existante) | Fichier markdown qui décrit une technique | `id`, `title`, `version`, `status`, `applies-to[]`, `sources[]`, `lang` | créée v1, version++ tracé via `## Changelog` |
| `Skill` (existante, deux formats) | Procédure d'invocation | `name`, `description`, `argument-hint` | corps mis à jour avec liens markdown vers refs |
| `MethodologyIndex` (existant) | `.yukki/methodology/README.md` | tableau ref / résumé / applies-to | regénéré à chaque ajout/suppression |

### Relations

- `MethodologyReference` ⟵ `applies-to` ⟶ `Skill` (n..n via la liste)
- `MethodologyIndex` ⟶ `MethodologyReference` (1..n, agrégat)
- `Skill` ⟶ `MethodologyReference` (par lien markdown dans son corps)

### Invariants

- Toute valeur de `applies-to[i]` correspond à un `name` de skill existant
  dans `.claude/commands/` (et son miroir `.github/skills/`)
- Aucun skill ne mentionne SPIDR / INVEST / Given/When/Then / déclaratif /
  impératif / "mots bannis" / "granularité 3-5" sans **lien immédiat**
  vers la ref correspondante
- `version` est un entier strictement positif et monotone par fichier ;
  tout incrément correspond à une entrée `## Changelog`
- Les deux formats du skill `/yukki-story` (Claude et Copilot) restent
  synchronisés au contenu

---

## A — Approche

### Y-Statement

> Pour résoudre le **dernier inlining résiduel dans `/yukki-story`** (SPIDR
> + INVEST + formulation des AC) qui contredit la convention posée par
> META-001, on choisit de **créer trois refs autonomes dans
> `.yukki/methodology/` (`spidr.md`, `invest.md`, `acceptance-criteria.md`)
> puis de réécrire `/yukki-story` (Claude + Copilot) pour les référencer
> par lien**, plutôt que de **fusionner les trois techniques dans une ref
> méta unique** ou de **conserver l'inlining historique au nom de "ce
> skill est plus didactique que les autres"**, pour atteindre la
> **cohérence absolue de la convention skill/methodology** et la
> **réutilisabilité des refs entre skills** (INVEST consommé par
> `/yukki-analysis`, AC formulation par `/yukki-reasons-canvas`), en
> acceptant **trois fichiers supplémentaires dans `methodology/` et un
> skill `/yukki-story` qui exige un Read additionnel par l'agent quand il
> atteint une étape déléguée à une ref**.

### Alternatives écartées

- **Fusion en `story-techniques.md` unique** — casse la granularité par
  technique et complique `applies-to` (chaque skill consomme un
  sous-ensemble différent des 3 techniques). Une ref par technique reste
  la bonne maille.
- **Conserver l'inlining (statu quo)** — viole l'invariant publié dans
  `.yukki/README.md`. Toute la valeur de l'effort méthodologie repose sur
  cet invariant.
- **Mixer (ref pour SPIDR mais inline pour AC formulation)** —
  incohérent, sans logique défendable. Tout ou rien.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature |
|---|---|---|
| `.yukki/methodology/` | `spidr.md`, `invest.md`, `acceptance-criteria.md` | création (3 fichiers) |
| `.claude/commands/` | `yukki-story.md` | extraction + ajout de liens vers refs |
| `.github/skills/yukki-story/` | `SKILL.md` | miroir Copilot synchronisé |
| `.yukki/methodology/` | `README.md` (index) | maj +3 lignes |

### Schéma de flux (consultation)

```
[agent qui exécute /yukki-story]
    │
    ▼
.claude/commands/yukki-story.md
    │  (lien markdown explicite à l'étape concernée)
    ▼
.yukki/methodology/<technique>.md
    │  (frontmatter applies-to → traçabilité)
    │  (corps : définition + heuristiques + exemple + sources)
    ▼
[agent applique la technique pour rédiger la story]
```

### Schéma de flux (cross-link entre refs)

```
spidr.md (le critère "Small" d'INVEST → ancre #small d'invest.md)
   │
   └──▶ invest.md#small
```

---

## O — Operations

> Ordre d'exécution : O1 (foundation) → O2 (peut référencer O1) → O3
> (autonome) → O4 (Claude) → O5 (Copilot, miroir de O4) → O6 (index).

### O1 — Créer `.yukki/methodology/invest.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/invest.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-invest
  title: INVEST — critères de qualité d'une user story
  version: 1
  status: published
  applies-to: [yukki-story, yukki-analysis]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://www.agilealliance.org/glossary/invest/
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition opérationnelle (≤ 4 lignes) : critères de qualité d'une
     user story applicables au moment de la rédaction et de la revue
  2. Tableau des **6 critères** (Independent / Negotiable / Valuable /
     Estimable / Small / Testable) avec une question-test par critère
  3. **Ancre `#small`** atteignable depuis `spidr.md` (titre `## Small`)
  4. Heuristiques d'application : quand un critère est cassé, comment le
     détecter (signaux dans la story)
  5. Exemple concret tiré de **CORE-001** (yukki) : appliquer INVEST sur
     la story `cli-story-via-claude` et constater quels critères passent
     / lesquels demandent justification (notamment Small : story
     fondatrice à 7 AC)
  6. Sources + Changelog
- **Tests** (revue manuelle) :
  - frontmatter parseable par `yq`
  - longueur dans la fenêtre 80-150 lignes
  - ancre `## Small` présente
  - exemple yukki (pas de portail)

### O2 — Créer `.yukki/methodology/spidr.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/spidr.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-spidr
  title: SPIDR — découpage de stories trop grosses
  version: 1
  status: published
  applies-to: [yukki-story, yukki-prompt-update]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition opérationnelle (≤ 4 lignes) : framework de découpage
     activé quand le critère **Small** d'INVEST est violé (lien interne
     `[invest.md#small](invest.md#small)`)
  2. Tableau **5 axes SPIDR** (Paths / Interfaces / Data / Rules /
     Spike) avec quand l'appliquer + exemple par axe
  3. **Signaux d'alerte** qui appellent SPIDR (8+ AC, 2+ modules sans
     deliverable partagé, plusieurs personas, plusieurs verbes, mix
     CRUD+UI+auth, estimation > 1-2j)
  4. **Stratégies complémentaires** orthogonales (tranche verticale,
     chemin nominal puis variations, par étape de workflow, par persona)
  5. **Anti-patterns** (découper par couche technique, story
     d'infrastructure pure, préparation+feature, happy path puis tests,
     spike systématique)
  6. Exemple concret tiré de **CORE-001 ou CORE-002** (yukki) : SPIDR
     appliqué à la story candidate "implémenter les 6 autres commandes
     SPDD" → découpage axe **P (Paths)** en 6 stories filles
  7. Sources + Changelog

### O3 — Créer `.yukki/methodology/acceptance-criteria.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/acceptance-criteria.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-acceptance-criteria
  title: Formulation des Acceptance Criteria (Given/When/Then, déclaratif)
  version: 1
  status: published
  applies-to: [yukki-story, yukki-prompt-update, yukki-reasons-canvas]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://martinfowler.com/bliki/GivenWhenThen.html
    - https://cucumber.io/docs/bdd/better-gherkin/
    - https://www.parallelhq.com/blog/what-acceptance-criteria
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition opérationnelle (≤ 4 lignes) : règles de rédaction des
     critères d'acceptation pour qu'ils soient testables, observables,
     non ambigus
  2. **Format Given / When / Then** avec règles par étape (Given =
     pré-conditions observables, When = un seul déclencheur, Then =
     résultat observable)
  3. **Style déclaratif vs impératif** — tableau bad/good
  4. **Mots et tournures bannis** ("should", "etc.", "...", "rapide",
     "sécurisé", "bien formaté", multi-comportements ET/OU)
  5. **Granularité** : sweet spot 3-5 AC, alarme à 8+
  6. **Couverture minimale** : ≥1 happy + ≥1 erreur user + ≥1 cas limite
  7. Exemple concret tiré de **CORE-001** (yukki) : 3 AC
     représentatives prises dans les 7 AC de CORE-001 (AC1 nominale, AC4
     erreur user, AC6 cas limite — template fallback)
  8. Sources + Changelog

### O4 — Mettre à jour `.claude/commands/yukki-story.md`

- **Module** : `.claude/commands`
- **Fichier** : `.claude/commands/yukki-story.md`
- **Comportement** :
  1. Supprimer les sections inlinées :
     - "Formulation des Acceptance Criteria" + sous-sections (style,
       mots bannis)
     - "Granularité : combien d'AC ?" (table)
     - "Étape 4bis — Story trop grosse : scinder avec SPIDR" (table 5
       axes + signaux + stratégies + anti-patterns + exemple)
  2. Remplacer par des **invitations courtes** avec liens vers les refs :
     - À l'étape 4 (Rédiger la story) — sous-section "Formulation des
       AC" → *"Suivre les règles de [`acceptance-criteria.md`](../../.yukki/methodology/acceptance-criteria.md)
       (Given/When/Then, déclaratif, mots bannis, granularité 3-5)."*
     - Idem pour la mention INVEST → lien vers
       [`invest.md`](../../.yukki/methodology/invest.md)
     - Étape 4bis "Story trop grosse" → *"Évaluer SPIDR selon
       [`spidr.md`](../../.yukki/methodology/spidr.md). Si signaux d'alerte
       présents, scinder en plusieurs stories et le signaler."*
  3. Ajouter une section **"Sources de référence"** en pied du skill
     pointant vers les 3 refs + l'index `methodology/README.md`
  4. **Aucune** mention de SPIDR / INVEST / Given/When/Then / "mots
     bannis" / "granularité 3-5" sans lien markdown vers la ref
- **Tests** (revue manuelle) :
  - `grep -E "SPIDR|INVEST|Given/When/Then|mots bannis|granularité 3-5"`
    sur le skill ne matche **aucune occurrence sans lien associé**
  - Le skill reste sous 200 lignes
  - La checklist finale du skill garde des références aux refs (pas une
    liste de règles dupliquée)

### O5 — Mettre à jour `.github/skills/yukki-story/SKILL.md`

- **Module** : `.github/skills/yukki-story`
- **Fichier** : `.github/skills/yukki-story/SKILL.md`
- **Comportement** : miroir octet-pour-octet de O4 avec les seules
  différences autorisées :
  - frontmatter `user-invocable: true` (au lieu de `user_invocable: true`)
  - chemins relatifs `../../../.yukki/methodology/...` (au lieu de
    `../../.yukki/methodology/...`)
  - mention `#codebase` / `#search` (au lieu de `subagent Explore`) si
    pertinent
- **Tests** (revue manuelle) : `diff` Claude vs Copilot ne montre que
  ces 3 catégories de différences

### O6 — Mettre à jour `.yukki/methodology/README.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/README.md`
- **Comportement** : ajouter 3 lignes au tableau "Refs disponibles" pour
  inclure `spidr.md`, `invest.md`, `acceptance-criteria.md` avec leur
  résumé d'une phrase et leur `applies-to`. L'ordre alphabétique du
  tableau peut être respecté ou non — la priorité est la lisibilité.
- **Tests** (revue manuelle) : tableau final = 7 lignes (4 existantes +
  3 nouvelles), totaux des `applies-to` vérifiés cohérents

---

## N — Norms

- **Frontmatter strict** : YAML valide, parseable par `yq` ou parser Go
  standard. Listes `applies-to` en notation `[a, b, c]`.
- **`version` entier strictement monotone**. Toute évolution = incrément
  + entrée `## Changelog`.
- **`applies-to` est une liste de strings**, chaque string = `name`
  d'un skill existant.
- **`status` initial des refs** : `published`. Les refs n'ont pas de
  cycle `draft → reviewed → accepted` (à la différence des artefacts
  story / analysis / canvas) — elles sont publiées dès leur création.
- **`lang: fr`** systématique en v1.
- **Nommage des fichiers** kebab-case. **Convention émergente
  (META-002)** : nommer par la **technique** (nom propre) quand elle
  existe (`spidr`, `invest`), ou par le **sujet métier précis** quand la
  ref agrège plusieurs techniques (`acceptance-criteria` couvre
  Given/When/Then + déclaratif + bannissements + granularité ; pas de
  nom unique adapté). Pas d'abréviation jargon (`ac-formulation`
  rejeté).
- **Longueur cible** : 80-150 lignes par ref. **200 lignes maximum
  absolu** (Safeguard).
- **Structure interne** d'une ref : frontmatter → Définition
  opérationnelle (≤ 4 lignes) → Heuristiques (tableau ou checklist) →
  Exemple concret → Sources (1-2 liens) → `## Changelog`.
- **Ton** : pratique-d'abord, théorique-ensuite. Pas de copie d'article
  Wikipedia ou Cucumber.
- **Examples** : exclusivement issus du projet **yukki** (CORE-001 ou
  stories suivantes). Pas de portail ni autre projet externe (héritage
  META-001 v1.2).
- **Ancres markdown** : standard (générées par les titres `## Section`),
  pas de `<a id>` manuel sauf cas particulier. `spidr.md` peut référencer
  `invest.md#small` (ancre auto sur le titre `## Small`).
- **Miroir Claude / Copilot** synchronisé à l'octet près sur le contenu,
  seules différences autorisées : frontmatter (`_` vs `-`), profondeur
  de chemin relatif, mention de subagent (Claude) vs `#codebase`
  (Copilot).
- **Liens entre artefacts** : chemins relatifs markdown
  (`../methodology/spidr.md`), jamais d'URL absolue interne.
- **Encodage** : UTF-8, fin de ligne LF.

---

## S — Safeguards

- **Aucune redéfinition d'une technique** dans le skill `/yukki-story` :
  tout mention de SPIDR, INVEST, Given/When/Then, "déclaratif vs
  impératif", "mots bannis", "granularité 3-5" doit être suivie d'un
  lien immédiat vers la ref correspondante. C'est précisément ce que
  META-002 instaure.
- **Pas de modification d'autres skills** que `/yukki-story` dans cette
  story. `/yukki-reasons-canvas`, `/yukki-generate`, `/yukki-api-test`,
  `/yukki-prompt-update`, `/yukki-sync` ne sont pas touchés (chacun aura
  sa propre story d'enrichissement).
- **Aucune valeur dans `applies-to`** ne peut pointer vers un skill
  inexistant — risquerait de créer des liens morts traçables.
- **Aucune ref n'excède 200 lignes** absolu. Au-delà, signal de
  scinder.
- **Aucune copie textuelle** d'un article externe (Mountain Goat,
  Agile Alliance, Cucumber, Fowler bliki, Parallel HQ) — uniquement
  résumé opérationnel + lien vers la source.
- **Aucun secret** ni token dans les sources (toutes les sources sont
  des liens publics).
- **Aucune dépendance externe** ajoutée au projet.
- **Pas de breaking change** sur le frontmatter des artefacts existants
  (story, analysis, canvas, refs déjà publiées). META-002 ajoute des
  fichiers refs uniquement.
- **Pas de modification de la convention de nommage META-001** : les 4
  refs déjà publiées (`domain-modeling`, `risk-taxonomy`, `edge-cases`,
  `decisions`) ne sont pas renommées dans cette story (option (d)
  pragmatique). Une story future pourra rationaliser.

---

## Changelog

- 2026-04-30 — v1 — création initiale (status: draft, prêt pour
  `/yukki-generate`)
- 2026-04-30 — v1.1 — toutes les Operations O1-O6 implémentées : 3 refs
  créées (invest, spidr, acceptance-criteria), skill `/yukki-story`
  refondu (Claude + Copilot miroir), index `methodology/README.md` mis
  à jour. Status `reviewed → implemented`. Boucle SPDD close.
