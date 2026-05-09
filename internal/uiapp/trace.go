// OPS-001 prompt-update post-revue — instrumentation DEBUG des
// bindings Wails. Le helper traceBinding émet un event DEBUG par
// appel de binding pour qu'un utilisateur en mode debug observe
// l'activité IPC en temps réel dans le drawer logs.
//
// L'instrumentation est inline (pas de wrapper Wails) parce que la
// v2 du framework n'expose pas de hook middleware sur la table de
// bindings — chaque binding « important » appelle traceBinding en
// première ligne.
//
// Coût en mode WARN/INFO : un appel de fonction + check
// `logLevel.Level() <= LevelDebug` qui retourne false instantanément.
// Pas d'allocation des attrs avant la branche debug.

package uiapp

import "log/slog"

// traceBinding emits a DEBUG record describing a Wails binding call.
// Returns immediately without allocating attrs when the live level
// is above DEBUG.
//
// Usage at binding entry:
//
//	func (a *App) OpenProject(path string) (ProjectMeta, error) {
//	    a.traceBinding("OpenProject", slog.String("path", path))
//	    ...
//	}
func (a *App) traceBinding(name string, attrs ...slog.Attr) {
	if a.logger == nil {
		return
	}
	if a.logLevel != nil && a.logLevel.Level() > slog.LevelDebug {
		return
	}
	full := make([]slog.Attr, 0, len(attrs)+2)
	full = append(full, slog.String("source", "go"), slog.String("binding", name))
	full = append(full, attrs...)
	a.logger.LogAttrs(a.ctx, slog.LevelDebug, "binding call", full...)
}
