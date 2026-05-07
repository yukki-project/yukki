// Package draft — O2 of the CORE-007 canvas: DraftStore with atomic I/O
// and path-traversal guard.
package draft

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ErrPathTraversal is returned when a caller-supplied id would escape the
// drafts directory via path-traversal sequences ("../", "..\", etc.).
var ErrPathTraversal = errors.New("draft: path traversal detected")

// DraftStore persists Draft values as JSON files under BaseDir.
// All file names are derived from the sanitised draft ID, so concurrent
// access to different IDs is safe. Concurrent writes to the *same* ID are
// serialised by the OS temp-then-rename pattern (last writer wins).
type DraftStore struct {
	baseDir string
}

// NewDraftStore returns a DraftStore whose JSON files live in baseDir.
// If baseDir is empty, the platform config directory is used:
//
//	<os.UserConfigDir()>/yukki/drafts
func NewDraftStore(baseDir string) (*DraftStore, error) {
	if baseDir == "" {
		cfg, err := os.UserConfigDir()
		if err != nil {
			return nil, fmt.Errorf("draft: resolve config dir: %w", err)
		}
		baseDir = filepath.Join(cfg, "yukki", "drafts")
	}
	return &DraftStore{baseDir: baseDir}, nil
}

// Save serialises draft as JSON into <baseDir>/<sanitisedID>.json.
// The write is atomic: a temp file is created in baseDir and then renamed
// to the final path, so a crash mid-write never leaves a corrupt file.
//
// If draft.ID is empty, the file is keyed by "unsaved-<epoch-ms>".
// baseDir is created with MkdirAll (mode 0700) when it does not yet exist.
func (s *DraftStore) Save(d Draft) error {
	key := d.ID
	if key == "" {
		key = fmt.Sprintf("unsaved-%d", time.Now().UnixMilli())
	}
	name, err := sanitiseID(key)
	if err != nil {
		return err
	}

	d.SavedAt = time.Now()

	if err := os.MkdirAll(s.baseDir, 0o700); err != nil {
		return fmt.Errorf("draft: mkdir %s: %w", s.baseDir, err)
	}

	data, err := json.MarshalIndent(d, "", "  ")
	if err != nil {
		return fmt.Errorf("draft: marshal %s: %w", name, err)
	}

	// Atomic write via temp-then-rename (same directory → same filesystem).
	tmp, err := os.CreateTemp(s.baseDir, "*.tmp")
	if err != nil {
		return fmt.Errorf("draft: create temp: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }() // no-op after successful rename

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("draft: write temp %s: %w", tmpPath, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("draft: close temp %s: %w", tmpPath, err)
	}

	final := filepath.Join(s.baseDir, name+".json")
	if err := os.Rename(tmpPath, final); err != nil {
		return fmt.Errorf("draft: rename %s -> %s: %w", tmpPath, final, err)
	}
	return nil
}

// Load reads and deserialises the draft identified by id.
//
// Returns ErrPathTraversal if id contains traversal sequences.
// Returns a wrapped os.ErrNotExist if no matching file is present.
func (s *DraftStore) Load(id string) (Draft, error) {
	name, err := sanitiseID(id)
	if err != nil {
		return Draft{}, err
	}
	path := filepath.Join(s.baseDir, name+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		return Draft{}, fmt.Errorf("draft: load %s: %w", name, err)
	}
	var d Draft
	if err := json.Unmarshal(data, &d); err != nil {
		return Draft{}, fmt.Errorf("draft: unmarshal %s: %w", name, err)
	}
	return d, nil
}

// List returns a DraftSummary for every *.json file in baseDir, sorted by
// UpdatedAt (SavedAt) descending — most recently saved first.
//
// Returns an empty slice when baseDir does not exist (first launch).
func (s *DraftStore) List() ([]DraftSummary, error) {
	entries, err := os.ReadDir(s.baseDir)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("draft: list %s: %w", s.baseDir, err)
	}

	var summaries []DraftSummary
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		path := filepath.Join(s.baseDir, e.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			continue // skip unreadable files silently
		}
		var d Draft
		if err := json.Unmarshal(data, &d); err != nil {
			continue // skip corrupt files silently
		}
		id := strings.TrimSuffix(e.Name(), ".json")
		summaries = append(summaries, DraftSummary{
			ID:        id,
			Title:     d.Title,
			UpdatedAt: d.SavedAt,
		})
	}

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].UpdatedAt.After(summaries[j].UpdatedAt)
	})
	return summaries, nil
}

// Delete removes the JSON file for id. Returns ErrPathTraversal if id
// contains traversal sequences. Returns nil when the file is already absent
// (idempotent).
func (s *DraftStore) Delete(id string) error {
	name, err := sanitiseID(id)
	if err != nil {
		return err
	}
	path := filepath.Join(s.baseDir, name+".json")
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("draft: delete %s: %w", name, err)
	}
	return nil
}

// sanitiseID cleans id and rejects any value that would escape baseDir.
// An id is rejected when, after filepath.Clean, it still contains a path
// separator or starts with "..".
func sanitiseID(id string) (string, error) {
	cleaned := filepath.Clean(id)
	if strings.HasPrefix(cleaned, "..") {
		return "", fmt.Errorf("%w: %q", ErrPathTraversal, id)
	}
	if strings.ContainsAny(cleaned, `/\`) {
		return "", fmt.Errorf("%w: %q contains path separator", ErrPathTraversal, id)
	}
	return cleaned, nil
}
