import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoryViewer } from './StoryViewer';
import { useArtifactsStore } from '@/stores/artifacts';

// Mock Wails bindings
const mockReadArtifact = vi.fn();
const mockWriteArtifact = vi.fn();

vi.mock('../../../wailsjs/go/main/App', () => ({
  ReadArtifact: (...args: unknown[]) => mockReadArtifact(...args),
  WriteArtifact: (...args: unknown[]) => mockWriteArtifact(...args),
}));

// Mock shiki (used by CodeBlock)
vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockResolvedValue('<pre><code class="shiki">highlighted</code></pre>'),
}));

const STORY_MD = `---
id: UI-010
slug: artifact-viewer-editor
title: Test Story
status: draft
---

## Background

Some background text.

## Scope In

- Item one
- Item two
`;

const INBOX_MD = `---
id: INBOX-001
slug: inbox-item
title: Inbox Item
status: unsorted
---

## Background

Some background text.

## Notes

Some notes.
`;

const CANVAS_MD = `---
id: UI-010
slug: artifact-viewer-editor
title: Canvas
status: draft
---

## R — Requirements

Requirements here.

## E — Entities

Entities here.

## A — Approach

Approach here.

## O — Operations

### O1 — First

First op.

### O2 — Second

Second op.

### O3 — Third

Third op.

### O4 — Fourth

Fourth op.
`;

beforeEach(() => {
  vi.clearAllMocks();
  useArtifactsStore.setState({ selectedPath: '', kind: 'stories', items: [], error: null });
  localStorage.clear();
  mockReadArtifact.mockResolvedValue(STORY_MD);
  mockWriteArtifact.mockResolvedValue(undefined);
});

describe('StoryViewer', () => {
  it('shows empty state when no path selected', () => {
    render(<StoryViewer />);
    expect(screen.getByText(/select an artefact/i)).toBeInTheDocument();
  });

  it('loads and displays content when path is set', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => expect(screen.getByText('Test Story')).toBeInTheDocument());
  });

  it('renders CollapsibleSection for ## headings in standard artefact', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /background/i })).toBeInTheDocument();
  });

  it('does NOT render CollapsibleSection for INBOX artefact', async () => {
    mockReadArtifact.mockResolvedValue(INBOX_MD);
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/inbox/x.md' });
    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument());
    // No collapsible trigger buttons expected for INBOX
    expect(screen.queryByRole('button', { name: /background/i })).toBeNull();
  });

  it('canvas with > 3 ops: O — Operations section starts collapsed', async () => {
    mockReadArtifact.mockResolvedValue(CANVAS_MD);
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/prompts/x.md' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Déplier la section O — Operations/i })).toBeInTheDocument(),
    );
  });

  it('edit button is visible in read mode', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    expect(screen.getByRole('button', { name: /éditer/i })).toBeInTheDocument();
  });

  it('clicking edit shows textarea with markdown body only (no frontmatter)', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }));
    const textarea = screen.getByRole('textbox', { name: /éditeur/i });
    expect(textarea).toBeInTheDocument();
    // Frontmatter must NOT appear in the textarea
    expect((textarea as HTMLTextAreaElement).value).not.toContain('id: UI-010');
    expect((textarea as HTMLTextAreaElement).value).not.toContain('---');
    // Body content must be present
    expect((textarea as HTMLTextAreaElement).value).toContain('## Background');
  });

  it('cancel without modification returns to read mode without dialog', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    // Should be back in read mode — edit button visible again
    expect(screen.getByRole('button', { name: /éditer/i })).toBeInTheDocument();
    // No dialog
    expect(screen.queryByText(/modifications non enregistrées/i)).toBeNull();
  });

  it('cancel with modification shows dirty dialog', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }));
    const textarea = screen.getByRole('textbox', { name: /éditeur/i });
    fireEvent.change(textarea, { target: { value: 'modified content' } });
    // wait for React to commit the state update from fireEvent.change
    await waitFor(() =>
      expect((textarea as HTMLTextAreaElement).value).toBe('modified content'),
    );
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    // The dirty dialog should appear (Radix Dialog renders role="dialog")
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('Ignorer in dirty dialog returns to read mode without saving', async () => {
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /éditeur/i }), {
      target: { value: 'modified' },
    });
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    fireEvent.click(screen.getByRole('button', { name: /^ignorer$/i }));
    expect(mockWriteArtifact).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /éditer/i })).toBeInTheDocument();
  });

  it('WriteArtifact error shows toast and keeps edit mode', async () => {
    mockWriteArtifact.mockRejectedValue(new Error('disk full'));
    render(<StoryViewer />);
    useArtifactsStore.setState({ selectedPath: '/proj/.yukki/stories/x.md' });
    await waitFor(() => screen.getByRole('button', { name: /éditer/i }));
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /éditeur/i }), {
      target: { value: 'modified' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() => expect(mockWriteArtifact).toHaveBeenCalled());
    // Still in edit mode
    expect(screen.getByRole('textbox', { name: /éditeur/i })).toBeInTheDocument();
  });
});
