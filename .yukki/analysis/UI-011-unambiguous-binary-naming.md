---
id: UI-011
slug: unambiguous-binary-naming
title: Binaire yukki unique — supprimer la confusion go build vs wails build
story: .yukki/stories/UI-011-unambiguous-binary-naming.md
status: reviewed
created: 2026-05-06
updated: 2026-05-06
---

# Analyse — Binaire yukki unique — supprimer la confusion go build vs wails build

> Scan ciblé du codebase à partir des mots-clés extraits de la story.
> Ne duplique ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`outputfilename`, `wails.json`, `build tags`, `desktop`, `wails build`,
`go build`, `yukki-ui`, `yukki ui`, `DEVELOPMENT.md`, `ui-build.bat`,
`ui-build.sh`, `build/bin/`

## Concepts de domaine

### Existants (déjà dans le code)

- **`outputfilename` (wails.json)** — champ de configuration Wails v2 qui
  détermine le nom du binaire produit dans `build/bin/`. Était positionné à
  `yukki-ui`, donc `build/bin/yukki-ui.exe`. Aucun autre fichier du repo ne
  référençait ce nom pour le binding — uniquement les scripts `ui-build.bat`
  et `ui-build.sh` dans leurs messages `echo`.

- **Tag `desktop` (Wails v2)** — build tag automatiquement injecté par
  `wails build` dans le binaire final. Sans ce tag, les binaires produits par
  `go build .` affichent le dialog d'avertissement Wails au démarrage de
  `yukki ui`. Ce comportement est défini dans la bibliothèque Wails elle-même
  (`pkg/application/...`), non modifiable dans le code yukki.

- **`scripts/dev/ui-build.bat` / `ui-build.sh`** — wrappers de build qui
  positionnent `GOCACHE`, `GOTMPDIR`, `TMP`, `TEMP` dans le repo pour
  contourner les restrictions AV en environnement corporate. Ils invoquent
  `wails build -tags mock -skipbindings`. Seul le message `echo` final
  référençait `yukki-ui`.

- **`DEVELOPMENT.md` — section Build** — décrivait uniquement `go build .`
  sans mentionner la distinction CLI-only vs binaire Wails complet. Ne guidait
  pas l'utilisateur vers `ui-build.bat` pour `yukki ui`.

- **`build/bin/`** — dossier ignoré par `.gitignore` (pattern `/build/bin/`)
  et contenant uniquement les binaires générés. Les fichiers sources Wails
  (`build/windows/info.json`, `build/windows/wails.exe.manifest`,
  `build/appicon.png`) sont trackés séparément — ils utilisent déjà le nom
  générique "yukki" et n'ont pas besoin d'être modifiés.

### Nouveaux (à introduire)

Aucun concept nouveau — il s'agit d'une correction de configuration et
documentation, pas d'une évolution fonctionnelle.

## Approche stratégique

> Y-Statement : **Afin de** supprimer la confusion `go build .` vs `wails build`
> pour les développeurs qui lancent `yukki ui`,
> **nous avons décidé** de renommer `outputfilename` en `yukki` dans `wails.json`
> **et de clarifier** `DEVELOPMENT.md` avec deux sections distinctes,
> **plutôt que** d'unifier les deux entrées de build en un Makefile ou script
> wrapper unique,
> **car** le changement de configuration est minimal, réversible, et couvre
> l'intégralité du problème observé sans introduire de nouvelle complexité.

Le diagnostic est simple : deux binaires de même nom apparent (`yukki`) mais
produits par des chemins différents, avec des capacités différentes
(tag `desktop` présent ou absent). La correction est au niveau de la
configuration Wails (`outputfilename`) et de la documentation. Aucun code
Go ou TypeScript n'est modifié.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `wails.json` | faible | modify — `outputfilename` `yukki-ui` → `yukki` |
| `scripts/dev` | faible | modify — `ui-build.bat` + `ui-build.sh` : echo mis à jour |
| `docs` | faible | modify — `DEVELOPMENT.md` section Build clarifiée |

## Dépendances et intégrations

- **Wails v2.12.0** — `outputfilename` est documenté dans le schéma
  `config.v2.json`. Compatibilité vérifiée : le champ accepte tout nom sans
  extension (l'extension `.exe` est ajoutée automatiquement sur Windows).
- Aucune dépendance externe, aucun package Go, aucun npm package.

## Risques et points d'attention

- **Collision de nom avec l'ancien binaire CLI** (`go build .` produit aussi
  `yukki.exe` à la racine) — *faible* : les deux binaires vivent dans des
  répertoires différents (`./` vs `build/bin/`). Le PATH de l'utilisateur
  détermine lequel est invoqué. Documenté dans `DEVELOPMENT.md`.
- **Artefacts anciens dans `build/bin/`** — après le changement, `build/bin/`
  peut contenir à la fois `yukki-ui.exe` (ancien) et `yukki.exe` (nouveau).
  Sans impact fonctionnel ; le développeur peut supprimer manuellement.
- **CI** — les runners GitHub Actions exécutent `go build ./...` (pas
  `wails build`) pour les checks statiques. Ce pipeline n'est pas affecté
  par `outputfilename`. Vérifié dans `.github/workflows/ci.yml`.

## Cas limites identifiés

- Développeur avec `build/bin/` dans son `PATH` avant le rebuild → l'ancien
  `yukki-ui.exe` reste invocable mais n'est plus l'output par défaut.
- macOS / Linux : le binaire produit est `build/bin/yukki` (sans extension).
  `ui-build.sh` mis à jour en conséquence.

## Décisions à prendre avant le canvas

Aucune décision ouverte — les changements sont entièrement rétrocompatibles
et ont déjà été implémentés et validés manuellement (`yukki ui` sans dialog
Wails). Pas de canvas REASONS nécessaire pour ce fix de configuration.
