---
id: UI-018b
slug: shadcn-classes-migration
story: .yukki/stories/UI-018b-shadcn-classes-migration.md
analysis: .yukki/analysis/UI-018b-shadcn-classes-migration.md
status: implemented
created: 2026-05-09
updated: 2026-05-09
---

# Canvas REASONS — Migration explicite des classes shadcn vers la palette canonique

> Spécification exécutable. Source de vérité pour `/yukki-generate`
> et `/yukki-sync`. Toute divergence code ↔ canvas se résout
> dans ce fichier d'abord. **Dépend strictement de UI-018a**
> (palette `--ykp-*` + classes Tailwind `bg-ykp-*` doivent être
> mergées avant de démarrer).

---

## R — Requirements

### Problème

Après UI-018a, l'apparence de la chrome est correcte (couleurs
yukki via le rewire CSS), mais le code des composants parle
encore le langage shadcn (`bg-background`, `text-foreground`,
`bg-muted`, `border-border`, `bg-destructive`, …). Ce
décalage crée une indirection trompeuse : un développeur lit
`bg-background` et ignore que la couleur effective vient de la
palette canonique. Cette story remplace mécaniquement les
~139 occurrences de classes shadcn dans les 20 composants
chrome par leurs équivalents `bg-ykp-*` exposés par UI-018a.

### Definition of Done

- [ ] AC1 — `grep` sur `bg-background\|text-foreground\|bg-accent
      \|bg-muted\|text-muted-foreground\|border-border\|bg-destructive
      \|text-destructive\|bg-card\|bg-popover\|bg-primary\|bg-secondary
      \|ring-ring\|border-input` dans `frontend/src/components/`
      (hors `ui/*.tsx` primitives shadcn) retourne **zéro
      résultat**.
- [ ] AC2 — Snapshot visuel de la chrome **pixel-pour-pixel
      identique** au snapshot capturé juste après UI-018a et
      avant cette story (la migration est purement textuelle —
      aucun changement de couleur).
- [ ] AC3 — Suite vitest existante (183/183 actuellement)
      reste verte après la migration. Les sélecteurs CSS dans
      les tests sont adaptés si nécessaire.
- [ ] AC4 — Composants primitifs shadcn dans
      `frontend/src/components/ui/*.tsx` **inchangés** : leur
      source vient de la lib shadcn et n'est pas touchée. Leur
      rendu visuel reste correct grâce au rewire CSS posé par
      UI-018a.
- [ ] AC5 — `docs/palette.md` (livré par UI-018a) enrichi avec
      la table de correspondance complète `bg-background →
      bg-ykp-bg-page`, etc.
