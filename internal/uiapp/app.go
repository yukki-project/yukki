// Package uiapp implements the Wails App struct backing the `yukki ui`
// desktop window.
//
// O3 of the UI-001a canvas: minimal struct + NewApp factory + lifecycle
// hooks (OnStartup / OnShutdown) + Greet() smoke test method.
//
// In UI-001a the provider is injected but not consumed; it is wired now
// so the build-tag dual tests (UI-001a O8) can verify the production /
// mock factory without re-architecting later. UI-001c will route
// RunStory bindings through it.
package uiapp

import (
	"context"
	"log/slog"

	"github.com/yukki-project/yukki/internal/provider"
)

// App is the root struct exposed to the Wails frontend via Bind.
//
// Public methods (PascalCase) become auto-generated TypeScript bindings
// under frontend/wailsjs/go/main/App. Stateless by design in UI-001a
// (Invariant I2 of the canvas).
type App struct {
	ctx      context.Context
	cancel   context.CancelFunc
	logger   *slog.Logger
	provider provider.Provider
}

// NewApp constructs an App with the dependencies it needs at runtime.
// The context is set later by OnStartup (Wails lifecycle).
func NewApp(p provider.Provider, logger *slog.Logger) *App {
	return &App{
		logger:   logger,
		provider: p,
	}
}

// OnStartup is invoked by Wails when the window is ready. The runtime
// context is wrapped in a cancellable context so OnShutdown can interrupt
// any long-running operation kicked off by future bindings (UI-001c).
func (a *App) OnStartup(ctx context.Context) {
	a.ctx, a.cancel = context.WithCancel(ctx)
	if a.logger != nil {
		a.logger.Info("ui startup", "provider", a.provider.Name())
	}
}

// OnShutdown is invoked by Wails when the user closes the window. Cancels
// the in-flight context so child operations (subprocess `claude` etc.)
// receive a cancellation signal and clean up promptly.
func (a *App) OnShutdown(ctx context.Context) {
	if a.cancel != nil {
		a.cancel()
	}
	if a.logger != nil {
		a.logger.Info("ui shutdown")
	}
}

// Greet is the smoke-test binding exposed to the frontend in UI-001a.
// Returns a fixed string; calling it from the frontend confirms the
// Cobra → wails.Run → frontend → bindings round-trip works end-to-end.
//
// Per D-A6 of the UI-001a delta analysis, this method survives in
// UI-001b inside an "About → Run smoke test" menu — do not remove.
func (a *App) Greet() string {
	return "hello from yukki backend"
}
