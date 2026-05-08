// UI-014f — O8: AI action definitions, extracted from mockLlm.ts.
// These labels are stable and match the French terminology used in the SPDD
// section definitions. Imported by AiPopover, AiDiffPanel (formerly from mockLlm).

export type AiActionType = 'improve' | 'enrich' | 'rephrase' | 'shorten';

export const AI_ACTIONS: Array<{
  type: AiActionType;
  label: string;
  shortcut: string;
}> = [
  { type: 'improve',  label: 'Améliorer la lisibilité', shortcut: '⌘1' },
  { type: 'enrich',   label: 'Enrichir',                shortcut: '⌘2' },
  { type: 'rephrase', label: 'Reformuler',              shortcut: '⌘3' },
  { type: 'shorten',  label: 'Raccourcir',              shortcut: '⌘4' },
];
