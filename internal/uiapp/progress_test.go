package uiapp

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"
)

// capturedEvent records a single emitEvent call.
type capturedEvent struct {
	name    string
	payload any
}

// withEmitStub swaps emitEvent for a capturing fake during the test.
// Atomic-safe via setEmitEvent (cf. progress.go) — pas de race avec les
// goroutines en cours d'exécution dans d'autres tests.
func withEmitStub(t *testing.T) *[]capturedEvent {
	t.Helper()
	captured := &[]capturedEvent{}
	prev := setEmitEvent(func(ctx context.Context, name string, payload ...any) {
		var p any
		if len(payload) == 1 {
			p = payload[0]
		}
		*captured = append(*captured, capturedEvent{name: name, payload: p})
	})
	t.Cleanup(func() { setEmitEvent(prev) })
	return captured
}

func TestUiProgress_EmitsStartAndEnd_OnSuccess(t *testing.T) {
	captured := withEmitStub(t)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	p := newUiProgress(context.Background(), logger)

	p.Start("Asking Claude")
	time.Sleep(5 * time.Millisecond)
	p.End("/abs/path/to/story.md", nil)

	if len(*captured) != 2 {
		t.Fatalf("expected 2 emits, got %d", len(*captured))
	}
	if (*captured)[0].name != "provider:start" {
		t.Fatalf("first event name = %q, want provider:start", (*captured)[0].name)
	}
	startPayload, ok := (*captured)[0].payload.(ProviderStartPayload)
	if !ok || startPayload.Label != "Asking Claude" {
		t.Fatalf("start payload = %+v", (*captured)[0].payload)
	}
	if (*captured)[1].name != "provider:end" {
		t.Fatalf("second event name = %q, want provider:end", (*captured)[1].name)
	}
	endPayload, ok := (*captured)[1].payload.(ProviderEndPayload)
	if !ok {
		t.Fatalf("end payload type = %T", (*captured)[1].payload)
	}
	if !endPayload.Success || endPayload.Path != "/abs/path/to/story.md" || endPayload.Error != "" {
		t.Fatalf("end payload mismatch: %+v", endPayload)
	}
	if endPayload.DurationMs < 5 {
		t.Fatalf("duration_ms = %d, expected >= 5", endPayload.DurationMs)
	}
}

func TestUiProgress_EmitsEnd_WithError_OnFailure(t *testing.T) {
	captured := withEmitStub(t)

	p := newUiProgress(context.Background(), nil)
	p.Start("Asking Claude")
	p.End("", errors.New("boom"))

	if len(*captured) != 2 {
		t.Fatalf("expected 2 emits, got %d", len(*captured))
	}
	endPayload, ok := (*captured)[1].payload.(ProviderEndPayload)
	if !ok {
		t.Fatalf("end payload type = %T", (*captured)[1].payload)
	}
	if endPayload.Success || endPayload.Error != "boom" || endPayload.Path != "" {
		t.Fatalf("end payload mismatch: %+v", endPayload)
	}
}

func TestUiProgress_Chunk_EmitsProviderTextEvent(t *testing.T) {
	captured := withEmitStub(t)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	p := newUiProgress(context.Background(), logger)

	p.Chunk("hello world")

	if len(*captured) != 1 {
		t.Fatalf("expected 1 emit, got %d", len(*captured))
	}
	ev := (*captured)[0]
	if ev.name != "provider:text" {
		t.Fatalf("event name = %q, want provider:text", ev.name)
	}
	payload, ok := ev.payload.(ProviderTextPayload)
	if !ok {
		t.Fatalf("payload type = %T", ev.payload)
	}
	if payload.Chunk != "hello world" {
		t.Fatalf("payload.Chunk = %q, want %q", payload.Chunk, "hello world")
	}
}

func TestUiProgress_Chunk_EmptySkipped(t *testing.T) {
	captured := withEmitStub(t)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	p := newUiProgress(context.Background(), logger)

	p.Chunk("")

	if len(*captured) != 0 {
		t.Fatalf("expected 0 emits for empty chunk, got %d", len(*captured))
	}
}
