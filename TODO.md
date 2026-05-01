# Todo — yukki

> Liste des stories SPDD à venir et leur état. Maintenue **manuellement** en
> attendant la formalisation d'un backlog SPDD propre (cf. discussion
> *META-006 candidate*). Pour les stories *écrites*, voir
> [`spdd/stories/`](spdd/stories/).
>
> **Note** : ce fichier reflète l'outil interne de session (`TodoWrite` côté
> Claude Code) et le matérialise pour qu'il survive à la fermeture de la
> conversation.

## Légende

- ✅ livré (cycle SPDD complet, `status: implemented` ou `synced` côté canvas)
- 🟡 en cours (story rédigée, en cycle)
- ⬜ à faire (pas encore de story)
- 🔧 fix méthodologique (ajustement ponctuel, pas un cycle SPDD complet)
- 🎫 action opérationnelle / ticket externe (IT, infra, hors code)

## Livrés

- ✅ **META-001** — Extraction des 4 techniques méthodologiques initiales
  (`domain-modeling.md`, `risk-taxonomy.md`, `edge-cases.md`,
  `decisions.md`) + skill `/spdd-analysis` enrichi + boucle de
  maintenance pour passer à *yukki-only* sur les exemples
- ✅ **META-002** — Backport des techniques inlinées dans `/spdd-story`
  vers 3 nouvelles refs (`invest.md`, `spidr.md`,
  `acceptance-criteria.md`) + skill `/spdd-story` enrichi
- ✅ **CORE-001** — Commande CLI `yukki story` via Claude CLI : cycle
  SPDD complet (story → clarification → analyse → canvas → génération
  Go : 8 Operations livrées sur la branche `feature/CORE-001`, en
  attente de push CI + PR → main)

## En attente — méthodologie / méta

- ⬜ **META-003** — Vérification CI no-inlining : story + analyse +
  canvas + script qui détecte les techniques inlinées dans les skills
  (`grep -E "SPIDR|INVEST|DDD|STRIDE|BVA|Y-Statement|Given/When/Then"`
  + vérification que chaque match est suivi d'un lien vers
  `spdd/methodology/`)
- ⬜ **META-004** — Méthodologie des tests : story + ref
  `spdd/methodology/testing.md` (test pyramid, table-driven, mock
  strategy, niveaux unit/intégration/contrat, coverage). **Couvre le
  gap actuel** : pas de skill `/spdd-cli-test` pour les CLI Go ; pas
  de skill `/spdd-tests` formalisé pour l'étape 6 (template-driven
  pour l'instant). Évaluera l'opportunité d'un futur
  `/spdd-tests` ou d'une généralisation de `/spdd-api-test`.
- ⬜ **META-005** — Méthodologie des commits : story + ref
  `spdd/methodology/commits.md` (Conventional Commits adaptés SPDD
  avec préfixes `feat`/`fix`/`docs`/`chore`/`refactor` + spécifiques
  SPDD `prompt-update`/`generate`/`review`/`sync` ; règles HEREDOC,
  interdiction `--amend` / `--no-verify`, footer `Co-Authored-By:`,
  scope `(spdd)` ou nom de module). Extraction depuis `CLAUDE.md` vers
  la ref ; `CLAUDE.md` pointera ensuite vers la ref.
- ⬜ **META-006** — Adoption du **format de nommage canonical SPDD** :
  `[Type]-[ID]-[DateHeure]-[Titre].md` (ex.
  `[Analysis]-CORE-001-202604301100-cli-story-via-claude.md`).
  Cycle SPDD complet (story + analyse + canvas + generate). Touche
  tous les artefacts existants (rename via `/spdd-sync` ou script),
  les 3 templates `spdd/templates/`, le writer Go
  `internal/artifacts/writer.go` (préfixe + datetime), les skills
  qui référencent des chemins relatifs, et la doc (README, CLAUDE.md,
  TODO.md, methodology/README.md). Aligne le projet avec la
  convention décrite dans l'article SPDD original.
- 🔧 **FIX** — Exposer `spdd/templates/tests.md` au niveau projet.
  Actuellement le template existe uniquement dans
  `internal/templates/embedded/tests.md` (créé pendant
  `/spdd-generate` de CORE-001 comme placeholder). Asymétrie à
  corriger : copier vers `spdd/templates/tests.md` pour que le loader
  `templates.NewLoader.LoadTests()` trouve la version projet en
  priorité.

## En attente — features projet

- ⬜ **CORE-002** — Découpage SPIDR axe **P** (Paths) en 6 stories
  filles, une par commande SPDD restante :
  - `CORE-002a` — `yukki analysis`
  - `CORE-002b` — `yukki reasons-canvas`
  - `CORE-002c` — `yukki generate`
  - `CORE-002d` — `yukki api-test`
  - `CORE-002e` — `yukki prompt-update`
  - `CORE-002f` — `yukki sync`
- 🟡 **UI-001** — Initialiser l'app desktop yukki — Wails v2 + React 18
  + TypeScript + Vite + Tailwind + shadcn/ui + bindings Go. Splittée
  SPIDR axe **I** (Interface) en 3 stories filles
  (analyse de famille en [`spdd/analysis/UI-001-init-desktop-app-wails-react.md`](spdd/analysis/UI-001-init-desktop-app-wails-react.md)) :
  - `UI-001a` — App skeleton & sub-cmd `yukki ui` + scaffold React +
    CI build matrix (~1.5j) — [story](spdd/stories/UI-001a-app-skeleton-and-subcommand.md)
  - `UI-001b` — Hub viewer (project picker, sidebar, liste stories,
    banner Claude, init SPDD empty state) (~1.5j) — [story](spdd/stories/UI-001b-hub-viewer-claude-banner.md)
  - `UI-001c` — New Story flow (modal, `RunStory` binding, EventsEmit
    streaming, cancellation `OnShutdown`) (~1.5j) — [story](spdd/stories/UI-001c-new-story-flow.md)
