package provider

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"testing"
)

func TestClaudeProvider_CheckVersion_NotFound(t *testing.T) {
	p := &ClaudeProvider{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary: "definitely-not-on-path-yukki-test-zzz",
	}
	err := p.CheckVersion(context.Background())
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestClaudeProvider_NameAndDefaultBinary(t *testing.T) {
	p := NewClaude(nil)
	if p.Name() != "claude" {
		t.Fatalf("expected name 'claude', got %q", p.Name())
	}
	if p.Binary != "claude" {
		t.Fatalf("expected default binary 'claude', got %q", p.Binary)
	}
}
