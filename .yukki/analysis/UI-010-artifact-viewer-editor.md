---
id: UI-010
slug: artifact-viewer-editor
title: Artefact viewer — markdown riche, sections pliables, éditeur inline
story: .yukki/stories/UI-010-artifact-viewer-editor.md
status: reviewed
created: 2026-05-06
updated: 2026-05-06
---

# Analyse — Artefact viewer — markdown riche, sections pliables, éditeur inline

> Contexte stratégique pour la story `UI-010-artifact-viewer-editor`. Produit
> par `/yukki-analysis` à partir d'un scan ciblé du codebase.
> Ne dupliquer ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`StoryViewer`, `react-markdown`, `prose`, `shiki`, `tailwindcss/typography`,
`WriteArtifact`, `ReadArtifact`, `frontmatter`, `textarea`, `localStorage`,
`sections`, `remark-gfm`, `rehype`

## Concepts de domaine

### Existants (déjà dans le code)

- **`StoryViewer`** — `frontend/src/components/hub/StoryViewer.tsx`. Composant
  React unique responsable de la lecture d'artefacts. Charge via `ReadArtifact(path)`,
  scinde le frontmatter du corps via `splitFrontmatter()`, rend avec `<ReactMarkdown>`.
  Actuellement monolithique (logique de chargement, parsing frontmatter et rendu dans
  un seul fichier). Contrainte : lit `selectedPath` depuis `useArtifactsStore`.

- **`ReadArtifact`** (Integration point) — `internal/uiapp/app.go:273`. Binding Wails
  qui retourne le contenu d'un fichier. Invariant de sécurité : refuse tout path ne
  résolvant pas sous `.yukki/` d'un projet ouvert (path-traversal guard). Retourne
  `string` ou `error`.

- **`Frontmatter`** (Value Object) — défini localement dans `StoryViewer.tsx`.
  `{ scalars: Record<string, string>, lists: Record<string, string[]> }`. Parser
  manuel (`parseSimpleYaml`) — gère les scalaires YAML et les listes mais pas les
  objets imbriqués. Extracte `id`, `title`, `status`, `slug`, `modules`.

- **`react-markdown@9` + `remark-gfm@4`** (Integration point) — `frontend/package.json`.
  Stack de rendu Markdown, extensible via des plugins `rehype-*`. Supporte nativement
  les custom renderers par `components`. Déjà en place ; les blocs `<code>` sont
  rendus mais sans coloration.

- **`useArtifactsStore`** — `frontend/src/stores/artifacts.ts`. Zustand store exposant
  `selectedPath` et `setSelectedPath`. Point d'entrée : quand `selectedPath` change,
  `StoryViewer` déclenche un `useEffect` et recharge via `ReadArtifact`.

### Nouveaux (à introduire)

- **`WriteArtifact`** (Integration point) — à créer dans `internal/uiapp/app.go`.
  Pendant symétrique de `ReadArtifact` : reçoit `(path, content string)`, applique
  le même path-traversal guard, écrit sur disque via `os.WriteFile`. Refuse si le
  fichier n'existe pas encore (`os.Stat` guard — MVP : modification uniquement, pas
  création).

- **`DocumentKind`** (Value Object) — type de document déduit du préfixe `id`
  frontmatter (`INBOX-*`, `UI-*`/`CORE-*`/…, canvas REASONS détecté par présence de
  `## R —`). Détermine le comportement d'affichage : layout compact, rendu standard
  avec sections pliables, ou canvas avec section `## O —` repliée par défaut si > 3
  opérations.

- **`ViewerMode`** (Value Object) — `'read' | 'edit'`. État local React. Piloté
  par bouton et raccourci `E`. En mode `edit` : textarea pleine largeur affichant le
  markdown brut (frontmatter inclus).

- **`SectionState`** (Value Object) — ensemble des titres de section `##` repliées,
  persisté en `localStorage` sous la clé `yukki:sections:<absolutePath>`. Reset à
  chaque changement de `selectedPath`. Source de vérité pour le rendu pliable.

