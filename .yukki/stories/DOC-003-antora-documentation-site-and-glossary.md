---
id: DOC-003
slug: antora-documentation-site-and-glossary
title: Site de documentation Antora + glossaire des termes yukki
status: draft
created: 2026-05-09
updated: 2026-05-09
owner: Thibaut Sannier
modules:
  - docs
  - .github/workflows
---

# Site de documentation Antora + glossaire des termes yukki

## Vocabulaire

- **Antora** — générateur de sites de documentation statique
  écrit en Node.js, utilisé notamment par Asciidoctor et la
  fondation Eclipse. Consomme des sources AsciiDoc versionnées
  dans le repo et produit un site HTML déployable sur GitHub
  Pages.
- **HubList**, **chrome**, **palette `--ykp-*`**, **tokens
  `--yk-*`** — exemples de termes internes yukki qui méritent
  une définition partagée pour les nouveaux contributeurs et
  utilisateurs (cf. UI-018, UI-018a, UI-018b qui en font usage
  intensif).

## Background

La documentation yukki est aujourd'hui éclatée : `README.md`
racine, fichiers `.yukki/methodology/*.md`, commentaires inline
dans les stories. Aucun site déployé, pas de moteur de recherche,
pas de glossaire centralisé. Les termes internes (HubList,
chrome, palette `--ykp-*`, SpddEditor, REASONS, INVEST, SPIDR)
sont définis ad-hoc dans chaque artefact qui les évoque, ce qui
crée des définitions divergentes et alourdit l'onboarding.

## Business Value

