// UI-021 O2 — Tests pour GetBuildInfo / SetBuildInfo.

package uiapp

import (
	"testing"

	"github.com/yukki-project/yukki/internal/provider"
)

func TestApp_GetBuildInfo_DefaultZero(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	got := app.GetBuildInfo()
	if got.Version != "" || got.CommitSHA != "" || got.BuildDate != "" {
		t.Fatalf("expected zero BuildInfo for fresh App, got %+v", got)
	}
}

func TestApp_GetBuildInfo_AfterSet(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	app.SetBuildInfo(BuildInfo{
		Version:   "v0.4.0",
		CommitSHA: "abc1234",
		BuildDate: "2026-05-09T12:00:00Z",
	})

	got := app.GetBuildInfo()
	if got.Version != "v0.4.0" {
		t.Errorf("Version: got %q want %q", got.Version, "v0.4.0")
	}
	if got.CommitSHA != "abc1234" {
		t.Errorf("CommitSHA: got %q want %q", got.CommitSHA, "abc1234")
	}
	if got.BuildDate != "2026-05-09T12:00:00Z" {
		t.Errorf("BuildDate: got %q want %q", got.BuildDate, "2026-05-09T12:00:00Z")
	}
}

func TestApp_SetBuildInfo_Overwrites(t *testing.T) {
	app := NewApp(&provider.MockProvider{}, newTestLogger())

	app.SetBuildInfo(BuildInfo{Version: "v0.1.0"})
	app.SetBuildInfo(BuildInfo{Version: "v0.2.0", CommitSHA: "def5678"})

	got := app.GetBuildInfo()
	if got.Version != "v0.2.0" {
		t.Errorf("Version not overwritten: got %q", got.Version)
	}
	if got.CommitSHA != "def5678" {
		t.Errorf("CommitSHA not set: got %q", got.CommitSHA)
	}
}
