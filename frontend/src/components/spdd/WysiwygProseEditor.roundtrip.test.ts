// UI-014i O8 — Tests round-trip Tiptap ↔ markdown.
//
// Verrouille la promesse non-négociable du canvas Safeguards :
// "Round-trip markdown strict — non négociable : ce qui est lu doit
// pouvoir être ré-écrit identique."
//
// Stratégie : créer un Editor Tiptap headless avec les mêmes extensions
// que WysiwygSurface, charger un markdown source, lire `getMarkdown()`
// et comparer.
//
// Les divergences cosmétiques connues de tiptap-markdown (espaces,
// indentation de listes imbriquées, ordre des marks) sont tolérées
// via une normalisation EOL + trim. Le test échoue sur toute
// divergence sémantique (changement de contenu, de structure).

import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

function tiptapRoundtrip(markdown: string): string {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({}),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
        transformPastedText: false,
      }),
    ],
    content: markdown,
  });
  const storage = editor.storage as unknown as Record<
    string,
    { getMarkdown?: () => string } | undefined
  >;
  const out = storage.markdown?.getMarkdown?.() ?? '';
  editor.destroy();
  return out;
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').trim();
}

describe('WysiwygProseEditor — round-trip markdown', () => {
  it('préserve le gras et l\'italique', () => {
    // tiptap-markdown normalise `_italic_` → `*italic*` ; les deux sont
    // valides en CommonMark/GFM. On adopte la convention de sortie de
    // tiptap-markdown comme référence.
    const md = 'Une phrase avec **gras** et *italique*.';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('préserve les titres H2 et H3', () => {
    const md = '## Section\n\nContenu.\n\n### Sous-section\n\nAutre.';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('préserve les listes à puces simples', () => {
    const md = '- Item un\n- Item deux\n- Item trois';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('préserve le code inline', () => {
    const md = 'Voir `WysiwygProseEditor` dans le module.';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('préserve les blocs de code avec language', () => {
    const md = '```ts\nconst x = 1;\n```';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('préserve les liens', () => {
    const md = 'Lien vers [Yukki](https://github.com/yukki-project/yukki).';
    expect(normalize(tiptapRoundtrip(md))).toBe(normalize(md));
  });

  it('rend le markdown malformé sans crash (best-effort)', () => {
    const md = 'Texte avec **gras non fermé.';
    // On ne garantit pas l'égalité — juste qu'il ne crash pas et
    // qu'il préserve le contenu textuel.
    const out = tiptapRoundtrip(md);
    expect(out).toContain('gras');
    expect(out).toContain('non fermé');
  });

  it('section vide reste vide après round-trip', () => {
    expect(normalize(tiptapRoundtrip(''))).toBe('');
  });
});
