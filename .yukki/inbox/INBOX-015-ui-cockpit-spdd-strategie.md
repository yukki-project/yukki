---
id: INBOX-015
slug: ui-cockpit-spdd-strategie
title: UI cockpit SPDD — distinction vs IDE concurrent + features clés du gap marché
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

## Idée

UI cockpit SPDD — distinction vs IDE concurrent + features clés

Recadrer la trajectoire UI de yukki autour d'un **cockpit produit / méthode SPDD git-native** (et non d'un éditeur de code) pour combler un vide compétitif que ni Linear/Jira, ni Cursor/Aider, ni Kiro ne couvrent. Le cockpit s'articule autour de 8 features clés : Inbox board kanban, Roadmap Now/Next/Later, navigation 3-panes Story → Analysis → Canvas, graph navigable des dépendances, diff visuel des évolutions de canvas, status transitions animées, métriques produit, et vue daily "Today". Trajectoire en 3 phases (cockpit minimum → cockpit avancé → polish OSS-ready).

### Problème (et l'erreur de framing à éviter)

Une lecture simpliste pousserait à conclure : "yukki ne doit pas
investir dans une UI parce que Cursor / VSCode / Kiro / Aider la
font déjà". **C'est faux**, mais pour une raison subtile : ces
outils font une UI **d'éditeur de code**, pas une UI **de cockpit
produit / méthode**.

La distinction est cruciale et change la stratégie d'investissement
UI de yukki.

### La distinction qui change tout

| UI d'éditeur de code (Cursor, VSCode, ...) | UI de cockpit SPDD (yukki) |
|---|---|
| Édition Go / TS / Java avec syntax, lint, debug | Visualisation des artefacts SPDD (story / analysis / canvas / tests) |
| Refactoring outils (rename symbol, extract func) | Navigation Story → Analysis → Canvas → Code |
| Terminal intégré, Git GUI, debugger | Roadmap kanban, Inbox board, status transitions |
| **Concurrence frontale = lutte perdue** | **Gap marché = vide compétitif** |

yukki **ne doit pas** chercher à éditer du Go ou du TS — Cursor
gagne sur ce front. yukki **doit** être le **cockpit produit
SPDD git-native** que personne ne fait.


## Notes

### L'angle marketing OSS

Pour vendre yukki en OSS / blog / talks, **les screenshots du
cockpit valent 10× le markdown brut**. Le pitch :

> "Tu connais Linear ? Tu connais Cursor ? yukki c'est Linear pour
> du dev avec des artefacts versionnés en git, cockpit qui voit
> ton code. Open-source, on-premise, multi-provider."

Sans une UI cockpit visuellement convaincante, ce pitch retombe à
plat. **L'UI est la vitrine de la méthode.**

### Liens et synergies

- Cette trajectoire UI est **complémentaire** à INBOX-014
  (orchestration vs Kiro) — la UI cockpit est ce qui rend la
  méthode SPDD **palpable** pour un nouvel utilisateur. Sans elle,
  yukki est un set d'outils CLI invisibles.
- Le **canvas editor graphique** mentionné dans CLAUDE.md ("UI-001
  canvas editor") doit être recadré : pas un éditeur visuel
  drag-drop pour la section Operations (over-engineered), mais
  bien un **viewer / éditeur markdown léger** synchronisé avec les
  autres panes.
- Lien INBOX-013 (RAG progressif) : les métriques produit s'appuient
  sur le linter (couche 1) et l'index search (couche 2) — synergies
  naturelles avec la stack RAG.
- Lien INBOX-006 (subagents) + INBOX-007 (multi-provider) : le
  cockpit peut afficher quel agent / model a généré quel artefact,
  combien de tokens, quel coût (cf. INBOX-009 cost tracking) — UI
  comme **cockpit observabilité** en plus de méthodologique.
- Probable Epic à découper en 6-8 stories enfants (1 par feature
  cockpit majeure).


## bg

<à compléter>

Contexte produit : la trajectoire UI actuelle de yukki (canvas editor
graphique mentionné dans CLAUDE.md sous "UI-001") risque d'être mal
cadrée si elle est lue comme un éditeur visuel drag-drop pour la
section Operations. L'enjeu est de recadrer cet investissement avant
qu'il ne dérive vers une concurrence frontale avec les IDE
existants.


## bv

Permettre à yukki d'occuper un **vide compétitif** (cockpit produit
SPDD git-native) plutôt que d'entrer en concurrence frontale avec
Cursor / VSCode sur l'édition de code. Bénéfices mesurables
attendus :

