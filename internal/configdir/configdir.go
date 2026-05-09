// Package configdir resolves the on-disk root for yukki's per-user
// state — drafts, settings, logs — under the platform's standard
// config directory. O1 of the OPS-001 canvas.
//
// All callers go through BaseDir / LogsDir rather than re-deriving
// the path, so a future migration to a different layout touches a
// single place. See safeguard "configdir.BaseDir() est la seule
// porte d'entrée pour <configDir>/yukki/" in the canvas.
package configdir

import (
	"fmt"
	"os"
	"path/filepath"
)

// BaseDir returns <os.UserConfigDir()>/yukki, creating it (mode
// 0700) if it does not yet exist. It is safe to call repeatedly.
func BaseDir() (string, error) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("configdir: resolve user config dir: %w", err)
	}
	base := filepath.Join(cfg, "yukki")
	if err := os.MkdirAll(base, 0o700); err != nil {
		return "", fmt.Errorf("configdir: mkdir %s: %w", base, err)
	}
	return base, nil
}

// LogsDir returns <BaseDir()>/logs, creating it (mode 0700) if
// missing. Used by clilog.NewDesktop to write the daily-rotated
// log file.
func LogsDir() (string, error) {
	base, err := BaseDir()
	if err != nil {
		return "", err
	}
	logs := filepath.Join(base, "logs")
	if err := os.MkdirAll(logs, 0o700); err != nil {
		return "", fmt.Errorf("configdir: mkdir %s: %w", logs, err)
	}
	return logs, nil
}
