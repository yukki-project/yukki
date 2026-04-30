---
id: META-001
slug: extract-methodology-references
story: spdd/stories/META-001-extract-methodology-references.md
status: draft
created: 2026-04-30
updated: 2026-04-30
---

# Analyse — Extraire les références méthodologiques des skills vers spdd/methodology/

## Mots-clés métier extraits

`skill`, `methodology`, `reference`, `inline vs link`, `front-matter`,
`applies-to`, `version`, `changelog`, `Domain-Driven Design`, `STRIDE`,
`Boundary Value Analysis`, `Equivalence Partitioning`, `Y-Statement`,
`Architecture Decision Record`, `single source of truth`, `procedural vs
knowledge`, `Claude Code commands`, `GitHub Copilot Skills`.

> Validés implicitement avec l'utilisateur lors de la discussion préalable
> (étape 2). Le scan codebase ci-dessous est restreint à ce vocabulaire.

## Concepts de domaine

### Existants (déjà dans le repo `yukki`)

- **Skill SPDD** — un fichier markdown avec frontmatter qui définit une
  procédure d'invocation (par slash-command). Existe en deux formats :
  `.claude/commands/<name>.md` (Claude Code, frontmatter `user_invocable`) et
  `.github/skills/<name>/SKILL.md` (Copilot, frontmatter `user-invocable`).
  Les sept skills SPDD existants suivent rigoureusement cette structure.
- **Template d'artefact** — fichier `spdd/templates/<artefact>.md` avec
  frontmatter normalisé (id, slug, status, created, updated, owner, modules)
  et squelette des sections attendues. Trois templates aujourd'hui : `story`,
  `analysis`, `canvas-reasons`.
- **Front-matter normalisé sur les artefacts** — pattern bien établi : `id`,
  `slug`, références croisées (`story:`, `analysis:`), `status` (draft /
  reviewed / accepted / implemented / synced), `created`, `updated`. Les
  artefacts produits (CORE-001, META-001) le respectent.
- **Section `## Changelog` en fin de canvas REASONS** — pattern existant
  dans les commandes `/spdd-prompt-update` et `/spdd-sync` pour tracer les
  évolutions d'un canvas après génération.
- **Inlining déjà fait dans `/spdd-story`** — la commande contient
  actuellement *inline* SPIDR (étape 4bis), les règles de formulation des AC
  (style déclaratif, mots bannis), et la grille de granularité. C'est
  l'anti-pattern qu'on combat — META-001 ne le touche pas (META-002).
- **Documentation `spdd/README.md`** — fichier pédagogique de ~250 lignes qui
  introduit SPDD, le canvas REASONS, le workflow, et les conventions.
  C'est le point d'entrée naturel pour annoncer le nouveau dossier
  `methodology/`.
- **Pattern miroir Claude / Copilot** — chaque skill existe en deux formats
  synchronisés à l'octet près sur le contenu, avec uniquement les
  différences de frontmatter et de profondeur de chemin relatif (`../../` vs
  `../../../`). Convention bien comprise et appliquée aux 7 skills.

### Nouveaux (à introduire)

- **Référence de méthodologie** — fichier markdown qui décrit *une* technique
  ou framework (DDD, STRIDE, BVA…), avec un frontmatter étendu (`version`,
  `applies-to`, `sources`). Vit dans `spdd/methodology/`.
- **Champ `applies-to`** — liste des skills qui consomment la ref (par
  ex. `[spdd-analysis, spdd-reasons-canvas]`). Permet la traçabilité bidirectionnelle.
- **Champ `version`** — entier simple (`1`, `2`…), incrémenté à chaque
  changement *de fond* (pas typo) ; chaque incrément est tracé dans une
  section `## Changelog` en fin de fichier.
- **Champ `sources`** — liste de liens bibliographiques (article original,
  spec OWASP, livre, etc.) qui justifie le contenu de la ref.
- **Index `spdd/methodology/README.md`** — court fichier (≤ 30 lignes) qui
  liste les refs disponibles avec un résumé d'une phrase et leur `applies-to`,
  pour la découverte par les contributeurs.
- **Convention "skill = procédural, methodology = knowledge"** — règle
  écrite dans `spdd/README.md` qui interdit d'inliner une technique dans un
  skill et impose de la référencer.

## Approche stratégique

On crée le dossier `spdd/methodology/` parallèle à `spdd/templates/` et aux
dossiers d'artefacts (`stories/`, `analysis/`, `prompts/`). Chaque technique
vit dans un fichier markdown autonome dont la **forme** suit le pattern déjà
établi pour les autres artefacts SPDD (frontmatter YAML + sections markdown).
Le **fond** de chaque ref est court et pratique : définition opérationnelle
de la technique, heuristiques d'application, exemple concret aligné sur le
projet `yukki` ou un cas inspiré du portail, et liens vers une ou deux
sources de référence externe.

Le skill `/spdd-analysis` est mis à jour dans ses **deux formats** simultanément
(Claude + Copilot) pour pointer vers les refs aux endroits pertinents — pas
d'inlining, juste une phrase de prompting et un lien markdown.

`spdd/README.md` reçoit une section courte qui annonce le dossier `methodology/`
et la règle de séparation. Pas plus : la richesse vit dans les refs elles-mêmes.

### Alternatives considérées

- **Inliner les techniques dans les skills (statu quo, comme `/spdd-story`)** —
  écartée : duplication entre skills consommateurs (`/spdd-analysis` et
  `/spdd-reasons-canvas` partagent la taxonomie de risques), dérive silencieuse
  quand une technique évolue, et viole le principe SPDD "single source of
  truth".
