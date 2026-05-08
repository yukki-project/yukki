---
id: UI-014a
slug: spdd-editor-shell-mock
story: .yukki/stories/UI-014a-spdd-editor-shell-mock.md
analysis: .yukki/analysis/UI-014a-spdd-editor-shell-mock.md
status: implemented
created: 2026-05-07
updated: 2026-05-08
---

# Canvas REASONS — Coquille de l'éditeur SPDD avec sommaire et document (mock)

> Spec exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

> **Note** — l'analyse parente est encore en `status: draft` ; ce canvas a
> été produit en mode auto pour avancer en parallèle. À reviewer avec
> l'analyse avant de promouvoir au statut `reviewed`.

---

## R — Requirements

### Problème

Livrer la **coquille visuelle** de l'éditeur SPDD : layout 3 colonnes
(sommaire 240px · document 1fr · inspector 360px), header de story (40px),
footer status bar (28px), navigation entre 8 sections SPDD avec pastilles
d'état mockées et placeholders pointillés sur sections vides. Aucun
contenu fonctionnel : pas d'édition réelle, pas de validation backend,
pas d'IA, pas d'export. Objectif : valider l'UX du squelette avant de
remplir les composants riches (UI-014b…f).

### Definition of Done

- [ ] **DoD-1** Layout 3 colonnes stable au resize (1280–1920px) — colonnes sommaire 240px et inspector 360px gardent leur largeur, document occupe `1fr`, aucun overflow horizontal *(AC1)*
- [ ] **DoD-2** Click sur entrée du sommaire scrolle smooth vers la section dans le document, l'entrée devient active (pastille `⊙` violette + fond violet-soft), l'inspector charge le contexte mocké correspondant *(AC2)*
- [ ] **DoD-3** Pastilles d'état correctes pour la story de démo (4 vert ✓, 1 orange ○, 3 pointillé optional), barre de progression `4/5` avec dégradé orange→vert proportionnel *(AC3)*
- [ ] **DoD-4** Header de story complet : ID monospace `FRONT-002`, titre, pill `draft` warning-soft, save indicator vert "sauvé HH:MM", segmented WYSIWYG/Markdown (WYSIWYG souligné violet), bouton Exporter outlined *(AC4)*
- [ ] **DoD-5** Tokens design `--yk-*` exposés via CSS layer + Tailwind config étendu, aucune valeur hex inline en dehors du fichier de tokens (vérifié par grep CI : `grep -rn '#[0-9a-fA-F]\{6\}' frontend/src --include='*.tsx'` doit ne retourner que les tokens) *(AC5)*
- [ ] **DoD-6** Tests Vitest sur les 5 ACs (rendu + interactions clavier/souris) passent en CI

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `SpddSection` (Value Object) | Une section SPDD au sens du template `.yukki/templates/story.md` | `key: SectionKey`, `label: string`, `required: boolean` | Immutable, défini en constante |
| `SectionKey` (Value Object) | Identifiant énuméré d'une section | `'fm' \| 'bg' \| 'bv' \| 'si' \| 'so' \| 'ac' \| 'oq' \| 'no'` | Constante |
| `SectionStatus` (Value Object) | État affichable d'une section dans le TOC | `'done' \| 'todo' \| 'optional' \| 'error' \| 'active'` | Dérivé du draft |
| `StoryDraft` (Entity, mocked) | État interne de la story éditée | `id, slug, title, status, dates, owner, modules, sections, ac` | Statique pour UI-014a (FRONT-002) |
| `MockAcceptanceCriterion` (Entity) | Un AC mocké avec G/W/T | `id, title, given, when, then` | Statique |
| `InspectorContext` (Value Object) | Contenu à afficher dans la colonne droite | `{kind: 'fm'} \| {kind: 'prose', section} \| {kind: 'ac'}` | Dérivé de la section active |
| `ShellMode` (existant, étendu) | Mode actif du hub | enum + `'editor'` (nouvelle valeur) | Persisté dans localStorage via `useShellStore` |

### Relations

- `StoryDraft` 1—* `SpddSection` (8 sections par story, ordre fixe)
- `StoryDraft` 1—* `MockAcceptanceCriterion` (0..N ACs, ordre stable)
- `SpddSection` 1—1 `SectionStatus` (calculé à la volée par sélecteur)
- `SectionKey` 1—1 `InspectorContext` (mapping figé : `fm → {kind:'fm'}`, `ac → {kind:'ac'}`, autre → `{kind:'prose', section}`)

