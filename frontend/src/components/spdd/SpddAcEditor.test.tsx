// UI-014h O8 — Tests SpddAcEditor avec props API parallèle (chemin template-driven).
// Le chemin legacy story (sans props) reste couvert via store ; ces tests
// vérifient uniquement que la nouvelle API props ne casse rien et propage
// les mutations vers onItemsChange sans toucher au store.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpddAcEditor } from './SpddAcEditor';
import type { GenericAc } from './types';

const mkAc = (id: string, partial: Partial<GenericAc> = {}): GenericAc => ({
  id,
  title: '',
  given: '',
  when: '',
  then: '',
  ...partial,
});

describe('SpddAcEditor — props API (UI-014h O8)', () => {
  it('rend les items fournis par props', () => {
    const items: GenericAc[] = [
      mkAc('AC1', { title: 'Premier AC', given: 'g1', when: 'w1', then: 't1' }),
      mkAc('AC2', { title: 'Second', given: 'g2', when: 'w2', then: 't2' }),
    ];
    render(<SpddAcEditor items={items} onItemsChange={() => {}} />);
    expect(screen.getByDisplayValue('Premier AC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Second')).toBeInTheDocument();
    expect(screen.getByText('AC1')).toBeInTheDocument();
    expect(screen.getByText('AC2')).toBeInTheDocument();
  });

  it('clic Ajouter appelle onItemsChange avec un nouvel AC', () => {
    const onChange = vi.fn();
    render(<SpddAcEditor items={[]} onItemsChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /ajouter un ac/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      { id: 'AC1', title: '', given: '', when: '', then: '' },
    ]);
  });

  it('édition du titre propage via onItemsChange', () => {
    const onChange = vi.fn();
    const items: GenericAc[] = [mkAc('AC1', { title: 'origine' })];
    render(<SpddAcEditor items={items} onItemsChange={onChange} />);
    const input = screen.getByDisplayValue('origine');
    fireEvent.change(input, { target: { value: 'modifié' } });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'AC1', title: 'modifié' }),
    ]);
  });

  it('clic supprimer renumérote les AC restants', () => {
    const onChange = vi.fn();
    const items: GenericAc[] = [
      mkAc('AC1', { title: 'a' }),
      mkAc('AC2', { title: 'b' }),
      mkAc('AC3', { title: 'c' }),
    ];
    render(<SpddAcEditor items={items} onItemsChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Supprimer AC2'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'AC1', title: 'a' }),
      expect.objectContaining({ id: 'AC2', title: 'c' }),
    ]);
  });

  it('readOnly désactive les inputs et masque les actions', () => {
    const onChange = vi.fn();
    const items: GenericAc[] = [mkAc('AC1', { title: 'fixe' })];
    render(<SpddAcEditor items={items} onItemsChange={onChange} readOnly />);
    const input = screen.getByDisplayValue('fixe') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(screen.queryByLabelText('Supprimer AC1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dupliquer AC1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter un ac/i })).not.toBeInTheDocument();
  });
});
