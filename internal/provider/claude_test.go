package provider

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// stubBinary points to a small Go binary built once in TestMain that imitates
// the subset of the claude CLI we rely on. Empty when the build fails (no Go
// toolchain in PATH); tests that need it skip in that case.
var stubBinary string

const stubMainSource = `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"time"
)

const cannedStory = ` + "`" + `---
id: STORY-001
slug: stub-story
title: Stub Story
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Stub Story

Body produced by the stub binary used in tests.
` + "`" + `

func main() {
	if len(os.Args) < 2 {
		os.Exit(0)
	}
	switch os.Args[1] {
	case "--version":
		fmt.Println("stub 0.0.1")
	case "--print":
		_, _ = io.Copy(io.Discard, os.Stdin)
		fmt.Print(cannedStory)
	case "--output-format":
		if len(os.Args) > 2 && os.Args[2] == "stream-json" {
			_, _ = io.Copy(io.Discard, os.Stdin)
			// Emit well-formed stream-json events.
			chunks := []string{"# Stub Story\n\n", "Body produced by the stub", " binary used in tests.\n"}
			for _, c := range chunks {
				b, _ := json.Marshal(map[string]any{
					"type": "assistant",
					"message": map[string]any{
						"content": []map[string]any{{"type": "text", "text": c}},
					},
				})
				fmt.Println(string(b))
			}
			// Emit empty-text chunk — must NOT be forwarded by ClaudeProvider.
			b, _ := json.Marshal(map[string]any{
				"type": "assistant",
				"message": map[string]any{
					"content": []map[string]any{{"type": "text", "text": ""}},
				},
			})
			fmt.Println(string(b))
			// Emit result event with the canonical final text.
			rb, _ := json.Marshal(map[string]any{
				"type":    "result",
				"subtype": "success",
				"result":  cannedStory,
			})
			fmt.Println(string(rb))
		} else {
			fmt.Fprintln(os.Stderr, "unknown --output-format value: "+strings.Join(os.Args[2:], " "))
			os.Exit(2)
		}
	case "--fail":
		fmt.Fprintln(os.Stderr, "stub failure on purpose")
		os.Exit(1)
	case "--hang":
		ms := os.Getenv("TEST_HANG_MS")
		d := 10 * time.Second
		if ms != "" {
			var n int
			if _, err := fmt.Sscanf(ms, "%d", &n); err == nil && n > 0 {
				d = time.Duration(n) * time.Millisecond
			}
		}
		time.Sleep(d)
	default:
		fmt.Fprintln(os.Stderr, "unknown stub arg: "+strings.Join(os.Args[1:], " "))
		os.Exit(2)
	}
}
`

func TestMain(m *testing.M) {
	tmp, err := os.MkdirTemp("", "yukki-provider-stub-*")
	if err != nil {
		fmt.Fprintln(os.Stderr, "could not create stub temp dir:", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmp)

	mainGo := filepath.Join(tmp, "main.go")
	if err := os.WriteFile(mainGo, []byte(stubMainSource), 0o644); err == nil {
		bin := filepath.Join(tmp, "yukki-stub")
		if runtime.GOOS == "windows" {
			bin += ".exe"
		}
		build := exec.Command("go", "build", "-o", bin, mainGo)
		build.Stderr = os.Stderr
		if err := build.Run(); err == nil {
			stubBinary = bin
		}
	}

	os.Exit(m.Run())
}

func TestClaudeProvider_CheckVersion_NotFound(t *testing.T) {
	p := &ClaudeProvider{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary: "definitely-not-on-path-yukki-test-zzz",
	}
	err := p.CheckVersion(context.Background())
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestClaudeProvider_NameAndDefaults(t *testing.T) {
	p := NewClaude(nil)
	if p.Name() != "claude" {
		t.Fatalf("expected name 'claude', got %q", p.Name())
	}
	if p.Binary != "claude" {
		t.Fatalf("expected default binary 'claude', got %q", p.Binary)
	}
	if len(p.Args) != 1 || p.Args[0] != "--print" {
		t.Fatalf("expected default args [\"--print\"], got %v", p.Args)
	}
	if p.Timeout != DefaultClaudeTimeout {
		t.Fatalf("expected default timeout %s, got %s", DefaultClaudeTimeout, p.Timeout)
	}
}

func TestClaudeProvider_CheckVersion_StubSucceeds(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built (no go toolchain in PATH?)")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
	}
	if err := p.CheckVersion(context.Background()); err != nil {
		t.Fatalf("CheckVersion via stub: %v", err)
	}
}

func TestClaudeProvider_Version_StubSucceeds(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
	}
	v, err := p.Version(context.Background())
	if err != nil {
		t.Fatalf("Version: %v", err)
	}
	if !strings.Contains(v, "stub") {
		t.Fatalf("expected stub version, got %q", v)
	}
}

