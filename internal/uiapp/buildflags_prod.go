// OPS-001 O15 — IsDevBuild compile-time gate (release builds).
//
// Mirror of buildflags_dev.go for binaries compiled without the
// `devbuild` tag. The constant is false, which:
//   - hides the Developer menu, drawer and badge in the frontend
//     (the IsDevBuild binding returns false → isDevBuild() === false);
//   - causes uiapp.applyLogLevel to ignore a persisted DebugMode=true
//     and keep the desktop logger at INFO;
//   - causes App.TailLogs to return an error so any forgotten
//     drawer code path cannot leak log content.

//go:build !devbuild

package uiapp

const IsDevBuild = false
