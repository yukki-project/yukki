package promptbuilder_test

import (
	"os"
	"strings"
	"testing"

	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
)

func testDefs() promptbuilder.SectionDefinitions {
	return promptbuilder.SectionDefinitions{
		"bg": "Background : contexte métier.",
		"ac": "AC : Given/When/Then.",
	}
}

func TestBuild_ContainsFiveElements(t *testing.T) {
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "improve",
		SelectedText: "du texte à améliorer",
	}
	prompt, err := promptbuilder.Build(req, testDefs())
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	checks := []string{
		"Tu es un rédacteur SPDD",        // préambule
		"Background : contexte métier.",  // définition section
		"Améliorer la lisibilité",        // critère d'action
		"du texte à améliorer",           // texte sélectionné
		"sans guillemets ni explication", // instruction de format
	}
	for _, c := range checks {
		if !strings.Contains(prompt, c) {
			t.Errorf("prompt missing %q\n\nGot:\n%s", c, prompt)
		}
	}
}

func TestBuild_UnknownAction_ReturnsError(t *testing.T) {
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "dance",
		SelectedText: "texte",
	}
	_, err := promptbuilder.Build(req, testDefs())
	if err == nil {
		t.Error("expected error for unknown action, got nil")
	}
}

func TestBuild_PreviousSuggestion_IncludesVariantInstruction(t *testing.T) {
	req := provider.SuggestionRequest{
		Section:            "bg",
		Action:             "rephrase",
		SelectedText:       "texte original",
		PreviousSuggestion: "texte précédent suggéré",
	}
	prompt, err := promptbuilder.Build(req, testDefs())
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if !strings.Contains(prompt, "variante différente") {
		t.Errorf("prompt should contain 'variante différente'\n\nGot:\n%s", prompt)
	}
	if !strings.Contains(prompt, "texte précédent suggéré") {
		t.Errorf("prompt should contain previous suggestion text\n\nGot:\n%s", prompt)
	}
}

func TestBuild_EmptySection_NotBlocking(t *testing.T) {
	req := provider.SuggestionRequest{
		Section:      "unknown-section",
		Action:       "shorten",
		SelectedText: "texte",
	}
	prompt, err := promptbuilder.Build(req, testDefs())
	if err != nil {
		t.Errorf("expected no error for unknown section, got: %v", err)
	}
	if !strings.Contains(prompt, "Non définie.") {
		t.Errorf("prompt should contain 'Non définie.' for unknown section\n\nGot:\n%s", prompt)
	}
}

func TestLoadSectionDefs_FallbackWhenNoFile(t *testing.T) {
	defs, err := promptbuilder.LoadSectionDefs("")
	if err != nil {
		t.Fatalf("LoadSectionDefs: %v", err)
	}
	if len(defs) == 0 {
		t.Error("expected non-empty fallback defs")
	}
	if defs["bg"] == "" {
		t.Error("expected 'bg' definition from fallback")
	}
}

func TestLoadSectionDefs_ReadsProjectFile(t *testing.T) {
	dir := t.TempDir()
	defsDir := dir + "/.yukki/methodology"
	if err := os.MkdirAll(defsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	custom := []byte("bg: \"Custom background definition.\"\n")
	if err := os.WriteFile(defsDir+"/section-definitions.yaml", custom, 0o644); err != nil {
		t.Fatal(err)
	}
	defs, err := promptbuilder.LoadSectionDefs(dir)
	if err != nil {
		t.Fatalf("LoadSectionDefs: %v", err)
	}
	if defs["bg"] != "Custom background definition." {
		t.Errorf("expected custom def, got %q", defs["bg"])
	}
}
