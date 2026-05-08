// Command yukki is the CLI entrypoint for the SPDD toolkit.
//
// Implements O7 of the CORE-001 canvas. v1 ships the `story` subcommand;
// CORE-002 will add the other six SPDD steps.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/clilog"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
	"github.com/yukki-project/yukki/internal/workflow"
)

// Exit codes follow the canvas Norms:
//
//	0 success
//	1 user error (invalid input, empty description, invalid prefix)
//	2 provider error (claude not found / version / generation failed)
//	3 I/O error (template, write, frontmatter validation)
const (
	exitSuccess  = 0
	exitUserErr  = 1
	exitProvider = 2
	exitIO       = 3
)

// UI-021 O1 — Variables peuplées au build via -ldflags. Restent
// vides en build local non stampé (`go run`, `wails dev`) ; dans
// ce cas formatVersion() retourne "dev".
//
//	-X main.version=vX.Y.Z
//	-X main.commitSHA=abc1234
//	-X main.buildDate=2026-05-09T12:00:00Z
var (
	version   = ""
	commitSHA = ""
	buildDate = ""
)

func main() {
	root := newRootCmd()
	if err := root.ExecuteContext(context.Background()); err != nil {
		os.Exit(mapErrorToExitCode(err))
	}
}

func newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:           "yukki",
		Short:         "SPDD toolkit: generate, evolve and sync structured prompt artifacts",
		SilenceUsage:  true,
		SilenceErrors: false,
		Version:       formatVersion(),
	}
	root.SetVersionTemplate("yukki {{.Version}}\n")
	root.AddCommand(newStoryCmd())
	root.AddCommand(newUICmd())
	return root
}

// formatVersion compose la chaîne affichée par `yukki --version` et
// retournée à l'AboutDialog via App.GetBuildInfo. Trois cas :
//
//   - vars vides → "dev"
//   - seule version peuplée → "vX.Y.Z"
//   - tout peuplé → "vX.Y.Z (commit ABCDEFG, built 2026-05-09T...)"
func formatVersion() string {
	if version == "" {
		return "dev"
	}
	if commitSHA == "" && buildDate == "" {
		return version
	}
	if commitSHA != "" && buildDate != "" {
		return fmt.Sprintf("%s (commit %s, built %s)", version, commitSHA, buildDate)
	}
	if commitSHA != "" {
		return fmt.Sprintf("%s (commit %s)", version, commitSHA)
	}
	return fmt.Sprintf("%s (built %s)", version, buildDate)
}

func newStoryCmd() *cobra.Command {
	var (
		prefix       string
		strictPrefix bool
		verbose      bool
		logFormat    string
	)

	cmd := &cobra.Command{
		Use:   "story [description]",
		Short: "Generate a SPDD user story from a free-form description",
		Long: "Generate a SPDD user story from a description (argument or stdin)\n" +
			"by orchestrating the `claude` CLI with a structured SPDD system prompt.\n\n" +
			"Suggested ID prefixes (informational unless --strict-prefix): " +
			artifacts.AllowedPrefixesString() + ".",
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			desc, err := readDescription(args, cmd.InOrStdin())
			if err != nil {
				return err
			}
			if strings.TrimSpace(desc) == "" {
				_ = cmd.Help()
				return workflow.ErrEmptyDescription
			}

			logger := clilog.New(clilog.Format(logFormat), verbose)
			cwd, err := os.Getwd()
			if err != nil {
				return fmt.Errorf("getwd: %w", err)
			}

			opts := workflow.StoryOptions{
				Description:    desc,
				Prefix:         prefix,
				StrictPrefix:   strictPrefix,
				Logger:         logger,
				Provider:       provider.NewClaude(logger),
				TemplateLoader: templates.NewLoader(cwd),
				Writer:         artifacts.NewWriter(filepath.Join(cwd, "stories")),
			}

			path, err := workflow.RunStory(cmd.Context(), opts)
			if err != nil {
				return err
			}

			fmt.Fprintln(cmd.OutOrStdout(), path)
			return nil
		},
	}
	cmd.Flags().StringVar(&prefix, "prefix", "STORY", "ID prefix for the generated story (e.g., STORY, EXT, CORE)")
	cmd.Flags().BoolVar(&strictPrefix, "strict-prefix", false, "Restrict --prefix to the suggested whitelist")
	cmd.Flags().BoolVar(&verbose, "verbose", false, "Enable Debug-level logging")
	cmd.Flags().StringVar(&logFormat, "log-format", "text", "Log format: 'text' or 'json'")
	return cmd
}

// readDescription returns the description from args (preferred) or piped stdin.
// If both are absent or empty, returns "" (caller will print usage).
func readDescription(args []string, stdin io.Reader) (string, error) {
	if len(args) > 0 && strings.TrimSpace(args[0]) != "" {
		return args[0], nil
	}
	if isPipedStdin(stdin) {
		data, err := io.ReadAll(stdin)
		if err != nil {
			return "", fmt.Errorf("read stdin: %w", err)
		}
		return string(data), nil
	}
	return "", nil
}

// isPipedStdin checks whether stdin is piped (not a TTY).
// Uses the canonical Go pattern: os.Stdin.Stat() & os.ModeCharDevice == 0.
func isPipedStdin(stdin io.Reader) bool {
	f, ok := stdin.(*os.File)
	if !ok {
		// Tests pass strings.Reader; treat as piped to allow injection.
		return true
	}
	info, err := f.Stat()
	if err != nil {
		return false
	}
	return (info.Mode() & os.ModeCharDevice) == 0
}

// mapErrorToExitCode translates internal sentinel errors into shell exit codes.
func mapErrorToExitCode(err error) int {
	switch {
	case err == nil:
		return exitSuccess
	case errors.Is(err, workflow.ErrEmptyDescription),
		errors.Is(err, artifacts.ErrInvalidPrefix):
		return exitUserErr
	case errors.Is(err, provider.ErrNotFound),
		errors.Is(err, provider.ErrVersionIncompatible),
		errors.Is(err, provider.ErrGenerationFailed):
		return exitProvider
	case errors.Is(err, artifacts.ErrInvalidFrontmatter),
		errors.Is(err, templates.ErrEmbedMissing):
		return exitIO
	}
	// Default to I/O for unclassified errors.
	return exitIO
}
