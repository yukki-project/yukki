// UI-015 O5 — Smoke tests sur PdfMarkdown.
//
// Le composant rend des primitives @react-pdf/renderer ; on ne peut pas
// l'inspecter avec testing-library/react (DOM) car ces primitives ne
// produisent pas de HTML standard. On vérifie ici que :
//   - le composant rend SANS crasher pour chaque type de nœud GFM
//     courant (assertion : le tree est non-null) ;
//   - le H1 du markdown source est bien skipped (Q3-A) — on inspecte
//     le tree React via JSON pour confirmer l'absence d'un élément
//     H1-shaped.
//
// Les composants @react-pdf sont mockés en simples balises null pour
// éviter d'instancier le moteur PDF dans un environnement jsdom (qui
// ne supporte pas les fonts TTF de toute façon).

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@react-pdf/renderer', () => {
  // Chaque primitive devient une balise neutre qui propage ses props et
  // children — on peut alors inspecter la sortie HTML pour les
  // assertions de structure.
  const passthrough = (tag: string) =>
    function Stub({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) {
      return <tag-stub data-stub={tag} {...rest}>{children}</tag-stub>;
    };
  return {
    Font: { register: vi.fn() },
    StyleSheet: { create: (s: unknown) => s },
    Document: passthrough('Document'),
    Page: passthrough('Page'),
    View: passthrough('View'),
    Text: passthrough('Text'),
    Link: passthrough('Link'),
  };
});

import { PdfMarkdown } from './PdfMarkdown';

function render(markdown: string): string {
  return renderToStaticMarkup(<PdfMarkdown markdown={markdown} />);
}

describe('PdfMarkdown', () => {
  it('rend un paragraphe simple', () => {
    const out = render('Une phrase.');
    expect(out).toContain('Une phrase');
    expect(out).toContain('data-stub="Text"');
  });

  it('rend gras et italique', () => {
    const out = render('Du **gras** et de l\'*italique*.');
    expect(out).toContain('gras');
    expect(out).toContain('italique');
  });

  it('rend les titres H2 et H3 (mais skip H1)', () => {
    const out = render('# H1 source\n\n## Sous-titre\n\n### Détail\n\nfin.');
    // H1 source skipped (Q3-A)
    expect(out).not.toContain('H1 source');
    expect(out).toContain('Sous-titre');
    expect(out).toContain('Détail');
  });

  it('rend les listes à puces', () => {
    const out = render('- A\n- B\n- C');
    expect(out).toContain('A');
    expect(out).toContain('B');
    expect(out).toContain('C');
  });

  it('rend le code inline et les blocs de code', () => {
    const out = render('Voir `helper` dans \n\n```ts\nconst x = 1;\n```');
    expect(out).toContain('helper');
    expect(out).toContain('const x = 1;');
  });

  it('rend les liens GFM', () => {
    const out = render('Lien vers [yukki](https://github.com/yukki-project/yukki).');
    expect(out).toContain('yukki');
    expect(out).toContain('data-stub="Link"');
  });

  it('rend les tableaux GFM', () => {
    const out = render('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(out).toContain('A');
    expect(out).toContain('B');
    expect(out).toContain('1');
    expect(out).toContain('2');
  });

  it('rend un blockquote', () => {
    const out = render('> citation importante');
    expect(out).toContain('citation importante');
  });

  it('markdown vide ne crash pas', () => {
    const out = render('');
    expect(typeof out).toBe('string');
  });

  it('markdown malformé (gras non fermé) ne crash pas', () => {
    const out = render('Texte avec **gras non fermé.');
    expect(out).toContain('gras');
  });
});
