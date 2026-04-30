package provider

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
)

// ClaudeProvider invokes the `claude` CLI via os/exec.
type ClaudeProvider struct {
	logger *slog.Logger
	// Binary is the executable name; defaults to "claude". Overridable for tests.
	Binary string
}

// NewClaude returns a ClaudeProvider using the system `claude` binary.
func NewClaude(logger *slog.Logger) *ClaudeProvider {
	return &ClaudeProvider{logger: logger, Binary: "claude"}
}

// Name returns the provider identifier.
func (p *ClaudeProvider) Name() string { return "claude" }

// CheckVersion verifies that `claude` is in PATH and reports its version.
func (p *ClaudeProvider) CheckVersion(ctx context.Context) error {
	if _, err := exec.LookPath(p.Binary); err != nil {
		return fmt.Errorf("%w: %s", ErrNotFound, p.Binary)
	}

	cmd := exec.CommandContext(ctx, p.Binary, "--version")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s --version: %v", ErrVersionIncompatible, p.Binary, err)
	}

	version := strings.TrimSpace(string(out))
	if p.logger != nil {
		p.logger.Debug("claude version detected", "version", version)
	}
	return nil
}

// Generate streams the prompt to `claude --print` and returns its stdout.
func (p *ClaudeProvider) Generate(ctx context.Context, prompt string) (string, error) {
	cmd := exec.CommandContext(ctx, p.Binary, "--print")
	cmd.Stdin = strings.NewReader(prompt)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if p.logger != nil {
		// Log only metadata, never the prompt content (Safeguard "no secret loggé").
		p.logger.Debug("invoking claude", "binary", p.Binary, "prompt_bytes", len(prompt))
	}

	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return "", fmt.Errorf("%w: claude exit %d: %s",
				ErrGenerationFailed, exitErr.ExitCode(), strings.TrimSpace(stderr.String()))
		}
		return "", fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	return stdout.String(), nil
}
