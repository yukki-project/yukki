// UI-019 O5 — hook qui orchestre une session de restructuration LLM.
//
// Souscrit aux events Wails `spdd:restructure:*` émis par le backend
// (`uiapp.RestructureStart`), tient la state machine `idle → streaming
// → preview / chat / exhausted / error` et expose une API impérative
// (`start`, `answerChat`, `cancel`, `reset`) pour le composant
// consumer (SpddInspector).
//
// La duplication ~80 lignes avec `useSpddSuggest` est documentée comme
// dette technique au canvas (extraction d'un hook de base partagé en
// suivi).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RestructureStart as WailsRestructureStart,
  RestructureCancel as WailsRestructureCancel,
} from '../../wailsjs/go/main/App';
import type {
  DivergenceSnapshot,
  RestructureTurn,
} from '../../wailsjs/go/main/App';
import { logger } from '@/lib/logger';
import { useRestructureStore } from '@/stores/restructure';

export type RestructureMode =
  | 'idle'
  | 'streaming'
  | 'preview'
  | 'chatStreaming'
  | 'chatAwaitingUser'
  | 'exhausted'
  | 'error';

interface StartInput {
  fullMarkdown: string;
  templateName: string;
  divergence: DivergenceSnapshot;
}

export interface RestructureSession {
  mode: RestructureMode;
  streamText: string;
  sessionId: string | null;
  questions: string[];
  history: RestructureTurn[];
  chatTurnCount: number;
  error: string | null;

  start: (input: StartInput) => Promise<void>;
  answerChat: (answer: string) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

const MAX_TURNS = 5;

interface MissingInfoPayload {
  sessionID: string;
  questions: string[];
  rawResponse: string;
}

interface DonePayload {
  sessionID: string;
  fullText: string;
  durationMs: number;
}

interface ChunkPayload {
  sessionID: string;
  text: string;
}

interface ErrorPayload {
  sessionID: string;
  message: string;
  technical?: string;
}

interface WailsRuntime {
  EventsOn: (
    eventName: string,
    callback: (...data: unknown[]) => void,
  ) => () => void;
}

export function useRestructureSession(): RestructureSession {
  const [mode, setMode] = useState<RestructureMode>('idle');
  const [streamText, setStreamText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [history, setHistory] = useState<RestructureTurn[]>([]);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Buffer chunks then flush at ~60fps (mirror useSpddSuggest).
  const chunkBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest sessionId for the cancel cleanup (avoid stale closure).
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Latest input for relaunches in answerChat (the start input is
  // passed once; subsequent turns reuse it).
  const lastStartInputRef = useRef<StartInput | null>(null);

  // Start input + history snapshot — sent to setAfter once 'done'
  // arrives so the diff preview rendering knows the original.
  const setOverlayAfter = useRestructureStore((s) => s.setAfter);

  // Subscribe to Wails events for the lifetime of the hook.
  useEffect(() => {
    const runtime = (window as unknown as { runtime?: WailsRuntime }).runtime;
    if (!runtime?.EventsOn) return;

    const offChunk = runtime.EventsOn('spdd:restructure:chunk', (...data: unknown[]) => {
      const payload = data[0] as ChunkPayload | undefined;
      if (!payload?.text) return;
      chunkBufferRef.current += payload.text;
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          setStreamText(chunkBufferRef.current);
          flushTimerRef.current = null;
        }, 16);
      }
    });

    const offDone = runtime.EventsOn('spdd:restructure:done', (...data: unknown[]) => {
      const payload = data[0] as DonePayload | undefined;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const finalText = payload?.fullText ?? chunkBufferRef.current;
      setStreamText(finalText);
      setOverlayAfter(finalText);
      setMode('preview');
    });

    const offMissing = runtime.EventsOn(
      'spdd:restructure:missing-info',
      (...data: unknown[]) => {
        const payload = data[0] as MissingInfoPayload | undefined;
        if (!payload) return;
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        const qs = payload.questions ?? [];
        setQuestions(qs);
        // Push the new question turn with empty answer; answerChat
        // will fill it before relaunching.
        setHistory((prev) => [...prev, { question: qs.join('\n'), answer: '' }]);
        setMode('chatAwaitingUser');
      },
    );

    const offError = runtime.EventsOn('spdd:restructure:error', (...data: unknown[]) => {
      const payload = data[0] as ErrorPayload | undefined;
      setError(payload?.message ?? 'Erreur inconnue');
      setMode('error');
    });

    return () => {
      offChunk();
      offDone();
      offMissing();
      offError();
    };
  }, [setOverlayAfter]);

  // Cleanup on unmount: cancel any active session.
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        void WailsRestructureCancel(sid).catch((err: unknown) => {
          logger.warn('RestructureCancel on unmount failed', {
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }
    };
  }, []);

  const start = useCallback(async (input: StartInput) => {
    if (chatTurnCount >= MAX_TURNS) {
      setMode('exhausted');
      return;
    }
    lastStartInputRef.current = input;
    setMode('streaming');
    setStreamText('');
    chunkBufferRef.current = '';
    setError(null);
    setHistory([]);
    setChatTurnCount(0);
    try {
      const sid = await WailsRestructureStart({
        fullMarkdown: input.fullMarkdown,
        templateName: input.templateName,
        divergence: input.divergence,
        history: [],
      });
      setSessionId(sid);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setMode('error');
    }
  }, [chatTurnCount]);

  const answerChat = useCallback(async (answer: string) => {
    const startInput = lastStartInputRef.current;
    if (!startInput) {
      logger.warn('answerChat called before start');
      return;
    }
    if (chatTurnCount + 1 > MAX_TURNS) {
      setMode('exhausted');
      return;
    }

    // Fill the empty answer of the last pushed turn.
    const updatedHistory: RestructureTurn[] = history.length === 0
      ? [{ question: '', answer }]
      : history.map((t, i) => (i === history.length - 1 ? { ...t, answer } : t));
    setHistory(updatedHistory);
    setChatTurnCount((n) => n + 1);
    setMode('chatStreaming');
    setStreamText('');
    chunkBufferRef.current = '';

    try {
      const sid = await WailsRestructureStart({
        fullMarkdown: startInput.fullMarkdown,
        templateName: startInput.templateName,
        divergence: startInput.divergence,
        history: updatedHistory,
      });
      setSessionId(sid);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setMode('error');
    }
  }, [chatTurnCount, history]);

  const cancel = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await WailsRestructureCancel(sid);
      } catch (err: unknown) {
        logger.warn('RestructureCancel failed', {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    setMode('idle');
    setStreamText('');
    chunkBufferRef.current = '';
    setSessionId(null);
  }, []);

  const reset = useCallback(() => {
    setMode('idle');
    setStreamText('');
    setSessionId(null);
    setQuestions([]);
    setHistory([]);
    setChatTurnCount(0);
    setError(null);
    chunkBufferRef.current = '';
    lastStartInputRef.current = null;
  }, []);

  return {
    mode,
    streamText,
    sessionId,
    questions,
    history,
    chatTurnCount,
    error,
    start,
    answerChat,
    cancel,
    reset,
  };
}
