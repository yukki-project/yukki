package artifacts

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

// writeArtifact is a small helper to set up a fixture <dir>/.yukki/<kind>/<name>
// with the given contents. Returns the absolute path of the written file.
func writeArtifact(t *testing.T, root, kind, name, content string) string {
	t.Helper()
	dir := filepath.Join(root, ProjectDirName, kind)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", dir, err)
	}
	full := filepath.Join(dir, name)
	if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", full, err)
	}
	abs, _ := filepath.Abs(full)
	return abs
}

// ─── Nominal: 3 valid files, sorted by Updated desc

func TestListArtifacts_Nominal(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "stories", "STORY-001-a.md",
		"---\nid: STORY-001\nslug: a\ntitle: A\nstatus: draft\nupdated: 2026-04-30\n---\n# A\n")
	writeArtifact(t, root, "stories", "STORY-002-b.md",
		"---\nid: STORY-002\nslug: b\ntitle: B\nstatus: draft\nupdated: 2026-05-02\n---\n# B\n")
	writeArtifact(t, root, "stories", "STORY-003-c.md",
		"---\nid: STORY-003\nslug: c\ntitle: C\nstatus: draft\nupdated: 2026-05-01\n---\n# C\n")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(out) != 3 {
		t.Fatalf("len = %d, want 3", len(out))
	}
	// Sorted by Updated desc → 2026-05-02 first, 2026-05-01, 2026-04-30
	if out[0].ID != "STORY-002" || out[1].ID != "STORY-003" || out[2].ID != "STORY-001" {
		t.Fatalf("unexpected order: %v", []string{out[0].ID, out[1].ID, out[2].ID})
	}
	for i, m := range out {
		if m.Error != nil {
			t.Errorf("entry %d has unexpected Error: %v", i, m.Error)
		}
		if m.Path == "" {
			t.Errorf("entry %d has empty Path", i)
		}
	}
}

// ─── Tie on Updated → fallback to ID lexico ascending

func TestListArtifacts_TieOnUpdatedSortedByID(t *testing.T) {
	root := t.TempDir()
	// Two artefacts with the SAME `updated` value, different IDs.
	writeArtifact(t, root, "stories", "STORY-002-b.md",
		"---\nid: STORY-002\nslug: b\ntitle: B\nupdated: 2026-05-01\n---\n# B\n")
	writeArtifact(t, root, "stories", "STORY-001-a.md",
		"---\nid: STORY-001\nslug: a\ntitle: A\nupdated: 2026-05-01\n---\n# A\n")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("len = %d, want 2", len(out))
	}
	if out[0].ID != "STORY-001" || out[1].ID != "STORY-002" {
		t.Fatalf("expected ID asc fallback, got %s, %s", out[0].ID, out[1].ID)
	}
}

// ─── Corrupted frontmatter does NOT abort the scan

func TestListArtifacts_CorruptedFrontmatter(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "stories", "VALID-001.md",
		"---\nid: VALID-001\ntitle: Good\nupdated: 2026-05-01\n---\n# Good\n")
	writeArtifact(t, root, "stories", "BROKEN-001.md",
		"this file has no frontmatter at all\n")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts should not return a global error on partial corruption, got %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("len = %d, want 2 (valid + broken with Error set)", len(out))
	}

	var sawValid, sawBroken bool
	for _, m := range out {
		switch {
		case m.ID == "VALID-001":
			sawValid = true
			if m.Error != nil {
				t.Errorf("valid entry has unexpected Error: %v", m.Error)
			}
		default:
			sawBroken = true
			if m.Error == nil {
				t.Errorf("expected broken entry to have Error != nil")
			}
			if !errors.Is(m.Error, ErrInvalidFrontmatter) {
				t.Errorf("expected ErrInvalidFrontmatter, got %v", m.Error)
			}
			if m.Path == "" {
				t.Errorf("broken entry must still have a Path")
			}
		}
	}
	if !sawValid || !sawBroken {
		t.Fatalf("expected both valid and broken entries; sawValid=%v sawBroken=%v", sawValid, sawBroken)
	}
}

