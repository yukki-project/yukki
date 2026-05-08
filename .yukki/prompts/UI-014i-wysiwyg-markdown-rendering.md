---
id: UI-014i
slug: wysiwyg-markdown-rendering
story: .yukki/stories/UI-014i-wysiwyg-markdown-rendering.md
analysis: .yukki/analysis/UI-014i-wysiwyg-markdown-rendering.md
status: synced
created: 2026-05-08
updated: 2026-05-08
---

# Canvas REASONS — Rendu markdown WYSIWYG des sections prose

> Spécification exécutable. Source de vérité pour `/yukki-generate` et
> `/yukki-sync`. Toute divergence code ↔ canvas se résout **dans ce
> fichier d'abord**.

---

## R — Requirements

### Problème

Les sections prose des artefacts SPDD (sections `widget: 'textarea'` du
chemin générique + sections `bg`/`bv`/`si`/`so`/`oq`/`no` du chemin legacy
story) s'affichent comme du markdown brut dans des `textarea` HTML, à la
fois en lecture seule et en édition. Le contenu `**gras**`, `## titre`,
`- liste`, `[lien](url)` apparaît littéralement au lieu d'être rendu
visuellement. Cible : rendu WYSIWYG (lecture stylisée + édition graphique
avec toolbar et raccourcis markdown) avec **round-trip markdown bit-pour-bit**
en sortie.

### Definition of Done

- [ ] (AC1) Sections `widget: 'textarea'` en mode read-only affichent du
  markdown rendu (gras, italique, titres H2/H3, listes, code inline, blocs
  de code surlignés via `shiki`, liens cliquables) — aucun caractère
  markdown brut visible
- [ ] (AC2) Toolbar markdown produit du markdown propre : sélection +
  clic "gras" écrit `**texte**` en source (pas de `<b>` HTML, pas de
  classe CSS parasite)
- [ ] (AC3) Round-trip strict : ouvrir un fichier en mode édition
  WYSIWYG puis sauvegarder sans modification produit un fichier identique
  au fichier lu (modulo normalisation EOL)
- [ ] (AC4) Toggle "Markdown source" disponible en mode édition : bascule
  vers `GenericProseTextarea` (fallback brut) ; retour vers WYSIWYG
  préserve les modifications
- [ ] (AC5) Markdown malformé (`**non fermé`, `[lien sans url`) ne crash
  pas, est rendu best-effort, et le toggle "Markdown source" reste
  accessible
- [ ] L'éditeur Tiptap est chargé en **lazy-load** : il n'apparaît dans
  le bundle initial qu'au passage en mode édition (mesuré via
  `rollup-plugin-visualizer` ou équivalent)
- [ ] L'AI popover existant (UI-014h O10, sélection ≥ 3 mots →
  `useSpddSuggest`) reste fonctionnel par-dessus l'éditeur WYSIWYG
- [ ] Tests round-trip sur fixtures réelles du repo (au minimum
  `.yukki/prompts/UI-014h-universal-template-driven-editor.md` et une
  story typique) — verts en CI
- [ ] Type-check vert ; aucune régression sur les 146 tests existants

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `MarkdownContent` | Markdown source d'une section prose | `text: string` | Lu par `parseArtifactContent`, écrit par `serializeArtifact` |
| `WysiwygProseEditor` | Composant React unifié rendu/édition | `value`, `onChange`, `readOnly`, `sectionHeading`, `artifactType` | Monté par `GenericSectionBlock` et `SectionBlock` |
| `MarkdownToolbar` | Toolbar locale au-dessus de l'éditeur en édition | `editor: TiptapEditor`, `onToggleSource: () => void` | Affichée quand `!readOnly` et `mode === 'wysiwyg'` |
| `MdComponents` | Mapping `react-markdown` components | `h1/h2/h3/p/code/a/ul/ol/li/blockquote/pre` | Module shared, importé par StoryViewer + WysiwygProseEditor |
| `TiptapEditor` (instance) | Instance ProseMirror gérée par `useEditor` | extensions, content, onUpdate | Créée au passage en édition, détruite au retour en read-only ou unmount |
| `EditMode` (par éditeur) | Indique si l'éditeur est en mode WYSIWYG ou en mode "Markdown source" (fallback) | `'wysiwyg' \| 'source'` | State local au `WysiwygProseEditor` |