- ⬜ **UI-002** — Canvas REASONS éditable (React Flow v12, drag&drop des
  7 blocs R/E/A/S/O/N/S, save vers `spdd/prompts/<id>-<slug>.md`).
  Suite directe d'UI-001.
- ⬜ **UI-003** — Wizard d'install Claude CLI au premier lancement de
  l'app (détection OS, lien vers binaires Anthropic, vérification post-install).
- ⬜ **UI-004** — Theming light/dark/system + persistance des préférences
  utilisateur (`~/.config/yukki/prefs.json` ou équivalent OS).
- ⬜ **UI-005** — Édition markdown des stories en UI + auto-refresh
  via fsnotify + streaming token-par-token de la sortie provider.
- ⬜ **DOC-001** — Publication OSS : story + cycle complet (README
  racine, LICENSE check, CONTRIBUTING, guide d'install, badge CI)

## Post-MVP

- ⬜ **INT-001** — Provider Copilot CLI alternatif à Claude CLI
- ⬜ **OPS-001** — Signing binaires (Authenticode Windows / notarization
  Apple) pour distribuer l'app desktop sans déclencher Defender SmartScreen
  / Gatekeeper.

## Actions opérationnelles (hors code)

- 🎫 **TICKET IT** — Demander à l'IT une **exclusion Microsoft Defender**
  (ou équivalent corporate AV) sur le chemin du repo
  `C:\workspace\yukki\`. Sans cette exclusion, l'exécution locale des
  tests Go est bloquée par le scan AV qui empêche le fork/exec des
  binaires fraîchement compilés (`fork/exec ... Access is denied`),
  même quand `GOCACHE` et `GOTMPDIR` pointent dans le repo. La CI
  GitHub Actions n'est pas concernée — c'est un blocage **local
  uniquement**. Cf. [`DEVELOPMENT.md`](DEVELOPMENT.md) section
  *"Si l'AV bloque malgré tout"*. Contournements en attendant :
  WSL (clone sous Linux subsystem) ou CI-only (push tôt, attendre
  les runners GitHub).

## Convention

Les items préfixés `META-` touchent la méthodologie SPDD elle-même.
Les autres préfixes (`CORE-`, `DOC-`, `UI-`, `INT-`) concernent les
features du projet.

Quand un item passe de ⬜ à 🟡 :
1. Créer la story dans `spdd/stories/<id>-<slug>.md` (`status: draft`)
2. Dérouler le cycle SPDD complet (étape 1 → 5)
3. Passer la ligne à ✅ une fois `status: implemented` côté canvas

Cf. [`spdd/README.md`](spdd/README.md) pour la philosophie générale et
l'exemple complet de META-001 ; [`spdd/GUIDE.md`](spdd/GUIDE.md) pour le
guide pédagogique avec schémas.

## Historique de ce fichier

- **2026-04-30** — création initiale en `spdd/TODO.md`, 12 items
  (4 livrés, 7 pending, 1 fix)
- **2026-04-30** — ajout META-006 (format de nommage canonical SPDD),
  13 items
- **2026-04-30** — déplacement à la racine du repo (`/TODO.md`),
  convention plus standard pour la visibilité ; les liens internes ont
  été ajustés en conséquence (`spdd/stories/`, `spdd/README.md`,
  `spdd/GUIDE.md`)
- **2026-04-30** — ajout 🎫 *Ticket IT exclusion AV* (action
  opérationnelle hors code), nouvelle section *"Actions opérationnelles"*
  + légende mise à jour. 14 items au total.
- **2026-05-01** — pivot UI : abandon de CLI-001 (terminal niceties,
  jamais committée sur main, branche locale supprimée) au profit de
  **UI-001** redéfini en *fondation app desktop yukki* (Wails v2 +
  React + bindings Go, sous-cmd `yukki ui`). Stack figée : Wails v2 +
  React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Zustand,
  React Flow v12 réservé pour UI-002 (canvas éditable). Ajout de UI-002,
  UI-003, UI-004, UI-005 (filiation directe), promotion d'UI-001 de
  *post-MVP* à *en attente — features projet* (statut 🟡), ajout
  d'OPS-001 en post-MVP (signing binaires). 18 items au total.
- **2026-05-01** — split SPIDR axe **I** d'UI-001 en 3 stories filles
  (UI-001a skeleton, UI-001b hub viewer, UI-001c new story flow) sur
  feedback utilisateur *"elle est grosse cette story"*. Chaque fille
  ≤ 1.5j (vs 4-4.5j monolithique), respect INVEST-Small. Analyse
  conservée en analyse de famille (1 analyse pour 3 canvas REASONS à
  venir). Q1=B (refresh manuel), Q2=A (build tag mock), Q3=A (empty
  state init), Q4=A (liste stories en first view), Q5=A (cancellation
  OnShutdown), Q6=A (NextID race accepté V1), Q7=A (EN-only V1)
  validés par utilisateur. 18 items toujours (le compte UI-001 ne
  change pas, juste son éclatement interne en filiation a/b/c).
