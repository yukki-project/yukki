package uiapp

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
)

// newAppForSuggest creates an App with a ClaudeProvider configured for testing.
// The ClaudeProvider binary is set to a non-existent path — tests that need
// actual streaming use ChunkMockProvider via SpddSuggestStart's goroutine.
// For unit-level tests we override the provider field directly after construction.
func newAppForSuggest(t *testing.T) *App {
	t.Helper()
	app := NewApp(&provider.MockProvider{}, newTestLogger())
	app.OnStartup(context.Background())
	// Load fallback section defs (no project open).
	defs, _ := promptbuilder.LoadSectionDefs("")
	app.sectionDefs = defs
	return app
}

func TestApp_SpddSuggestStart_EmptySelectedText_ReturnsError(t *testing.T) {
	app := newAppForSuggest(t)
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "improve",
		SelectedText: "",
	}
	_, err := app.SpddSuggestStart(req)
	if err == nil {
		t.Error("expected error for empty selectedText, got nil")
	}
}

func TestApp_SpddSuggestStart_UnknownAction_ReturnsError(t *testing.T) {
	app := newAppForSuggest(t)
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "dance",
		SelectedText: "some text",
	}
	_, err := app.SpddSuggestStart(req)
	if err == nil {
		t.Error("expected error for unknown action, got nil")
	}
}

func TestApp_SpddSuggestStart_NonStreamingProvider_ReturnsError(t *testing.T) {
	// MockProvider is not a *ClaudeProvider — streaming is unsupported.
	app := newAppForSuggest(t)
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "improve",
		SelectedText: "some text",
	}
	_, err := app.SpddSuggestStart(req)
	if err == nil {
		t.Error("expected error because MockProvider does not support streaming")
	}
}

// streamingTestApp creates an App backed by a real *provider.ClaudeProvider
// (with a fake binary path) so SpddSuggestStart accepts it as a ClaudeProvider.
// The goroutine will fail immediately because the binary does not exist —
// that triggers the error path, which is what we want to observe.
func streamingTestApp(t *testing.T) *App {
	t.Helper()
	cp := provider.NewClaude(newTestLogger())
	cp.Binary = "nonexistent-claude-binary-for-test"
	app := NewApp(cp, newTestLogger())
	app.OnStartup(context.Background())
	defs, _ := promptbuilder.LoadSectionDefs("")
	app.sectionDefs = defs
	return app
}

func TestApp_SpddSuggestStart_ReturnsSessionID(t *testing.T) {
	app := streamingTestApp(t)
	captureEmits(t)
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "improve",
		SelectedText: "some text to improve",
	}
	sessionID, err := app.SpddSuggestStart(req)
	if err != nil {
		t.Fatalf("SpddSuggestStart: %v", err)
	}
	if !strings.HasPrefix(sessionID, "spdd-") {
		t.Errorf("sessionID should start with 'spdd-', got %q", sessionID)
	}

	// Drain the goroutine before t.Cleanup restores emitEvent — sinon la
	// goroutine peut lire la variable de package `emitEvent` après que le
	// cleanup l'ait réassignée → race detector trip.
	_ = app.SpddSuggestCancel(sessionID)
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if _, ok := app.sessions.Load(sessionID); !ok {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Errorf("session %s did not clean up within deadline", sessionID)
}

func TestApp_SpddSuggestCancel_UnknownSession_ReturnsError(t *testing.T) {
	app := newAppForSuggest(t)
	err := app.SpddSuggestCancel("nonexistent-session")
	if err == nil {
		t.Error("expected error for unknown session, got nil")
	}
}

func TestApp_SpddSuggestPreview_ReturnsPrompt(t *testing.T) {
	app := newAppForSuggest(t)
	req := provider.SuggestionRequest{
		Section:      "bg",
		Action:       "improve",
		SelectedText: "test text",
	}
	prompt, err := app.SpddSuggestPreview(req)
	if err != nil {
		t.Fatalf("SpddSuggestPreview: %v", err)
	}
	if !strings.Contains(prompt, "Tu es un rédacteur SPDD") {
		t.Errorf("prompt should contain SPDD preamble\n\nGot:\n%s", prompt)
	}
}

func TestApp_OnShutdown_CancelsActiveSessions(t *testing.T) {
	app := streamingTestApp(t)
	captureEmits(t)

	// Manually insert a fake session with a cancel func we can observe.
	cancelled := false
	var mu sync.Mutex
	cancel := func() {
		mu.Lock()
		cancelled = true
		mu.Unlock()
	}
	app.sessions.Store("test-session", &suggestSession{
		cancel:    cancel,
		startedAt: time.Now(),
	})

	app.OnShutdown(context.Background())

	mu.Lock()
	defer mu.Unlock()
	if !cancelled {
		t.Error("expected session to be cancelled on OnShutdown")
	}
}
