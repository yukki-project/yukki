// UI-023 — disk watcher per opened project.
//
// One *fsWatcher per OpenedProject. Started by OpenProject and
// OnStartup, stopped by CloseProject and OnShutdown. The watcher
// runs a debouncer goroutine that aggregates fsnotify events on
// `<projectPath>/.yukki/**/*.md`, filters out paths currently in
// `editLocks` (self-write guard), and emits a single
// `yukki:fs:changed` Wails event per debounced event.

package uiapp

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
)

// FsChangeKind classifies an aggregated filesystem event. Mapped from
// fsnotify.Op (Create / Write / Remove / Rename).
type FsChangeKind string

const (
	FsCreate FsChangeKind = "create"
	FsModify FsChangeKind = "modify"
	FsDelete FsChangeKind = "delete"
	FsRename FsChangeKind = "rename"
)

// FsChangedPayload is the JSON payload of the Wails event
// `yukki:fs:changed`. Path is absolute, ProjectPath is the canonical
// root of the project owning the watcher. Mtime is Unix-nano (0 for
// delete events).
type FsChangedPayload struct {
	ProjectPath string       `json:"projectPath"`
	Path        string       `json:"path"`
	Kind        FsChangeKind `json:"kind"`
	Mtime       int64        `json:"mtime"`
}

// eventFsChanged is the Wails wire contract. Stable — do not rename
// without updating useFsWatchSubscriber.ts.
const eventFsChanged = "yukki:fs:changed"

// fsWatchDebounce is the debouncer window. 250 ms is the sweet spot
// between perceived reactivity and anti-stutter on `git checkout`
// bulk changes (cf. canvas Décision D4).
const fsWatchDebounce = 250 * time.Millisecond

// fsWatchStopTimeout caps the wait for a stopped watcher's goroutine
// to drain. Hitting this timeout logs a warning but does not block
// the caller (OnShutdown / CloseProject).
const fsWatchStopTimeout = time.Second

// fsWatcher encapsulates one fsnotify.Watcher + its debounce
// goroutine for a given project. Stored in App.fsWatchers.
type fsWatcher struct {
	projectPath string
	watcher     *fsnotify.Watcher
	cancel      context.CancelFunc
	done        chan struct{}
	logger      *slog.Logger
}

// startFsWatcher launches a recursive watcher under
// `<projectPath>/.yukki`. Returns nil + log warn if the directory
// does not exist (the watcher stays idle ; lazy creation is out of
// MVP scope, cf. canvas Décision D5). Idempotent : a second call on
// the same projectPath while a watcher is already active is a no-op.
func (a *App) startFsWatcher(projectPath string) error {
	if _, ok := a.fsWatchers.Load(projectPath); ok {
		// Already running for this project.
		return nil
	}
	yukkiDir := filepath.Join(projectPath, ".yukki")
	info, statErr := os.Stat(yukkiDir)
	if errors.Is(statErr, os.ErrNotExist) {
		if a.logger != nil {
			a.logger.Warn("fswatch: .yukki absent — watcher idle", "project", projectPath)
		}
		return nil
	}
	if statErr != nil {
		return statErr
	}
	if !info.IsDir() {
		return errors.New("fswatch: .yukki exists but is not a directory")
	}

	w, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	// Add the root and every existing subdir — fsnotify is not
	// recursive natively. New subdirs created at runtime are picked
	// up in runDebounce on CREATE events of type Dir.
	walkErr := filepath.WalkDir(yukkiDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			// Tolerate transient errors (file removed mid-walk) ;
			// the watch on the parent dir is enough to receive
			// future events about this path.
			return nil
		}
		if d.IsDir() {
			if addErr := w.Add(path); addErr != nil && a.logger != nil {
				a.logger.Warn("fswatch: add subdir failed", "path", path, "err", addErr)
			}
		}
		return nil
	})
	if walkErr != nil && a.logger != nil {
		a.logger.Warn("fswatch: walk failed", "root", yukkiDir, "err", walkErr)
	}

	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithCancel(parent)
	fsw := &fsWatcher{
		projectPath: projectPath,
		watcher:     w,
		cancel:      cancel,
		done:        make(chan struct{}),
		logger:      a.logger,
	}
	a.fsWatchers.Store(projectPath, fsw)
	go fsw.runDebounce(ctx, a)
	return nil
}

