// UI-015 — Round-trip tests for templateParser + genericSerializer.
// Validates that parseArtifactContent(serializeArtifact(state)) ≈ state
// for story and inbox artifact types.

import { describe, expect, it } from 'vitest';
import { parseTemplate } from '@/lib/templateParser';
import { parseArtifactContent, serializeArtifact } from '@/lib/genericSerializer';
import type { EditState } from '@/lib/genericSerializer';

// ─── Template fixtures (minimal, self-contained) ──────────────────────────

const STORY_TEMPLATE = `---
id: <ID>
slug: <kebab-case-slug>
title: <titre court>
status: draft  # draft | reviewed | accepted | implemented | synced
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
owner: <nom>
modules:
---

# <titre>

## Background

<Pourquoi cette story existe.>

## Business Value

<À qui ça sert.>

## Scope In

- <ce qui est dans le périmètre>

## Scope Out

- <ce qui est exclu>

## Acceptance Criteria

> Format Given / When / Then.

### AC1 — <titre>

- **Given** <contexte>
- **When** <action>
- **Then** <résultat>

## Open Questions

- [ ] <question>

## Notes

<Liens, contexte.>
`;

const INBOX_TEMPLATE = `---
id: INBOX-<NNN>
slug: <kebab-case-slug>
title: <titre court>
status: unsorted  # unsorted | promoted | rejected
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
promoted-to: ~
---

# <titre>

## Idée

<1 paragraphe — capture brute.>

## Notes

<source — Slack, ticket, brainstorm.>
`;

const EPIC_TEMPLATE = `---
id: EPIC-<NNN>
slug: <kebab-case-slug>
title: <titre court>
status: draft  # draft | in-progress | mature | done
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
child-stories: []
---

# <titre>

## Vision

<1-3 phrases.>

## Acceptance Criteria (haut niveau)

> Critères mesurables au niveau epic.

- <critère mesurable>

## Notes

<contexte produit.>
`;

// ─── Sample artifact fixtures ─────────────────────────────────────────────

const SAMPLE_STORY_MD = `---
id: UI-015
slug: template-driven-artifact-editor
title: "Mode édition structuré"
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
  - .yukki/templates/
---

# Mode édition structuré

## Background

StoryViewer affiche les artefacts en lecture.

## Business Value

Permettre d'éditer n'importe quel artefact.

## Scope In

- Remplacement du textarea brut

## Scope Out

- Éditeur de templates

## Acceptance Criteria

### AC1 — Le mode édition affiche un formulaire

- **Given** un artefact est sélectionné
- **When** l'utilisateur clique sur Edit
- **Then** le panneau bascule en mode édition

### AC2 — Les sections sont dérivées du template

- **Given** le template inbox définit deux sections
- **When** l'utilisateur passe en mode édition
- **Then** l'éditeur affiche ces sections

## Open Questions

- [ ] Question en attente

## Notes

Liens vers tickets.
`;

const SAMPLE_INBOX_MD = `---
id: INBOX-001
slug: yukki-pdf-export
title: "Export PDF"
status: unsorted
created: 2026-05-07
updated: 2026-05-07
promoted-to: ~
---

# Export PDF

## Idée

Pouvoir exporter les artefacts en PDF.

## Notes

Source: brainstorm du 2026-05-07.
`;

// ─── parseTemplate tests ───────────────────────────────────────────────────

describe('parseTemplate — story template', () => {
  it('detects ac-cards widget for Acceptance Criteria section', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    const acSection = tmpl.sections.find((s) => s.heading === 'Acceptance Criteria');
    expect(acSection?.widget).toBe('ac-cards');
  });

  it('detects textarea widget for Background section', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    const bg = tmpl.sections.find((s) => s.heading === 'Background');
    expect(bg?.widget).toBe('textarea');
  });

  it('detects status field as select', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    const statusSpec = tmpl.fmSpecs.find((s) => s.key === 'status');
    expect(statusSpec?.widget).toBe('select');
    expect(statusSpec?.options).toContain('draft');
    expect(statusSpec?.options).toContain('reviewed');
  });

  it('detects created/updated as date fields', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    expect(tmpl.fmSpecs.find((s) => s.key === 'created')?.widget).toBe('date');
    expect(tmpl.fmSpecs.find((s) => s.key === 'updated')?.widget).toBe('date');
  });

  it('detects modules as tags field', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    expect(tmpl.fmSpecs.find((s) => s.key === 'modules')?.widget).toBe('tags');
  });

  it('produces correct section count', () => {
    const tmpl = parseTemplate(STORY_TEMPLATE);
    expect(tmpl.sections.length).toBe(7); // bg, bv, si, so, ac, oq, no
  });
});

describe('parseTemplate — inbox template', () => {
  it('has no ac-cards section', () => {
    const tmpl = parseTemplate(INBOX_TEMPLATE);
    expect(tmpl.sections.every((s) => s.widget === 'textarea')).toBe(true);
  });

  it('has exactly 2 sections', () => {
    const tmpl = parseTemplate(INBOX_TEMPLATE);
    expect(tmpl.sections.length).toBe(2);
    expect(tmpl.sections[0].heading).toBe('Idée');
    expect(tmpl.sections[1].heading).toBe('Notes');
  });

  it('detects status as select', () => {
    const tmpl = parseTemplate(INBOX_TEMPLATE);
    const statusSpec = tmpl.fmSpecs.find((s) => s.key === 'status');
    expect(statusSpec?.widget).toBe('select');
    expect(statusSpec?.options).toContain('unsorted');
    expect(statusSpec?.options).toContain('promoted');
  });
});

