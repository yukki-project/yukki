// UI-014d — Adds AiPopover (global floating) and AiDiffPanel (replaces
// inspector during generating/diff phases).
// UI-014f — O6: Instancie useSpddSuggest, passe en props AiDiffPanel/AiPopover.

import { useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { SpddHeader } from './SpddHeader';
import { SpddFooter } from './SpddFooter';
import { SpddTOC } from './SpddTOC';
import { SpddDocument } from './SpddDocument';
import { SpddInspector } from './SpddInspector';
import { SpddMarkdownView } from './SpddMarkdownView';
import { AiPopover } from './AiPopover';
import { AiDiffPanel } from './AiDiffPanel';
import { useSpddEditorStore } from '@/stores/spdd';
import { useArtifactsStore } from '@/stores/artifacts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSpddSuggest } from '@/hooks/useSpddSuggest';
import { markdownToDraft } from './parser';
import { ReadArtifact } from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';
import type { SectionKey } from './types';
import type { SuggestionRequest } from '@/hooks/useSpddSuggest';

// ─── Warnings banner ──────────────────────────────────────────────────────

function WarningsBanner({
  warnings,
  onDismiss,
}: {
  warnings: string[];
  onDismiss: () => void;
}): JSX.Element | null {
  if (warnings.length === 0) return null;
  return (
    <div
      role="alert"
      className={cn(
        'col-span-3 flex items-start gap-3 border-b border-yk-warning bg-[color:var(--yk-warning-soft)]',
        'px-4 py-2',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yk-warning" />
      <div className="flex-1 text-[13px] text-yk-text-primary">
        <p className="font-medium">
          Le format ne correspond plus au template SPDD — passer en WYSIWYG va appliquer la structure attendue.
        </p>
        <ul className="mt-1 list-disc pl-4 text-[12px] text-yk-text-secondary">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
      <button
        type="button"
        aria-label="Fermer l'avertissement"
        onClick={onDismiss}
        className="text-yk-text-muted hover:text-yk-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function SpddEditor(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const viewMode = useSpddEditorStore((s) => s.viewMode);
  const markdownSource = useSpddEditorStore((s) => s.markdownSource);
  const markdownWarnings = useSpddEditorStore((s) => s.markdownWarnings);
  const scrollToSection = useSpddEditorStore((s) => s.scrollToSection);
  const activeSection = useSpddEditorStore((s) => s.activeSection);
  const setActiveSection = useSpddEditorStore((s) => s.setActiveSection);
  const setMarkdownSource = useSpddEditorStore((s) => s.setMarkdownSource);
  const clearScrollToSection = useSpddEditorStore((s) => s.clearScrollToSection);
  const resetDraft = useSpddEditorStore((s) => s.resetDraft);
  const aiPhase = useSpddEditorStore((s) => s.aiPhase);
  const aiSelection = useSpddEditorStore((s) => s.aiSelection);

  const selectedPath = useArtifactsStore((s) => s.selectedPath);

  // Charger l'artefact sélectionné depuis le hub
  useEffect(() => {
    if (!selectedPath) return;
    const currentDraft = useSpddEditorStore.getState().draft;
    ReadArtifact(selectedPath)
      .then((raw) => {
        const { draft: loaded, warnings } = markdownToDraft(raw, currentDraft);
        resetDraft(loaded);
        useSpddEditorStore.setState({ markdownWarnings: warnings });
      })
      .catch(() => {
        // En cas d'erreur on garde le draft courant
      });
  }, [selectedPath, resetDraft]);

  // CORE-007: auto-save to backend every 2s of inactivity.
  useAutoSave(draft, true);

  // UI-014f: real streaming suggestion hook.
  const suggestResult = useSpddSuggest();

  // Build the current request from the store selection when streaming starts.
  const currentRequest: SuggestionRequest | null =
    aiSelection
      ? { section: aiSelection.sectionKey, action: '', selectedText: aiSelection.text }
      : null;

  // Sync suggestResult.state → store aiPhase so SpddEditor can show DiffPanel.
  useEffect(() => {
    if (suggestResult.state === 'done') {
      useSpddEditorStore.setState({ aiPhase: 'diff' });
    } else if (suggestResult.state === 'error') {
      // Keep the panel open so the error message is visible — the user can
      // retry or close by clicking Refuser.
      useSpddEditorStore.setState({ aiPhase: 'diff' });
    }
  }, [suggestResult.state]);

  const dismissWarnings = useCallback(() => {
    useSpddEditorStore.setState({ markdownWarnings: [] });
  }, []);

  // Debounce IntersectionObserver-driven activeSection updates so they don't
  // jitter while a smooth-scroll is still resolving.
  const scrollDebounceRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const handleTocClick = useCallback(
    (key: SectionKey) => {
      isProgrammaticScrollRef.current = true;
      setActiveSection(key);
      if (viewMode === 'wysiwyg') {
        const el = document.getElementById(`spdd-section-${key}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 600);
    },
    [setActiveSection, viewMode],
  );

  const handleScrollSection = useCallback(
    (key: SectionKey) => {
      if (isProgrammaticScrollRef.current) return;
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = window.setTimeout(() => {
        setActiveSection(key);
      }, 80);
    },
    [setActiveSection],
  );

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
    };
  }, []);

  const isMarkdown = viewMode === 'markdown';
  const showDiffPanel = !isMarkdown && (aiPhase === 'generating' || aiPhase === 'diff');

  return (
    <div
      className="yk grid h-full w-full min-h-0 grid-rows-[40px_1fr_28px] bg-yk-bg-page font-inter text-yk-text-primary"
      data-testid="spdd-editor"
    >
      <SpddHeader />

      <div
        className={cn(
          'grid min-h-0 overflow-hidden',
          isMarkdown
            ? 'grid-cols-[240px_1fr]'
            : 'grid-cols-[240px_1fr_360px]',
        )}
      >
        {/* Warnings banner spans all columns */}
        {markdownWarnings.length > 0 && (
          <WarningsBanner warnings={markdownWarnings} onDismiss={dismissWarnings} />
        )}

        {/* TOC — always visible */}
        <aside
          aria-label="Sommaire"
          className="overflow-y-auto border-r border-yk-line bg-yk-bg-1"
          style={{ gridRow: markdownWarnings.length > 0 ? '2' : '1' }}
        >
          <SpddTOC onSectionClick={handleTocClick} />
        </aside>

        {/* Center: Markdown or WYSIWYG */}
        {isMarkdown ? (
          <SpddMarkdownView
            source={markdownSource}
            onChange={setMarkdownSource}
            activeSection={activeSection}
            scrollToSection={scrollToSection}
            onScrollHandled={clearScrollToSection}
          />
        ) : (
          <SpddDocument onActiveSectionFromScroll={handleScrollSection} />
        )}

        {/* Inspector — only in WYSIWYG mode; swapped for DiffPanel when AI is active */}
        {!isMarkdown && (
          <aside
            aria-label={showDiffPanel ? 'Panneau de diff IA' : 'Inspector'}
            className="overflow-y-auto border-l border-yk-line bg-yk-bg-1"
          >
            {showDiffPanel ? <AiDiffPanel suggestResult={suggestResult} currentRequest={currentRequest} /> : <SpddInspector />}
          </aside>
        )}
      </div>

      <SpddFooter />

      {/* Global floating AI popover */}
      <AiPopover suggestResult={suggestResult} />
    </div>
  );
}
