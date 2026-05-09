// Desktop handler for the Wails-backed `yukki ui` window. O4 of the
// OPS-001 canvas.
//
// NewDesktop opens a daily-rotated text-format slog file under the
// caller-provided logsDir and returns the configured *slog.Logger,
// the *slog.LevelVar driving its level (so SaveSettings can flip
// WARN ↔ DEBUG at runtime per OPS-001 invariant I2), and an
// io.Closer to flush the buffered writer at shutdown.
//
// Day rotation is observed at write time: every Write checks
// time.Now().Format("2006-01-02") against the writer's currentDate
// and reopens the file when they diverge — no goroutine, no timer,
// naturally robust to a midnight wraparound (cf. OPS-001 analysis Q5).
//
// On open failure NewDesktop falls back to a stderr-only logger and
// returns a non-nil error so the caller can warn the user but keep
// the app alive (OPS-001 invariant I1: logs never crash the app).

package clilog

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// logFilePrefix and logFileSuffix bracket the daily filename
// pattern: yukki-YYYY-MM-DD.log.
const (
	logFilePrefix = "yukki-"
	logFileSuffix = ".log"
)

// dateLayout matches the lexicographic ordering of the filename so
// PurgeOldLogs can rely on mtime alone — the layout is stable across
// runtimes (no locale dependency).
const dateLayout = "2006-01-02"

// dailyFileWriter writes to <logsDir>/yukki-YYYY-MM-DD.log, rotating
// to a new file on each Write that crosses a day boundary. Concurrent
// Writes are serialised by mu so the slog handler can be shared
// across goroutines (Wails dispatches bindings concurrently).
type dailyFileWriter struct {
	logsDir string

	mu          sync.Mutex
	currentDate string
	file        *os.File
	writer      *bufio.Writer

	// flushOnEachWrite stays false in production: the buffered writer
	// drains on Close. Tests flip it to true when they need to assert
	// content immediately after a Write.
	flushOnEachWrite bool
	clock            func() time.Time

	// onWrite, when non-nil, is invoked with a copy of every record
	// just before it is buffered. Used by the OPS-001 logs drawer
	// to push live events to the frontend (gated by IsDevBuild in
	// ui.go — never set in release builds).
	onWrite func([]byte)
}

// newDailyFileWriter opens the file for today and returns a writer
// ready to receive log records.
func newDailyFileWriter(logsDir string) (*dailyFileWriter, error) {
	w := &dailyFileWriter{
		logsDir: logsDir,
		clock:   time.Now,
	}
	if err := w.rotateLocked(w.clock().Format(dateLayout)); err != nil {
		return nil, err
	}
	return w, nil
}

// Write rotates if the date has changed, then forwards the record
// to the buffered writer. Errors during rotation are wrapped and
// surfaced; the caller (slog handler) logs the failure on its own
// fallback path — OPS-001 invariant I1 ensures the app keeps running.
func (w *dailyFileWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	today := w.clock().Format(dateLayout)
	if today != w.currentDate {
		if err := w.rotateLocked(today); err != nil {
			return 0, err
		}
	}

	n, err := w.writer.Write(p)
	if err != nil {
		return n, err
	}
	if w.flushOnEachWrite {
		if flushErr := w.writer.Flush(); flushErr != nil {
			return n, flushErr
		}
	}
	if w.onWrite != nil {
		// Copy because callers may retain or post-process p
		// asynchronously (Wails IPC marshalling).
		buf := make([]byte, len(p))
		copy(buf, p)
		w.onWrite(buf)
	}
	return n, nil
}

// rotateLocked closes any open file/writer and opens the file for
// `date`. Caller must hold w.mu.
func (w *dailyFileWriter) rotateLocked(date string) error {
	if w.writer != nil {
		_ = w.writer.Flush()
	}
	if w.file != nil {
		_ = w.file.Close()
	}

	path := filepath.Join(w.logsDir, logFilePrefix+date+logFileSuffix)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("clilog: open %s: %w", path, err)
	}

	w.file = f
	w.writer = bufio.NewWriter(f)
	w.currentDate = date
	return nil
}

