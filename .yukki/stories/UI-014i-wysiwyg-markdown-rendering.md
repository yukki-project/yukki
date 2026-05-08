---
id: UI-014i
slug: wysiwyg-markdown-rendering
title: Rendu markdown WYSIWYG des sections prose (read-only + édition)
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut
modules:
  - frontend
---

# Rendu markdown WYSIWYG des sections prose

## Background

Aujourd'hui, les sections prose des artefacts SPDD (story `Background`/`Business
Value`/etc., inbox `Idée`, epic `Vision`, analysis `Concepts`, canvas
R-E-A-S-O-N-S) sont éditées et affichées via des textarea de markdown brut. En
lecture seule (mode par défaut depuis UI-014h), l'utilisateur voit `**gras**`,
`## titre`, `[lien](url)` au lieu du rendu visuel. En édition, pas de toolbar
ni de raccourcis. Cela contraste avec la lisibilité que SPDD vise — les
artefacts doivent être lus et édités comme des **documents**, pas comme du
code source.

## Business Value

Pour le PO et l'équipe lisant les artefacts SPDD pendant les revues humaines
(étapes 2/4/6 du workflow), le rendu markdown formaté améliore la
digestibilité (titres hiérarchisés, listes claires, liens cliquables, code
mis en valeur) — moins de friction sur ces points de passage obligés. Pour
le rédacteur en mode édition, le WYSIWYG réduit l'effort cognitif : pas
besoin de mémoriser la syntaxe markdown pour mettre du gras ou un titre.

## Scope In

- **Mode lecture seule** : les sections de widget `textarea` (chemin
  générique) ET les sections prose legacy story (`bg`, `bv`, `si`, `so`,
  `oq`, `no`) sont rendues en HTML formaté — gras, italique, titres
  H2/H3, listes ordonnées et non-ordonnées, liens cliquables, code inline,
  blocs de code multi-lignes (surlignés via shiki, déjà dans le bundle).
- **Mode édition** : un éditeur WYSIWYG remplace le textarea brut. L'utilisateur
  voit le rendu et tape directement dedans. Toolbar minimale (gras, italique,
  titre, liste, code) + raccourcis markdown style (taper `**` `_` `#` `-`
  produit le formatage attendu).
- **Round-trip markdown garanti** : ce qui est lu, édité, puis sauvegardé
  reste du markdown propre. Aucun wrapper HTML parasite, aucune
  réorganisation de l'AST. Un fichier ouvert et sauvé sans modification
  doit être bit-pour-bit identique (modulo normalisation EOL).
- **Toggle WYSIWYG / Markdown source** disponible en édition pour
  basculer vers le textarea brut (réutilise `GenericProseTextarea`
  existant) — utile pour les cas où le WYSIWYG ne couvre pas (markdown
  étendu, debug).

## Scope Out

- Section AC (cartes Given/When/Then existantes — déjà spécialisées et
  hors du flux prose markdown).
- Front-matter form (champs typés text/select/date/tags existants — pas
  de prose).
- Titre H1 `# <titre>` du fichier (géré au niveau du serializer, pas
  dans une section).
- Markdown étendu : tableaux, images, notes de bas de page, math LaTeX —
  hors scope, peuvent rester en markdown brut accessible via le toggle.
- Collaboration temps réel, undo/redo cross-session, drag-and-drop de
  blocks.

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable en isolation.
> Couverture minimale : ≥ 1 happy + ≥ 1 erreur user + ≥ 1 cas limite (cf.
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md)).

### AC1 — Rendu visuel en lecture seule

- **Given** un artefact SPDD ouvert en mode lecture seule contenant une
  section prose avec du markdown (`**gras**`, `## titre`, `- item`,
  `` `code` ``, `[lien](url)`)
- **When** l'utilisateur visualise la section
- **Then** le contenu apparaît rendu (texte gras, titre stylisé, puces,
  code monospace, lien cliquable) — aucun caractère markdown brut n'est
  visible

### AC2 — Toolbar produit du markdown propre

- **Given** l'utilisateur est en mode édition sur une section prose,
  curseur sur du texte sélectionné
- **When** il clique sur le bouton "gras" de la toolbar (ou tape Ctrl+B)
- **Then** le rendu affiche le texte en gras ET le contenu source
  sérialisé est `**texte**` (markdown valide, sans wrappers HTML)

### AC3 — Round-trip strict sans modification

- **Given** un fichier markdown existant avec syntaxes mixtes (titres,
  listes, code inline, blocs ``` ```, liens)
- **When** l'utilisateur ouvre le fichier en mode édition WYSIWYG puis
  sauvegarde sans modifier le contenu
- **Then** le fichier écrit est strictement identique au fichier lu
  (modulo normalisation des fins de ligne)

### AC4 — Fallback markdown source via toggle

- **Given** l'utilisateur est en mode édition WYSIWYG et préfère éditer
  le markdown brut
