import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Save, X } from 'lucide-react';
import { ReadArtifact, WriteArtifact } from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { TemplatedEditor } from './TemplatedEditor';
import { parseTemplate, detectArtifactType, templateNameForType } from '@/lib/templateParser';
import { parseArtifactContent, serializeArtifact } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';
import type { EditState } from '@/lib/genericSerializer';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CodeBlock } from './CodeBlock';
import { CollapsibleSection } from './CollapsibleSection';

interface StoryViewerProps {
  className?: string;
}

interface Frontmatter {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
}

type DocumentKind = 'inbox' | 'canvas' | 'standard';

interface Section {
  heading: string; // text after '## '
  content: string;
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

function detectDocumentKind(meta: Frontmatter, body: string): DocumentKind {
  if (meta.scalars.id?.startsWith('INBOX-')) return 'inbox';
  if (body.includes('## R —')) return 'canvas';
  return 'standard';
}

function sectionStorageKey(path: string): string {
  return `yukki:sections:${path}`;
}

function countOperations(body: string): number {
  return (body.match(/^### O/gm) ?? []).length;
}

/**
 * Reconstruct the full file content from the original raw content and the
 * edited body. The frontmatter block (--- … ---) is kept intact; only the
 * body portion is replaced.
 */
function buildFullContent(originalRaw: string, editedBody: string): string {
  const match = originalRaw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
  if (!match) return editedBody; // no frontmatter — body is the whole file
  return match[1] + editedBody;
}

function splitIntoSections(body: string): { intro: string; sections: Section[] } {
  const lines = body.split('\n');
  const sections: Section[] = [];
  let intro = '';
  let currentHeading: string | null = null;
  const currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading !== null) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentContent.length = 0;
      } else {
        intro = currentContent.join('\n').trim();
        currentContent.length = 0;
      }
      currentHeading = line.slice(3).trim();
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading !== null) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  } else if (currentContent.length > 0) {
    intro = currentContent.join('\n').trim();
  }

  return { intro, sections };
}

// ---------------------------------------------------------------------------
// Markdown components
// ---------------------------------------------------------------------------

