//go:build mock
// +build mock

// Mock provider factory: used during `wails dev -tags mock` to develop
// the frontend without invoking Claude (no token burn, deterministic).
// Implements O2 of the UI-001a canvas (mock branch, build tag `mock`).
//
// UI-001c : returns a deterministic stub story so App.RunStory can be
// exercised end-to-end without Claude — Writer.ValidateFrontmatter
// accepts the response, the file is written, the modal can demonstrate
// the success flow.

package main

import (
	"log/slog"

	"github.com/yukki-project/yukki/internal/provider"
)

const mockStoryStub = `---
id: STORY-001
slug: mock-generated-story
title: Mock generated story
status: draft
created: 2026-05-02
updated: 2026-05-02
owner: yukki-mock
---

# Mock generated story

This is a deterministic stub produced by ` + "`provider.MockProvider`" + ` in
build ` + "`-tags mock`" + ` builds. The real Claude provider is swapped in
when the binary is built without the ` + "`mock`" + ` tag.

## Background

This mock response lets the UI exercise ` + "`App.RunStory`" + ` end-to-end
without burning Claude tokens.

## Acceptance Criteria

- The generated story passes ` + "`ValidateFrontmatter`" + `.
- The hub displays the new story after refresh.
- The viewer renders the markdown.
`

// newProvider returns a MockProvider for development builds.
//
// The mock is configured to return mockStoryStub on Generate, which
// passes ValidateFrontmatter and lets the UI demonstrate a successful
// /yukki-story round-trip without Claude.
func newProvider(logger *slog.Logger) provider.Provider {
	return &provider.MockProvider{
		NameVal:  "mock",
		Response: mockStoryStub,
	}
}
