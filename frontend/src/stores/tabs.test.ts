import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore, activeProject } from './tabs';

const p = (path: string) => ({ path, name: path.split('/').pop() ?? path, lastOpened: '2026-05-06T00:00:00Z' });

beforeEach(() => {
  useTabsStore.setState({ openedProjects: [], activeIndex: -1, recentProjects: [] });
});

describe('addProject', () => {
  it('appends and activates', () => {
    useTabsStore.getState().addProject(p('/a'));
    const s = useTabsStore.getState();
    expect(s.openedProjects).toHaveLength(1);
    expect(s.activeIndex).toBe(0);
  });

  it('second project sets activeIndex=1', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().addProject(p('/b'));
    expect(useTabsStore.getState().activeIndex).toBe(1);
  });
});

describe('removeProject', () => {
  it('last project → activeIndex -1', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().removeProject(0);
    const s = useTabsStore.getState();
    expect(s.openedProjects).toHaveLength(0);
    expect(s.activeIndex).toBe(-1);
  });

  it('middle removal shifts active', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().addProject(p('/b'));
    useTabsStore.getState().addProject(p('/c'));
    useTabsStore.getState().setActive(2); // active = /c (idx 2)
    useTabsStore.getState().removeProject(1); // remove /b
    // active was 2, idx 1 removed, so active becomes 1
    expect(useTabsStore.getState().activeIndex).toBe(1);
    expect(useTabsStore.getState().openedProjects).toHaveLength(2);
  });
});

describe('setActive', () => {
  it('sets index', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().addProject(p('/b'));
    useTabsStore.getState().setActive(0);
    expect(useTabsStore.getState().activeIndex).toBe(0);
  });
});

describe('reorderProjects', () => {
  it('reorders correctly', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().addProject(p('/b'));
    useTabsStore.getState().addProject(p('/c'));
    useTabsStore.getState().setActive(0); // /a is active
    useTabsStore.getState().reorderProjects([2, 0, 1]); // [/c, /a, /b]
    const s = useTabsStore.getState();
    expect(s.openedProjects[0].path).toBe('/c');
    expect(s.openedProjects[1].path).toBe('/a');
    expect(s.activeIndex).toBe(1); // /a moved to index 1
  });
});

describe('activeProject selector', () => {
  it('returns null when empty', () => {
    expect(activeProject(useTabsStore.getState())).toBeNull();
  });

  it('returns the active tab', () => {
    useTabsStore.getState().addProject(p('/a'));
    useTabsStore.getState().addProject(p('/b'));
    useTabsStore.getState().setActive(1);
    expect(activeProject(useTabsStore.getState())?.path).toBe('/b');
  });
});
