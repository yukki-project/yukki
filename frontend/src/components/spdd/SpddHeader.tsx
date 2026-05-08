// UI-014e — Story header with export logic: ExportChecklist popover + Blob export + toast.
// UI-014f — O5: Real StoryExport via Wails; ExportConflictDialog on conflict.

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Code2, Download, Edit3, Pencil, Check } from 'lucide-react';
import {
  useSpddEditorStore,
  selectRequiredCompleted,
  selectRequiredTotal,
} from '@/stores/spdd';
import { useShellStore } from '@/stores/shell';
import { useToast } from '@/hooks/use-toast';
import { draftToGoPayload } from '@/lib/draftMapper';
import { ExportChecklist } from './ExportChecklist';
import { ExportConflictDialog } from './ExportConflictDialog';
import { cn } from '@/lib/utils';
import type { SectionKey, ViewMode } from './types';
import type { ExportConflictInfo } from './ExportConflictDialog';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

const STATUS_PILL_CLASSES: Record<string, string> = {
  draft: 'bg-[color:var(--yk-warning-soft)] text-yk-warning',
  reviewed: 'bg-[color:var(--yk-primary-soft)] text-yk-primary',
  accepted: 'bg-[color:var(--yk-success-soft)] text-yk-success',
  implemented: 'bg-[color:var(--yk-success-soft)] text-yk-success',
  synced: 'bg-yk-bg-3 text-yk-text-secondary',
};

