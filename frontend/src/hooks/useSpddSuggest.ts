// UI-014f — O3: useSpddSuggest hook.
// Manages streaming LLM suggestions via Wails events.
// Fully independent of the Zustand store — the component layer drives
// state transitions (aiPhase) based on the hook's output.

import { useCallback, useEffect, useRef, useState } from 'react';

export type SuggestState = 'idle' | 'streaming' | 'done' | 'error';

export interface SuggestionRequest {
  section: string;
  action: string;
  selectedText: string;
  previousSuggestion?: string;
}

export interface SpddSuggestResult {
  state: SuggestState;
  streamText: string;
  sessionId: string | null;
  durationMs: number | null;
  error: string | null;
  start: (req: SuggestionRequest) => Promise<void>;
  cancel: () => Promise<void>;
  preview: (req: SuggestionRequest) => Promise<string>;
  reset: () => void;
}

/**
 * Hook that manages a single streaming suggestion session.
 * Subscribes to the Wails events:
 *   - `spdd:suggest:chunk`  → append to streamText
 *   - `spdd:suggest:done`   → transition to 'done'
 *   - `spdd:suggest:error`  → transition to 'error'
 */
export function useSpddSuggest(): SpddSuggestResult {
  const [state, setState] = useState<SuggestState>('idle');
  const [streamText, setStreamText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Accumulate chunks without triggering a re-render on every character.
  const chunkBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to Wails events for the lifetime of the hook.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = (window as any).runtime;
    if (!runtime?.EventsOn) return;

    const offChunk = runtime.EventsOn(
      'spdd:suggest:chunk',
      (data: { text: string }) => {
        chunkBufferRef.current += data?.text ?? '';
        // Batch DOM updates to ~60fps instead of every chunk.
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            setStreamText(chunkBufferRef.current);
            flushTimerRef.current = null;
          }, 16);
        }
      },
    );

    const offDone = runtime.EventsOn(
      'spdd:suggest:done',
      (data: { durationMs: number }) => {
        // Flush any remaining buffered chunks before transitioning.
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        setStreamText(chunkBufferRef.current);
        setDurationMs(data?.durationMs ?? null);
        setState('done');
      },
    );

    const offError = runtime.EventsOn(
      'spdd:suggest:error',
      (data: { message: string }) => {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        setError(data?.message ?? 'Erreur inconnue');
        setState('error');
      },
    );

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async (req: SuggestionRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (window as any).go;
    if (!go?.uiapp?.App?.SpddSuggestStart) {
      setError('Wails non disponible');
      setState('error');
      return;
    }

    // Reset before starting a new session.
    chunkBufferRef.current = '';
    setStreamText('');
    setSessionId(null);
    setDurationMs(null);
    setError(null);
    setState('streaming');

    try {
      const id: string = await go.uiapp.App.SpddSuggestStart({
        section: req.section,
        action: req.action,
        selectedText: req.selectedText,
        previousSuggestion: req.previousSuggestion ?? '',
      });
      setSessionId(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setState('error');
    }
  }, []);

  const cancel = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (window as any).go;
    if (!go?.uiapp?.App?.SpddSuggestCancel || !sessionId) return;

    try {
      await go.uiapp.App.SpddSuggestCancel(sessionId);
    } catch {
      // "session not found" on double-cancel is expected — ignore silently.
    }
  }, [sessionId]);

  const preview = useCallback(async (req: SuggestionRequest): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (window as any).go;
    if (!go?.uiapp?.App?.SpddSuggestPreview) {
      return '(Wails non disponible — preview indisponible)';
    }

    try {
      return await go.uiapp.App.SpddSuggestPreview({
        section: req.section,
        action: req.action,
        selectedText: req.selectedText,
        previousSuggestion: req.previousSuggestion ?? '',
      });
    } catch (err) {
      return `(Erreur : ${err instanceof Error ? err.message : String(err)})`;
    }
  }, []);

  const reset = useCallback(() => {
    chunkBufferRef.current = '';
    setStreamText('');
    setSessionId(null);
    setDurationMs(null);
    setError(null);
    setState('idle');
  }, []);

  return { state, streamText, sessionId, durationMs, error, start, cancel, preview, reset };
}
