// UI-019 — End-to-end tests for the RestructureStart binding
// goroutine. Drives the full path: Wails event recording, prompt
// composition, OnChunk-or-fallback streaming, parser of <info-missing>,
// fallback heuristic on empty sections, error propagation, cancel.
//
// These tests use a MockProvider to bypass the actual `claude`
// subprocess (the code path under tests is the same in mock builds
// and in production builds; only the provider implementation
// differs). The captureEmits helper from app_test.go is replaced
// by recordEmits which collects every event into a slice the test
// can assert on.

package uiapp

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
)

// recordedEvent captures one Wails event emission for later assertion.
type recordedEvent struct {
	name    string
	payload []any
}

// recordEmits replaces emitEvent with a recorder that appends every
// emitted event to a thread-safe buffer. Returns a getter that copies
// the current buffer and restores the previous emitter at test end.
func recordEmits(t *testing.T) func() []recordedEvent {
	t.Helper()
	var mu sync.Mutex
	events := []recordedEvent{}
	prev := setEmitEvent(func(_ context.Context, name string, payload ...any) {
		mu.Lock()
		defer mu.Unlock()
		events = append(events, recordedEvent{name: name, payload: payload})
	})
	t.Cleanup(func() { setEmitEvent(prev) })
	return func() []recordedEvent {
		mu.Lock()
		defer mu.Unlock()
		out := make([]recordedEvent, len(events))
		copy(out, events)
		return out
	}
}

// newRestructureTestApp builds an App ready for RestructureStart with
// a MockProvider returning the given response. ctx is set to background
// so the binding doesn't depend on OnStartup.
func newRestructureTestApp(_ *testing.T, response string, genErr error) *App {
	mp := &provider.MockProvider{
		NameVal:  "mock",
		Response: response,
		Err:      genErr,
	}
	return &App{
		ctx:      context.Background(),
		provider: mp,
		sectionDefs: promptbuilder.SectionDefinitions{
			"bg": "Background section",
			"si": "Scope In section",
		},
	}
}

// waitForSessionEnd blocks until the goroutine spawned by
// RestructureStart removes its entry from restructureSessions, or
// the timeout elapses (test failure).
func waitForSessionEnd(t *testing.T, a *App, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if !a.hasActiveRestructure() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("RestructureStart goroutine did not terminate within %s", timeout)
}

// findEvent returns the first event with the given name, or nil.
func findEvent(events []recordedEvent, name string) *recordedEvent {
	for i := range events {
		if events[i].name == name {
			return &events[i]
		}
	}
	return nil
}

// payloadMap unwraps the conventional `payload[0]` map[string]any our
// emitters use, with a t.Fatal escape if the shape is unexpected.
func payloadMap(t *testing.T, e *recordedEvent) map[string]any {
	t.Helper()
	if len(e.payload) == 0 {
		t.Fatalf("event %s has no payload", e.name)
	}
	m, ok := e.payload[0].(map[string]any)
	if !ok {
		t.Fatalf("event %s payload[0] is not map[string]any: %T", e.name, e.payload[0])
	}
	return m
}

// ─── Happy path: chunk → done ─────────────────────────────────────

func TestRestructureStartE2E_HappyPath(t *testing.T) {
	const restructured = "## Background\n\nLe contexte de la story.\n\n## Scope In\n\n- Item un\n"
	a := newRestructureTestApp(t, restructured, nil)
	getEvents := recordEmits(t)

	sid, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# Original badly structured content",
		TemplateName: "story",
	})
	if err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}
	if sid == "" {
		t.Fatalf("expected non-empty sessionID")
	}
	waitForSessionEnd(t, a, 2*time.Second)

	events := getEvents()
	chunk := findEvent(events, "spdd:restructure:chunk")
	done := findEvent(events, "spdd:restructure:done")
	missing := findEvent(events, "spdd:restructure:missing-info")
	errEv := findEvent(events, "spdd:restructure:error")

	if chunk == nil {
		t.Errorf("expected chunk event, got %d events", len(events))
	}
	if done == nil {
		t.Errorf("expected done event, got %d events", len(events))
	}
	if missing != nil {
		t.Errorf("did not expect missing-info on happy path")
	}
	if errEv != nil {
		t.Errorf("did not expect error event on happy path")
	}
	if done != nil {
		m := payloadMap(t, done)
		if got, _ := m["fullText"].(string); got != restructured {
			t.Errorf("done.fullText = %q, want %q", got, restructured)
		}
		if got, _ := m["sessionID"].(string); got != sid {
			t.Errorf("done.sessionID = %q, want %q", got, sid)
		}
	}
}

