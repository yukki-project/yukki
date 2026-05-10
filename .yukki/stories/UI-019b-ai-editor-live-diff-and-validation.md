---
id: UI-019b
slug: ai-editor-live-diff-and-validation
title: Édition collaborative IA avec diff inline et validation différée
status: draft
created: 2026-05-10
updated: 2026-05-10
owner: Thibaut Sannier
modules:
    - frontend
    - internal/uiapp
    - internal/promptbuilder
---

# Édition collaborative IA avec diff inline et validation différée

## Background

L'utilisateur peut aujourd'hui éditer un artefact SPDD (story / canvas /
analyse) à la main dans le SpddEditor, ou recourir à UI-019 « Restructurer
avec l'IA » pour réparer un artefact mal classé par rapport à son template.
Aucun de ces deux modes ne couvre le cas du **rédacteur qui veut itérer
sur un artefact correctement formé** (reformuler une section, condenser
un Background, ajouter une AC sur la sécurité). UI-019b introduit un mode
**édition collaborative IA** : l'utilisateur tape ses instructions en
chat, Claude propose une nouvelle version visualisée en **diff inline
git-style** (rouge barré pour les suppressions, vert pour les ajouts),
et rien n'est appliqué tant que l'utilisateur n'a pas explicitement
validé. Cohabite avec UI-019 (Restructurer reste dédié au mal-formé).

## Business Value

Les **rédacteurs SPDD** (PO, dev, contributeurs OSS) peuvent itérer sur
leurs artefacts beaucoup plus vite : raffiner un Background à la
3ᵉ relecture, ajouter une AC oubliée, reformuler une section trop
verbeuse, sans quitter le SpddEditor. Le diff inline rend visible la
modification proposée avant qu'elle ne touche le draft, ce qui réduit
la charge cognitive et permet d'accepter / refuser / itérer rapidement.
Premier pas concret vers une expérience d'édition assistée par IA dans
yukki — applicable à tout artefact, indépendamment de sa conformité
template.

## Scope In

- **Bouton « Éditer avec l'IA »** dans le SpddEditor (emplacement
  exact à arbitrer en analyse — toolbar header / menu / raccourci).
  Disponible uniquement quand l'éditeur est en mode édition.
