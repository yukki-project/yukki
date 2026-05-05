// Package uiapp implements the Wails App struct backing the `yukki ui`
// desktop window.
//
// O3 of the UI-001a canvas: minimal struct + NewApp factory + lifecycle
// hooks (OnStartup / OnShutdown). The smoke-test Greet() method was
// removed in UI-001c (D-C11) — RunStory(mock) covers a broader smoke
// path.
//
// O2 of the UI-001b canvas extends App with project state (projectDir,
// loader, writer) and 6 bindings consumed by the hub UI (SelectProject,
// AllowedKinds, ListArtifacts, GetClaudeStatus, InitializeYukki,
// ReadArtifact).
//
// O4 of the UI-001c canvas extends App with generation state (running
// atomic.Bool, runStoryCancel context.CancelFunc) and 3 bindings for
// the writing flow (RunStory, AbortRunning, SuggestedPrefixes).
package uiapp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
	"github.com/yukki-project/yukki/internal/workflow"
)

// ErrAlreadyRunning is returned by App.RunStory when a previous
// generation is still in progress on this App instance.
var ErrAlreadyRunning = errors.New("a generation is already running")

// openDirectoryDialog is a package-level indirection over
// runtime.OpenDirectoryDialog so unit tests can replace it without spinning
// up a Wails context. Production callers (the real `yukki ui` binary)
// hit the Wails runtime directly.
var openDirectoryDialog = runtime.OpenDirectoryDialog

// spddSubdirs lists the directories created by InitializeYukki under
// <projectDir>/.yukki/. Order is stable for testability.
var spddSubdirs = []string{
	"stories",
	"analysis",
	"prompts",
	"tests",
	"inbox",   // META-005 — discovery zone (capture brute)
	"epics",   // META-005 — regroupement de stories
	"roadmap", // META-005 — vue projection Now/Next/Later
	"methodology",
	"templates",
}

// ClaudeStatus is the typed view of the Claude CLI's reachability returned
// by App.GetClaudeStatus. Available is true when the binary is on PATH and
// `--version` succeeds; Version holds its trimmed stdout in that case.
// Err carries a non-empty string when either step fails — callers render it
// in the banner UI rather than treating it as a hard error.
type ClaudeStatus struct {
	Available bool
	Version   string
	Err       string
}

// App is the root struct exposed to the Wails frontend via Bind.
//
// Public methods (PascalCase) become auto-generated TypeScript bindings
// under frontend/wailsjs/go/main/App.
type App struct {
	ctx        context.Context
	cancel     context.CancelFunc
	logger     *slog.Logger
	provider   provider.Provider
	projectDir string
	loader     *templates.Loader
	writer     *artifacts.Writer

	// running gates concurrent RunStory calls. Swap(true) at start,
	// Store(false) at defer. ErrAlreadyRunning is returned if Swap
	// returns true (a generation is already in progress).
	running atomic.Bool

	// cancelMu protects runStoryCancel against concurrent read by
	// AbortRunning (called from another goroutine, e.g. the Wails JS
	// callback path) while RunStory writes it. atomic.Bool was not
	// enough on its own because runStoryCancel is a non-atomic
	// context.CancelFunc.
	cancelMu sync.Mutex

	// runStoryCancel is the cancel function of the per-generation
	// sub-context derived from a.ctx. AbortRunning calls this. Reset
	// to nil on RunStory return. Read/write only under cancelMu.
	runStoryCancel context.CancelFunc
}

// NewApp constructs an App with the dependencies it needs at runtime.
// The context is set later by OnStartup (Wails lifecycle).
func NewApp(p provider.Provider, logger *slog.Logger) *App {
	return &App{
		logger:   logger,
		provider: p,
	}
}

// OnStartup is invoked by Wails when the window is ready. The runtime
// context is wrapped in a cancellable context so OnShutdown can interrupt
// any long-running operation kicked off by future bindings (UI-001c).
func (a *App) OnStartup(ctx context.Context) {
	a.ctx, a.cancel = context.WithCancel(ctx)
	if a.logger != nil {
		a.logger.Info("ui startup", "provider", a.provider.Name())
	}
}

// OnShutdown is invoked by Wails when the user closes the window. Cancels
// the in-flight context so child operations (subprocess `claude` etc.)
// receive a cancellation signal and clean up promptly.
func (a *App) OnShutdown(ctx context.Context) {
	if a.cancel != nil {
		a.cancel()
	}
	if a.logger != nil {
		a.logger.Info("ui shutdown")
	}
}

// (Greet was removed in UI-001c per D-C11 — RunStory with MockProvider
// covers a broader smoke path.)

