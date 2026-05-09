package promptbuilder

import (
	"strings"
	"testing"
)

func minimalDefs() SectionDefinitions {
	return SectionDefinitions{
		"bg": "Le contexte qui justifie la story.",
		"si": "Le périmètre couvert par cette story.",
	}
}

func TestBuildRestructure_NominalCase(t *testing.T) {
	out, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "# Title\n\nSome content.",
		TemplateName: "story",
	}, minimalDefs())
	if err != nil {
		t.Fatalf("BuildRestructure: %v", err)
	}
	if !strings.Contains(out, "# Title") {
		t.Errorf("missing FullMarkdown body: %s", out)
	}
	if !strings.Contains(out, "story") {
		t.Errorf("missing TemplateName: %s", out)
	}
	if !strings.Contains(out, "<<<") || !strings.Contains(out, ">>>") {
		t.Errorf("missing content delimiters: %s", out)
	}
	if !strings.Contains(out, "<info-missing>") {
		t.Errorf("missing instruction block: %s", out)
	}
}

func TestBuildRestructure_HistoryEmptyOmitsBlock(t *testing.T) {
	out, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "story",
	}, minimalDefs())
	if err != nil {
		t.Fatalf("BuildRestructure: %v", err)
	}
	if strings.Contains(out, "Historique de la conversation") {
		t.Errorf("history block should be omitted when empty: %s", out)
	}
}

func TestBuildRestructure_HistoryWithTwoTurns(t *testing.T) {
	out, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "story",
		History: []RestructureTurn{
			{Question: "Q1?", Answer: "A1"},
			{Question: "Q2?", Answer: "A2"},
		},
	}, minimalDefs())
	if err != nil {
		t.Fatalf("BuildRestructure: %v", err)
	}
	for _, expected := range []string{"Tour 1", "Q1?", "A1", "Tour 2", "Q2?", "A2"} {
		if !strings.Contains(out, expected) {
			t.Errorf("missing %q in prompt: %s", expected, out)
		}
	}
}

func TestBuildRestructure_OrphanOnly(t *testing.T) {
	out, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "story",
		Divergence: DivergencePromptShape{
			OrphanSections: []string{"## Notes orphelines"},
		},
	}, minimalDefs())
	if err != nil {
		t.Fatalf("BuildRestructure: %v", err)
	}
	if !strings.Contains(out, "## Notes orphelines") {
		t.Errorf("missing orphan section in output: %s", out)
	}
	if strings.Contains(out, "Sections obligatoires manquantes") {
		t.Errorf("missing-required block should be omitted when empty")
	}
}

func TestBuildRestructure_MissingOnly(t *testing.T) {
	out, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "story",
		Divergence: DivergencePromptShape{
			MissingRequired: []string{"## Background"},
		},
	}, minimalDefs())
	if err != nil {
		t.Fatalf("BuildRestructure: %v", err)
	}
	if !strings.Contains(out, "## Background") {
		t.Errorf("missing required section in output: %s", out)
	}
	if strings.Contains(out, "Sections orphelines à redistribuer") {
		t.Errorf("orphan block should be omitted when empty")
	}
}

func TestBuildRestructure_FullMarkdownEmpty_ReturnsError(t *testing.T) {
	_, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "   ",
		TemplateName: "story",
	}, minimalDefs())
	if err == nil {
		t.Errorf("expected error on empty FullMarkdown")
	}
}

func TestBuildRestructure_TemplateNameEmpty_ReturnsError(t *testing.T) {
	_, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "",
	}, minimalDefs())
	if err == nil {
		t.Errorf("expected error on empty TemplateName")
	}
}

func TestBuildRestructure_NilDefs_ReturnsError(t *testing.T) {
	_, err := BuildRestructure(RestructurePromptInput{
		FullMarkdown: "x",
		TemplateName: "story",
	}, nil)
	if err == nil {
		t.Errorf("expected error on nil SectionDefinitions")
	}
}
