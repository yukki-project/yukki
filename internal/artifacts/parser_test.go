package artifacts

import (
	"errors"
	"strings"
	"testing"
)

const validLF = "---\nid: STORY-001\ntitle: My Title\nstatus: draft\n---\n\n# Body\n"
const validCRLF = "---\r\nid: STORY-001\r\ntitle: My Title\r\nstatus: draft\r\n---\r\n\r\n# Body\r\n"

// ─── ParseFrontmatter[map[string]any] — least-typed consumer

func TestParseFrontmatter_Map_Valid(t *testing.T) {
	m, err := ParseFrontmatter[map[string]any](validLF)
	if err != nil {
		t.Fatalf("ParseFrontmatter: %v", err)
	}
	if m["id"] != "STORY-001" {
		t.Fatalf("id = %v, want STORY-001", m["id"])
	}
	if m["title"] != "My Title" {
		t.Fatalf("title = %v, want My Title", m["title"])
	}
}

// ─── ParseFrontmatter[Meta] — the type ListArtifacts uses

func TestParseFrontmatter_Meta_Valid(t *testing.T) {
	meta, err := ParseFrontmatter[Meta](validLF)
	if err != nil {
		t.Fatalf("ParseFrontmatter: %v", err)
	}
	if meta.ID != "STORY-001" {
		t.Fatalf("ID = %q, want STORY-001", meta.ID)
	}
	if meta.Title != "My Title" {
		t.Fatalf("Title = %q, want My Title", meta.Title)
	}
	if meta.Status != "draft" {
		t.Fatalf("Status = %q, want draft", meta.Status)
	}
}

// ─── ParseFrontmatter[CustomStruct] — generic typing actually parameterised

func TestParseFrontmatter_CustomStruct_Valid(t *testing.T) {
	type Stub struct {
		ID    string `yaml:"id"`
		Title string `yaml:"title"`
	}
	s, err := ParseFrontmatter[Stub](validLF)
	if err != nil {
		t.Fatalf("ParseFrontmatter: %v", err)
	}
	if s.ID != "STORY-001" || s.Title != "My Title" {
		t.Fatalf("got %+v, want {ID:STORY-001 Title:My Title}", s)
	}
}

// ─── EOL handling: D6 — both LF and CRLF delimiters accepted

func TestParseFrontmatter_LF_Delimiter(t *testing.T) {
	m, err := ParseFrontmatter[map[string]any](validLF)
	if err != nil {
		t.Fatalf("LF parse: %v", err)
	}
	if len(m) == 0 {
		t.Fatal("expected non-empty map for LF input")
	}
}

func TestParseFrontmatter_CRLF_Delimiter(t *testing.T) {
	m, err := ParseFrontmatter[map[string]any](validCRLF)
	if err != nil {
		t.Fatalf("CRLF parse: %v", err)
	}
	if m["id"] != "STORY-001" {
		t.Fatalf("id = %v, want STORY-001 (CRLF)", m["id"])
	}
}

// ─── Error cases

func TestParseFrontmatter_MissingLeadingDelim(t *testing.T) {
	_, err := ParseFrontmatter[map[string]any]("no frontmatter at all\n")
	if !errors.Is(err, ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter, got %v", err)
	}
	if !strings.Contains(err.Error(), "leading") {
		t.Fatalf("expected message to mention leading delim, got %v", err)
	}
}

func TestParseFrontmatter_MissingTrailingDelim(t *testing.T) {
	_, err := ParseFrontmatter[map[string]any]("---\nid: X\nbody without close")
	if !errors.Is(err, ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter, got %v", err)
	}
	if !strings.Contains(err.Error(), "closing") {
		t.Fatalf("expected message to mention closing delim, got %v", err)
	}
}

func TestParseFrontmatter_InvalidYAML(t *testing.T) {
	_, err := ParseFrontmatter[map[string]any]("---\nid: : :\n---\n\nbody\n")
	if !errors.Is(err, ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter, got %v", err)
	}
}

func TestParseFrontmatter_TypeMismatch(t *testing.T) {
	type IntID struct {
		ID int `yaml:"id"`
	}
	// `id: foo` cannot decode into an int field
	_, err := ParseFrontmatter[IntID]("---\nid: foo\n---\n\nbody\n")
	if !errors.Is(err, ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter for type mismatch, got %v", err)
	}
}

// ─── ValidateFrontmatter (déménagée depuis writer_test.go) — wrapper of
// ParseFrontmatter[map[string]any] + non-empty check

func TestValidateFrontmatter(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		wantErr bool
	}{
		{"valid", validLF, false},
		{"valid CRLF", validCRLF, false},
		{"missing leading", "no frontmatter\n---\n---\n", true},
		{"missing closing", "---\nid: X\nsomething", true},
		{"empty mapping", "---\n\n---\n\nbody\n", true},
		{"malformed yaml", "---\nid: : :\n---\n\nbody\n", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFrontmatter(tc.in)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for %q", tc.name)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected no error for %q, got %v", tc.name, err)
			}
		})
	}
}