- **Un seul fichier `spdd/methodology.md` qui regroupe les 4 techniques** —
  écartée : casse la granularité par technique, complique le `applies-to` (un
  skill ne consomme qu'une partie du fichier), et empêche un versionning
  indépendant.
- **Embarquer les refs dans `spdd/templates/`** — écartée : confusion
  conceptuelle. Un template est le squelette d'un artefact à produire ; une
  ref méthodologique est une description d'une technique. Deux choses
  différentes.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `spdd/methodology/` | fort | création du dossier + 4 refs + 1 index |
| `.claude/commands/spdd-analysis.md` | fort | refonte complète avec liens vers refs |
| `.github/skills/spdd-analysis/SKILL.md` | fort | miroir Copilot synchronisé |
| `spdd/README.md` | faible | mention courte (≤ 5 lignes) sur `methodology/` |
| `.claude/commands/spdd-{story,reasons-canvas,…}.md` | aucun (cette story) | inchangé pour l'instant ; backport prévu en META-002+ |

## Dépendances et intégrations

- **Pas de dépendance code** — la story est purement documentaire / textuelle.
- **Sources externes** (citées dans les refs, pas de dépendance technique) :
  Wikipedia DDD, Microsoft Learn DDD, OWASP Threat Modeling Process, OWASP
  Threat Modeling Cheat Sheet, Guru99 BVA + EP, Aqua Cloud edge case testing,
  adr.github.io, Nygard original ADR post, Fowler bliki ADR.
- **Pattern frontmatter** (cohérence interne) — les refs réutilisent le
  vocabulaire YAML déjà en place sur les artefacts SPDD avec les ajouts
  spécifiques (`version`, `applies-to`, `sources`).

## Risques et points d'attention

- **Dérive entre skill et ref** — *Impact moyen, probabilité moyenne*.
  Si une technique évolue dans `risk-taxonomy.md` (par exemple ajout d'un axe
  Privacy) mais qu'un skill garde un exemple obsolète, on a une incohérence
  silencieuse. **Mitigation** : convention claire dans `spdd/README.md`, et
  META-003 prévoira un check CI (le skill ne doit pas mentionner les noms de
  techniques sans lien vers leur ref).
- **Surface d'apprentissage pour les nouveaux contributeurs** — *Impact
  faible, probabilité forte*. Un dev qui découvre le repo doit comprendre la
  différence entre `templates/` (squelettes d'artefacts) et `methodology/`
  (techniques). **Mitigation** : index `methodology/README.md` clair + mention
  dans `spdd/README.md`.
- **Refs trop académiques** — *Impact moyen, probabilité moyenne*. Le
  vocabulaire DDD ou STRIDE peut décourager si les refs ressemblent à des
  copies d'articles Wikipedia. **Mitigation** : chaque ref doit privilégier
  les heuristiques opérationnelles, citer 1 à 2 sources max, donner un
  exemple concret côté `yukki` ou portail.
- **Refs orphelines à terme** — *Impact faible, probabilité faible*. Si un
  skill est supprimé ou refondu mais que sa ref reste, elle devient
  orpheline. **Mitigation** : `applies-to` permet de tracer ; META-003
  pourra automatiser la vérification.
- **Trop de refs au final** — *Impact faible, probabilité faible*. La
  méthodologie ne doit pas pulluler. **Mitigation** : règle implicite "1 ref =
  1 technique d'usage transverse" ; pas de ref pour des concepts ad hoc.

## Cas limites identifiés

- **Une ref s'applique à plusieurs skills** — la taxonomie de risques sert à
  `/spdd-analysis` (section Risques) et à `/spdd-reasons-canvas` (section
  Safeguards). Le champ `applies-to` est une **liste**, pas un scalaire.
- **Une technique évolue après publication** — incrément de `version` (entier
  simple) + entrée dans `## Changelog` en fin de fichier. Pattern déjà connu
  des canvas REASONS.
- **Un skill veut référencer une partie spécifique d'une ref** — utiliser
  les ancres markdown (`risk-taxonomy.md#stride`, `domain-modeling.md#invariants`).
- **Une ref a besoin d'un visuel** — markdown supporte les images SVG
  inline ou des liens vers des PNG. À gérer au cas par cas (probablement
  inutile en v1).
- **Conflit de noms entre techniques** — improbable en v1 (4 fichiers très
  distincts), mais à surveiller si la collection grandit.

## Décisions à prendre avant le canvas

- [ ] **Forme du champ `applies-to`** : liste de strings simples
  (`[spdd-analysis, spdd-reasons-canvas]`) ou liste d'objets avec contexte
  (`[{skill: spdd-analysis, used-in: étape-4-modélisation}]`) ? — La forme
  simple suffit en v1 ; les détails contextuels appartiennent aux skills.
- [ ] **Convention de nommage des fichiers** : kebab-case (`risk-taxonomy.md`,
  `domain-modeling.md`) confirmé — c'est la convention markdown standard du repo.
- [ ] **Présence d'un `_template.md` dans `methodology/`** pour normaliser
  les futures refs : utile mais peut-être prématuré en v1 (4 refs créées
  manuellement avec un pattern visible). À reporter à META-002 ou plus tard.
- [ ] **Position de la mention dans `spdd/README.md`** : nouvelle section
  dédiée, ou ajout de 2-3 lignes dans la section *Arborescence* existante ?
  Reco : 2-3 lignes dans *Arborescence* + une phrase dans la section
  *Quand utiliser SPDD* qui rappelle la règle de séparation.
