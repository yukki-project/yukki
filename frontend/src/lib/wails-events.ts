// AV-WORKAROUND STUB — wrapper around the Wails runtime events API
// (window.runtime.EventsOn). Hand-written to keep typing strict and to
// surface UI-001c payloads as first-class TS interfaces.

export interface ProviderStartPayload {
  label: string;
}

export interface ProviderEndPayload {
  success: boolean;
  path: string;
  error: string;
  durationMs: number;
}

interface WailsRuntime {
  EventsOn: (eventName: string, callback: (...data: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    runtime?: WailsRuntime;
  }
}

/**
 * Subscribe to a Wails event. Returns an unsubscribe function the
 * caller MUST invoke at component unmount.
 *
 * Wails 2.x EventsOn returns the unsubscribe function directly — we
 * forward it. If the runtime is not ready at call time, we no-op
 * (the caller will retry on next render).
 */
export function EventsOn<T>(name: string, handler: (payload: T) => void): () => void {
  if (typeof window === 'undefined' || !window.runtime?.EventsOn) {
    return () => {};
  }
  const cancel = window.runtime.EventsOn(name, (...data: unknown[]) => {
    handler(data[0] as T);
  });
  return typeof cancel === 'function' ? cancel : () => {};
}
