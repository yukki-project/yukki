---
id: UI-014f
slug: spdd-editor-wire-to-backend
story: .yukki/stories/UI-014f-spdd-editor-wire-to-backend.md
analysis: .yukki/analysis/UI-014f-spdd-editor-wire-to-backend.md
status: implemented
created: 2026-05-07
updated: 2026-05-07
---

# Canvas REASONS — Câblage éditeur SPDD → backends Go

> Spécification exécutable. Source de vérité pour `/yukki-generate` et `/yukki-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

### Problème

Les stories UI-014a..e livrent l'éditeur en **full mock** : état local Zustand, validation
JS, LLM simulé, export Blob. CORE-007/008/009 livrent les backends Go correspondants.
Cette story branche les deux côtés : remplace les chemins mock par les vrais appels
Wails, sans modifier l'UX observable.

### Definition of Done

- [ ] `draftToGoPayload(draft)` mappe `StoryDraft` → shape JSON attendu par Go (y compris `sections.no` → `"notes"`).
- [ ] `useValidation(draft)` appelle `StoryValidate` avec debounce 200ms et retourne un `ValidationReport` TypeScript.
- [ ] Les erreurs de `StoryValidate` remplacent les messages de `FM_VALIDATORS` dans `SpddFmForm`.
- [ ] `useSpddSuggest(req)` abonne aux 3 events Wails `spdd:suggest:*` et retourne `{state, streamText, sessionId, durationMs, error, cancel, preview}`.
- [ ] Le bouton "Arrêter" de `AiDiffPanel` appelle `SpddSuggestCancel(sessionId)` via le hook.
- [ ] Le lien "Voir le prompt" de `AiPopover` appelle `SpddSuggestPreview(req)` via le hook et affiche le résultat réel (pas `buildMockPrompt`).
- [ ] `SpddHeader.handleExport` appelle `StoryExport(draft, {Overwrite: false})` — sur succès toast avec le chemin ; sur `ExportConflictError`, ouvre `ExportConflictDialog`.
- [ ] `ExportConflictDialog` affiche `existingPath` + `existingUpdatedAt` et propose `Annuler` / `Écraser`.
- [ ] `RestoreDialogController` appelle `DraftLoad(id)` puis `resetDraft(draft)` à l'acceptation.
- [ ] `mockLlm.ts` et `buildMockPrompt` sont supprimés ; `FM_VALIDATORS` reste pour la réactivité UI.
- [ ] Les appels `window.go` sont guardés par `window.go?.main?.App?.<method>` (pas de crash en dev web sans Wails).

---

## E — Entities

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `GoPayload` | Shape JSON envoyé à tous les bindings Go | mapping de `StoryDraft` (avec `no` → `"notes"`) | value object, produit par `draftToGoPayload` |
| `ValidationReport` (TS) | Miroir de `storyspec.ValidationReport` Go | `errors: FieldError[]`, `FieldError{field, severity, message}` | produit par `StoryValidate`, consommé par `useValidation` |
| `SuggestState` | État courant du streaming | `'idle'|'streaming'|'done'|'error'` | géré dans `useSpddSuggest` |
| `ExportConflictInfo` | Info de conflit retournée par `StoryExport` | `existingPath: string`, `existingUpdatedAt: string` | déclenchée par `StoryExport` quand conflit ; ouvre `ExportConflictDialog` |

### Relations

- `SpddFmForm` ⟶ `useValidation` ⟶ `window.go.main.App.StoryValidate`
- `AiDiffPanel` ⟶ `useSpddSuggest` ⟶ `window.go.main.App.SpddSuggestStart` + events Wails
- `SpddHeader` ⟶ `window.go.main.App.StoryExport` ⟶ `ExportConflictDialog`
- `RestoreDialogController` ⟶ `window.go.main.App.DraftLoad` ⟶ `resetDraft`

---

## A — Approach

**`draftToGoPayload`** : fonction utilitaire pure dans `frontend/src/lib/draftMapper.ts`.
Mappe `StoryDraft` vers un objet JSON Go-compatible, notamment `sections.no → "notes"`.
Réutilisée par tous les hooks et handlers qui envoient un draft au backend.

**`useValidation`** : hook React avec `useEffect` + debounce 200ms qui appelle
`window.go.main.App.StoryValidate(payload)`. Retourne un `ValidationReport` TS (type
local, miroir Go). `SpddFmForm` appelle ce hook à la place de `FM_VALIDATORS` pour les
messages d'erreur affichés.

**`useSpddSuggest`** : hook React autonome, **indépendant du store Zustand**.
Lance `SpddSuggestStart`, s'abonne aux 3 events Wails via `window.runtime.EventsOn`,
nettoie les listeners dans la cleanup. Retourne une interface stable que `AiDiffPanel`
et `AiPopover` consomment directement.

**`ExportConflictDialog`** : composant Radix UI `Dialog` contrôlé par un état local
`conflictInfo` dans `SpddHeader`. Quand `StoryExport` retourne un objet avec
`kind="conflict"`, `conflictInfo` est setté et le dialog s'ouvre.

**`RestoreDialogController`** : déjà créé dans CORE-007, à modifier pour appeler
`DraftLoad(id)` et `resetDraft(loaded)` à l'acceptation.

### Alternatives écartées

| Alternative | Raison de rejet |
|---|---|
| Modifier le store Zustand pour les appels Wails | Store devient dépendant de `window.go` — non testable dans Vitest |
| Importer statiquement `wailsjs/go/main/App.js` | Ces fichiers ne sont à jour qu'après `wails dev` sans `-skipbindings` ; `window.go` dynamique est plus robuste |

---

## S — Structure

| Module | Fichiers | Nature |
|---|---|---|
| `frontend/src/lib` | `draftMapper.ts` | Création |
| `frontend/src/hooks` | `useValidation.ts` | Création |
| `frontend/src/hooks` | `useSpddSuggest.ts` | Création |
| `frontend/src/components/spdd` | `ExportConflictDialog.tsx` | Création |
| `frontend/src/components/spdd` | `SpddFmForm.tsx` | Modification : brancher `useValidation` |
| `frontend/src/components/spdd` | `AiDiffPanel.tsx` | Modification : brancher `useSpddSuggest` |
| `frontend/src/components/spdd` | `AiPopover.tsx` | Modification : `buildMockPrompt` → `preview()` du hook |
| `frontend/src/components/spdd` | `SpddHeader.tsx` | Modification : export réel + `ExportConflictDialog` |
| `frontend/src/components/spdd` | `RestoreDialog.tsx` | Modification : `onRestore` appelle `DraftLoad` |
| `frontend/src/components/spdd` | `mockLlm.ts` | Suppression |

---

## O — Operations

### O1 — `draftMapper.ts` : mapping `StoryDraft` → payload Go

**Module** : `frontend/src/lib`
**Fichier** : `frontend/src/lib/draftMapper.ts`

**Signature** :
```ts
export function draftToGoPayload(draft: StoryDraft): Record<string, unknown>
```

**Comportement** :
1. Retourner un objet avec tous les champs de `StoryDraft` sérialisés pour Go.
2. `sections` : remapper `no` → `"notes"` ; toutes les autres clés sont identiques.
3. `ac` : `readonly MockAcceptanceCriterion[]` → array mutable d'objets plain.
4. `savedAt` : `string | null` → `string | undefined` (`null` → `undefined`, Wails ignore les champs undefined).
5. `modules` : `readonly string[]` → `string[]`.

**Tests** (`draftMapper.test.ts`) :
- `TestDraftToGoPayload_MapsNoToNotes` : `sections.no = "note content"` → `payload.sections.notes = "note content"`, `"no"` absent.
- `TestDraftToGoPayload_NullSavedAt` : `savedAt: null` → `payload.savedAt` est `undefined`.

---

### O2 — `useValidation` : validation FM via `StoryValidate`

**Module** : `frontend/src/hooks`
**Fichier** : `frontend/src/hooks/useValidation.ts`

**Signature** :
```ts
export interface FieldError {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationReport {
  errors: FieldError[];
}

export function useValidation(draft: StoryDraft): ValidationReport
```

**Comportement** :
1. `useEffect` sur `draft` avec debounce 200ms via `setTimeout`.
2. Si `window.go?.main?.App?.StoryValidate` absent → retourner `{errors: []}` (Wails non disponible).
3. Appeler `window.go.main.App.StoryValidate(draftToGoPayload(draft))`.
4. Parser la réponse en `ValidationReport` TS ; setter le state.
5. Cleanup : `clearTimeout`.

**Tests** : mock de `window.go` en Vitest ; vérifier que debounce fonctionne ; vérifier le fallback quand `window.go` est absent.

---

### O3 — `useSpddSuggest` : streaming IA via events Wails

**Module** : `frontend/src/hooks`
**Fichier** : `frontend/src/hooks/useSpddSuggest.ts`

**Signature** :
```ts
export type SuggestState = 'idle' | 'streaming' | 'done' | 'error';

export interface SpddSuggestResult {
  state: SuggestState;
  streamText: string;
  sessionId: string | null;
  durationMs: number | null;
  error: string | null;
  start: (req: SuggestionRequest) => Promise<void>;
  cancel: () => Promise<void>;
  preview: (req: SuggestionRequest) => Promise<string>;
  reset: () => void;
}

export interface SuggestionRequest {
  section: string;
  action: string;
  selectedText: string;
  previousSuggestion?: string;
}

export function useSpddSuggest(): SpddSuggestResult
```

**Comportement de `start(req)`** :
1. Si `state === 'streaming'` → appeler `cancel()` d'abord.
2. Réinitialiser `streamText = ""`, `state = 'streaming'`, `sessionId = null`.
3. Appeler `window.go.main.App.SpddSuggestStart(req)` → stocker `sessionId`.
4. Les events `spdd:suggest:chunk` → `streamText += text` (via `useRef` + setState batché).
5. `spdd:suggest:done` → `state = 'done'`, `durationMs = payload.durationMs`.
6. `spdd:suggest:error` → `state = 'error'`, `error = payload.message`.

**Abonnement events** : `window.runtime.EventsOn("spdd:suggest:chunk", handler)` dans un `useEffect`. Cleanup : `window.runtime.EventsOff("spdd:suggest:chunk")`.

**Guard** : si `window.go?.main?.App?.SpddSuggestStart` absent → `error = "Wails non disponible"`, `state = 'error'`.

**Tests** : mock `window.go` et `window.runtime` en Vitest ; vérifier les transitions d'état.

---

### O4 — `ExportConflictDialog` : dialog de confirmation d'écrasement

**Module** : `frontend/src/components/spdd`
**Fichier** : `frontend/src/components/spdd/ExportConflictDialog.tsx`

**Signature** :
```tsx
export interface ExportConflictInfo {
  existingPath: string;
  existingUpdatedAt: string;
}

interface Props {
  conflict: ExportConflictInfo | null;
  onOverwrite: () => void;
  onCancel: () => void;
}

export function ExportConflictDialog({ conflict, onOverwrite, onCancel }: Props): JSX.Element | null
```

**Comportement** :
- Si `conflict === null` → retourne `null` (non monté).
- Dialog Radix UI (`@radix-ui/react-dialog`) avec :
  - Titre : "La story existe déjà"
  - Description : `Chemin : <existingPath>` + `Modifiée : <formatRelative(existingUpdatedAt)>`
  - Bouton `Annuler` → `onCancel()`
  - Bouton `Écraser` (variant destructive) → `onOverwrite()`

---

### O5 — `SpddHeader` : export réel via `StoryExport`

**Module** : `frontend/src/components/spdd`
**Fichier** : `frontend/src/components/spdd/SpddHeader.tsx`

**Modifications** :
1. Ajouter `conflictInfo: ExportConflictInfo | null` en state local (useState).
2. `handleExport` :
   a. Si `window.go?.main?.App?.StoryExport` absent → fallback Blob download (guard Wails).
   b. Appeler `window.go.main.App.StoryExport(draftToGoPayload(draft), {Overwrite: false})`.
   c. Succès → toast `"Story sauvée — <result.path>"`.
   d. Erreur avec `error.existingPath` → setConflictInfo + ouvrir `ExportConflictDialog`.
   e. Autre erreur → toast `variant="destructive"`.
3. `handleOverwrite` : appeler `StoryExport(..., {Overwrite: true})`, fermer dialog, toast succès.
4. Monter `<ExportConflictDialog conflict={conflictInfo} onOverwrite={handleOverwrite} onCancel={() => setConflictInfo(null)} />`.
5. Supprimer le `console.info` mock + le Blob download (remplacé par le vrai export).

---

### O6 — `AiDiffPanel` + `AiPopover` : brancher `useSpddSuggest`

**Module** : `frontend/src/components/spdd`
**Fichiers** : `AiDiffPanel.tsx`, `AiPopover.tsx`

**`AiDiffPanel` modifications** :
1. Accepter `suggestResult: SpddSuggestResult` en prop (passé depuis `SpddEditor`).
2. Remplacer `aiPhase === 'generating'` / `aiSuggestion` par `suggestResult.state` / `suggestResult.streamText`.
3. Bouton "Arrêter" → `suggestResult.cancel()`.
4. Bouton "↻ Régénérer" → `suggestResult.start({...req, previousSuggestion: suggestResult.streamText})`.
5. Bouton "Accepter" → appelle `acceptSuggestion()` du store (inchangé) avec `suggestResult.streamText`.

**`AiPopover` modifications** :
1. Remplacer `buildMockPrompt` par appel à `suggestResult.preview(req)` (async).
2. Afficher le résultat réel dans le dialog "Voir le prompt".
3. `triggerAiAction` → appeler `suggestResult.start(req)` à la place de l'action mock.

**`SpddEditor` modifications** :
1. Instancier `const suggestResult = useSpddSuggest()` au niveau du composant.
2. Passer `suggestResult` à `AiDiffPanel` et `AiPopover` en prop.

---

### O7 — `RestoreDialog` : câbler `DraftLoad` + `resetDraft`

**Module** : `frontend/src/components/spdd`
**Fichier** : `frontend/src/components/spdd/RestoreDialog.tsx`

**Modification de `RestoreDialogController`** :
```tsx
// onRestore handler :
const handleRestore = async (id: string) => {
  const go = (window as any).go;
  if (go?.main?.App?.DraftLoad) {
    const loaded = await go.main.App.DraftLoad(id);
    useSpddEditorStore.getState().resetDraft(mapGoToDraft(loaded));
  }
  setOpen(false);
};
```

Ajouter `mapGoToDraft(goPayload)` dans `draftMapper.ts` — inverse de `draftToGoPayload`.

---

### O8 — Suppression de `mockLlm.ts`

**Module** : `frontend/src/components/spdd`
**Fichier** : `frontend/src/components/spdd/mockLlm.ts`

Supprimer le fichier. Mettre à jour tous les imports :
- `AiPopover.tsx` : supprimer import `AI_ACTIONS` de `mockLlm` → importer depuis une nouvelle constante locale ou depuis `promptbuilder` (copie TS des labels).
- `AiDiffPanel.tsx` : supprimer import `AI_ACTIONS`.
- `spdd.ts` store : supprimer import `mockLlm, mockDelay, AiActionType`.

Ajouter `AI_ACTIONS` constant dans un nouveau fichier `frontend/src/components/spdd/aiActions.ts` pour découpler de `mockLlm`.

---

## N — Norms

- **TypeScript strict** : pas de `any` sauf pour le guard `(window as any).go`.
- **Guard Wails systématique** : chaque appel `window.go` précédé de `window.go?.main?.App?.<method>`.
- **Vitest** : hooks testés avec mock de `window.go` et `window.runtime`.
- **Pas de logique métier dans les composants** : les handlers `handleExport`, `handleOverwrite` restent dans `SpddHeader` — pas dans le store.
- **`draftToGoPayload` réutilisé partout** : jamais de mapping inline dans un composant.
- **Cleanup events Wails** : `useEffect` retourne toujours une fonction de cleanup `EventsOff`.

---

## S — Safeguards

- **Ne jamais appeler `window.go` sans guard** : `window.go?.main?.App?.method` — les hooks doivent gérer le cas Wails absent (mode web dev).
- **Ne jamais passer `sections.no` au backend sans mapping** : toujours passer par `draftToGoPayload`.
- **Ne jamais supprimer `FM_VALIDATORS`** : ils restent en validation UI locale (réactivité immédiate) ; `StoryValidate` complète avec validations supplémentaires Go.
- **Ne jamais ouvrir `ExportConflictDialog` sur une erreur générique** : uniquement si la réponse d'erreur contient `existingPath` (shape `ExportConflictInfo`).
- **Cleanup `EventsOff` systématique** : le `useEffect` de `useSpddSuggest` retourne toujours un cleanup — sinon fuites mémoire sur unmount.

---

## Open Questions

- [ ] **`AI_ACTIONS` labels** : après suppression de `mockLlm.ts`, les labels FR des actions (`"Améliorer la lisibilité"` etc.) doivent venir d'une source. Proposition : dupliquer dans `aiActions.ts` (ils sont stables, aucune dépendance Go). Si le backend retourne ces labels un jour, une refactorisation est possible.
- [ ] **`AiPhase` dans le store** : le store Zustand contient encore `aiPhase`, `aiSuggestion` etc. Ces champs deviendront redondants avec `useSpddSuggest`. À nettoyer dans `/yukki-sync` après que le câblage soit confirmé fonctionnel — hors scope UI-014f.