- **Drawer chat** dans le panneau Inspector (réutilisation du
  `RestructureInspector` existant ou composant frère selon
  l'analyse) où l'utilisateur tape ses instructions en langage
  libre (« reformule l'intro », « ajoute un point sur la
  sécurité », « rends la section X plus courte »).
- **Streaming chunk-par-chunk** de la réponse Claude dans la bulle
  assistant (réutilise l'infra UI-019 : binding streaming, parser
  `stream_event`, `TypingIndicator` pendant la TTFB, curseur
  clignotant pendant le streaming).
- **Diff inline dans le SpddEditor central** : le contenu courant
  est rendu avec les suppressions en rouge barré et les ajouts en
  vert (style git diff ligne-à-ligne). La granularité (ligne / mot)
  est arbitrée en analyse.
- **Multi-tour conversation libre** : chaque message utilisateur
  produit une nouvelle proposition tenant compte de l'historique
  chat ; le diff inline se met à jour à chaque nouveau tour.
- **Bouton « Valider »** : applique la proposition courante au
  draft en mémoire, allume le badge `isDirty` (cf. OPS-001), ferme
  le mode IA-edit. **Aucune écriture sur disque** — la sauvegarde
  reste explicite via `Ctrl+S` (cohérent invariant OPS-001 « pas
  d'écriture silencieuse »).
- **Bouton « Annuler »** : ferme le mode IA-edit sans toucher au
  draft (mémoire + disque inchangés à l'état pré-clic).

## Scope Out

- **Remplacement de UI-019 « Restructurer avec l'IA »** : les deux
  flows cohabitent. Restructurer reste le chemin spécifique pour
  un artefact dont la structure ne match plus le template ; AI
  Edit est l'assistant général pour itérer sur un artefact
  conforme.
- **Édition collaborative humain-humain** (multi-utilisateur,
  CRDT, présence) — yukki reste mono-utilisateur.
- **Versioning git réel sur disque** — le diff est purement une
  visualisation UI. L'utilisateur reste responsable de
  `git commit` à son rythme.
- **Auto-validation** ou auto-application sans confirmation —
  toute modification passe par « Valider ».
- **Suggestions automatiques sans demande** (l'IA n'agit que sur
  prompt utilisateur explicite, pas en arrière-plan).
- **Sauvegarde automatique** sur disque post-validation — le
  `Ctrl+S` reste le seul vecteur de write.

## Acceptance Criteria

### AC1 — Demande d'édition IA produit un diff inline

- **Given** un artefact ouvert dans le SpddEditor en mode édition,
  Claude CLI disponible
- **When** l'utilisateur clique sur « Éditer avec l'IA », tape
  « reformule la section Background pour qu'elle soit plus
  concise » et envoie
- **Then** la réponse Claude streame dans la bulle assistant ; à la
  fin du streaming, le SpddEditor central affiche un diff inline
  (lignes supprimées en rouge barré, lignes ajoutées en vert) ; le
  draft en mémoire et sur disque restent strictement identiques

### AC2 — Multi-tour conversation raffine la proposition

- **Given** un diff IA est affiché dans le SpddEditor suite à un
  premier tour
- **When** l'utilisateur tape « rends-le encore plus court » et
  envoie
- **Then** Claude produit une nouvelle proposition en tenant compte
  de l'historique chat ; le diff inline se met à jour avec la
  nouvelle proposition vs l'original (pas la proposition
  précédente)

### AC3 — Validation explicite applique au draft mémoire

- **Given** un diff IA est affiché et l'utilisateur en est satisfait
- **When** l'utilisateur clique sur « Valider »
- **Then** le diff disparaît, le SpddEditor affiche la proposition
  comme draft courant, le badge `isDirty` s'allume dans le header,
  et aucune écriture sur disque n'a eu lieu

### AC4 — Annulation laisse le draft strictement inchangé

- **Given** un diff IA est affiché (1er tour ou Nᵉ tour)
- **When** l'utilisateur clique sur « Annuler » ou ferme le drawer
  chat
- **Then** le diff disparaît, le SpddEditor revient à l'affichage
  du draft pré-clic « Éditer avec l'IA », `isDirty` n'est pas
  modifié par cette action

### AC5 — Claude indisponible désactive le bouton

- **Given** Claude CLI indisponible (ClaudeBanner status
  `available === false`)
- **When** le SpddEditor est en mode édition
- **Then** le bouton « Éditer avec l'IA » est désactivé avec un
  tooltip explicite (« Claude CLI indisponible »), aucun chat
  n'est ouvert

## Open Questions

- [ ] **Lib de diff frontend** : utiliser le package npm
      [`diff`](https://github.com/kpdecker/jsdiff) (line-diff
      complet, mature) ou réutiliser le `wordDiff` LCS maison
      d'`AiDiffPanel` (UI-014d) ? Trade-off : `diff` apporte la
      maturité (myers algorithm, char/line/word) mais ajoute une
      dépendance npm. Le maison est testé mais limité au
      word-diff.
- [ ] **Granularité du diff** : ligne-à-ligne (cohérent git
      classique) ou mot-à-mot (plus précis pour les modifs de
      prose) ? Possible mix : ligne pour les sections, mot
      pour les modifs intra-paragraphe.
- [ ] **Endpoint Wails** : nouveau binding dédié `EditStart` /
      `EditCancel` ou réutiliser `RestructureStart` avec un
      paramètre `Mode: 'restructure' | 'edit'` ? Cohérent avec
      UI-019 décision Q2 (endpoint dédié), à valider en analyse.
- [ ] **Layout du diff** : remplacer le contenu central du
      SpddEditor pendant le mode AI-edit (pleine largeur) ou
      side-by-side (avant à gauche, après à droite, contraint
      par la largeur disponible) ?
- [ ] **Reversibility multi-turn** : permettre à l'utilisateur
      de revenir au tour N précédent (« annule le dernier tour,
      reviens à la proposition d'avant ») ou linear-only
      (latest proposal toujours) ?
- [ ] **Périmètre d'édition** : Claude voit-il l'artefact entier
      à chaque tour, ou peut-il être ciblé sur une section
      sélectionnée (avec sélection texte préalable, façon
      AiPopover UI-014d) ?

## Notes

### Évaluation INVEST

Cf. [`.yukki/methodology/invest.md`](../methodology/invest.md).

- **Independent** : dépend de UI-019 (binding streaming
  `RestructureStart`, parser `stream_event`, hook
  `useRestructureSession`, composant chat `RestructureInspector`)
  qui est `implemented`. Pas de bloqueur amont.
- **Negotiable** : 6 décisions ouvertes en Open Questions
  (lib diff, granularité, endpoint, layout, reversibility,
  périmètre).
- **Valuable** : oui — assistant d'édition IA continue est un
  saut UX clair (édition manuelle ↔ Restructurer mal-formé).
- **Estimable** : ~3-4 j (frontend diff renderer + prompt
  builder edit + binding ou réutilisation + validation flow +
  intégration UI). À reconfirmer en analyse.
- **Small** : **borderline**. 5 AC mais 4 sous-systèmes
  (diff renderer, prompt edit, validation flow, multi-turn
  chat). Voir SPIDR ci-dessous.
- **Testable** : oui — mocks Claude (réponses cyclées),
  assertions sur diff render (couleurs, positions),
  validation flow (idempotence Ctrl+S après validate).

### Décision SPIDR

Cf. [`.yukki/methodology/spidr.md`](../methodology/spidr.md).

| Axe | Verdict | Raison |
|---|---|---|
| Paths | **possible** | One-shot edit (1 prompt → 1 diff → valide ou annule) vs multi-tour conversation. Si l'analyse révèle > 6 AC ou un effort > 4 j, scinder en UI-019b (one-shot) + UI-019c (multi-tour). Pour l'instant gardé groupé car les deux chemins partagent l'infra (binding streaming, diff renderer, validation). |
| Interfaces | non | Une seule UI cible (SpddEditor + Inspector chat), pas de variante. |
| Data | non | Le markdown source est la même donnée pour les deux chemins. |
| Rules | non | Validation (AC3) et annulation (AC4) tiennent en 2 AC. AC5 erreur LLM tient en 1 AC. |
| Spike | **possible** | Performance du diff inline sur gros artefacts (>5 KB) — si la lib `diff` ou la stratégie de rendu est lente, la décision « ligne vs mot » peut basculer. À mesurer en analyse via un POC sur un canvas de référence (UI-014h fait ~10 KB). |

### Cohabitation avec UI-019

Les deux flows partagent l'infrastructure de streaming (binding
Wails, parser `stream_event`, hook chat, composant chat
messenger), mais leur contrat utilisateur diffère :

| | UI-019 Restructurer | UI-019b AI Edit |
|---|---|---|
| **Trigger** | Bouton dans warning banner (warning de désync template actif) | Bouton dans toolbar SpddEditor (mode édition actif) |
| **Visibilité** | Uniquement quand divergence template ≠ ∅ | Toujours en mode édition |
| **Périmètre LLM** | Document entier, remap forcé vers template cible | Document entier, instruction libre |
| **Présentation diff** | Stacked par section dans Inspector (~320px) | Inline dans le SpddEditor (pleine largeur) |
| **Validation** | Accepter applique au draft mémoire | Idem |

### Briques existantes mobilisables

- **Binding streaming** `RestructureStart` / `RestructureCancel`
  + parser `stream_event` (UI-019).
- **Hook** `useRestructureSession` (UI-019) pour la state
  machine streaming → preview → chat.
- **Composant chat** `RestructureInspector` avec `ChatLayout` +
  `AssistantBubble` / `UserBubble` / `ThinkingBubble` /
  `TypingIndicator` (UI-019).
- **Parser markdown** (`parser.ts`, `genericSerializer.ts`)
  pour extraire/sérialiser le contenu.
- **Système prompt séparé** `--system-prompt` côté Go
  (UI-019 D7).
- **Badge `isDirty`** dans `SpddHeader` (UI-019 D1) pour
  signaler le draft non-sauvé post-validation.
- **NavGuard** + `NavGuardModal` (UI-019 stabilization) pour
  protéger contre la perte de modifs non sauvées en navigation.

### Liens

- Story parente : [UI-019 — Restructuration IA d'un artefact mal
  formé (+ fallback chat)](./UI-019-ai-restructure-and-chat-fallback.md)
- Story sœur : [UI-014d — AI Diff Panel](./UI-014-guided-story-editor-ai-assist.md)
  (composant `AiDiffPanel` avec `wordDiff` LCS maison —
  candidat réutilisable)
- Méthodologie : [`.yukki/methodology/`](../methodology/)
