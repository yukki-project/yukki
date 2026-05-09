// OPS-001 O10 — global React ErrorBoundary mounted around <App />
// in main.tsx. Replaces the gray-screen of doom with a readable
// fallback panel.
//
// Constraints (canvas safeguard I3 — "ErrorBoundary survit à ses
// propres erreurs") : the fallback is plain HTML with inline styles
// and no shadcn/Radix dependency. If the component lib breaks, this
// panel still renders.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { OpenLogsFolder } from '../../../wailsjs/go/main/App';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? '' });
    logger.error(error.message, error);
  }

  private handleCopy = async (): Promise<void> => {
    const { error, componentStack } = this.state;
    if (!error) return;
    const payload = [
      error.message,
      error.stack ?? '',
      componentStack ? `\nComponent stack:\n${componentStack}` : '',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // clipboard may be unavailable in some webview contexts —
      // logging is enough, the user can also "Open logs" instead.
      logger.warn('clipboard write failed');
    }
  };

  private handleOpenLogs = (): void => {
    void OpenLogsFolder().catch((err: unknown) => {
      logger.error(
        'OpenLogsFolder failed',
        err instanceof Error ? err : new Error(String(err)),
      );
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          padding: '32px',
          backgroundColor: '#0c0d12',
          color: '#e6e7ee',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: '14px',
          lineHeight: 1.5,
          overflowY: 'auto',
        }}
      >
        <h1 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px' }}>
          Une erreur est survenue
        </h1>
        <pre
          style={{
            backgroundColor: '#181a21',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #23252e',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '16px',
          }}
        >
          {error.message}
        </pre>

        <details style={{ marginBottom: '16px' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
            Détails (stack trace)
          </summary>
          <pre
            style={{
              backgroundColor: '#131419',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #1c1e25',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
              color: '#9ea1b3',
              maxHeight: '320px',
              overflow: 'auto',
            }}
          >
            {error.stack ?? ''}
            {componentStack ? `\n\nComponent stack:${componentStack}` : ''}
          </pre>
        </details>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={this.handleCopy}
            style={buttonStyle}
          >
            Copier
          </button>
          <button
            type="button"
            onClick={this.handleOpenLogs}
            style={buttonStyle}
          >
            Ouvrir les logs
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            style={{ ...buttonStyle, backgroundColor: '#8b6cff', color: '#ffffff' }}
          >
            Recharger l'app
          </button>
        </div>

        <p
          style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#6b6e80',
          }}
        >
          Avant de partager : ce log peut contenir des chemins de votre
          système ou des noms de projet. Relisez-le avant envoi.
        </p>
      </div>
    );
  }
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '13px',
  borderRadius: '4px',
  border: '1px solid #23252e',
  backgroundColor: '#181a21',
  color: '#e6e7ee',
  cursor: 'pointer',
};
