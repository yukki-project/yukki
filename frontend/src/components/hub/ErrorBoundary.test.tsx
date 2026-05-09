import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('../../../wailsjs/go/main/App', () => ({
  OpenLogsFolder: vi.fn().mockResolvedValue(undefined),
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import { OpenLogsFolder } from '../../../wailsjs/go/main/App';
const mockOpen = OpenLogsFolder as unknown as ReturnType<typeof vi.fn>;

function Crash({ when }: { when: boolean }): JSX.Element {
  if (when) throw new Error('explosion');
  return <div>ok</div>;
}

beforeEach(() => {
  mockOpen.mockClear();
  // Silence the React error log noise that componentDidCatch produces
  // in jsdom.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Crash when={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
    cleanup();
  });

  it('renders fallback panel when child throws', () => {
    render(
      <ErrorBoundary>
        <Crash when={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByText('explosion')).toBeInTheDocument();
    cleanup();
  });

  it('"Ouvrir les logs" calls OpenLogsFolder', () => {
    render(
      <ErrorBoundary>
        <Crash when={true} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir les logs/i }));
    expect(mockOpen).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('"Copier" copies message + stack to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(
      <ErrorBoundary>
        <Crash when={true} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Copier/i }));
    // micro-task flush
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('explosion'),
    );
    cleanup();
  });
});