// Close flushes the buffered writer and closes the underlying file.
// Safe to call even if no Write has happened.
func (w *dailyFileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	var firstErr error
	if w.writer != nil {
		if err := w.writer.Flush(); err != nil {
			firstErr = err
		}
		w.writer = nil
	}
	if w.file != nil {
		if err := w.file.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
		w.file = nil
	}
	return firstErr
}

// noopCloser is returned alongside the stderr-fallback logger when
// NewDesktop cannot open the desktop log file.
type noopCloser struct{}

func (noopCloser) Close() error { return nil }

// NewDesktop opens the daily-rotated desktop log file under logsDir
// and returns a slog.Logger writing to it in text format. The
// returned *slog.LevelVar is the live handle backing the handler's
// level — SaveSettings (uiapp.O5) calls levelVar.Set(...) to flip
// WARN ↔ DEBUG without recreating the file.
//
// PurgeOldLogs(logsDir, 7) is invoked once at construction; failures
// there are non-fatal and surfaced via the returned error only when
// the file open itself fails.
//
// On any open failure, NewDesktop returns:
//   - a stderr-only slog.Logger (so callers always have a usable
//     logger),
//   - a *slog.LevelVar set to the same level (still toggleable),
//   - a noop io.Closer,
//   - the wrapped error (so the caller can surface a toast).
//
// Callers must Close the returned io.Closer at shutdown.
func NewDesktop(logsDir string, debugMode bool) (*slog.Logger, *slog.LevelVar, io.Closer, error) {
	level := &slog.LevelVar{}
	if debugMode {
		level.Set(slog.LevelDebug)
	} else {
		// OPS-001 prompt-update Q1 — default INFO so lifecycle
		// events (startup, project opened, settings hydrated) are
		// visible without enabling the debug toggle.
		level.Set(slog.LevelInfo)
	}

	// Best-effort retention pass; a failure here does not prevent
	// the rest of the factory from succeeding.
	_ = PurgeOldLogs(logsDir, 7)

	writer, err := newDailyFileWriter(logsDir)
	if err != nil {
		fallback := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level}))
		return fallback, level, noopCloser{}, fmt.Errorf("clilog: open desktop log: %w", err)
	}

	handler := slog.NewTextHandler(writer, &slog.HandlerOptions{Level: level})
	return slog.New(handler), level, writer, nil
}

// SetEventListener registers fn to be invoked with a copy of every
// log record after it is buffered. Pass the io.Closer returned by
// NewDesktop. Pass fn=nil to unregister. No-op when c is not the
// concrete writer (e.g. the noop fallback returned on open failure)
// — defensive so callers don't have to check the build / open state.
//
// Used by OPS-001's logs drawer (only wired in dev builds).
func SetEventListener(c io.Closer, fn func([]byte)) {
	w, ok := c.(*dailyFileWriter)
	if !ok {
		return
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	w.onWrite = fn
}

// PurgeOldLogs removes files matching yukki-YYYY-MM-DD.log under
// logsDir whose mtime is older than maxAgeDays. Errors on individual
// files are swallowed — the function returns nil unless ReadDir
// itself fails or logsDir is missing (in which case errors.Is
// os.ErrNotExist is returned as nil — first launch case).
func PurgeOldLogs(logsDir string, maxAgeDays int) error {
	entries, err := os.ReadDir(logsDir)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("clilog: read %s: %w", logsDir, err)
	}

	cutoff := time.Now().Add(-time.Duration(maxAgeDays) * 24 * time.Hour)
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasPrefix(name, logFilePrefix) || !strings.HasSuffix(name, logFileSuffix) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(logsDir, name))
		}
	}
	return nil
}
