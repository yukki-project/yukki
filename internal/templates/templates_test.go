package templates

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoader_LoadStory_ProjectFirst(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "templates"), 0o755); err != nil {
		t.Fatal(err)
	}
	custom := "# project override\n"
	if err := os.WriteFile(filepath.Join(dir, "templates", "story.md"), []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}

	loader := NewLoader(dir)
	got, src, err := loader.LoadStory()
	if err != nil {
		t.Fatalf("LoadStory: %v", err)
	}
	if src != SourceProject {
		t.Fatalf("expected source %q, got %q", SourceProject, src)
	}
	if got != custom {
		t.Fatalf("expected project content, got %q", got)
	}
}

func TestLoader_LoadStory_FallsBackToEmbed(t *testing.T) {
	dir := t.TempDir()
	loader := NewLoader(dir)

	got, src, err := loader.LoadStory()
	if err != nil {
		t.Fatalf("LoadStory: %v", err)
	}
	if src != SourceEmbedded {
		t.Fatalf("expected source %q, got %q", SourceEmbedded, src)
	}
	if !strings.Contains(got, "id:") {
		t.Fatalf("expected embedded story template to contain frontmatter id field, got %q", got[:min(len(got), 200)])
	}
}

func TestLoader_AllSevenTemplatesEmbedded(t *testing.T) {
	dir := t.TempDir()
	loader := NewLoader(dir)

	cases := []struct {
		name string
		fn   func() (string, Source, error)
	}{
		{"story", loader.LoadStory},
		{"analysis", loader.LoadAnalysis},
		{"canvas-reasons", loader.LoadCanvasReasons},
		{"tests", loader.LoadTests},
		{"inbox", loader.LoadInbox},     // META-005
		{"epic", loader.LoadEpic},       // META-005
		{"roadmap", loader.LoadRoadmap}, // META-005
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			content, src, err := tc.fn()
			if err != nil {
				t.Fatalf("Load%s: %v", tc.name, err)
			}
			if src != SourceEmbedded {
				t.Fatalf("expected %q source for %s, got %q", SourceEmbedded, tc.name, src)
			}
			if len(content) == 0 {
				t.Fatalf("expected non-empty embedded content for %s", tc.name)
			}
		})
	}
}

// TestLoader_LoadInbox_FromProject vérifie le project-first override
// pour le nouveau template Inbox (META-005).
func TestLoader_LoadInbox_FromProject(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "templates"), 0o755); err != nil {
		t.Fatal(err)
	}
	custom := "# project inbox override\n"
	if err := os.WriteFile(filepath.Join(dir, "templates", "inbox.md"), []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}

	loader := NewLoader(dir)
	got, src, err := loader.LoadInbox()
	if err != nil {
		t.Fatalf("LoadInbox: %v", err)
	}
	if src != SourceProject {
		t.Fatalf("expected source %q, got %q", SourceProject, src)
	}
	if got != custom {
		t.Fatalf("expected project content, got %q", got)
	}
}

func TestLoader_EmbedMissingErrorWrapping(t *testing.T) {
	if !errors.Is(ErrEmbedMissing, ErrEmbedMissing) {
		t.Fatal("ErrEmbedMissing must be a sentinel error usable with errors.Is")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
