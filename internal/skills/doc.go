// Package skills embeds the 14 SPDD skill files (7 Claude + 7 Copilot)
// and exposes them as a list of SkillEntry values ready to be written
// to a project directory by [InitializeYukki].
//
// The files in embedded/ are canonical copies of the source skills:
//
//	.claude/commands/yukki-*.md          → embedded/claude/yukki-*.md
//	.github/skills/yukki-*/SKILL.md      → embedded/copilot/yukki-*.md
//
// To re-synchronise the copies after editing the sources, run:
//
//	go generate ./internal/skills/...
package skills
