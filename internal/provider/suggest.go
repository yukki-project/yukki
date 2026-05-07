// Package provider — O1 of the CORE-008 canvas: suggestion types and ChunkMockProvider.
package provider

import "context"

// SuggestionRequest is the input to App.SpddSuggestStart.
// It is serialised from JSON by the Wails runtime.
type SuggestionRequest struct {
	// Section is the SPDD section key ("bg"|"bv"|"si"|"so"|"ac"|"oq"|"notes").
	Section string `json:"section"`
	// Action is the requested transformation ("improve"|"enrich"|"rephrase"|"shorten").
	Action string `json:"action"`
	// SelectedText is the text to transform. Must be non-empty.
	SelectedText string `json:"selectedText"`
	// PreviousSuggestion, when non-empty, instructs the LLM to generate a
	// variant different from this previous output.
	PreviousSuggestion string `json:"previousSuggestion,omitempty"`
}

// Suggestion is the result of a completed suggestion session.
// It is used for structured logging only — never serialised to the front.
type Suggestion struct {
	SessionID  string
	FullText   string
	DurationMs int64
	Section    string
	Action     string
}

// ChunkMockProvider is a test double for streaming-capable bindings.
// It calls onChunk for each element of Chunks, then returns Err.
// It respects context cancellation between chunks.
type ChunkMockProvider struct {
	Chunks []string
	Err    error
}

// GenerateWithChunk calls onChunk for each element of Chunks and returns
// the concatenated text plus Err. It returns early if ctx is cancelled.
func (m *ChunkMockProvider) GenerateWithChunk(ctx context.Context, _ string, onChunk func(string)) (string, error) {
	var full string
	for _, chunk := range m.Chunks {
		select {
		case <-ctx.Done():
			return full, ctx.Err()
		default:
		}
		onChunk(chunk)
		full += chunk
	}
	return full, m.Err
}
