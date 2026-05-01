//go:build mock
// +build mock

// Verifies that the mock-tagged binary (built with `-tags mock`) wires
// MockProvider for `wails dev` token-free development. Counterpart to
// ui_prod_test.go.

package main

import (
	"io"
	"log/slog"
	"reflect"
	"testing"

	"github.com/yukki-project/yukki/internal/provider"
)

func TestNewProvider_ReturnsMockUnderMockTag(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	p := newProvider(logger)

	if p == nil {
		t.Fatalf("newProvider returned nil")
	}

	concrete := reflect.TypeOf(p).String()
	const want = "*provider.MockProvider"
	if concrete != want {
		t.Fatalf("newProvider concrete type = %s, want %s", concrete, want)
	}

	mock, ok := p.(*provider.MockProvider)
	if !ok {
		t.Fatalf("expected *provider.MockProvider, got %T", p)
	}
	if mock.NameVal != "mock" {
		t.Fatalf("MockProvider.NameVal = %q, want %q", mock.NameVal, "mock")
	}
}
