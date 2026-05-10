// UI-014a — SPDD editor store.
//
// UI-014b adds mutations: setFmField, setSection, addAc, removeAc, updateAc, duplicateAc.
// UI-014c adds: markdownSource, markdownWarnings, switchToMarkdown/Wysiwyg.
// UI-014d adds: AI assist state — aiPhase, aiSelection, aiSuggestion, popover pos.
// UI-014f: triggerAiAction/regenerateAi no longer call mockLlm — actual LLM call
//   is delegated to useSpddSuggest in the component layer.

import { create } from 'zustand';
import { DEMO_STORY } from '@/components/spdd/mockStory';
import { HEADING_TO_KEY, SECTIONS } from '@/components/spdd/sections';
import { draftToMarkdown } from '@/components/spdd/serializer';
import { markdownToDraft } from '@/components/spdd/parser';
import type {
  AiPhase,
  AiSelection,
  MockAcceptanceCriterion,
  PopoverPosition,
  ProseSectionKey,
  SectionKey,
  SectionStatus,
  StoryDraft,
  ViewMode,
} from '@/components/spdd/types';
import type { AiActionType } from '@/components/spdd/aiActions';
import type { ParsedTemplate } from '@/lib/templateParser';

export interface SpddEditorState {
  draft: StoryDraft;
  activeSection: SectionKey;
  viewMode: ViewMode;
  // UI-014c
  markdownSource: string;
  markdownWarnings: string[];
  scrollToSection: SectionKey | null;
  // UI-014d
  aiPhase: AiPhase;
  aiSelection: AiSelection | null;
  aiAction: AiActionType | null;
  aiSuggestion: string | null;
  popoverPosition: PopoverPosition | null;
  // UI-019 D1 — flag généralisé "modifications non sauvegardées" lu par
  // SpddHeader pour afficher le badge orange. set à true dans chaque
  // mutation du draft, reset à false uniquement sur succès de WriteArtifact.
  isDirty: boolean;
  setDirty: (next: boolean) => void;

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
  // UI-014d AI actions
  openAiPopover: (selection: AiSelection, pos: PopoverPosition) => void;
  closeAiPopover: () => void;
  triggerAiAction: (action: AiActionType) => void;
  acceptSuggestion: () => void;
  rejectSuggestion: () => void;
  regenerateAi: () => void;
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
  // AI
  aiPhase: 'idle',
  aiSelection: null,
  aiAction: null,
  aiSuggestion: null,
  popoverPosition: null,
  // UI-019 D1
  isDirty: false,
  setDirty: (next) => set({ isDirty: next }),

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

  resetDraft: (draft) => set({
    draft,
    activeSection: 'bg',
    markdownSource: '',
    markdownWarnings: [],
    // Loading a fresh draft from disk = clean slate.
    isDirty: false,
  }),

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

  setMarkdownSource: (src) =>
    set((state) => ({
      markdownSource: src,
      // UI-019b nav-guard fix : éditer en mode markdown était la
      // seule mutation qui ne flaggait pas dirty → guard inactif
      // sur ce chemin. On compare au dernier markdown connu pour
      // éviter de flagger pendant le switch wysiwyg→markdown
      // (qui appelle setMarkdownSource avec le résultat de
      // draftToMarkdown sans intervention user).
      isDirty: state.markdownSource !== '' && src !== state.markdownSource ? true : state.isDirty,
    })),

  clearScrollToSection: () => set({ scrollToSection: null }),

  setFmField: (field, value) =>
    set((s) => ({
      draft: { ...s.draft, [field]: value },
      isDirty: true,
    })),

