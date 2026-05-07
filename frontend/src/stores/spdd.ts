// UI-014a — SPDD editor store.
//
// Holds the (mocked) draft, the active section and the WYSIWYG/Markdown
// view mode. Selectors are pure functions exported alongside the hook so
// they are unit-testable without a React tree.
//
// UI-014b adds mutations: setFmField, setSection, addAc, removeAc,
// updateAc, duplicateAc.
//
// UI-014c adds: markdownSource (live .md text in MD mode), markdownWarnings,
// switchToMarkdown (serialize draft → MD source), switchToWysiwyg (parse
// MD source → draft), setMarkdownSource (edit in MD mode).

import { create } from 'zustand';
import { DEMO_STORY } from '@/components/spdd/mockStory';
import { SECTIONS } from '@/components/spdd/sections';
import { draftToMarkdown } from '@/components/spdd/serializer';
import { markdownToDraft } from '@/components/spdd/parser';
import type {
  MockAcceptanceCriterion,
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
  // UI-014c
  markdownSource: string;
  markdownWarnings: string[];
  scrollToSection: SectionKey | null;
  setActiveSection: (key: SectionKey) => void;
  setViewMode: (mode: ViewMode) => void;
  resetDraft: (draft: StoryDraft) => void;
  switchToMarkdown: () => void;
  switchToWysiwyg: () => void;
  setMarkdownSource: (src: string) => void;
  clearScrollToSection: () => void;
  // UI-014b mutations
  setFmField: (
    field: keyof Omit<StoryDraft, 'sections' | 'ac' | 'savedAt'>,
    value: string | readonly string[],
  ) => void;
  setSection: (key: ProseSectionKey, value: string) => void;
  addAc: () => void;
  removeAc: (id: string) => void;
  updateAc: (id: string, field: keyof MockAcceptanceCriterion, value: string) => void;
  duplicateAc: (id: string) => void;
}

function nextAcId(acs: readonly MockAcceptanceCriterion[]): string {
  return `AC${acs.length + 1}`;
}

function renumberAcs(acs: readonly MockAcceptanceCriterion[]): MockAcceptanceCriterion[] {
  return acs.map((ac, i) => ({ ...ac, id: `AC${i + 1}` }));
}

export const useSpddEditorStore = create<SpddEditorState>()((set, get) => ({
  draft: DEMO_STORY,
  activeSection: 'bg',
  viewMode: 'wysiwyg',
  markdownSource: '',
  markdownWarnings: [],
  scrollToSection: null,

  setActiveSection: (key) =>
    set((s) => ({
      activeSection: key,
      // In MD mode, signal a scroll-to-section
      scrollToSection: s.viewMode === 'markdown' ? key : null,
    })),

  setViewMode: (mode) => {
    if (mode === 'markdown') get().switchToMarkdown();
    else get().switchToWysiwyg();
  },

  resetDraft: (draft) => set({ draft, activeSection: 'bg', markdownSource: '', markdownWarnings: [] }),

  switchToMarkdown: () =>
    set((s) => ({
      viewMode: 'markdown',
      markdownSource: draftToMarkdown(s.draft),
      markdownWarnings: [],
    })),

  switchToWysiwyg: () =>
    set((s) => {
      const { draft: parsed, warnings } = markdownToDraft(s.markdownSource || draftToMarkdown(s.draft), s.draft);
      return {
        viewMode: 'wysiwyg',
        draft: parsed,
        markdownWarnings: warnings,
        markdownSource: '',
      };
    }),

  setMarkdownSource: (src) => set({ markdownSource: src }),

  clearScrollToSection: () => set({ scrollToSection: null }),

  setFmField: (field, value) =>
    set((s) => ({
      draft: { ...s.draft, [field]: value },
    })),

  setSection: (key, value) =>
    set((s) => ({
      draft: {
        ...s.draft,
        sections: { ...s.draft.sections, [key]: value },
      },
    })),

  addAc: () =>
    set((s) => {
      const newAc: MockAcceptanceCriterion = {
        id: nextAcId(s.draft.ac),
        title: '',
        given: '',
        when: '',
        then: '',
      };
      return { draft: { ...s.draft, ac: [...s.draft.ac, newAc] } };
    }),

  removeAc: (id) =>
    set((s) => {
      const filtered = s.draft.ac.filter((a) => a.id !== id);
      return { draft: { ...s.draft, ac: renumberAcs(filtered) } };
    }),

  updateAc: (id, field, value) =>
    set((s) => ({
      draft: {
        ...s.draft,
        ac: s.draft.ac.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      },
    })),

  duplicateAc: (id) =>
    set((s) => {
      const src = s.draft.ac.find((a) => a.id === id);
      if (!src) return s;
      const copy: MockAcceptanceCriterion = { ...src, id: nextAcId(s.draft.ac) };
      return { draft: { ...s.draft, ac: [...s.draft.ac, copy] } };
    }),
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
