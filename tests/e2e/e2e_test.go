// Package e2e_test runs the yukki binary end to end with a fake claude
// subprocess. The test builds both yukki and the fake binary into a temp
// dir, prepends that dir to PATH, and exercises the full CLI flow.
//
// Skipped when the `go` toolchain is not on PATH.
package e2e_test

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

type binaries struct {
	yukki      string
	fakeClaude string
	pathEntry  string
}

func mustBuild(t *testing.T) binaries {
	t.Helper()
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go toolchain not available on PATH")
	}

	repoRoot, err := repoRoot()
	if err != nil {
		t.Fatalf("locate repo root: %v", err)
	}

	binDir := t.TempDir()
	yukkiBin := filepath.Join(binDir, "yukki")
	fakeBin := filepath.Join(binDir, "claude") // must be named "claude" so yukki's default Binary finds it
	if runtime.GOOS == "windows" {
		yukkiBin += ".exe"
		fakeBin += ".exe"
	}

	build := func(out, pkg string) {
		t.Helper()
		cmd := exec.Command("go", "build", "-o", out, pkg)
		cmd.Dir = repoRoot
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			t.Fatalf("go build %s: %v", pkg, err)
		}
	}
	build(yukkiBin, ".")
	build(fakeBin, "./tests/e2e/fakeclaude")

	return binaries{yukki: yukkiBin, fakeClaude: fakeBin, pathEntry: binDir}
}

// repoRoot walks up from the test's working directory until it finds a go.mod.
func repoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir := wd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}

func runYukki(t *testing.T, b binaries, cwd string, args ...string) (stdout, stderr string, exit int) {
	t.Helper()

	// Prepend our test-bin dir to PATH so yukki picks our fake "claude".
	origPath := os.Getenv("PATH")
	pathSep := string(os.PathListSeparator)
	cmd := exec.Command(b.yukki, args...)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "PATH="+b.pathEntry+pathSep+origPath)

	var outBuf, errBuf strings.Builder
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if asExit(err, &exitErr) {
			return outBuf.String(), errBuf.String(), exitErr.ExitCode()
		}
		t.Fatalf("yukki failed to run: %v\nstderr: %s", err, errBuf.String())
	}
	return outBuf.String(), errBuf.String(), 0
}

func asExit(err error, target **exec.ExitError) bool {
	e, ok := err.(*exec.ExitError)
	if ok {
		*target = e
	}
	return ok
}

func TestE2E_StoryHappyPath(t *testing.T) {
	b := mustBuild(t)

	cwd := t.TempDir()
	stdout, stderr, code := runYukki(t, b, cwd, "story", "implement an end-to-end yukki test")
	if code != 0 {
		t.Fatalf("expected exit 0, got %d\nstdout: %s\nstderr: %s", code, stdout, stderr)
	}

	produced := strings.TrimSpace(stdout)
	if produced == "" {
		t.Fatalf("expected stdout to contain the produced file path, got empty\nstderr: %s", stderr)
	}
	if !strings.Contains(produced, "stories") {
		t.Fatalf("expected produced path to be under stories/, got %q", produced)
	}

	data, err := os.ReadFile(produced)
	if err != nil {
		t.Fatalf("read produced file: %v", err)
	}
	got := string(data)
	if !strings.Contains(got, "E2E Generated Story") {
		t.Fatalf("expected canned title in produced file, got\n%s", got)
	}
	if !strings.HasPrefix(got, "---\n") {
		t.Fatalf("expected frontmatter prefix, got %q", got[:min(len(got), 50)])
	}
}

func TestE2E_StoryRejectsEmptyDescription(t *testing.T) {
	b := mustBuild(t)
	cwd := t.TempDir()
	_, _, code := runYukki(t, b, cwd, "story")
	if code != 1 {
		t.Fatalf("expected exit code 1 (user error), got %d", code)
	}

	if entries, err := os.ReadDir(filepath.Join(cwd, "stories")); err == nil && len(entries) > 0 {
		t.Fatalf("expected no file produced on user error, got %d", len(entries))
	}
}

func TestE2E_ClaudeNotFoundReportsProviderExitCode(t *testing.T) {
	b := mustBuild(t)
	cwd := t.TempDir()

	// Override PATH to NOT include our fake claude — yukki should fail with
	// the provider exit code (2).
	origPath := os.Getenv("PATH")
	defer os.Setenv("PATH", origPath)

	cmd := exec.Command(b.yukki, "story", "any description")
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "PATH=") // empty PATH ⇒ no claude reachable
	var outBuf, errBuf strings.Builder
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	err := cmd.Run()

	exitCode := 0
	if err != nil {
		var exitErr *exec.ExitError
		if asExit(err, &exitErr) {
			exitCode = exitErr.ExitCode()
		}
	}
	if exitCode != 2 {
		t.Fatalf("expected exit code 2 (provider error), got %d\nstdout: %s\nstderr: %s",
			exitCode, outBuf.String(), errBuf.String())
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
