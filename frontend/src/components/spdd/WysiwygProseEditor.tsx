// UI-014i O3 — Composant unifié de rendu/édition des sections prose
// markdown. Drop-in remplaçant de `GenericProseTextarea` avec API
// identique (value/onChange/readOnly/sectionHeading/artifactType).
//
// Cette version livre la phase **rendu read-only** (axe Paths SPIDR de
// l'analyse) :
//   - readOnly=true : `react-markdown` + `mdComponents` partagés →
//     rendu HTML stylé (gras, titres, listes, code, liens)
//   - readOnly=false : délègue à `GenericProseTextarea` (textarea brut
//     existant) en attendant l'éditeur WYSIWYG Tiptap (O3 plein, O4,
//     O7, O8 — reportés tant que l'Open Question "Tiptap vs Lexical"
//     n'est pas tranchée par revue humaine via spike POC)
//
// La toggle WYSIWYG/Markdown sera ajoutée avec l'éditeur Tiptap. Pour
// l'instant, le mode édition reste markdown-source pour l'utilisateur.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdComponents } from '@/lib/markdownComponents';
import { GenericProseTextarea } from './GenericProseTextarea';

export interface WysiwygProseEditorProps {
  /** Markdown source de la section. */
  value: string;
  /** Émis sur chaque modification (texte brut ou WYSIWYG futur). */
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
    // Section vide → placeholder discret (au lieu d'un <p> vide).
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

  // Mode édition : pour l'instant, fallback markdown source via
  // GenericProseTextarea (préserve l'AI popover livré UI-014h O10).
  // L'éditeur WYSIWYG Tiptap sera intégré dans une livraison ultérieure
  // (O2/O4/O7/O8 du canvas UI-014i, en attente de la décision Tiptap).
  return (
    <GenericProseTextarea
      value={value}
      onChange={onChange}
      sectionHeading={sectionHeading}
      artifactType={artifactType}
    />
  );
}
