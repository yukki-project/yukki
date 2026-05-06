---
id: UI-010
slug: artifact-viewer-editor
title: Artefact viewer — markdown riche, sections pliables, éditeur inline
story: .yukki/stories/UI-010-artifact-viewer-editor.md
analysis: .yukki/analysis/UI-010-artifact-viewer-editor.md
status: implemented
created: 2026-05-06
updated: 2026-05-06
---

# Canvas REASONS — Artefact viewer — markdown riche, sections pliables, éditeur inline

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

`StoryViewer` affiche le markdown brut sans styles : titres, tables et blocs de code
sont indiscernables du texte courant. La navigation dans les artefacts longs (canvas
REASONS 600+ lignes) est difficile. Les utilisateurs doivent sortir de yukki pour
éditer un artefact.

### Definition of Done

- [ ] Les titres `#` / `##` / `###`, les tables GFM, les blockquotes et les listes ont
  un style visuel distinct (Tailwind Typography activé)
- [ ] Les blocs de code (Go, TypeScript, YAML, bash, JSON, Markdown) affichent la
  coloration syntaxique shiki avec thème `github-dark`
- [ ] Chaque bloc de code expose un bouton « Copier » qui copie le contenu brut dans
  le presse-papier
- [ ] Chaque section `##` est pliable ; l'état par section est persisté en localStorage
  (`yukki:sections:<path>`) ; la section `## O —` d'un canvas REASONS avec > 3
  opérations est repliée par défaut à l'ouverture
- [ ] Le bouton « Éditer » (raccourci `E`) bascule en mode édition : textarea pleine
  largeur avec le **corps markdown uniquement** (frontmatter exclu de la textarea ;
  affiché en lecture seule via `FrontmatterHeader`)
- [ ] `Ctrl+S` / bouton Enregistrer sauvegarde sur disque et repasse en lecture
- [ ] `Escape` / bouton Annuler repasse en lecture sans sauvegarder
- [ ] Quitter le mode édition avec des modifications non enregistrées affiche un dialog
  de confirmation (Enregistrer / Ignorer / Annuler)
- [ ] Un toast d'erreur s'affiche si `WriteArtifact` échoue ; le mode édition reste actif
- [ ] `WriteArtifact` refuse tout path hors `.yukki/` d'un projet ouvert et refuse si
  le fichier n'existe pas encore

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `ViewerMode` | Mode actif du viewer | `'read' \| 'edit'` | basculement via bouton/raccourci ; reset à `read` après save réussi |
| `SectionState` | Ensemble des sections `##` repliées | `Set<string>` (titres) | créé au chargement depuis localStorage ; mis à jour à chaque toggle ; reset à chaque changement de `selectedPath` |
| `DocumentKind` | Type de document déduit du frontmatter | `'inbox' \| 'canvas' \| 'standard'` | calculé une fois au parse frontmatter ; pilote le rendu et les défauts de sections |
| `DirtyContent` | Contenu modifié en mode édition | `string` | initialisé au corps markdown (`body`) à l'entrée en mode édition ; le raw complet (`content`) est tracé dans `contentRef` et réinjecté automatiquement à la sauvegarde ; comparé à `originalContent` (body initial) pour le dirty check |

### Relations

- `StoryViewer` porte `ViewerMode`, `SectionState`, `DocumentKind` et `DirtyContent` comme état local React
- `SectionState` est persistée dans `localStorage` (clé `yukki:sections:<selectedPath>`) et rechargée à chaque changement de `selectedPath`
- `DocumentKind` est dérivé de `Frontmatter.scalars.id` (préfixe `INBOX-` → `inbox`) et de la présence de `## R —` dans le body (→ `canvas`)
- `WriteArtifact` (Go binding) consomme `(path: string, content: string)` et retourne `Promise<void>`

---

## A — Approach

On étend `StoryViewer.tsx` de manière incrémentale — sans le réécrire — en trois
axes orthogonaux : (1) rendu riche via deux nouveaux composants `CodeBlock` et
`CollapsibleSection` injectés dans le pipeline `react-markdown` via la prop `components`,
(2) mode édition textarea géré comme état local React dans `StoryViewer`, (3) binding
Go `WriteArtifact` symétrique à `ReadArtifact`.

