---
id: INBOX-012
slug: fulltext-search-faceted-hub
title: Recherche full-text + facettes dans le hub yukki
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Recherche full-text + facettes dans le hub yukki

## Idée

Le hub yukki affiche déjà la liste des artefacts par kind (Stories,
Analyses, Canvas, Tests, Inbox, Epics, Roadmap). Manque une **barre
de recherche** qui croise full-text et facettes :

- **Full-text** sur le **corps** (markdown) ET le **frontmatter**
  (id, slug, title, modules, owner)
- **Facettes** : filtrer par
  - `status` (multi-select : draft / reviewed / accepted /
    implemented / synced ; ou unsorted/promoted/rejected pour Inbox)
  - `kind` (multi-select sur les 7 kinds)
  - `modules` (auto-extracts du frontmatter, multi-select)
  - `owner` (multi-select)
  - `updated` (range : "modifié il y a moins de 7 jours")
- **Tri** : pertinence / updated desc / id asc
- **Highlight** des termes matched dans la liste de résultats

Cas d'usage observés en session :
- "Quelle est la story qui parle de X déjà ?"
- "Toutes les analyses qui ont touché `internal/uiapp` ?"
- "Toutes les stories en `reviewed` mais pas encore `implemented` ?"

## Notes

- **Stack** : pour la base, indexation in-memory (yukki recharge tout
  l'arbo au démarrage de l'app, ~100 fichiers max sur un projet
  yukki normal — c'est OK pour grep + tri). Plus tard : index
  persistant via FTS5 SQLite si la volumétrie l'exige.
- Rendu côté UI : un panneau search en haut du hub, ou un
  raccourci clavier `Ctrl+P` style VSCode.
- Lien INBOX-008 (graph RAG) : facettes "concepts" en plus des
  facettes frontmatter, alimentées par l'extraction LLM des analyses.
- Lien INBOX-005 (rendu markdown) : la recherche bénéficie d'un
  rendu correct des résultats (snippets avec highlight).
- Probable Story atomique pour la v1 (full-text simple + 2-3
  facettes), Epic si on veut le full-package (graph search,
  saved queries, regex mode).
