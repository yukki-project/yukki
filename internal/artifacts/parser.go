package artifacts

import (
	"errors"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// ErrInvalidFrontmatter is returned when an artifact's YAML frontmatter
// is missing, malformed, or fails to unmarshal into the requested type.
//
// Cohabits with ErrInvalidPrefix (id.go) and ErrInvalidKind (lister.go)
// in the artifacts sentinel-error family. Use errors.Is to match.
var ErrInvalidFrontmatter = errors.New("invalid frontmatter")

// ParseFrontmatter decodes the YAML frontmatter block delimited by `---`
// lines at the start of content into a fresh value of type T.
//
// Both LF (`---\n`) and CRLF (`---\r\n`) delimiters are accepted to
// remain portable across Windows checkouts with autocrlf enabled.
//
// Returns the zero value of T plus an error wrapping
// ErrInvalidFrontmatter when the delimiters are missing or the YAML
// cannot be unmarshalled into T. The original content is never
// mutated by this function.
func ParseFrontmatter[T any](content string) (T, error) {
	var zero T

	leading, leadLen, ok := matchLeadingDelim(content)
	if !ok {
		return zero, fmt.Errorf("%w: missing leading frontmatter delimiter", ErrInvalidFrontmatter)
	}
	rest := content[leadLen:]

	end := indexClosingDelim(rest, leading)
	if end < 0 {
		return zero, fmt.Errorf("%w: missing closing frontmatter delimiter", ErrInvalidFrontmatter)
	}
	yamlSrc := rest[:end]

	var out T
	if err := yaml.Unmarshal([]byte(yamlSrc), &out); err != nil {
		return zero, fmt.Errorf("%w: %v", ErrInvalidFrontmatter, err)
	}
	return out, nil
}

// ValidateFrontmatter ensures content starts with `---\n...\n---\n`
// (LF or CRLF accepted) and that the YAML between the delimiters parses
// into a non-empty mapping.
//
// Public signature preserved from CORE-001 (Invariant CORE-002 I2).
// Implemented as a thin wrapper over ParseFrontmatter[map[string]any]
// followed by a non-empty map check.
func ValidateFrontmatter(content string) error {
	m, err := ParseFrontmatter[map[string]any](content)
	if err != nil {
		return err
	}
	if len(m) == 0 {
		return fmt.Errorf("%w: empty frontmatter", ErrInvalidFrontmatter)
	}
	return nil
}

// matchLeadingDelim returns the delimiter newline ("\n" or "\r\n") used
// at the start of content, the byte length consumed (`---\n` = 4 bytes,
// `---\r\n` = 5 bytes), and ok=true on match.
func matchLeadingDelim(content string) (newline string, length int, ok bool) {
	switch {
	case strings.HasPrefix(content, "---\r\n"):
		return "\r\n", 5, true
	case strings.HasPrefix(content, "---\n"):
		return "\n", 4, true
	default:
		return "", 0, false
	}
}

// indexClosingDelim finds the position in content of the closing `---`
// delimiter. Searches for both "\n---\n" and "\n---\r\n" (and the
// CRLF-leading variants "\r\n---\n", "\r\n---\r\n") to remain robust
// against mixed-EOL files. Returns -1 if not found.
//
// The returned index is the offset of the leading EOL character (i.e.
// content[:i] is the raw YAML between the delimiters, no trailing EOL).
func indexClosingDelim(content, leadingNL string) int {
	// Prefer the leading-style EOL first for the closing delim, then fall
	// back to the alternate. Covers both pure-LF and pure-CRLF files
	// without normalisation, and tolerates mixed-EOL via the fallback.
	candidates := []string{
		leadingNL + "---" + leadingNL,
	}
	if leadingNL == "\n" {
		candidates = append(candidates, "\n---\r\n")
	} else {
		candidates = append(candidates, "\r\n---\n")
	}

	best := -1
	for _, c := range candidates {
		if i := strings.Index(content, c); i >= 0 && (best < 0 || i < best) {
			best = i
		}
	}
	return best
}
