// UI-019 O1 — Compose the system prompt for the LLM-driven artefact
// restructuration flow.
//
// BuildRestructure is intentionally decoupled from the
// SuggestionRequest pipeline (which is mono-section) — the input
// here describes a whole document, the optional history of a chat
// fallback, and the template divergence shape so the LLM knows
// what is expected.
//
// The prompt template lives next to this file as restructure.tmpl
// and is embedded so the binary stays self-contained (cohérent
// avec le pattern default-section-defs.yaml).

package promptbuilder

import (
	_ "embed"
	"fmt"
	"sort"
	"strings"
)

// restructureTmpl is the system prompt template embedded at compile
// time. It uses a homemade {{Var}} substitution syntax (no
// text/template — the template's own braces would conflict) plus
// {{#if X}} ... {{/if}} blocks for optional sections.
//
//go:embed restructure.tmpl
var restructureTmpl string

// RestructurePromptInput carries the fields BuildRestructure needs.
// Decoupled from provider.SuggestionRequest by design (cf. UI-019
// canvas decision Q2).
type RestructurePromptInput struct {
	// FullMarkdown is the artefact body without its YAML
	// front-matter (the caller has already split it via
	// uiapp.splitFrontMatter).
	FullMarkdown string

	// TemplateName identifies the SPDD template the artefact
	// is supposed to follow ("story", "analysis",
	// "canvas-reasons", …).
	TemplateName string

	// Divergence describes how the artefact diverges from the
	// template: required headings absent, orphan headings
	// present.
	Divergence DivergencePromptShape

	// History holds the chat fallback turns from previous
	// rounds. Empty on the very first call.
	History []RestructureTurn
}

// DivergencePromptShape mirrors the frontend templateDivergence.ts
// shape (kept lower-camel for JSON wire compatibility with the
// Wails binding).
type DivergencePromptShape struct {
	MissingRequired []string `json:"missingRequired"`
	OrphanSections  []string `json:"orphanSections"`
}

// RestructureTurn is one Q/A exchange in the chat fallback.
type RestructureTurn struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// BuildRestructure renders the system prompt for a restructuration
// request. Returns an error when:
//   - input.FullMarkdown is empty
//   - input.TemplateName is empty
//   - defs is nil (the section catalogue is required to compose
//     the "expected sections" block)
func BuildRestructure(input RestructurePromptInput, defs SectionDefinitions) (string, error) {
	if strings.TrimSpace(input.FullMarkdown) == "" {
		return "", fmt.Errorf("promptbuilder: FullMarkdown must not be empty")
	}
	if strings.TrimSpace(input.TemplateName) == "" {
		return "", fmt.Errorf("promptbuilder: TemplateName must not be empty")
	}
	if defs == nil {
		return "", fmt.Errorf("promptbuilder: SectionDefinitions must not be nil")
	}

	sectionsBlock := renderSectionsExpected(defs)
	missingBlock := renderBulletList(input.Divergence.MissingRequired)
	orphanBlock := renderBulletList(input.Divergence.OrphanSections)
	historyBlock := renderHistory(input.History)

	out := restructureTmpl
	out = substituteIfBlock(out, "MissingRequired", missingBlock != "", missingBlock)
	out = substituteIfBlock(out, "OrphanSections", orphanBlock != "", orphanBlock)
	out = substituteIfBlock(out, "History", historyBlock != "", historyBlock)

	out = strings.ReplaceAll(out, "{{TemplateName}}", input.TemplateName)
	out = strings.ReplaceAll(out, "{{SectionsExpected}}", sectionsBlock)
	out = strings.ReplaceAll(out, "{{FullMarkdown}}", input.FullMarkdown)

	return out, nil
}

// renderSectionsExpected returns a sorted bullet list of the
// known section keys with their definition (one per line).
func renderSectionsExpected(defs SectionDefinitions) string {
	keys := make([]string, 0, len(defs))
	for k := range defs {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var sb strings.Builder
	for _, k := range keys {
		def := defs[k]
		fmt.Fprintf(&sb, "- **%s** : %s\n", k, def)
	}
	return strings.TrimRight(sb.String(), "\n")
}

// renderBulletList formats a list of headings as a markdown
// bullet list, returns empty string when the input is empty.
func renderBulletList(items []string) string {
	if len(items) == 0 {
		return ""
	}
	var sb strings.Builder
	for _, it := range items {
		fmt.Fprintf(&sb, "- %s\n", it)
	}
	return strings.TrimRight(sb.String(), "\n")
}

// renderHistory formats the chat history as alternating Q/A
// blocks, returns empty string when no history.
func renderHistory(history []RestructureTurn) string {
	if len(history) == 0 {
		return ""
	}
	var sb strings.Builder
	for i, turn := range history {
		fmt.Fprintf(&sb, "### Tour %d\n", i+1)
		fmt.Fprintf(&sb, "**Question :** %s\n", strings.TrimSpace(turn.Question))
		if strings.TrimSpace(turn.Answer) != "" {
			fmt.Fprintf(&sb, "**Réponse :** %s\n", strings.TrimSpace(turn.Answer))
		}
		sb.WriteString("\n")
	}
	return strings.TrimRight(sb.String(), "\n")
}

// substituteIfBlock removes or fills the {{#if NAME}} ... {{/if}}
// block depending on whether `present` is true.
func substituteIfBlock(tmpl, name string, present bool, content string) string {
	open := "{{#if " + name + "}}"
	closeTag := "{{/if}}"

	openIdx := strings.Index(tmpl, open)
	if openIdx < 0 {
		return tmpl
	}
	closeIdx := strings.Index(tmpl[openIdx:], closeTag)
	if closeIdx < 0 {
		return tmpl
	}
	closeIdx += openIdx

	if !present {
		// Drop the block entirely (including its trailing newline
		// to avoid double blank lines).
		end := closeIdx + len(closeTag)
		if end < len(tmpl) && tmpl[end] == '\n' {
			end++
		}
		return tmpl[:openIdx] + tmpl[end:]
	}

	// Keep content but strip the {{#if}} / {{/if}} markers.
	inner := tmpl[openIdx+len(open) : closeIdx]
	// Substitute the content marker — the inner block usually
	// ends with `{{NAME}}\n` so we replace by `content\n`.
	inner = strings.ReplaceAll(inner, "{{"+name+"}}", content)
	return tmpl[:openIdx] + inner + tmpl[closeIdx+len(closeTag):]
}
