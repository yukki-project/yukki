// OPS-001 O5 — bindings App.LoadSettings / App.SaveSettings exposed
// to the frontend Settings store. The toggle persists the
// debugMode preference under <configDir>/yukki/settings.json and
// flips the runtime log level via the *slog.LevelVar wired by
// ui.go (cf. OPS-001 invariant I2).

package uiapp

import (
	"fmt"
	"log/slog"

	"github.com/yukki-project/yukki/internal/settings"
)

// SetSettingsStore wires the persistent settings store. Called by
// ui.go after NewApp, mirroring the SetBuildInfo pattern (avoids
// touching the 65+ call sites of NewApp in tests).
func (a *App) SetSettingsStore(store *settings.Store) {
	a.settingsStore = store
}

// SetLogLevel wires the live LevelVar returned by clilog.NewDesktop
// so SaveSettings can flip WARN ↔ DEBUG at runtime.
func (a *App) SetLogLevel(level *slog.LevelVar) {
	a.logLevel = level
}

// LoadSettings returns the persisted settings, or the zero Settings
// when no store has been wired (test contexts) or the file does not
// exist yet (first launch).
func (a *App) LoadSettings() (settings.Settings, error) {
	a.traceBinding("LoadSettings")
	if a.settingsStore == nil {
		return settings.Settings{}, nil
	}
	out, err := a.settingsStore.Load()
	if err != nil {
		return settings.Settings{}, fmt.Errorf("uiapp: load settings: %w", err)
	}
	return out, nil
}

// SaveSettings persists the new settings and applies the level
// change to the runtime logger immediately (no file recreation).
// Returns the wrapped error on disk failure so the frontend can
// show a toast.
func (a *App) SaveSettings(s settings.Settings) error {
	a.traceBinding("SaveSettings", slog.Bool("debugMode", s.DebugMode))
	if a.settingsStore == nil {
		return fmt.Errorf("uiapp: settings store not wired")
	}
	if err := a.settingsStore.Save(s); err != nil {
		return fmt.Errorf("uiapp: save settings: %w", err)
	}
	a.applyLogLevel(s.DebugMode)
	// SaveSettings is one of the rare bindings that warrants a stable
	// INFO trace independently of the debug level — flipping the toggle
	// is something we always want in the file even at the default level
	// (per OPS-001 prompt-update Q1, INFO captures lifecycle).
	if a.logger != nil {
		a.logger.Info("debug mode toggled",
			slog.Bool("debugMode", s.DebugMode),
			slog.Bool("isDevBuild", IsDevBuild),
		)
	}
	return nil
}

// IsDevBuildBinding exposes the compile-time IsDevBuild flag to the
// frontend. The binding is registered as App.IsDevBuild via Wails'
// PascalCase convention; we call the method on App so that the
// frontend stub (App.d.ts) can declare it.
//
// Note the leading capital — this is the binding name. The const
// of the same name lives at package scope (cf. buildflags_*.go);
// Go's name resolution picks the method when called as a.IsDevBuild().
func (a *App) IsDevBuild() bool {
	return IsDevBuild
}

// applyLogLevel translates DebugMode into the slog level used by
// the desktop logger. No-op when SetLogLevel has not been called
// (e.g. tests that don't exercise the desktop logger).
//
// Post-OPS-001-prompt-update Q1: the off-state is INFO, not WARN —
// lifecycle events stay visible without the toggle.
func (a *App) applyLogLevel(debugMode bool) {
	if a.logLevel == nil {
		return
	}
	if debugMode && IsDevBuild {
		a.logLevel.Set(slog.LevelDebug)
	} else {
		a.logLevel.Set(slog.LevelInfo)
	}
}
