// OPS-001 prompt-update O7 — registers the `--debug` CLI flag only
// when the binary is compiled with -tags devbuild. Mirror of
// ui_flags_prod.go which returns a no-op pointer.

//go:build devbuild

package main

import "github.com/spf13/cobra"

// registerDebugFlag attaches `--debug` to cmd and returns a pointer
// whose dereferenced value reflects the user-supplied flag at parse
// time. The flag forces DEBUG-level logging for the session, on
// top of (and independently from) the persisted toggle.
func registerDebugFlag(cmd *cobra.Command) *bool {
	debug := false
	cmd.Flags().BoolVar(&debug, "debug", false,
		"Force DEBUG-level logging for this session (dev builds only)")
	return &debug
}