// stopFsWatcher tears down the watcher associated with projectPath.
// Idempotent : returns nil when no watcher is registered. Waits up
// to fsWatchStopTimeout for the goroutine to drain ; logs warn on
// timeout but does not block the caller further.
func (a *App) stopFsWatcher(projectPath string) error {
	val, ok := a.fsWatchers.LoadAndDelete(projectPath)
	if !ok {
		return nil
	}
	fsw, ok := val.(*fsWatcher)
	if !ok || fsw == nil {
		return nil
	}
	fsw.cancel()
	if err := fsw.watcher.Close(); err != nil && a.logger != nil {
		a.logger.Warn("fswatch: watcher.Close failed", "project", projectPath, "err", err)
	}
	select {
	case <-fsw.done:
	case <-time.After(fsWatchStopTimeout):
		if a.logger != nil {
			a.logger.Warn("fswatch: stop timeout exceeded", "project", projectPath)
		}
	}
	return nil
}

// stopAllFsWatchers iterates over fsWatchers and stops each one.
// Used by OnShutdown.
func (a *App) stopAllFsWatchers() {
	paths := make([]string, 0)
	a.fsWatchers.Range(func(k, _ any) bool {
		if p, ok := k.(string); ok {
			paths = append(paths, p)
		}
		return true
	})
	for _, p := range paths {
		_ = a.stopFsWatcher(p)
	}
}

// runDebounce consumes raw fsnotify events, filters them, accumulates
// the latest kind per path in a pending map, and flushes a Wails
// event per entry once the debouncer fires (250 ms of inactivity).
// Exits cleanly on ctx.Done or when the watcher's Events channel is
// closed (stopFsWatcher path), signalling completion via close(done).
func (fsw *fsWatcher) runDebounce(ctx context.Context, a *App) {
	defer close(fsw.done)

	pending := make(map[string]FsChangeKind)
	var timer *time.Timer
	var timerC <-chan time.Time

	flush := func() {
		for path, kind := range pending {
			payload := FsChangedPayload{
				ProjectPath: fsw.projectPath,
				Path:        path,
				Kind:        kind,
			}
			if kind != FsDelete {
				if info, err := os.Stat(path); err == nil {
					payload.Mtime = info.ModTime().UnixNano()
				}
			}
			emitEvent(a.ctx, eventFsChanged, payload)
		}
		pending = make(map[string]FsChangeKind)
		timer = nil
		timerC = nil
	}

	armTimer := func() {
		if timer == nil {
			timer = time.NewTimer(fsWatchDebounce)
		} else {
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(fsWatchDebounce)
		}
		timerC = timer.C
	}

	for {
		select {
		case <-ctx.Done():
			if len(pending) > 0 {
				flush()
			}
			return

		case ev, ok := <-fsw.watcher.Events:
			if !ok {
				if len(pending) > 0 {
					flush()
				}
				return
			}
			fsw.handleEvent(ev, pending, a)
			if len(pending) > 0 {
				armTimer()
			}

		case err, ok := <-fsw.watcher.Errors:
			if !ok {
				return
			}
			if fsw.logger != nil {
				fsw.logger.Warn("fswatch: watcher error", "project", fsw.projectPath, "err", err)
			}

		case <-timerC:
			flush()
		}
	}
}

// handleEvent classifies a single fsnotify event and updates the
// pending map. Filters non-`.md` files and paths in App.editLocks.
// Adds newly-created directories to the watcher (so recursion works
// for subdirs created after start).
func (fsw *fsWatcher) handleEvent(ev fsnotify.Event, pending map[string]FsChangeKind, a *App) {
	abs, err := filepath.Abs(ev.Name)
	if err != nil {
		return
	}

	// New subdir under .yukki/ : add to the watcher so we receive
	// events for files created inside. Don't emit a Wails event
	// for the directory itself.
	if ev.Has(fsnotify.Create) {
		if info, statErr := os.Stat(abs); statErr == nil && info.IsDir() {
			if addErr := fsw.watcher.Add(abs); addErr != nil && fsw.logger != nil {
				fsw.logger.Warn("fswatch: add new subdir failed", "path", abs, "err", addErr)
			}
			return
		}
	}

	if !strings.HasSuffix(abs, ".md") {
		return
	}
	if a.isEditLocked(abs) {
		return
	}

	kind := mapFsnotifyOp(ev.Op)
	pending[abs] = kind
}

// mapFsnotifyOp converts a fsnotify.Op bitfield to our coarse
// FsChangeKind. We pick the highest-priority bit when multiple are
// set (Remove > Rename > Create > Write).
func mapFsnotifyOp(op fsnotify.Op) FsChangeKind {
	switch {
	case op.Has(fsnotify.Remove):
		return FsDelete
	case op.Has(fsnotify.Rename):
		return FsRename
	case op.Has(fsnotify.Create):
		return FsCreate
	default:
		return FsModify
	}
}
