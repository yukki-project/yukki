package storyspec_test

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/yukki-project/yukki/internal/draft"
	"github.com/yukki-project/yukki/internal/storyspec"
)

// goldenDraft returns the draft that matches testdata/golden_story.md byte-for-byte.
func goldenDraft() draft.Draft {
	return draft.Draft{
		ID:      "CORE-009",
		Slug:    "export-story-md-to-yukki-stories",
		Title:   "Export du fichier .md final dans .yukki/stories/",
		Status:  "draft",
		Created: "2026-05-07",
		Updated: "2026-05-07",
		Owner:   "Thibaut",
		Modules: []string{"internal/storyspec", "internal/uiapp"},
		Sections: map[string]string{
			"bg": "Le contenu du background.",
			"bv": "La valeur métier.",
			"si": "- Point un\n- Point deux",
			"so": "- Hors périmètre.",
		},
		AC: []draft.AcceptanceCriterion{
			{
				ID:    "AC1",
				Title: "Export écrit le fichier",
				Given: "un draft valide",
				When:  "StoryExport est appelé",
				Then:  "le fichier est créé dans .yukki/stories/",
			},
		},
	}
}

// ─── Render ──────────────────────────────────────────────────────────────────

func TestRender_GoldenFile(t *testing.T) {
	golden, err := os.ReadFile(filepath.Join("testdata", "golden_story.md"))
	if err != nil {
		t.Fatalf("read golden: %v", err)
	}
	got, err := storyspec.Render(goldenDraft())
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	if !bytes.Equal(got, golden) {
		t.Errorf("Render output differs from golden.\nGot:\n%s\nWant:\n%s", got, golden)
	}
}

func TestRender_EmptyOptionalSections_Omitted(t *testing.T) {
	d := goldenDraft()
	// No oq or notes in sections — they should not appear in output.
	got, err := storyspec.Render(d)
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	s := string(got)
	if bytes.Contains(got, []byte("## Open Questions")) {
		t.Errorf("expected 'Open Questions' to be omitted, found in:\n%s", s)
	}
	if bytes.Contains(got, []byte("## Notes")) {
		t.Errorf("expected 'Notes' to be omitted, found in:\n%s", s)
	}
}

func TestRender_MandatorySections_AlwaysPresent(t *testing.T) {
	d := draft.Draft{
		ID:     "CORE-009",
		Slug:   "export-story-md-to-yukki-stories",
		Title:  "Test",
		Status: "draft",
		// Sections deliberately empty — mandatory ones must still appear.
	}
	got, err := storyspec.Render(d)
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	for _, heading := range []string{"## Background", "## Business Value", "## Scope In", "## Scope Out", "## Acceptance Criteria"} {
		if !bytes.Contains(got, []byte(heading)) {
			t.Errorf("mandatory section %q absent from output:\n%s", heading, got)
		}
	}
}

func TestRender_EOL_LF(t *testing.T) {
	got, err := storyspec.Render(goldenDraft())
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	if bytes.Contains(got, []byte("\r\n")) {
		t.Error("Render output contains CRLF line endings")
	}
}

func TestRender_InvalidID_ReturnsError(t *testing.T) {
	d := goldenDraft()
	d.ID = "front-001" // lowercase prefix — invalid SPDD id
	_, err := storyspec.Render(d)
	if err == nil {
		t.Error("expected error for invalid ID, got nil")
	}
}

func TestRender_InvalidSlug_ReturnsError(t *testing.T) {
	d := goldenDraft()
	d.Slug = "../../../etc" // path traversal attempt
	_, err := storyspec.Render(d)
	if err == nil {
		t.Error("expected error for invalid slug, got nil")
	}
}

// ─── Conform ─────────────────────────────────────────────────────────────────

func TestConform_ValidMarkdown_ReturnsNil(t *testing.T) {
	rendered, err := storyspec.Render(goldenDraft())
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	if err := storyspec.Conform(rendered); err != nil {
		t.Errorf("Conform on valid Render output: %v", err)
	}
}

func TestConform_MissingMandatorySection(t *testing.T) {
	rendered, _ := storyspec.Render(goldenDraft())
	// Remove "## Scope In" section.
	out := bytes.ReplaceAll(rendered, []byte("## Scope In"), []byte("## REMOVED"))
	if err := storyspec.Conform(out); err == nil {
		t.Error("expected error for missing mandatory section, got nil")
	}
}

