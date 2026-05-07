// UI-014d — Mock LLM: 4 trivial text transformations with simulated delay.
// No network call — pure client-side, used until CORE-008 wires the real provider.

export type AiActionType = 'improve' | 'enrich' | 'rephrase' | 'shorten';

export const AI_ACTIONS: Array<{
  type: AiActionType;
  label: string;
  shortcut: string;
}> = [
  { type: 'improve', label: 'Améliorer la lisibilité', shortcut: '⌘1' },
  { type: 'enrich',  label: 'Enrichir',                shortcut: '⌘2' },
  { type: 'rephrase', label: 'Reformuler',             shortcut: '⌘3' },
  { type: 'shorten', label: 'Raccourcir',              shortcut: '⌘4' },
];

// Simple word-substitution table for the "improve" action
const SYNONYMS: Array<[RegExp, string]> = [
  [/\brapide(ment)?\b/gi, 'efficace'],
  [/\blent(ement)?\b/gi, 'laborieux'],
  [/\bdifficile(ment)?\b/gi, 'complexe'],
  [/\bfaire\b/gi, 'réaliser'],
  [/\bvoir\b/gi, 'constater'],
  [/\bgrand(e)?\b/gi, 'conséquent'],
  [/\bpetit(e)?\b/gi, 'limité'],
  [/\bproblème\b/gi, 'friction'],
  [/\bsujet\b/gi, 'sensible'],
  [/\bbonne\b/gi, 'optimale'],
];

const FILLER_WORDS =
  /\b(vraiment|très|plutôt|assez|simplement|évidemment|facilement|rapidement|actuellement|notamment|souvent|toujours|jamais)\b\s*/gi;

export function mockLlm(action: AiActionType, text: string): string {
  switch (action) {
    case 'improve': {
      let result = text;
      for (const [re, sub] of SYNONYMS) {
        result = result.replace(re, sub);
      }
      if (result.trim() === text.trim()) {
        // Fallback: append a short clarifying phrase
        result = text.replace(/\.?\s*$/, ', ce qui facilite la collaboration entre équipes.');
      }
      return result;
    }
    case 'enrich':
      return (
        text.trimEnd() +
        " Cette friction freine l'adoption et allonge les cycles de revue."
      );
    case 'rephrase': {
      // Split on sentence-ending punctuation
      const sentences = text.split(/(?<=[.!?])\s+/);
      if (sentences.length >= 2) {
        return [...sentences.slice(1), ...sentences.slice(0, 1)].join(' ');
      }
      // Fall back: swap two halves at word level
      const words = text.split(/\s+/);
      const mid = Math.floor(words.length / 2);
      return [...words.slice(mid), ...words.slice(0, mid)].join(' ');
    }
    case 'shorten':
      return text.replace(FILLER_WORDS, ' ').replace(/\s{2,}/g, ' ').trim();
  }
}

/** Simulated delay: 1500–2500ms */
export function mockDelay(): Promise<void> {
  const ms = 1500 + Math.random() * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
