//go:build mock
// +build mock

// Mock provider factory: used during `wails dev -tags mock` to develop
// the frontend without invoking Claude (no token burn, deterministic).
// Implements O2 of the UI-001a canvas (mock branch, build tag `mock`).

package main

import (
	"log/slog"

	"github.com/yukki-project/yukki/internal/provider"
)

// newProvider returns a MockProvider for development builds.
//
// In UI-001a the provider is wired but unused (App.Greet is stateless).
// UI-001c will route App.RunStory through it.
func newProvider(logger *slog.Logger) provider.Provider {
	return &provider.MockProvider{NameVal: "mock"}
}
