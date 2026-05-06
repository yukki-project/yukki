import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeBlock } from './CodeBlock';

// Mock shiki — dynamic import in CodeBlock
vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockResolvedValue('<pre><code class="shiki">highlighted</code></pre>'),
}));

// Mock clipboard
const writeText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CodeBlock', () => {
  it('renders fallback pre/code before shiki resolves', () => {
    render(<CodeBlock language="go">{"func main() {}"}</CodeBlock>);
    expect(screen.getByText('func main() {}')).toBeInTheDocument();
  });

  it('renders shiki highlighted HTML after import resolves', async () => {
    const { container } = render(<CodeBlock language="go">{"func main() {}"}</CodeBlock>);
    await waitFor(() => {
      expect(container.querySelector('.shiki')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('copy button calls clipboard.writeText with code content', async () => {
    render(<CodeBlock language="go">{"func main() {}"}</CodeBlock>);
    fireEvent.click(screen.getByRole('button', { name: /copier le code/i }));
    expect(writeText).toHaveBeenCalledWith('func main() {}');
  });

  it('copy button shows Copié! immediately after click', async () => {
    render(<CodeBlock language="go">{"func main() {}"}</CodeBlock>);
    fireEvent.click(screen.getByRole('button', { name: /copier le code/i }));
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Copié'));
  });
});
