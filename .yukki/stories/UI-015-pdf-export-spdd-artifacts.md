---
id: UI-015
slug: pdf-export-spdd-artifacts
title: Export PDF des artefacts SPDD
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
---

# Export PDF des artefacts SPDD

## Background

Les artefacts SPDD (inbox / story / epic / analysis / canvas) vivent en
markdown versionné dans le repo : idéal pour les contributeurs, mais
inadapté au partage hors-yukki avec un sponsor, auditeur ou PM. La
conversion manuelle casse le rendu (front-matter brut, tableaux non
stylés). Les artefacts en phase `generate` ont de plus une chaîne
implicite story → analysis → canvas qu'on aimerait partager d'un bloc.

## Business Value

Permettre aux auteurs SPDD (devs, PMs) de partager leurs artefacts avec des
stakeholders externes (sponsors, auditeurs, PMs hors équipe) sous une forme
lisible, versionnable et archivable, sans étape manuelle de conversion. Les
exports PDF servent aussi de snapshots pour les revues de release et
d'archives de décisions tracées.

## Scope In

- Bouton « Exporter PDF » accessible depuis la vue liste (HubList) qui liste
  les artefacts d'un type (inbox / story / epic / analysis / canvas).
- Sélection multiple d'artefacts via cases à cocher dans la liste, avec
  bouton « Exporter sélection » dans la barre d'action dès qu'au moins un
  artefact est coché.
- Pour un canvas au statut `reviewed`, `implemented` ou `synced`, l'export
  inclut automatiquement la chaîne story → analysis → canvas dans cet ordre,
  dans un seul PDF.
- Multi-sélection : un seul PDF combiné contenant les artefacts dans l'ordre
  d'affichage de la liste, chaque artefact débutant sur une nouvelle page.
- Rendu visuel identique au SpddEditor en mode read-only (sections avec
  headings, prose stylée, listes à puces, tableaux GFM, blocs de code,
  liens cliquables).
- Bouton accessible aussi depuis la vue Kanban (roadmap) pour les Epics et
  Stories engagées (même flux d'export que la HubList).
- Choix du chemin de sauvegarde via une boîte de dialogue système.

## Scope Out

- Édition du PDF généré (déléguée à un outil tiers).
- Signature électronique, watermarking ou tatouage temporel.
- Export vers d'autres formats : DOCX, HTML, ePub.
- Traduction ou multilingue (l'export reproduit la langue de l'artefact).
- Sécurisation par mot de passe du PDF.
- Personnalisation par l'utilisateur du template visuel (police, couleurs).

## Acceptance Criteria

### AC1 — Export simple d'un artefact depuis la HubList

- **Given** la HubList affiche les stories d'un projet ouvert
- **When** l'utilisateur clique sur « Exporter PDF » à côté d'une story et
  confirme un chemin dans la boîte de dialogue système
- **Then** un fichier PDF est créé au chemin choisi, contenant la story
  rendue visuellement (headings, prose, listes, AC) sans front-matter brut
  visible dans le corps du document

### AC2 — Chaîne complète exportée depuis un canvas en phase generate

- **Given** un canvas au statut `reviewed`, `implemented` ou `synced` est
  visible dans la HubList
- **When** l'utilisateur exporte ce canvas
- **Then** le PDF généré contient, dans l'ordre, la story référencée puis
  l'analyse référencée puis le canvas, chaque artefact débutant sur une
  nouvelle page

### AC3 — Export multi-sélection en un PDF combiné

- **Given** trois artefacts cochés dans la HubList
- **When** l'utilisateur clique sur « Exporter sélection »
- **Then** un seul PDF est produit, contenant les trois artefacts dans
  l'ordre d'affichage de la liste, séparés par un saut de page

### AC4 — Sélection vide bloque l'action

- **Given** aucune case n'est cochée dans la HubList
- **When** l'utilisateur regarde la barre d'action « Exporter sélection »
- **Then** le bouton apparaît désactivé et aucun export n'est déclenchable

### AC5 — Référence cassée dans la chaîne signalée

- **Given** un canvas en phase `reviewed` dont l'analyse référencée a été
  supprimée du repo
- **When** l'utilisateur déclenche l'export du canvas
- **Then** le PDF contient les artefacts disponibles et un encart visuel
  mentionne explicitement le ou les artefacts manquants

## Open Questions

- [ ] Stratégie multi-sélection : PDF combiné unique (proposition par
      défaut) ou un PDF par artefact dans un dossier choisi ?
- [ ] Nommage par défaut : `<id>-<slug>.pdf` pour un export simple,
      `spdd-export-YYYYMMDD-HHmm.pdf` pour un combiné — à valider ?
- [ ] Page de garde / pied de page : afficher le statut + la date `updated`
      du front-matter ? Sous quelle forme visuelle (cartouche en pied de
      page, page de couverture par artefact) ?
- [ ] Pour un canvas en statut `draft`, déclenche-t-on aussi la chaîne
      story → analysis → canvas ou seulement l'export simple du canvas ?

## Notes

- Cible technique du rendu : réutiliser `WysiwygProseEditor` en mode
  read-only + `mdComponents` partagés (livrés par UI-014i) pour garantir
  la fidélité visuelle. Le choix de la librairie de génération PDF
  (`window.print()`, `react-to-pdf`, `pdfmake`, ou pipeline headless via
  Wails) sera arbitré en `/yukki-analysis`.
- Évaluation INVEST (cf. [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur UI-014h + UI-014i (mergées dans `main`),
    aucun bloqueur en amont.
  - **Negotiable** : la stratégie multi-sélection (combiné vs séparé) et
    la déclinaison Kanban sont explicitement en Open Questions.
  - **Valuable** : oui — partage hors-yukki + snapshots de revue.
  - **Estimable** : oui, ~2-3j (frontend principalement + IPC Wails pour
    la save dialog).
  - **Small** : 5 AC, en limite haute mais cohérent avec un seul livrable
    « export PDF ». Pas de découpe propre par axe SPIDR (voir tableau).
  - **Testable** : oui — vérification de présence du PDF + extraction du
    texte (sélectionnable, pas une image rasterisée).
- Décision SPIDR (limite haute justifiée, cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | HubList et Kanban partagent le même flux d'export sous-jacent. |
  | Interfaces | non | Single et multi sont la même action côté UI (sélection 1 ou n). |
  | Data | non | La chaîne story → analysis → canvas est la valeur centrale, la retirer briserait l'intention. |
  | Rules | non | L'AC5 (référence cassée) est le seul cas limite et tient en un seul AC. |
  | Spike | possible | Si le choix de lib PDF s'avère plus complexe que prévu en analyse, sortir un `UI-015s` spike avant de continuer. |
