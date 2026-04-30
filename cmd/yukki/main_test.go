package main

import (
	"errors"
	"strings"
	"testing"

	"github.com/yukki-project/yukki/internal/artifacts"
	"github.com/yukki-project/yukki/internal/provider"
	"github.com/yukki-project/yukki/internal/templates"
	"github.com/yukki-project/yukki/internal/workflow"
)

func TestMapErrorToExitCode(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{"nil", nil, exitSuccess},
		{"empty description", workflow.ErrEmptyDescription, exitUserErr},
		{"invalid prefix", artifacts.ErrInvalidPrefix, exitUserErr},
		{"provider not found", provider.ErrNotFound, exitProvider},
		{"provider version", provider.ErrVersionIncompatible, exitProvider},
		{"provider generation", provider.ErrGenerationFailed, exitProvider},
		{"invalid frontmatter", artifacts.ErrInvalidFrontmatter, exitIO},
		{"embed missing", templates.ErrEmbedMissing, exitIO},
		{"unknown", errors.New("unknown"), exitIO},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := mapErrorToExitCode(tc.err)
			if got != tc.want {
				t.Fatalf("got %d, want %d", got, tc.want)
			}
		})
	}
}

func TestReadDescription_FromArgs(t *testing.T) {
	got, err := readDescription([]string{"hello world"}, strings.NewReader(""))
	if err != nil {
		t.Fatal(err)
	}
	if got != "hello world" {
		t.Fatalf("got %q", got)
	}
}

func TestReadDescription_FromStdin(t *testing.T) {
	got, err := readDescription(nil, strings.NewReader("piped content"))
	if err != nil {
		t.Fatal(err)
	}
	if got != "piped content" {
		t.Fatalf("got %q", got)
	}
}

func TestReadDescription_EmptyArgsAndNoStdin(t *testing.T) {
	got, err := readDescription(nil, strings.NewReader(""))
	if err != nil {
		t.Fatal(err)
	}
	if got != "" {
		t.Fatalf("expected empty, got %q", got)
	}
}

func TestNewRootCmd_HasStorySubcommand(t *testing.T) {
	root := newRootCmd()
	var found bool
	for _, c := range root.Commands() {
		if c.Name() == "story" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected 'story' subcommand on root")
	}
}
