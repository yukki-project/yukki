package uiapp

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
)

// captureLogger returns an App wired to a slog.Logger that writes to
// the returned bytes.Buffer in text format, plus the buffer itself.
// Level defaults to Debug so we observe every record we send.
func captureLogger(t *testing.T) (*App, *bytes.Buffer) {
	t.Helper()
	buf := &bytes.Buffer{}
	level := &slog.LevelVar{}
	level.Set(slog.LevelDebug)
	handler := slog.NewTextHandler(buf, &slog.HandlerOptions{Level: level})
	a := &App{
		ctx:      context.Background(),
		logger:   slog.New(handler),
		logLevel: level,
	}
	return a, buf
}

func TestLogToBackend_MapsLevels(t *testing.T) {
	tests := []struct {
		input string
		want  string // substring expected in output
	}{
		{"debug", "level=DEBUG"},
		{"info", "level=INFO"},
		{"warn", "level=WARN"},
		{"warning", "level=WARN"},
		{"error", "level=ERROR"},
		{"err", "level=ERROR"},
		{"unknown", "level=INFO"}, // fallback
		{"", "level=INFO"},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			a, buf := captureLogger(t)
			if err := a.LogToBackend(LogPayload{Level: tt.input, Msg: "x"}); err != nil {
				t.Fatalf("LogToBackend returned err=%v (must always be nil)", err)
			}
			if !strings.Contains(buf.String(), tt.want) {
				t.Errorf("missing %q in output:\n%s", tt.want, buf.String())
			}
		})
	}
}

func TestLogToBackend_AttachesSourceAndStack(t *testing.T) {
	a, buf := captureLogger(t)
	err := a.LogToBackend(LogPayload{
		Level:  "error",
		Source: "frontend",
		Msg:    "boom",
		Stack:  "at App.tsx:42",
	})
	if err != nil {
		t.Fatalf("LogToBackend: %v", err)
	}
	out := buf.String()
	if !strings.Contains(out, `source=frontend`) {
		t.Errorf("missing source=frontend: %s", out)
	}
	if !strings.Contains(out, `stack="at App.tsx:42"`) {
		t.Errorf("missing stack attr: %s", out)
	}
	if !strings.Contains(out, "boom") {
		t.Errorf("missing message: %s", out)
	}
}

func TestLogToBackend_OmitsEmptyStack(t *testing.T) {
	a, buf := captureLogger(t)
	_ = a.LogToBackend(LogPayload{Level: "info", Msg: "ok"})
	if strings.Contains(buf.String(), "stack=") {
		t.Errorf("empty stack should not be attached: %s", buf.String())
	}
}

func TestLogToBackend_DefaultsSourceToFrontend(t *testing.T) {
	a, buf := captureLogger(t)
	_ = a.LogToBackend(LogPayload{Level: "info", Msg: "ok"})
	if !strings.Contains(buf.String(), "source=frontend") {
		t.Errorf("expected default source=frontend: %s", buf.String())
	}
}

func TestLogToBackend_NoLogger_ReturnsNil(t *testing.T) {
	a := &App{}
	if err := a.LogToBackend(LogPayload{Msg: "x"}); err != nil {
		t.Errorf("expected nil error when logger is nil, got %v", err)
	}
}

func TestOpenLogsFolder_InvokesOpener(t *testing.T) {
	called := ""
	prev := openFolderFn
	openFolderFn = func(path string) error {
		called = path
		return nil
	}
	defer func() { openFolderFn = prev }()

	a := &App{}
	if err := a.OpenLogsFolder(); err != nil {
		t.Fatalf("OpenLogsFolder: %v", err)
	}
	if called == "" {
		t.Errorf("openFolderFn was not called")
	}
	if !strings.Contains(strings.ReplaceAll(called, "\\", "/"), "/yukki/logs") {
		t.Errorf("expected path to end in /yukki/logs, got %q", called)
	}
}

func TestOpenLogsFolder_PropagatesOpenerError(t *testing.T) {
	prev := openFolderFn
	openFolderFn = func(string) error { return errors.New("boom") }
	defer func() { openFolderFn = prev }()

	a := &App{}
	err := a.OpenLogsFolder()
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "boom") {
		t.Errorf("error not wrapped: %v", err)
	}
}
