import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  LoadSettings: vi.fn().mockResolvedValue({ DebugMode: false }),
  SaveSettings: vi.fn().mockResolvedValue(undefined),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { useSettingsStore } from './settings';
import { LoadSettings, SaveSettings } from '../../wailsjs/go/main/App';
import { toast } from '@/hooks/use-toast';

const mockLoad = LoadSettings as unknown as ReturnType<typeof vi.fn>;
const mockSave = SaveSettings as unknown as ReturnType<typeof vi.fn>;
const mockToast = toast as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset the store between tests so hydrate() runs again.
  useSettingsStore.setState({ debugMode: false, hydrated: false });
  mockLoad.mockClear();
  mockSave.mockClear();
  mockToast.mockClear();
});

describe('useSettingsStore', () => {
  it('hydrate populates debugMode from backend', async () => {
    mockLoad.mockResolvedValueOnce({ DebugMode: true });
    await useSettingsStore.getState().hydrate();
    const s = useSettingsStore.getState();
    expect(s.debugMode).toBe(true);
    expect(s.hydrated).toBe(true);
  });

  it('hydrate marks hydrated even on backend error', async () => {
    mockLoad.mockRejectedValueOnce(new Error('boom'));
    await useSettingsStore.getState().hydrate();
    const s = useSettingsStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.debugMode).toBe(false);
  });

  it('hydrate is idempotent (no second LoadSettings call)', async () => {
    await useSettingsStore.getState().hydrate();
    await useSettingsStore.getState().hydrate();
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('setDebugMode persists and updates state', async () => {
    await useSettingsStore.getState().setDebugMode(true);
    expect(mockSave).toHaveBeenCalledWith({ DebugMode: true });
    expect(useSettingsStore.getState().debugMode).toBe(true);
  });

  it('setDebugMode rolls back and toasts on save failure', async () => {
    mockSave.mockRejectedValueOnce(new Error('disk full'));
    await useSettingsStore.getState().setDebugMode(true);
    expect(useSettingsStore.getState().debugMode).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('setDebugMode is a no-op when value unchanged', async () => {
    await useSettingsStore.getState().setDebugMode(false);
    expect(mockSave).not.toHaveBeenCalled();
  });
});
