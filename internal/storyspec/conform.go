// Package storyspec — O2 of the CORE-009 canvas: post-render conformance check.
//
// Conform verifies that a rendered SPDD Markdown artefact contains the
// mandatory sections in the canonical order defined by the story template.
// It is called by StoryExport immediately after Render to guard against
// regression bugs in the serialiser.
package storyspec

import (
	"fmt"
	"strings"

	"github.com/yukki-project/yukki/internal/artifacts"
)

// mandatoryHeadings is the ordered list of H2 sections that must appear
// in a valid SPDD story artefact, in this exact order.
var mandatoryHeadings = []string{
	"Background",
	"Business Value",
	"Scope In",
	"Scope Out",
	"Acceptance Criteria",
}

// Conform checks that rendered is a valid SPDD Markdown artefact:
//   - it has a parseable YAML frontmatter
//   - it contains all mandatory sections in canonical order
//
// Optional sections (Open Questions, Notes) may appear anywhere after
// the mandatory ones without causing an error. Returns nil on success.
func Conform(rendered []byte) error {
	s := string(rendered)

	// 1. Validate frontmatter via the existing artifacts helper.
	if err := artifacts.ValidateFrontmatter(s); err != nil {
		return fmt.Errorf("conform: %w", err)
	}

	// 2. Extract H2 headings from the body (after the frontmatter).
	headings := extractH2Headings(s)

	// 3. Walk mandatory headings in order.
	pos := 0 // index into headings slice
	for _, want := range mandatoryHeadings {
		found := false
		for i := pos; i < len(headings); i++ {
			if headings[i] == want {
				pos = i + 1
				found = true
				break
			}
		}
		if !found {
			// Determine whether it is missing or out-of-order.
			for _, h := range headings {
				if h == want {
					return fmt.Errorf("conform: section %q attendue avant %q, trouvée à l'inverse",
						want, headings[pos-1])
				}
			}
			return fmt.Errorf("conform: section %q absente du .md rendu", want)
		}
	}

	return nil
}

// extractH2Headings returns the text content of every "## <text>" line
// in s, in order of appearance.
func extractH2Headings(s string) []string {
	var out []string
	for _, line := range strings.Split(s, "\n") {
		if strings.HasPrefix(line, "## ") {
			out = append(out, strings.TrimSpace(strings.TrimPrefix(line, "## ")))
		}
	}
	return out
}
