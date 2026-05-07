---
id: META-001
slug: extract-methodology-references
story: .yukki/stories/META-001-extract-methodology-references.md
analysis: .yukki/analysis/META-001-extract-methodology-references.md
status: synced
created: 2026-04-30
updated: 2026-05-06
---

# Canvas REASONS — Extraire les références méthodologiques des skills vers .yukki/methodology/

> Spec exécutable consommée par `/yukki-generate`. Toute divergence
> ultérieure code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Les skills SPDD inlinent leurs techniques méthodologiques (SPIDR, INVEST,
formulation des AC dans `/yukki-story` ; à venir : DDD, STRIDE, BVA,
Y-Statements dans `/yukki-analysis`). Cette pratique viole le principe SPDD
*"single source of truth"* : duplication entre skills consommateurs, dérive
silencieuse quand une technique évolue, mauvaise réutilisabilité au niveau
organisationnel.

### Definition of Done

- [ ] Le dossier `.yukki/methodology/` existe à la racine du repo
- [ ] Quatre fichiers de référence sont créés avec frontmatter normalisé
      complet (`id`, `title`, `version: 1`, `status: published`,
      `applies-to`, `lang: fr`, `created`, `updated`, `sources`) :
  - `domain-modeling.md` (DDD tactique allégé)
  - `risk-taxonomy.md` (6 catégories + STRIDE en sous-cadre sécurité)
  - `edge-cases.md` (BVA + EP + checklist 7 catégories)
  - `decisions.md` (Y-Statement adapté en français)
- [ ] Un fichier `.yukki/methodology/README.md` (index, ≤ 30 lignes) liste les
      4 refs avec un résumé d'une phrase et leur `applies-to`
- [ ] Le skill `/yukki-analysis` est mis à jour dans ses **deux formats**
      (`.claude/commands/yukki-analysis.md` + `.github/skills/yukki-analysis/SKILL.md`)
      pour **référencer** les 4 refs aux endroits pertinents (sans inliner les
      techniques)
- [ ] `.yukki/README.md` reçoit 2-3 lignes dans la section *Arborescence* qui
      annoncent `methodology/` + une phrase dans la section *Quand utiliser
      SPDD* qui rappelle la règle "skill = procédural, methodology = knowledge"
- [ ] Chaque ref respecte le **Guide de style** : 80-150 lignes, structure
      type frontmatter → définition opérationnelle → heuristiques → exemple
      → sources → `## Changelog`, ton pratique-d'abord, **exemples
      exclusivement issus du projet yukki** (CORE-001 et stories suivantes)
- [ ] **Critère de revue manuelle** (non-AC) : le skill `/yukki-analysis`
      enrichi peut produire une analyse cohérente sur CORE-001 sans
      modification supplémentaire — boucle complète validée

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `MethodologyReference` (nouvelle) | Fichier markdown qui décrit une technique | `id`, `title`, `version`, `status`, `applies-to[]`, `sources[]`, `lang` | créée v1, version++ à chaque évolution de fond, jamais supprimée silencieusement |
| `Skill` (existante, deux formats) | Procédure d'invocation (slash command) | `name`, `description`, `argument-hint`, `user_invocable` / `user-invocable` | lien sortant `references` vers les refs via markdown |
| `MethodologyIndex` (nouveau) | `.yukki/methodology/README.md` qui répertorie les refs | liste `<ref>:<résumé>:<applies-to>` | regénéré à chaque ajout/suppression de ref |
| `ProjectReadme` (existant) | `.yukki/README.md` | sections *Arborescence*, *Quand utiliser SPDD* | mention courte ajoutée |

### Relations

- `MethodologyReference` ⟵ `applies-to` ⟶ `Skill` (n..n via la liste `applies-to`)
- `MethodologyIndex` ⟶ `MethodologyReference` (1..n, agrégat de présentation)
- `Skill` ⟶ `MethodologyReference` (par lien markdown dans son corps, n..n)
- `ProjectReadme` ⟶ `MethodologyIndex` (lien d'entrée pour la découverte)

### Invariants

- Toute valeur de `applies-to[i]` correspond à un nom de skill existant dans
  `.claude/commands/` (et son miroir Copilot)
- Tout skill mentionnant le nom d'une technique de `methodology/` (DDD,
  STRIDE, BVA, EP, Y-Statement, SPIDR, INVEST) doit fournir un lien
  markdown vers la ref correspondante (vérification manuelle v1, automatique
  META-003)
- `version` est un entier positif strictement monotone par fichier ; tout
  incrément a une entrée correspondante dans la section `## Changelog` de la ref

---

## A — Approche

**Y-Statement** :

