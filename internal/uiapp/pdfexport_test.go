// UI-015 — Tests pour SaveFilePdf, WritePdfFile et ResolveCanvasChain.

package uiapp

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/yukki-project/yukki/internal/provider"
)

// withSaveDialogStub temporarily replaces saveFileDialog for the duration
// of the test, then restores it. Same pattern as withDialogStub for
// OpenDirectoryDialog.
func withSaveDialogStub(t *testing.T, stub func(ctx context.Context, opts runtime.SaveDialogOptions) (string, error)) {
	t.Helper()
	prev := saveFileDialog
	saveFileDialog = stub
	t.Cleanup(func() { saveFileDialog = prev })
}

// --- SaveFilePdf -------------------------------------------------------

func TestApp_SaveFilePdf_Success(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	expectedPath := filepath.Join(dir, "export.pdf")
	withSaveDialogStub(t, func(ctx context.Context, opts runtime.SaveDialogOptions) (string, error) {
		if opts.DefaultFilename != "spdd-export.pdf" {
			t.Errorf("suggested name not propagated: %q", opts.DefaultFilename)
		}
		if len(opts.Filters) == 0 || opts.Filters[0].Pattern != "*.pdf" {
			t.Errorf("missing or wrong filter: %+v", opts.Filters)
		}
		return expectedPath, nil
	})

	got, err := app.SaveFilePdf("spdd-export.pdf")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != expectedPath {
		t.Fatalf("path mismatch: got %q want %q", got, expectedPath)
	}
}

func TestApp_SaveFilePdf_UserCancelled(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	withSaveDialogStub(t, func(ctx context.Context, opts runtime.SaveDialogOptions) (string, error) {
		return "", nil
	})

	got, err := app.SaveFilePdf("any.pdf")
	if err != nil {
		t.Fatalf("cancel must not return error, got: %v", err)
	}
	if got != "" {
		t.Fatalf("cancel must return empty string, got %q", got)
	}
}

func TestApp_SaveFilePdf_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	// no project set

	_, err := app.SaveFilePdf("x.pdf")
	if err == nil {
		t.Fatal("expected error when no project is open")
	}
	if !strings.Contains(err.Error(), "no project") {
		t.Fatalf("expected 'no project' error, got: %v", err)
	}
}

// --- WritePdfFile ------------------------------------------------------

func TestApp_WritePdfFile_Success(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()

	target := filepath.Join(dir, "out.pdf")
	rawBytes := []byte{0x25, 0x50, 0x44, 0x46} // "%PDF" magic
	encoded := base64.StdEncoding.EncodeToString(rawBytes)

	if err := app.WritePdfFile(target, encoded); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("re-read failed: %v", err)
	}
	if string(got) != string(rawBytes) {
		t.Fatalf("bytes mismatch: got % x want % x", got, rawBytes)
	}
}

func TestApp_WritePdfFile_EmptyPath(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()

	err := app.WritePdfFile("", "anything")
	if err == nil || !strings.Contains(err.Error(), "empty path") {
		t.Fatalf("expected 'empty path' error, got: %v", err)
	}
}

func TestApp_WritePdfFile_InvalidBase64(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()

	target := filepath.Join(dir, "out.pdf")
	err := app.WritePdfFile(target, "not!valid!base64==")
	if err == nil {
		t.Fatal("expected decode error")
	}
}

// --- ResolveCanvasChain -----------------------------------------------

