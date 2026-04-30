// Command fakeclaude is a minimal stand-in for the real `claude` CLI used
// by the yukki end-to-end tests. It supports just the subset that yukki
// invokes:
//
//	fakeclaude --version           # prints "fakeclaude 0.0.1"
//	fakeclaude --print < prompt    # reads stdin, prints a canned story
//
// Build the binary into the test PATH before running the e2e suite.
package main

import (
	"fmt"
	"io"
	"os"
)

const cannedStory = `---
id: STORY-001
slug: e2e-generated-story
title: E2E Generated Story
status: draft
created: 2026-04-30
updated: 2026-04-30
owner: TBD
modules:
  - cmd/yukki
---

# E2E Generated Story

This story was produced by the fake claude binary used in yukki's
end-to-end tests. The yukki CLI built from source executed this binary
as a subprocess via the standard provider abstraction.

## Acceptance Criteria

### AC1
- Given the yukki binary is built and on PATH
- When ` + "`" + `yukki story` + "`" + ` is invoked with a description
- Then a frontmatter-valid markdown file lands in stories/
`

func main() {
	if len(os.Args) < 2 {
		os.Exit(0)
	}
	switch os.Args[1] {
	case "--version":
		fmt.Println("fakeclaude 0.0.1")
	case "--print":
		// Drain stdin; we do not use the prompt content in this fake.
		_, _ = io.Copy(io.Discard, os.Stdin)
		fmt.Print(cannedStory)
	default:
		fmt.Fprintln(os.Stderr, "fakeclaude: unsupported arg", os.Args[1])
		os.Exit(2)
	}
}
