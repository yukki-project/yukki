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

  it('missing-info event auto-replies and transitions through chatStreaming', async () => {
    // Post UI-019 amendments 2026-05-10b — yukki répond
    // automatiquement au LLM avec AUTO_REPLY ; le mode passe par
    // chatAwaitingUser puis bascule à chatStreaming sur le tour
    // suivant. On vérifie l'état final : chatStreaming + history
    // contient un tour avec answer != "".
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
    // Auto-reply fires synchronously after missing-info handler ;
    // observe the post-auto-reply state directly.
    await waitFor(() => expect(result.current.mode).toBe('chatStreaming'));
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].question).toBe('Q1?\nQ2?');
    expect(result.current.history[0].answer).not.toBe('');
    expect(result.current.chatTurnCount).toBe(1);
  });

  it('auto-reply propagates the AUTO_REPLY answer to the next RestructureStart call', async () => {
    // Post UI-019 amendments 2026-05-10b — l'auto-reply remplace
    // l'answerChat utilisateur. On vérifie que mockStart est invoqué
    // avec un history non vide où la dernière answer = AUTO_REPLY.
    const { result } = renderHook(() => useRestructureSession());
    await act(async () => {
      await result.current.start(STARTED_INPUT);
    });
    mockStart.mockClear();
    act(() => {
      fakeRuntime._emit('spdd:restructure:missing-info', {
        sessionID: 'restruct-1',
        questions: ['Q1?'],
        rawResponse: '',
      });
    });
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    const callArgs = mockStart.mock.calls[mockStart.mock.calls.length - 1][0] as {
      history: Array<{ question: string; answer: string }>;
    };
    expect(callArgs.history).toHaveLength(1);
    expect(callArgs.history[0].question).toBe('Q1?');
    expect(callArgs.history[0].answer).not.toBe('');
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

  // UI-019 — turn-limit retiré (décision utilisateur post-revue).
  // La conversation chat est désormais illimitée côté frontend ET
  // côté Go ; le test "exhausted at 5 turns" devient obsolète.
});
