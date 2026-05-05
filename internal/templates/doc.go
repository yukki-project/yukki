// Package templates is part of yukki's business core: callable from the
// CLI (root cmd), the Wails UI (internal/uiapp), and the (future) MCP
// server (INT-002). It must not import cobra, wails, or any UI-specific
// package — enforced statically by the `core-isolation` depguard rule
// in .golangci.yml.
//
// The package loads SPDD artifact templates with a project-first,
// embed.FS-fallback strategy: a project-level templates/<name>.md
// takes priority when present, otherwise the binary's embedded copy
// is used.
//
// Invariants:
//   - Loader resolution is project-first with embed.FS fallback. A
//     project template takes precedence even when the embedded one
//     was newer.
//   - The binary always carries a usable copy of every supported
//     template via embed.FS — Loader never returns "no template"
//     unless the embed itself is corrupted (ErrEmbedMissing).
//   - No global state. Each Loader instance is bound to a single
//     projectDir.
//
// See .yukki/stories/CORE-002-isolate-business-core.md for the rationale
// of this isolation.
package templates