- **`ArtifactWritten`** (Domain Event) — émis localement après un appel `WriteArtifact`
  réussi. Déclenche : repasser en mode `read` + recharger via `ReadArtifact(path)`.

## Approche stratégique

Voir [`.yukki/methodology/decisions.md`](.yukki/methodology/decisions.md) pour le
format Y-Statement.

Pour permettre la lecture et l'édition d'artefacts SPDD sans quitter yukki, **on
étend `StoryViewer.tsx` avec des plugins rehype (shiki, copy-button) et un mode
édition textarea bascule**, plutôt que de remplacer le composant par un éditeur
WYSIWYG (CodeMirror) ou de créer un composant entièrement séparé, pour atteindre
**la livraison la plus rapide avec le moins de nouvelles dépendances**, en acceptant
**un mode édition sans coloration syntaxique inline** (textarea brut).

**Alternatives écartées :**
- *CodeMirror / Monaco* — split-pane, poids (> 500 KB), intégration Wails non
  triviale ; reporté en UI-011 si la textarea se révèle insuffisante.
- *Composant `MdxEditor` tiers* — n'existe pas en tant que drop-in compatible
  react-markdown@9 ; remplacement complet du pipeline de rendu, scope trop large.
- *Recharger via `refresh()` de `useArtifactsStore` après save* — inutile, déclenche
  une liste entière + re-sélection ; `ReadArtifact(path)` direct suffit.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/hub/StoryViewer.tsx` | fort | modification majeure (mode lecture/édition, sections, rendu riche) |
| `frontend/src/components/hub/` (nouveaux) | fort | création : `CollapsibleSection.tsx`, `CodeBlock.tsx` |
| `internal/uiapp/app.go` | moyen | modification : ajout `WriteArtifact` |
| `frontend/wailsjs/go/main/App.js` + `App.d.ts` | faible | modification : stub `WriteArtifact` |
| `frontend/tailwind.config.js` | faible | déjà modifié (typography plugin, non committé) |

## Dépendances et intégrations

- **`react-markdown@9` + `remark-gfm@4`** — existant ; extensible via `rehype`
  plugins et `components` override pour `<code>`.
- **`shiki@^1`** (à installer) — highlighter sélectionné ; chargement async
  obligatoire (dynamic import) car ~200 KB. Pont vers react-markdown :
  composant custom `<CodeBlock>` qui appelle `codeToHtml()` de shiki.
- **`@radix-ui/react-collapsible`** (à installer, décision D1 tranchée) — non
  présent dans `package.json` mais cohérent avec `@radix-ui/react-dialog`,
  `@radix-ui/react-dropdown-menu` etc. déjà présents. État contrôlé nécessaire
  pour la persistance `localStorage`.
- **`localStorage` API** — standard browser disponible dans le webview Wails 2
  (Chromium sur Windows/macOS/Linux). Non-critique : perte de l'état au reset
  de l'app est acceptable.
- **`os.WriteFile`** (Go stdlib) — pattern identique à `os.ReadFile` dans
  `ReadArtifact` ; pas de nouvelle dépendance Go.

## Risques et points d'attention

Voir [`.yukki/methodology/risk-taxonomy.md`](.yukki/methodology/risk-taxonomy.md)
pour les 6 catégories.

- **Sécurité (Tampering)** — Impact moyen, probabilité faible. `WriteArtifact`
  peut modifier n'importe quel fichier `.yukki/`. Si un artefact contient un
  path traversal dans son frontmatter et qu'un bout de code lit ce path pour
  le repasser au binding, la guard serait contournée. **Mitigation** : même
  invariant que `ReadArtifact` — `filepath.Abs` + `hasYukkiPrefix` ; limiter
  la taille du contenu à 1 MB.

- **Performance / Reliability** — Impact moyen, probabilité moyenne. `shiki`
  (~200 KB) chargé synchrone bloquerait le rendu initial. Sur un canvas de
  600+ lignes, le highlighting de toutes les occurrences à la fois peut
  produire une pause visible. **Mitigation** : dynamic import (`() => import('shiki')`),
  rendu `<pre><code>` brut en attendant le chargement, puis hydratation.

- **Intégration externe** — Impact moyen, probabilité faible. L'API shiki 1.x
  (`codeToHtml`, `createHighlighter`) diffère de 0.x. Le pont exact avec
  `react-markdown@9` (composant `code`) doit être validé par un spike rapide.
  **Mitigation** : tester en isolation avant de l'intégrer dans `StoryViewer`.

- **Data** — Impact faible, probabilité moyenne. Le textarea expose le
  frontmatter brut à l'édition. Un utilisateur peut produire un frontmatter
  YAML invalide → `splitFrontmatter` et `parseSimpleYaml` renvoyent un objet
  vide → le header frontmatter disparaît après rechargement. **Mitigation** :
  pas de validation YAML en MVP (hors scope) ; toast d'avertissement si le
  rechargement post-save ne parse aucun scalar.

- **Compatibilité** — Impact faible, probabilité faible. `localStorage` sur
  Wails 2 : le webview embedded est persistant entre sessions (Chromium profile
  local). Si l'utilisateur ouvre yukki sur un autre poste, les états pliés ne
  sont pas synchronisés. **Mitigation** : usage non-critique (UI state).

## Cas limites identifiés

Voir [`.yukki/methodology/edge-cases.md`](.yukki/methodology/edge-cases.md)
pour BVA + EP + checklist 7 catégories.

- **Artefact sans frontmatter** (BVA — boundary `---` absent) : `splitFrontmatter`
  retourne `body = raw`. En mode édition, textarea affiche le raw complet. Pas de
  régression — comportement existant. Le bouton Éditer reste accessible.

- **Contenu vide** (BVA — min = 0 octets) : `WriteArtifact(path, "")` écrit un
  fichier vide. Autoriser (un utilisateur peut vouloir effacer un brouillon).
  En lecture, le viewer affiche l'état vide (pas de header, pas de body).

- **Canvas REASONS long** (EP — gros artefact > 600 lignes) : highlighting
  synchrone de tout le contenu. Risque de gel UI. La section `## O —` repliée
  par défaut réduit le volume rendu ; lazy shiki réduit le blocage. À valider en
  test manuel.

