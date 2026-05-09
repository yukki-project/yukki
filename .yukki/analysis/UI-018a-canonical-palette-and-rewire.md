---
id: UI-018a
slug: canonical-palette-and-rewire
story: .yukki/stories/UI-018a-canonical-palette-and-rewire.md
status: reviewed
created: 2026-05-09
updated: 2026-05-09
---

# Analyse — Construction de la palette canonique + rewire CSS

> Contexte stratégique pour `UI-018a-canonical-palette-and-rewire`.
> Toutes les Open Questions de la story sont tranchées (cf. story
> `accepted` : préfixe `--ykp-*`, scope `:root` global, ~15-20
> variables couvrant toutes les sémantiques shadcn 1-pour-1,
> statut `accepted` violet, code colors intégrées sous
> `--ykp-code-*`).

## Mots-clés métier extraits

`palette canonique --ykp-*`, `:root` global, `rewire HSL` shadcn,
`globals.css`, `spdd-tokens.css` (28 variables `yk-*`),
`tailwind.config.js`, sémantiques shadcn (background / foreground
/ card / popover / primary / secondary / muted / accent /
destructive / border / input / ring), code colors
(`--ykp-code-key/string/heading/subheading`), statut `accepted`.

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **10 variables shadcn HSL** dans `.dark` de
  [`globals.css`](../../frontend/src/styles/globals.css) :
  `--background`, `--foreground`, `--card` (+ -foreground),
  `--popover` (+ -foreground), `--primary` (+ -foreground),
  `--secondary` (+ -foreground), `--muted` (+ -foreground),
  `--accent` (+ -foreground), `--destructive` (+ -foreground),
  `--border`, `--input`, `--ring`. **À rewirer**.
- **28 variables `yk-*`** dans
  [`spdd-tokens.css`](../../frontend/src/styles/spdd-tokens.css)
  scope `.yk` : surfaces (6), lignes (3), texte (4), accent
  (3), sémantiques (3 + soft), code (4). **Source d'inspiration
  + à conserver pour rétro-compatibilité du SpddEditor**.
- **`tailwind.config.js`** : câble les classes shadcn via
  `theme.extend.colors` à `hsl(var(--background))` etc., et
  expose déjà 15 classes `bg-yk-*` / `text-yk-*`. **Pattern à
  étendre pour les `--ykp-*`**.
- **8 primitives shadcn** dans
  `frontend/src/components/ui/` : `button.tsx`, `card.tsx`,
  `dialog.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `toast.tsx`,
  `toaster.tsx`, `tooltip.tsx`. **Inchangées dans cette
  story** — elles bénéficient automatiquement du rewire.

### Nouveaux (à introduire)

- **Palette canonique `--ykp-*`** (Value Object) — fichier dédié
  (probablement `frontend/src/styles/palette.css`) qui définit
  ~15-20 variables au `:root` global :
  surfaces (`--ykp-bg-page`, `--ykp-bg-elevated`,
  `--ykp-bg-input`), lignes (`--ykp-line`, `--ykp-line-subtle`,
  `--ykp-line-strong`), texte (`--ykp-text-primary`,
  `--ykp-text-secondary`, `--ykp-text-muted`,
  `--ykp-text-faint`), accent (`--ykp-primary` violet
  `#8b6cff`, `--ykp-primary-soft`, `--ykp-primary-fg`),
  sémantiques (`--ykp-success`, `--ykp-warning`, `--ykp-danger`
  + `*-soft` + `*-fg`), états (`--ykp-ring`, `--ykp-input-border`),
  code (`--ykp-code-key/string/heading/subheading`).
- **Rewire shadcn → ykp** (Integration point) — le bloc `.dark`
  de `globals.css` ne définit plus les valeurs HSL en dur ; à
  la place, chaque variable shadcn est aliasée sur la variable
  `--ykp-*` correspondante (par exemple `--background:
  var(--ykp-bg-page)`).
- **Documentation de la palette** (Reference) — fichier
  `docs/palette.md` listant chaque variable, son rôle, sa
  valeur hex et son équivalent shadcn (table de correspondance
  qui sert aussi à UI-018b).

### Invariants

- **I1 — Source de vérité unique** : chaque couleur
  sémantique est définie une et une seule fois dans la palette
  canonique. Les variables shadcn et les `yk-*` deviennent
  des alias.
- **I2 — SpddEditor visuellement inchangé** : les variables
  `yk-*` actuelles continuent d'exister (rétro-compat),
  mais leurs valeurs pointent désormais sur `--ykp-*` quand
  l'équivalence existe.
