package uiapp

import (
	"context"
	"log/slog"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// emitEvent is the package-level indirection over runtime.EventsEmit so
// unit tests can capture emissions without spinning up a Wails context.
// Production callers (the real `yukki ui` binary) hit the Wails runtime
// directly. Mirror of the openDirectoryDialog pattern in app.go (D-B5b).
var emitEvent = runtime.EventsEmit

// Wails event names. Stable wire contract — do not rename without
// updating the frontend listener in NewStoryModal.tsx.
const (
	eventProviderStart = "provider:start"
	eventProviderEnd   = "provider:end"
	eventProviderText  = "provider:text"
)

// ProviderStartPayload is the JSON payload of the "provider:start" event.
type ProviderStartPayload struct {
	Label string `json:"label"`
}

// ProviderEndPayload is the JSON payload of the "provider:end" event.
//
// Path is the absolute path of the produced story on success, "" otherwise.
// Error is the message of the failure, "" on success.
// DurationMs is the elapsed time between Start and End, always populated.
type ProviderEndPayload struct {
	Success    bool   `json:"success"`
	Path       string `json:"path"`
	Error      string `json:"error"`
	DurationMs int64  `json:"durationMs"`
}

// ProviderTextPayload is the JSON payload of the "provider:text" event.
type ProviderTextPayload struct {
	Chunk string `json:"chunk"`
}

// uiProgress implements workflow.Progress by emitting Wails events.
// One instance per generation. Not safe for concurrent use across
// generations (App enforces a single in-flight RunStory via
// running atomic.Bool).
type uiProgress struct {
	ctx     context.Context
	logger  *slog.Logger
	started time.Time
}

// newUiProgress allocates a fresh uiProgress and records the start time.
func newUiProgress(ctx context.Context, logger *slog.Logger) *uiProgress {
	return &uiProgress{
		ctx:     ctx,
		logger:  logger,
		started: time.Now(),
	}
}

// Start emits the "provider:start" event with a short label. Never
// includes the prompt content (Safeguard I9).
func (p *uiProgress) Start(label string) {
	emitEvent(p.ctx, eventProviderStart, ProviderStartPayload{Label: label})
	if p.logger != nil {
		p.logger.Debug("progress start", "label", label)
	}
}

// End emits the "provider:end" event with the result. path is non-empty
// on success, err is non-nil on failure. DurationMs is computed from
// the time of newUiProgress.
func (p *uiProgress) End(path string, err error) {
	durationMs := time.Since(p.started).Milliseconds()
	payload := ProviderEndPayload{
		DurationMs: durationMs,
	}
	if err == nil {
		payload.Success = true
		payload.Path = path
	} else {
		payload.Success = false
		payload.Error = err.Error()
	}
	emitEvent(p.ctx, eventProviderEnd, payload)
	if p.logger != nil {
		p.logger.Debug("progress end", "success", payload.Success, "duration_ms", durationMs)
	}
}

// Chunk emits the "provider:text" event with a partial text chunk.
// Empty chunks are silently dropped (Safeguard: never emit empty chunk).
func (p *uiProgress) Chunk(text string) {
	if text == "" {
		return
	}
	emitEvent(p.ctx, eventProviderText, ProviderTextPayload{Chunk: text})
}
