package uiapp

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
)

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// cfgLoaderAndWriter wires the App's loader and writer as SelectProject
// would (templates rooted at projectDir, stories writer rooted at
// <projectDir>/spdd/stories), so RunStory can run end-to-end.
func cfgLoaderAndWriter(t *testing.T, app *App, projectDir string) {
	t.Helper()
	app.loader = templates.NewLoader(projectDir)
	app.writer = artifacts.NewWriter(filepath.Join(projectDir, "spdd", "stories"))
}

// captureEmits silences the package-level emitEvent during the test
// (replaces it with a no-op that ignores arguments). Restored at cleanup.
func captureEmits(t *testing.T) {
	t.Helper()
	prev := emitEvent
	emitEvent = func(ctx context.Context, name string, payload ...any) {}
	t.Cleanup(func() { emitEvent = prev })
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

func TestApp_OnShutdown_BeforeStartup_NoPanic(t *testing.T) {
	// OnShutdown called without prior OnStartup (e.g. early window close)
	// must not panic; cancel is nil and that's fine.
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnShutdown(context.Background())
}

// withDialogStub swaps the package-level openDirectoryDialog for the
// duration of the test, then restores it. Tests use it to drive
// SelectProject without spinning up a Wails context.
func withDialogStub(t *testing.T, stub func(ctx context.Context, opts runtime.OpenDialogOptions) (string, error)) {
	t.Helper()
	prev := openDirectoryDialog
	openDirectoryDialog = stub
	t.Cleanup(func() { openDirectoryDialog = prev })
}

// --- SelectProject -----------------------------------------------------

func TestApp_SelectProject_Success(t *testing.T) {
	dir := t.TempDir()
	withDialogStub(t, func(ctx context.Context, opts runtime.OpenDialogOptions) (string, error) {
		return dir, nil
	})

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	got, err := app.SelectProject()
	if err != nil {
		t.Fatalf("SelectProject: %v", err)
	}
	if got != dir {
		t.Fatalf("expected %q, got %q", dir, got)
	}
	if app.projectDir != dir {
		t.Fatalf("projectDir = %q, want %q", app.projectDir, dir)
	}
	if app.loader == nil {
		t.Fatalf("expected loader set after SelectProject")
	}
	if app.writer == nil {
		t.Fatalf("expected writer set after SelectProject")
	}
}

func TestApp_SelectProject_Cancelled(t *testing.T) {
	withDialogStub(t, func(ctx context.Context, opts runtime.OpenDialogOptions) (string, error) {
		return "", nil
	})

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	got, err := app.SelectProject()
	if err != nil {
		t.Fatalf("expected nil err on cancel, got %v", err)
	}
	if got != "" {
		t.Fatalf("expected empty path on cancel, got %q", got)
	}
	if app.projectDir != "" {
		t.Fatalf("projectDir should remain empty on cancel, got %q", app.projectDir)
	}
}

// --- ListArtifacts -----------------------------------------------------

func TestApp_AllowedKinds_Reexports(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	got := app.AllowedKinds()
	want := artifacts.AllowedKinds()
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i, k := range want {
		if got[i] != k {
			t.Fatalf("kinds[%d] = %q, want %q", i, got[i], k)
		}
	}
}

func TestApp_ListArtifacts_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	_, err := app.ListArtifacts("stories")
	if err == nil {
		t.Fatal("expected error when no project selected")
	}
}

func TestApp_ListArtifacts_InvalidKind(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "spdd", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.projectDir = dir

	_, err := app.ListArtifacts("wrong")
	if !errors.Is(err, artifacts.ErrInvalidKind) {
		t.Fatalf("expected ErrInvalidKind, got %v", err)
	}
}

