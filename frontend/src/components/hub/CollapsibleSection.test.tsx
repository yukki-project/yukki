import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

const storageKey = 'yukki:sections:/test/path.md';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('CollapsibleSection', () => {
  it('content is visible when defaultOpen=true and no localStorage state', () => {
    render(
      <CollapsibleSection title="R — Requirements" storageKey={storageKey} defaultOpen>
        <p>content here</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('content here')).toBeVisible();
  });

  it('content is NOT in DOM when defaultOpen=false (Radix unmounts closed content)', () => {
    render(
      <CollapsibleSection title="O — Operations" storageKey={storageKey} defaultOpen={false}>
        <p>ops content</p>
      </CollapsibleSection>,
    );
    // Radix Collapsible.Content is unmounted when open=false (no forceMount)
    expect(screen.queryByText('ops content')).toBeNull();
  });

  it('clicking trigger toggles the section and persists to localStorage', () => {
    render(
      <CollapsibleSection title="R — Requirements" storageKey={storageKey} defaultOpen>
        <p>content here</p>
      </CollapsibleSection>,
    );

    fireEvent.click(screen.getByRole('button'));

    const stored: string[] = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    expect(stored).toContain('R — Requirements');
  });

  it('restores collapsed state from localStorage even when defaultOpen=true', () => {
    // Pre-populate localStorage with the section as collapsed
    localStorage.setItem(storageKey, JSON.stringify(['R — Requirements']));

    render(
      <CollapsibleSection title="R — Requirements" storageKey={storageKey} defaultOpen>
        <p>content here</p>
      </CollapsibleSection>,
    );

    // Section should start closed (collapsed in storage)
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Déplier'));
  });

  it('clicking trigger twice removes section from collapsed set', () => {
    localStorage.setItem(storageKey, JSON.stringify(['R — Requirements']));

    render(
      <CollapsibleSection title="R — Requirements" storageKey={storageKey} defaultOpen>
        <p>content here</p>
      </CollapsibleSection>,
    );

    // First click: open (remove from collapsed)
    fireEvent.click(screen.getByRole('button'));
    let stored: string[] = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    expect(stored).not.toContain('R — Requirements');

    // Second click: close again
    fireEvent.click(screen.getByRole('button'));
    stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    expect(stored).toContain('R — Requirements');
  });
});
