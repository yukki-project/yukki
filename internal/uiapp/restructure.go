// UI-019 O2 + O3 — bindings RestructureStart / RestructureCancel +
// helpers privés (splitFrontMatter, parser <info-missing>,
// fallback heuristique 50%).
//
// Mirror du pattern SpddSuggestStart : sessionID, goroutine, OnChunk
// callback, événements Wails. La duplication ~80 lignes est
// documentée dans la dette technique du canvas — extraction d'un
// helper streamGoroutine en suivi.

package uiapp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
)

// MaxRestructureBytes is the hard upper bound on the artefact size
// accepted by RestructureStart. Frontend disables the button before
// reaching us; this is the defense-in-depth gate (cf. canvas D2).
const MaxRestructureBytes = 30_000

// MaxRestructureTurns is the chat fallback hard limit (cf. story Q3).
const MaxRestructureTurns = 5

// MissingThresholdRatio is the fallback heuristic — when more than
// MissingThresholdRatio of the template's required sections are
// empty in the LLM response, we treat the response as if Claude
// had emitted <info-missing> (cf. canvas D3).
const MissingThresholdRatio = 0.5

// ErrSessionInProgress is returned by RestructureStart when another
// restructure session is already active on the same App.
var ErrSessionInProgress = errors.New("uiapp: a restructure session is already running")

// ErrTooManyTurns is returned when the chat history hits the hard
// limit (5 user turns).
var ErrTooManyTurns = errors.New("uiapp: restructure conversation exceeded 5 turns")

// ErrTooLarge is returned when the artefact body exceeds
// MaxRestructureBytes.
var ErrTooLarge = errors.New("uiapp: document too large for restructuration (>30 KB)")

// RestructureRequest is the IPC payload for App.RestructureStart.
// Decoupled from provider.SuggestionRequest by design (cf. canvas Q2).
type RestructureRequest struct {
	FullMarkdown string             `json:"fullMarkdown"`
	TemplateName string             `json:"templateName"`
	Divergence   DivergenceSnapshot `json:"divergence"`
	History      []RestructureTurn  `json:"history"`
}

// DivergenceSnapshot mirrors the frontend templateDivergence.ts shape.
type DivergenceSnapshot struct {
	MissingRequired []string `json:"missingRequired"`
	OrphanSections  []string `json:"orphanSections"`
}

// RestructureTurn is one Q/A exchange in the chat fallback.
type RestructureTurn struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// restructureSession tracks an active restructure goroutine.
// Mirror of suggestSession but kept separate so the maps don't
// commingle two distinct semantics.
type restructureSession struct {
	cancel    context.CancelFunc
	startedAt time.Time
}

// missingInfoRegex matches the <info-missing>...</info-missing>
// block emitted by the LLM. Tolerant to:
//   - hyphen / underscore variants (`<info-missing>` / `<info_missing>`)
//   - case insensitive
//   - whitespace around the questions
//   - DOTALL (questions span multiple lines)
var missingInfoRegex = regexp.MustCompile(`(?is)<info[-_ ]?missing>(.+?)</info[-_ ]?missing>`)

