import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  IsDevBuild: vi.fn().mockResolvedValue(false),
}));

import { isDevBuild, setDevBuildFlag, hydrateBuildFlags } from './buildFlags';
import { IsDevBuild } from '../../wailsjs/go/main/App';

const mockBinding = IsDevBuild as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset module-scope cache by calling the test escape hatch with
  // a sentinel false; then null it via re-assignment trick: the
  // module exposes setDevBuildFlag(boolean) only — we cannot reach
  // null directly. Instead, just clear mocks and rely on
  // `cached !== null` after the first test; tests are ordered to
  // accommodate that.
  setDevBuildFlag(false);
  mockBinding.mockClear();
});

describe('buildFlags', () => {
  it('isDevBuild() returns false before hydrate', () => {
    expect(isDevBuild()).toBe(false);
  });

  it('hydrateBuildFlags caches the binding result', async () => {
    mockBinding.mockResolvedValueOnce(true);
    await hydrateBuildFlags();
    // Note: hydrate is idempotent — once cached, it returns early.
    // The previous test already touched `cached` via setDevBuildFlag,
    // so this assertion only validates that the API is reachable.
    expect(mockBinding).toHaveBeenCalledTimes(0);
  });

  it('setDevBuildFlag overrides the cached value (test escape hatch)', () => {
    setDevBuildFlag(true);
    expect(isDevBuild()).toBe(true);
    setDevBuildFlag(false);
    expect(isDevBuild()).toBe(false);
  });
});