**Shiki** est chargé en dynamic import (`() => import('shiki')`) pour ne pas bloquer le
rendu initial. Pendant le chargement, `CodeBlock` affiche un `<pre><code>` brut ; il se
réhydrate en HTML coloré une fois le module résolu. Le thème `github-dark` est cohérent
avec le dark mode forcé de l'app.

**`@radix-ui/react-collapsible`** fournit un état contrôlé (`open`/`onOpenChange`) qui
permet de synchroniser `SectionState` avec localStorage de manière fiable, sans
l'opacité de `<details>` natif.

**`DocumentKind`** pilote deux comportements : les artefacts `inbox` n'ont pas de
sections pliables (layout compact) ; les canvas REASONS (`canvas`) replient `## O —`
par défaut si le body contient plus de 3 occurrences de `### O`.

**Dirty check** : `StoryViewer` mémorise `originalContent` (valeur au moment de l'entrée
en mode édition). Si `dirtyContent !== originalContent` quand l'utilisateur tente de
quitter le mode édition (via raccourci, sélection d'un autre artefact, ou bouton
Annuler), un `<AlertDialog>` Radix s'affiche (Enregistrer / Ignorer / Annuler).

### Alternatives considérées

- **CodeMirror / Monaco** — éditeur riche avec preview split-pane ; > 500 KB,
  complexité d'intégration Wails non triviale ; reporté en UI-011.
- **`@shikijs/rehype`** — plugin rehype officiel ; API async non compatible avec
  le pattern synchrone de `react-markdown@9` sans contournement complexe ; écarté
  au profit du composant custom `code`.
- **`<details>/<summary>` HTML natif** — zéro dépendance mais état non contrôlé,
  incompatible avec localStorage sync ; écarté en faveur de `@radix-ui/react-collapsible`.

---

## S — Structure

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `internal/uiapp` | `app.go` | modify — ajout méthode `WriteArtifact` |
| `frontend/wailsjs/go/main` | `App.js`, `App.d.ts` | modify — stub `WriteArtifact` |
| `frontend/src/components/hub` | `CodeBlock.tsx` | create |
| `frontend/src/components/hub` | `CollapsibleSection.tsx` | create |
| `frontend/src/components/hub` | `StoryViewer.tsx` | modify — intégration composants, mode édition, DocumentKind |
| `frontend` | `package.json` | modify — `shiki`, `@radix-ui/react-collapsible` |

### Schéma de flux

```
Sélection artefact (HubList)
  → useArtifactsStore.setSelectedPath(path)
    → StoryViewer useEffect
      → ReadArtifact(path)            [Go binding — lecture protégée]
        → splitFrontmatter(content)
          → DocumentKind.from(meta)   [inline derivation]
          → SectionState.load(path)   [localStorage]
          → ReactMarkdown
              components.code  → <CodeBlock lang shiki>
              components.h2    → <CollapsibleSection open=SectionState>

Mode édition (bouton E / raccourci E)
  → ViewerMode = 'edit'
  → originalContent = content
  → <textarea value=dirtyContent>

Save (Ctrl+S)
  → WriteArtifact(path, dirtyContent)  [Go binding — écriture protégée]
    → ReadArtifact(path)               [rechargement]
    → ViewerMode = 'read'

Quitter avec dirty (Escape / sélection autre artefact)
  → dirtyContent !== originalContent
    → <AlertDialog> (Enregistrer / Ignorer / Annuler)
```

---

## O — Operations

### O1 — Go : WriteArtifact binding

- **Module** : `internal/uiapp`
- **Fichier** : `internal/uiapp/app.go`
- **Signature** :
  ```go
  // WriteArtifact writes content to the file at path. Refuses any path that does
  // not resolve under the .yukki/ directory of one of the currently opened projects
  // (path-traversal guard, Invariant I1). Returns an error if the file does not
  // already exist (modification only — no silent creation). Content is limited
  // to 1 MB. No ctx parameter (Wails 2.12 D-B5b).
  func (a *App) WriteArtifact(path, content string) error
  ```
