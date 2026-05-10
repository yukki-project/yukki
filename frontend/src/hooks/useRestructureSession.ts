// UI-019 O5 — hook qui orchestre une session de restructuration LLM.
//
// Souscrit aux events Wails `spdd:restructure:*` émis par le backend
// (`uiapp.RestructureStart`), tient la state machine `idle → streaming
// → preview / chat / error` et expose une API impérative
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
  | 'error';

interface StartInput {
  fullMarkdown: string;
  templateName: string;
  divergence: DivergenceSnapshot;
}

export interface RestructureSession {
  mode: RestructureMode;
  streamText: string;
  /** Chain-of-thought de Claude (extended thinking). Accumulé en
   * parallèle de streamText quand l'événement `spdd:restructure:thinking`
   * arrive. Vide pour les modèles qui n'émettent pas de blocs
   * thinking (Claude < 4 ou effort low). */
  thinkingText: string;
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

// MAX_AUTO_TURNS : nombre maximum de tours auto-répondus par yukki à
// Claude avant d'abandonner et de basculer en preview avec ce que
// Claude a produit en dernier. L'utilisateur n'intervient pas dans
// la conversation — yukki répond à sa place avec une consigne
// fixe qui pousse Claude à utiliser des placeholders `<à compléter>`
// plutôt que de redemander.
const MAX_AUTO_TURNS = 10;

const AUTO_REPLY = "L'utilisateur n'intervient pas. Remplis les sections que tu ne peux pas compléter avec le placeholder `<à compléter>` et produis le markdown final maintenant. Ne pose plus de questions.";

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
  const [thinkingText, setThinkingText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [history, setHistory] = useState<RestructureTurn[]>([]);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Buffer chunks then flush at ~60fps (mirror useSpddSuggest).
  const chunkBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingBufferRef = useRef('');
  const thinkingFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const offThinking = runtime.EventsOn('spdd:restructure:thinking', (...data: unknown[]) => {
      const payload = data[0] as ChunkPayload | undefined;
      if (!payload?.text) return;
      thinkingBufferRef.current += payload.text;
      if (!thinkingFlushTimerRef.current) {
        thinkingFlushTimerRef.current = setTimeout(() => {
          setThinkingText(thinkingBufferRef.current);
          thinkingFlushTimerRef.current = null;
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
      offThinking();
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
    lastStartInputRef.current = input;
    setMode('streaming');
    setStreamText('');
    setThinkingText('');
    chunkBufferRef.current = '';
    thinkingBufferRef.current = '';
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

    // Fill the empty answer of the last pushed turn.
    const updatedHistory: RestructureTurn[] = history.length === 0
      ? [{ question: '', answer }]
      : history.map((t, i) => (i === history.length - 1 ? { ...t, answer } : t));
    setHistory(updatedHistory);
    setChatTurnCount((n) => n + 1);
    setMode('chatStreaming');
    setStreamText('');
    setThinkingText('');
    chunkBufferRef.current = '';
    thinkingBufferRef.current = '';

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
    setThinkingText('');
    chunkBufferRef.current = '';
    thinkingBufferRef.current = '';
    setSessionId(null);
  }, []);

  // Auto-conversation : quand Claude émet `missing-info`, yukki
  // répond automatiquement à sa place avec AUTO_REPLY (cf. décision
  // user — l'utilisateur n'intervient pas dans la conversation, il
  // valide juste le résultat final). Au-delà de MAX_AUTO_TURNS on
  // bascule en error pour éviter une boucle infinie LLM.
  useEffect(() => {
    if (mode !== 'chatAwaitingUser') return;
    if (chatTurnCount >= MAX_AUTO_TURNS) {
      setError(
        `Claude redemande des informations après ${MAX_AUTO_TURNS} tours. Abandon — vérifie le résultat partiel ou refuse pour réessayer.`,
      );
      setMode('error');
      return;
    }
    void answerChat(AUTO_REPLY);
  }, [mode, chatTurnCount, answerChat]);

  const reset = useCallback(() => {
    setMode('idle');
    setStreamText('');
    setThinkingText('');
    setSessionId(null);
    setQuestions([]);
    setHistory([]);
    setChatTurnCount(0);
    setError(null);
    chunkBufferRef.current = '';
    thinkingBufferRef.current = '';
    lastStartInputRef.current = null;
  }, []);

  return {
    mode,
    streamText,
    thinkingText,
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
