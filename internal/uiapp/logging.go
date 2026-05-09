// OPS-001 O6 — frontend → file IPC bridge (LogToBackend) and the
// "open the logs folder in the OS file explorer" binding
// (OpenLogsFolder). The latter intentionally bypasses
// runtime.BrowserOpenURL — that opens the system browser, not the
// file manager — and shells out to the native explorer.
//
// LogToBackend honours OPS-001 invariant I1: errors during logging
// never propagate, so the call always returns nil. The frontend
// façade (logger.ts, O8) treats it as fire-and-forget.

package uiapp

import (
	"fmt"
	"log/slog"
	"os/exec"
	"runtime"
	"strings"

	"github.com/yukki-project/yukki/internal/configdir"
)

// LogPayload is the IPC envelope for a frontend log event. It mirrors
// the slog text-handler key/value format so events from frontend and
// Go appear consistent in the daily log file.
type LogPayload struct {
	Level  string // "debug" | "info" | "warn" | "error" (case-insensitive)
	Source string // typically "frontend"
	Msg    string
	Stack  string // optional, populated on error
}

// openFolderFn is the platform shell-out used by OpenLogsFolder.
// Indirected through a package-level var so unit tests can swap it
// for a recorder without launching the OS file explorer.
var openFolderFn = openFolderNative

// LogToBackend writes a frontend-originated event to the App's
// shared slog.Logger. Returns nil unconditionally — see invariant
// I1: log calls must never crash the app.
//
// Unknown levels are mapped to Info. Empty Stack is not attached.
// Empty Source falls back to "frontend".
func (a *App) LogToBackend(p LogPayload) error {
	if a.logger == nil {
		return nil
	}

	level := parseLevel(p.Level)
	source := p.Source
	if source == "" {
		source = "frontend"
	}

	attrs := []slog.Attr{slog.String("source", source)}
	if p.Stack != "" {
		attrs = append(attrs, slog.String("stack", p.Stack))
	}

	a.logger.LogAttrs(a.ctx, level, p.Msg, attrs...)
	return nil
}

// OpenLogsFolder resolves <configDir>/yukki/logs and asks the OS to
// open it in the native file manager. Returns the wrapped error if
// the path cannot be resolved or the shell-out fails so the
// frontend can surface a toast.
func (a *App) OpenLogsFolder() error {
	path, err := configdir.LogsDir()
	if err != nil {
		return fmt.Errorf("uiapp: resolve logs dir: %w", err)
	}
	if err := openFolderFn(path); err != nil {
		return fmt.Errorf("uiapp: open %s: %w", path, err)
	}
	return nil
}

// parseLevel maps the JS-side level string to slog.Level. Falls
// back to Info on unknown values.
func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error", "err":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// openFolderNative shells out to the platform's "open this folder"
// command. We do not use runtime.BrowserOpenURL because Wails routes
// it through the system browser, which on most setups opens the
// folder listing inside Chromium rather than the OS file manager.
func openFolderNative(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer.exe", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	// On Windows, explorer.exe returns exit code 1 even on success.
	// Start() (vs Run()) detaches and ignores the exit code.
	if err := cmd.Start(); err != nil {
		return err
	}
	// Best effort: do not Wait() — explorer keeps running.
	go func() { _ = cmd.Wait() }()
	return nil
}
