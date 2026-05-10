package uiapp

import (
	"path/filepath"
	"testing"
)

func TestAcquireRelease_Roundtrip(t *testing.T) {
	a := &App{}
	abs, _ := filepath.Abs("foo/bar.md")

	if a.isEditLocked(abs) {
		t.Fatalf("expected not locked initially")
	}
	if err := a.acquireEditLock("foo/bar.md"); err != nil {
		t.Fatalf("acquire: %v", err)
	}
	if !a.isEditLocked(abs) {
		t.Errorf("expected locked after acquire")
	}
	if err := a.releaseEditLock("foo/bar.md"); err != nil {
		t.Fatalf("release: %v", err)
	}
	if a.isEditLocked(abs) {
		t.Errorf("expected not locked after release")
	}
}

func TestAcquire_Idempotent(t *testing.T) {
	a := &App{}
	abs, _ := filepath.Abs("x.md")

	if err := a.acquireEditLock("x.md"); err != nil {
		t.Fatalf("first acquire: %v", err)
	}
	if err := a.acquireEditLock("x.md"); err != nil {
		t.Fatalf("second acquire: %v", err)
	}
	if !a.isEditLocked(abs) {
		t.Errorf("still locked after 2 acquires")
	}
	if err := a.releaseEditLock("x.md"); err != nil {
		t.Fatalf("release: %v", err)
	}
	if a.isEditLocked(abs) {
		t.Errorf("single release must clear the lock (no refcount)")
	}
}

func TestRelease_OnUnlocked_NoError(t *testing.T) {
	a := &App{}
	if err := a.releaseEditLock("never-acquired.md"); err != nil {
		t.Errorf("release on unknown path must not error, got %v", err)
	}
}

func TestAcquire_NormalizesPath(t *testing.T) {
	a := &App{}
	rel := "./sub/x.md"
	abs, _ := filepath.Abs(rel)

	if err := a.acquireEditLock(rel); err != nil {
		t.Fatalf("acquire: %v", err)
	}
	if !a.isEditLocked(abs) {
		t.Errorf("expected lookup with absolute path to succeed after relative acquire")
	}
}
