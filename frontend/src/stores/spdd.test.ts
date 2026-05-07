// UI-014a — Smoke tests for the SPDD editor store selectors.
// UI-014b — Tests for store mutations.

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

describe('useSpddEditorStore — mutations (UI-014b)', () => {
  beforeEach(() => {
    useSpddEditorStore.getState().resetDraft(DEMO_STORY);
  });

  it('setFmField updates a scalar field', () => {
    useSpddEditorStore.getState().setFmField('title', 'Nouveau titre');
    expect(useSpddEditorStore.getState().draft.title).toBe('Nouveau titre');
  });

  it('setFmField updates modules array', () => {
    useSpddEditorStore.getState().setFmField('modules', ['frontend', 'cli']);
    expect(useSpddEditorStore.getState().draft.modules).toEqual(['frontend', 'cli']);
  });

  it('setSection updates a prose section', () => {
    useSpddEditorStore.getState().setSection('bg', 'Nouveau contexte.');
    expect(useSpddEditorStore.getState().draft.sections.bg).toBe('Nouveau contexte.');
  });

  it('addAc appends a new empty AC', () => {
    const before = useSpddEditorStore.getState().draft.ac.length;
    useSpddEditorStore.getState().addAc();
    const after = useSpddEditorStore.getState().draft.ac;
    expect(after.length).toBe(before + 1);
    const last = after[after.length - 1];
    expect(last.title).toBe('');
    expect(last.given).toBe('');
  });

  it('removeAc removes the AC and renumbers the rest', () => {
    useSpddEditorStore.getState().removeAc('AC1');
    const acs = useSpddEditorStore.getState().draft.ac;
    // First AC is now what was AC2
    expect(acs[0].id).toBe('AC1');
    // AC with original id AC1 is gone
    expect(acs.find((a) => a.id === 'AC3')).toBeUndefined();
  });

  it('updateAc changes a single field without affecting others', () => {
    const before = useSpddEditorStore.getState().draft.ac[0];
    useSpddEditorStore.getState().updateAc('AC1', 'then', 'Updated then');
    const after = useSpddEditorStore.getState().draft.ac[0];
    expect(after.then).toBe('Updated then');
    expect(after.given).toBe(before.given);
    expect(after.when).toBe(before.when);
  });

  it('duplicateAc appends a copy with a new id', () => {
    const src = useSpddEditorStore.getState().draft.ac[0];
    const before = useSpddEditorStore.getState().draft.ac.length;
    useSpddEditorStore.getState().duplicateAc('AC1');
    const acs = useSpddEditorStore.getState().draft.ac;
    expect(acs.length).toBe(before + 1);
    const copy = acs[acs.length - 1];
    expect(copy.id).not.toBe('AC1');
    expect(copy.given).toBe(src.given);
  });
});
