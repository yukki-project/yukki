// Package templates loads the SPDD artifact templates with a project-first,
// embed-fallback strategy.
//
// Implements O3 of the CORE-001 canvas: 4 templates (story, analysis,
// canvas-reasons, tests) are embedded in the binary; the project-level
// templates/<name>.md takes priority when present.
package templates

import (
	"embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

//go:embed embedded/story.md embedded/analysis.md embedded/canvas-reasons.md embedded/tests.md
var embeddedFS embed.FS

// Source identifies where a loaded template came from.
type Source string

const (
	// SourceProject means the template was found under <projectDir>/templates/.
	SourceProject Source = "project"
	// SourceEmbedded means the template was loaded from the binary's embed.FS.
	SourceEmbedded Source = "embedded"
)

// ErrEmbedMissing is returned when the binary is missing its embedded template
// (should never happen in a correctly built binary).
var ErrEmbedMissing = errors.New("embedded template missing from binary")

// Loader resolves templates from the project directory or embedded fallback.
type Loader struct {
	ProjectDir string
}

// NewLoader returns a Loader rooted at projectDir.
func NewLoader(projectDir string) *Loader {
	return &Loader{ProjectDir: projectDir}
}

// LoadStory returns the story template, the source it came from, and any error.
func (l *Loader) LoadStory() (string, Source, error) {
	return l.load("story.md")
}

// LoadAnalysis returns the analysis template.
func (l *Loader) LoadAnalysis() (string, Source, error) {
	return l.load("analysis.md")
}

// LoadCanvasReasons returns the canvas REASONS template.
func (l *Loader) LoadCanvasReasons() (string, Source, error) {
	return l.load("canvas-reasons.md")
}

// LoadTests returns the tests template.
func (l *Loader) LoadTests() (string, Source, error) {
	return l.load("tests.md")
}

func (l *Loader) load(name string) (string, Source, error) {
	if l.ProjectDir != "" {
		projectPath := filepath.Join(l.ProjectDir, "templates", name)
		data, err := os.ReadFile(projectPath)
		if err == nil {
			return string(data), SourceProject, nil
		}
		if !errors.Is(err, os.ErrNotExist) {
			return "", "", fmt.Errorf("read %s: %w", projectPath, err)
		}
	}

	embedPath := "embedded/" + name
	data, err := embeddedFS.ReadFile(embedPath)
	if err != nil {
		return "", "", fmt.Errorf("%w: %s", ErrEmbedMissing, embedPath)
	}
	return string(data), SourceEmbedded, nil
}
