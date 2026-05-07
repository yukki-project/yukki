// UI-014c — Markdown view: syntax-highlighted .md with gutter + line numbers.
// Editable textarea with passive CSS syntax highlighting via token classes.
// Clicking a section in the TOC scrolls to the relevant ## heading line.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { buildSectionLineMap } from './serializer';
import type { SectionKey } from './types';

// ─── Token types for syntax highlighting ──────────────────────────────────

type TokenKind =
  | 'fm-delimiter'   // ---
  | 'fm-key'         // key:
  | 'fm-value'       // value after key:
  | 'h1'             // # Title
  | 'h2'             // ## Section
  | 'h3'             // ### AC
  | 'bullet'         // - item
  | 'bold'           // **bold**
  | 'italic'         // *italic*
  | 'plain';

interface Token {
  kind: TokenKind;
  text: string;
}

// ─── Per-line tokenizer ───────────────────────────────────────────────────

/** Lightweight tokenizer for a single line. Returns a list of tokens. */
function tokenizeLine(line: string, inFm: boolean): Token[] {
  if (line === '---') return [{ kind: 'fm-delimiter', text: line }];

  if (inFm) {
    const kv = line.match(/^(\w+)(:)(.*)/);
    if (kv) {
      return [
        { kind: 'fm-key', text: kv[1] + kv[2] },
        { kind: 'fm-value', text: kv[3] },
      ];
    }
    return [{ kind: 'fm-value', text: line }];
  }

  if (/^###\s/.test(line)) return [{ kind: 'h3', text: line }];
  if (/^##\s/.test(line)) return [{ kind: 'h2', text: line }];
  if (/^#\s/.test(line)) return [{ kind: 'h1', text: line }];
  if (/^-\s/.test(line)) {
    // Inline bold/italic in bullet
    return [{ kind: 'bullet', text: line }];
  }

  return [{ kind: 'plain', text: line }];
}

// ─── Token → className ────────────────────────────────────────────────────

const TOKEN_CLASS: Record<TokenKind, string> = {
  'fm-delimiter': 'text-yk-text-muted',
  'fm-key':       'text-[#c8b6ff]',
  'fm-value':     'text-[#9be3a8]',
  'h1':           'text-[#ffd089] font-semibold',
  'h2':           'text-[#ffd089] font-semibold',
  'h3':           'text-[#ffb3c1] font-medium',
  'bullet':       'text-yk-text-secondary',
  'bold':         'font-semibold text-[#f5f6fa]',
  'italic':       'italic text-yk-text-secondary',
  'plain':        'text-yk-text-primary',
};

// ─── Rendered line ────────────────────────────────────────────────────────

interface RenderedLineProps {
  lineNo: number;
  line: string;
  inFm: boolean;
  isActive: boolean;
  activeSectionLineNo?: number;
}

function RenderedLine({ lineNo, line, inFm, isActive }: RenderedLineProps): JSX.Element {
  const tokens = tokenizeLine(line, inFm);

  return (
    <div
      className={cn(
        'flex min-h-[1.55em] w-full select-none font-jbmono text-[13px] leading-[1.55]',
        isActive && 'bg-[color:var(--yk-primary-soft)]',
      )}
    >
      {/* Line number gutter */}
      <span
        className={cn(
          'w-[50px] shrink-0 select-none pr-4 text-right font-jbmono text-[11.5px] text-yk-text-faint',
          isActive && 'font-medium text-yk-primary',
        )}
      >
        {lineNo}
      </span>

      {/* Token spans */}
      <span className="flex-1 whitespace-pre-wrap break-words">
        {tokens.map((t, i) => (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ))}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

interface SpddMarkdownViewProps {
  /** The markdown source to display/edit */
  source: string;
  onChange: (value: string) => void;
  activeSection: SectionKey;
  /** When changed, scroll to the section heading line */
  scrollToSection?: SectionKey | null;
  onScrollHandled?: () => void;
}

export function SpddMarkdownView({
  source,
  onChange,
  activeSection,
  scrollToSection,
  onScrollHandled,
}: SpddMarkdownViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => source.split('\n'), [source]);

  // Track front-matter boundaries for tokenizer
  const { fmStart, fmEnd } = useMemo(() => {
    let start = -1;
    let end = -1;
    if (lines[0]?.trim() === '---') {
      start = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === '---') { end = i; break; }
      }
    }
    return { fmStart: start, fmEnd: end };
  }, [lines]);

  const sectionLineMap = useMemo(() => buildSectionLineMap(source), [source]);

  // Active line set (1-based)
  const activeLine = sectionLineMap.get(activeSection);

  // Scroll to section when scrollToSection changes
  useEffect(() => {
    if (!scrollToSection) return;
    const lineNo = sectionLineMap.get(scrollToSection);
    if (lineNo == null) return;
    // Scroll the overlay container (not the textarea)
    const overlay = containerRef.current;
    if (!overlay) return;
    const lineHeight = 20; // approx 1.55em × 13px
    const targetOffset = (lineNo - 1) * lineHeight;
    overlay.scrollTop = Math.max(0, targetOffset - 100);
    onScrollHandled?.();
  }, [scrollToSection, sectionLineMap, onScrollHandled]);

  // Keep textarea scroll synced with overlay scroll
  const handleOverlayScroll = useCallback(() => {
    const overlay = containerRef.current;
    const ta = textareaRef.current;
    if (overlay && ta) {
      ta.scrollTop = overlay.scrollTop;
    }
  }, []);

  const handleTextareaScroll = useCallback(() => {
    const overlay = containerRef.current;
    const ta = textareaRef.current;
    if (overlay && ta) {
      overlay.scrollTop = ta.scrollTop;
    }
  }, []);

  return (
    <div className="relative h-full overflow-hidden bg-yk-bg-page font-jbmono">
      {/* Editable textarea (transparent, same dimensions as overlay) */}
      <textarea
        ref={textareaRef}
        value={source}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleTextareaScroll}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'absolute inset-0 h-full w-full resize-none',
          'bg-transparent font-jbmono text-[13px] leading-[1.55]',
          'caret-[color:var(--yk-primary)]',
          // Transparent text — highlighting is done by the overlay beneath
          'text-transparent',
          'pl-[58px] pr-6 pt-4 pb-20',
          'focus:outline-none',
          'z-10',
        )}
        style={{ color: 'transparent', caretColor: 'var(--yk-primary)' }}
      />

      {/* Read-only highlighted overlay (pointer-events: none) */}
      <div
        ref={containerRef}
        onScroll={handleOverlayScroll}
        className="absolute inset-0 h-full w-full overflow-auto px-0 pb-20 pt-4"
        style={{ pointerEvents: 'none' }}
      >
        <div className="min-w-0 px-0">
          {lines.map((line, i) => {
            const lineNo = i + 1;
            const inFm =
              fmStart !== -1 && fmEnd !== -1 && lineNo > fmStart + 1 && lineNo < fmEnd + 1;
            const isActiveLine = activeLine != null && lineNo === activeLine;
            return (
              <RenderedLine
                key={lineNo}
                lineNo={lineNo}
                line={line}
                inFm={inFm}
                isActive={isActiveLine}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