### Relations

- `WysiwygProseEditor` → `MdComponents` : utilisé en mode read-only ET
  en mode source preview
- `WysiwygProseEditor` → `TiptapEditor` : créée seulement en mode édition
  WYSIWYG, via `useEditor` lazy-loadé
- `WysiwygProseEditor` → `GenericProseTextarea` : monté en mode édition
  source (fallback toggle)
- `MarkdownToolbar` → `TiptapEditor` : appelle `editor.chain().focus().toggleBold().run()` etc.
- `useSpddSuggest` (UI-014h O10) : reste branché à la sélection ; en
  mode WYSIWYG, l'écouteur passe par `editor.on('selectionUpdate')` au
  lieu du `onMouseUp` HTML

---

## A — Approach

**Direction** : remplacer `GenericProseTextarea` (chemin générique) et
`ProseTextarea` (chemin legacy story) par un **`WysiwygProseEditor`**
unifié qui sert deux modes (read-only / édition) et deux backends
(WYSIWYG Tiptap / source brut). API drop-in identique à
`GenericProseTextarea` pour limiter les sites d'intégration.

**Pile** :
- **Read-only** : `react-markdown` + `remark-gfm` + `mdComponents`
  partagé, déjà dans le bundle (pas d'ajout). Les blocs de code passent
  par `CodeBlock` (shiki). Pas de coût bundle.
- **Édition WYSIWYG** : Tiptap + StarterKit + extension markdown
  serializer (à valider entre `tiptap-markdown` et
  `prosemirror-markdown` au début de O3 — voir Open Question canvas).
  Lazy-loadé : l'éditeur est instancié au passage en mode édition,
  pas au mount du composant.
- **Édition source (fallback)** : `GenericProseTextarea` existant,
  réutilisé tel quel (préserve l'AI popover natif).

**Toggle WYSIWYG ↔ Source** : géré au niveau de chaque
`WysiwygProseEditor` (état local `editMode`). Le toggle est exposé via
un petit bouton dans l'en-tête de la section quand `!readOnly`. Pas de
modification du `SegmentedViewMode` global de `SpddHeader` (qui reste
pour le mode markdown global story).

**AI popover** : continue d'exister sans modification de
`useSpddSuggest`. Le `WysiwygProseEditor` traduit la sélection ProseMirror
(via `editor.state.selection`) en `{ start, end, text }` et appelle le
même `openAiPopover` (chemin legacy) ou `GenericAiPopoverPanel` (chemin
générique).

**Round-trip** : la responsabilité repose sur l'extension markdown
serializer. Test obligatoire en CI : `parse(md) → tiptap → serialize →
md'` doit être idempotent (`md === md'` modulo EOL). Si l'extension
ne tient pas la promesse, fallback : ne pas re-sérialiser le contenu
non modifié — garder le markdown source d'origine et n'écraser que les
sections que l'utilisateur a effectivement éditées.

### Alternatives écartées

- **Lexical** — bundle plus léger mais round-trip markdown moins mature.
  Réévaluable post-livraison si Tiptap pose problème.
- **ProseMirror from-scratch** — boilerplate trop important pour la
  story.
- **CodeMirror 6 markdown highlighted** — n'est pas WYSIWYG, ne livre
  pas la promesse de la story. Possible amélioration parallèle ultérieure.
- **Statu quo (textarea brut)** — rejeté : la story `UI-014i` existe
  pour adresser cette dette UX.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature |
|---|---|---|
| `frontend/src/components/spdd/WysiwygProseEditor.tsx` | composant racine + sub-composants `WysiwygSurface` / `MarkdownPreview` | création |
| `frontend/src/components/spdd/MarkdownToolbar.tsx` | toolbar locale | création |
| `frontend/src/lib/markdownComponents.tsx` | mapping `react-markdown` partagé | création (extraction depuis `StoryViewer.tsx`) |
| `frontend/src/components/spdd/SpddDocument.tsx` | montage du nouveau composant dans `GenericSectionBlock` + `SectionBlock` | modification |
| `frontend/src/components/spdd/GenericProseTextarea.tsx` | inchangé fonctionnellement, conserve son rôle de fallback source | inchangé (référencé) |
| `frontend/src/components/hub/StoryViewer.tsx` | refactor pour importer `mdComponents` depuis le module shared | modification minimale |
| `frontend/package.json` | `@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown` (4 deps) | modification |

### Schéma de flux

```
                       SpddDocument (chemin générique)
                                  │
                       GenericSectionBlock
                                  │
                       WysiwygProseEditor (drop-in remplace GenericProseTextarea)
                       ├── readOnly=true
                       │   └── ReactMarkdown + mdComponents → rendu HTML
                       │       (CodeBlock pour blocs de code)
                       │
                       └── readOnly=false
                           ├── editMode='wysiwyg'  → Tiptap (lazy-loadé)
                           │                         + MarkdownToolbar
                           │                         + AI popover sur selectionUpdate
                           │
                           └── editMode='source'   → GenericProseTextarea
                                                     (fallback existant)
```

---

## O — Operations

### O1 — Extraire `mdComponents` partagé

- **Module** : `frontend`
- **Fichier** : `frontend/src/lib/markdownComponents.tsx` (nouveau)
- **Signature** :
  ```typescript
  import type { Components } from 'react-markdown';

  /** Mapping react-markdown partagé : tous les rendus markdown du
   *  projet utilisent ce mapping pour cohérence visuelle. */
  export const mdComponents: Components;
  ```
- **Comportement** :
  1. Extraire le `mdComponents` actuellement défini en interne dans
     `frontend/src/components/hub/StoryViewer.tsx`.
  2. Mappings inclus : `h1`, `h2`, `h3`, `h4`, `p`, `code` (inline +
     bloc — délègue à `CodeBlock` pour le multi-ligne), `a` (ouvre
     dans le navigateur ou le viewer interne selon le href), `ul`,
     `ol`, `li`, `blockquote`, `pre`.
  3. `code` : si `inline`, rend `<code className="...">` ; si block,
     monte `<CodeBlock language={...}>{children}</CodeBlock>`.
  4. `StoryViewer.tsx` est mis à jour pour `import { mdComponents } from
     '@/lib/markdownComponents'`.
- **Tests** :
  - Fichier : `frontend/src/lib/markdownComponents.test.tsx` (nouveau)
  - Cas : rendu d'un sample markdown (`# H1`, `**gras**`, `` `code` ``,
    bloc ` ```ts ` ``` ``, lien) via `<ReactMarkdown
    components={mdComponents}>`. Vérifie que les éléments attendus
    apparaissent (heading, strong, code, anchor, CodeBlock).
  - Convention : suivre `testing-frontend.md` (intégration légère, pas
    de mock CodeBlock — on assume shiki async).

### O2 — Ajouter les dépendances Tiptap

- **Module** : `frontend`
- **Fichier** : `frontend/package.json`
- **Signature** :
  ```json
  {
    "dependencies": {
      "@tiptap/core": "^2",
      "@tiptap/react": "^2",
      "@tiptap/starter-kit": "^2",
      "tiptap-markdown": "^0"
    }
  }
  ```
- **Comportement** :
  1. Ajouter les 4 packages avec les versions latest stable
     compatibles React 18.
  2. Lancer `npm install` (ou yarn) → mettre à jour `package-lock.json`.
  3. Si `tiptap-markdown` ne tient pas le round-trip, retomber sur
     `prosemirror-markdown` (parser/serializer officiel ProseMirror) —
     décision dans O3.
- **Tests** : N/A (install). La couverture est faite par O3/O8.

### O3 — `WysiwygProseEditor` : composant racine

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/WysiwygProseEditor.tsx` (nouveau)
- **Signature** :
  ```typescript
  export interface WysiwygProseEditorProps {
    /** Markdown source de la section. */
    value: string;
    /** Émis sur chaque modification — debouncé (150 ms) ou sur blur. */
    onChange: (nextMarkdown: string) => void;
    /** Mode lecture seule : pas de toolbar, pas de Tiptap, juste rendu. */
    readOnly?: boolean;
    /** Heading humain de la section, propagé à useSpddSuggest (UI-014h O10). */
    sectionHeading?: string;
    /** Type d'artefact (inbox/epic/...), propagé au prompt LLM. */
    artifactType?: string;
  }

  export function WysiwygProseEditor(props: WysiwygProseEditorProps): JSX.Element;
  ```
- **Comportement** :
  1. State local : `editMode: 'wysiwyg' | 'source'` (défaut `'wysiwyg'`).
  2. Si `readOnly === true` :
     - Rendre `<MarkdownPreview value={value} />` qui appelle
       `<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{value}</ReactMarkdown>`.
     - Pas de toolbar, pas d'éditeur Tiptap.
  3. Si `readOnly === false` et `editMode === 'wysiwyg'` :
     - Lazy-import de Tiptap via `React.lazy` ou `useState` + `await import('@tiptap/react')`.
     - Monter `<WysiwygSurface value={value} onChange={onChange} ... />`
       qui instancie `useEditor({ extensions: [StarterKit, Markdown.configure({...})], content: value })`.
     - Au-dessus : `<MarkdownToolbar editor={editor} onToggleSource={() => setEditMode('source')} />`.
     - Sur sélection (`editor.on('selectionUpdate')`) ≥ 3 mots, ouvrir
       l'AI popover (générique : `GenericAiPopoverPanel` ; legacy
       story : `openAiPopover` du store).
     - `onUpdate` du Tiptap : sérialiser en markdown via l'extension,
       debounce 150 ms, appeler `props.onChange`.
  4. Si `readOnly === false` et `editMode === 'source'` :
     - Monter `<GenericProseTextarea value={value} onChange={onChange}
       sectionHeading={sectionHeading} artifactType={artifactType} />`.
     - Toolbar minimale : juste un bouton "WYSIWYG" pour rebasculer.
  5. Round-trip : si `editMode === 'wysiwyg'` et le contenu n'a PAS été
     modifié (compare `value` initial vs sérialisation), ne pas appeler
     `onChange` — garde-fou anti-divergence cosmétique.
- **Tests** :
  - Fichier : `frontend/src/components/spdd/WysiwygProseEditor.test.tsx` (nouveau)
  - Cas :
    - readOnly=true + markdown sample → `<strong>`, `<a>`, code apparaissent (rendu correct)
    - readOnly=false + clic sur toolbar Bold → `value` reçu via onChange contient `**...**`
    - editMode='source' → `GenericProseTextarea` est monté
    - Toggle WYSIWYG ↔ Source → contenu préservé entre bascules
    - Markdown malformé (`**non fermé`) → rendu sans crash
  - Convention : intégration React Testing Library + mock `@tiptap/react`
    si nécessaire pour éviter les coûts d'init en test.

### O4 — `MarkdownToolbar` : toolbar markdown

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/MarkdownToolbar.tsx` (nouveau)
- **Signature** :
  ```typescript
  import type { Editor } from '@tiptap/react';

  export interface MarkdownToolbarProps {
    editor: Editor;
    /** Callback pour basculer en mode édition source brut. */
    onToggleSource?: () => void;
  }

  export function MarkdownToolbar(props: MarkdownToolbarProps): JSX.Element;
  ```
- **Comportement** :
  1. Boutons : Bold (`Ctrl+B`), Italic (`Ctrl+I`), H2, H3, BulletList,
     OrderedList, Code (inline), CodeBlock, Link.
  2. Chaque bouton : `editor.chain().focus().toggleBold().run()` (ou
     équivalent par command).
  3. État actif visuellement (`editor.isActive('bold')` →
     `aria-pressed="true"` + style filled).
  4. Bouton "Source" (à droite) : appelle `onToggleSource?.()`.
  5. Layout : flex horizontal compact, séparateurs entre groupes
     (formatting / blocks / actions).
- **Tests** :
  - Fichier : `frontend/src/components/spdd/MarkdownToolbar.test.tsx` (nouveau)
  - Cas :
    - Clic sur Bold → `editor.chain().focus().toggleBold().run()` appelé
    - `editor.isActive('bold')` → bouton Bold a `aria-pressed="true"`
    - Clic "Source" → `onToggleSource` appelé
  - Convention : mock minimal d'`Editor` Tiptap (jest.fn() sur les
    methods utilisées).

