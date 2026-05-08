// Package uiapp — O5 of the CORE-008 canvas: SPDD suggestion streaming bindings.
//
// SpddSuggestStart launches a streaming goroutine backed by ClaudeProvider.
// SpddSuggestCancel cancels an active session by sessionID.
// SpddSuggestPreview returns the built prompt without launching a generation.
package uiapp

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
)

// suggestSession tracks an active streaming suggestion goroutine.
type suggestSession struct {
	cancel    context.CancelFunc
	startedAt time.Time
}

// SpddSuggestStart launches a streaming suggestion goroutine and returns a
// sessionID that can be used to cancel it via SpddSuggestCancel.
//
// Returns an error immediately if:
//   - req.SelectedText is empty
//   - req.Action is unrecognised
//   - App.provider is not a *provider.ClaudeProvider (streaming unsupported)
//
// The goroutine emits Wails events:
//   - "spdd:suggest:chunk" → {sessionID, text}
//   - "spdd:suggest:done"  → {sessionID, fullText, durationMs}
//   - "spdd:suggest:error" → {sessionID, message, technical}
func (a *App) SpddSuggestStart(req provider.SuggestionRequest) (string, error) {
	if strings.TrimSpace(req.SelectedText) == "" {
		return "", errors.New("selectedText must not be empty")
	}
	if _, ok := promptbuilder.ActionCriteria[req.Action]; !ok {
		return "", fmt.Errorf("unknown action %q", req.Action)
	}

	prompt, err := promptbuilder.Build(req, a.sectionDefs)
	if err != nil {
		return "", fmt.Errorf("build prompt: %w", err)
	}

	// Clone the provider with OnChunk injected — never mutate the shared provider.
	cp, ok := a.provider.(*provider.ClaudeProvider)
	if !ok {
		return "", errors.New("provider does not support streaming")
	}

	sessionID := fmt.Sprintf("spdd-%d", time.Now().UnixNano())
	ctx, cancel := context.WithCancel(a.ctx)
	a.sessions.Store(sessionID, &suggestSession{cancel: cancel, startedAt: time.Now()})

	// Clone and inject OnChunk — the clone is local to this goroutine.
	clone := *cp
	start := time.Now()
	var full strings.Builder
	clone.OnChunk = func(text string) {
		full.WriteString(text)
		emitEvent(a.ctx, "spdd:suggest:chunk", map[string]any{
			"sessionID": sessionID,
			"text":      text,
		})
	}

	go func() {
		defer a.sessions.Delete(sessionID)
		defer cancel()

		_, genErr := clone.Generate(ctx, prompt)
		durationMs := time.Since(start).Milliseconds()

		if genErr != nil {
			userMsg, technical := friendlySuggestError(genErr)
			emitEvent(a.ctx, "spdd:suggest:error", map[string]any{
				"sessionID": sessionID,
				"message":   userMsg,
				"technical": technical,
			})
			if a.logger != nil {
				a.logger.Warn("suggest error",
					"sessionID", sessionID,
					"section", req.Section,
					"action", req.Action,
					"durationMs", durationMs,
					"err", technical,
				)
			}
			return
		}

		if a.logger != nil {
			a.logger.Info("suggest done",
				"sessionID", sessionID,
				"section", req.Section,
				"action", req.Action,
				"durationMs", durationMs,
			)
		}
		emitEvent(a.ctx, "spdd:suggest:done", map[string]any{
			"sessionID":  sessionID,
			"fullText":   full.String(),
			"durationMs": durationMs,
		})
	}()

	return sessionID, nil
}

// SpddSuggestCancel cancels the active streaming session identified by sessionID.
// Returns an error if the sessionID is not found.
func (a *App) SpddSuggestCancel(sessionID string) error {
	v, ok := a.sessions.Load(sessionID)
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	if s, ok := v.(*suggestSession); ok {
		s.cancel()
	}
	return nil
}

// SpddSuggestPreview returns the prompt that would be sent for req,
// without launching a generation. Useful for the "Voir le prompt" popover.
func (a *App) SpddSuggestPreview(req provider.SuggestionRequest) (string, error) {
	return promptbuilder.Build(req, a.sectionDefs)
}

// friendlySuggestError translates an error into a user-facing French message
// and a technical string for logging. Never includes the selected text.
func friendlySuggestError(err error) (userMsg, technical string) {
	technical = err.Error()
	switch {
	case errors.Is(err, context.Canceled):
		return "Suggestion annulée.", "cancelled by user"
	case errors.Is(err, provider.ErrGenerationFailed):
		return "Yuki n'a pas pu joindre le modèle. Vérifie que `claude auth status` retourne OK, puis relance la suggestion.", technical
	default:
		return "Une erreur inattendue s'est produite. Relance la suggestion.", technical
	}
}
