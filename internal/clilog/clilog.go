// Package clilog configures the structured logger used by yukki commands.
//
// It implements N-clilog of the CORE-001 canvas: text or JSON output on
// stderr, Info level by default, Debug when verbose.
package clilog

import (
	"io"
	"log/slog"
	"os"
)

// Format selects the slog handler used for output.
type Format string

const (
	// FormatText emits human-readable lines (default).
	FormatText Format = "text"
	// FormatJSON emits one JSON object per record (machine-friendly).
	FormatJSON Format = "json"
)

// New returns a slog.Logger writing to stderr in the requested format.
// When verbose is true the level is Debug; otherwise Info.
func New(format Format, verbose bool) *slog.Logger {
	return newWithWriter(os.Stderr, format, verbose)
}

func newWithWriter(w io.Writer, format Format, verbose bool) *slog.Logger {
	level := slog.LevelInfo
	if verbose {
		level = slog.LevelDebug
	}
	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	switch format {
	case FormatJSON:
		handler = slog.NewJSONHandler(w, opts)
	default:
		handler = slog.NewTextHandler(w, opts)
	}
	return slog.New(handler)
}
