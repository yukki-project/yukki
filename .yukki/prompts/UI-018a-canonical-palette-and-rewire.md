---
id: UI-018a
slug: canonical-palette-and-rewire
story: .yukki/stories/UI-018a-canonical-palette-and-rewire.md
analysis: .yukki/analysis/UI-018a-canonical-palette-and-rewire.md
status: implemented
created: 2026-05-09
updated: 2026-05-09
---

# Canvas REASONS — Construction de la palette canonique + rewire CSS

> Spécification exécutable. Source de vérité pour `/yukki-generate`
> et `/yukki-sync`. Toute divergence code ↔ canvas se résout
> dans ce fichier d'abord.

---

## R — Requirements

### Problème

Yukki utilise aujourd'hui deux jeux de couleurs disjoints — la
palette shadcn par défaut (gris HSL) habille la chrome (HubList,
ActivityBar, FileMenu, modales) tandis que la palette `--yk-*`
(violet riche) habille le SpddEditor. Le résultat est une
juxtaposition visuelle qui empêche une identité unifiée. On veut
construire une **palette canonique unique `--ykp-*`** au `:root`
global, alignée sur les sémantiques shadcn, et la brancher en
amont par un rewire CSS — sans toucher au code des composants ni
casser le rendu actuel du SpddEditor.

### Definition of Done

- [ ] AC1 — Fichier `frontend/src/styles/palette.css` défini avec
      ~25 variables `--ykp-*` couvrant surfaces / lignes / textes
      / accent / sémantiques success/warning/danger / code
      colors / focus ring.
- [ ] AC2 — Au démarrage de l'app, l'habillage (TitleBar,
      ActivityBar, HubList, FileMenu, modales, notifications)
      utilise la palette canonique : accent violet visible sur
      les boutons primaires et les hover, au lieu des gris
      shadcn par défaut.
- [ ] AC3 — Le rendu pixel-pour-pixel du SpddEditor (sections,
      cards AC, badges, toolbar) reste identique au snapshot
      pré-livraison capturé manuellement avant le merge.
- [ ] AC4 — Les composants tiers non stylables (popover Radix
      natif, scrollbar OS, …) gardent leur apparence par défaut
      — explicitement documentée comme tolérée dans
      `docs/palette.md`.
- [ ] AC5 — La suite vitest existante reste 100 % verte (les
      classes / le DOM ne changent pas, seul le rendu visuel
      bouge).
