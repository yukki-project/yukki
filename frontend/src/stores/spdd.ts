// UI-014a — SPDD editor store.
//
// Holds the (mocked) draft, the active section and the WYSIWYG/Markdown
// view mode. Selectors are pure functions exported alongside the hook so
// they are unit-testable without a React tree.

import { create } from 'zustand';
import { DEMO_STORY } from '@/components/spdd/mockStory';
import { SECTIONS } from '@/components/spdd/sections';
import type {
  ProseSectionKey,
  SectionKey,
  SectionStatus,
  StoryDraft,
  ViewMode,
} from '@/components/spdd/types';

export interface SpddEditorState {
  draft: StoryDraft;
  activeSection: SectionKey;
  viewMode: ViewMode;
  setActiveSection: (key: SectionKey) => void;
  setViewMode: (mode: ViewMode) => void;
  resetDraft: (draft: StoryDraft) => void;
}

export const useSpddEditorStore = create<SpddEditorState>()((set) => ({
  draft: DEMO_STORY,
  activeSection: 'bg',
  viewMode: 'wysiwyg',
  setActiveSection: (key) => set({ activeSection: key }),
  setViewMode: (mode) => set({ viewMode: mode }),
  resetDraft: (draft) => set({ draft, activeSection: 'bg' }),
}));

// --- Selectors --------------------------------------------------------------

function isFmComplete(draft: StoryDraft): boolean {
  return Boolean(
    draft.id &&
      draft.slug &&
      draft.title &&
      draft.status &&
      draft.created &&
      draft.updated &&
      draft.owner &&
      draft.modules.length > 0,
  );
}

function isAcComplete(draft: StoryDraft): boolean {
  return (
    draft.ac.length > 0 &&
    draft.ac.every(
      (ac) => ac.title.trim() && ac.given.trim() && ac.when.trim() && ac.then.trim(),
    )
  );
}

function isProseFilled(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function selectSectionStatus(
  state: SpddEditorState,
  key: SectionKey,
): SectionStatus {
  if (state.activeSection === key) return 'active';
  const meta = SECTIONS.find((s) => s.key === key);
  if (!meta) return 'optional';

  if (key === 'fm') return isFmComplete(state.draft) ? 'done' : 'todo';
  if (key === 'ac') return isAcComplete(state.draft) ? 'done' : 'todo';

  const proseKey = key as ProseSectionKey;
  const filled = isProseFilled(state.draft.sections[proseKey]);
  if (meta.required) return filled ? 'done' : 'todo';
  return 'optional';
}

export function selectRequiredCompleted(state: SpddEditorState): number {
  let n = 0;
  if (isFmComplete(state.draft)) n++;
  if (isProseFilled(state.draft.sections.bg)) n++;
  if (isProseFilled(state.draft.sections.bv)) n++;
  if (isProseFilled(state.draft.sections.si)) n++;
  if (isAcComplete(state.draft)) n++;
  return n;
}

export function selectMissingRequiredLabels(state: SpddEditorState): string[] {
  const missing: string[] = [];
  if (!isFmComplete(state.draft)) missing.push('Front-matter');
  if (!isProseFilled(state.draft.sections.bg)) missing.push('Background');
  if (!isProseFilled(state.draft.sections.bv)) missing.push('Business Value');
  if (!isProseFilled(state.draft.sections.si)) missing.push('Scope In');
  if (!isAcComplete(state.draft)) missing.push('Acceptance Criteria');
  return missing;
}

export function selectAcCompletion(
  state: SpddEditorState,
): { id: string; complete: boolean }[] {
  return state.draft.ac.map((ac) => ({
    id: ac.id,
    complete: Boolean(
      ac.title.trim() && ac.given.trim() && ac.when.trim() && ac.then.trim(),
    ),
  }));
}
