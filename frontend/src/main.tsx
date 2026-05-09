import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/hub/ErrorBoundary';
import { logger } from './lib/logger';
import { hydrateBuildFlags } from './lib/buildFlags';
import './styles/globals.css';

// OPS-001 O11 — capture frontend-level exceptions that escape the
// React tree (event handlers, async work) so they still land in the
// shared daily log file.
window.addEventListener('error', (event) => {
  const stack = event.error instanceof Error ? event.error.stack ?? '' : '';
  logger.error(event.message || 'window.onerror', { stack });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason instanceof Error) {
    logger.error(reason.message || 'unhandledrejection', reason);
  } else {
    logger.error('unhandledrejection', { reason: String(reason) });
  }
});

// OPS-001 prompt-update fix — hydrate buildFlags BEFORE the first
// render so isDevBuild() returns the correct value when components
// mount. Otherwise DeveloperMenu / LogsDrawer / TitleBar badge would
// see false on first paint and never re-render after hydration
// completes (no Zustand store, no signal to React).
//
// The IPC round-trip is single-digit ms; users don't notice. If the
// binding fails, hydrateBuildFlags() catches and leaves the flag at
// false (release-safe default).
async function bootstrap(): Promise<void> {
  await hydrateBuildFlags();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
