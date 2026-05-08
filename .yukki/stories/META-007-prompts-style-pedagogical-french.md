---
id: META-007
slug: prompts-style-pedagogical-french
title: Refonte du français des prompts SPDD (anti-franglais + pédagogie)
status: draft
created: 2026-05-09
updated: 2026-05-09
owner: Thibaut Sannier
modules:
  - .claude/commands
  - .github/skills
  - .yukki/methodology
  - .yukki/templates
---

# Refonte du français des prompts SPDD (anti-franglais + pédagogie)

## Background

Les fichiers qui pilotent le workflow SPDD (skills Claude dans
`.claude/commands/`, miroir Copilot dans `.github/skills/`,
références méthodologiques dans `.yukki/methodology/`, gabarits
dans `.yukki/templates/`) sont rédigés dans un français truffé
d'anglicismes (« happy path », « scope in / scope out », « fallback »,
« smoke test ») et de phrases denses, parfois jargonneuses. Ce
mélange dégrade la lisibilité pour un nouveau contributeur ou
utilisateur, et casse la pédagogie attendue d'une méthodologie
publique.

## Business Value

Onboarding plus fluide : un PM ou un dev qui découvre SPDD lit
des refs claires, sans avoir à traduire ou décoder des bouts
d'anglais inutiles. Cohérence : le projet adopte une voix unique
et soignée. Pédagogie : les refs méthodologie deviennent de vrais
supports d'apprentissage et pas juste des specs techniques.

## Scope In

- **Audit ciblé** des fichiers prompts SPDD :
  - `.claude/commands/yukki-*.md` (7 skills user-invocables)
  - `.github/skills/yukki-*/SKILL.md` (miroirs Copilot)
  - `.yukki/methodology/*.md` (refs DDD / risk taxonomy / edge-cases /
    decisions / INVEST / SPIDR / acceptance-criteria + cluster
    testing)
  - `.yukki/templates/*.md` (story / analysis / canvas-reasons /
    inbox / epic / canvas-reasons)
- **Remplacement des anglicismes inutiles** par leur équivalent
  français lorsque le sens reste identique :
  « happy path » → « cas nominal », « scope in / scope out » →
  « périmètre / hors périmètre », « fallback » → « repli »,
  « smoke test » → « test de fumée » ou « test rapide »,
  etc. Liste exhaustive à figer en analyse.
- **Conservation du vocabulaire SPDD** intentionnel et codifié :
  `story`, `canvas`, `REASONS`, `INVEST`, `SPIDR`, `Given/When/Then`,
  `draft / reviewed / accepted / implemented / synced` (statuts).
  Ces termes font partie du contrat méthodologique et ne sont
  pas traduits.
- **Reformulation pédagogique** des passages denses : éclater les
  phrases longues, ajouter des exemples concrets, remplacer le
  jargon technique non SPDD par sa version explicite.
- **Synchronisation miroir Claude / Copilot** : les deux sets de
  skills doivent rester strictement identiques en contenu après
  refonte (différences autorisées : front-matter, profondeur de
  chemins relatifs, mention de `subagent Explore` vs `#codebase`).

## Scope Out

- **Traduction des fichiers en anglais** : la doc SPDD reste en
  français, l'i18n de l'UI utilisateur est couverte par META-006.
- **Renommage des slash commands** (`/yukki-story`, `/yukki-analysis`,
  …) : les noms restent tels quels.
- **Renommage des préfixes d'id** (`CORE-`, `UI-`, `META-`, …).
- **Renommage des sections du gabarit story** (`Background`,
  `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria`,
  `Open Questions`, `Notes`) : ces noms sont consommés par la
  parser de templates côté frontend (UI-014h) — leur changement
  casserait la lecture des artefacts existants.
- **Vocabulaire des messages de commit** (`feat(spdd):`,
  `chore(spdd):`, …) : convention Conventional Commits, reste en
  anglais.
- **Réécriture des artefacts SPDD existants** (stories, analyses,
  canvases) : eux suivent leur propre cycle SPDD ; cette story
  ne touche que les fichiers normatifs (skills, methodology,
  templates).

## Acceptance Criteria

### AC1 — Refonte d'un skill : aucun anglicisme inutile

- **Given** le fichier `.claude/commands/yukki-story.md`
- **When** un relecteur français parcourt le contenu
- **Then** aucun anglicisme inutile n'apparaît hors du
  vocabulaire SPDD codifié (`story`, `canvas`, `INVEST`, `SPIDR`,
  `Given/When/Then`, statuts), et chaque emprunt restant est
  justifié par une note ou une référence explicite

### AC2 — Refonte d'une ref méthodologie : pédagogie