- **When** il bascule sur le toggle "Markdown" du header
- **Then** la section affiche un textarea de markdown brut
  (`GenericProseTextarea`), et un retour ultérieur vers "WYSIWYG"
  rend correctement le contenu modifié

### AC5 — Markdown malformé : pas de crash

- **Given** une section contient du markdown ambigu ou malformé (ex.
  `**gras non fermé`, `[lien sans url]`)
- **When** l'utilisateur ouvre la section en mode WYSIWYG
- **Then** le rendu fait son meilleur effort (les caractères orphelins
  restent affichés tels quels), aucun crash ni perte de contenu, et le
  toggle "Markdown" reste accessible pour corriger en source

## Open Questions

- [ ] **Lib WYSIWYG markdown** : Tiptap (ProseMirror) ou Lexical ? Critères :
  taille du bundle (impact frontend), qualité du round-trip markdown,
  intégration React idiomatique, support shiki pour les blocs code, undo/redo
  natif. **À trancher dans `/yukki-analysis` via spike comparatif court.**
- [ ] **Granularité du toggle WYSIWYG/Markdown** : par section (toggle inline
  par bloc) ou global header (comme aujourd'hui pour story) ? Le global
  header simplifie la mental model ; par-section donne plus de souplesse.
- [ ] **Shortcuts markdown style** à supporter : minimum vital (`**bold**`,
  `_italic_`, `# H2`, `- list`, `` ` `` inline code) — étendre à `> quote`,
  ` ``` ` blocs code, `1.` listes ordonnées ?
- [ ] **Theme shiki** pour les blocs code (cohérence avec le thème yk-* du
  reste de l'UI).

## Notes

### Modules concernés

- `frontend/src/components/spdd/` — nouveau composant `WysiwygProseEditor`
  (rendu + édition) ; intégration dans `GenericSectionBlock` (chemin
  générique) et dans `SectionBlock` legacy (`ProseTextarea` story).
- `GenericProseTextarea` existant reste comme fallback markdown source.
- Toolbar et raccourcis : composant local au WysiwygProseEditor.

### Évaluation INVEST

| Critère | Verdict |
|---|---|
| **I**ndependent | OK — UI-014h livré ; pas de dépendance bloquante. |
| **N**egotiable | OK — choix de lib, granularité du toggle, scope shortcuts négociables. |
| **V**aluable | OK — gain lisibilité (lecteur revue) + gain ergonomie (rédacteur). |
| **E**stimable | OK — scope clos (read render + edit WYSIWYG + round-trip + fallback). |
| **S**mall | **Limite haute** — choisir + intégrer une lib WYSIWYG markdown est non-trivial. Évaluation SPIDR ci-dessous. |
| **T**estable | OK — 5 AC observables, round-trip vérifiable par diff binaire. |

### Décision SPIDR (limite haute Small — cf. [`spidr.md`](../methodology/spidr.md))

| Axe | Découpage envisageable | Verdict |
|---|---|---|
| **P**aths (happy → erreur) | Livrer rendu read-only d'abord (sans édition) → puis édition WYSIWYG | **Possible** — `UI-014i-a` (render only) + `UI-014i-b` (édition) |
| **I**nterfaces | N/A — un seul flow utilisateur | Skip |
| **D**ata | N/A — markdown stable, pas de migration | Skip |
| **R**ules | Toolbar minimale (gras/italique) → étendue (titres/listes/code) | **Possible** — incrémenter |
| **S**pike | Comparaison Tiptap vs Lexical sur round-trip | **Recommandé** — fait dans `/yukki-analysis` |

**Décision : ne pas scinder à ce stade.** Justification :
1. Rendu read-only et édition WYSIWYG partagent la même lib (Tiptap ou
   Lexical fournit les deux modes nativement) — intégrer une seule fois
   limite la duplication et la dette.
2. Le fallback toggle Markdown source réutilise le `GenericProseTextarea`
   existant — pas de coût supplémentaire.
3. Le spike de choix de lib est exécuté dans `/yukki-analysis` (cf. Open
   Questions). Si l'analyse révèle une complexité imprévue, on scinde
   alors via l'axe **Paths** (`UI-014i-a` rendu read-only, `UI-014i-b`
   édition).

### Couverture cas limites

- Happy paths : AC1 (rendu read-only) + AC2 (toolbar) + AC4 (toggle).
- Erreur utilisateur : AC5 (markdown malformé sans crash).
- Cas limite : AC3 (round-trip bit-pour-bit, garde-fou contre les
  réorganisations d'AST par la lib).

### Références croisées

- Dépend de [UI-014h](.yukki/stories/UI-014h-universal-template-driven-editor.md)
  (chemin générique template-driven) — livré.
- Le toggle WYSIWYG/Markdown du header (sur story) existe déjà via
  `SegmentedViewMode` ([SpddHeader.tsx](frontend/src/components/spdd/SpddHeader.tsx)) ;
  cette story généralise au chemin générique et le sémantise.
