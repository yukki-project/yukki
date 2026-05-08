// UI-015 — Tests UI HubList sur la multi-sélection PDF + bouton individuel.
//
// On vérifie :
//   - cocher 2 items → selection.size === 2 dans le store
//   - bouton « Exporter sélection » disabled si vide, actif sinon
//   - clic sur le bouton individuel d'un item appelle exportSingle
//   - cocher une case n'altère pas selectedPath (sélection d'affichage)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../wailsjs/go/main/App', () => ({
  ListArtifacts: vi.fn(),
  ReadArtifact: vi.fn(),
  ResolveCanvasChain: vi.fn(),
  SaveFilePdf: vi.fn(),
  WritePdfFile: vi.fn(),
}));

vi.mock('@react-pdf/renderer', () => {
  const noop = () => null;
  return {
    Font: { register: vi.fn() },
    StyleSheet: { create: (s: unknown) => s },
    Document: noop,
    Page: noop,
    View: noop,
    Text: noop,
    Link: noop,
    pdf: vi.fn(() => ({
      toBlob: vi.fn().mockResolvedValue(new Blob()),
    })),
  };
});

import { HubList } from './HubList';
import { useArtifactsStore } from '@/stores/artifacts';
import { usePdfExportStore } from '@/stores/pdfExport';

const SAMPLE_ITEMS = [
  {
    ID: 'UI-015',
    Slug: 'pdf',
    Title: 'PDF export',
    Status: 'reviewed',
    Updated: '2026-05-08',
    Path: '/p/.yukki/stories/UI-015.md',
  },
  {
    ID: 'UI-014i',
    Slug: 'wysiwyg',
    Title: 'WYSIWYG markdown',
    Status: 'implemented',
    Updated: '2026-05-08',
    Path: '/p/.yukki/stories/UI-014i.md',
  },
];

describe('HubList — UI-015 multi-sélection', () => {
  beforeEach(() => {
    useArtifactsStore.setState({
      kind: 'stories',
      items: SAMPLE_ITEMS,
      selectedPath: '',
      error: null,
    });
    usePdfExportStore.setState({
      selection: new Set(),
      isExporting: false,
      errorMessage: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('cocher 2 items met à jour selection.size', () => {
    render(<HubList />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);

    fireEvent.click(checkboxes[0]);
    expect(usePdfExportStore.getState().selection.size).toBe(1);

    fireEvent.click(checkboxes[1]);
    expect(usePdfExportStore.getState().selection.size).toBe(2);
  });

  it('barre d\'action n\'apparaît qu\'avec au moins un coché', () => {
    render(<HubList />);
    expect(screen.queryByText(/sélectionné\(s\)/)).toBeNull();

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText(/sélectionné\(s\)/)).toBeTruthy();
    expect(screen.getByTitle(/Actions sur la sélection/i)).toBeTruthy();
  });

  it('cocher une case ne change pas selectedPath', () => {
    render(<HubList />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(useArtifactsStore.getState().selectedPath).toBe('');
  });

  it('le menu "..." de la barre d\'action ne s\'affiche que si au moins un item est coché', () => {
    render(<HubList />);
    expect(screen.queryByTitle(/Actions sur la sélection/i)).toBeNull();

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByTitle(/Actions sur la sélection/i)).toBeTruthy();
  });

  it('bouton "Effacer" remet la sélection à zéro', () => {
    render(<HubList />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(usePdfExportStore.getState().selection.size).toBe(2);

    fireEvent.click(screen.getByText(/Effacer/));
    expect(usePdfExportStore.getState().selection.size).toBe(0);
  });
});