func TestConform_WrongOrder(t *testing.T) {
	rendered, _ := storyspec.Render(goldenDraft())
	// Swap "## Background" and "## Business Value".
	s := string(rendered)
	s = swapHeadings(s, "Background", "Business Value")
	if err := storyspec.Conform([]byte(s)); err == nil {
		t.Error("expected error for wrong section order, got nil")
	}
}

func TestConform_NoFrontmatter(t *testing.T) {
	err := storyspec.Conform([]byte("# Just a title\n\n## Background\n"))
	if err == nil {
		t.Error("expected error for missing frontmatter, got nil")
	}
}

// swapHeadings replaces the headings of two sections in s.
// This intentionally produces a wrong-order document for testing Conform.
func swapHeadings(s, a, b string) string {
	placeholder := "___PLACEHOLDER___"
	s = bytes.NewBuffer([]byte(s)).String()
	s = replaceFirst(s, "## "+a, "## "+placeholder)
	s = replaceFirst(s, "## "+b, "## "+a)
	s = replaceFirst(s, "## "+placeholder, "## "+b)
	return s
}

func replaceFirst(s, old, new string) string {
	idx := bytes.Index([]byte(s), []byte(old))
	if idx < 0 {
		return s
	}
	return s[:idx] + new + s[idx+len(old):]
}

// ─── WriteAtomic ─────────────────────────────────────────────────────────────

func TestWriteAtomic_CreatesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "story.md")
	content := []byte("hello")
	if err := storyspec.WriteAtomic(path, content); err != nil {
		t.Fatalf("WriteAtomic: %v", err)
	}
	got, _ := os.ReadFile(path)
	if !bytes.Equal(got, content) {
		t.Errorf("file content mismatch: got %q, want %q", got, content)
	}
}

func TestWriteAtomic_OverwritesExisting(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "story.md")
	_ = os.WriteFile(path, []byte("old"), 0o644)
	if err := storyspec.WriteAtomic(path, []byte("new")); err != nil {
		t.Fatalf("WriteAtomic: %v", err)
	}
	got, _ := os.ReadFile(path)
	if string(got) != "new" {
		t.Errorf("expected 'new', got %q", got)
	}
}

func TestWriteAtomic_CreatesMissingDirs(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "a", "b", "c", "story.md")
	if err := storyspec.WriteAtomic(path, []byte("ok")); err != nil {
		t.Fatalf("WriteAtomic: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("file not created: %v", err)
	}
}

// ─── StoryExport ─────────────────────────────────────────────────────────────

func TestStoryExport_NewStory_WritesFile(t *testing.T) {
	dir := t.TempDir()
	d := goldenDraft()
	result, err := storyspec.StoryExport(d, storyspec.ExportOptions{}, dir)
	if err != nil {
		t.Fatalf("StoryExport: %v", err)
	}
	expectedPath := filepath.Join(dir, "CORE-009-export-story-md-to-yukki-stories.md")
	if result.Path != expectedPath {
		t.Errorf("result.Path = %q, want %q", result.Path, expectedPath)
	}
	if _, err := os.Stat(result.Path); err != nil {
		t.Errorf("file not found: %v", err)
	}
}

func TestStoryExport_ConflictWithoutOverwrite(t *testing.T) {
	dir := t.TempDir()
	d := goldenDraft()
	// Write the file first.
	_, err := storyspec.StoryExport(d, storyspec.ExportOptions{Overwrite: true}, dir)
	if err != nil {
		t.Fatalf("first export: %v", err)
	}
	// Second export without overwrite.
	_, err = storyspec.StoryExport(d, storyspec.ExportOptions{}, dir)
	if err == nil {
		t.Fatal("expected conflict error, got nil")
	}
	var conflict *storyspec.ExportConflictError
	if !errors.As(err, &conflict) {
		t.Errorf("expected *ExportConflictError, got %T: %v", err, err)
	}
}

func TestStoryExport_ConflictWithOverwrite(t *testing.T) {
	dir := t.TempDir()
	d := goldenDraft()
	_, _ = storyspec.StoryExport(d, storyspec.ExportOptions{Overwrite: true}, dir)
	_, err := storyspec.StoryExport(d, storyspec.ExportOptions{Overwrite: true}, dir)
	if err != nil {
		t.Errorf("expected no error on overwrite, got: %v", err)
	}
}

func TestStoryExport_InvalidSlug_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	d := goldenDraft()
	d.Slug = "../../../etc"
	_, err := storyspec.StoryExport(d, storyspec.ExportOptions{}, dir)
	if err == nil {
		t.Error("expected error for path-traversal slug, got nil")
	}
}
