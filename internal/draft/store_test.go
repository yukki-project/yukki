package draft

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// ─── O1 — JSON roundtrip ────────────────────────────────────────────────────

func TestDraft_JSONRoundtrip(t *testing.T) {
	original := Draft{
		ID:      "CORE-007",
		Slug:    "story-draft",
		Title:   "Test draft",
		Status:  "draft",
		Owner:   "Alice",
		Modules: []string{"internal/draft"},
		Sections: map[string]string{
			"bg": "background text",
			"bv": "business value",
		},
		AC: []AcceptanceCriterion{
			{ID: "AC1", Title: "First", Given: "g", When: "w", Then: "t"},
		},
		SavedAt: time.Date(2026, 5, 7, 12, 0, 0, 0, time.UTC),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var got Draft
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if got.ID != original.ID {
		t.Errorf("ID: got %q want %q", got.ID, original.ID)
	}
	if got.Title != original.Title {
		t.Errorf("Title: got %q want %q", got.Title, original.Title)
	}
	if len(got.AC) != 1 || got.AC[0].Given != "g" {
		t.Errorf("AC roundtrip failed: %+v", got.AC)
	}
}

func TestDraft_JSONRoundtrip_OmitemptyFieldsAbsent(t *testing.T) {
	d := Draft{ID: "X-001", Slug: "foo", Title: "T", Status: "draft"}
	data, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	raw := string(data)
	for _, absent := range []string{`"modules"`, `"sections"`, `"ac"`, `"created"`, `"updated"`, `"owner"`} {
		if contains(raw, absent) {
			t.Errorf("expected %s to be absent from JSON when zero, got: %s", absent, raw)
		}
	}
}

// ─── O2 — DraftStore ────────────────────────────────────────────────────────

func TestDraftStore_Save_CreatesFileOnFirstLaunch(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nonexistent", "sub")
	store, err := NewDraftStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	d := Draft{ID: "CORE-007", Title: "Hello"}
	if err := store.Save(d); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "CORE-007.json")); err != nil {
		t.Fatalf("expected file to exist: %v", err)
	}
}

func TestDraftStore_Save_EmptyID_UsesUnsavedKey(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)
	d := Draft{Title: "Untitled"}
	if err := store.Save(d); err != nil {
		t.Fatalf("Save empty-id: %v", err)
	}
	entries, _ := os.ReadDir(dir)
	var jsonFiles []string
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".json" {
			jsonFiles = append(jsonFiles, e.Name())
		}
	}
	if len(jsonFiles) != 1 {
		t.Fatalf("expected 1 json file, got %d: %v", len(jsonFiles), jsonFiles)
	}
	if !hasPrefix(jsonFiles[0], "unsaved-") {
		t.Errorf("expected filename to start with 'unsaved-', got %q", jsonFiles[0])
	}
}

func TestDraftStore_Load_ReturnsStoredDraft(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)
	d := Draft{ID: "UI-014", Title: "My story", Status: "draft"}
	if err := store.Save(d); err != nil {
		t.Fatal(err)
	}
	got, err := store.Load("UI-014")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.Title != d.Title {
		t.Errorf("Title: got %q want %q", got.Title, d.Title)
	}
}

func TestDraftStore_Load_PathTraversal_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)
	_, err := store.Load("../secret")
	if err == nil {
		t.Fatal("expected ErrPathTraversal, got nil")
	}
	if !isPathTraversal(err) {
		t.Errorf("expected ErrPathTraversal, got %v", err)
	}
}

func TestDraftStore_List_SortedByUpdatedAtDesc(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)

	now := time.Now()
	drafts := []Draft{
		{ID: "A-001", Title: "A", SavedAt: now.Add(-2 * time.Hour)},
		{ID: "B-002", Title: "B", SavedAt: now.Add(-1 * time.Hour)},
		{ID: "C-003", Title: "C", SavedAt: now},
	}
	for _, d := range drafts {
		// Write JSON directly (bypassing Save's SavedAt override) to control timestamps.
		data, _ := json.MarshalIndent(d, "", "  ")
		_ = os.WriteFile(filepath.Join(dir, d.ID+".json"), data, 0o600)
	}

	summaries, err := store.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(summaries) != 3 {
		t.Fatalf("expected 3 summaries, got %d", len(summaries))
	}
	if summaries[0].ID != "C-003" || summaries[1].ID != "B-002" || summaries[2].ID != "A-001" {
		t.Errorf("unexpected order: %v", summaryIDs(summaries))
	}
}

func TestDraftStore_Delete_IdempotentWhenAbsent(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)
	if err := store.Delete("nonexistent-id"); err != nil {
		t.Errorf("Delete of absent id should return nil, got: %v", err)
	}
}

func TestDraftStore_Save_Load_RaceCondition(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewDraftStore(dir)

	const n = 20
	errc := make(chan error, n)
	for i := 0; i < n; i++ {
		go func(i int) {
			d := Draft{ID: "RACE-001", Title: "concurrent"}
			errc <- store.Save(d)
		}(i)
	}
	for i := 0; i < n; i++ {
		<-errc // drain; on Windows some renames may be "Access denied" — tolerated
	}
	// After all writes, Load should succeed (at least one write landed).
	if _, err := store.Load("RACE-001"); err != nil {
		t.Errorf("Load after concurrent saves: %v", err)
	}
}

// ─── helpers ────────────────────────────────────────────────────────────────

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s, sub))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func hasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}

func isPathTraversal(err error) bool {
	return errors.Is(err, ErrPathTraversal)
}

func summaryIDs(ss []DraftSummary) []string {
	ids := make([]string, len(ss))
	for i, s := range ss {
		ids[i] = s.ID
	}
	return ids
}
