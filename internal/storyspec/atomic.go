// Package storyspec — O3 of the CORE-009 canvas: atomic file write helper.
//
// WriteAtomic persists content to path using a temp-file-then-rename pattern
// identical to DraftStore.Save (CORE-007). The temp file is created in the
// same directory as path to guarantee that os.Rename stays on the same volume.
package storyspec

import (
	"fmt"
	"os"
	"path/filepath"
)

// WriteAtomic writes content to path using a temp-file-then-rename pattern.
// It creates all missing parent directories (perm 0755) before writing.
// The temp file is created in the same directory as path to ensure
// os.Rename stays on the same filesystem volume.
func WriteAtomic(path string, content []byte) error {
	dir := filepath.Dir(path)

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("storyspec write: mkdir %s: %w", dir, err)
	}

	f, err := os.CreateTemp(dir, "*.tmp")
	if err != nil {
		return fmt.Errorf("storyspec write: create temp: %w", err)
	}
	tmpName := f.Name()

	_, writeErr := f.Write(content)
	closeErr := f.Close()
	if writeErr != nil {
		_ = os.Remove(tmpName)
		return fmt.Errorf("storyspec write: write temp: %w", writeErr)
	}
	if closeErr != nil {
		_ = os.Remove(tmpName)
		return fmt.Errorf("storyspec write: close temp: %w", closeErr)
	}

	if err := os.Rename(tmpName, path); err != nil {
		_ = os.Remove(tmpName)
		return fmt.Errorf("storyspec write: rename %s -> %s: %w", tmpName, path, err)
	}

	return nil
}
