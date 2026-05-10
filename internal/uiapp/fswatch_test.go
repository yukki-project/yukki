package uiapp

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/fsnotify/fsnotify"
)

// fswatchTestApp builds a minimal *App suitable for fswatch tests.
// recordEmits is called by each test that needs to assert on emitted
// events.
func fswatchTestApp(t *testing.T) *App {
	t.Helper()
	return &App{ctx: context.Background()}
}

// makeYukkiTree creates `<root>/.yukki/stories/` and returns the
// stories dir. Used as the target for fsnotify writes.
func makeYukkiTree(t *testing.T, root string) string {
	t.Helper()
	stories := filepath.Join(root, ".yukki", "stories")
	if err := os.MkdirAll(stories, 0o755); err != nil {
		t.Fatalf("mkdir stories: %v", err)
	}
	return stories
}

// findFsEvent returns the first emitted FsChangedPayload whose path
// matches needle (suffix match), or nil. Convenient because absolute
// paths in tests vary by OS.
func findFsEvent(events []recordedEvent, needle string) *FsChangedPayload {
	for _, ev := range events {
		if ev.name != eventFsChanged || len(ev.payload) == 0 {
			continue
		}
		p, ok := ev.payload[0].(FsChangedPayload)
		if !ok {
			continue
		}
		if filepath.Base(p.Path) == needle {
			return &p
		}
	}
	return nil
}

// waitFor polls until pred returns true or the deadline elapses.
// Used to give fsnotify + debouncer time to deliver an event without
// hard-coded sleeps.
func waitFor(t *testing.T, deadline time.Duration, pred func() bool) bool {
	t.Helper()
	end := time.Now().Add(deadline)
	for time.Now().Before(end) {
		if pred() {
			return true
		}
		time.Sleep(10 * time.Millisecond)
	}
	return pred()
}

func TestStartFsWatcher_NoYukkiDir_Idle(t *testing.T) {
	a := fswatchTestApp(t)
	root := t.TempDir() // no .yukki inside

	if err := a.startFsWatcher(root); err != nil {
		t.Fatalf("expected nil error on missing .yukki, got %v", err)
	}
	if _, ok := a.fsWatchers.Load(root); ok {
		t.Errorf("expected no watcher to be registered when .yukki is absent")
	}
}

func TestStartStop_Roundtrip_EmitsCreate(t *testing.T) {
	a := fswatchTestApp(t)
	getEvents := recordEmits(t)
	root := t.TempDir()
	stories := makeYukkiTree(t, root)

	if err := a.startFsWatcher(root); err != nil {
		t.Fatalf("startFsWatcher: %v", err)
	}
	defer func() { _ = a.stopFsWatcher(root) }()

	target := filepath.Join(stories, "UI-099-test.md")
	if err := os.WriteFile(target, []byte("---\nid: UI-099\n---\n# X"), 0o644); err != nil {
		t.Fatalf("write target: %v", err)
	}

	ok := waitFor(t, 2*time.Second, func() bool {
		return findFsEvent(getEvents(), "UI-099-test.md") != nil
	})
	if !ok {
		t.Fatalf("did not receive yukki:fs:changed for UI-099-test.md within 2s")
	}
	ev := findFsEvent(getEvents(), "UI-099-test.md")
	if ev == nil || ev.ProjectPath != root {
		t.Errorf("payload mismatch: %+v", ev)
	}
}

func TestStop_Idempotent(t *testing.T) {
	a := fswatchTestApp(t)
	if err := a.stopFsWatcher("/nonexistent"); err != nil {
		t.Errorf("stop on unknown path must not error, got %v", err)
	}
}

func TestStopAll_AcrossMultipleProjects(t *testing.T) {
	a := fswatchTestApp(t)

	roots := []string{t.TempDir(), t.TempDir(), t.TempDir()}
	for _, r := range roots {
		makeYukkiTree(t, r)
		if err := a.startFsWatcher(r); err != nil {
			t.Fatalf("start %s: %v", r, err)
		}
	}

	a.stopAllFsWatchers()

	count := 0
	a.fsWatchers.Range(func(_, _ any) bool {
		count++
		return true
	})
	if count != 0 {
		t.Errorf("expected fsWatchers map empty after stopAll, got %d entries", count)
	}
}

