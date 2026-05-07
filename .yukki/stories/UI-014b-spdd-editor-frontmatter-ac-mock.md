---
id: UI-014b
slug: spdd-editor-frontmatter-ac-mock
title: Front-matter form et blocs Acceptance Criteria avec validation visuelle (mock)
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
---

# Front-matter form et blocs Acceptance Criteria avec validation visuelle (mock)

## Background

UI-014a livre la coquille. Cette story remplit les deux sections les plus
contraintes du template SPDD : le **front-matter** (formulaire clé/valeur
avec validation par champ : id, slug, status, dates, owner, modules) et les
**Acceptance Criteria** (un AC = card avec titre + Given/When/Then). Les
sections prose (Background, Business Value, Scope In/Out, Open Questions,
Notes) restent en édition libre simple (textarea). La validation est
purement visuelle — pas d'appel backend, juste les règles côté client.

## Business Value

Vérifier l'UX la plus différenciante du produit (le formulaire FM guidé +
les AC en G/W/T) avant de câbler le backend. Les messages d'erreur
explicites ("L'identifiant doit suivre le format PRÉFIXE-XXX, ex. FRONT-042")
sont au cœur de la promesse "guidé".

## Scope In

- Front-matter rendu en grille clé/valeur (label monospace 110px + input transparent)
- Validation visuelle au blur : id (regex `[A-Z]+-\d+`), slug (kebab-case strict), status (énumération), modules (chips, rouge si hors liste connue), dates ISO
- Messages d'erreur sous l'input avec icône triangle warning, phrase complète + exemple correctif
- Modules en chips monospace, ajout/suppression à la souris, suggestion depuis liste connue (frontend, backend, controller, extensions/auth, extensions/billing, helm, docs, cli, internal/uiapp, internal/provider…)
- Sections prose (Bg, Bv, SI, SO, OQ, Notes) en `<textarea>` simple avec auto-resize, comptage de caractères discret
- Acceptance Criteria : liste de cards, chaque card = état à gauche (disque 14px ✓/!/n) + titre éditable + 3 zones G/W/T (label 70px monospace, textarea auto-resize)
- Card AC active avec border violette + ring violet-soft + ombre douce
- Controls par card : drag-handle (visuel mock, pas de DnD réel cette story), dupliquer (ghost icon), supprimer
- Footer dashed "+ Ajouter un AC" qui ajoute une nouvelle card vide
- Inspector contextuel mis à jour selon section : front-matter affiche "Modules connus" + "Statuts SPDD" + "Validation"; AC affiche "Définition SPDD" + "Bonnes pratiques" + "Yuki suggère" (texte statique mocké)
- État de complétude : compteur "n/5 obligatoires" du sommaire calculé à partir du contenu (FM valide ? Bg non vide ? Bv non vide ? au moins 1 SI ? au moins 1 AC complet ?)

## Scope Out

- Drag-and-drop réel pour réordonner les AC (story future si nécessaire)
- Bascule WYSIWYG/Markdown sur les sections prose (UI-014c)
- Assistance IA sur sélection (UI-014d)
- Export fonctionnel (UI-014e)
- Persistance des brouillons et validation côté Go (CORE-007)
- Auto-incrémentation de l'ID basée sur les stories existantes

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Validation front-matter au blur

- **Given** je suis dans le champ `id` du front-matter avec la valeur `front-002`
- **When** je quitte le champ
- **Then** la row se teinte en rouge-soft, l'input devient rouge, et le message
  "L'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042). Préfixe en
  majuscules, un tiret, des chiffres." apparaît sous l'input avec un triangle warning

### AC2 — Modules connus vs inconnus

- **Given** je tape `frontend` puis valide, puis `mystery-module` puis valide
  dans le champ modules
- **When** les chips s'affichent
- **Then** la chip `frontend` est neutre (monospace, fond `--bg-3`), la chip
  `mystery-module` a une bordure rouge interne (`box-shadow: inset 0 0 0 1px var(--yk-danger)`)
  et un tooltip "Module inconnu — ajoute-le à la liste si c'est volontaire"

### AC3 — AC partiel signalé visuellement

- **Given** un AC avec titre rempli, Given rempli, When et Then vides
- **When** je regarde la card
- **Then** son état à gauche est un `!` orange (sur disque warning-soft), les
  labels `WHEN` et `THEN` sont en `--yk-warning`, et l'inspector "Yuki suggère"
  affiche "AC-2 — le When et le Then sont vides. Décris l'action et le résultat
  observable." (texte statique mocké)

### AC4 — Ajout / suppression d'un AC

- **Given** la story a 3 AC
- **When** je clique sur "+ Ajouter un AC"
- **Then** une 4e card apparaît en bas avec titre vide, G/W/T vides, état
  numéroté en violet (active), focus dans le titre ; **et** quand je clique sur
  l'icône poubelle d'AC-2, la card disparaît et la numérotation se met à jour
  (AC-1, AC-2 (ex AC-3), AC-3 (ex AC-4))

### AC5 — Inspector contextuel selon section

- **Given** je clique successivement sur le front-matter, puis Background, puis AC
- **When** chaque section devient active
- **Then** l'inspector affiche respectivement : FM (Modules connus + Statuts +
  Validation), Bg (Définition SPDD + Recommandations + IA), AC (Définition +
  Bonnes pratiques + Yuki suggère) — chaque carte a un kicker monospace 10px
  uppercase et un titre 13.5px

### AC6 — Compteur "n/5 obligatoires" en temps réel

- **Given** front-matter invalide, Bg vide, Bv rempli, 1 SI, 0 AC complet
- **When** je remplis Bg avec un paragraphe
- **Then** le compteur du sommaire passe de "1/5" à "2/5", la barre de
  progression s'allonge proportionnellement, et la pastille `Bg` passe d'orange `○`
  à vert `✓`

## Open Questions

- [ ] Liste des modules connus : la versionner où ? `frontend/src/spdd/modules.ts` ?
      Ou bien la remonter depuis le backend Go (consistance avec validation
      future de CORE-007) ?
- [ ] La sous-liste AC-1, AC-2… expandée dans le sommaire est-elle nécessaire
      cette story, ou attendre UI-014a+b puis UI-014a-bis ?
- [ ] Validation du slug : doit-elle vérifier l'unicité côté FS (story déjà
      existante avec ce slug) ? → probablement CORE-007.

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md)
- Dépend de UI-014a (coquille). Cette story remplit le contenu fonctionnel
  du document.
- Prototype source : `sketch/yukki/project/spdd-sections.jsx`,
  `spdd-editor.css` (sections `.yk-fm`, `.yk-ac`)
- Tropes à éviter : "champ requis" / "format invalide" — tous les messages
  doivent dire **pourquoi** et **comment réparer**, avec un exemple