// RestructureStart launches a streaming restructuration session and
// returns a sessionID usable by RestructureCancel. Emits Wails events:
//   - "spdd:restructure:chunk"        → {sessionID, text}
//   - "spdd:restructure:done"         → {sessionID, fullText, durationMs}
//   - "spdd:restructure:missing-info" → {sessionID, questions[], rawResponse}
//   - "spdd:restructure:error"        → {sessionID, message, technical}
func (a *App) RestructureStart(req RestructureRequest) (string, error) {
	a.traceBinding("RestructureStart",
		slog.Int("bytes", len(req.FullMarkdown)),
		slog.String("template", req.TemplateName),
		slog.Int("turns", len(req.History)),
	)

	if strings.TrimSpace(req.FullMarkdown) == "" {
		return "", errors.New("FullMarkdown must not be empty")
	}
	if len(req.FullMarkdown) > MaxRestructureBytes {
		return "", ErrTooLarge
	}
	if len(req.History) > MaxRestructureTurns {
		return "", ErrTooManyTurns
	}
	if a.hasActiveRestructure() {
		return "", ErrSessionInProgress
	}

	// Front-matter extraction (cf. invariant I6) — the LLM never
	// sees the YAML block. The split helper returns ("", body)
	// when the artefact has no front-matter.
	_, body := splitFrontMatter(req.FullMarkdown)

	prompt, err := promptbuilder.BuildRestructure(promptbuilder.RestructurePromptInput{
		FullMarkdown: body,
		TemplateName: req.TemplateName,
		Divergence: promptbuilder.DivergencePromptShape{
			MissingRequired: req.Divergence.MissingRequired,
			OrphanSections:  req.Divergence.OrphanSections,
		},
		History: convertHistoryToPrompt(req.History),
	}, a.sectionDefs)
	if err != nil {
		return "", fmt.Errorf("build prompt: %w", err)
	}

	sessionID := fmt.Sprintf("restruct-%d", time.Now().UnixNano())
	ctx, cancel := context.WithCancel(a.ctx)
	a.restructureSessions.Store(sessionID, &restructureSession{
		cancel:    cancel,
		startedAt: time.Now(),
	})

	start := time.Now()
	var full strings.Builder

	// Streaming path : ClaudeProvider expose OnChunk pour pousser les
	// chunks au fur et à mesure. Pour les providers non-streaming
	// (MockProvider en build dev), on tombe sur Generate() classique
	// puis on émet la réponse comme un unique gros chunk avant le
	// done — l'UX du drawer voit la même séquence d'events.
	cp, isClaude := a.provider.(*provider.ClaudeProvider)
	var generate func(ctx context.Context, prompt string) (string, error)
	if isClaude {
		clone := *cp
		clone.OnChunk = func(text string) {
			full.WriteString(text)
			emitEvent(a.ctx, "spdd:restructure:chunk", map[string]any{
				"sessionID": sessionID,
				"text":      text,
			})
		}
		generate = clone.Generate
	} else {
		// Non-streaming fallback (mock dev). On signale à l'UI
		// qu'on est sur un fast-path en émettant un chunk après la
		// réponse complète plutôt qu'au fil de l'eau.
		generate = a.provider.Generate
	}

	go func() {
		defer a.restructureSessions.Delete(sessionID)
		defer cancel()

		nonStreamResponse, genErr := generate(ctx, prompt)
		// Streaming path écrit dans full via OnChunk ; non-streaming
		// path doit copier la réponse complète manuellement.
		if !isClaude && genErr == nil {
			full.WriteString(nonStreamResponse)
			if nonStreamResponse != "" {
				emitEvent(a.ctx, "spdd:restructure:chunk", map[string]any{
					"sessionID": sessionID,
					"text":      nonStreamResponse,
				})
			}
		}
		durationMs := time.Since(start).Milliseconds()

		if genErr != nil {
			userMsg, technical := friendlySuggestError(genErr)
			emitEvent(a.ctx, "spdd:restructure:error", map[string]any{
				"sessionID": sessionID,
				"message":   userMsg,
				"technical": technical,
			})
			return
		}

		response := full.String()

		// 1) Marqueur explicite ?
		if questions := parseInfoMissing(response); len(questions) > 0 {
			emitEvent(a.ctx, "spdd:restructure:missing-info", map[string]any{
				"sessionID":   sessionID,
				"questions":   questions,
				"rawResponse": response,
			})
			return
		}

		// 2) Heuristique fallback — la réponse a-t-elle >50% des
		//    sections obligatoires vides ?
		if shouldFallbackMissing(response, req.Divergence.MissingRequired) {
			emitEvent(a.ctx, "spdd:restructure:missing-info", map[string]any{
				"sessionID": sessionID,
				"questions": []string{
					"Plusieurs sections obligatoires du template restent à compléter. Pouvez-vous me donner plus d'informations sur le périmètre attendu ?",
				},
				"rawResponse": response,
			})
			return
		}

		// 3) Sinon — diff prêt, le frontend bascule en preview.
		emitEvent(a.ctx, "spdd:restructure:done", map[string]any{
			"sessionID":  sessionID,
			"fullText":   response,
			"durationMs": durationMs,
		})
	}()

	return sessionID, nil
}

// RestructureCancel cancels an active session by sessionID. Returns
// nil when the session is unknown (idempotent — the goroutine may
// have already terminated).
func (a *App) RestructureCancel(sessionID string) error {
	a.traceBinding("RestructureCancel", slog.String("sessionID", sessionID))
	val, loaded := a.restructureSessions.LoadAndDelete(sessionID)
	if !loaded {
		return nil
	}
	if s, ok := val.(*restructureSession); ok && s.cancel != nil {
		s.cancel()
	}
	return nil
}

