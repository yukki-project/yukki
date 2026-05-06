// Package uiapp â€” bindings.go : new multi-project Wails bindings.
//
// Introduced by UI-009 (multi-project File menu + tabs).
// All mutations to openedProjects / activeIndex / recentProjects are
// protected by a.mu.
package uiapp

import (
	"fmt"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// SelectDirectory opens a native directory-picker dialog and returns the
// chosen path. Returns ("", nil) if the user cancels. Unlike OpenProject it
// does not validate the .yukki/ tree — callers use it to obtain a path before
// deciding whether to open or initialise the project.
func (a *App) SelectDirectory() (string, error) {
	path, err := openDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select project directory",
	})
	if err != nil {
		return "", fmt.Errorf("select directory: %w", err)
	}
	return path, nil
}

// OpenProject opens a yukki project from the given path.  If path is "",
// a native directory-picker dialog is presented to the user.
//
// Behaviour:
//  1. If path == "", open openDirectoryDialog.  Empty selection â†’ ({}, nil).
//  2. canonicalizePath â†’ canonical absolute path.
//  3. Dedup: if that path is already open â†’ SwitchProject + return its meta.
//  4. Cap check: ErrTooManyProjects if maxOpenedProjects reached.
//  5. newOpenedProject â†’ returns ErrNoYukki if .yukki/ absent.
//  6. Append + set activeIndex, update recentProjects, saveRegistry, emit.
func (a *App) OpenProject(path string) (ProjectMeta, error) {
	selected := path
	if selected == "" {
		var err error
		selected, err = openDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
			Title: "Open SPDD project",
		})
		if err != nil {
			return ProjectMeta{}, fmt.Errorf("open directory dialog: %w", err)
		}
		if selected == "" {
			// user cancelled
			return ProjectMeta{}, nil
		}
	}

	canon, err := canonicalizePath(selected)
	if err != nil {
		return ProjectMeta{}, err
	}

	// Dedup: activate existing tab if already open.
	a.mu.RLock()
	for i, p := range a.openedProjects {
		if pathsEqual(p.Path, canon) {
			a.mu.RUnlock()
			if swErr := a.SwitchProject(i); swErr != nil {
				return ProjectMeta{}, swErr
			}
			a.mu.RLock()
			meta := a.openedProjects[i].meta()
			a.mu.RUnlock()
			return meta, nil
		}
	}
	currentLen := len(a.openedProjects)
	a.mu.RUnlock()

	if currentLen >= maxOpenedProjects {
		return ProjectMeta{}, ErrTooManyProjects
	}

	proj, err := newOpenedProject(canon)
	if err != nil {
		return ProjectMeta{}, err
	}

	a.mu.Lock()
	a.openedProjects = append(a.openedProjects, proj)
	a.activeIndex = len(a.openedProjects) - 1
	a.addToRecentLocked(RegistryEntry{Path: proj.Path, Name: proj.Name, LastOpened: proj.LastOpened})
	reg := a.buildRegistryLocked()
	a.mu.Unlock()

	if err := saveRegistry(reg); err != nil && a.logger != nil {
		a.logger.Warn("saveRegistry after OpenProject", "err", err)
	}
	emitEvent(a.ctx, "project:opened", proj.meta())

	if a.logger != nil {
		a.logger.Info("project opened", "path", canon, "name", proj.Name)
	}
	return proj.meta(), nil
}

// CloseProject removes the project at idx from the opened list.
// activeIndex is adjusted to follow the remaining projects.
// Emits "project:closed" with the removed index.
func (a *App) CloseProject(idx int) error {
	a.mu.Lock()
	if idx < 0 || idx >= len(a.openedProjects) {
		a.mu.Unlock()
		return fmt.Errorf("CloseProject: index %d out of range [0, %d)", idx, len(a.openedProjects))
	}
	closed := a.openedProjects[idx]
	a.openedProjects = append(a.openedProjects[:idx], a.openedProjects[idx+1:]...)
	if len(a.openedProjects) == 0 {
		a.activeIndex = -1
	} else {
		if idx <= a.activeIndex {
			a.activeIndex--
		}
		if a.activeIndex < 0 {
			a.activeIndex = 0
		}
	}
	reg := a.buildRegistryLocked()
	a.mu.Unlock()

	if err := saveRegistry(reg); err != nil && a.logger != nil {
		a.logger.Warn("saveRegistry after CloseProject", "err", err)
	}
	emitEvent(a.ctx, "project:closed", idx)

	if a.logger != nil {
		a.logger.Info("project closed", "path", closed.Path, "idx", idx)
	}
	return nil
}

// SwitchProject sets the active project to idx.
// Emits "project:switched" with the newly active project's meta.
func (a *App) SwitchProject(idx int) error {
	a.mu.Lock()
	if idx < 0 || idx >= len(a.openedProjects) {
		a.mu.Unlock()
		return fmt.Errorf("SwitchProject: index %d out of range [0, %d)", idx, len(a.openedProjects))
	}
	a.activeIndex = idx
	meta := a.openedProjects[idx].meta()
	a.mu.Unlock()

	emitEvent(a.ctx, "project:switched", meta)

	if a.logger != nil {
		a.logger.Info("project switched", "idx", idx, "path", meta.Path)
	}
	return nil
}

