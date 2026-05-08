// UI-014a — Footer status bar (28px).
// UI-014e — Pastille has tooltip showing missing sections.
// UI-014h O12 — Bascule progression sur editState/parsedTemplate quand disponibles.

import { useMemo } from 'react';
import {
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  selectRequiredTotal,
  useSpddEditorStore,
} from '@/stores/spdd';
import { genericProgress } from '@/lib/sectionStatus';
import { cn } from '@/lib/utils';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

export interface SpddFooterProps {
  /** UI-014h O12: quand fournis, le footer affiche la progression générique. */
  editState?: EditState | null;
  parsedTemplate?: ParsedTemplate | null;
  /** UI-014h O12: chemin du fichier en cours pour l'affichage à droite. */
  fileLabel?: string;
}

export function SpddFooter({
  editState,
  parsedTemplate,
  fileLabel,
}: SpddFooterProps = {}): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const state = useSpddEditorStore();

  const { completed, total, missing, allDone } = useMemo(() => {
    if (editState && parsedTemplate) {
      const p = genericProgress(editState, parsedTemplate);
      return {
        completed: p.completed,
        total: p.total,
        missing: p.missing,
        allDone: p.total > 0 && p.completed === p.total,
      };
    }
    // UI-014h — story path : compte les required dérivés du template story.md
    const tmpl = parsedTemplate ?? null;
    const c = selectRequiredCompleted(state, tmpl);
    const t = selectRequiredTotal(tmpl);
    return {
      completed: c,
      total: t,
      missing: selectMissingRequiredLabels(state, tmpl),
      allDone: t > 0 && c === t,
    };
  }, [editState, parsedTemplate, state]);

  const displayedFile =
    fileLabel ??
    (editState
      ? `${editState.fmValues.id ?? '?'}-${editState.fmValues.slug ?? '?'}.md`
      : `${draft.id}-${draft.slug}.md`);

  return (
    <footer
      aria-label="Status bar"
      className="flex h-7 shrink-0 items-center gap-4 border-t border-yk-line bg-yk-bg-1 px-4 font-jbmono text-[11px] text-yk-text-muted"
    >
      <span
        className="flex items-center gap-1.5"
        title={!allDone && missing.length > 0 ? `Manque : ${missing.join(', ')}` : undefined}
      >
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            allDone ? 'bg-yk-success' : 'bg-yk-warning',
          )}
        />
        <span className={allDone ? 'text-yk-success' : 'text-yk-warning'}>
          {completed}/{total} obligatoires
        </span>
      </span>

      {!allDone && missing.length > 0 && (
        <span className="font-inter text-yk-warning">
          manque : {missing.join(', ')}
        </span>
      )}

      <span className="flex-1" />

      <span className="hidden md:inline">⌘K palette</span>
      <span className="hidden md:inline">⌘/ markdown</span>
      <span className="hidden md:inline">⌘↑↓ section</span>

      <span className="flex-1 md:hidden" />

      <span>{displayedFile}</span>
      <span className="text-yk-text-faint">·</span>
      <span>UTF-8</span>
      <span className="text-yk-text-faint">·</span>
      <span>LF</span>
    </footer>
  );
}