- **I3 — Rewire 1-pour-1** : pas d'opacité bricolée en CSS,
  pas de fallback. Si shadcn a `--popover-foreground`, la
  palette a `--ykp-popover-fg`.

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *la juxtaposition de deux jeux de couleurs
(shadcn fade pour la chrome, `yk-*` riche pour le SpddEditor)
qui empêche une identité visuelle unifiée*, **on choisit** *de
construire une palette canonique `--ykp-*` au `:root` global,
inspirée des `yk-*` existants mais retravaillée pour couvrir
toutes les sémantiques shadcn explicitement, puis de rewirer
les variables shadcn et `yk-*` comme alias de cette palette*,
**plutôt que** *(B) copier-coller mécaniquement les valeurs
`yk-*` actuelles dans les variables shadcn (perd l'occasion
de calibrer / nommer correctement), (C) écrire les classes
Tailwind en utilisant directement les variables CSS sans
palette nommée intermédiaire (perd la documentation / la
sémantique partagée), (D) ne livrer qu'un sous-ensemble des
sémantiques et combler avec des opacités (`/40`, `/50`)
côté composants (rend le code illisible)*, **pour atteindre**
*une identité visuelle unifiée immédiatement visible (effet
violet sur la chrome dès le rebuild) avec une source de vérité
unique facile à documenter et à étendre*, **en acceptant** *la
création de ~15-20 variables CSS dans un nouveau fichier de
palette, la modification de `globals.css` pour aliaser les
variables shadcn, et un léger refacto de `tailwind.config.js`
pour exposer les classes `bg-ykp-*` / `text-ykp-*` /
`border-ykp-*` / `ring-ykp-*` qui seront consommées par
UI-018b.*

### Alternatives écartées

- **B — Copier-coller `yk-*` → shadcn** : refait le travail
  sans le penser. Pas de palette nommée centrale, dette
  conservée.
- **C — Variables CSS sans palette nommée** : illisible côté
  composant (`bg-[var(--whatever)]`), pas de documentation.
