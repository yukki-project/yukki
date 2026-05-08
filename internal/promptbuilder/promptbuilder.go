// Package promptbuilder — O2 of the CORE-008 canvas: SPDD system prompt construction.
//
// Build is a pure function (no I/O) that constructs the system prompt for a
// SPDD suggestion request. LoadSectionDefs handles I/O and is tested separately.
package promptbuilder

import (
	"fmt"
	"strings"

	"github.com/yukki-project/yukki/internal/provider"
)

// SectionDefinitions maps a SPDD section key to its prose definition.
// Unknown keys return an empty string (non-blocking).
type SectionDefinitions map[string]string

// ActionCriteria maps an action key to its measurable criterion (in French).
var ActionCriteria = map[string]string{
	"improve":  "Améliorer la lisibilité : simplifier les formulations, réduire le jargon, conserver le sens. Longueur ±20%.",
	"enrich":   "Enrichir : ajouter des précisions ou exemples pertinents. Longueur +20% à +50%.",
	"rephrase": "Reformuler : changer la structure des phrases sans modifier le sens. Longueur ±10%.",
	"shorten":  "Raccourcir : supprimer les redondances, conserver l'essentiel. Longueur −20% à −40%.",
}

// Build constructs the SPDD system prompt for a suggestion request.
// Returns an error if req.Action is unrecognised.
// The section definition may be empty (non-blocking).
func Build(req provider.SuggestionRequest, defs SectionDefinitions) (string, error) {
	criterion, ok := ActionCriteria[req.Action]
	if !ok {
		return "", fmt.Errorf("promptbuilder: unknown action %q", req.Action)
	}

	sectionDef := defs[req.Section]
	if sectionDef == "" {
		sectionDef = "Non définie."
	}

	var sb strings.Builder

	fmt.Fprintf(&sb, "Tu es un rédacteur SPDD. Ta réponse doit modifier uniquement la portion sélectionnée,\nen respectant les conventions de la section « %s ».\n", req.Section)
	sb.WriteString("\nDéfinition de la section :\n")
	sb.WriteString(sectionDef)
	sb.WriteString("\n")
	fmt.Fprintf(&sb, "\nAction demandée : %s\n", criterion)
	sb.WriteString("\nTexte sélectionné (à modifier) :\n<<<\n")
	sb.WriteString(req.SelectedText)
	sb.WriteString("\n>>>\n")

	if req.PreviousSuggestion != "" {
		sb.WriteString("\nGénère une variante différente de la précédente :\n<<<\n")
		sb.WriteString(req.PreviousSuggestion)
		sb.WriteString("\n>>>\n")
	}

	sb.WriteString("\nRéponds uniquement avec le texte de remplacement, sans guillemets ni explication.")

	return sb.String(), nil
}