describe('parseTemplate — epic template (no ac-cards heuristic)', () => {
  it('does not trigger ac-cards on bullet-list AC section', () => {
    const tmpl = parseTemplate(EPIC_TEMPLATE);
    const acSection = tmpl.sections.find((s) =>
      s.heading.toLowerCase().includes('acceptance'),
    );
    // Epic AC section has bullet list without Given/When/Then → textarea
    expect(acSection?.widget).toBe('textarea');
  });
});

// ─── parseArtifactContent tests ───────────────────────────────────────────

describe('parseArtifactContent — story', () => {
  const tmpl = parseTemplate(STORY_TEMPLATE);

  it('extracts frontmatter values', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    expect(state.fmValues['id']).toBe('UI-015');
    expect(state.fmValues['status']).toBe('draft');
    expect(state.fmValues['owner']).toBe('Thibaut');
  });

  it('extracts modules as array', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    expect(Array.isArray(state.fmValues['modules'])).toBe(true);
    expect(state.fmValues['modules']).toContain('frontend');
  });

  it('extracts AC cards from Acceptance Criteria section', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const acSection = state.sections.find((s) => s.heading === 'Acceptance Criteria');
    expect(acSection?.widget).toBe('ac-cards');
    expect(acSection?.acs.length).toBe(2);
    expect(acSection?.acs[0].id).toBe('AC1');
    expect(acSection?.acs[0].given).toBe('un artefact est sélectionné');
    expect(acSection?.acs[0].when).toBe("l'utilisateur clique sur Edit");
    expect(acSection?.acs[0].then).toBe('le panneau bascule en mode édition');
  });

  it('extracts Background as textarea', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const bg = state.sections.find((s) => s.heading === 'Background');
    expect(bg?.widget).toBe('textarea');
    expect(bg?.content).toContain('StoryViewer');
  });
});

describe('parseArtifactContent — inbox', () => {
  const tmpl = parseTemplate(INBOX_TEMPLATE);

  it('extracts Idée and Notes as textareas', () => {
    const state = parseArtifactContent(SAMPLE_INBOX_MD, tmpl);
    expect(state.sections.length).toBe(2);
    expect(state.sections[0].heading).toBe('Idée');
    expect(state.sections[0].widget).toBe('textarea');
    expect(state.sections[1].heading).toBe('Notes');
  });

  it('has no ac-cards sections', () => {
    const state = parseArtifactContent(SAMPLE_INBOX_MD, tmpl);
    expect(state.sections.every((s) => s.widget === 'textarea')).toBe(true);
  });
});

// ─── Round-trip tests ─────────────────────────────────────────────────────

describe('Round-trip: story', () => {
  const tmpl = parseTemplate(STORY_TEMPLATE);

  it('preserves frontmatter id after round-trip', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    expect(state2.fmValues['id']).toBe('UI-015');
  });

  it('preserves AC count after round-trip', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    const acSection = state2.sections.find((s) => s.heading === 'Acceptance Criteria');
    expect(acSection?.acs.length).toBe(2);
  });

  it('preserves AC fields after round-trip', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    const acSection = state2.sections.find((s) => s.heading === 'Acceptance Criteria');
    expect(acSection?.acs[0].given).toBe('un artefact est sélectionné');
    expect(acSection?.acs[1].then).toBe("l'éditeur affiche ces sections");
  });

  it('renumbers ACs sequentially after adding', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const acIdx = state.sections.findIndex((s) => s.heading === 'Acceptance Criteria');
    const newAc = { id: 'AC99', title: 'New', given: 'g', when: 'w', then: 't' };
    const modifiedState: EditState = {
      ...state,
      sections: state.sections.map((s, i) =>
        i === acIdx ? { ...s, acs: [...s.acs, newAc] } : s,
      ),
    };
    const serialized = serializeArtifact(modifiedState, tmpl);
    expect(serialized).toContain('### AC3');
    expect(serialized).not.toContain('### AC99');
  });

  it('preserves Background text after round-trip', () => {
    const state = parseArtifactContent(SAMPLE_STORY_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    const bg = state2.sections.find((s) => s.heading === 'Background');
    expect(bg?.content).toContain('StoryViewer');
  });
});

describe('Round-trip: inbox', () => {
  const tmpl = parseTemplate(INBOX_TEMPLATE);

  it('preserves id and status', () => {
    const state = parseArtifactContent(SAMPLE_INBOX_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    expect(state2.fmValues['id']).toBe('INBOX-001');
    expect(state2.fmValues['status']).toBe('unsorted');
  });

  it('preserves Idée content', () => {
    const state = parseArtifactContent(SAMPLE_INBOX_MD, tmpl);
    const serialized = serializeArtifact(state, tmpl);
    const state2 = parseArtifactContent(serialized, tmpl);
    expect(state2.sections[0].content).toContain('Pouvoir exporter');
  });
});

describe('Fallback: empty template', () => {
  it('returns empty specs for empty template', () => {
    const tmpl = parseTemplate('');
    expect(tmpl.fmSpecs).toHaveLength(0);
    expect(tmpl.sections).toHaveLength(0);
  });
});