- **Comportement** :
  1. Acquérir `a.mu.RLock()`, copier `a.openedProjects`, `RUnlock()`.
  2. Si `len(projs) == 0` → retourner `errors.New("no project selected")`.
  3. `filepath.Abs(path)` → erreur si échec.
  4. `hasYukkiPrefix(absPath, projs)` → erreur si false.
  5. Si `len(content) > 1<<20` → retourner `errors.New("content exceeds 1 MB limit")`.
  6. `os.Stat(absPath)` → si `errors.Is(err, os.ErrNotExist)` → retourner `fmt.Errorf("artifact does not exist: %s", absPath)`.
  7. `os.WriteFile(absPath, []byte(content), 0o600)` → retourner l'erreur si non-nil.
- **Tests** :
  - Unit (table-driven dans `internal/uiapp/app_test.go`) :
    - path hors `.yukki/` → erreur attendue
    - fichier inexistant → erreur `ErrNotExist`
    - contenu > 1 MB → erreur taille
    - écriture nominale → contenu lisible avec `ReadArtifact`
    - aucun projet ouvert → erreur

### O2 — Stubs Wails : App.js + App.d.ts

- **Module** : `frontend/wailsjs/go/main`
- **Fichiers** : `App.js`, `App.d.ts`
- **Signature** :
  ```js
  // App.js
  export function WriteArtifact(path, content) {
    return window['go']['uiapp']['App']['WriteArtifact'](path, content);
  }
  ```
  ```ts
  // App.d.ts
  // UI-010
  export function WriteArtifact(path: string, content: string): Promise<void>;
  ```
- **Comportement** : ajouter après le bloc `// UI-009` existant. Pattern identique
  aux autres bindings (une ligne `return window['go']…`).
- **Tests** : pas de test unitaire — couvert par les tests intégration `O1`.

### O3 — npm : installer shiki + @radix-ui/react-collapsible

- **Module** : `frontend`
- **Fichier** : `package.json` (mis à jour par npm)
- **Signature** :
  ```
  npm install shiki @radix-ui/react-collapsible
  ```
- **Comportement** : installer dans `dependencies` (pas `devDependencies` — utilisées
  au runtime). Vérifier après installation que `shiki` exporte bien `createHighlighter`
  et `codeToHtml` depuis `shiki` (API v1.x).
- **Tests** : `tsc -b frontend` doit passer après installation.

### O4 — Composant CodeBlock (shiki)

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/CodeBlock.tsx`
- **Signature** :
  ```tsx
  interface CodeBlockProps {
    language?: string;   // attribut `class="language-go"` extrait par react-markdown
    children: string;    // contenu brut du bloc de code
  }
  export function CodeBlock({ language, children }: CodeBlockProps): JSX.Element
  ```
- **Comportement** :
  1. `useState<string | null>(null)` pour `highlightedHtml`.
  2. `useState<boolean>(false)` pour `copied` (état du bouton Copier).
  3. `useEffect([children, language])` :
     - `const { codeToHtml } = await import('shiki')` (dynamic import)
     - `codeToHtml(children, { lang: language ?? 'text', theme: 'github-dark' })`
     - `setHighlightedHtml(html)`
  4. Rendu : si `highlightedHtml` → `<div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />`
     encapsulé dans un `<div className="relative group">`. Sinon → `<pre><code>{children}</code></pre>` (fallback brut).
  5. Bouton Copier :
     - `className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"`
     - `onClick`: `navigator.clipboard.writeText(children)`, `setCopied(true)`, timeout 2 s → `setCopied(false)`.
     - Label : `copied ? 'Copié !' : 'Copier'`.
  6. Le `language` est extrait de `className` par react-markdown sous la forme `language-go` → extraire avec
     `className?.replace(/^language-/, '')`.
- **Tests** (Vitest + Testing Library, `CodeBlock.test.tsx`) :
  - Rendu fallback brut avant résolution du dynamic import
  - Bouton Copier appelle `navigator.clipboard.writeText` avec le bon contenu
  - Bouton Copier affiche « Copié ! » puis revient à « Copier » après 2 s
  - (intégration) language `go` → HTML contient des balises de coloration shiki

