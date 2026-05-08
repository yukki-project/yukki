---
id: UI-015
slug: pdf-export-spdd-artifacts
story: .yukki/stories/UI-015-pdf-export-spdd-artifacts.md
analysis: .yukki/analysis/UI-015-pdf-export-spdd-artifacts.md
status: synced
created: 2026-05-08
updated: 2026-05-09
---

> **Décisions tranchées en revue 2026-05-08** :
> - Q1 → A : `ResolveCanvasChain` reste côté Go (path-traversal guard
>   maintenu, source de vérité serveur)
> - Q2 → A : `exportSingle` sur un canvas en phase generate déclenche
>   l'expansion en chaîne (cohérent avec AC2)
> - Q3 → A : skip du H1 du markdown source (titre déjà en en-tête de
>   page, pas de doublon)
> - Q4 → A : Inter + JetBrains Mono embarqués via `Font.register`
>   (`.ttf` dans `frontend/public/fonts/`)
> - Q5 → A : sélection persistante au changement de mode HubList
>   (combiner stories + epics dans un même export)
> - Q6 → A : valeurs `ykTokens` alignées bit-pour-bit avec
>   [`spdd-tokens.css`](../../frontend/src/styles/spdd-tokens.css)

# Canvas REASONS — Export PDF des artefacts SPDD

> Spécification exécutable. Source de vérité pour `/yukki-generate` et
> `/yukki-sync`. Toute divergence code ↔ canvas se résout **dans ce
> fichier d'abord**.

---

## R — Requirements

### Problème

Les artefacts SPDD vivent en markdown versionné dans le repo, ce qui
bloque le partage hors-yukki avec un sponsor / auditeur / PM externe et
empêche d'archiver des snapshots de revue. Il faut un export PDF lisible,
versionnable, qui reproduit le rendu read-only du SpddEditor et qui, pour
un canvas en phase generate, agrège automatiquement la chaîne complète
story → analysis → canvas dans un seul document.

### Definition of Done

- [ ] AC1 — Bouton « Exporter PDF » dans la HubList ; un clic + un
      chemin choisi via la save dialog produit un PDF read-only de
      l'artefact (sans front-matter brut visible dans le corps).
- [ ] AC2 — Sur un canvas au statut `reviewed`, `implemented` ou
      `synced`, l'export pré-pend automatiquement la story et l'analyse
      référencées (front-matter `story:`/`analysis:`) dans cet ordre,
      chaque artefact débutant sur une nouvelle page.
- [ ] AC2-bis — Sur une analyse (tout statut), l'export pré-pend
      automatiquement la story référencée (front-matter `story:`),
      sans condition de phase. Symétrie avec AC2 : la chaîne SPDD se
      remonte aussi quand on exporte le maillon intermédiaire.
- [ ] AC3 — Multi-sélection via cases à cocher ; bouton « Exporter
      sélection » produit un seul PDF contenant les artefacts dans
      l'ordre d'affichage de la liste, séparés par un saut de page.
- [ ] AC4 — Sélection vide → bouton « Exporter sélection » désactivé,
      aucun export déclenchable.
- [ ] AC5 — Référence cassée dans la chaîne (analyse renommée /
      supprimée) → encart visuel « Artefact introuvable : `<path>` »
      à la place du contenu, l'export ne crashe pas.
- [ ] Texte du PDF est **sélectionnable** et copiable (pas une image
      rasterisée) — cf. décision #1.
- [ ] Pied de page sur chaque page : `<id> — <title> · <status> ·
      `updated`` — cf. décision #4.
