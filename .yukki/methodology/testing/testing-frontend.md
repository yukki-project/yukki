---
id: TEST-frontend
title: Testing frontend — playbook (pyramide adaptée + sub-refs)
version: 1
status: published
category: testing
applies-to: [spdd-reasons-canvas, spdd-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Mike Cohn (2009) — *Succeeding with Agile: Software Development Using Scrum*, Addison-Wesley, ISBN 978-0321579362. Pyramide originale."
  - "Spotify Engineering (2018) — 'TestPyramid is a Lie. Here's Honeycomb.', https://engineering.atspotify.com/2018/01/testing-of-microservices/"
  - "Kent C. Dodds (2018) — 'The Testing Trophy', https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications"
  - "W3C — *Web Content Accessibility Guidelines (WCAG) 2.1*, https://www.w3.org/TR/WCAG21/"
---

# Testing frontend — playbook (pyramide adaptée + sub-refs)

## Définition

Le testing frontend couvre les artefacts qui s'exécutent
dans un navigateur (ou environnement headless équivalent) :
composants UI, états applicatifs, flux utilisateur, rendu
visuel. Les contraintes spécifiques :

- **Stateful par nature** (DOM, événements, animations,
  réseau)
- **Browser environment** (différences cross-browser, viewport,
  accessibilité, perf)
- **Feedback rapide attendu** (un dev front itère plusieurs
  fois par minute)
- **Coût élevé du test e2e** (lancement browser, fragilité,
  flakiness)

Ce playbook arbitre la stratégie de testing frontend pour un
projet SPDD : quelle pyramide cibler, comment intégrer les
sub-refs (naming, smells, coverage, snapshot,
property-based), quoi mettre dans une annexe outils.

## Pyramide adaptée frontend

3 patterns coexistent en 2026, avec leurs critères d'usage :

### Cohn classique (70/20/10)

Pyramide originale (Mike Cohn 2009) : beaucoup d'unit tests
rapides, peu d'e2e fragiles.

```
            /\
           /e2e\
          /─────\
         /  intg \
        /─────────\
       /   unit    \
      /─────────────\
```

- ~70% unit (composants isolés, fonctions pures)
- ~20% intégration (composant + ses dépendances directes)
- ~10% e2e (parcours utilisateur navigateur réel)

**Quand l'utiliser** : codebases avec beaucoup de logique
métier côté front (calculs, transformations, état complexe).
Souvent contesté en frontend pur où la logique est mince.

### Honeycomb (Spotify 2018)

Inverse l'idée : très peu d'unit, beaucoup d'intégration.

```
        /─────────────\
       /   integrated  \
      /─────────────────\
       \─intl─/   \─intg─/
        \─unt─/   \─unt─/
```

Argument : en frontend (et microservices), l'intégration est
là où les bugs vivent. Les unit tests d'un composant React
isolé prouvent peu si l'intégration avec le store / le router
casse.

**Quand l'utiliser** : architectures à beaucoup de
composants assemblés, peu de logique pure.

### Testing Trophy (Kent C. Dodds 2018)

```
            /\
           /e2e\
          /─────\
         / intg  \
        /─────────\
        |  static  |
        |─────────|
        |  unit   |
        |─────────|
```

Pondération 2026 : intégration dominante, unit pour le pur,
static (TS, ESLint) compté comme première ligne de défense,
e2e ciblé sur les golden paths.

**Quand l'utiliser** : projets TS/React/Vue modernes avec
typage fort. Pattern dominant 2026 dans l'écosystème JS.

### Choix pour SPDD

Recommandation **par défaut** sur un projet SPDD frontend :
**Testing Trophy** (Kent C. Dodds), parce que :
- Aligne sur la stack typique (TS, React/Angular/Vue +
  Vitest/Jest)
- Le typage TS couvre une partie de ce que les unit tests
  faisaient
- L'intégration via Testing Library est rapide et reflète
  l'usage réel

Cas d'écart :
- Beaucoup de logique pure (formatters, parsers, calculs) →
  pyramide Cohn (gros bloc unit en bas)
- App full SPA assemblée à partir de briques UI
  pré-existantes → Honeycomb

## Anti-pattern : Ice-Cream Cone

```
       /───────────\
      /     e2e     \
     /───────────────\
      \─────intg────/
        \────unit─/
```

Dominante e2e, peu d'unit. Souvent observé dans des projets
qui ont raté la pyramide initiale et ne testent que via
Selenium / Playwright en bout de chaîne. Conséquences : CI
lente, tests fragiles, debugging cauchemardesque, dette qui
explose.

Reconnu par : suite > 30 min en CI, > 50% de "rerun" sur
échec, échecs intermittents sans cause claire.

Mitigation : refactor vers Testing Trophy ou Honeycomb,
souvent étalé sur plusieurs trimestres.

## Spécificités frontend

### DOM testing vs rendering

- **Composant isolé** (props → render) : Vitest / Jest +
  Testing Library. Vérifie les rendus, événements,
  accessibilité.
- **Intégration** : composant + store + router (`render`
  avec wrapper) ; vérifier que la navigation, les actions
  dispatch correctement.
- **e2e** : Playwright / Cypress sur l'app complète,
  navigateur réel. Limiter aux **golden paths** critiques.

### State management

Les stores (Redux, Zustand, NgRx, Pinia) ont leur propre
testing :
- Reducers / selectors : unit, faciles, rapides — bonne
  cible pour [`property-based-testing.md`](property-based-testing.md)
- Effects / async : intégration, mock l'API au niveau
  fetcher (MSW est l'idiome moderne)

### Rendering / visual

- **Snapshot testing** (cf. [`snapshot-testing.md`](snapshot-testing.md))
  : tentant mais à utiliser sparingly. Un snapshot d'un
  composant React de 500 lignes ne dit rien de clair.
- **Visual regression** (Percy, Chromatic, Playwright
  screenshot) : pour les composants critiques visuellement.
  Hors scope V1 SPDD.

### Accessibility (a11y / WCAG 2.1 AA)

L'accessibilité est **testable** et doit l'être. Un bouton
sans `aria-label` accessible, un contraste insuffisant, un
focus trap manquant — ce sont des bugs concrets, pas des
"nice to have".

Intégration recommandée :
- **Unit / component tests** : `@testing-library/jest-dom`
  fournit `toHaveAccessibleName`, `toBeVisible`, etc.
- **Audit automatisé** dans la CI : `axe-core` (Vitest /
  Jest) ou `pa11y` (CLI) sur les golden pages
- **e2e** : Playwright supporte `@axe-core/playwright`
  out-of-the-box

Cible : **WCAG 2.1 niveau AA** (50 critères ; AAA est
souvent surdimensionné).

Une ref dédiée a11y est anticipée pour les futurs clusters
SPDD (cf. story TEST-001 OQ2 : différée).

## Sub-refs liées

Cluster testing, applicables au frontend :

- [`test-naming.md`](test-naming.md) — conventions Jest /
  Vitest / Jasmine
- [`test-smells.md`](test-smells.md) — catalogue Meszaros
- [`coverage-discipline.md`](coverage-discipline.md) — seuils
  + 4 anti-cheat
- [`snapshot-testing.md`](snapshot-testing.md) — quand
  utiliser, anti-patterns
- [`property-based-testing.md`](property-based-testing.md) —
  surtout pour les reducers / formatters
- [`mutation-testing.md`](mutation-testing.md) — sur les
  modules critiques de logique frontend (formatters,
  validators)

Pas applicable directement au frontend pur :
- [`contract-testing.md`](contract-testing.md) — c'est une
  préoccupation backend (le frontend est consommateur, mais
  le contrat se définit côté provider)

## Exemple concret — yukki UI-001b (Hub viewer)

La feature [`UI-001b-hub-viewer-claude-banner`](../../stories/UI-001b-hub-viewer-claude-banner.md)
livre le hub principal de yukki (ProjectPicker, Sidebar,
HubList, StoryViewer, ClaudeBanner). Application de la
pyramide Testing Trophy adaptée :

| Couche | Volume relatif | Cibles concrètes |
|---|---|---|
| Static (TS / ESLint) | gratuit | Tous les composants typés strict, pas d'`any` |
| Unit | ~30% | `useArtifactsStore` reducers, `useShellStore.setActiveMode` (logique de toggle) |
| Intégration | ~50% | `<HubList />` avec `useArtifactsStore` hydraté ; `<NewStoryModal />` flow complet (Testing Library + MSW pour mocker `RunStory`) |
| e2e | ~20% | Parcours "ouvrir projet → créer story → la voir dans le hub" via Playwright + binaire mock yukki |

UI-001b/c n'a pas de tests automatisés à date (cohérent UI
V1 selon la décision SPDD). TEST-001 fournit le cadre pour
les ajouter quand `/spdd-tests` (étape 6 SPDD) sera
implémentée.

## Annexe — Tools by ecosystem

> **V1 minimal** : 1 ligne par stack avec l'outil dominant
> 2026. Détail des commandes, configurations, intégration CI
> → **TEST-002** (story sœur dédiée).

| Stack | Unit / Component | Intégration | e2e | a11y | Mutation | Snapshot |
|---|---|---|---|---|---|---|
| **React + TS** | Vitest + Testing Library | idem + MSW | Playwright | `@axe-core/react` | Stryker | Vitest snapshots |
| **Angular** | Karma + Jasmine ou Jest | TestBed | Cypress / Playwright | `@axe-core/angular` | Stryker | Jest snapshots |
| **Vue** | Vitest + Vue Test Utils | idem + MSW | Playwright / Cypress | `@axe-core/vue` | Stryker | Vitest snapshots |
| **Svelte** | Vitest + @testing-library/svelte | idem | Playwright | `axe-core` direct | Stryker | Vitest snapshots |

Pour les commandes concrètes (`vitest run --coverage`,
`ng test --code-coverage`, etc.), les configurations CI, les
seuils par stack : voir **TEST-002 — outils de coverage par
écosystème**.

## Voir aussi

- [`testing-backend.md`](testing-backend.md) — pendant côté
  backend
- [`coverage-discipline.md`](coverage-discipline.md) — seuils
  appliqués aux modules frontend
- [`snapshot-testing.md`](snapshot-testing.md) — sparingly
  côté UI

## Sources

- Mike Cohn (2009) — *Succeeding with Agile*, Addison-Wesley. Pyramide canonique.
- Spotify Engineering (2018) — *TestPyramid is a Lie. Here's Honeycomb.*, [engineering.atspotify.com](https://engineering.atspotify.com/2018/01/testing-of-microservices/).
- Kent C. Dodds (2018) — *The Testing Trophy*, [kentcdodds.com](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications). Pattern dominant en JS/TS moderne.
- W3C — *Web Content Accessibility Guidelines (WCAG) 2.1*, [w3.org](https://www.w3.org/TR/WCAG21/). Cible a11y.

## Changelog

- 2026-05-03 — v1 — création initiale
