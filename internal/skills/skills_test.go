package skills

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestEntries_Count(t *testing.T) {
	got := Entries()
	if len(got) != 14 {
		t.Fatalf("expected 14 entries, got %d", len(got))
	}
}

func TestEntries_NoneEmpty(t *testing.T) {
	for _, e := range Entries() {
		if len(e.Content) == 0 {
			t.Errorf("entry %q has empty content", e.DestPath)
		}
	}
}

func TestEntries_DestPaths(t *testing.T) {
	entries := Entries()

	// Build a set for fast lookup.
	paths := make(map[string]bool, len(entries))
	for _, e := range entries {
		paths[filepath.ToSlash(e.DestPath)] = true
	}

	wantClaude := []string{
		".claude/commands/yukki-story.md",
		".claude/commands/yukki-analysis.md",
		".claude/commands/yukki-reasons-canvas.md",
		".claude/commands/yukki-generate.md",
		".claude/commands/yukki-api-test.md",
		".claude/commands/yukki-prompt-update.md",
		".claude/commands/yukki-sync.md",
	}
	wantCopilot := []string{
		".github/skills/yukki-story/SKILL.md",
		".github/skills/yukki-analysis/SKILL.md",
		".github/skills/yukki-reasons-canvas/SKILL.md",
		".github/skills/yukki-generate/SKILL.md",
		".github/skills/yukki-api-test/SKILL.md",
		".github/skills/yukki-prompt-update/SKILL.md",
		".github/skills/yukki-sync/SKILL.md",
	}

	for _, p := range append(wantClaude, wantCopilot...) {
		if !paths[p] {
			t.Errorf("missing expected dest path: %s", p)
		}
	}
}

func TestEntries_NoPathTraversal(t *testing.T) {
	for _, e := range Entries() {
		clean := filepath.ToSlash(e.DestPath)
		if strings.Contains(clean, "..") {
			t.Errorf("entry %q contains path traversal", e.DestPath)
		}
	}
}
