// UI-015 — Parse a .yukki/templates/<type>.md file into a structured spec
// that drives TemplatedEditor. No store dependency — pure functions only.

import type { FrontmatterSpec, FrontmatterWidget, SectionSpec, SectionWidget } from '@/components/spdd/types';

export interface ParsedTemplate {
  fmSpecs: FrontmatterSpec[];
  sections: SectionSpec[];
}

// ─── Frontmatter spec derivation ──────────────────────────────────────────

function deriveFmWidget(key: string, value: string): { widget: FrontmatterWidget; options?: string[] } {
  // Dates
  if (key === 'created' || key === 'updated') {
    return { widget: 'date' };
  }
  // Enum encoded with | separator in the template value comment
  // e.g. "draft  # draft | reviewed | done"  or value is literally "a | b"
  const commentMatch = value.match(/#\s*(.+)$/);
  const enumSource = commentMatch ? commentMatch[1] : value;
  if (enumSource.includes('|')) {
    const options = enumSource.split('|').map((o) => o.trim()).filter(Boolean);
    return { widget: 'select', options };
  }
  // Lists: value is [] or starts with - or is a multi-value placeholder
  if (value.trim() === '[]' || value.trim().startsWith('-')) {
    return { widget: 'tags' };
  }
  return { widget: 'text' };
}

function parseFmSpecs(frontmatterBlock: string): FrontmatterSpec[] {
  const specs: FrontmatterSpec[] = [];
  const lines = frontmatterBlock.split('\n');
  let inList = false;
  let listKey = '';

  for (const line of lines) {
    // Skip list items inside an array value (handled as tags widget on the parent key)
    if (inList) {
      if (/^\s+-/.test(line)) continue;
      inList = false;
    }
    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    if (value === '') {
      // Next lines will be list items
      inList = true;
      listKey = key;
      specs.push({ key: listKey, widget: 'tags' });
      continue;
    }
    const { widget, options } = deriveFmWidget(key, value);
    specs.push(options ? { key, widget, options } : { key, widget });
  }
  return specs;
}

// ─── Section widget derivation ────────────────────────────────────────────

function deriveSectionWidget(sectionBody: string): SectionWidget {
  const hasGiven = /\*\*Given\*\*/i.test(sectionBody);
  const hasWhen = /\*\*When\*\*/i.test(sectionBody);
  const hasThen = /\*\*Then\*\*/i.test(sectionBody);
  return hasGiven && hasWhen && hasThen ? 'ac-cards' : 'textarea';
}

// ─── Main parser ──────────────────────────────────────────────────────────

export function parseTemplate(templateRaw: string): ParsedTemplate {
  if (!templateRaw.trim()) {
    return { fmSpecs: [], sections: [] };
  }

  // Split frontmatter from body
  const fmMatch = templateRaw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let fmBlock = '';
  let body = templateRaw;
  if (fmMatch) {
    fmBlock = fmMatch[1];
    body = fmMatch[2];
  }

  const fmSpecs = parseFmSpecs(fmBlock);

  // Split body into ## sections
  const sections: SectionSpec[] = [];
  const lines = body.split('\n');
  let currentHeading: string | null = null;
  const currentContent: string[] = [];

  const flushSection = () => {
    if (currentHeading !== null) {
      const sectionBody = currentContent.join('\n');
      sections.push({
        heading: currentHeading,
        widget: deriveSectionWidget(sectionBody),
      });
      currentContent.length = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushSection();
      currentHeading = line.slice(3).trim();
    } else {
      currentContent.push(line);
    }
  }
  flushSection();

  return { fmSpecs, sections };
}

// ─── Type detection (from artifact id prefix) ─────────────────────────────

export type ArtifactType = 'story' | 'inbox' | 'epic' | 'analysis' | 'canvas' | 'unknown';

export function detectArtifactType(id: string): ArtifactType {
  const prefix = id.split('-')[0]?.toUpperCase() ?? '';
  if (prefix === 'INBOX') return 'inbox';
  if (prefix === 'EPIC') return 'epic';
  // Analysis and canvas share slug with parent but live in different dirs — detect by id
  if (prefix === 'ROADMAP') return 'unknown';
  // story: CORE-*, UI-*, META-*, etc.
  return 'story';
}

export function templateNameForType(type: ArtifactType): string | null {
  switch (type) {
    case 'story': return 'story';
    case 'inbox': return 'inbox';
    case 'epic': return 'epic';
    default: return null;
  }
}
