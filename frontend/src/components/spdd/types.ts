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

// ─── AI assist (UI-014d) ──────────────────────────────────────────────────

export interface AiSelection {
  sectionKey: ProseSectionKey;
  text: string;
  /** Start char index within the section content */
  start: number;
  /** End char index (exclusive) within the section content */
  end: number;
}

export interface PopoverPosition {
  x: number;
  y: number;
}

export type AiPhase = 'idle' | 'popover' | 'generating' | 'diff';

export type InspectorContext =
  | { kind: 'fm' }
  | { kind: 'prose'; section: ProseSectionKey }
  | { kind: 'ac' };

// ─── UI-014g — Generic template-driven editor ──────────────────────────────

export type SectionWidget = 'textarea' | 'ac-cards';
export type FrontmatterWidget = 'text' | 'date' | 'select' | 'tags';

export interface SectionSpec {
  heading: string;
  widget: SectionWidget;
  /** UI-014h O11 — section requise (rempli par annotation `<!-- spdd: required -->`). */
  required: boolean;
  /** UI-014h O11 — texte d aide affiche dans l Inspector (annotation `help="..."`). */
  help: string;
}

export interface FrontmatterSpec {
  key: string;
  widget: FrontmatterWidget;
  options?: string[]; // defined when widget === 'select'
  /** UI-014h O11 — champ requis (defaults to true pour FM jusqu a annotations FM dediees). */
  required: boolean;
  /** UI-014h O11 — texte d aide pour le champ FM (vide jusqu a annotations FM dediees). */
  help: string;
}

export interface GenericAc {
  id: string;    // 'AC1', 'AC2', …
  title: string;
  given: string;
  when: string;
  then: string;
}
