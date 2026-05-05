// Package provider is part of yukki's business core: callable from the
// CLI (root cmd), the Wails UI (internal/uiapp), and the (future) MCP
// server (INT-002). It must not import cobra, wails, or any UI-specific
// package — enforced statically by the `core-isolation` depguard rule
// in .golangci.yml.
//
// The package abstracts the LLM CLI invocation behind a small Provider
// interface. Concrete implementations (Claude, Mock) live alongside.
//
// Invariants:
//   - Provider.Generate is idempotent from yukki's point of view: a same
//     input MAY be replayed safely. Concrete impls (Claude, Mock) own
//     their own retry/timeout semantics.
//   - Sentinel errors (ErrNotFound, ErrVersionIncompatible,
//     ErrGenerationFailed) form the public error contract; consumers
//     should match via errors.Is.
//   - No global state. Each Provider instance owns its config (binary
//     path, args, timeout).
//
// See .yukki/stories/CORE-002-isolate-business-core.md for the rationale
// of this isolation.
package provider