- **Given** le fichier `.yukki/methodology/risk-taxonomy.md`
- **When** un nouveau contributeur le lit pour la première
  fois
- **Then** chaque catégorie de risque a un exemple concret en
  une ligne, les phrases dépassent rarement deux lignes, et le
  jargon technique non SPDD est défini ou remplacé

### AC3 — Synchronisation miroir Claude / Copilot

- **Given** la story est livrée et tous les skills `.claude/
  commands/yukki-*.md` ont été refondus
- **When** on diff chaque skill avec son miroir
  `.github/skills/yukki-*/SKILL.md`
- **Then** les seules différences sont celles autorisées par
  la convention (front-matter, profondeur des chemins relatifs,
  mention `subagent Explore` vs `#codebase`)

### AC4 — Vocabulaire SPDD préservé

- **Given** la story est livrée
- **When** on cherche dans tous les fichiers refondus les
  occurrences de `INVEST`, `SPIDR`, `REASONS`, `Given/When/Then`,
  `draft / reviewed / accepted / implemented / synced`
- **Then** ces termes apparaissent inchangés (même graphie,
  même casse) — ils sont le contrat méthodologique et n'ont
  pas été francisés

### AC5 — Cas limite : terme intraduisible

- **Given** la refonte rencontre un terme technique sans
  équivalent français naturel (par exemple « shallow clone »,
  « ldflags », « heredoc »)
- **When** le relecteur lit le passage concerné
- **Then** le terme reste en anglais entre backticks ou en
  italique, accompagné d'une courte glose française la
  première fois qu'il apparaît dans le fichier

## Open Questions

- [ ] **Liste exhaustive des anglicismes à remplacer** : à figer
      en analyse via un grep ciblé sur les fichiers concernés.
      Exemples connus : « happy path », « scope in / scope out »,
      « fallback », « smoke test », « pipeline », « workflow »
      (à arbitrer — « workflow » est devenu courant en
      français), « scaffolding », « flag », « toggle ».
- [ ] **Glossaire dédié** : faut-il ajouter un fichier
      `.yukki/methodology/glossary.md` qui liste le vocabulaire
      SPDD et ses définitions courtes pour les nouveaux ? Ou
      glisser ces définitions inline dans chaque ref ?
- [ ] **Niveau de pédagogie cible** : ajouter systématiquement
      un exemple concret par concept, ou uniquement quand le
      concept est abstrait (DDD, STRIDE) ? Risque d'allonger
      les refs.
- [ ] **Mécanisme de garde-fou** : un script CI qui détecte
      les nouveaux anglicismes introduits par les futures PRs
      (liste noire), ou simplement la discipline en revue de PR ?
- [ ] **Sections du gabarit** (`Background`, `Business Value`,
      `Scope In`, `Scope Out`) — confirmer en analyse qu'elles
      ne peuvent PAS être renommées sans casser le parser
      template (UI-014h). Le scope-out actuel le suppose.

## Notes

- Tous les fichiers concernés sont des `.md` versionnés dans le
  repo — refacto purement textuel, pas de code Go ou TS.
- Chaque modification d'un skill `.claude/commands/yukki-*.md`
  doit être propagée à son miroir `.github/skills/yukki-*/SKILL.md`
  dans la même PR (cf. règle non-négociable de
  [`CLAUDE.md`](../../CLAUDE.md) « Miroir Claude / Copilot
  synchronisé »).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont.
  - **Negotiable** : niveau de pédagogie + glossaire optionnel
    explicitement ouverts.
  - **Valuable** : oui — onboarding + image OSS du projet.
  - **Estimable** : ~1-2 j (refacto textuel, audit + remplacements
    + synchronisation miroir).
  - **Small** : borderline — beaucoup de fichiers à toucher
    (~25-30 .md), mais homogène. Pas de logique, pas de
    code. Reste petit en complexité même si volumineux en diff.
  - **Testable** : oui — grep automatisé sur la liste noire
    d'anglicismes, diff entre miroirs Claude / Copilot.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** par paquet de fichiers si l'audit
  s'avère trop lourd à livrer en une seule PR.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | Skills (.claude + .github), methodology, templates sont 3 paquets indépendants. Découpe potentielle : (a) META-007a skills, (b) META-007b methodology, (c) META-007c templates. À garder pour l'analyse selon le volume estimé. |
  | Interfaces | non | Une seule « interface » (lecture humaine du markdown). |
  | Data | non | Pas de modèle. |
  | Rules | non | AC4 (préservation SPDD) et AC5 (terme intraduisible) sont les cas limites. |
  | Spike | non | Refacto purement textuel, pas d'inconnue technique. |
