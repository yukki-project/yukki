---
id: UI-015
slug: pdf-export-spdd-artifacts
story: .yukki/stories/UI-015-pdf-export-spdd-artifacts.md
status: implemented
created: 2026-05-08
updated: 2026-05-08
---

# Analyse — Export PDF des artefacts SPDD

> Contexte stratégique pour la story `UI-015-pdf-export-spdd-artifacts`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase
> (HubList, ActivityBar, FileMenu, WysiwygProseEditor, SpddDocument,
> bindings Wails uiapp).

## Mots-clés métier extraits

`pdf`, `export`, `HubList`, `Kanban` (roadmap), `chaîne story → analysis →
canvas`, `multi-sélection`, `save dialog` (IPC Wails), `read-only render`
(`WysiwygProseEditor`, `mdComponents`), `status` (`reviewed`/`implemented`/
`synced`), `front-matter cross-references`.

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md)
> (Entity / Value Object / Invariant / Integration / Domain Event).

### Existants (déjà dans le code)

- **Artefact SPDD** (Entity) — `internal/artifacts/lister.go` (`Meta` :
  `ID`, `Slug`, `Title`, `Status`, `Created`, `Updated`, `Priority`,
  `Path`). Listé par `ListArtifacts(kind)`. Pas de champ de référence
  croisée (`story:`/`analysis:`) typé pour l'instant.
- **Front-matter cross-references** (Value Object implicite) — convention
  documentée dans `CLAUDE.md` : un canvas porte `story:` et `analysis:`
  pointant vers les fichiers parents. Présents dans le YAML mais non
  parsés par `Meta`.
- **Render read-only** (Integration point) —
  `frontend/src/components/spdd/WysiwygProseEditor.tsx` (livré par UI-014i)
  + `frontend/src/lib/markdownComponents.tsx`. En mode `readOnly=true`,
  `react-markdown + remark-gfm + mdComponents` produit le rendu visuel
  cible.
- **SpddDocument** (Entity composite) —
  `frontend/src/components/spdd/SpddDocument.tsx` orchestre les sections
  d'un artefact (FM + AC + sections prose) en mode read-only.
  Réutilisable, modulo le retrait du scroll tracking.
- **HubList + selectedPath** (Entity de session) —
  `frontend/src/components/hub/HubList.tsx` + `stores/artifacts.ts`. Une
  seule sélection active à la fois (`selectedPath`).

### Nouveaux (à introduire)

