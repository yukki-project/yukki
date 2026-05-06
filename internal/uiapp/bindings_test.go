package uiapp

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
)

// makeProjectDir creates dir/.yukki/stories/ and returns dir.
func makeProjectDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	return dir
}

// setTestProject adds dir as an OpenedProject to app (without disk I/O for
// the picker dialog).  The .yukki/stories directory is created under dir.
func setTestProject(t *testing.T, app *App, dir string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(dir, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	proj := &OpenedProject{
		Path:       dir,
		Name:       filepath.Base(dir),
		LastOpened: time.Now(),
		loader:     templates.NewLoader(dir),
		writer:     artifacts.NewWriter(filepath.Join(dir, ".yukki", "stories")),
	}
	app.openedProjects = append(app.openedProjects, proj)
	app.activeIndex = len(app.openedProjects) - 1
}

// --- activeProject ----------------------------------------------------------

func TestApp_ActiveProject_EmptyReturnsError(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	_, err := app.activeProject()
	if err == nil {
		t.Fatal("expected error from activeProject with no projects")
	}
}

// --- hasYukkiPrefix ---------------------------------------------------------

func TestApp_HasYukkiPrefix_AcceptsKnownProject(t *testing.T) {
	dir := t.TempDir()
	projs := []*OpenedProject{{Path: dir}}
	good := filepath.Join(dir, ".yukki", "stories", "S-001.md")
	if !hasYukkiPrefix(good, projs) {
		t.Fatalf("expected hasYukkiPrefix=true for %q", good)
	}
}

func TestApp_HasYukkiPrefix_RejectsOutsidePath(t *testing.T) {
	dir := t.TempDir()
	projs := []*OpenedProject{{Path: dir}}
	bad := filepath.Join(dir, "outside.md")
	if hasYukkiPrefix(bad, projs) {
		t.Fatalf("expected hasYukkiPrefix=false for %q", bad)
	}
}

func TestApp_HasYukkiPrefix_RejectsFalsePositiveSuffix(t *testing.T) {
	dir := t.TempDir()
	// .yukki-evil should NOT match .yukki prefix
	projs := []*OpenedProject{{Path: dir}}
	evil := filepath.Join(dir, ".yukki-evil", "file.md")
	if hasYukkiPrefix(evil, projs) {
		t.Fatalf("expected hasYukkiPrefix=false for .yukki-evil path %q", evil)
	}
}

// --- OpenProject ------------------------------------------------------------

func TestApp_OpenProject_AddsTab(t *testing.T) {
	dir := makeProjectDir(t)
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	meta, err := app.OpenProject(dir)
	if err != nil {
		t.Fatalf("OpenProject: %v", err)
	}
	if meta.Path == "" {
		t.Fatal("expected non-empty meta.Path")
	}

	app.mu.RLock()
	n := len(app.openedProjects)
	active := app.activeIndex
	app.mu.RUnlock()

	if n != 1 {
		t.Fatalf("expected 1 opened project, got %d", n)
	}
	if active != 0 {
		t.Fatalf("expected activeIndex=0, got %d", active)
	}
}

func TestApp_OpenProject_DuplicateActivatesExisting(t *testing.T) {
	dir := makeProjectDir(t)
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	// Open a second project first so activeIndex != 0.
	dir2 := makeProjectDir(t)
	if _, err := app.OpenProject(dir); err != nil {
		t.Fatalf("first OpenProject: %v", err)
	}
	if _, err := app.OpenProject(dir2); err != nil {
		t.Fatalf("second OpenProject: %v", err)
	}

	app.mu.RLock()
	if app.activeIndex != 1 {
		t.Fatalf("expected activeIndex=1 after opening second project, got %d", app.activeIndex)
	}
	app.mu.RUnlock()

	// Open dir again — must activate tab 0 and not add a new tab.
	if _, err := app.OpenProject(dir); err != nil {
		t.Fatalf("re-open OpenProject: %v", err)
	}

	app.mu.RLock()
	n := len(app.openedProjects)
	active := app.activeIndex
	app.mu.RUnlock()

	if n != 2 {
		t.Fatalf("expected still 2 tabs, got %d", n)
	}
	if active != 0 {
		t.Fatalf("expected activeIndex=0 after re-opening first project, got %d", active)
	}
}

func TestApp_OpenProject_NoYukki_ReturnsErrNoYukki(t *testing.T) {
	dir := t.TempDir() // no .yukki/ here
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	_, err := app.OpenProject(dir)
	if !errors.Is(err, ErrNoYukki) {
		t.Fatalf("expected ErrNoYukki, got %v", err)
	}
	app.mu.RLock()
	n := len(app.openedProjects)
	app.mu.RUnlock()
	if n != 0 {
		t.Fatalf("expected 0 tabs after ErrNoYukki, got %d", n)
	}
}

func TestApp_OpenProject_ExceedsCap_ReturnsError(t *testing.T) {
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	// Fill up to cap directly.
	app.mu.Lock()
	for i := 0; i < maxOpenedProjects; i++ {
		app.openedProjects = append(app.openedProjects, &OpenedProject{
			Path: filepath.Join(t.TempDir(), "proj"),
		})
	}
	app.activeIndex = 0
	app.mu.Unlock()

	dir := makeProjectDir(t)
	_, err := app.OpenProject(dir)
	if !errors.Is(err, ErrTooManyProjects) {
		t.Fatalf("expected ErrTooManyProjects, got %v", err)
	}
}

// --- CloseProject -----------------------------------------------------------

func TestApp_CloseProject_LastProject_EmptyState(t *testing.T) {
	dir := makeProjectDir(t)
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	if _, err := app.OpenProject(dir); err != nil {
		t.Fatalf("OpenProject: %v", err)
	}

	if err := app.CloseProject(0); err != nil {
		t.Fatalf("CloseProject: %v", err)
	}

	app.mu.RLock()
	n := len(app.openedProjects)
	active := app.activeIndex
	app.mu.RUnlock()

	if n != 0 {
		t.Fatalf("expected 0 projects, got %d", n)
	}
	if active != -1 {
		t.Fatalf("expected activeIndex=-1, got %d", active)
	}
}

func TestApp_CloseProject_MiddleTab_ShiftsActive(t *testing.T) {
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	dirs := []string{makeProjectDir(t), makeProjectDir(t), makeProjectDir(t)}
	for _, d := range dirs {
		if _, err := app.OpenProject(d); err != nil {
			t.Fatalf("OpenProject: %v", err)
		}
	}
	// activeIndex is now 2 (last opened).
	// Close idx=1 (middle). Active was 2, becomes 1.
	if err := app.CloseProject(1); err != nil {
		t.Fatalf("CloseProject: %v", err)
	}

	app.mu.RLock()
	n := len(app.openedProjects)
	active := app.activeIndex
	app.mu.RUnlock()

	if n != 2 {
		t.Fatalf("expected 2 projects, got %d", n)
	}
	if active != 1 {
		t.Fatalf("expected activeIndex=1 after closing middle, got %d", active)
	}
}

func TestApp_CloseProject_OutOfRange_ReturnsError(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	if err := app.CloseProject(5); err == nil {
		t.Fatal("expected error for out-of-range index")
	}
}

// --- SwitchProject ----------------------------------------------------------

func TestApp_SwitchProject_SetsActive(t *testing.T) {
	withTempRegistry(t)
	captureEmits(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())

	dir1, dir2 := makeProjectDir(t), makeProjectDir(t)
	if _, err := app.OpenProject(dir1); err != nil {
		t.Fatalf("OpenProject 1: %v", err)
	}
	if _, err := app.OpenProject(dir2); err != nil {
		t.Fatalf("OpenProject 2: %v", err)
	}

	if err := app.SwitchProject(0); err != nil {
		t.Fatalf("SwitchProject: %v", err)
	}

	app.mu.RLock()
	active := app.activeIndex
	app.mu.RUnlock()
	if active != 0 {
		t.Fatalf("expected activeIndex=0, got %d", active)
	}
}

// --- ReorderProjects --------------------------------------------------------

func TestApp_ReorderProjects_InvalidPermutation_Errors(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, t.TempDir())
	setTestProject(t, app, t.TempDir())

	if err := app.ReorderProjects([]int{0}); err == nil {
		t.Fatal("expected error for wrong-length order")
	}
	if err := app.ReorderProjects([]int{0, 0}); err == nil {
		t.Fatal("expected error for duplicate index")
	}
	if err := app.ReorderProjects([]int{0, 5}); err == nil {
		t.Fatal("expected error for out-of-range index")
	}
}

