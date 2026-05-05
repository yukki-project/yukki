---
id: INBOX-016
slug: parallel-multi-branch-generation
title: Génération parallèle multi-branche — drag N stories → N PRs simultanées
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Génération parallèle multi-branche — drag N stories → N PRs simultanées

## Idée

Permettre à yukki de lancer **plusieurs `/yukki-generate` en parallèle**
sur des stories indépendantes, chacune sur sa propre branche git,
avec son propre worker agent (Claude Code / Copilot / OpenAI), et
un cockpit UI qui affiche les N streams live côte à côte.

**Geste utilisateur cible** :
1. L'utilisateur sélectionne N stories en `reviewed` dans le hub
   (drag-drop ou multi-select)
2. Drop dans une "Generate Lane" centrale
3. yukki :
   - vérifie l'absence de conflits potentiels (overlap des `modules:`,
     dépendances déclarées)
   - crée N `git worktree` (un par story)
   - alloue un agent / provider à chaque worker
   - lance N `/yukki-generate` simultanés
   - stream les outputs dans N panneaux UI live
   - à la fin, propose N PRs avec un merge order recommandé

## Architecture cible

```
   ┌──────────────────────────────────────────────────────────┐
   │  yukki UI cockpit                                        │
   │                                                          │
   │   ┌──────────┐  ┌──────────┐  ┌──────────┐               │
   │   │ STORY-A  │  │ STORY-B  │  │ STORY-C  │  ← drag       │
   │   │ reviewed │  │ reviewed │  │ reviewed │               │
   │   └────┬─────┘  └────┬─────┘  └────┬─────┘               │
   │        │             │             │                      │
   │        ▼             ▼             ▼                      │
   │   ┌────────── Generate Lane ──────────────┐               │
   │   │  [pre-flight: check dépendances]      │               │
   │   │  [allocate workers + providers]       │               │
   │   └─────────┬───────────┬──────────┬───────┘               │
   │             │           │          │                       │
   │             ▼           ▼          ▼                       │
   │       ┌────────┐ ┌────────┐ ┌────────┐                    │
   │       │ wt-A   │ │ wt-B   │ │ wt-C   │ ← git worktree    │
   │       │ Claude │ │Copilot │ │ OpenAI │ ← provider/model  │
   │       │live →  │ │ live → │ │ live → │ ← stream stdout   │
   │       │status  │ │ status │ │ status │ ← progress %      │
   │       └────────┘ └────────┘ └────────┘                    │
   │             │           │          │                       │
   │             ▼           ▼          ▼                       │
   │       3 PRs queue (review side-by-side)                    │
   │       + merge order recommandé                             │
   └──────────────────────────────────────────────────────────┘
```

## Mécanismes techniques nécessaires

### Git worktree (clé pour la performance)

Chaque worker tourne dans un `git worktree` dédié — pas un clone
complet :
```bash
git worktree add ../wt-STORY-A feature/STORY-A
```
Économie disque massive (partage des objects), création quasi-
instantanée. Cleanup automatique à la fin (success ou abort).

### Pool de workers Go

Configuration `.yukki/parallel.yaml` ou via UI :
```yaml
max_workers: 3              # nombre max de generates simultanés
default_provider: claude    # provider par défaut
worker_provider_assignment: # routage opt-in story → provider
  - story_match: "FRONT-*"
    provider: claude
  - story_match: "BACK-*"
    provider: openai
```

### Détection de conflits ex-ante (pre-flight)

Avant de lancer, yukki vérifie :