const mdComponents = {
  code({ className, children }: { className?: string; children?: ReactNode }) {
    const lang = className?.replace(/^language-/, '');
    if (lang) {
      return (
        <CodeBlock language={lang}>{String(children ?? '').replace(/\n$/, '')}</CodeBlock>
      );
    }
    return (
      <code className={cn('bg-muted px-1 py-0.5 rounded text-sm font-mono', className)}>
        {children}
      </code>
    );
  },
};

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
  const { toast } = useToast();

  // Content state
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Edit mode state
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [dirtyContent, setDirtyContent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // UI-015 — Templated editor state
  const [parsedTemplate, setParsedTemplate] = useState<ParsedTemplate | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const parsedTemplateRef = useRef<ParsedTemplate | null>(null);
  parsedTemplateRef.current = parsedTemplate;
  const editStateRef = useRef<EditState | null>(null);
  editStateRef.current = editState;

  // Dirty navigation guard
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [dirtyDialogOpen, setDirtyDialogOpen] = useState(false);

  // Refs to read current values in effects without stale closures
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isDirtyRef = useRef(false);
  isDirtyRef.current = mode === 'edit' && dirtyContent !== originalContent;
  const dirtyContentRef = useRef(dirtyContent);
  dirtyContentRef.current = dirtyContent;
  const pathRef = useRef(path);
  pathRef.current = path;
  const originalContentRef = useRef(originalContent);
  originalContentRef.current = originalContent;
  const contentRef = useRef(content);
  contentRef.current = content;

  // -------------------------------------------------------------------------
  // Load content
  // -------------------------------------------------------------------------

  const doLoad = (p: string) => {
    setMode('read');
    setLoading(true);
    setError('');
    ReadArtifact(p)
      .then((data) => setContent(data))
      .catch((e) => {
        setError(String(e));
        setContent('');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!path) {
      setContent('');
      setError('');
      return;
    }
    if (isDirtyRef.current) {
      setPendingPath(path);
      setDirtyDialogOpen(true);
      return;
    }
    doLoad(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    const p = pathRef.current;
    if (!p) return;
    setSaving(true);
    try {
      let fullContent: string;
      const tmpl = parsedTemplateRef.current;
      const es = editStateRef.current;
      if (tmpl !== null && es !== null) {
        // UI-015: structured editor path
        fullContent = serializeArtifact(es, tmpl);
      } else {
        // Fallback: raw textarea path
        fullContent = buildFullContent(contentRef.current, dirtyContentRef.current);
      }
      await WriteArtifact(p, fullContent);
      const data = await ReadArtifact(p);
      setContent(data);
      setParsedTemplate(null);
      setEditState(null);
      setMode('read');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: "Erreur d'enregistrement",
        description: String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Enter / leave edit mode
  // -------------------------------------------------------------------------

  const enterEditMode = () => {
    setOriginalContent(body);
    setDirtyContent(body);
    setParsedTemplate(null);
    setEditState(null);
    setMode('edit');

    // UI-015: try to load the template for this artifact type
    const currentContent = contentRef.current;
    const currentMeta = splitFrontmatter(currentContent).meta;
    const artifactId = currentMeta.scalars.id ?? '';
    const artifactType = detectArtifactType(artifactId);
    const templateName = templateNameForType(artifactType);

    if (templateName) {
      setTemplateLoading(true);
      ReadArtifact(`.yukki/templates/${templateName}.md`)
        .then((templateRaw) => {
          const tmpl = parseTemplate(templateRaw);
          const es = parseArtifactContent(currentContent, tmpl);
          setParsedTemplate(tmpl);
          setEditState(es);
        })
        .catch(() => {
          // Template not found — fallback to raw textarea (state stays null)
        })
        .finally(() => setTemplateLoading(false));
    }
  };

  const handleCancel = () => {
    const isDirty = parsedTemplateRef.current !== null
      ? JSON.stringify(editStateRef.current) !== JSON.stringify(parseArtifactContent(contentRef.current, parsedTemplateRef.current))
      : dirtyContentRef.current !== originalContentRef.current;

    if (isDirty) {
      setPendingPath(null);
      setDirtyDialogOpen(true);
    } else {
      setParsedTemplate(null);
      setEditState(null);
      setMode('read');
    }
  };

  // -------------------------------------------------------------------------
  // Dirty dialog actions
  // -------------------------------------------------------------------------

  const onDirtySave = async () => {
    setDirtyDialogOpen(false);
    await handleSave();
    if (pendingPath) {
      doLoad(pendingPath);
      setPendingPath(null);
    }
  };

  const onDirtyDiscard = () => {
    setDirtyDialogOpen(false);
    setMode('read');
    if (pendingPath) {
      doLoad(pendingPath);
      setPendingPath(null);
    }
  };

  const onDirtyCancel = () => {
    setDirtyDialogOpen(false);
    setPendingPath(null);
  };

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && modeRef.current === 'read' && pathRef.current) {
        e.preventDefault();
        enterEditMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== 'edit') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Derived display data
  // -------------------------------------------------------------------------

  const { meta, body } = useMemo(() => splitFrontmatter(content), [content]);
  const kind = useMemo(() => detectDocumentKind(meta, body), [meta, body]);
  const { intro, sections } = useMemo(() => splitIntoSections(body), [body]);
  const opsCount = useMemo(() => (kind === 'canvas' ? countOperations(body) : 0), [kind, body]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <section
      className={cn('flex-1 overflow-y-auto bg-background relative', className)}
      aria-label="Artefact viewer"
    >
      {/* Toolbar */}
      {path && !loading && !error && content && (
        <div className="absolute top-2 right-4 z-10 flex gap-1">
          {mode === 'read' ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={enterEditMode}
              aria-label="Éditer l'artefact"
              title="Éditer (E)"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleSave()}
                disabled={saving}
                aria-label="Enregistrer"
                title="Enregistrer (Ctrl+S)"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Annuler"
                title="Annuler (Escape)"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
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

      {/* Edit mode */}
      {!loading && !error && content && mode === 'edit' && (
        templateLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Chargement du template…</p>
        ) : parsedTemplate !== null && editState !== null ? (
          <TemplatedEditor
            editState={editState}
            template={parsedTemplate}
            onChange={setEditState}
          />
        ) : (
          <>
            {/* Fallback: raw textarea + notice */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-2 text-[12px] text-muted-foreground">
              Template inconnu — édition en mode brut
            </div>
            <textarea
              className="w-full h-full min-h-[calc(100vh-6rem)] font-mono text-sm bg-background p-6 resize-none focus:outline-none"
              value={dirtyContent}
              onChange={(e) => setDirtyContent(e.target.value)}
              aria-label="Éditeur d'artefact"
              spellCheck={false}
            />
          </>
        )
      )}

      {/* Read mode */}
      {!loading && !error && content && mode === 'read' && (
        <>
          <FrontmatterHeader meta={meta} title={meta.scalars.title} />
          <article className="prose prose-sm dark:prose-invert max-w-none px-6 pb-6 pt-4">
            {intro && (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {intro}
              </ReactMarkdown>
            )}
            {sections.map((section) => {
              if (kind === 'inbox') {
                return (
                  <Fragment key={section.heading}>
                    <h2>{section.heading}</h2>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {section.content}
                    </ReactMarkdown>
                  </Fragment>
                );
              }
              const isOpsSection =
                section.heading.startsWith('O —') || section.heading.startsWith('O\u00a0—');
              const defaultOpen =
                kind === 'canvas' && isOpsSection && opsCount > 3 ? false : true;
              return (
                <CollapsibleSection
                  key={section.heading}
                  title={section.heading}
                  defaultOpen={defaultOpen}
                  storageKey={sectionStorageKey(path)}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {section.content}
                  </ReactMarkdown>
                </CollapsibleSection>
              );
            })}
          </article>
        </>
      )}

      {/* Dirty navigation / cancel dialog */}
      <Dialog
        open={dirtyDialogOpen}
        onOpenChange={(o) => {
          if (!o) onDirtyCancel();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifications non enregistrées</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous avez des modifications non enregistrées. Que souhaitez-vous faire ?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onDirtyCancel}>
              Annuler
            </Button>
            <Button variant="ghost" onClick={onDirtyDiscard}>
              Ignorer
            </Button>
            <Button onClick={() => void onDirtySave()} disabled={saving}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
