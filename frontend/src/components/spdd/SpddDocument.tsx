// UI-014c — Center document column. FM + prose sections are now editable.
// UI-014d — ProseTextarea detects selection ≥ 3 words and opens AiPopover.

import { useCallback, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { SECTIONS, SECTION_HINTS } from './sections';
import { useSpddEditorStore } from '@/stores/spdd';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SpddFmForm } from './SpddFmForm';
import { SpddAcEditor } from './SpddAcEditor';
import type { ProseSectionKey, SectionKey, SpddSection } from './types';

export interface SpddDocumentProps {
  onActiveSectionFromScroll: (key: SectionKey) => void;
}

export function SpddDocument({
  onActiveSectionFromScroll,
}: SpddDocumentProps): JSX.Element {
  const containerRef = useRef<HTMLElement | null>(null);

  // Wire up an IntersectionObserver: the section that occupies the most of
  // the viewport becomes the active one (debounced via ref to avoid jitter
  // during smooth-scroll).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const visibility = new Map<SectionKey, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.sectionKey as
            | SectionKey
            | undefined;
          if (!key) continue;
          visibility.set(key, e.intersectionRatio);
        }
        let bestKey: SectionKey | null = null;
        let bestRatio = -1;
        for (const [k, r] of visibility.entries()) {
          if (r > bestRatio) {
            bestKey = k;
            bestRatio = r;
          }
        }
        if (bestKey && bestRatio > 0.05) {
          onActiveSectionFromScroll(bestKey);
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const sections = root.querySelectorAll<HTMLElement>('[data-section-key]');
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onActiveSectionFromScroll]);

  return (
    <TooltipProvider delayDuration={250}>
      <main
        ref={containerRef}
        className="relative h-full overflow-y-auto bg-yk-bg-page"
      >
        <div className="mx-auto max-w-[720px] px-14 pb-20 pt-7">
          {SECTIONS.map((section) => (
            <SectionBlock key={section.key} section={section} />
          ))}
        </div>
      </main>
    </TooltipProvider>
  );
}

function SectionBlock({ section }: { section: SpddSection }): JSX.Element {
  const id = `spdd-section-${section.key}`;

  return (
    <section
      id={id}
      data-section-key={section.key}
      className="scroll-mt-20 pb-10"
      aria-labelledby={`${id}-title`}
    >
      <header className="mb-3 flex items-center gap-2 border-b border-yk-line-subtle pb-2">
        <h2
          id={`${id}-title`}
          className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-yk-text-primary"
        >
          {section.label}
        </h2>
        <span
          className={cn(
            'rounded-yk-sm px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider',
            section.required
              ? 'bg-[color:var(--yk-warning-soft)] text-yk-warning'
              : 'bg-yk-bg-2 text-yk-text-muted',
          )}
        >
          {section.required ? 'obligatoire' : 'optionnel'}
        </span>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Hint pour ${section.label}`}
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center rounded-full',
                'text-yk-text-faint transition-colors hover:text-yk-text-secondary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
              )}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {SECTION_HINTS[section.key]}
          </TooltipContent>
        </Tooltip>
      </header>

      {section.key === 'fm' ? (
        <SpddFmForm />
      ) : section.key === 'ac' ? (
        <SpddAcEditor />
      ) : (
        <ProseTextarea sectionKey={section.key as ProseSectionKey} />
      )}
    </section>
  );
}

const PROSE_PLACEHOLDERS: Record<ProseSectionKey, string> = {
  bg: "Pose le décor : pourquoi cette story existe et quel contexte motive sa rédaction.",
  bv: "Décris la valeur métier : à qui ça sert et quel gain mesurable.",
  si: "Liste précise de ce qui est dans le périmètre. Une puce = un comportement.",
  so: "Précise ce qui est explicitement exclu, et pourquoi.",
  oq: "Note les questions à trancher avec le PO ou l'archi avant l'analyse.",
  no: "Liens vers tickets, threads, captures. Tout ce qui éclaire le contexte.",
};

function countWords(s: string): number {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
}

function ProseTextarea({ sectionKey }: { sectionKey: ProseSectionKey }): JSX.Element {
  const value = useSpddEditorStore((s) => s.draft.sections[sectionKey]);
  const setSection = useSpddEditorStore((s) => s.setSection);
  const openAiPopover = useSpddEditorStore((s) => s.openAiPopover);
  const aiPhase = useSpddEditorStore((s) => s.aiPhase);
  const aiSelection = useSpddEditorStore((s) => s.aiSelection);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Whether THIS textarea's section is being reviewed in the diff panel
  const isMuted = (aiPhase === 'generating' || aiPhase === 'diff') &&
    aiSelection?.sectionKey === sectionKey;

  // Auto-resize on value change
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (aiPhase !== 'idle' && aiPhase !== 'popover') return;
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) return; // no selection
      const selected = value.slice(start, end);
      if (countWords(selected) < 3) return; // too short
      openAiPopover(
        { sectionKey, text: selected, start, end },
        { x: e.clientX, y: e.clientY },
      );
    },
    [aiPhase, openAiPopover, sectionKey, value],
  );

  return (
    <textarea
      ref={textareaRef}
      rows={4}
      value={value}
      placeholder={PROSE_PLACEHOLDERS[sectionKey]}
      onChange={(e) => {
        setSection(sectionKey, e.target.value);
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }}
      onMouseUp={handleMouseUp}
      className={cn(
        'w-full resize-none overflow-hidden rounded-yk bg-transparent',
        'text-[14px] leading-[1.62] text-yk-text-primary',
        'placeholder:text-yk-text-faint',
        'focus:outline-none',
        'transition-all duration-200',
        isMuted && 'opacity-40 grayscale',
      )}
    />
  );
}
