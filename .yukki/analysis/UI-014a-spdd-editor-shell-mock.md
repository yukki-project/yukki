---
id: UI-014a
slug: spdd-editor-shell-mock
story: .yukki/stories/UI-014a-spdd-editor-shell-mock.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Coquille de l'éditeur SPDD avec sommaire et document (mock)

> Contexte stratégique pour la story `UI-014a-spdd-editor-shell-mock`. Produit
> par `/yukki-analysis` à partir d'un scan ciblé du frontend Wails+React+TS.
> Ne dupliquer ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`éditeur`, `shell`, `coquille`, `sommaire`, `inspector`, `section`, `front-matter`,
`Acceptance Criteria`, `pastille`, `progression`, `WYSIWYG`, `Markdown`,
`tokens design`, `activity bar`, `header story`, `footer status bar`.

## Concepts de domaine

### Existants (déjà dans le code)

> Vocabulaire et briques DDD selon
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

- **`ShellMode`** (Value Object) — vit dans
  [`frontend/src/stores/shell.ts`](../../frontend/src/stores/shell.ts), pilote
  `SidebarPanel` et la zone centrale de [`App.tsx`](../../frontend/src/App.tsx)
  (ligne 144-159 : `activeMode === 'workflow' ? <WorkflowPipeline /> : <StoryViewer />`).
  Énumération actuelle : `inbox | stories | epics | analysis | prompts | tests | roadmap | workflow | settings`.
- **`ActivityBar`** (Entity, layout) —
  [`frontend/src/components/hub/ActivityBar.tsx`](../../frontend/src/components/hub/ActivityBar.tsx).
  8 icônes Lucide + Settings, indicateur actif violet 2px à gauche déjà
  implémenté. **Réutilisable tel quel pour UI-014a**.
- **`TitleBar`** (Entity, layout) —
  [`frontend/src/components/hub/TitleBar.tsx`](../../frontend/src/components/hub/TitleBar.tsx).
  32px, drag-region Wails, controls min/max/close. Distinct du *header story*
  (40px) que UI-014a doit ajouter sous la `TabBar`.
- **`TabBar`** (Entity) — gère les onglets multi-projets
  ([`frontend/src/stores/tabs.ts`](../../frontend/src/stores/tabs.ts)). Le
  prototype montre des onglets de **stories** (`FRONT-002`) ; aujourd'hui
  l'app a des onglets de **projets** (`yukki`, `k8s-portal`…). Conflit de
  sémantique à résoudre.
- **`StoryViewer`** (Entity) — vue actuelle quand `activeMode = 'stories'`,
  rendu Markdown lecture seule via `react-markdown`. À distinguer de
  l'**éditeur** SPDD (UI-014).
- **Tokens design HSL** (Value Objects, integration point) —
  [`frontend/src/styles/globals.css`](../../frontend/src/styles/globals.css)
  lignes 38-71 : palette `.dark` actuelle (`background 240 10% 11%`,
  `primary 263 70% 65%` ≈ `#8B5CF6`). Cohérente avec le prototype
  (`#8b6cff`) au token `primary`, mais surfaces (`#0c0d12 → #232631`) plus
  contrastées que les surfaces actuelles. **Écart à arbitrer**.
- **Stores Zustand** (Integration point) — pattern établi (`claude`, `tabs`,
  `shell`, `project`, `artifacts`, `workflow`, `generation`). UI-014a
  s'inscrira naturellement dans ce pattern.
- **Composants Radix UI** (Integration) — `dialog`, `tooltip`, `toast`,
  `dropdown-menu`, `sheet` déjà packagés. Pas besoin d'ajouter de dépendance
  pour cette story.

### Nouveaux (à introduire)

