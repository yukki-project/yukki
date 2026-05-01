// Package provider abstracts the LLM CLI invoked as a subprocess.
//
// Implements O5 of the CORE-001 canvas. v1 ships a ClaudeProvider; INT-001
// will add a CopilotProvider behind the same interface.
package provider

import (
	"context"
	"errors"
)

// Provider is the abstraction over an LLM CLI accessible as a subprocess.
type Provider interface {
	// Name returns a human-readable identifier (e.g., "claude").
	Name() string

	// CheckVersion ensures the CLI is reachable and reports a usable version.
	// Returns ErrNotFound if not in PATH, ErrVersionIncompatible otherwise.
	CheckVersion(ctx context.Context) error

	// Version returns the raw version string reported by the CLI (typically
	// the trimmed stdout of `<binary> --version`). Returns ErrNotFound if the
	// binary is not on PATH and ErrVersionIncompatible on subprocess failure.
	Version(ctx context.Context) (string, error)

	// Generate runs the LLM with the given prompt and returns the raw output.
	// Returns ErrGenerationFailed wrapping the underlying error on subprocess
	// failures.
	Generate(ctx context.Context, prompt string) (string, error)
}

// Sentinel errors for provider failures. Use errors.Is at call sites.
var (
	// ErrNotFound is returned when the provider CLI is not in PATH.
	ErrNotFound = errors.New("provider CLI not found in PATH")

	// ErrVersionIncompatible is returned when a known-incompatible version
	// of the provider CLI is detected.
	ErrVersionIncompatible = errors.New("provider CLI version incompatible")

	// ErrGenerationFailed is returned when the subprocess exits with an error
	// or produces unparseable output.
	ErrGenerationFailed = errors.New("provider generation failed")
)
