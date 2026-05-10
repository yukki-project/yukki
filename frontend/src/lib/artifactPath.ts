// UI-023 — helpers for extracting the artifact kind from an
// absolute path. Mirrors the values returned by
// `AllowedKinds()` in internal/artifacts/lister.go (single source
// of truth on the Go side, kept in sync manually).

const ALLOWED_KINDS = [
  'stories',
  'analysis',
  'prompts',
  'tests',
  'inbox',
  'epics',
  'roadmap',
] as const;

export type ArtifactKind = (typeof ALLOWED_KINDS)[number];

/**
 * Extracts the artifact kind from an absolute (or relative) path
 * pointing under `.yukki/<kind>/...`. Returns null if the path does
 * not match any kind directory or sits outside `.yukki/`.
 *
 * Tolerates both forward and back slashes for cross-platform
 * compatibility (Windows paths from Wails come with backslashes).
 *
 * Examples :
 *   "C:/w/.yukki/stories/UI-001.md"  → "stories"
 *   "/home/u/proj/.yukki/inbox/X.md" → "inbox"
 *   "/home/u/proj/.yukki/templates/story.md" → null (templates is
 *     not a kind, it's a sibling of the kind directories)
 */
export function artifactKindFromPath(absolutePath: string): ArtifactKind | null {
  const normalized = absolutePath.replace(/\\/g, '/');
  for (const kind of ALLOWED_KINDS) {
    if (normalized.includes(`/.yukki/${kind}/`)) {
      return kind;
    }
  }
  return null;
}
