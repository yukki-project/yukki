// AV-WORKAROUND STUB — wrapper around the Wails runtime events API
// (window.runtime.EventsOn / EventsOff). Hand-written to keep typing
// strict and to surface UI-001c payloads as first-class TS interfaces.

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
  EventsOn: (eventName: string, callback: (...data: unknown[]) => void) => void;
  EventsOff: (eventName: string, ...handlers: Array<(...data: unknown[]) => void>) => void;
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
 * Wails passes the payload as the first variadic argument; we cast
 * to T at the boundary and trust the wire contract.
 */
export function EventsOn<T>(name: string, handler: (payload: T) => void): () => void {
  if (typeof window === 'undefined' || !window.runtime) {
    return () => {};
  }
  const wrapped = (...data: unknown[]) => {
    handler(data[0] as T);
  };
  window.runtime.EventsOn(name, wrapped);
  return () => {
    window.runtime?.EventsOff(name, wrapped);
  };
}
