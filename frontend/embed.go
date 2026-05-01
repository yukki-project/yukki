// Package frontend bundles the Vite-built React assets for the
// `yukki ui` desktop app (UI-001a). The Go-level embed lives here so
// that //go:embed all:dist works directly (Go embed forbids `..` paths,
// so the embed file must sit next to `dist/`).
//
// `cmd/yukki/ui.go` imports this package as a typed assets provider and
// hands the embed.FS to Wails' AssetServer.
//
// The actual contents of `dist/` are produced by `wails build`
// (npm run build under the hood). A `dist/.gitkeep` placeholder is
// committed so this embed succeeds even before the first frontend build.
package frontend

import "embed"

// Assets contains the built Vite output served by Wails to the WebView.
//
//go:embed all:dist
var Assets embed.FS