- [ ] La table de correspondance shadcn → ykp vit dans
      `docs/palette.md` (point d'entrée de UI-018b).
- [ ] Aucun import circulaire CSS, aucune variable orpheline.

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Palette canonique ykp` | Source de vérité unique des couleurs app-wide | ~25 variables CSS au `:root` | définie au build, immutable au runtime |
| `Variables shadcn` | Sémantiques HSL existantes (`--background`, `--accent`, …) consommées par les classes Tailwind shadcn | 11 variables HSL | aliasées sur `var(--ykp-*)` après rewire |
| `Variables yk-* SpddEditor` | Tokens hex existants (`--yk-bg-1`, `--yk-primary`, …) consommés par le SpddEditor via les classes `bg-yk-*` | 28 variables hex / rgba dans le scope `.yk` | aliasées sur `var(--ykp-*)` après rewire |
| `Documentation palette` | Fichier `docs/palette.md` qui liste chaque variable + table de correspondance shadcn ↔ ykp | sections : surfaces, lignes, texte, accent, sémantiques, code, états | maintenue à jour à chaque évolution de palette |

### Relations

- `Palette canonique` ⟶ `Variables shadcn` : 1 vers N (chaque
  variable shadcn pointe sur une variable ykp).
- `Palette canonique` ⟶ `Variables yk-*` : 1 vers N (chaque
  variable yk-* pointe sur une variable ykp quand il y a
  équivalence).
- `Variables shadcn` ⟶ classes Tailwind shadcn (`bg-background`,
  `text-foreground`, …) : déjà câblées via `tailwind.config.js`,
  inchangées.
- `Variables yk-*` ⟶ classes Tailwind yk-* (`bg-yk-bg-1`, …) :
  déjà câblées, inchangées.

### Invariants

- **I1 — Source de vérité unique** : chaque couleur sémantique
  est définie une et une seule fois dans `palette.css`. Les
  variables shadcn et yk-* deviennent des alias.
- **I2 — Pas de régression visuelle SpddEditor** : les
  variables yk-* qui ont une équivalence dans la palette
  pointent dessus ; le rendu pixel-pour-pixel doit rester
  identique au snapshot pré-livraison (AC3).
- **I3 — Pas d'import circulaire** : `palette.css` ne dépend
  d'aucun autre fichier CSS du projet ; `globals.css` et
  `spdd-tokens.css` importent / référencent palette.css.
- **I4 — `:root` global, pas de scope class** : les `--ykp-*`
  sont disponibles partout, sans condition de classe parent.
- **I5 — rgba uniquement pour `backgroundColor`** : leçon
  UI-015 (PDF) — `@react-pdf/renderer` plante sur les
  `borderXxxColor` rgba. La palette expose des variantes hex
  solides (`*-soft-solid`) pour tous les soft qu'on veut
  pouvoir utiliser en bordure.

---

## A — Approach

> Repris de l'analyse Y-Statement.

On construit une palette canonique `--ykp-*` dans un nouveau
fichier `frontend/src/styles/palette.css`, défini au `:root`
global, qui couvre **explicitement** toutes les sémantiques
shadcn (surfaces, lignes, textes, accent, sémantiques, états)
plus les zones de code SpddEditor. Cette palette s'inspire des
valeurs `--yk-*` existantes mais corrige les noms (par exemple
`--ykp-bg-page` / `--ykp-bg-elevated` au lieu de `--yk-bg-1` /
`--yk-bg-2`) et complète les sémantiques manquantes (focus
ring, popover, card-foreground, soft variants).

`globals.css` est ensuite modifié pour aliaser chaque variable
shadcn HSL sur la variable ykp correspondante (par exemple
`--background: var(--ykp-bg-page)`). `spdd-tokens.css` est
modifié pour aliaser les `--yk-*` sur les `--ykp-*` quand il y
a équivalence (rétro-compatibilité du SpddEditor).

`tailwind.config.js` expose les ~15-20 classes Tailwind ykp
(`bg-ykp-bg-page`, `text-ykp-text-primary`, `border-ykp-line`,
`bg-ykp-danger-soft`, …) qui seront consommées par UI-018b
(migration explicite des classes shadcn).

`docs/palette.md` documente chaque variable + sa valeur hex +
son rôle, plus une table de correspondance shadcn ↔ ykp utilisée
comme spec par UI-018b.

### Alternatives écartées

- **B — Copier-coller `yk-*` → variables shadcn** : refait le
  travail sans le penser, palette pas centralisée.
- **C — Variables CSS sans palette nommée** : illisible côté
  composant (`bg-[var(--whatever)]`), pas de doc.
- **D — Sous-ensemble + opacités côté composants** : code
  bruité (`bg-ykp-bg-page/40` partout), dérive certaine.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| Palette canonique | `frontend/src/styles/palette.css` | **create** : ~25 variables `--ykp-*` au `:root` global |
| Variables shadcn | `frontend/src/styles/globals.css` | modify : remplacer les définitions HSL `.dark` par des alias `var(--ykp-*)` ; ajouter `@import './palette.css';` en tête |
| Variables yk-* | `frontend/src/styles/spdd-tokens.css` | modify : aliaser chaque `--yk-*` sur `var(--ykp-*)` quand il y a équivalence (préserve la rétro-compat SpddEditor) |
| Tailwind config | `frontend/tailwind.config.js` | modify : ajouter `theme.extend.colors.ykp` exposant ~25 classes utilité |
| Documentation | `docs/palette.md` | **create** : table de palette + correspondance shadcn ↔ ykp |

### Schéma de flux

```
┌──────────────────────────────────────┐
│ frontend/src/styles/palette.css      │  ← :root, source de vérité
│   --ykp-bg-page: #0c0d12             │
│   --ykp-text-primary: #e6e7ee        │
│   --ykp-primary: #8b6cff             │
│   --ykp-danger-soft: rgba(...)       │
│   --ykp-code-key: #c8b6ff            │
│   ...                                │
└────┬──────────────────┬──────────────┘
     │ alias            │ alias
     ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│ globals.css  │  │ spdd-tokens.css  │
│  .dark {     │  │  .yk {            │
│  --background│  │  --yk-bg-1       │
│   = ykp-...  │  │   = ykp-...      │
│   ...        │  │   ...            │
│  }           │  │  }               │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       │  classes Tailwind │  classes Tailwind
       ▼                   ▼
┌──────────────────────────────────────┐
│ Composants                            │
│   chrome  : bg-background / accent   │
│   SpddEditor : bg-yk-bg-1 (...)      │
│   nouveau  : bg-ykp-bg-page (UI-018b) │
└──────────────────────────────────────┘
```

---

## O — Operations

> 5 Operations dans l'ordre d'exécution. Toutes sont du CSS /
> config, pas de logique. Tests = grep + smoke visuel manuel.

### O1 — Création de `palette.css`

- **Module** : Frontend / styles
- **Fichier** : `frontend/src/styles/palette.css` (nouveau)
- **Signature** :
  ```css
  /*
   * UI-018a — Palette canonique yukki app-wide.
   * Source de vérité unique des couleurs : `globals.css` et
   * `spdd-tokens.css` aliasent leurs variables sur celles-ci.
   * Toutes les classes Tailwind `bg-ykp-*` / `text-ykp-*` /
   * `border-ykp-*` exposées dans `tailwind.config.js`
   * référencent ces variables.
   */
  :root {
    /* ─── Surfaces ─────────────────────────────────────── */
    --ykp-bg-page:     #0c0d12;
    --ykp-bg-elevated: #181a21;
    --ykp-bg-subtle:   #131419;
    --ykp-bg-input:    #16171d;
    --ykp-bg-overlay:  rgba(0, 0, 0, 0.65);

    /* ─── Lines ────────────────────────────────────────── */
    --ykp-line:         #23252e;
    --ykp-line-subtle:  #1c1e25;
    --ykp-line-strong:  #2e3140;

    /* ─── Text ─────────────────────────────────────────── */
    --ykp-text-primary:   #e6e7ee;
    --ykp-text-secondary: #9ea1b3;
    --ykp-text-muted:     #6b6e80;
    --ykp-text-faint:     #4b4d5a;

    /* ─── Accent ───────────────────────────────────────── */
    --ykp-primary:            #8b6cff;
    --ykp-primary-fg:         #ffffff;
    --ykp-primary-soft:       rgba(139, 108, 255, 0.14);
    --ykp-primary-soft-solid: #efeaff;   /* I5 — pour borders */
    --ykp-ring:               rgba(139, 108, 255, 0.32);

    /* ─── Sémantiques ──────────────────────────────────── */
    --ykp-success:      #4ec38a;
    --ykp-success-soft: rgba(78, 195, 138, 0.13);
    --ykp-success-fg:   #052414;
    --ykp-warning:      #e8a657;
    --ykp-warning-soft: rgba(232, 166, 87, 0.13);
    --ykp-warning-fg:   #2a1a0a;
    --ykp-danger:       #e76d6d;
    --ykp-danger-soft:  rgba(231, 109, 109, 0.13);
    --ykp-danger-fg:    #2a0a0a;

    /* ─── Code (markdown view) ─────────────────────────── */
    --ykp-code-key:        #c8b6ff;
    --ykp-code-string:     #9be3a8;
    --ykp-code-heading:    #ffd089;
    --ykp-code-subheading: #ffb3c1;
  }
  ```
- **Comportement** : module CSS pur. Pas d'animation, pas de
  conditionnelle, pas de classe parent. Toutes les variables
  sont documentées par leur regroupement (commentaires
  séparateurs).
- **Tests** :
  - `frontend/src/styles/palette.test.ts` — vérifie que le
    fichier expose au minimum ces 25 variables (regex sur le
    contenu : pour chaque nom attendu, `--ykp-<nom>:` est
    présent).
  - Smoke visuel manuel : ouvrir l'app, ouvrir devtools,
    inspecter `getComputedStyle(document.documentElement)`,
    vérifier la résolution des 25 variables au `:root`.
  Cf. [`testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O2 — Rewire de `globals.css`

- **Module** : Frontend / styles
- **Fichier** : `frontend/src/styles/globals.css` (modify)
- **Signature** : remplacer le bloc `.dark { … }` actuel par :
  ```css
  @import './palette.css';
  @import './spdd-tokens.css';

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    :root {
      /* light mode shadcn defaults — laissés tels quels pour
         préparer un futur mode light (cf. story Q2) */
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      /* ... (inchangé) */
      --radius: 0.5rem;
    }

    /* UI-018a — alias des sémantiques shadcn vers la palette
       canonique. Les valeurs HSL utilisent une variable yukki
       sous-jacente : c'est le rewire qui donne à toute la
       chrome shadcn l'identité visuelle ykp. */
    .dark {
      --background: var(--ykp-bg-page);
      --foreground: var(--ykp-text-primary);

      --card:               var(--ykp-bg-elevated);
      --card-foreground:    var(--ykp-text-primary);

      --popover:            var(--ykp-bg-elevated);
      --popover-foreground: var(--ykp-text-primary);

      --primary:            var(--ykp-primary);
      --primary-foreground: var(--ykp-primary-fg);

      --secondary:            var(--ykp-bg-subtle);
      --secondary-foreground: var(--ykp-text-primary);

      --muted:            var(--ykp-bg-subtle);
      --muted-foreground: var(--ykp-text-muted);

      --accent:            var(--ykp-line);
      --accent-foreground: var(--ykp-text-primary);

      --destructive:            var(--ykp-danger);
      --destructive-foreground: var(--ykp-danger-fg);

      --border: var(--ykp-line);
      --input:  var(--ykp-line);
      --ring:   var(--ykp-primary);
    }
  }

  /* (reste du fichier — body, scrollbar — inchangé) */
  ```
- **Comportement** :
  1. `@import './palette.css'` en haut → variables ykp
     disponibles globalement.
  2. Le bloc `.dark` qui définissait les valeurs HSL en dur
     les remplace par `var(--ykp-*)`.
  3. **Caveat HSL** : le `tailwind.config.js` actuel utilise
     `hsl(var(--background))`. Or `var(--ykp-bg-page)` est un
     hex. La fonction `hsl()` ne reconnaît pas un hex. Deux
     solutions équivalentes côté implémentation :
     a. Garder les classes Tailwind en `hsl(var(--xxx))` et
        définir les `--xxx` shadcn en HSL en dur dans `.dark`
        (perd la centralisation).
     b. **Préférée** : changer `tailwind.config.js` pour ne
        plus envelopper avec `hsl(...)` (laisser
        `var(--background)` brut), et que les variables shadcn
        soient des hex/rgba via les alias `--ykp-*`.
- **Tests** :
  - Smoke visuel manuel (AC2 + AC3) — capture pré/post
    livraison.
  - Vérifier qu'aucun warning console à propos d'une variable
    non résolue (devtools console).

### O3 — Rewire de `spdd-tokens.css`

- **Module** : Frontend / styles
- **Fichier** : `frontend/src/styles/spdd-tokens.css` (modify)
- **Signature** : transformer chaque définition `--yk-*` en
  alias quand il y a une équivalence dans `palette.css`. Les
  `--yk-*` sans équivalent (par exemple `--yk-bg-3`,
  `--yk-bg-elev`, qui sont des nuances spécifiques au
  SpddEditor) gardent leur valeur hex. Exemple :
  ```css
  /*
   * UI-018a — Tokens SpddEditor désormais aliasés sur la
   * palette canonique `--ykp-*` quand il y a équivalence.
   * Préserve la rétro-compat des classes `bg-yk-*` consommées
   * par le SpddEditor : zéro régression visuelle (Invariant I2).
   * La migration des classes consommatrices vers `bg-ykp-*`
   * sera traitée en suivi (UI-018b ou UI-018c).
   */
  .yk {
    /* Surfaces */
    --yk-bg-page: var(--ykp-bg-page);
    --yk-bg-1:    var(--ykp-bg-subtle);
    --yk-bg-2:    var(--ykp-bg-elevated);
    --yk-bg-3:    #1f2129;                /* nuance interne SpddEditor — pas dans la palette */
    --yk-bg-elev: #232631;                /* idem */
    --yk-bg-input: var(--ykp-bg-input);

    /* Lines */
    --yk-line:         var(--ykp-line);
    --yk-line-subtle:  var(--ykp-line-subtle);
    --yk-line-strong:  var(--ykp-line-strong);

    /* Text */
    --yk-text-primary:   var(--ykp-text-primary);
    --yk-text-secondary: var(--ykp-text-secondary);
    --yk-text-muted:     var(--ykp-text-muted);
    --yk-text-faint:     var(--ykp-text-faint);

    /* Accent */
    --yk-primary:       var(--ykp-primary);
    --yk-primary-soft:  var(--ykp-primary-soft);
    --yk-primary-ring:  var(--ykp-ring);

    /* Sémantiques */
    --yk-success:      var(--ykp-success);
    --yk-success-soft: var(--ykp-success-soft);
    --yk-warning:      var(--ykp-warning);
    --yk-warning-soft: var(--ykp-warning-soft);
    --yk-danger:       var(--ykp-danger);
    --yk-danger-soft:  var(--ykp-danger-soft);

    /* Code */
    --yk-code-key:        var(--ykp-code-key);
    --yk-code-string:     var(--ykp-code-string);
    --yk-code-heading:    var(--ykp-code-heading);
    --yk-code-subheading: var(--ykp-code-subheading);

    /* Radii — inchangés (pas dans la palette de couleurs) */
    --yk-radius-sm: 4px;
    --yk-radius:    6px;
    --yk-radius-md: 8px;
    --yk-radius-lg: 10px;

    /* Fonts — inchangées */
    --yk-font-ui:   'Inter', system-ui, sans-serif;
    --yk-font-mono: 'JetBrains Mono', 'Consolas', monospace;
  }
  ```
- **Comportement** : alias purs, scope `.yk` préservé. Les
  consommateurs `bg-yk-bg-1`, `text-yk-primary`, … continuent
  de résoudre via le var-chain `--yk-bg-1` → `--ykp-bg-subtle`
  → valeur `:root`. Pas de changement côté composant.
- **Tests** :
  - Snapshot visuel manuel du SpddEditor (AC3).
  - Test grep sur le fichier : aucun `--yk-*` à la définition
    d'une couleur ne doit être resté en hex en dehors de la
    liste connue (`--yk-bg-3`, `--yk-bg-elev`).

### O4 — Extension de `tailwind.config.js`

- **Module** : Frontend / config
- **Fichier** : `frontend/tailwind.config.js` (modify)
- **Signature** : ajouter, dans `theme.extend.colors`, un objet
  `ykp` qui expose les classes Tailwind correspondant aux
  variables `--ykp-*` :
  ```javascript
  colors: {
    // (existing shadcn entries inchangées)
    border: 'var(--border)',
    input: 'var(--input)',
    ring: 'var(--ring)',
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    primary: {
      DEFAULT: 'var(--primary)',
      foreground: 'var(--primary-foreground)',
    },
    // ... idem secondary / muted / accent / destructive / card / popover

    // (existing yk entries inchangées — `bg-yk-bg-1` etc.)

    // UI-018a — palette canonique yukki app-wide
    ykp: {
      'bg-page':     'var(--ykp-bg-page)',
      'bg-elevated': 'var(--ykp-bg-elevated)',
      'bg-subtle':   'var(--ykp-bg-subtle)',
      'bg-input':    'var(--ykp-bg-input)',
      'bg-overlay':  'var(--ykp-bg-overlay)',

      'line':         'var(--ykp-line)',
      'line-subtle':  'var(--ykp-line-subtle)',
      'line-strong':  'var(--ykp-line-strong)',

      'text-primary':   'var(--ykp-text-primary)',
      'text-secondary': 'var(--ykp-text-secondary)',
      'text-muted':     'var(--ykp-text-muted)',
      'text-faint':     'var(--ykp-text-faint)',

      'primary':            'var(--ykp-primary)',
      'primary-fg':         'var(--ykp-primary-fg)',
      'primary-soft':       'var(--ykp-primary-soft)',
      'primary-soft-solid': 'var(--ykp-primary-soft-solid)',
      'ring':               'var(--ykp-ring)',

      'success':      'var(--ykp-success)',
      'success-soft': 'var(--ykp-success-soft)',
      'success-fg':   'var(--ykp-success-fg)',
      'warning':      'var(--ykp-warning)',
      'warning-soft': 'var(--ykp-warning-soft)',
      'warning-fg':   'var(--ykp-warning-fg)',
      'danger':       'var(--ykp-danger)',
      'danger-soft':  'var(--ykp-danger-soft)',
      'danger-fg':    'var(--ykp-danger-fg)',

      'code-key':        'var(--ykp-code-key)',
      'code-string':     'var(--ykp-code-string)',
      'code-heading':    'var(--ykp-code-heading)',
      'code-subheading': 'var(--ykp-code-subheading)',
    },
  },
  ```
- **Comportement** :
  1. Les ~25 entrées `ykp.<nom>` permettent d'écrire en
     Tailwind `bg-ykp-bg-page`, `text-ykp-text-primary`,
     `border-ykp-line`, `bg-ykp-danger-soft`, etc.
  2. **Note importante O2** : pour l'aliasing à fonctionner,
     les entrées shadcn doivent passer de `hsl(var(--xxx))` à
     `var(--xxx)` brut puisque les variables ykp sont en hex.
- **Tests** :
  - Build frontend doit produire les classes utilité (le
    Tailwind purger doit garder les classes utilisées).
  - Vérification manuelle : `bg-ykp-bg-page` rendu correctement
    dans devtools.

### O5 — Documentation `docs/palette.md`

- **Module** : Documentation
- **Fichier** : `docs/palette.md` (nouveau)
- **Signature** : structure du document :
  ```markdown
  # Palette canonique yukki

  Source de vérité unique des couleurs app-wide. Définie dans
  `frontend/src/styles/palette.css`. Consommée par toute la
  chrome via le rewire des variables shadcn dans `globals.css`,
  et par le SpddEditor via les variables yk-* aliasées dans
  `spdd-tokens.css`.

  ## Surfaces
  | Variable | Hex | Rôle | Exemple d'usage |
  |---|---|---|---|
  | `--ykp-bg-page` | `#0c0d12` | Fond global de l'app | `bg-ykp-bg-page` (App.tsx racine) |
  | … | … | … | … |

  ## Lignes / Texte / Accent / Sémantiques / Code
  (mêmes tableaux)

  ## Correspondance shadcn → ykp
  | Variable shadcn | Alias canonique | Classe Tailwind shadcn |
  |---|---|---|
  | `--background` | `var(--ykp-bg-page)` | `bg-background` |
  | `--foreground` | `var(--ykp-text-primary)` | `text-foreground` |
  | `--primary` | `var(--ykp-primary)` | `bg-primary` / `text-primary` |
  | … | … | … |

  ## Composants tiers tolérés
  Lister les tiers dont l'apparence par défaut est tolérée
  (par exemple : scrollbar OS, popover Radix natif sans
  surcharge CSS).
  ```
- **Comportement** : document de référence, pas de logique.
- **Tests** : revue humaine en PR. Pas de test automatisé.

---

## N — Norms

> Adaptées : pas de logique métier, pas de code Go, juste
> CSS / config / docs.

- **Logging** : N/A (pas de runtime ni d'IO).
- **Sécurité** : pas de surface — aucune variable utilisateur
  dans les valeurs de la palette.
- **Tests** : grep sur les fichiers générés (présence des 25
  variables) + capture visuelle manuelle pré/post-livraison
  pour AC3. Pyramid n'a pas vraiment de sens ici (purement
  cosmétique). Cf.
  [`testing-frontend.md`](../methodology/testing/testing-frontend.md).
- **Nommage** : `--ykp-<groupe>-<nuance>` (par exemple
  `--ykp-bg-elevated`, `--ykp-text-muted`). Pas de chiffres
  arbitraires (`--ykp-bg-1` proscrit).
- **Observabilité** : N/A.
- **i18n** : N/A.
- **Docs** : `docs/palette.md` créé en O5. À mettre à jour à
  chaque évolution de palette.

---

## S — Safeguards

> Limites non-négociables.

- **Sécurité**
  - **Ne jamais** exposer dans la palette une couleur dérivée
    d'un input utilisateur. Toutes les valeurs sont des
    constantes hex / rgba.

- **Compatibilité**
  - **Ne pas** casser le rendu visuel du SpddEditor.
    L'AC3 (snapshot pré/post identique) est non-négociable.
    Si une régression apparaît, ajuster les alias dans
    `spdd-tokens.css` ou les valeurs `--ykp-*` plutôt que de
    casser le rendu.
  - **Ne pas** modifier les fichiers `frontend/src/components/
    ui/*.tsx` (primitives shadcn) — ils restent intouchés et
    bénéficient du rewire automatique.
  - **Ne pas** retirer les variables `--yk-*` ni les classes
    `bg-yk-*` actuelles. La migration de leurs consommateurs
    viendra en suivi (UI-018b ou UI-018c).

- **Performance**
  - **Pas d'overhead runtime** : variables CSS résolues au
    parse, coût négligeable. Le bundle frontend ne grossit que
    de quelques centaines d'octets (palette.css + extension
    Tailwind).

- **Périmètre**
  - **Ne jamais** introduire ici la migration des classes
    `bg-background` → `bg-ykp-bg-page` côté composants —
    c'est le scope de **UI-018b**.
  - **Ne pas** introduire un mode light dans cette story
    (Scope Out). Le `:root` global reste dark, un futur
    `[data-theme="light"]` pourra surcharger plus tard.
  - **Ne pas** modifier `pdfTokens.ts` — le pipeline PDF
    UI-015 reste indépendant (light mode dédié).
  - **Ne pas** dupliquer les valeurs hex entre
    `palette.css` et `spdd-tokens.css` quand il y a
    équivalence — préférer l'aliasing
    `var(--ykp-*)`. Invariant I1.
  - **Ne pas** mettre de `rgba()` dans `borderXxxColor`
    direct ou indirect (leçon UI-015 react-pdf). La palette
    expose des variantes hex solides (`--ykp-primary-soft-solid`)
    pour ces cas.
