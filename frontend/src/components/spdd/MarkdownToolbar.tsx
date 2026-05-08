// UI-014i O4 — Toolbar markdown au-dessus de l'éditeur Tiptap.
//
// Boutons : Bold, Italic, H2, H3, BulletList, OrderedList, Code (inline),
// CodeBlock, Link. Les commands Tiptap appliquent les marks/blocs ;
// `tiptap-markdown` les sérialise en markdown propre (** , _ , # , - ,
// ` , ``` ) lors de l'export.

import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Code2,
  Link as LinkIcon,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

export interface MarkdownToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  Icon: typeof Bold;
}

function ToolbarButton({ active, onClick, title, Icon }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-yk-sm',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[color:var(--yk-primary-ring)]',
        active
          ? 'bg-[color:var(--yk-primary-soft)] text-yk-primary'
          : 'text-yk-text-muted hover:bg-yk-bg-3 hover:text-yk-text-secondary',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function Separator(): JSX.Element {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-yk-line" />;
}

export function MarkdownToolbar({ editor }: MarkdownToolbarProps): JSX.Element {
  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Gras (Ctrl+B)"
        Icon={Bold}
      />
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italique (Ctrl+I)"
        Icon={Italic}
      />
      <Separator />
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Titre H2"
        Icon={Heading2}
      />
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Titre H3"
        Icon={Heading3}
      />
      <Separator />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Liste à puces"
        Icon={List}
      />
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Liste numérotée"
        Icon={ListOrdered}
      />
      <Separator />
      <ToolbarButton
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Code inline (`...`)"
        Icon={Code}
      />
      <ToolbarButton
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Bloc de code (```)"
        Icon={Code2}
      />
      <Separator />
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={() => {
          // Cas simple : si déjà un lien, le retirer. Sinon, prompt l'URL.
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt('URL du lien :');
          if (url && url.trim() !== '') {
            editor.chain().focus().setLink({ href: url.trim() }).run();
          }
        }}
        title="Lien"
        Icon={LinkIcon}
      />
    </div>
  );
}
