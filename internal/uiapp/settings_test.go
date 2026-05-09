package uiapp

import (
	"log/slog"
	"testing"

	"github.com/yukki-project/yukki/internal/settings"
)

func newTestApp(t *testing.T) *App {
	t.Helper()
	a := &App{}
	a.SetSettingsStore(settings.NewStore(t.TempDir()))
	a.SetLogLevel(&slog.LevelVar{})
	return a
}

func TestLoadSettings_NoStore_ReturnsZero(t *testing.T) {
	a := &App{}
	got, err := a.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings: %v", err)
	}
	if got.DebugMode {
		t.Errorf("expected zero Settings without store, got DebugMode=true")
	}
}

func TestSaveLoad_RoundTrip(t *testing.T) {
	a := newTestApp(t)

	if err := a.SaveSettings(settings.Settings{DebugMode: true}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	got, err := a.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings: %v", err)
	}
	if !got.DebugMode {
		t.Errorf("expected DebugMode=true after Save, got false")
	}
}

func TestSaveSettings_FlipsLogLevel(t *testing.T) {
	a := newTestApp(t)

	if err := a.SaveSettings(settings.Settings{DebugMode: true}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}

	// OPS-001 prompt-update Q4: the level only goes to Debug when
	// IsDevBuild is true. In a release build (default `go test`),
	// IsDevBuild is false → the level stays Info even when
	// SaveSettings persists debugMode=true.
	if IsDevBuild {
		if a.logLevel.Level() != slog.LevelDebug {
			t.Errorf("logLevel = %v, want Debug (devbuild)", a.logLevel.Level())
		}
	} else {
		if a.logLevel.Level() != slog.LevelInfo {
			t.Errorf("logLevel = %v, want Info (release build ignores debugMode)", a.logLevel.Level())
		}
	}

	if err := a.SaveSettings(settings.Settings{DebugMode: false}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	if a.logLevel.Level() != slog.LevelInfo {
		t.Errorf("logLevel = %v, want Info (post prompt-update Q1)", a.logLevel.Level())
	}
}

func TestIsDevBuild_MatchesBuildTag(t *testing.T) {
	// Sanity check that IsDevBuild and the binding agree.
	a := &App{}
	if a.IsDevBuild() != IsDevBuild {
		t.Errorf("App.IsDevBuild() = %v, package const = %v", a.IsDevBuild(), IsDevBuild)
	}
}

func TestSaveSettings_NoStore_ReturnsError(t *testing.T) {
	a := &App{}
	if err := a.SaveSettings(settings.Settings{DebugMode: true}); err == nil {
		t.Errorf("expected error when store is nil, got nil")
	}
}