---

## A — Approach

Pour livrer la coquille UI-014a, on introduit un nouveau composant racine
`SpddEditor` exposé via une nouvelle valeur `ShellMode = 'editor'`, routé
depuis `App.tsx` au même niveau que `WorkflowPipeline` et `StoryViewer`
(pattern déjà en place lignes 144-159). Le composant est composé de 5
sous-composants (`SpddHeader`, `SpddTOC`, `SpddDocument`,
`SpddInspector`, `SpddFooter`) orchestrés par un store Zustand local
`useSpddEditorStore` qui contient (1) le `StoryDraft` mocké en valeur
par défaut sur la story FRONT-002, (2) la `activeSection` calculée par
sélecteurs dérivés, (3) un setter `setActiveSection` appelé par `SpddTOC`
et propagé par `IntersectionObserver` côté `SpddDocument`. Les tokens
design `--yk-*` vivent dans un layer CSS séparé `frontend/src/styles/spdd-tokens.css`
importé en plus de `globals.css`, et étendent `tailwind.config.ts` via
`theme.colors.yk.*` pour permettre `bg-yk-bg-1`, `text-yk-text-primary`,
etc. Aucun appel Wails côté Go cette story (full mock).

### Alternatives considérées

- **Étendre `StoryViewer`** — refactor risqué qui mélange un viewer Markdown
  stable (rendu via `react-markdown`) avec un éditeur en construction.
  Écarté : la séparation rend les tests Vitest plus simples et permet
  d'itérer sur SpddEditor sans casser le viewer.
- **Routing URL/path-based via `react-router`** — ajout de dépendance et
  de complexité juste pour un écran. L'app Wails ne pratique pas le routing
  URL aujourd'hui. Écarté pour rester cohérent avec les Norms du projet
  (CLAUDE.md : "Don't add features beyond what the task requires").
- **Surcharger `.dark` global pour faire matcher les tokens prototype** —
  impacte tout le hub (banner Claude, ProjectPicker, etc.). Écarté : trop
  risqué pour cette story ; on isole les nouveaux tokens dans `.yk` sous
  `SpddEditor` jusqu'à décision plus large d'unification.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `frontend/src/components/spdd/` (nouveau) | `SpddEditor.tsx`, `SpddHeader.tsx`, `SpddTOC.tsx`, `SpddDocument.tsx`, `SpddInspector.tsx`, `SpddFooter.tsx`, `sections.ts`, `mockStory.ts`, `types.ts` | create |
