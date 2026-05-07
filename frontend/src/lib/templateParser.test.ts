// UI-016 — Tests pour detectArtifactTypeFromPath et templatePathFor
import { describe, it, expect } from 'vitest';
import {
  detectArtifactTypeFromPath,
  templatePathFor,
} from '@/lib/templateParser';

describe('detectArtifactTypeFromPath', () => {
  it('détecte story depuis .yukki/stories/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/stories/UI-016-foo.md')).toBe('story');
  });

  it('détecte analysis depuis .yukki/analysis/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/analysis/UI-016-foo.md')).toBe('analysis');
  });

  it('détecte canvas depuis .yukki/prompts/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/prompts/UI-016-foo.md')).toBe('canvas');
  });

  it('détecte inbox depuis .yukki/inbox/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/inbox/INBOX-001.md')).toBe('inbox');
  });

  it('détecte epic depuis .yukki/epics/', () => {
    expect(detectArtifactTypeFromPath('C:/workspace/.yukki/epics/EPIC-001.md')).toBe('epic');
  });

  it('fonctionne avec backslashes Windows', () => {
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\stories\\UI-016.md')).toBe('story');
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\analysis\\UI-016.md')).toBe('analysis');
    expect(detectArtifactTypeFromPath('C:\\workspace\\.yukki\\prompts\\UI-016.md')).toBe('canvas');
  });

  it('retourne story pour répertoire inconnu (fallback prefix)', () => {
    // UI-016 → préfixe UI → story (fallback)
    expect(detectArtifactTypeFromPath('C:/workspace/foo/UI-016.md')).toBe('story');
  });
});

describe('templatePathFor', () => {
  it('retourne le chemin template pour story (slash Unix)', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/stories/UI-016-foo.md',
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
      'C:/workspace/.yukki/analysis/UI-016.md',
      'analysis',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/analysis.md');
  });

  it('retourne le chemin template pour canvas (canvas-reasons)', () => {
    const result = templatePathFor(
      'C:/workspace/.yukki/prompts/UI-016.md',
      'canvas',
    );
    expect(result).toBe('C:/workspace/.yukki/templates/canvas-reasons.md');
  });

  it('retourne null quand le chemin ne contient pas .yukki/', () => {
    expect(templatePathFor('C:/workspace/random/UI-016.md', 'story')).toBeNull();
  });

  it('fonctionne avec backslashes Windows', () => {
    const result = templatePathFor(
      'C:\\workspace\\.yukki\\stories\\UI-016.md',
      'story',
    );
    expect(result).toBe('C:\\workspace\\.yukki\\templates\\story.md');
  });
});