- **`SpddEditor`** (Entity) — composant racine 3 colonnes (TOC 240px /
  Document 1fr / Inspector 360px). Vit dans
  `frontend/src/components/spdd/SpddEditor.tsx` (à créer). Différent de
  `StoryViewer` car (1) éditable, (2) structuré par sections SPDD, (3) avec
  inspector contextuel. Diffusable plus tard via `ShellMode = 'editor'` ou
  via une route au sein de `'stories'`.
- **`SectionDescriptor`** (Value Object) — structure immuable décrivant une
  section SPDD : `key`, `label`, `required`, `optional`, `position`. Source
  unique de vérité pour le sommaire, le rendu document et l'inspector.
  Doit vivre dans `frontend/src/components/spdd/sections.ts` ou similaire.
- **`SectionStatus`** (Value Object) — état calculé par section : `done | todo | optional | error`.
  Mappé sur la pastille du sommaire.
- **`StoryDraft`** (Entity, mocked) — état interne de la story en cours
  d'édition (FM + sections + AC). Mocké en dur cette story (FRONT-002 statique),
  alimenté plus tard par UI-014b/c et persistant via CORE-007. Expose un
  invariant : "le compteur d'obligatoires est dérivé du contenu, jamais
  stocké" (sinon désynchronisation garantie).
- **`SpddInspectorContext`** (Value Object) — type discriminant qui dicte le
  contenu de la colonne droite selon la section active : `{kind: 'fm'} | {kind: 'prose', section} | {kind: 'ac'}`.
  Mocked en dur pour cette story.
- **Tokens `--yk-*`** (Value Objects, integration) — variables CSS dédiées au
  thème SPDD, distinctes des tokens shadcn HSL existants. Domain Event
  implicite : *"l'éditeur SPDD réutilise mais étend la palette du hub"*.

## Approche stratégique

> Format Y-Statement selon
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

Pour livrer la **coquille de l'éditeur SPDD UI-014a**, on choisit
**d'introduire un nouveau composant racine `SpddEditor` exposé via une
nouvelle valeur `ShellMode = 'editor'`** (qui route depuis `App.tsx` au
même endroit que `WorkflowPipeline` et `StoryViewer`), plutôt que
**(B) étendre `StoryViewer` existant** ou **(C) router via une URL/path
dédié**, pour atteindre une **isolation testable section par section**
et une **suppression risquée de zéro régression sur le viewer actuel**,
en acceptant le coût d'une **double existence temporaire** entre
`StoryViewer` (lecture seule) et `SpddEditor` (édition guidée) jusqu'à ce
que l'UX confluence soit décidée (probablement en UI-014e ou plus tard).

**Alternatives écartées** :
- **(B) étendre `StoryViewer`** : refactor risqué qui mélange un viewer
  Markdown stable avec un éditeur en construction. La séparation rend
  les tests Vitest plus simples et permet d'itérer sur SpddEditor sans
  casser le viewer.
