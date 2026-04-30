// Package workflow orchestrates the SPDD steps invoked by yukki commands.
//
// Implements O6 of the CORE-001 canvas: BuildStructuredPrompt and RunStory.
package workflow

import (
	_ "embed"
	"strings"
)

//go:embed prompts/story-system.md
var systemPromptTemplate string

// BuildStructuredPrompt builds the prompt sent to the LLM provider for the
// `yukki story` command. It injects the SPDD rules upstream of the project
// template, then the user description, then the assigned id.
//
// The injection points are the literal placeholders {{TEMPLATE}},
// {{DESCRIPTION}}, {{ID}} in the embedded system prompt.
func BuildStructuredPrompt(template, description, id string) string {
	out := systemPromptTemplate
	out = strings.ReplaceAll(out, "{{TEMPLATE}}", template)
	out = strings.ReplaceAll(out, "{{DESCRIPTION}}", description)
	out = strings.ReplaceAll(out, "{{ID}}", id)
	return out
}

// SystemPrompt returns the embedded system prompt template (for inspection).
func SystemPrompt() string {
	return systemPromptTemplate
}
