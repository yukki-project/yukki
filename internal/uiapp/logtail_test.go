package uiapp

import (
	"errors"
	"strings"
	"testing"
)

func TestTailLogs_DevBuildGate(t *testing.T) {
	a := &App{}
	_, err := a.TailLogs(10)
	if IsDevBuild {
		// In dev build, missing logs dir resolves to a directory
		// (configdir.LogsDir creates it), file is absent, returns
		// empty slice + nil err.
		if err != nil {
			t.Errorf("dev build: expected nil err, got %v", err)
		}
	} else {
		if !errors.Is(err, ErrNotDevBuild) {
			t.Errorf("release build: expected ErrNotDevBuild, got %v", err)
		}
	}
}

func TestTailLogs_ClampsMaxLines(t *testing.T) {
	if !IsDevBuild {
		t.Skip("requires -tags devbuild")
	}
	a := &App{}
	// negative maxLines clamped up to 1
	if _, err := a.TailLogs(-5); err != nil {
		t.Errorf("clamping negative: %v", err)
	}
	// huge maxLines clamped down to maxTailLinesCap
	if _, err := a.TailLogs(99999); err != nil {
		t.Errorf("clamping large: %v", err)
	}
}

func TestParseSlogLine_StandardRecord(t *testing.T) {
	raw := `time=2026-05-09T18:32:14Z level=WARN source=frontend msg="HubList refresh failed" err="no project"`
	got := parseSlogLine(raw)
	if got.Timestamp != "2026-05-09T18:32:14Z" {
		t.Errorf("Timestamp = %q", got.Timestamp)
	}
	if got.Level != "WARN" {
		t.Errorf("Level = %q", got.Level)
	}
	if got.Source != "frontend" {
		t.Errorf("Source = %q", got.Source)
	}
	if !strings.Contains(got.Msg, "HubList refresh failed") {
		t.Errorf("Msg = %q", got.Msg)
	}
	if got.Raw != raw {
		t.Errorf("Raw not preserved")
	}
}

func TestParseSlogLine_NoSource(t *testing.T) {
	raw := `time=2026-05-09T18:32:14Z level=INFO msg="ui startup"`
	got := parseSlogLine(raw)
	if got.Level != "INFO" {
		t.Errorf("Level = %q", got.Level)
	}
	if got.Source != "" {
		t.Errorf("Source = %q, want empty", got.Source)
	}
}

func TestParseSlogLine_Corrupted(t *testing.T) {
	raw := "this is not a slog line"
	got := parseSlogLine(raw)
	if got.Raw != raw {
		t.Errorf("Raw not preserved on parse failure")
	}
	if got.Level != "" {
		t.Errorf("expected empty Level on parse failure, got %q", got.Level)
	}
}