- **(C) routing URL/path-based** : l'app Wails ne pratique pas le routing
  URL aujourd'hui ; introduire un router juste pour cet écran serait du
  scope creep contraire aux Norms du projet (cf. CLAUDE.md : "Don't add
  features beyond what the task requires").

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/spdd/` (nouveau) | fort | création (composants `SpddEditor`, `SpddTOC`, `SpddDocument`, `SpddInspector`, `SpddSectionPlaceholder`, `SpddHeader`, `SpddFooter`) |
| `frontend/src/stores/spdd.ts` (nouveau) | moyen | création (store Zustand local à l'éditeur : section active, story mockée, calcul de progression dérivé) |
| `frontend/src/stores/shell.ts` | faible | modification (ajouter `'editor'` à l'enum `ShellMode` et au tableau d'icônes si on veut une icône dédiée — sinon on remplace le routage du mode `stories` quand un draft est ouvert) |
| `frontend/src/App.tsx` | faible | modification (router `'editor'` vers `<SpddEditor />` au même niveau que `WorkflowPipeline`) |
| `frontend/src/styles/globals.css` | faible | modification (ajouter le layer `.yk` avec les tokens `--yk-bg-page`, `--yk-bg-1..3`, `--yk-bg-elev`, `--yk-line`, `--yk-text-primary`, `--yk-primary` si distincts du `--primary` shadcn) |
| `frontend/tailwind.config.ts` | faible | modification (étendre `theme.colors.yk.*` pour permettre `bg-yk-bg-page`, `text-yk-text-primary`, etc., avec fallback HSL pour rester compatible shadcn) |
| `frontend/src/components/hub/ActivityBar.tsx` | très faible | aucune modification structurelle (peut éventuellement gagner un mode `'editor'` si on veut une 9e icône — décision dans Open Questions) |
| `internal/uiapp/` (Go) | nul | aucune (cette story est full mock, aucun binding Wails nouveau) |

## Dépendances et intégrations

- **Tailwind v3 + shadcn UI** : déjà en place
  ([`frontend/components.json`](../../frontend/components.json)). Pas besoin
  d'ajouter Radix ni shadcn primitives non listés.
- **Polices** : Inter (UI) et JetBrains Mono (code) à charger via Google
  Fonts (cf. prototype). À ajouter dans `frontend/index.html` ou via
  `@import` dans `globals.css`.
- **Lucide icons** : `BookOpen`, `Inbox`, `CheckSquare`, `FileText`,
  `Layers`, `Lightbulb`, `Map`, `Workflow`, `Cog` déjà utilisés par
  `ActivityBar`. Pour l'éditeur on peut ajouter `Save`, `Download`, `Code2`
  (toggle WYSIWYG/Markdown), `HelpCircle` (tooltip section).
- **Pas de dépendance Wails** cette story (full mock). UI-014b/c/d/e/f
  introduiront les bindings.
- **Contraintes non-fonctionnelles** :
  - Largeur min utilisable 1024px (acceptée par le prototype 1400px)
  - Dark mode forcé (cf.
    [`frontend/index.html`](../../frontend/index.html) : `class="dark"`)
  - Pas de gradient, pas d'emoji UI (Norms du prompt design)
  - Pas d'inlining hex hors fichier de tokens (Safeguard)

## Risques et points d'attention

> Catégorisation selon
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Intégration — coexistence `StoryViewer` ↔ `SpddEditor`**
  *Impact* : moyen ; *Probabilité* : haute. Les deux composants vont vivre
  côte à côte le temps que l'éditeur soit branché. Si on ne tranche pas
  quelle vue est par défaut sur le mode `'stories'`, on peut introduire de
  l'incohérence (ouvrir une story = voir le viewer ou l'éditeur ?).
  *Mitigation* : par défaut, ouvrir une story dans `StoryViewer` ; un
  bouton "Éditer" (futur, hors UI-014a) bascule vers `SpddEditor`. Pour
  UI-014a, tester via un nouveau mode `'editor'` exposé par dev-only path
  (ex. `?spdd-editor=1` ou un bouton dans Settings).
- **Performance — re-render sur scroll/resize**
  *Impact* : faible ; *Probabilité* : moyenne. Le sommaire écoute la
  position de scroll (intersection observer ou `scroll` listener) pour
  refléter la section active. Sans `useMemo`/`React.memo` sur les entrées,
  on peut re-render 60 fois par seconde.
  *Mitigation* : `IntersectionObserver` à la racine, débouncing si nécessaire,
  `React.memo` sur les rows du TOC.
- **Compatibilité — divergence des tokens prototype ↔ shadcn HSL**
  *Impact* : moyen ; *Probabilité* : haute. Le prototype définit
  `#0c0d12 → #232631` ; le `.dark` shadcn donne `240 10% 11%` qui n'est pas
  exactement la même chose. Sans un mapping explicite, des composants
  shadcn (`Button`, `Dialog`) afficheront des fonds qui ne matchent pas
  l'éditeur.
  *Mitigation* : créer un layer CSS `.yk` qui surcharge les variables
  shadcn dans la sous-arborescence de `SpddEditor`, **ou** harmoniser les
  variables `.dark` globales pour tout le hub (décision plus large).
  Décision à prendre.
- **Sécurité (STRIDE — Information Disclosure)**
  *Impact* : très faible ; *Probabilité* : très faible. La story est full
  mock. Pas de tampering, pas d'exposition de secrets. STRIDE non
  significatif cette story ; à reconsidérer en UI-014d/CORE-008 (LLM
  prompt augmentation = potentiel data exposure).
- **Opérationnel — coupling avec `ShellMode` enum**
  *Impact* : faible ; *Probabilité* : moyenne. Ajouter `'editor'` à
  `ShellMode` impacte `ActivityBar`, `SidebarPanel`, persistance éventuelle
  de la dernière vue. Si on oublie un consommateur, on a un crash silencieux
  ou un comportement inattendu.
  *Mitigation* : utiliser `switch (true)` exhaustif côté
  `App.tsx`/`SidebarPanel`, vérifier avec `tsc --noEmit` que le compilateur
  signale les cas oubliés.

## Cas limites identifiés

> Énumération guidée par
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md)
> (catégories : valeurs limites, état/séquence, environnement, format,
> erreur, concurrence, ressource).

