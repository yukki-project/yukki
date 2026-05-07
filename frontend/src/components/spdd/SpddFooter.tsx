// UI-014a — Footer status bar (28px).
// UI-014e — Pastille has tooltip showing missing sections.

import { useMemo } from 'react';
import {
  selectMissingRequiredLabels,
  selectRequiredCompleted,
  useSpddEditorStore,
} from '@/stores/spdd';
import { REQUIRED_COUNT } from './sections';
import { cn } from '@/lib/utils';

export function SpddFooter(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const state = useSpddEditorStore();
  const { completed, missing, allDone } = useMemo(() => {
    const c = selectRequiredCompleted(state);
    return {
      completed: c,
      missing: selectMissingRequiredLabels(state),
      allDone: c === REQUIRED_COUNT,
    };
  }, [state]);

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
          {completed}/{REQUIRED_COUNT} obligatoires
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

      <span>
        {draft.id}-{draft.slug}.md
      </span>
      <span className="text-yk-text-faint">·</span>
      <span>UTF-8</span>
      <span className="text-yk-text-faint">·</span>
      <span>LF</span>
    </footer>
  );
}
