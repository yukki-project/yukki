// UI-014a — Smoke tests for the SPDD editor store selectors.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectAcCompletion,
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  selectSectionStatus,
  useSpddEditorStore,
} from './spdd';
import { DEMO_STORY } from '@/components/spdd/mockStory';

describe('useSpddEditorStore', () => {
  beforeEach(() => {
    useSpddEditorStore.getState().resetDraft(DEMO_STORY);
  });

  it('starts on the Background section by default', () => {
    expect(useSpddEditorStore.getState().activeSection).toBe('bg');
  });

  it('reports 4/5 required sections completed for the demo fixture', () => {
    expect(selectRequiredCompleted(useSpddEditorStore.getState())).toBe(4);
  });

  it('flags Acceptance Criteria as the missing required section', () => {
    expect(selectMissingRequiredLabels(useSpddEditorStore.getState())).toEqual([
      'Acceptance Criteria',
    ]);
  });

  it('marks the active section as such, even if otherwise complete', () => {
    useSpddEditorStore.getState().setActiveSection('ac');
    expect(selectSectionStatus(useSpddEditorStore.getState(), 'ac')).toBe(
      'active',
    );
  });

  it('reports done on FM, Bg, Bv, SI when not active', () => {
    useSpddEditorStore.getState().setActiveSection('ac');
    const state = useSpddEditorStore.getState();
    expect(selectSectionStatus(state, 'fm')).toBe('done');
    expect(selectSectionStatus(state, 'bg')).toBe('done');
    expect(selectSectionStatus(state, 'bv')).toBe('done');
    expect(selectSectionStatus(state, 'si')).toBe('done');
  });

  it('reports optional on Scope Out / Open Questions / Notes (empty in fixture)', () => {
    useSpddEditorStore.getState().setActiveSection('ac');
    const state = useSpddEditorStore.getState();
    expect(selectSectionStatus(state, 'so')).toBe('optional');
    expect(selectSectionStatus(state, 'oq')).toBe('optional');
    expect(selectSectionStatus(state, 'no')).toBe('optional');
  });

  it('marks AC1 complete and AC2/AC3 partial in the fixture', () => {
    const completion = selectAcCompletion(useSpddEditorStore.getState());
    expect(completion.find((c) => c.id === 'AC1')?.complete).toBe(true);
    expect(completion.find((c) => c.id === 'AC2')?.complete).toBe(false);
    expect(completion.find((c) => c.id === 'AC3')?.complete).toBe(false);
  });

  it('toggles the view mode setter', () => {
    expect(useSpddEditorStore.getState().viewMode).toBe('wysiwyg');
    useSpddEditorStore.getState().setViewMode('markdown');
    expect(useSpddEditorStore.getState().viewMode).toBe('markdown');
  });
});