- **Story sans aucun AC** (Boundary / Empty) — la pastille `AC` du sommaire
  doit-elle être orange `○ todo` ou rouge `error` ? Décision : orange (la
  story est rédigeable sans AC final tant qu'elle est en draft).
- **Resize fenêtre < 1024px** (Boundary / Environmental) — les 3 colonnes
  ne tiennent plus (240 + ~720 + 360 = 1320px). Décision UI-014a :
  s'autoriser un overflow horizontal modéré ou cacher l'inspector
  sous un seuil ? Probablement : limiter à width=1280px min (acceptable
  pour Wails desktop) et noter la responsive comme story future.
- **Section avec titre très long dans le TOC** (Format) — un libellé tel
  que "Acceptance Criteria avec énumération exhaustive" déborderait des
  240px du sommaire. Mitigation : `truncate` Tailwind avec `max-w-full`
  + tooltip Radix sur hover.
- **Premier frame avant data chargée** (Sequence/Init) — flash visuel
  vide si le store n'a pas encore mocké la story FRONT-002. Mitigation :
  initialiser le store avec la story de démo en valeur par défaut, pas
  de fetch async pour cette story (mock).
- **Click rapide sur plusieurs entrées du TOC pendant un scroll smooth**
  (Concurrence/Race) — la 1re navigation peut interrompre la 2e si le
  scroll smooth est encore en cours. Décision : utiliser
  `scrollIntoView({behavior:'smooth', block:'start'})` natif et accepter
  le comportement par défaut.

## Decisions à prendre avant le canvas

- [ ] **Mode dédié vs réutilisation** — ajouter `'editor'` à `ShellMode` et
      une icône dédiée dans `ActivityBar`, **ou** garder le mode `'stories'`
      et router le rendu (StoryViewer / SpddEditor) selon un flag du store ?
- [ ] **Tokens design** — étendre les variables `.dark` globales pour
      qu'elles matchent la palette prototype (impact tout le hub), **ou**
      créer un layer `.yk` local à `SpddEditor` qui surcharge sans toucher
      le hub ?
- [ ] **Story de démo** — UI-014a embarque-t-il la story FRONT-002 en mock
      hardcodé, ou charge-t-il une story réelle depuis `.yukki/stories/`
      via le store `artifacts` déjà existant (UI-014a serait alors
      partiellement câblé au backend, ce qui empiète sur UI-014f) ?
- [ ] **Largeur min** — accepter 1280px+ uniquement (cohérent Wails
      desktop) ou prévoir dès UI-014a une stratégie de collapse de
      l'inspector sous 1024px (scope creep) ?
