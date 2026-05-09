// OPS-001 O15 — IsDevBuild compile-time gate.
//
// This file is included only when the binary is compiled with
// `-tags devbuild`. The dev-build constant is true here, exposing
// the debug toggle, the Developer menu, the logs drawer, and the
// `--debug` CLI flag. The mirror file (buildflags_prod.go) is
// included otherwise and sets the constant to false so the same
// surfaces compile out of the release binary.

//go:build devbuild

package uiapp

// IsDevBuild reports whether the binary was compiled with the
// `devbuild` tag. Frontend surfaces query it via App.IsDevBuild()
// to hide developer affordances in release binaries.
const IsDevBuild = true
