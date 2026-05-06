---
id: CORE-005
slug: scaffold-skills-on-init
title: Scaffolding des skills Claude/Copilot lors de l'initialisation d'un projet
status: reviewed
created: 2026-05-06
updated: 2026-05-06
story: .yukki/stories/CORE-005-scaffold-skills-on-init.md
---

# Analyse — CORE-005 Scaffolding des skills Claude/Copilot à l'init

## Mots-clés métier extraits

`InitializeYukki`, `embed.FS`, `scaffold`, `non-écrasement`, `os.WriteFile`,
`os.MkdirAll`, `.claude/commands`, `.github/skills`, `SKILL.md`, `idempotent`

## Concepts de domaine

### Existants (déjà dans le code)

- **`InitializeYukki(dir string) error`** — `internal/uiapp/app.go:225`.
  Crée les 9 sous-dossiers `.yukki/` (`spddSubdirs`) et écrase systématiquement
  les templates embarqués via `os.WriteFile`. C'est le point d'entrée à étendre.
  **Invariant actuel** : les templates sont toujours remis à la version embarquée
  (source of truth = `embed.FS`). Pour les skills, l'invariant est **inversé** :
  le fichier utilisateur prime.

- **`internal/templates` (package + `embed.FS`)** — `internal/templates/templates.go`.
  Expose un `Loader` avec `LoadStory()`, `LoadAnalysis()`, etc. Les 7 fichiers
  sont embarqués via `//go:embed embedded/*.md`. Le pattern est bien établi
  et réutilisable.

- **`TestApp_InitializeYukki_*`** — `internal/uiapp/app_test.go:277-395`.
  4 tests existants couvrent le happy path, la ré-init sur projet existant,
  l'idempotence, et le rejet de `dir=""`. Les nouveaux AC (skills) s'ajoutent
  naturellement dans ce bloc.

### Nouveaux (à introduire)

- **`SkillFile`** — value object : `{ DestPath string; Content string }`.
  Représente un skill à scaffolder (chemin cible relatif à `dir`, contenu
  embarqué). Pas besoin d'une struct nommée si on reste en slice de struct
  anonyme ou `[2]string` — à décider au canvas.

- **`internal/skills/embedded/`** — nouveau répertoire contenant les 14
  fichiers à embarquer (7 skills Claude + 7 skills Copilot). Distincts de
  `internal/templates/embedded/` car les skills ne sont **pas** des templates
  SPDD : leur sémantique de mise à jour est opposée (non-écrasement vs
  écrasement).

- **Garde non-écrasement** : `os.Stat(dst)` avant `os.WriteFile`. Si le
  fichier existe (`err == nil`), on skip. Si `errors.Is(err, os.ErrNotExist)`,
  on écrit. Les autres erreurs remontent.

## Décision stratégique (Y-Statement)

> Face au fait qu'**un nouveau projet yukki n'a pas les skills IDE** après
> `InitializeYukki`, on choisit d'**embarquer les 14 fichiers skills dans le
> binaire yukki et de les écrire dans `.claude/commands/` et
> `.github/skills/yukki-*/` lors de `InitializeYukki`, avec garde
> non-écrasement**, plutôt que (A) de copier les skills via un script externe
> ou (B) de les distribuer via un package npm/brew séparé, pour atteindre
> **un onboarding zéro-friction, entièrement offline et sans dépendance
> réseau**, en acceptant **une augmentation de la taille du binaire
> (~50-100 Ko pour 14 fichiers Markdown)**.

Alternatives écartées :
- **(A) Script externe `yukki install-skills`** — ajoute une étape manuelle,
  casse l'invariant "une commande init = tout prêt".
