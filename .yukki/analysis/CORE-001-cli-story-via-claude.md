---
id: CORE-001
slug: cli-story-via-claude
story: .yukki/stories/CORE-001-cli-story-via-claude.md
status: synced
created: 2026-04-30
updated: 2026-05-08
---

# Analyse — Commande CLI `yukki story` génère une user story SPDD via Claude CLI

## Mots-clés métier extraits

`claude CLI`, `subprocess`, `story`, `frontmatter`, `INVEST`, `SPIDR`,
`Given/When/Then`, `prefix`, `slug`, `id`, `stdin`, `code de retour`,
`log structuré`, `Cobra`, `Go`, `embed`, `template fallback`, `provider
abstraction`, `prompt structuré système`.

## Concepts de domaine

> Identification selon [`domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le repo yukki)

- **MethodologyReference** (Entity, posée par META-001/META-002) — 7 refs
  publiées dans `.yukki/methodology/`. Trois concernent directement
  `/yukki-story` consommé par `yukki story` : `invest.md`, `spidr.md`,
  `acceptance-criteria.md`. Quatre concernent le canvas REASONS aval :
  `domain-modeling.md`, `risk-taxonomy.md`, `edge-cases.md`,
  `decisions.md`.
- **Templates** (Entity) — `.yukki/templates/story.md` existe déjà avec
  frontmatter normalisé et structure 7 sections (Background, Business
  Value, Scope In, Scope Out, AC, Open Questions, Notes). C'est le
  template que `yukki story` doit consommer.
- **Convention frontmatter normalisé** (Invariant) — `id`, `slug`, `title`,
  `status`, `created`, `updated`, `owner`, `modules`. Toute story produite
  par `yukki story` doit le respecter.
- **Section `## Changelog`** (Pattern) — utilisée pour tracer les évolutions
  des canvas et des refs methodology. Pas pertinente sur les stories en v1.

### Nouveaux (à introduire dans le code Go)

- **Entity `Story`** — fichier dans `stories/<id>-<slug>.md`, identifié par
  son `id`, cycle de vie `draft → reviewed → accepted`. Pas réifié comme
  type Go en v1 — `yukki story` produit le fichier markdown directement.
- **Value Object `StoryID`** — chaîne `<préfixe>-<numéro>`, immutable.
  Deux StoryID identiques sont identiques (par valeur).
- **Value Object `Slug`** — chaîne kebab-case, ≤ 5 mots, dérivée du titre
  extrait par Claude.
- **Value Object `Description`** — texte d'entrée (argument ou stdin).
- **Invariant 1** — *"Le numéro d'un id généré est strictement supérieur
  au plus grand numéro existant pour le préfixe donné dans `stories/`."*
- **Invariant 2** — *"Le frontmatter YAML de la story produite est
  parseable par `yq`."*
- **Invariant 3** — *"La story produite respecte les règles de
  [`acceptance-criteria.md`](../methodology/acceptance-criteria.md) :
  G/W/T déclaratif, 3-5 AC, sans 'should', couverture happy + user-error +
  cas limite."* (Garanti par le **prompt structuré** qui injecte ces
  règles avant le template.)
- **Integration point 1** — `claude` CLI invoqué via `os/exec` (stdin =
  prompt structuré + template + description ; stdout = story générée).
- **Integration point 2** — file system : lecture du template
  (`./templates/story.md` du projet courant en priorité, sinon embed.FS
  fallback) ; écriture de la story dans `./stories/<id>-<slug>.md`.