// SelectProject opens a native directory-picker dialog and, on a
// non-empty selection, updates the App's projectDir / loader / writer.
// A user cancellation returns ("", nil) so the frontend can distinguish
// it from a real error.
//
// Uses the App's startup context (a.ctx) — Wails 2.12 does not
// auto-inject context.Context for bound methods, so the canvas-prescribed
// `(ctx context.Context)` parameter is dropped here. Tracked for sync.
func (a *App) SelectProject() (string, error) {
	dir, err := openDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select SPDD project root",
	})
	if err != nil {
		return "", fmt.Errorf("open directory dialog: %w", err)
	}
	if dir == "" {
		return "", nil
	}

	a.projectDir = dir
	a.loader = templates.NewLoader(dir)
	a.writer = artifacts.NewWriter(filepath.Join(dir, artifacts.ProjectDirName, "stories"))
	if a.logger != nil {
		a.logger.Info("project selected", "dir", dir)
	}
	return dir, nil
}

// AllowedKinds is a thin re-export of artifacts.AllowedKinds() so the
// frontend can render the sidebar without hardcoding the list (Invariant
// I7 — DRY with CORE-004).
func (a *App) AllowedKinds() []string {
	return artifacts.AllowedKinds()
}

// ListArtifacts delegates to artifacts.ListArtifacts(projectDir, kind).
// Returns an explicit error if no project is selected; propagates
// ErrInvalidKind / OS errors from the underlying call.
func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error) {
	if a.projectDir == "" {
		return nil, errors.New("no project selected")
	}
	return artifacts.ListArtifacts(a.projectDir, kind)
}

// GetClaudeStatus probes the Provider via CheckVersion + Version and maps
// the outcome to a ClaudeStatus value. CheckVersion failure → Available
// false. CheckVersion ok but Version failure → Available true with a
// non-empty Err field. Both ok → Available true with Version populated.
//
// Uses the App's startup context (a.ctx) — Wails 2.12 does not auto-inject
// context.Context for bound methods. Tracked for sync.
func (a *App) GetClaudeStatus() ClaudeStatus {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	if err := a.provider.CheckVersion(ctx); err != nil {
		return ClaudeStatus{Available: false, Err: err.Error()}
	}
	v, err := a.provider.Version(ctx)
	if err != nil {
		return ClaudeStatus{Available: true, Err: err.Error()}
	}
	return ClaudeStatus{Available: true, Version: v}
}

// InitializeYukki creates the yukki project directory tree under
// <dir>/.yukki/ and copies the embedded templates into
// <dir>/.yukki/templates/. The operation is idempotent: rerunning it on
// a populated directory re-creates missing subdirs and overwrites the
// embedded templates (embed.FS is treated as the source of truth,
// Invariant I4).
//
// Renamed from InitializeSPDD by META-004 (the directory is now
// `.yukki/`, not `spdd/` — symbol Go aligned with the convention).
func (a *App) InitializeYukki(dir string) error {
	if dir == "" {
		return errors.New("dir must not be empty")
	}

	for _, sub := range spddSubdirs {
		path := filepath.Join(dir, artifacts.ProjectDirName, sub)
		if err := os.MkdirAll(path, 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", path, err)
		}
	}

	loader := a.loader
	if loader == nil {
		loader = templates.NewLoader(dir)
	}

	type tpl struct {
		name string
		load func() (string, templates.Source, error)
	}
	all := []tpl{
		{"story.md", loader.LoadStory},
		{"analysis.md", loader.LoadAnalysis},
		{"canvas-reasons.md", loader.LoadCanvasReasons},
		{"tests.md", loader.LoadTests},
		{"inbox.md", loader.LoadInbox},     // META-005
		{"epic.md", loader.LoadEpic},       // META-005
		{"roadmap.md", loader.LoadRoadmap}, // META-005
	}
	for _, t := range all {
		content, _, err := t.load()
		if err != nil {
			return fmt.Errorf("load template %s: %w", t.name, err)
		}
		dst := filepath.Join(dir, artifacts.ProjectDirName, "templates", t.name)
		if err := os.WriteFile(dst, []byte(content), 0o644); err != nil {
			return fmt.Errorf("write template %s: %w", dst, err)
		}
	}

	if a.logger != nil {
		a.logger.Info("yukki initialized", "dir", dir)
	}
	return nil
}

// ReadArtifact returns the file contents at the given path. Refuses any
// path that does not resolve under <projectDir>/.yukki/ (Invariant I1 —
// path-traversal guard). Empty projectDir is rejected explicitly so the
// guard is never bypassed by a missing prefix.
func (a *App) ReadArtifact(path string) (string, error) {
	if a.projectDir == "" {
		return "", errors.New("no project selected")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve abs path %q: %w", path, err)
	}
	prefix, err := filepath.Abs(filepath.Join(a.projectDir, artifacts.ProjectDirName))
	if err != nil {
		return "", fmt.Errorf("resolve project yukki prefix: %w", err)
	}
	if !strings.HasPrefix(absPath, prefix) {
		return "", fmt.Errorf("path outside project yukki: %s", absPath)
	}
	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", absPath, err)
	}
	return string(data), nil
}

