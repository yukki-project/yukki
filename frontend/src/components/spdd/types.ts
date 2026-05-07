// UI-014a — Domain types for the SPDD editor.

export type SectionKey = 'fm' | 'bg' | 'bv' | 'si' | 'so' | 'ac' | 'oq' | 'no';

export type SectionStatus =
  | 'done'      // required + filled
  | 'todo'      // required + empty
  | 'optional'  // not required (with or without content for UI-014a)
  | 'error'     // required + filled but invalid (UI-014b will produce these)
  | 'active';   // current section in focus

export interface SpddSection {
  readonly key: SectionKey;
  readonly label: string;
  readonly required: boolean;
}

export interface MockAcceptanceCriterion {
  readonly id: string; // 'AC1', 'AC2', …
  readonly title: string;
  readonly given: string;
  readonly when: string;
  readonly then: string;
}

export type StoryStatus =
  | 'draft'
  | 'reviewed'
  | 'accepted'
  | 'implemented'
  | 'synced';

export type ProseSectionKey = Exclude<SectionKey, 'fm' | 'ac'>;

export interface StoryDraft {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: StoryStatus;
  readonly created: string; // ISO 8601 date
  readonly updated: string;
  readonly owner: string;
  readonly modules: readonly string[];
  readonly sections: Readonly<Record<ProseSectionKey, string>>;
  readonly ac: readonly MockAcceptanceCriterion[];
  readonly savedAt: string | null; // ISO timestamp ; null = never saved
}

export type ViewMode = 'wysiwyg' | 'markdown';

export type InspectorContext =
  | { kind: 'fm' }
  | { kind: 'prose'; section: ProseSectionKey }
  | { kind: 'ac' };
