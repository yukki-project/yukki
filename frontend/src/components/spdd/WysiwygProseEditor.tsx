// UI-014i O3 + O4 + O7 — Composant unifié de rendu/édition des sections
// prose markdown. Drop-in remplaçant de `GenericProseTextarea`.
//
// Modes :
//   - readOnly=true : `react-markdown` + `mdComponents` partagés → rendu HTML
//     stylé (zero deps Tiptap chargées en read-only)
//   - readOnly=false :
//       * editMode='wysiwyg' (défaut) : Tiptap + tiptap-markdown serializer +
//         MarkdownToolbar. Round-trip markdown via le serializer Markdown.
//       * editMode='source' : fallback `GenericProseTextarea` (textarea brut)
//
// Round-trip (Safeguard canvas) : on ne ré-émet `onChange` que si le
// markdown sérialisé diffère de la `value` reçue, pour éviter les
// divergences cosmétiques d'AST que Tiptap pourrait introduire.

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { mdComponents } from '@/lib/markdownComponents';
import { useSpddSuggest } from '@/hooks/useSpddSuggest';
import {
  GenericAiPopoverPanel,
  MIN_SELECTION_WORDS,
  countWords,
  type PopoverPos,
  type SelectionInfo,
} from './GenericProseTextarea';
import type { AiActionType } from './aiActions';

// tiptap-markdown installe une storage `markdown` non typée dans Tiptap.
// Helper pour la lire sans `as any` au niveau des call sites.
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as unknown as Record<
    string,
    { getMarkdown?: () => string } | undefined
  >;
  return storage.markdown?.getMarkdown?.() ?? '';
}
import { GenericProseTextarea } from './GenericProseTextarea';
import { MarkdownToolbar } from './MarkdownToolbar';
import { cn } from '@/lib/utils';

export type EditMode = 'wysiwyg' | 'source';

export interface WysiwygProseEditorProps {
  /** Markdown source de la section. */
  value: string;
  /** Émis sur chaque modification. */
  onChange: (nextMarkdown: string) => void;
  /** Lecture seule : pas d'édition, juste le rendu. */
  readOnly?: boolean;
  /** Heading humain de la section, propagé à useSpddSuggest (UI-014h O10). */
  sectionHeading?: string;
  /** Type d'artefact (inbox/epic/...), propagé au prompt LLM. */
  artifactType?: string;
}

export function WysiwygProseEditor({
  value,
  onChange,
  readOnly,
  sectionHeading,
  artifactType,
}: WysiwygProseEditorProps): JSX.Element {
  if (readOnly) {
    if (value.trim() === '') {
      return (
        <p className="text-[14px] italic leading-[1.62] text-yk-text-faint">
          (section vide)
        </p>
      );
    }
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {value}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <EditableSurface
      value={value}
      onChange={onChange}
      sectionHeading={sectionHeading}
      artifactType={artifactType}
    />
  );
}

// ─── Editable surface ────────────────────────────────────────────────

interface EditableSurfaceProps {
  value: string;
  onChange: (md: string) => void;
  sectionHeading?: string;
  artifactType?: string;
}

function EditableSurface({
  value,
  onChange,
  sectionHeading,
  artifactType,
}: EditableSurfaceProps): JSX.Element {
  const [editMode, setEditMode] = useState<EditMode>('wysiwyg');

  if (editMode === 'source') {
    return (
      <div>
        <SourceToggle
          editMode={editMode}
          onChange={(m) => setEditMode(m)}
        />
        <GenericProseTextarea
          value={value}
          onChange={onChange}
          sectionHeading={sectionHeading}
          artifactType={artifactType}
        />
      </div>
    );
  }

  return (
    <WysiwygSurface
      value={value}
      onChange={onChange}
      onToggleSource={() => setEditMode('source')}
      sectionHeading={sectionHeading}
      artifactType={artifactType}
    />
  );
}

interface WysiwygSurfaceProps {
  value: string;
  onChange: (md: string) => void;
  onToggleSource: () => void;
  sectionHeading?: string;
  artifactType?: string;
}

