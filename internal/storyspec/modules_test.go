package storyspec

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadKnownModules_FallbackWhenNoFile(t *testing.T) {
	dir := t.TempDir() // no modules.yaml inside
	modules, err := LoadKnownModules(dir)
	if err != nil {
		t.Fatalf("LoadKnownModules: %v", err)
	}
	if len(modules) == 0 {
		t.Error("expected non-empty modules list from embedded default")
	}
	// Check a known entry from default-modules.yaml
	found := false
	for _, m := range modules {
		if m == "internal/draft" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected 'internal/draft' in default modules, got %v", modules)
	}
}

func TestLoadKnownModules_ReadsProjectFile(t *testing.T) {
	dir := t.TempDir()
	yukkiDir := filepath.Join(dir, ".yukki")
	if err := os.MkdirAll(yukkiDir, 0o755); err != nil {
		t.Fatal(err)
	}
	custom := []byte("modules:\n  - my/custom/module\n  - another/module\n")
	if err := os.WriteFile(filepath.Join(yukkiDir, "modules.yaml"), custom, 0o644); err != nil {
		t.Fatal(err)
	}
	modules, err := LoadKnownModules(dir)
	if err != nil {
		t.Fatalf("LoadKnownModules: %v", err)
	}
	if len(modules) != 2 || modules[0] != "my/custom/module" {
		t.Errorf("expected custom modules, got %v", modules)
	}
}

func TestLoadKnownModules_EmptyProjectDir_UsesFallback(t *testing.T) {
	modules, err := LoadKnownModules("")
	if err != nil {
		t.Fatalf("LoadKnownModules empty dir: %v", err)
	}
	if len(modules) == 0 {
		t.Error("expected non-empty fallback modules")
	}
}
