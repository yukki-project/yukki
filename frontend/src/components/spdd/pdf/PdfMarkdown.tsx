// UI-015 O5 — Mapping markdown AST → composants @react-pdf/renderer.
//
// `react-markdown + remark-gfm` parse le markdown et appelle nos
// `components` pour chaque nœud. Au lieu d'émettre des balises HTML
// (h1, p, ul, …), on retourne des primitives @react-pdf (`<View>`,
// `<Text>`, `<Link>`) — texte sélectionnable, pagination contrôlée.
//
// Polices : on utilise les natives @react-pdf (Helvetica + Courier).
// Cf. notes en tête du fichier sur le pourquoi (Font.register exige
// toutes les combinaisons fontWeight × fontStyle, .ttf custom non
// fournis par défaut).
//
// Couleurs : on consomme `pdfTokens` (light mode) et NON `ykTokens`
// (dark mode du SpddEditor) — un PDF se lit sur fond blanc.
//
// Skip H1 (Q3) : les artefacts SPDD commencent par `# titre` ; le
// titre est déjà rendu en en-tête de page par `PdfArtifactDocument`,
// donc le composant `h1` retourne `null` ici pour éviter le doublon.
//
// Style Given/When/Then : les listes à puces dont chaque `<li>`
// commence par `**Given**`, `**When**` ou `**Then**` sont détectées
// et rendues comme des "rows GWT" avec un cartouche label monospace
// à gauche (reproduit le style des cards AC du SpddEditor).

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Components } from 'react-markdown';
import type { ReactElement, ReactNode } from 'react';
import { pdfTokens } from './pdfTokens';

const FONT_PROSE = 'Helvetica';
const FONT_MONO = 'Courier';

// ─── StyleSheet ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  paragraph: {
    fontFamily: FONT_PROSE,
    fontSize: 10.5,
    lineHeight: 1.55,
    color: pdfTokens.textPrimary,
    marginBottom: 6,
  },
  h2: {
    fontFamily: FONT_PROSE,
    fontSize: 14,
    fontWeight: 'bold',
    color: pdfTokens.primary,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.primarySoftSolid,
  },
  h3: {
    fontFamily: FONT_PROSE,
    fontSize: 12,
    fontWeight: 'bold',
    color: pdfTokens.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  list: {
    marginLeft: 14,
    marginBottom: 6,
  },
  listItem: {
    fontFamily: FONT_PROSE,
    fontSize: 10.5,
    lineHeight: 1.55,
    color: pdfTokens.textPrimary,
    marginBottom: 2,
  },
  inlineCode: {
    fontFamily: FONT_MONO,
    fontSize: 9.5,
    color: pdfTokens.codeKey,
    backgroundColor: pdfTokens.bg3,
  },
  codeBlock: {
    fontFamily: FONT_MONO,
    fontSize: 9.5,
    lineHeight: 1.4,
    color: pdfTokens.textPrimary,
    backgroundColor: pdfTokens.bg3,
    padding: 8,
    borderRadius: pdfTokens.radius,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: pdfTokens.line,
    paddingLeft: 8,
    marginVertical: 6,
    fontStyle: 'italic',
    color: pdfTokens.textMuted,
  },
  link: {
    color: pdfTokens.primary,
    textDecoration: 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: pdfTokens.line,
    borderRadius: pdfTokens.radiusSm,
    marginVertical: 6,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.lineSubtle,
  },
  th: {
    flex: 1,
    padding: 5,
    fontFamily: FONT_PROSE,
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfTokens.textPrimary,
    backgroundColor: pdfTokens.bg3,
  },
  td: {
    flex: 1,
    padding: 5,
    fontFamily: FONT_PROSE,
    fontSize: 10,
    color: pdfTokens.textPrimary,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },

  // ─── Cartouches Given / When / Then (style cards UI yukki) ────────
  gwtList: {
    marginVertical: 6,
    borderWidth: 1,
    borderColor: pdfTokens.line,
    borderRadius: pdfTokens.radius,
    overflow: 'hidden',
  },
  gwtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: pdfTokens.lineSubtle,
  },
  gwtLabelCell: {
    width: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: pdfTokens.bgSubtle,
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: pdfTokens.textMuted,
  },
  gwtBodyCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: FONT_PROSE,
    fontSize: 10.5,
    lineHeight: 1.55,
    color: pdfTokens.textPrimary,
  },
});

// ─── GWT detection ─────────────────────────────────────────────────
// Inspect a `<li>`'s children to detect the pattern :
//   <li><strong>Given</strong> texte du critère</li>
// In the react-markdown AST, `children` is an array where index 0 is
// the `<strong>` element and the rest is the trailing text node(s).

const GWT_LABELS = new Set(['given', 'when', 'then']);

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (
    node &&
    typeof node === 'object' &&
    'props' in node &&
    typeof (node as ReactElement).props === 'object'
  ) {
    return extractText((node as ReactElement).props?.children);
  }
  return '';
}

interface GwtMatch {
  label: 'GIVEN' | 'WHEN' | 'THEN';
  body: ReactNode;
}

