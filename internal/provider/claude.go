package provider

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os/exec"
	"strings"
	"time"
)

// DefaultClaudeTimeout caps Generate calls so a hung `claude` does not block
// `yukki` indefinitely. Override via ClaudeProvider.Timeout.
const DefaultClaudeTimeout = 5 * time.Minute

// ChunkFunc is the callback type invoked with each text chunk received from
// the claude CLI stream-json output. text is always non-empty.
// Set ClaudeProvider.OnChunk to activate streaming mode.
type ChunkFunc func(text string)

// streamEvent is the minimal deserialization target for a single stream-json
// line emitted by the claude CLI.
type streamEvent struct {
	Type    string `json:"type"`
	Message struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	} `json:"message"`
	Result  string `json:"result"`
	Subtype string `json:"subtype"`
}

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

	// OnChunk, when non-nil, activates streaming mode: --output-format
	// stream-json is prepended to Args, and each non-empty text chunk from
	// the assistant is passed to OnChunk before Generate returns.
	// nil = non-streaming (backward-compatible).
	OnChunk ChunkFunc
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

// Version returns the trimmed stdout of `<binary> --version`. Returns
// ErrNotFound if the binary is not on PATH and ErrVersionIncompatible on
// subprocess failure or empty output.
func (p *ClaudeProvider) Version(ctx context.Context) (string, error) {
	if _, err := exec.LookPath(p.Binary); err != nil {
		return "", fmt.Errorf("%w: %s", ErrNotFound, p.Binary)
	}

	cmd := exec.CommandContext(ctx, p.Binary, "--version")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("%w: %s --version: %v", ErrVersionIncompatible, p.Binary, err)
	}

	version := strings.TrimSpace(string(out))
	if version == "" {
		return "", fmt.Errorf("%w: %s --version returned empty output", ErrVersionIncompatible, p.Binary)
	}
	return version, nil
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

	if p.OnChunk == nil {
		// Non-streaming path — backward-compatible behaviour.
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

	// Streaming path — OnChunk is set.
	return p.generateStreaming(ctx, prompt, args, timeout)
}

// generateStreaming runs the claude CLI with --output-format stream-json,
// calls p.OnChunk for every non-empty text chunk, and returns the final
// text from the type=result event.
func (p *ClaudeProvider) generateStreaming(ctx context.Context, prompt string, baseArgs []string, timeout time.Duration) (string, error) {
	// Build args: prepend --verbose --output-format stream-json unless already present.
	streamArgs := make([]string, 0, len(baseArgs)+3)
	hasStreamFlag := false
	hasVerbose := false
	for i, a := range baseArgs {
		if a == "--output-format" && i+1 < len(baseArgs) && baseArgs[i+1] == "stream-json" {
			hasStreamFlag = true
		}
		if a == "--verbose" {
			hasVerbose = true
		}
	}
	if !hasStreamFlag {
		streamArgs = append(streamArgs, "--output-format", "stream-json")
	}
	if !hasVerbose {
		streamArgs = append(streamArgs, "--verbose")
	}
	streamArgs = append(streamArgs, baseArgs...)

	cmd := exec.CommandContext(ctx, p.Binary, streamArgs...)
	cmd.Stdin = strings.NewReader(prompt)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("%w: stdout pipe: %v", ErrGenerationFailed, err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("%w: stderr pipe: %v", ErrGenerationFailed, err)
	}

	if p.logger != nil {
		p.logger.Debug("invoking claude (streaming)",
			"binary", p.Binary,
			"args", streamArgs,
			"prompt_bytes", len(prompt),
			"timeout", timeout,
		)
	}

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("%w: cmd start: %v", ErrGenerationFailed, err)
	}

	// Drain stderr in a goroutine so it never blocks the stdout scanner.
	var stderrBuf bytes.Buffer
	stderrDone := make(chan struct{})
	go func() {
		_, _ = io.Copy(&stderrBuf, stderr)
		close(stderrDone)
	}()

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 1<<20), 1<<20)

	var finalText string
	for scanner.Scan() {
		line := scanner.Bytes()
		var ev streamEvent
		if err := json.Unmarshal(line, &ev); err != nil {
			if p.logger != nil {
				p.logger.Debug("stream-json: skip malformed line", "len", len(line))
			}
			continue
		}
		switch ev.Type {
		case "assistant":
			for _, c := range ev.Message.Content {
				if c.Text != "" {
					p.OnChunk(c.Text)
				}
			}
		case "result":
			finalText = ev.Result
		}
	}

	<-stderrDone
	waitErr := cmd.Wait()

	if ctx.Err() != nil {
		return "", fmt.Errorf("%w: claude timed out after %s", ErrGenerationFailed, timeout)
	}
	if waitErr != nil {
		var exitErr *exec.ExitError
		if errors.As(waitErr, &exitErr) {
			return "", fmt.Errorf("%w: claude exit %d: %s",
				ErrGenerationFailed, exitErr.ExitCode(), strings.TrimSpace(stderrBuf.String()))
		}
		return "", fmt.Errorf("%w: %v", ErrGenerationFailed, waitErr)
	}
	if finalText == "" {
		return "", fmt.Errorf("%w: claude stream ended without result event", ErrGenerationFailed)
	}
	return finalText, nil
}
