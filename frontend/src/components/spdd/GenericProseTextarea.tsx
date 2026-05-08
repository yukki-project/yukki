// UI-014h O10 — Textarea générique avec auto-resize + détection de sélection
// ≥ 3 mots → AI popover. Le popover passe `heading` (titre humain de la
// section) comme contexte à `useSpddSuggest.start()` au lieu d'un SectionKey
// story-spécifique.
//
// Streaming : le hook expose start/streamText/state/cancel/reset. Le popover
// rend le streaming dans un panneau inline et propose Accepter / Refuser.
// Sur Accepter, la sélection [start, end] dans `value` est remplacée par le
// résultat — appliqué via `onChange(nextValue)`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpddSuggest } from '@/hooks/useSpddSuggest';
import { AI_ACTIONS } from './aiActions';
import type { AiActionType } from './aiActions';

const MIN_SELECTION_WORDS = 3;

function countWords(s: string): number {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
}

interface SelectionInfo {
  start: number;
  end: number;
  text: string;
}

interface PopoverPos {
  x: number;
  y: number;
}

export interface GenericProseTextareaProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  /** UI-014h O10 — heading humain de la section, passé à useSpddSuggest comme contexte. */
  sectionHeading?: string;
  /** UI-014h O10 — type d'artefact, fourni au prompt LLM en plus du heading. */
  artifactType?: string;
}

export function GenericProseTextarea({
  value,
  onChange,
  readOnly,
  sectionHeading,
  artifactType,
}: GenericProseTextareaProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [activeAction, setActiveAction] = useState<AiActionType | null>(null);
  const suggest = useSpddSuggest();

  // AI désactivée quand readOnly OU pas de heading (impossible de cibler)
  const aiEnabled = !readOnly && !!sectionHeading;

  // Auto-resize on value change
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!aiEnabled) return;
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) {
        setSelection(null);
        setPopoverPos(null);
        return;
      }
      const selected = value.slice(start, end);
      if (countWords(selected) < MIN_SELECTION_WORDS) {
        setSelection(null);
        setPopoverPos(null);
        return;
      }
      setSelection({ start, end, text: selected });
      setPopoverPos({ x: e.clientX, y: e.clientY });
    },
    [aiEnabled, value],
  );

  const closePopover = useCallback(() => {
    setSelection(null);
    setPopoverPos(null);
    setActiveAction(null);
    suggest.reset();
  }, [suggest]);

  const fireAction = useCallback(
    (action: AiActionType) => {
      if (!selection || !sectionHeading) return;
      setActiveAction(action);
      const heading = artifactType
        ? `${sectionHeading} (${artifactType})`
        : sectionHeading;
      void suggest.start({
        section: heading,
        action,
        selectedText: selection.text,
      });
    },
    [selection, sectionHeading, artifactType, suggest],
  );

  const acceptSuggestion = useCallback(() => {
    if (!selection || !suggest.streamText) return;
    const next =
      value.slice(0, selection.start) +
      suggest.streamText +
      value.slice(selection.end);
    onChange(next);
    closePopover();
  }, [selection, suggest.streamText, value, onChange, closePopover]);

  return (
    <>
      <textarea
        ref={textareaRef}
        rows={4}
        value={value}
        readOnly={readOnly}
        onMouseUp={aiEnabled ? handleMouseUp : undefined}
        onChange={
          readOnly
            ? undefined
            : (e) => {
                onChange(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
        }
        className={cn(
          'w-full resize-none overflow-hidden rounded-yk bg-transparent',
          'text-[14px] leading-[1.62] text-yk-text-primary',
          'placeholder:text-yk-text-faint',
          'focus:outline-none',
          readOnly && 'cursor-default select-text',
        )}
      />

      {selection && popoverPos && (
        <GenericAiPopoverPanel
          pos={popoverPos}
          heading={sectionHeading ?? ''}
          activeAction={activeAction}
          state={suggest.state}
          streamText={suggest.streamText}
          error={suggest.error}
          onAction={fireAction}
          onAccept={acceptSuggestion}
          onCancel={closePopover}
        />
      )}
    </>
  );
}

// ─── Popover ─────────────────────────────────────────────────────────────

interface GenericAiPopoverPanelProps {
  pos: PopoverPos;
  heading: string;
  activeAction: AiActionType | null;
  state: 'idle' | 'streaming' | 'done' | 'error';
  streamText: string;
  error: string | null;
  onAction: (a: AiActionType) => void;
  onAccept: () => void;
  onCancel: () => void;
}

function GenericAiPopoverPanel({
  pos,
  heading,
  activeAction,
  state,
  streamText,
  error,
  onAction,
  onAccept,
  onCancel,
}: GenericAiPopoverPanelProps): JSX.Element {
  // Clamp pour rester dans la viewport
  const x = Math.min(pos.x, window.innerWidth - 320);
  const y = Math.min(pos.y + 8, window.innerHeight - 280);
  const showResult = activeAction !== null;
  const isStreaming = state === 'streaming';
  const isDone = state === 'done';
  const isError = state === 'error';

  return (
    <div
      role="dialog"
      aria-label="Actions IA (chemin générique)"
      className={cn(
        'fixed z-50 min-w-[280px] max-w-[420px] rounded-yk border border-yk-line',
        'bg-yk-bg-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
        'animate-in fade-in zoom-in-95 duration-[120ms]',
      )}
      style={{ left: x, top: y }}
    >
      <header className="flex items-center justify-between gap-2 border-b border-yk-line-subtle px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-jbmono text-[11px] text-yk-text-muted">
          <Sparkles className="h-3 w-3 text-yk-primary" aria-hidden />
          AI · <em className="not-italic text-yk-text-secondary">{heading || '?'}</em>
        </span>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onCancel}
          className="text-yk-text-faint hover:text-yk-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {!showResult && (
        <ul className="py-1" role="listbox">
          {AI_ACTIONS.map((a) => (
            <li key={a.type} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onAction(a.type)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5',
                  'font-inter text-[13px] text-yk-text-primary transition-colors',
                  'hover:bg-yk-bg-2',
                )}
              >
                <span className="text-yk-primary" aria-hidden>✦</span>
                <span className="flex-1 text-left">{a.label}</span>
                <span className="font-jbmono text-[10px] text-yk-text-muted">
                  {a.shortcut}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showResult && (
        <div className="flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2 font-jbmono text-[10px] text-yk-text-muted">
            <span>{AI_ACTIONS.find((a) => a.type === activeAction)?.label}</span>
            {isStreaming && <span className="text-yk-primary">streaming…</span>}
            {isDone && <span className="text-yk-success">prêt</span>}
            {isError && <span className="text-yk-danger">erreur</span>}
          </div>
          <div
            className={cn(
              'min-h-[80px] max-h-[200px] overflow-y-auto rounded-yk border border-yk-line-subtle',
              'bg-yk-bg-2 px-2.5 py-2 text-[12.5px] leading-[1.55]',
              'text-yk-text-primary whitespace-pre-wrap',
            )}
          >
            {streamText || (isError ? error : '…')}
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-yk-sm border border-yk-line px-2.5 py-1 font-inter text-[12px] text-yk-text-secondary hover:bg-yk-bg-2"
            >
              Refuser
            </button>
            <button
              type="button"
              disabled={!isDone}
              onClick={onAccept}
              className={cn(
                'rounded-yk-sm px-2.5 py-1 font-inter text-[12px]',
                isDone
                  ? 'bg-yk-primary text-white hover:brightness-110'
                  : 'bg-yk-bg-3 text-yk-text-faint cursor-not-allowed',
              )}
            >
              Accepter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
