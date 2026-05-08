// UI-015 O7 — Store Zustand pour l'export PDF.
//
// État éphémère :
//   - `selection` : Set<path> sélectionnés (persistant au refresh ET au
//     changement de mode HubList — Q5-A : on peut combiner stories +
//     epics dans un même export).
//   - `isExporting` : flag UI pour spinner / désactivation des boutons
//     pendant la génération PDF.
//   - `errorMessage` : feedback d'erreur (toast déclenché côté composant).
//
// Actions :
//   - toggleSelection(path)  : ajoute/retire le path
//   - clearSelection()        : reset complet
//   - exportSingle(path)      : raccourci pour le bouton individuel
//   - exportSelection()       : pipeline complet (lecture artefacts +
//                               résolution chaîne canvas + génération
//                               PDF + écriture binaire via Wails)

import { createElement, type ReactElement } from 'react';
import { create } from 'zustand';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import {
  ReadArtifact,
  ResolveCanvasChain,
  SaveFilePdf,
  WritePdfFile,
  type Meta,
} from '../../wailsjs/go/main/App';
import { useArtifactsStore } from './artifacts';
import {
  PdfArtifactDocument,
  type RenderedArtifact,
} from '@/components/spdd/pdf/PdfArtifactDocument';

export type ExportResult =
  | { kind: 'cancelled' }
  | { kind: 'success'; outputPath: string; count: number };

interface PdfExportState {
  selection: ReadonlySet<string>;
  isExporting: boolean;
  errorMessage: string | null;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
  exportSingle: (path: string) => Promise<ExportResult>;
  exportSelection: () => Promise<ExportResult>;
}

const CANVAS_KIND_HINT = '/.yukki/prompts/';
const ANALYSIS_KIND_HINT = '/.yukki/analysis/';
const CHAIN_STATUSES = new Set(['reviewed', 'implemented', 'synced']);

// stripFrontmatter retire le bloc YAML --- ... --- au début et retourne
// le markdown sans front-matter (le pied de page le rendra lisible).
// Tolère CRLF.
function stripFrontmatter(source: string): string {
  const trimmed = source.replace(/^[\r\n]+/, '');
  if (!trimmed.startsWith('---')) return source;
  const rest = trimmed.slice(3);
  const closeIdx = rest.search(/(\r?\n)---(\r?\n|$)/);
  if (closeIdx < 0) return source;
  // Skip past the closing --- and its trailing newline.
  const afterClose = rest.slice(closeIdx).replace(/^(\r?\n)---(\r?\n)?/, '');
  return afterClose;
}

// parseFrontmatter extracts ALL key/value pairs from the YAML
// front-matter as an ordered array. Values stay as strings (or
// `string[]` for inline-array values like `modules: [a, b]` and
// for block-list values across multiple lines starting with `- `).
// Tolerant — comments and complex nested YAML are flattened to text.
export interface FrontmatterEntry {
  key: string;
  value: string | string[];
}

function parseFrontmatter(source: string): FrontmatterEntry[] {
  const trimmed = source.replace(/^[\r\n]+/, '');
  if (!trimmed.startsWith('---')) return [];
  const rest = trimmed.slice(3);
  const closeIdx = rest.search(/(\r?\n)---(\r?\n|$)/);
  if (closeIdx < 0) return [];
  const yamlBlock = rest.slice(0, closeIdx);
  const lines = yamlBlock.split(/\r?\n/);

  const entries: FrontmatterEntry[] = [];
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const stripQuotes = (s: string): string =>
    s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

  const flushList = (): void => {
    if (currentKey !== null && currentList !== null) {
      entries.push({ key: currentKey, value: currentList });
      currentKey = null;
      currentList = null;
    }
  };

  for (const rawLine of lines) {
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue;

    // Continuation of a block list ("  - item")
    const blockListMatch = /^\s+-\s+(.*)$/.exec(rawLine);
    if (blockListMatch && currentList !== null) {
      currentList.push(stripQuotes(blockListMatch[1].trim()));
      continue;
    }

    // New key (top-level only — ignore deeper indentation)
    const kvMatch = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(rawLine);
    if (!kvMatch) continue;

    flushList();
    const [, key, rawValue] = kvMatch;
    const value = rawValue.trim();

    if (value === '') {
      // Block list opener — accumulate next "  - item" lines.
      currentKey = key;
      currentList = [];
      continue;
    }

    // Inline array : `[a, b, c]`
    const inlineArrMatch = /^\[(.*)\]$/.exec(value);
    if (inlineArrMatch) {
      const arr = inlineArrMatch[1]
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
      entries.push({ key, value: arr });
      continue;
    }

    entries.push({ key, value: stripQuotes(value) });
  }
  flushList();
  return entries;
}

