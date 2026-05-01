package uiapp

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/yukki-project/yukki/internal/provider"
)

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestNewApp_AssignsDeps(t *testing.T) {
	mock := &provider.MockProvider{NameVal: "mock"}
	logger := newTestLogger()

	app := NewApp(mock, logger)

	if app.provider != mock {
		t.Fatalf("expected provider to be the injected mock, got %T", app.provider)
	}
	if app.logger != logger {
		t.Fatalf("expected logger to be the injected one")
	}
	if app.ctx != nil {
		t.Fatalf("expected ctx to be nil before OnStartup, got %v", app.ctx)
	}
}

func TestApp_Greet_ReturnsLiteral(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	const want = "hello from yukki backend"
	if got := app.Greet(); got != want {
		t.Fatalf("Greet() = %q, want %q", got, want)
	}
}

func TestApp_OnStartup_StoresContext(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	parent := context.Background()

	app.OnStartup(parent)

	if app.ctx == nil {
		t.Fatalf("expected ctx to be set after OnStartup")
	}
	if app.cancel == nil {
		t.Fatalf("expected cancel to be set after OnStartup")
	}
	select {
	case <-app.ctx.Done():
		t.Fatalf("ctx should not be Done immediately after OnStartup")
	default:
	}
}

func TestApp_OnShutdown_CancelsContext(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	app.OnShutdown(context.Background())

	select {
	case <-app.ctx.Done():
		// expected
	case <-time.After(100 * time.Millisecond):
		t.Fatalf("ctx should be Done after OnShutdown")
	}
}

func TestApp_Greet_Concurrent(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	const goroutines = 100
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			if got := app.Greet(); got != "hello from yukki backend" {
				t.Errorf("concurrent Greet() returned %q", got)
			}
		}()
	}
	wg.Wait()
}

func TestApp_OnShutdown_BeforeStartup_NoPanic(t *testing.T) {
	// OnShutdown called without prior OnStartup (e.g. early window close)
	// must not panic; cancel is nil and that's fine.
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnShutdown(context.Background())
}
