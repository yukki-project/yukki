// UI-015 — Parse artifact content into EditState and serialize back.
// Round-trip guarantee: parseArtifactContent(serializeArtifact(state)) ≈ state.
// No store dependency — pure functions only.

import type { GenericAc, SectionWidget } from '@/components/spdd/types';
import type { ParsedTemplate } from './templateParser';

// ─── Types ────────────────────────────────────────────────────────────────

export interface SectionState {
  heading: string;
  widget: SectionWidget;
  content: string;      // used when widget === 'textarea'
  acs: GenericAc[];     // used when widget === 'ac-cards'
}

export interface EditState {
  /** Raw frontmatter values keyed by field name */
  fmValues: Record<string, string | string[]>;
  /** Ordered sections: template sections first, orphan sections last */
  sections: SectionState[];
}

// ─── Frontmatter parsing ──────────────────────────────────────────────────

function parseFmValues(raw: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = raw.split('\n');
  let currentList: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (currentList !== null) {
      const listItem = line.match(/^\s+-\s+(.+?)\s*$/);
      if (listItem) {
        const arr = result[currentList];
        if (Array.isArray(arr)) arr.push(stripQuotes(listItem[1]));
        continue;
      }
      currentList = null;
    }

    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    if (value === '' || value === null) {
      currentList = key;
      result[key] = [];
    } else if (value === '[]') {
      result[key] = [];
    } else {
      result[key] = stripQuotes(value);
    }
  }
  return result;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// ─── AC parsing ───────────────────────────────────────────────────────────

function parseAcs(sectionBody: string): GenericAc[] {
  const acs: GenericAc[] = [];
  // Split on ### ACn headers
  const blocks = sectionBody.split(/(?=^### )/m);

  for (const block of blocks) {
    const headerMatch = block.match(/^### (AC\d+)(?:\s+[—–-]+\s+(.+?))?$/m);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const title = (headerMatch[2] ?? '').trim();

    const given = extractGwt(block, 'Given');
    const when = extractGwt(block, 'When');
    const then = extractGwt(block, 'Then');

    acs.push({ id, title, given, when, then });
  }
  return acs;
}

function extractGwt(block: string, label: 'Given' | 'When' | 'Then'): string {
  // Match "- **Given** rest of line" and capture the content after the label
  const re = new RegExp(`^-\\s+\\*\\*${label}\\*\\*\\s*(.*)$`, 'm');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

// ─── Body section splitting (generic) ────────────────────────────────────

function splitBodySections(body: string): Array<{ heading: string; content: string }> {
  const result: Array<{ heading: string; content: string }> = [];
  const lines = body.split('\n');
  let currentHeading: string | null = null;
  const currentContent: string[] = [];

  const flush = () => {
    if (currentHeading !== null) {
      result.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      currentContent.length = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentHeading = line.slice(3).trim();
    } else {
      currentContent.push(line);
    }
  }
  flush();
  return result;
}

// ─── Main parse ───────────────────────────────────────────────────────────

export function parseArtifactContent(raw: string, template: ParsedTemplate): EditState {
  // Split frontmatter
  let fmRaw = '';
  let body = raw;
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (fmMatch) {
    fmRaw = fmMatch[1];
    body = fmMatch[2];
  }

  const fmValues = parseFmValues(fmRaw);
  const fileSections = splitBodySections(body);

  // Build an index of file sections by heading (case-insensitive)
  const fileSectionIndex = new Map<string, { heading: string; content: string }>();
  for (const s of fileSections) {
    fileSectionIndex.set(s.heading.toLowerCase(), s);
  }

  // Build sections in template order
  const templateHeadings = new Set<string>();
  const sections: SectionState[] = [];

  for (const spec of template.sections) {
    templateHeadings.add(spec.heading.toLowerCase());
    const fileSection = fileSectionIndex.get(spec.heading.toLowerCase());
    const content = fileSection?.content ?? '';

    if (spec.widget === 'ac-cards') {
      sections.push({ heading: spec.heading, widget: 'ac-cards', content: '', acs: parseAcs(content) });
    } else {
      sections.push({ heading: spec.heading, widget: 'textarea', content, acs: [] });
    }
  }

  // Append orphan sections (present in file but not in template)
  for (const fileSection of fileSections) {
    if (!templateHeadings.has(fileSection.heading.toLowerCase())) {
      sections.push({ heading: fileSection.heading, widget: 'textarea', content: fileSection.content, acs: [] });
    }
  }

  return { fmValues, sections };
}

// ─── Serialization ────────────────────────────────────────────────────────

function serializeFmValues(
  values: Record<string, string | string[]>,
  specs: ParsedTemplate['fmSpecs'],
): string {
  const lines: string[] = ['---'];
  const specKeys = specs.map((s) => s.key);
  const allKeys = [...new Set([...specKeys, ...Object.keys(values)])];

  for (const key of allKeys) {
    const value = values[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function serializeAc(ac: GenericAc, index: number): string {
  const id = `AC${index + 1}`;
  const titlePart = ac.title.trim() ? ` — ${ac.title.trim()}` : '';
  return [
    `### ${id}${titlePart}`,
    '',
    `- **Given** ${ac.given || '_non renseigné_'}`,
    `- **When** ${ac.when || '_non renseigné_'}`,
    `- **Then** ${ac.then || '_non renseigné_'}`,
  ].join('\n');
}

export function serializeArtifact(state: EditState, template: ParsedTemplate): string {
  const parts: string[] = [];
  parts.push(serializeFmValues(state.fmValues, template.fmSpecs));
  parts.push('');

  for (const section of state.sections) {
    parts.push(`## ${section.heading}`);
    parts.push('');
    if (section.widget === 'ac-cards') {
      if (section.acs.length > 0) {
        parts.push(section.acs.map((ac, i) => serializeAc(ac, i)).join('\n\n'));
        parts.push('');
      }
    } else {
      const trimmed = section.content.trimEnd();
      if (trimmed) {
        parts.push(trimmed);
        parts.push('');
      }
    }
    parts.push('');
  }

  return parts.join('\n').trimEnd() + '\n';
}
