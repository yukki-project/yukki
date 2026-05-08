// UI-015 O6 — `<Document>` complet : 1 page (ou plus, paginé auto)
// par artefact, avec en-tête (titre) + corps (PdfMarkdown ou encart
// "référence cassée") + pied de page fixe sur chaque page (cartouche
// `<id> — <title> · <status> · <updated>`, décision Q4-A).

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { pdfTokens } from './pdfTokens';
import { PdfMarkdown } from './PdfMarkdown';

export interface RenderedArtifactMeta {
  id: string;
  title: string;
  status: string;
  updated: string;
}

export interface FrontmatterEntry {
  key: string;
  value: string | string[];
}

export interface RenderedArtifact {
  meta: RenderedArtifactMeta;
  /** Toutes les entrées du front-matter, ordonnées comme dans la source. */
  frontmatter: FrontmatterEntry[];
  /** Markdown source sans le front-matter. */
  markdown: string;
  /** Pour AC5 : signaler une référence cassée à la place du markdown. */
  brokenRef?: { reason: string; missingPath: string };
}

export interface PdfArtifactDocumentProps {
  artefacts: RenderedArtifact[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: '#ffffff',
  },
  pageHeader: {
    marginBottom: 18,
    paddingBottom: 8,
    paddingLeft: 10,
    borderBottomWidth: 2,
    borderBottomColor: pdfTokens.primary,
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.primary,
  },
  artifactTitle: {
    fontFamily: 'Helvetica',
    fontSize: 18,
    fontWeight: 'bold',
    color: pdfTokens.textPrimary,
    marginBottom: 4,
  },
  artifactSubtitle: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: pdfTokens.primary,
  },
  body: {
    flex: 1,
  },
  brokenBox: {
    borderWidth: 1,
    borderColor: pdfTokens.danger,
    borderRadius: pdfTokens.radius,
    backgroundColor: pdfTokens.dangerSoft,
    padding: 12,
    marginVertical: 12,
  },
  brokenTitle: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontWeight: 'bold',
    color: pdfTokens.danger,
    marginBottom: 4,
  },
  brokenBody: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: pdfTokens.textPrimary,
    marginBottom: 4,
  },
  brokenPath: {
    fontFamily: 'Courier',
    fontSize: 9.5,
    color: pdfTokens.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: pdfTokens.primarySoftSolid,
  },
  footerText: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: pdfTokens.textMuted,
  },
  footerAccent: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: pdfTokens.primary,
  },
  emptyState: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: pdfTokens.textMuted,
    textAlign: 'center',
    marginTop: 100,
  },

  // ─── Front-matter card (key-value, style UI yukki) ─────────────
  fmCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: pdfTokens.line,
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.primary,
    borderRadius: pdfTokens.radius,
    overflow: 'hidden',
    backgroundColor: pdfTokens.bgCard,
  },
  fmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: pdfTokens.lineSubtle,
  },
  fmKeyCell: {
    width: 88,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: pdfTokens.bgSubtle,
    fontFamily: 'Courier',
    fontSize: 9,
    color: pdfTokens.textMuted,
  },
  fmValueCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  fmValueText: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: pdfTokens.textPrimary,
  },
  fmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: pdfTokens.radiusSm,
    backgroundColor: pdfTokens.bg3,
    fontFamily: 'Courier',
    fontSize: 9,
    color: pdfTokens.textSecondary,
  },
  fmStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: pdfTokens.radiusSm,
    fontFamily: 'Courier',
    fontSize: 9,
    color: pdfTokens.textPrimary,
    backgroundColor: pdfTokens.primarySoft,
  },
});

// statusBadgeStyle maps a SPDD status to a colored badge background.
// Toutes les variantes restent dans la famille violette / neutre — cohérent
// avec l'identité visuelle yukki. La distinction se fait par l'intensité
// (gris pour draft, violet pour reviewed/implemented/synced).
function statusBadgeStyle(status: string): { backgroundColor: string; color: string } {
  switch (status.toLowerCase()) {
    case 'draft':
      return { backgroundColor: pdfTokens.bg3, color: pdfTokens.textMuted };
    case 'reviewed':
    case 'accepted':
    case 'implemented':
    case 'synced':
      return { backgroundColor: pdfTokens.primarySoft, color: pdfTokens.primary };
    default:
      return { backgroundColor: pdfTokens.bg3, color: pdfTokens.textSecondary };
  }
}

// PdfFrontmatterCard renders all front-matter entries as a key/value
// table card, mirroring the SpddFmForm read-only style of the UI.
function PdfFrontmatterCard({ entries }: { entries: FrontmatterEntry[] }): JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <View style={styles.fmCard}>
      {entries.map((entry, i) => (
        <View
          key={`${entry.key}-${i}`}
          style={[styles.fmRow, i === 0 ? { borderTopWidth: 0 } : null] as never}
        >
          <Text style={styles.fmKeyCell}>{entry.key}</Text>
          <View style={styles.fmValueCell}>
            {Array.isArray(entry.value) ? (
              entry.value.map((v, j) => (
                <Text key={`${v}-${j}`} style={styles.fmBadge}>
                  {v}
                </Text>
              ))
            ) : entry.key === 'status' ? (
              <Text style={[styles.fmStatusBadge, statusBadgeStyle(entry.value)] as never}>
                {entry.value}
              </Text>
            ) : (
              <Text style={styles.fmValueText}>{entry.value}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function buildFooterText(meta: RenderedArtifactMeta): string {
  const parts = [meta.id, meta.title].filter(Boolean).join(' — ');
  const trail = [meta.status, meta.updated].filter(Boolean).join(' · ');
  return trail ? `${parts}  ·  ${trail}` : parts;
}

function ArtifactPage({ artifact }: { artifact: RenderedArtifact }): JSX.Element {
  const footerText = buildFooterText(artifact.meta);
  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.pageHeader}>
        <Text style={styles.artifactTitle}>{artifact.meta.title || artifact.meta.id || '—'}</Text>
        <Text style={styles.artifactSubtitle}>
          {[artifact.meta.id, artifact.meta.status, artifact.meta.updated]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
      </View>

      <View style={styles.body}>
        {artifact.brokenRef ? (
          <View style={styles.brokenBox}>
            <Text style={styles.brokenTitle}>Artefact introuvable</Text>
            <Text style={styles.brokenBody}>{artifact.brokenRef.reason}</Text>
            <Text style={styles.brokenPath}>{artifact.brokenRef.missingPath}</Text>
          </View>
        ) : (
          <>
            <PdfFrontmatterCard entries={artifact.frontmatter} />
            <PdfMarkdown markdown={artifact.markdown} />
          </>
        )}
      </View>

      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>{footerText}</Text>
        <Text
          style={styles.footerAccent}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

export function PdfArtifactDocument({
  artefacts,
}: PdfArtifactDocumentProps): JSX.Element {
  if (artefacts.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.emptyState}>
            Aucun artefact à exporter.
          </Text>
        </Page>
      </Document>
    );
  }
  return (
    <Document>
      {artefacts.map((art, i) => (
        <ArtifactPage key={`${art.meta.id || 'item'}-${i}`} artifact={art} />
      ))}
    </Document>
  );
}
