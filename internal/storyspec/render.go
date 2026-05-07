// Package storyspec — O1 of the CORE-009 canvas: canonical SPDD Markdown renderer.
//
// Render serialises a draft.Draft into a valid SPDD Markdown artefact.
// The output is suitable for WriteAtomic and must pass Conform before
// being written to disk. EOL is always '\n' regardless of the OS.
package storyspec

import (
	"fmt"
	"strings"

	"github.com/yukki-project/yukki/internal/draft"
)

// sectionDef describes a SPDD story section.
type sectionDef struct {
	key      string // key in Draft.Sections ("bg", "bv", …)
	heading  string // markdown H2 heading text
	required bool   // if true, the section is emitted even when empty
}

// canonicalSections defines the canonical order of SPDD story sections.
// Matches the template at .yukki/templates/story.md.
var canonicalSections = []sectionDef{
	{"bg", "Background", true},
	{"bv", "Business Value", true},
	{"si", "Scope In", true},
	{"so", "Scope Out", true},
	// ac is handled separately (structured list, not raw prose)
	{"oq", "Open Questions", false},
	{"notes", "Notes", false},
}

// Render serialises d into a canonical SPDD Markdown artefact.
// It validates d.ID and d.Slug before writing; any invalid value returns an error.
// EOL is always '\n' regardless of the OS.
func Render(d draft.Draft) ([]byte, error) {
	if err := ValidateID(d.ID); err != nil {
		return nil, fmt.Errorf("render: %w", err)
	}
	if err := ValidateSlug(d.Slug); err != nil {
		return nil, fmt.Errorf("render: %w", err)
	}

	var sb strings.Builder

	// ── Frontmatter ────────────────────────────────────────────────────────
	sb.WriteString("---\n")
	fmt.Fprintf(&sb, "id: %s\n", d.ID)
	fmt.Fprintf(&sb, "slug: %s\n", d.Slug)
	fmt.Fprintf(&sb, "title: %s\n", d.Title)
	fmt.Fprintf(&sb, "status: %s\n", d.Status)
	if d.Created != "" {
		fmt.Fprintf(&sb, "created: %s\n", d.Created)
	}
	if d.Updated != "" {
		fmt.Fprintf(&sb, "updated: %s\n", d.Updated)
	}
	if d.Owner != "" {
		fmt.Fprintf(&sb, "owner: %s\n", d.Owner)
	}
	if len(d.Modules) > 0 {
		sb.WriteString("modules:\n")
		for _, m := range d.Modules {
			fmt.Fprintf(&sb, "  - %s\n", m)
		}
	}
	sb.WriteString("---\n")

	// ── Title ───────────────────────────────────────────────────────────────
	fmt.Fprintf(&sb, "\n# %s\n", d.Title)

	// ── Prose sections ──────────────────────────────────────────────────────
	for _, sec := range canonicalSections {
		content := d.Sections[sec.key]
		if !sec.required && strings.TrimSpace(content) == "" {
			continue
		}
		fmt.Fprintf(&sb, "\n## %s\n", sec.heading)
		if strings.TrimSpace(content) != "" {
			sb.WriteString("\n")
			sb.WriteString(content)
			if !strings.HasSuffix(content, "\n") {
				sb.WriteString("\n")
			}
		}
	}

	// ── Acceptance Criteria ─────────────────────────────────────────────────
	sb.WriteString("\n## Acceptance Criteria\n")
	for _, ac := range d.AC {
		fmt.Fprintf(&sb, "\n### %s — %s\n", ac.ID, ac.Title)
		sb.WriteString("\n")
		fmt.Fprintf(&sb, "- **Given** %s\n", ac.Given)
		fmt.Fprintf(&sb, "- **When** %s\n", ac.When)
		fmt.Fprintf(&sb, "- **Then** %s\n", ac.Then)
	}

	return []byte(sb.String()), nil
}
