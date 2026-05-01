//go:build !mock
// +build !mock

// Verifies that the production binary (built without `-tags mock`) wires
// the real ClaudeProvider, never the MockProvider. Implements UI-001a
// invariant I1: "the prod binary does not embed *provider.MockProvider".

package main

import (
	"io"
	"log/slog"
	"reflect"
	"testing"

	"github.com/yukki-project/yukki/internal/provider"
)

func TestNewProvider_ReturnsClaudeWithoutMockTag(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	p := newProvider(logger)

	if p == nil {
		t.Fatalf("newProvider returned nil")
	}

	concrete := reflect.TypeOf(p).String()
	const want = "*provider.ClaudeProvider"
	if concrete != want {
		t.Fatalf("newProvider concrete type = %s, want %s", concrete, want)
	}

	// Belt-and-suspenders: assert NOT MockProvider.
	if _, isMock := p.(*provider.MockProvider); isMock {
		t.Fatalf("prod build leaked *provider.MockProvider — Invariant I1 violated")
	}
}
