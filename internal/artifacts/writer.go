package artifacts

import (
	"fmt"
	"os"
	"path/filepath"
)

// Writer writes story files to a directory using an atomic rename.
type Writer struct {
	StoriesDir string
}

// NewWriter returns a Writer rooted at storiesDir.
func NewWriter(storiesDir string) *Writer {
	return &Writer{StoriesDir: storiesDir}
}

// Write persists content as <storiesDir>/<id>-<slug>.md using a temp-then-rename
// pattern. The frontmatter is validated before the rename: a malformed file
// is never left behind in the final location.
func (w *Writer) Write(id, slug, content string) (string, error) {
	if id == "" || slug == "" {
		return "", fmt.Errorf("id and slug must be non-empty")
	}

	if err := ValidateFrontmatter(content); err != nil {
		return "", err
	}

	if err := os.MkdirAll(w.StoriesDir, 0o755); err != nil {
		return "", fmt.Errorf("mkdir %s: %w", w.StoriesDir, err)
	}

	final := filepath.Join(w.StoriesDir, fmt.Sprintf("%s-%s.md", id, slug))
	tmp := fmt.Sprintf("%s.tmp.%d", final, os.Getpid())

	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write %s: %w", tmp, err)
	}

	if err := os.Rename(tmp, final); err != nil {
		_ = os.Remove(tmp)
		return "", fmt.Errorf("rename %s -> %s: %w", tmp, final, err)
	}

	return final, nil
}