func TestApp_ReorderProjects_Valid(t *testing.T) {
	withTempRegistry(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	dir1, dir2, dir3 := makeProjectDir(t), makeProjectDir(t), makeProjectDir(t)
	setTestProject(t, app, dir1)
	setTestProject(t, app, dir2)
	setTestProject(t, app, dir3)
	app.activeIndex = 2 // active = dir3 (old idx 2)

	if err := app.ReorderProjects([]int{2, 0, 1}); err != nil {
		t.Fatalf("ReorderProjects: %v", err)
	}

	app.mu.RLock()
	order0 := app.openedProjects[0].Path
	newActive := app.activeIndex
	app.mu.RUnlock()

	if order0 != dir3 {
		t.Fatalf("expected dir3 at idx 0 after reorder, got %s", order0)
	}
	if newActive != 0 {
		t.Fatalf("expected activeIndex=0 (was dir3), got %d", newActive)
	}
}

// --- restoreRegistry --------------------------------------------------------

func TestApp_RestoreRegistry_SkipsMissingPaths(t *testing.T) {
	withTempRegistry(t)
	captureEmits(t)

	goodDir := makeProjectDir(t)
	// Save a registry with one valid + one missing path.
	reg := &ProjectsRegistry{
		Version:     registryVersion,
		ActiveIndex: 0,
		OpenedProjects: []RegistryEntry{
			{Path: goodDir, Name: "good", LastOpened: time.Now()},
			{Path: "/nonexistent/path/nowhere", Name: "gone", LastOpened: time.Now()},
		},
	}
	if err := saveRegistry(reg); err != nil {
		t.Fatalf("saveRegistry: %v", err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.restoreRegistry()

	app.mu.RLock()
	n := len(app.openedProjects)
	active := app.activeIndex
	app.mu.RUnlock()

	if n != 1 {
		t.Fatalf("expected 1 restored project, got %d", n)
	}
	if active != 0 {
		t.Fatalf("expected activeIndex=0, got %d", active)
	}
}

// --- persistRegistry --------------------------------------------------------

func TestApp_PersistRegistry_SavesState(t *testing.T) {
	withTempRegistry(t)

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	dir := makeProjectDir(t)
	setTestProject(t, app, dir)

	app.persistRegistry()

	loaded, err := loadRegistry()
	if err != nil {
		t.Fatalf("loadRegistry after persist: %v", err)
	}
	if len(loaded.OpenedProjects) != 1 {
		t.Fatalf("expected 1 project in registry, got %d", len(loaded.OpenedProjects))
	}
}

// --- ReadArtifact multi-project ---------------------------------------------

func TestApp_ReadArtifact_PathTraversal_MultiProject(t *testing.T) {
	dir1 := t.TempDir()
	dir2 := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir1, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir2, ".yukki", "stories"), 0o755); err != nil {
		t.Fatal(err)
	}

	// Write files in both projects.
	file1 := filepath.Join(dir1, ".yukki", "stories", "a.md")
	file2 := filepath.Join(dir2, ".yukki", "stories", "b.md")
	if err := os.WriteFile(file1, []byte("# a"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file2, []byte("# b"), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp(&provider.MockProvider{}, newTestLogger())
	setTestProject(t, app, dir1)
	setTestProject(t, app, dir2)

	// Both project files should be readable.
	if _, err := app.ReadArtifact(file1); err != nil {
		t.Fatalf("ReadArtifact project1: %v", err)
	}
	if _, err := app.ReadArtifact(file2); err != nil {
		t.Fatalf("ReadArtifact project2: %v", err)
	}

	// A file outside both .yukki/ dirs must be rejected.
	outside := filepath.Join(dir1, "outside.md")
	if err := os.WriteFile(outside, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := app.ReadArtifact(outside); err == nil {
		t.Fatal("expected path-traversal error for outside file")
	}
}

// --- SelectProject delegates to OpenProject ---------------------------------

func TestApp_SelectProject_DelegatesToOpenProject(t *testing.T) {
	dir := makeProjectDir(t)
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
	app.mu.RUnlock()
	if n != 1 {
		t.Fatalf("expected 1 opened project via SelectProject, got %d", n)
	}
}
