package artifacts

// ProjectDirName is the canonical name of the per-project directory
// that holds yukki artifacts (stories, analysis, prompts, templates,
// tests, inbox, epics, roadmap, methodology). Single source of truth
// for path construction and path-isolation checks (see uiapp.App.ReadArtifact,
// Invariant I1 — path-traversal guard).
//
// Introduced by META-004 (rename `spdd/` → `.yukki/`). Any new code
// that needs to refer to the project directory must use this constant
// rather than a hard-coded string literal.
const ProjectDirName = ".yukki"
