---
id: UI-014h
slug: universal-template-driven-editor
story: .yukki/stories/UI-014h-universal-template-driven-editor.md
status: draft
created: 2026-05-08
updated: 2026-05-08
---

# Analyse — SpddEditor pilote son rendu depuis le template de l artefact

> Contexte strategique pour la story `UI-014h-universal-template-driven-editor`.
> Produit par `/yukki-analysis` a partir d un scan cible du codebase.
> Ne pas dupliquer ni la story ni le canvas REASONS.

## Mots-cles metier extraits

`EditState`, `ParsedTemplate`, `parseArtifactContent`, `parseTemplate`,
`serializeArtifact`, `detectArtifactType`, `templateNameForType`,
`SpddDocument`, `SpddTOC`, `SpddHeader`, `SECTIONS`, `StoryDraft`,
`selectedPath`, `WriteArtifact`, `ReadArtifact`

## Concepts de domaine

### Existants (deja dans le code)

- **`SECTIONS` / `SectionKey`** -- `frontend/src/components/spdd/sections.ts`
  Tableau statique de 8 `SpddSection` (fm, bg, bv, si, so, ac, oq, no).
  Utilise comme source de verite par `SpddTOC` (liste des entrees) et
  `SpddDocument` (iteration de rendu). Hard-code pour les stories uniquement --
  contrainte bloquante pour UI-014h.

- **`StoryDraft` / `useSpddEditorStore`** -- `frontend/src/stores/spdd.ts`
  Store Zustand central. Agregat draft story + mode (wysiwyg|markdown) + etat
  AI + warnings parser. `SpddHeader`, `SpddDocument`, `SpddInspector`,
  `useAutoSave` lisent tous ce store directement. Le couplage est fort et
  pervasif -- une migration complete vers `EditState` dans cette story casserait
  l AI Assist et l auto-save `DraftSave`.

- **`ParsedTemplate` + `EditState`** -- `frontend/src/lib/templateParser.ts`
  + `frontend/src/lib/genericSerializer.ts`
  Couche generique deja livree (UI-014g, 24 tests verts). `parseTemplate(raw)`
  produit `ParsedTemplate { fmSpecs, sections }`. `parseArtifactContent(raw,
  template)` produit `EditState { fmValues, sections }`. `serializeArtifact`
  pour le round-trip. Gere les sections orphelines. Sans dependance de store
  -- pure functions.

- **`detectArtifactType(id)` + `templateNameForType(type)`** --
  `frontend/src/lib/templateParser.ts`
  Detecte le type par prefixe d ID (`INBOX` -> `inbox`, `EPIC` -> `epic`,
  tout le reste -> `story`). Limite critique : les artefacts d analyse et de
  canvas partagent le meme prefixe que les stories (ex. `UI-014h` detecte
  `story` meme s il est dans `.yukki/analysis/`). La detection doit etre
  completee par la lecture du chemin du fichier.

- **`StoryViewer`** -- `frontend/src/components/hub/StoryViewer.tsx`
  Composant existant (WorkflowDrawer) qui a deja implemente le chargement
  template : lit `selectedPath`, derive le type, charge le template via
  `ReadArtifact`, construit `EditState`, utilise `TemplatedEditor` en mode
  edit. C est la reference d implementation. Continue d exister pour
  `WorkflowDrawer` -- ne pas supprimer dans UI-014h.

- **`WriteArtifact(path, content)` / `ReadArtifact(path)`** --
  Bindings Wails deja utilises par `StoryViewer`. `ReadArtifact` prend un
  chemin absolu, retourne le contenu brut. `WriteArtifact` prend chemin +
  contenu string. Pas de validation cote Go.

- **`useAutoSave`** -- `frontend/src/hooks/useAutoSave.ts`
  Appelle `DraftSave` (backend, type story) toutes les 2s. Fortement couple
  a `StoryDraft`. Doit etre desactive (enabled=false) quand `editState` est
  non-null pour eviter d ecraser le fichier generique avec du contenu story.

