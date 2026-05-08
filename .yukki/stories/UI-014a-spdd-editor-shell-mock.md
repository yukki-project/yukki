---
id: UI-014a
slug: spdd-editor-shell-mock
title: Coquille de l'éditeur SPDD avec sommaire et document (mock)
status: implemented
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
  - frontend
---

# Coquille de l'éditeur SPDD avec sommaire et document (mock)

## Background

Le prototype HTML (`sketch/yukki/project/`) montre une coquille 3 colonnes
(sommaire 240px · document 1fr · inspector 360px) avec activity bar 48px à
gauche et footer status bar. Cette story porte uniquement la **coquille**,
sans contenu fonctionnel : sections SPDD en ordre avec placeholders pointillés,
navigation entre sections, header de story complet. Objectif : valider l'UX
du squelette avant de remplir les composants riches (FM form, AC, IA, export).

## Business Value

Découpler la mise en page (qui demande des ajustements visuels itératifs) du
contenu riche. Permet aux PO de tester les transitions de section, la
hiérarchie visuelle et la lisibilité globale tôt, sans bloquer sur les
composants à forte valeur métier.

## Scope In

- Layout 3 colonnes : activity bar 48px · sommaire 240px · document 1fr · inspector 360px
- Activity bar : 8 icônes (inbox, book, layers, bulb, doc, check, map, workflow) + settings en bas, barre violette 2px sur item actif
- Header de story (40px) : ID monospace · titre · pill de statut · save indicator (●vert/●orange) · segmented WYSIWYG/Markdown · bouton Exporter
- Sommaire (240px) : 8 entrées (FM, Bg, Bv, SI, SO, AC, OQ, Notes), pastilles 12px (vert ✓ done, orange ○ todo, rouge erreur, ○ pointillé optional, ⊙ violet active), compteur AC, barre de progression "n/5 obligatoires"
- Document central (max 720px, padding 28px 56px 80px) : sections avec titre 17px/600 + pill obligatoire/optionnel + bouton `?` (tooltip mock), placeholder dashed sur sections vides avec texte muted en italique
- Inspector droit (360px) : kicker monospace 10px "INSPECTOR" · titre 13.5px de la section · cards selon contexte (contenu mocké statique)
- Footer (28px, monospace 11px) : pastille progression · raccourcis `⌘K`/`⌘/`/`⌘↑↓` · `FRONT-002.md · UTF-8 · LF`
- Tokens design exposés via CSS variables et Tailwind config : surfaces `#0c0d12 → #232631`, lignes, text, accent `#8b6cff`, radii 4/6/8/10, polices Inter + JetBrains Mono
- Story de démo statique (FRONT-002) chargée comme exemple
- Click sur entrée du sommaire → scroll smooth jusqu'à la section dans le document

## Scope Out

- Édition du contenu des sections (UI-014b)
- Bascule WYSIWYG ↔ Markdown effective (UI-014c)
- Assistance IA contextuelle (UI-014d)
- Export fonctionnel et checklist (UI-014e)
- Persistance des brouillons, validation côté backend, intégration LLM (CORE-007/008/009)
- Onglets multi-stories (déjà couverts par `TabBar` existant)

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Layout 3 colonnes stable au resize

- **Given** l'éditeur est monté avec la story de démo
- **When** la fenêtre passe de 1400px à 1024px de large
- **Then** la colonne sommaire reste à 240px, l'inspector à 360px, le document occupe l'espace restant en `1fr` ; aucun overflow horizontal n'apparaît

### AC2 — Navigation par le sommaire

- **Given** je suis sur la section Background
- **When** je clique sur "Acceptance Criteria" dans le sommaire
- **Then** le document scrolle en smooth jusqu'à la section AC (scroll-margin-top 80px), l'entrée correspondante du sommaire devient active (pastille violette `⊙`, fond violet-soft), et l'inspector charge le contexte AC mocké

### AC3 — Pastilles d'état mockées dans le sommaire

- **Given** la story de démo expose 4 sections obligatoires complètes sur 5
- **When** l'éditeur charge
- **Then** le sommaire affiche 4 pastilles vertes `✓`, 1 pastille orange `○`, les 3 sections optionnelles en pointillé, la barre de progression montre "4/5" et son fond passe orange→vert proportionnellement

### AC4 — Header de story complet

- **Given** la story de démo a `id=FRONT-002`, `status=draft`, dernier save il y a 30 secondes
- **When** je regarde le header
- **Then** je vois ID monospace `FRONT-002`, titre "Éditeur guidé SPDD", pill `draft` en warning-soft, point vert "sauvé 14:02", segmented WYSIWYG/Markdown avec WYSIWYG actif (souligné violet), bouton Exporter en outlined (inactif car validation mockée non passée)

### AC5 — Tokens design appliqués sans inlining

- **Given** la coquille est rendue
- **When** j'inspecte les styles dans devtools
- **Then** toutes les couleurs, radii et polices proviennent de variables CSS `--yk-*` ou de classes Tailwind référant à `theme.colors.yk.*` ; aucune valeur hex inline en dehors du fichier de tokens

## Open Questions

- [ ] Réutiliser `ActivityBar`/`TabBar`/`TitleBar` existants (composants `hub/`)
      ou créer un nouveau set `spdd/` dédié à l'éditeur ?
- [ ] Store : Zustand global (cohérent avec le hub) ou store local au composant
      `SpddEditor` (isolation pour tests) ?
- [ ] Intégrer dès cette story le mode Markdown (passive, juste l'afficher) ou
      attendre UI-014c pour activer la bascule ?

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md)
- Prototype source : `sketch/yukki/project/SPDD Editor.html`, `spdd-shell.jsx`,
  `spdd-toc.jsx`, `spdd-editor.css` (~4000 lignes au total)
- Design tokens et règles d'identité visuelle : voir le prompt complet de
  référence (palette `#0c0d12 → #232631`, accent `#8b6cff`, fonts Inter +
  JetBrains Mono, pas de gradients, pas d'emojis)
- Cible technique : composant `frontend/src/components/spdd/SpddEditor.tsx`
  (et sous-composants), Tailwind v3 + Radix UI déjà installés
