// Package draft — O1 of the CORE-007 canvas: Draft entity and related types.
//
// A Draft represents a SPDD story being authored in the UI editor. Unlike a
// finalised Story artefact (.md), a Draft is serialised as JSON for fast
// incremental persistence and may be in a partial state (empty fields allowed).
package draft

import "time"

// AcceptanceCriterion is a single Given/When/Then block within a Draft.
type AcceptanceCriterion struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Given string `json:"given"`
	When  string `json:"when"`
	Then  string `json:"then"`
}

// Draft is a SPDD story in progress.
//
// Fields with omitempty are optional at any point in the authoring lifecycle;
// the mandatory fields (ID, Slug, Title, Status) are present but may be the
// zero string. SavedAt records the wall-clock time of the last successful
// DraftStore.Save call.
type Draft struct {
	ID      string `json:"id"`
	Slug    string `json:"slug"`
	Title   string `json:"title"`
	Status  string `json:"status"`
	Created string `json:"created,omitempty"`
	Updated string `json:"updated,omitempty"`
	Owner   string `json:"owner,omitempty"`

	// Modules is the list of codebase modules affected by this story.
	Modules []string `json:"modules,omitempty"`

	// Sections maps SPDD section keys to their prose content.
	// Recognised keys: "bg", "bv", "si", "so", "oq", "notes".
	Sections map[string]string `json:"sections,omitempty"`

	// AC holds the acceptance criteria in authoring order.
	AC []AcceptanceCriterion `json:"ac,omitempty"`

	// SavedAt is set by DraftStore.Save to the time of the write.
	SavedAt time.Time `json:"savedAt"`
}

// DraftSummary is a lightweight view of a Draft used for restoration dialogs.
// It avoids unmarshalling the full Draft payload when listing all saved drafts.
type DraftSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updatedAt"`
}
