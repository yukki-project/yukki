// UI-014c — Parser: Markdown string → StoryDraft (with warnings).
// Mirrors the format produced by serializer.ts. Returns the draft and a list
// of warning strings for missing/malformed sections (used by the UI to show
// the non-blocking "format mismatch" banner).

import type {
  MockAcceptanceCriterion,
  ProseSectionKey,
  StoryDraft,
  StoryStatus,
} from './types';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ParseResult {
  draft: StoryDraft;
  warnings: string[];
}

// ─── YAML front-matter parser (minimal, SPDD-subset only) ────────────────

interface RawFrontMatter {
  id?: string;
  slug?: string;
  title?: string;
  status?: string;
  created?: string;
  updated?: string;
  owner?: string;
  modules?: string[];
}

function parseFrontMatter(block: string): RawFrontMatter {
  const result: RawFrontMatter = {};
  const lines = block.split('\n');
  let inModules = false;
  const modules: string[] = [];

  for (const line of lines) {
    // Multi-value block: modules list
    const listItem = line.match(/^\s{2}-\s+(.+)$/);
    if (inModules) {
      if (listItem) {
        modules.push(listItem[1].trim());
        continue;
      } else {
        result.modules = modules;
        inModules = false;
      }
    }

    // key: value
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const value = raw.trim();

    switch (key) {
      case 'id': result.id = value; break;
      case 'slug': result.slug = value; break;
      case 'title':
        // Support both quoted ("…") and unquoted
        result.title = value.startsWith('"') && value.endsWith('"')
          ? JSON.parse(value)
          : value;
        break;
      case 'status': result.status = value; break;
      case 'created': result.created = value; break;
      case 'updated': result.updated = value; break;
      case 'owner': result.owner = value; break;
      case 'modules':
        if (value === '[]') {
          result.modules = [];
        } else if (!value) {
          inModules = true;
        }
        break;
    }
  }
  if (inModules && modules.length > 0) {
    result.modules = modules;
  }

  return result;
}

// ─── Heading → sectionKey map ─────────────────────────────────────────────

const HEADING_TO_KEY: Record<string, ProseSectionKey | 'ac'> = {
  'Background': 'bg',
  'Business Value': 'bv',
  'Scope In': 'si',
  'Scope Out': 'so',
  'Open Questions': 'oq',
  'Notes': 'no',
  'Acceptance Criteria': 'ac',
};

const PROSE_REQUIRED: ProseSectionKey[] = ['bg', 'bv', 'si'];

// ─── AC block parser ──────────────────────────────────────────────────────

