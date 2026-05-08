// UI-015 O7 — Tests du store pdfExport.
//
// Couvrent : toggleSelection, clearSelection, et le pipeline
// exportSelection (avec mock complet des bindings Wails et de
// @react-pdf/renderer).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  ReadArtifact: vi.fn(),
  ResolveCanvasChain: vi.fn(),
  SaveFilePdf: vi.fn(),
  WritePdfFile: vi.fn(),
}));

vi.mock('@react-pdf/renderer', () => {
  // Stubs minimaux pour les imports faits au chargement de PdfMarkdown
  // / PdfArtifactDocument (Font.register, StyleSheet.create, Document,
  // Page, View, Text, Link). On ne rend pas réellement le PDF — `pdf()`
  // retourne directement un Blob factice.
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
      toBlob: vi.fn().mockResolvedValue(new Blob(['fake-pdf'], { type: 'application/pdf' })),
    })),
  };
});

import {
  ReadArtifact,
  ResolveCanvasChain,
  SaveFilePdf,
  WritePdfFile,
} from '../../wailsjs/go/main/App';
import { useArtifactsStore } from './artifacts';
import { usePdfExportStore } from './pdfExport';

describe('usePdfExportStore — toggleSelection / clearSelection', () => {
  beforeEach(() => {
    usePdfExportStore.setState({
      selection: new Set(),
      isExporting: false,
      errorMessage: null,
    });
  });

  it('toggleSelection ajoute puis retire un path', () => {
    usePdfExportStore.getState().toggleSelection('/p/.yukki/stories/A.md');
    expect(usePdfExportStore.getState().selection.size).toBe(1);
    usePdfExportStore.getState().toggleSelection('/p/.yukki/stories/A.md');
    expect(usePdfExportStore.getState().selection.size).toBe(0);
  });

  it('toggleSelection accumule plusieurs paths', () => {
    usePdfExportStore.getState().toggleSelection('/p/A.md');
    usePdfExportStore.getState().toggleSelection('/p/B.md');
    usePdfExportStore.getState().toggleSelection('/p/C.md');
    expect(usePdfExportStore.getState().selection.size).toBe(3);
  });

  it('clearSelection vide complètement', () => {
    usePdfExportStore.getState().toggleSelection('/p/A.md');
    usePdfExportStore.getState().toggleSelection('/p/B.md');
    usePdfExportStore.getState().clearSelection();
    expect(usePdfExportStore.getState().selection.size).toBe(0);
    expect(usePdfExportStore.getState().errorMessage).toBeNull();
  });
});

