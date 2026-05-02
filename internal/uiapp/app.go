// Package uiapp implements the Wails App struct backing the `yukki ui`
// desktop window.
//
// O3 of the UI-001a canvas: minimal struct + NewApp factory + lifecycle
// hooks (OnStartup / OnShutdown). The smoke-test Greet() method was
// removed in UI-001c (D-C11) — RunStory(mock) covers a broader smoke
// path.
//
// O2 of the UI-001b canvas extends App with project state (projectDir,
// loader, writer) and 6 bindings consumed by the hub UI (SelectProject,
// AllowedKinds, ListArtifacts, GetClaudeStatus, InitializeSPDD,
// ReadArtifact).
//
// O4 of the UI-001c canvas extends App with generation state (running
// atomic.Bool, runStoryCancel context.CancelFunc) and 3 bindings for
// the writing flow (RunStory, AbortRunning, SuggestedPrefixes).
package uiapp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync/atomic"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
	"github.com/yukki-project/yukki/internal/workflow"
)

// ErrAlreadyRunning is returned by App.RunStory when a previous
// generation is still in progress on this App instance.
var ErrAlreadyRunning = errors.New("a generation is already running")

// openDirectoryDialog is a package-level indirection over
// runtime.OpenDirectoryDialog so unit tests can replace it without spinning
// up a Wails context. Production callers (the real `yukki ui` binary)
// hit the Wails runtime directly.
var openDirectoryDialog = runtime.OpenDirectoryDialog

// spddSubdirs lists the directories created by InitializeSPDD under
// <projectDir>/spdd/. Order is stable for testability.
var spddSubdirs = []string{
	"stories",
	"analysis",
	"prompts",
	"tests",
	"methodology",
	"templates",
}

// ClaudeStatus is the typed view of the Claude CLI's reachability returned
// by App.GetClaudeStatus. Available is true when the binary is on PATH and
// `--version` succeeds; Version holds its trimmed stdout in that case.
// Err carries a non-empty string when either step fails — callers render it
// in the banner UI rather than treating it as a hard error.
type ClaudeStatus struct {
	Available bool
	Version   string
	Err       string
}

// App is the root struct exposed to the Wails frontend via Bind.
//
// Public methods (PascalCase) become auto-generated TypeScript bindings
// under frontend/wailsjs/go/main/App.
type App struct {
	ctx        context.Context
	cancel     context.CancelFunc
	logger     *slog.Logger
	provider   provider.Provider
	projectDir string
	loader     *templates.Loader
	writer     *artifacts.Writer

	// running gates concurrent RunStory calls. Swap(true) at start,
	// Store(false) at defer. ErrAlreadyRunning is returned if Swap
	// returns true (a generation is already in progress).
	running atomic.Bool

	// runStoryCancel is the cancel function of the per-generation
	// sub-context derived from a.ctx. AbortRunning calls this. Reset
	// to nil on RunStory return.
	runStoryCancel context.CancelFunc
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

// (Greet was removed in UI-001c per D-C11 — RunStory with MockProvider
// covers a broader smoke path.)

// SelectProject opens a native directory-picker dialog and, on a
// non-empty selection, updates the App's projectDir / loader / writer.
// A user cancellation returns ("", nil) so the frontend can distinguish
// it from a real error.
//
// Uses the App's startup context (a.ctx) — Wails 2.12 does not
// auto-inject context.Context for bound methods, so the canvas-prescribed
// `(ctx context.Context)` parameter is dropped here. Tracked for sync.
func (a *App) SelectProject() (string, error) {
	dir, err := openDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select SPDD project root",
	})
	if err != nil {
		return "", fmt.Errorf("open directory dialog: %w", err)
	}
	if dir == "" {
		return "", nil
	}

	a.projectDir = dir
	a.loader = templates.NewLoader(dir)
	a.writer = artifacts.NewWriter(filepath.Join(dir, "spdd", "stories"))
	if a.logger != nil {
		a.logger.Info("project selected", "dir", dir)
	}
	return dir, nil
}

// AllowedKinds is a thin re-export of artifacts.AllowedKinds() so the
// frontend can render the sidebar without hardcoding the list (Invariant
// I7 — DRY with CORE-004).
func (a *App) AllowedKinds() []string {
	return artifacts.AllowedKinds()
}

// ListArtifacts delegates to artifacts.ListArtifacts(projectDir, kind).
// Returns an explicit error if no project is selected; propagates
// ErrInvalidKind / OS errors from the underlying call.
func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error) {
	if a.projectDir == "" {
		return nil, errors.New("no project selected")
	}
	return artifacts.ListArtifacts(a.projectDir, kind)
}

