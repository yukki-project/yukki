// UI-014h O9 — Tests SpddFmForm avec props API parallèle (chemin template-driven).
// Le mode legacy story (sans props) reste couvert via store ; ces tests
// valident uniquement la nouvelle API fmSpecs/values/onValuesChange.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpddFmForm } from './SpddFmForm';
import type { FrontmatterSpec } from './types';

const stringSpec: FrontmatterSpec = { key: 'id', widget: 'text', required: true, help: '' };
const dateSpec: FrontmatterSpec = { key: 'created', widget: 'date', required: true, help: '' };
const selectSpec: FrontmatterSpec = {
  key: 'status',
  widget: 'select',
  options: ['draft', 'reviewed', 'accepted'],
  required: true,
  help: '',
};
const tagsSpec: FrontmatterSpec = { key: 'modules', widget: 'tags', required: false, help: '' };

describe('SpddFmForm — props API (UI-014h O9)', () => {
  it('rend un input text pour widget=text', () => {
    render(
      <SpddFmForm
        fmSpecs={[stringSpec]}
        values={{ id: 'INBOX-001' }}
        onValuesChange={() => {}}
      />,
    );
    const input = screen.getByDisplayValue('INBOX-001') as HTMLInputElement;
    expect(input.type).toBe('text');
  });

  it('rend un select pour widget=select avec les options', () => {
    render(
      <SpddFmForm
        fmSpecs={[selectSpec]}
        values={{ status: 'draft' }}
        onValuesChange={() => {}}
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('draft');
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'draft',
      'reviewed',
      'accepted',
    ]);
  });

  it('rend un input date pour widget=date', () => {
    const { container } = render(
      <SpddFmForm
        fmSpecs={[dateSpec]}
        values={{ created: '2026-05-08' }}
        onValuesChange={() => {}}
      />,
    );
    const date = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(date.value).toBe('2026-05-08');
  });

  it('rend des tags chips pour widget=tags', () => {
    render(
      <SpddFmForm
        fmSpecs={[tagsSpec]}
        values={{ modules: ['frontend', 'backend'] }}
        onValuesChange={() => {}}
      />,
    );
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
  });

  it('édition d\'un champ text propage via onValuesChange', () => {
    const onChange = vi.fn();
    render(
      <SpddFmForm fmSpecs={[stringSpec]} values={{ id: 'AAA' }} onValuesChange={onChange} />,
    );
    const input = screen.getByDisplayValue('AAA');
    fireEvent.change(input, { target: { value: 'BBB' } });
    expect(onChange).toHaveBeenCalledWith('id', 'BBB');
  });

  it('changement de select propage via onValuesChange', () => {
    const onChange = vi.fn();
    render(
      <SpddFmForm
        fmSpecs={[selectSpec]}
        values={{ status: 'draft' }}
        onValuesChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'reviewed' } });
    expect(onChange).toHaveBeenCalledWith('status', 'reviewed');
  });

  it('readOnly désactive les inputs et masque les boutons de retrait des tags', () => {
    const onChange = vi.fn();
    render(
      <SpddFmForm
        fmSpecs={[stringSpec, tagsSpec]}
        values={{ id: 'fixe', modules: ['frontend'] }}
        onValuesChange={onChange}
        readOnly
      />,
    );
    const input = screen.getByDisplayValue('fixe') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(screen.queryByLabelText('Retirer frontend')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('ajouter…')).not.toBeInTheDocument();
  });

  it('rend tous les fmSpecs dans l\'ordre', () => {
    render(
      <SpddFmForm
        fmSpecs={[stringSpec, dateSpec, selectSpec, tagsSpec]}
        values={{ id: 'INBOX-001', created: '2026-05-08', status: 'draft', modules: [] }}
        onValuesChange={() => {}}
      />,
    );
    const labels = Array.from(document.querySelectorAll('label')).map((l) => l.textContent);
    expect(labels).toEqual(['id', 'created', 'status', 'modules']);
  });
});
