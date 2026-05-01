package workflow

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
)

const stubStory = `---
id: STORY-001
slug: stub
title: My Stub Story
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# My Stub Story

Body.
`

func newOpts(t *testing.T, mock *provider.MockProvider, dir, desc, prefix string) StoryOptions {
	t.Helper()
	return StoryOptions{
		Description:    desc,
		Prefix:         prefix,
		Provider:       mock,
		TemplateLoader: templates.NewLoader(dir),
		Writer:         artifacts.NewWriter(filepath.Join(dir, "stories")),
	}
}

func TestRunStory_HappyPath(t *testing.T) {
	dir := t.TempDir()
	mock := &provider.MockProvider{Response: stubStory}

	opts := newOpts(t, mock, dir, "any description", "STORY")
	path, err := RunStory(context.Background(), opts)
	if err != nil {
		t.Fatalf("RunStory: %v", err)
	}
	expected := filepath.Join(dir, "stories", "STORY-001-my-stub-story.md")
	if path != expected {
		t.Fatalf("expected path %s, got %s", expected, path)
	}
	if got, _ := os.ReadFile(path); string(got) != stubStory {
		t.Fatalf("file content mismatch")
	}
	if len(mock.Calls) != 1 {
		t.Fatalf("expected provider called once, got %d", len(mock.Calls))
	}
	if !strings.Contains(mock.Calls[0], "STORY-001") {
		t.Fatalf("expected prompt to contain assigned id, got prompt of %d bytes", len(mock.Calls[0]))
	}
}

func TestRunStory_EmptyDescription(t *testing.T) {
	dir := t.TempDir()
	opts := newOpts(t, &provider.MockProvider{}, dir, "   ", "STORY")
	_, err := RunStory(context.Background(), opts)
	if !errors.Is(err, ErrEmptyDescription) {
		t.Fatalf("expected ErrEmptyDescription, got %v", err)
	}
}

func TestRunStory_InvalidPrefix(t *testing.T) {
	dir := t.TempDir()
	opts := newOpts(t, &provider.MockProvider{}, dir, "desc", "lowercase")
	_, err := RunStory(context.Background(), opts)
	if !errors.Is(err, artifacts.ErrInvalidPrefix) {
		t.Fatalf("expected ErrInvalidPrefix, got %v", err)
	}
}

func TestRunStory_ProviderVersionFailureBlocks(t *testing.T) {
	dir := t.TempDir()
	mock := &provider.MockProvider{
		CheckErr: provider.ErrNotFound,
		Response: stubStory,
	}
	opts := newOpts(t, mock, dir, "desc", "STORY")
	_, err := RunStory(context.Background(), opts)
	if !errors.Is(err, provider.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if len(mock.Calls) != 0 {
		t.Fatal("provider.Generate must not be called when CheckVersion fails")
	}
}

func TestRunStory_InvalidGeneratedFrontmatterRejected(t *testing.T) {
	dir := t.TempDir()
	mock := &provider.MockProvider{Response: "no frontmatter at all"}
	opts := newOpts(t, mock, dir, "desc", "STORY")
	_, err := RunStory(context.Background(), opts)
	if !errors.Is(err, artifacts.ErrInvalidFrontmatter) {
		t.Fatalf("expected ErrInvalidFrontmatter, got %v", err)
	}
}

func TestExtractTitle(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"with frontmatter", stubStory, "My Stub Story"},
		{"no frontmatter", "# Hello World\nBody\n", "Hello World"},
		{"no title", "---\nfoo: bar\n---\n\nBody only\n", ""},
		{"multiline body", stubStory + "## Subsection\n", "My Stub Story"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := extractTitle(tc.in)
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}
