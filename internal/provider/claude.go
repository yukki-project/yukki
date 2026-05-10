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
//
// Content blocks come in two flavours we care about: `type:"text"` (the
// final answer chunk) and `type:"thinking"` (the chain-of-thought,
// emitted when extended thinking is on — `--effort high|xhigh|max`).
// We dispatch them to OnChunk vs OnThinking respectively.
type streamEvent struct {
	Type    string `json:"type"`
	Message struct {
		Content []struct {
			Type     string `json:"type"`
			Text     string `json:"text"`
			Thinking string `json:"thinking"`
		} `json:"content"`
	} `json:"message"`
	// Delta accommodates `content_block_delta` events emitted at the
	// top level (rare — early CLI versions, defensive parsing).
	Delta streamDelta `json:"delta"`
	// Event accommodates the `stream_event` envelope used by claude
	// CLI 2.x with --include-partial-messages : each per-token
	// fragment arrives as `{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"x"}}}`.
	Event   streamInnerEvent `json:"event"`
	Result  string           `json:"result"`
	Subtype string           `json:"subtype"`
}

type streamDelta struct {
	Type     string `json:"type"`
	Text     string `json:"text"`
	Thinking string `json:"thinking"`
}

type streamInnerEvent struct {
	Type  string      `json:"type"`
	Delta streamDelta `json:"delta"`
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

	// OnThinking, when non-nil and the CLI emits `thinking` content
	// blocks (extended thinking mode), receives the chain-of-thought
	// text. Independent of OnChunk — both can be set and will fire
	// for their respective content types.
	OnThinking ChunkFunc

	// SystemPrompt, when non-empty, is passed via `--system-prompt`
	// so claude treats it as system role (priority + cache-friendly)
	// instead of mixing it into the user message. Recommended for
	// stable rules / personas.
	SystemPrompt string

	// Bare enables `--bare` mode : skip CLAUDE.md auto-discovery,
	// hooks, MCP, plugins. Recommended for prompt-driven flows
	// (UI-019 RestructureStart) where we want a clean stateless
	// invocation without yukki's own CLAUDE.md leaking into context.
	//
	// WARNING: --bare disables OAuth and keychain auth. Only use
	// when ANTHROPIC_API_KEY is set in env or when apiKeyHelper is
	// configured via --settings. Otherwise auth fails.
	Bare bool

	// Effort sets `--effort <level>` (low|medium|high|xhigh|max).
	// Higher values enable extended thinking (Claude 4) where the
	// model emits chain-of-thought blocks before the final answer.
	// "high" is a sensible default for restructuration tasks.
	// Empty = use the CLI default (no extended thinking).
	Effort string
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
	hideConsole(cmd)
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
	hideConsole(cmd)
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

	finalArgs := append([]string{}, args...)
	if p.SystemPrompt != "" {
		finalArgs = append(finalArgs, "--system-prompt", p.SystemPrompt)
	}
	if p.Bare {
		finalArgs = append(finalArgs, "--bare")
	}
	if p.Effort != "" {
		finalArgs = append(finalArgs, "--effort", p.Effort)
	}
	cmd := exec.CommandContext(ctx, p.Binary, finalArgs...)
	hideConsole(cmd)
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
	// Build args: prepend --verbose --output-format stream-json
	// --include-partial-messages unless already present.
	// --include-partial-messages = chunks de message partiels en
	// streaming (caractère-par-caractère plutôt qu'en blocs entiers).
	streamArgs := make([]string, 0, len(baseArgs)+4)
	hasStreamFlag := false
	hasVerbose := false
	hasPartial := false
	for i, a := range baseArgs {
		if a == "--output-format" && i+1 < len(baseArgs) && baseArgs[i+1] == "stream-json" {
			hasStreamFlag = true
		}
		if a == "--verbose" {
			hasVerbose = true
		}
		if a == "--include-partial-messages" {
			hasPartial = true
		}
	}
	if !hasStreamFlag {
		streamArgs = append(streamArgs, "--output-format", "stream-json")
	}
	if !hasVerbose {
		streamArgs = append(streamArgs, "--verbose")
	}
	if !hasPartial {
		streamArgs = append(streamArgs, "--include-partial-messages")
	}
	if p.SystemPrompt != "" {
		streamArgs = append(streamArgs, "--system-prompt", p.SystemPrompt)
	}
	if p.Bare {
		streamArgs = append(streamArgs, "--bare")
	}
	if p.Effort != "" {
		streamArgs = append(streamArgs, "--effort", p.Effort)
	}
	streamArgs = append(streamArgs, baseArgs...)

	cmd := exec.CommandContext(ctx, p.Binary, streamArgs...)
	hideConsole(cmd)
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
	// sawDelta tracks whether at least one delta chunk has been
	// emitted via the stream_event path. When true, we skip the
	// final `assistant` event's content (otherwise we'd emit the
	// whole answer twice — once per delta, once at the end).
	var sawDelta bool
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
			// Émis en fin de message ; sans --include-partial-messages
			// le content arrive ici en une seule fois. Avec
			// --include-partial-messages, le content est dispo via
			// `stream_event > content_block_delta` au fur et à mesure
			// — on doit déduper en n'émettant pas une seconde fois
			// dans `assistant`. La détection : si on a déjà reçu des
			// chunks (compteur local), on skip.
			if !sawDelta {
				for _, c := range ev.Message.Content {
					switch c.Type {
					case "thinking":
						if c.Thinking != "" && p.OnThinking != nil {
							p.OnThinking(c.Thinking)
						}
					default:
						// "text" or empty (legacy) → final answer chunk.
						if c.Text != "" {
							p.OnChunk(c.Text)
						}
					}
				}
			}
		case "stream_event":
			// Enveloppe utilisée par claude CLI 2.x avec
			// --include-partial-messages : chaque event raw de
			// l'API Anthropic est wrappé. Le seul payload qui nous
			// intéresse pour le streaming texte est
			// `event.type == "content_block_delta"` avec `delta.type
			// == "text_delta"`.
			inner := ev.Event
			if inner.Type == "content_block_delta" {
				switch inner.Delta.Type {
				case "thinking_delta":
					if inner.Delta.Thinking != "" && p.OnThinking != nil {
						p.OnThinking(inner.Delta.Thinking)
						sawDelta = true
					}
				case "text_delta":
					if inner.Delta.Text != "" {
						p.OnChunk(inner.Delta.Text)
						sawDelta = true
					}
				}
			}
		case "content_block_delta":
			// Format flat (rare — défense en profondeur si une
			// future version du CLI émet sans wrapper).
			switch ev.Delta.Type {
			case "thinking_delta":
				if ev.Delta.Thinking != "" && p.OnThinking != nil {
					p.OnThinking(ev.Delta.Thinking)
					sawDelta = true
				}
			case "text_delta":
				if ev.Delta.Text != "" {
					p.OnChunk(ev.Delta.Text)
					sawDelta = true
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