func TestClaudeProvider_Version_NotFound(t *testing.T) {
	p := &ClaudeProvider{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary: "definitely-not-on-path-yukki-test-zzz",
	}
	_, err := p.Version(context.Background())
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestClaudeProvider_Generate_StubReturnsCannedStory(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
	}
	out, err := p.Generate(context.Background(), "any prompt")
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if !strings.Contains(out, "Stub Story") {
		t.Fatalf("expected stub canned story, got %q", out)
	}
}

func TestClaudeProvider_Generate_StubFailMappedToErrGenerationFailed(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--fail"},
		Timeout: 30 * time.Second,
	}
	_, err := p.Generate(context.Background(), "any prompt")
	if !errors.Is(err, ErrGenerationFailed) {
		t.Fatalf("expected ErrGenerationFailed, got %v", err)
	}
	if !strings.Contains(err.Error(), "stub failure on purpose") {
		t.Fatalf("expected stderr captured in error, got %q", err)
	}
}

func TestClaudeProvider_Generate_TimeoutKillsHungProcess(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--hang"},
		Timeout: 200 * time.Millisecond,
	}
	t.Setenv("TEST_HANG_MS", "5000") // 5s — far longer than the timeout

	start := time.Now()
	_, err := p.Generate(context.Background(), "any prompt")
	elapsed := time.Since(start)

	if !errors.Is(err, ErrGenerationFailed) {
		t.Fatalf("expected ErrGenerationFailed, got %v", err)
	}
	if elapsed > 2*time.Second {
		t.Fatalf("expected timeout to kill the process quickly, took %s", elapsed)
	}
}

func TestClaudeProvider_Generate_Streaming_HappyPath(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	var chunks []string
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
		OnChunk: func(text string) { chunks = append(chunks, text) },
	}
	out, err := p.Generate(context.Background(), "any prompt")
	if err != nil {
		t.Fatalf("Generate streaming: %v", err)
	}
	// Final text must come from the result event, not chunk concatenation.
	if !strings.Contains(out, "Stub Story") {
		t.Fatalf("expected canned story in result, got %q", out)
	}
	// Exactly 3 non-empty chunks (the empty-text chunk must have been dropped).
	if len(chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d: %v", len(chunks), chunks)
	}
	for _, c := range chunks {
		if c == "" {
			t.Fatal("OnChunk was called with an empty string")
		}
	}
}

func TestClaudeProvider_Generate_Streaming_EmptyChunkDropped(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	var callCount int
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
		OnChunk: func(text string) {
			if text == "" {
				t.Error("OnChunk called with empty string")
			}
			callCount++
		},
	}
	_, err := p.Generate(context.Background(), "any prompt")
	if err != nil {
		t.Fatalf("Generate streaming: %v", err)
	}
	// Stub emits 3 non-empty + 1 empty chunk; only 3 must reach OnChunk.
	if callCount != 3 {
		t.Fatalf("expected 3 OnChunk calls, got %d", callCount)
	}
}

func TestClaudeProvider_Generate_NoStreaming_Unchanged(t *testing.T) {
	if stubBinary == "" {
		t.Skip("stub binary not built")
	}
	p := &ClaudeProvider{
		logger:  slog.New(slog.NewTextHandler(os.Stderr, nil)),
		Binary:  stubBinary,
		Args:    []string{"--print"},
		Timeout: 30 * time.Second,
		// OnChunk deliberately nil — non-streaming path.
	}
	out, err := p.Generate(context.Background(), "any prompt")
	if err != nil {
		t.Fatalf("Generate non-streaming: %v", err)
	}
	if !strings.Contains(out, "Stub Story") {
		t.Fatalf("expected canned story, got %q", out)
	}
}
