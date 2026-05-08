// UI-021 O5 — Tests du hook useKeyboardShortcut.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, cleanup } from '@testing-library/react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

interface ProbeProps {
  triggerKey: string;
  handler: (event: KeyboardEvent) => void;
  withInput?: boolean;
}

function Probe({ triggerKey, handler, withInput }: ProbeProps): JSX.Element {
  useKeyboardShortcut(triggerKey, handler);
  return (
    <div>
      {withInput ? <input type="text" data-testid="field" /> : null}
      <span data-testid="anchor" />
    </div>
  );
}

describe('useKeyboardShortcut', () => {
  afterEach(() => cleanup());

  it('triggers handler on matching key outside input', () => {
    const handler = vi.fn();
    render(<Probe triggerKey="F1" handler={handler} />);

    fireEvent.keyDown(document, { key: 'F1' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores when focus is inside an input', () => {
    const handler = vi.fn();
    const { getByTestId } = render(
      <Probe triggerKey="F1" handler={handler} withInput />,
    );
    const input = getByTestId('field');
    input.focus();

    fireEvent.keyDown(input, { key: 'F1' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores keys other than the configured one', () => {
    const handler = vi.fn();
    render(<Probe triggerKey="F1" handler={handler} />);

    fireEvent.keyDown(document, { key: 'F2' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up the listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = render(<Probe triggerKey="F1" handler={handler} />);

    unmount();
    fireEvent.keyDown(document, { key: 'F1' });

    expect(handler).not.toHaveBeenCalled();
  });
});
