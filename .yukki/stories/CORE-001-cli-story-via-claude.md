---
id: CORE-001
slug: cli-story-via-claude
title: Commande CLI `yukki story` génère une user story SPDD via Claude CLI
status: done
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

Le projet **yukki** ([github.com/yukki-project/yukki](https://github.com/yukki-project/yukki))
est un outil open source en Go qui implémente la méthode
[Structured Prompt-Driven Development](https://martinfowler.com/articles/structured-prompt-driven/).
La v1 couvre tout le cycle SPDD avec deux surfaces : une CLI et un canvas
editor graphique. Cette story est la **première tranche fondatrice** : faire
fonctionner `yukki story` en orchestrant `claude` CLI, et établir l'architecture
sur laquelle s'appuieront CORE-002 (6 autres commandes), UI-001 (canvas editor)
et INT-001 (provider Copilot CLI).

## Business Value

- **Preuve de concept** : démontre que SPDD peut tourner via une orchestration
  de CLI (pas besoin de gérer le SDK Anthropic, l'authentification ou le rate
  limiting — déléguées à `claude`).
- **Valeur livrée seule** : un utilisateur peut déjà générer une user story
  SPDD bien structurée dans n'importe quel projet, sans copier-coller un prompt
  dans Claude Code ou un autre client.
- **Fondation réutilisable** : les 6 autres commandes hériteront de
  l'abstraction provider, du loader de templates et du writer d'artefacts.

## Scope In

- Binaire Go unique `yukki`, distribuable en cross-platform
  (Linux / macOS / Windows)
- Sous-commande `yukki story` qui prend la description en argument
  (`yukki story "..."`) ou via stdin (`echo "..." | yukki story`)
- Détection et invocation du `claude` CLI installé sur la machine de
  l'utilisateur
- Utilisation du template `templates/story.md` du projet courant si présent,
  sinon fallback sur un template embarqué dans le binaire
- Écriture du fichier produit dans `stories/<id>-<slug>.md` du **répertoire
  courant**
- Génération automatique de l'`id` (incrément du plus grand suffix trouvé dans
  `stories/<préfixe>-NNN-*.md`) avec préfixe configurable via `--prefix`
  (défaut : `STORY`)
- Slug auto-généré depuis le titre extrait par Claude (kebab-case, 5 mots max)
- Codes de retour distincts par catégorie : succès, erreur utilisateur
  (description vide, arguments invalides), erreur provider (`claude`
  indisponible ou échec de génération), erreur I/O (template introuvable,
  écriture impossible)
- Logs structurés (texte en `--verbose`, JSON en `--log-format=json`)

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
- Hooks et déclencheurs automatiques sur événements
- Publication sur registry (Homebrew, Scoop, asdf, etc.) → tâche post-MVP

## Acceptance Criteria

### AC1 — Génération nominale

- **Given** un utilisateur a `claude` CLI installé et authentifié, et un
  répertoire `stories/` (vide ou non) dans son projet
- **When** il lance `yukki story "ajouter un export CSV des vulnérabilités Trivy"`
- **Then** un fichier `stories/STORY-001-export-csv-trivy.md` est créé
  (ou STORY-NNN selon le prochain id disponible), respectant la structure du
  template (les 7 sections : Background, Business Value, Scope In, Scope Out,
  Acceptance Criteria, Open Questions, Notes ; front-matter complet ; ≥2 AC
  en Given/When/Then), et le chemin du fichier créé est affiché sur stdout

### AC2 — Préfixe d'ID configurable

- **Given** le répertoire `stories/` contient déjà `EXT-001-foo.md` et
  `EXT-007-bar.md`
- **When** l'utilisateur lance `yukki story "..." --prefix=EXT`
- **Then** le fichier produit est nommé `stories/EXT-008-<slug>.md`
  (incrément depuis le plus grand id du même préfixe)

### AC3 — `claude` CLI absent

- **Given** `claude` n'est pas dans le `PATH`
- **When** l'utilisateur lance `yukki story "..."`
- **Then** un message d'erreur explicite est affiché sur stderr indiquant que
  `claude` est introuvable et comment l'installer, le code retour signale une
  erreur de provider, et aucun fichier n'est créé

### AC4 — Description vide

- **Given** l'utilisateur lance `yukki story` sans argument et sans stdin
- **When** la commande s'exécute
- **Then** un message d'usage est affiché sur stderr, le code retour signale
  une erreur utilisateur, aucun appel à `claude` n'est fait, aucun fichier
  n'est créé

### AC5 — Description via stdin

- **Given** un utilisateur a une description multi-lignes
  (ex. dump de ticket dans un fichier)
- **When** il lance `cat ticket.txt | yukki story`
- **Then** la story est générée à partir du contenu de stdin (équivalent à
  passer cette description en argument)

### AC6 — Template manquant

- **Given** le binaire est lancé dans un répertoire **sans**
  `templates/story.md` ni configuration spécifique
- **When** la commande s'exécute
- **Then** le template embarqué dans le binaire est utilisé en fallback, et
  un message informatif sur stderr indique cette source

### AC7 — Idempotence

- **Given** un utilisateur lance deux fois la même commande avec la même
  description
- **When** la deuxième exécution se produit
- **Then** un nouveau fichier est créé avec un id incrémenté (pas
  d'écrasement silencieux), sauf si `--force --id=<id>` est explicitement
  fourni

## Open Questions

- [x] **Stratégie de génération via `claude`** : ~~template brut OU prompt
  structuré ?~~ → **prompt structuré** (option b). `yukki` construit en
  amont du template les règles SPDD applicables (INVEST + Given/When/Then
  déclaratif + slug kebab-case + sweet spot 3-5 AC + couverture happy +
  erreur user + cas limite), puis injecte le template `templates/story.md`,
  puis la description utilisateur. Justification : la valeur centrale de
  SPDD est la rigueur du prompt — si `yukki` n'injecte pas ces règles, on
  rate notre raison d'être. Le coût en tokens supplémentaires est
  acceptable. Externalisation du prompt système dans un fichier surchargeable
  (option c) reportée en post-MVP.
- [x] **Préfixes d'ID acceptés** : ~~free-form OU liste blanche ?~~ →
  **mode hybride** (option c). Par défaut, tout préfixe matchant `[A-Z]+`
  est accepté (philosophie OSS : on ne dicte pas la convention de
  nommage des projets utilisateurs). Le `--help` affiche la liste suggérée
  (`STORY|EXT|BACK|CORE|UI|INT|DOC|OPS|META`) à titre indicatif.
  Un flag `--strict-prefix` opt-in active la validation par liste blanche
  pour les équipes qui veulent harmoniser. Justification : *best of both
  worlds* — flexible par défaut, garde-fou opt-in.

## Notes

- Référentiel de méthode SPDD :
  <https://martinfowler.com/articles/structured-prompt-driven/>
- Templates de référence : [`templates/story.md`](../templates/story.md),
  [`templates/analysis.md`](../templates/analysis.md),
  [`templates/canvas-reasons.md`](../templates/canvas-reasons.md)
- Tests : `go test ./...` doit passer ; tests d'intégration moqués via un
  `Provider` factice qui ne lance pas vraiment `claude`

### Application des refs methodology

Cette story applique les 3 refs `spdd/methodology/` qui s'adressent au
skill `/spdd-story` :

- [`invest.md`](../methodology/invest.md) — évaluation INVEST des 6
  critères, détaillée ci-dessous
- [`spidr.md`](../methodology/spidr.md) — découpage SPIDR analysé
  ci-dessous (5 axes, décision de garder en l'état)
- [`acceptance-criteria.md`](../methodology/acceptance-criteria.md) —
  les 7 AC respectent les règles : Given/When/Then **déclaratif**, pas
  de "should", pas de termes vagues, couverture **happy** (AC1) +
  **erreur user** (AC4) + **cas limite** (AC6 template fallback). Les
  AC d'erreur (AC3, AC4) regroupent plusieurs effets observables sous
  forme d'**état d'échec composite**, exception pragmatique au "1
  comportement par AC" pour les cas où l'échec doit être validé en bloc.

### Évaluation INVEST

> Détail complet (cross-référence) : voir l'exemple concret de CORE-001
> dans [`invest.md` — section *Exemple concret*](../methodology/invest.md#exemple-concret--core-001-de-yukki).

Synthèse :

| Critère | Verdict | Justification |
|---|---|---|
| Independent | ✅ | aucune dépendance amont |
| Negotiable | ✅ | 2 Open Questions explicites |
| Valuable | ✅ | un user peut générer une story SPDD dans n'importe quel projet |
| Estimable | ✅ | architecture pressentie + modules listés |
| Small | ⚠️ | 7 AC, à la limite haute. Justifié *story fondatrice* — voir analyse SPIDR ci-dessous |
| Testable | ✅ | chaque AC en G/W/T avec résultat observable |

5/6 critères passent ; **Small** justifié via SPIDR analysé plutôt que
satisfait littéralement.

### Découpage SPIDR — analyse et décision

Story à 7 AC, donc à challenger contre [`spidr.md`](../methodology/spidr.md)
(framework SPIDR de Mike Cohn).

| Axe | Application | Verdict |
|---|---|---|
| **P** — Paths | AC1/AC2/AC5/AC7 sont des paths variants | les paths partagent ~80 % de la stack (Cobra + provider + writer) ; scinder créerait de la duplication |
| **I** — Interfaces | une seule (CLI) | n/a |
| **D** — Data | n/a | n/a |
| **R** — Rules | possible : "MVP strict" (AC1+3+4) puis "Variants" (AC2+5+6+7) | le MVP strict (préfixe figé, sans stdin, sans fallback embed) a peu de valeur user seul |
| **S** — Spike | n/a | n/a |

**Décision** : garder en l'état. La fondation architecturale
(Cobra + provider abstraction + writer + template loader) se livre d'un bloc
parce que c'est précisément la *valeur* de la story fondatrice — chaque
"variant" séparé reposerait sur la même infrastructure, qu'il faudrait écrire
à un moment ou à un autre.

### Architecture pressentie (indicatif)

> Ces packages sont une indication pour l'analyse stratégique
> (`/spdd-analysis`). Le canvas REASONS section *Operations* tranchera les
> signatures et chemins définitifs.

- `cmd/yukki/main.go` — entrée Cobra
- `internal/workflow/story.go` — logique de la commande story
- `internal/provider/claude.go` — wrapper du CLI `claude`
- `internal/provider/provider.go` — interface `Provider` (préparée pour
  Copilot CLI plus tard)
- `internal/templates/templates.go` — chargement template (avec fallback
  embarqué)
- `internal/artifacts/writer.go` — écriture des artefacts SPDD avec calcul
  d'id

### Décisions de nommage et organisation GitHub (verrouillées)

- **Nom retenu** : `yukki` (5 lettres, 2 k's) — variante affectueuse de
  *yuki* 雪 (neige), métaphore page blanche structurée. Le doublement du
  **k** distingue le projet du nom courant *yuki*, plus encombré côté
  namespaces.
- **Org GitHub** : `yukki-project`
  ([github.com/yukki-project](https://github.com/yukki-project))
- **Repo principal** : `yukki-project/yukki` — **monorepo** v1, qui contient
  à la fois la CLI (`cmd/yukki`), le canvas editor (à venir, UI-001) et la
  bibliothèque interne (`internal/...`)
- **Module Go** : `github.com/yukki-project/yukki`
- **Binaire** : `yukki` (sans suffixe `-cli`)
- **Domaine cible** : `yukki.dev` ou `yukki.tools` (à vérifier post-MVP)