1. **Overlap des `modules:`** — si STORY-A.modules ∩ STORY-B.modules ≠ ∅,
   alerte rouge ("ces stories touchent au même module —
   conflits probables")
2. **Dépendances déclarées** — si STORY-B.depends-on contient STORY-A,
   alerte ("STORY-B doit attendre STORY-A — paralléliser n'a pas de
   sens")
3. **Graph d'analyse cross-canvas** — si les Operations de A et B
   listent les mêmes fichiers cibles, alerte
4. **Confirmation humaine obligatoire** si overlap détecté (l'user
   peut forcer "go quand même" en accepting le risque de merge)

### Streams parallèles dans l'UI

Cockpit avec N panneaux côte à côte :
- **Header** : story id + provider + status (running / done / error)
- **Body** : stdout streamé live (couleurs, progression `O3/11`)
- **Footer** : tokens consommés en temps réel (lien INBOX-009),
  durée écoulée, bouton "abort"

Layout responsive : 1 worker = pleine largeur, 2 = 50/50,
3 = 33/33/33, 4+ = grille 2×2 etc.

### Reconciliation post-runs

Une fois tous les workers terminés :

1. **Status board** : N statuts (success / partial / error)
2. **Merge order recommandé** :
   - basé sur l'ordre des dépendances (graph)
   - et la facilité de merge (worktree avec moins de conflits
     mergé en premier)
3. **Diff combiné** vue globale (utile si revue groupée)
4. **Bouton "merge all"** sélectif (avec dry-run preview)

## Bénéfices vs concurrence

| Outil | Multi-branch parallel ? | Comment |
|---|---|---|
| Cursor | Non | Une session = un repo state |
| Claude Code (cli/web) | Non | Monothread par invocation |
| Aider | Non | Sur un seul état git |
| GH Copilot Workspace | Multi-tâche limité | Dans un seul context, pas branches |
| Devin / Cognition | Oui mais cloud proprio | Pas OSS, pas auto-hébergé |
| Lindy / Multion | Oui mais cloud proprio | Idem |
| **yukki** | **Oui, OSS, local** | **Vitrine forte** |

C'est probablement **le différenciant le plus fort** vs Kiro et les
agents généralistes — couplé au cockpit (INBOX-015), c'est un
argument de vente massif pour le blog / les talks.

## Pièges à anticiper

### Coût ressources

3 runs en parallèle = 3× les tokens. Sur 3 stories de canvas
~500 lignes / generate ~15k tokens output, ça fait **45k tokens en
quelques minutes**. Ajouter :
- **Budget guard** (lien INBOX-009) : refuser le run si projection
  > N $ et que l'utilisateur n'a pas confirmé
- **Tarif par worker** affiché en temps réel dans le panneau live
- **Alerte** si un worker dépasse 2× la moyenne (probable hallucination
  / boucle)

### Bottleneck review humaine

Générer 3 PRs en parallèle est facile ; **reviewer** 3 PRs en
parallèle est un autre métier. La parallélisation déplace le
bottleneck vers la review. Mitigations :
- **Limit configurable** (défaut 2-3, pas 10)
- **Vue de revue** combinée (panneau 3 PRs side-by-side avec diff
  pour validation rapide)
- **Auto-merge** uniquement sur stories tagguées "low risk"
  (frontmatter `auto-merge: true`)

### Dépendances cachées

Une story `reviewed` peut sembler indépendante mais en réalité
consommer une fonction introduite par une autre story. Sans graph,
tu détectes après. Mitigations :
- **Lien INBOX-008** (graph RAG) : check de dépendances avant
  lancement parallèle
- **Lien INBOX-010** (linter SPDD) : règle "stories en parallèle
  ne doivent pas overlap les modules ni les Operations cibles"
- **Override humain** documenté ("force run" malgré l'alerte = log
  audit dans le journal)

### Sandbox sécurité

Chaque worker exécute potentiellement du code généré. Doit tourner
dans un worktree isolé, idéalement avec :
- **Permissions limitées** au worktree (pas d'accès au repo
  principal pendant le run)
- **Network restreint** si le worker n'a pas explicitement besoin
  d'API externes
- **Timeout dur** par worker (kill si > N minutes)

### Reproductibilité

3 runs simultanés peuvent rendre les états ambigus si l'un crashe.
Mitigations :
- **Logs structurés JSON** par worker (contexte initial, prompt,
  output, status final)
- **Snapshot canvas + état repo au lancement** pour pouvoir rejouer
  un seul worker en isolation si besoin
- **Idempotence** : rerun = checkout HEAD@worker, retry

## Phasage proposé

### Phase 1 — POC séquentiel (foundation)

- Modeliser `Worker` Go (provider + worktree + stream output)
- Bouton UI "Generate" lancement séquentiel (1 worker visible)
- Stream stdout live dans le panneau
- Persistance état JSON

### Phase 2 — Parallel 2-3 workers

- Pool de N workers configurable (cap dur à 3 pour démarrer)
- Layout multi-pane (split horizontal automatique)
- Détection conflits ex-ante basique (overlap `modules:`)
- Status board reconciliation simple

### Phase 3 — Parallel avancé

- Détection conflits via graph d'analyse (lien INBOX-008)
- Routage provider per-story (lien INBOX-007)
- Cost tracking + budget guard (lien INBOX-009)
- Merge order recommandé + diff combiné

### Phase 4 — Production-ready

- Auto-recovery sur crash worker (resume from last checkpoint)
- Audit log persistant `.yukki/runs/`
- Replay run isolé pour debug
- Tests d'intégration fork du repo + 5 stories factices

## Décisions à trancher (revue produit)

- [ ] **Stack worktree** — `git worktree` natif suffit, ou besoin
  de containers (Docker) pour vraie isolation sécurité ?
- [ ] **Strategy de provider routing** — round-robin, par préfixe
  story, par estimation taille story, ou choix manuel à chaque run ?
- [ ] **UI live stream rendu** — tail stdout brut, parser markdown
  pour rendu enrichi, ou un terminal embed type xterm.js ?
- [ ] **Limit max workers** — défaut hardcodé 3, ou auto selon
  CPU/RAM disponibles ?
- [ ] **Auto-merge des PRs** — on offre ou pas ? Si oui, sous
  quelles conditions (linter clean + tests passent + canvas
  status=implemented) ?

## Notes

- Cette feature est probablement **l'argument de vente le plus
  visuel et le plus différenciant** de yukki face à Kiro et aux
  agents généralistes (cf. INBOX-014).
- Demande comme prérequis solides :
  - INBOX-007 (multi-provider) — pour router vers différents agents
  - INBOX-009 (cost tracking) — pour budget guard
  - INBOX-008 phase 1-2 (graph d'arêtes explicites) — pour
    détection conflits ex-ante
  - INBOX-015 (cockpit UI) — pour le rendu multi-pane
- À démarrer en **Phase 1 POC séquentiel** dès que le multi-provider
  est stable. La Phase 2 parallèle 2-3 workers est livrable en
  ~3-4 semaines à partir de là.
- **Vente OSS** : démo vidéo "drag 3 stories → 3 PRs en 5 minutes"
  serait virale sur Twitter/X et sur Hacker News. Le screencast vaut
  10× le README.
- Probable Epic à découper en 6-8 stories enfants (worker model,
  pool, UI multi-pane, conflict detection, cost guard, audit log,
  reconciliation, integration tests).
