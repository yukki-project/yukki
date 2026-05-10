package uiapp

import "path/filepath"

// editLocks holds the set of absolute paths currently in edit mode in
// the SpddEditor. The fsWatcher consults this set and drops events on
// locked paths to avoid the self-write loop : Ctrl+S, Accept
// restructuration (UI-019), Terminer trigger a write that would
// otherwise re-fire a refresh and reset the editState.
//
// The set is stored on App.editLocks (sync.Map[string]struct{}) where
// keys are absolute paths. Acquire / release / read are all O(1)
// amortised and lock-free for reads (sync.Map semantics).

// acquireEditLock registers absPath in editLocks. Idempotent : a
// second call on the same path is a no-op.
func (a *App) acquireEditLock(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	a.editLocks.Store(abs, struct{}{})
	return nil
}

// releaseEditLock removes absPath from editLocks. Idempotent (no-op
// when the path is unknown).
func (a *App) releaseEditLock(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	a.editLocks.Delete(abs)
	return nil
}

// isEditLocked reports whether absPath is currently in editLocks.
// Used by the fsWatch debouncer to filter out self-writes.
func (a *App) isEditLocked(absPath string) bool {
	_, ok := a.editLocks.Load(absPath)
	return ok
}
