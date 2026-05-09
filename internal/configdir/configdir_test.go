package configdir

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// setUserConfigDir redirects os.UserConfigDir() to root by setting the
// platform-specific env var. Returns the path that BaseDir/LogsDir
// will use as the parent.
func setUserConfigDir(t *testing.T, root string) {
	t.Helper()
	switch runtime.GOOS {
	case "windows":
		t.Setenv("APPDATA", root)
	case "darwin":
		t.Setenv("HOME", root)
	default:
		t.Setenv("XDG_CONFIG_HOME", root)
	}
}

func TestBaseDir_CreatesDirectory(t *testing.T) {
	root := t.TempDir()
	setUserConfigDir(t, root)

	got, err := BaseDir()
	if err != nil {
		t.Fatalf("BaseDir: %v", err)
	}

	info, err := os.Stat(got)
	if err != nil {
		t.Fatalf("stat %s: %v", got, err)
	}
	if !info.IsDir() {
		t.Errorf("%s is not a directory", got)
	}
	if filepath.Base(got) != "yukki" {
		t.Errorf("expected suffix 'yukki', got %s", got)
	}
}

func TestBaseDir_Idempotent(t *testing.T) {
	root := t.TempDir()
	setUserConfigDir(t, root)

	first, err := BaseDir()
	if err != nil {
		t.Fatalf("BaseDir #1: %v", err)
	}
	second, err := BaseDir()
	if err != nil {
		t.Fatalf("BaseDir #2: %v", err)
	}
	if first != second {
		t.Errorf("BaseDir not idempotent: %q vs %q", first, second)
	}
}

func TestLogsDir_NestedUnderBaseDir(t *testing.T) {
	root := t.TempDir()
	setUserConfigDir(t, root)

	base, err := BaseDir()
	if err != nil {
		t.Fatalf("BaseDir: %v", err)
	}
	logs, err := LogsDir()
	if err != nil {
		t.Fatalf("LogsDir: %v", err)
	}

	if logs != filepath.Join(base, "logs") {
		t.Errorf("LogsDir = %q, want %q", logs, filepath.Join(base, "logs"))
	}

	info, err := os.Stat(logs)
	if err != nil {
		t.Fatalf("stat %s: %v", logs, err)
	}
	if !info.IsDir() {
		t.Errorf("%s is not a directory", logs)
	}
}
