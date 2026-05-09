// UI-019 fix — masque la console Windows quand un sous-processus
// console est lancé depuis un binaire GUI (Wails). Sans
// CREATE_NO_WINDOW, Windows alloue automatiquement une console
// visible pour `claude` CLI, ce qui (a) flashe une fenêtre
// terminale dans le visage de l'utilisateur et (b) peut
// perturber claude qui détecte alors un TTY interactif.

//go:build windows

package provider

import (
	"os/exec"
	"syscall"
)

// hideConsole applique CREATE_NO_WINDOW au cmd. Doit être appelé
// avant cmd.Run() / cmd.Start().
func hideConsole(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	// CREATE_NO_WINDOW = 0x08000000 — le child n'aura aucune console
	// (héritée ou allouée). Crucial pour les binaires GUI yukki qui
	// spawnent des CLI console comme claude.
	cmd.SysProcAttr.CreationFlags |= 0x08000000
}