// Helper: lookup a single string entry value (for the meta footer).
function lookupString(fm: FrontmatterEntry[], key: string): string {
  const e = fm.find((x) => x.key === key);
  if (!e) return '';
  return Array.isArray(e.value) ? e.value.join(', ') : e.value;
}

// readAndShape reads an artifact file, parses its meta, strips front-matter,
// and returns a RenderedArtifact. Broken paths are surfaced as brokenRef.
async function readAndShape(path: string): Promise<RenderedArtifact> {
  try {
    const source = await ReadArtifact(path);
    const fm = parseFrontmatter(source);
    return {
      meta: {
        id: lookupString(fm, 'id') || guessIdFromPath(path),
        title: lookupString(fm, 'title') || guessTitleFromPath(path),
        status: lookupString(fm, 'status'),
        updated: lookupString(fm, 'updated'),
      },
      frontmatter: fm,
      markdown: stripFrontmatter(source),
    };
  } catch (e) {
    return {
      meta: {
        id: guessIdFromPath(path),
        title: guessTitleFromPath(path),
        status: '',
        updated: '',
      },
      frontmatter: [],
      markdown: '',
      brokenRef: {
        reason: 'Le fichier n’a pas pu être lu.',
        missingPath: path,
      },
    };
  }
}

function guessIdFromPath(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? '';
  const m = base.match(/^([A-Z]+-\d+[a-z]?)/);
  return m ? m[1] : base.replace(/\.md$/, '');
}

function guessTitleFromPath(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? '';
  return base.replace(/\.md$/, '');
}

function isCanvasPath(path: string): boolean {
  // Tolerant to OS path separators.
  const normalised = path.replace(/\\/g, '/');
  return normalised.includes(CANVAS_KIND_HINT);
}

function isAnalysisPath(path: string): boolean {
  const normalised = path.replace(/\\/g, '/');
  return normalised.includes(ANALYSIS_KIND_HINT);
}

// expandChainIfNeeded — chaîne SPDD remontée pour deux cas :
//
//   - **Canvas** en phase generate (`reviewed`/`implemented`/`synced`) :
//     pré-pend story + analyse + canvas (chaîne complète).
//   - **Analyse** (tout statut) : pré-pend la story référencée (la
//     story est le contexte indispensable pour comprendre l'analyse,
//     et l'analyse n'a pas de "phase generate" propre — on déclenche
//     systématiquement).
//
// Tous les autres types (story, inbox, epic, roadmap, tests) sont
// rendus seuls. Une référence cassée produit un placeholder visuel
// (Invariant I2 — pas de crash).
async function expandChainIfNeeded(
  artefacts: RenderedArtifact[],
  paths: string[],
): Promise<RenderedArtifact[]> {
  const expanded: RenderedArtifact[] = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const artifact = artefacts[i];
    const isCanvas = isCanvasPath(path);
    const isAnalysis = isAnalysisPath(path);
    const inChainPhase = CHAIN_STATUSES.has(artifact.meta.status);

    // Cas analyse → pré-pend la story (sans condition de statut).
    if (isAnalysis) {
      try {
        const chain = await ResolveCanvasChain(path);
        if (chain.StoryPath) {
          expanded.push(await readAndShape(chain.StoryPath));
        } else {
          expanded.push({
            meta: { id: '', title: 'Story manquante', status: '', updated: '' },
            frontmatter: [],
            markdown: '',
            brokenRef: {
              reason: 'La story référencée par cette analyse est introuvable.',
              missingPath: '(non résolue)',
            },
          });
        }
      } catch {
        // Resolve failure → on garde juste l'analyse.
      }
      expanded.push(artifact);
      continue;
    }

    // Cas canvas en phase generate → pré-pend story + analyse.
    if (isCanvas && inChainPhase) {
      try {
        const chain = await ResolveCanvasChain(path);
        if (chain.StoryPath) {
          expanded.push(await readAndShape(chain.StoryPath));
        } else {
          expanded.push({
            meta: { id: '', title: 'Story manquante', status: '', updated: '' },
            frontmatter: [],
            markdown: '',
            brokenRef: {
              reason: 'La story référencée par ce canvas est introuvable.',
              missingPath: '(non résolue)',
            },
          });
        }
        if (chain.AnalysisPath) {
          expanded.push(await readAndShape(chain.AnalysisPath));
        } else {
          expanded.push({
            meta: { id: '', title: 'Analyse manquante', status: '', updated: '' },
            frontmatter: [],
            markdown: '',
            brokenRef: {
              reason: 'L’analyse référencée par ce canvas est introuvable.',
              missingPath: '(non résolue)',
            },
          });
        }
        expanded.push(artifact);
      } catch {
        expanded.push(artifact);
      }
      continue;
    }

    // Cas par défaut → artefact seul.
    expanded.push(artifact);
  }
  return expanded;
}

