import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReadArtifact } from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';

interface StoryViewerProps {
  className?: string;
}

export function StoryViewer({ className }: StoryViewerProps) {
  const path = useArtifactsStore((s) => s.selectedPath);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!path) {
      setContent('');
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    ReadArtifact(path)
      .then((data) => setContent(data))
      .catch((e) => {
        setError(String(e));
        setContent('');
      })
      .finally(() => setLoading(false));
  }, [path]);

  return (
    <section
      className={cn('flex-1 overflow-y-auto bg-background', className)}
      aria-label="Artefact viewer"
    >
      {!path && (
        <p className="p-6 text-sm text-muted-foreground">
          Select an artefact in the list to preview it here.
        </p>
      )}
      {loading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <div className="m-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {!loading && !error && content && (
        <article className="prose prose-sm dark:prose-invert max-w-none p-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            disallowedElements={['script', 'iframe', 'object', 'embed']}
            unwrapDisallowed
          >
            {content}
          </ReactMarkdown>
        </article>
      )}
    </section>
  );
}