// RunStory orchestrates workflow.RunStory with a uiProgress sink that
// emits Wails events. Refuses to run if no project is selected or if
// another generation is already in progress (ErrAlreadyRunning).
//
// The per-generation context is derived from a.ctx so OnShutdown
// cancels the subprocess `claude` (via exec.CommandContext); the
// derived cancel is also exposed via AbortRunning so the user can
// abandon without closing the window.
//
// No ctx parameter (Wails 2.12 D-B5b — runtime does not auto-inject).
func (a *App) RunStory(description, prefix string, strictPrefix bool) (string, error) {
	if a.projectDir == "" {
		return "", errors.New("no project selected")
	}
	if a.running.Swap(true) {
		return "", ErrAlreadyRunning
	}
	defer a.running.Store(false)

	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	runStoryCtx, cancel := context.WithCancel(parent)
	a.cancelMu.Lock()
	a.runStoryCancel = cancel
	a.cancelMu.Unlock()
	defer func() {
		a.cancelMu.Lock()
		a.runStoryCancel = nil
		a.cancelMu.Unlock()
		cancel()
	}()

	prog := newUiProgress(runStoryCtx, a.logger)
	opts := workflow.StoryOptions{
		Description:    description,
		Prefix:         prefix,
		StrictPrefix:   strictPrefix,
		Logger:         a.logger,
		Provider:       a.provider,
		TemplateLoader: a.loader,
		Writer:         a.writer,
		Progress:       prog,
	}
	return workflow.RunStory(runStoryCtx, opts)
}

// AbortRunning cancels the in-flight generation, if any. Idempotent
// no-op if nothing is running. Distinct from OnShutdown so the user
// can abandon without closing the window (D-C3).
//
// Read of runStoryCancel is protected by cancelMu (paired with the
// write in RunStory) to avoid the data race the -race detector
// catches under concurrent UI-callback / abort scenarios.
func (a *App) AbortRunning() error {
	a.cancelMu.Lock()
	cancel := a.runStoryCancel
	a.cancelMu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

// SuggestedPrefixes returns a sorted copy of artifacts.AllowedPrefixes
// for the prefix combo of the New Story modal. The slice is independent
// of the package-level variable (no mutation risk).
func (a *App) SuggestedPrefixes() []string {
	out := make([]string, len(artifacts.AllowedPrefixes))
	copy(out, artifacts.AllowedPrefixes)
	sort.Strings(out)
	return out
}

// UpdateArtifactStatus mutates the `status:` field of the SPDD artifact
// at `path`, validating the transition against the SPDD progression
// rules (forward 1 step or downgrade 1 step, see
// artifacts.IsValidTransition). Also bumps `updated:` to today's date.
// Other front-matter fields and the body markdown are preserved
// untouched (yaml.Node round-trip preserves key order + comments).
// UI-008 binding.
func (a *App) UpdateArtifactStatus(path, newStatus string) error {
	if !strings.HasSuffix(path, ".md") {
		return fmt.Errorf("not a markdown file: %s", path)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read artifact: %w", err)
	}
	content := string(raw)

	if !strings.HasPrefix(content, "---") {
		return fmt.Errorf("missing front-matter delimiter")
	}
	rest := content[3:]
	if strings.HasPrefix(rest, "\n") || strings.HasPrefix(rest, "\r\n") {
		// strip the newline right after opening ---
		if strings.HasPrefix(rest, "\r\n") {
			rest = rest[2:]
		} else {
			rest = rest[1:]
		}
	}
	end := strings.Index(rest, "\n---")
	if end == -1 {
		return fmt.Errorf("malformed front-matter: no closing ---")
	}
	yamlPart := rest[:end]
	bodyOffset := 3 + (len(content) - 3 - len(rest)) + end + 4
	body := content[bodyOffset:]

	var root yaml.Node
	if err := yaml.Unmarshal([]byte(yamlPart), &root); err != nil {
		return fmt.Errorf("parse front-matter: %w", err)
	}
	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return fmt.Errorf("unexpected yaml structure")
	}
	mapping := root.Content[0]
	if mapping.Kind != yaml.MappingNode {
		return fmt.Errorf("front-matter is not a yaml mapping")
	}

	var statusNode, updatedNode *yaml.Node
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		key := mapping.Content[i]
		val := mapping.Content[i+1]
		switch key.Value {
		case "status":
			statusNode = val
		case "updated":
			updatedNode = val
		}
	}
	if statusNode == nil {
		return fmt.Errorf("front-matter has no status field")
	}

	current := artifacts.Status(statusNode.Value)
	target := artifacts.Status(newStatus)
	if !artifacts.IsValidTransition(current, target) {
		return fmt.Errorf("invalid status transition: %s → %s", current, target)
	}

	statusNode.Value = newStatus
	today := time.Now().Format("2006-01-02")
	if updatedNode != nil {
		updatedNode.Value = today
	} else {
		mapping.Content = append(mapping.Content,
			&yaml.Node{Kind: yaml.ScalarNode, Value: "updated", Tag: "!!str"},
			&yaml.Node{Kind: yaml.ScalarNode, Value: today, Tag: "!!str"},
		)
	}

	newYaml, err := yaml.Marshal(mapping)
	if err != nil {
		return fmt.Errorf("marshal front-matter: %w", err)
	}
	final := "---\n" + strings.TrimRight(string(newYaml), "\n") + "\n---" + body

	// Atomic write : temp + rename.
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(final), 0o644); err != nil {
		return fmt.Errorf("write temp: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("atomic rename: %w", err)
	}
	if a.logger != nil {
		a.logger.Info("artifact status updated", "path", path, "from", current, "to", newStatus)
	}
	return nil
}

