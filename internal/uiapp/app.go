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
	"github.com/yukki-project/yukki/internal/draft"
	"github.com/yukki-project/yukki/internal/promptbuilder"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/skills"
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
	ctx    context.Context
	cancel context.CancelFunc
	logger *slog.Logger
	provider provider.Provider

	// openedProjects holds the ordered list of currently open projects
	// (one entry per tab in the UI).  activeIndex points to the currently
	// active project (-1 when no project is open).  recentProjects mirrors
	// the on-disk recent list in memory.  All three are protected by mu.
	openedProjects []*OpenedProject
	activeIndex    int
	recentProjects []RegistryEntry
	mu             sync.RWMutex

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

	// draftStore persists in-progress SPDD drafts to the platform config dir.
	// Initialised by OnStartup; nil-safe (methods guard against nil store).
	draftStore *draft.DraftStore

	// sessions holds active streaming suggestion sessions, keyed by sessionID.
	// Values are *suggestSession. Modified concurrently; sync.Map is used.
	sessions sync.Map

	// sectionDefs holds the SPDD section definitions used to build suggestion prompts.
	// Loaded at OnStartup from the active project or the embedded fallback.
	sectionDefs promptbuilder.SectionDefinitions
}

// NewApp constructs an App with the dependencies it needs at runtime.
// The context is set later by OnStartup (Wails lifecycle).
func NewApp(p provider.Provider, logger *slog.Logger) *App {
	return &App{
		logger:      logger,
		provider:    p,
		activeIndex: -1,
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
	a.restoreRegistry()

	// Initialise the draft store with the platform config directory.
	store, err := draft.NewDraftStore("")
	if err != nil {
		if a.logger != nil {
			a.logger.Warn("draft store init failed", "err", err)
		}
	} else {
		a.draftStore = store
		// Emit restore-available event if there are pending drafts.
		if summaries, listErr := store.List(); listErr == nil && len(summaries) > 0 {
			emitEvent(a.ctx, "draft:restore-available", summaries)
		}
	}

	// Load SPDD section definitions for suggestion prompts.
	defs, defsErr := promptbuilder.LoadSectionDefs(a.activeProjectDir())
	if defsErr != nil && a.logger != nil {
		a.logger.Warn("section defs load failed — using fallback", "err", defsErr)
	}
	a.sectionDefs = defs
}

// OnShutdown is invoked by Wails when the user closes the window. Cancels
// the in-flight context so child operations (subprocess `claude` etc.)
// receive a cancellation signal and clean up promptly.
func (a *App) OnShutdown(ctx context.Context) {
	// Cancel all active suggestion sessions before shutting down.
	a.sessions.Range(func(_, v any) bool {
		if s, ok := v.(*suggestSession); ok {
			s.cancel()
		}
		return true
	})
	a.persistRegistry()
	if a.cancel != nil {
		a.cancel()
	}
	if a.logger != nil {
		a.logger.Info("ui shutdown")
	}
}

// (Greet was removed in UI-001c per D-C11 — RunStory with MockProvider
// covers a broader smoke path.)

// SelectProject is a deprecated alias for OpenProject("").
// It opens a native directory picker, adds the selected project to the
// session, and returns its canonical path.  Returns ("", nil) on user
// cancellation.
//
// Deprecated: use OpenProject.
func (a *App) SelectProject() (string, error) {
	meta, err := a.OpenProject("")
	if err != nil {
		return "", err
	}
	return meta.Path, nil
}

// activeProject returns the currently active OpenedProject, or an error
// if no project is selected.  Acquires a read lock on a.mu.
func (a *App) activeProject() (*OpenedProject, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.activeIndex < 0 || a.activeIndex >= len(a.openedProjects) {
		return nil, errors.New("no project selected")
	}
	return a.openedProjects[a.activeIndex], nil
}

// AllowedKinds is a thin re-export of artifacts.AllowedKinds() so the
// frontend can render the sidebar without hardcoding the list (Invariant
// I7 — DRY with CORE-004).
func (a *App) AllowedKinds() []string {
	return artifacts.AllowedKinds()
}

// ListArtifacts delegates to artifacts.ListArtifacts(activeProject.Path, kind).
// Returns an explicit error if no project is selected; propagates
// ErrInvalidKind / OS errors from the underlying call.
func (a *App) ListArtifacts(kind string) ([]artifacts.Meta, error) {
	p, err := a.activeProject()
	if err != nil {
		return nil, err
	}
	return artifacts.ListArtifacts(p.Path, kind)
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

// scaffoldSkills writes each SkillEntry from entries into dir, skipping any
// file that already exists. Parent directories are created as needed.
// Returns the first error encountered (fail-fast).
func scaffoldSkills(dir string, entries []skills.SkillEntry) error {
	for _, entry := range entries {
		dst := filepath.Join(dir, entry.DestPath)
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", filepath.Dir(dst), err)
		}
		if _, err := os.Stat(dst); err == nil {
			// File already exists — skip to preserve user customisations.
			continue
		} else if !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("stat %s: %w", dst, err)
		}
		if err := os.WriteFile(dst, entry.Content, 0o644); err != nil {
			return fmt.Errorf("write skill %s: %w", dst, err)
		}
	}
	return nil
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

	loader := templates.NewLoader(dir)

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

	if err := scaffoldSkills(dir, skills.Entries()); err != nil {
		return fmt.Errorf("scaffold skills: %w", err)
	}

	if a.logger != nil {
		a.logger.Info("yukki initialized", "dir", dir)
	}
	return nil
}

