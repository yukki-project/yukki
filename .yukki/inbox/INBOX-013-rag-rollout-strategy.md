---
id: INBOX-013
slug: progressive-rag-stack-builtin
title: Stack RAG progressif intégré à yukki (linter → search → graph → semantic)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Stack RAG progressif intégré à yukki

## Idée

yukki embarque un **stack RAG en 4 couches** activables
progressivement, orchestré nativement par l'outil. Chaque couche
construit sur la précédente et est utilisable indépendamment via une
sous-commande dédiée + une intégration dans les subagents (cf.
INBOX-006). L'utilisateur choisit son niveau d'engagement selon la
taille de son repo et ses besoins.

### Couche 1 — Linter (cohérence des artefacts)

- **Commande** : `yukki lint`
- **Rôle** : garantit que tous les artefacts sont parsables et
  cohérents (frontmatter valide, cross-refs résolvent, status
  transitions valides — cf. INBOX-010 pour le détail).
- **Précondition** des couches suivantes : un index sur des artefacts
  cassés est toxique.

### Couche 2 — Search full-text + facettes

- **Commande** : `yukki search <query> [--kind ...] [--status ...]`
- **Rôle** : recherche dans le corps + frontmatter avec facettes
  multiples (cf. INBOX-012). In-memory au début, FTS5 SQLite si
  volumétrie l'exige.
- **Activation** : par défaut, à partir de la couche 1.

### Couche 3 — Graph d'arêtes explicites

- **Commande** : `yukki graph [build|query]`
- **Rôle** : index des relations déclarées dans le frontmatter
  (`parent`, `child-stories`, `depends-on`, `promoted-to`,
  `applies-to`) en SQLite + queries SQL pures (cf. INBOX-008
  phases 1-2).
- **Cas d'usage** : "quelles stories dépendent de l'Epic X ?",
  "quel Inbox a été promu vers cette story ?", détection
  d'incohérences ("Story `implemented` mais Epic parent ne la
  référence pas").
- **Activation** : opt-in via config (`yukki config rag.graph=true`)
  ou auto si >50 artefacts.

### Couche 4 — Embeddings sémantiques

- **Commande** : `yukki ask <question>` (hybrid : sémantique +
  graphe + mot-clé)
- **Rôle** : recall sur synonymes / concepts proches via embeddings
  (cf. INBOX-008 phase 3+). Délégation au provider configuré
  (cf. INBOX-007) pour les embeddings, ou modèle local ONNX.
- **Activation** : opt-in via config (`yukki config rag.semantic=true`)
  ou auto si >500 artefacts ou si l'utilisateur consomme de la doc
  externe (methodology, articles SPDD).

## Orchestration entre couches

yukki choisit automatiquement la stratégie de **hybrid search**
selon les couches actives :

- Couches 1+2 : full-text + filtre facettes
- Couches 1+2+3 : full-text + élargissement par arêtes du graphe
  (un Epic match → ses stories enfants matchent aussi par défaut)
- Couches 1+2+3+4 : hybrid scoring (BM25 + cosine + graph distance)

Les **subagents** (cf. INBOX-006) reçoivent le résultat hybride en
entrée — chaque agent demande à yukki son contexte sans connaître
le détail des couches actives.

## Maintenance (le point dur, mutualisé)

Un seul mécanisme couvre les 3 couches indexées (2, 3, 4) :

- **Daemon yukki** (option) qui watche le filesystem et met à jour
  les index incrémentalement à chaque save.
- **Hook git pre-commit** (option) qui rebuild le delta sur les
  fichiers stagés.
- **Commande explicite** `yukki rag rebuild` pour les cas où on
  veut forcer (CI, après un merge avec conflits).
- **Snapshot versionné** dans `.yukki/rag.db` (gitignored) ou
  rebuilt par CI dans un artefact non versionné.

## Notes

- C'est une **feature transversale** : INBOX-008 (graph RAG) +
  INBOX-010 (linter) + INBOX-012 (search) sont des **briques** ;
  INBOX-013 est l'**orchestration** qui les transforme en stack
  cohérent activable progressivement.
- Lien INBOX-006 (subagents) : la stack RAG est l'outil prévilégié
  consommé par les subagents via MCP local (cf. INBOX-003) —
  l'agent demande "trouve-moi les artefacts pertinents pour X" et
  yukki choisit la stratégie selon les couches actives.
- Lien INBOX-007 (multi-provider) : les embeddings (couche 4) sont
  délégués au provider via la même abstraction que les complétions.
- Probable Epic — décomposition par couche (linter, search, graph,
  semantic) + 1 story d'orchestration / config / hybrid scoring.
- Permet à yukki d'être **packagé OSS comme plateforme RAG-aware
  pour SPDD**, pas juste un wrapper de slash commands.