// ─── Invalid kind → ErrInvalidKind

func TestListArtifacts_InvalidKind(t *testing.T) {
	root := t.TempDir()
	out, err := ListArtifacts(root, "wrong")
	if out != nil {
		t.Fatalf("expected nil slice on invalid kind, got %v", out)
	}
	if !errors.Is(err, ErrInvalidKind) {
		t.Fatalf("expected ErrInvalidKind, got %v", err)
	}
}

// ─── Non-existent dir → error

func TestListArtifacts_DirNotExist(t *testing.T) {
	root := t.TempDir()
	// We never call writeArtifact, so .yukki/stories does not exist.
	_, err := ListArtifacts(root, "stories")
	if err == nil {
		t.Fatal("expected error for non-existent dir, got nil")
	}
	if !errors.Is(err, os.ErrNotExist) {
		t.Errorf("expected os.ErrNotExist (wrapped), got %v", err)
	}
}

// ─── Empty dir → []Meta{} (not nil), no error

func TestListArtifacts_EmptyDir(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ProjectDirName, "stories"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts on empty dir: %v", err)
	}
	if out == nil {
		t.Fatal("expected non-nil empty slice, got nil")
	}
	if len(out) != 0 {
		t.Fatalf("expected len 0, got %d", len(out))
	}
}

// ─── Sub-directories are silently ignored

func TestListArtifacts_IgnoresSubDirs(t *testing.T) {
	root := t.TempDir()
	// Regular .md file
	writeArtifact(t, root, "stories", "STORY-001.md",
		"---\nid: STORY-001\nupdated: 2026-05-01\n---\n# X\n")
	// Sub-directory with a .md file inside — should be ignored
	subdir := filepath.Join(root, ProjectDirName, "stories", "archive")
	if err := os.MkdirAll(subdir, 0o755); err != nil {
		t.Fatalf("mkdir subdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(subdir, "OLD-001.md"),
		[]byte("---\nid: OLD-001\n---\n# Old\n"), 0o644); err != nil {
		t.Fatalf("write old: %v", err)
	}

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("expected 1 entry (subdir ignored), got %d", len(out))
	}
	if out[0].ID != "STORY-001" {
		t.Fatalf("got %q, want STORY-001", out[0].ID)
	}
}

// ─── Non-.md files are ignored

func TestListArtifacts_IgnoresNonMD(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "stories", "STORY-001.md",
		"---\nid: STORY-001\nupdated: 2026-05-01\n---\n# X\n")
	writeArtifact(t, root, "stories", "note.txt", "not a markdown file")
	writeArtifact(t, root, "stories", ".DS_Store", "macos junk")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("expected 1 .md entry, got %d", len(out))
	}
}

// ─── CRLF file (Windows) parses correctly

func TestListArtifacts_CRLFFile(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "stories", "STORY-CRLF.md",
		"---\r\nid: STORY-CRLF\r\ntitle: Win\r\nupdated: 2026-05-01\r\n---\r\n\r\n# Win\r\n")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(out))
	}
	if out[0].Error != nil {
		t.Fatalf("CRLF file should parse cleanly, got Error: %v", out[0].Error)
	}
	if out[0].ID != "STORY-CRLF" {
		t.Fatalf("ID = %q, want STORY-CRLF", out[0].ID)
	}
}

// ─── Path is absolute

func TestListArtifacts_PathIsAbsolute(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "stories", "STORY-001.md",
		"---\nid: STORY-001\nupdated: 2026-05-01\n---\n# X\n")

	out, err := ListArtifacts(root, "stories")
	if err != nil {
		t.Fatalf("ListArtifacts: %v", err)
	}
	if !filepath.IsAbs(out[0].Path) {
		t.Fatalf("expected absolute path, got %q", out[0].Path)
	}
}

// ─── AllowedKinds returns a fresh copy (mutations don't leak)