// AllowedTransitions returns the list of statuses reachable from
// `currentStatus` (current itself + forward + backward 1 step).
// Used by the frontend to grey out invalid items in the status
// DropdownMenu (UI-008).
func (a *App) AllowedTransitions(currentStatus string) []string {
	list := artifacts.AllowedTransitions(artifacts.Status(currentStatus))
	out := make([]string, len(list))
	for i, s := range list {
		out[i] = string(s)
	}
	return out
}

// UpdateArtifactPriority mutates the `priority:` field of the SPDD
// artifact at `path`. priority must be >= 0 (0 = unset, sorts to
// the end of the workflow pipeline). Bumps `updated:` to today's
// date. Other front-matter fields and the body are preserved
// (yaml.Node round-trip). UI-008 binding (post-implem update).
func (a *App) UpdateArtifactPriority(path string, priority int) error {
	if priority < 0 {
		return fmt.Errorf("priority must be >= 0, got %d", priority)
	}
	if !strings.HasSuffix(path, ".md") {
		return fmt.Errorf("not a markdown file: %s", path)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read artifact: %w", err)
	}
	content := string(raw)

	if !strings.HasPrefix(content, "---") {
		return fmt.Errorf("missing front-matter delimiter")
	}
	rest := content[3:]
	if strings.HasPrefix(rest, "\r\n") {
		rest = rest[2:]
	} else if strings.HasPrefix(rest, "\n") {
		rest = rest[1:]
	}
	end := strings.Index(rest, "\n---")
	if end == -1 {
		return fmt.Errorf("malformed front-matter: no closing ---")
	}
	yamlPart := rest[:end]
	bodyOffset := 3 + (len(content) - 3 - len(rest)) + end + 4
	body := content[bodyOffset:]

	var root yaml.Node
	if err := yaml.Unmarshal([]byte(yamlPart), &root); err != nil {
		return fmt.Errorf("parse front-matter: %w", err)
	}
	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return fmt.Errorf("unexpected yaml structure")
	}
	mapping := root.Content[0]
	if mapping.Kind != yaml.MappingNode {
		return fmt.Errorf("front-matter is not a yaml mapping")
	}

	priorityStr := strconv.Itoa(priority)
	today := time.Now().Format("2006-01-02")

	var priorityNode, updatedNode *yaml.Node
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		key := mapping.Content[i]
		val := mapping.Content[i+1]
		switch key.Value {
		case "priority":
			priorityNode = val
		case "updated":
			updatedNode = val
		}
	}
	if priorityNode != nil {
		priorityNode.Value = priorityStr
		priorityNode.Tag = "!!int"
	} else {
		mapping.Content = append(mapping.Content,
			&yaml.Node{Kind: yaml.ScalarNode, Value: "priority", Tag: "!!str"},
			&yaml.Node{Kind: yaml.ScalarNode, Value: priorityStr, Tag: "!!int"},
		)
	}
	if updatedNode != nil {
		updatedNode.Value = today
	} else {
		mapping.Content = append(mapping.Content,
			&yaml.Node{Kind: yaml.ScalarNode, Value: "updated", Tag: "!!str"},
			&yaml.Node{Kind: yaml.ScalarNode, Value: today, Tag: "!!str"},
		)
	}

	newYaml, err := yaml.Marshal(mapping)
	if err != nil {
		return fmt.Errorf("marshal front-matter: %w", err)
	}
	final := "---\n" + strings.TrimRight(string(newYaml), "\n") + "\n---" + body

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(final), 0o644); err != nil {
		return fmt.Errorf("write temp: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("atomic rename: %w", err)
	}
	if a.logger != nil {
		a.logger.Info("artifact priority updated", "path", path, "priority", priority)
	}
	return nil
}