func TestApp_ListArtifacts_Delegation(t *testing.T) {
	dir := t.TempDir()
	storyDir := filepath.Join(dir, "spdd", "stories")
	if err := os.MkdirAll(storyDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const content = "---\nid: T-1\nslug: foo\ntitle: Foo\nstatus: draft\nupdated: 2026-05-01\n---\n# Foo\n"
	if err := os.WriteFile(filepath.Join(storyDir, "T-1-foo.md"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.projectDir = dir

	got, err := app.ListArtifacts("stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(got) != 1 || got[0].ID != "T-1" {
		t.Fatalf("unexpected list: %+v", got)
	}
}

// --- GetClaudeStatus ---------------------------------------------------

func TestApp_GetClaudeStatus_Available(t *testing.T) {
	app := NewApp(&provider.MockProvider{VersionVal: "claude 1.2.3"}, newTestLogger())
	st := app.GetClaudeStatus()
	if !st.Available {
		t.Fatal("expected Available=true")
	}
	if st.Version != "claude 1.2.3" {
		t.Fatalf("Version = %q", st.Version)
	}
	if st.Err != "" {
		t.Fatalf("Err = %q", st.Err)
	}
}

func TestApp_GetClaudeStatus_NotFound(t *testing.T) {
	app := NewApp(&provider.MockProvider{CheckErr: provider.ErrNotFound}, newTestLogger())
	st := app.GetClaudeStatus()
	if st.Available {
		t.Fatal("expected Available=false on CheckErr")
	}
	if st.Err == "" {
		t.Fatal("expected non-empty Err")
	}
}

func TestApp_GetClaudeStatus_VersionFailedAfterCheck(t *testing.T) {
	app := NewApp(&provider.MockProvider{VersionErr: errors.New("boom")}, newTestLogger())
	st := app.GetClaudeStatus()
	if !st.Available {
		t.Fatal("expected Available=true (CheckVersion ok)")
	}
	if st.Err == "" {
		t.Fatal("expected non-empty Err when Version fails")
	}
}

// --- InitializeSPDD ----------------------------------------------------

func TestApp_InitializeSPDD_Success(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	if err := app.InitializeSPDD(dir); err != nil {
		t.Fatalf("InitializeSPDD: %v", err)
	}

	for _, sub := range []string{"stories", "analysis", "prompts", "tests", "methodology", "templates"} {
		path := filepath.Join(dir, "spdd", sub)
		if info, err := os.Stat(path); err != nil || !info.IsDir() {
			t.Fatalf("expected directory %s, err=%v", path, err)
		}
	}
	for _, name := range []string{"story.md", "analysis.md", "canvas-reasons.md", "tests.md"} {
		path := filepath.Join(dir, "spdd", "templates", name)
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			t.Fatalf("expected file %s, err=%v", path, err)
		}
	}
}

func TestApp_InitializeSPDD_Idempotent(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	if err := app.InitializeSPDD(dir); err != nil {
		t.Fatalf("first init: %v", err)
	}
	if err := app.InitializeSPDD(dir); err != nil {
		t.Fatalf("second init: %v", err)
	}
}

func TestApp_InitializeSPDD_EmptyDirRejected(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	if err := app.InitializeSPDD(""); err == nil {
		t.Fatal("expected error when dir is empty")
	}
}

// --- ReadArtifact ------------------------------------------------------

func TestApp_ReadArtifact_Success(t *testing.T) {
	dir := t.TempDir()
	storyDir := filepath.Join(dir, "spdd", "stories")
	if err := os.MkdirAll(storyDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const content = "---\nid: X\n---\n# X"
	path := filepath.Join(storyDir, "X.md")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.projectDir = dir

	got, err := app.ReadArtifact(path)
	if err != nil {
		t.Fatalf("ReadArtifact: %v", err)
	}
	if got != content {
		t.Fatalf("content mismatch: got %q", got)
	}
}

func TestApp_ReadArtifact_PathTraversalRejected(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.projectDir = dir

	for _, bad := range []string{
		filepath.Join(dir, "outside.md"),
		filepath.Join(dir, "spdd", "..", "outside.md"),
		`C:\Windows\System32\drivers\etc\hosts`,
		"/etc/passwd",
	} {
		_, err := app.ReadArtifact(bad)
		if err == nil {
			t.Fatalf("expected path-traversal error for %q", bad)
		}
	}
}

func TestApp_ReadArtifact_FileNotExist(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "spdd", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.projectDir = dir

	_, err := app.ReadArtifact(filepath.Join(dir, "spdd", "stories", "nope.md"))
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected os.ErrNotExist, got %v", err)
	}
}

func TestApp_ReadArtifact_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	_, err := app.ReadArtifact("/anywhere/spdd/x.md")
	if err == nil {
		t.Fatal("expected error when no project selected")
	}
}

// --- RunStory / AbortRunning / SuggestedPrefixes (UI-001c O4) ---------

const stubStoryUIC = `---
id: STORY-001
slug: stub-story
title: Stub Story
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Stub Story

Body.
`

func TestApp_RunStory_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	_, err := app.RunStory("desc", "STORY", false)
	if err == nil {
		t.Fatal("expected error when projectDir is empty")
	}
}

func TestApp_RunStory_AlreadyRunning(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	app.projectDir = t.TempDir()
	app.running.Store(true) // simulate in-flight generation

	_, err := app.RunStory("desc", "STORY", false)
	if !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("expected ErrAlreadyRunning, got %v", err)
	}
}

