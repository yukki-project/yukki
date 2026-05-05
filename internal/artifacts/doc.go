// Package artifacts is part of yukki's business core: callable from
// the CLI (root cmd), the Wails UI (internal/uiapp), and the (future)
// MCP server (INT-002). It must not import cobra, wails, or any
// UI-specific package — enforced statically by the `core-isolation`
// depguard rule in .golangci.yml.
//
// The package owns the writing of SPDD artifacts (stories, analyses,
// canvases) on disk: id calculation, slug generation, atomic-rename
// writer with frontmatter validation.
//
// Invariants:
//   - Writer.Write is atomic via temp-then-rename. A malformed file
//     is never left in the final location: ValidateFrontmatter runs
//     before the rename and any failure aborts before the move.
//   - NextID is monotonic per prefix: the returned id is strictly
//     greater than the largest existing id for the same prefix in
//     the target directory.
//   - Slugify is deterministic and idempotent: Slugify(Slugify(s)) ==
//     Slugify(s) for any string s.
//   - ListArtifacts is read-only and never modifies any file.
//     A corrupted frontmatter never aborts the scan; the offending
//     entry carries the error in Meta.Error.
//   - No global state. Each Writer instance is bound to a single
//     output directory.
//
// See .yukki/stories/CORE-002-isolate-business-core.md for the rationale
// of this isolation.
package artifacts
