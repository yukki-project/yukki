package artifacts

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestValidatePrefix(t *testing.T) {
	cases := []struct {
		name    string
		prefix  string
		strict  bool
		wantErr bool
	}{
		{"valid uppercase loose", "STORY", false, false},
		{"valid uppercase strict in whitelist", "EXT", true, false},
		{"valid uppercase strict not in whitelist", "ZZZ", true, true},
		{"lowercase rejected", "story", false, true},
		{"digits rejected", "ST123", false, true},
		{"empty rejected", "", false, true},
		{"hyphens rejected", "ST-RY", false, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePrefix(tc.prefix, tc.strict)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for %q (strict=%v), got nil", tc.prefix, tc.strict)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected no error for %q (strict=%v), got %v", tc.prefix, tc.strict, err)
			}
			if tc.wantErr && !errors.Is(err, ErrInvalidPrefix) {
				t.Fatalf("expected ErrInvalidPrefix wrap, got %v", err)
			}
		})
	}
}

func TestNextID_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	id, err := NextID(dir, "STORY")
	if err != nil {
		t.Fatal(err)
	}
	if id != "STORY-001" {
		t.Fatalf("expected STORY-001, got %s", id)
	}
}

func TestNextID_MissingDir(t *testing.T) {
	id, err := NextID(filepath.Join(t.TempDir(), "does-not-exist"), "STORY")
	if err != nil {
		t.Fatal(err)
	}
	if id != "STORY-001" {
		t.Fatalf("expected STORY-001 for missing dir, got %s", id)
	}
}

func TestNextID_IncrementsMax(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{
		"STORY-001-foo.md",
		"STORY-007-bar.md",
		"EXT-014-baz.md", // different prefix, must be ignored
		"STORY-010-spam.md",
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	id, err := NextID(dir, "STORY")
	if err != nil {
		t.Fatal(err)
	}
	if id != "STORY-011" {
		t.Fatalf("expected STORY-011, got %s", id)
	}

	id, err = NextID(dir, "EXT")
	if err != nil {
		t.Fatal(err)
	}
	if id != "EXT-015" {
		t.Fatalf("expected EXT-015, got %s", id)
	}
}

func TestNextID_PaddingExpandsBeyond999(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "STORY-999-foo.md"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	id, err := NextID(dir, "STORY")
	if err != nil {
		t.Fatal(err)
	}
	if id != "STORY-1000" {
		t.Fatalf("expected STORY-1000, got %s", id)
	}
}

func TestNextID_IgnoresNonMatchingFiles(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{
		"STORY-001-foo.md",
		"README.md",
		"draft.txt",
		"STORY-without-id.md",
		"story-002-lowercase.md",
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	id, err := NextID(dir, "STORY")
	if err != nil {
		t.Fatal(err)
	}
	if id != "STORY-002" {
		t.Fatalf("expected STORY-002, got %s", id)
	}
}

func TestAllowedPrefixesString(t *testing.T) {
	s := AllowedPrefixesString()
	if s == "" {
		t.Fatal("expected non-empty whitelist string")
	}
}
