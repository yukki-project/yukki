package settings

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoad_FileMissing_ReturnsZero(t *testing.T) {
	s := NewStore(t.TempDir())

	got, err := s.Load()
	if err != nil {
		t.Fatalf("Load on empty dir: %v", err)
	}
	if got.DebugMode {
		t.Errorf("expected DebugMode=false on first launch, got true")
	}
}

func TestSaveLoad_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	s := NewStore(dir)

	if err := s.Save(Settings{DebugMode: true}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	got, err := s.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !got.DebugMode {
		t.Errorf("expected DebugMode=true after Save, got false")
	}
}

func TestSave_AtomicLeavesNoTempFile(t *testing.T) {
	dir := t.TempDir()
	s := NewStore(dir)

	if err := s.Save(Settings{DebugMode: true}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Errorf("temp file %s leaked after Save", e.Name())
		}
	}
}

func TestLoad_CorruptJSON_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, fileName), []byte("not json"), 0o600); err != nil {
		t.Fatalf("seed corrupt file: %v", err)
	}

	s := NewStore(dir)
	if _, err := s.Load(); err == nil {
		t.Errorf("expected error on corrupt JSON, got nil")
	}
}

func TestSave_CreatesMissingDir(t *testing.T) {
	parent := t.TempDir()
	dir := filepath.Join(parent, "nested", "yukki")
	s := NewStore(dir)

	if err := s.Save(Settings{DebugMode: true}); err != nil {
		t.Fatalf("Save into missing dir: %v", err)
	}

	if _, err := os.Stat(filepath.Join(dir, fileName)); err != nil {
		t.Errorf("settings.json not created: %v", err)
	}
}