// ReadArtifact returns the file contents at the given path. Refuses any
// path that does not resolve under the .yukki/ directory of one of the
// currently opened projects (Invariant I1 extended — path-traversal guard
// over N projects).  Returns an error if no project is open.
func (a *App) ReadArtifact(path string) (string, error) {
	a.mu.RLock()
	projs := make([]*OpenedProject, len(a.openedProjects))
	copy(projs, a.openedProjects)
	a.mu.RUnlock()

	if len(projs) == 0 {
		return "", errors.New("no project selected")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve abs path %q: %w", path, err)
	}
	if !hasYukkiPrefix(absPath, projs) {
		return "", fmt.Errorf("path outside any opened project .yukki: %s", absPath)
	}
	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", absPath, err)
	}
	return string(data), nil
}

// WriteArtifact writes content to the file at path. Refuses any path that does
// not resolve under the .yukki/ directory of one of the currently opened projects
// (path-traversal guard, Invariant I1). Returns an error if the file does not
// already exist (modification only — no silent creation). Content is limited
// to 1 MB. No ctx parameter (Wails 2.12 D-B5b).
func (a *App) WriteArtifact(path, content string) error {
	a.mu.RLock()
	projs := make([]*OpenedProject, len(a.openedProjects))
	copy(projs, a.openedProjects)
	a.mu.RUnlock()

	if len(projs) == 0 {
		return errors.New("no project selected")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve abs path %q: %w", path, err)
	}
	if !hasYukkiPrefix(absPath, projs) {
		return fmt.Errorf("path outside any opened project .yukki: %s", absPath)
	}
	if len(content) > 1<<20 {
		return errors.New("content exceeds 1 MB limit")
	}
	if _, statErr := os.Stat(absPath); errors.Is(statErr, os.ErrNotExist) {
		return fmt.Errorf("artifact does not exist %s: %w", absPath, os.ErrNotExist)
	}
	if err := os.WriteFile(absPath, []byte(content), 0o600); err != nil {
		return fmt.Errorf("write %s: %w", absPath, err)
	}
	return nil
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
	p, err := a.activeProject()
	if err != nil {
		return "", err
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

	// Wire streaming chunk callback if the active provider supports it.
	if cp, ok := a.provider.(*provider.ClaudeProvider); ok {
		cp.OnChunk = prog.Chunk
		defer func() { cp.OnChunk = nil }()
	}

	opts := workflow.StoryOptions{
		Description:    description,
		Prefix:         prefix,
		StrictPrefix:   strictPrefix,
		Logger:         a.logger,
		Provider:       a.provider,
		TemplateLoader: p.loader,
		Writer:         p.writer,
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
