//go:build !mock
// +build !mock

// Production provider factory: returns the real Claude CLI provider.
// Implements O2 of the UI-001a canvas (default branch, no build tag).

package main

import (
	"log/slog"

	"github.com/yukki-project/yukki/internal/provider"
)

// newProvider returns the real ClaudeProvider for the production binary.
func newProvider(logger *slog.Logger) provider.Provider {
	return provider.NewClaude(logger)
}
