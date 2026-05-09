package clilog

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNewDesktop_WritesWarn(t *testing.T) {
	logsDir := t.TempDir()
	logger, _, closer, err := NewDesktop(logsDir, false)
	if err != nil {
		t.Fatalf("NewDesktop: %v", err)
	}

	logger.Warn("hello", "k", "v")
	if err := closer.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	today := time.Now().Format(dateLayout)
	path := filepath.Join(logsDir, logFilePrefix+today+logFileSuffix)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read log: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "hello") {
		t.Errorf("expected 'hello' in log, got: %s", content)
	}
	if !strings.Contains(content, "k=v") {
		t.Errorf("expected 'k=v' in log, got: %s", content)
	}
}

func TestNewDesktop_DebugMode_WritesDebug(t *testing.T) {
	logsDir := t.TempDir()
	logger, _, closer, err := NewDesktop(logsDir, true)
	if err != nil {
		t.Fatalf("NewDesktop: %v", err)
	}

	logger.Debug("trace event")
	if err := closer.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	today := time.Now().Format(dateLayout)
	data, _ := os.ReadFile(filepath.Join(logsDir, logFilePrefix+today+logFileSuffix))
	if !strings.Contains(string(data), "trace event") {
		t.Errorf("debug record missing in log: %s", string(data))
	}
}

func TestNewDesktop_DefaultDropsDebug(t *testing.T) {
	logsDir := t.TempDir()
	logger, _, closer, err := NewDesktop(logsDir, false)
	if err != nil {
		t.Fatalf("NewDesktop: %v", err)
	}

	logger.Debug("trace event")
	logger.Info("info event")
	logger.Warn("warned")
	if err := closer.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	today := time.Now().Format(dateLayout)
	data, _ := os.ReadFile(filepath.Join(logsDir, logFilePrefix+today+logFileSuffix))
	if strings.Contains(string(data), "trace event") {
		t.Errorf("debug record should be dropped at INFO level: %s", string(data))
	}
	if !strings.Contains(string(data), "info event") {
		t.Errorf("info record missing at INFO level (default after prompt-update): %s", string(data))
	}
	if !strings.Contains(string(data), "warned") {
		t.Errorf("warn record missing: %s", string(data))
	}
}

func TestLevelVar_RuntimeFlip(t *testing.T) {
	logsDir := t.TempDir()
	logger, level, closer, err := NewDesktop(logsDir, false)
	if err != nil {
		t.Fatalf("NewDesktop: %v", err)
	}

	logger.Debug("before") // dropped (INFO default)
	level.Set(slog.LevelDebug)
	logger.Debug("after") // kept (DEBUG)
	if err := closer.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	today := time.Now().Format(dateLayout)
	data, _ := os.ReadFile(filepath.Join(logsDir, logFilePrefix+today+logFileSuffix))
	content := string(data)
	if strings.Contains(content, "before") {
		t.Errorf("'before' should have been dropped: %s", content)
	}
	if !strings.Contains(content, "after") {
		t.Errorf("'after' missing after level flip: %s", content)
	}
}

func TestDailyFileWriter_RotatesAtMidnight(t *testing.T) {
	logsDir := t.TempDir()
	w, err := newDailyFileWriter(logsDir)
	if err != nil {
		t.Fatalf("newDailyFileWriter: %v", err)
	}
	w.flushOnEachWrite = true

	day1 := time.Date(2026, 5, 9, 23, 59, 0, 0, time.UTC)
	day2 := time.Date(2026, 5, 10, 0, 1, 0, 0, time.UTC)

	w.clock = func() time.Time { return day1 }
	if _, err := w.Write([]byte("late event\n")); err != nil {
		t.Fatalf("write day1: %v", err)
	}

	w.clock = func() time.Time { return day2 }
	if _, err := w.Write([]byte("early event\n")); err != nil {
		t.Fatalf("write day2: %v", err)
	}

	if err := w.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	day1File := filepath.Join(logsDir, "yukki-2026-05-09.log")
	day2File := filepath.Join(logsDir, "yukki-2026-05-10.log")

	d1, err := os.ReadFile(day1File)
	if err != nil {
		t.Fatalf("read day1 file: %v", err)
	}
	if !strings.Contains(string(d1), "late event") {
		t.Errorf("day1 file missing 'late event': %s", string(d1))
	}
	if strings.Contains(string(d1), "early event") {
		t.Errorf("day1 file leaked 'early event': %s", string(d1))
	}

	d2, err := os.ReadFile(day2File)
	if err != nil {
		t.Fatalf("read day2 file: %v", err)
	}
	if !strings.Contains(string(d2), "early event") {
		t.Errorf("day2 file missing 'early event': %s", string(d2))
	}
}

func TestPurgeOldLogs_RemovesAgedFiles(t *testing.T) {
	logsDir := t.TempDir()
	now := time.Now()

	files := map[string]time.Time{
		"yukki-fresh.log":  now,
		"yukki-recent.log": now.Add(-3 * 24 * time.Hour),
		"yukki-stale.log":  now.Add(-10 * 24 * time.Hour),
		"unrelated.txt":    now.Add(-30 * 24 * time.Hour), // ignored
	}
	for name, mtime := range files {
		path := filepath.Join(logsDir, name)
		if err := os.WriteFile(path, []byte{}, 0o600); err != nil {
			t.Fatalf("seed %s: %v", name, err)
		}
		if err := os.Chtimes(path, mtime, mtime); err != nil {
			t.Fatalf("chtimes %s: %v", name, err)
		}
	}

	if err := PurgeOldLogs(logsDir, 7); err != nil {
		t.Fatalf("PurgeOldLogs: %v", err)
	}

	for _, keeper := range []string{"yukki-fresh.log", "yukki-recent.log", "unrelated.txt"} {
		if _, err := os.Stat(filepath.Join(logsDir, keeper)); err != nil {
			t.Errorf("%s should have been kept: %v", keeper, err)
		}
	}
	if _, err := os.Stat(filepath.Join(logsDir, "yukki-stale.log")); !os.IsNotExist(err) {
		t.Errorf("yukki-stale.log should have been removed, got err=%v", err)
	}
}

func TestPurgeOldLogs_MissingDir_NoError(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "does-not-exist")
	if err := PurgeOldLogs(missing, 7); err != nil {
		t.Errorf("expected nil error on missing dir, got %v", err)
	}
}

func TestNewDesktop_FallsBackOnUnopenableDir(t *testing.T) {
	// Pointer at a path that exists as a *file*, so MkdirAll inside
	// configdir would fail and the OpenFile inside newDailyFileWriter
	// definitely fails. We construct the failure case directly here.
	tmp := t.TempDir()
	// Create a regular file at a path we will then claim as the
	// logsDir — OpenFile on <file>/yukki-*.log will fail with
	// "not a directory" on POSIX and equivalent on Windows.
	clash := filepath.Join(tmp, "clash")
	if err := os.WriteFile(clash, []byte{}, 0o600); err != nil {
		t.Fatalf("seed clash: %v", err)
	}

	logger, level, closer, err := NewDesktop(clash, false)
	if err == nil {
		t.Errorf("expected error when logsDir is unusable, got nil")
	}
	if logger == nil {
		t.Errorf("logger must remain non-nil even on fallback")
	}
	if level == nil {
		t.Errorf("level must remain non-nil even on fallback")
	}
	if closer == nil {
		t.Errorf("closer must remain non-nil even on fallback")
	}
	// fallback closer is noop; calling Close() must not error.
	if err := closer.Close(); err != nil {
		t.Errorf("noop closer Close: %v", err)
	}
}
