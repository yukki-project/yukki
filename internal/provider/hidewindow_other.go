// UI-019 fix — no-op sur les plateformes non-Windows. Linux/macOS
// n'ouvrent pas de console quand un GUI process spawne un CLI.

//go:build !windows

package provider

import "os/exec"

// hideConsole est un no-op sur les plateformes Unix.
func hideConsole(_ *exec.Cmd) {}
