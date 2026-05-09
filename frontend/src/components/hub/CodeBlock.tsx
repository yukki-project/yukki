import { useEffect, useState } from 'react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('shiki')
      .then(({ codeToHtml }) =>
        codeToHtml(children, {
          lang: language ?? 'text',
          theme: 'github-dark',
        }),
      )
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html);
      })
      .catch(() => {
        // keep fallback — silent degradation
      });
    return () => {
      cancelled = true;
    };
  }, [children, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group my-2">
      {highlightedHtml ? (
        <div
          // shiki output is trusted — generated locally by the highlighter, not from network
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="overflow-x-auto rounded-md bg-ykp-bg-subtle p-4 text-sm">
          <code>{children}</code>
        </pre>
      )}
      <button
        aria-label="Copier le code"
        onClick={handleCopy}
        className="absolute top-2 right-2 rounded px-2 py-0.5 text-xs bg-ykp-bg-subtle/80 border border-ykp-line opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copié\u00a0!' : 'Copier'}
      </button>
    </div>
  );
}