- **Modification non enregistrée + changement de sélection** (EP — dirty state) :
  l'utilisateur est en mode édition, clique sur un autre artefact dans `HubList`.
  `selectedPath` change dans `useArtifactsStore`. Le `useEffect` de `StoryViewer`
  se déclenche et recharge. Dialog de confirmation requis (AC story) avant que
  l'effet se déclenche.

- **Fichier supprimé entre lecture et écriture** (EP — race condition) :
  `WriteArtifact` appelle `os.Stat` avant `os.WriteFile`. Si le fichier est
  absent, retourner une erreur descriptive. En pratique, `os.WriteFile` crée
  le fichier si le répertoire existe — décision D3 à trancher.

## Décisions à prendre avant le canvas

- [x] **D1 — Sections pliables** → **`@radix-ui/react-collapsible`** : état
  contrôlé, cohérent avec les autres primitives Radix déjà présentes dans le
  projet, et facilite la persistance localStorage (clé `yukki:sections:<path>`).

- [x] **D2 — Pont shiki ↔ react-markdown** → **composant custom `code`** appelant
  `shiki.codeToHtml()` et injectant via `dangerouslySetInnerHTML`. Pattern documenté
  react-markdown v9, async-friendly, sans dépendance `@shikijs/rehype`.

- [x] **D3 — `WriteArtifact`** → **modifier uniquement** : `os.Stat` guard avant
  `os.WriteFile` — retourner une erreur si le fichier n'existe pas encore
  (`os.ErrNotExist`). Pas de création silencieuse.
