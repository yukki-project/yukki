// UI-014d — AI Diff Panel (replaces the 360px inspector during AI review).
// Shows AVANT / APRÈS / DIFF cards + Accept / Reject / Regenerate buttons.
// UI-014f — O6: Branche useSpddSuggest (streaming réel) via prop suggestResult.

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import { AI_ACTIONS } from './aiActions';
import type { SpddSuggestResult, SuggestionRequest } from '@/hooks/useSpddSuggest';

// ─── Word-level diff ──────────────────────────────────────────────────────

type DiffToken = { kind: 'same' | 'del' | 'ins'; text: string };

function wordDiff(before: string, after: string): DiffToken[] {
  const bw = before.split(/(\s+)/);
  const aw = after.split(/(\s+)/);
  const m = bw.length;
  const n = aw.length;

  // LCS matrix (lengths only)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        bw[i - 1] === aw[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const tokens: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bw[i - 1] === aw[j - 1]) {
      tokens.unshift({ kind: 'same', text: bw[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ kind: 'ins', text: aw[j - 1] });
      j--;
    } else {
      tokens.unshift({ kind: 'del', text: bw[i - 1] });
      i--;
    }
  }
  return tokens;
}

// ─── Spinner ──────────────────────────────────────────────────────────────

function Spinner(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <span
        aria-label="Chargement"
        className="block h-6 w-6 animate-spin rounded-full border-2 border-yk-line border-t-yk-primary"
      />
      <span className="font-inter text-[13px] text-yk-text-muted">Yuki rédige…</span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────

interface DiffCardProps {
  label: string;
  colorClass: string;
  children: React.ReactNode;
}

function DiffCard({ label, colorClass, children }: DiffCardProps): JSX.Element {
  return (
    <div className={cn('rounded-yk border border-yk-line overflow-hidden', colorClass)}>
      <div className="flex items-center gap-2 border-b border-yk-line px-3 py-1.5">
        <span className="font-jbmono text-[10px] font-semibold uppercase tracking-widest text-yk-text-muted">
          {label}
        </span>
      </div>
      <div className="px-3 py-2.5 text-[13px] leading-[1.62]">{children}</div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

interface AiDiffPanelProps {
  suggestResult: SpddSuggestResult;
  currentRequest: SuggestionRequest | null;
}

export function AiDiffPanel({ suggestResult, currentRequest }: AiDiffPanelProps): JSX.Element {
  const aiAction = useSpddEditorStore((s) => s.aiAction);
  const aiSelection = useSpddEditorStore((s) => s.aiSelection);
  const acceptSuggestion = useSpddEditorStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useSpddEditorStore((s) => s.rejectSuggestion);

  const actionLabel = AI_ACTIONS.find((a) => a.type === aiAction)?.label ?? '…';
  const isGenerating = suggestResult.state === 'streaming';
  const isError = suggestResult.state === 'error';
  const suggestion = suggestResult.streamText;

  const handleAccept = () => {
    // Sync the streamed text into the store before calling acceptSuggestion.
    useSpddEditorStore.setState({ aiSuggestion: suggestion });
    acceptSuggestion();
    suggestResult.reset();
  };

  const handleReject = () => {
    rejectSuggestion();
    suggestResult.reset();
  };

  const handleRegenerate = () => {
    if (!currentRequest) return;
    void suggestResult.start({
      ...currentRequest,
      previousSuggestion: suggestion,
    });
  };

  return (
    <aside
      aria-label="Panneau de diff IA"
      className="flex h-full flex-col gap-0 overflow-y-auto bg-yk-bg-1"
    >
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-yk-line px-4 py-2.5">
        <span className="font-inter text-[13px] font-semibold text-yk-text-primary">
          ✦ {actionLabel}
        </span>
        {isGenerating && (
          <span className="ml-auto font-inter text-[11.5px] text-yk-text-muted">en cours…</span>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {isError ? (
          <div className="flex flex-col items-start gap-3 rounded-yk border border-yk-danger bg-[color:var(--yk-danger-soft)] p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yk-danger" />
              <p className="font-inter text-[13px] text-yk-danger">
                {suggestResult.error ?? 'Une erreur inattendue s\'est produite.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (currentRequest) void suggestResult.start(currentRequest);
              }}
              disabled={!currentRequest}
              className={cn(
                'rounded-yk-sm border border-yk-danger px-3 py-1 font-inter text-[12px] text-yk-danger',
                'transition-colors hover:bg-yk-danger hover:text-white',
                'disabled:cursor-not-allowed disabled:opacity-40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              )}
            >
              Relancer
            </button>
          </div>
        ) : isGenerating ? (
          <Spinner />
        ) : (
          <>
            {/* AVANT */}
            <DiffCard label="avant" colorClass="bg-[color:var(--yk-danger-soft)]">
              <p className="text-yk-text-primary">{aiSelection?.text}</p>
            </DiffCard>

            {/* APRÈS */}
            <DiffCard label="après" colorClass="bg-[color:var(--yk-success-soft)]">
              <p className="text-yk-text-primary">{suggestion}</p>
            </DiffCard>

            {/* DIFF */}
            <DiffCard label="diff" colorClass="">
              <p className="flex flex-wrap leading-[1.8]">
                {wordDiff(aiSelection?.text ?? '', suggestion).map((token, i) => {
                  if (token.kind === 'del')
                    return (
                      <span
                        key={i}
                        className="rounded-sm bg-[color:var(--yk-danger-soft)] text-yk-danger line-through"
                      >
                        {token.text}
                      </span>
                    );
                  if (token.kind === 'ins')
                    return (
                      <span
                        key={i}
                        className="rounded-sm bg-[color:var(--yk-success-soft)] text-yk-success"
                      >
                        {token.text}
                      </span>
                    );
                  return <span key={i} className="text-yk-text-secondary">{token.text}</span>;
                })}
              </p>
            </DiffCard>
          </>
        )}
      </div>

      {/* Action buttons */}
      <footer className="flex items-center gap-2 border-t border-yk-line px-4 py-3">
        <button
          type="button"
          onClick={handleReject}
          className={cn(
            'flex-1 rounded-yk-sm border border-yk-line py-1.5 font-inter text-[13px] text-yk-text-secondary',
            'transition-colors hover:bg-yk-bg-2 hover:text-yk-text-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
          )}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isGenerating || !suggestion}
          className={cn(
            'flex-1 rounded-yk-sm bg-yk-primary py-1.5 font-inter text-[13px] font-medium text-white',
            'transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
          )}
        >
          ✓ Accepter
        </button>
        <button
          type="button"
          aria-label="Régénérer"
          onClick={handleRegenerate}
          disabled={isGenerating}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-yk-sm border border-yk-line',
            'text-yk-text-muted transition-colors hover:bg-yk-bg-2 hover:text-yk-primary',
            'disabled:cursor-not-allowed disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
        </button>
      </footer>
    </aside>
  );
}