- [ ] Le bouton fonctionne dans tous les modes HubList existants
      (inbox / stories / epics / analysis / prompts / tests / roadmap)
      sans code spécifique par mode — cf. décision #3.

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `Artefact SPDD` | Fichier markdown versionné dans `.yukki/<kind>/` | `Path`, `ID`, `Slug`, `Title`, `Status`, `Updated` | déjà existant — lecture seule pour l'export |
| `CanvasChain` | Chaîne ordonnée d'artefacts liés par référence front-matter | `StoryPath`, `AnalysisPath`, `CanvasPath` (chaînons manquants = chaîne vide) | construit ad-hoc au déclenchement de l'export |
| `SelectionSet` | Ensemble ordonné de chemins sélectionnés pour l'export | ordered set of `Path` | éphémère (état Zustand, perdu au refresh) |
| `ExportJob` | Description d'un export en cours | `selection: Path[]`, `outputPath: string`, `status: idle\|exporting\|done\|error` | éphémère — un seul à la fois |
| `RenderedArtifact` | Artefact prêt à passer dans le pipeline PDF | `meta: Meta`, `markdown: string`, `chainParents?: RenderedArtifact[]` | construit à l'export, jeté après écriture |
| `PdfDocument` | Sortie binaire de l'export | `bytes []byte`, `pageCount int` | écrit sur disque, plus géré ensuite |

### Relations

- `SelectionSet` ⟶ `Artefact SPDD` : N à 1 (chaque path référence un
  artefact existant ; les artefacts disparus seront filtrés à l'export
  avec un avertissement).
- `Artefact SPDD (canvas, status reviewed+)` ⟶ `CanvasChain` : 1 vers 1
  (un canvas en phase generate produit toujours une chaîne, même si
  certains chaînons sont cassés).
- `ExportJob` ⟶ `RenderedArtifact[]` : 1 vers N (un job rend N
  artefacts dans l'ordre d'affichage de la HubList).
- `RenderedArtifact` ⟶ `PdfDocument` : N vers 1 (un seul PDF combiné).

### Invariants

- **I1 — déterminisme de la chaîne** : pour un canvas donné en statut
  `reviewed`/`implemented`/`synced`, l'expansion en chaîne produit
  toujours la même séquence ordonnée `[story, analysis, canvas]`.
- **I2 — robustesse aux références cassées** : un chaînon manquant ne
  fait jamais crasher l'export — il est rendu comme placeholder visuel
  dans le PDF.
- **I3 — ordre d'affichage** : dans le PDF combiné, les artefacts
  apparaissent dans l'ordre d'affichage de la HubList au moment de
  l'export, **pas** dans l'ordre de cochage de la sélection.
- **I4 — capture disque** : l'export reproduit la version sur disque
  des artefacts, pas la version draft en mémoire de l'éditeur (la
  cohérence avec le repo prime sur l'instantané UI).

---

## A — Approach

Pipeline 100 % frontend basé sur **`@react-pdf/renderer`** : composants
React dédiés (`<Document>`, `<Page>`, `<View>`, `<Text>`, `<Link>`)
produisent un PDF avec texte sélectionnable, polices embarquées et
pagination contrôlée. Le markdown source est rendu via
`react-markdown` avec un mapping `components` qui retourne des
primitives `@react-pdf/renderer` au lieu de HTML — la grammaire GFM
courante (heading, paragraph, list, code inline/block, link,
blockquote, table, emphasis) couvre tous les cas attendus dans les
artefacts SPDD.

L'écriture binaire s'appuie sur deux bindings Wails Go : `SaveFilePdf`
ouvre la dialog système et retourne le path choisi ;
`WritePdfFile(path, base64)` décode et écrit le binaire. La résolution
de la chaîne `story → analysis → canvas` est elle aussi côté Go via
`ResolveCanvasChain(canvasPath)` qui parse le front-matter YAML et
retourne les chemins absolus (avec entrées vides en cas de référence
cassée).

Côté visuel, les tokens design `yk-*` actuellement définis comme
variables CSS sont extraits dans un module TypeScript `designTokens.ts`
(constantes hex), consommé à la fois par `mdComponents` (pipeline
read-only existant) et par les composants PDF — source de vérité
unique, divergence visuelle prévenue.

Le bouton « Exporter PDF » s'attache à la HubList générique : il
fonctionne pour tous les modes (inbox / stories / epics / analysis /
prompts / tests / roadmap) sans code spécifique par mode.

### Alternatives considérées

- **`jsPDF + html2canvas`** — rasterise le DOM existant, écarté car
  texte non sélectionnable + taille de fichier 5-10× supérieure.