// hasActiveRestructure reports whether at least one session is
// currently registered (invariant I7 — single concurrent session).
func (a *App) hasActiveRestructure() bool {
	active := false
	a.restructureSessions.Range(func(_, _ any) bool {
		active = true
		return false
	})
	return active
}

// splitFrontMatter separates the YAML front-matter block from the
// body. The returned frontMatter includes the surrounding "---"
// delimiters and trailing newline so concat(frontMatter, body)
// reproduces the input byte-for-byte.
//
// Returns ("", content) when the content has no recognised
// front-matter (no leading "---" line).
func splitFrontMatter(content string) (frontMatter, body string) {
	// Tolerate CRLF: normalise the leading marker check, but
	// preserve the original bytes in the slices we return.
	openMarker := "---\n"
	openMarkerCRLF := "---\r\n"

	if !strings.HasPrefix(content, openMarker) && !strings.HasPrefix(content, openMarkerCRLF) {
		return "", content
	}

	// Find the closing "---" line. We accept "\n---\n" and
	// "\r\n---\r\n" as the terminator.
	const closeNL = "\n---\n"
	const closeCRLF = "\r\n---\r\n"

	// Skip the opening line first.
	skipLen := len(openMarker)
	if strings.HasPrefix(content, openMarkerCRLF) {
		skipLen = len(openMarkerCRLF)
	}
	rest := content[skipLen:]

	if idx := strings.Index(rest, closeNL); idx >= 0 {
		end := skipLen + idx + len(closeNL)
		return content[:end], content[end:]
	}
	if idx := strings.Index(rest, closeCRLF); idx >= 0 {
		end := skipLen + idx + len(closeCRLF)
		return content[:end], content[end:]
	}

	// Malformed front-matter (no closing ---). Treat as body.
	return "", content
}

// parseInfoMissing extracts the questions inside <info-missing>...</info-missing>.
// Tolerant to hyphen/underscore/whitespace variants. Returns nil when
// no marker is found. Each question is one line (trimmed).
func parseInfoMissing(response string) []string {
	m := missingInfoRegex.FindStringSubmatch(response)
	if m == nil {
		return nil
	}
	body := strings.TrimSpace(m[1])
	if body == "" {
		return nil
	}
	rawLines := strings.Split(body, "\n")
	out := make([]string, 0, len(rawLines))
	for _, line := range rawLines {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}
	return out
}

// shouldFallbackMissing returns true when the LLM response leaves
// more than MissingThresholdRatio of the obligatory sections empty
// (canvas D3 heuristic). Defensive against Claude "filling in" with
// invented content rather than admitting it lacks info.
//
// For each expected heading, we look at the slice between that
// heading and the next markdown heading (or EOF). A section is
// considered "covered" only if that slice contains non-whitespace
// content beyond the heading line itself.
func shouldFallbackMissing(response string, expectedMissing []string) bool {
	if len(expectedMissing) == 0 {
		return false
	}
	covered := 0
	for _, heading := range expectedMissing {
		h := strings.TrimSpace(heading)
		if h == "" {
			continue
		}
		idx := strings.Index(response, h)
		if idx < 0 {
			continue
		}
		tail := response[idx+len(h):]
		// Bound the section to the next markdown heading (## or
		// any depth) to avoid counting the next section's content
		// as part of this one.
		end := nextHeadingStart(tail)
		if end > 0 {
			tail = tail[:end]
		}
		if strings.TrimSpace(tail) != "" {
			covered++
		}
	}
	missingRatio := 1.0 - float64(covered)/float64(len(expectedMissing))
	return missingRatio > MissingThresholdRatio
}

// nextHeadingStart returns the index of the next markdown heading
// (line starting with `#`) in s, or -1 if none. We require a
// preceding newline so a `#` mid-line (e.g. inside code) does not
// match.
func nextHeadingStart(s string) int {
	idx := strings.Index(s, "\n#")
	if idx < 0 {
		return -1
	}
	return idx
}

// convertHistoryToPrompt maps the IPC history shape to the
// promptbuilder shape (lossless, just type renaming).
func convertHistoryToPrompt(history []RestructureTurn) []promptbuilder.RestructureTurn {
	if len(history) == 0 {
		return nil
	}
	out := make([]promptbuilder.RestructureTurn, len(history))
	for i, t := range history {
		out[i] = promptbuilder.RestructureTurn{
			Question: t.Question,
			Answer:   t.Answer,
		}
	}
	return out
}
