// Package promptbuilder — O3 of the CORE-008 canvas: section definitions loader.
package promptbuilder

import (
	_ "embed"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

//go:embed default-section-defs.yaml
var defaultSectionDefs []byte

// LoadSectionDefs loads section definitions from
// <projectDir>/.yukki/methodology/section-definitions.yaml.
// Falls back to the embedded default-section-defs.yaml when the file is
// absent or projectDir is empty.
func LoadSectionDefs(projectDir string) (SectionDefinitions, error) {
	if projectDir != "" {
		path := filepath.Join(projectDir, ".yukki", "methodology", "section-definitions.yaml")
		if data, err := os.ReadFile(path); err == nil {
			var defs SectionDefinitions
			if err := yaml.Unmarshal(data, &defs); err == nil {
				return defs, nil
			}
		}
	}
	var defs SectionDefinitions
	if err := yaml.Unmarshal(defaultSectionDefs, &defs); err != nil {
		return nil, err
	}
	return defs, nil
}