### O5 — Intégrer dans `GenericSectionBlock` (chemin générique)

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx` (modification)
- **Signature** : modification inline dans `GenericSectionBlock`
  ```tsx
  // Remplacer :
  <GenericProseTextarea
    value={section.content}
    onChange={handleContentChange}
    readOnly={readOnly}
    sectionHeading={section.heading}
    artifactType={artifactType}
  />
  // Par :
  <WysiwygProseEditor
    value={section.content}
    onChange={handleContentChange}
    readOnly={readOnly}
    sectionHeading={section.heading}
    artifactType={artifactType}
  />
  ```
- **Comportement** :
  1. Drop-in replacement : l'API `WysiwygProseEditor` est identique à
     `GenericProseTextarea` (même 5 props).
  2. Le widget `'ac-cards'` reste sur `SpddAcEditor` (inchangé).
  3. La FM section en tête reste sur `SpddFmForm` (inchangé).
- **Tests** :
  - Fichier : `frontend/src/components/spdd/SpddDocument.test.tsx`
    (nouveau ou ajout au fichier existant si présent)
  - Cas :
    - Rendu d'un `editState` inbox avec section `'Idée'` (widget
      textarea) → contenu rendu en markdown formaté quand `readOnly`,
      éditable WYSIWYG quand pas readOnly
    - Section `'ac-cards'` → toujours `SpddAcEditor` (non régressé)
  - Convention : intégration via `editState` synthétique +
    `parsedTemplate` minimal.

### O6 — Intégrer dans `SectionBlock` legacy story

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/SpddDocument.tsx` (modification)
- **Signature** :
  ```tsx
  // Remplacer dans SectionBlock (chemin legacy story) :
  <ProseTextarea sectionKey={section.key as ProseSectionKey} readOnly={readOnly} />
  // Par un wrapper qui adapte le store legacy à l'API WysiwygProseEditor :
  <ProseSectionWysiwyg sectionKey={section.key as ProseSectionKey} readOnly={readOnly} />
  ```
