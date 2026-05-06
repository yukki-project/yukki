package skills

import (
	"embed"
	"path/filepath"
	"strings"
)

//go:embed embedded/claude embedded/copilot
var embeddedFS embed.FS

// SkillEntry is a skill file to be written to a project directory.
type SkillEntry struct {
	// DestPath is the path relative to the project root where the skill
	// should be written (e.g. ".claude/commands/yukki-story.md").
	DestPath string
	// Content is the raw file content from the embedded FS.
	Content []byte
}

// Entries returns the list of all embedded skill entries with their
// destination paths relative to the project root. The list is stable
// (alphabetical within each provider group: claude first, then copilot).
//
// Safeguard: every DestPath is a clean relative path without ".." components.
func Entries() []SkillEntry {
	var entries []SkillEntry

	// Claude skills → .claude/commands/<name>
	claudeFiles, _ := embeddedFS.ReadDir("embedded/claude")
	for _, f := range claudeFiles {
		if f.IsDir() {
			continue
		}
		data, err := embeddedFS.ReadFile("embedded/claude/" + f.Name())
		if err != nil {
			continue
		}
		entries = append(entries, SkillEntry{
			DestPath: filepath.Join(".claude", "commands", f.Name()),
			Content:  data,
		})
	}

	// Copilot skills → .github/skills/<slug>/SKILL.md
	// File names follow the pattern yukki-<slug>.md; strip the extension
	// to derive the skill directory name.
	copilotFiles, _ := embeddedFS.ReadDir("embedded/copilot")
	for _, f := range copilotFiles {
		if f.IsDir() {
			continue
		}
		data, err := embeddedFS.ReadFile("embedded/copilot/" + f.Name())
		if err != nil {
			continue
		}
		skillDir := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
		entries = append(entries, SkillEntry{
			DestPath: filepath.Join(".github", "skills", skillDir, "SKILL.md"),
			Content:  data,
		})
	}

	return entries
}
