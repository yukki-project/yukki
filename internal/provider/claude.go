package provider

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"
)

// DefaultClaudeTimeout caps Generate calls so a hung `claude` does not block
// `yukki` indefinitely. Override via ClaudeProvider.Timeout.
const DefaultClaudeTimeout = 5 * time.Minute

// ClaudeProvider invokes the `claude` CLI via os/exec.
//
// The flag passed to claude defaults to "--print" (non-interactive print
// mode). Override via Args for compatibility with future claude CLI versions
// or for test fakes.
type ClaudeProvider struct {
	logger *slog.Logger

	// Binary is the executable name; defaults to "claude". Overridable for tests.
	Binary string

	// Args are the arguments passed to the binary; defaults to {"--print"}.
	Args []string

	// Timeout caps Generate calls. Zero means use DefaultClaudeTimeout.
	// A negative value disables the timeout entirely.
	Timeout time.Duration
}

// NewClaude returns a ClaudeProvider using the system `claude` binary.
func NewClaude(logger *slog.Logger) *ClaudeProvider {
	return &ClaudeProvider{
		logger:  logger,
		Binary:  "claude",
		Args:    []string{"--print"},
		Timeout: DefaultClaudeTimeout,
	}
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

// Generate streams the prompt to `claude` and returns its stdout.
//
// A timeout (configurable via ClaudeProvider.Timeout, default 5 min) is
// applied unless ctx already has a deadline. Pass a negative Timeout to
// disable.
func (p *ClaudeProvider) Generate(ctx context.Context, prompt string) (string, error) {
	timeout := p.Timeout
	if timeout == 0 {
		timeout = DefaultClaudeTimeout
	}
	if timeout > 0 {
		if _, hasDeadline := ctx.Deadline(); !hasDeadline {
			var cancel context.CancelFunc
			ctx, cancel = context.WithTimeout(ctx, timeout)
			defer cancel()
		}
	}

	args := p.Args
	if len(args) == 0 {
		args = []string{"--print"}
	}

	cmd := exec.CommandContext(ctx, p.Binary, args...)
	cmd.Stdin = strings.NewReader(prompt)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if p.logger != nil {
		// Log only metadata, never the prompt content (Safeguard "no secret loggé").
		p.logger.Debug("invoking claude",
			"binary", p.Binary,
			"args", args,
			"prompt_bytes", len(prompt),
			"timeout", timeout,
		)
	}

	if err := cmd.Run(); err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return "", fmt.Errorf("%w: claude timed out after %s", ErrGenerationFailed, timeout)
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return "", fmt.Errorf("%w: claude exit %d: %s",
				ErrGenerationFailed, exitErr.ExitCode(), strings.TrimSpace(stderr.String()))
		}
		return "", fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	return stdout.String(), nil
}
