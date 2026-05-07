// UI-016 — Generic artifact editor store.
// Replaces useSpddEditorStore (story-specific) with a template-driven,
// type-agnostic store. Reads selectedPath from useArtifactsStore.

import { create } from 'zustand';
import { ReadArtifact, WriteArtifact } from '../../wailsjs/go/main/App';
import {
  parseTemplate,
  detectArtifactType,
  templateNameForType,
} from '@/lib/templateParser';
import { parseArtifactContent, serializeArtifact } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';
import type { EditState } from '@/lib/genericSerializer';

// ─── Types ────────────────────────────────────────────────────────────────

export type ArtifactViewMode = 'read' | 'edit';

export interface ArtifactEditorState {
  selectedPath: string;
  rawContent: string;
  parsedTemplate: ParsedTemplate | null;
  editState: EditState | null;
  /** Raw content used in fallback textarea edit mode (no template) */
  fallbackContent: string;
  viewMode: ArtifactViewMode;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadArtifact: (path: string) => Promise<void>;
  setViewMode: (mode: ArtifactViewMode) => void;
  updateEditState: (state: EditState) => void;
  updateFallbackContent: (content: string) => void;
  saveArtifact: () => Promise<void>;
  reset: () => void;
}

// ─── Template path helper ─────────────────────────────────────────────────

/**
 * Derives the absolute template path from the artifact's absolute path.
 * e.g. "C:\workspace\yukki\.yukki\stories\UI-016.md"
 *   → "C:\workspace\yukki\.yukki\templates\story.md"
 */
function templatePath(artifactAbsPath: string, templateName: string): string {
  const normalized = artifactAbsPath.replace(/\\/g, '/');
  const yukkiIdx = normalized.lastIndexOf('/.yukki/');
  const sep = artifactAbsPath.includes('\\') ? '\\' : '/';
  if (yukkiIdx !== -1) {
    return `${artifactAbsPath.slice(0, yukkiIdx)}${sep}.yukki${sep}templates${sep}${templateName}.md`;
  }
  // Fallback (should not happen in practice)
  return `.yukki/templates/${templateName}.md`;
}

// ─── Frontmatter ID extraction ────────────────────────────────────────────

function extractIdFromRaw(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (!match) return '';
  const fmBlock = match[0];
  const idMatch = fmBlock.match(/^id:\s*(.+)$/m);
  return idMatch ? idMatch[1].trim() : '';
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useArtifactEditorStore = create<ArtifactEditorState>()((set, get) => ({
  selectedPath: '',
  rawContent: '',
  parsedTemplate: null,
  editState: null,
  fallbackContent: '',
  viewMode: 'read',
  loading: false,
  saving: false,
  error: null,

  loadArtifact: async (path: string) => {
    if (!path) {
      set({ selectedPath: '', rawContent: '', parsedTemplate: null, editState: null, fallbackContent: '', viewMode: 'read', error: null });
      return;
    }
    set({ selectedPath: path, loading: true, error: null, viewMode: 'read', parsedTemplate: null, editState: null });
    try {
      const raw = await ReadArtifact(path);
      const id = extractIdFromRaw(raw);
      const artifactType = detectArtifactType(id);
      const tmplName = templateNameForType(artifactType);

      if (tmplName) {
        try {
          const tmplPath = templatePath(path, tmplName);
          const tmplRaw = await ReadArtifact(tmplPath);
          const tmpl = parseTemplate(tmplRaw);
          const es = parseArtifactContent(raw, tmpl);
          set({ rawContent: raw, parsedTemplate: tmpl, editState: es, fallbackContent: raw, loading: false });
        } catch {
          // Template not found → fallback mode
          set({ rawContent: raw, parsedTemplate: null, editState: null, fallbackContent: raw, loading: false });
        }
      } else {
        set({ rawContent: raw, parsedTemplate: null, editState: null, fallbackContent: raw, loading: false });
      }
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  updateEditState: (state) => set({ editState: state }),

  updateFallbackContent: (content) => set({ fallbackContent: content }),

  saveArtifact: async () => {
    const { selectedPath, parsedTemplate, editState, fallbackContent } = get();
    if (!selectedPath) return;
    set({ saving: true, error: null });
    try {
      let content: string;
      if (parsedTemplate !== null && editState !== null) {
        content = serializeArtifact(editState, parsedTemplate);
      } else {
        content = fallbackContent;
      }
      await WriteArtifact(selectedPath, content);
      // Refresh raw content after save
      const refreshed = await ReadArtifact(selectedPath);
      if (parsedTemplate !== null) {
        const es = parseArtifactContent(refreshed, parsedTemplate);
        set({ rawContent: refreshed, editState: es, fallbackContent: refreshed, viewMode: 'read', saving: false });
      } else {
        set({ rawContent: refreshed, fallbackContent: refreshed, viewMode: 'read', saving: false });
      }
    } catch (e) {
      set({ saving: false, error: String(e) });
    }
  },

  reset: () => set({
    selectedPath: '', rawContent: '', parsedTemplate: null, editState: null,
    fallbackContent: '', viewMode: 'read', loading: false, saving: false, error: null,
  }),
}));
