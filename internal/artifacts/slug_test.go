package artifacts

import "testing"

func TestSlugify(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"basic", "Add CSV Export", "add-csv-export"},
		{"accents", "Génération de la story", "generation-de-la-story"},
		{"punctuation", "Hello, World!", "hello-world"},
		{"caps", "ALL CAPS TITLE", "all-caps-title"},
		{"max five words", "one two three four five six seven", "one-two-three-four-five"},
		{"trailing whitespace", "  spaces  around  ", "spaces-around"},
		{"empty", "", ""},
		{"non-ascii letters dropped", "Привет world", "world"},
		{"digits kept", "Story 123 about CSV", "story-123-about-csv"},
		{"mixed punctuation", "v1.2.3 release notes", "v1-2-3-release-notes"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Slugify(tc.in)
			if got != tc.want {
				t.Fatalf("Slugify(%q) = %q ; want %q", tc.in, got, tc.want)
			}
		})
	}
}
