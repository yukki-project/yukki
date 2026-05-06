package uiapp

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// withTempRegistry redirects os.UserConfigDir() to a temp directory for
// the duration of the test.  On Linux/macOS XDG_CONFIG_HOME is set; on
// Windows APPDATA is set.  Both are set so the helper works on all
// platforms in CI.
func withTempRegistry(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("APPDATA", dir)
	return dir
}

func TestRegistry_LoadMissing_ReturnsEmpty(t *testing.T) {
	withTempRegistry(t)
	reg, err := loadRegistry()
	if err != nil {
		t.Fatalf("loadRegistry with missing file: %v", err)
	}
	if reg.Version != registryVersion {
		t.Fatalf("version = %d, want %d", reg.Version, registryVersion)
	}
	if len(reg.OpenedProjects) != 0 {
		t.Fatalf("expected 0 opened projects, got %d", len(reg.OpenedProjects))
	}
}

func TestRegistry_LoadCorrupted_StartsEmpty(t *testing.T) {
	base := withTempRegistry(t)
	dir := filepath.Join(base, "yukki")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "projects.json")
	if err := os.WriteFile(path, []byte("not valid json {{{{"), 0o600); err != nil {
		t.Fatal(err)
	}

	reg, err := loadRegistry()
	if err != nil {
		t.Fatalf("loadRegistry with corrupt file: %v", err)
	}
	if len(reg.OpenedProjects) != 0 {
		t.Fatalf("expected empty registry, got %d projects", len(reg.OpenedProjects))
	}
	bak := path + ".broken.bak"
	if _, err := os.Stat(bak); err != nil {
		t.Fatalf("expected .broken.bak file, err = %v", err)
	}
}

func TestRegistry_LoadUnknownVersion_StartsEmpty(t *testing.T) {
	base := withTempRegistry(t)
	dir := filepath.Join(base, "yukki")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	data, _ := json.Marshal(ProjectsRegistry{Version: 99})
	if err := os.WriteFile(filepath.Join(dir, "projects.json"), data, 0o600); err != nil {
		t.Fatal(err)
	}

	reg, err := loadRegistry()
	if err != nil {
		t.Fatalf("loadRegistry with unknown version: %v", err)
	}
	if len(reg.OpenedProjects) != 0 {
		t.Fatalf("expected empty registry, got %d projects", len(reg.OpenedProjects))
	}
}

func TestRegistry_SaveAndLoad_RoundTrip(t *testing.T) {
	withTempRegistry(t)
	original := &ProjectsRegistry{
		Version:     registryVersion,
		ActiveIndex: 1,
		OpenedProjects: []RegistryEntry{
			{Path: "/proj/a", Name: "a", LastOpened: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)},
			{Path: "/proj/b", Name: "b", LastOpened: time.Date(2026, 5, 2, 0, 0, 0, 0, time.UTC)},
		},
		RecentProjects: []RegistryEntry{
			{Path: "/old/c", Name: "c", LastOpened: time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)},
		},
	}
	if err := saveRegistry(original); err != nil {
		t.Fatalf("saveRegistry: %v", err)
	}

	loaded, err := loadRegistry()
	if err != nil {
		t.Fatalf("loadRegistry after save: %v", err)
	}
	if loaded.ActiveIndex != original.ActiveIndex {
		t.Fatalf("active_index = %d, want %d", loaded.ActiveIndex, original.ActiveIndex)
	}
	if len(loaded.OpenedProjects) != len(original.OpenedProjects) {
		t.Fatalf("opened_projects len = %d, want %d", len(loaded.OpenedProjects), len(original.OpenedProjects))
	}
	if loaded.OpenedProjects[0].Path != "/proj/a" {
		t.Fatalf("path[0] = %q, want /proj/a", loaded.OpenedProjects[0].Path)
	}
	if len(loaded.RecentProjects) != 1 || loaded.RecentProjects[0].Path != "/old/c" {
		t.Fatalf("unexpected recent_projects: %+v", loaded.RecentProjects)
	}
}

func TestRegistryPath_CreatesDir(t *testing.T) {
	withTempRegistry(t)
	path, err := registryPath()
	if err != nil {
		t.Fatalf("registryPath: %v", err)
	}
	dir := filepath.Dir(path)
	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		t.Fatalf("expected directory %s to be created, err = %v", dir, err)
	}
}
