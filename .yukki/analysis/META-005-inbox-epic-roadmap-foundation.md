---
id: META-005
slug: inbox-epic-roadmap-foundation
story: .yukki/stories/META-005-inbox-epic-roadmap-foundation.md
status: implemented
created: 2026-05-04
updated: 2026-05-06
---

# Analyse — Foundation Inbox / Epic / Roadmap

> Contexte stratégique pour `META-005-inbox-epic-roadmap-foundation`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase
> (10 mots-clés × 6 modules, beaucoup déjà connu de META-004).
> Ne duplique ni la story ni le canvas REASONS.

## Mots-clés métier extraits

`Inbox` (capture brute, discovery zone) · `Epic` (regroupement
thématique) · `Roadmap` (vue projection Now/Next/Later) ·
`promotion` (Inbox → Story OU Inbox → Epic) · `AllowedKinds`
(inventaire Go) · `spddSubdirs` / `InitializeSPDD` (init arbo) ·
`embed.FS` / `Loader` (templates) · `frontmatter` (struct `Meta`) ·
`kanban` Now/Next/Later (vue projection) · préfixes d'ID
`INBOX-` / `EPIC-` / `ROADMAP-`.

## Concepts de domaine

> Modélisation au sens [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md)
> (Entity / Value Object / Invariant / Integration / Domain Event).

### Existants (déjà dans le code)