### O5 — Composant CollapsibleSection (Radix)

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/CollapsibleSection.tsx`
- **Signature** :
  ```tsx
  interface CollapsibleSectionProps {
    title: string;          // texte brut du heading ##
    defaultOpen?: boolean;  // true par défaut sauf canvas O —
    storageKey: string;     // clé localStorage de SectionState pour cet artefact
    children: React.ReactNode;
  }
  export function CollapsibleSection({
    title, defaultOpen = true, storageKey, children
  }: CollapsibleSectionProps): JSX.Element
  ```
- **Comportement** :
  1. Lire l'état initial depuis localStorage (`storageKey`) : si le titre est dans
     le `Set` des sections repliées → `open = false`, sinon `open = defaultOpen`.
  2. `Collapsible.Root open={open} onOpenChange={(next) => { setOpen(next); persistSectionState(storageKey, title, next); }}`.
  3. `persistSectionState(key, title, open)` :
     - Lire le JSON `localStorage.getItem(key)` → parser en `string[]` ou `[]`.
     - Si `!open` → ajouter `title` ; si `open` → retirer `title`.
     - `localStorage.setItem(key, JSON.stringify(updated))`.
  4. Header : `<Collapsible.Trigger asChild><button className="flex w-full items-center gap-2 text-left …"><ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />{title}</button></Collapsible.Trigger>`.
  5. Content : `<Collapsible.Content>{children}</Collapsible.Content>`.
- **Tests** (Vitest + Testing Library, `CollapsibleSection.test.tsx`) :
  - Par défaut `open=true` : contenu visible
  - Clic header → contenu masqué, chevron pivoté
  - État persisté dans localStorage après toggle
  - `defaultOpen=false` + titre absent du Set localStorage → section repliée initialement
  - Restauration depuis localStorage : titre dans le Set → section repliée même avec `defaultOpen=true`

### O6 — StoryViewer : rendu riche + sections pliables + DocumentKind

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/StoryViewer.tsx`
- **Signature** (modifications) :
  ```tsx
  // Imports à ajouter
  import { CodeBlock } from './CodeBlock';
  import { CollapsibleSection } from './CollapsibleSection';

  // Constante DocumentKind
  type DocumentKind = 'inbox' | 'canvas' | 'standard';
  function detectDocumentKind(meta: Frontmatter, body: string): DocumentKind

  // Clé localStorage pour cet artefact
  function sectionStorageKey(path: string): string  // `yukki:sections:${path}`
  ```
- **Comportement** :
  1. `detectDocumentKind(meta, body)` :
     - `meta.scalars.id?.startsWith('INBOX-')` → `'inbox'`
     - `body.includes('## R —')` → `'canvas'`
     - sinon → `'standard'`
  2. `sectionStorageKey(path)` : retourne `yukki:sections:${path}`.
  3. Réinitialiser le localStorage de sections lors du changement de `path` :
     dans le `useEffect([path])` existant, après `ReadArtifact`, **ne pas** effacer
     le localStorage (la persistance est voulue). Laisser `SectionState` rechargé
     naturellement par `CollapsibleSection` via la `storageKey`.
  4. Dans la prop `components` de `<ReactMarkdown>` :
     - `code({ className, children })` → `<CodeBlock language={className?.replace(/^language-/, '')} children={String(children)} />`
     - `h2({ children })` :
       - extraire le titre brut : `String(children)`.
       - `defaultOpen` : si `kind === 'canvas'` ET le titre commence par `## O` ET le nombre de `### O` dans le body > 3 → `false`. Sinon `true`.
       - Si `kind === 'inbox'` → rendre `<h2>{children}</h2>` ordinaire (pas de collapsible).
       - Sinon → `<CollapsibleSection title={titre} defaultOpen={defaultOpen} storageKey={sectionStorageKey(path)}>{/* contenu suivant — géré par react-markdown */}</CollapsibleSection>`.

  > **Note implémentation** : `react-markdown` ne permet pas de grouper le contenu
  > d'un `h2` avec ses enfants directement. Stratégie : utiliser un plugin `remark`
  > custom qui enveloppe chaque section `## …` et son contenu dans un nœud `section`.
  > Alternativement, post-processer le body avant le rendu pour séparer par sections.
  > **Choix canvas** : post-processeur `splitIntoSections(body)` qui retourne
  > `Array<{ heading: string; content: string }>` ; rendu via une boucle React
  > plutôt que via `<ReactMarkdown>` global.