### Nouveaux (a introduire)

- **`editState: EditState | null` + `parsedTemplate: ParsedTemplate | null`**
  State local dans `SpddEditor` (useState). Coexiste avec `StoryDraft` :
  non-null des qu un template a ete charge. Source de verite pour le rendu
  dynamique des sections. `StoryDraft` reste pour l AI Assist et
  `useAutoSave` (migration = story ulterieure).

- **Detection de type par chemin** -- fonction `detectArtifactTypeFromPath`
  a ajouter dans `templateParser.ts`. Inspecte le segment de repertoire
  du chemin absolu (`.yukki/stories/` -> `story`, `.yukki/analysis/` ->
  `analysis`, `.yukki/prompts/` -> `canvas`). Complete `detectArtifactType`
  sans le remplacer.

- **Derivation du chemin template** -- utilitaire `templatePathFor(artifactPath,
  type)` extrait la racine `.yukki/` depuis le chemin absolu de l artefact
  et construit `.yukki/templates/<name>.md`. Deja code de facon adhoc dans
  `StoryViewer` (via `lastIndexOf('/.yukki/')`). A extraire dans
  `templateParser.ts` pour partager avec `SpddEditor`.

## Approche strategique

Pour resoudre le rendu hard-code de `SpddEditor` (limite aux 8 sections
stories), on choisit d **ajouter `editState: EditState | null` comme state
local dans `SpddEditor`** et de parametrer `SpddDocument` + `SpddTOC` pour
qu ils consomment soit les `SECTIONS` statiques (si `editState` est null),
soit les sections de l `EditState` (si non-null) -- plutot que de migrer
entierement le store `spdd.ts` de `StoryDraft` vers `EditState` des maintenant,
pour livrer rapidement un rendu correct sur tous les types d artefacts sans
casser l AI Assist ni l auto-save CORE-007, en acceptant une coexistence
temporaire des deux modeles.

**Alternatives ecartees :**

- *Migrer `spdd.ts` entierement vers `EditState` dans cette story* -- trop
  large : AI Assist, auto-save (`DraftSave`), `SpddInspector` sont tous
  couples a `StoryDraft`. Casse ces features sans livrer de valeur
  supplementaire visible.

- *Creer un nouveau store global `useEditStateStore`* -- multiplie les
  sources de verite globalement ; un state local dans `SpddEditor` suffit.

