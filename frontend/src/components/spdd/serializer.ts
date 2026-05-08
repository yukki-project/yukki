// UI-014c — Serializer: StoryDraft → Markdown string.
// The generated .md must be re-parseable by parser.ts with no data loss
// (round-trip guarantee). Format follows the SPDD story template exactly:
// YAML front-matter, then ## Section headings in canonical order.

import type { MockAcceptanceCriterion, ProseSectionKey, StoryDraft } from './types';

// ─── Section label map (canonical order) ─────────────────────────────────

const SECTION_HEADINGS: Record<ProseSectionKey, string> = {
  bg: 'Background',
  bv: 'Business Value',
  si: 'Scope In',
  so: 'Scope Out',
  oq: 'Open Questions',
  no: 'Notes',
};

const PROSE_SECTION_ORDER: ProseSectionKey[] = ['bg', 'bv', 'si', 'so', 'oq', 'no'];

// ─── YAML front-matter serializer ────────────────────────────────────────

function serializeFrontMatter(draft: StoryDraft): string {
  const lines: string[] = ['---'];
  lines.push(`id: ${draft.id}`);
  lines.push(`slug: ${draft.slug}`);
  lines.push(`title: ${JSON.stringify(draft.title)}`);
  lines.push(`status: ${draft.status}`);
  lines.push(`created: ${draft.created}`);
  lines.push(`updated: ${draft.updated}`);
  lines.push(`owner: ${draft.owner}`);
  if (draft.modules.length === 0) {
    lines.push(`modules: []`);
  } else {
    lines.push(`modules:`);
    for (const m of draft.modules) {
      lines.push(`  - ${m}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// ─── AC serializer ───────────────────────────────────────────────────────

function serializeAc(ac: MockAcceptanceCriterion): string {
  const lines: string[] = [];
  lines.push(`### ${ac.id}${ac.title ? ` — ${ac.title}` : ''}`);
  lines.push('');
  lines.push(`- **Given** ${ac.given || '_non renseigné_'}`);
  lines.push(`- **When** ${ac.when || '_non renseigné_'}`);
  lines.push(`- **Then** ${ac.then || '_non renseigné_'}`);
  return lines.join('\n');
}

// ─── Root serializer ─────────────────────────────────────────────────────

export function draftToMarkdown(draft: StoryDraft): string {
  const parts: string[] = [];

  // Front-matter block
  parts.push(serializeFrontMatter(draft));
  parts.push('');

  // Story title
  parts.push(`# ${draft.title}`);
  parts.push('');

  // Prose sections in canonical order
  for (const key of PROSE_SECTION_ORDER) {
    parts.push(`## ${SECTION_HEADINGS[key]}`);
    parts.push('');
    const content = draft.sections[key];
    if (content.trim()) {
      parts.push(content.trimEnd());
      parts.push('');
    }
    parts.push('');
  }

  // Acceptance Criteria
  parts.push('## Acceptance Criteria');
  parts.push('');
  for (const ac of draft.ac) {
    parts.push(serializeAc(ac));
    parts.push('');
  }

  // Trim trailing blank lines, end with single newline
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ─── Section-line map for Markdown scroll ────────────────────────────────

/** Returns a map of sectionKey → 1-based line number where the `##` heading appears. */
export function buildSectionLineMap(md: string): Map<string, number> {
  const map = new Map<string, number>();
  const lines = md.split('\n');

  // Inverse of SECTION_HEADINGS
  const headingToKey = Object.fromEntries(
    (Object.entries(SECTION_HEADINGS) as [ProseSectionKey, string][]).map(([k, v]) => [v, k]),
  );

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const heading = h2[1].trim();
      if (heading === 'Acceptance Criteria') {
        map.set('ac', lineNo);
      } else {
        const key = headingToKey[heading];
        if (key) map.set(key, lineNo);
      }
    }
    // Front-matter maps to 'fm' (first ---  line)
    if (line === '---' && lineNo === 1) {
      map.set('fm', lineNo);
    }
  });

  return map;
}