  setSection: (key, value) =>
    set((s) => ({
      draft: {
        ...s.draft,
        sections: { ...s.draft.sections, [key]: value },
      },
      isDirty: true,
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
      return { draft: { ...s.draft, ac: [...s.draft.ac, newAc] }, isDirty: true };
    }),

  removeAc: (id) =>
    set((s) => {
      const filtered = s.draft.ac.filter((a) => a.id !== id);
      return { draft: { ...s.draft, ac: renumberAcs(filtered) }, isDirty: true };
    }),

  updateAc: (id, field, value) =>
    set((s) => ({
      draft: {
        ...s.draft,
        ac: s.draft.ac.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      },
      isDirty: true,
    })),

  duplicateAc: (id) =>
    set((s) => {
      const src = s.draft.ac.find((a) => a.id === id);
      if (!src) return s;
      const copy: MockAcceptanceCriterion = { ...src, id: nextAcId(s.draft.ac) };
      return { draft: { ...s.draft, ac: [...s.draft.ac, copy] }, isDirty: true };
    }),

  // ─── AI actions (UI-014d) ──────────────────────────────────────────────

  openAiPopover: (selection, pos) =>
    set({ aiPhase: 'popover', aiSelection: selection, popoverPosition: pos, aiSuggestion: null, aiAction: null }),

  closeAiPopover: () =>
    set({ aiPhase: 'idle', aiSelection: null, aiAction: null, aiSuggestion: null, popoverPosition: null }),

  triggerAiAction: (action) => {
    // Sets the phase to 'generating' — actual LLM streaming is done
    // by useSpddSuggest in the component layer (SpddEditor/AiPopover).
    set({ aiPhase: 'generating', aiAction: action });
  },

  acceptSuggestion: () =>
    set((s) => {
      if (!s.aiSelection || !s.aiSuggestion) return { aiPhase: 'idle' as const };
      const { sectionKey, start, end } = s.aiSelection;
      const current = s.draft.sections[sectionKey];
      const updated = current.slice(0, start) + s.aiSuggestion + current.slice(end);
      return {
        aiPhase: 'idle' as const,
        aiSelection: null,
        aiAction: null,
        aiSuggestion: null,
        popoverPosition: null,
        draft: {
          ...s.draft,
          sections: { ...s.draft.sections, [sectionKey]: updated },
        },
        isDirty: true,
      };
    }),

  rejectSuggestion: () =>
    set({ aiPhase: 'idle', aiSelection: null, aiAction: null, aiSuggestion: null, popoverPosition: null }),

  regenerateAi: () => {
    // Sets the phase to 'generating' — actual re-streaming is delegated to
    // useSpddSuggest.start() called from AiDiffPanel with previousSuggestion.
    set({ aiPhase: 'generating' });
  },
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

/** UI-014h — Détermine si une section (par key) est requise selon le template.
 *  Le front-matter (`fm`) est toujours requis : YAML frontmatter est une
 *  contrainte structurelle, indépendante du template. Pour les autres keys,
 *  on lit l'annotation `<!-- spdd: required -->` correspondante via
 *  parsedTemplate.sections (matching par heading↔key). */
export function isKeyRequired(
  key: SectionKey,
  parsedTemplate: ParsedTemplate | null,
): boolean {
  if (key === 'fm') return true;
  if (!parsedTemplate) return false;
  const meta = SECTIONS.find((s) => s.key === key);
  if (!meta) return false;
  const spec = parsedTemplate.sections.find(
    (s) => s.heading.toLowerCase() === meta.label.toLowerCase(),
  );
  return spec?.required ?? false;
}

export function selectSectionStatus(
  state: SpddEditorState,
  key: SectionKey,
  parsedTemplate: ParsedTemplate | null,
): SectionStatus {
  if (state.activeSection === key) return 'active';
  if (!SECTIONS.find((s) => s.key === key)) return 'optional';

  const required = isKeyRequired(key, parsedTemplate);
  let filled: boolean;
  if (key === 'fm') filled = isFmComplete(state.draft);
  else if (key === 'ac') filled = isAcComplete(state.draft);
  else filled = isProseFilled(state.draft.sections[key as ProseSectionKey]);

  if (required) return filled ? 'done' : 'todo';
  return 'optional';
}

function isKeyFilled(state: SpddEditorState, key: SectionKey): boolean {
  if (key === 'fm') return isFmComplete(state.draft);
  if (key === 'ac') return isAcComplete(state.draft);
  return isProseFilled(state.draft.sections[key as ProseSectionKey]);
}

/** UI-014h — Iteration template-driven : FM (toujours requis) + chaque
 *  section du template marquée `required`. */
function iterRequiredKeys(parsedTemplate: ParsedTemplate | null): SectionKey[] {
  const keys: SectionKey[] = ['fm'];
  if (!parsedTemplate) return keys;
  for (const spec of parsedTemplate.sections) {
    if (!spec.required) continue;
    const key = HEADING_TO_KEY[spec.heading.toLowerCase()];
    if (key && key !== 'fm') keys.push(key);
  }
  return keys;
}

export function selectRequiredTotal(parsedTemplate: ParsedTemplate | null): number {
  return iterRequiredKeys(parsedTemplate).length;
}

export function selectRequiredCompleted(
  state: SpddEditorState,
  parsedTemplate: ParsedTemplate | null,
): number {
  return iterRequiredKeys(parsedTemplate).filter((k) => isKeyFilled(state, k)).length;
}

export function selectMissingRequiredLabels(
  state: SpddEditorState,
  parsedTemplate: ParsedTemplate | null,
): string[] {
  return iterRequiredKeys(parsedTemplate)
    .filter((k) => !isKeyFilled(state, k))
    .map((k) => SECTIONS.find((s) => s.key === k)?.label ?? k);
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
