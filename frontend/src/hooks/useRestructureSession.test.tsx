import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../wailsjs/go/main/App', () => ({
  RestructureStart: vi.fn().mockResolvedValue('restruct-1'),
  RestructureCancel: vi.fn().mockResolvedValue(undefined),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import {
  RestructureStart as MockStart,
  RestructureCancel as MockCancel,
} from '../../wailsjs/go/main/App';
import { useRestructureSession } from './useRestructureSession';
import { useRestructureStore } from '@/stores/restructure';

const mockStart = MockStart as unknown as ReturnType<typeof vi.fn>;
const mockCancel = MockCancel as unknown as ReturnType<typeof vi.fn>;

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
  useRestructureStore.getState().reset();
  mockStart.mockClear();
  mockStart.mockResolvedValue('restruct-1');
  mockCancel.mockClear();
});

afterEach(() => {
  delete (window as unknown as { runtime?: FakeRuntime }).runtime;
});

const STARTED_INPUT = {
  fullMarkdown: '# orig',
  templateName: 'story',
  divergence: { missingRequired: [], orphanSections: [] },
};

describe('useRestructureSession', () => {
  it('start transitions idle → streaming → preview on done event', async () => {
    const { result } = renderHook(() => useRestructureSession());
    expect(result.current.mode).toBe('idle');

    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    expect(result.current.mode).toBe('streaming');
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        fullMarkdown: '# orig',
        history: [],
      }),
    );

    act(() => {
      fakeRuntime._emit('spdd:restructure:done', {
        sessionID: 'restruct-1',
        fullText: '# restructured',
        durationMs: 100,
      });
    });
    await waitFor(() => expect(result.current.mode).toBe('preview'));
    expect(result.current.streamText).toBe('# restructured');
    expect(useRestructureStore.getState().after).toBe('# restructured');
  });

  it('missing-info event switches to chatAwaitingUser', async () => {
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    act(() => {
      fakeRuntime._emit('spdd:restructure:missing-info', {
        sessionID: 'restruct-1',
        questions: ['Q1?', 'Q2?'],
        rawResponse: '<info-missing>...</info-missing>',
      });
    });
    await waitFor(() => expect(result.current.mode).toBe('chatAwaitingUser'));
    expect(result.current.questions).toEqual(['Q1?', 'Q2?']);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].answer).toBe('');
  });

  it('answerChat fills the last turn answer and relaunches', async () => {
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    act(() => {
      fakeRuntime._emit('spdd:restructure:missing-info', {
        sessionID: 'restruct-1',
        questions: ['Q1?'],
        rawResponse: '',
      });
    });
    await waitFor(() => expect(result.current.mode).toBe('chatAwaitingUser'));

    mockStart.mockClear();
    await act(async () => {
      await result.current.answerChat('mon scope');
    });

    expect(result.current.mode).toBe('chatStreaming');
    expect(result.current.history[0].answer).toBe('mon scope');
    expect(result.current.chatTurnCount).toBe(1);
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [{ question: 'Q1?', answer: 'mon scope' }],
      }),
    );
  });

  it('error event sets mode error', async () => {
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    act(() => {
      fakeRuntime._emit('spdd:restructure:error', {
        sessionID: 'restruct-1',
        message: 'rate limit',
      });
    });
    await waitFor(() => expect(result.current.mode).toBe('error'));
    expect(result.current.error).toBe('rate limit');
  });

  it('cancel calls Wails and returns to idle', async () => {
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    await act(async () => {
      await result.current.cancel();
    });
    expect(mockCancel).toHaveBeenCalledWith('restruct-1');
    expect(result.current.mode).toBe('idle');
  });

  it('start rejects when chat already exhausted (5 turns)', async () => {
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    // Force the counter to MAX without going through 5 round-trips.
    for (let i = 0; i < 5; i++) {
      act(() => {
        fakeRuntime._emit('spdd:restructure:missing-info', {
          sessionID: 'restruct-1',
          questions: [`Q${i}`],
          rawResponse: '',
        });
      });
      await waitFor(() => expect(result.current.mode).toBe('chatAwaitingUser'));
      await act(async () => {
        await result.current.answerChat(`A${i}`);
      });
    }
    expect(result.current.chatTurnCount).toBe(5);

    // 6th attempt → exhausted, no new RestructureStart call.
    mockStart.mockClear();
    await act(async () => {
      await result.current.answerChat('A5');
    });
    expect(result.current.mode).toBe('exhausted');
    expect(mockStart).not.toHaveBeenCalled();
  });
});
