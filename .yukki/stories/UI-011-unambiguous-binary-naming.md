---
id: UI-011
slug: unambiguous-binary-naming
title: Binaire yukki unique — supprimer la confusion go build vs wails build
status: reviewed
created: 2026-05-06
updated: 2026-05-06
owner: yukki contributors
modules:
  - build
  - docs
---

# Binaire yukki unique — supprimer la confusion go build vs wails build

## Background

Le projet possède deux façons de produire un binaire `yukki` :

1. `go build .` → produit `yukki.exe` à la racine, **sans** le tag
   `desktop` de Wails. Ce binaire affiche le dialog d'avertissement
   Wails *"Your application will not build without the correct build
   tags. Please use wails build or press OK…"* dès que `yukki ui`
   est invoqué.
2. `wails build` (via `scripts/dev/ui-build.bat`) → produit
   `build/bin/yukki-ui.exe` **avec** le tag `desktop` injecté
   automatiquement. Ce binaire fonctionne correctement, mais son
   nom (`yukki-ui`) diffère du binaire CLI attendu (`yukki`).

L'utilisateur qui tape `yukki ui` dans son terminal utilise le binaire
issu de `go build .` (plus probable dans le PATH) et obtient le warning,
ce qui est confus et bloquant en première utilisation.

## Business Value

Tout développeur qui clone le repo et suit `DEVELOPMENT.md` peut lancer
`yukki ui` sans obtenir un dialog Wails alarmant, sans lire de note
d'avertissement cachée, et sans deviner lequel des deux binaires est
le bon. L'onboarding est réduit à deux commandes : `ui-build.bat` puis
`yukki ui`.

## Scope In

- `wails.json` : `outputfilename` → `yukki` (au lieu de `yukki-ui`)
  → produit `build/bin/yukki.exe` (fait, commit inclus)
- `scripts/dev/ui-build.bat` et `ui-build.sh` : mettre à jour les
  références `yukki-ui` → `yukki` dans les messages et vérifications
- `DEVELOPMENT.md` : section **Build** clarifiée —
  - `go build .` décrit comme "CLI uniquement, sans surface UI Wails"
  - Ajout d'une note : pour `yukki ui`, utiliser le binaire
    `build/bin/yukki.exe` produit par `ui-build.bat`
  - Ajout d'un raccourci : `scripts/dev/ui-build.bat && build\bin\yukki ui`
- Vérification de cohérence : `build/windows/wails.exe.manifest` et
  `build/windows/info.json` utilisent déjà le nom générique "yukki"
  → pas de changement nécessaire

## Scope Out

- Modification du comportement runtime de `yukki ui`
- Publication d'un installeur ou ajout automatique au PATH système
- Fusion des deux entrées (`go build .` vs `wails build`) en un seul
  Makefile cible — reporté en DOC/OPS

## Acceptance Criteria

**AC1 — Happy path : binaire Wails nommé `yukki`**
- Given le développeur a exécuté `scripts\dev\ui-build.bat`
- When il consulte le dossier `build/bin/`
- Then il voit `yukki.exe` (pas `yukki-ui.exe`)

**AC2 — Happy path : `yukki ui` sans warning Wails**
- Given le développeur a lancé `build\bin\yukki.exe ui`
- When la fenêtre s'ouvre
- Then aucun dialog "build tags" n'est affiché

**AC3 — Documentation cohérente**
- Given le développeur lit `DEVELOPMENT.md` section **Build**
- When il suit les instructions pour lancer l'UI
- Then la commande indiquée est `build\bin\yukki ui` (ou équivalent
  cross-platform), jamais `go build . && yukki ui`

**AC4 — `go build .` clairement différencié**
- Given le développeur veut juste compiler le CLI (sans UI Wails)
- When il exécute `go build .`
- Then `DEVELOPMENT.md` précise explicitement que ce binaire ne
  supporte pas `yukki ui` (tag `desktop` absent)

## Open Questions

- ~~Faut-il ajouter `build/bin/` au `.gitignore` ou documenter
  explicitement qu'il n'est pas versionné ?~~ → `build/bin/` est déjà
  dans `.gitignore` (patterns `build/bin/` et `*.exe`). Documenté.
- ~~Le script `ui-build.sh` (Linux/macOS) doit être mis à jour de
  façon symétrique~~ → fait dans le même commit.

## Notes

Tous les changements ont été livrés dans un seul commit sur `main` :
- `wails.json` : `outputfilename` → `yukki` → produit `build/bin/yukki.exe`
- `scripts/dev/ui-build.bat` + `ui-build.sh` : echo mis à jour
- `DEVELOPMENT.md` : section Build scindée CLI / Wails, avertissement tag desktop ajouté

Validé manuellement : `yukki ui` lancé depuis `build/bin/yukki.exe` — aucun dialog Wails.
