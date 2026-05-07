// UI-016 — Universal template-driven artifact editor.
// Replaces SpddEditor (story-only) with a generic editor that adapts to any
// artifact type by reading its template from .yukki/templates/<type>.md.
// Supports read (view-only) and edit modes.

import { useCallback, useEffect } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { useArtifactEditorStore } from '@/stores/artifactEditor';
import { useArtifactsStore } from '@/stores/artifacts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { TemplatedEditor } from '@/components/hub/TemplatedEditor';
import { ArtifactReadView } from './ArtifactReadView';
import { cn } from '@/lib/utils';

// ─── Fallback raw textarea (no template) ─────────────────────────────────

interface FallbackEditorProps {
  content: string;
  onChange: (v: string) => void;
}

function FallbackEditor({ content, onChange }: FallbackEditorProps): JSX.Element {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-2 text-[12px] text-muted-foreground">
        Template non disponible — édition en mode brut
      </div>
      <textarea
        className="w-full flex-1 min-h-[calc(100vh-6rem)] font-mono text-sm bg-background p-6 resize-none focus:outline-none"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Éditeur brut"
        spellCheck={false}
      />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function ArtifactEditor(): JSX.Element {
  const selectedPath = useArtifactsStore((s) => s.selectedPath);
  const {
    parsedTemplate, editState, fallbackContent,
    viewMode, loading, saving, error,
    loadArtifact, setViewMode, updateEditState, updateFallbackContent, saveArtifact,
  } = useArtifactEditorStore();
  const { toast } = useToast();

  // Load artifact whenever selectedPath changes
  useEffect(() => {
    void loadArtifact(selectedPath);
  }, [selectedPath, loadArtifact]);

  const handleSave = useCallback(async () => {
    await saveArtifact();
    const { error: saveError } = useArtifactEditorStore.getState();
    if (saveError) {
      toast({ variant: 'destructive', title: "Erreur d'enregistrement", description: saveError });
    } else {
      toast({ title: 'Sauvegardé ✓', duration: 2000 });
    }
  }, [saveArtifact, toast]);

  const handleEdit = useCallback(() => setViewMode('edit'), [setViewMode]);
  const handleCancel = useCallback(() => setViewMode('read'), [setViewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // E → enter edit mode (not inside input/textarea)
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'TEXTAREA' && tag !== 'INPUT' && viewMode === 'read' && selectedPath) {
        e.preventDefault();
        setViewMode('edit');
      }
      // Ctrl+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && viewMode === 'edit') {
        e.preventDefault();
        void handleSave();
      }
      // Escape → cancel
      if (e.key === 'Escape' && viewMode === 'edit') {
        e.preventDefault();
        setViewMode('read');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, selectedPath, setViewMode, handleSave]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!selectedPath) {
    return (
      <section className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Sélectionner un artefact dans la liste.</p>
      </section>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </section>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="flex flex-1 overflow-y-auto bg-background">
        <div className="m-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </section>
    );
  }

  const hasTemplate = parsedTemplate !== null && editState !== null;

  return (
    <section
      className={cn('relative flex flex-1 flex-col overflow-y-auto bg-background')}
      aria-label="Artefact editor"
    >
      {/* Toolbar */}
      <div className="absolute top-2 right-4 z-10 flex gap-1">
        {viewMode === 'read' ? (
          <Button size="sm" variant="ghost" onClick={handleEdit} aria-label="Éditer" title="Éditer (E)">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button
              size="sm" variant="ghost"
              onClick={() => void handleSave()}
              disabled={saving}
              aria-label="Enregistrer" title="Enregistrer (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              aria-label="Annuler" title="Annuler (Escape)"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Read mode */}
      {viewMode === 'read' && hasTemplate && (
        <ArtifactReadView editState={editState} template={parsedTemplate} />
      )}

      {/* Read mode fallback (no template) */}
      {viewMode === 'read' && !hasTemplate && (
        <div className="prose prose-sm dark:prose-invert max-w-none px-6 py-6">
          <pre className="text-[12px] whitespace-pre-wrap font-mono">{useArtifactEditorStore.getState().rawContent}</pre>
        </div>
      )}

      {/* Edit mode — structured */}
      {viewMode === 'edit' && hasTemplate && (
        <TemplatedEditor
          editState={editState}
          template={parsedTemplate}
          onChange={updateEditState}
        />
      )}

      {/* Edit mode — fallback textarea */}
      {viewMode === 'edit' && !hasTemplate && (
        <FallbackEditor content={fallbackContent} onChange={updateFallbackContent} />
      )}
    </section>
  );
}