- **Pipeline Go headless Chromium** — qualité maximale mais dépendance
  Chromium dans un binaire desktop autonome + friction AV Defender.
- **`window.print()` natif** — ouvre la dialog d'impression Windows,
  pas de contrôle sur le nom de fichier, mauvaise UX desktop.
- **Markdown → HTML → PDF côté Go** — casse l'AC visuelle « ressembler
  au SpddEditor read-only ».

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/uiapp/` | `pdfexport.go` (nouveau), `app.go` (registration des nouveaux bindings) | create + modify |
| `frontend/src/components/spdd/pdf/pdfTokens.ts` | palette light mode dédiée au PDF (divergence vs canvas initial — pas de partage avec mdComponents) | create |
| `frontend/src/components/spdd/pdf/` | `PdfArtifactDocument.tsx`, `PdfMarkdown.tsx`, `exportArtifacts.ts` (tous nouveaux) | create |
| `frontend/src/stores/` | `pdfExport.ts` (nouveau) | create |
| `frontend/src/components/hub/HubList.tsx` | ajout cases à cocher + barre d'action « Exporter sélection » + bouton par item | modify |
| `frontend/wailsjs/go/main/App.d.ts` | ajout stubs TS pour `SaveFilePdf`, `WritePdfFile`, `ResolveCanvasChain` (workaround AV `-skipbindings`) | modify |
| `frontend/package.json` | ajout `@react-pdf/renderer` | modify |

### Schéma de flux

```
[HubList] ─── user coche 3 items + clic « Exporter sélection »
    │
    ▼
[pdfExport store] ── exportSelection()
    │
    ├──> for each path:
    │       App.ReadArtifact(path) → markdown
    │       parse front-matter → meta
    │       if kind === 'prompts' && status ∈ {reviewed,implemented,synced}:
    │           App.ResolveCanvasChain(path) → {storyPath, analysisPath, canvasPath}
    │           prepend story + analysis (lus aussi via ReadArtifact)
    │
    ├──> App.SaveFilePdf("spdd-export-YYYYMMDD-HHmm.pdf") → outputPath
    │
    ├──> @react-pdf/renderer pdf(<PdfArtifactDocument
    │                                artefacts={renderedList} />).toBlob()
    │       └─ <Document><Page>(N pages, footer cartouche)</Page>...</Document>
    │
    ├──> blob → base64 → App.WritePdfFile(outputPath, base64)
    │
    └──> toast succès / erreur
