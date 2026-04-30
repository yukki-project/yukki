package provider

import (
	"context"
	"errors"
	"testing"
)

func TestMockProvider_RecordsCalls(t *testing.T) {
	m := &MockProvider{Response: "ok"}
	out, err := m.Generate(context.Background(), "p1")
	if err != nil || out != "ok" {
		t.Fatalf("unexpected: %q %v", out, err)
	}
	_, _ = m.Generate(context.Background(), "p2")
	if len(m.Calls) != 2 || m.Calls[0] != "p1" || m.Calls[1] != "p2" {
		t.Fatalf("calls capture failed: %v", m.Calls)
	}
}

func TestMockProvider_PropagatesError(t *testing.T) {
	want := errors.New("boom")
	m := &MockProvider{Err: want}
	_, err := m.Generate(context.Background(), "any")
	if !errors.Is(err, want) {
		t.Fatalf("expected wrapped error, got %v", err)
	}
}

func TestSentinelErrorsAreDistinct(t *testing.T) {
	if errors.Is(ErrNotFound, ErrVersionIncompatible) {
		t.Fatal("sentinel errors must be distinct")
	}
	if errors.Is(ErrNotFound, ErrGenerationFailed) {
		t.Fatal("sentinel errors must be distinct")
	}
	if errors.Is(ErrVersionIncompatible, ErrGenerationFailed) {
		t.Fatal("sentinel errors must be distinct")
	}
}