function WysiwygSurface({
  value,
  onChange,
  onToggleSource,
  sectionHeading,
  artifactType,
}: WysiwygSurfaceProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
        transformPastedText: true,
      }),
    ],
    content: value,
    immediatelyRender: false,
  });

  // Sync external value changes into the editor (e.g. when user toggles
  // back from source mode with modifications).
  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // ─── AI popover (UI-014h O10 — Safeguard non court-circuité) ────────
  // En mode WYSIWYG Tiptap, on lit la sélection via les coordonnées
  // ProseMirror (`editor.state.selection.from/to`) plutôt que via les
  // offsets caractères de la `value` markdown — l'éditeur travaille sur
  // l'AST, pas sur la source. Sur Accepter, on remplace la *range
  // ProseMirror* via deleteRange + insertContent, puis l'effet onUpdate
  // sérialise le tout en markdown via getMarkdown().
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [activeAction, setActiveAction] = useState<AiActionType | null>(null);
  const suggest = useSpddSuggest();

  const aiEnabled = !!sectionHeading;

  const handleEditorMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!aiEnabled || !editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelection(null);
        setPopoverPos(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, ' ');
      if (countWords(text) < MIN_SELECTION_WORDS) {
        setSelection(null);
        setPopoverPos(null);
        return;
      }
      setSelection({ start: from, end: to, text });
      setPopoverPos({ x: e.clientX, y: e.clientY });
    },
    [aiEnabled, editor],
  );

  const closePopover = useCallback(() => {
    setSelection(null);
    setPopoverPos(null);
    setActiveAction(null);
    suggest.reset();
  }, [suggest]);

  const fireAction = useCallback(
    (action: AiActionType) => {
      if (!selection || !sectionHeading) return;
      setActiveAction(action);
      const heading = artifactType
        ? `${sectionHeading} (${artifactType})`
        : sectionHeading;
      void suggest.start({
        section: heading,
        action,
        selectedText: selection.text,
      });
    },
    [selection, sectionHeading, artifactType, suggest],
  );

  const acceptSuggestion = useCallback(() => {
    if (!selection || !suggest.streamText || !editor) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: selection.start, to: selection.end })
      .insertContent(suggest.streamText)
      .run();
    // L'onUpdate de Tiptap déclenchera la resérialisation, mais on flush
    // explicitement pour rester aligné sur le pattern handleBlur.
    const md = getMarkdown(editor);
    if (md !== value) onChange(md);
    closePopover();
  }, [selection, suggest.streamText, editor, value, onChange, closePopover]);

  // Emit markdown source on update (debounced via blur, not on every keystroke).
  const handleBlur = useCallback(() => {
    if (!editor) return;
    const md = getMarkdown(editor);
    // Anti-divergence cosmétique : ne réémettre que si le markdown a
    // effectivement changé (Safeguard canvas).
    if (md !== value) onChange(md);
  }, [editor, onChange, value]);

  if (!editor) {
    return (
      <p className="text-[13px] italic text-yk-text-faint">
        (chargement de l'éditeur…)
      </p>
    );
  }

  return (
    <>
    <div className="rounded-yk border border-yk-line bg-yk-bg-1 focus-within:border-yk-primary">
      <div className="flex items-center gap-1 border-b border-yk-line-subtle bg-yk-bg-2 px-2 py-1">
        <MarkdownToolbar editor={editor} />
        <span className="flex-1" />
        <SourceToggle
          editMode="wysiwyg"
          onChange={(m) => {
            if (m === 'source') {
              // Flush avant de basculer pour ne pas perdre les modifs récentes.
              const md = getMarkdown(editor);
              if (md !== value) onChange(md);
              onToggleSource();
            }
          }}
        />
      </div>
      <EditorContent
        editor={editor}
        onBlur={handleBlur}
        onMouseUp={aiEnabled ? handleEditorMouseUp : undefined}
        className={cn(
          'prose prose-sm max-w-none px-3 py-2',
          // Tiptap injecte un .ProseMirror — applique nos styles markdown via
          // mdComponents-equivalent classes Tailwind sur les enfants.
          '[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:text-[14px] [&_.ProseMirror]:leading-[1.62]',
          '[&_.ProseMirror]:text-yk-text-primary',
          '[&_.ProseMirror_strong]:font-semibold',
          '[&_.ProseMirror_em]:italic',
          '[&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:text-[17px] [&_.ProseMirror_h2]:font-semibold',
          '[&_.ProseMirror_h3]:mb-1.5 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-[15px] [&_.ProseMirror_h3]:font-semibold',
          '[&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc',
          '[&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal',
          '[&_.ProseMirror_code]:rounded-yk-sm [&_.ProseMirror_code]:bg-[color:var(--yk-primary-soft)] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-jbmono [&_.ProseMirror_code]:text-[0.88em] [&_.ProseMirror_code]:text-violet-300/90',
          '[&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:bg-yk-bg-3 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-[12.5px]',
          '[&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-yk-line [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-yk-text-muted',
          '[&_.ProseMirror_a]:text-yk-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:decoration-dotted',
        )}
      />
    </div>
    {selection && popoverPos && (
      <GenericAiPopoverPanel
        pos={popoverPos}
        heading={sectionHeading ?? ''}
        activeAction={activeAction}
        state={suggest.state}
        streamText={suggest.streamText}
        error={suggest.error}
        onAction={fireAction}
        onAccept={acceptSuggestion}
        onCancel={closePopover}
      />
    )}
    </>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────

function SourceToggle({
  editMode,
  onChange,
}: {
  editMode: EditMode;
  onChange: (m: EditMode) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(editMode === 'wysiwyg' ? 'source' : 'wysiwyg')}
      className={cn(
        'rounded-yk-sm border border-yk-line px-2 py-0.5',
        'font-jbmono text-[10.5px] uppercase tracking-wider',
        'text-yk-text-muted hover:bg-yk-bg-3 hover:text-yk-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]',
      )}
      title={editMode === 'wysiwyg' ? 'Basculer en édition markdown source' : 'Revenir en édition WYSIWYG'}
    >
      {editMode === 'wysiwyg' ? 'Source' : 'WYSIWYG'}
    </button>
  );
}

