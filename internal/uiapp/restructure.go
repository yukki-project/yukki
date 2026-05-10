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

// MissingThresholdRatio is the fallback heuristic — when more than
// MissingThresholdRatio of the template's required sections are
// empty in the LLM response, we treat the response as if Claude
// had emitted <info-missing> (cf. canvas D3).
const MissingThresholdRatio = 0.5

// ErrSessionInProgress is returned by RestructureStart when another
// restructure session is already active on the same App.
var ErrSessionInProgress = errors.New("uiapp: a restructure session is already running")

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
	if a.hasActiveRestructure() {
		return "", ErrSessionInProgress
	}

	// Front-matter extraction (cf. invariant I6) — the LLM never
	// sees the YAML block. The split helper returns ("", body)
	// when the artefact has no front-matter.
	_, body := splitFrontMatter(req.FullMarkdown)

	userPrompt, err := promptbuilder.BuildRestructureUser(promptbuilder.RestructurePromptInput{
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
	systemPrompt := promptbuilder.BuildRestructureSystem()

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
		clone.SystemPrompt = systemPrompt
		// `--bare` désactive l'auth OAuth/keychain et n'accepte que
		// ANTHROPIC_API_KEY. Comme la plupart des utilisateurs yukki
		// sont sur OAuth (login Claude Code via navigateur), on
		// garde `--bare` désactivé. Le system prompt reste séparé
		// via `--system-prompt`, ce qui suffit pour le bénéfice
		// principal (priorité système + prompt cache).
		//
		// Pas de `--effort high` : la doc Anthropic Agent SDK
		// précise (Known limitations) qu'activer le thinking
		// désactive l'émission de StreamEvent — on perd le streaming
		// caractère-par-caractère du texte. Le CLI ne stream pas
		// non plus le thinking lui-même en temps réel (cf. GitHub
		// issue anthropics/claude-code#30660). Donc on désactive
		// extended thinking pour préserver le streaming texte ; les
		// blocs thinking (s'ils étaient émis) seraient toujours
		// captés par OnThinking, mais en pratique la voie reste
		// dormante avec le CLI actuel.
		clone.OnChunk = func(text string) {
			full.WriteString(text)
			emitEvent(a.ctx, "spdd:restructure:chunk", map[string]any{
				"sessionID": sessionID,
				"text":      text,
			})
		}
		// Extended thinking : Claude 4 émet des blocs de raisonnement
		// quand le CLI tourne avec un effort suffisant. On les
		// remonte via un event séparé pour que l'UI les rende dans
		// une bulle dédiée (italique/gris) sans polluer le streamText
		// de la réponse finale.
		clone.OnThinking = func(text string) {
			emitEvent(a.ctx, "spdd:restructure:thinking", map[string]any{
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

		nonStreamResponse, genErr := generate(ctx, userPrompt)
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

		// Strip défensif : Claude peut "compléter" la réponse avec un
		// front-matter YAML hallucinant la complétude du document
		// (malgré la consigne explicite « ne touche jamais au
		// front-matter »). Le frontend réinjecte le front-matter
		// d'origine après acceptation — si on laisse passer celui de
		// Claude, on se retrouve avec deux blocs YAML empilés. Cf.
		// invariant I6 + safeguard sécurité « Data ».
		response := stripLeadingFrontMatter(full.String())

		// 1) Marqueur explicite ?
		if questions := parseInfoMissing(response); len(questions) > 0 {
			emitEvent(a.ctx, "spdd:restructure:missing-info", map[string]any{
				"sessionID":   sessionID,
				"questions":   questions,
				"rawResponse": response,
			})
			return
		}

		// 2) Réponse hors-protocole conversationnelle ? Claude pose
		//    parfois sa question en texte libre malgré la consigne
		//    « toute question dans <info-missing> ». Quand on ne
		//    détecte aucune section markdown (`## `) → traiter le
		//    texte entier comme la question chat. Beaucoup mieux
		//    que la question générique de l'heuristique 50%.
		if isConversationalResponse(response) {
			emitEvent(a.ctx, "spdd:restructure:missing-info", map[string]any{
				"sessionID":   sessionID,
				"questions":   []string{strings.TrimSpace(response)},
				"rawResponse": response,
			})
			return
		}

		// 3) Heuristique fallback — la réponse a-t-elle >50% des
		//    sections obligatoires vides ?
		if shouldFallbackMissing(response, req.Divergence.MissingRequired) {
			emitEvent(a.ctx, "spdd:restructure:missing-info", map[string]any{
				"sessionID":   sessionID,
				"questions":   buildHeuristicFallbackQuestions(req.Divergence.MissingRequired),
				"rawResponse": response,
			})
			return
		}

		// 4) Sinon — diff prêt, le frontend bascule en preview.
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

// buildHeuristicFallbackQuestions construit la question chat émise
// quand l'heuristique 50% se déclenche. Utilise la liste réelle des
// sections obligatoires détectées comme vides pour donner un message
// actionnable, plutôt qu'une phrase générique.
//
// Exemples :
//   - 1 section : « La section ## Background reste à compléter. … »
//   - N sections : « Les sections ## Background, ## Scope In, … restent à compléter. … »
//   - 0 section (cas marginal — heuristique sans liste) : phrase
//     générique de fallback.
func buildHeuristicFallbackQuestions(missingRequired []string) []string {
	if len(missingRequired) == 0 {
		return []string{
			"Plusieurs sections obligatoires du template restent à compléter. Pouvez-vous me donner plus d'informations sur le périmètre attendu ?",
		}
	}
	var sb strings.Builder
	if len(missingRequired) == 1 {
		fmt.Fprintf(&sb, "La section %s reste à compléter. ", strings.TrimSpace(missingRequired[0]))
	} else {
		sb.WriteString("Les sections ")
		for i, s := range missingRequired {
			if i > 0 && i == len(missingRequired)-1 {
				sb.WriteString(" et ")
			} else if i > 0 {
				sb.WriteString(", ")
			}
			sb.WriteString(strings.TrimSpace(s))
		}
		sb.WriteString(" restent à compléter. ")
	}
	sb.WriteString("Pouvez-vous me donner du contenu pour ces sections, ou me dire quelles informations manquent encore ?")
	return []string{sb.String()}
}

// isConversationalResponse détecte une réponse Claude hors-protocole :
// pas de section markdown `## ` détectable (zéro headings H2). Dans
// ce cas, on traite le texte brut comme une question conversationnelle
// à afficher dans la bulle assistant — meilleur UX que la question
// générique de l'heuristique 50%.
//
// Tolère les réponses très courtes (un simple `?` retourne true) et
// les réponses qui ne contiennent qu'un H1 sans H2 (rare mais possible).
func isConversationalResponse(response string) bool {
	trimmed := strings.TrimSpace(response)
	if trimmed == "" {
		return false
	}
	for _, line := range strings.Split(trimmed, "\n") {
		if strings.HasPrefix(line, "## ") {
			return false
		}
	}
	return true
}

// stripLeadingFrontMatter removes a YAML front-matter block at the
// very start of the LLM response, if any. Claude sometimes
// hallucinates a front-matter despite the prompt instruction to
// leave it alone — the frontend re-injects the original after
// acceptance, so a leaked one would produce a duplicated YAML block.
//
// Tolerates a leading whitespace prefix (Claude often emits a blank
// line before the marker) and CRLF terminators.
func stripLeadingFrontMatter(response string) string {
	trimmed := strings.TrimLeft(response, " \t\r\n")
	if !strings.HasPrefix(trimmed, "---\n") && !strings.HasPrefix(trimmed, "---\r\n") {
		return response
	}
	// Reuse splitFrontMatter on the trimmed content to find where
	// the YAML block ends, then return everything after.
	fm, body := splitFrontMatter(trimmed)
	if fm == "" {
		return response // malformed, no closing --- → keep as-is
	}
	return strings.TrimLeft(body, "\r\n")
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
