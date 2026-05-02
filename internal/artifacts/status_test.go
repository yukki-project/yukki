package artifacts

import (
	"reflect"
	"testing"
)

func TestIsValidTransition_Forward(t *testing.T) {
	cases := []struct{ from, to Status }{
		{StatusDraft, StatusReviewed},
		{StatusReviewed, StatusAccepted},
		{StatusAccepted, StatusImplemented},
		{StatusImplemented, StatusSynced},
	}
	for _, c := range cases {
		if !IsValidTransition(c.from, c.to) {
			t.Errorf("forward %s → %s: want true, got false", c.from, c.to)
		}
	}
}

func TestIsValidTransition_Backward(t *testing.T) {
	cases := []struct{ from, to Status }{
		{StatusReviewed, StatusDraft},
		{StatusAccepted, StatusReviewed},
		{StatusImplemented, StatusAccepted},
		{StatusSynced, StatusImplemented},
	}
	for _, c := range cases {
		if !IsValidTransition(c.from, c.to) {
			t.Errorf("backward %s → %s: want true, got false", c.from, c.to)
		}
	}
}

func TestIsValidTransition_Skip(t *testing.T) {
	cases := []struct{ from, to Status }{
		{StatusDraft, StatusAccepted},
		{StatusDraft, StatusImplemented},
		{StatusDraft, StatusSynced},
		{StatusReviewed, StatusImplemented},
		{StatusReviewed, StatusSynced},
		{StatusAccepted, StatusSynced},
	}
	for _, c := range cases {
		if IsValidTransition(c.from, c.to) {
			t.Errorf("skip %s → %s: want false, got true", c.from, c.to)
		}
	}
}

func TestIsValidTransition_NoOp(t *testing.T) {
	for _, s := range OrderedStatuses() {
		if IsValidTransition(s, s) {
			t.Errorf("identity %s → %s: want false (no-op forbidden), got true", s, s)
		}
	}
}

func TestIsValidTransition_Unknown(t *testing.T) {
	cases := []struct{ from, to Status }{
		{Status("wip"), StatusDraft},
		{StatusDraft, Status("wip")},
		{Status(""), StatusDraft},
		{Status("blocked"), Status("wontfix")},
	}
	for _, c := range cases {
		if IsValidTransition(c.from, c.to) {
			t.Errorf("unknown %s → %s: want false, got true", c.from, c.to)
		}
	}
}

func TestAllowedTransitions_Endpoints(t *testing.T) {
	got := AllowedTransitions(StatusDraft)
	want := []Status{StatusDraft, StatusReviewed}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("AllowedTransitions(draft) = %v, want %v", got, want)
	}

	got = AllowedTransitions(StatusSynced)
	want = []Status{StatusImplemented, StatusSynced}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("AllowedTransitions(synced) = %v, want %v", got, want)
	}
}

func TestAllowedTransitions_Middle(t *testing.T) {
	got := AllowedTransitions(StatusReviewed)
	want := []Status{StatusDraft, StatusReviewed, StatusAccepted}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("AllowedTransitions(reviewed) = %v, want %v", got, want)
	}
}

func TestAllowedTransitions_Unknown(t *testing.T) {
	got := AllowedTransitions(Status("wip"))
	if len(got) != 0 {
		t.Errorf("AllowedTransitions(wip) = %v, want empty slice", got)
	}
	if got == nil {
		t.Errorf("AllowedTransitions(wip) returned nil, want empty slice (JSON-friendly)")
	}
}