- **Tests** (Vitest + Testing Library, intégration, `StoryViewer.test.tsx`) :
  - Artefact avec `id: INBOX-001` → pas de `<Collapsible>` dans le DOM
  - Artefact avec `## R —` dans le body → `DocumentKind === 'canvas'`
  - Artefact canvas avec > 3 `### O` → section `## O —` repliée à l'ouverture
  - Blocs code dans le rendu → présence du bouton « Copier »

### O7 — StoryViewer : mode édition, save, cancel, dirty dialog

- **Module** : `frontend/src/components/hub`
- **Fichier** : `frontend/src/components/hub/StoryViewer.tsx`
- **Signature** (additions dans le même composant) :
  ```tsx
  import { WriteArtifact } from '../../../wailsjs/go/main/App';
  import { AlertDialog, AlertDialogAction, AlertDialogCancel,
           AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
           AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

  // État local supplémentaire dans StoryViewer
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [originalContent, setOriginalContent] = useState<string>(''); // body initial
  const [dirtyContent, setDirtyContent] = useState<string>('');       // body édité
  const [saving, setSaving] = useState<boolean>(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null); // dirty navigation

  // Ref vers le raw complet (frontmatter + body) — nécessaire pour buildFullContent
  const contentRef = useRef(content);
  contentRef.current = content;
  ```

  ```tsx
  // Helper (module-level)
  function buildFullContent(originalRaw: string, editedBody: string): string {
    const match = originalRaw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
    return match ? match[1] + editedBody : editedBody;
  }
  ```
- **Comportement** :
  1. **Entrée en mode édition** (bouton « Éditer » ou `keydown E` quand `mode==='read'`) :
     - `setOriginalContent(body)` ; `setDirtyContent(body)` ; `setMode('edit')`.
     - `content` (raw complet) reste accessible via `contentRef` pour la reconstruction au save.
  2. **Mode édition** : remplacer l'`<article>` par une `<textarea className="w-full h-full font-mono text-sm bg-background p-6 resize-none focus:outline-none" value={dirtyContent} onChange={e => setDirtyContent(e.target.value)} />`.
  3. **Save** (`Ctrl+S` ou bouton Enregistrer) :
     - `setSaving(true)`.
     - Reconstituer le contenu complet : `const fullContent = buildFullContent(contentRef.current, dirtyContentRef.current)`.
     - `await WriteArtifact(path, fullContent)` — si erreur → toast `useToast` avec message, `setSaving(false)`, rester en mode édition.
     - Si succès : `data = await ReadArtifact(path)` → `setContent(data)` ; `setMode('read')` ; `setSaving(false)`.
  4. **Cancel** (`Escape` ou bouton Annuler) :
     - Si `dirtyContent === originalContent` → `setMode('read')` directement.
     - Sinon → afficher l'`<AlertDialog>`.
  5. **Navigation dirty** : le `useEffect([path])` détecte si `mode === 'edit'` ET `dirtyContent !== originalContent` avant de changer de contenu → stocker `path` dans `pendingPath` et ouvrir le dialog au lieu de recharger.
  6. **AlertDialog** (shared pour Cancel et navigation dirty) :
     - Enregistrer → appeler save, puis si succès : `setMode('read')` ; si `pendingPath` → déclencher chargement du nouveau path.
     - Ignorer → `setMode('read')` ; si `pendingPath` → charger `pendingPath`.
     - Annuler → fermer le dialog, rester en mode édition sur le path courant, vider `pendingPath`.
  7. **Barre d'outils** : en mode lecture → bouton `Edit` (icon `Pencil`, lucide). En mode édition → boutons `Save` (icon `Save`) et `Cancel` (icon `X`), indicateur `saving`. Positionnés en haut à droite de la section viewer (overlay, `absolute top-2 right-2`).
  8. **Raccourci `E`** : `useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'E' && !e.ctrlKey && !e.metaKey && mode === 'read' && !!path) setMode('edit'); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [mode, path])`.
  9. **Raccourci `Ctrl+S`** : `useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && mode === 'edit') { e.preventDefault(); handleSave(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [mode, dirtyContent, path])`.
