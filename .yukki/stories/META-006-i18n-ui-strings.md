---
id: META-006
slug: i18n-ui-strings
title: Internationalisation des textes UI
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
---

# Internationalisation des textes UI

## Background

Tous les textes utilisateur de yukki sont aujourd'hui en français
hard-codé dans les composants React (et quelques messages d'erreur
côté Go). Cela limite l'audience à un public francophone et bloque
l'adoption open-source internationale. On veut extraire les chaînes
dans des fichiers de traduction (FR par défaut, EN comme première
langue ajoutée), avec une infra qui permet d'en ajouter d'autres
sans toucher au code des composants.

## Business Value

Élargit l'audience d'un repo open-source de la francophonie au monde
anglophone — facteur 5 à 10× sur la base de stats GitHub. Permet
aussi à des contributeurs non-francophones de comprendre le produit
sans deviner le sens des labels.

## Scope In

- Toutes les chaînes utilisateur du frontend (labels, tooltips,
  toasts, messages d'erreur affichés à l'écran) extraites dans des
  fichiers de traduction (`fr.json`, `en.json`).
- Les messages d'erreur Go remontés au frontend via les bindings
  Wails restent en anglais (langue technique commune) — leur
  traduction côté frontend si besoin de localisation utilisateur.
- Sélecteur de langue accessible depuis la future page Settings
  (UI-020) — sinon dans un menu provisoire en attendant.
- FR par défaut (préserve l'expérience actuelle), EN comme
  première traduction livrée.
- Les artefacts SPDD (story, analyse, canvas) **restent dans la
  langue du repo** (l'i18n ne touche pas le contenu utilisateur,
  uniquement la chrome de l'app).

## Scope Out

- Traduction du contenu des artefacts (markdown utilisateur).
- Traduction de la documentation `.yukki/methodology/` (qui sert
  de base de connaissance au LLM — reste en français pour
  l'instant).
- Détection automatique de la langue OS / navigateur (preference
  utilisateur explicite via Settings).
- Plus de 2 langues à la livraison (FR + EN suffisent ; les
  contributeurs ajouteront d'autres locales ensuite).
- Traduction des prompts LLM internes (reste en anglais pour la
  qualité du modèle).

## Acceptance Criteria

### AC1 — Bascule en EN affecte toute l'UI

- **Given** l'app est ouverte en FR (par défaut)
- **When** l'utilisateur sélectionne « English » dans le sélecteur
  de langue
- **Then** les labels de l'ActivityBar, du HubList, du SpddEditor,
  des modales et des toasts passent en anglais sans recharger l'app

### AC2 — Persistance de la préférence

- **Given** l'utilisateur a basculé en anglais lors d'une session
  précédente et fermé l'app
- **When** il rouvre yukki
- **Then** l'UI démarre en anglais sans intervention

### AC3 — Chaîne manquante affiche la clé

- **Given** une nouvelle chaîne a été ajoutée à `fr.json` mais
  pas encore à `en.json`
- **When** l'utilisateur consulte l'UI en anglais
- **Then** la clé brute s'affiche (au lieu de planter ou de mélanger
  les langues), signal clair pour les contributeurs

### AC4 — Contenu artefact non traduit

- **Given** une story rédigée en français est ouverte
- **When** l'utilisateur bascule l'UI en anglais
- **Then** seule la chrome (titres de sections du template,
  boutons, tooltips) passe en anglais ; le contenu de la story
  rédigé par l'utilisateur reste tel quel

## Open Questions

- [ ] Quelle librairie i18n utiliser (`react-i18next`, `lingui`,
      `formatjs/react-intl`, ou implémentation maison) ? Trade-off
      taille bundle ↔ richesse des features (pluralisation,
      interpolation, lazy load).
- [ ] Co-localisation : un seul fichier `fr.json` central ou un
      fichier par module / composant (`HubList.fr.json`,
      `SpddEditor.fr.json`) ?
- [ ] Les messages techniques côté Go (erreurs bindings) — on les
      traduit ou on les laisse en anglais et on traduit le wrapper
      utilisateur ?
- [ ] Détection de drift : un script CI qui vérifie que toutes
      les clés FR existent en EN, ou tolérance acceptée ?

## Notes

- Pas de blocker amont — l'app fonctionne déjà sans i18n. La
  story est principalement un refactor des chaînes + intro d'une
  lib + 1 fichier `fr.json` de baseline + 1 `en.json` de
  traduction.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont.
  - **Negotiable** : choix de la lib + structure des fichiers
    sont ouverts.
  - **Valuable** : oui, débloque l'adoption internationale.
  - **Estimable** : ~2 j (extraction + lib + 1 traduction).
  - **Small** : borderline — le périmètre est large (toute la
    chrome) mais homogène. Pas de découpe par module utile.
  - **Testable** : oui — assertion sur quelques clés en FR puis
    en EN, vérification du fallback sur clé manquante.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) : pas
  de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Tous les composants partagent la même infra i18n. |
  | Interfaces | non | Une seule UI cible (le sélecteur). |
  | Data | non | Une seule source (les fichiers de traduction). |
  | Rules | non | AC3 (clé manquante) est le seul cas limite. |
  | Spike | possible | Si la lib choisie nécessite de la config Vite particulière, sortir un spike — sinon non. |
