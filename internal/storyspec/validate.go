// Package storyspec — O3 of the CORE-007 canvas: canonical SPDD validation rules.
//
// This package is the single source of truth for front-matter validation shared
// by the CLI (yukki story) and the UI editor. It must NEVER import internal/uiapp
// so it remains usable from the CLI without dragging in the Wails dependency tree.
package storyspec

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/yukki-project/yukki/internal/artifacts"
)

// ─── Value types ─────────────────────────────────────────────────────────────

// ModuleWarning describes a module that is syntactically valid but absent from
// the known-modules list (warning, not an error).
type ModuleWarning struct {
	Module  string
	Message string
}

// FieldError describes a validation error or warning for a single front-matter field.
type FieldError struct {
	Field    string // "id", "slug", "status", "modules", "created", "updated"
	Severity string // "error" | "warning"
	Message  string
}

// ValidationReport aggregates all FieldErrors produced by Validate.
type ValidationReport struct {
	Errors []FieldError
}

// HasErrors returns true when the report contains at least one Severity=="error" entry.
func (r ValidationReport) HasErrors() bool {
	for _, e := range r.Errors {
		if e.Severity == "error" {
			return true
		}
	}
	return false
}

// ─── Compiled regexes (package-level, compiled once) ─────────────────────────

var (
	// idRE matches SPDD ids like CORE-007, UI-014a, META-001, UI-014-FOO-001
	idRE = regexp.MustCompile(`^[A-Z]+(-[A-Z]+)*-\d+[a-z]?$`)

	// slugRE matches strict kebab-case: starts with [a-z], segments separated by
	// single '-', each segment [a-z0-9]+.
	slugRE = regexp.MustCompile(`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`)

	// moduleRE matches valid module paths: starts with [a-z0-9], allows [a-z0-9/_-],
	// no consecutive '/', no leading digit in the first path segment.
	moduleRE = regexp.MustCompile(`^[a-z][a-z0-9/_-]*$`)
)

const (
	maxSlugLen = 80
	dateLayout = "2006-01-02"
)

// ─── Individual validators ────────────────────────────────────────────────────

// ValidateID returns nil if id matches the SPDD id format
// (^[A-Z]+(-[A-Z]+)*-\d+[a-z]?$), an error otherwise.
//
// Valid: CORE-007, UI-014a, META-001
// Invalid: core-007, 007-CORE, CORE-, ""
func ValidateID(id string) error {
	if id == "" {
		return fmt.Errorf("id must not be empty")
	}
	if !idRE.MatchString(id) {
		return fmt.Errorf("id %q does not match [A-Z]+(-[A-Z]+)*-\\d+[a-z]? (e.g. CORE-007, UI-014a)", id)
	}
	return nil
}

// ValidateSlug returns nil if slug is strict kebab-case:
//   - characters [a-z0-9-] only
//   - starts with [a-z] (no leading digit)
//   - no consecutive '--'
//   - does not start or end with '-'
//   - length ≤ 80 characters
func ValidateSlug(slug string) error {
	if slug == "" {
		return fmt.Errorf("slug must not be empty")
	}
	if len(slug) > maxSlugLen {
		return fmt.Errorf("slug length %d exceeds maximum %d", len(slug), maxSlugLen)
	}
	if !slugRE.MatchString(slug) {
		return fmt.Errorf("slug %q must be lowercase kebab-case (e.g. my-story-slug), starting with a letter", slug)
	}
	return nil
}

// ValidateStatus returns nil if status is one of the canonical SPDD statuses
// (draft, reviewed, accepted, implemented, synced), an error otherwise.
func ValidateStatus(status string) error {
	for _, s := range artifacts.OrderedStatuses() {
		if string(s) == status {
			return nil
		}
	}
	valid := make([]string, 0, len(artifacts.OrderedStatuses()))
	for _, s := range artifacts.OrderedStatuses() {
		valid = append(valid, string(s))
	}
	return fmt.Errorf("status %q is not valid; must be one of: %s", status, strings.Join(valid, ", "))
}

// ValidateModules inspects each module entry:
//   - syntactically invalid (contains space, consecutive '//', etc.) → error
//   - syntactically valid but absent from knownModules → warning
//
// Returns (warnings, errors) — both slices may be empty.
func ValidateModules(modules []string, knownModules []string) ([]ModuleWarning, []error) {
	known := make(map[string]struct{}, len(knownModules))
	for _, k := range knownModules {
		known[k] = struct{}{}
	}

	var warnings []ModuleWarning
	var errs []error

	for _, m := range modules {
		if !moduleRE.MatchString(m) || strings.Contains(m, "//") {
			errs = append(errs, fmt.Errorf("module %q is syntactically invalid (use [a-z0-9/_-]+, no spaces or consecutive slashes)", m))
			continue
		}
		if _, ok := known[m]; !ok {
			warnings = append(warnings, ModuleWarning{
				Module:  m,
				Message: fmt.Sprintf("module %q is not in the known-modules list; add it to .yukki/modules.yaml if intentional", m),
			})
		}
	}
	return warnings, errs
}

// ValidateDates returns nil when both created and updated are valid ISO 8601
// dates (YYYY-MM-DD) and updated >= created; an error otherwise.
func ValidateDates(created, updated string) error {
	c, err := time.Parse(dateLayout, created)
	if err != nil {
		return fmt.Errorf("created %q is not a valid ISO 8601 date (YYYY-MM-DD): %w", created, err)
	}
	u, err := time.Parse(dateLayout, updated)
	if err != nil {
		return fmt.Errorf("updated %q is not a valid ISO 8601 date (YYYY-MM-DD): %w", updated, err)
	}
	if u.Before(c) {
		return fmt.Errorf("updated %q must not be before created %q", updated, created)
	}
	return nil
}

// ─── Aggregate validator ─────────────────────────────────────────────────────

// Validate produces a ValidationReport for the given front-matter fields.
// All validators are called; the report aggregates every error and warning.
// knownModules is typically loaded via LoadKnownModules.
func Validate(id, slug, status, created, updated string, modules []string, knownModules []string) ValidationReport {
	var report ValidationReport

	if err := ValidateID(id); err != nil {
		report.Errors = append(report.Errors, FieldError{Field: "id", Severity: "error", Message: err.Error()})
	}
	if err := ValidateSlug(slug); err != nil {
		report.Errors = append(report.Errors, FieldError{Field: "slug", Severity: "error", Message: err.Error()})
	}
	if err := ValidateStatus(status); err != nil {
		report.Errors = append(report.Errors, FieldError{Field: "status", Severity: "error", Message: err.Error()})
	}
	if created != "" || updated != "" {
		if err := ValidateDates(created, updated); err != nil {
			report.Errors = append(report.Errors, FieldError{Field: "updated", Severity: "error", Message: err.Error()})
		}
	}

	warnings, errs := ValidateModules(modules, knownModules)
	for _, w := range warnings {
		report.Errors = append(report.Errors, FieldError{Field: "modules", Severity: "warning", Message: w.Message})
	}
	for _, e := range errs {
		report.Errors = append(report.Errors, FieldError{Field: "modules", Severity: "error", Message: e.Error()})
	}

	return report
}
