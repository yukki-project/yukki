package artifacts

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"
)

// ErrInvalidKind is returned by ListArtifacts when the `kind` argument
// is not one of the values returned by AllowedKinds().
//
// Cohabits with ErrInvalidPrefix (id.go) and ErrInvalidFrontmatter
// (parser.go) in the artifacts sentinel-error family. Use errors.Is
// to match.
var ErrInvalidKind = errors.New("invalid artifact kind")

// allowedKinds is the immutable whitelist of artifact kinds that
// ListArtifacts accepts. Exposed publicly via the AllowedKinds()
// function which returns a fresh copy on each call.
var allowedKinds = []string{
	"stories",
	"analysis",
	"prompts",
	"tests",
	"inbox",   // META-005
	"epics",   // META-005
	"roadmap", // META-005
}

// Meta is the typed view of a SPDD artifact's frontmatter, as returned
// by ListArtifacts.
//
// A non-nil Error means the artifact's frontmatter could not be parsed;
// the entry is still returned in the list with a usable Path so the
// consumer can flag it (e.g. a "broken" badge in a hub UI) without
// aborting the scan.
//
// Path is absolute when filepath.Abs succeeds (the common case); on
// failure it falls back to the path as-built by filepath.Join.
type Meta struct {
	ID       string `yaml:"id"`
	Slug     string `yaml:"slug"`
	Title    string `yaml:"title"`
	Status   string `yaml:"status"`
	Created  string `yaml:"created"`
	Updated  string `yaml:"updated"`
	Priority int    `yaml:"priority,omitempty"`
	Path     string `yaml:"-"`
	Error    error  `yaml:"-"`
}

// AllowedKinds returns a fresh copy of the artifact-kind whitelist
// (stories, analysis, prompts, tests). Mutations on the returned slice
// do not affect subsequent calls.
func AllowedKinds() []string {
	return slices.Clone(allowedKinds)
}

// ListArtifacts scans <dir>/.yukki/<kind>/*.md, parses the YAML
// frontmatter of each regular file, and returns the typed list sorted
// by Updated desc with ID lexico ascending as fallback.
//
// A corrupted frontmatter on a single file is surfaced via Meta.Error
// and does not abort the scan. An invalid `kind` returns (nil, err)
// where errors.Is(err, ErrInvalidKind) is true. A non-existent dir
// returns (nil, err) wrapping the underlying os error. An empty (or
// all-non-regular) dir returns ([]Meta{}, nil).
//
// ListArtifacts is read-only: it never modifies any file. Sub-directories
// and symlinks under the kind dir are silently ignored (only entries
// satisfying entry.Type().IsRegular() are scanned).
func ListArtifacts(dir, kind string) ([]Meta, error) {
	if !slices.Contains(allowedKinds, kind) {
		return nil, fmt.Errorf("%w: %q (allowed: %v)", ErrInvalidKind, kind, allowedKinds)
	}

	target := filepath.Join(dir, ProjectDirName, kind)
	entries, err := os.ReadDir(target)
	if err != nil {
		return nil, fmt.Errorf("read dir %s: %w", target, err)
	}

	out := []Meta{}
	for _, entry := range entries {
		if !entry.Type().IsRegular() {
			continue
		}
		name := entry.Name()
		if !strings.EqualFold(filepath.Ext(name), ".md") {
			continue
		}

		path := filepath.Join(target, name)
		abs, absErr := filepath.Abs(path)
		if absErr != nil {
			abs = path
		}

		data, readErr := os.ReadFile(path)
		if readErr != nil {
			out = append(out, Meta{Path: abs, Error: readErr})
			continue
		}

		meta, parseErr := ParseFrontmatter[Meta](string(data))
		meta.Path = abs
		if parseErr != nil {
			meta.Error = parseErr
		}
		out = append(out, meta)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Created != out[j].Created {
			return out[i].Created > out[j].Created
		}
		return out[i].Slug < out[j].Slug
	})

	return out, nil
}
