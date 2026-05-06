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
)

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// setTestProject is defined in bindings_test.go (same package).
// cfgLoaderAndWriter kept as thin alias for RunStory happy-path tests
// that call it explicitly.
func cfgLoaderAndWriter(t *testing.T, app *App, projectDir string) {
	t.Helper()
	setTestProject(t, app, projectDir)
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
	withTempRegistry(t)
	captureEmits(t)
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
	withTempRegistry(t)
	captureEmits(t)
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
	// Create .yukki/ so newOpenedProject succeeds.
	if err := os.MkdirAll(filepath.Join(dir, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	withTempRegistry(t)
	captureEmits(t)
	withDialogStub(t, func(ctx context.Context, opts runtime.OpenDialogOptions) (string, error) {
		return dir, nil
	})

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	got, err := app.SelectProject()
	if err != nil {
		t.Fatalf("SelectProject: %v", err)
	}
	if got == "" {
		t.Fatal("expected non-empty path from SelectProject")
	}
	app.mu.RLock()
	n := len(app.openedProjects)
	var loader, writer interface{}
	if n > 0 {
		loader = app.openedProjects[0].loader
		writer = app.openedProjects[0].writer
	}
	app.mu.RUnlock()
	if n != 1 {
		t.Fatalf("expected 1 opened project, got %d", n)
	}
	if loader == nil {
		t.Fatalf("expected loader set after SelectProject")
	}
	if writer == nil {
		t.Fatalf("expected writer set after SelectProject")
	}
}

func TestApp_SelectProject_Cancelled(t *testing.T) {
	withTempRegistry(t)
	captureEmits(t)
	withDialogStub(t, func(ctx context.Context, opts runtime.OpenDialogOptions) (string, error) {
		return "", nil
	})

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	got, err := app.SelectProject()
	if err != nil {
		t.Fatalf("expected nil err on cancel, got %v", err)
	}
	if got != "" {
		t.Fatalf("expected empty path on cancel, got %q", got)
	}
	app.mu.RLock()
	n := len(app.openedProjects)
	app.mu.RUnlock()
	if n != 0 {
		t.Fatalf("no project should be added on cancel, got %d", n)
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
	if err := os.MkdirAll(filepath.Join(dir, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, dir)

	_, err := app.ListArtifacts("wrong")
	if !errors.Is(err, artifacts.ErrInvalidKind) {
		t.Fatalf("expected ErrInvalidKind, got %v", err)
	}
}

func TestApp_ListArtifacts_Delegation(t *testing.T) {
	dir := t.TempDir()
	storyDir := filepath.Join(dir, ".yukki", "stories")
	if err := os.MkdirAll(storyDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const content = "---\nid: T-1\nslug: foo\ntitle: Foo\nstatus: draft\nupdated: 2026-05-01\n---\n# Foo\n"
	if err := os.WriteFile(filepath.Join(storyDir, "T-1-foo.md"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, dir)

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

// --- InitializeYukki ----------------------------------------------------

func TestApp_InitializeYukki_Success(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	if err := app.InitializeYukki(dir); err != nil {
		t.Fatalf("InitializeYukki: %v", err)
	}

	// META-005: 9 subdirs total (4 historiques + 3 nouveaux + methodology + templates)
	for _, sub := range []string{
		"stories", "analysis", "prompts", "tests",
		"inbox", "epics", "roadmap",
		"methodology", "templates",
	} {
		path := filepath.Join(dir, ".yukki", sub)
		if info, err := os.Stat(path); err != nil || !info.IsDir() {
			t.Fatalf("expected directory %s, err=%v", path, err)
		}
	}
	// META-005: 7 templates copiés (4 historiques + 3 nouveaux)
	for _, name := range []string{
		"story.md", "analysis.md", "canvas-reasons.md", "tests.md",
		"inbox.md", "epic.md", "roadmap.md",
	} {
		path := filepath.Join(dir, ".yukki", "templates", name)
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			t.Fatalf("expected file %s, err=%v", path, err)
		}
	}
}

// TestApp_InitializeYukki_PreExistingProject vérifie qu'un re-init sur
// un projet contenant déjà des artefacts (les 4 sous-dossiers historiques
// avec un fichier dedans) crée les 3 nouveaux sous-dossiers (META-005)
// sans toucher aux fichiers existants. Couvre AC4 de META-005.
func TestApp_InitializeYukki_PreExistingProject(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	// Setup d'un projet "ancien" : 4 sous-dossiers historiques + 1 artefact
	// custom dans stories/ qui ne doit pas être touché par le re-init.
	for _, sub := range []string{"stories", "analysis", "prompts", "tests"} {
		if err := os.MkdirAll(filepath.Join(dir, ".yukki", sub), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	const customContent = "---\nid: STORY-EXISTING\n---\n# already here\n"
	customPath := filepath.Join(dir, ".yukki", "stories", "STORY-EXISTING.md")
	if err := os.WriteFile(customPath, []byte(customContent), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := app.InitializeYukki(dir); err != nil {
		t.Fatalf("InitializeYukki on pre-existing project: %v", err)
	}

	// Les 3 nouveaux sous-dossiers ont bien été créés.
	for _, sub := range []string{"inbox", "epics", "roadmap"} {
		path := filepath.Join(dir, ".yukki", sub)
		if info, err := os.Stat(path); err != nil || !info.IsDir() {
			t.Fatalf("expected new META-005 directory %s, err=%v", path, err)
		}
	}

	// L'artefact custom existant n'a PAS été modifié.
	got, err := os.ReadFile(customPath)
	if err != nil {
		t.Fatalf("custom artifact disparu: %v", err)
	}
	if string(got) != customContent {
		t.Fatalf("custom artifact altéré par re-init :\n got: %q\nwant: %q", got, customContent)
	}
}

func TestApp_InitializeYukki_Idempotent(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	if err := app.InitializeYukki(dir); err != nil {
		t.Fatalf("first init: %v", err)
	}
	if err := app.InitializeYukki(dir); err != nil {
		t.Fatalf("second init: %v", err)
	}
}

func TestApp_InitializeYukki_EmptyDirRejected(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	if err := app.InitializeYukki(""); err == nil {
		t.Fatal("expected error when dir is empty")
	}
}

// --- ReadArtifact ------------------------------------------------------

func TestApp_ReadArtifact_Success(t *testing.T) {
	dir := t.TempDir()
	storyDir := filepath.Join(dir, ".yukki", "stories")
	if err := os.MkdirAll(storyDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const content = "---\nid: X\n---\n# X"
	path := filepath.Join(storyDir, "X.md")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, dir)

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
	setTestProject(t, app, dir)

	for _, bad := range []string{
		filepath.Join(dir, "outside.md"),
		filepath.Join(dir, ".yukki", "..", "outside.md"),
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
	if err := os.MkdirAll(filepath.Join(dir, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, dir)

	_, err := app.ReadArtifact(filepath.Join(dir, ".yukki", "stories", "nope.md"))
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected os.ErrNotExist, got %v", err)
	}
}

func TestApp_ReadArtifact_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	_, err := app.ReadArtifact("/anywhere/.yukki/x.md")
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
	withTempRegistry(t)
	captureEmits(t)
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
	setTestProject(t, app, t.TempDir())
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
	withTempRegistry(t)
	dir := t.TempDir()
	app := NewApp(mock, newTestLogger())
	app.OnStartup(context.Background())
	// setTestProject wires an OpenedProject with loader + writer.
	setTestProject(t, app, dir)
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
	expected := filepath.Join(dir, ".yukki", "stories", "STORY-001-stub-story.md")
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
