---
id: UI-016
slug: ui-create-inbox-story
title: Création UI d'inbox et de story (+ New)
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
---

# Création UI d'inbox et de story (+ New)

## Background

UI-001c apporte déjà un flow LLM-driven (« RunStory ») où Claude génère
une story complète à partir d'une description libre. Mais quand
l'utilisateur veut juste capturer un inbox éclair ou rédiger une story
manuellement (sans appel LLM), il doit aujourd'hui passer par le
système de fichiers ou par la CLI. Friction inutile pour la capture
rapide et les rédactions manuelles. On veut un bouton « + Nouveau »
direct dans l'UI qui crée le fichier au bon endroit avec un id-slug
correct, puis ouvre le SpddEditor en mode édition pour la suite.

## Business Value

Réduire la friction de capture / rédaction manuelle pour les auteurs
SPDD : ouvrir le SpddEditor en un clic, sans CLI ni édition de
fichier. Permet aussi un usage offline (pas de dépendance LLM).
Cible : PMs et devs qui ont déjà la story en tête et veulent juste
une zone de saisie structurée.

## Scope In

- Bouton « + Nouveau » dans le header de la HubList quand on est en
  mode `inbox` ou en mode `stories`.
- En mode `inbox` : le clic crée immédiatement un fichier
  `INBOX-NNN-untitled.md` dans `.yukki/inbox/` avec un front-matter
  minimum (id, slug, status: draft, created, updated, owner) et ouvre
  le SpddEditor en mode édition sur ce fichier.
- En mode `stories` : le clic ouvre une mini-modale demandant le
  **type de préfixe** (UI / META / CORE / EXT / BACK / CTRL / INT /
  OPS / DOC / FRONT / TEST). Validation crée
  `<TYPE>-NNN-untitled.md` dans `.yukki/stories/` et ouvre l'éditeur.
- **Numéro auto-calculé** : NNN = max(numéros existants pour ce
  préfixe) + 1, toujours sur 3 chiffres (`001`, `002`, …, `032`).
  Pour un préfixe utilisé pour la 1ʳᵉ fois, NNN = `001`.
- Slug par défaut : `untitled` ; l'utilisateur peut renommer le
  fichier en éditant le titre dans le SpddEditor (le rename effectif
  reste hors-scope ici — voir Scope Out).

## Scope Out

- Génération via Claude (déjà couverte par UI-001c).
- Création depuis l'UI d'autres types d'artefacts : epic, analyse,
  canvas, test, roadmap (la création de ces artefacts vit dans le
  workflow `/yukki-analysis`, `/yukki-reasons-canvas`, etc., pas dans
  l'UI manuelle).
- Renommage du fichier quand l'utilisateur édite le titre / le slug.
  Le slug initial est `untitled` et le reste tant que cette story-ci
  n'aborde pas le rename. Une story future pourra livrer le rename.
- Création en bulk ou import depuis fichier externe.
- Persistence d'un brouillon non sauvegardé en cas de fermeture brute
  de l'app (le fichier est créé sur disque dès le clic, donc pas de
  perte côté disque).

## Acceptance Criteria

### AC1 — Création d'une nouvelle story typée

- **Given** la HubList est en mode `stories` et la liste affiche
  notamment `UI-015` comme dernier UI- existant
- **When** l'utilisateur clique sur « + Nouveau », sélectionne le
  type `UI` dans la modale et valide
- **Then** un fichier `UI-016-untitled.md` est créé dans
  `.yukki/stories/`, son front-matter porte `status: draft`, le
  SpddEditor s'ouvre dessus en mode édition et l'item apparaît dans
  la HubList

### AC2 — Création rapide d'un inbox

- **Given** la HubList est en mode `inbox`
- **When** l'utilisateur clique sur « + Nouveau »
- **Then** un fichier `INBOX-NNN-untitled.md` est créé dans
  `.yukki/inbox/` avec le NNN suivant disponible et le SpddEditor
  s'ouvre dessus en mode édition, sans modale intermédiaire

### AC3 — Premier usage d'un préfixe inédit

- **Given** la HubList est en mode `stories` et aucun fichier ne
  commence par `OPS-`
- **When** l'utilisateur clique sur « + Nouveau », sélectionne le
  type `OPS` et valide
- **Then** le fichier créé est `OPS-001-untitled.md` (numérotation
  démarre à `001`)

### AC4 — Annulation de la modale type

- **Given** la HubList est en mode `stories` et la modale de choix
  de type est ouverte
- **When** l'utilisateur clique sur « Annuler » ou ferme la modale
  via la croix / la touche Échap
- **Then** aucun fichier n'est créé et la HubList reste inchangée

### AC5 — Numérotation alphanumérique préservée

- **Given** la HubList contient `UI-015` et `UI-014i` (suffixe
  alphabétique sur 14)
- **When** l'utilisateur crée une nouvelle story de type `UI`
- **Then** le fichier créé est `UI-016-untitled.md` (le numéro de
  base 014 ignoré au profit du plus grand numéro de base existant,
  ici 015 ; les suffixes alphabétiques `a-i` ne consomment pas de
  nouveaux numéros)

## Open Questions

- [ ] Faut-il proposer une zone « titre / slug » dans la modale de
      création de story (slug au lieu de `untitled`), ou laisser le
      slug à `untitled` et compter sur un futur rename via le
      SpddEditor ?
- [ ] Le bouton « + Nouveau » doit-il aussi exister sur d'autres
      modes HubList que `inbox` / `stories` (par exemple `epics` ou
      `roadmap`), même si le scope-in n'inclut que les deux ?
- [ ] Quelle gestion en cas de course (deux clics simultanés sur
      « + Nouveau ») produisant deux requêtes de NNN+1 ? À trancher
      en analyse (verrou IPC ? retry ?).
- [ ] Quel comportement si l'utilisateur ferme la fenêtre du
      SpddEditor immédiatement après création, sans rien éditer ?
      Le fichier `UI-NNN-untitled.md` vide reste-t-il sur disque ou
      est-il purgé après un délai ?

## Notes

- Le delivery se branche sur l'existant : SpddEditor (UI-014) pour
  l'édition, ListArtifacts (CORE-004) pour calculer le NNN suivant,
  WriteArtifact (UI-010) pour matérialiser le fichier. Pas de
  nouvelle infra disque.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur UI-014 + UI-013 + CORE-004
    (mergées). Aucun bloqueur en amont.
  - **Negotiable** : la place du bouton (header HubList vs FileMenu
    vs ActivityBar) est ouverte en analyse.
  - **Valuable** : oui, raccourcit la capture rapide + permet
    l'édition manuelle hors-LLM.
  - **Estimable** : oui, ~1j (frontend principalement + 1 binding
    Go pour le calcul du NNN si fait côté serveur).
  - **Small** : 5 AC, un seul livrable « créer un fichier vide et
    ouvrir l'éditeur ». Périmètre serré.
  - **Testable** : oui — vérifier que le fichier créé existe, que
    son front-matter est valide YAML, que l'éditeur s'ouvre en mode
    édition, que le NNN est cohérent avec l'existant.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) : la
  story est petite — pas de scission justifiée.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Inbox et story partagent le même flow (clic → file create → editor open). |
  | Interfaces | non | Modale de type est trivial, ne mérite pas une story dédiée. |
  | Data | non | Le NNN auto-calculé est l'objet central, le retirer casse l'intention. |
  | Rules | non | L'AC5 (suffixes alphabétiques) est le seul cas limite et tient en un AC. |
  | Spike | non | Pas d'inconnue technique majeure (toutes les briques existent). |
