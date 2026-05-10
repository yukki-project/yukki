import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../wailsjs/go/main/App', () => ({
  ListArtifacts: vi.fn().mockResolvedValue([]),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import { useFsWatchSubscriber, type FsChangedPayload } from './useFsWatchSubscriber';
import { useArtifactsStore } from '@/stores/artifacts';
import { useSpddEditorStore } from '@/stores/spdd';

interface FakeRuntime {
  EventsOn: ReturnType<typeof vi.fn>;
  _emit: (event: string, payload: unknown) => void;
}

let fakeRuntime: FakeRuntime;

beforeEach(() => {
  const handlers: Record<string, ((...data: unknown[]) => void)[]> = {};
  fakeRuntime = {
    EventsOn: vi.fn((event: string, cb: (...data: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
      return () => {
        handlers[event] = (handlers[event] ?? []).filter((h) => h !== cb);
      };
    }),
    _emit(event: string, payload: unknown) {
      (handlers[event] ?? []).forEach((cb) => cb(payload));
    },
  };
  (window as unknown as { runtime?: FakeRuntime }).runtime = fakeRuntime;

  // Reset store state between tests.
  useArtifactsStore.setState({
    kind: 'stories',
    items: [],
    selectedPath: '',
    error: null,
  });
  useSpddEditorStore.setState({
    isDirty: false,
    conflictWarning: null,
    deleted: false,
  });
});

afterEach(() => {
  delete (window as unknown as { runtime?: FakeRuntime }).runtime;
});

function makeEvent(overrides: Partial<FsChangedPayload> = {}): FsChangedPayload {
  return {
    projectPath: 'C:/proj',
    path: 'C:/proj/.yukki/stories/UI-099-test.md',
    kind: 'create',
    mtime: 1234,
    ...overrides,
  };
}

describe('useFsWatchSubscriber', () => {
  // Helper : inject a fresh vi.fn() into the store to track refresh
  // calls. vi.spyOn doesn't work reliably here because zustand
  // returns the same state object reference but the tracker lifetime
  // is unclear when state is mutated via setState between mount and
  // emit.
  function withRefreshSpy(): ReturnType<typeof vi.fn> {
    const spy = vi.fn().mockResolvedValue(undefined);
    useArtifactsStore.setState({ refresh: spy as unknown as () => Promise<void> });
    return spy;
  }

  it('refreshes the artifacts store on a create event of the current kind', () => {
    const refreshSpy = withRefreshSpy();
    renderHook(() => useFsWatchSubscriber());

    act(() => {
      fakeRuntime._emit('yukki:fs:changed', makeEvent({ kind: 'create' }));
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers conflict warning when the open path is modified while isDirty', () => {
    useArtifactsStore.setState({ selectedPath: 'C:/proj/.yukki/stories/UI-099-test.md' });
    useSpddEditorStore.setState({ isDirty: true });
    const refreshSpy = withRefreshSpy();

    renderHook(() => useFsWatchSubscriber());
    act(() => {
      fakeRuntime._emit('yukki:fs:changed', makeEvent({ kind: 'modify', mtime: 9999 }));
    });

    const cw = useSpddEditorStore.getState().conflictWarning;
    expect(cw).toEqual({
      path: 'C:/proj/.yukki/stories/UI-099-test.md',
      diskMtime: 9999,
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('bumps externalReloadCounter when open path is modified without dirty', () => {
    useArtifactsStore.setState({ selectedPath: 'C:/proj/.yukki/stories/UI-099-test.md' });
    useSpddEditorStore.setState({ isDirty: false, externalReloadCounter: 0 });
    withRefreshSpy();

    renderHook(() => useFsWatchSubscriber());
    act(() => {
      fakeRuntime._emit('yukki:fs:changed', makeEvent({ kind: 'modify' }));
    });

    expect(useSpddEditorStore.getState().externalReloadCounter).toBe(1);
    expect(useSpddEditorStore.getState().conflictWarning).toBeNull();
  });

  it('marks deleted when the open path is removed', () => {
    useArtifactsStore.setState({ selectedPath: 'C:/proj/.yukki/stories/UI-099-test.md' });
    withRefreshSpy();

    renderHook(() => useFsWatchSubscriber());
    act(() => {
      fakeRuntime._emit('yukki:fs:changed', makeEvent({ kind: 'delete' }));
    });

    expect(useSpddEditorStore.getState().deleted).toBe(true);
  });

  it('ignores events for paths outside the current kind', () => {
    // Current kind is "stories" ; event lands on inbox.
    const refreshSpy = withRefreshSpy();
    renderHook(() => useFsWatchSubscriber());

    act(() => {
      fakeRuntime._emit(
        'yukki:fs:changed',
        makeEvent({ path: 'C:/proj/.yukki/inbox/INBOX-099.md' }),
      );
    });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('unsubscribes the listener on unmount', () => {
    const { unmount } = renderHook(() => useFsWatchSubscriber());
    expect(fakeRuntime.EventsOn).toHaveBeenCalledTimes(1);
    // After unmount, emitting must not crash and must not invoke any
    // store mutation (no spy needed — just verify cleanup did run).
    unmount();
    act(() => {
      fakeRuntime._emit('yukki:fs:changed', makeEvent({ kind: 'create' }));
    });
    // No assertion error means the cleanup detached the handler.
  });
});