```

---

## O — Operations

> 8 opérations. Ordre d'exécution = ordre de génération recommandé pour
> bâtir incrémentalement (Go d'abord car le frontend en dépend, puis
> tokens partagés, puis pipeline PDF, puis store, puis UI).

### O1 — `SaveFilePdf` : ouvre la save dialog Wails

- **Module** : `internal/uiapp/`
- **Fichier** : `internal/uiapp/pdfexport.go`
- **Signature** :
  ```go
  // SaveFilePdf opens a native save-file dialog filtered to *.pdf and
  // returns the path the user chose. Empty string means the user
  // cancelled (no error).
  func (a *App) SaveFilePdf(suggestedName string) (string, error)
  ```
- **Comportement** :
  1. Vérifier qu'au moins un projet est ouvert (sinon erreur
     `"no project selected"`, cohérent avec `ReadArtifact`).
  2. Appeler `runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
     DefaultFilename: suggestedName, Filters: [{DisplayName: "PDF",
     Pattern: "*.pdf"}]})`.
  3. Retourner le path choisi (ou `""` si l'utilisateur annule).
- **Tests** : `internal/uiapp/pdfexport_test.go` —
  - cas nominal avec `saveFileDialog` (var package-level swappable
    comme `openDirectoryDialog` ligne `app.go:53`) mockée retournant
    un path → assertion path retourné ;
  - cas annulation → string vide, pas d'erreur ;
  - cas pas de projet → erreur `"no project selected"`.
  Cf. [`testing-backend.md`](../methodology/testing/testing-backend.md).

### O2 — `WritePdfFile` : décode base64 et écrit le binaire

- **Module** : `internal/uiapp/`
- **Fichier** : `internal/uiapp/pdfexport.go`
- **Signature** :
  ```go
  // WritePdfFile decodes the base64-encoded PDF content and writes it
  // to path. Returns an error if path is empty or the decode/write
  // fails. The path is trusted as it came from SaveFilePdf
  // (user-validated via OS dialog).
  func (a *App) WritePdfFile(path, base64Content string) error
  ```
- **Comportement** :
  1. Refuser si `path == ""` (erreur `"empty path"`).
  2. `base64.StdEncoding.DecodeString(base64Content)` → bytes.
  3. `os.WriteFile(path, bytes, 0644)` — pas de path-traversal guard
     ici, la dialog OS a fait office de validation.
  4. Logger `slog.Info("pdf written", "path", path, "bytes",
     len(bytes))`.
- **Tests** : `internal/uiapp/pdfexport_test.go` —
  - cas nominal : tmp dir, écrire un PDF de 4 octets connus, relire,
    assertion bytes égaux ;
  - cas base64 invalide → erreur de décodage ;
  - cas path vide → erreur `"empty path"`.

### O3 — `ResolveCanvasChain` : lit le front-matter et retourne la chaîne

- **Module** : `internal/uiapp/`
- **Fichier** : `internal/uiapp/pdfexport.go`
- **Signature** :
  ```go
  // CanvasChain holds the resolved paths of a canvas (prompts/) and
  // its parent story / analysis as declared in the canvas
  // front-matter. Empty strings mean the reference was missing or the
  // file no longer exists.
  type CanvasChain struct {
      StoryPath    string
      AnalysisPath string
      CanvasPath   string
  }

  // ResolveCanvasChain reads the canvas at canvasPath, parses its
  // front-matter, and returns the absolute paths to its referenced
  // story and analysis. canvasPath itself is always echoed in
  // CanvasPath. References are resolved relative to the project root
  // (the .yukki ancestor of canvasPath). Missing or unreadable
  // references are returned as empty strings — never an error
  // (Invariant I2).
  func (a *App) ResolveCanvasChain(canvasPath string) (CanvasChain, error)
  ```
- **Comportement** :
  1. Path-traversal guard `hasYukkiPrefix(absPath, projs)` (pattern
     existant dans `ReadArtifact`).
  2. Lire le fichier, extraire le front-matter (entre les deux `---`).
  3. Parser via `yaml.Unmarshal` dans une struct
     `{Story string, Analysis string}`.
  4. Pour chaque chemin référencé : `filepath.Join(projectRoot, ref)`,
     puis `os.Stat` — si OK, le mettre ; sinon string vide.
  5. Retourner la struct.
- **Tests** : `internal/uiapp/pdfexport_test.go` —
  - cas nominal : canvas valide pointant vers story + analyse
    existantes → 3 paths remplis ;
  - cas référence cassée : analyse référencée n'existe pas → champ
    `AnalysisPath` vide, pas d'erreur ;
  - cas front-matter sans `story:`/`analysis:` (vieux canvas) → 2
    champs vides, `CanvasPath` rempli.

### O4 — `pdfTokens.ts` : palette light mode dédiée au PDF

- **Module** : `frontend/src/components/spdd/pdf/`
- **Fichier** : `frontend/src/components/spdd/pdf/pdfTokens.ts`
- **Signature** :
  ```ts
  // Palette LIGHT MODE dédiée au PDF — un PDF se lit / s'imprime sur
  // fond blanc, donc on inverse les contrastes par rapport à `yk-*`
  // (dark mode du SpddEditor). Chemin de divergence par rapport au
  // canvas initial : on n'expose PAS les yk-* dark en TS partagé
  // (mdComponents reste sur Tailwind via spdd-tokens.css), on crée
  // un module light mode 100% PDF.
  export const pdfTokens = {
    // Surfaces (claires)
    bgPage: '#ffffff',
    bg1: '#ffffff',
    bg2: '#fafafc',
    bg3: '#f0f1f4',
    bgSubtle: '#f8f8fa',
    bgCard: '#ffffff',
    // Lines
    line: '#dadde3',
    lineSubtle: '#e9ebef',
    lineStrong: '#b8bcc6',
    // Text (sombre sur fond clair)
    textPrimary: '#1a1c25',
    textSecondary: '#3f4252',
    textMuted: '#6b6e80',
    textFaint: '#8d909e',
    // Accent — conservé identique au dark mode
    primary: '#8b6cff',
    primarySoft: 'rgba(139, 108, 255, 0.10)',  // pour backgroundColor — OK
    primarySoftSolid: '#efeaff',                // pour borders (hex requis : @react-pdf
                                                // ne rend pas correctement rgba sur
                                                // les borderXxxColor, fallback vert)
    primaryRing: 'rgba(139, 108, 255, 0.25)',
    // Semantics — légèrement plus saturés pour la lisibilité sur blanc
    success: '#1f9d5f',
    successSoft: '#e6f6ee',
    warning: '#b8741e',
    warningSoft: '#fdf2e0',
    danger: '#c53737',
    dangerSoft: '#fbe9e9',
    // Code colors
    codeKey: '#7847d3',
    codeString: '#107a3e',
    codeHeading: '#9c5e0e',
    // Radii (en px — @react-pdf ne lit pas les rem)
    radiusSm: 4,
    radius: 6,
    radiusMd: 8,
    radiusLg: 10,
  } as const;

  export type PdfTokens = typeof pdfTokens;
  ```
- **Comportement** : module pur, palette light mode dédiée au PDF.
  Note : `pdfTokens.primarySoft` (rgba) ne fonctionne **que pour
  `backgroundColor`** — pour `borderXxxColor`, utiliser
  `pdfTokens.primarySoftSolid` (équivalent hex), `@react-pdf/renderer`
  ne parsant pas correctement rgba sur les bordures (régression
  observée : fallback vert).
- **Tests** : pas de test direct (constantes statiques).

### O5 — `PdfMarkdown` : mapping markdown AST → composants react-pdf

- **Module** : `frontend/src/components/spdd/pdf/`
- **Fichier** : `frontend/src/components/spdd/pdf/PdfMarkdown.tsx`
- **Signature** :
  ```tsx
  export interface PdfMarkdownProps {
    /** Markdown source de l'artefact, sans le front-matter. */
    markdown: string;
  }

  export function PdfMarkdown({ markdown }: PdfMarkdownProps): JSX.Element;
  ```
- **Comportement** :
  1. **Enregistrer les polices** (au niveau module, exécuté une fois) :
     `Font.register({ family: 'Inter', fonts: [{src: '/fonts/Inter-Regular.ttf'},
     {src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold'},
     {src: '/fonts/Inter-Italic.ttf', fontStyle: 'italic'}] })` et
     idem pour JetBrains Mono. Les `.ttf` sont à placer dans
     `frontend/public/fonts/` (servis par Vite à la racine).
  2. `<ReactMarkdown remarkPlugins={[remarkGfm]} components={pdfComponents}>`
     où `pdfComponents` mappe chaque tag (h1/h2/h3, p, ul, ol, li,
     code inline, codeBlock, blockquote, a, table/thead/tbody/tr/th/td,
     strong, em) vers des composants `@react-pdf/renderer` (`<View>`,
     `<Text>`, `<Link>`).
  3. **Skip du H1 source** (Q3) : le composant `h1` du mapping retourne
     `null` — le titre est déjà rendu en en-tête de page par
     `<PdfArtifactDocument>` (O6), pas de doublon visuel. Les H2
     et H3 du markdown source restent rendus normalement.
  4. Styles inline via `StyleSheet.create({ ... })` consommant
     `ykTokens` (police Inter + JetBrains Mono pour le code, taille
     11pt prose / 14pt H2 / 12pt H3, line-height 1.5).
  5. Code blocks : pas de syntax highlighting (shiki ne sortirait pas
     des `<Text>` react-pdf). Police monospace + fond `bg3`.
  6. Tables GFM : `<View>` avec `flexDirection: 'row'`, bordures
     `line`, header bg `bg3`.
- **Tests** : `frontend/src/components/spdd/pdf/PdfMarkdown.test.tsx` —
  - rendu d'un markdown contenant chaque type de nœud GFM, snapshot
    via `pdf(<PdfMarkdown />).toBlob()` puis assert `pageCount > 0`
    (pas de crash, pas de nœud HTML qui leakerait dans le PDF) ;
  - rendu d'un markdown vide → composant vide, pas de crash ;
  - rendu d'un markdown malformé (gras non fermé) → render best-effort,
    pas de crash.
  Cf. [`testing-frontend.md`](../methodology/testing/testing-frontend.md).

### O6 — `PdfArtifactDocument` : `<Document>` complet avec footer

- **Module** : `frontend/src/components/spdd/pdf/`
- **Fichier** : `frontend/src/components/spdd/pdf/PdfArtifactDocument.tsx`
- **Signature** :
  ```tsx
  export interface RenderedArtifact {
    meta: { id: string; title: string; status: string; updated: string };
    markdown: string;
    /** Pour AC5 : signaler une référence cassée à la place du markdown. */
    brokenRef?: { reason: string; missingPath: string };
  }

  export interface PdfArtifactDocumentProps {
    artefacts: RenderedArtifact[];
  }

  export function PdfArtifactDocument({ artefacts }: PdfArtifactDocumentProps): JSX.Element;
  ```
- **Comportement** :
  1. `<Document>` → pour chaque artefact, un `<Page size="A4"
     style={pageStyle}>`.
  2. En tête de page : titre H1 (`meta.title`).
  3. Corps : `<PdfMarkdown markdown={artifact.markdown} />` OU encart
     « Artefact introuvable : `<missingPath>` » si `brokenRef`.
  4. Pied de page (composant `<View fixed style={footerStyle}>`) :
     `<id> — <title> · <status> · <updated>` (cf. décision #4).
  5. Numéro de page en bas à droite via `<Text render={({ pageNumber,
     totalPages }) => '${pageNumber} / ${totalPages}'} />`.
- **Tests** :
  `frontend/src/components/spdd/pdf/PdfArtifactDocument.test.tsx` —
  - 3 artefacts → 3+ pages, footer présent sur chacune (assertion
    via `pdf-parse` ou regex sur le binaire) ;
  - 1 artefact avec `brokenRef` → encart « Artefact introuvable »
    rendu, page existe quand même ;
  - 0 artefact → document vide mais valide (`pageCount === 0` ou 1
    page « Aucun artefact à exporter », à clarifier en
    implémentation).

### O7 — `pdfExport` store Zustand : selection + orchestration

- **Module** : `frontend/src/stores/`
- **Fichier** : `frontend/src/stores/pdfExport.ts`
- **Signature** :
  ```ts
  interface PdfExportState {
    selection: ReadonlySet<string>;
    isExporting: boolean;
    errorMessage: string | null;
    toggleSelection: (path: string) => void;
    clearSelection: () => void;
    exportSingle: (path: string) => Promise<void>;
    exportSelection: () => Promise<void>;
  }

  export const usePdfExportStore: UseBoundStore<StoreApi<PdfExportState>>;
  ```
- **Comportement** :
  1. `toggleSelection(path)` : ajoute/retire le path du `Set`.
  2. `clearSelection()` : vide le `Set`, reset l'erreur.
  3. `exportSingle(path)` : alias de `exportSelection` avec un seul
     path (pour le bouton individuel par item).
  4. `exportSelection()` :
     - `isExporting = true`, `errorMessage = null`.
     - Construire la liste `RenderedArtifact[]` depuis la sélection
       en respectant l'ordre d'affichage de la HubList (lire
       `useArtifactsStore.getState().items` et filtrer/trier par
       `Path` ∈ selection).
     - Pour chaque path : `App.ReadArtifact(path)` → markdown ;
       parser le front-matter pour `meta` ; si c'est un canvas
       (`path.includes('/.yukki/prompts/')`) avec status
       `reviewed`/`implemented`/`synced` → appeler
       `App.ResolveCanvasChain(path)`, lire les chaînons,
       pré-pendre. **Cette logique s'applique aussi à
       `exportSingle`** (Q2) — un canvas seul en phase generate
       déclenche la chaîne complète, comportement déterministe et
       cohérent avec AC2.
     - `App.SaveFilePdf(suggestedName)` → outputPath ; si vide
       (annulation) → reset `isExporting`, return.
     - `pdf(<PdfArtifactDocument artefacts={list} />).toBlob()` →
       blob → base64 (FileReader.readAsDataURL).
     - `App.WritePdfFile(outputPath, base64)`.
     - `isExporting = false`, toast succès.
     - Catch : `errorMessage = String(e)`, toast erreur.
- **Tests** : `frontend/src/stores/pdfExport.test.ts` —
  - `toggleSelection` : 2 toggles distincts → 2 éléments ; double
    toggle même path → 0 éléments ;
  - `clearSelection` : reset complet ;
  - `exportSelection` mocké (Wails bindings stubbés) : assert
    appelle `SaveFilePdf` puis `WritePdfFile` avec le bon path et
    un base64 non vide ;
  - `exportSelection` avec annulation save dialog → ne fait rien
    après le `SaveFilePdf` qui retourne `""`.

### O8 — HubList : cases à cocher + barre d'action

- **Module** : `frontend/src/components/hub/`
- **Fichier** : `frontend/src/components/hub/HubList.tsx` (modify)
- **Signature** : pas de signature de fonction publique modifiée (le
  composant `HubList` reste le même). Ajouts internes :
  - une case à cocher par item, contrôlée par
    `usePdfExportStore.toggleSelection` ;
  - dans le header de la `<section>`, une zone d'action conditionnelle
    visible dès `selection.size > 0` :
    - count `{selection.size} sélectionné(s)`
    - bouton « Exporter sélection » → `exportSelection()` (désactivé
      si `selection.size === 0` ou `isExporting === true`) ;
    - bouton « Effacer » → `clearSelection()`.
  - sur chaque item, en plus du clic pour sélectionner l'affichage
    (existant), un petit bouton icône « Exporter PDF » (lucide
    `Download`) à droite → `exportSingle(m.Path)`.
- **Comportement** :
  1. La case à cocher ne déclenche **pas** `setSelectedPath` (pas de
     conflit avec la sélection d'affichage).
  2. Le clic sur le corps de l'item garde son comportement existant
     (sélection d'affichage).
  3. La case à cocher et le bouton « Exporter PDF » par item
     `stopPropagation` pour ne pas déclencher la sélection
     d'affichage.
  4. Au refresh de la liste (`useArtifactsStore.refresh`) **et au
     changement de mode HubList** (Q5), la sélection persiste (même
     paths) — l'utilisateur peut combiner stories + epics + canvas
     dans un même export. Les paths qui ne sont plus visibles dans le
     mode courant restent silencieusement dans le store, et
     contribueront au PDF combiné. Une bulle « N sélectionné(s) hors
     du mode courant » dans la barre d'action signale qu'il y a des
     paths invisibles. Reset uniquement via `clearSelection`.
- **Tests** : `frontend/src/components/hub/HubList.test.tsx` (existant
  à étendre) —
  - cocher 2 items → `selection.size === 2` dans le store ;
  - bouton « Exporter sélection » désactivé si vide, actif sinon ;
  - clic sur le bouton « Exporter PDF » d'un item → appel
    `exportSingle(path)` (mock store) ;
  - cocher une case ne change pas `selectedPath` (pas de conflit avec
    la sélection d'affichage existante).

---

## N — Norms

> Adaptées au contexte yukki desktop (frontend React + Wails Go, pas
> d'OIDC, pas de CRD K8s, pas de docs Antora publics).

- **Logging** :
  - Côté Go : `slog.Info` / `slog.Error` (pattern existant dans
    `internal/uiapp/`). Logger les paths PDF écrits + leur taille.
  - Côté frontend : pas de `console.log` en production — utiliser
    `useToast()` pour le feedback utilisateur (pattern existant).
- **Sécurité** :
  - Pas de path-traversal guard sur `WritePdfFile` (le path vient de
    la save dialog OS, validé par l'utilisateur).
  - Le path-traversal guard `hasYukkiPrefix` reste pour
    `ResolveCanvasChain` (lecture dans le repo).
  - Pas de secret en clair dans les fichiers générés (le PDF reproduit
    les artefacts qui sont déjà publics dans le repo).
- **Tests** :
  - **Pyramid** : unit > integration > e2e. Pas d'e2e pour cette story
    (pas de browser test runner sur Wails).
  - Couverture cible : >80 % sur la logique métier (store
    `pdfExport`, `ResolveCanvasChain`, `WritePdfFile`).
  - Pas de test sur les composants triviaux (`PdfArtifactDocument`
    sans `brokenRef` → assertion `pageCount > 0` suffit).
  - Cf. [`testing-frontend.md`](../methodology/testing/testing-frontend.md)
    et [`testing-backend.md`](../methodology/testing/testing-backend.md).
- **Nommage** :
  - Backend Go : `pdfexport.go`, méthodes `App.SaveFilePdf` /
    `App.WritePdfFile` / `App.ResolveCanvasChain` (PascalCase pour
    Wails binding).
  - Frontend : `pdf/` sous-dossier sous `components/spdd/`,
    composants `Pdf<Truc>.tsx`, store `usePdfExportStore`.
- **Observabilité** : pas de Micrometer / OpenTelemetry. Spinner UI
  pendant l'export + log Go pour les écritures PDF suffisent.
- **i18n** : yukki desktop est mono-langue (FR). Tous les textes
  utilisateur sont en FR direct (pas de fichiers de traduction).
- **Docs** : pas de doc Antora à mettre à jour. Si le bouton « Exporter
  PDF » devient un comportement public majeur, mention dans le
  CHANGELOG (futur).

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Sécurité**
  - **Ne jamais** appeler `WritePdfFile` avec un path qui n'a pas été
    retourné par `SaveFilePdf` (la dialog OS est le seul point d'accès
    au flow d'écriture).
  - Pas de chemin codé en dur dans le code (seul l'utilisateur via la
    dialog choisit où écrire).
  - **Ne pas** modifier le contenu source des artefacts pendant
    l'export — l'export est strictement read-only (cf. I4 capture
    disque).

- **Compatibilité**
  - **Ne pas** modifier la signature de `App.ListArtifacts` ou
    `App.ReadArtifact` — ce sont des bindings consommés par le reste
    de l'UI.
  - **Ne pas** introduire de cas spécial par mode HubList (pas de
    `if mode === 'stories'` dans le code d'export) — un seul code
    path partagé par tous les modes (Decision #3).
  - **Ne pas** breaker le pipeline read-only existant en éditant
    `mdComponents.tsx` — `designTokens.ts` est consommé en addition,
    pas en remplacement, des classes Tailwind actuelles. Les tests
    existants de read-only (`WysiwygProseEditor.tsx`) doivent rester
    verts.

- **Performance**
  - **Ne pas** bloquer l'UI pendant la génération PDF — utiliser
    `pdf().toBlob()` async + spinner.
  - **Ne pas** générer le PDF avant que `SaveFilePdf` ait retourné un
    path (pas de calcul gaspillé en cas d'annulation).
  - Limite douce : avertir (pas bloquer) si `selection.size > 20`
    (avertissement de durée d'export).

- **Périmètre**
  - **Ne jamais** faire crasher l'export sur référence cassée — un
    chaînon manquant produit un placeholder visuel (Invariant I2).
  - **Ne pas** introduire d'option « N PDFs séparés » dans le MVP —
    1 PDF combiné toujours (Decision #2).
  - **Ne pas** rasteriser le DOM — le texte du PDF doit rester
    sélectionnable et copiable (Decision #1, AC technique).
  - **Ne pas** dupliquer les valeurs des tokens design — `ykTokens`
    dans `designTokens.ts` est l'unique source de vérité, à
    l'exception (transitoire) des classes Tailwind statiques qui
    peuvent rester par-dessus.
  - **Ne pas** ajouter de syntax highlighting pour les blocs de code
    dans le PDF (pas de shiki) — police monospace + fond suffit.