func TestEditLock_FiltersEvent(t *testing.T) {
	a := fswatchTestApp(t)
	getEvents := recordEmits(t)
	root := t.TempDir()
	stories := makeYukkiTree(t, root)

	target := filepath.Join(stories, "UI-100-locked.md")
	abs, _ := filepath.Abs(target)
	if err := a.acquireEditLock(target); err != nil {
		t.Fatalf("acquire lock: %v", err)
	}

	if err := a.startFsWatcher(root); err != nil {
		t.Fatalf("startFsWatcher: %v", err)
	}
	defer func() { _ = a.stopFsWatcher(root) }()

	if err := os.WriteFile(target, []byte("# X"), 0o644); err != nil {
		t.Fatalf("write target: %v", err)
	}

	// Wait the debounce window + a margin so the watcher has every
	// chance to emit. Then assert nothing came through for this path.
	time.Sleep(fsWatchDebounce + 200*time.Millisecond)
	if ev := findFsEvent(getEvents(), "UI-100-locked.md"); ev != nil {
		t.Errorf("expected no event for locked path, got %+v (abs=%s)", ev, abs)
	}
}

func TestNonMdFile_Ignored(t *testing.T) {
	a := fswatchTestApp(t)
	getEvents := recordEmits(t)
	root := t.TempDir()
	stories := makeYukkiTree(t, root)

	if err := a.startFsWatcher(root); err != nil {
		t.Fatalf("startFsWatcher: %v", err)
	}
	defer func() { _ = a.stopFsWatcher(root) }()

	for _, name := range []string{".gitkeep", "notes.txt", ".DS_Store"} {
		if err := os.WriteFile(filepath.Join(stories, name), []byte("x"), 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}

	time.Sleep(fsWatchDebounce + 200*time.Millisecond)
	for _, name := range []string{".gitkeep", "notes.txt", ".DS_Store"} {
		if ev := findFsEvent(getEvents(), name); ev != nil {
			t.Errorf("expected no event for non-.md file %s, got %+v", name, ev)
		}
	}
}

func TestDebounce_GroupsRapidEvents(t *testing.T) {
	a := fswatchTestApp(t)
	getEvents := recordEmits(t)
	root := t.TempDir()
	stories := makeYukkiTree(t, root)

	if err := a.startFsWatcher(root); err != nil {
		t.Fatalf("startFsWatcher: %v", err)
	}
	defer func() { _ = a.stopFsWatcher(root) }()

	// Write 5 .md files in rapid succession.
	for i := 0; i < 5; i++ {
		name := filepath.Join(stories, "UI-"+string(rune('A'+i))+".md")
		if err := os.WriteFile(name, []byte("x"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
	}

	// Wait for the debounce flush + margin.
	time.Sleep(fsWatchDebounce + 300*time.Millisecond)

	// Count distinct paths emitted. Even if fsnotify emits multiple
	// raw events per write (CREATE then WRITE), the debouncer
	// collapses them per-path so we expect exactly 5 emitted paths
	// for our 5 files.
	seen := make(map[string]struct{})
	for _, ev := range getEvents() {
		if ev.name != eventFsChanged {
			continue
		}
		p, ok := ev.payload[0].(FsChangedPayload)
		if !ok {
			continue
		}
		seen[p.Path] = struct{}{}
	}
	if len(seen) != 5 {
		t.Errorf("expected 5 distinct emitted paths, got %d (%v)", len(seen), seen)
	}
}

func TestMapFsnotifyOp_Priority(t *testing.T) {
	cases := []struct {
		name string
		in   fsnotify.Op
		want FsChangeKind
	}{
		{"remove", fsnotify.Remove, FsDelete},
		{"rename", fsnotify.Rename, FsRename},
		{"create", fsnotify.Create, FsCreate},
		{"write", fsnotify.Write, FsModify},
		{"create+write", fsnotify.Create | fsnotify.Write, FsCreate},
		{"remove+rename", fsnotify.Remove | fsnotify.Rename, FsDelete},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := mapFsnotifyOp(tc.in)
			if got != tc.want {
				t.Errorf("got %s, want %s", got, tc.want)
			}
		})
	}
}
