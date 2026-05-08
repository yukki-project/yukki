---
id: UI-014f
slug: spdd-editor-wire-to-backend
story: .yukki/stories/UI-014f-spdd-editor-wire-to-backend.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Câblage de l'éditeur SPDD aux backends Go

> Contexte stratégique pour `UI-014f-spdd-editor-wire-to-backend`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase.

## Mots-clés métier extraits

`DraftSave`, `DraftLoad`, `DraftList`, `StoryExport`, `StoryValidate`,
`SpddSuggestStart`, `SpddSuggestCancel`, `SpddSuggestPreview`,
`useAutoSave`, `RestoreDialog`, `mockLlm`, `validation.ts`,
`spdd:suggest:chunk`, `spdd:suggest:done`, `spdd:suggest:error`,
`ExportOptions`, `ExportConflictError`, `window.go`

## Concepts de domaine

> Selon [`.yukki/methodology/domain-modeling.md`](./../methodology/domain-modeling.md)

### Concepts existants

| Brique | Nom | Où vit-il | Contrainte connue |
|---|---|---|---|
| Integration point | `useAutoSave` | `frontend/src/hooks/useAutoSave.ts` | Debounce 2s → `window.go.main.App.DraftSave` déjà implémenté — câblé dans CORE-007, mais bindings Wails (`wailsjs/go/main/App.js`) pas encore régénérés |
| Integration point | `RestoreDialog` + `RestoreDialogController` | `frontend/src/components/spdd/RestoreDialog.tsx` | Écoute l'event Wails `draft:restore-available` ; `onRestore` doit appeler `DraftLoad` — non câblé |
| Value Object | `StoryDraft` | `frontend/src/components/spdd/types.ts` | Type front ; les champs `sections` utilisent `ProseSectionKey` ; `savedAt: string|null` ; correspondance avec Go `draft.Draft` à maintenir |
| Operation | `validateFmField` | `frontend/src/components/spdd/validation.ts` | Validation JS locale ; à remplacer par appel `StoryValidate` avec debounce 200ms |
| Operation | `mockLlm` | `frontend/src/components/spdd/mockLlm.ts` | LLM simulé côté JS ; à remplacer par `SpddSuggestStart` avec écoute events Wails |
| Operation | `handleExport` dans `SpddHeader` | `frontend/src/components/spdd/SpddHeader.tsx` | Mock Blob download ; à remplacer par `StoryExport` + dialog conflit + toast chemin |
| Value Object | `buildMockPrompt` dans `AiPopover` | `frontend/src/components/spdd/AiPopover.tsx` | Prompt statique côté front ; à remplacer par `SpddSuggestPreview` |
| Integration point | Wails bindings | `frontend/wailsjs/go/main/App.js` | Générés par `wails dev` sans `-skipbindings` ; les nouveaux bindings CORE-007/008/009 ne sont **pas encore** présents |

### Concepts nouveaux

| Brique | Nom | Justification |
|---|---|---|
| Hook | `useSpddSuggest` | Remplace `triggerAiAction` (mock) dans le store ; abonne aux 3 events Wails ; expose `{state, streamText, durationMs, error}` |
| Hook | `useValidation` | Remplace `FM_VALIDATORS` locale ; appelle `StoryValidate` avec debounce 200ms ; retourne `ValidationReport` |
| Component | `ExportConflictDialog` | Dialog Radix UI "La story existe déjà" avec `Annuler` / `Écraser` — affiché quand `StoryExport` retourne une `ExportConflictError` |
| Value Object | `ValidationReport` (TS) | Miroir de `storyspec.ValidationReport` Go : `{errors: Array<{field, severity, message}>}` |

**Invariant** : `mockLlm.ts`, `buildMockPrompt`, et `FM_VALIDATORS` JS peuvent coexister pendant la migration — ils sont **supprimés seulement** quand le câblage réel est vérifié fonctionnel en dev (pas une suppression préalable qui casse l'UX).

**Invariant 2** : les bindings Wails (`window.go.main.App.*`) sont consommés directement via `window.go` (pattern déjà établi dans `useAutoSave`) — pas d'import statique des fichiers `wailsjs/` générés (ils ne sont à jour qu'après `wails dev` sans `-skipbindings`).

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](./../methodology/decisions.md)

