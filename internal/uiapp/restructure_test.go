package uiapp

import (
	"strings"
	"testing"
)

func TestSplitFrontMatter_StandardYAML(t *testing.T) {
	content := "---\nid: STORY-001\ntitle: Demo\n---\n# Body\n\nContent here."
	fm, body := splitFrontMatter(content)
	if fm == "" {
		t.Fatalf("expected non-empty frontMatter")
	}
	if body == "" {
		t.Fatalf("expected non-empty body")
	}
	if fm+body != content {
		t.Errorf("frontMatter + body must reproduce input byte-equal")
	}
	if !strings.Contains(fm, "id: STORY-001") {
		t.Errorf("frontMatter missing id field: %q", fm)
	}
	if !strings.HasPrefix(body, "# Body") {
		t.Errorf("body must start at the H1: %q", body)
	}
}

func TestSplitFrontMatter_NoFrontMatter(t *testing.T) {
	content := "# Body\n\nContent here."
	fm, body := splitFrontMatter(content)
	if fm != "" {
		t.Errorf("expected empty frontMatter, got %q", fm)
	}
	if body != content {
		t.Errorf("body must equal input when no frontMatter")
	}
}

func TestSplitFrontMatter_CRLF(t *testing.T) {
	content := "---\r\nid: x\r\n---\r\n# Body"
	fm, body := splitFrontMatter(content)
	if fm == "" {
		t.Errorf("expected frontMatter on CRLF input")
	}
	if fm+body != content {
		t.Errorf("byte-equal preservation broken on CRLF")
	}
}

func TestSplitFrontMatter_Malformed_NoClosing(t *testing.T) {
	content := "---\nid: x\nbody but no closing"
	fm, body := splitFrontMatter(content)
	if fm != "" {
		t.Errorf("malformed front-matter should fall through to body: fm=%q", fm)
	}
	if body != content {
		t.Errorf("body should equal full input when malformed")
	}
}

func TestBuildHeuristicFallbackQuestions_OneSection(t *testing.T) {
	got := buildHeuristicFallbackQuestions([]string{"## Background"})
	if len(got) != 1 {
		t.Fatalf("expected 1 question, got %d", len(got))
	}
	if !strings.Contains(got[0], "## Background") {
		t.Errorf("question missing section name: %q", got[0])
	}
	if !strings.Contains(got[0], "reste à compléter") {
		t.Errorf("expected singular wording: %q", got[0])
	}
}

func TestBuildHeuristicFallbackQuestions_MultipleSections(t *testing.T) {
	got := buildHeuristicFallbackQuestions([]string{"## Background", "## Scope In", "## Notes"})
	if len(got) != 1 {
		t.Fatalf("expected 1 question, got %d", len(got))
	}
	q := got[0]
	for _, name := range []string{"## Background", "## Scope In", "## Notes"} {
		if !strings.Contains(q, name) {
			t.Errorf("question missing %q: %s", name, q)
		}
	}
	if !strings.Contains(q, " et ") {
		t.Errorf("expected ' et ' before last section: %s", q)
	}
	if !strings.Contains(q, "restent à compléter") {
		t.Errorf("expected plural wording: %s", q)
	}
}

func TestBuildHeuristicFallbackQuestions_EmptyFallback(t *testing.T) {
	got := buildHeuristicFallbackQuestions(nil)
	if len(got) != 1 {
		t.Fatalf("expected 1 question, got %d", len(got))
	}
	if !strings.Contains(got[0], "périmètre attendu") {
		t.Errorf("expected generic fallback wording, got: %s", got[0])
	}
}

func TestStripLeadingFrontMatter_StripsHallucinatedYAML(t *testing.T) {
	resp := "---\nid: STORY-001\ntitle: Foo\n---\n\n## Background\n\nReal body."
	got := stripLeadingFrontMatter(resp)
	if strings.Contains(got, "STORY-001") {
		t.Errorf("front-matter not stripped: %q", got)
	}
	if !strings.HasPrefix(got, "## Background") {
		t.Errorf("body should start at ## Background, got %q", got)
	}
}

func TestStripLeadingFrontMatter_WithLeadingWhitespace(t *testing.T) {
	// Claude sometimes adds a blank line before its output.
	resp := "  \n\n---\nid: x\n---\n\n## Body\n\ncontent"
	got := stripLeadingFrontMatter(resp)
	if strings.Contains(got, "id: x") {
		t.Errorf("leading whitespace + frontmatter should be stripped: %q", got)
	}
	if !strings.HasPrefix(got, "## Body") {
		t.Errorf("body should start clean: %q", got)
	}
}

