# Palette canonique yukki

Source de vérité unique des couleurs app-wide. Définie dans
[`frontend/src/styles/palette.css`](../frontend/src/styles/palette.css).
Consommée par toute la chrome via le rewire des variables shadcn dans
[`globals.css`](../frontend/src/styles/globals.css), et par le SpddEditor
via les variables `--yk-*` aliasées dans
[`spdd-tokens.css`](../frontend/src/styles/spdd-tokens.css).

Toutes les variables sont définies au `:root` global, disponibles
partout sans condition de classe parent. Un futur mode light pourra
être ajouté via un sélecteur `[data-theme="light"]` qui surcharge ce
bloc.

> Pour l'export PDF (UI-015), une palette light dédiée vit dans
> [`pdfTokens.ts`](../frontend/src/components/spdd/pdf/pdfTokens.ts) et
> reste indépendante de cette palette desktop.

---

## Surfaces

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-bg-page` | `#0c0d12` | Fond global de l'app | `bg-ykp-bg-page` |
| `--ykp-bg-elevated` | `#181a21` | Cards, modales, panneaux élevés | `bg-ykp-bg-elevated` |
| `--ykp-bg-subtle` | `#131419` | Fond légèrement contrasté (HubList items) | `bg-ykp-bg-subtle` |
| `--ykp-bg-input` | `#16171d` | Fond des champs de saisie | `bg-ykp-bg-input` |
| `--ykp-bg-overlay` | `rgba(0, 0, 0, 0.65)` | Backdrop de modale | `bg-ykp-bg-overlay` |

