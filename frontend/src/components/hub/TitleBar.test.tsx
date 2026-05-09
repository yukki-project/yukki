import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../wailsjs/runtime/runtime', () => ({
  Quit: vi.fn(),
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
}));
vi.mock('../../../wailsjs/go/main/App', () => ({
  LoadSettings: vi.fn().mockResolvedValue({ DebugMode: false }),
  SaveSettings: vi.fn().mockResolvedValue(undefined),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
  GetBuildInfo: vi.fn().mockResolvedValue({ Version: '', CommitSHA: '', BuildDate: '' }),
  ListRecentProjects: vi.fn().mockResolvedValue([]),
  OpenProject: vi.fn(),
  CloseProject: vi.fn(),
  InitializeYukki: vi.fn(),
  SelectDirectory: vi.fn(),
  IsDevBuild: vi.fn().mockResolvedValue(true),
  TailLogs: vi.fn().mockResolvedValue([]),
  OpenLogsFolder: vi.fn().mockResolvedValue(undefined),
}));

import { TitleBar } from './TitleBar';
import { useSettingsStore } from '@/stores/settings';
import { setDevBuildFlag } from '@/lib/buildFlags';

beforeEach(() => {
  useSettingsStore.setState({ debugMode: false, hydrated: true });
  setDevBuildFlag(true);
});
afterEach(() => cleanup());

describe('TitleBar', () => {
  it('does not render the DEBUG ON badge when debugMode is false', () => {
    render(<TitleBar />);
    expect(screen.queryByText('DEBUG ON')).not.toBeInTheDocument();
  });

  it('renders the DEBUG ON badge when debugMode is true (dev build)', () => {
    useSettingsStore.setState({ debugMode: true, hydrated: true });
    render(<TitleBar />);
    expect(screen.getByText(/DEBUG ON/i)).toBeInTheDocument();
  });

  it('hides the badge in release build even when debugMode=true', () => {
    setDevBuildFlag(false);
    useSettingsStore.setState({ debugMode: true, hydrated: true });
    render(<TitleBar />);
    expect(screen.queryByText('DEBUG ON')).not.toBeInTheDocument();
  });
});
