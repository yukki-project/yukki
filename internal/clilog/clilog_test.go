package clilog

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

func TestNew_FormatAndLevel(t *testing.T) {
	tests := []struct {
		name        string
		format      Format
		verbose     bool
		wantLevel   slog.Level
		wantJSON    bool
		message     string
	}{
		{"text default level info", FormatText, false, slog.LevelInfo, false, "hello"},
		{"text verbose level debug", FormatText, true, slog.LevelDebug, false, "hello"},
		{"json default level info", FormatJSON, false, slog.LevelInfo, true, "hello"},
		{"json verbose level debug", FormatJSON, true, slog.LevelDebug, true, "hello"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var buf bytes.Buffer
			logger := newWithWriter(&buf, tc.format, tc.verbose)

			if tc.verbose {
				logger.Debug(tc.message)
			} else {
				logger.Info(tc.message)
			}

			out := buf.String()
			if !strings.Contains(out, tc.message) {
				t.Fatalf("expected log output to contain %q, got %q", tc.message, out)
			}
			if tc.wantJSON {
				if !strings.HasPrefix(strings.TrimSpace(out), "{") {
					t.Fatalf("expected JSON output, got %q", out)
				}
			}
		})
	}
}

func TestNew_DebugSilencedByDefault(t *testing.T) {
	var buf bytes.Buffer
	logger := newWithWriter(&buf, FormatText, false)
	logger.Debug("should be hidden")
	if buf.Len() != 0 {
		t.Fatalf("expected debug to be silenced at info level, got %q", buf.String())
	}
}
