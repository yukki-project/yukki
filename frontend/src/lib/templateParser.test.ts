// UI-014h — Tests pour detectArtifactTypeFromPath et templatePathFor
// UI-014h O11 — Tests pour annotations <!-- spdd: required help="..." --> sur SectionSpec
import { describe, it, expect } from 'vitest';
import {
  detectArtifactTypeFromPath,
  parseTemplate,
  templatePathFor,
} from '@/lib/templateParser';

describe('detectArtifactTypeFromPath', () => {
  it('détecte story depuis .yukki/stories/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/stories/UI-014h-foo.md')).toBe('story');
  });

  it('détecte analysis depuis .yukki/analysis/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/analysis/UI-014h-foo.md')).toBe('analysis');
  });

  it('détecte canvas depuis .yukki/prompts/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/prompts/UI-014h-foo.md')).toBe('canvas');
  });

  it('détecte inbox depuis .yukki/inbox/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/inbox/INBOX-001.md')).toBe('inbox');
  });

  it('détecte epic depuis .yukki/epics/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/epics/EPIC-001.md')).toBe('epic');
  });

  it('fonctionne avec backslashes Windows', () => {
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\stories\\UI-014h.md')).toBe('story');
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\analysis\\UI-014h.md')).toBe('analysis');
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\prompts\\UI-014h.md')).toBe('canvas');
  });

  it('retourne story pour répertoire inconnu (fallback prefix)', () => {
    // UI-014h → préfixe UI → story (fallback)
    expect(detectArtifactTypeFromPath('C:/workspace/foo/UI-014h.md')).toBe('story');
  });
});

describe('templatePathFor', () => {
  it('retourne le chemin template pour story (slash Unix)', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/stories/UI-014h-foo.md',
      'story',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/story.md');
  });

  it('retourne le chemin template pour inbox', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/inbox/INBOX-001.md',
      'inbox',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/inbox.md');
  });

  it('retourne le chemin template pour epic', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/epics/EPIC-001.md',
      'epic',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/epic.md');
  });

  it('retourne le chemin template pour analysis', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/analysis/UI-014h.md',
      'analysis',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/analysis.md');
  });

  it('retourne le chemin template pour canvas (canvas-reasons)', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/prompts/UI-014h.md',
      'canvas',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/canvas-reasons.md');
  });

  it('retourne null quand le chemin ne contient pas .yukki/', () => {
    expect(templatePathFor('C:/workspace/random/UI-014h.md', 'story')).toBeNull();
  });

  it('fonctionne avec backslashes Windows', () => {
    const result = templatePathFor(
      'C:\\workspace\\.yukki\\stories\\UI-014h.md',
      'story',
    );
    expect(result).toBe('C:\\workspace\\.yukki\\templates\\story.md');
  });
});

// ─── O11 — Annotations spdd: required help="..." ─────────────────────────

describe('parseTemplate — annotations sections (O11)', () => {
  it('détecte required + help sur une section annotée', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## Background
<!-- spdd: required help="Pose le décor." -->

<placeholder>
`);
    const bg = tmpl.sections.find((s) => s.heading === 'Background');
    expect(bg?.required).toBe(true);
    expect(bg?.help).toBe('Pose le décor.');
  });

  it('détecte help sans required (section optionnelle)', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## Notes
<!-- spdd: help="Liens utiles." -->

<placeholder>
`);
    const notes = tmpl.sections.find((s) => s.heading === 'Notes');
    expect(notes?.required).toBe(false);
    expect(notes?.help).toBe('Liens utiles.');
  });

  it('défaut required=false help="" sans annotation', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## Section sans annotation

contenu
`);
    const s = tmpl.sections.find((s) => s.heading === 'Section sans annotation');
    expect(s?.required).toBe(false);
    expect(s?.help).toBe('');
  });

  it('ignore les commentaires non-spdd', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## Background
<!-- juste un commentaire -->

contenu
`);
    const bg = tmpl.sections.find((s) => s.heading === 'Background');
    expect(bg?.required).toBe(false);
    expect(bg?.help).toBe('');
  });

  it('annotation ignorée si placée après le contenu', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## Background

contenu
<!-- spdd: required help="trop tard" -->
`);
    const bg = tmpl.sections.find((s) => s.heading === 'Background');
    expect(bg?.required).toBe(false);
    expect(bg?.help).toBe('');
  });

  it("ne pollue pas la première section avec le préambule (# <titre>)", () => {
    // Régression : avant le fix, la `# <titre>` H1 entre frontmatter et premier `##`
    // restait accumulée dans currentContent et masquait l'annotation.
    const tmpl = parseTemplate(`---
id: <ID>
---

# <titre>

## Background
<!-- spdd: required help="aide BG" -->

contenu
`);
    const bg = tmpl.sections.find((s) => s.heading === 'Background');
    expect(bg?.required).toBe(true);
    expect(bg?.help).toBe('aide BG');
  });

  it('plusieurs sections, annotations indépendantes', () => {
    const tmpl = parseTemplate(`---
id: <ID>
---

## A
<!-- spdd: required help="aide A" -->

contenu A

## B

contenu B sans annotation

## C
<!-- spdd: help="aide C, optionnel" -->

contenu C
`);
    expect(tmpl.sections.find((s) => s.heading === 'A')?.required).toBe(true);
    expect(tmpl.sections.find((s) => s.heading === 'A')?.help).toBe('aide A');
    expect(tmpl.sections.find((s) => s.heading === 'B')?.required).toBe(false);
    expect(tmpl.sections.find((s) => s.heading === 'B')?.help).toBe('');
    expect(tmpl.sections.find((s) => s.heading === 'C')?.required).toBe(false);
    expect(tmpl.sections.find((s) => s.heading === 'C')?.help).toBe('aide C, optionnel');
  });
});

describe('parseTemplate — FrontmatterSpec champs O11', () => {
  it('FM specs ont required=true et help="" par défaut', () => {
    const tmpl = parseTemplate(`---
id: <ID>
status: draft  # draft | reviewed
---

## Section
`);
    const idSpec = tmpl.fmSpecs.find((s) => s.key === 'id');
    expect(idSpec?.required).toBe(true);
    expect(idSpec?.help).toBe('');
    const statusSpec = tmpl.fmSpecs.find((s) => s.key === 'status');
    expect(statusSpec?.required).toBe(true);
    expect(statusSpec?.help).toBe('');
  });
});
