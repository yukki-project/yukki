// UI-014h O13 — Tests pour computeDivergence + divergenceWarnings.

import { describe, it, expect } from 'vitest';
import { computeDivergence, divergenceWarnings } from '@/lib/templateDivergence';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

const tmpl: ParsedTemplate = {
  fmSpecs: [],
  sections: [
    { heading: 'Background', widget: 'textarea', required: true, help: '' },
    { heading: 'Business Value', widget: 'textarea', required: true, help: '' },
    { heading: 'Scope Out', widget: 'textarea', required: false, help: '' },
  ],
};

describe('computeDivergence', () => {
  it('détecte les sections requises absentes du fichier (presentInFile=false)', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        { heading: 'Background', widget: 'textarea', content: '', acs: [], presentInFile: false },
        { heading: 'Business Value', widget: 'textarea', content: 'rempli', acs: [], presentInFile: true },
        { heading: 'Scope Out', widget: 'textarea', content: '', acs: [], presentInFile: false },
      ],
    };
    const div = computeDivergence(editState, tmpl);
    expect(div.missingRequired).toEqual(['Background']);
    expect(div.orphanSections).toEqual([]);
  });

  it('ne signale pas une required vide mais présente dans le fichier', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        { heading: 'Background', widget: 'textarea', content: '', acs: [], presentInFile: true },
        { heading: 'Business Value', widget: 'textarea', content: '', acs: [], presentInFile: true },
        { heading: 'Scope Out', widget: 'textarea', content: '', acs: [], presentInFile: false },
      ],
    };
    const div = computeDivergence(editState, tmpl);
    expect(div.missingRequired).toEqual([]);
  });

  it('détecte les sections orphelines (présentes dans le fichier mais pas dans le template)', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        { heading: 'Background', widget: 'textarea', content: 'x', acs: [], presentInFile: true },
        { heading: 'Business Value', widget: 'textarea', content: 'y', acs: [], presentInFile: true },
        { heading: 'Section custom', widget: 'textarea', content: 'z', acs: [], presentInFile: true },
      ],
    };
    const div = computeDivergence(editState, tmpl);
    expect(div.orphanSections).toEqual(['Section custom']);
  });

  it('match heading case-insensitive pour les required', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        { heading: 'background', widget: 'textarea', content: 'x', acs: [], presentInFile: true },
        { heading: 'business value', widget: 'textarea', content: 'y', acs: [], presentInFile: true },
      ],
    };
    const div = computeDivergence(editState, tmpl);
    expect(div.missingRequired).toEqual([]);
  });

  it('aucune divergence quand tout est présent', () => {
    const editState: EditState = {
      fmValues: {},
      sections: [
        { heading: 'Background', widget: 'textarea', content: '', acs: [], presentInFile: true },
        { heading: 'Business Value', widget: 'textarea', content: '', acs: [], presentInFile: true },
        { heading: 'Scope Out', widget: 'textarea', content: '', acs: [], presentInFile: true },
      ],
    };
    const div = computeDivergence(editState, tmpl);
    expect(div).toEqual({ missingRequired: [], orphanSections: [] });
  });
});

describe('divergenceWarnings', () => {
  it('produit un message par section requise absente', () => {
    const warnings = divergenceWarnings({
      missingRequired: ['Background', 'Scope In'],
      orphanSections: [],
    });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('Background');
    expect(warnings[0]).toContain('absente');
    expect(warnings[1]).toContain('Scope In');
  });

  it('renvoie tableau vide si pas de divergence required', () => {
    const warnings = divergenceWarnings({ missingRequired: [], orphanSections: [] });
    expect(warnings).toEqual([]);
  });

  it("ignore les orphan sections (pas de warning généré)", () => {
    const warnings = divergenceWarnings({
      missingRequired: [],
      orphanSections: ['Section custom'],
    });
    expect(warnings).toEqual([]);
  });
});