describe('usePdfExportStore — exportSelection pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePdfExportStore.setState({
      selection: new Set(),
      isExporting: false,
      errorMessage: null,
    });
    useArtifactsStore.setState({
      kind: 'stories',
      items: [
        {
          ID: 'UI-015',
          Slug: 'pdf-export',
          Title: 'PDF export',
          Status: 'reviewed',
          Updated: '2026-05-08',
          Path: '/p/.yukki/stories/UI-015.md',
        },
      ],
      selectedPath: '',
      error: null,
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('appelle SaveFilePdf puis WritePdfFile avec un base64 non vide', async () => {
    vi.mocked(ReadArtifact).mockResolvedValue(`---
id: UI-015
title: PDF export
status: reviewed
updated: 2026-05-08
---

# Heading
Some text.`);
    vi.mocked(SaveFilePdf).mockResolvedValue('/output/spdd.pdf');
    vi.mocked(WritePdfFile).mockResolvedValue(undefined);

    usePdfExportStore.getState().toggleSelection('/p/.yukki/stories/UI-015.md');
    await usePdfExportStore.getState().exportSelection();

    expect(SaveFilePdf).toHaveBeenCalledTimes(1);
    expect(WritePdfFile).toHaveBeenCalledTimes(1);
    const [calledPath, calledBase64] = vi.mocked(WritePdfFile).mock.calls[0];
    expect(calledPath).toBe('/output/spdd.pdf');
    expect(calledBase64).toBeTruthy();
    expect(typeof calledBase64).toBe('string');
  });

  it('annulation save dialog : pas d\'écriture binaire', async () => {
    vi.mocked(ReadArtifact).mockResolvedValue('---\nid: A\n---\nbody');
    vi.mocked(SaveFilePdf).mockResolvedValue(''); // user cancelled

    usePdfExportStore.getState().toggleSelection('/p/.yukki/stories/UI-015.md');
    await usePdfExportStore.getState().exportSelection();

    expect(SaveFilePdf).toHaveBeenCalledTimes(1);
    expect(WritePdfFile).not.toHaveBeenCalled();
  });

  it('analyse : pré-pend la story référencée (AC2-bis)', async () => {
    useArtifactsStore.setState({
      kind: 'analysis',
      items: [
        {
          ID: 'UI-015',
          Slug: 'x',
          Title: 'Analyse',
          Status: 'draft',
          Updated: '2026-05-08',
          Path: '/p/.yukki/analysis/UI-015.md',
        },
      ],
      selectedPath: '',
      error: null,
    });
    vi.mocked(ReadArtifact).mockResolvedValue(`---
id: UI-015
title: Analyse
status: draft
updated: 2026-05-08
---

corps de l'analyse`);
    vi.mocked(ResolveCanvasChain).mockResolvedValue({
      StoryPath: '/p/.yukki/stories/UI-015.md',
      AnalysisPath: '',
      CanvasPath: '/p/.yukki/analysis/UI-015.md',
    });
    vi.mocked(SaveFilePdf).mockResolvedValue('/output/spdd.pdf');
    vi.mocked(WritePdfFile).mockResolvedValue(undefined);

    usePdfExportStore.getState().toggleSelection('/p/.yukki/analysis/UI-015.md');
    await usePdfExportStore.getState().exportSelection();

    // ResolveCanvasChain appelée 1× sur l'analyse (réutilisée pour
    // résoudre le `story:` du front-matter)
    expect(ResolveCanvasChain).toHaveBeenCalledTimes(1);
    expect(ResolveCanvasChain).toHaveBeenCalledWith('/p/.yukki/analysis/UI-015.md');
    // ReadArtifact appelée 2× : analyse (shape initial) + story (chaîne)
    expect(ReadArtifact).toHaveBeenCalledTimes(2);
    expect(WritePdfFile).toHaveBeenCalledTimes(1);
  });

  it('canvas en phase generate : pré-pend la chaîne (Q2-A)', async () => {
    useArtifactsStore.setState({
      kind: 'prompts',
      items: [
        {
          ID: 'UI-015',
          Slug: 'x',
          Title: 'Canvas',
          Status: 'reviewed',
          Updated: '2026-05-08',
          Path: '/p/.yukki/prompts/UI-015.md',
        },
      ],
      selectedPath: '',
      error: null,
    });
    vi.mocked(ReadArtifact).mockResolvedValue(`---
id: UI-015
title: Canvas
status: reviewed
updated: 2026-05-08
---

canvas body`);
    vi.mocked(ResolveCanvasChain).mockResolvedValue({
      StoryPath: '/p/.yukki/stories/UI-015.md',
      AnalysisPath: '/p/.yukki/analysis/UI-015.md',
      CanvasPath: '/p/.yukki/prompts/UI-015.md',
    });
    vi.mocked(SaveFilePdf).mockResolvedValue('/output/spdd.pdf');
    vi.mocked(WritePdfFile).mockResolvedValue(undefined);

    usePdfExportStore.getState().toggleSelection('/p/.yukki/prompts/UI-015.md');
    await usePdfExportStore.getState().exportSelection();

    // ResolveCanvasChain appelée 1× sur le canvas
    expect(ResolveCanvasChain).toHaveBeenCalledTimes(1);
    expect(ResolveCanvasChain).toHaveBeenCalledWith('/p/.yukki/prompts/UI-015.md');
    // ReadArtifact appelée 3× : story, analyse, canvas (canvas est lu une
    // fois au shape initial)
    expect(ReadArtifact).toHaveBeenCalledTimes(3);
    expect(WritePdfFile).toHaveBeenCalledTimes(1);
  });

  it('exportSingle alias appelle aussi le pipeline', async () => {
    vi.mocked(ReadArtifact).mockResolvedValue('---\nid: A\nstatus: draft\n---\nbody');
    vi.mocked(SaveFilePdf).mockResolvedValue('/output/single.pdf');
    vi.mocked(WritePdfFile).mockResolvedValue(undefined);

    await usePdfExportStore.getState().exportSingle('/p/.yukki/stories/X.md');

    expect(SaveFilePdf).toHaveBeenCalledTimes(1);
    expect(WritePdfFile).toHaveBeenCalledTimes(1);
  });

  it('sélection vide ne déclenche rien', async () => {
    await usePdfExportStore.getState().exportSelection();
    expect(SaveFilePdf).not.toHaveBeenCalled();
    expect(WritePdfFile).not.toHaveBeenCalled();
  });

  it('erreur de lecture artefact propagée et stockée', async () => {
    vi.mocked(ReadArtifact).mockResolvedValue('body'); // shape ok
    vi.mocked(SaveFilePdf).mockRejectedValue(new Error('boom'));

    usePdfExportStore.getState().toggleSelection('/p/A.md');
    await expect(usePdfExportStore.getState().exportSelection()).rejects.toThrow('boom');
    expect(usePdfExportStore.getState().errorMessage).toBe('boom');
    expect(usePdfExportStore.getState().isExporting).toBe(false);
  });
});