func TestStripLeadingFrontMatter_NoFrontMatter_PassThrough(t *testing.T) {
	resp := "## Background\n\nClean body without frontmatter."
	got := stripLeadingFrontMatter(resp)
	if got != resp {
		t.Errorf("response without frontmatter must pass through unchanged")
	}
}

func TestStripLeadingFrontMatter_MalformedNoCloser_PassThrough(t *testing.T) {
	// Front-matter open but never closed → don't truncate.
	resp := "---\nid: x\nbody but no closing"
	got := stripLeadingFrontMatter(resp)
	if got != resp {
		t.Errorf("malformed frontmatter must pass through, got %q", got)
	}
}

func TestParseInfoMissing_StandardMarker(t *testing.T) {
	resp := "Some content\n<info-missing>\nQuestion 1?\nQuestion 2?\n</info-missing>"
	q := parseInfoMissing(resp)
	if len(q) != 2 {
		t.Fatalf("expected 2 questions, got %d: %v", len(q), q)
	}
	if q[0] != "Question 1?" {
		t.Errorf("Q1 mismatch: %q", q[0])
	}
}

func TestParseInfoMissing_UnderscoreVariant(t *testing.T) {
	resp := "<info_missing>only one</info_missing>"
	q := parseInfoMissing(resp)
	if len(q) != 1 || q[0] != "only one" {
		t.Errorf("underscore variant not parsed: %v", q)
	}
}

func TestParseInfoMissing_CaseInsensitive(t *testing.T) {
	resp := "<INFO-MISSING>foo</INFO-MISSING>"
	q := parseInfoMissing(resp)
	if len(q) != 1 || q[0] != "foo" {
		t.Errorf("case insensitivity broken: %v", q)
	}
}

func TestParseInfoMissing_NoMarker(t *testing.T) {
	resp := "## Body\n\nNothing missing here."
	q := parseInfoMissing(resp)
	if q != nil {
		t.Errorf("expected nil when no marker, got %v", q)
	}
}

func TestParseInfoMissing_EmptyBody(t *testing.T) {
	resp := "<info-missing>   </info-missing>"
	q := parseInfoMissing(resp)
	if q != nil {
		t.Errorf("expected nil on empty marker body, got %v", q)
	}
}

func TestShouldFallbackMissing_AllSectionsCovered(t *testing.T) {
	resp := "## Background\n\nThe context. ## Scope In\n\nIn scope items."
	expected := []string{"## Background", "## Scope In"}
	if shouldFallbackMissing(resp, expected) {
		t.Errorf("should not fallback when all sections covered")
	}
}

func TestShouldFallbackMissing_HalfEmpty_Triggers(t *testing.T) {
	// 4 sections expected, 0 actually filled (just headers no content).
	resp := "## Background\n\n## Scope In\n\n## Scope Out\n\n## Notes\n"
	expected := []string{"## Background", "## Scope In", "## Scope Out", "## Notes"}
	if !shouldFallbackMissing(resp, expected) {
		t.Errorf("should fallback when sections are empty headers")
	}
}

func TestShouldFallbackMissing_NoExpectations(t *testing.T) {
	if shouldFallbackMissing("anything", nil) {
		t.Errorf("must not trigger when no expected sections")
	}
}

func TestRestructureCancel_Idempotent(t *testing.T) {
	a := &App{}
	if err := a.RestructureCancel("nonexistent"); err != nil {
		t.Errorf("cancel of unknown sessionID must not error, got %v", err)
	}
}

func TestRestructureStart_RejectsTooLarge(t *testing.T) {
	a := &App{}
	huge := strings.Repeat("x", MaxRestructureBytes+1)
	_, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: huge,
		TemplateName: "story",
	})
	if err != ErrTooLarge {
		t.Errorf("expected ErrTooLarge, got %v", err)
	}
}

func TestRestructureStart_RejectsEmptyMarkdown(t *testing.T) {
	a := &App{}
	_, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "   ",
		TemplateName: "story",
	})
	if err == nil {
		t.Errorf("expected error on empty FullMarkdown")
	}
}

func TestHasActiveRestructure_EmptyMap(t *testing.T) {
	a := &App{}
	if a.hasActiveRestructure() {
		t.Errorf("empty map should report no active session")
	}
}

func TestHasActiveRestructure_WithEntry(t *testing.T) {
	a := &App{}
	a.restructureSessions.Store("dummy", &restructureSession{})
	if !a.hasActiveRestructure() {
		t.Errorf("non-empty map must report active session")
	}
}
