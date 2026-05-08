// UI-014i O1 — Mapping `react-markdown` partagé entre StoryViewer (workflow
// drawer) et WysiwygProseEditor (éditeur SPDD principal). Source unique de
// vérité pour le rendu HTML du markdown lu en read-only.
//
// `code` block multi-lignes → CodeBlock (shiki) ; `code` inline → <code>
// stylé. Headings, paragraphes, listes et liens reçoivent les tokens
// design `yk-*` pour cohérence visuelle.

import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { CodeBlock } from '@/components/hub/CodeBlock';
import { cn } from '@/lib/utils';

export const mdComponents: Components = {
  // ─── Code ────────────────────────────────────────────────────────────
  // - bloc multi-ligne (triple backticks) : délègue à CodeBlock (shiki)
  // - inline (single backtick) : <code> stylé compact
  code({ className, children }: { className?: string; children?: ReactNode }) {
    const lang = className?.replace(/^language-/, '');
    if (lang) {
      return (
        <CodeBlock language={lang}>
          {String(children ?? '').replace(/\n$/, '')}
        </CodeBlock>
      );
    }
    return (
      <code
        className={cn(
          'rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]',
          className,
        )}
      >
        {children}
      </code>
    );
  },

  // ─── Headings ────────────────────────────────────────────────────────
  // H1 du fichier markdown : généralement déjà géré par le serializer
  // (titre de l'artefact). Style discret pour ne pas concurrencer.
  h1({ children, ...props }) {
    return (
      <h1
        {...props}
        className="mb-3 mt-4 text-[20px] font-semibold leading-tight text-yk-text-primary"
      >
        {children}
      </h1>
    );
  },
  h2({ children, ...props }) {
    return (
      <h2
        {...props}
        className="mb-2 mt-4 text-[17px] font-semibold leading-tight text-yk-text-primary"
      >
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    return (
      <h3
        {...props}
        className="mb-1.5 mt-3 text-[15px] font-semibold text-yk-text-primary"
      >
        {children}
      </h3>
    );
  },
  h4({ children, ...props }) {
    return (
      <h4
        {...props}
        className="mb-1 mt-2 text-[13.5px] font-semibold text-yk-text-secondary"
      >
        {children}
      </h4>
    );
  },

  // ─── Prose ────────────────────────────────────────────────────────────
  p({ children, ...props }) {
    return (
      <p
        {...props}
        className="mb-2 text-[14px] leading-[1.62] text-yk-text-primary"
      >
        {children}
      </p>
    );
  },

  // ─── Listes ──────────────────────────────────────────────────────────
  ul({ children, ...props }) {
    return (
      <ul
        {...props}
        className="mb-2 ml-5 list-disc text-[14px] leading-[1.62] text-yk-text-primary marker:text-yk-text-muted"
      >
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol
        {...props}
        className="mb-2 ml-5 list-decimal text-[14px] leading-[1.62] text-yk-text-primary marker:text-yk-text-muted"
      >
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return (
      <li {...props} className="mb-0.5">
        {children}
      </li>
    );
  },

  // ─── Liens ────────────────────────────────────────────────────────────
  // target=_blank par défaut + rel sécurisé. Les liens internes (relatifs)
  // restent rendus tels quels — le routing interne sera géré par un futur
  // wrapper si besoin.
  a({ children, href, ...props }) {
    const isExternal = href ? /^https?:\/\//.test(href) : false;
    return (
      <a
        {...props}
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-yk-primary underline decoration-dotted underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]"
      >
        {children}
      </a>
    );
  },

  // ─── Blockquote ──────────────────────────────────────────────────────
  blockquote({ children, ...props }) {
    return (
      <blockquote
        {...props}
        className="my-2 border-l-2 border-yk-line pl-3 text-[13.5px] italic text-yk-text-muted"
      >
        {children}
      </blockquote>
    );
  },

  // ─── Pre (rare en markdown via remark, mais safe-guard) ──────────────
  pre({ children, ...props }) {
    return (
      <pre {...props} className="my-2 overflow-x-auto rounded bg-muted p-3 text-[12.5px]">
        {children}
      </pre>
    );
  },
};
