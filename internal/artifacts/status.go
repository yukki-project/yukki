package artifacts

// Status is a typed constant for the SPDD artifact status field
// (front-matter `status:` value).
type Status string

const (
	StatusDraft       Status = "draft"
	StatusReviewed    Status = "reviewed"
	StatusAccepted    Status = "accepted"
	StatusImplemented Status = "implemented"
	StatusSynced      Status = "synced"
)

// orderedStatuses is the canonical SPDD progression order.
var orderedStatuses = []Status{
	StatusDraft,
	StatusReviewed,
	StatusAccepted,
	StatusImplemented,
	StatusSynced,
}

// OrderedStatuses returns a defensive copy of the canonical SPDD
// progression order.
func OrderedStatuses() []Status {
	out := make([]Status, len(orderedStatuses))
	copy(out, orderedStatuses)
	return out
}

// indexOf returns the position of s in orderedStatuses, or -1 if
// the status is unknown.
func indexOf(s Status) int {
	for i, candidate := range orderedStatuses {
		if candidate == s {
			return i
		}
	}
	return -1
}

// IsValidTransition returns true iff from→to is a forward move by
// exactly 1 step OR a backward move by exactly 1 step (downgrade
// allowed for "I validated too fast, going back to draft", D-D7
// of UI-008). Identity (from == to) returns false — no-op
// transitions are surfaced as errors so the UI doesn't silently
// swallow them.
func IsValidTransition(from, to Status) bool {
	fi := indexOf(from)
	ti := indexOf(to)
	if fi == -1 || ti == -1 {
		return false
	}
	delta := ti - fi
	return delta == 1 || delta == -1
}

// AllowedTransitions returns the list of statuses reachable from
// `from`: the current status itself + the forward neighbour (if any)
// + the backward neighbour (if any). Returns an empty slice for
// unknown statuses (never nil, JSON-friendly).
func AllowedTransitions(from Status) []Status {
	idx := indexOf(from)
	if idx == -1 {
		return []Status{}
	}
	out := make([]Status, 0, 3)
	if idx > 0 {
		out = append(out, orderedStatuses[idx-1])
	}
	out = append(out, orderedStatuses[idx])
	if idx < len(orderedStatuses)-1 {
		out = append(out, orderedStatuses[idx+1])
	}
	return out
}
