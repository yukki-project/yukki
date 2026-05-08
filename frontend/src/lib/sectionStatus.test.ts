// UI-014h O12 — Tests pour sectionStatus helpers (chemin générique).

import { describe, it, expect } from 'vitest';
import {
  isSectionFilled,
  genericProgress,
  genericSectionStatus,
} from '@/lib/sectionStatus';
import type { SectionState, EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

const textareaSection = (heading: string, content: string): SectionState => ({
  heading,
  widget: 'textarea',
  content,
  acs: [],
  presentInFile: true,
});

const acSection = (heading: string, complete: boolean): SectionState => ({
  heading,
  widget: 'ac-cards',
  content: '',
  acs: complete
    ? [{ id: 'AC1', title: 'titre', given: 'g', when: 'w', then: 't' }]
    : [{ id: 'AC1', title: '', given: '', when: '', then: '' }],
  presentInFile: true,
});

describe('isSectionFilled', () => {
  it('textarea avec contenu non vide → filled', () => {
    expect(isSectionFilled(textareaSection('A', 'du contenu'))).toBe(true);
  });

  it('textarea vide ou whitespace → not filled', () => {
    expect(isSectionFilled(textareaSection('A', ''))).toBe(false);
    expect(isSectionFilled(textareaSection('A', '   \n  '))).toBe(false);
  });

  it('ac-cards sans AC → not filled', () => {
    const s: SectionState = {
      heading: 'AC',
      widget: 'ac-cards',
      content: '',
      acs: [],
      presentInFile: true,
    };
    expect(isSectionFilled(s)).toBe(false);
  });

  it('ac-cards avec AC complets → filled', () => {
    expect(isSectionFilled(acSection('AC', true))).toBe(true);
  });

  it('ac-cards avec AC incomplets → not filled', () => {
    expect(isSectionFilled(acSection('AC', false))).toBe(false);
  });
});

describe('genericProgress', () => {
  const tmpl: ParsedTemplate = {
    fmSpecs: [],
    sections: [
      { heading: 'A', widget: 'textarea', required: true, help: '' },
      { heading: 'B', widget: 'textarea', required: false, help: '' },
      { heading: 'C', widget: 'textarea', required: true, help: '' },
    ],
  };

  it('compte les required completed et liste les missing', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        textareaSection('A', 'rempli'),
        textareaSection('B', ''),
        textareaSection('C', ''),
      ],
    };
    const result = genericProgress(editState, tmpl);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.missing).toEqual(['C']);
  });

  it('renvoie 0/0 si aucun required dans le template', () => {
    const tmplOptional: ParsedTemplate = {
      fmSpecs: [],
      sections: [
        { heading: 'A', widget: 'textarea', required: false, help: '' },
      ],
    };
    const editState: EditState = {
      fmValues: {},
      sections: [textareaSection('A', '')],
    };
    const result = genericProgress(editState, tmplOptional);
    expect(result).toEqual({ completed: 0, total: 0, missing: [] });
  });

  it('match heading case-insensitive', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        textareaSection('a', 'rempli'),
        textareaSection('B', 'rempli'),
        textareaSection('c', 'rempli'),
      ],
    };
    const result = genericProgress(editState, tmpl);
    expect(result.completed).toBe(2);
    expect(result.missing).toEqual([]);
  });
});

describe('genericSectionStatus', () => {
  it('required + filled → done', () => {
    expect(genericSectionStatus(textareaSection('A', 'x'), true)).toBe('done');
  });
  it('required + empty → todo', () => {
    expect(genericSectionStatus(textareaSection('A', ''), true)).toBe('todo');
  });
  it('not required + filled → optional-filled', () => {
    expect(genericSectionStatus(textareaSection('A', 'x'), false)).toBe('optional-filled');
  });
  it('not required + empty → optional', () => {
    expect(genericSectionStatus(textareaSection('A', ''), false)).toBe('optional');
  });
});
