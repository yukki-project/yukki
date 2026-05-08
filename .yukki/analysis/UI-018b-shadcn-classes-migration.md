---
id: UI-018b
slug: shadcn-classes-migration
story: .yukki/stories/UI-018b-shadcn-classes-migration.md
status: draft
created: 2026-05-09
updated: 2026-05-09
---

# Analyse — Migration explicite des classes shadcn vers la palette canonique

> Contexte stratégique pour `UI-018b-shadcn-classes-migration`,
> dépend strictement de UI-018a (palette `--ykp-*` + classes
> Tailwind associées). Toutes les Open Questions de la story
> sont tranchées : liste des composants à migrer produite par
> grep en analyse, sémantiques `destructive` / `success` ⇒
> classes `bg-ykp-danger` / `bg-ykp-success` 1-pour-1, livraison
> en une seule PR mécanique, composants tiers laissés tels
> quels (audit ici, override hors-scope).

## Mots-clés métier extraits

`grep classes shadcn`, `bg-background` / `text-foreground` /
`bg-card` / `bg-muted` / `bg-accent` / `bg-destructive` /
`text-muted-foreground` / `border-border`, `139 occurrences`
sur `20 fichiers chrome`, `bg-ykp-*` (équivalents Tailwind),
`sed mécanique`, `table de correspondance` shadcn ↔ ykp,
`primitives shadcn intactes` (8 fichiers `components/ui/`),
`audit composants tiers` (Radix, lucide, react-hook-form).

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **Classes shadcn dans la chrome** (Value Object dispersé) —
  ~139 occurrences de classes Tailwind référençant les
  variables shadcn (`bg-background`, `text-foreground`,
  `bg-muted`, `text-muted-foreground`, `border-border`,
  `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`,
  `bg-accent`, `bg-destructive`, `text-destructive`,
  `border-input`, `ring-ring`) réparties sur **20 fichiers**
  hors `components/ui/`. Top occurrences :
  `text-muted-foreground` (44), `border-border` (17),
  `text-foreground` / `bg-muted` (15 chacune), `bg-background`
  (13), `bg-card` (9).
- **Classes Tailwind `--ykp-*`** (Value Object) — exposées par
  UI-018a dans `tailwind.config.js` (~15-20 classes :
  `bg-ykp-bg-page`, `text-ykp-text-primary`,
  `border-ykp-line`, `bg-ykp-danger-soft`, …).
- **`docs/palette.md`** (Reference) — créé par UI-018a, à
  enrichir par cette story avec la table de correspondance
  shadcn → ykp.
- **8 primitives shadcn** dans `frontend/src/components/ui/` :
  `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`,
  `sheet.tsx`, `toast.tsx`, `toaster.tsx`, `tooltip.tsx`. **NE
  PAS toucher** — leur source vient de shadcn.
- **18 fichiers de tests vitest** dans `frontend/src/**/
  *.test.{ts,tsx}` : aucune assertion sur les classes CSS
  (vérifié par grep). **Aucun test à adapter**.

### Nouveaux (à introduire)

- **Mapping shadcn → ykp** (Value Object documenté) — table
  inline dans `docs/palette.md` qui liste, pour chaque classe
  shadcn, son équivalent ykp. Sert de spec pour le sed et de
  référence pour les futurs composants.
- **Script de migration** (Service jetable) — un sed ou
  petit script Node qui applique le mapping
  automatiquement sur l'arborescence
  `frontend/src/components/` (hors `ui/`). Utilisé une fois
  pour générer la PR, supprimé après merge.
- **Audit des composants tiers** (Reference) — section
  ajoutée à `docs/palette.md` qui constate « les imports
  Radix, lucide-react, react-hook-form ne hardcodent pas de
  couleurs et bénéficient automatiquement du rewire UI-018a ».

### Invariants

- **I1 — Migration purement mécanique** : aucun changement
  visuel attendu (UI-018a a déjà aligné). Si le snapshot
  visuel diverge, c'est qu'on a oublié un cas dans le
  mapping.
- **I2 — Primitives intactes** : aucun fichier dans
  `frontend/src/components/ui/` n'est modifié.