> Pour résoudre la duplication / dérive silencieuse causée par l'inlining
> des techniques dans les skills, on choisit de créer un dossier
> **`.yukki/methodology/`** avec **un fichier markdown par technique**
> (frontmatter normalisé `version` / `applies-to` / `sources` / `lang`),
> plutôt qu'un fichier monolithique unique ou l'inlining persistant, pour
> atteindre la **traçabilité bidirectionnelle**, la **réutilisabilité entre
> skills**, et le **versionning indépendant** de chaque technique, en
> acceptant la maintenance de N fichiers, un Read supplémentaire par l'agent
> qui consulte une ref, et la nécessité d'une convention humaine de mise à
> jour symétrique du miroir Claude / Copilot tant que META-003 n'est pas
> livré.

### Alternatives écartées

- **Inliner (statu quo de `/yukki-story`)** — viole single-source-of-truth,
  duplication entre skills consommateurs, dérive quand une technique évolue.
- **Fichier monolithique `spdd/methodology.md`** — casse la granularité
  par technique, complique `applies-to` (un skill ne consomme qu'une partie),
  empêche le versionning indépendant.
- **Mélanger refs et templates dans `.yukki/templates/`** — confusion
  conceptuelle (template = squelette d'artefact, ref = description de
  technique).
- **CI check immédiat (METAfusionnée)** — augmente le scope ; reporté à
  META-003 pour respecter SPIDR axe **R** (livrer la valeur prompt-first
  d'abord, l'automatisation ensuite).

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature |
|---|---|---|
| `.yukki/methodology/` | `domain-modeling.md`, `risk-taxonomy.md`, `edge-cases.md`, `decisions.md`, `README.md` | création (5 fichiers) |
| `.claude/commands/` | `yukki-analysis.md` | refonte avec liens vers refs |
| `.github/skills/yukki-analysis/` | `SKILL.md` | miroir Copilot synchronisé |
| `spdd/` | `README.md` | mention dans *Arborescence* + phrase dans *Quand utiliser SPDD* |

### Schéma de flux (consultation)

```
[agent qui exécute /yukki-analysis]
    │
    ▼
.claude/commands/yukki-analysis.md
    │  (lien markdown)
    ▼
.yukki/methodology/<technique>.md
    │  (frontmatter applies-to → traçabilité)
    │  (corps : définition + heuristiques + exemple + sources)
    ▼
[agent applique la technique pour remplir l'analyse]
```

### Schéma de flux (découverte humaine)

```
[contributeur clone le repo]
    │
    ▼
.yukki/README.md
    │  (mention "voir .yukki/methodology/")
    ▼
.yukki/methodology/README.md (index)
    │  (résumé 1 phrase × ref + applies-to)
    ▼
.yukki/methodology/<technique>.md (lecture complète)
```

---

## O — Operations

### O1 — Créer `.yukki/methodology/domain-modeling.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/domain-modeling.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-domain-modeling
  title: Modélisation de domaine (DDD tactique allégé)
  version: 1
  status: published
  applies-to: [yukki-analysis, yukki-reasons-canvas]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://en.wikipedia.org/wiki/Domain-driven_design
    - https://learn.microsoft.com/en-us/archive/msdn-magazine/2009/february/best-practice-an-introduction-to-domain-driven-design
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition opérationnelle (≤ 4 lignes) : ce qu'on cherche en
     modélisation domaine pour un canvas REASONS
  2. Heuristiques d'identification : trio **Entity / Value Object /
     Invariant** + **Integration points** + **Domain Events**, sous forme
     de tableau ou checklist
  3. Exemple concret tiré de CORE-001 (yukki uniquement)
  4. Sources (≤ 2 liens externes max)
  5. Section `## Changelog` avec entrée v1 initiale
- **Tests** (revue manuelle) :
  - frontmatter parseable par `yq`
  - `applies-to` ne contient que des skills existants
  - longueur dans la fenêtre 80-150 lignes
  - exemple présent et concret

### O2 — Créer `.yukki/methodology/risk-taxonomy.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/risk-taxonomy.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-risk-taxonomy
  title: Taxonomie de risques (6 catégories + STRIDE)
  version: 1
  status: published
  applies-to: [yukki-analysis, yukki-reasons-canvas, yukki-prompt-update]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://owasp.org/www-community/Threat_Modeling_Process
    - https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition (≤ 4 lignes) : pourquoi une taxonomie, comment l'appliquer
  2. Tableau des 6 catégories : Sécurité / Performance / Reliability /
     Opérationnel / Intégration / Data / Compatibilité, avec exemples
  3. Sous-cadre **STRIDE** pour la branche Sécurité (Spoofing / Tampering /
     Repudiation / Info disclosure / DoS / Elevation)
  4. Format de description d'un risque : *Impact / Probabilité / Mitigation*
  5. Exemple concret (un risque par catégorie tiré de CORE-001, yukki uniquement)
  6. Sources + Changelog
- **Tests** (revue manuelle) : idem O1

### O3 — Créer `.yukki/methodology/edge-cases.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/edge-cases.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-edge-cases
  title: Identification des cas limites (BVA + EP + checklist)
  version: 1
  status: published
  applies-to: [yukki-analysis, yukki-reasons-canvas]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html
    - https://aqua-cloud.io/edge-cases-in-software-testing/
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition (≤ 4 lignes)
  2. **Boundary Value Analysis (BVA)** — min, just-below-min, nominal,
     just-below-max, max, just-above-max
  3. **Equivalence Partitioning (EP)** — découpage en classes, un
     représentant par classe
  4. **Checklist 7 catégories** : boundaries / classes d'équivalence /
     null-empty / concurrence / failure modes / scale / security
  5. Exemple concret (CORE-001 stdin handling, id collision, yukki uniquement)
  6. Sources + Changelog

### O4 — Créer `.yukki/methodology/decisions.md`

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/decisions.md`
- **Frontmatter** :
  ```yaml
  ---
  id: METHO-decisions
  title: Format Y-Statement pour l'approche stratégique
  version: 1
  status: published
  applies-to: [yukki-analysis, yukki-reasons-canvas]
  lang: fr
  created: 2026-04-30
  updated: 2026-04-30
  sources:
    - https://adr.github.io/
    - https://martinfowler.com/bliki/ArchitectureDecisionRecord.html
  ---
  ```
- **Comportement / contenu attendu** :
  1. Définition : approche stratégique = mini-ADR
  2. Format **Y-Statement adapté FR** : *"Pour résoudre **<problème>**, on
     choisit **<direction A>**, plutôt que **<alt B>** et **<alt C>**, pour
     atteindre **<qualité Q>**, en acceptant **<coût Z>**."*
  3. Heuristiques : au moins 1 alternative écartée explicitée, trade-off
     accepté nommé
  4. Exemple concret (Y-Statement de l'approche de META-001 lui-même)
  5. Sources + Changelog

### O5 — Créer `.yukki/methodology/README.md` (index)

- **Module** : `spdd/methodology`
- **Fichier** : `.yukki/methodology/README.md`
- **Comportement / contenu attendu** : ≤ 30 lignes, format tableau :

  | Ref | Résumé (1 phrase) | applies-to |
  |---|---|---|
  | [domain-modeling.md](domain-modeling.md) | … | yukki-analysis, yukki-reasons-canvas |
  | [risk-taxonomy.md](risk-taxonomy.md) | … | … |
  | [edge-cases.md](edge-cases.md) | … | … |
  | [decisions.md](decisions.md) | … | … |

  Plus une mini-intro 2 lignes sur le rôle de `methodology/` et un lien
  retour vers `.yukki/README.md`.

### O6 — Mettre à jour `.claude/commands/yukki-analysis.md`

- **Module** : `.claude/commands`
- **Fichier** : `.claude/commands/yukki-analysis.md`
- **Comportement** :
  1. Réécrire l'étape "Synthétiser" pour pointer vers les 4 refs aux
     endroits pertinents :
     - "Concepts de domaine" → lien vers `domain-modeling.md`
     - "Approche stratégique" → lien vers `decisions.md` (Y-Statement)
     - "Risques" → lien vers `risk-taxonomy.md`
     - "Cas limites" → lien vers `edge-cases.md`
  2. Garder la procédure (Étapes 1-5 + Checklist) et le tableau des modules
     génériques
  3. Ajouter une section "Sources de référence" en pied avec les liens vers
     les 4 refs et un lien vers `.yukki/methodology/README.md`
  4. Aucune redéfinition de DDD / STRIDE / BVA / Y-Statement dans le corps
- **Tests** (revue manuelle) :
  - aucune chaîne "STRIDE", "Boundary Value", "Y-Statement", "Domain-Driven"
    n'apparaît sans être suivie d'un lien vers la ref
  - le skill reste sous 200 lignes (procédure + checklist + sources)

### O7 — Mettre à jour `.github/skills/yukki-analysis/SKILL.md`

- **Module** : `.github/skills/yukki-analysis`
- **Fichier** : `.github/skills/yukki-analysis/SKILL.md`
- **Comportement** : miroir octet-pour-octet de O6 avec les seules
  différences autorisées :
  - frontmatter `user-invocable: true` (au lieu de `user_invocable: true`)
  - chemins relatifs `../../../spdd/...` (au lieu de `../../spdd/...`)
  - mention `#codebase` (au lieu de `subagent Explore`) si pertinent
- **Tests** (revue manuelle) : `diff` Claude vs Copilot ne doit montrer que
  ces 3 catégories de différences

### O8 — Mettre à jour `.yukki/README.md`

- **Module** : `spdd`
- **Fichier** : `.yukki/README.md`
- **Comportement** :
  1. Section *Arborescence* : insérer 2-3 lignes décrivant
     `.yukki/methodology/` (juste avant ou juste après `templates/`)
  2. Section *Quand utiliser SPDD* (ou créer une section *Conventions* si
     elle n'existe pas) : une phrase qui rappelle la règle
     *"skill = procédural ; methodology = knowledge ; aucune technique
     n'est inlinée dans un skill"*
  3. Pas de réécriture profonde du README
- **Tests** (revue manuelle) :
  - le diff sur `.yukki/README.md` est ≤ 10 lignes ajoutées
  - le rendu markdown reste cohérent

---

## N — Norms

- **Frontmatter strict** : YAML valide, parseable par `yq` ou un parser Go
  standard. Listes en notation `[a, b, c]` *ou* en bullets `- item`, mais
  pas un mélange dans le même champ ; valeurs ambiguës entre guillemets.
- **`version` entier strictement monotone** par fichier de méthodologie ;
  un incrément implique une entrée dans `## Changelog`.
- **`applies-to` est une liste de strings**, chaque string correspondant au
  nom d'un skill existant (`yukki-analysis`, `yukki-reasons-canvas`, etc.).
- **`status` initial** des refs : `published` (à la différence des
  artefacts story/analysis/canvas qui passent par `draft → reviewed →
  accepted`). Une ref est publiée à la création.
- **`lang: fr`** systématique en v1 (cohérent avec le reste du projet).
- **Nommage des fichiers** kebab-case (`risk-taxonomy.md`, etc.).
- **Longueur cible** : 80-150 lignes par ref. Au-delà, la ref doit être
  scindée ou est un signe que le sujet est trop large pour une seule ref.
- **Structure interne** d'une ref : frontmatter → Définition opérationnelle
  (≤ 4 lignes) → Heuristiques (tableau ou checklist) → Exemple concret →
  Sources (1-2 liens) → `## Changelog`.
- **Ton** : pratique-d'abord, théorique-ensuite. Pas de copie d'article
  Wikipedia.
- **Miroir Claude / Copilot** synchronisé à l'octet près sur le contenu,
  seules différences autorisées : frontmatter (`_` vs `-`), profondeur de
  chemin relatif, mention de subagent (Claude) vs `#codebase` (Copilot).
- **Liens entre artefacts** : utiliser des chemins relatifs markdown
  (`../methodology/risk-taxonomy.md`), jamais d'URL absolue interne.
- **Encodage** : UTF-8, fin de ligne LF (Git gère la conversion CRLF sous
  Windows).

---

## S — Safeguards

- **Pas d'inlining** : aucune technique ne peut être redéfinie dans un
  skill ou dans un autre fichier que sa ref dédiée. Les skills mentionnent
  les techniques **uniquement** par lien vers `.yukki/methodology/<x>.md`.
  Cette règle est précisément ce que META-001 instaure.
- **Pas de modification d'autres skills** que `/yukki-analysis` dans cette
  story. Le backport de `/yukki-story` est explicitement reporté à META-002.
- **Aucune valeur dans `applies-to`** ne peut pointer vers un skill
  inexistant — risquerait de créer des liens morts.
- **Aucune ref ne peut excéder 200 lignes**. Au-delà, c'est un signal
  qu'il faut scinder la ref ou que le sujet est mal cadré.
- **Aucune copie textuelle** d'un article externe (DDD Wikipedia, OWASP
  cheatsheet, etc.) — uniquement résumé opérationnel + lien vers la
  source.
- **Aucun secret** ni token dans les sources (toutes les sources sont des
  liens publics).
- **Aucune dépendance externe** ajoutée au projet (la story est
  documentaire pure).
- **Pas de breaking change** sur le frontmatter des artefacts existants
  (story, analysis, canvas). META-001 ajoute des champs sur les **refs
  uniquement**, pas sur les artefacts existants.

---

## Changelog

- 2026-04-30 — v1 — création initiale (status: draft, prêt pour `/yukki-generate`)
- 2026-04-30 — v1.1 — toutes les Operations O1-O8 implémentées, status passé à `implemented`
- 2026-04-30 — v1.2 — Norms / DoD : exemples *yukki uniquement* (le portail
  n'apparaît plus dans les refs publiées). Touche O1, O2, O3 ; O4 utilise
  déjà META-001 (yukki). Régénération ciblée des 3 refs requise via
  `/yukki-generate`. Status `implemented` → `reviewed` jusqu'à régénération.
- 2026-04-30 — v1.3 — régénération O1/O2/O3 effectuée avec exemples CORE-001
  (yukki). Refs concernées passent en version 2. Status `reviewed` →
  `implemented`. Boucle prompt-update / generate close.
