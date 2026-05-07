// UI-014c — Round-trip tests for the serializer/parser pair.
// A round-trip must be lossless: draft → md → draft must yield identical state.
// A second leg (md → draft → md) must produce byte-identical markdown.

import { describe, expect, it } from 'vitest';
import { draftToMarkdown } from '@/components/spdd/serializer';
import { markdownToDraft } from '@/components/spdd/parser';
import { DEMO_STORY } from '@/components/spdd/mockStory';

describe('draftToMarkdown', () => {
  it('generates valid markdown with front-matter delimiters', () => {
    const md = draftToMarkdown(DEMO_STORY);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n/);
  });

  it('includes all 8 section headings', () => {
    const md = draftToMarkdown(DEMO_STORY);
    expect(md).toContain('## Background');
    expect(md).toContain('## Business Value');
    expect(md).toContain('## Scope In');
    expect(md).toContain('## Scope Out');
    expect(md).toContain('## Open Questions');
    expect(md).toContain('## Notes');
    expect(md).toContain('## Acceptance Criteria');
  });

  it('serializes all AC with GIVEN/WHEN/THEN', () => {
    const md = draftToMarkdown(DEMO_STORY);
    expect(md).toContain('### AC1');
    expect(md).toContain('### AC2');
    expect(md).toContain('### AC3');
    expect(md).toContain('**Given**');
    expect(md).toContain('**When**');
    expect(md).toContain('**Then**');
  });

  it('serializes modules as YAML list', () => {
    const md = draftToMarkdown(DEMO_STORY);
    expect(md).toContain('modules:');
    expect(md).toContain('  - frontend');
    expect(md).toContain('  - docs');
  });
});

describe('Round-trip: draft → md → draft', () => {
  it('preserves all scalar front-matter fields', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    expect(draft.id).toBe(DEMO_STORY.id);
    expect(draft.slug).toBe(DEMO_STORY.slug);
    expect(draft.title).toBe(DEMO_STORY.title);
    expect(draft.status).toBe(DEMO_STORY.status);
    expect(draft.created).toBe(DEMO_STORY.created);
    expect(draft.updated).toBe(DEMO_STORY.updated);
    expect(draft.owner).toBe(DEMO_STORY.owner);
  });

  it('preserves modules', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    expect(draft.modules).toEqual([...DEMO_STORY.modules]);
  });

  it('preserves non-empty prose sections', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    expect(draft.sections.bg).toBe(DEMO_STORY.sections.bg);
    expect(draft.sections.bv).toBe(DEMO_STORY.sections.bv);
    expect(draft.sections.si).toBe(DEMO_STORY.sections.si);
  });

  it('preserves empty optional sections as empty string', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    expect(draft.sections.so).toBe('');
    expect(draft.sections.oq).toBe('');
    expect(draft.sections.no).toBe('');
  });

  it('preserves AC count and ids', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    expect(draft.ac.length).toBe(DEMO_STORY.ac.length);
    expect(draft.ac[0].id).toBe('AC1');
    expect(draft.ac[1].id).toBe('AC2');
  });

  it('preserves complete AC fields', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { draft } = markdownToDraft(md, DEMO_STORY);
    const ac1 = draft.ac.find((a) => a.id === 'AC1')!;
    expect(ac1.title).toBe(DEMO_STORY.ac[0].title);
    expect(ac1.given).toBe(DEMO_STORY.ac[0].given);
    expect(ac1.when).toBe(DEMO_STORY.ac[0].when);
    expect(ac1.then).toBe(DEMO_STORY.ac[0].then);
  });

  it('produces no warnings on a well-formed draft', () => {
    const md = draftToMarkdown(DEMO_STORY);
    const { warnings } = markdownToDraft(md, DEMO_STORY);
    expect(warnings).toHaveLength(0);
  });
});

describe('Round-trip: md → draft → md (AC2 — byte-identical markdown)', () => {
  it('second leg produces byte-identical markdown', () => {
    const md1 = draftToMarkdown(DEMO_STORY);
    const { draft: draft2 } = markdownToDraft(md1, DEMO_STORY);
    const md2 = draftToMarkdown(draft2);
    expect(md2).toBe(md1);
  });
});

describe('markdownToDraft warnings', () => {
  it('warns when Background heading is missing', () => {
    const md = draftToMarkdown(DEMO_STORY).replace('## Background\n', '');
    const { warnings } = markdownToDraft(md, DEMO_STORY);
    expect(warnings.some((w) => w.includes('Background'))).toBe(true);
  });
});
