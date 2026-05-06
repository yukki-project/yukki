// Package uiapp — registry.go : OpenedProject entity, persistence layer
// (ProjectsRegistry ↔ <userConfigDir>/yukki/projects.json), and path helpers.
//
// Introduced by UI-009 (multi-project File menu + tabs).
package uiapp

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/templates"
)

// Sentinel errors returned by OpenProject and friends.
var (
	// ErrNoYukki is returned by OpenProject when the selected directory
	// has no .yukki/ subtree.  The frontend uses it to trigger the
	// "Initialize / Cancel" dialog (AC5).
	ErrNoYukki = errors.New("directory has no .yukki subtree")

	// ErrTooManyProjects is returned by OpenProject when the cap of
	// simultaneously open projects (maxOpenedProjects) is reached.
	ErrTooManyProjects = errors.New("too many projects open (max 20)")

	// ErrInvalidOrder is returned by ReorderProjects when the supplied
	// index slice is not a valid permutation.
	ErrInvalidOrder = errors.New("invalid project reorder: not a permutation")
)

const (
	registryVersion   = 1
	maxOpenedProjects = 20
	maxRecentProjects = 10
)

// OpenedProject holds the in-memory state of a yukki project that is
// open in the current session.  The loader and writer fields are
// unexported; callers access them via App methods.
type OpenedProject struct {
	Path       string
	Name       string
	LastOpened time.Time
	loader     *templates.Loader
	writer     *artifacts.Writer
}

// ProjectMeta is the serialisable projection of OpenedProject returned
// to the Wails frontend (JSON / auto-generated TypeScript binding).
type ProjectMeta struct {
	Path       string    `json:"path"`
	Name       string    `json:"name"`
	LastOpened time.Time `json:"lastOpened"`
}

// RegistryEntry is a single row stored in projects.json (opened or
// recent list).
type RegistryEntry struct {
	Path       string    `json:"path"`
	Name       string    `json:"name"`
	LastOpened time.Time `json:"last_opened"`
}

// ProjectsRegistry is the root object of projects.json.
type ProjectsRegistry struct {
	Version        int             `json:"version"`
	ActiveIndex    int             `json:"active_index"`
	OpenedProjects []RegistryEntry `json:"opened_projects"`
	RecentProjects []RegistryEntry `json:"recent_projects"`
}

func (p *OpenedProject) meta() ProjectMeta {
	return ProjectMeta{
		Path:       p.Path,
		Name:       p.Name,
		LastOpened: p.LastOpened,
	}
}

// registryPath returns the absolute path to projects.json and ensures
// the parent directory exists (mode 0o700).
func registryPath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("user config dir: %w", err)
	}
	dir := filepath.Join(base, "yukki")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("create config dir %s: %w", dir, err)
	}
	return filepath.Join(dir, "projects.json"), nil
}

// loadRegistry reads projects.json with three graceful-degradation paths:
//   - file absent          → empty registry, no error
//   - JSON invalid         → corrupt file renamed .broken.bak, empty registry, no error
//   - version ≠ 1          → log warn, empty registry, no error
func loadRegistry() (*ProjectsRegistry, error) {
	path, err := registryPath()
	if err != nil {
		return emptyRegistry(), err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return emptyRegistry(), nil
	}
	if err != nil {
		return emptyRegistry(), fmt.Errorf("read registry: %w", err)
	}
	var reg ProjectsRegistry
	if err := json.Unmarshal(data, &reg); err != nil {
		bak := path + ".broken.bak"
		_ = os.Rename(path, bak)
		slog.Warn("registry corrupted; starting empty", "backup", bak)
		return emptyRegistry(), nil
	}
	if reg.Version != registryVersion {
		slog.Warn("registry version unknown; starting empty", "version", reg.Version)
		return emptyRegistry(), nil
	}
	return &reg, nil
}

func emptyRegistry() *ProjectsRegistry {
	return &ProjectsRegistry{
		Version:        registryVersion,
		ActiveIndex:    -1,
		OpenedProjects: []RegistryEntry{},
		RecentProjects: []RegistryEntry{},
	}
}

// saveRegistry serialises reg to projects.json as indented JSON
// (mode 0o600).  The parent directory is created if absent.
func saveRegistry(reg *ProjectsRegistry) error {
	path, err := registryPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(reg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal registry: %w", err)
	}
	return os.WriteFile(path, data, 0o600)
}

// newOpenedProject canonicalises path, verifies a .yukki/ subtree
// exists, and initialises the loader and writer.  Returns ErrNoYukki
// if the directory lacks a .yukki/ subtree.
func newOpenedProject(path string) (*OpenedProject, error) {
	canon, err := canonicalizePath(path)
	if err != nil {
		return nil, err
	}
	yukkiDir := filepath.Join(canon, artifacts.ProjectDirName)
	if _, err := os.Stat(yukkiDir); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrNoYukki
		}
		return nil, fmt.Errorf("stat .yukki: %w", err)
	}
	return &OpenedProject{
		Path:       canon,
		Name:       filepath.Base(canon),
		LastOpened: time.Now(),
		loader:     templates.NewLoader(canon),
		writer:     artifacts.NewWriter(filepath.Join(canon, artifacts.ProjectDirName, "stories")),
	}, nil
}

// canonicalizePath resolves the path to a canonical absolute form via
// filepath.Abs + filepath.EvalSymlinks + filepath.Clean.  If EvalSymlinks
// fails (e.g. the directory does not yet exist), the cleaned Abs path is
// returned without error.
func canonicalizePath(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("abs path: %w", err)
	}
	resolved, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return filepath.Clean(abs), nil
	}
	return filepath.Clean(resolved), nil
}

// hasYukkiPrefix reports whether absPath falls under the .yukki/
// directory of any of the given projects.  The prefix includes the
// trailing path separator to prevent false positives
// (e.g. .yukki-evil/ must not match .yukki/).
// On Windows the comparison is case-insensitive (strings.EqualFold).
func hasYukkiPrefix(absPath string, projects []*OpenedProject) bool {
	for _, p := range projects {
		prefix := filepath.Join(p.Path, artifacts.ProjectDirName) + string(filepath.Separator)
		if goruntime.GOOS == "windows" {
			if len(absPath) >= len(prefix) && strings.EqualFold(absPath[:len(prefix)], prefix) {
				return true
			}
		} else {
			if strings.HasPrefix(absPath, prefix) {
				return true
			}
		}
	}
	return false
}

// pathsEqual compares two canonical paths for equality.  On Windows the
// comparison is case-insensitive via strings.EqualFold.
func pathsEqual(a, b string) bool {
	if goruntime.GOOS == "windows" {
		return strings.EqualFold(a, b)
	}
	return a == b
}
