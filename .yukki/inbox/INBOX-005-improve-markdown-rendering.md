---
id: INBOX-005
slug: improve-markdown-rendering
title: Améliorer le rendu markdown des artefacts dans le hub
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Améliorer le rendu markdown des artefacts dans le hub

## Idée

Le hub yukki affiche le contenu des artefacts (stories, analyses,
canvas, et bientôt Inbox/Epic/Roadmap) en markdown. Le rendu actuel
est minimal et ne tire pas pleinement parti de la richesse de
formatage qu'on met dans nos artefacts (tables, schémas ASCII, code
blocks, callouts, frontmatter YAML structuré).

Pistes à explorer :

- **Tables** : alignement, sticky headers, row hover (les tableaux
  SPIDR / vocabulaire / Modules impactés sont centraux)
- **Code blocks** : highlight syntaxique (Go, TS, YAML, bash, JSON,
  diff), bouton copier
- **Schémas ASCII** : font monospace stable, scroll horizontal propre
  pour les schémas larges (cf. schéma discovery → delivery dans
  CLAUDE.md / .yukki/README.md)
- **Frontmatter YAML** : rendu typé en panneau dédié (badges status,
  liens cliquables sur `story:` / `analysis:` / `child-stories: [...]`)
- **Liens internes** : résolution des `[texte](spdd/...)` en
  navigation interne (ouvre l'artefact dans le hub) plutôt que sortir
  vers le filesystem
- **Checklists** Given/When/Then et DoD : rendu visuel cocher /
  décocher, persistance dans le frontmatter
- **Callouts** : `> **Why:**` `> **How to apply:**` rendus en
  blocks colorés (à la GitHub / Obsidian)
- **Mermaid** (optionnel) : si on bascule certains schémas ASCII vers
  mermaid, support du rendu inline

## Notes

- Probable choix de lib : `react-markdown` + `remark-gfm` (tables,
  task-lists, strikethrough) + `rehype-highlight` ou `shiki` (code
  highlight). Déjà commun dans l'écosystème React.
- Attention perf : un canvas REASONS peut faire 500+ lignes ; le
  rendu doit rester fluide (memo + lazy chunks ?).
- Cohabitation avec un futur **éditeur** markdown (out of scope ici,
  probable autre Inbox plus tard) — le viewer actuel doit déjà être
  bon en lecture seule.
- Probable Epic à découper en 3-4 stories : tables/code → liens/nav
  → frontmatter typé → checklist interactive.