// ─── Marker path: <info-missing> in the response ──────────────────

func TestRestructureStartE2E_ExplicitMissingMarker(t *testing.T) {
	resp := "<info-missing>\nQuel est le scope-in attendu ?\nQuelle valeur métier vises-tu ?\n</info-missing>"
	a := newRestructureTestApp(t, resp, nil)
	getEvents := recordEmits(t)

	if _, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# Mince",
		TemplateName: "story",
	}); err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}
	waitForSessionEnd(t, a, 2*time.Second)

	events := getEvents()
	miss := findEvent(events, "spdd:restructure:missing-info")
	done := findEvent(events, "spdd:restructure:done")

	if miss == nil {
		t.Fatalf("expected missing-info event")
	}
	if done != nil {
		t.Errorf("did not expect done event when marker is present")
	}
	m := payloadMap(t, miss)
	qs, _ := m["questions"].([]string)
	if len(qs) != 2 {
		t.Errorf("expected 2 questions, got %d: %v", len(qs), qs)
	}
}

// ─── Fallback heuristic: response has too many empty sections ────

func TestRestructureStartE2E_FallbackHeuristicTriggers(t *testing.T) {
	// Response contains the "## Background" heading but the section
	// body is empty, the other 3 expected sections are absent. The
	// heuristic should treat ratio >50% missing as missing-info.
	resp := "## Background\n\n## Notes\n\nThis is unrelated content.\n"
	a := newRestructureTestApp(t, resp, nil)
	getEvents := recordEmits(t)

	if _, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# Sparse content",
		TemplateName: "story",
		Divergence: DivergenceSnapshot{
			MissingRequired: []string{
				"## Background",
				"## Business Value",
				"## Scope In",
				"## Acceptance Criteria",
			},
		},
	}); err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}
	waitForSessionEnd(t, a, 2*time.Second)

	events := getEvents()
	miss := findEvent(events, "spdd:restructure:missing-info")
	done := findEvent(events, "spdd:restructure:done")
	if miss == nil {
		t.Fatalf("expected missing-info via heuristic, got events=%v", events)
	}
	if done != nil {
		t.Errorf("did not expect done when heuristic triggers")
	}
	m := payloadMap(t, miss)
	qs, _ := m["questions"].([]string)
	if len(qs) != 1 {
		t.Errorf("expected 1 generic question, got %d", len(qs))
	}
	if !strings.Contains(qs[0], "périmètre") {
		t.Errorf("generic question missing 'périmètre' keyword: %q", qs[0])
	}
}

// ─── Error path: provider returns an error ───────────────────────

func TestRestructureStartE2E_GenerateError(t *testing.T) {
	a := newRestructureTestApp(t, "", errors.New("rate limit"))
	getEvents := recordEmits(t)

	if _, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# X",
		TemplateName: "story",
	}); err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}
	waitForSessionEnd(t, a, 2*time.Second)

	events := getEvents()
	errEv := findEvent(events, "spdd:restructure:error")
	if errEv == nil {
		t.Fatalf("expected error event, got %d events", len(events))
	}
	m := payloadMap(t, errEv)
	if msg, _ := m["message"].(string); msg == "" {
		t.Errorf("error.message should be non-empty")
	}
}

// ─── Cancel path: sessionID terminated before goroutine completes ─

