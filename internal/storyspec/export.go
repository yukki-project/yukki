// Package storyspec — O4 of the CORE-009 canvas: export types and StoryExport entry point.
//
// StoryExport is the single entry point for both CLI and UI export of a SPDD
// story artefact. It orchestrates Render → Conform → conflict check → WriteAtomic.
package storyspec

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/yukki-project/yukki/internal/draft"
)

// ExportOptions controls the behaviour of StoryExport.
type ExportOptions struct {
	// Overwrite allows overwriting an existing story file.
	// When false (default), StoryExport returns an *ExportConflictError if
	// the destination file already exists.
	Overwrite bool
}

// ExportResult is returned by a successful StoryExport call.
type ExportResult struct {
	Path      string    // absolute path of the written file
	Bytes     int64     // number of bytes written
	WrittenAt time.Time // wall-clock time of the write
}

// ExportConflictError is returned by StoryExport when a story file already
// exists and ExportOptions.Overwrite is false.
// Use errors.As to extract the structured details.
type ExportConflictError struct {
	ExistingPath      string
	ExistingUpdatedAt time.Time
}

func (e *ExportConflictError) Error() string {
	return fmt.Sprintf("story already exists at %s (updated %s)",
		e.ExistingPath, e.ExistingUpdatedAt.Format(time.RFC3339))
}

// StoryExport is the single entry point for exporting a SPDD story artefact.
// It calls Render → Conform → conflict check → WriteAtomic and returns the
// export result or a structured error.
//
// storiesDir is the absolute path to the target directory
// (typically <project>/.yukki/stories/).
// The final file path is storiesDir/<d.ID>-<d.Slug>.md.
func StoryExport(d draft.Draft, opts ExportOptions, storiesDir string) (ExportResult, error) {
	// O1: render
	rendered, err := Render(d)
	if err != nil {
		return ExportResult{}, fmt.Errorf("story export: render: %w", err)
	}

	// O2: conform (post-condition; never skip)
	if err := Conform(rendered); err != nil {
		return ExportResult{}, fmt.Errorf("story export: conform: %w", err)
	}

	// Anti-traversal: ValidateSlug was already called inside Render, but we
	// double-check that the final path stays inside storiesDir.
	filename := d.ID + "-" + d.Slug + ".md"
	destPath := filepath.Join(storiesDir, filename)
	if rel, relErr := filepath.Rel(storiesDir, destPath); relErr != nil || filepath.IsAbs(rel) {
		return ExportResult{}, fmt.Errorf("story export: path traversal detected for slug %q", d.Slug)
	}

	// Conflict check
	if !opts.Overwrite {
		info, statErr := os.Stat(destPath)
		if statErr == nil {
			return ExportResult{}, &ExportConflictError{
				ExistingPath:      destPath,
				ExistingUpdatedAt: info.ModTime(),
			}
		}
		// Any error other than "not found" is unexpected — bubble up.
		if !os.IsNotExist(statErr) {
			return ExportResult{}, fmt.Errorf("story export: stat %s: %w", destPath, statErr)
		}
	}

	// O3: write
	if err := WriteAtomic(destPath, rendered); err != nil {
		return ExportResult{}, fmt.Errorf("story export: write: %w", err)
	}

	return ExportResult{
		Path:      destPath,
		Bytes:     int64(len(rendered)),
		WrittenAt: time.Now(),
	}, nil
}