// writeArtifact is a helper that writes content under projectRoot/.yukki/<kind>/<id>-<slug>.md.
func writeArtifact(t *testing.T, projectRoot, kind, filename, content string) string {
	t.Helper()
	subdir := filepath.Join(projectRoot, ".yukki", kind)
	if err := os.MkdirAll(subdir, 0o755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(subdir, filename)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestApp_ResolveCanvasChain_AllPresent(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	storyPath := writeArtifact(t, dir, "stories", "UI-015-x.md", "story content")
	analysisPath := writeArtifact(t, dir, "analysis", "UI-015-x.md", "analysis content")

	canvasYaml := `---
id: UI-015
slug: x
story: .yukki/stories/UI-015-x.md
analysis: .yukki/analysis/UI-015-x.md
status: reviewed
---

# Canvas
`
	canvasPath := writeArtifact(t, dir, "prompts", "UI-015-x.md", canvasYaml)

	chain, err := app.ResolveCanvasChain(canvasPath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if chain.StoryPath != storyPath {
		t.Errorf("story path mismatch:\n got  %q\n want %q", chain.StoryPath, storyPath)
	}
	if chain.AnalysisPath != analysisPath {
		t.Errorf("analysis path mismatch:\n got  %q\n want %q", chain.AnalysisPath, analysisPath)
	}
	if chain.CanvasPath != canvasPath {
		t.Errorf("canvas path mismatch:\n got  %q\n want %q", chain.CanvasPath, canvasPath)
	}
}

func TestApp_ResolveCanvasChain_BrokenAnalysisRef(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	storyPath := writeArtifact(t, dir, "stories", "UI-015-x.md", "story content")
	// note: no analysis file

	canvasYaml := `---
id: UI-015
story: .yukki/stories/UI-015-x.md
analysis: .yukki/analysis/UI-015-x.md
---

content`
	canvasPath := writeArtifact(t, dir, "prompts", "UI-015-x.md", canvasYaml)

	chain, err := app.ResolveCanvasChain(canvasPath)
	if err != nil {
		t.Fatalf("expected no error on broken ref (Invariant I2), got: %v", err)
	}
	if chain.StoryPath != storyPath {
		t.Errorf("story path missing: got %q", chain.StoryPath)
	}
	if chain.AnalysisPath != "" {
		t.Errorf("expected empty AnalysisPath for broken ref, got %q", chain.AnalysisPath)
	}
	if chain.CanvasPath != canvasPath {
		t.Errorf("canvas path mismatch: %q", chain.CanvasPath)
	}
}

func TestApp_ResolveCanvasChain_NoCrossReferences(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	canvasYaml := `---
id: UI-015
slug: x
status: reviewed
---

# Canvas without story/analysis cross-references
`
	canvasPath := writeArtifact(t, dir, "prompts", "UI-015-x.md", canvasYaml)

	chain, err := app.ResolveCanvasChain(canvasPath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if chain.StoryPath != "" || chain.AnalysisPath != "" {
		t.Errorf("expected empty refs, got %+v", chain)
	}
	if chain.CanvasPath != canvasPath {
		t.Errorf("canvas path mismatch")
	}
}

func TestApp_ResolveCanvasChain_PathTraversalRejected(t *testing.T) {
	dir := t.TempDir()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()
	setTestProject(t, app, dir)

	for _, bad := range []string{
		filepath.Join(dir, "..", "outside.md"),
		"/etc/passwd",
	} {
		_, err := app.ResolveCanvasChain(bad)
		if err == nil || !strings.Contains(err.Error(), "outside any opened project") {
			t.Errorf("expected path-traversal rejection for %q, got: %v", bad, err)
		}
	}
}

func TestApp_ResolveCanvasChain_NoProject(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.ctx = context.Background()

	_, err := app.ResolveCanvasChain("/some/path")
	if err == nil {
		t.Fatal("expected error when no project is open")
	}
}

// --- parseCanvasFrontmatter (unit tests on the parser helper) ---------

func TestParseCanvasFrontmatter_NoFrontmatter(t *testing.T) {
	fm, err := parseCanvasFrontmatter([]byte("just markdown\n# heading"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fm.Story != "" || fm.Analysis != "" {
		t.Fatalf("expected empty fm, got %+v", fm)
	}
}

func TestParseCanvasFrontmatter_CRLFLineEndings(t *testing.T) {
	content := "---\r\nstory: .yukki/stories/X.md\r\nanalysis: .yukki/analysis/X.md\r\n---\r\n# title\r\n"
	fm, err := parseCanvasFrontmatter([]byte(content))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fm.Story != ".yukki/stories/X.md" {
		t.Errorf("story mismatch: %q", fm.Story)
	}
	if fm.Analysis != ".yukki/analysis/X.md" {
		t.Errorf("analysis mismatch: %q", fm.Analysis)
	}
}

func TestParseCanvasFrontmatter_MalformedYaml(t *testing.T) {
	content := "---\nstory: [unclosed\n---\n"
	_, err := parseCanvasFrontmatter([]byte(content))
	if err == nil {
		t.Fatal("expected YAML parse error")
	}
}
