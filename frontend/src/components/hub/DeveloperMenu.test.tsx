import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('../../../wailsjs/go/main/App', () => ({
  OpenLogsFolder: vi.fn().mockResolvedValue(undefined),
  LoadSettings: vi.fn().mockResolvedValue({ DebugMode: false }),
  SaveSettings: vi.fn().mockResolvedValue(undefined),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
  TailLogs: vi.fn().mockResolvedValue([]),
  IsDevBuild: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { DeveloperMenu } from './DeveloperMenu';
import { setDevBuildFlag } from '@/lib/buildFlags';
import { useSettingsStore } from '@/stores/settings';
import { useDevToolsStore } from '@/stores/devTools';

beforeEach(() => {
  useSettingsStore.setState({ debugMode: false, hydrated: true });
  useDevToolsStore.setState({
    drawerOpen: false,
    buffer: [],
    levelFilter: new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']),
    sourceFilter: new Set(['frontend', 'go']),
    autoScroll: true,
  });
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('DeveloperMenu', () => {
  it('renders nothing in release build', () => {
    setDevBuildFlag(false);
    const { container } = render(<DeveloperMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Developer trigger in dev build', () => {
    setDevBuildFlag(true);
    render(<DeveloperMenu />);
    expect(screen.getByRole('button', { name: /developer/i })).toBeInTheDocument();
  });

  it('toggle item calls setDebugMode', async () => {
    setDevBuildFlag(true);
    const { SaveSettings } = await import('../../../wailsjs/go/main/App');
    render(<DeveloperMenu />);
    const trigger = screen.getByRole('button', { name: /developer/i });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.pointerUp(trigger);
    const item = await waitFor(() => screen.getByText(/Activer le mode debug/i));
    fireEvent.click(item);
    await waitFor(() => expect(SaveSettings).toHaveBeenCalledWith({ DebugMode: true }));
  });

  it('"Ouvrir le drawer logs" item is visible only when debugMode=true', async () => {
    setDevBuildFlag(true);
    useSettingsStore.setState({ debugMode: true, hydrated: true });
    render(<DeveloperMenu />);
    const trigger = screen.getByRole('button', { name: /developer/i });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.pointerUp(trigger);
    expect(await waitFor(() => screen.getByText(/Ouvrir le drawer logs/i))).toBeInTheDocument();
  });

  it('"Ouvrir le dossier de logs" item calls OpenLogsFolder', async () => {
    setDevBuildFlag(true);
    const { OpenLogsFolder } = await import('../../../wailsjs/go/main/App');
    render(<DeveloperMenu />);
    const trigger = screen.getByRole('button', { name: /developer/i });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.pointerUp(trigger);
    const item = await waitFor(() => screen.getByText(/Ouvrir le dossier de logs/i));
    fireEvent.click(item);
    await waitFor(() => expect(OpenLogsFolder).toHaveBeenCalled());
  });
});