- [ ] La PR contient un compte rendu de l'audit des composants
      tiers (Radix, lucide-react, react-hook-form, react-hot-
      toast équivalent) confirmant qu'aucun n'a de couleurs
      hardcodées posant problème (ou si oui, story de suivi
      UI-018c documentée).

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Mapping shadcn → ykp` | Table de correspondance entre une classe Tailwind shadcn et son équivalent ykp | clé : nom shadcn ; valeur : nom ykp | défini une fois en analyse (B5/B6) + dans `docs/palette.md` |
| `Composant chrome migrable` | Fichier `.tsx` ou `.ts` dans `frontend/src/components/` (hors `ui/`) qui consomme au moins une classe shadcn | path, occurrences | identifié au début, remplacé en bloc, vérifié en fin |
| `Composant primitif shadcn` | Fichier `.tsx` dans `frontend/src/components/ui/` importé tel quel de la lib shadcn | path | **intouché** dans cette story |
| `Composant tiers réimporté` | Lib externe (Radix, react-hot-toast équivalent, lucide-react) | imports | audit visuel post-migration ; override en suivi si nécessaire (UI-018c) |
| `Audit tiers` | Section ajoutée à `docs/palette.md` qui constate l'état de chaque composant tiers post-UI-018a | une ligne par tiers | livré dans cette story |

### Relations

- `Composant chrome migrable` ⟶ `Mapping shadcn → ykp` : N
  vers M (chaque composant consomme plusieurs classes shadcn,
  chaque classe shadcn apparaît dans plusieurs composants).
- `Composant primitif shadcn` : aucune relation avec la
  migration (intouché).
- `Composant tiers réimporté` ⟶ `Audit tiers` : 1 vers 1.

### Invariants

- **I1 — Migration purement mécanique** : aucun changement
  visuel attendu. UI-018a a déjà aligné les couleurs ; cette
  story ne fait que renommer les classes côté composants.
- **I2 — Primitives shadcn intactes** : aucun fichier dans
  `frontend/src/components/ui/` n'est modifié par la
  migration.
- **I3 — Une seule PR** : pas de migration partielle, pas de
  période transitoire « moitié shadcn / moitié ykp » sur
  `main` (cf. story Q3).
- **I4 — Variantes opacity / hover / focus migrent aussi** :
  `bg-accent/40` → `bg-ykp-line/40`, `hover:bg-muted` →
  `hover:bg-ykp-bg-subtle`, `focus:ring-ring` →
  `focus:ring-ykp-ring`. Le sed regex doit accepter ces
  préfixes / suffixes.

---

## A — Approach

> Repris de l'analyse Y-Statement.

On exécute, en une seule PR, un remplacement mécanique des ~139
occurrences de classes shadcn dans les 20 composants chrome
identifiés par grep, en utilisant la table de correspondance
livrée par UI-018a dans `docs/palette.md`. Le remplacement
préserve les variantes Tailwind (opacity `/40`, pseudo-classes
`hover:` / `focus:` / `active:`). Les 8 primitives shadcn dans
`frontend/src/components/ui/` ne sont pas touchées : leur
source vient de la lib et bénéficie automatiquement du rewire
CSS d'UI-018a. Les composants tiers (Radix via shadcn,
lucide-react, react-hook-form) sont audités visuellement
post-migration ; si l'un d'eux montre une couleur hors
palette, le suivi est documenté en story UI-018c (hors scope
ici). Le résultat est validé par un snapshot visuel manuel +
la suite vitest existante (qui reste verte car aucun test ne
fait d'assertion sur les classes CSS — vérifié par grep, scan
B7).

### Alternatives écartées

- **B — Garder les classes shadcn** : indirection persistante,
  contredit l'objectif de la story.
- **C — Migration en plusieurs PRs** : coordination lourde
  pour un refacto mécanique, période transitoire incohérente
  sur `main`.
- **D — Classes intermédiaires `bg-canonical-*`** : couche
  inutile, n'élimine pas la confusion.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| Composants chrome | 20 fichiers identifiés par grep dans `frontend/src/components/` (hors `ui/`) | modify : remplacement mécanique des classes shadcn par leurs équivalents ykp |
| Documentation palette | `docs/palette.md` | modify : ajout du tableau de correspondance shadcn → ykp |
| Tests vitest | `frontend/src/**/*.test.{ts,tsx}` | modify (potentiellement) : adapter les sélecteurs CSS s'ils référencent une classe shadcn migrée |
| `frontend/src/components/ui/*.tsx` | 8 primitives shadcn | **inchangées** |

### Liste indicative des composants chrome à toucher

> À confirmer par grep en O1. Estimation initiale (cf. analyse) :

```
frontend/src/App.tsx
frontend/src/components/hub/HubList.tsx
frontend/src/components/hub/TitleBar.tsx
frontend/src/components/hub/ActivityBar.tsx
frontend/src/components/hub/SidebarPanel.tsx
frontend/src/components/hub/FileMenu.tsx
frontend/src/components/hub/HelpMenu.tsx                 (UI-021)
frontend/src/components/hub/AboutDialog.tsx              (UI-021)
frontend/src/components/hub/TabBar.tsx
frontend/src/components/hub/StoryViewer.tsx
frontend/src/components/hub/NewStoryModal.tsx
frontend/src/components/hub/ProjectPicker.tsx
frontend/src/components/hub/CodeBlock.tsx
frontend/src/components/hub/TemplatedEditor.tsx
frontend/src/components/hub/CreateNextStageModal.tsx
frontend/src/components/hub/MarkdownComponents.tsx
frontend/src/components/workflow/WorkflowCard.tsx
frontend/src/components/workflow/WorkflowColumn.tsx
frontend/src/components/workflow/WorkflowPipeline.tsx
frontend/src/lib/statusBadge.ts
```

### Schéma de flux

```
docs/palette.md
  ├─ Section "Surfaces / Lignes / Texte / Accent / Sémantiques"
  └─ Section "Correspondance shadcn → ykp" (NOUVELLE)
       ├─ bg-background     → bg-ykp-bg-page
       ├─ text-foreground   → text-ykp-text-primary
       ├─ bg-card           → bg-ykp-bg-elevated
       ├─ bg-muted          → bg-ykp-bg-subtle
       ├─ text-muted-foreground → text-ykp-text-muted
       ├─ border-border     → border-ykp-line
       ├─ bg-destructive    → bg-ykp-danger
       ├─ ...
       └─ ring-ring         → ring-ykp-ring

         ↓ utilisée comme spec par sed

Composants chrome (~20 fichiers)
  ├─ avant : bg-background hover:bg-accent/40 border-border
  └─ après : bg-ykp-bg-page hover:bg-ykp-line/40 border-ykp-line

         ↓ validation

  Snapshot visuel pré/post identique (AC2)
  Suite vitest 183/183 verte (AC3)
```

---

## O — Operations

> 4 Operations séquentielles. La table de correspondance d'O1
> est la spec utilisée par O2 (script de migration).

### O1 — Production de la table de correspondance shadcn → ykp

- **Module** : Documentation
- **Fichier** : `docs/palette.md` (modify — étend le doc livré
  par UI-018a)
- **Signature** : ajouter en fin de fichier une nouvelle
  section :
  ```markdown
  ## Correspondance shadcn → ykp

  Table utilisée par UI-018b pour la migration des classes
  Tailwind. Chaque ligne couvre la classe shadcn de base + ses
  variantes opacity / hover / focus / active.

  | Classe shadcn | Classe ykp équivalente | Variante Tailwind acceptée |
  |---|---|---|
  | `bg-background`         | `bg-ykp-bg-page`         | tous préfixes pseudo + `/<opacity>` |
  | `text-foreground`       | `text-ykp-text-primary`  | tous préfixes pseudo |
  | `bg-card`               | `bg-ykp-bg-elevated`     | tous préfixes pseudo + `/<opacity>` |
  | `text-card-foreground`  | `text-ykp-text-primary`  | tous préfixes pseudo |
  | `bg-popover`            | `bg-ykp-bg-elevated`     | tous préfixes pseudo |
  | `text-popover-foreground`| `text-ykp-text-primary` | tous préfixes pseudo |
  | `bg-primary`            | `bg-ykp-primary`         | tous préfixes pseudo + `/<opacity>` |
  | `text-primary-foreground`| `text-ykp-primary-fg`   | tous préfixes pseudo |
  | `bg-secondary`          | `bg-ykp-bg-subtle`       | tous préfixes pseudo |
  | `text-secondary-foreground`| `text-ykp-text-primary`| tous préfixes pseudo |
  | `bg-muted`              | `bg-ykp-bg-subtle`       | tous préfixes pseudo + `/<opacity>` |
  | `text-muted-foreground` | `text-ykp-text-muted`    | tous préfixes pseudo |
  | `bg-accent`             | `bg-ykp-line`            | tous préfixes pseudo + `/<opacity>` |
  | `text-accent-foreground`| `text-ykp-text-primary`  | tous préfixes pseudo |
  | `bg-destructive`        | `bg-ykp-danger`          | tous préfixes pseudo + `/<opacity>` |
  | `text-destructive`      | `text-ykp-danger`        | tous préfixes pseudo |
  | `text-destructive-foreground` | `text-ykp-danger-fg` | tous préfixes pseudo |
  | `border-border`         | `border-ykp-line`        | tous préfixes pseudo |
  | `border-input`          | `border-ykp-line`        | tous préfixes pseudo |
  | `ring-ring`             | `ring-ykp-ring`          | tous préfixes pseudo |
  | `ring-offset-background`| `ring-offset-ykp-bg-page`| tous préfixes pseudo |
  ```
- **Comportement** : document statique. Pas de génération.
  Mappings figés en revue humaine avant la migration mécanique.
- **Tests** :
  - Revue humaine en PR (relecture visuelle du tableau).
  - Lint markdown si `markdownlint` est disponible.

### O2 — Script de migration `sed`

- **Module** : Tooling jeté
- **Fichier** : `scripts/dev/ui-018b-migrate-shadcn.sh`
  (nouveau — supprimable post-merge)
- **Signature** :
  ```bash
  #!/usr/bin/env bash
  # UI-018b — script de migration mécanique des classes shadcn
  # vers la palette canonique ykp. Utilisé une seule fois pour
  # produire la PR. À supprimer après merge.
  #
  # Stratégie : pour chaque ligne du mapping (cf. O1), un sed
  # boundary-aware qui couvre la classe + ses variantes
  # (opacity, pseudo-classes). Le script est idempotent (rerun
  # safe).

  set -euo pipefail

  shopt -s globstar nullglob

  TARGET_DIR="frontend/src/components"
  EXCLUDE_GLOB="frontend/src/components/ui/*.tsx"

  # Format : "shadcn ykp"
  MAPPING=(
    "bg-background           bg-ykp-bg-page"
    "text-foreground         text-ykp-text-primary"
    "bg-card                 bg-ykp-bg-elevated"
    "text-card-foreground    text-ykp-text-primary"
    "bg-popover              bg-ykp-bg-elevated"
    "text-popover-foreground text-ykp-text-primary"
    "bg-primary              bg-ykp-primary"
    "text-primary-foreground text-ykp-primary-fg"
    "bg-secondary            bg-ykp-bg-subtle"
    "text-secondary-foreground text-ykp-text-primary"
    "bg-muted                bg-ykp-bg-subtle"
    "text-muted-foreground   text-ykp-text-muted"
    "bg-accent               bg-ykp-line"
    "text-accent-foreground  text-ykp-text-primary"
    "bg-destructive          bg-ykp-danger"
    "text-destructive-foreground text-ykp-danger-fg"
    "text-destructive        text-ykp-danger"
    "border-border           border-ykp-line"
    "border-input            border-ykp-line"
    "ring-ring               ring-ykp-ring"
    "ring-offset-background  ring-offset-ykp-bg-page"
  )

  # Trouve les fichiers à migrer (hors components/ui/ et hors
  # statusBadge.ts qui peut contenir des constantes string).
  while IFS= read -r file; do
    for line in "${MAPPING[@]}"; do
      from=$(echo "$line" | awk '{print $1}')
      to=$(echo "$line" | awk '{print $2}')
      # boundary-aware : la classe peut être précédée d'espace,
      # début de chaîne, " ou ', et suivie d'espace, "/", ":",
      # fin de chaîne, " ou '.
      sed -i -E "s/(\b)${from}(\b)/\1${to}\2/g" "$file"
    done
  done < <(find "$TARGET_DIR" -type f \( -name '*.tsx' -o -name '*.ts' \) \
              -not -path 'frontend/src/components/ui/*')

  # Idem pour frontend/src/lib/statusBadge.ts si présent
  if [ -f "frontend/src/lib/statusBadge.ts" ]; then
    for line in "${MAPPING[@]}"; do
      from=$(echo "$line" | awk '{print $1}')
      to=$(echo "$line" | awk '{print $2}')
      sed -i -E "s/(\b)${from}(\b)/\1${to}\2/g" "frontend/src/lib/statusBadge.ts"
    done
  fi

  echo "✓ Migration done. Verify with:"
  echo "  grep -RnE 'bg-(background|card|popover|primary|secondary|muted|accent|destructive)' frontend/src/components/ --exclude-dir=ui"
  ```
- **Comportement** :
  1. Itère sur chaque ligne du mapping.
  2. Applique un `sed` boundary-aware (`\b`) pour ne pas
     matcher au milieu d'un nom (`bg-background-alt` ne doit
     pas devenir `bg-ykp-bg-page-alt`).
  3. Préserve les variantes Tailwind : `hover:bg-muted` →
     `hover:bg-ykp-bg-subtle` car le `\b` se place avant
     `bg-muted` quel que soit le préfixe.
  4. Préserve les opacities : `bg-accent/40` →
     `bg-ykp-line/40` (le `/40` n'est pas dans le pattern, il
     reste collé).
  5. Idempotent : rerun ne change rien (les classes ykp ne
     matchent plus le pattern shadcn).
- **Tests** :
  - Test du script sur un fichier sandbox avec quelques
    occurrences variantes (opacity, hover, focus, active) :
    chaque cas migre correctement.
  - Test idempotence : rerun ne produit aucun diff.

### O3 — Exécution de la migration sur la chrome

- **Module** : Composants chrome
- **Fichier** : multi-fichiers (~20 dans
  `frontend/src/components/`)
- **Signature** : aucune signature de fonction modifiée. La
  migration est purement textuelle. Exemple de diff sur
  `HubList.tsx` :
  ```diff
  -<header className="bg-background border-b border-border">
  +<header className="bg-ykp-bg-page border-b border-ykp-line">

  -<span className="text-muted-foreground text-xs">
  +<span className="text-ykp-text-muted text-xs">

  -hover:bg-accent/40
  +hover:bg-ykp-line/40
  ```
- **Comportement** :
  1. Lancer le script O2 :
     `bash scripts/dev/ui-018b-migrate-shadcn.sh`.
  2. Vérifier le diff `git diff` ; aucun changement de logique,
     uniquement des classes Tailwind.
  3. Lancer `yarn tsc --noEmit` côté frontend → doit rester
     vert.
  4. Lancer `yarn vitest run` → 183/183 doit rester vert
     (aucun test sur les classes — vérifié par grep dans
     l'analyse B7).
  5. Build local + capture visuelle post-migration → comparer
     avec snapshot pré-livraison (AC2).
- **Tests** :
  - **AC1** : `grep -RnE
    'bg-background|text-foreground|bg-card|bg-popover|bg-primary
    |bg-secondary|bg-muted|bg-accent|bg-destructive|text-destructive
    |border-border|border-input|ring-ring|text-muted-foreground'
    frontend/src/components/ --exclude-dir=ui` retourne **zéro
    résultat**.
  - **AC3** : `yarn vitest run` reste 183/183 vert.

### O4 — Audit des composants tiers + documentation

- **Module** : Documentation
- **Fichier** : `docs/palette.md` (modify — section finale)
- **Signature** : ajouter une nouvelle section au document :
  ```markdown
  ## Composants tiers — audit post-UI-018b

  | Tiers | Imports | Source des couleurs | Verdict |
  |---|---|---|---|
  | `lucide-react`        | 20+ icones | hérite de `text-*` du parent | OK — auto-rewire |
  | `@radix-ui` (via shadcn) | Dialog / DropdownMenu / Sheet / Tooltip primitives | `var(--*)` shadcn | OK — auto-rewire |
  | `react-hook-form`     | GenericAcEditor, SpddAcEditor | aucune couleur | OK — neutre |
  | `react-hot-toast` (équivalent) | Toaster custom | classes `bg-*`, `text-*` (déjà migrées en O3) | OK — couvert par la migration |
  | `@react-pdf/renderer` | PDF export | `pdfTokens.ts` indépendant (light mode) | OK — hors périmètre app desktop |
  | Scrollbar OS          | n/a | rendu OS natif | toléré — documenté |

  Aucun composant tiers ne nécessite d'override CSS. Si un cas
  apparaît en suivi (régression visuelle observée par un
  utilisateur), ouvrir une story UI-018c dédiée.
  ```
- **Comportement** : document statique, livré dans la même
  PR que la migration.
- **Tests** : revue humaine.

---

## N — Norms

> Adaptées : pas de logique, pas de runtime. Refacto purement
> textuel.

- **Logging** : N/A.
- **Sécurité** : N/A (aucune surface — refacto cosmétique).
- **Tests** : pas de nouveau test ajouté. Validation = grep
  AC1 + suite vitest existante AC3 + capture visuelle AC2.
  Cf. [`testing-frontend.md`](../methodology/testing/testing-frontend.md)
  pour le contexte de la pyramide existante.
- **Nommage** : la story et le canvas utilisent uniquement le
  vocabulaire `--ykp-*` posé par UI-018a. Pas de néologisme,
  pas de préfixe nouveau.
- **Observabilité** : N/A.
- **i18n** : N/A.
- **Docs** : `docs/palette.md` enrichi en O1 + O4.

---

## S — Safeguards

> Limites non-négociables.

- **Sécurité**
  - **Ne jamais** modifier la logique d'un composant pendant la
    migration. Si on trouve un bug en passant, le réparer dans
    une PR séparée.

- **Compatibilité**
  - **Ne pas** modifier les fichiers
    `frontend/src/components/ui/*.tsx` (8 primitives shadcn).
  - **Ne pas** retirer le rewire CSS posé par UI-018a — cette
    story ne touche que les classes Tailwind côté composants.
  - **Ne pas** introduire de variantes Tailwind nouvelles
    (par exemple `bg-ykp-primary-darker`) qui n'existent pas
    dans la config posée par UI-018a — toute nouvelle nuance
    passe d'abord par un update de la palette
    (`/yukki-prompt-update` UI-018a).

- **Performance**
  - **Pas d'overhead** : refacto purement textuel, aucune
    différence de bundle ou de runtime.

- **Périmètre**
  - **Ne pas** migrer les classes `bg-yk-*` du SpddEditor
    (préfixe `yk` sans `p`). Leur dépréciation est un suivi
    post-UI-018a (note dans son analyse) et hors scope ici.
  - **Ne pas** introduire de nouvelle classe Tailwind dans la
    config — toute extension nécessaire passe par une story
    dédiée ou un update UI-018a.
  - **Ne pas** ouvrir cette PR avant que UI-018a soit mergée
    dans `main`. Le script de migration et les composants
    migrés référenceraient des classes qui n'existent pas
    encore.
  - **Ne pas** étaler la migration sur plusieurs PRs (cf.
    décision Q3 story = une seule PR mécanique).
  - **Ne pas** modifier la doc `pdfTokens.ts` (UI-015,
    indépendant de cette migration).
