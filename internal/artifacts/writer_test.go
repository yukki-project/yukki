package artifacts

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const validStory = `---
id: STORY-001
slug: my-slug
title: My Title
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# My Title

Body.
`

func TestWriter_Write_Success(t *testing.T) {
	dir := t.TempDir()
	w := NewWriter(filepath.Join(dir, "stories"))

	path, err := w.Write("STORY-001", "my-slug", validStory)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read result: %v", err)
	}
	if string(got) != validStory {
		t.Fatalf("content mismatch")
	}

	expected := filepath.Join(dir, "stories", "STORY-001-my-slug.md")
	if path != expected {
		t.Fatalf("expected path %s, got %s", expected, path)
	}
}

func TestWriter_Write_InvalidFrontmatter(t *testing.T) {
	dir := t.TempDir()
	w := NewWriter(filepath.Join(dir, "stories"))

	_, err := w.Write("STORY-001", "x", "not a frontmatter at all")
	if !errors.Is(err, ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter, got %v", err)
	}

	// no file should remain in the stories dir
	entries, _ := os.ReadDir(filepath.Join(dir, "stories"))
	for _, e := range entries {
		if !e.IsDir() && !strings.HasSuffix(e.Name(), ".tmp") {
			t.Fatalf("unexpected file left behind: %s", e.Name())
		}
	}
}

// TestValidateFrontmatter has moved to parser_test.go (CORE-004 D2):
// the function itself is now defined in parser.go. The signature is
// preserved so writer.go's Writer.Write keeps calling it intra-package
// without any import or behavioural change.

func TestWriter_Write_EmptyIdOrSlug(t *testing.T) {
	w := NewWriter(t.TempDir())
	if _, err := w.Write("", "slug", validStory); err == nil {
		t.Fatal("expected error for empty id")
	}
	if _, err := w.Write("ID-001", "", validStory); err == nil {
		t.Fatal("expected error for empty slug")
	}
}