- **AllowedKinds (Value Object)** — Whitelist immutable des kinds
  reconnus par l'inventaire :
  `["stories", "analysis", "prompts", "tests"]` ([internal/artifacts/lister.go:24](../../internal/artifacts/lister.go#L24)).
  Exposée publiquement via `AllowedKinds()` qui retourne une copie
  fraîche. Toute extension doit passer par cette liste, sinon
  `ListArtifacts` retourne `ErrInvalidKind`.

- **spddSubdirs (Value Object)** — Liste des sous-dossiers créés à
  l'init :
  `["stories", "analysis", "prompts", "tests", "methodology", "templates"]`
  ([internal/uiapp/app.go:54](../../internal/uiapp/app.go#L54)). **Note**
  surface plus large que `AllowedKinds` (inclut `methodology` et
  `templates` qui ne sont pas des kinds d'artefact mais des dossiers
  de support).

- **Meta (Entity / frontmatter typé)** — Vue typée du frontmatter de
  tout artefact ([internal/artifacts/lister.go:36-45](../../internal/artifacts/lister.go#L36-L45)).
  Champs : `ID`, `Slug`, `Title`, `Status`, `Updated`, `Priority`,
  `Path`, `Error`. Tout artefact qui ne match pas ce shape est listé
  en erreur (champ `Error` peuplé) — l'inventaire ne planque pas le
  fichier mais le surface comme cassé.

- **Templates embarqués (Value Object)** — 4 fichiers `.md` embarqués
  via `//go:embed embedded/story.md embedded/analysis.md embedded/canvas-reasons.md embedded/tests.md`
  dans [internal/templates/templates.go:16](../../internal/templates/templates.go#L16).
  4 méthodes dédiées sur le Loader : `LoadStory`, `LoadAnalysis`,
  `LoadCanvasReasons`, `LoadTests`. Pattern fermé (1 méthode par
  template).

- **InitializeSPDD (Entity)** — Fonction
  ([internal/uiapp/app.go:206-253](../../internal/uiapp/app.go#L206-L253))
  qui crée l'arbo + copie les 4 templates sous
  `<projectDir>/.yukki/templates/`. Idempotente (`os.MkdirAll`,
  `os.WriteFile` overwrite). Liste des templates à copier hardcodée
  L228-237.

- **ShellMode (frontend Value Object)** — Type union TypeScript
  fermé : `'stories' | 'analysis' | 'prompts' | 'tests' | 'settings' | 'workflow'`
  ([frontend/src/stores/shell.ts:5](../../frontend/src/stores/shell.ts#L5)).
  Constante miroir `SPDD_KINDS` (L9). `TITLES` map dans `SidebarPanel.tsx`
  pour les libellés affichés.

### Nouveaux (à introduire)

- **Inbox (Entity)** — Artefact de capture brute, à faible friction,
  vivant en discovery zone. Frontmatter proposé : `id` (préfixe
  `INBOX-NNN`), `slug`, `title`, `status: unsorted | promoted | rejected`,
  `promoted-to: <STORY-NNN | EPIC-NNN>` (optionnel), `created`,
  `updated`. Match `Meta` standard ✅.

- **Epic (Entity)** — Regroupement thématique de stories liées.
  Frontmatter proposé : `id` (préfixe `EPIC-NNN`), `slug`, `title`,
  `status: draft | in-progress | mature | done`, `child-stories: [STORY-NNN, ...]`,
  `created`, `updated`. Match `Meta` standard ✅.

- **Roadmap (Entity, schéma divergent)** — Vue projection Now/Next/Later.
  Frontmatter proposé : `id: roadmap-<slug>` (ou simplement
  `roadmap-current`), `slug`, `title: "Current Roadmap"`,
  `status: live`, `columns: [{id, label, epics: [...], standalone-stories: [...]}]`,
  `updated`. **Schéma plus riche que `Meta`** : champ `columns`
  spécifique. Le `Meta` standard captera quand même
  `id/slug/title/status/updated` (les autres champs sont ignorés
  silencieusement par `yaml.Unmarshal`).

- **Discovery → Delivery flow (Domain Event)** — Concept méthodologique
  qui n'a pas d'incarnation directe dans le code (c'est de la doc),
  mais qui guide la cohérence des stories enfants : un Inbox se
  promeut vers Story (atomique) ou Epic (gros chantier) ; la Roadmap
  projette les Epics + Stories standalone.

- **Préfixes d'ID `INBOX-` / `EPIC-` / `ROADMAP-` (Invariant)** — 3
  nouveaux préfixes ajoutés à la convention `CLAUDE.md`. Aujourd'hui
  les préfixes existants sont `CORE-`, `UI-`, `INT-`, `DOC-`, `META-`,
  `TEST-`. Les 3 nouveaux suivent le même pattern (nom-significatif-NNN).

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** l'absence de niveaux discovery (Inbox), engagement
(Epic + Story) et projection (Roadmap) dans la méthodologie SPDD du
projet yukki, **on choisit** d'introduire la **foundation
scaffolding-only** — déclaration des 3 nouveaux types dans les 3
sources de vérité (`AllowedKinds` Go, `spddSubdirs` Go, `ShellMode` /
`SPDD_KINDS` frontend), 3 templates embarqués, 3 nouveaux dossiers à
l'init, doc des préfixes — **plutôt qu'**embarquer la chaîne complète
(capture rapide UI + promotion workflow + kanban roadmap rendu) dans
une seule story (qui ferait ~5j, scope INVEST cassé) **et plutôt
qu'**introduire seulement la roadmap-vue (sans les types d'artefacts
qu'elle est censée projeter), **pour atteindre** une bascule
incrémentale propre où chaque story enfant (`INBOX-001`, `EPIC-001`,
`ROADMAP-001`, …) peut s'appuyer sur une infrastructure stable,
**en acceptant** un livrable partiel sans feature utilisateur visible
immédiate (juste 3 nouveaux dossiers vides + reconnaissance dans le
hub).

### Alternatives considérées

- **Tout en une story (foundation + capture + promotion + kanban)** —
  Rejetée : SPIDR Small cassé (5j+), 2-3 modules avec deliverables
  indépendants, mix CRUD + UI + workflow ; trace SPIDR explicite dans
  la story.
- **Démarrer par la roadmap-vue (kanban)** — Rejetée : produit
  visuellement engageant mais vide tant que les Epics/Stories
  standalone ne sont pas un kind reconnu ; ordre logique inverse.
- **Réutiliser le kind `stories` avec un champ `type: inbox | epic | story`** —
  Rejetée : casse la sémantique de `AllowedKinds` (chaque kind = un
  dossier dédié), complexifie le parsing et le listing (filtrage par
  champ vs par dossier), perd la lisibilité dans `git log` /
  exploration arbo.
- **Roadmap au format YAML pur (`roadmap/current.yaml`)** — Rejetée
  côté story (cf. OQ résolue) : casse la cohérence `.md`-everywhere,
  ajoute un cas particulier dans `ParseFrontmatter` qui sait lire
  `--- ... ---` mais pas un YAML racine. Le `.md` avec frontmatter
  riche atteint le même niveau de structure.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/artifacts` (lister.go) | fort | modification (étendre `allowedKinds` de 4 → 7 entries) |
| `internal/uiapp` (app.go) | fort | modification (étendre `spddSubdirs` de 6 → 9 entries + étendre la liste des templates copiés) |
| `internal/templates` (templates.go + embedded/) | fort | création (3 nouveaux templates) + modification (`embed.FS` + Loader : `LoadInbox`, `LoadEpic`, `LoadRoadmap`) |
| `frontend/src/stores/shell.ts` | moyen | modification (étendre `ShellMode` + `SPDD_KINDS`) |
| `frontend/src/components/hub/SidebarPanel.tsx` | faible | modification (étendre `TITLES` map de 6 → 9 entries) |
| Tests Go (`lister_test.go`, `app_test.go`) | moyen | modification (fixtures + assertions sur les 7 kinds / 9 subdirs) |
| `.yukki/templates/` | fort | création (3 nouveaux fichiers `inbox.md`, `epic.md`, `roadmap.md`) |
| `.yukki/README.md` (méthodologie) | moyen | modification (section sur la chaîne discovery → delivery) |
| `CLAUDE.md` | moyen | modification (tableau des préfixes : ajout `INBOX-`, `EPIC-`, `ROADMAP-` ; section vocabulaire de la hiérarchie) |

## Dépendances et intégrations

- **`yaml.v3` (gopkg.in/yaml.v3)** — `ParseFrontmatter` consommé par
  `ListArtifacts` ([internal/artifacts/parser.go:28](../../internal/artifacts/parser.go#L28)).
  L'unmarshal vers `Meta` ignore silencieusement les champs en plus
  (ex. `columns:` de Roadmap), donc Roadmap pourra être listée même
  si son schéma frontmatter est plus riche que `Meta`. **À vérifier
  par test** : un fichier roadmap valide est listé sans `Error`.
- **`embed.FS`** — directive `//go:embed` est statique : pour ajouter
  3 templates il faut éditer la directive et ajouter les fichiers
  source dans `internal/templates/embedded/`. Pas de générateur, pas
  de wildcard utile (déjà énuméré).
- **Cohérence triple-source** — Le couple `(allowedKinds, spddSubdirs)`
  Go et `(ShellMode, SPDD_KINDS, TITLES)` frontend doit être étendu
  *en sync* dans le même commit, sinon la sidebar UI montre un mode
  que le backend rejette (ou inversement).
- **Conflit potentiel avec META-004** — Si l'implémentation de
  META-005 démarre **avant** la génération de META-004 (rename
  `spdd/ → .yukki/`), les chemins du code Go pointeront encore
  `spdd/`. Si META-004 est générée pendant l'implémentation de
  META-005, rebase nécessaire. Pas de conflit conceptuel — META-004
  ne touche pas aux kinds.

## Risques et points d'attention

> Catégories selon [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md)
> (Sécurité avec STRIDE / Performance / Opérationnel / Intégration /
> Data / Compatibilité).

- **Data — Schéma frontmatter Roadmap divergent** : la Roadmap a un
  frontmatter plus riche que `Meta` (champ `columns: [...]`). Le
  `Meta` actuel ne déclare pas ce champ, donc `yaml.Unmarshal` l'ignore
  silencieusement → la roadmap est listée mais sans information
  spécifique. *Impact : moyen* (la liste fonctionne mais sans
  affichage dédié). *Probabilité : élevée* (par construction).
  *Mitigation* : pour la foundation (META-005), on accepte ce
  comportement — la Roadmap est listée comme tout autre artefact ;
  l'affichage dédié kanban est `ROADMAP-001`. Documenter cette
  divergence dans le canvas Norms.

- **Opérationnel — Cohérence triple-source de vérité** : les 3
  sources `allowedKinds` (Go lister), `spddSubdirs` (Go uiapp), et
  `SPDD_KINDS` / `ShellMode` (frontend) doivent être maintenues en
  sync. Aujourd'hui elles sont déjà séparées mais cohérentes ; ajouter
  3 entries dans 3 endroits = 9 modifications synchronisées. *Impact :
  moyen* (UI cassée si désync). *Probabilité : moyenne* (rename
  mécanique, mais 3 endroits hétérogènes). *Mitigation* : test
  `TestAllowedKindsMatchesSubdirs` qui vérifie que `AllowedKinds()`
  est un sous-ensemble de `spddSubdirs` ; pour le frontend, vérifier
  visuellement (pas de runtime check côté Go-frontend).

- **Compatibilité — Projets pré-existants** : un projet yukki déjà
  initialisé n'a pas les 3 nouveaux dossiers. AC4 demande qu'un
  re-init crée les nouveaux sans toucher aux existants. *Impact :
  faible* (init est idempotent par design : `MkdirAll` ne fait rien
  si le dossier existe). *Probabilité : faible*. *Mitigation* :
  test `TestInitializeSPDD_PreExistingProject` qui setup une arbo
  ancienne (4 sous-dossiers), rejoue InitializeSPDD, vérifie que les
  9 sous-dossiers existent et qu'aucun fichier n'a été écrasé.

- **Intégration — Templates embarqués manquants** : un template
  oublié dans la directive `//go:embed` casse `InitializeSPDD` au
  runtime (`ErrEmbedMissing`, déjà géré par `LoadStory` etc.).
  *Impact : élevé* (init plante). *Probabilité : faible* (la
  directive `//go:embed` est explicite, fail-fast à la compilation
  si le fichier manque). *Mitigation* : compilation passe = la
  directive est correcte.

- **Data — Conflit ID préfixes** : un projet existant a peut-être
  déjà un fichier `EPIC-001.md` ou `INBOX-001.md` créé manuellement
  (pre-META-005, hors convention). *Impact : faible* (collision lors
  d'un futur `yukki story`). *Probabilité : très faible* (le projet
  yukki actuel n'a aucun fichier qui matche ces préfixes — vérifié
  par grep). *Mitigation* : aucune, on accepte.

## Cas limites identifiés

> Selon [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md)
> (BVA + EP + checklist 7 catégories).

- **Roadmap singleton avec frontmatter étendu** — Un fichier
  `roadmap/current.md` avec un frontmatter qui contient `columns: [...]`
  et la struct `Meta` standard (`id, slug, title, status, updated`).
  L'inventaire le liste comme tout autre artefact ; les champs
  `columns` sont ignorés mais préservés dans le fichier source.

- **Projet pré-existant + re-init** — Couvert par AC4. Vérifier
  que `os.MkdirAll` sur les 3 nouveaux dirs ne touche pas aux 4 dirs
  existants ni aux fichiers qu'ils contiennent.

- **Template manquant à la compilation** — Si on oublie d'ajouter un
  fichier physique dans `internal/templates/embedded/` mais qu'on
  étend la directive `//go:embed`, la compilation Go échoue. Garde-
  fou inhérent au compilateur, pas de mitigation supplémentaire.

- **Frontend ShellMode étendu de 6 → 9 modes** — La sidebar reste
  navigable ; pas de débordement layout (la sidebar `aside` a une
  largeur fixe et utilise un scroll si nécessaire). Smoke test
  manuel suffit.

- **Inbox mal classé (placé dans `epics/` au lieu de `inbox/`)** —
  L'utilisateur crée par erreur un fichier avec préfixe `INBOX-001`
  dans le dossier `epics/`. yukki le list dans la kind `epics`
  (le kind est dérivé du dossier, pas du préfixe). Pas de
  validation cross-cohérence à ce niveau (out of scope foundation).

## Decisions à prendre avant le canvas

- [ ] **Schéma frontmatter de la Roadmap** : aligner partiellement
  sur `Meta` (id, slug, title, status, updated présents) + champ
  `columns` ignoré silencieusement par l'inventaire. *Recommandation
  analyse* : valider ; le canvas Norms documentera cette divergence
  acceptée. Pas d'introduction d'une variante `RoadmapMeta` à ce
  stade.

- [ ] **Loader templates : 3 méthodes dédiées vs méthode générique** :
  les 4 templates existants ont chacun leur méthode (`LoadStory`,
  `LoadAnalysis`, etc.). Pour les 3 nouveaux : (a) ajouter
  `LoadInbox`, `LoadEpic`, `LoadRoadmap` (cohérent), ou (b) refactorer
  vers `Load(name string)` générique (cassant). *Recommandation
  analyse* : option (a) — 3 méthodes dédiées, refactoring générique
  hors scope (pourrait être une story `META-006` séparée si jugé
  utile).

- [ ] **Contenu des templates `inbox.md` / `epic.md` / `roadmap.md`** :
  squelettes minimaux (frontmatter + 2-3 sections placeholders) ?
  *Recommandation analyse* : minimal pour Inbox (capture rapide :
  frontmatter + section "Idée" + section "Notes"), un peu plus
  fourni pour Epic (frontmatter + Vision + AC haut niveau + Stories
  enfants + Notes), squelette de roadmap avec 3 colonnes vides
  Now/Next/Later.

- [ ] **Test cross-cohérence Go ↔ frontend** : créer un test Go qui
  affirme `len(AllowedKinds()) == 7` et un test frontend qui
  affirme `SPDD_KINDS.length === 7` ; ou un script CI qui parse les
  deux sources et compare. *Recommandation analyse* : pour la
  foundation, suffisant de poser 2 tests indépendants (1 Go, 1 TS)
  qui asserent les listes attendues. Le check cross-source automatique
  est nice-to-have, hors scope de cette story.