- **Integration point 3** — stdin / stdout / stderr (CLI POSIX).
- **Domain event `StoryGenerated`** — non réifié en v1 (potentiel
  déclencheur d'un commit Git automatique, post-MVP).

## Approche stratégique

> Format Y-Statement selon [`decisions.md`](../methodology/decisions.md).

> Pour résoudre le besoin de **générer des user stories SPDD rigoureuses
> depuis n'importe quel projet sans copier-coller manuel dans Claude
> Code**, on choisit une **CLI Go monolithique en Cobra qui orchestre
> `claude` CLI comme subprocess**, avec un **prompt système structuré
> injectant les règles SPDD (INVEST + G/W/T déclaratif + slug kebab-case
> + sweet spot 3-5 AC + couverture happy/user-error/edge-case) avant le
> template puis la description**, plutôt que d'**embarquer un SDK
> Anthropic** ou de **passer le template brut à `claude` sans
> pré-prompting**, pour atteindre **portabilité (binaire unique
> cross-platform), maintenabilité (pas de gestion d'auth / rate-limit /
> version API), et rigueur de sortie garantie (les règles SPDD ne sont
> pas optionnelles)**, en acceptant **une dépendance externe à `claude`
> CLI préinstallé et un prompt verbeux qui consomme plus de tokens
> qu'un template brut**.

### Alternatives écartées

- **SDK Anthropic embarqué** — écarté : oblige à gérer l'authentification,
  les rate-limits, le versioning d'API ; lock-in vendor ; perd la
  flexibilité multi-provider promise par INT-001 (Copilot CLI).
- **Template brut sans pré-prompting** — écarté : la qualité de la story
  générée dépend du *modèle* Claude, qui peut ignorer les règles SPDD si
  on ne les rappelle pas explicitement. On rate la valeur centrale
  (**rigueur du prompt**).
- **Mode interactif Q&A pour clarifier la story** — écarté : reporté en
  post-MVP. v1 produit la story d'un coup à partir de la description
  fournie ; l'humain raffine en édition manuelle ou via une nouvelle
  invocation.
- **Génération directe sans `claude` (templates remplis par Go pur)** —
  écarté : impossible de générer une story riche et contextuelle sans
  LLM ; le rôle de `yukki` est précisément l'orchestration LLM.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `cmd/yukki/` | fort | création de l'entrypoint Cobra |
| `internal/workflow/` | fort | création de la logique métier de la commande `story` |
| `internal/provider/` | fort | création (interface `Provider` + implémentation `claude`) |
| `internal/templates/` | fort | création (loader fichier + fallback `embed.FS`) |
| `internal/artifacts/` | fort | création (writer Story + id calculator + slug generator) |
| `go.mod` / `go.sum` | fort | initialisation du module Go |
| `.github/workflows/` | moyen | CI cross-platform (Linux / macOS / Windows) build + test |
| `Makefile` ou équivalent | faible | helpers `build`, `test`, `lint` (optionnel pour v1) |

## Dépendances et intégrations

- **Externe critique** : `claude` CLI installé et authentifié sur la
  machine de l'utilisateur. Pas géré par `yukki`.
- **Bibliothèques Go pressenties** :
  - `github.com/spf13/cobra` — framework CLI standard de l'écosystème Go
  - `embed` (stdlib) — fallback de templates dans le binaire
  - `os/exec` (stdlib) — invocation de `claude` en subprocess
  - `log/slog` (stdlib Go 1.21+) — logging structuré (texte + JSON
    selon `--log-format`)
  - `gopkg.in/yaml.v3` ou équivalent — vérification que le frontmatter
    produit est parseable (test post-génération)
- **Pas de dépendance** sur un SDK Anthropic ni sur un parser markdown
  côté Go (Claude produit le markdown, on l'écrit tel quel).

## Risques et points d'attention

> Catégorisation selon [`risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Sécurité (Information disclosure)** — *Impact moyen, probabilité
  faible*. La description utilisateur peut contenir des données
  sensibles loggées par `claude --verbose`. **Mitigation** : invoquer
  `claude` sans verbose par défaut ; documenter dans `--help` que le
  contenu transitant peut être loggé par `claude` selon la
  configuration utilisateur de `claude`.
- **Performance / Reliability** — *Impact faible, probabilité forte*.
  `claude` peut prendre 10-60 s pour générer une story complète.
  L'utilisateur ne sait pas si `yukki` est figé. **Mitigation** :
  spinner + message *"génération en cours…"* affiché après 5 s ; pas
  de timeout côté `yukki` (la patience est la responsabilité de
  l'utilisateur).
- **Opérationnel** — *Impact moyen, probabilité forte*. Sans logs
  structurés, le debug post-mortem est difficile (que s'est-il passé
  quand l'utilisateur dit *"yukki a planté"* ?). **Mitigation** : logs
  JSON activables via `--log-format=json` dès v1 (déjà dans Scope In).
- **Intégration externe** — *Impact fort, probabilité moyenne*. `claude`
  CLI v2 peut changer d'interface (rename d'un flag, format de sortie
  modifié). **Mitigation** : check `claude --version` au démarrage,
  message explicite si version testée vs. version trouvée diffèrent
  majeurement.
- **Data** — *Impact fort, probabilité faible*. Deux invocations
  parallèles de `yukki story --prefix=X` avec le même préfixe
  calculent le même prochain id et écrasent le même fichier.
  **Mitigation** : lock file `stories/.lock` pendant le calcul d'id +
  l'écriture, ou suffixe timestamp temporaire suivi d'un `rename`
  atomique.

## Cas limites identifiés

> Identification selon [`edge-cases.md`](../methodology/edge-cases.md).

- **Boundaries** — `stories/` vide → premier id `STORY-001` ; 999
  stories → `STORY-1000` (largeur du padding préservée) ; > 9 999
  stories → format `STORY-10000` (cas extrême mais réaliste pour des
  projets longue durée).
- **Equivalence Partitioning** — préfixe par défaut (`STORY`) /
  préfixe valide explicite (`EXT`) / préfixe invalide (`123-FOO` →
  rejet) / mode `--strict-prefix` activé avec préfixe hors liste
  blanche (rejet).
- **Null / empty** — `yukki story ""` → erreur user code 1 ; pas
  d'argument et stdin vide → message d'usage code 1 ; description
  contenant uniquement des espaces → erreur user.
- **Concurrence** — deux exécutions parallèles avec le même
  `--prefix` → ne pas écraser le même fichier (lock file ou rename
  atomique).
- **Failure modes** — `claude` absent du `PATH` → code 2 ; `claude`
  crash en cours de génération → propager, ne pas créer de fichier
  story orphelin ; `templates/story.md` corrompu → fallback embed.FS
  + warning stderr.
- **Scale** — `stories/` contenant 10 000 fichiers → le scan d'IDs
  doit rester sous la seconde (regex sur `os.ReadDir`, pas de `stat`
  individuel par fichier).
- **Security** — description contenant des backticks, `\n`, ou
  caractères YAML ambigus → ne pas casser le frontmatter de la story
  produite (Claude est responsable de l'échappement YAML correct ; on
  vérifie en post-génération via parse `yq` que le frontmatter est
  valide, sinon erreur I/O explicite).

## Décisions à prendre avant le canvas

- [ ] **Bibliothèque de logging** : `log/slog` (stdlib Go 1.21+) ou
  bibliothèque tierce (`zerolog`, `zap`) ? — Reco : `log/slog` (stdlib
  suffisante, pas de dépendance supplémentaire).
- [ ] **Padding des numéros d'id** : `STORY-001` (3 chiffres) ou
  `STORY-0001` (4 chiffres, future-proof jusqu'à 9 999) ? — Reco :
  3 chiffres minimum, élargissement automatique au-delà de 999
  (`STORY-1000` sans repadding rétroactif).
- [ ] **Détection stdin piped vs TTY** : `os.Stdin.Stat() &
  os.ModeCharDevice` (pattern canonique Go) ou autre ? — Reco : pattern
  canonique.
- [ ] **Templates embarqués** : embed.FS pour `story.md` seul (CORE-001),
  ou les 4 templates (story, analysis, canvas-reasons + un futur tests)
  dès maintenant pour ne pas modifier le binaire en CORE-002+ ? — Reco :
  les 4 dès maintenant (low cost, future-proof).
- [ ] **Lock file ou rename atomique** pour la concurrence sur le calcul
  d'id ? — Reco : rename atomique (plus simple, pas de cleanup en cas
  de crash).

## Signaux d'escalade vers /yukki-story

Aucun signal d'escalade détecté pendant l'analyse :

- INVEST déjà tracé dans la story (via les corrections d'alignement
  appliquées en commit `3cd37e6`)
- Concepts de domaine identifiés correspondent à ce qui était listé en
  Scope In de la story — pas de bounded context surprise
- Couverture des AC complète (happy + user-error + cas limite)
- Périmètre cohérent avec les modules listés en frontmatter
- Pas d'AC manquante critique
