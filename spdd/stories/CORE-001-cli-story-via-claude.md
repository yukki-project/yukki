---
id: CORE-001
slug: cli-story-via-claude
title: Commande CLI `yukki story` génère une user story SPDD via Claude CLI
status: draft
created: 2026-04-30
updated: 2026-04-30
owner: Thibaut Sannier
modules:
  - cmd/yukki
  - internal/workflow
  - internal/provider
  - internal/templates
---

# Commande CLI `yukki story` génère une user story SPDD via Claude CLI

## Background

On démarre le projet **yukki** (outil open source en Go, repo
[`github.com/yukki-project/yukki`](https://github.com/yukki-project/yukki))
qui implémente la méthode
[Structured Prompt-Driven Development](https://martinfowler.com/articles/structured-prompt-driven/).

Le nom *yukki* est une variante affectueuse (diminutif romaji ユッキ) de
*yuki* 雪 (la neige). Il évoque la **page blanche** qui se structure en un
canvas REASONS bien tissé. Le doublement du **k** distingue clairement le
projet du nom courant *yuki*, plus encombré côté namespaces.

La cible v1 est un toolkit qui couvre tout le cycle SPDD avec deux surfaces
(CLI + canvas editor graphique standalone) ; cette story est la **première
tranche fondatrice** : faire fonctionner la commande
`yukki story "<description>"` en CLI Go, en orchestrant le `claude` CLI comme
provider de génération.

Cette tranche établit l'**architecture monorepo** (entrypoint Cobra,
abstraction provider, gestion des templates, écriture d'artefacts SPDD dans
l'arborescence standard) sur laquelle s'appuieront les 6 autres commandes
(CORE-002), la canvas UI (UI-001) et le provider Copilot CLI (INT-001).

## Business Value

- **Preuve de concept** : démontre que SPDD peut tourner via une orchestration
  de CLI (pas besoin de gérer le SDK Anthropic, l'authentification ou le rate
  limiting — déléguées à `claude`).
- **Valeur livrée seule** : un utilisateur peut déjà générer une user story
  SPDD bien structurée dans n'importe quel projet, sans copier-coller un prompt
  dans Claude Code ou Copilot.
- **Fondation réutilisable** : les 6 autres commandes hériteront de
  l'abstraction provider, du loader de templates et du writer d'artefacts.

## Scope In

- Binaire Go unique `yukki` (build via `go build ./cmd/yukki`,
  cross-platform Linux / macOS / Windows)
- Sous-commande `yukki story` qui prend la description en argument
  (`yukki story "..."`) ou via stdin (`echo "..." | yukki story`)
- Détection et invocation du `claude` CLI installé sur la machine de l'utilisateur
- Loading du template `templates/story.md` (embarqué dans le binaire ou copié au
  premier run dans le repo cible)
- Écriture du fichier produit dans `stories/<id>-<slug>.md` du **répertoire courant**
- Génération automatique de l'`id` (incrément du plus grand suffix trouvé dans
  `stories/<préfixe>-NNN-*.md`) avec préfixe configurable via `--prefix`
  (défaut : `STORY`)
- Slug auto-généré depuis le titre extrait par Claude (kebab-case, 5 mots max)
- Codes de retour standards (0 succès, 1 erreur user, 2 erreur provider, 3 erreur I/O)
- Logs structurés (text en `--verbose`, JSON en `--log-format=json`)

## Scope Out

- Les 6 autres commandes SPDD (`analysis`, `reasons-canvas`, `generate`, etc.)
  → CORE-002
- Canvas editor graphique standalone → UI-001
- Provider Copilot CLI → INT-001
- Provider direct via API Anthropic / OpenAI (pas de SDK embarqué dans v1)
- Configuration globale (`~/.config/yukki/`) — uniquement configuration par
  projet (`.yukki.toml` à la racine) en v1
- Mode interactif (Q&A pour clarifier la story) — v1 produit la story d'un
  seul coup à partir de la description fournie
- Hooks ou steering rules (déclencheurs automatiques sur événements)
- Publication sur registry (Homebrew, Scoop, asdf, etc.) → tâche post-MVP

## Acceptance Criteria

### AC1 — Génération nominale

- **Given** un utilisateur a `claude` CLI installé et authentifié, et un
  répertoire `stories/` (vide ou non) dans son projet
- **When** il lance `yukki story "ajouter un export CSV des vulnérabilités Trivy"`
- **Then** un fichier `stories/STORY-001-export-csv-trivy.md` est créé
  (ou STORY-NNN selon le prochain id disponible), respectant la structure du
  template `templates/story.md` (front-matter complet, 8 sections, ≥2 AC en
  Given/When/Then), et le chemin du fichier créé est affiché sur stdout

### AC2 — Préfixe d'ID configurable

- **Given** le répertoire `stories/` contient déjà `EXT-001-foo.md` et `EXT-007-bar.md`
- **When** l'utilisateur lance `yukki story "..." --prefix=EXT`
- **Then** le fichier produit est `stories/EXT-008-<slug>.md` (incrément depuis le
  plus grand id du même préfixe)

### AC3 — `claude` CLI absent

- **Given** `claude` n'est pas dans le `PATH`
- **When** l'utilisateur lance `yukki story "..."`
- **Then** un message d'erreur explicite est affiché sur stderr
  (ex. `error: 'claude' CLI not found in PATH. Install via https://...`),
  le code retour est `2`, aucun fichier n'est créé

### AC4 — Description vide

- **Given** l'utilisateur lance `yukki story` sans argument et sans stdin
- **When** la commande s'exécute
- **Then** un message d'usage est affiché, code retour `1`, aucun appel à `claude`,
  aucun fichier créé

### AC5 — Description via stdin

- **Given** un utilisateur a une description multi-lignes (ex. dump de ticket)
- **When** il lance `cat ticket.txt | yukki story`
- **Then** la story est générée à partir de stdin (équivalent à passer la
  description en argument)

### AC6 — Template manquant

- **Given** le binaire est lancé dans un répertoire **sans** `templates/story.md`
  ni configuration spécifique
- **When** la commande s'exécute
- **Then** le template embarqué (compilé via `embed.FS`) est utilisé en fallback,
  et un message informatif sur stderr indique cette source de template

### AC7 — Idempotence

- **Given** un utilisateur lance deux fois la même commande avec la même description
- **When** la deuxième exécution se produit
- **Then** un nouveau fichier est créé avec un id incrémenté (pas d'écrasement
  silencieux), sauf si `--force --id=<id>` est explicitement fourni

## Open Questions

- [ ] **Format du prompt envoyé à `claude`** : on lui passe le template + la
  description en stdin, ou on construit un prompt structuré qui demande à
  Claude de remplir le template ? — le second est plus fiable mais plus verbeux
- [ ] **Détection de stdin** : utiliser `os.Stdin.Stat() & os.ModeCharDevice`
  pour savoir si stdin est piped vs terminal ? — pattern Go standard
- [ ] **Codes retour** : on suit la convention `sysexits.h` (64-78) ou on reste
  simple (0/1/2/3) ? — restons simples en v1
- [ ] **Templates embarqués** : on embarque les 4 templates (story, analysis,
  canvas, tests) dès cette story même si seul `story.md` est utilisé en
  CORE-001, pour ne pas avoir à modifier le binaire en CORE-002 ?
- [ ] **Liste blanche des préfixes d'ID** : restreindre à
  `STORY|EXT|BACK|CORE|UI|INT|DOC` ou accepter tout préfixe `[A-Z]+` ?

## Notes

- Référentiel de méthode SPDD : <https://martinfowler.com/articles/structured-prompt-driven/>
- Templates de référence : [`templates/story.md`](../templates/story.md),
  [`templates/analysis.md`](../templates/analysis.md),
  [`templates/canvas-reasons.md`](../templates/canvas-reasons.md)
- Architecture Go pressentie (sous réserve de confirmation en analyse) :
  - `cmd/yukki/main.go` — entrée Cobra
  - `internal/workflow/story.go` — logique de la commande story
  - `internal/provider/claude.go` — wrapper du CLI `claude`
  - `internal/provider/provider.go` — interface `Provider` (préparée pour Copilot CLI plus tard)
  - `internal/templates/templates.go` — chargement template (embed + override projet)
  - `internal/artifacts/writer.go` — écriture des artefacts SPDD avec calcul d'id
- Tests : `go test ./...` doit passer ; tests d'intégration moqués via un
  `Provider` factice qui ne lance pas vraiment `claude`

### Décisions de nommage et organisation GitHub (verrouillées)

- **Nom retenu** : `yukki` (5 lettres, 2 k's) — variante affectueuse de
  *yuki* 雪 (neige), métaphore page blanche structurée
- **Org GitHub** : `yukki-project` — confirmée
  ([github.com/yukki-project](https://github.com/yukki-project))
- **Repo principal** : `yukki-project/yukki` — **monorepo** v1, qui contient
  à la fois la CLI (`cmd/yukki`), le canvas editor (à venir, UI-001) et la
  bibliothèque interne (`internal/...`)
- **Module Go** : `github.com/yukki-project/yukki`
- **Binaire** : `yukki` (sans suffixe `-cli`)
- **Domaine cible** : `yukki.dev` ou `yukki.tools` (à vérifier post-MVP)