Pour résoudre le problème du **câblage entre mocks frontend et backends Go** sans casser l'UX existante pendant la migration, on choisit de **créer de nouveaux hooks spécialisés (`useSpddSuggest`, `useValidation`) qui encapsulent les appels Wails** et de **modifier les composants existants pour brancher ces hooks à la place des mocks**, plutôt que de modifier le store Zustand ou de remplacer globalement `mockLlm` par un appel direct dans le store, pour atteindre **l'isolation des dépendances runtime** (le store reste testable sans Wails), en acceptant **une migration incrémentale** (les mocks restent en fallback jusqu'à ce que le câblage soit confirmé fonctionnel).

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Remplacer `mockLlm` dans le store Zustand directement | Le store deviendrait dépendant de `window.go` — non testable, couplage fort |
| Générer les bindings statiquement et les importer | Les bindings auto-générés par Wails cassent lors d'un `wails dev -skipbindings` ; `window.go` dynamique est plus robuste |
| Migrer d'un coup sans période de coexistence | Risque de casser l'UX si un binding est absent ou mal typé ; la coexistence permet de basculer hook par hook |

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend` hooks | Fort | Création : `useSpddSuggest.ts`, `useValidation.ts` |
| `frontend` components | Fort | Modification : `AiDiffPanel.tsx`, `AiPopover.tsx`, `SpddHeader.tsx`, `SpddEditor.tsx` |
| `frontend` components | Fort | Création : `ExportConflictDialog.tsx` |
| `frontend` stores/spdd | Moyen | Modification : supprimer `triggerAiAction` mock + brancher sur `useSpddSuggest` |
| `internal/uiapp` | Faible | Lecture seule : bindings déjà en place (CORE-007/008/009) |

## Dépendances et intégrations

- `window.go.main.App.DraftSave/Load/List` — CORE-007, déjà implémentés côté Go
- `window.go.main.App.StoryValidate` — CORE-007, retourne `ValidationReport`
- `window.go.main.App.SpddSuggestStart/Cancel/Preview` — CORE-008
- `window.go.main.App.StoryExport` — CORE-009
- Events Wails `spdd:suggest:chunk`, `spdd:suggest:done`, `spdd:suggest:error` — CORE-008
- Event Wails `draft:restore-available` — CORE-007 (déjà écouté dans `RestoreDialog`)
- `@radix-ui/react-dialog` — déjà en `package.json` (utilisé dans `RestoreDialog`)

## Risques

> Catégories selon [`.yukki/methodology/risk-taxonomy.md`](./../methodology/risk-taxonomy.md)

| # | Catégorie | Risque | Impact | Proba | Mitigation |
|---|---|---|---|---|---|
| R1 | **Compatibilité** | `window.go` absent en dev web (vitest / navigateur sans Wails) | Haut | Certain | Guard `if (window.go?.main?.App?.SpddSuggestStart)` avant chaque appel — même pattern que `useAutoSave` |
| R2 | **Intégration** | Mapping `StoryDraft` (TS) → `draft.Draft` (Go) : champ `sections.no` vs clé Go `"notes"` | Haut | Moyen | Mapper explicitement dans chaque hook (`no` → `"notes"`) ; test unitaire sur le mapper |
| R3 | **Performance** | `useValidation` debounce 200ms → appels fréquents à `StoryValidate` en frappe rapide | Faible | Faible | Debounce 200ms suffisant ; Wails appels locaux ~1ms |
| R4 | **UX** | L'event `spdd:suggest:chunk` peut arriver après unmount du composant | Moyen | Moyen | Nettoyage des listeners dans le `useEffect` cleanup de `useSpddSuggest` |
| R5 | **Sécurité (STRIDE — Tampering)** | `ExportConflictDialog` : l'utilisateur peut écraser une story existante sans voir la date | Faible | Faible | Afficher `ExistingUpdatedAt` dans le dialog avant la confirmation |

## Cas limites

> Catégories selon [`.yukki/methodology/edge-cases.md`](./../methodology/edge-cases.md)

| # | Catégorie | Cas limite | Attendu |
|---|---|---|---|
| E1 | **Valeurs limites** | `streamText` reçu avant que le composant soit monté (race condition event/mount) | `useSpddSuggest` stocke les chunks dans un `ref`, pas dans le state, jusqu'au premier render post-chunk |
| E2 | **Partition d'équivalence** | `StoryExport` retourne une `ExportConflictError` (pas une erreur générique) | `ExportConflictDialog` s'affiche ; les autres erreurs → toast `variant="destructive"` |
| E3 | **Concurrence** | Deux clics rapides "Arrêter" → `SpddSuggestCancel` appelé deux fois | Le deuxième appel retourne une erreur Go "session not found" ignorée silencieusement |
| E4 | **Contenu** | Draft avec `sections.no` (Notes) → mapping vers clé Go `"notes"` | Mapper dans `draftToGoPayload` ; test unitaire |
| E5 | **Restauration** | `DraftLoad` appelé mais le draft retourné a un `id` différent du store | `resetDraft` est appelé avec le draft chargé — le store remplace le draft en mémoire |

## Décisions à prendre avant le canvas

1. **Mapping `no` → `notes`** : créer une fonction `draftToGoPayload(draft: StoryDraft)` dans un fichier `utils/draftMapper.ts` — réutilisée par `useAutoSave`, `useValidation`, `useSpddSuggest`, `StoryExport`. Décision ferme.

2. **Suppression des mocks** : `mockLlm.ts` et `buildMockPrompt` supprimés **après** que le câblage réel soit fonctionnel (pas avant la génération du code). `FM_VALIDATORS` reste dans `validation.ts` comme fallback de parsing côté front (lecture seule pour l'UI immédiate, avant que `StoryValidate` réponde). Décision : **conserver `FM_VALIDATORS` pour la réactivité UI** ; `StoryValidate` enrichit avec des validations supplémentaires.

3. **`ExportConflictDialog`** : composant séparé de `SpddHeader` (pas un state local dans `SpddHeader`) — contrôlé par un état `conflictInfo: ExportConflictError | null` dans `SpddHeader`. Décision ferme.

4. **`useSpddSuggest` indépendant du store Zustand** : le hook retourne `{state, streamText, sessionId, durationMs, error, cancel, preview}` — le store Zustand n'est pas modifié pour le streaming. Le composant `AiDiffPanel` branche le hook directement. Décision ferme.
