---
id: META-005
slug: inbox-epic-roadmap-foundation
title: Hiérarchie SPDD étendue — Inbox → Epic → Story → Roadmap (foundation)
status: reviewed
created: 2026-05-03
updated: 2026-05-04
owner: Thibaut Sannier
modules:
  - spdd
  - internal/artifacts
  - internal/uiapp
  - internal/templates
  - frontend
  - docs
parent: ~
sibling-stories:
  - META-004-rename-spdd-to-dot-yukki
depends-on: []
---

# Hiérarchie SPDD étendue : Inbox → Epic → Story → Roadmap (foundation)

## Background

yukki implémente actuellement la méthodologie SPDD avec un seul niveau
d'artefact d'intention : la story. En usage produit réel on a besoin
d'une chaîne discovery → delivery : capture brute (**Inbox**),
engagement (**Epic** ou **Story** standalone selon la taille), et
**Roadmap** comme **vue projection** (Now / Next / Later) des items
engagés. META-005 pose le **scaffolding fondateur** — déclaration des
3 nouveaux types + arbo + reconnaissance par l'inventaire — sans
implémenter les UX détaillées (capture rapide, kanban, transitions de
status) qui font l'objet de stories enfants identifiées via SPIDR
(cf. Notes).

## Business Value

Pour les équipes utilisant yukki, étend la méthode SPDD d'un workflow
"story-only" à une chaîne complète **Inbox → Epic → Story → Code**,
sans sortir de l'outil. Cette foundation débloque les stories enfants
(capture, promotion, vue roadmap) sans coupler leur implémentation à
la définition des concepts. Côté contributeurs internes, c'est aussi
le point d'ancrage où le vocabulaire produit (epic / inbox / roadmap)
entre officiellement dans le repo et la doc.

## Scope In

- **3 nouveaux types d'artefact SPDD** officiellement définis, avec
  rôles distincts :
  - **Inbox** (discovery) — capture brute à faible friction (titre +
    paragraphe court)
  - **Epic** (engagement) — regroupement thématique de stories liées
    (vision + contexte + références stories enfants)
  - **Roadmap** (vue projection) — kanban Now / Next / Later des Epics
    et Stories standalone engagés
