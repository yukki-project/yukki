---
id: DOC-002
slug: open-source-publication-readiness
title: Documents pour publication open source (CONTRIBUTING + CoC + LICENSE)
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - docs
---

# Documents pour publication open source (CONTRIBUTING + CoC + LICENSE)

## Background

Yukki est un projet open source en construction (`yukki-project/yukki`
sur GitHub) mais le repo n'a pas encore les fichiers attendus par
GitHub et la communauté pour qu'un contributeur externe sache
comment participer : pas de `LICENSE` claire, pas de `CONTRIBUTING.md`,
pas de `CODE_OF_CONDUCT.md`, pas de templates d'issue / PR. Sans
ces documents, GitHub n'affiche pas les badges « contributing
guidelines » et la barrière d'entrée pour un contributeur externe
est trop haute.

## Business Value

Préparer l'ouverture publique du repo (passage de privé / interne
à public effectif). Permet à un contributeur externe d'arriver,
de comprendre la licence, de savoir comment installer et tester
en local, de proposer une PR sans deviner les conventions. Aussi :
prérequis légal pour usage commercial / par tiers.

## Scope In

- **`LICENSE`** à la racine du repo, contenu d'une licence open-
  source standard (Apache-2.0, MIT, ou autre — à trancher).
- **`CONTRIBUTING.md`** : comment cloner / setup local /
  workflow SPDD pour proposer une story / convention de commit /
  comment lancer les tests / comment soumettre une PR.
- **`CODE_OF_CONDUCT.md`** : contrat de comportement (Contributor
  Covenant 2.1 par défaut, point de contact pour signalements).
- **`SECURITY.md`** : comment signaler une faille de sécurité
  (email dédié, pas en issue publique).
- **Templates GitHub** : `.github/ISSUE_TEMPLATE/bug_report.md`,
  `.github/ISSUE_TEMPLATE/feature_request.md`,
  `.github/PULL_REQUEST_TEMPLATE.md`.
- **`README.md` racine enrichi** : badge license, liens vers
  `CONTRIBUTING`, `CODE_OF_CONDUCT`, `LICENSE` ; section
  « Quick start » ; section « Governance ».
- Cohérence avec la documentation utilisateur produite par
  DOC-001 (links croisés, pas de duplication).

## Scope Out

- Traduction de ces documents en plusieurs langues (FR / EN /…).
  Les standards GitHub attendent EN — on s'y aligne ; un futur
  META-006 pourra ajouter des versions FR.
- Documentation utilisateur fonctionnelle (couverte par DOC-001).
- Mise en place d'un site documentation (Antora, Docusaurus, …) —
  hors scope, on reste sur des `.md` à la racine et dans
  `.github/`.
- Charte graphique / logo / brand book.
- Sponsor / funding YAML (`.github/FUNDING.yml`) — peut être
  ajouté en suivi.

## Acceptance Criteria

### AC1 — GitHub reconnaît les documents communautaires

- **Given** la story est livrée et les documents commités sur
  `main`
- **When** l'utilisateur visite l'onglet « Insights » →
  « Community » du repo GitHub
- **Then** la checklist « Community Standards » affiche tous les
  items principaux en vert : Description, README, License,
  Code of conduct, Contributing, Issue templates, Pull request
  template, Security policy

### AC2 — Licence claire au build et dans les binaires

- **Given** un contributeur externe télécharge le binaire `yukki`
- **When** il lance `yukki --license` (ou consulte le menu
  Help / About — UI-021)
- **Then** le texte de la licence (Apache-2.0 ou autre) est
  affiché ou pointé par un lien vers le fichier `LICENSE` du
  repo

### AC3 — CONTRIBUTING couvre le workflow SPDD

- **Given** un contributeur externe lit `CONTRIBUTING.md`
- **When** il suit pas-à-pas la section « Proposer une nouvelle
  feature »
- **Then** il sait qu'il faut commencer par `/yukki-story`, que
  les commits suivent une convention `<type>(spdd): <message>`,
  qu'il faut faire passer la CI verte avant la review

### AC4 — Templates issue / PR pré-remplis

- **Given** un utilisateur ouvre une issue de type « Bug report »
  sur GitHub
- **When** il clique sur « New issue » → « Bug report »
- **Then** le formulaire est pré-rempli avec les sections
  attendues (description, étapes pour reproduire, version,
  OS, logs)

### AC5 — Aucun secret ou PII dans les documents publiés

- **Given** la story est livrée
- **When** on relit les fichiers `LICENSE`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md` et les templates
- **Then** aucune adresse email personnelle hors point de
  contact officiel, aucun nom interne, aucun token / clé n'y
  apparaît

## Open Questions

- [ ] **Choix de licence** : Apache-2.0 (compatible commercial +
      patent grant), MIT (plus permissive, plus courte), GPL-3.0
      (copyleft fort, peut décourager l'usage commercial) ? À
      arbitrer en revue.
- [ ] **Point de contact** pour `CODE_OF_CONDUCT.md` et
      `SECURITY.md` : email perso, alias yukki-project, ou GitHub
      Security Advisory ?
- [ ] **Governance model** dans le README : BDFL (un seul
      maintainer), maintainers committee, ouverture progressive ?
      À documenter même si la réponse est minimaliste pour
      l'instant.
- [ ] **DCO ou CLA** ? Les contributions doivent-elles être
      signées (Developer Certificate of Origin via `git commit
      --signoff`) ou via un Contributor License Agreement ?

## Notes

- Pas de blocker amont — c'est essentiellement de la rédaction.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont (mais lié à DOC-001
    pour la cohérence des liens).
  - **Negotiable** : choix de la licence + governance model
    explicitement ouverts.
  - **Valuable** : oui, prérequis pour la publication publique.
  - **Estimable** : ~½ j (rédaction + revue).
  - **Small** : oui, 5 AC, périmètre serré.
  - **Testable** : oui — checklist Community Standards GitHub +
    relecture humaine.
- Décision SPIDR : pas de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Tous les documents servent la même intention « OSS readiness ». |
  | Interfaces | non | Pas d'UI, juste des `.md`. |
  | Data | non | Pas de modèle. |
  | Rules | non | Pas de règle métier. |
  | Spike | non | Tout est standard. |
