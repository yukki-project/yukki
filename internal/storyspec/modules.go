// Package storyspec — O4 of the CORE-007 canvas: known-modules loader with
// embed fallback.
package storyspec

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

//go:embed default-modules.yaml
var defaultModulesFS embed.FS

type modulesFile struct {
	Modules []string `yaml:"modules"`
}

// LoadKnownModules loads the list of recognised module names.
//
// Resolution order:
//  1. <projectDir>/.yukki/modules.yaml — project-local overrides
//  2. embedded default-modules.yaml — shipped with the binary
//
// Returns an error only when the file exists but cannot be parsed.
func LoadKnownModules(projectDir string) ([]string, error) {
	// 1. Project-local file
	if projectDir != "" {
		path := filepath.Join(projectDir, ".yukki", "modules.yaml")
		data, err := os.ReadFile(path)
		if err == nil {
			return parseModulesYAML(data, path)
		}
		if !errors.Is(err, fs.ErrNotExist) {
			return nil, fmt.Errorf("storyspec: read %s: %w", path, err)
		}
		// file absent → fall through to embed
	}

	// 2. Embedded default
	data, err := defaultModulesFS.ReadFile("default-modules.yaml")
	if err != nil {
		return nil, fmt.Errorf("storyspec: read embedded default-modules.yaml: %w", err)
	}
	return parseModulesYAML(data, "default-modules.yaml")
}

func parseModulesYAML(data []byte, source string) ([]string, error) {
	var mf modulesFile
	if err := yaml.Unmarshal(data, &mf); err != nil {
		return nil, fmt.Errorf("storyspec: parse %s: %w", source, err)
	}
	return mf.Modules, nil
}
