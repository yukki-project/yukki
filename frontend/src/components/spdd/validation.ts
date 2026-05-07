// UI-014b — Client-side validation rules for the front-matter fields.
// All rules are pure functions that return null on success or an error
// message string on failure. Messages must say *why* and *how to fix*.

import type { StoryDraft } from './types';

const ID_RE = /^[A-Z]+-\d+$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const VALID_STATUSES = [
  'draft',
  'reviewed',
  'accepted',
  'implemented',
  'synced',
] as const;

export type FmField = keyof Omit<StoryDraft, 'sections' | 'ac' | 'savedAt'>;

type FmValidator = (value: string) => string | null;

export const FM_VALIDATORS: Partial<Record<FmField, FmValidator>> = {
  id: (v) =>
    ID_RE.test(v.trim())
      ? null
      : "L'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042). Préfixe en majuscules, un tiret, des chiffres.",
  slug: (v) =>
    SLUG_RE.test(v.trim())
      ? null
      : 'Le slug doit être en kebab-case (minuscules, chiffres, tirets). Ex. guided-story-editor.',
  status: (v) =>
    (VALID_STATUSES as readonly string[]).includes(v.trim())
      ? null
      : `Le statut doit être l'un des suivants : ${VALID_STATUSES.join(', ')}.`,
  created: (v) =>
    DATE_RE.test(v.trim())
      ? null
      : 'La date doit être au format ISO YYYY-MM-DD. Ex. 2026-05-07.',
  updated: (v) =>
    DATE_RE.test(v.trim())
      ? null
      : 'La date doit être au format ISO YYYY-MM-DD. Ex. 2026-05-07.',
  owner: (v) =>
    v.trim().length > 0 ? null : "Le champ owner ne peut pas être vide.",
  title: (v) =>
    v.trim().length > 0 ? null : 'Le titre ne peut pas être vide.',
};

export function validateFmField(field: FmField, value: string): string | null {
  const fn = FM_VALIDATORS[field];
  return fn ? fn(value) : null;
}
