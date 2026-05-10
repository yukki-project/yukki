import { describe, it, expect, beforeEach } from 'vitest';
import { useRestructureStore } from './restructure';

beforeEach(() => {
  useRestructureStore.getState().reset();
});

describe('useRestructureStore', () => {
  it('starts closed with no buffers', () => {
    const s = useRestructureStore.getState();
    expect(s.open).toBe(false);
    expect(s.before).toBeNull();
    expect(s.after).toBeNull();
  });

  it('openOverlay flips open and stores the before snapshot', () => {
    useRestructureStore.getState().openOverlay('# original');
    const s = useRestructureStore.getState();
    expect(s.open).toBe(true);
    expect(s.before).toBe('# original');
    expect(s.after).toBeNull();
  });

  it('setAfter populates the diff target', () => {
    useRestructureStore.getState().openOverlay('# before');
    useRestructureStore.getState().setAfter('# after');
    expect(useRestructureStore.getState().after).toBe('# after');
  });

  it('accept returns the after and clears state', () => {
    useRestructureStore.getState().openOverlay('# before');
    useRestructureStore.getState().setAfter('# after');
    const accepted = useRestructureStore.getState().accept();
    expect(accepted).toBe('# after');
    const s = useRestructureStore.getState();
    expect(s.open).toBe(false);
    expect(s.before).toBeNull();
    expect(s.after).toBeNull();
  });

  it('accept returns null when no after has been set', () => {
    useRestructureStore.getState().openOverlay('# before');
    expect(useRestructureStore.getState().accept()).toBeNull();
  });

  it('refuse drops everything and closes', () => {
    useRestructureStore.getState().openOverlay('# before');
    useRestructureStore.getState().setAfter('# after');
    useRestructureStore.getState().refuse();
    const s = useRestructureStore.getState();
    expect(s.open).toBe(false);
    expect(s.after).toBeNull();
  });

  it('closeOverlay is equivalent to refuse', () => {
    useRestructureStore.getState().openOverlay('# before');
    useRestructureStore.getState().closeOverlay();
    expect(useRestructureStore.getState().open).toBe(false);
  });
});