// orderByListItems — trie `paths` selon l'ordre d'affichage de la HubList
// courante (Invariant I3 — l'ordre dans le PDF combiné suit l'ordre
// affiché, pas l'ordre de cochage).
function orderByListItems(paths: ReadonlySet<string>, items: Meta[]): string[] {
  const known = items.filter((m) => paths.has(m.Path)).map((m) => m.Path);
  // Append paths not currently visible (cross-mode selection — Q5-A).
  const unseen = [...paths].filter((p) => !known.includes(p));
  return [...known, ...unseen];
}

// blobToBase64 reads a Blob into a base64 string (without the data URL
// prefix). Used to ferry the @react-pdf blob across the Wails IPC.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

function suggestedFilename(paths: string[]): string {
  if (paths.length === 1) {
    const base = paths[0].split(/[/\\]/).pop() ?? 'export';
    return base.replace(/\.md$/, '.pdf');
  }
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `spdd-export-${stamp}.pdf`;
}

async function runExport(paths: string[]): Promise<ExportResult> {
  if (paths.length === 0) return { kind: 'cancelled' };

  // 1. Read each artifact + parse meta + strip front-matter.
  const baseShape = await Promise.all(paths.map(readAndShape));

  // 2. Expand chain for canvases in generate phase.
  const finalList = await expandChainIfNeeded(baseShape, paths);

  // eslint-disable-next-line no-console
  console.info(
    '[pdfExport] chain expansion:',
    paths.length,
    'selected →',
    finalList.length,
    'in PDF',
    finalList.map((a) => `${a.meta.id || '?'}(${a.meta.status || '?'})`),
  );

  // 3. Ask user for output path.
  const suggested = suggestedFilename(paths);
  const outputPath = await SaveFilePdf(suggested);
  if (!outputPath) return { kind: 'cancelled' };

  // 4. Render PDF blob. PdfArtifactDocument returns <Document>; the
  // typing isn't preserved through the FC wrapper, so we cast to the
  // ReactElement<DocumentProps> shape that pdf() expects.
  const docElement = createElement(PdfArtifactDocument, {
    artefacts: finalList,
  }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(docElement).toBlob();
  const base64 = await blobToBase64(blob);

  // 5. Write via Wails.
  await WritePdfFile(outputPath, base64);

  return { kind: 'success', outputPath, count: finalList.length };
}

export const usePdfExportStore = create<PdfExportState>((set, get) => ({
  selection: new Set<string>(),
  isExporting: false,
  errorMessage: null,

  toggleSelection: (path) => {
    const next = new Set(get().selection);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    set({ selection: next, errorMessage: null });
  },

  clearSelection: () => set({ selection: new Set<string>(), errorMessage: null }),

  exportSingle: async (path) => {
    if (get().isExporting) return { kind: 'cancelled' };
    set({ isExporting: true, errorMessage: null });
    try {
      const result = await runExport([path]);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ errorMessage: msg });
      // eslint-disable-next-line no-console
      console.error('[pdfExport] exportSingle failed:', e);
      throw e;
    } finally {
      set({ isExporting: false });
    }
  },

  exportSelection: async () => {
    const { selection, isExporting } = get();
    if (isExporting || selection.size === 0) return { kind: 'cancelled' };
    set({ isExporting: true, errorMessage: null });
    try {
      const items = useArtifactsStore.getState().items;
      const orderedPaths = orderByListItems(selection, items);
      const result = await runExport(orderedPaths);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ errorMessage: msg });
      // eslint-disable-next-line no-console
      console.error('[pdfExport] exportSelection failed:', e);
      throw e;
    } finally {
      set({ isExporting: false });
    }
  },
}));