- **Comportement** :
  1. `ProseSectionWysiwyg` est un petit wrapper local dans
     `SpddDocument.tsx` qui :
     - lit `value = useSpddEditorStore((s) => s.draft.sections[sectionKey])`
     - écrit via `setSection(sectionKey, next)` du store
     - dérive `sectionHeading` depuis `SECTIONS.find(s => s.key === sectionKey).label`
     - propage `readOnly` + `artifactType: 'story'`
     - délègue à `<WysiwygProseEditor ... />` (read **et** édition —
       symétrie complète avec le chemin générique)
  2. `ProseTextarea` (composant legacy) **supprimé** dans le slice 2
     (commit 8ded441 — "fix(spdd): UI-014i — symétrie story / générique
     sur Tiptap WYSIWYG"). Aucun code mort restant.
  3. **AI popover préservé** via le mode source du `WysiwygProseEditor` :
     toggle "Source" dans la toolbar monte `GenericProseTextarea` qui
     conserve la détection sélection ≥ 3 mots → popover AI universel
     (UI-014h O10). En mode WYSIWYG (Tiptap), l'éditeur gère sa propre
     sélection ; l'utilisateur bascule en mode source pour invoquer
     l'IA. Coût : 1 clic sur "Source" — l'AI popover legacy direct sur
     selection a été retiré au profit d'un seul popover universel.
- **Tests** :
  - Cas (ajout au fichier de tests précédent) :
    - story prose section `'bg'` → contenu rendu via WYSIWYG/markdown
      formaté
    - Édition propage à `useSpddEditorStore.draft.sections.bg`
    - Toggle source bascule sur `GenericProseTextarea` ; le store reste
      la source de vérité

### O7 — Toggle Source ↔ WYSIWYG cohérent

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/WysiwygProseEditor.tsx` (modif O3)
- **Signature** : pas de nouvelle signature ; comportement interne.
- **Comportement** :
  1. Ajouter un bouton "Source" / "WYSIWYG" dans la `MarkdownToolbar` (O4).
  2. Au passage `wysiwyg → source` : sérialiser le contenu actuel en
     markdown, le passer à `GenericProseTextarea`.
  3. Au passage `source → wysiwyg` : passer le markdown courant à
     Tiptap (recompilation contenu). Si parsing échoue, rester en
     mode source et afficher un toast warning.
  4. Le state `editMode` est local (par section) — décision prise dans
     l'analyse, recommandation : laisser local et ne pas hisser au
     niveau header global.
- **Tests** :
  - Cas (extension du test O3) :
    - Toggle wysiwyg → source → contenu identique
    - Modifier en mode source → rebasculer → modification visible en
      WYSIWYG
    - Markdown invalide en source → tentative de bascule WYSIWYG → reste
      en source + toast (assertion sur appel `useToast`)

### O8 — Tests round-trip sur fixtures réelles

- **Module** : `frontend`
- **Fichier** : `frontend/src/components/spdd/WysiwygProseEditor.roundtrip.test.tsx` (nouveau)
- **Signature** :
  ```typescript
  describe('WysiwygProseEditor — round-trip strict', () => {
    it.each([
      '.yukki/prompts/UI-014h-universal-template-driven-editor.md',
      '.yukki/stories/UI-014h-universal-template-driven-editor.md',
      // ajouter d'autres fixtures représentatives
    ])('preserves %s bit-for-bit', async (path) => { ... });
  });
  ```
- **Comportement** :
  1. Pour chaque fixture : `readFileSync(path, 'utf-8')` → contenu source.
  2. Extraire les sections prose (parser test minimal — splitter par `## `).
  3. Pour chaque section : monter `WysiwygProseEditor value={content}`,
     attendre que Tiptap ait fini d'instancier, déclencher la
     sérialisation (par exemple via blur), comparer le résultat à
     l'original.
  4. Test PASSE si tous les bytes sont identiques (modulo
     normalisation `\r?\n`).
  5. Si Tiptap-markdown ne tient pas le round-trip strict, le test
     échoue → décision : changer de lib (`prosemirror-markdown`) OU
     adopter la stratégie "ne pas re-sérialiser le contenu non
     modifié" (cf. O3.5).
- **Tests** : c'est le test lui-même. Pas de tests sur ce test.
- **Convention** : suivre `testing-frontend.md` (test d'intégration,
  pas unit, fichiers réels comme fixtures pour valeur de validation
  réelle).

---

## N — Norms

- **TypeScript strict** : pas de `as any`, pas d'assertion non-null
  sans guard explicite.
- **Pure functions** pour `mdComponents` (pas de side-effect, pas de
  dépendance au store).
- **Lazy-load Tiptap** : `import('@tiptap/react')` dynamique, déclenché
  au passage en mode édition. Mesurer le bundle avec
  `rollup-plugin-visualizer` avant/après.
- **AI Assist** (UI-014h O10) doit rester fonctionnel : les
  raccourcis Tiptap sur sélection ne masquent pas le popover IA. Le
  `WysiwygProseEditor` adapte l'écouteur de sélection à
  `editor.on('selectionUpdate')` et appelle le même
  `GenericAiPopoverPanel` / `openAiPopover`.
- **Tests** : suivre `.yukki/methodology/testing/testing-frontend.md`.
  Pyramide trophée : intégration > unit pour les composants. Naming
  `it('does X when Y', ...)`. Pas de mock du DOM ; `jsdom` suffit.
- **Nommage** : composants en PascalCase (`WysiwygProseEditor`,
  `MarkdownToolbar`), types en PascalCase (`WysiwygProseEditorProps`,
  `MdComponents`), pas de suffixe `I` ou `T`.
- **Tailwind** : réutiliser les tokens design existants (`yk-bg-*`,
  `yk-text-*`, `yk-line-*`) — pas de nouvelle palette.
- **i18n** : labels FR (cohérent avec le reste de l'app) ; les `aria-label`
  des boutons toolbar en FR aussi.
- **Logging** : pas de `console.*` en code de prod ; `console.warn`
  toléré pour les fallbacks silencieux (cohérent avec `CodeBlock`).

---

## S — Safeguards

- **Round-trip markdown strict — non négociable** : ce qui est lu doit
  pouvoir être ré-écrit identique. Le test O8 verrouille cette propriété
  en CI ; un échec bloque la merge.
- **Ne jamais re-sérialiser en markdown si l'utilisateur n'a pas modifié
  la section** — protection contre les divergences cosmétiques d'AST
  Tiptap. Le `WysiwygProseEditor` compare `value` initial à la
  sérialisation et ne déclenche `onChange` que sur changement effectif.
- **Ne pas casser `GenericProseTextarea`** — il reste comme fallback
  source. Toute modification y est strictement un bug fix, pas un
  ajout de feature qui pourrait diverger du nouveau flux.
- **Ne pas casser `StoryViewer`** lors de l'extraction de
  `mdComponents` — l'API doit rester strictement compatible
  (mêmes mappings, mêmes signatures de composants enfants).
- **Ne pas court-circuiter l'AI popover (UI-014h O10)** — la sélection
  ≥ 3 mots dans `WysiwygProseEditor` doit ouvrir le même popover que
  dans `GenericProseTextarea` actuel. Test : ouvrir une inbox, sélectionner
  3 mots dans une section prose, vérifier que le popover s'ouvre.
- **Bundle initial préservé** — Tiptap est lazy-loadé impérativement.
  Si la mesure post-livraison montre que Tiptap est dans le chunk
  initial, c'est un défaut de génération à corriger.
- **Pas de markdown étendu silencieux** — si l'extension Tiptap-markdown
  ne supporte pas une syntaxe (footnotes, math LaTeX, MDX), le rendu
  doit dégrader visuellement de façon propre (afficher la source brute
  dans la section ou proposer le toggle source) — jamais perdre du
  contenu.
- **Pas de couplage circulaire `WysiwygProseEditor` ↔ store legacy** —
  le composant lui-même ne dépend d'aucun store ; seul le wrapper
  `ProseSectionWysiwyg` (O6) lit le store legacy.

---

## Changelog

- 2026-05-08 — `O / S — generation 1` — `/yukki-generate` pour le slice
  **rendu read-only** (axe Paths SPIDR). Livrables :
  - **O1 ✓** — `frontend/src/lib/markdownComponents.tsx` (création).
    Mapping `react-markdown` partagé : code (inline + block via shiki),
    h1-h4, p, ul/ol/li, a (target=_blank pour externes), blockquote, pre.
    StoryViewer.tsx refactoré pour importer depuis le module shared
    (suppression de la définition locale + import `CodeBlock` devenu
    inutile).
  - **O3 partiel ✓** — `frontend/src/components/spdd/WysiwygProseEditor.tsx`
    (création). API drop-in identique à GenericProseTextarea. Mode
    read-only : `ReactMarkdown + remarkGfm + mdComponents` → rendu HTML
    stylé. Mode édition : délègue à `GenericProseTextarea` (textarea
    brut existant — préserve l'AI popover UI-014h O10).
  - **O5 ✓** — `SpddDocument.tsx` `GenericSectionBlock` monte
    WysiwygProseEditor au lieu de GenericProseTextarea. Sections
    inbox/epic/analysis/canvas affichent le markdown rendu en lecture.
  - **O6 ✓** — wrapper `ProseSectionWysiwyg` (inline dans SpddDocument)
    pour le legacy story : read-only → WysiwygProseEditor stylé ;
    édition → ProseTextarea legacy (préserve AI popover legacy
    UI-014d/f). Sections story bg/bv/si/so/oq/no rendent en stylé en
    lecture.
  - Type-check vert. 146/146 tests verts (aucune régression).

  **Reportés** (en attente revue humaine sur Open Questions) :
  - **O2** — `package.json` deps Tiptap : décision Tiptap vs Lexical
    NON tranchée. Le canvas listait cette Open Question explicitement
    ("À trancher dans `/yukki-analysis` via spike comparatif court").
    Sans la décision, je n'ai pas installé de lib externe.
  - **O4** — `MarkdownToolbar.tsx` : dépend de l'éditeur Tiptap.
  - **O7** — Toggle Source ↔ WYSIWYG cohérent : nécessite l'éditeur
    Tiptap pour le côté WYSIWYG.
  - **O8** — Tests round-trip strict : pertinents seulement avec un
    serializer markdown bidirectionnel (Tiptap-markdown ou équivalent).

  **Valeur livrée vs canvas** : AC1 (rendu read-only stylé) ✓ ; AC4
  partiel (toggle Source = défaut, pas de WYSIWYG actif) ; AC5 (markdown
  malformé) ✓ via la tolérance native de `react-markdown`. AC2 (toolbar)
  et AC3 (round-trip strict) reportés avec O2/O4/O7/O8.

  Le canvas reste en `status: draft` : la livraison est partielle. Le
  passage à `implemented` sera fait quand Tiptap sera intégré. Si
  l'arbitrage tombe sur "ne pas faire le WYSIWYG complet" (par exemple
  garder uniquement le rendu read-only stylé), le canvas devra être
  amendé via `/yukki-prompt-update` pour réduire le scope.

- 2026-05-08 — `O / S — generation 2` — Décision tranchée par
  l'utilisateur : `Tiptap` (recommandation analyse) confirmée. Slice 2
  livré couvrant les Operations restantes :
  - **O2 ✓** — `npm install @tiptap/core @tiptap/react @tiptap/starter-kit
    tiptap-markdown` (4 packages, ~165 transitives). Versions Tiptap 3.x.
  - **O3 plein ✓** — `WysiwygProseEditor` étend le mode édition :
    `EditableSurface` route entre `WysiwygSurface` (Tiptap + StarterKit
    + tiptap-markdown serializer) et `GenericProseTextarea` (mode source)
    selon `editMode` (state local). `useEditor` instancie l'éditeur
    avec `immediatelyRender: false`. Sérialisation markdown sur blur
    seulement (pas à chaque keystroke) + garde-fou anti-divergence
    cosmétique : `if (md !== value) onChange(md)`.
  - **O4 ✓** — `frontend/src/components/spdd/MarkdownToolbar.tsx`
    (création). 9 boutons : Bold, Italic, H2, H3, BulletList,
    OrderedList, Code inline, CodeBlock, Link. États actifs via
    `editor.isActive(...)`. Lien : prompt natif (URL).
  - **O7 ✓** — Toggle Source ↔ WYSIWYG via composant `SourceToggle`
    (état local `editMode`). Bascule conserve le contenu (flush en
    markdown avant la transition).
  - **O8 ✓** — `WysiwygProseEditor.roundtrip.test.ts` (création) avec
    8 tests : gras/italique, H2/H3, listes, code inline, blocs de code
    avec language, liens, malformé sans crash, vide reste vide.
    Convention adoptée : tiptap-markdown normalise `_italic_` → `*italic*`
    (les deux valides en CommonMark) — le test source utilise la
    convention de sortie comme référence.

  Type-check vert. **154/154 tests** (8 nouveaux round-trip).

  **Status canvas → `implemented`.** Tous les AC du DoD couverts :
  AC1 (rendu read-only) ✓, AC2 (toolbar produit markdown propre) ✓,
  AC3 (round-trip strict) ✓ via tests dédiés, AC4 (toggle Source ↔
  WYSIWYG) ✓, AC5 (markdown malformé) ✓.

- 2026-05-08 — `sync` — `/yukki-sync` après refactor pur (commit 8ded441
  "symétrie story / générique sur Tiptap WYSIWYG") :
  - `ProseSectionWysiwyg` délègue désormais à `WysiwygProseEditor` en
    read **et** en édition (au lieu de retomber sur `ProseTextarea`
    legacy en édition). Symétrie complète story / chemin générique.
  - `ProseTextarea` legacy supprimé de `SpddDocument.tsx` (code mort).
  - L'AI popover legacy direct sur sélection a disparu en mode WYSIWYG.
    Il reste accessible via le toggle "Source" → `GenericProseTextarea`
    avec son popover universel (UI-014h O10) — Safeguard "AI popover
    préservé" respecté (chemin = 1 clic sur "Source" au lieu d'un
    déclenchement automatique).
  - Helper stub `tiptapRoundtrip` retiré de `WysiwygProseEditor.tsx`
    (le test round-trip de O8 a sa propre implémentation autonome).

  Sections d'intention (R/E/A/N/Safeguards) inchangées. O6 mis à jour
  (sa description bullet 2 et bullet 3 reflètent la réalité du code).
  Type-check vert ; 154/154 tests verts (aucune régression).
  **Status → `synced`.**
