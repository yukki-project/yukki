// UI-021 O2 — Binding `App.GetBuildInfo()` qui expose au frontend
// les variables peuplées au build via -ldflags. L'AboutDialog
// consomme cette valeur pour afficher version / commit / date de
// build.
//
// Stockage : champ `buildInfo` sur `*App`, alimenté par
// SetBuildInfo (appelé par ui.go au démarrage). Préféré à un
// paramètre supplémentaire de NewApp pour éviter de toucher les
// 65+ sites d'appel dans les tests existants. Tests qui n'appellent
// pas SetBuildInfo reçoivent un BuildInfo zéro — comportement
// attendu (Version="" → frontend fallback "dev", cf. AboutDialog).

package uiapp

// BuildInfo is the typed payload returned to the frontend via
// GetBuildInfo. All fields are strings populated at compile-time
// via -ldflags. Empty values mean the binary was not stamped
// (e.g. `wails dev`, `go run`, or a test that doesn't call
// SetBuildInfo).
type BuildInfo struct {
	Version   string
	CommitSHA string
	BuildDate string
}

// SetBuildInfo stores the build-time variables on the App
// instance. Called once by `ui.go` at startup with the values
// captured from `main.version`, `main.commitSHA`, `main.buildDate`.
// Tests can also call it to inject specific values when they
// exercise GetBuildInfo.
func (a *App) SetBuildInfo(info BuildInfo) {
	a.buildInfo = info
}

// GetBuildInfo returns the build-time variables for the
// AboutDialog. Returns a zero-value BuildInfo when SetBuildInfo
// has not been called (e.g. unit tests not exercising About) —
// the frontend interprets Version=="" as "dev".
func (a *App) GetBuildInfo() BuildInfo {
	return a.buildInfo
}