## Lignes

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-line` | `#23252e` | Bordures standards | `border-ykp-line` |
| `--ykp-line-subtle` | `#1c1e25` | Séparateurs internes (rows d'une table) | `border-ykp-line-subtle` |
| `--ykp-line-strong` | `#2e3140` | Bordures emphatiques | `border-ykp-line-strong` |

## Texte

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-text-primary` | `#e6e7ee` | Texte principal | `text-ykp-text-primary` |
| `--ykp-text-secondary` | `#9ea1b3` | Sous-titres, labels | `text-ykp-text-secondary` |
| `--ykp-text-muted` | `#6b6e80` | Texte tertiaire (timestamps, hints) | `text-ykp-text-muted` |
| `--ykp-text-faint` | `#4b4d5a` | Texte minimaliste (placeholders) | `text-ykp-text-faint` |

## Accent

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-primary` | `#8b6cff` | Accent principal (boutons, liens) | `bg-ykp-primary`, `text-ykp-primary`, `border-ykp-primary` |
| `--ykp-primary-fg` | `#ffffff` | Texte sur fond primary | `text-ykp-primary-fg` |
| `--ykp-primary-soft` | `rgba(139, 108, 255, 0.14)` | Survol primary, badges discrets | `bg-ykp-primary-soft` (rgba — **uniquement pour `backgroundColor`**) |
| `--ykp-primary-soft-solid` | `#efeaff` | Équivalent hex pour bordures (cf. UI-015) | `border-ykp-primary-soft-solid` |
| `--ykp-ring` | `rgba(139, 108, 255, 0.32)` | Anneau de focus | `ring-ykp-ring` |

## Sémantiques

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-success` | `#4ec38a` | Succès, statut implemented/synced | `bg-ykp-success`, `text-ykp-success` |
| `--ykp-success-soft` | `rgba(78, 195, 138, 0.13)` | Toast succès, badge soft | `bg-ykp-success-soft` |
| `--ykp-success-fg` | `#052414` | Texte sur fond success | `text-ykp-success-fg` |
| `--ykp-warning` | `#e8a657` | Attention, statut draft | `bg-ykp-warning`, `text-ykp-warning` |
| `--ykp-warning-soft` | `rgba(232, 166, 87, 0.13)` | Toast warning, badge soft | `bg-ykp-warning-soft` |
| `--ykp-warning-fg` | `#2a1a0a` | Texte sur fond warning | `text-ykp-warning-fg` |
| `--ykp-danger` | `#e76d6d` | Erreur, statut invalide | `bg-ykp-danger`, `text-ykp-danger` |
| `--ykp-danger-soft` | `rgba(231, 109, 109, 0.13)` | Toast destructif, badge soft | `bg-ykp-danger-soft` |
| `--ykp-danger-fg` | `#2a0a0a` | Texte sur fond danger | `text-ykp-danger-fg` |

## Code (markdown view)

| Variable | Hex | Rôle | Classe Tailwind |
|---|---|---|---|
| `--ykp-code-key` | `#c8b6ff` | Clés de front-matter (id, slug, …) | `text-ykp-code-key` |
| `--ykp-code-string` | `#9be3a8` | Valeurs string | `text-ykp-code-string` |
| `--ykp-code-heading` | `#ffd089` | Titres `#` H1 | `text-ykp-code-heading` |
| `--ykp-code-subheading` | `#ffb3c1` | Sous-titres `##` H2 | `text-ykp-code-subheading` |

---

## Correspondance shadcn → ykp

Table utilisée par **UI-018b** pour la migration des classes Tailwind
côté composants chrome. Chaque classe shadcn est remplacée par sa
classe ykp équivalente, en préservant les variantes Tailwind
(opacity `/40`, pseudo-classes `hover:` / `focus:` / `active:`).

| Classe shadcn | Classe ykp équivalente |
|---|---|
| `bg-background` | `bg-ykp-bg-page` |
| `text-foreground` | `text-ykp-text-primary` |
| `bg-card` | `bg-ykp-bg-elevated` |
| `text-card-foreground` | `text-ykp-text-primary` |
| `bg-popover` | `bg-ykp-bg-elevated` |
| `text-popover-foreground` | `text-ykp-text-primary` |
| `bg-primary` | `bg-ykp-primary` |
| `text-primary-foreground` | `text-ykp-primary-fg` |
| `bg-secondary` | `bg-ykp-bg-subtle` |
| `text-secondary-foreground` | `text-ykp-text-primary` |
| `bg-muted` | `bg-ykp-bg-subtle` |
| `text-muted-foreground` | `text-ykp-text-muted` |
| `bg-accent` | `bg-ykp-line` |
| `text-accent-foreground` | `text-ykp-text-primary` |
| `bg-destructive` | `bg-ykp-danger` |
| `text-destructive` | `text-ykp-danger` |
| `text-destructive-foreground` | `text-ykp-danger-fg` |
| `border-border` | `border-ykp-line` |
| `border-input` | `border-ykp-line` |
| `ring-ring` | `ring-ykp-ring` |
| `ring-offset-background` | `ring-offset-ykp-bg-page` |

> **Variantes acceptées** : tous les préfixes pseudo-classes
> (`hover:`, `focus:`, `active:`, `disabled:`, `data-[state=open]:`,
> …) ainsi que les opacités Tailwind (`/40`, `/50`, `/80`, …) restent
> valides après migration. Exemples :
>
> - `hover:bg-accent/40` → `hover:bg-ykp-line/40`
> - `focus:ring-ring` → `focus:ring-ykp-ring`
> - `data-[state=open]:bg-accent` → `data-[state=open]:bg-ykp-line`

## États interactifs (hover / focus / disabled)

Convention par défaut : utiliser les **opacités Tailwind** sur les
classes ykp, par exemple `hover:bg-ykp-primary/90`,
`active:bg-ykp-primary/80`. Pas de variable dédiée pour les hovers /
actives standards — l'opacité couvre 90 % des cas.

Les variables **dédiées** (par exemple `--ykp-primary-disabled` à venir)
ne sont introduites que lorsque l'opacité ne suffit pas — typiquement
pour `disabled` qui mérite souvent une vraie nuance grise plutôt qu'un
primary-pâle.

---

## Variables `--yk-*` (SpddEditor)

Le SpddEditor consomme historiquement les variables `--yk-*` du fichier
[`spdd-tokens.css`](../frontend/src/styles/spdd-tokens.css) (scope
`.yk`). Depuis UI-018a, ces variables sont aliasées sur `var(--ykp-*)`
quand il y a équivalence — préservation de la rétro-compatibilité, zéro
régression visuelle. La migration des classes consommatrices `bg-yk-*`
vers `bg-ykp-*` viendra en suivi (UI-018b ou UI-018c).

Les variables `--yk-*` sans équivalence dans la palette canonique
(`--yk-bg-3`, `--yk-bg-elev`) gardent leur valeur hex en dur — ce sont
des nuances spécifiques au SpddEditor qui ne sont pas exposées
app-wide.

---

## Composants tiers tolérés

Certains composants ne consomment pas les variables CSS de la
palette et gardent leur apparence par défaut. C'est explicitement
toléré sauf cas signalé par l'utilisateur :

- **Scrollbar OS / WebKit** : utilise `var(--ykp-line)` et
  `var(--ykp-text-muted)` via [`globals.css`](../frontend/src/styles/globals.css).
- **`@radix-ui` primitives** (via shadcn) : consomment
  `var(--background)`, `var(--popover)`, … qui sont aliasées sur la
  palette.
- **`lucide-react`** icones : héritent du `text-*` du parent —
  aucune couleur hardcodée.
- **`@react-pdf/renderer`** : palette PDF dédiée
  ([`pdfTokens.ts`](../frontend/src/components/spdd/pdf/pdfTokens.ts)),
  indépendante.

Si un tiers est observé visuellement hors palette après UI-018b,
ouvrir une story de suivi (UI-018c) pour l'override CSS dédié.