- **D — Sous-ensemble + opacités** : `bg-ykp-bg-page/40`
  dans 30 composants → code bruité, dérive certaine.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/styles/palette.css` | **fort** | **create** : ~15-20 variables `--ykp-*` au `:root` global |
| `frontend/src/styles/globals.css` | moyen | modify : remplacer les définitions HSL `.dark` par des alias `var(--ykp-*)`, importer `palette.css` |
| `frontend/src/styles/spdd-tokens.css` | faible | modify : aliaser les variables `--yk-*` sur `--ykp-*` quand il y a équivalence (préserve la rétro-compat SpddEditor) |
| `frontend/tailwind.config.js` | moyen | modify : ajouter `theme.extend.colors.ykp` exposant ~15-20 classes (`bg-ykp-bg-page`, `text-ykp-text-primary`, …, `bg-ykp-danger-soft`) |
| `docs/palette.md` | faible | **create** : documentation de la palette + table de correspondance shadcn ↔ ykp (utilisée par UI-018b) |
| `frontend/src/main.tsx` ou `App.tsx` | aucun | inchangé (l'import CSS suffit) |
| `frontend/src/components/ui/*.tsx` (8 primitives shadcn) | aucun | inchangées — bénéficient automatiquement du rewire |

## Dépendances et intégrations

- **Pas de nouvelle dépendance npm** — uniquement du CSS et
  une entrée dans `tailwind.config.js`.
- **Tailwind v3** : `theme.extend.colors` accepte la syntaxe
  `'ykp-bg-page': 'var(--ykp-bg-page)'` (pas besoin de HSL,
  pas besoin du wrapper `hsl()` puisque la palette utilise
  des hex directs).
- **Compatibilité avec UI-015 PDF** : le pipeline PDF utilise
  `pdfTokens.ts` light mode dédié et **n'est pas affecté** par
  cette story. La palette desktop reste dark, indépendante.

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Compatibilité — régression visuelle SpddEditor** : si
  l'aliasing des `yk-*` sur `--ykp-*` change les valeurs hex
  effectives, le SpddEditor change d'apparence. *Impact* :
  haut (cassure de l'AC3 story). *Probabilité* : moyenne
  (la palette canonique peut diverger volontairement de
  `yk-*`). *Mitigation* : snapshot visuel pré/post + table
  de correspondance qui distingue « équivalence stricte » et
  « ajustement volontaire ».

- **Performance — aucun impact** : variables CSS résolues au
  parse, pas de coût runtime.

- **Opérationnel — `theme.extend.colors` collision** : si on
  exporte `bg-ykp-primary` mais que `bg-primary` (shadcn)
  existe encore, deux noms pour la même couleur. *Impact* :
  bas. *Probabilité* : haute. *Mitigation* : c'est attendu
  pendant la transition UI-018a → UI-018b. Documenté dans
  `docs/palette.md`.

- **Intégration — composants tiers** : Radix primitives via
  shadcn consomment `var(--*)` directement (chaîne neutre,
  rewire OK). Lucide-react et react-hook-form n'apportent
  pas de couleurs propres. *Risque résiduel* : nul (cf.
  scan B8).

- **Data — calibration mal pensée** : la palette canonique
  est l'occasion de corriger les redondances (`--yk-bg-1`
  vs `--yk-bg-2` vs `--yk-bg-3` — qu'est-ce qui les
  différencie ?). *Mitigation* : noms parlants
  (`--ykp-bg-page` / `--ykp-bg-elevated` / `--ykp-bg-input`)
  + commentaires inline.

## Cas limites identifiés

> BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Variable shadcn sans équivalent direct** (ex.
  `--ring-offset-background`) : décider en analyse si on
  l'expose en `--ykp-ring-offset` ou si on l'aliasse sur
  `--ykp-bg-page`.
- **Code colors `--yk-code-*`** non utilisées en classes
  Tailwind aujourd'hui : passer sous `--ykp-code-*` mais
  pas exposer en classes Tailwind tant qu'aucun composant
  n'en a besoin (éviter la dette).
- **Soft variants en rgba** : `--yk-primary-soft` est en
  rgba. Pour cohérence avec le PDF (UI-015 a déjà découvert
  que rgba sur `borderXxxColor` plante react-pdf), garder
  rgba pour `backgroundColor` et exposer une variante hex
  solide pour les bordures (`--ykp-primary-soft-solid`).
- **Mode light futur** : préparé via `:root` + futur
  `[data-theme="light"]`, mais pas implémenté.
- **Composant tiers à couleurs hardcodées** : aucun trouvé
  par le scan (cf. B8). Audit à confirmer en preview visuelle.

## Decisions à prendre avant le canvas

> Les 5 OQ de la story sont tranchées. Voici les décisions
> résiduelles soulevées par l'analyse.

- [x] ~~**Localisation du fichier palette**~~ → **résolu
      2026-05-09** : `frontend/src/styles/palette.css` (fichier
      plat à côté de `globals.css` et `spdd-tokens.css`). Si
      plus tard on ajoute d'autres tokens (typo, spacing,
      shadows), on bougera vers une structure `tokens/` à ce
      moment-là. Pas d'anticipation prématurée.
- [x] ~~**Dépréciation de `--yk-*`**~~ → **résolu 2026-05-09** :
      aliaser maintenant. Dans `spdd-tokens.css`, chaque
      `--yk-*` devient `var(--ykp-*)` quand il y a équivalence
      (par exemple `--yk-primary: var(--ykp-primary)`). Zéro
      régression visuelle sur le SpddEditor existant
      (préserve l'AC3). La migration des classes consommatrices
      (`bg-yk-*` → `bg-ykp-*`) viendra en suivi quand pertinent
      (probablement avec UI-018b ou un UI-018c dédié).
- [x] ~~**Variantes hover / focus / active**~~ → **résolu
      2026-05-09** : approche **mixte**. Par défaut, opacity
      Tailwind (`hover:bg-ykp-primary/90`,
      `active:bg-ykp-primary/80`) — léger et standard. Variables
      dédiées (`--ykp-primary-disabled`, …) uniquement quand
      l'opacity ne donne pas le rendu attendu, typiquement pour
      `disabled` qui mérite souvent une vraie nuance grise
      plutôt qu'un primary à 50 % d'opacité. Le focus utilise
      `--ykp-ring` (déjà prévu dans la palette riche, Q3 story).
- [x] ~~**Snapshot visuel pré-livraison**~~ → **résolu
      2026-05-09** : capture manuelle + **checklist structurée
      dans la PR description** (`HubList / SpddEditor read-only
      / SpddEditor édition / modale / About dialog`, chacun avec
      lien capture pré-livraison + post-livraison). Pas
      d'outillage dédié (Storybook / Playwright) pour cette
      story. Discipline minimale tracée dans la PR plutôt que
      dans le repo.
