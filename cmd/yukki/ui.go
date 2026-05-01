// UI sub-command implementing O1 of the UI-001a canvas: open a Wails
// window when the user types `yukki ui`.
//
// The frontend is embedded via cmd/yukki/embed.go (//go:embed) and
// served by Wails' AssetServer. The provider is injected via the
// build-tagged factory newProvider() declared in ui_prod.go (default)
// or ui_mock.go (-tags mock).

package main

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"github.com/yukki-project/yukki/frontend"
	"github.com/yukki-project/yukki/internal/clilog"
	"github.com/yukki-project/yukki/internal/uiapp"
)

func newUICmd() *cobra.Command {
	var (
		verbose   bool
		logFormat string
	)

	cmd := &cobra.Command{
		Use:   "ui",
		Short: "Launch the yukki desktop app (Wails v2)",
		Long: "Launch the yukki desktop app: opens a native window backed by the\n" +
			"yukki Go core. The window blocks the CLI until closed.\n\n" +
			"Use --tags mock at build time to swap the Claude provider for a\n" +
			"MockProvider (developer convenience for `wails dev`).",
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			logger := clilog.New(clilog.Format(logFormat), verbose)
			prov := newProvider(logger)
			app := uiapp.NewApp(prov, logger)

			err := wails.Run(&options.App{
				Title:  "yukki",
				Width:  1280,
				Height: 800,
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
		},
	}

	cmd.Flags().BoolVar(&verbose, "verbose", false, "Enable Debug-level logging")
	cmd.Flags().StringVar(&logFormat, "log-format", "text", "Log format: 'text' or 'json'")
	return cmd
}
