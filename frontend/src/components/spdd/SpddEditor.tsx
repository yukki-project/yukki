// UI-014a — Root SPDD editor component. Composes the header, the
// 3-column body (TOC / document / inspector) and the footer status bar.
// All real editing arrives in UI-014b…f; this component renders a mocked
// FRONT-002 story to validate layout, navigation and design tokens.

import { useEffect, useRef } from 'react';
import { SpddHeader } from './SpddHeader';
import { SpddFooter } from './SpddFooter';
import { SpddTOC } from './SpddTOC';
import { SpddDocument } from './SpddDocument';
import { SpddInspector } from './SpddInspector';
import { useSpddEditorStore } from '@/stores/spdd';
import type { SectionKey } from './types';

export function SpddEditor(): JSX.Element {
  const setActiveSection = useSpddEditorStore((s) => s.setActiveSection);

  // Debounce IntersectionObserver-driven activeSection updates so they don't
  // jitter while a smooth-scroll is still resolving.
  const scrollDebounceRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const handleTocClick = (key: SectionKey) => {
    isProgrammaticScrollRef.current = true;
    setActiveSection(key);
    const el = document.getElementById(`spdd-section-${key}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Release the lock after a smooth-scroll typically settles (~500ms).
    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
  };

  const handleScrollSection = (key: SectionKey) => {
    if (isProgrammaticScrollRef.current) return;
    if (scrollDebounceRef.current) {
      window.clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = window.setTimeout(() => {
      setActiveSection(key);
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        window.clearTimeout(scrollDebounceRef.current);
      }
    };
  }, []);

  return (
    <div
      className="yk grid h-full min-h-0 grid-rows-[40px_1fr_28px] bg-yk-bg-page font-inter text-yk-text-primary"
      data-testid="spdd-editor"
    >
      <SpddHeader />
      <div className="grid min-h-0 grid-cols-[240px_1fr_360px] overflow-hidden">
        <aside
          aria-label="Sommaire"
          className="overflow-y-auto border-r border-yk-line bg-yk-bg-1"
        >
          <SpddTOC onSectionClick={handleTocClick} />
        </aside>
        <SpddDocument onActiveSectionFromScroll={handleScrollSection} />
        <aside
          aria-label="Inspector"
          className="overflow-y-auto border-l border-yk-line bg-yk-bg-1"
        >
          <SpddInspector />
        </aside>
      </div>
      <SpddFooter />
    </div>
  );
}