| `frontend/src/stores/spdd.ts` (nouveau) | `useSpddEditorStore` (Zustand) | create |
| `frontend/src/stores/shell.ts` | ajouter `'editor'` à `ShellMode`, étendre `SPDD_KINDS` si applicable (pas le cas ici — éditeur ne pilote pas l'artifacts store) | modify |
| `frontend/src/App.tsx` | ajouter une branche `activeMode === 'editor' ? <SpddEditor /> : ...` | modify |
| `frontend/src/components/hub/ActivityBar.tsx` | ajouter une 9e icône `Pencil` mappée sur mode `'editor'` | modify |
| `frontend/src/styles/spdd-tokens.css` (nouveau) | layer `.yk` avec variables `--yk-*` (surfaces, lignes, text, primary, soft variants, sémantiques) + `@font-face` Inter et JetBrains Mono | create |
| `frontend/src/styles/globals.css` | `@import './spdd-tokens.css';` en haut du fichier | modify (1 ligne) |
| `frontend/tailwind.config.ts` | étendre `theme.extend.colors.yk.*` et `theme.extend.fontFamily.{inter, jbmono}` pour les classes utilitaires (`bg-yk-bg-1`, `font-jbmono`, etc.) | modify |
| `frontend/index.html` | `<link>` Google Fonts (Inter 400/500/600 + JetBrains Mono 400/500) | modify (2 lignes) |
| `frontend/src/components/spdd/__tests__/` (nouveau) | `SpddEditor.test.tsx`, `SpddTOC.test.tsx`, `SpddHeader.test.tsx` | create |

### Schéma de flux

```
[App.tsx]
   │ activeMode === 'editor'
   ▼
[SpddEditor]  (3-col grid : 240 / 1fr / 360)
   │
   ├── [SpddHeader]    (40px : id, title, status, save, segmented, export)
   │
   ├── grid-cols-[240px_1fr_360px]
   │   ├── [SpddTOC]        ◀──┐
   │   │   IntersectionObserver  │ active section
   │   ├── [SpddDocument]   ────┤ ↕ scroll-smooth
   │   │     8 sections (placeholders)
   │   │
   │   └── [SpddInspector]  ◀──┘ contexte selon section active
   │
   └── [SpddFooter]    (28px : pastille n/5, raccourcis, fichier UTF-8 LF)

[useSpddEditorStore] (Zustand)
   ├── draft: StoryDraft (mock FRONT-002)
   ├── activeSection: SectionKey
   ├── setActiveSection(key)
   └── selectors: sectionStatuses, requiredCompleted, allRequired
```

---

## O — Operations

> Ordre d'exécution `O1 → O8`. Chaque opération est testable
> indépendamment selon
> [`.yukki/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O1 — Définir tokens design SPDD

- **Module** : `frontend/src/styles/`
- **Fichier** : `frontend/src/styles/spdd-tokens.css` (nouveau)
- **Signature** :
  ```css
  /* Variables CSS scopées sous .yk pour ne pas polluer le hub */
  .yk {
    --yk-bg-page:   #0c0d12;
    --yk-bg-1:      #131419;
    --yk-bg-2:      #181a21;
    --yk-bg-3:      #1f2129;
    --yk-bg-elev:   #232631;
    --yk-bg-input:  #16171d;

    --yk-line:        #23252e;
    --yk-line-subtle: #1c1e25;
    --yk-line-strong: #2e3140;

    --yk-text-primary:   #e6e7ee;
    --yk-text-secondary: #9ea1b3;
    --yk-text-muted:     #6b6e80;
    --yk-text-faint:     #4b4d5a;

    --yk-primary:      #8b6cff;
    --yk-primary-soft: rgba(139,108,255,0.14);
    --yk-primary-ring: rgba(139,108,255,0.32);

    --yk-success: #4ec38a; --yk-success-soft: rgba(78,195,138,0.13);
    --yk-warning: #e8a657; --yk-warning-soft: rgba(232,166,87,0.13);
    --yk-danger:  #e76d6d; --yk-danger-soft:  rgba(231,109,109,0.13);

    --yk-radius-sm: 4px;
    --yk-radius:    6px;
    --yk-radius-md: 8px;
    --yk-radius-lg: 10px;

    --yk-font-ui:   'Inter', system-ui, sans-serif;
    --yk-font-mono: 'JetBrains Mono', 'Consolas', monospace;
  }
  ```
- **Comportement** : exporter toutes les variables CSS sous le sélecteur `.yk`. `globals.css` ajoute `@import './spdd-tokens.css';` en haut. `tailwind.config.ts` ajoute dans `theme.extend.colors.yk` les mappings `bg-page`, `bg-1`..`bg-elev`, `bg-input`, `line`, `line-subtle`, `line-strong`, `text-primary`, `text-secondary`, `text-muted`, `text-faint`, `primary`, `primary-soft`, `primary-ring`, `success`, `success-soft`, `warning`, `warning-soft`, `danger`, `danger-soft` (chacun référant `var(--yk-*)`). Étend `theme.extend.fontFamily.{inter, jbmono}` et `theme.extend.borderRadius.{yk-sm, yk, yk-md, yk-lg}`. Ajoute `<link>` Google Fonts dans `frontend/index.html` (Inter 400/500/600 + JetBrains Mono 400/500).
- **Tests** :
  - Visual smoke (Vitest + jsdom) : rendre un `<div className="yk">` et vérifier que `getComputedStyle` retourne les valeurs hex attendues pour `--yk-bg-page` et `--yk-primary`.
  - Lint : un test `tokens.lint.test.ts` qui parcourt `frontend/src/components/spdd/**/*.tsx` et échoue si une regex `#[0-9a-fA-F]{6}` matche (équivalent du grep CI de la DoD).

### O2 — Modèle de domaine SPDD (sections + draft mock)

- **Module** : `frontend/src/components/spdd/`
- **Fichiers** :
  - `frontend/src/components/spdd/types.ts`
  - `frontend/src/components/spdd/sections.ts`
  - `frontend/src/components/spdd/mockStory.ts`
- **Signatures** :
  ```ts
  // types.ts
  export type SectionKey = 'fm' | 'bg' | 'bv' | 'si' | 'so' | 'ac' | 'oq' | 'no';
  export type SectionStatus = 'done' | 'todo' | 'optional' | 'error' | 'active';

  export interface SpddSection {
    readonly key: SectionKey;
    readonly label: string;
    readonly required: boolean;
  }

  export interface MockAcceptanceCriterion {
    readonly id: string;     // 'AC1', 'AC2', …
    readonly title: string;
    readonly given: string;
    readonly when: string;
    readonly then: string;
  }

  export interface StoryDraft {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly status: 'draft' | 'reviewed' | 'accepted' | 'implemented' | 'synced';
    readonly created: string;   // ISO 8601
    readonly updated: string;
    readonly owner: string;
    readonly modules: readonly string[];
    readonly sections: Readonly<Record<Exclude<SectionKey, 'fm' | 'ac'>, string>>;
    readonly ac: readonly MockAcceptanceCriterion[];
    readonly savedAt: string | null; // ISO ; null = pas encore sauvé
  }

  // sections.ts
  export const SECTIONS: readonly SpddSection[] = [
    { key: 'fm', label: 'Front-matter',         required: true  },
    { key: 'bg', label: 'Background',           required: true  },
    { key: 'bv', label: 'Business Value',       required: true  },
    { key: 'si', label: 'Scope In',             required: true  },
    { key: 'so', label: 'Scope Out',            required: false },
    { key: 'ac', label: 'Acceptance Criteria',  required: true  },
    { key: 'oq', label: 'Open Questions',       required: false },
    { key: 'no', label: 'Notes',                required: false },
  ];

  // mockStory.ts
  export const DEMO_STORY: StoryDraft = { /* FRONT-002 fixture, 1 section vide pour tester pastille orange */ };
  ```
- **Comportement** : `SECTIONS` est l'ordre fixe du sommaire et du document. `DEMO_STORY` est la story `FRONT-002 — Éditeur guidé SPDD` du prompt design : FM rempli, Bg rempli, Bv rempli, SI 5 puces remplies, **SO vide** (pour générer la pastille orange `○ todo`), AC=[ AC1 complet, AC2 Then vide, AC3 Given vide ], OQ vide, Notes vides. `savedAt` initialisé à `Date.now() - 60_000` ISO.
- **Tests** :
  - `sections.test.ts` : vérifie que `SECTIONS` a bien 8 entrées, que les `required` correspondent à 5 (FM, Bg, Bv, SI, AC), que l'ordre est stable.
  - `mockStory.test.ts` : vérifie que `DEMO_STORY` est conforme à la fixture attendue (snapshot test).

### O3 — Store Zustand `useSpddEditorStore`

- **Module** : `frontend/src/stores/`
- **Fichier** : `frontend/src/stores/spdd.ts` (nouveau)
- **Signature** :
  ```ts
  import { create } from 'zustand';
  import { DEMO_STORY } from '@/components/spdd/mockStory';
  import { SECTIONS } from '@/components/spdd/sections';
  import type { SectionKey, SectionStatus, StoryDraft } from '@/components/spdd/types';

  interface SpddEditorState {
    draft: StoryDraft;
    activeSection: SectionKey;
    viewMode: 'wysiwyg' | 'markdown';
    setActiveSection: (key: SectionKey) => void;
    setViewMode: (mode: 'wysiwyg' | 'markdown') => void;
  }

  export const useSpddEditorStore = create<SpddEditorState>()((set) => ({
    draft: DEMO_STORY,
    activeSection: 'bg',           // section par défaut au montage (cf. AC4)
    viewMode: 'wysiwyg',
    setActiveSection: (key) => set({ activeSection: key }),
    setViewMode: (mode) => set({ viewMode: mode }),
  }));

  // Sélecteurs purs (pas dans le store, à côté pour testabilité)
  export function selectSectionStatus(state: SpddEditorState, key: SectionKey): SectionStatus { /* … */ }
  export function selectRequiredCompleted(state: SpddEditorState): number { /* 0..5 */ }
  ```
- **Comportement** :
  - `setActiveSection(key)` change la section active (déclenche `useEffect` côté `SpddDocument` qui scroll ; déclenche re-render de `SpddInspector`).
  - `selectSectionStatus(state, 'bg')` retourne `'active'` si key=activeSection, sinon `'done'` si la section est obligatoire et son contenu non vide, `'todo'` si obligatoire et vide, `'optional'` si non obligatoire et vide, `'optional'` (avec contenu rendu) si non obligatoire et rempli (légère ambiguïté : pour UI-014a on rend toujours `'optional'` sur les non-required, le badge done arrive en UI-014b).
  - `selectRequiredCompleted(state)` : compte les sections obligatoires (FM, Bg, Bv, SI, AC) dont le contenu est non vide. Pour FM : non vide si tous les champs `id, slug, title, status, created, updated, owner, modules` sont remplis. Pour AC : non vide si ≥ 1 AC avec G+W+T tous renseignés.
- **Tests** :
  - `spdd.test.ts` : `selectRequiredCompleted(DEMO_STORY)` retourne `4` (FM ✓, Bg ✓, Bv ✓, SI ✓, AC ✗ car AC2 et AC3 incomplets).
  - `setActiveSection('ac')` puis `selectSectionStatus(state, 'ac')` retourne `'active'`.

### O4 — `SpddTOC` (sommaire 240px)

- **Module** : `frontend/src/components/spdd/`
- **Fichier** : `frontend/src/components/spdd/SpddTOC.tsx`
- **Signature** :
  ```tsx
  export interface SpddTOCProps {
    onSectionClick: (key: SectionKey) => void;
  }
  export function SpddTOC({ onSectionClick }: SpddTOCProps): JSX.Element;
  ```
- **Comportement** :
  - Lit `useSpddEditorStore(s => s.activeSection)` et le draft pour calculer chaque `SectionStatus`.
  - Rend une liste de 8 `<button>` (rôle `tab`) avec :
    - Pastille 12px à gauche : icône `Check` vert (done), `Circle` vide orange (todo), pointillé gris (optional), `AlertTriangle` rouge (error, non utilisé UI-014a), `CircleDot` violet (active).
    - Label en `font-inter text-[13px] text-yk-text-primary` ou `text-yk-text-muted` selon état.
    - Pour `ac`, compteur `(3)` à droite en `text-yk-text-faint font-jbmono text-[11px]`.
    - Sous-liste AC1/AC2/AC3 expandée par défaut, mini-dot vert/orange selon complétude.
  - Pied du TOC : `Progression — n/5` + barre 3px (`w-full bg-yk-bg-3 rounded-yk-sm`, fill `bg-yk-warning` à `bg-yk-success` proportionnel).
  - Click : appelle `onSectionClick(key)` → consommé par parent qui setActiveSection + scroll.
- **Tests** (`SpddTOC.test.tsx`) :
  - Rend 8 entrées avec labels exacts.
  - Pastille 'todo' orange sur la section SO de DEMO_STORY (paradoxal mais SO est *optional* → en fait on attend `optional`, pas `todo` ; rectifier la fixture mock pour avoir 1 section `required` vide, ex. introduire un draft alternatif `DEMO_STORY_PARTIAL` qui a Bg vide, exporté pour les tests).
  - Click sur "AC" appelle `onSectionClick('ac')` une fois.
  - Compteur `(3)` rendu sur l'entrée AC.
  - Barre de progression à `4/5` = 80% de largeur fillée.

### O5 — `SpddDocument` (zone centrale avec placeholders)

- **Module** : `frontend/src/components/spdd/`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx`
- **Signature** :
  ```tsx
  export interface SpddDocumentProps {
    onActiveSectionFromScroll: (key: SectionKey) => void;
  }
  export function SpddDocument({ onActiveSectionFromScroll }: SpddDocumentProps): JSX.Element;
  ```
- **Comportement** :
  - Container `<main>` `max-w-[720px] px-14 pt-7 pb-20 overflow-y-auto h-full`.
  - 8 `<section id={`spdd-section-${key}`} className="scroll-mt-20">` rendues en boucle sur `SECTIONS`.
  - Chaque section : `<header>` avec titre 17px/600/letter-spacing-[-0.01em] + pill `obligatoire` (warning-soft, jbmono 9.5px uppercase) ou `optionnel` (text-muted) + bouton `?` (Lucide `HelpCircle` 18px, ghost) avec tooltip Radix mocké.
  - Body de la section :
    - **FM** : pour UI-014a, un `<div>` placeholder avec liste des clés et valeurs en jbmono mais sans inputs interactifs (l'édition arrive en UI-014b).
    - **AC** : liste des 3 ACs en cards (placeholders read-only avec G/W/T affichés mais pas éditables).
    - **autres sections** :
      - Si contenu non vide (Bg, Bv, SI rempli) : `<p>` ou `<ul>` rendu en read-only.
      - Si contenu vide (SO, OQ, Notes vides) : placeholder `<div>` `border-1 border-dashed border-yk-line-strong bg-yk-bg-2 text-yk-text-muted italic p-6 rounded-yk` avec hint copy ("Pose le décor : pourquoi cette story existe…" pour Bg ; etc.). Hover : border devient `border-yk-primary`, fond `bg-yk-primary-soft`.
  - `IntersectionObserver` : observe les 8 sections, callback `onActiveSectionFromScroll(key)` appelé pour la section qui occupe le plus d'espace dans le viewport.
- **Tests** (`SpddDocument.test.tsx`) :
  - Rend 8 sections dans l'ordre de `SECTIONS`.
  - La section SO de DEMO_STORY (vide) affiche le placeholder dashed avec le hint exact attendu.
  - Mock `IntersectionObserver` : trigger `entries` sur la section AC et vérifier que `onActiveSectionFromScroll('ac')` est appelé.
  - Click sur le bouton `?` d'une section ouvre le tooltip avec le texte du hint SPDD.

### O6 — `SpddInspector` (colonne droite 360px)

- **Module** : `frontend/src/components/spdd/`
- **Fichier** : `frontend/src/components/spdd/SpddInspector.tsx`
- **Signature** :
  ```tsx
  export function SpddInspector(): JSX.Element;
  ```
- **Comportement** :
  - Lit `useSpddEditorStore(s => s.activeSection)`.
  - Calcule un `InspectorContext` à partir de la section active : `'fm' → fmContext`, `'ac' → acContext`, autres → `proseContext(key)`.
  - Rend toujours :
    - Kicker `<span className="font-jbmono text-[10px] uppercase text-yk-text-muted tracking-wider">INSPECTOR</span>`.
    - Titre `<h2 className="text-[13.5px] font-semibold mt-1 text-yk-text-primary">{section.label}</h2>`.
  - Selon contexte :
    - **proseContext** : 3 cards "Définition SPDD", "Recommandations", "IA" — toutes avec contenu mocké statique en français (issu du prompt design).
    - **fmContext** : 3 cards "Modules connus" (chips jbmono), "Statuts SPDD" (liste avec définitions), "Validation" (texte sur le timing).
    - **acContext** : 3 cards "Définition SPDD" (G/W/T), "Bonnes pratiques", "Yuki suggère" (card violet-soft avec suggestion contextuelle pour AC2 dans la fixture mock).
  - Cards : `<section className="bg-yk-bg-2 rounded-yk px-4 py-3 mb-3 border border-yk-line-subtle">`, label monospace en haut.
- **Tests** (`SpddInspector.test.tsx`) :
  - Section active = `bg` → rend "Définition SPDD" + "Recommandations" + "IA" avec textes attendus.
  - Section active = `fm` → rend "Modules connus" avec ≥ 5 chips visibles.
  - Section active = `ac` → rend "Yuki suggère" avec une suggestion non vide.

### O7 — `SpddHeader` et `SpddFooter`

- **Module** : `frontend/src/components/spdd/`
- **Fichiers** :
  - `frontend/src/components/spdd/SpddHeader.tsx`
  - `frontend/src/components/spdd/SpddFooter.tsx`
- **Signatures** :
  ```tsx
  export function SpddHeader(): JSX.Element;
  export function SpddFooter(): JSX.Element;
  ```
- **Comportement** :
  - **SpddHeader** : `<header className="h-10 px-4 flex items-center gap-4 border-b border-yk-line bg-yk-bg-1">` contient :
    - ID en `font-jbmono text-[12px] text-yk-text-secondary`.
    - Titre en `font-inter text-[14px] font-medium text-yk-text-primary`.
    - Pill statut `<span className="font-jbmono text-[9.5px] uppercase px-2 py-0.5 rounded-yk-sm bg-yk-warning-soft text-yk-warning">{status}</span>`.
    - Save indicator : dot `w-1.5 h-1.5 rounded-full bg-yk-success` + texte "sauvé HH:MM" calculé depuis `draft.savedAt` (mocké à `now - 60s`).
    - Spacer (flex-1).
    - Segmented control WYSIWYG/Markdown : 2 boutons, l'actif en `text-yk-text-primary border-b-2 border-yk-primary`, inactif en `text-yk-text-muted`. Click → `setViewMode`. (UI-014a : le clic met à jour le store mais ne change pas le rendu — ça arrive en UI-014c. Le segmented est donc visuellement réactif mais le doc reste en WYSIWYG.)
    - Bouton "Exporter" : si `selectRequiredCompleted(state) === SECTIONS.filter(s => s.required).length` → `Button` primary violet ; sinon `Button` outlined avec curseur `not-allowed`. Click sur outlined : pour UI-014a, simple `console.warn('Export disabled — incomplete story')` (la vraie checklist arrive en UI-014e).
  - **SpddFooter** : `<footer className="h-7 px-4 flex items-center gap-4 border-t border-yk-line bg-yk-bg-1 font-jbmono text-[11px] text-yk-text-muted">` contient :
    - Pastille colorée + texte `n/5 obligatoires` (vert si n=5, orange sinon).
    - Si n<5, texte `manque : <liste sections required vides>` en `font-inter text-yk-warning`.
    - Spacer.
    - Raccourcis `⌘K palette · ⌘/ markdown · ⌘↑↓ section`.
    - Spacer.
    - Nom fichier : `<draft.id>-<draft.slug>.md · UTF-8 · LF`.
- **Tests** (`SpddHeader.test.tsx` + `SpddFooter.test.tsx`) :
  - Header rend ID, titre, pill draft, dot vert avec texte "sauvé".
  - Bouton Exporter en outlined par défaut (DEMO_STORY incomplet).
  - Click sur "Markdown" appelle `setViewMode('markdown')` (vérifié via spy sur le store).
  - Footer affiche `4/5 obligatoires` et le label `manque : Acceptance Criteria` pour DEMO_STORY.

### O8 — `SpddEditor` racine + intégration `App.tsx`

- **Module** : `frontend/src/components/spdd/` + `frontend/src/`
- **Fichiers** :
  - `frontend/src/components/spdd/SpddEditor.tsx`
  - `frontend/src/components/hub/ActivityBar.tsx` (modif)
  - `frontend/src/stores/shell.ts` (modif)
  - `frontend/src/App.tsx` (modif)
- **Signature** :
  ```tsx
  // SpddEditor.tsx
  export function SpddEditor(): JSX.Element;
  ```
  ```ts
  // shell.ts — étendre :
  export type ShellMode = … | 'editor';
  ```
- **Comportement** :
  - `SpddEditor` rend la coquille complète :
    ```tsx
    <div className="yk grid h-full grid-rows-[40px_1fr_28px] bg-yk-bg-page text-yk-text-primary font-inter">
      <SpddHeader />
      <div className="grid grid-cols-[240px_1fr_360px] overflow-hidden">
        <aside className="border-r border-yk-line bg-yk-bg-1 overflow-y-auto">
          <SpddTOC onSectionClick={handleTocClick} />
        </aside>
        <SpddDocument onActiveSectionFromScroll={handleScrollSection} />
        <aside className="border-l border-yk-line bg-yk-bg-1 overflow-y-auto p-4">
          <SpddInspector />
        </aside>
      </div>
      <SpddFooter />
    </div>
    ```
  - `handleTocClick(key)` : `setActiveSection(key)` puis `document.getElementById('spdd-section-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
  - `handleScrollSection(key)` : `setActiveSection(key)` (debounced ~80ms via `useRef + setTimeout` pour éviter les ricochets pendant le scroll smooth).
  - `App.tsx` : ajouter une branche `activeMode === 'editor' ? <SpddEditor /> : ...` au même niveau que les autres modes (lignes 144-159).
  - `ActivityBar.tsx` : ajouter une 9e icône `Pencil` (Lucide) avant Settings, mappée sur mode `'editor'` avec label "SPDD Editor".
  - `shell.ts` : étendre l'union `ShellMode` avec `'editor'`. Pas d'ajout dans `SPDD_KINDS` (l'éditeur ne pilote pas l'artifacts store).
- **Tests** (`SpddEditor.test.tsx`) :
  - Rend les 4 zones (header, TOC, document, inspector, footer) — vérifier les `data-testid` ou rôles ARIA.
  - Click sur "Acceptance Criteria" dans le TOC met `activeSection = 'ac'` dans le store ET appelle `scrollIntoView` (mocké) avec `behavior:'smooth'`.
  - Resize via `window.innerWidth = 1280` puis `dispatchEvent('resize')` : container reste 3 colonnes (vérifier `getComputedStyle(...).gridTemplateColumns`).
  - Test e2e d'intégration `App.test.tsx` (extension du test existant) : sélectionner mode `'editor'` dans `ActivityBar` puis vérifier que `<SpddEditor />` est rendu.

---

## N — Norms

> Standards transversaux du projet à respecter dans cette feature
> (adaptés à la stack Wails + React + TypeScript + Tailwind).

- **Logging** : `console.*` toléré uniquement pour développement. Aucun log à `console.log` dans le code commité — utiliser `console.warn` ou `console.error` exclusivement quand c'est intentionnel (cas du bouton Exporter outlined).
- **Sécurité** : aucune entrée utilisateur libre dans cette story (mock fixé). Aucune route Wails exposée. À reconsidérer en UI-014b et CORE-007.
- **Tests** : Vitest + Testing Library obligatoire pour chaque composant exposé. Pyramide cible selon [`.yukki/methodology/testing/testing-frontend.md`](../methodology/testing/testing-frontend.md) — beaucoup d'unit (composants), 1 ou 2 d'intégration (`SpddEditor.test.tsx`).
- **Nommage** : composants en `PascalCase.tsx`, stores en `kebab-case.ts` exportant `useXxxStore`, tests en `<file>.test.tsx`. Pas de `default export`.
- **Style** :
  - Tailwind utility classes uniquement, pas de CSS-in-JS, pas de styled-components.
  - Tokens `--yk-*` ou classes `yk-*` exclusivement pour les couleurs/radii/fonts de l'éditeur.
  - Aucune valeur hex inline en dehors de `spdd-tokens.css` (CI grep enforced).
- **Accessibilité** : `aria-label` sur chaque bouton non textuel (icône seule), `role="tab"` sur les entrées du TOC, `aria-current="true"` sur la section active. Focus visible obligatoire (`focus-visible:ring-2 focus-visible:ring-yk-primary-ring`).
- **i18n** : tous les textes UI en **français**, code en anglais (norme yukki). Pas de bibliothèque i18n introduite cette story (la copy française est inline ; un i18n est une story séparée si nécessaire).
- **Imports** : alias `@/` pour `frontend/src/`, paths relatifs interdits au-delà d'un niveau.
- **Docs** : pas de modification dans `docs/` cette story (purement frontend interne).

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Sécurité**
  - Aucun appel réseau ou Wails côté Go cette story (full mock).
  - Aucun secret, token ou credential dans le code (la story FRONT-002 mock est fictive et publique).
- **Compatibilité**
  - **Ne jamais** modifier le `StoryViewer` existant ni le router de `App.tsx` au-delà de l'ajout d'une branche `'editor'` (le mode `'stories'` doit continuer d'afficher `StoryViewer` exactement comme avant).
  - **Ne jamais** retirer ou renommer une valeur de `ShellMode` existante. Uniquement étendre.
  - **Ne jamais** changer le comportement du persist `yukki:shell-prefs` pour les utilisateurs existants (ajouter `'editor'` doit rester rétrocompatible avec un localStorage qui ne le contient pas).
- **Performance**
  - **Ne jamais** lier le scroll listener directement (sans `IntersectionObserver` ou debounce) — risque de re-render 60fps.
  - **Ne jamais** rendre tous les ACs en `<textarea>` actif si la liste excède 50 ACs. UI-014a a 3 ACs (mock), donc non bloquant ici, mais le composant doit être prêt à virtualiser plus tard.
- **Périmètre**
  - **Ne jamais** introduire de bibliothèque WYSIWYG (TipTap/Lexical/ProseMirror) cette story — c'est UI-014b/c.
  - **Ne jamais** câbler de validation backend cette story — c'est CORE-007.
  - **Ne jamais** toucher au backend Go — c'est CORE-007/008/009.
  - **Ne jamais** introduire de routing URL/path-based — décision tranchée dans Approach.
  - **Ne jamais** introduire d'inlining de tokens hex hors de `spdd-tokens.css` — Norm enforced par CI.
- **Cohérence prototype**
  - **Ne jamais** s'écarter des dimensions du prototype : 240px TOC, 360px Inspector, 40px header, 28px footer, 720px max document, padding 28/56/80.
  - **Ne jamais** introduire de gradient, d'emoji UI ou d'illustration "wellness app" — Norm explicite du prompt design.
