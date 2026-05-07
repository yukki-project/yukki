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

/**
 * Detects the artifact type from the directory segment of an absolute path.
 * Prefer over detectArtifactType(id) when the path is available.
 *
 * Examples:
 *   "C:/w/.yukki/stories/UI-016.md"  → 'story'
 *   "C:/w/.yukki/analysis/UI-016.md" → 'analysis'
 *   "C:/w/.yukki/prompts/UI-016.md"  → 'canvas'
 *   "C:/w/.yukki/inbox/INBOX-001.md" → 'inbox'
 *   "C:/w/.yukki/epics/EPIC-001.md"  → 'epic'
 */
export function detectArtifactTypeFromPath(absolutePath: string): ArtifactType {
  const normalized = absolutePath.replace(/\\/g, '/');
  if (normalized.includes('/.yukki/stories/')) return 'story';
  if (normalized.includes('/.yukki/analysis/')) return 'analysis';
  if (normalized.includes('/.yukki/prompts/')) return 'canvas';
  if (normalized.includes('/.yukki/inbox/')) return 'inbox';
  if (normalized.includes('/.yukki/epics/')) return 'epic';
  // Fallback: try prefix-based detection on the filename
  const filename = normalized.split('/').pop() ?? '';
  const id = filename.replace(/\.md$/, '').split('-').slice(0, 2).join('-');
  return detectArtifactType(id.split('-')[0] ?? '');
}

/**
 * Derives the absolute template path from an artifact's absolute path and type.
 * Extracts the ".yukki/" root, then appends "templates/<name>.md".
 *
 * Returns null if the type has no template or the path does not contain "/.yukki/".
 *
 * Example:
 *   templatePathFor("C:/w/.yukki/stories/UI-016.md", "story")
 *   → "C:/w/.yukki/templates/story.md"
 */
export function templatePathFor(absolutePath: string, type: ArtifactType): string | null {
  const templateName = templateNameForType(type);
  if (!templateName) return null;
  const normalized = absolutePath.replace(/\\/g, '/');
  const yukkiIdx = normalized.lastIndexOf('/.yukki/');
  if (yukkiIdx === -1) return null;
  // Preserve original separators for the Windows path prefix
  const sep = absolutePath.includes('\\') ? '\\' : '/';
  const base = absolutePath.slice(0, yukkiIdx);
  return `${base}${sep}.yukki${sep}templates${sep}${templateName}.md`;
}