// GetClaudeStatus probes the Provider via CheckVersion + Version and maps
// the outcome to a ClaudeStatus value. CheckVersion failure → Available
// false. CheckVersion ok but Version failure → Available true with a
// non-empty Err field. Both ok → Available true with Version populated.
//
// Uses the App's startup context (a.ctx) — Wails 2.12 does not auto-inject
// context.Context for bound methods. Tracked for sync.
func (a *App) GetClaudeStatus() ClaudeStatus {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	if err := a.provider.CheckVersion(ctx); err != nil {
		return ClaudeStatus{Available: false, Err: err.Error()}
	}
	v, err := a.provider.Version(ctx)
	if err != nil {
		return ClaudeStatus{Available: true, Err: err.Error()}
	}
	return ClaudeStatus{Available: true, Version: v}
}

// InitializeSPDD creates the SPDD directory tree under <dir>/spdd/ and
// copies the 4 embedded templates into <dir>/spdd/templates/. The
// operation is idempotent: rerunning it on a populated directory
// re-creates missing subdirs and overwrites the embedded templates
// (embed.FS is treated as the source of truth, Invariant I4).
func (a *App) InitializeSPDD(dir string) error {
	if dir == "" {
		return errors.New("dir must not be empty")
	}

	for _, sub := range spddSubdirs {
		path := filepath.Join(dir, "spdd", sub)
		if err := os.MkdirAll(path, 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", path, err)
		}
	}

	loader := a.loader
	if loader == nil {
		loader = templates.NewLoader(dir)
	}

	type tpl struct {
		name string
		load func() (string, templates.Source, error)
	}
	all := []tpl{
		{"story.md", loader.LoadStory},
		{"analysis.md", loader.LoadAnalysis},
		{"canvas-reasons.md", loader.LoadCanvasReasons},
		{"tests.md", loader.LoadTests},
	}
	for _, t := range all {
		content, _, err := t.load()
		if err != nil {
			return fmt.Errorf("load template %s: %w", t.name, err)
		}
		dst := filepath.Join(dir, "spdd", "templates", t.name)
		if err := os.WriteFile(dst, []byte(content), 0o644); err != nil {
			return fmt.Errorf("write template %s: %w", dst, err)
		}
	}

	if a.logger != nil {
		a.logger.Info("spdd initialized", "dir", dir)
	}
	return nil
}

// ReadArtifact returns the file contents at the given path. Refuses any
// path that does not resolve under <projectDir>/spdd/ (Invariant I1 —
// path-traversal guard). Empty projectDir is rejected explicitly so the
// guard is never bypassed by a missing prefix.
func (a *App) ReadArtifact(path string) (string, error) {
	if a.projectDir == "" {
		return "", errors.New("no project selected")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve abs path %q: %w", path, err)
	}
	prefix, err := filepath.Abs(filepath.Join(a.projectDir, "spdd"))
	if err != nil {
		return "", fmt.Errorf("resolve project spdd prefix: %w", err)
	}
	if !strings.HasPrefix(absPath, prefix) {
		return "", fmt.Errorf("path outside project spdd: %s", absPath)
	}
	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", absPath, err)
	}
	return string(data), nil
}

// RunStory orchestrates workflow.RunStory with a uiProgress sink that
// emits Wails events. Refuses to run if no project is selected or if
// another generation is already in progress (ErrAlreadyRunning).
//
// The per-generation context is derived from a.ctx so OnShutdown
// cancels the subprocess `claude` (via exec.CommandContext); the
// derived cancel is also exposed via AbortRunning so the user can
// abandon without closing the window.
//
// No ctx parameter (Wails 2.12 D-B5b — runtime does not auto-inject).
func (a *App) RunStory(description, prefix string, strictPrefix bool) (string, error) {
	if a.projectDir == "" {
		return "", errors.New("no project selected")
	}
	if a.running.Swap(true) {
		return "", ErrAlreadyRunning
	}
	defer a.running.Store(false)

	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	runStoryCtx, cancel := context.WithCancel(parent)
	a.runStoryCancel = cancel
	defer func() {
		a.runStoryCancel = nil
		cancel()
	}()

	prog := newUiProgress(runStoryCtx, a.logger)
	opts := workflow.StoryOptions{
		Description:    description,
		Prefix:         prefix,
		StrictPrefix:   strictPrefix,
		Logger:         a.logger,
		Provider:       a.provider,
		TemplateLoader: a.loader,
		Writer:         a.writer,
		Progress:       prog,
	}
	return workflow.RunStory(runStoryCtx, opts)
}

// AbortRunning cancels the in-flight generation, if any. Idempotent
// no-op if nothing is running. Distinct from OnShutdown so the user
// can abandon without closing the window (D-C3).
func (a *App) AbortRunning() error {
	if a.runStoryCancel != nil {
		a.runStoryCancel()
	}
	return nil
}

// SuggestedPrefixes returns a sorted copy of artifacts.AllowedPrefixes
// for the prefix combo of the New Story modal. The slice is independent
// of the package-level variable (no mutation risk).
func (a *App) SuggestedPrefixes() []string {
	out := make([]string, len(artifacts.AllowedPrefixes))
	copy(out, artifacts.AllowedPrefixes)
	sort.Strings(out)
	return out
}
