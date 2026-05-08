// UI-015 O1+O2+O3 — Bindings PDF export.
//
// Trois bindings exposés au frontend Wails pour le pipeline d'export
// PDF des artefacts SPDD :
//
//   - SaveFilePdf       — ouvre la dialog système, retourne le path
//                         choisi (ou "" si l'utilisateur annule).
//   - WritePdfFile      — décode un base64 et écrit le binaire au path
//                         choisi (path validé en amont par la dialog).
//   - ResolveCanvasChain — pour un canvas, lit son front-matter et
//                          retourne les paths absolus de la story et
//                          de l'analyse référencées (vides si la
//                          référence est cassée — Invariant I2).
//
// Le couple SaveFilePdf + WritePdfFile sépare l'interaction utilisateur
// (synchrone, OS-bloquante) du transfert binaire (async, peut tronçonner
// si nécessaire). Le frontend appelle SaveFilePdf, génère le blob via
// @react-pdf/renderer côté webview, encode en base64 et appelle
// WritePdfFile — pas de calcul gaspillé en cas d'annulation.

package uiapp

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

// saveFileDialog is a package-level indirection over runtime.SaveFileDialog
// so unit tests can replace it without spinning up a Wails context. Same
// pattern as openDirectoryDialog in app.go.
var saveFileDialog = runtime.SaveFileDialog

// CanvasChain holds the resolved paths of a canvas (prompts/) and its
// parent story / analysis as declared in the canvas front-matter. Empty
// strings mean the reference was missing or the file no longer exists.
// Always echoed: CanvasPath (the canvas itself).
type CanvasChain struct {
	StoryPath    string
	AnalysisPath string
	CanvasPath   string
}

// SaveFilePdf opens a native save-file dialog filtered to *.pdf and
// returns the path the user chose. Empty string means the user
// cancelled (no error). Returns an error if no project is open
// (consistent with ReadArtifact's contract).
func (a *App) SaveFilePdf(suggestedName string) (string, error) {
	if _, err := a.activeProject(); err != nil {
		return "", err
	}
	ctx := a.ctx
	if ctx == nil {
		return "", errors.New("ui context not initialised")
	}
	path, err := saveFileDialog(ctx, runtime.SaveDialogOptions{
		DefaultFilename:      suggestedName,
		CanCreateDirectories: true,
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	return path, nil
}

// WritePdfFile decodes the base64-encoded PDF content and writes it to
// path. Returns an error if path is empty or the decode/write fails.
// The path is trusted as it came from SaveFilePdf (user-validated via OS
// dialog) — no path-traversal guard, by design (Safeguard "ne jamais
// appeler WritePdfFile avec un path qui n'a pas été retourné par
// SaveFilePdf").
func (a *App) WritePdfFile(path, base64Content string) error {
	if path == "" {
		return errors.New("empty path")
	}
	data, err := base64.StdEncoding.DecodeString(base64Content)
	if err != nil {
		return fmt.Errorf("decode base64: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write pdf %q: %w", path, err)
	}
	if a.logger != nil {
		a.logger.Info("pdf written", "path", path, "bytes", len(data))
	}
	return nil
}

// canvasFrontmatter is the minimal shape parsed from a canvas
// front-matter for chain resolution. Only the cross-reference fields
// are read; other keys are ignored.
type canvasFrontmatter struct {
	Story    string `yaml:"story"`
	Analysis string `yaml:"analysis"`
}

// ResolveCanvasChain reads the canvas at canvasPath, parses its
// front-matter, and returns the absolute paths to its referenced story
// and analysis. canvasPath itself is always echoed in CanvasPath.
// References are resolved relative to the project root (the .yukki
// ancestor of canvasPath). Missing or unreadable references are
// returned as empty strings — never an error (Invariant I2).
//
// Errors are reserved for genuine I/O / parse failures on the canvas
// itself: file unreadable, YAML malformed, path-traversal attempt.
func (a *App) ResolveCanvasChain(canvasPath string) (CanvasChain, error) {
	a.mu.RLock()
	projs := make([]*OpenedProject, len(a.openedProjects))
	copy(projs, a.openedProjects)
	a.mu.RUnlock()

	if len(projs) == 0 {
		return CanvasChain{}, errors.New("no project selected")
	}

	absPath, err := filepath.Abs(canvasPath)
	if err != nil {
		return CanvasChain{}, fmt.Errorf("resolve abs path %q: %w", canvasPath, err)
	}
	if !hasYukkiPrefix(absPath, projs) {
		return CanvasChain{}, fmt.Errorf("path outside any opened project .yukki: %s", absPath)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return CanvasChain{}, fmt.Errorf("read canvas %s: %w", absPath, err)
	}

	fm, err := parseCanvasFrontmatter(data)
	if err != nil {
		return CanvasChain{}, fmt.Errorf("parse front-matter: %w", err)
	}

	projectRoot := projectRootFromYukkiPath(absPath, projs)
	chain := CanvasChain{CanvasPath: absPath}

	if fm.Story != "" {
		chain.StoryPath = resolveExisting(projectRoot, fm.Story)
	}
	if fm.Analysis != "" {
		chain.AnalysisPath = resolveExisting(projectRoot, fm.Analysis)
	}

	return chain, nil
}

// parseCanvasFrontmatter extracts the YAML front-matter block delimited
// by `---` lines at the top of a markdown file and unmarshals it into
// canvasFrontmatter. Returns zero-value (no error) if no front-matter
// is present — the canvas might be old style without cross-references.
func parseCanvasFrontmatter(data []byte) (canvasFrontmatter, error) {
	var fm canvasFrontmatter
	const marker = "---"

	// Find leading marker. Must be at the very top (after potential BOM
	// or empty lines we don't tolerate — the convention is strict).
	trimmed := bytes.TrimLeft(data, "\r\n")
	if !bytes.HasPrefix(trimmed, []byte(marker)) {
		return fm, nil
	}

	// Skip the leading marker line.
	rest := trimmed[len(marker):]
	if len(rest) == 0 || (rest[0] != '\n' && rest[0] != '\r') {
		return fm, nil
	}

	// Find the closing marker on its own line.
	end := bytes.Index(rest, []byte("\n"+marker))
	if end < 0 {
		// Try \r\n line endings.
		end = bytes.Index(rest, []byte("\r\n"+marker))
		if end < 0 {
			return fm, nil
		}
	}
	yamlBlock := rest[:end]

	if err := yaml.Unmarshal(yamlBlock, &fm); err != nil {
		return canvasFrontmatter{}, err
	}
	return fm, nil
}

// projectRootFromYukkiPath returns the project root (the directory that
// contains the .yukki/ ancestor of absPath). Returns the first matching
// project's path; absPath has already been verified to fall under one
// of them by hasYukkiPrefix.
func projectRootFromYukkiPath(absPath string, projs []*OpenedProject) string {
	for _, p := range projs {
		prefix := filepath.Join(p.Path, ".yukki") + string(filepath.Separator)
		if strings.HasPrefix(strings.ToLower(absPath), strings.ToLower(prefix)) {
			return p.Path
		}
	}
	return ""
}

// resolveExisting joins ref to projectRoot, calls os.Stat, and returns
// the absolute path if the file exists — empty string otherwise. Never
// returns an error: a missing reference is a domain signal (broken
// chain), not an exception (Invariant I2).
func resolveExisting(projectRoot, ref string) string {
	if projectRoot == "" || ref == "" {
		return ""
	}
	abs := filepath.Join(projectRoot, ref)
	if _, err := os.Stat(abs); err != nil {
		return ""
	}
	return abs
}