// runStoryHappyPath wires real loader+writer so workflow.RunStory works
// end-to-end with a MockProvider returning stubStoryUIC.
func runStoryHappyPath(t *testing.T, mock *provider.MockProvider) (*App, string) {
	t.Helper()
	dir := t.TempDir()
	app := NewApp(mock, newTestLogger())
	app.OnStartup(context.Background())
	app.projectDir = dir
	// Configure as SelectProject would: loader rooted at projectDir,
	// writer rooted at <projectDir>/spdd/stories.
	cfgLoaderAndWriter(t, app, dir)
	return app, dir
}

func TestApp_RunStory_Success(t *testing.T) {
	mock := &provider.MockProvider{Response: stubStoryUIC}
	app, dir := runStoryHappyPath(t, mock)

	// silence Wails events during this test (no real runtime)
	captureEmits(t)

	path, err := app.RunStory("any description", "STORY", false)
	if err != nil {
		t.Fatalf("RunStory: %v", err)
	}
	if path == "" {
		t.Fatal("expected non-empty path")
	}
	if app.running.Load() {
		t.Fatal("running flag should be reset to false after return")
	}
	if app.runStoryCancel != nil {
		t.Fatal("runStoryCancel should be reset to nil after return")
	}
	expected := filepath.Join(dir, "spdd", "stories", "STORY-001-stub-story.md")
	if path != expected {
		t.Fatalf("path = %q, want %q", path, expected)
	}
}

func TestApp_RunStory_AbortMidFlight(t *testing.T) {
	mock := &provider.MockProvider{
		Response:   stubStoryUIC,
		BlockUntil: make(chan struct{}),
	}
	app, _ := runStoryHappyPath(t, mock)
	captureEmits(t)

	type result struct {
		path string
		err  error
	}
	done := make(chan result, 1)
	go func() {
		path, err := app.RunStory("desc", "STORY", false)
		done <- result{path, err}
	}()

	// wait until runStoryCancel is set, then abort. Read under
	// cancelMu so the race detector is happy.
	if !waitCancelArmed(app, time.Second) {
		t.Fatal("runStoryCancel never set within 1s")
	}
	if err := app.AbortRunning(); err != nil {
		t.Fatalf("AbortRunning: %v", err)
	}

	select {
	case r := <-done:
		if !errors.Is(r.err, context.Canceled) {
			t.Fatalf("expected context.Canceled, got %v", r.err)
		}
	case <-time.After(time.Second):
		t.Fatal("RunStory did not return after AbortRunning")
	}
	if app.running.Load() {
		t.Fatal("running flag should be reset to false after abort")
	}
}

// waitCancelArmed polls (under cancelMu) until runStoryCancel is set
// or the deadline elapses. Returns true if armed.
func waitCancelArmed(app *App, within time.Duration) bool {
	deadline := time.Now().Add(within)
	for time.Now().Before(deadline) {
		app.cancelMu.Lock()
		armed := app.runStoryCancel != nil
		app.cancelMu.Unlock()
		if armed {
			return true
		}
		time.Sleep(time.Millisecond)
	}
	return false
}

func TestApp_RunStory_ShutdownDuringGeneration(t *testing.T) {
	mock := &provider.MockProvider{
		Response:   stubStoryUIC,
		BlockUntil: make(chan struct{}),
	}
	app, _ := runStoryHappyPath(t, mock)
	captureEmits(t)

	done := make(chan error, 1)
	go func() {
		_, err := app.RunStory("desc", "STORY", false)
		done <- err
	}()

	if !waitCancelArmed(app, time.Second) {
		t.Fatal("runStoryCancel never set within 1s")
	}
	app.OnShutdown(context.Background())

	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("expected context.Canceled, got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("RunStory did not return after OnShutdown")
	}
}

func TestApp_AbortRunning_NothingToAbort(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	if err := app.AbortRunning(); err != nil {
		t.Fatalf("AbortRunning with no in-flight generation: %v", err)
	}
}

func TestApp_SuggestedPrefixes_Sorted_Distinct(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	got := app.SuggestedPrefixes()
	if len(got) != len(artifacts.AllowedPrefixes) {
		t.Fatalf("len = %d, want %d", len(got), len(artifacts.AllowedPrefixes))
	}
	if !sort.StringsAreSorted(got) {
		t.Fatalf("expected sorted, got %v", got)
	}
	// must not mutate the source slice
	source := artifacts.AllowedPrefixes
	got[0] = "ZZZZ"
	if source[0] == "ZZZZ" {
		t.Fatal("SuggestedPrefixes mutated artifacts.AllowedPrefixes")
	}
}