## Modules impactes

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/spdd/SpddEditor.tsx` | fort | modification -- ajout chargement template + `editState` |
| `frontend/src/components/spdd/SpddDocument.tsx` | fort | modification -- sections parametrables depuis `EditState` |
| `frontend/src/components/spdd/SpddTOC.tsx` | moyen | modification -- TOC depuis `EditState.sections` |
| `frontend/src/components/spdd/SpddHeader.tsx` | moyen | modification -- titre/status depuis `EditState.fmValues` |
| `frontend/src/lib/templateParser.ts` | moyen | modification -- ajout `detectArtifactTypeFromPath` + `templatePathFor` |
| `frontend/src/stores/spdd.ts` | faible | modification minimale -- pas de suppression de `StoryDraft` |
| `frontend/src/components/hub/StoryViewer.tsx` | faible | lecture seule -- reference pour la derivation de templatePath |

## Dependances et integrations

- **`ReadArtifact` / `WriteArtifact`** -- bindings Wails (Go package `uiapp`).
  `ReadArtifact(absolutePath)` retourne `string`. `WriteArtifact(absolutePath,
  content)` retourne `void`. Pas de gestion de conflit concurrent cote Go.
- **`parseTemplate` / `parseArtifactContent` / `serializeArtifact`** --
  `frontend/src/lib/templateParser.ts` + `genericSerializer.ts`. Toutes
  deja testees, sans side-effect.
- **Templates `.yukki/templates/*.md`** -- fichiers lus a la demande via
  `ReadArtifact`. Pas de cache -- un appel par chargement d artefact.
- **`useAutoSave`** -- doit etre desactive (`enabled = editState === null`)
  pour eviter le conflit `DraftSave` vs `WriteArtifact`.

## Risques et points d attention

- **Detection de type incorrecte par prefixe** (Integration -- Impact fort,
  Probabilite certaine) -- `detectArtifactType('UI-014h')` retourne `story`
  meme si c est une analyse. Mitigation : implementer
  `detectArtifactTypeFromPath` base sur le segment de repertoire et le
  privilegier dans `SpddEditor`.

- **Conflit auto-save `DraftSave` vs `WriteArtifact`** (Data -- Impact
  moyen, Probabilite certaine) -- `useAutoSave` tourne en arriere-plan. Si
  l artefact ouvert est une inbox ou une analyse, le contenu serialise
  `StoryDraft` ecrase le fichier generique. Mitigation : desactiver via
  `enabled = editState === null`.

- **`SpddInspector` hors contexte pour les types non-story** (Compatibilite
  -- Impact faible, Probabilite certaine) -- L inspecteur affiche des tips
  story-specifiques quel que soit le type ouvert. Mitigation dans cette
  story : masquer l inspecteur (colonne droite) quand `editState !== null`
  et type != story.

- **Sections orphelines** (Data -- Impact moyen, Probabilite faible) --
  `serializeArtifact` appende les sections orphelines a la fin.
  Comportement acceptable et documente dans `genericSerializer.ts`.

- **`ReadArtifact` du template indisponible en mode browser** (Operationnel
  -- Impact faible, Probabilite faible) -- Sans backend Go demarre.
  Mitigation : fallback textarea brut (AC5).

- **Race condition** : deux `ReadArtifact` en parallele (artefact + template)
  et `selectedPath` change avant resolution (Integration -- Impact moyen,
  Probabilite faible). Mitigation : flag `aborted` ou comparaison de
  `selectedPath` dans le `.then()`.

## Cas limites identifies

- **`selectedPath` pointe vers `.yukki/analysis/` ou `.yukki/prompts/`** --
  `detectArtifactType(id)` retourne `story` -> mauvais template. Doit
  retomber sur `detectArtifactTypeFromPath`.

- **Template absent sur le FS** (`ReadArtifact(templatePath)` rejetee) --
  Ex. canvas-reasons ou roadmap. Fallback `editState = null` + textarea
  brut + bandeau d avertissement.

- **`selectedPath` vide** -- Etat initial : afficher ecran vide ou conserver
  `DEMO_STORY`. A trancher en canvas.

- **Artefact sans frontmatter valide** -- `parseArtifactContent` retourne
  `fmValues = {}`. `SpddHeader` doit tolerer `fmValues.title = undefined`.

- **Race condition sur `selectedPath`** -- Promesses en cours retournent
  des donnees stale si le chemin change pendant le chargement.

## Decisions a prendre avant le canvas

- [ ] **State local vs slice store** : `editState` + `parsedTemplate` dans
  `useState` local de `SpddEditor` ou slice de `spdd.ts` ?
  Propose : state local (`useState`) pour limiter les effets de bord.

- [ ] **`useAutoSave` desactive ou remplace** : desactive via
  `enabled = editState === null`, ou remplace par debounce generique appelant
  `WriteArtifact` sur l `EditState` serialise ?
  Propose : desactiver dans cette story ; debounce generique = story separee.

- [ ] **`SpddInspector` : masque ou adapte** pour les types non-story ?
  Propose : masque (colonne droite absente) quand `editState !== null` et
  type != `story`.

- [ ] **Derivation du templatePath** : utilitaire mutualise dans
  `templateParser.ts` ou logique inline dans `SpddEditor` ?
  Propose : extraire dans `templateParser.ts` pour partager avec
  `StoryViewer` (DRY).
