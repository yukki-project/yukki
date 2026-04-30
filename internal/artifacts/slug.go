package artifacts

import "strings"

// Slugify produces a kebab-case slug from a free-form title:
//   - ASCII fold for common Latin accents (é -> e, ô -> o, ç -> c, ...)
//   - lowercase
//   - keep only [a-z0-9]+ tokens
//   - join with "-"
//   - cap to 5 words max
func Slugify(title string) string {
	folded := foldASCII(title)
	lower := strings.ToLower(folded)

	var tokens []string
	var current strings.Builder
	for _, r := range lower {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			current.WriteRune(r)
			continue
		}
		if current.Len() > 0 {
			tokens = append(tokens, current.String())
			current.Reset()
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	if len(tokens) > 5 {
		tokens = tokens[:5]
	}
	return strings.Join(tokens, "-")
}

// foldASCII replaces common Latin diacritics by their ASCII counterpart.
// Keeps the dependency footprint minimal (no golang.org/x/text).
func foldASCII(s string) string {
	if !needsFolding(s) {
		return s
	}
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if repl, ok := asciiFoldTable[r]; ok {
			b.WriteString(repl)
			continue
		}
		if r < 128 {
			b.WriteRune(r)
			continue
		}
		// Drop unmapped non-ASCII runes (e.g., Cyrillic, CJK).
	}
	return b.String()
}

func needsFolding(s string) bool {
	for _, r := range s {
		if r >= 128 {
			return true
		}
	}
	return false
}

var asciiFoldTable = map[rune]string{
	'à': "a", 'á': "a", 'â': "a", 'ã': "a", 'ä': "a", 'å': "a", 'æ': "ae",
	'ç': "c",
	'è': "e", 'é': "e", 'ê': "e", 'ë': "e",
	'ì': "i", 'í': "i", 'î': "i", 'ï': "i",
	'ñ': "n",
	'ò': "o", 'ó': "o", 'ô': "o", 'õ': "o", 'ö': "o", 'ø': "o", 'œ': "oe",
	'ù': "u", 'ú': "u", 'û': "u", 'ü': "u",
	'ý': "y", 'ÿ': "y",
	'À': "a", 'Á': "a", 'Â': "a", 'Ã': "a", 'Ä': "a", 'Å': "a", 'Æ': "ae",
	'Ç': "c",
	'È': "e", 'É': "e", 'Ê': "e", 'Ë': "e",
	'Ì': "i", 'Í': "i", 'Î': "i", 'Ï': "i",
	'Ñ': "n",
	'Ò': "o", 'Ó': "o", 'Ô': "o", 'Õ': "o", 'Ö': "o", 'Ø': "o", 'Œ': "oe",
	'Ù': "u", 'Ú': "u", 'Û': "u", 'Ü': "u",
	'Ý': "y",
	'ß': "ss",
}