func TestRestructureStartE2E_CancelMidStream(t *testing.T) {
	// MockProvider with BlockUntil channel — generate blocks until
	// we cancel.
	block := make(chan struct{})
	mp := &provider.MockProvider{
		NameVal:    "mock",
		Response:   "## Background\n\ntoo late",
		BlockUntil: block,
	}
	a := &App{
		ctx:      context.Background(),
		provider: mp,
		sectionDefs: promptbuilder.SectionDefinitions{
			"bg": "Background",
		},
	}
	getEvents := recordEmits(t)

	sid, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# X",
		TemplateName: "story",
	})
	if err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}

	// Cancel before unblocking. The MockProvider observes ctx.Done()
	// and returns ctx.Err().
	if err := a.RestructureCancel(sid); err != nil {
		t.Fatalf("RestructureCancel: %v", err)
	}
	close(block) // safety: release any goroutine that didn't see the cancel.
	waitForSessionEnd(t, a, 2*time.Second)

	events := getEvents()
	if findEvent(events, "spdd:restructure:done") != nil {
		t.Errorf("done event must not fire after cancel")
	}
	if findEvent(events, "spdd:restructure:missing-info") != nil {
		t.Errorf("missing-info event must not fire after cancel")
	}
	// An error event MAY fire (context.Canceled propagated through
	// friendlySuggestError) — we accept either silent end or error,
	// but never a successful completion.
}

// ─── Single-flight: ErrSessionInProgress on concurrent start ─────

func TestRestructureStartE2E_RejectsSecondConcurrentStart(t *testing.T) {
	block := make(chan struct{})
	defer close(block)
	mp := &provider.MockProvider{
		NameVal:    "mock",
		Response:   "## ok",
		BlockUntil: block,
	}
	a := &App{
		ctx:      context.Background(),
		provider: mp,
		sectionDefs: promptbuilder.SectionDefinitions{
			"bg": "Background",
		},
	}
	recordEmits(t)

	sid1, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "# X",
		TemplateName: "story",
	})
	if err != nil {
		t.Fatalf("first RestructureStart: %v", err)
	}
	if sid1 == "" {
		t.Fatalf("expected sessionID")
	}

	_, err = a.RestructureStart(RestructureRequest{
		FullMarkdown: "# Y",
		TemplateName: "story",
	})
	if err != ErrSessionInProgress {
		t.Errorf("second start should return ErrSessionInProgress, got %v", err)
	}
}

// ─── Front-matter: never sent to the LLM ──────────────────────────

func TestRestructureStartE2E_FrontMatterStrippedFromPrompt(t *testing.T) {
	// MockProvider records its received prompt — assert it does NOT
	// contain the front-matter keys (id, title, status...).
	mp := &provider.MockProvider{
		NameVal:  "mock",
		Response: "## Background\n\nstub",
	}
	a := &App{
		ctx:      context.Background(),
		provider: mp,
		sectionDefs: promptbuilder.SectionDefinitions{
			"bg": "Background",
		},
	}
	recordEmits(t)

	if _, err := a.RestructureStart(RestructureRequest{
		FullMarkdown: "---\nid: STORY-001\ntitle: Secret Title\nstatus: draft\n---\n## Body\n\nVisible content.\n",
		TemplateName: "story",
	}); err != nil {
		t.Fatalf("RestructureStart: %v", err)
	}
	waitForSessionEnd(t, a, 2*time.Second)

	if len(mp.Calls) != 1 {
		t.Fatalf("expected exactly one MockProvider.Generate call, got %d", len(mp.Calls))
	}
	prompt := mp.Calls[0]
	if strings.Contains(prompt, "Secret Title") {
		t.Errorf("prompt leaked front-matter (title): %q", prompt)
	}
	if strings.Contains(prompt, "STORY-001") {
		t.Errorf("prompt leaked front-matter (id): %q", prompt)
	}
	if !strings.Contains(prompt, "Visible content.") {
		t.Errorf("prompt missing the body content")
	}
}
