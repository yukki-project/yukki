#!/usr/bin/env bash
# UI-018b — script de migration mécanique des classes Tailwind
# shadcn vers la palette canonique ykp livrée par UI-018a.
#
# Stratégie : pour chaque ligne du mapping (cf. docs/palette.md
# section « Correspondance shadcn → ykp »), un sed boundary-aware
# qui couvre la classe + ses variantes (opacity Tailwind `/40`,
# pseudo-classes `hover:` / `focus:` / `active:` / `data-[state=…]:`).
#
# Idempotent : un rerun ne produit aucun diff (les classes ykp ne
# matchent plus le pattern shadcn).
#
# Périmètre :
#   - Cible :  frontend/src/ (composants, lib, App.tsx)
#   - Exclu :  frontend/src/components/ui/  (primitives shadcn —
#              intactes, cf. canvas safeguard)
#   - Exclu :  frontend/src/styles/         (déjà migré par UI-018a)
#
# Usage :
#   bash scripts/dev/ui-018b-migrate-shadcn.sh
#
# Le script est jeté après merge UI-018b. Pas de raison de le
# garder versionné une fois la migration faite — mais on le
# laisse pendant la PR pour traçabilité.

set -euo pipefail

# Format : "shadcn   ykp"
MAPPING=(
  "bg-background           bg-ykp-bg-page"
  "text-foreground         text-ykp-text-primary"
  "bg-card                 bg-ykp-bg-elevated"
  "text-card-foreground    text-ykp-text-primary"
  "bg-popover              bg-ykp-bg-elevated"
  "text-popover-foreground text-ykp-text-primary"
  "text-primary-foreground text-ykp-primary-fg"
  "bg-primary              bg-ykp-primary"
  "bg-secondary            bg-ykp-bg-subtle"
  "text-secondary-foreground text-ykp-text-primary"
  "bg-muted                bg-ykp-bg-subtle"
  "text-muted-foreground   text-ykp-text-muted"
  "bg-accent               bg-ykp-line"
  "text-accent-foreground  text-ykp-text-primary"
  "text-destructive-foreground text-ykp-danger-fg"
  "bg-destructive          bg-ykp-danger"
  "text-destructive        text-ykp-danger"
  "border-border           border-ykp-line"
  "border-input            border-ykp-line"
  "ring-offset-background  ring-offset-ykp-bg-page"
  "ring-ring               ring-ykp-ring"
)

# Trouve les fichiers cibles : .ts(x) sous frontend/src/, hors
# components/ui/ (primitives) et hors styles/ (déjà migré).
mapfile -t FILES < <(find frontend/src \
    \( -name '*.tsx' -o -name '*.ts' \) \
    -not -path 'frontend/src/components/ui/*' \
    -not -path 'frontend/src/styles/*')

echo ">> Files to scan: ${#FILES[@]}"

for file in "${FILES[@]}"; do
  for line in "${MAPPING[@]}"; do
    from=$(echo "$line" | awk '{print $1}')
    to=$(echo "$line" | awk '{print $2}')
    # Boundary-aware : la classe est entourée de \b côté gauche
    # ET côté droit. Cela respecte les pseudo-classes Tailwind
    # (`hover:bg-muted`) car `\b` matche entre `:` et `bg-muted`.
    # Cela respecte aussi les opacités (`bg-muted/40`) car `\b`
    # matche entre `bg-muted` et `/`.
    sed -i -E "s/\\b${from}\\b/${to}/g" "$file"
  done
done

echo ">> Migration done."
echo ">> Verify with:"
echo "   grep -rE 'bg-(background|card|popover|primary|secondary|muted|accent|destructive)|text-(foreground|card-foreground|popover-foreground|primary-foreground|secondary-foreground|muted-foreground|accent-foreground|destructive|destructive-foreground)|border-(border|input)|ring-(ring|offset-background)' frontend/src --include='*.ts' --include='*.tsx' | grep -v 'components/ui/' | grep -v 'styles/'"
