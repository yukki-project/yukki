package uiapp

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// emitEventFunc est le type de la fonction d'émission Wails.
type emitEventFunc = func(ctx context.Context, name string, payload ...any)

// emitEventStore protège l'indirection over runtime.EventsEmit derrière
// un atomic.Pointer pour éviter la race detector quand `captureEmits`
// (test helper) réassigne la fonction pendant qu'une goroutine en cours
// (ex. SpddSuggestStart) la lit.
var emitEventStore atomic.Pointer[emitEventFunc]

func init() {
	fn := emitEventFunc(runtime.EventsEmit)
	emitEventStore.Store(&fn)
}

// emitEvent appelle la fonction d'émission courante (production : Wails ;
// tests : no-op via captureEmits). L'accès au pointeur est atomique —
// multiples readers + writer cohabitent sans race.
func emitEvent(ctx context.Context, name string, payload ...any) {
	if p := emitEventStore.Load(); p != nil {
		(*p)(ctx, name, payload...)
	}
}

// setEmitEvent installe une nouvelle fonction d'émission et retourne la
// précédente. Utilisé exclusivement par les helpers de test (captureEmits).
func setEmitEvent(fn emitEventFunc) emitEventFunc {
	prev := emitEventStore.Swap(&fn)
	if prev == nil {
		return nil
	}
	return *prev
}

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
