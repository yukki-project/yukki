// UI-014d — Adds AiPopover (global floating) and AiDiffPanel (replaces
// inspector during generating/diff phases).
// UI-014f — O6: Instancie useSpddSuggest, passe en props AiDiffPanel/AiPopover.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { SpddHeader } from './SpddHeader';
import { SpddFooter } from './SpddFooter';
import { SpddTOC } from './SpddTOC';
import { SpddDocument } from './SpddDocument';
import { SpddInspector } from './SpddInspector';
import { GenericInspector } from './GenericInspector';
import { SpddMarkdownView } from './SpddMarkdownView';
import { AiPopover } from './AiPopover';
import { AiDiffPanel } from './AiDiffPanel';
import { useSpddEditorStore } from '@/stores/spdd';
import { useArtifactsStore } from '@/stores/artifacts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSpddSuggest } from '@/hooks/useSpddSuggest';
import { markdownToDraft } from './parser';
import { ReadArtifact, WriteArtifact } from '../../../wailsjs/go/main/App';
import { parseTemplate, detectArtifactTypeFromPath, templatePathFor } from '@/lib/templateParser';
import { parseArtifactContent, serializeArtifact } from '@/lib/genericSerializer';
import { computeDivergence, divergenceWarnings } from '@/lib/templateDivergence';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SectionKey } from './types';
import type { SuggestionRequest } from '@/hooks/useSpddSuggest';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

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

  // UI-014h: state local pour le rendu piloté par template
  const [editState, setEditState] = useState<EditState | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<ParsedTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // UI-014h O12: section active dans le chemin générique (pour TOC + Inspector)
  const [activeGenericIndex, setActiveGenericIndex] = useState<number>(0);
  // UI-014h O13: dismissal local du banner de divergence (par fichier ouvert)
  const [divergenceDismissed, setDivergenceDismissed] = useState(false);
  // UI-014h — saved indicator local pour le chemin générique (Ctrl+S → WriteArtifact OK)
  const [genericSavedAt, setGenericSavedAt] = useState<string | null>(null);
  const { toast } = useToast();

  // Charger l'artefact sélectionné depuis le hub
  useEffect(() => {
    if (!selectedPath) return;
    let aborted = false;
    const currentDraft = useSpddEditorStore.getState().draft;

    ReadArtifact(selectedPath)
      .then(async (raw) => {
        if (aborted) return;

        // Charger story dans le store story-draft (pour AI assist)
        const { draft: loaded, warnings } = markdownToDraft(raw, currentDraft);
        resetDraft(loaded);
        useSpddEditorStore.setState({ markdownWarnings: warnings });

        // UI-014h: charger le template pour piloter le rendu et les annotations.
        // Story garde le rendu legacy (editState === null) mais on charge tout
        // de même `parsedTemplate` pour accéder aux `required`/`help` annotés
        // dans story.md (au lieu de hardcoder dans sections.ts).
        const type = detectArtifactTypeFromPath(selectedPath);
        const tmplPath = templatePathFor(selectedPath, type);
        if (tmplPath) {
          try {
            const tmplRaw = await ReadArtifact(tmplPath);
            if (aborted) return;
            const tmpl = parseTemplate(tmplRaw);
            setParsedTemplate(tmpl);
            if (type !== 'story') {
              const es = parseArtifactContent(raw, tmpl);
              setEditState(es);
              // Effacer les warnings story — l'artefact est piloté par son propre template
              useSpddEditorStore.setState({ markdownWarnings: [] });
            } else {
              setEditState(null);
            }
            setIsEditMode(false);
            setDivergenceDismissed(false);
            setGenericSavedAt(null);
          } catch {
            // Template absent ou erreur de lecture → fallback complet
            if (!aborted) {
              setParsedTemplate(null);
              setEditState(null);
              setIsEditMode(false);
            }
          }
        } else {
          setParsedTemplate(null);
          setEditState(null);
          setIsEditMode(false);
        }
      })
      .catch(() => {
        // En cas d'erreur on garde le draft courant
      });

    return () => { aborted = true; };
  }, [selectedPath, resetDraft]);

  // UI-014h: sauvegarde via WriteArtifact + serializeArtifact (Ctrl+S)
  useEffect(() => {
    if (!editState || !parsedTemplate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const path = selectedPath;
        if (!path) return;
        const content = serializeArtifact(editState, parsedTemplate);
        WriteArtifact(path, content)
          .then(() => {
            setGenericSavedAt(new Date().toISOString());
            toast({ title: 'Sauvegardé ✓', duration: 3000 });
          })
          .catch((err: unknown) => toast({
            title: "Erreur d'enregistrement",
            description: String(err),
            duration: 5000,
            variant: 'destructive',
          }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editState, parsedTemplate, selectedPath, toast]);

  // CORE-007: auto-save to backend every 2s of inactivity.
  // Désactivé quand editState est non-null (évite conflit DraftSave vs WriteArtifact).
  useAutoSave(draft, editState === null);

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
    if (editState && parsedTemplate) {
      // UI-014h O13: dismiss du banner de divergence (local, par fichier)
      setDivergenceDismissed(true);
    } else {
      useSpddEditorStore.setState({ markdownWarnings: [] });
    }
  }, [editState, parsedTemplate]);

  // UI-014h O13: warnings affichés = divergence (chemin générique) ou markdownWarnings (story)
  const warningsToShow: string[] = (() => {
    if (editState && parsedTemplate && !divergenceDismissed) {
      return divergenceWarnings(computeDivergence(editState, parsedTemplate));
    }
    return markdownWarnings;
  })();

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
        // UI-014h O12: les keys génériques ont le format `spdd-section-generic-<idx>`
        const genericMatch = (key as string).match(/^spdd-section-generic-(\d+)$/);
        if (genericMatch) {
          setActiveGenericIndex(parseInt(genericMatch[1], 10));
          return;
        }
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
  // UI-014h — layout piloté par editState. Symétrie story/inbox : Inspector
  // toujours visible (sauf markdown ou diff panel). Le mode lecture seule
  // affecte les inputs, pas la visibilité de l'Inspector.
  const hasEditState = editState !== null;
  const showDiffPanel = !isMarkdown && !hasEditState && (aiPhase === 'generating' || aiPhase === 'diff');
  const showInspector = !isMarkdown && !showDiffPanel;
  const gridCols = isMarkdown
    ? 'grid-cols-[240px_1fr]'
    : 'grid-cols-[240px_1fr_360px]';

  return (
    <div
      className="yk grid h-full w-full min-h-0 grid-rows-[40px_1fr_28px] bg-yk-bg-page font-inter text-yk-text-primary"
      data-testid="spdd-editor"
    >
      <SpddHeader
        editState={editState}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((v) => !v)}
        genericSavedAt={genericSavedAt}
        parsedTemplate={parsedTemplate}
      />

      <div
        className={cn('grid min-h-0 overflow-hidden', gridCols)}
      >
        {/* Warnings banner spans all columns — UI-014h O13: divergence template ou markdown */}
        {warningsToShow.length > 0 && (
          <WarningsBanner warnings={warningsToShow} onDismiss={dismissWarnings} />
        )}

        {/* TOC — always visible */}
        <aside
          aria-label="Sommaire"
          className="overflow-y-auto border-r border-yk-line bg-yk-bg-1"
          style={{ gridRow: warningsToShow.length > 0 ? '2' : '1' }}
        >
          <SpddTOC
            onSectionClick={handleTocClick}
            editState={editState}
            parsedTemplate={parsedTemplate}
            activeGenericIndex={activeGenericIndex}
            onGenericSectionClick={setActiveGenericIndex}
          />
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
          <SpddDocument
            onActiveSectionFromScroll={handleScrollSection}
            editState={editState}
            parsedTemplate={parsedTemplate}
            onEditStateChange={setEditState}
            readOnly={!isEditMode}
          />
        )}

        {/* Inspector — story ou générique selon le mode */}
        {showInspector && (
          <aside
            aria-label={showDiffPanel ? 'Panneau de diff IA' : 'Inspector'}
            className="overflow-y-auto border-l border-yk-line bg-yk-bg-1"
          >
            {showDiffPanel
              ? <AiDiffPanel suggestResult={suggestResult} currentRequest={currentRequest} />
              : hasEditState
                ? (
                  <GenericInspector
                    editState={editState!}
                    parsedTemplate={parsedTemplate}
                    activeIndex={activeGenericIndex}
                  />
                )
                : <SpddInspector />}
          </aside>
        )}
      </div>

      <SpddFooter editState={editState} parsedTemplate={parsedTemplate} />

      {/* Global floating AI popover */}
      <AiPopover suggestResult={suggestResult} />
    </div>
  );
}
