// UI-014d — AI assist popover.
// Shown when a prose selection ≥ 3 words is detected. Anchored via
// `position: fixed` at the mouse-up coordinates. Contains 4 action rows
// plus a footer with the "Voir le prompt" link (mock dialog).

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSpddEditorStore } from '@/stores/spdd';
import { AI_ACTIONS } from './mockLlm';
import type { AiActionType } from './mockLlm';
import type { ProseSectionKey } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Section label (used in prompt preview) ───────────────────────────────

const SECTION_LABELS: Record<ProseSectionKey, string> = {
  bg: 'Background',
  bv: 'Business Value',
  si: 'Scope In',
  so: 'Scope Out',
  oq: 'Open Questions',
  no: 'Notes',
};

// ─── Mock prompt preview ──────────────────────────────────────────────────

function buildMockPrompt(section: ProseSectionKey, text: string, action: AiActionType): string {
  const sectionLabel = SECTION_LABELS[section];
  const actionLabel = AI_ACTIONS.find((a) => a.type === action)?.label ?? action;
  return `Tu es un rédacteur SPDD expert.

La section courante est **${sectionLabel}**.

Définition SPDD — ${sectionLabel} : ${SECTION_DEFS[section]}

Texte sélectionné : *${text}*

Action demandée : *${actionLabel}*

Contraintes :
- Conserve le ton factuel et concis des stories SPDD.
- Réponds uniquement avec le texte transformé, sans explication.
- Ne dépasse pas 2 phrases supplémentaires si tu enrichis.`;
}

const SECTION_DEFS: Record<ProseSectionKey, string> = {
  bg: "Contexte qui motive la story. Décrit l'état actuel et la friction sans proposer de solution.",
  bv: "Valeur métier. Suit la structure « En tant que X, je veux Y afin de Z ».",
  si: "Périmètre inclus. Liste de comportements observables, une puce par comportement.",
  so: "Périmètre exclu. Ce qui est explicitement hors-scope et pourquoi.",
  oq: "Questions ouvertes à trancher avant l'analyse ou le canvas.",
  no: "Notes, liens, références. Dépôt contextuel.",
};

// ─── Keyboard shortcut pill ───────────────────────────────────────────────

function KbdPill({ label }: { label: string }): JSX.Element {
  return (
    <span className="inline-flex items-center rounded border border-yk-line bg-yk-bg-3 px-1 py-0.5 font-jbmono text-[10px] text-yk-text-muted">
      {label}
    </span>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function AiPopover(): JSX.Element | null {
  const aiPhase = useSpddEditorStore((s) => s.aiPhase);
  const aiSelection = useSpddEditorStore((s) => s.aiSelection);
  const popoverPosition = useSpddEditorStore((s) => s.popoverPosition);
  const triggerAiAction = useSpddEditorStore((s) => s.triggerAiAction);
  const closeAiPopover = useSpddEditorStore((s) => s.closeAiPopover);

  const [hotIndex, setHotIndex] = useState(0);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (aiPhase !== 'popover') return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeAiPopover();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aiPhase, closeAiPopover]);

  // Keyboard: Enter = hot action, Escape = close, ⌘1-4 = actions
  useEffect(() => {
    if (aiPhase !== 'popover') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeAiPopover(); return; }
      if (e.key === 'Enter') { triggerAiAction(AI_ACTIONS[hotIndex].type); return; }
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < AI_ACTIONS.length) triggerAiAction(AI_ACTIONS[idx].type);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [aiPhase, hotIndex, triggerAiAction, closeAiPopover]);

  if (aiPhase !== 'popover' || !popoverPosition || !aiSelection) return null;

  // Clamp position so popover stays within viewport
  const x = Math.min(popoverPosition.x, window.innerWidth - 260);
  const y = Math.min(popoverPosition.y + 8, window.innerHeight - 240);

  return (
    <>
      <div
        ref={ref}
        role="dialog"
        aria-label="Actions IA"
        className={cn(
          'fixed z-50 min-w-[240px] rounded-yk border border-yk-line',
          'bg-yk-bg-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
          'animate-in fade-in zoom-in-95 duration-[120ms]',
        )}
        style={{ left: x, top: y }}
      >
        {/* Actions */}
        <ul className="py-1" role="listbox">
          {AI_ACTIONS.map((action, i) => (
            <li key={action.type} role="option" aria-selected={i === hotIndex}>
              <button
                type="button"
                onMouseEnter={() => setHotIndex(i)}
                onClick={() => triggerAiAction(action.type)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5',
                  'font-inter text-[13px] text-yk-text-primary transition-colors',
                  i === hotIndex
                    ? 'bg-[color:var(--yk-primary-soft)] text-yk-primary'
                    : 'hover:bg-yk-bg-2',
                )}
              >
                <span className="text-yk-primary" aria-hidden>✦</span>
                <span className="flex-1 text-left">{action.label}</span>
                <KbdPill label={action.shortcut} />
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="border-t border-yk-line-subtle px-3 py-2 text-[11.5px] text-yk-text-muted">
          <span>
            Yuki sait que tu rédiges la section{' '}
            <em>{SECTION_LABELS[aiSelection.sectionKey]}</em>.{' '}
            Le contexte SPDD est inclus dans le prompt.{' '}
          </span>
          <button
            type="button"
            onClick={() => setPromptDialogOpen(true)}
            className="text-yk-primary underline decoration-dotted hover:no-underline focus-visible:outline-none"
          >
            Voir le prompt
          </button>
        </div>
      </div>

      {/* Prompt preview dialog */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-inter text-[15px]">Prompt envoyé au LLM</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-yk bg-yk-bg-2 p-4 font-jbmono text-[12px] leading-[1.6] text-yk-text-secondary whitespace-pre-wrap">
            {buildMockPrompt(aiSelection.sectionKey, aiSelection.text, AI_ACTIONS[hotIndex].type)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
