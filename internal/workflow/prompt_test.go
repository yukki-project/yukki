package workflow

import (
	"strings"
	"testing"
)

func TestBuildStructuredPrompt_InjectsAllPlaceholders(t *testing.T) {
	got := BuildStructuredPrompt("TPL_BODY", "DESC_BODY", "STORY-042")

	for _, want := range []string{"TPL_BODY", "DESC_BODY", "STORY-042"} {
		if !strings.Contains(got, want) {
			t.Fatalf("expected output to contain %q\noutput:\n%s", want, got)
		}
	}
	if strings.Contains(got, "{{TEMPLATE}}") ||
		strings.Contains(got, "{{DESCRIPTION}}") ||
		strings.Contains(got, "{{ID}}") {
		t.Fatalf("placeholders left unreplaced:\n%s", got)
	}
}

func TestSystemPrompt_ContainsSPDDRules(t *testing.T) {
	sp := SystemPrompt()
	for _, want := range []string{"INVEST", "Given / When / Then", "Slug", "Frontmatter"} {
		if !strings.Contains(sp, want) {
			t.Fatalf("system prompt missing %q", want)
		}
	}
}
