import { useEffect, useState } from 'react';
import { Loader2, RotateCw, X } from 'lucide-react';
import {
  AbortRunning,
  RunStory,
  SuggestedPrefixes,
} from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EventsOn,
  type ProviderEndPayload,
  type ProviderStartPayload,
  type ProviderTextPayload,
} from '@/lib/wails-events';
import { useArtifactsStore } from '@/stores/artifacts';
import { useClaudeStore } from '@/stores/claude';
import { useGenerationStore } from '@/stores/generation';

interface NewStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CUSTOM = '__custom__';
const MAX_DESCRIPTION = 10000;

export function NewStoryModal({ open, onOpenChange }: NewStoryModalProps) {
  const [description, setDescription] = useState<string>('');
  const [prefix, setPrefix] = useState<string>('STORY');
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [strictPrefix, setStrictPrefix] = useState<boolean>(false);
  const [prefixes, setPrefixes] = useState<string[]>(['STORY']);
  const [liveText, setLiveText] = useState<string>('');

  const phase = useGenerationStore((s) => s.phase);
  const currentLabel = useGenerationStore((s) => s.currentLabel);
  const generationError = useGenerationStore((s) => s.error);
  const startGen = useGenerationStore((s) => s.start);
  const succeedGen = useGenerationStore((s) => s.succeed);
  const failGen = useGenerationStore((s) => s.fail);
  const resetGen = useGenerationStore((s) => s.reset);

  const claudeAvailable = useClaudeStore((s) => s.status.Available);
  const refreshArtifacts = useArtifactsStore((s) => s.refresh);
  const setSelectedPath = useArtifactsStore((s) => s.setSelectedPath);

  // Load suggested prefixes once at mount.
  useEffect(() => {
    let cancelled = false;
    SuggestedPrefixes()
      .then((list) => {
        if (!cancelled && list.length > 0) setPrefixes(list);
      })
      .catch(() => {
        // keep fallback ['STORY']
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to Wails events for the lifetime of this component.
  useEffect(() => {
    const offStart = EventsOn<ProviderStartPayload>(
      'provider:start',
      (p) => startGen(p.label),
    );
    const offEnd = EventsOn<ProviderEndPayload>('provider:end', (p) => {
      if (p.success) {
        succeedGen(p.path, p.durationMs);
        void refreshArtifacts();
        if (p.path) setSelectedPath(p.path);
        // Auto-close on success.
        onOpenChange(false);
      } else {
        failGen(p.error);
      }
    });
    const offText = EventsOn<ProviderTextPayload>('provider:text', (p) => {
      setLiveText((prev) => prev + p.chunk);
    });
    return () => {
      offStart();
      offEnd();
      offText();
    };
  }, [startGen, succeedGen, failGen, refreshArtifacts, setSelectedPath, onOpenChange]);

  // Reset state when the modal is reopened in idle/error phase.
  useEffect(() => {
    if (open && phase !== 'running') {
      resetGen();
      setLiveText('');
    }
  }, [open, phase, resetGen]);

  const effectivePrefix = prefix === CUSTOM ? customPrefix.trim() : prefix;
  const canGenerate =
    claudeAvailable &&
    description.trim().length > 0 &&
    effectivePrefix.length > 0 &&
    phase !== 'running';

  async function handleGenerate() {
    // Optimistically set phase=running so the spinner shows immediately
    // even if the provider:start event arrives late (or never, e.g.
    // events listener not yet wired). The backend will overwrite this
    // via provider:start with a richer label.
    startGen('Asking Claude');
    try {
      const path = await RunStory(description, effectivePrefix, strictPrefix);
      // Promise resolved with a path → success. Use the Promise as the
      // source of truth (events are best-effort enhancement for live
      // label updates).
      succeedGen(path, 0);
      void refreshArtifacts();
      if (path) setSelectedPath(path);
      onOpenChange(false);
    } catch (e) {
      // Promise rejected → failure. Use the rejected error as the
      // message; the provider:end event with the same error will be
      // ignored (idempotent set).
      failGen(String(e));
    }
  }

  async function handleAbort() {
    try {
      await AbortRunning();
    } catch (e) {
      // best-effort; provider:end will arrive with success=false
    }
  }

  function handleRetry() {
    resetGen();
    void handleGenerate();
  }

  // Block close-attempts while a generation is running (D-C12).
  function handleOpenChange(next: boolean) {
    if (!next && phase === 'running') {
      // ignore Esc / click-outside while running
      return;
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New SPDD story</DialogTitle>
          <DialogDescription>
            Describe what you want to build. Claude will generate a complete
            user story (background, value, scope, AC) under <code>.yukki/stories/</code>.
          </DialogDescription>
        </DialogHeader>

        {phase === 'running' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-ykp-text-muted" />
            <p className="text-sm text-ykp-text-muted">
              {currentLabel || 'Working…'}
            </p>            {liveText && (
              <pre className="w-full max-h-60 overflow-y-auto rounded-md border border-ykp-line bg-ykp-bg-subtle p-2 text-xs font-mono text-ykp-text-muted whitespace-pre-wrap break-words">
                {liveText}
              </pre>
            )}            <Button variant="outline" size="sm" onClick={handleAbort}>
              <X className="mr-2 h-3 w-3" /> Abort
            </Button>
          </div>
        )}

        {phase !== 'running' && (
          <>
            {phase === 'error' && generationError && (
              <div className="rounded-md border border-destructive/40 bg-ykp-danger/10 p-3 text-sm text-ykp-danger">
                {generationError}
              </div>
            )}

            {!claudeAvailable && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                Claude CLI is not detected — install it before generating.
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_DESCRIPTION}
                rows={6}
                placeholder="ex. Permettre l'export Excel des rapports Trivy filtrés par namespace…"
                className="flex w-full rounded-md border border-ykp-line bg-ykp-bg-page px-3 py-2 text-sm ring-offset-ykp-bg-page placeholder:text-ykp-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ykp-ring focus-visible:ring-offset-2"
              />
              <div className="text-right text-xs text-ykp-text-muted">
                {description.length} / {MAX_DESCRIPTION}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="prefix" className="text-sm font-medium">
                  Prefix
                </label>
                <select
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-ykp-line bg-ykp-bg-page px-3 py-2 text-sm ring-offset-ykp-bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ykp-ring"
                >
                  {prefixes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={CUSTOM}>Custom…</option>
                </select>
                {prefix === CUSTOM && (
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                    placeholder="ABC"
                    className="flex h-9 w-full rounded-md border border-ykp-line bg-ykp-bg-page px-3 py-1 text-sm uppercase"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Strict whitelist</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={strictPrefix}
                    onChange={(e) => setStrictPrefix(e.target.checked)}
                  />
                  Reject prefix outside whitelist
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {phase === 'error' ? (
                <Button onClick={handleRetry} disabled={!canGenerate}>
                  <RotateCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              ) : (
                <Button onClick={handleGenerate} disabled={!canGenerate}>
                  Generate
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
