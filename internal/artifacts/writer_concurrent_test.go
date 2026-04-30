package artifacts

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// TestWriter_ConcurrentWritesNeverCorruptFinalFile guards Invariant I2 from
// CORE-001 canvas: even if multiple goroutines race on the same id+slug, the
// final file must always contain a complete valid frontmatter (one of the two
// inputs wins, but never a partial concatenation).
func TestWriter_ConcurrentWritesNeverCorruptFinalFile(t *testing.T) {
	dir := t.TempDir()
	w := NewWriter(filepath.Join(dir, "stories"))

	const goroutines = 8
	var wg sync.WaitGroup
	wg.Add(goroutines)

	for i := 0; i < goroutines; i++ {
		i := i
		go func() {
			defer wg.Done()
			content := fmt.Sprintf(`---
id: STORY-001
slug: race
title: Race From Goroutine %d
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Race From Goroutine %d

Body %d.
`, i, i, i)
			// All goroutines write to the SAME final file.
			_, _ = w.Write("STORY-001", "race", content)
		}()
	}
	wg.Wait()

	final := filepath.Join(dir, "stories", "STORY-001-race.md")
	data, err := os.ReadFile(final)
	if err != nil {
		t.Fatalf("expected the final file to exist after races: %v", err)
	}
	got := string(data)
	if !strings.HasPrefix(got, "---\n") {
		t.Fatalf("expected valid frontmatter prefix, got %q", got[:min(len(got), 100)])
	}
	if err := ValidateFrontmatter(got); err != nil {
		t.Fatalf("final file has invalid frontmatter after concurrent writes: %v\n---\n%s", err, got)
	}
}

// TestWriter_ConcurrentWritesLeaveNoTempFiles verifies that the temp files
// used by the atomic-rename strategy are cleaned up (or renamed) — none
// should linger after all goroutines return.
func TestWriter_ConcurrentWritesLeaveNoTempFiles(t *testing.T) {
	dir := t.TempDir()
	w := NewWriter(filepath.Join(dir, "stories"))

	const goroutines = 4
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		i := i
		go func() {
			defer wg.Done()
			content := fmt.Sprintf(`---
id: STORY-%03d
slug: distinct
title: Distinct Goroutine %d
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Distinct Goroutine %d

Body.
`, i+1, i, i)
			id := fmt.Sprintf("STORY-%03d", i+1)
			if _, err := w.Write(id, "distinct", content); err != nil {
				t.Errorf("Write(%s): %v", id, err)
			}
		}()
	}
	wg.Wait()

	entries, err := os.ReadDir(filepath.Join(dir, "stories"))
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if strings.Contains(e.Name(), ".tmp.") {
			t.Errorf("temp file leftover after concurrent writes: %s", e.Name())
		}
	}
}

func init() {
	// Ensure deterministic-ish behaviour where goroutines actually interleave.
	// (No-op in practice; placeholder for future GOMAXPROCS adjustments.)
	_ = sync.Mutex{}
}
