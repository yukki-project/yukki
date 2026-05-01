import { Fragment, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReadArtifact } from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';

interface StoryViewerProps {
  className?: string;
}

interface Frontmatter {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  accepted: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  implemented: 'bg-green-500/15 text-green-700 dark:text-green-300',
  synced: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'in-progress': 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
};

const SCALAR_ORDER = ['id', 'slug', 'status', 'updated', 'created', 'owner'];

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

  const { meta, body } = useMemo(() => splitFrontmatter(content), [content]);

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
        <>
          <FrontmatterHeader meta={meta} title={meta.scalars.title} />
          <article className="prose prose-sm dark:prose-invert max-w-none px-6 pb-6 pt-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={['script', 'iframe', 'object', 'embed']}
              unwrapDisallowed
            >
              {body}
            </ReactMarkdown>
          </article>
        </>
      )}
    </section>
  );
}

function FrontmatterHeader({ meta, title }: { meta: Frontmatter; title?: string }) {
  const scalars = meta.scalars;
  const lists = meta.lists;
  const hasContent =
    Object.keys(scalars).length > 0 || Object.keys(lists).length > 0 || !!title;

  if (!hasContent) return null;

  const orderedScalars = SCALAR_ORDER.filter((k) => scalars[k]);
  const otherScalars = Object.keys(scalars)
    .filter((k) => k !== 'title' && !SCALAR_ORDER.includes(k))
    .sort();

  return (
    <header className="border-b bg-muted/20 px-6 py-4 space-y-3">
      {title && <h1 className="text-xl font-semibold leading-tight">{title}</h1>}
      {(orderedScalars.length > 0 || otherScalars.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {orderedScalars.map((k) => renderScalarPill(k, scalars[k]))}
          {otherScalars.map((k) => renderScalarPill(k, scalars[k]))}
        </div>
      )}
      {Object.keys(lists).length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
          {Object.entries(lists).map(([key, values]) => (
            <Fragment key={key}>
              <dt className="text-muted-foreground capitalize">{key.replace(/-/g, ' ')}</dt>
              <dd className="flex flex-wrap gap-1">
                {values.map((v) => (
                  <span
                    key={v}
                    className="inline-block rounded bg-secondary px-2 py-0.5 font-mono"
                  >
                    {v}
                  </span>
                ))}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </header>
  );
}

function renderScalarPill(key: string, value: string) {
  if (key === 'status') {
    return (
      <span
        key={key}
        className={cn(
          'inline-block rounded-md px-2 py-0.5 text-xs font-medium',
          STATUS_BADGE[value] ?? 'bg-muted text-muted-foreground',
        )}
      >
        {value}
      </span>
    );
  }
  return (
    <span
      key={key}
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
    >
      <span className="text-muted-foreground">{key}:</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function splitFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  if (!raw) return { meta: { scalars: {}, lists: {} }, body: '' };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: { scalars: {}, lists: {} }, body: raw };
  const [, frontmatterRaw, body] = match;
  return { meta: parseSimpleYaml(frontmatterRaw), body };
}

function parseSimpleYaml(text: string): Frontmatter {
  const scalars: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  const lines = text.split(/\r?\n/);
  let currentList: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const listItem = line.match(/^\s+-\s+(.+?)\s*$/);
    if (listItem && currentList) {
      lists[currentList].push(stripQuotes(listItem[1]));
      continue;
    }
    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!kv) {
      currentList = null;
      continue;
    }
    const [, key, rawValue] = kv;
    if (rawValue === '') {
      currentList = key;
      lists[key] = lists[key] ?? [];
    } else {
      currentList = null;
      scalars[key] = stripQuotes(rawValue);
    }
  }
  return { scalars, lists };
}

function stripQuotes(v: string): string {
  const trimmed = v.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' || first === "'") && last === first) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}
