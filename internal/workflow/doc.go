// Package workflow is part of yukki's business core: callable from the
// CLI (root cmd), the Wails UI (internal/uiapp), and the (future) MCP
// server (INT-002). It must not import cobra, wails, or any UI-specific
// package — enforced statically by the `core-isolation` depguard rule
// in .golangci.yml.
//
// Invariants:
//   - RunStory is idempotent on read paths (template loading) and atomic
//     on write paths (Writer.Write).
//   - All side effects (file I/O, subprocess) flow through injected
//     dependencies (Provider, Logger, TemplateLoader, Writer).
//   - No global state beyond Go runtime defaults.
//
// See spdd/stories/CORE-002-isolate-business-core.md for the rationale
// of this isolation.
package workflow
