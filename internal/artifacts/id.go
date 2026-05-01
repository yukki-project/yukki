package artifacts

// Implements O4 of the CORE-001 canvas: id calculator + slug + writer.
// Package-level documentation lives in doc.go (CORE-002).

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// AllowedPrefixes is the suggested whitelist for --strict-prefix mode and the
// help-text guidance. Free-form mode (default) accepts any [A-Z]+ prefix.
var AllowedPrefixes = []string{
	"STORY", "EXT", "BACK", "FRONT", "CTRL", "CORE", "UI", "INT", "OPS", "DOC", "META",
}

// ErrInvalidPrefix is returned when a prefix violates the regex or whitelist.
var ErrInvalidPrefix = errors.New("invalid prefix")

var prefixRE = regexp.MustCompile(`^[A-Z]+$`)

// ValidatePrefix checks the prefix against the loose ([A-Z]+) or strict
// (whitelist) policy.
func ValidatePrefix(prefix string, strict bool) error {
	if !prefixRE.MatchString(prefix) {
		return fmt.Errorf("%w: %q must match [A-Z]+", ErrInvalidPrefix, prefix)
	}
	if !strict {
		return nil
	}
	for _, allowed := range AllowedPrefixes {
		if allowed == prefix {
			return nil
		}
	}
	return fmt.Errorf("%w: %q not in --strict-prefix whitelist %v",
		ErrInvalidPrefix, prefix, AllowedPrefixes)
}

// NextID returns the next id for the given prefix in storiesDir.
//
// Behavior:
//   - if no story exists for prefix, returns "<prefix>-001"
//   - if max existing number is N, returns "<prefix>-NNN" with N+1
//     (3-digit padding for N+1 < 1000, 4-digit for < 10000, etc.)
//   - existing files keep their padding; only the new id grows.
func NextID(storiesDir, prefix string) (string, error) {
	if err := ValidatePrefix(prefix, false); err != nil {
		return "", err
	}

	entries, err := os.ReadDir(storiesDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return formatID(prefix, 1), nil
		}
		return "", fmt.Errorf("read %s: %w", storiesDir, err)
	}

	pattern := regexp.MustCompile(`^` + regexp.QuoteMeta(prefix) + `-(\d+)-.+\.md$`)
	max := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		m := pattern.FindStringSubmatch(e.Name())
		if m == nil {
			continue
		}
		n, err := strconv.Atoi(m[1])
		if err != nil {
			continue
		}
		if n > max {
			max = n
		}
	}
	return formatID(prefix, max+1), nil
}

// formatID applies the padding rule: 3 digits minimum, expand naturally.
func formatID(prefix string, n int) string {
	width := 3
	if n >= 1000 {
		width = len(strconv.Itoa(n))
	}
	return fmt.Sprintf("%s-%0*d", prefix, width, n)
}

// AllowedPrefixesString returns the whitelist joined by "|" (for help text).
func AllowedPrefixesString() string {
	sorted := make([]string, len(AllowedPrefixes))
	copy(sorted, AllowedPrefixes)
	sort.Strings(sorted)
	return strings.Join(sorted, "|")
}

// guard against accidental import cycles
var _ = filepath.Separator