- **I3 — Une seule PR** : pas de migration partielle, pas de
  période transitoire « moitié shadcn / moitié ykp » sur
  `main`.

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *l'indirection trompeuse créée par UI-018a
(les composants chrome utilisent encore `bg-background` mais
la couleur effective vient de la palette canonique
`--ykp-*`)*, **on choisit** *de remplacer mécaniquement, en
une seule PR, les ~139 occurrences de classes shadcn dans les
20 composants chrome par leurs équivalents `bg-ykp-*` /
`text-ykp-*` / `border-ykp-*` exposés par UI-018a, en
laissant intactes les 8 primitives shadcn dans
`components/ui/` et en validant via snapshot visuel +
suite vitest existante (aucun test ne casse, vérifié par
grep)*, **plutôt que** *(B) garder les classes shadcn
définitivement (laisse l'indirection en place, dette dans
la doc), (C) migrer composant par composant en plusieurs PRs
(coût de coordination élevé pour un refacto purement
mécanique, période transitoire incohérente), (D) introduire
des classes intermédiaires `bg-canonical-*` (encore une
couche, ne résout rien)*, **pour atteindre** *un code chrome
qui parle uniquement le vocabulaire de la palette canonique
yukki et qui rend trivialement auditable la couleur
appliquée par chaque composant*, **en acceptant** *un diff
PR volumineux (~139 hunks sur 20 fichiers) mais homogène
(chaque hunk fait le même type de remplacement) et
réversible (le mapping est documenté).*

### Alternatives écartées

- **B — Garder les classes shadcn** : indirection persistante,
  contredit l'objectif de la story.
- **C — Migration en plusieurs PRs** : coordination lourde
  pour un refacto mécanique, période transitoire incohérente
  sur `main`.
- **D — Classes intermédiaires** : couche en plus, ne résout
  pas le problème, accroît la confusion.

## Modules impactés

> Liste produite par grep (cf. scan B5/B6). 20 fichiers
> chrome distincts, 130-150 hunks estimés.

| Module / fichier | Impact | Nature |
|---|---|---|
| `frontend/src/App.tsx` | faible | modify : `bg-background` × 1 |
| `frontend/src/components/hub/HubList.tsx` | moyen | modify : ~10 occurrences (bg, text, border, hover) |
| `frontend/src/components/hub/TitleBar.tsx` | moyen | modify : ~8 occurrences |
| `frontend/src/components/hub/ActivityBar.tsx` | moyen | modify : ~10 occurrences |
| `frontend/src/components/hub/SidebarPanel.tsx` | moyen | modify : ~7 occurrences |
| `frontend/src/components/hub/FileMenu.tsx` | faible | modify : ~5 occurrences |
| `frontend/src/components/hub/TabBar.tsx` | faible | modify : ~6 occurrences |
| `frontend/src/components/hub/StoryViewer.tsx` | moyen | modify : ~10 occurrences |
| `frontend/src/components/hub/NewStoryModal.tsx` | moyen | modify : ~8 occurrences |
| `frontend/src/components/hub/ProjectPicker.tsx` | faible | modify : ~3 occurrences |
| `frontend/src/components/hub/CodeBlock.tsx` | faible | modify : ~5 occurrences |
| `frontend/src/components/hub/TemplatedEditor.tsx` | faible | modify : ~5 occurrences |
| `frontend/src/components/hub/CreateNextStageModal.tsx` | faible | modify : ~4 occurrences |
| `frontend/src/components/hub/MarkdownComponents.tsx` | moyen | modify : ~6 occurrences |
| `frontend/src/components/spdd/SpddAcEditor.tsx` etc. | faible | modify : potentielles occurrences `text-muted-foreground` à valider |
| `frontend/src/components/workflow/WorkflowCard.tsx` + Column + Pipeline | moyen | modify : ~10 occurrences |
| `frontend/src/lib/statusBadge.ts` (constantes) | faible | modify : map status → classe ykp |
| `frontend/src/components/ui/*.tsx` (8 fichiers) | aucun | **inchangés** |
| `docs/palette.md` | faible | modify : ajout table de correspondance shadcn → ykp |

## Dépendances et intégrations

- **Dépend strictement de UI-018a** : la palette `--ykp-*` et
  les classes Tailwind `bg-ykp-*` doivent exister avant que
  la migration puisse commencer.
