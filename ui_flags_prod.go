// OPS-001 prompt-update O7 — release-build counterpart of
// ui_flags_dev.go. The `--debug` flag is intentionally absent from
// `--help` and unknown to Cobra, so passing it errors out rather
// than silently enabling debug logging.

//go:build !devbuild

package main

import "github.com/spf13/cobra"

// registerDebugFlag is a no-op in release builds. The returned
// pointer always dereferences to false; callers can use it without
// branching.
func registerDebugFlag(_ *cobra.Command) *bool {
	v := false
	return &v
}
