package workflow

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
)

// ErrEmptyDescription is returned when no description is provided
// (no argument and no piped stdin).
var ErrEmptyDescription = errors.New("empty description")

// Progress reports lifecycle events of a long-running workflow operation
// (Provider.Generate). Implementations must be safe to call from the
// workflow goroutine. nil-safe via noopProgress fallback in StoryOptions.
//
// Defined in internal/workflow (not internal/uiapp) so the dependency
// arrow stays one-way (uiapp → workflow). depguard CORE-002 forbids the
// reverse import.
type Progress interface {
	// Start signals the beginning of a labelled phase ("Asking Claude").
	Start(label string)
	// End signals completion. path is the absolute path of the produced
	// artifact on success, "" on failure. err is nil on success.
	End(path string, err error)
	// Chunk delivers a partial text chunk from the provider stream.
	// Called from the provider goroutine; implementations must be safe
	// to call concurrently with Start and End.
	Chunk(text string)
}

// noopProgress is the zero-value fallback used when StoryOptions.Progress
// is nil. Methods are no-ops.
type noopProgress struct{}

func (noopProgress) Start(label string)         {}
func (noopProgress) End(path string, err error) {}
func (noopProgress) Chunk(text string)          {}

// StoryOptions bundles the dependencies and parameters for RunStory.
type StoryOptions struct {
	Description    string
	Prefix         string
	StrictPrefix   bool
	Logger         *slog.Logger
	Provider       provider.Provider
	TemplateLoader *templates.Loader
	Writer         *artifacts.Writer

	// Progress is an optional sink for lifecycle events. nil = noop.
	// Set by UI consumers (uiapp.uiProgress) to surface the start/end
	// of Provider.Generate as Wails events. CLI callers leave it nil.
	Progress Progress
}

// RunStory executes the `yukki story` workflow:
//  1. validate inputs
//  2. check provider version
//  3. load the story template (project or embed fallback)
//  4. compute the next id for the prefix
//  5. build the structured prompt and call the provider
//  6. derive the slug from the generated title
//  7. write the file via atomic rename (with frontmatter validation)
//
// Returns the absolute path of the created story file. If
// opts.Progress is non-nil, Start("Asking Claude") is called before
// Provider.Generate and End(path, err) is called on every return path
// (success and failure). nil Progress falls back to noopProgress.
func RunStory(ctx context.Context, opts StoryOptions) (path string, err error) {
	progress := opts.Progress
	if progress == nil {
		progress = noopProgress{}
	}
	defer func() {
		progress.End(path, err)
	}()

	if strings.TrimSpace(opts.Description) == "" {
		return "", ErrEmptyDescription
	}
	if err := artifacts.ValidatePrefix(opts.Prefix, opts.StrictPrefix); err != nil {
		return "", err
	}

	if err := opts.Provider.CheckVersion(ctx); err != nil {
		return "", err
	}

	tplContent, tplSource, err := opts.TemplateLoader.LoadStory()
	if err != nil {
		return "", fmt.Errorf("load story template: %w", err)
	}
	if opts.Logger != nil {
		opts.Logger.Debug("template loaded", "source", string(tplSource))
	}

	id, err := artifacts.NextID(opts.Writer.StoriesDir, opts.Prefix)
	if err != nil {
		return "", fmt.Errorf("compute next id: %w", err)
	}

	prompt := BuildStructuredPrompt(tplContent, opts.Description, id)
	if opts.Logger != nil {
		opts.Logger.Debug("prompt built", "id", id, "prompt_bytes", len(prompt))
	}

	progress.Start("Asking Claude")

	output, err := opts.Provider.Generate(ctx, prompt)
	if err != nil {
		return "", err
	}

	title := extractTitle(output)
	slug := artifacts.Slugify(title)
	if slug == "" {
		slug = "untitled"
	}

	path, err = opts.Writer.Write(id, slug, output)
	if err != nil {
		return "", err
	}

	if opts.Logger != nil {
		opts.Logger.Info("story generated", "path", path, "id", id, "slug", slug)
	}
	return path, nil
}

var titleRE = regexp.MustCompile(`(?m)^# (.+)$`)

// extractTitle returns the first H1 from the markdown body, or "" if none.
// The frontmatter (between the two `---`) is skipped first.
func extractTitle(content string) string {
	body := stripFrontmatter(content)
	m := titleRE.FindStringSubmatch(body)
	if m == nil {
		return ""
	}
	return strings.TrimSpace(m[1])
}

func stripFrontmatter(content string) string {
	const delim = "---\n"
	if !strings.HasPrefix(content, delim) {
		return content
	}
	rest := content[len(delim):]
	end := strings.Index(rest, "\n"+delim[:len(delim)-1])
	if end < 0 {
		return content
	}
	return rest[end+len(delim):]
}
