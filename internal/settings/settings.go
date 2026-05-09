// Package settings persists yukki's UI preferences (currently just
// the debug-mode toggle) under <configDir>/yukki/settings.json.
// O3 of the OPS-001 canvas.
//
// File I/O follows the same atomic temp-then-rename pattern as
// internal/draft so that a crash mid-write never leaves a corrupt
// settings.json. The file is human-readable JSON — there is exactly
// one settings file per installation.
package settings

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// fileName is the filename written under the store's baseDir.
const fileName = "settings.json"

// Settings holds the user-facing preferences persisted between
// sessions. New fields should default to the zero value so that an
// older settings.json missing those keys still loads correctly.
type Settings struct {
	// DebugMode toggles WARN → DEBUG in the desktop logger and
	// shows the "DEBUG ON" badge in the TitleBar.
	DebugMode bool `json:"debugMode"`
}

// Store reads and writes the Settings file under baseDir. Callers
// resolve baseDir once via configdir.BaseDir() and pass it in.
type Store struct {
	baseDir string
}

// NewStore returns a Store rooted at baseDir. baseDir is created on
// first Save if it does not yet exist; Load tolerates a missing
// directory by returning the zero Settings.
func NewStore(baseDir string) *Store {
	return &Store{baseDir: baseDir}
}

// Load reads <baseDir>/settings.json. Returns the zero Settings
// (and a nil error) on first launch — when the file does not exist
// yet — so the caller can treat "no settings" and "default settings"
// uniformly. Any other I/O or JSON error is wrapped and returned.
func (s *Store) Load() (Settings, error) {
	path := filepath.Join(s.baseDir, fileName)
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return Settings{}, nil
	}
	if err != nil {
		return Settings{}, fmt.Errorf("settings: read %s: %w", path, err)
	}

	var out Settings
	if err := json.Unmarshal(data, &out); err != nil {
		return Settings{}, fmt.Errorf("settings: unmarshal %s: %w", path, err)
	}
	return out, nil
}

// Save writes settings to <baseDir>/settings.json atomically — the
// JSON is first written to a temp file in baseDir and then renamed,
// so a crash mid-write never leaves a corrupt settings.json.
func (s *Store) Save(settings Settings) error {
	if err := os.MkdirAll(s.baseDir, 0o700); err != nil {
		return fmt.Errorf("settings: mkdir %s: %w", s.baseDir, err)
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return fmt.Errorf("settings: marshal: %w", err)
	}

	tmp, err := os.CreateTemp(s.baseDir, "settings-*.tmp")
	if err != nil {
		return fmt.Errorf("settings: create temp: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }()

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("settings: write temp %s: %w", tmpPath, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("settings: close temp %s: %w", tmpPath, err)
	}

	final := filepath.Join(s.baseDir, fileName)
	if err := os.Rename(tmpPath, final); err != nil {
		return fmt.Errorf("settings: rename %s -> %s: %w", tmpPath, final, err)
	}
	return nil
}