- **Tests** (Vitest + Testing Library, intégration, `StoryViewer.test.tsx`) :
  - Mode lecture → bouton Éditer visible, pas de textarea
  - Clic Éditer → textarea visible avec le corps markdown uniquement (frontmatter absent de la textarea)
  - Clic Annuler sans modification → retour lecture immédiat (pas de dialog)
  - Clic Annuler avec modification → AlertDialog (3 boutons)
  - Clic Ignorer dans AlertDialog → retour lecture, contenu non modifié
  - Mock `WriteArtifact` → succès : retour lecture ; erreur : toast visible + textarea conservée

---

## N — Norms

- **Logging** : pas de `console.*` dans les composants React ; les erreurs Go sont
  remontées via `return error` et affichées côté frontend via `useToast`.
- **Sécurité** : `dangerouslySetInnerHTML` utilisé uniquement pour le HTML produit
  par `shiki` (source contrôlée — résultat d'un highlighter local, pas de contenu
  réseau) ; jamais sur le contenu brut de l'artefact.
- **Tests** : Testing Trophy — unit sur `splitIntoSections`, `detectDocumentKind`,
  `sectionStorageKey`, `persistSectionState` ; intégration sur `CodeBlock`,
  `CollapsibleSection`, `StoryViewer` ; pas d'e2e pour cette story.
- **Nommage** : composants en PascalCase (`CodeBlock`, `CollapsibleSection`) ;
  fonctions helpers en camelCase ; tests dans le même répertoire que le composant
  (`*.test.tsx`).
- **Imports** : `shiki` en dynamic import uniquement — interdit en import statique
  (bloquerait le bundle initial).
- **Accessibilité** : le bouton Copier doit avoir un `aria-label` ; les `<Collapsible.Trigger>`
  doivent avoir un attribut `aria-expanded` (fourni par Radix automatiquement).
- **TypeScript** : `tsc -b frontend` doit passer sans erreur après chaque opération.

---

## S — Safeguards

- **Sécurité**
  - `WriteArtifact` doit appliquer le même path-traversal guard que `ReadArtifact`
    (`filepath.Abs` + `hasYukkiPrefix`) — interdit de le contourner même pour les tests.
  - `dangerouslySetInnerHTML` interdit sur tout contenu provenant directement du fichier
    artefact ; uniquement sur l'HTML produit par `shiki.codeToHtml()`.
  - Taille maximale du contenu à écrire : 1 MB — rejeter avec une erreur descriptive.
- **Données**
  - `WriteArtifact` refuse si le fichier n'existe pas (`os.ErrNotExist`) —
    jamais de création silencieuse de fichier hors du cycle SPDD normal.
  - Le frontmatter n'est **jamais** exposé à l'édition directe dans la textarea ;
    `buildFullContent` le réinjecte de manière transparente avant écriture disque.
    Ne pas crasher si `parseSimpleYaml` retourne un objet vide après rechargement.
- **Performance**
  - Import de `shiki` obligatoirement en dynamic import (`() => import('shiki')`) —
    interdit en import statique en tête de fichier.
  - Ne pas appeler `codeToHtml` en dehors d'un `useEffect` ou d'une fonction async —
    interdit dans le render path synchrone.
- **Périmètre**
  - Ne pas modifier `useArtifactsStore` ni `HubList` dans cette story — les
    interactions sont gérées via l'état local de `StoryViewer`.
  - Ne pas implémenter de CodeMirror, Monaco, ou éditeur split-pane dans cette story —
    reporté en UI-011.
  - Ne pas créer de nouveaux bindings Go autres que `WriteArtifact`.

---

## Changelog

| Date | Auteur | Modification |
|---|---|---|
| 2026-05-06 | canvas initial | Génération par `/yukki-reasons-canvas` |
| 2026-05-06 | prompt-update | Frontmatter exclu de la textarea (lecture seule via FrontmatterHeader) ; `buildFullContent` réinjecte le frontmatter à la sauvegarde ; `contentRef` tracé dans le composant. Comportement modifié : textarea affiche uniquement le corps markdown. |
