---
id: UI-014e
slug: spdd-editor-export-checklist-mock
title: Bouton Exporter, checklist de validation et toast de confirmation (mock)
status: synced
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
    - frontend
---

# Bouton Exporter, checklist de validation et toast de confirmation (mock)

## Background

Une story SPDD ne peut être exportée que si toutes les sections obligatoires
sont remplies et que le front-matter est valide. Le prototype expose une
**double UI** : un bouton "Exporter" dans le header dont l'apparence reflète
l'état de complétude (primary violet plein si tout est vert, outlined sinon),
et un popover qui descend du bouton avec une checklist détaillée des
exigences. Quand tout est valide, un toast monte en bas-droite après l'export.
Cette story livre tout le flux **avec un export mocké** (le `.md` est
généré côté front et téléchargé via `Blob` ou simplement loggé dans la
console — l'écriture dans `.yukki/stories/` est CORE-009).

## Business Value

Donner au rédacteur un feedback **clair et actionnable** sur ce qu'il manque
avant de pouvoir publier sa story. La checklist transforme "champ requis"
abstrait en chemin concret ("Aller→ Front-matter complet"). C'est ce qui
permet à un PO de rédiger sa première story SPDD sans connaître le template.

## Scope In

- Bouton "Exporter" dans le header de la story :
  - **Outlined** (border violet, fond transparent) si la story est incomplète ou invalide
  - **Primary** (fond violet plein, texte clair) si toutes les exigences sont vertes
- Clic sur "Exporter" en outlined → popover qui descend depuis le bouton (avec une chevron `◇` en haut), affichant :
  - Bandeau warning soft : "⚠ Avant d'exporter, complète : L'export `.md` exige les sections obligatoires."
  - Checklist en 5 lignes :
    - Front-matter complet (FM valide selon les règles UI-014b)
    - Background non-vide
    - Business Value non-vide
    - Au moins 1 puce de Scope In
    - Tous les AC ont Given **et** When **et** Then
  - Chaque ligne : icône `✓` vert si OK, `✗` rouge si KO ; lien "Aller→" sur les lignes KO qui scrolle le document jusqu'à la section concernée et active le focus sur le premier élément manquant
  - Boutons en bas du popover : `Plus tard` (ghost) et `✦ Exporter` (primary, **disabled** tant que ≥ 1 ligne est en `✗`)
- Clic sur "Exporter" en primary → directement export sans popover, déclenche un toast "Story sauvée — front-matter valide ⌘S" en bas-droite (Radix UI Toast déjà installé)
- Génération du `.md` mocké côté front : sérialise le state interne au format SPDD, déclenche un téléchargement de `<id>-<slug>.md` ou logge dans la console (selon mode `__DEV__`)
- Footer status bar mis à jour en temps réel : pastille vert/orange + `n/5 obligatoires` ; en orange si manque, tooltip ou hover montre la liste des sections manquantes

## Scope Out

- Écriture réelle dans `.yukki/stories/<id>-<slug>.md` (CORE-009)
- Validation poussée : unicité de l'ID, conflit de slug, cohérence avec les
  autres stories existantes (CORE-009 ou CORE-007)
- Confirmation par dialog d'écrasement si la story existe déjà sur disque (CORE-009)
- Validation côté serveur via `/yukki-analysis` automatique pré-export
- Génération d'un commit git automatique après export

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Bouton Exporter reflète l'état de complétude

- **Given** la story de démo a 4 sections obligatoires sur 5 (Background vide)
- **When** je regarde le header
- **Then** le bouton "Exporter" est en outlined (border `--yk-primary`, fond
  transparent), curseur `not-allowed` au hover ; **et** quand je remplis
  Background avec un paragraphe valide, le bouton bascule en primary (fond
  violet plein, texte `--yk-text-primary`, curseur `pointer`) sans recharger
  la page

### AC2 — Popover de checklist sur clic en outlined

- **Given** la story est invalide (au moins 1 condition non remplie) et le
  bouton Exporter est en outlined
- **When** je clique sur le bouton
- **Then** un popover descend depuis le bouton avec animation 12ms, ancré
  visuellement par une chevron `◇` en haut, et affiche les 5 lignes de
  checklist avec leur état actuel et leurs liens "Aller→" sur les lignes en `✗`

### AC3 — Lien "Aller→" focalise la section manquante

- **Given** le popover de checklist est ouvert avec "Front-matter complet" en `✗`
- **When** je clique sur "Aller→" sur cette ligne
- **Then** le popover se ferme, le document scrolle smooth jusqu'au front-matter,
  l'entrée FM dans le sommaire devient active, le premier champ FM en erreur
  reçoit le focus, et un ring violet apparaît brièvement (1s) autour du champ

### AC4 — Bouton Exporter du popover désactivé tant qu'il y a un ✗

- **Given** la checklist a 4 lignes en `✓` et 1 en `✗`
- **When** je regarde le popover
- **Then** le bouton "✦ Exporter" du popover est `disabled` (opacity 0.5,
  pas de hover effect, `aria-disabled="true"`)

### AC5 — Export mocké réussi avec toast

- **Given** toutes les conditions sont remplies (5 lignes en `✓`)
- **When** je clique sur le bouton Exporter primary du header (sans popover)
- **Then** la console affiche le `.md` mocké complet (front-matter YAML +
  toutes les sections en ordre), un toast monte en bas-droite avec le texte
  "Story sauvée — front-matter valide ⌘S", icône `✓` vert, durée 4s,
  bouton `×` pour fermer manuellement

### AC6 — Footer status bar synchronisé

- **Given** la story passe de 4/5 à 5/5 obligatoires
- **When** la dernière section vide est remplie
- **Then** la pastille du footer passe d'orange à vert, le texte "4/5 obligatoires"
  passe à "5/5 obligatoires", et la mention "manque : Background" disparaît

### AC7 — Format `.md` exporté byte-conforme au template

- **Given** la story de démo complète
- **When** j'exporte et compare le `.md` généré au template `.yukki/templates/story.md`
  rempli avec les mêmes valeurs
- **Then** la sérialisation est identique : ordre des clés YAML, ordre des
  sections, encodage UTF-8 sans BOM, EOL `\n`, retour ligne final présent

## Open Questions

- [ ] Téléchargement via `Blob` vs envoi à un endpoint backend mocké
      (à décider selon UI-014f) — pour cette story le simple `Blob` suffit.
- [ ] Toast de succès : utiliser le composant Radix UI déjà installé ou
      réécrire un composant léger spécifique au design SPDD ?
- [ ] La checklist doit-elle inclure les sections optionnelles avec une
      mention "recommandé" sans bloquer ? (Open Questions, Notes vides → Yuki
      suggère mais n'empêche pas).

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md)
- Dépend de UI-014a (coquille), UI-014b (FM + AC), idéalement UI-014c (le
  Markdown généré utilise la même sérialisation)
- Prototype source : `sketch/yukki/project/spdd-ai.jsx` (popover export +
  toast), `spdd-editor.css` (`.yk-export-*`)
- Le **vrai** export filesystem est en CORE-009 (écriture dans
  `.yukki/stories/`) ; cette story fournit l'UX mockée que UI-014f viendra
  brancher