- **(B) Download depuis GitHub à l'init** — nécessite un accès réseau,
  ajoute une dépendance externe, impossible en environnement air-gap.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/uiapp` | Fort | Modification de `InitializeYukki`, ajout de tests |
| `internal/skills` | Fort | Création (nouveau package + `embed.FS`) |
| `internal/templates` | Faible | Aucune modification — pattern réutilisé en lecture |
| `.claude/commands/` | Faible | Fichiers sources des skills Claude (copiés en embed) |
| `.github/skills/` | Faible | Fichiers sources des skills Copilot (copiés en embed) |

## Dépendances et intégrations

- `embed` (stdlib Go) — déjà utilisé dans `internal/templates/templates.go`
- `os.Stat` / `os.MkdirAll` / `os.WriteFile` — déjà utilisés dans `InitializeYukki`
- Aucune dépendance externe nouvelle

## Risques et points d'attention

- **Désynchronisation skills embarqués / skills du repo** (Data) — si on
  modifie un skill dans `.claude/commands/` sans rebuild, le binaire distribue
  une version périmée. *Mitigation* : les fichiers sources sont sous
  `.claude/commands/` et `.github/skills/` dans le repo ; le `//go:embed`
  pointe vers ces chemins depuis la racine (pas une copie intermédiaire).

- **Chemin embed relatif au package** (Intégration) — `//go:embed` ne peut
  pas pointer vers un chemin remontant (`../../.claude/`). Les fichiers
  sources devront être copiés dans `internal/skills/embedded/` au build ou
  bien le package `internal/skills` doit vivre à la racine.
  *Mitigation* : créer `internal/skills/embedded/` comme copie canonique
  des skills ; une règle CI / Makefile vérifie la synchronisation.
  *Alternative* : créer le package `skills/` à la racine du module (hors
  `internal/`) — évite la duplication mais expose le package.

- **Taille du binaire** (Performance) — 14 fichiers Markdown ~3-7 Ko chacun
  ≈ 50-100 Ko supplémentaires. Négligeable pour une app desktop Wails.

- **Permissions `.github/`** (Opérationnel) — certains dépôts ont un
  `.github/` géré par l'organisation (Actions, CODEOWNERS). `os.MkdirAll`
  ne touche que le sous-chemin `skills/yukki-*/` ; les fichiers existants
  dans `.github/` ne sont pas affectés.

## Cas limites identifiés

- `dir` pointe vers un répertoire en lecture seule → `os.MkdirAll` / `os.WriteFile`
  échouent → remonter l'erreur avec contexte (chemin + wrapping)
- `.github/` existe en tant que fichier (non-répertoire) → `os.MkdirAll`
  retourne une erreur OS → remonter clairement
- Un skill embarqué est vide (bug build) → écrire un fichier vide, pas de
  plantage ; ajouter une vérification à l'embarquement si nécessaire
- Projet sur Windows avec chemins séparateurs `\` → `filepath.Join` gère
  nativement (déjà utilisé partout dans `InitializeYukki`)
- 0 skills disponibles (package `skills` manquant) → si la liste est vide,
  `InitializeYukki` reste idempotent (aucune écriture, pas d'erreur)

## Décisions à prendre avant le canvas

- [ ] **Emplacement de l'embed** : package `internal/skills/embedded/` (copie
  des sources) ou package `skills/` à la racine (alias direct) ? Recommandation :
  `internal/skills/embedded/` avec synchronisation via `go generate` ou
  Makefile — cohérent avec `internal/templates/embedded/`.

- [ ] **Granularité de l'erreur en cas d'échec partiel** : si 3 skills sur 14
  échouent à s'écrire, faut-il retourner la première erreur et stopper, ou
  continuer et agréger ? Recommandation : fail-fast (première erreur), cohérent
  avec le comportement actuel de la boucle templates.

- [ ] **Tests : copier les fichiers skills dans les tests ou utiliser un
  embed fixture ?** `TestApp_InitializeYukki_Success` vérifie aujourd'hui
  les dossiers et templates par nom. La même approche suffit pour les skills :
  vérifier l'existence de `.claude/commands/yukki-story.md` et
  `.github/skills/yukki-story/SKILL.md`.