- **Adoption OSS** : screenshots du cockpit comme vitrine marketing
  ("Linear pour du dev avec artefacts versionnés en git, qui voit
  ton code") — pitch qui retombe à plat sans UI visuelle.
- **Productivité méthodologique** : navigation 3-panes synchronisée
  permet de saisir en un coup d'œil que chaque AC a son traitement
  bout en bout — gain de temps sur la revue de cohérence.
- **Observabilité produit** : métriques cycle time, throughput,
  taux de promotion Inbox, canvas obsolètes — calculables uniquement
  grâce au frontmatter normé SPDD (aucun outil générique ne le fait).
- **Reprise de contexte** : cockpit "Today" au lancement résume les
  actions du jour (Inbox à qualifier, stories à reviewer, canvas
  obsolètes) — réduit le coût de reprise après coupure.


## si

### L'analyse du gap marché

| Outil | Force | Pourquoi il ne couvre PAS le besoin yukki |
|---|---|---|
| **Linear / Jira** | UI tickets léchée, dashboards | Pas connecté au code, pas de notion canvas exécutable, pas SPDD |
| **Trello / GitHub Projects** | Kanban simple, intégré git | Pas structuré, pas de hiérarchie discovery → delivery, pas d'artefacts versionnés sémantiquement |
| **Notion** | Format libre, riche | Pas de méthodo imposée, pas exécutable (canvas → code), tout est texte |
| **Cursor / Claude Code / Aider** | Génération + édition code | Pas d'artefacts structurés en amont, pas de cockpit produit, génératif ad hoc |
| **Kiro** | Spec-driven générique, intégré IDE | UI générique non opinionnée SPDD, lock-in AWS, pas de hiérarchie Inbox/Epic explicite |
| **yukki** | **Cockpit SPDD git-native** | (le vide à combler) |

**Pourquoi personne ne le fait** : il faut la **méthode SPDD
imposée** (Inbox / Epic / Story / Roadmap + frontmatter normé +
cross-refs structurées) pour qu'un cockpit ait du sens. Sans la
méthode, c'est juste un éditeur markdown de plus. La méthode est le
prérequis ; l'UI cockpit en découle naturellement.

### Le cockpit cible — features qui n'existent nulle part

#### 1. Inbox board (qualification visuelle)

Vue kanban des Inbox items en `unsorted`, drag-drop pour qualifier :

```
   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐
   │ Unsorted   │  │ Promoting  │  │  Promoted  │  │Rejected │
   │ (capture)  │  │ (review)   │  │  (commit)  │  │         │
   ├────────────┤  ├────────────┤  ├────────────┤  ├─────────┤
   │ INBOX-001  │  │ INBOX-006  │  │ INBOX-014  │  │         │
   │ INBOX-002  │  │ INBOX-013  │→ │ → STORY-X  │  │         │
   │ INBOX-003  │  │            │  │ → EPIC-Y   │  │         │
   └────────────┘  └────────────┘  └────────────┘  └─────────┘
```

Drag = transition de status + frontmatter mis à jour
automatiquement (`promoted-to: STORY-NNN`). Aucun outil ne fait ça
pour des artefacts en git.

#### 2. Roadmap kanban Now / Next / Later

Cf. UI-008 (déjà amorcée). Drag des Epics + Stories standalone
entre colonnes met à jour le frontmatter `roadmap/current.md`
(`columns[].epics`, `columns[].standalone-stories`). Versionné en
git, donc l'évolution de la roadmap est auditable au commit près.

#### 3. Navigation 3-panes Story → Analysis → Canvas

Layout côte à côte synchronisé :

```
┌───────────────────┬───────────────────┬───────────────────┐
│                   │                   │                   │
│      STORY        │     ANALYSIS      │     CANVAS        │
│                   │                   │                   │
│ id: STORY-XXX     │ id: STORY-XXX     │ id: STORY-XXX     │
│ status: reviewed  │ status: reviewed  │ status: draft     │
│                   │                   │                   │
│ ## Background     │ ## Concepts       │ ## R Requirements │
│ ## Business Val   │ ## Approche       │ ## E Entities     │
│ ## Scope          │ ## Risques        │ ## A Approach     │
│ ## AC             │ ## Cas limites    │ ## S Structure    │
│                   │                   │ ## O Operations   │
│ [scroll synced]   │ [scroll synced]   │ [scroll synced]   │
└───────────────────┴───────────────────┴───────────────────┘
```

Cliquer sur un AC dans la story scroll vers les concepts liés en
analyse, qui scroll vers les Operations en canvas. Permet de saisir
en un coup d'œil que **chaque AC a son traitement bout en bout**.
Aucun éditeur de markdown générique ne fait ça (il faudrait
comprendre la sémantique SPDD pour synchroniser).

#### 4. Graph navigable des dépendances

Vue force-directed (d3 ou Cytoscape) :

- Nœuds = artefacts (Inbox / Story / Epic / Roadmap / Analysis / Canvas)
- Couleurs = type d'artefact
- Tailles = âge / activité
- Arêtes = relations (`parent`, `depends-on`, `promoted-to`,
  `child-stories`, `applies-to`, références markdown)

Permet de :
- Détecter visuellement les **silos** (artefact isolé sans
  connexion = oubli ou orphelin)
- Voir **les chaînes critiques** (Inbox → Epic → 5 stories → 1 canvas
  pas encore implémenté)
- Naviguer en cliquant les nœuds

#### 5. Diff visuel des évolutions de canvas

Quand `/yukki-prompt-update` modifie un canvas, surface le diff
**dans l'UI** (pas que dans `git log`). Vue side-by-side ou
inline-diff colorée des modifications de Norms / Operations /
Safeguards. C'est l'**historique des intentions**, pas que du code.
Cf. INBOX (à venir éventuellement) "Visualisation évolutions canvas".

#### 6. Status transitions animées + alertes

Indicateurs en bordure d'artefact :
- `draft → reviewed` : badge vert
- `reviewed → implemented` : icône check
- `implemented → reviewed` (via prompt-update) : icône warning
  ("canvas modifié, code potentiellement obsolète")
- Alerte temporelle : "story `reviewed` depuis 30j, blocked ?"

#### 7. Métriques produit cockpit-style

Dashboard intégré :

| Métrique | Calcul | Signal |
|---|---|---|
| Cycle time discovery → implemented | Inbox.created → Story.implemented | Vélocité réelle |
| Taux promotion Inbox | promoted / (promoted+rejected) | Qualité de la qualification |
| Distance reviewed → implemented | mediane(temps en `reviewed`) | Bottleneck génération |
| Canvas obsolètes | count(status=reviewed alors qu'a été implemented) | Dette méthodologique |
| Throughput stories / mois | timeline | Évolution velocity |
| Inbox aging | items `unsorted` > 30j | Backlog stagnant |

Ces métriques **sont calculables uniquement parce que les
artefacts portent un frontmatter normé** (`created`, `updated`,
`status` avec transitions canoniques). Aucun outil générique ne
peut les calculer.

#### 8. Cockpit "Today" / vue daily

Vue agrégée style "morning briefing" :

```
🟢 Aujourd'hui sur ton repo yukki :

  • 3 Inbox items à qualifier (INBOX-014, 015, 016)
  • 2 stories à reviewer (META-007, INT-002)
  • 1 canvas obsolète (META-005 modifié hier, regénération nécessaire)
  • 1 Epic prêt à être décomposé (EPIC-001)
  • Roadmap "Now" : 4 stories en flight, 2 implementées cette semaine
```

Comme un dashboard CI mais pour la dimension produit-méthode. Aide
à reprendre le travail rapidement après une coupure.

### Recommandation concrète — trajectoire en 3 phases

Recadre la trajectoire UI en 3 phases pragmatiques :

#### UI Phase 1 — Cockpit minimum (court terme)

Étendre l'existant Wails / React :
- ✅ Sidebar 9 modes (déjà fait via META-005)
- ✅ Workflow pipeline view (UI-008)
- ➜ **Inbox board kanban** (INBOX-001 capture rapide deviendra l'add)
- ➜ **3-panes Story → Analysis → Canvas** sync scroll
- ➜ **Cockpit Today** au lancement (résumé + actions)

#### UI Phase 2 — Cockpit avancé (moyen terme)

- **Graph dépendances** (Cytoscape ou d3-force)
- **Diff canvas history** intégré
- **Métriques produit dashboard** (cycle time, throughput, aging)
- **Status alertes** colorées + temporelles

#### UI Phase 3 — Polish OSS-ready (long terme)

- **Theming** (light/dark, customisable, branding)
- **Onboarding wizard** (premier lancement guide pas-à-pas)
- **Localisation** (FR / EN au minimum)
- **Documentation interactive** intégrée (tooltips, screenshots
  contextuels)

### Matrice d'investissement UI (révisée)

| Volet UI | Coût | ROI | Verdict |
|---|---|---|---|
| Markdown viewer/editor léger pour les artefacts | Modéré | Bon (cohérence avec hub) | À polir (cf. INBOX-005) |
| Inbox board kanban | Modéré | **Élevé** (gap marché) | **Investir** |
| Roadmap kanban Now/Next/Later | Modéré | **Élevé** (déjà amorcé UI-008) | **Investir** |
| Navigation 3-panes Story → Analysis → Canvas | Modéré-Élevé | **Élevé** (différenciant fort) | **Investir** |
| Graph navigable dépendances | Élevé | Élevé (visuel "wow", démo OSS) | Investir progressivement |
| Diff visuel canvas history | Modéré | Moyen | À considérer |
| Status alertes / cockpit Today | Faible | Élevé (utilisable au jour le jour) | Investir |
| Métriques produit dashboard | Modéré | Élevé (argument vente OSS) | Investir |


## so

- **Code editor (Go/TS/Java syntax, lint, debug, refactor)** —
  coût énorme, ROI ~0 puisque Cursor / VSCode gagnent sur ce front.
  Concurrence frontale = lutte perdue. **Ne pas faire.**
- **Éditeur visuel drag-drop pour la section Operations du canvas** —
  over-engineered. Le canvas editor mentionné dans CLAUDE.md
  (UI-001) doit être recadré : pas un éditeur visuel, mais un
  **viewer / éditeur markdown léger** synchronisé avec les autres
  panes.
- **Plugin VSCode** — pas envisagé à court terme. Le hub Wails
  reste la surface principale.


## oq

### Décisions à trancher (revue produit)

- [ ] **Confirmer le recadrage** : oui pour cockpit produit, non
  pour code editor. Le hub Wails reste la surface principale ; pas
  de plugin VSCode envisagé à court terme.
- [ ] **Stack graph** : Cytoscape.js (riche, lourd) vs d3-force
  (léger, plus de code à écrire) vs ReactFlow (entre les deux).
- [ ] **Cockpit Today au lancement** : remplace le hub actuel ou
  vient en plus comme un mode dédié ?
- [ ] **Métriques temps réel ou snapshot ?** Calcul à chaque
  ouverture (lent sur gros repos) vs index persistant (cf. RAG
  layer cf. INBOX-013).


## ac

<à compléter>

```
Given <contexte>
When <action>
Then <résultat observable>
```

Note : cet artefact est en discovery zone (Inbox). Les Acceptance
Criteria seront formulés à la promotion en Story / Epic, story par
story (probable Epic à découper en 6-8 stories enfants, 1 par
feature cockpit majeure).