// detectGwtLi returns null if the li doesn't match the pattern, or the
// label + remaining body otherwise.
function detectGwtLi(children: ReactNode): GwtMatch | null {
  const arr = Array.isArray(children) ? children : [children];
  if (arr.length === 0) return null;
  const first = arr[0];
  if (
    !first ||
    typeof first !== 'object' ||
    !('props' in first)
  ) {
    return null;
  }
  const el = first as ReactElement<{ children?: ReactNode }>;
  // Detect a <strong>Given|When|Then</strong> opener regardless of the
  // exact element type (react-markdown uses 'strong' tag-name).
  const strongText = extractText(el.props?.children).trim().toLowerCase();
  if (!GWT_LABELS.has(strongText)) return null;
  const label = strongText.toUpperCase() as 'GIVEN' | 'WHEN' | 'THEN';
  // Strip the leading whitespace from the next sibling (the bold word
  // is followed by " body text" → we keep the body sans leading space).
  const rest = arr.slice(1);
  const trimmedRest: ReactNode[] = rest.map((n, idx) => {
    if (idx === 0 && typeof n === 'string') return n.replace(/^\s+/, '');
    return n;
  });
  return { label, body: trimmedRest };
}

// detectGwtList inspects an entire <ul> and returns the GWT rows if all
// (or most) of its <li> match the pattern. Otherwise returns null and
// the caller falls back to the standard bullet rendering.
function detectGwtList(children: ReactNode): GwtMatch[] | null {
  const arr = Array.isArray(children) ? children : [children];
  const matches: GwtMatch[] = [];
  for (const child of arr) {
    if (
      !child ||
      typeof child !== 'object' ||
      !('props' in child)
    ) {
      continue; // skip whitespace text nodes
    }
    const el = child as ReactElement<{ children?: ReactNode }>;
    // Only care about <li> elements.
    if ((el as { type?: unknown }).type !== 'li') continue;
    const m = detectGwtLi(el.props?.children);
    if (!m) return null; // mixed content → fallback to bullet list
    matches.push(m);
  }
  return matches.length >= 2 ? matches : null;
}

// ─── Components mapping ────────────────────────────────────────────

const pdfComponents: Components = {
  // Q3 — Skip H1 source : titre déjà en en-tête de page.
  h1: () => null,
  h2: ({ children }) => <Text style={styles.h2}>{children as ReactNode}</Text>,
  h3: ({ children }) => <Text style={styles.h3}>{children as ReactNode}</Text>,
  // Headings 4-6 fallback to h3 styling
  h4: ({ children }) => <Text style={styles.h3}>{children as ReactNode}</Text>,
  h5: ({ children }) => <Text style={styles.h3}>{children as ReactNode}</Text>,
  h6: ({ children }) => <Text style={styles.h3}>{children as ReactNode}</Text>,
  p: ({ children }) => <Text style={styles.paragraph}>{children as ReactNode}</Text>,
  ul: ({ children }) => {
    // Tente de détecter un cartouche Given/When/Then. Si ça matche, on
    // rend un "card AC" comme dans le SpddEditor ; sinon liste à puces
    // standard.
    const gwt = detectGwtList(children);
    if (gwt) {
      return (
        <View style={styles.gwtList}>
          {gwt.map((row, i) => (
            <View
              key={`${row.label}-${i}`}
              style={[styles.gwtRow, i === 0 ? { borderTopWidth: 0 } : null] as never}
            >
              <Text style={styles.gwtLabelCell}>{row.label}</Text>
              <Text style={styles.gwtBodyCell}>{row.body as ReactNode}</Text>
            </View>
          ))}
        </View>
      );
    }
    return <View style={styles.list}>{children as ReactNode}</View>;
  },
  ol: ({ children }) => <View style={styles.list}>{children as ReactNode}</View>,
  li: ({ children }) => (
    <Text style={styles.listItem}>
      <Text>{'• '}</Text>
      {children as ReactNode}
    </Text>
  ),
  code: (props) => {
    const { inline, children } = props as { inline?: boolean; children?: ReactNode };
    if (inline) {
      return <Text style={styles.inlineCode}>{children}</Text>;
    }
    return (
      <View style={styles.codeBlock}>
        <Text>{children}</Text>
      </View>
    );
  },
  pre: ({ children }) => <View>{children as ReactNode}</View>,
  blockquote: ({ children }) => (
    <View style={styles.blockquote}>{children as ReactNode}</View>
  ),
  a: ({ href, children }) => (
    <Link src={href ?? '#'} style={styles.link}>
      {children as ReactNode}
    </Link>
  ),
  strong: ({ children }) => <Text style={styles.strong}>{children as ReactNode}</Text>,
  em: ({ children }) => <Text style={styles.em}>{children as ReactNode}</Text>,
  table: ({ children }) => <View style={styles.table}>{children as ReactNode}</View>,
  thead: ({ children }) => <View>{children as ReactNode}</View>,
  tbody: ({ children }) => <View>{children as ReactNode}</View>,
  tr: ({ children }) => <View style={styles.tr}>{children as ReactNode}</View>,
  th: ({ children }) => <Text style={styles.th}>{children as ReactNode}</Text>,
  td: ({ children }) => <Text style={styles.td}>{children as ReactNode}</Text>,
  hr: () => (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: pdfTokens.line,
        marginVertical: 8,
      }}
    />
  ),
};

