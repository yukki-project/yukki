// OPS-001 O8 — frontend logger façade.
//
// Single entry point for every log call in the frontend. Sends the
// event via the Wails IPC binding `LogToBackend` so it lands in the
// shared daily log file (slog text format, OPS-001 invariant I4 —
// source identifiable). Falls back to console.* when the binding is
// unavailable (vitest, SSR, dev preview).
//
// Norm: console.* is forbidden in production code outside this file.

import { LogToBackend } from '../../wailsjs/go/main/App';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

// formatFields renders fields as `k=v` pairs sorted by key, mirroring
// the slog text handler convention of quoting any string that contains
// whitespace. Bare alphanumerics stay unquoted to keep the file
// readable when grep'd.
function needsQuote(s: string): boolean {
  return /[\s"\\]/.test(s) || s === '';
}

function formatValue(v: unknown): string {
  if (typeof v === 'string') {
    return needsQuote(v) ? JSON.stringify(v) : v;
  }
  return JSON.stringify(v);
}

function formatFields(fields?: LogFields): string {
  if (!fields) return '';
  const keys = Object.keys(fields).sort();
  return keys.map((k) => `${k}=${formatValue(fields[k])}`).join(' ');
}

function send(level: LogLevel, msg: string, stack: string): void {
  // Fire-and-forget: the IPC may throw if window.go is not yet
  // bound (test/SSR). Silently fall back to the console so log
  // calls never propagate failures (OPS-001 invariant I1).
  try {
    void LogToBackend({
      Level: level,
      Source: 'frontend',
      Msg: msg,
      Stack: stack,
    });
  } catch {
    // Wails not available — already echoed to console below.
  }
  consoleEcho(level, msg, stack);
}

function consoleEcho(level: LogLevel, msg: string, stack: string): void {
  const tail = stack ? `\n${stack}` : '';
  switch (level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(msg + tail);
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(msg + tail);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(msg + tail);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(msg + tail);
      break;
  }
}

function joinMsg(msg: string, fields?: LogFields): string {
  const fmt = formatFields(fields);
  return fmt ? `${msg} ${fmt}` : msg;
}

export const logger = {
  debug(msg: string, fields?: LogFields): void {
    send('debug', joinMsg(msg, fields), '');
  },
  info(msg: string, fields?: LogFields): void {
    send('info', joinMsg(msg, fields), '');
  },
  warn(msg: string, fields?: LogFields): void {
    send('warn', joinMsg(msg, fields), '');
  },
  error(msg: string, errOrFields?: Error | LogFields): void {
    if (errOrFields instanceof Error) {
      send('error', errOrFields.message || msg, errOrFields.stack ?? '');
      return;
    }
    send('error', joinMsg(msg, errOrFields), '');
  },
};
