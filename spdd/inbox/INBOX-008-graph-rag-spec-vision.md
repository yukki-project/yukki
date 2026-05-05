---
id: INBOX-008
slug: graph-rag-spec-vision
title: Graph RAG — vision globale de la spec SPDD (avec stratégie de maintenance)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Graph RAG — vision globale de la spec SPDD

## Idée

Construire une représentation **graphe** de l'ensemble des artefacts
SPDD du repo (Inbox, Story, Epic, Analysis, Canvas, Roadmap,
Methodology) avec leurs **relations explicites**, et brancher dessus
un **RAG (Retrieval-Augmented Generation)** pour donner aux subagents
SPDD (cf. INBOX-006) une vision globale de la spec — au-delà du
fichier qu'ils traitent à un instant T.

Nœuds :
- 1 nœud par artefact (id + métadonnées du frontmatter)
- 1 nœud par concept de domaine extrait des Analysis
- 1 nœud par méthodologie référencée

Arêtes (relations) :
- Story `parent` Epic, Inbox `promoted-to` Story | Epic
- Analysis `analyses` Story
- Canvas `implements` Analysis (+ `story:` ref)
- Roadmap `column.now/next/later` Epic | Story
- Story `depends-on` Story | Epic (transitive)
- Methodology `applies-to` Skill | Artifact
- Concept `mentioned-in` Artifact (extraction LLM)

Cas d'usage RAG :
- **`/yukki-analysis`** retrouve automatiquement les analyses
  passées qui ont touché un module similaire (concept overlap)
- **`/yukki-story`** détecte les redondances avec stories existantes
  (similarité titre + concepts) avant qu'une nouvelle story ne soit
  créée
- **`/yukki-roadmap-suggest`** : à partir d'un Epic, propose son
  positionnement Now/Next/Later en fonction des dépendances graphe
- **Vue "spec globale"** dans le hub UI : carte navigable des
  artefacts et de leurs relations (force-directed graph React)
- **Détection d'incohérences** : Story `implemented` mais l'Epic
  parent n'a aucun `child-stories` qui la pointe → alerte

## Stratégie de maintenance (le point dur)

C'est **la** question critique : un graphe non maintenu devient
toxique (pollue le RAG avec des relations obsolètes). Pistes :

1. **Rebuild on demand** — `yukki graph rebuild` reconstruit tout
   depuis l'arbo. Simple mais coûteux sur gros repos (>100 artefacts)
   et pas temps-réel.
2. **Incremental sur file save** — un watcher (FSNotify Go) reparse
   l'artefact modifié et met à jour les nœuds/arêtes impactés.
   Demande un index persistant (SQLite, BoltDB ?).
3. **Incremental sur git hook** — pre-commit / post-commit qui
   recalcule le delta. Cohérent avec git mais friction sur les
   commits.
4. **CI job** — la CI rebuild le graphe à chaque PR et le commit
   dans `.yukki/graph.json` (ou non-versionné, juste un artefact CI).
   Découplage du dev local mais latence.
5. **Hybride** : index local SQLite mis à jour incrémentalement par
   un daemon, snapshot versionné dans `.yukki/graph.json` rebuilt
   périodiquement par un cron ou la CI.

Le choix dépend de la volumétrie cible. Pour un repo de 50
artefacts, rebuild on demand suffit. Pour 500+, incremental nécessaire.

Stack technique candidate :
- **Stockage** : SQLite (cohérence avec stack Go simple) ou
  property-graph in-memory pour démarrer
- **Embeddings** : pour la recherche sémantique (concept overlap),
  modèle léger embarqué (sentence-transformers via ONNX) ou
  délégation au provider (OpenAI embeddings via INBOX-007)
- **Query** : SQL pour les arêtes explicites + cosine similarity
  pour la sémantique
- **UI** : React + d3-force ou Cytoscape.js pour la vue graphe

## Notes

- **Risque méthodologique** : un graphe peut induire en erreur si
  les artefacts ne déclarent pas correctement leurs relations
  (ex. un Canvas qui ne mentionne pas son Analysis). Solution :
  validation par yukki au commit (pre-commit hook qui refuse un
  artefact dont les `parent`/`depends-on`/etc. sont incohérents).
- Lien avec INBOX-006 (subagents) : le graphe est une *resource*
  exposée à chaque subagent via un MCP local (cf. INBOX-003).
- Lien avec INBOX-001 (assist IA) : le graphe alimente la suggestion
  de promotion Inbox → Story / Epic en proposant les Epics existants
  qui pourraient absorber l'Inbox.
- Probable Epic — décomposition INVEST :
  1. Schéma de relations + parser arbo (sans embeddings)
  2. Index SQLite + queries simples (parents, enfants, depends-on)
  3. Embeddings + recherche sémantique
  4. Vue UI graphe interactif
  5. Stratégie de maintenance choisie + intégration daemon/CI
