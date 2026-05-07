package storyspec

import (
	"strings"
	"testing"
)

// ─── ValidateID ──────────────────────────────────────────────────────────────

func TestValidateID_ValidCases(t *testing.T) {
	cases := []string{"CORE-007", "UI-014a", "META-001", "INT-003"}
	for _, id := range cases {
		if err := ValidateID(id); err != nil {
			t.Errorf("ValidateID(%q) unexpected error: %v", id, err)
		}
	}
}

func TestValidateID_InvalidCases(t *testing.T) {
	cases := []string{"core-007", "007-CORE", "CORE-", "", "CORE007", "UI_014"}
	for _, id := range cases {
		if err := ValidateID(id); err == nil {
			t.Errorf("ValidateID(%q) expected error, got nil", id)
		}
	}
}

// ─── ValidateSlug ────────────────────────────────────────────────────────────

func TestValidateSlug_ValidCases(t *testing.T) {
	cases := []string{"my-story", "story-draft-persistence", "a", "abc123", "foo-bar-baz"}
	for _, s := range cases {
		if err := ValidateSlug(s); err != nil {
			t.Errorf("ValidateSlug(%q) unexpected error: %v", s, err)
		}
	}
}

func TestValidateSlug_InvalidCases(t *testing.T) {
	cases := []string{"", "-foo", "foo-", "FOO", "foo bar", "foo--bar"}
	for _, s := range cases {
		if err := ValidateSlug(s); err == nil {
			t.Errorf("ValidateSlug(%q) expected error, got nil", s)
		}
	}
}

func TestValidateSlug_BoundaryLength(t *testing.T) {
	// 80 chars exactly: valid
	s80 := strings.Repeat("a", 80)
	if err := ValidateSlug(s80); err != nil {
		t.Errorf("ValidateSlug(80 chars) unexpected error: %v", err)
	}
	// 81 chars: invalid
	s81 := strings.Repeat("a", 81)
	if err := ValidateSlug(s81); err == nil {
		t.Error("ValidateSlug(81 chars) expected error, got nil")
	}
}

func TestValidateSlug_StartsWithDigit(t *testing.T) {
	if err := ValidateSlug("1foo"); err == nil {
		t.Error("ValidateSlug(starts with digit) expected error, got nil")
	}
}

// ─── ValidateStatus ──────────────────────────────────────────────────────────

func TestValidateStatus_ValidAndInvalid(t *testing.T) {
	for _, s := range []string{"draft", "reviewed", "accepted", "implemented", "synced"} {
		if err := ValidateStatus(s); err != nil {
			t.Errorf("ValidateStatus(%q) unexpected error: %v", s, err)
		}
	}
	for _, s := range []string{"unknown", "", "Draft", "DRAFT"} {
		if err := ValidateStatus(s); err == nil {
			t.Errorf("ValidateStatus(%q) expected error, got nil", s)
		}
	}
}

// ─── ValidateModules ─────────────────────────────────────────────────────────

func TestValidateModules_UnknownIsWarning(t *testing.T) {
	known := []string{"internal/draft", "frontend"}
	modules := []string{"internal/draft", "some/new/module"}
	warnings, errs := ValidateModules(modules, known)
	if len(errs) != 0 {
		t.Errorf("expected no errors, got %v", errs)
	}
	if len(warnings) != 1 || warnings[0].Module != "some/new/module" {
		t.Errorf("expected 1 warning for 'some/new/module', got %v", warnings)
	}
}

func TestValidateModules_SyntaxErrorIsError(t *testing.T) {
	known := []string{}
	invalid := []string{"my module", "//bad", "double//slash"}
	_, errs := ValidateModules(invalid, known)
	if len(errs) != len(invalid) {
		t.Errorf("expected %d syntax errors, got %d: %v", len(invalid), len(errs), errs)
	}
}

func TestValidateModules_AllKnown_NoWarnings(t *testing.T) {
	known := []string{"internal/draft", "frontend"}
	warnings, errs := ValidateModules(known, known)
	if len(warnings) != 0 || len(errs) != 0 {
		t.Errorf("expected no warnings/errors for known modules, got warnings=%v errs=%v", warnings, errs)
	}
}

// ─── ValidateDates ───────────────────────────────────────────────────────────

func TestValidateDates_Valid(t *testing.T) {
	if err := ValidateDates("2026-01-01", "2026-05-07"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	// same day is valid (updated == created)
	if err := ValidateDates("2026-05-07", "2026-05-07"); err != nil {
		t.Errorf("same-day should be valid: %v", err)
	}
}

func TestValidateDates_UpdatedBeforeCreated(t *testing.T) {
	if err := ValidateDates("2026-05-07", "2026-01-01"); err == nil {
		t.Error("expected error when updated < created, got nil")
	}
}

func TestValidateDates_InvalidFormat(t *testing.T) {
	if err := ValidateDates("not-a-date", "2026-05-07"); err == nil {
		t.Error("expected error for invalid created date format")
	}
	if err := ValidateDates("2026-05-07", "07/05/2026"); err == nil {
		t.Error("expected error for invalid updated date format")
	}
}

// ─── Validate (aggregate) ────────────────────────────────────────────────────

func TestValidate_ValidDraft_EmptyReport(t *testing.T) {
	known := []string{"internal/draft", "frontend"}
	report := Validate("CORE-007", "story-draft", "draft", "2026-01-01", "2026-05-07", []string{"internal/draft"}, known)
	if len(report.Errors) != 0 {
		t.Errorf("expected empty report, got %v", report.Errors)
	}
}

func TestValidate_ProducesReport_WithAllFieldErrors(t *testing.T) {
	// All fields invalid
	report := Validate("bad-id", "1BadSlug", "invalid-status", "not-a-date", "also-bad", []string{"my module"}, []string{})
	fields := make(map[string]bool)
	for _, e := range report.Errors {
		fields[e.Field] = true
	}
	for _, expected := range []string{"id", "slug", "status", "updated", "modules"} {
		if !fields[expected] {
			t.Errorf("expected FieldError for field %q, not found in %v", expected, report.Errors)
		}
	}
}

func TestValidate_ReturnsFielErrorForBadID(t *testing.T) {
	report := Validate("bad", "some-slug", "draft", "", "", nil, nil)
	for _, e := range report.Errors {
		if e.Field == "id" && e.Severity == "error" {
			return
		}
	}
	t.Errorf("expected FieldError{Field:'id', Severity:'error'} in %v", report.Errors)
}