- **Tailwind v3** : pas de nouvelle config nécessaire (UI-018a
  l'a posée).
- **Suite vitest** existante : 18 fichiers de tests, aucune
  assertion sur les classes CSS — la migration ne casse rien
  (vérifié par grep, cf. scan B7).
- **Composants tiers** (Radix, lucide-react, react-hook-form,
  react-hot-toast équivalent) : tous neutres en couleur ou
  consomment les variables CSS shadcn déjà rewirées par
  UI-018a (cf. scan B8). Aucun override nécessaire dans cette
  story.

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Compatibilité — variantes oubliées** : opacités (`/40`,
  `/50`, `/80`) et états (`hover:bg-accent`,
  `focus:ring-ring`) doivent être inclus dans le mapping
  sed. *Impact* : moyen (rendu cassé sur un composant).
  *Probabilité* : moyenne. *Mitigation* : mapping exhaustif
  dans `docs/palette.md` couvrant les variantes
  `<state>:<class>` + opacities, sed regex avec patterns.

- **Opérationnel — diff massif à reviewer** : ~139 hunks sur
  20 fichiers. *Impact* : revue lente. *Probabilité* :
  certaine. *Mitigation* : utiliser `git diff -U0` pour
  resserrer le diff lisible, joindre la table de
  correspondance dans la description PR pour qu'on vérifie
  par échantillon.

- **Data — divergence visuelle** : si le mapping est
  incorrect (par exemple `bg-card` mappé vers
  `bg-ykp-bg-page` au lieu de `bg-ykp-bg-elevated`), le
  rendu change. *Impact* : haut. *Probabilité* : faible.
  *Mitigation* : snapshot visuel pré (post-UI-018a) /
  post-migration sur 5-10 vues clés (HubList, modale,
  SpddEditor, Toast).

- **Intégration — composants tiers à couleurs hardcodées** :
  scan B8 conclut « aucun trouvé », mais une preview visuelle
  post-migration peut révéler un cas isolé. *Mitigation* :
  audit visuel + ouvrir UI-018c en suivi si besoin.

- **Sécurité — non concerné** : refacto purement textuel
  côté UI, pas de surface sécurité.

## Cas limites identifiés

> BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Classe shadcn dans une chaîne dynamique** : par exemple
  `cn('bg-background', isActive && 'bg-accent')` — le sed
  doit gérer les classes dans des chaînes string concatenées
  + dans des `cn()` utility-merge.
- **Variantes opacity** : `bg-accent/40` → `bg-ykp-accent/40`
  (l'opacité Tailwind reste valide sur les classes ykp).
- **Variantes hover/focus** : `hover:bg-muted` →
  `hover:bg-ykp-muted` (sed pattern doit accepter le préfixe
  pseudo-class).
- **Classes shadcn dans `statusBadge.ts`** ou autre fichier
  de constantes (`STATUS_BADGE` map) : le sed doit aussi les
  attraper, pas juste les `.tsx`.
- **Composants génériques sans classe explicite** (par
  exemple un composant qui hérite uniquement des classes du
  parent) : aucune action nécessaire — le rewire UI-018a fait
  le travail.

## Decisions à prendre avant le canvas

- [ ] **Outil de migration** : sed shell, codemod
      (`jscodeshift`), ou simple grep + remplacement manuel
      composant par composant (pour garder le contrôle) ? →
      recommandation : **sed avec mapping exhaustif** dans un
      script jeté après usage, validé par grep post-run pour
      vérifier zéro classe shadcn restante (AC1).
- [ ] **Snapshot visuel** : outil dédié (Playwright +
      diff-visual) ou capture manuelle PR-comment ? →
      recommandation : capture manuelle, l'outillage dédié
      est surdimensionné pour cette story.
- [ ] **Mapping `border-input` / `ring-ring`** : à inclure
      dans le mapping ou laisser tel quel (rare en chrome,
      surtout dans `components/ui/`) ? → recommandation :
      inclure si grep retourne ≥ 1 occurrence dans les 20
      fichiers chrome, sinon ignorer.
- [ ] **Ordre de la table de correspondance** dans
      `docs/palette.md` : par fréquence (top 10 d'abord) ou
      par ordre alphabétique ? → recommandation :
      alphabétique pour la doc canonique, top 10 commenté
      en intro pour le reviewer.