function parseAcBlock(lines: string[]): MockAcceptanceCriterion {
  // Header line: `### AC1 — Title` or `### AC1`
  const header = lines[0] ?? '';
  const headerMatch = header.match(/^###\s+(\S+?)(?:\s+[—–-]\s+(.*))?$/);
  const id = headerMatch?.[1] ?? 'AC?';
  const title = headerMatch?.[2]?.trim() ?? '';

  let given = '';
  let when = '';
  let then = '';

  for (const line of lines.slice(1)) {
    const givenMatch = line.match(/^-\s+\*\*Given\*\*\s+(.*)/i);
    const whenMatch = line.match(/^-\s+\*\*When\*\*\s+(.*)/i);
    const thenMatch = line.match(/^-\s+\*\*Then\*\*\s+(.*)/i);
    if (givenMatch) given = givenMatch[1].replace(/^_(.*)_$/, '$1') === '_non renseigné_' ? '' : givenMatch[1].replace(/^_(.*)_$/, '');
    if (whenMatch) when = whenMatch[1].replace(/^_(.*)_$/, '$1') === '_non renseigné_' ? '' : whenMatch[1].replace(/^_(.*)_$/, '');
    if (thenMatch) then = thenMatch[1].replace(/^_(.*)_$/, '$1') === '_non renseigné_' ? '' : thenMatch[1].replace(/^_(.*)_$/, '');
  }

  return { id, title, given, when, then };
}

// ─── Root parser ──────────────────────────────────────────────────────────

export function markdownToDraft(
  md: string,
  fallback: StoryDraft,
): ParseResult {
  const warnings: string[] = [];
  const lines = md.split('\n');

  // --- Extract front-matter
  let fmEnd = -1;
  let rawFm: RawFrontMatter = {};
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        fmEnd = i;
        break;
      }
    }
    if (fmEnd !== -1) {
      rawFm = parseFrontMatter(lines.slice(1, fmEnd).join('\n'));
    }
  }

  // --- Split remaining content into sections by ## heading
  const bodyLines = fmEnd !== -1 ? lines.slice(fmEnd + 1) : lines;
  const sections: Map<string, string[]> = new Map();
  let currentKey: string | null = null;
  const acBlocks: MockAcceptanceCriterion[] = [];
  let acBuffer: string[] = [];
  let inAc = false;

  for (const line of bodyLines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);

    if (h2) {
      // Flush previous AC sub-block if in AC section
      if (inAc && acBuffer.length > 0) {
        acBlocks.push(parseAcBlock(acBuffer));
        acBuffer = [];
      }
      const heading = h2[1].trim();
      const key = HEADING_TO_KEY[heading];
      if (key) {
        currentKey = key;
        inAc = key === 'ac';
        if (!inAc) sections.set(key, []);
      } else {
        currentKey = null;
        inAc = false;
      }
      continue;
    }

    if (inAc && h3) {
      // Only flush if the buffer actually starts with a ### heading (valid AC block)
      if (acBuffer.length > 0 && /^###/.test(acBuffer[0] ?? '')) {
        acBlocks.push(parseAcBlock(acBuffer));
      }
      acBuffer = [line];
      continue;
    }

    if (inAc) {
      acBuffer.push(line);
    } else if (currentKey && currentKey !== 'ac') {
      sections.get(currentKey)?.push(line);
    }
  }

  // Flush last AC block
  if (inAc && acBuffer.length > 0 && /^###/.test(acBuffer[0] ?? '')) {
    acBlocks.push(parseAcBlock(acBuffer));
  }

  // Check required sections
  const allProseKeys: ProseSectionKey[] = ['bg', 'bv', 'si', 'so', 'oq', 'no'];
  for (const key of PROSE_REQUIRED) {
    if (!sections.has(key)) {
      const LABELS: Partial<Record<ProseSectionKey, string>> = { bg: 'Background', bv: 'Business Value', si: 'Scope In' };
      const label = LABELS[key];
      warnings.push(`La section ${label} est absente. Elle sera réinsérée vide.`);
    }
  }

  // Build prose sections record
  const proseSections: Record<ProseSectionKey, string> = {
    bg: '',
    bv: '',
    si: '',
    so: '',
    oq: '',
    no: '',
  };
  for (const key of allProseKeys) {
    const raw = sections.get(key);
    if (raw !== undefined) {
      proseSections[key] = raw
        .join('\n')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');
    }
  }

  const VALID_STATUSES = ['draft', 'reviewed', 'accepted', 'implemented', 'synced'] as const;
  const parsedStatus = rawFm.status as StoryStatus | undefined;
  const status: StoryStatus = VALID_STATUSES.includes(parsedStatus as StoryStatus)
    ? (parsedStatus as StoryStatus)
    : fallback.status;

  const draft: StoryDraft = {
    id: rawFm.id ?? fallback.id,
    slug: rawFm.slug ?? fallback.slug,
    title: rawFm.title ?? fallback.title,
    status,
    created: rawFm.created ?? fallback.created,
    updated: rawFm.updated ?? fallback.updated,
    owner: rawFm.owner ?? fallback.owner,
    modules: rawFm.modules ?? fallback.modules,
    sections: proseSections,
    ac: acBlocks.length > 0 ? acBlocks : fallback.ac,
    savedAt: fallback.savedAt,
  };

  return { draft, warnings };
}
