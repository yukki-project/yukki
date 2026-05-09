import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../wailsjs/go/main/App', () => ({
  TailLogs: vi.fn().mockResolvedValue([]),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import { LogsDrawer } from './LogsDrawer';
import { setDevBuildFlag } from '@/lib/buildFlags';
import { useDevToolsStore } from '@/stores/devTools';

beforeEach(() => {
  setDevBuildFlag(true);
  useDevToolsStore.setState({
    drawerOpen: false,
    buffer: [],
    levelFilter: new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']),
    sourceFilter: new Set(['frontend', 'go']),
    autoScroll: true,
  });
});

afterEach(() => cleanup());

describe('LogsDrawer', () => {
  it('renders nothing in release build', () => {
    setDevBuildFlag(false);
    useDevToolsStore.setState({ drawerOpen: true });
    const { container } = render(<LogsDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when drawer is closed', () => {
    const { container } = render(<LogsDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the drawer when open with empty state', () => {
    useDevToolsStore.setState({ drawerOpen: true });
    render(<LogsDrawer />);
    expect(screen.getByRole('region', { name: /logs drawer/i })).toBeInTheDocument();
    expect(screen.getByText(/Aucune entrée/i)).toBeInTheDocument();
  });

  it('renders log lines from the buffer', () => {
    useDevToolsStore.setState({
      drawerOpen: true,
      buffer: [
        { Timestamp: 't1', Level: 'INFO', Source: 'go', Msg: 'startup', Raw: '' },
        { Timestamp: 't2', Level: 'WARN', Source: 'frontend', Msg: 'hiccup', Raw: '' },
      ],
    });
    render(<LogsDrawer />);
    expect(screen.getByText(/startup/)).toBeInTheDocument();
    expect(screen.getByText(/hiccup/)).toBeInTheDocument();
  });

  it('filter by level hides matching entries', () => {
    useDevToolsStore.setState({
      drawerOpen: true,
      buffer: [
        { Timestamp: 't1', Level: 'INFO', Source: 'go', Msg: 'startup', Raw: '' },
        { Timestamp: 't2', Level: 'WARN', Source: 'go', Msg: 'hiccup', Raw: '' },
      ],
      levelFilter: new Set(['WARN', 'ERROR']),
    });
    render(<LogsDrawer />);
    expect(screen.queryByText(/startup/)).not.toBeInTheDocument();
    expect(screen.getByText(/hiccup/)).toBeInTheDocument();
  });

  it('Escape closes the drawer', () => {
    useDevToolsStore.setState({ drawerOpen: true });
    render(<LogsDrawer />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useDevToolsStore.getState().drawerOpen).toBe(false);
  });

  it('close button closes the drawer', () => {
    useDevToolsStore.setState({ drawerOpen: true });
    render(<LogsDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /close logs drawer/i }));
    expect(useDevToolsStore.getState().drawerOpen).toBe(false);
  });
});
