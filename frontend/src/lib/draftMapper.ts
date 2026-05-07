// UI-014f — O1: Mapping between StoryDraft (TS) and Go backend payload.
// Always use these functions instead of inline mapping — the key mapping
// `sections.no → "notes"` must be applied consistently.

import type { StoryDraft } from '@/components/spdd/types';

/** Shape expected by all Go bindings that accept a draft payload. */
export type GoPayload = Record<string, unknown>;

/**
 * Maps a StoryDraft to the JSON shape expected by the Go backend.
 *
 * Key differences from the TS type:
 * - `sections.no` → `sections.notes` (Go uses the full key)
 * - `savedAt: null` → `savedAt: undefined` (Wails omits undefined fields)
 * - All readonly arrays converted to mutable arrays
 */
export function draftToGoPayload(draft: StoryDraft): GoPayload {
  const { no, ...otherSections } = draft.sections;
  const goSections: Record<string, string> = { ...otherSections };
  if (no !== undefined) {
    goSections['notes'] = no;
  }

  return {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    status: draft.status,
    created: draft.created,
    updated: draft.updated,
    owner: draft.owner,
    modules: [...draft.modules],
    sections: goSections,
    ac: draft.ac.map((c) => ({ ...c })),
    savedAt: draft.savedAt ?? undefined,
  };
}

/**
 * Maps a Go backend draft payload back to a StoryDraft.
 * Inverse of draftToGoPayload.
 */
export function mapGoToDraft(payload: GoPayload): StoryDraft {
  const rawSections = (payload.sections ?? {}) as Record<string, string>;
  const { notes, ...otherSections } = rawSections;
  const sections = {
    bg: otherSections.bg ?? '',
    bv: otherSections.bv ?? '',
    si: otherSections.si ?? '',
    so: otherSections.so ?? '',
    oq: otherSections.oq ?? '',
    no: notes ?? '',
  };

  return {
    id: (payload.id as string) ?? '',
    slug: (payload.slug as string) ?? '',
    title: (payload.title as string) ?? '',
    status: (payload.status as StoryDraft['status']) ?? 'draft',
    created: (payload.created as string) ?? '',
    updated: (payload.updated as string) ?? '',
    owner: (payload.owner as string) ?? '',
    modules: Array.isArray(payload.modules) ? (payload.modules as string[]) : [],
    sections,
    ac: Array.isArray(payload.ac)
      ? (payload.ac as Array<Record<string, string>>).map((c) => ({
          id: c.id ?? '',
          title: c.title ?? '',
          given: c.given ?? '',
          when: c.when ?? '',
          then: c.then ?? '',
        }))
      : [],
    savedAt: (payload.savedAt as string | null) ?? null,
  };
}