// ListOpenedProjects returns the ordered list of open projects as
// ProjectMeta values (one per tab in the UI).
func (a *App) ListOpenedProjects() []ProjectMeta {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]ProjectMeta, len(a.openedProjects))
	for i, p := range a.openedProjects {
		out[i] = p.meta()
	}
	return out
}

// ReorderProjects reorders the opened-project slice according to order,
// which must be a valid permutation of [0, len(openedProjects)).
// activeIndex is updated to follow the previously active project.
func (a *App) ReorderProjects(order []int) error {
	a.mu.Lock()

	n := len(a.openedProjects)
	if len(order) != n {
		a.mu.Unlock()
		return ErrInvalidOrder
	}
	seen := make([]bool, n)
	for _, v := range order {
		if v < 0 || v >= n || seen[v] {
			a.mu.Unlock()
			return ErrInvalidOrder
		}
		seen[v] = true
	}

	reordered := make([]*OpenedProject, n)
	newActive := -1
	for newIdx, oldIdx := range order {
		reordered[newIdx] = a.openedProjects[oldIdx]
		if oldIdx == a.activeIndex {
			newActive = newIdx
		}
	}
	a.openedProjects = reordered
	a.activeIndex = newActive
	reg := a.buildRegistryLocked()
	a.mu.Unlock()

	if err := saveRegistry(reg); err != nil && a.logger != nil {
		a.logger.Warn("saveRegistry after ReorderProjects", "err", err)
	}
	return nil
}

// LoadRegistry returns the raw ProjectsRegistry from disk (used by the
// frontend to hydrate useTabsStore on startup).
func (a *App) LoadRegistry() (ProjectsRegistry, error) {
	reg, err := loadRegistry()
	if err != nil {
		return ProjectsRegistry{}, err
	}
	return *reg, nil
}

// ListRecentProjects returns recent projects from the in-memory list,
// excluding any project that is currently open (max maxRecentProjects).
func (a *App) ListRecentProjects() ([]ProjectMeta, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var out []ProjectMeta
	for _, entry := range a.recentProjects {
		alreadyOpen := false
		for _, p := range a.openedProjects {
			if pathsEqual(p.Path, entry.Path) {
				alreadyOpen = true
				break
			}
		}
		if !alreadyOpen {
			out = append(out, ProjectMeta{
				Path:       entry.Path,
				Name:       entry.Name,
				LastOpened: entry.LastOpened,
			})
		}
	}
	return out, nil
}

// addToRecentLocked prepends entry to a.recentProjects, deduplicates,
// and caps the list at maxRecentProjects.  Must be called with a.mu held.
func (a *App) addToRecentLocked(entry RegistryEntry) {
	filtered := make([]RegistryEntry, 0, len(a.recentProjects))
	for _, r := range a.recentProjects {
		if !pathsEqual(r.Path, entry.Path) {
			filtered = append(filtered, r)
		}
	}
	a.recentProjects = append([]RegistryEntry{entry}, filtered...)
	if len(a.recentProjects) > maxRecentProjects {
		a.recentProjects = a.recentProjects[:maxRecentProjects]
	}
}

// buildRegistryLocked constructs a ProjectsRegistry from the current
// in-memory state.  Must be called with a.mu held (read or write).
func (a *App) buildRegistryLocked() *ProjectsRegistry {
	reg := &ProjectsRegistry{
		Version:     registryVersion,
		ActiveIndex: a.activeIndex,
	}
	for _, p := range a.openedProjects {
		reg.OpenedProjects = append(reg.OpenedProjects, RegistryEntry{
			Path:       p.Path,
			Name:       p.Name,
			LastOpened: p.LastOpened,
		})
	}
	if reg.OpenedProjects == nil {
		reg.OpenedProjects = []RegistryEntry{}
	}
	recent := make([]RegistryEntry, len(a.recentProjects))
	copy(recent, a.recentProjects)
	reg.RecentProjects = recent
	return reg
}

// restoreRegistry is called by OnStartup.  It reads projects.json and
// reopens each saved project.  Missing paths are silently skipped (AC6).
func (a *App) restoreRegistry() {
	reg, err := loadRegistry()
	if err != nil && a.logger != nil {
		a.logger.Warn("restoreRegistry: loadRegistry failed", "err", err)
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	a.recentProjects = reg.RecentProjects

	for _, entry := range reg.OpenedProjects {
		proj, err := newOpenedProject(entry.Path)
		if err != nil {
			if a.logger != nil {
				a.logger.Info("restoreRegistry: project not found, skipping",
					"path", entry.Path, "err", err)
			}
			emitEvent(a.ctx, "project:not-found", filepath.Base(entry.Path))
			continue
		}
		proj.LastOpened = entry.LastOpened
		a.openedProjects = append(a.openedProjects, proj)
	}

	if len(a.openedProjects) == 0 {
		a.activeIndex = -1
	} else {
		a.activeIndex = reg.ActiveIndex
		if a.activeIndex >= len(a.openedProjects) {
			a.activeIndex = len(a.openedProjects) - 1
		}
		if a.activeIndex < 0 {
			a.activeIndex = 0
		}
	}
}

// persistRegistry is called by OnShutdown.  Saves the current in-memory
// state to projects.json.  Errors are logged but do not block shutdown.
func (a *App) persistRegistry() {
	a.mu.RLock()
	reg := a.buildRegistryLocked()
	a.mu.RUnlock()

	if err := saveRegistry(reg); err != nil && a.logger != nil {
		a.logger.Warn("persistRegistry: saveRegistry failed", "err", err)
	}
}

