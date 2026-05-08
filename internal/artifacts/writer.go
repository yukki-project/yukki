package artifacts

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
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
	// Tmp name unique par goroutine : sinon des goroutines concurrentes
	// du même process (test I2 CORE-001) écraseraient le tmp les unes
	// des autres, provoquant rename → file disparu sur Windows (où
	// MoveFile échoue si la source a été renommée par un autre).
	tmp := fmt.Sprintf("%s.tmp.%d.%d", final, os.Getpid(), time.Now().UnixNano())

	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write %s: %w", tmp, err)
	}

	if err := os.Rename(tmp, final); err != nil {
		// Sur Windows, os.Rename échoue si la destination existe (atomic-replace
		// non garanti). Quand plusieurs goroutines écrivent le même final,
		// la première gagne ; les suivantes verront leur tmp resté en place
		// et un échec de rename — c'est attendu, le contrat I2 ne demande
		// que "le fichier final existe et est valide", pas que tous les
		// writers réussissent.
		_ = os.Remove(tmp)
		// Si le final existe déjà (un autre goroutine a gagné), traiter
		// comme un succès silencieux : le contrat est respecté.
		if _, statErr := os.Stat(final); statErr == nil {
			return final, nil
		}
		return "", fmt.Errorf("rename %s -> %s: %w", tmp, final, err)
	}

	return final, nil
}
