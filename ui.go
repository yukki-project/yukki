// UI sub-command implementing O1 of the UI-001a canvas: open a Wails
// window when the user types `yukki ui`.
//
// The frontend is embedded via cmd/yukki/embed.go (//go:embed) and
// served by Wails' AssetServer. The provider is injected via the
// build-tagged factory newProvider() declared in ui_prod.go (default)
// or ui_mock.go (-tags mock).
//
// OPS-001 O7 + prompt-update — at startup we resolve
// <configDir>/yukki/, load the persisted settings, and hand the App
// a desktop slog logger writing to <configDir>/yukki/logs/yukki-YYYY-MM-DD.log.
// The CLI --debug flag (registered only in dev builds via the
// devbuild build tag) wins over the persisted setting. The resulting
// debugMode is *gated* by uiapp.IsDevBuild — release binaries always
// run at INFO regardless of what settings.json says.

package main

import (
	"fmt"
	"log/slog"

	"github.com/spf13/cobra"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"github.com/yukki-project/yukki/frontend"
	"github.com/yukki-project/yukki/internal/clilog"
	"github.com/yukki-project/yukki/internal/configdir"
	"github.com/yukki-project/yukki/internal/settings"
	"github.com/yukki-project/yukki/internal/uiapp"
)

func newUICmd() *cobra.Command {
	var logFormat string

	cmd := &cobra.Command{
		Use:   "ui",
		Short: "Launch the yukki desktop app (Wails v2)",
		Long: "Launch the yukki desktop app: opens a native window backed by the\n" +
			"yukki Go core. The window blocks the CLI until closed.\n\n" +
			"Use --tags mock at build time to swap the Claude provider for a\n" +
			"MockProvider (developer convenience for `wails dev`).",
		Args: cobra.NoArgs,
	}

	cmd.Flags().StringVar(&logFormat, "log-format", "text", "Log format: 'text' or 'json'")
	debugFlag := registerDebugFlag(cmd) // dev-only flag (no-op in release)

	cmd.RunE = func(cmd *cobra.Command, _ []string) error {
		// CLI fallback: if configdir resolution fails (rare —
		// ephemeral container, missing $HOME), keep a stderr logger
		// so the binary still launches.
		fallback := clilog.New(clilog.Format(logFormat), false)

		cfgDir, err := configdir.BaseDir()
		if err != nil {
			fallback.Warn("configdir resolution failed — desktop logging disabled", "err", err)
			return runWithLogger(fallback, nil, nil, nil)
		}

		settingsStore := settings.NewStore(cfgDir)
		persisted, loadErr := settingsStore.Load()
		if loadErr != nil {
			fallback.Warn("settings load failed — defaulting to zero", "err", loadErr)
			persisted = settings.Settings{}
		}

		// Gate at the source: release binaries (IsDevBuild=false)
		// never enter debug mode, regardless of persisted state or
		// CLI flag (which is anyway absent at parse time).
		debugMode := uiapp.IsDevBuild && (persisted.DebugMode || *debugFlag)

		logsDir, _ := configdir.LogsDir()
		deskLogger, level, closer, deskErr := clilog.NewDesktop(logsDir, debugMode)
		if deskErr != nil {
			fallback.Warn("desktop log file unavailable — falling back to stderr", "err", deskErr)
		}
		defer func() {
			if closer != nil {
				_ = closer.Close()
			}
		}()

		// First-line-of-the-session: emit an INFO event so the log
		// file is never empty after a normal launch (cf. AC8 +
		// prompt-update Q1).
		deskLogger.Info("ui startup",
			"version", version,
			"isDevBuild", uiapp.IsDevBuild,
			"debugMode", debugMode,
		)

		return runWithLoggerAndCloser(deskLogger, level, settingsStore, &persisted, closer)
	}

	return cmd
}

// runWithLogger constructs the Wails App and blocks on wails.Run.
// Used by the configdir-failed fallback path that has no closer.
func runWithLogger(
	logger *slog.Logger,
	level *slog.LevelVar,
	store *settings.Store,
	persisted *settings.Settings,
) error {
	return runWithLoggerAndCloser(logger, level, store, persisted, nil)
}

// runWithLoggerAndCloser is the full path used when the desktop
// logger is in play; the closer is wired so live log events can
// be emitted to the frontend in dev builds.
func runWithLoggerAndCloser(
	logger *slog.Logger,
	level *slog.LevelVar,
	store *settings.Store,
	_ *settings.Settings,
	closer interface{ Close() error },
) error {
	prov := newProvider(logger)
	app := uiapp.NewApp(prov, logger)

	if store != nil {
		app.SetSettingsStore(store)
	}
	if level != nil {
		app.SetLogLevel(level)
	}

	// Live log stream → frontend drawer (dev builds only — the
	// listener is nil in release).
	if listener := app.EmitLogEventListener(); listener != nil && closer != nil {
		clilog.SetEventListener(closer, listener)
	}

	app.SetBuildInfo(uiapp.BuildInfo{
		Version:   version,
		CommitSHA: commitSHA,
		BuildDate: buildDate,
	})

	err := wails.Run(&options.App{
		Title:     "yukki",
		Width:     1280,
		Height:    800,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: frontend.Assets,
		},
		OnStartup:  app.OnStartup,
		OnShutdown: app.OnShutdown,
		Bind:       []any{app},
	})
	if err != nil {
		return fmt.Errorf("wails: %w", err)
	}
	return nil
}
