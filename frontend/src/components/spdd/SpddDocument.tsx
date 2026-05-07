// UI-014a — Center document column. Renders the 8 SPDD sections in order.
// Sections with content are rendered read-only (real editing arrives in
// UI-014b/c); sections that are empty fall back to a dashed placeholder.

import { useEffect, useRef } from 'react';
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
import type { ProseSectionKey, SectionKey, SpddSection } from './types';

const PROSE_PLACEHOLDERS: Record<ProseSectionKey, string> = {
  bg: "Pose le décor : pourquoi cette story existe et quel contexte motive sa rédaction.",
  bv: "Décris la valeur métier : à qui ça sert et quel gain mesurable.",
  si: "Liste précise de ce qui est dans le périmètre. Une puce = un comportement.",
  so: "Précise ce qui est explicitement exclu, et pourquoi.",
  oq: "Note les questions à trancher avec le PO ou l'archi avant l'analyse.",
  no: "Liens vers tickets, threads, captures. Tout ce qui éclaire le contexte.",
};

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
        <FrontMatterPreview />
      ) : section.key === 'ac' ? (
        <AcPreview />
      ) : (
        <ProsePreview sectionKey={section.key as ProseSectionKey} />
      )}
    </section>
  );
}

function FrontMatterPreview(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const rows: Array<[string, string]> = [
    ['id', draft.id],
    ['slug', draft.slug],
    ['title', draft.title],
    ['status', draft.status],
    ['created', draft.created],
    ['updated', draft.updated],
    ['owner', draft.owner],
  ];
  return (
    <div className="rounded-yk border border-yk-line bg-yk-bg-2 p-4">
      <table className="w-full font-jbmono text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="w-[110px] py-1 align-top text-[11.5px] text-yk-text-muted">
                {k}
              </td>
              <td className="py-1 text-yk-text-primary">{v}</td>
            </tr>
          ))}
          <tr>
            <td className="w-[110px] py-1 align-top text-[11.5px] text-yk-text-muted">
              modules
            </td>
            <td className="py-1">
              <div className="flex flex-wrap gap-1.5">
                {draft.modules.map((m) => (
                  <span
                    key={m}
                    className="rounded-yk-sm bg-yk-bg-3 px-2 py-0.5 font-jbmono text-[11.5px] text-yk-text-secondary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AcPreview(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  return (
    <div className="space-y-3">
      {draft.ac.map((ac, idx) => {
        const filled = [ac.given, ac.when, ac.then];
        const filledCount = filled.filter((v) => v.trim()).length;
        const complete = filledCount === 3 && ac.title.trim();
        const partial = filledCount > 0 && filledCount < 3;
        return (
          <article
            key={ac.id}
            className="rounded-yk border border-yk-line bg-yk-bg-2"
          >
            <header className="flex items-center gap-3 border-b border-yk-line-subtle px-3 py-2">
              <AcStatusBadge
                status={complete ? 'done' : partial ? 'partial' : 'todo'}
                index={idx + 1}
              />
              <span className="font-jbmono text-[11.5px] text-yk-text-muted">
                {ac.id}
              </span>
              <span className="text-[13.5px] font-medium text-yk-text-primary">
                {ac.title || <span className="italic text-yk-text-muted">Sans titre</span>}
              </span>
            </header>
            <table className="w-full">
              <tbody>
                <AcRow label="GIVEN" value={ac.given} />
                <AcRow label="WHEN" value={ac.when} />
                <AcRow label="THEN" value={ac.then} />
              </tbody>
            </table>
          </article>
        );
      })}
    </div>
  );
}

interface AcStatusBadgeProps {
  status: 'done' | 'partial' | 'todo';
  index: number;
}

function AcStatusBadge({ status, index }: AcStatusBadgeProps): JSX.Element {
  if (status === 'done') {
    return (
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-yk-success text-[10px] font-bold text-white">
        ✓
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-yk-warning text-[10px] font-bold text-yk-bg-page">
        !
      </span>
    );
  }
  return (
    <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-yk-bg-3 font-jbmono text-[10px] text-yk-text-secondary">
      {index}
    </span>
  );
}

interface AcRowProps {
  label: 'GIVEN' | 'WHEN' | 'THEN';
  value: string;
}

function AcRow({ label, value }: AcRowProps): JSX.Element {
  const filled = value.trim().length > 0;
  return (
    <tr className="border-t border-yk-line-subtle first:border-t-0">
      <td
        className={cn(
          'w-[70px] bg-yk-bg-1 px-3 py-2 align-top font-jbmono text-[11px]',
          filled ? 'text-yk-text-muted' : 'text-yk-warning',
        )}
      >
        {label}
      </td>
      <td className="px-3 py-2 text-[13.5px] text-yk-text-primary">
        {filled ? (
          value
        ) : (
          <span className="italic text-yk-text-faint">non renseigné</span>
        )}
      </td>
    </tr>
  );
}

function ProsePreview({ sectionKey }: { sectionKey: ProseSectionKey }): JSX.Element {
  const value = useSpddEditorStore((s) => s.draft.sections[sectionKey]);
  if (!value || !value.trim()) {
    return (
      <div
        className={cn(
          'rounded-yk border border-dashed border-yk-line-strong bg-yk-bg-2',
          'px-5 py-6 text-[13.5px] italic text-yk-text-muted',
          'transition-colors hover:border-yk-primary hover:bg-[color:var(--yk-primary-soft)]',
        )}
      >
        {PROSE_PLACEHOLDERS[sectionKey]}
      </div>
    );
  }

  // Multi-line prose: split on blank lines into paragraphs, single line breaks
  // inside a block stay as <br>. List-friendly content (Scope In) uses single
  // newlines per bullet — render as <ul> when every non-empty line is short.
  const lines = value.split(/\n+/).filter((l) => l.trim().length > 0);
  const looksLikeList =
    sectionKey === 'si' || sectionKey === 'so' || sectionKey === 'oq';

  if (looksLikeList) {
    return (
      <ul className="space-y-1.5 pl-1 text-[13.5px] leading-[1.62] text-yk-text-secondary">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span
              aria-hidden
              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-yk-text-faint"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3 text-[14px] leading-[1.62] text-yk-text-secondary">
      {lines.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