- **Selection set** (Value Object) — ensemble ordonné de chemins
  d'artefacts sélectionnés pour export. Diffère de `selectedPath`
  (sélection d'affichage) : c'est un état d'export, persisté le temps
  d'une session.
- **Artifact chain** (Value Object) — séquence ordonnée
  `[story, analysis, canvas]` reconstituée à partir d'un canvas en phase
  `generate`. Construite en parsant le front-matter (`story:`,
  `analysis:`). Un maillon manquant = entrée nulle marquée.
- **Export job** (Aggregate) — décrit un export : `selection`,
  `chainExpansion` (bool), `outputPath`, `combineMode` (single PDF vs N
  PDFs). C'est le contrat passé entre l'UI déclencheuse et le pipeline
  PDF.
- **PDF document** (Value Object externe) — résultat binaire de
  l'export. Un seul fichier en mode combiné, plusieurs en mode séparé.
- **Domain event `ExportCompleted` / `ExportFailed`** — feedback UI
  (toast succès / erreur), pas de persistance.

**Invariants** :
- Un export ne crashe **jamais** sur référence cassée — un maillon
  manquant rend un placeholder visuel à sa place (cf. AC5 story).
- L'ordre dans le PDF combiné suit l'ordre d'affichage de la HubList,
  pas l'ordre d'ajout à la sélection (prédictibilité utilisateur).
- L'expansion en chaîne est déterministe pour un canvas en
  `reviewed`/`implemented`/`synced` ; ouverte à arbitrage pour `draft`
  (cf. Open Question story #4).

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *l'absence d'export portable des artefacts SPDD vers
des stakeholders hors-yukki*, **on choisit** *un pipeline 100 % frontend
basé sur `@react-pdf/renderer` qui consomme le markdown source et le
rend en composants PDF natifs dédiés (texte sélectionnable, polices
embarquées, pagination contrôlée)*, **plutôt que** *(B) `jsPDF +
html2canvas` qui rasterise le DOM et perd la sélectabilité du texte*,
*(C) un pipeline Go lançant un Chromium headless qui ajoute une
dépendance externe lourde dans un binaire desktop*, ou *(D) un
`window.print()` natif qui ouvre la dialog d'impression Windows — pas
adapté à une application desktop intégrée*, **pour atteindre** *une
fidélité visuelle proche du SpddEditor read-only ET un texte
sélectionnable / indexable dans les outils PDF aval*, **en acceptant**
*un coût de duplication contrôlée des styles (les tokens design `yk-*`
doivent être resourcés en couleurs brutes côté composants PDF) et la
réécriture des nœuds markdown courants (heading / list / code / table)
en composants `<View>` / `<Text>` react-pdf*.

### Alternatives écartées

- **B — `jsPDF + html2canvas`** : plus rapide à shipper (réutilise
  directement le DOM Tiptap/react-markdown), mais texte non
  sélectionnable, taille de fichier 5-10× supérieure, qualité dégradée
  à la mise à l'échelle.
- **C — Pipeline Go headless Chromium** : qualité maximale mais
  dépendance Chromium dans un binaire qui se veut autonome, friction AV
  Defender (déjà problématique cf. CORE-001).
- **D — `window.print()`** : pas de contrôle sur le nom de fichier ni le
  format ; ouvre la dialog d'impression OS, mauvaise UX dans Wails.
- **E — Markdown → HTML → PDF côté Go** : casse l'AC visuelle « ressembler
  au SpddEditor read-only » car ne réutilise pas `mdComponents`.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/spdd/` | fort | création d'un module `pdf/` (composants `PdfArtifact`, `PdfSection`, mapping markdown → react-pdf) |
| `frontend/src/components/hub/HubList.tsx` | moyen | ajout des cases à cocher + barre d'action « Exporter sélection » |
| `frontend/src/components/hub/FileMenu.tsx` ou nouveau header HubList | faible | bouton « Exporter PDF » par item (icône à droite de chaque ligne) |
| `frontend/src/stores/` | moyen | nouveau store `pdfExport.ts` (selection set, mode combiné/séparé, état du job) |
| `frontend/src/lib/markdownComponents.tsx` | faible | extraction des tokens design en constantes partagées (à consommer par les composants PDF) |
| `internal/uiapp/` (Go) | moyen | binding `SaveFilePdf(suggestedName) (string, error)` exposant `runtime.SaveFileDialog` ; binding `ResolveCanvasChain(canvasPath) ([]string, error)` |
| `frontend/wailsjs/` | faible | mise à jour manuelle des stubs TypeScript (workaround AV `-skipbindings`) |
| `frontend/package.json` | faible | ajout `@react-pdf/renderer` |
| `docs/` | aucun | export PDF n'est pas un comportement public à documenter en `.adoc` |
| Mode `roadmap` de la HubList | aucun | déjà couvert : `roadmap` est un mode `HubList` standard ([shell.ts:12](../../frontend/src/stores/shell.ts#L12), [ActivityBar.tsx:35](../../frontend/src/components/hub/ActivityBar.tsx#L35)) qui hérite automatiquement du bouton « Exporter PDF » sans code spécifique. La vue kanban à colonnes Now/Next/Later annoncée par META-005 n'est pas implémentée ; quand elle le sera (story future), le bouton survivra car attaché à la sélection HubList générique. |

## Dépendances et intégrations

- **`@react-pdf/renderer`** (npm) — moteur de rendu PDF côté React,
  composants `<Document>`, `<Page>`, `<View>`, `<Text>`, `<Link>`. ~150 KB
  bundle gzipped, polices embarquées (TTF). Pas de dépendance native.
- **Wails `runtime.SaveFileDialog(ctx, options)`** — binding natif Wails
  v2 pour la dialog système. Présent côté Go, à exposer via un binding
  `uiapp` puis stub TS manuel (workaround `-skipbindings`).
- **`gopkg.in/yaml.v3`** (déjà utilisé) — parsing front-matter
  `story:`/`analysis:` côté Go pour `ResolveCanvasChain`.
- **Tailwind tokens `yk-*`** (CSS variables, `frontend/src/styles/`) —
  les couleurs doivent être résolues en hex pour les composants PDF
  (`@react-pdf/renderer` ne lit pas les CSS variables du DOM).
- **Aucune CRD K8s**, pas d'API externe, pas de réseau.

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).
> STRIDE non détaillé : surface sécurité quasi-nulle (pas d'auth, pas
> de réseau, pas de données utilisateur tierces).

- **Performance / Reliability — génération longue** : un export
  multi-artefact (10+ artefacts × 5 sections × markdown long) peut
  prendre plusieurs secondes. *Impact* : UI bloquée si synchrone.
  *Probabilité* : moyenne (cas typique : épopée + 5 stories filles).
  *Mitigation* : génération asynchrone avec spinner + bouton
  « Annuler », limite douce (avertir au-delà de 20 artefacts).

- **Compatibilité visuelle — divergence styles éditeur ↔ PDF** : les
  tokens `yk-*` sont des CSS variables non disponibles dans react-pdf.
  *Impact* : couleurs / polices différentes entre vue read-only et PDF.
  *Probabilité* : haute si pas de discipline. *Mitigation* : extraire
  les tokens dans un module TS partagé (`lib/designTokens.ts`)
  consommé par mdComponents ET les composants PDF.

- **Data — référence cassée dans la chaîne** : un canvas peut référencer
  une analyse renommée / supprimée. *Impact* : crash si non géré.
  *Probabilité* : faible mais réelle (renommages comme UI-015→UI-014g).
  *Mitigation* : `ResolveCanvasChain` retourne des entrées partielles
  avec marqueurs ; UI rend un encart « artefact introuvable » (AC5).

- **Intégration — Wails save dialog non exposée** : le stub
  `frontend/wailsjs/runtime/runtime.d.ts` n'expose pas
  `SaveFileDialog` (workaround AV `-skipbindings`). *Impact* : le
  frontend ne peut pas appeler la dialog. *Probabilité* : certaine.
  *Mitigation* : exposer un binding `uiapp.SaveFilePdf(suggestedName)`
  qui wrappe `runtime.SaveFileDialog` côté Go ; stub TS manuel ajouté.

- **Opérationnel — écriture binaire bloquée** : sur Windows AV, écrire
  un PDF dans un dossier monitoré peut être différé / quarantiné.
  *Impact* : feedback utilisateur trompeur (succès affiché alors que le
  fichier n'est pas accessible). *Probabilité* : faible (le user choisit
  le path). *Mitigation* : vérifier l'existence du fichier après écriture
  + propager l'erreur au toast.

## Cas limites identifiés

> Détectés via BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Boundary — sélection vide** : 0 artefact coché → bouton désactivé
  (AC4). 1 artefact → export simple (AC1). 50 artefacts → avertissement
  performance.
- **Boundary — artefact très long** : story de 10 000 lignes markdown,
  ou canvas avec tableau 100×30. Pagination correcte ? Couper au milieu
  d'une cellule de tableau ?
- **Equivalence — statut du canvas** : `draft` (chaîne ou pas ?) vs
  `reviewed`/`implemented`/`synced` (chaîne déclenchée). Frontière à
  trancher (Open Question story #4).
- **Erreur — markdown malformé** : un artefact avec front-matter
  cassé ou syntaxe markdown invalide → react-markdown ignore les nœuds
  qu'il ne parse pas. Le PDF reproduit le comportement (pas de crash,
  mais lacunes silencieuses).
- **State — modification concurrente** : l'utilisateur édite un artefact
  pendant que l'export est en cours. *Décision implicite* : l'export
  capture la version sur disque au moment du clic, pas la version draft
  en mémoire — cohérent avec « on partage ce qui est versionné ».

## Decisions à prendre avant le canvas

> **Toutes tranchées en revue 2026-05-08.** Conservées en checklist
> pour traçabilité.

- [x] **Lib PDF** → `@react-pdf/renderer` (texte sélectionnable, polices
      embarquées, pagination contrôlée). Coût accepté : duplication
      contrôlée des styles + réécriture des nœuds markdown courants en
      composants `<View>` / `<Text>`.
- [x] **Stratégie multi-export** → 1 PDF combiné toujours (cohérent
      avec AC2 chaîne canvas + AC3 multi-sélection). Pas d'option « N
      PDFs séparés » dans le MVP. Évolution future possible si le
      besoin émerge.
- [x] **Périmètre Kanban dans UI-015** → la « vue Kanban » mentionnée
      dans la story = le mode `roadmap` existant de la HubList
      (META-005 partiellement livré, kanban à colonnes Now/Next/Later
      non implémenté mais le mode liste est en place). Le bouton
      « Exporter PDF » couvre automatiquement le mode `roadmap` sans
      code spécifique — un seul code path partagé par tous les modes
      HubList (inbox/stories/epics/analysis/canvas/tests/roadmap).
- [x] **Page de garde / pied de page** → pied de page simple sur
      chaque page, cartouche `<id> — <title> · <status> · <updated>`.
      Pas de page de couverture par artefact dans le MVP.