func TestAllowedKinds_ReturnsCopy(t *testing.T) {
	a := AllowedKinds()
	if len(a) != 7 {
		t.Fatalf("expected 7 kinds, got %d", len(a))
	}
	// Mutate the returned slice
	a[0] = "MUTATED"

	b := AllowedKinds()
	if b[0] == "MUTATED" {
		t.Fatal("AllowedKinds() leaked mutation; should return a fresh copy each call")
	}
}

// TestAllowedKinds_ContainsMETA005Kinds vérifie que les 3 nouveaux
// kinds introduits par META-005 (inbox, epics, roadmap) sont reconnus.
func TestAllowedKinds_ContainsMETA005Kinds(t *testing.T) {
	a := AllowedKinds()
	wanted := map[string]bool{"inbox": false, "epics": false, "roadmap": false}
	for _, k := range a {
		if _, ok := wanted[k]; ok {
			wanted[k] = true
		}
	}
	for k, found := range wanted {
		if !found {
			t.Errorf("expected AllowedKinds to contain %q (META-005)", k)
		}
	}
}

// TestListArtifacts_Inbox vérifie qu'un fichier Inbox valide est listé
// sans erreur (META-005).
func TestListArtifacts_Inbox(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "inbox", "INBOX-001-foo.md",
		"---\nid: INBOX-001\nslug: foo\ntitle: Foo\nstatus: unsorted\nupdated: 2026-05-04\n---\n# Foo\n")

	out, err := ListArtifacts(root, "inbox")
	if err != nil {
		t.Fatalf("ListArtifacts(inbox): %v", err)
	}
	if len(out) != 1 || out[0].ID != "INBOX-001" || out[0].Error != nil {
		t.Fatalf("expected 1 valid Inbox entry, got %+v", out)
	}
}

// TestListArtifacts_Epics vérifie qu'un fichier Epic valide est listé
// sans erreur (META-005).
func TestListArtifacts_Epics(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "epics", "EPIC-001-bar.md",
		"---\nid: EPIC-001\nslug: bar\ntitle: Bar\nstatus: draft\nupdated: 2026-05-04\nchild-stories: [STORY-001, STORY-002]\n---\n# Bar\n")

	out, err := ListArtifacts(root, "epics")
	if err != nil {
		t.Fatalf("ListArtifacts(epics): %v", err)
	}
	if len(out) != 1 || out[0].ID != "EPIC-001" || out[0].Error != nil {
		t.Fatalf("expected 1 valid Epic entry, got %+v", out)
	}
}

// TestListArtifacts_RoadmapWithColumns vérifie qu'un fichier Roadmap
// avec un frontmatter divergent (champ `columns:` non porté par Meta)
// est listé sans erreur — yaml.Unmarshal ignore silencieusement les
// champs inconnus, donc Meta capture id/slug/title/status/updated et
// la struct ne casse pas (META-005, Safeguard "Schéma frontmatter
// Roadmap").
func TestListArtifacts_RoadmapWithColumns(t *testing.T) {
	root := t.TempDir()
	writeArtifact(t, root, "roadmap", "current.md",
		"---\nid: roadmap-current\nslug: current\ntitle: Current Roadmap\nstatus: live\nupdated: 2026-05-04\ncolumns:\n  - id: now\n    label: Now\n    epics: [EPIC-001]\n    standalone-stories: []\n  - id: next\n    label: Next\n    epics: []\n    standalone-stories: []\n  - id: later\n    label: Later\n    epics: []\n    standalone-stories: []\n---\n# Notes\n")

	out, err := ListArtifacts(root, "roadmap")
	if err != nil {
		t.Fatalf("ListArtifacts(roadmap): %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("expected 1 Roadmap entry, got %d", len(out))
	}
	got := out[0]
	if got.Error != nil {
		t.Fatalf("Roadmap with columns: must list without Error, got %v", got.Error)
	}
	if got.ID != "roadmap-current" || got.Slug != "current" || got.Status != "live" {
		t.Fatalf("Meta core fields not parsed; got %+v", got)
	}
}
