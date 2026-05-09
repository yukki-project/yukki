import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  TailLogs: vi.fn().mockResolvedValue([]),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import { useDevToolsStore } from './devTools';
import { TailLogs } from '../../wailsjs/go/main/App';

const mockTail = TailLogs as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  useDevToolsStore.setState({
    drawerOpen: false,
    buffer: [],
    levelFilter: new Set(['DEBUG', 'INFO', 'WARN', 'ERROR']),
    sourceFilter: new Set(['frontend', 'go']),
    autoScroll: true,
  });
  mockTail.mockClear();
});

function makeLine(idx: number) {
  return {
    Timestamp: `2026-05-09T18:00:${String(idx).padStart(2, '0')}Z`,
    Level: 'INFO',
    Source: 'go',
    Msg: `event ${idx}`,
    Raw: `event ${idx} raw`,
  };
}

describe('useDevToolsStore', () => {
  it('openDrawer hydrates buffer from TailLogs', async () => {
    mockTail.mockResolvedValueOnce([makeLine(1), makeLine(2)]);
    await useDevToolsStore.getState().openDrawer();
    const s = useDevToolsStore.getState();
    expect(s.drawerOpen).toBe(true);
    expect(s.buffer).toHaveLength(2);
  });

  it('openDrawer is idempotent', async () => {
    mockTail.mockResolvedValueOnce([makeLine(1)]);
    await useDevToolsStore.getState().openDrawer();
    await useDevToolsStore.getState().openDrawer();
    expect(mockTail).toHaveBeenCalledTimes(1);
  });

  it('openDrawer survives TailLogs failure', async () => {
    mockTail.mockRejectedValueOnce(new Error('disabled'));
    await useDevToolsStore.getState().openDrawer();
    expect(useDevToolsStore.getState().drawerOpen).toBe(true);
  });

  it('pushEntry caps the buffer at 500', () => {
    const s = useDevToolsStore.getState();
    for (let i = 0; i < 510; i++) s.pushEntry(makeLine(i));
    const buf = useDevToolsStore.getState().buffer;
    expect(buf).toHaveLength(500);
    expect(buf[0]?.Msg).toBe('event 10'); // first 10 evicted
    expect(buf[buf.length - 1]?.Msg).toBe('event 509');
  });

  it('setLevelFilter / setSourceFilter mutate the active sets', () => {
    const s = useDevToolsStore.getState();
    s.setLevelFilter('DEBUG', false);
    expect(useDevToolsStore.getState().levelFilter.has('DEBUG')).toBe(false);
    s.setSourceFilter('go', false);
    expect(useDevToolsStore.getState().sourceFilter.has('go')).toBe(false);
  });

  it('closeDrawer closes without clearing the buffer', () => {
    useDevToolsStore.setState({ drawerOpen: true, buffer: [makeLine(1)] });
    useDevToolsStore.getState().closeDrawer();
    expect(useDevToolsStore.getState().drawerOpen).toBe(false);
    expect(useDevToolsStore.getState().buffer).toHaveLength(1);
  });
});