- **Templates versionnés** pour ces 3 types (frontmatter et sections
  obligatoires, cohérent avec l'esprit `story.md` actuel)
- **Reconnaissance par l'inventaire yukki** : les 3 nouveaux types
  apparaissent au même niveau que les stories dans la CLI (`yukki list`
  ou équivalent) et le hub UI
- **Création des dossiers** `<projectDir>/<root yukki>/{inbox,epics,roadmap}/`
  par la commande d'init (idempotent)
- **Documentation** explicite dans `CLAUDE.md` et le README de la
  méthodologie SPDD : (a) la chaîne discovery → delivery (Inbox →
  Story ou Inbox → Epic → Stories), (b) la Roadmap comme vue
  projection (pas un container), (c) les 3 nouveaux préfixes d'ID
  `INBOX-`, `EPIC-`, `ROADMAP-` ajoutés au tableau de convention

## Scope Out

- **Capture rapide en Inbox** (formulaire dédié, raccourci clavier,
  vue inbox visuelle) — story enfant `INBOX-001` à créer
- **Promotion Inbox → Epic** (workflow, skill `/yukki-promote`) —
  story enfant `INBOX-002`
- **Création Epic + linkage bidirectionnel avec stories** (parenting) —
  story enfant `EPIC-001`
- **Vue roadmap** (kanban, timeline, drag-drop) — story enfant
  `ROADMAP-001`
- **Transitions de status d'epic** (todo → en cours → mature → done) —
  story enfant `ROADMAP-002`
- **Métriques avancées** (priorisation automatique, scoring d'inbox,
  vélocité d'epic) — post-MVP
- **Synchro outils externes** (Jira, Linear, GitHub Projects) — non
  prévu (esprit yukki autonome)
- **Évolution sémantique du concept "story" actuel** — reste INVEST,
  inchangé

## Acceptance Criteria

### AC1 — Les 3 nouveaux types d'artefact sont reconnus par yukki

- **Given** un projet yukki initialisé après META-005
- **When** un fichier conforme à l'un des 3 nouveaux templates (Inbox,
  Epic, Roadmap) est ajouté dans son dossier dédié
- **Then** yukki l'inclut dans son inventaire au même titre que les
  stories existantes (CLI list + hub UI)

### AC2 — La chaîne discovery → delivery est documentée

- **Given** la documentation méthodologique du repo
- **When** un nouveau contributeur lit `CLAUDE.md` ou le README de la
  méthodologie
- **Then** sont explicitement mentionnés : (a) le flow Inbox →
  Story (atomique) **ou** Epic → Stories (gros chantier), (b) le rôle
  de la Roadmap comme vue projection Now/Next/Later (et non comme
  container), (c) les 3 nouveaux préfixes d'ID `INBOX-`, `EPIC-`,
  `ROADMAP-`

### AC3 — Erreur user : artefact malformé surface une erreur visible

- **Given** un fichier dans `inbox/`, `epics/` ou `roadmap/` avec un
  frontmatter YAML invalide
- **When** yukki parcourt l'inventaire
- **Then** l'artefact est listé avec un indicateur d'erreur (cohérent
  avec le comportement existant pour les stories — `Meta.Error`
  surfaced)

### AC4 — Cas limite : projet pré-existant adopte les nouveaux types

- **Given** un projet yukki initialisé avant META-005 (qui contient
  déjà `stories/`, `analysis/`, `prompts/`, `tests/`)
- **When** la commande d'init est rejouée après META-005
- **Then** les 3 nouveaux dossiers (`inbox/`, `epics/`, `roadmap/`)
  sont créés à côté des existants et aucun artefact existant n'est
  modifié

## Open Questions

_Toutes les décisions ont été tranchées en revue humaine :_

- ✅ **Préfixes d'ID enfants** : `INBOX-NNN`, `EPIC-NNN`, `ROADMAP-NNN`
  (nouveaux préfixes dédiés, ajoutés à la convention `CLAUDE.md`).
- ✅ **Roadmap = vue projection** (pas un container d'Inbox). Un
  **Inbox vit dans le dossier `inbox/`** (discovery zone) ; une
  **Roadmap est une vue Now / Next / Later** qui projette les Epics +
  Stories standalone sur un axe temporel.
- ✅ **Inbox → Story directe possible** (skip Epic si l'Inbox est
  atomique). La promotion **Inbox → Epic** n'est obligatoire que pour
  les gros chantiers qui se décomposeront en N stories.
- ✅ **Format de fichier de la Roadmap** : `roadmap/current.md` avec
  frontmatter YAML structuré (`columns: [...]` pour les colonnes
  Now/Next/Later, listes d'IDs Epic + standalone-stories), body
  optionnel pour notes contextuelles. Cohérent avec story / analysis /
  canvas (mêmes outils de parsing, même infra `Meta`).

## Notes

### Hiérarchie discovery → delivery (validée)

```
┌─────────────────┐
│  Inbox          │  ← Discovery zone, capture brute
│  faible friction│     PAS sur la roadmap
└────────┬────────┘
         │  qualification humaine : "ça vaut le coup ?"
         ▼
   Promotion :
   ┌──────────────────────┬──────────────────────┐
   │                      │                      │
 atomique             gros chantier          rejetée
   │                      │                      
   ▼                      ▼                      
┌─────────┐          ┌─────────┐
│ Story   │          │  Epic   │  ← Committed work
│ (INVEST)│          │         │     parents de stories
└─────────┘          └────┬────┘
                          │ décomposition INVEST
                          ▼
                     ┌─────────┐
                     │ Stories │
                     └─────────┘
```

La **Roadmap** n'apparaît pas dans ce schéma car ce n'est **pas un
niveau hiérarchique** : c'est une **vue projection** (Now / Next /
Later, ou Q1/Q2/Q3) qui montre les Epics et les Stories standalone
engagés, sur un axe temporel. Les Inbox **n'apparaissent pas** sur
la roadmap.

### Vocabulaire des artefacts

| Artefact | Rôle | Granularité | Lifecycle proposé |
|---|---|---|---|
| **Inbox** | Capture brute (discovery zone) | Titre + 1 paragraphe | `unsorted → promu (story\|epic) ou rejeté` |
| **Epic** | Regroupement thématique de stories liées | Vision + AC haut niveau + liste de stories enfants | `draft → en cours → mature → done` |
| **Story** | Niveau actuel SPDD (INVEST), inchangé | Existant (story.md) | `draft → reviewed → implemented` |
| **Roadmap** | Vue projection des Epics + Stories standalone | Kanban Now/Next/Later (frontmatter YAML structuré) | vivante, mise à jour continue |

### Évaluation INVEST

- **Independent** : OK — scaffolding indépendant des stories enfants
- **Negotiable** : OK — Scope Out exhaustif (capture, promotion, vue
  UI = stories enfants)
- **Valuable** : OK — débloque la suite ; définition seule suffit
- **Estimable** : OK — ½ à 1 j (templates + arbo + extension reconnaissance)
- **Small** : limite haute (touche templates + Go + frontend + docs)
  mais scope volontairement réduit aux fondamentaux ; atomique au sens
  "déclaration unique des 3 types"
- **Testable** : OK — AC mesurables (inventaire + parsing + diff doc)

### Décision SPIDR

| Axe | Verdict pour META-005 | Stories enfants identifiées |
|---|---|---|
| **Paths** (capture / promotion / viewing / découpage) | scindé hors scope | INBOX-001 (capture), INBOX-002 (promotion), EPIC-001 (linkage), ROADMAP-001 (vue) |
| **Interfaces** (CLI / UI / templates) | partagé en transverse — cette story scope les surfaces minimales | élargies par les enfants |
| **Data** (formats des 3 types) | **cette story** — templates fondateurs créés ici | raffinés au besoin par les enfants |
| **Rules** (workflow status / transitions) | story dédiée | ROADMAP-002 (transitions de status) |
| **Spike** | non requis | périmètre connu |

**Conclusion** : story fondatrice atomique conservée à scope minimal
(déclaration + arbo + recognition). Les 5 stories enfants à créer
après merge de META-005 :

1. **INBOX-001** — Capture rapide en Inbox (UI raccourci + CLI `yukki inbox`)
2. **INBOX-002** — Promotion Inbox → Epic (workflow + skill `/yukki-promote`)
3. **EPIC-001** — Création Epic + linkage bidirectionnel avec stories
4. **ROADMAP-001** — Vue roadmap (kanban / board des epics)
5. **ROADMAP-002** — Transitions de status d'epic + timeline visuelle

### Note transitoire sur les chemins

Cette story sera implémentée **après** que META-004 ait été généré
(rename `spdd/ → .yukki/`). Les Acceptance Criteria référencent les
dossiers de manière abstraite (`<root yukki>/inbox/`, etc.) pour
rester valides quel que soit l'état du rename au moment de
l'implémentation.