// ─── AC card detection (split before parsing) ─────────────────────
//
// On détecte les blocs `### ACx — titre` suivis d'une liste à puces
// `- **Given** … - **When** … - **Then** …`, et on les rend dans un
// composant `<AcCard>` dédié qui combine le titre AC et les rows GWT
// dans la même card bordée (réplique du style `SpddAcEditor` de l'UI).
//
// Le reste du markdown (entre / autour des blocs AC) reste rendu via
// `<ReactMarkdown>` standard.

interface AcBlock {
  kind: 'ac';
  acId: string;        // "AC1", "AC3a", …
  title: string;       // titre après le `—`
  given: string;
  when: string;
  then: string;
}

interface MdBlock {
  kind: 'md';
  content: string;
}

type Block = AcBlock | MdBlock;

// Regex pour matcher un bloc AC complet :
//   ### AC<num>[<suffix>] — <title>
//
//   - **Given** body
//   - **When** body
//   - **Then** body
//
// Le matcher est assez tolérant : multilignes pour les bodies (jusqu'à
// la prochaine puce ou la fin du bloc), ID en kebab/digit, titre libre.
const AC_BLOCK_RE =
  /(^|\n)###\s+(AC[\w-]*)\s*[—\-]\s*([^\n]+)\n+\s*-\s*\*\*Given\*\*\s+([\s\S]*?)\n\s*-\s*\*\*When\*\*\s+([\s\S]*?)\n\s*-\s*\*\*Then\*\*\s+([\s\S]*?)(?=\n\s*\n|\n##|\n###|$)/gi;

function splitIntoBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let lastEnd = 0;
  AC_BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AC_BLOCK_RE.exec(markdown)) !== null) {
    const blockStart = m.index + (m[1] ? m[1].length : 0);
    if (blockStart > lastEnd) {
      const slice = markdown.slice(lastEnd, blockStart);
      if (slice.trim() !== '') blocks.push({ kind: 'md', content: slice });
    }
    blocks.push({
      kind: 'ac',
      acId: m[2].trim(),
      title: m[3].trim(),
      given: m[4].trim(),
      when: m[5].trim(),
      then: m[6].trim(),
    });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < markdown.length) {
    const tail = markdown.slice(lastEnd);
    if (tail.trim() !== '') blocks.push({ kind: 'md', content: tail });
  }
  return blocks;
}

// ─── AC card styles ────────────────────────────────────────────────

const acCardStyles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: pdfTokens.line,
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.primary,
    borderRadius: pdfTokens.radius,
    overflow: 'hidden',
    backgroundColor: pdfTokens.bgCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: pdfTokens.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.lineSubtle,
  },
  headerId: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: pdfTokens.primary,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT_PROSE,
    fontSize: 11,
    fontWeight: 'bold',
    color: pdfTokens.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: pdfTokens.lineSubtle,
  },
  labelCell: {
    width: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: pdfTokens.bgSubtle,
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: pdfTokens.textMuted,
  },
  bodyCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: FONT_PROSE,
    fontSize: 10.5,
    lineHeight: 1.55,
    color: pdfTokens.textPrimary,
  },
});

function AcCard({ block }: { block: AcBlock }): JSX.Element {
  return (
    <View style={acCardStyles.card}>
      <View style={acCardStyles.header}>
        <Text style={acCardStyles.headerId}>{block.acId}</Text>
        <Text style={acCardStyles.headerTitle}>{block.title}</Text>
      </View>
      <View style={[acCardStyles.row, { borderTopWidth: 0 }] as never}>
        <Text style={acCardStyles.labelCell}>GIVEN</Text>
        <Text style={acCardStyles.bodyCell}>{block.given}</Text>
      </View>
      <View style={acCardStyles.row}>
        <Text style={acCardStyles.labelCell}>WHEN</Text>
        <Text style={acCardStyles.bodyCell}>{block.when}</Text>
      </View>
      <View style={acCardStyles.row}>
        <Text style={acCardStyles.labelCell}>THEN</Text>
        <Text style={acCardStyles.bodyCell}>{block.then}</Text>
      </View>
    </View>
  );
}

export interface PdfMarkdownProps {
  /** Markdown source de l'artefact, sans le front-matter. */
  markdown: string;
}

export function PdfMarkdown({ markdown }: PdfMarkdownProps): JSX.Element {
  const blocks = splitIntoBlocks(markdown);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === 'ac') {
          return <AcCard key={`ac-${block.acId}-${i}`} block={block} />;
        }
        return (
          <ReactMarkdown
            key={`md-${i}`}
            remarkPlugins={[remarkGfm]}
            components={pdfComponents}
          >
            {block.content}
          </ReactMarkdown>
        );
      })}
    </>
  );
}