Une seule porte d'entrée documentation pour les utilisateurs et
contributeurs. Glossaire de référence partagé qui élimine les
définitions divergentes (un seul endroit pour comprendre ce
qu'est une « HubList »). Site déployable en continu sur GitHub
Pages, prêt pour la publication open source de yukki.

## Scope In

- **Squelette Antora** dans le dossier `docs/` du repo : un
  module `ROOT` avec une nav (`nav.adoc`), une page d'accueil
  (`index.adoc`), et une structure de pages prête à accueillir
  d'autres contenus.
- **Page Glossaire** (`docs/modules/ROOT/pages/glossary.adoc`)
  qui définit les termes internes yukki : HubList, chrome,
  palette `--ykp-*`, tokens `--yk-*`, SpddEditor, ActivityBar,
  Inspector, AiPopover, REASONS, INVEST, SPIDR, statuts SPDD
  (`draft / reviewed / accepted / implemented / synced`),
  artefacts (story / analysis / canvas / inbox / epic /
  roadmap). Au moins **15 entrées** initiales.
- **Page Quick Start utilisateur** : comment installer yukki
  desktop, ouvrir un projet, créer sa première story.
- **Page Quick Start contributeur** : comment cloner le repo,
  lancer la CI locale, suivre le workflow SPDD.
- **Page Workflow SPDD** : le cycle complet (story → analysis →
  canvas → generate → sync) avec un diagramme de transition
  d'états.
- **Build local** documenté (`npm install` + `npx antora` ou
  équivalent), pas encore de déploiement automatique sur
  GitHub Pages — ça vient en suivi.

## Scope Out

- **Déploiement GitHub Pages automatique** par PR ou push sur
  main : story de suivi (DOC-004 ou OPS-002 release pipeline).
- **Recherche full-text** intégrée (Algolia DocSearch ou
  équivalent) — viendra quand le contenu justifie l'effort.
- **Versioning multi-branches** Antora (la doc reste sur
  `main` pour cette story, pas de branches `v1` / `v2`).
- **Traduction multilingue** : la doc reste en français comme
  le projet (cohérent META-007). L'i18n viendra en suivi
  (META-006 cible l'UI, pas la doc).
- **Migration des fichiers existants** (`.yukki/methodology/*.md`,
  `README.md`) vers AsciiDoc : ils restent à leur place (ils
  servent aussi au LLM SPDD). La doc Antora les **référence**
  via lien plutôt que de les dupliquer.
- **Régénération automatique** quand un fichier change : pas
  d'auto-build, manuel pour cette story.

## Acceptance Criteria

### AC1 — Build Antora local fonctionnel

- **Given** le repo est cloné et les dépendances Node sont
  installées
- **When** le contributeur lance la commande de build Antora
  documentée (par exemple `npx antora antora-playbook.yml`)
- **Then** le site HTML est généré dans `docs/build/site/` (ou
  équivalent), sans erreur, et la page d'accueil s'ouvre dans
  un navigateur

### AC2 — Glossaire avec ≥ 15 entrées

- **Given** la story est livrée et le site est buildé
- **When** l'utilisateur navigue jusqu'à la page Glossaire
- **Then** la page contient au minimum 15 entrées de termes
  yukki, chacune avec une définition d'1-3 phrases, un
  exemple d'usage et un lien vers le code ou un autre
  document quand pertinent

### AC3 — Quick Start utilisateur lisible en 5 minutes

- **Given** un utilisateur découvre yukki pour la première
  fois
- **When** il lit la page Quick Start utilisateur
- **Then** il comprend en moins de 5 minutes comment installer
  yukki desktop, ouvrir un projet et créer sa première story
  via l'UI

### AC4 — Liens internes valides

- **Given** la story est livrée
- **When** le build Antora est lancé en mode strict
- **Then** aucun lien interne n'est cassé (le build échoue
  ou warne explicitement si un xref cible une page inexistante)

### AC5 — Cohérence avec les sources existantes

- **Given** un terme du glossaire fait référence à un fichier
  de méthodologie (par exemple `INVEST` → renvoie vers
  `.yukki/methodology/invest.md`)
- **When** l'utilisateur clique sur le lien
- **Then** le lien pointe sur le bon fichier dans le repo
  GitHub (ou sa version Antora si on l'a importé)

## Open Questions

- [ ] **Format AsciiDoc vs Markdown** : Antora supporte
      historiquement AsciiDoc, mais accepte Markdown via
      extension. AsciiDoc est plus puissant mais nouveau pour
      les contributeurs habitués au Markdown des artefacts
      SPDD. À trancher en analyse.
- [ ] **Localisation des sources doc** : `docs/modules/ROOT/`
      (convention Antora standard) ou `docs/` plat ? Trade-off
      flexibilité (multi-modules) vs simplicité.
- [ ] **Inclure les `.yukki/methodology/*.md` dans Antora** :
      les importer (xref) ou les laisser séparés (la doc
      Antora cible utilisateur / contributeur, la methodology
      cible LLM SPDD) ? À clarifier en analyse.
- [ ] **Page « About yukki »** dans le site (différente de
      UI-021 qui est l'About **dans l'app**) : nécessaire ou
      redondant ?
- [ ] **Diagramme du workflow SPDD** : ASCII art dans la page,
      image PNG embarquée, ou Mermaid (supporté par certains
      thèmes Antora) ? À trancher en analyse.

## Notes

- Briques mobilisables : aucune dépendance amont. La story est
  indépendante du reste du backlog (peut être livrée en
  parallèle de UI-018a/b ou d'autres stories).
- DOC-002 (publication OSS — CONTRIBUTING / CoC / LICENSE)
  est complémentaire mais pas bloquante.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : oui, aucune dépendance amont.
  - **Negotiable** : choix AsciiDoc vs Markdown + structure
    explicitement ouverts.
  - **Valuable** : oui — porte d'entrée doc pour utilisateurs
    et contributeurs.
  - **Estimable** : ~2 j (squelette + 4 pages + glossaire de
    15 entrées + build doc).
  - **Small** : borderline (plusieurs pages à rédiger) mais
    homogène (rédaction uniquement, pas de code).
  - **Testable** : oui — build CI strict, vérification du
    nombre d'entrées du glossaire, validation des liens
    internes.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** par paquet de pages.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | (a) DOC-003a squelette + glossaire ; (b) DOC-003b Quick Starts + workflow. À garder pour l'analyse si le volume estimé > 2 j. |
  | Interfaces | non | Une seule sortie (le site HTML statique). |
  | Data | non | Pas de modèle. |
  | Rules | non | AC4 (liens) et AC5 (cohérence) sont les deux cas limites. |
  | Spike | possible | Si Antora pose souci avec la structure du repo monorepo, mini-spike pour valider la config — sinon non. |