function formatSavedAt(savedAt: string | null): string {
  if (!savedAt) return 'jamais sauvé';
  const d = new Date(savedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `sauvé ${hh}:${mm}`;
}

export function SpddHeader({
  editState,
  isEditMode,
  onToggleEditMode,
  genericSavedAt,
  parsedTemplate,
}: {
  editState?: EditState | null;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  /** UI-014h — timestamp ISO du dernier WriteArtifact OK pour le chemin générique. */
  genericSavedAt?: string | null;
  /** UI-014h — template parsed pour dériver `required` (Exporter allDone). */
  parsedTemplate?: ParsedTemplate | null;
}): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const viewMode = useSpddEditorStore((s) => s.viewMode);
  const setViewMode = useSpddEditorStore((s) => s.setViewMode);
  const setActiveSection = useSpddEditorStore((s) => s.setActiveSection);
  const setMode = useShellStore((s) => s.setActiveMode);
  const state = useSpddEditorStore();
  const tmpl = parsedTemplate ?? null;
  const completed = useMemo(() => selectRequiredCompleted(state, tmpl), [state, tmpl]);
  const total = useMemo(() => selectRequiredTotal(tmpl), [tmpl]);
  const allDone = total > 0 && completed === total;
  const savedLabel = formatSavedAt(draft.savedAt);
  const { toast } = useToast();

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ExportConflictInfo | null>(null);
  const exportBtnRef = useRef<HTMLDivElement>(null);

  // --- Real export via StoryExport (CORE-009); fallback Blob when Wails unavailable.
  const handleExport = useCallback(async (overwrite = false) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = (window as any).go;
    if (!go?.uiapp?.App?.StoryExport) {
      // Fallback: Blob download (browser dev mode without Wails)
      const { draftToMarkdown } = await import('./serializer');
      const md = draftToMarkdown(draft);
      const filename = `${draft.id}-${draft.slug}.md`;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Story exportée ✓ (mode hors-ligne)', description: filename, duration: 4000 });
      return;
    }

    try {
      const result = await go.uiapp.App.StoryExport(
        draftToGoPayload(draft),
        { Overwrite: overwrite },
      );
      toast({
        title: 'Story sauvée ✓',
        description: result?.path ?? `${draft.id}-${draft.slug}.md`,
        duration: 4000,
      });
    } catch (err: unknown) {
      // ExportConflictError carries existingPath and existingUpdatedAt.
      const e = err as Record<string, unknown>;
      if (e?.existingPath) {
        setConflictInfo({
          existingPath: e.existingPath as string,
          existingUpdatedAt: (e.existingUpdatedAt as string) ?? new Date().toISOString(),
        });
        return;
      }
      toast({
        title: "Erreur d'export",
        description: err instanceof Error ? err.message : String(err),
        duration: 5000,
        variant: 'destructive',
      });
    }
  }, [draft, toast]);

  const handleOverwrite = useCallback(async () => {
    setConflictInfo(null);
    await handleExport(true);
  }, [handleExport]);

  const handleExportClick = useCallback(() => {
    if (allDone) {
      void handleExport();
    } else {
      setChecklistOpen((v) => !v);
    }
  }, [allDone, handleExport]);

  const handleGoToSection = useCallback(
    (key: SectionKey) => {
      setActiveSection(key);
      const el = document.getElementById(`spdd-section-${key}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Flash focus ring on first input/textarea in that section
      window.setTimeout(() => {
        const focusable = el?.querySelector<HTMLElement>('input, textarea, select');
        if (focusable) {
          focusable.focus();
          focusable.classList.add('ring-2', 'ring-[color:var(--yk-primary-ring)]');
          window.setTimeout(() => {
            focusable.classList.remove('ring-2', 'ring-[color:var(--yk-primary-ring)]');
          }, 1000);
        }
      }, 400);
    },
    [setActiveSection],
  );

  return (
    <header
      aria-label="Story header"
      className="flex h-10 shrink-0 items-center gap-3 border-b border-yk-line bg-yk-bg-1 px-4"
    >
      {/* Back to hub */}
      <button
        type="button"
        aria-label="Retour au hub"
        onClick={() => setMode('stories')}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-yk-sm text-yk-text-muted transition-colors hover:bg-yk-bg-3 hover:text-yk-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]"
        title="Retour au hub"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>

      <span className="font-jbmono text-[12px] text-yk-text-secondary">
        {editState ? (String(editState.fmValues['id'] ?? '')) : draft.id}
      </span>
      <span className="font-inter text-[14px] font-medium text-yk-text-primary">
        {editState ? (String(editState.fmValues['title'] ?? '')) : draft.title}
      </span>
      <span
        className={cn(
          'rounded-yk-sm px-2 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider',
          STATUS_PILL_CLASSES[editState ? String(editState.fmValues['status'] ?? '') : draft.status] ?? STATUS_PILL_CLASSES.draft,
        )}
      >
        {editState ? (String(editState.fmValues['status'] ?? '')) : draft.status}
      </span>
      {/* UI-014h — saved indicator visible pour les deux chemins.
          Story (legacy) : `draft.savedAt`. Générique : `genericSavedAt` local
          (mis à jour sur Ctrl+S → WriteArtifact OK). */}
      <span className="flex items-center gap-1.5 text-[11px] text-yk-text-muted">
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            (editState ? genericSavedAt : draft.savedAt) ? 'bg-yk-success' : 'bg-yk-text-faint',
          )}
        />
        <span className="font-jbmono">
          {editState ? formatSavedAt(genericSavedAt ?? null) : savedLabel}
        </span>
      </span>
      <div className="flex-1" />

      {/* UI-014h — Bouton Modifier/Terminer unifié pour tous les artefacts.
          isEditMode pilote l'édition côté SpddDocument quel que soit le path. */}
      {onToggleEditMode && (
        <button
          type="button"
          onClick={onToggleEditMode}
          className={cn(
            'flex items-center gap-1.5 rounded-yk-sm px-3 py-1 font-inter text-[12px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
            isEditMode
              ? 'bg-yk-primary text-white hover:brightness-110'
              : 'border border-yk-line text-yk-text-secondary hover:bg-yk-bg-2',
          )}
          title={isEditMode ? "Terminer l'édition (Ctrl+S pour sauvegarder)" : 'Passer en mode édition'}
        >
          {isEditMode ? (
            <><Check className="h-3.5 w-3.5" />Terminer</>
          ) : (
            <><Pencil className="h-3.5 w-3.5" />Modifier</>
          )}
        </button>
      )}

      {/* UI-014h — toggle WYSIWYG/Markdown et Exporter visibles uniquement
          en mode édition. En lecture seule, le header reste minimal. */}
      {isEditMode && !editState && (
        <SegmentedViewMode value={viewMode} onChange={setViewMode} />
      )}

      {/* Export button + checklist popover container — story uniquement, mode édition */}
      {isEditMode && !editState && (
        <div ref={exportBtnRef} className="relative">
          <button
            type="button"
            onClick={handleExportClick}
            className={cn(
              'flex items-center gap-1.5 rounded-yk-sm px-3 py-1 font-inter text-[12px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              allDone
                ? 'bg-yk-primary text-white hover:brightness-110'
                : 'border border-yk-primary text-yk-primary hover:bg-[color:var(--yk-primary-soft)]',
            )}
            title={allDone ? 'Exporter la story (.md)' : 'Voir les exigences avant export'}
          >
            <Download className="h-3.5 w-3.5" />
            Exporter
          </button>

          {checklistOpen && (
            <ExportChecklist
              onClose={() => setChecklistOpen(false)}
              onExport={() => void handleExport()}
              onGoToSection={handleGoToSection}
            />
          )}
        </div>
      )}

      {!editState && (
        <ExportConflictDialog
          conflict={conflictInfo}
          onOverwrite={handleOverwrite}
          onCancel={() => setConflictInfo(null)}
        />
      )}
    </header>
  );
}

interface SegmentedViewModeProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function SegmentedViewMode({
  value,
  onChange,
}: SegmentedViewModeProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Mode d'affichage"
      className="flex items-center gap-0.5 rounded-yk-sm bg-yk-bg-2 p-0.5"
    >
      <SegmentedButton
        active={value === 'wysiwyg'}
        onClick={() => onChange('wysiwyg')}
        Icon={Edit3}
        label="WYSIWYG"
      />
      <SegmentedButton
        active={value === 'markdown'}
        onClick={() => onChange('markdown')}
        Icon={Code2}
        label="Markdown"
      />
    </div>
  );
}

interface SegmentedButtonProps {
  active: boolean;
  onClick: () => void;
  Icon: typeof Code2;
  label: string;
}

function SegmentedButton({
  active,
  onClick,
  Icon,
  label,
}: SegmentedButtonProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-yk-sm px-2.5 py-1 font-jbmono text-[11px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
        active
          ? 'bg-yk-bg-3 text-yk-text-primary shadow-[inset_0_-2px_0_0_var(--yk-primary)]'
          : 'text-yk-text-muted hover:text-yk-text-secondary',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
