---
id: UI-019
slug: ai-restructure-and-chat-fallback
story: .yukki/stories/UI-019-ai-restructure-and-chat-fallback.md
status: draft
created: 2026-05-09
updated: 2026-05-09
---

# Analyse — Restructuration IA d'un artefact mal formé (+ fallback chat)

> Contexte stratégique pour la story
> `UI-019-ai-restructure-and-chat-fallback`. Produit par
> `/yukki-analysis` à partir d'un scan ciblé du codebase
> (`templateDivergence`, `SpddInspector`, streaming CORE-008,
> `promptbuilder`, `AiDiffPanel`, `SpddHeader`, `useToast`).
> Toutes les Open Questions de la story ont été tranchées
> (cf. story `accepted` : marqueur `<info-missing>`, Inspector
> réutilisé en chat, 5 tours max, abandon à la fermeture, Ctrl+S
> explicite + badge « modifié non sauvé »).

## Mots-clés métier extraits

`Restructuration IA`, `warning désync` (template / artefact),
`marqueur <info-missing>`, `Inspector mode chat`, `diff preview`
(AiDiffPanel existant), `5 tours max`, `streaming Claude CLI`
(`SpddSuggestStart` / `SpddSuggestCancel`), `promptbuilder`
(action / criterion), `section definitions`, `badge "modifié
non sauvé"`, `dirty state`.

## Concepts de domaine

> Modélisation suivant les 5 briques de
> [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le code)

- **`TemplateDivergence`** (Value Object) —
  `frontend/src/lib/templateDivergence.ts` : produit par
  `computeDivergence(editState, parsedTemplate)`, contient
  `missingRequired[]` et `orphanSections[]`. C'est le shape
  exact à passer au prompt LLM pour qu'il sache quelles sections
  manquent et quelles sections orphelines redistribuer.
- **`WarningsBanner`** (Entity) — composant inline dans
  `frontend/src/components/spdd/SpddEditor.tsx` qui rend
  aujourd'hui le warning de désync. Point d'accroche pour le
  bouton « Restructurer avec l'IA » (à côté du texte du warning).
- **`SpddInspector`** + **`GenericInspector`** (Entity) —
  `frontend/src/components/spdd/SpddInspector.tsx` /
  `GenericInspector.tsx` : panneau droit de l'éditeur, rend
  aujourd'hui des cards statiques selon `activeSection`. Décision
  Q2 story : on basculera ce composant en mode chat pendant la
  restructuration interactive.
- **`SuggestionRequest`** (Value Object — CORE-008) — défini dans
  `internal/provider/suggest.go`, contient `section`, `action`,
  `selectedText`, `previousSuggestion`. **À étendre** avec une
  nouvelle valeur d'action et un éventuel champ `divergence`.
- **Streaming events Wails** — `spdd:suggest:chunk` /
  `spdd:suggest:done` / `spdd:suggest:error`, consommés côté
  frontend via `useSpddSuggest` hook
  (`frontend/src/hooks/useSpddSuggest.ts`).
- **`promptbuilder.Build()`** (Service Go) —
  `internal/promptbuilder/promptbuilder.go` : compose le prompt
  système à partir de `SuggestionRequest` + `SectionDefinitions`.
- **`AiDiffPanel`** (Entity) —
  `frontend/src/components/spdd/AiDiffPanel.tsx` : affiche
  AVANT / APRÈS / DIFF avec word-diff LCS maison. Réutilisable
  tel quel pour le diff de restructuration.
- **`useToast`** + **`SpddHeader` save badge** (Service / Entity)
  — patterns établis pour feedback erreur / état sauvé.

### Nouveaux (à introduire)

- **`RestructureAction`** (Value Object) — nouvelle valeur de
  l'enum `action` de `SuggestionRequest` (par exemple
  `"restructure"`). Critère LLM associé décrit dans le
  promptbuilder.
- **`RestructureContext`** (Value Object) — nouveau champ optionnel
  de `SuggestionRequest` qui transporte le `TemplateDivergence`
  sérialisé (sections manquantes / orphelines) + le contenu
  brut de l'artefact, pour que le prompt LLM puisse le
  recomposer.
- **`ChatTurn`** (Value Object) — un tour Q/R dans le chat
  fallback : `{ role: 'assistant' | 'user', text }`. Liste
  bornée à 10 entrées (5 tours, cf. Q3 story).
- **`InspectorMode`** (State) — flag dans le store frontend qui
  bascule l'Inspector entre `'help'` (état actuel) et
  `'chat'` (nouveau). Reset à la fermeture / changement de
  mode HubList.
- **Badge « modifié non sauvé »** — visuel orange dans
  `SpddHeader`, alimenté par un nouveau flag `isDirty` (ou
  généralisé au-delà d'UI-019, à arbitrer).
- **Domain event `restructureAccepted` / `restructureRefused` /
  `chatTurnCompleted`** — signaux internes pour orchestrer le
  flow (state transitions Zustand, pas de persistance).

### Invariants

- **I1 — Pas d'écriture silencieuse** : la restructuration ne
  touche au draft qu'après clic explicite « Accepter » ; le
  fichier disque ne bouge pas avant Ctrl+S (Q5).
- **I2 — Marqueur `<info-missing>` détecté en fin de stream** :
  pour éviter une bascule chat prématurée pendant le streaming
  (le marqueur peut apparaître au milieu d'un brouillon
  partiel), la détection se fait sur la réponse complète.
- **I3 — Limite dure à 5 tours** : compteur Zustand côté
  frontend, désactivation de l'input chat au 5ᵉ tour user
  (Q3).
- **I4 — Abandon implicite** : fermer l'Inspector ou changer
  de mode = annulation, l'historique chat est jeté (Q4).
- **I5 — Pas de bouton sur artefact conforme** : si
  `TemplateDivergence` est vide, ni le warning ni le bouton
  ne sont rendus (cf. AC5 story).

## Approche stratégique

> Format Y-Statement de
> [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

**Pour résoudre** *la perte de contenu utilisateur quand un
artefact ne matche plus son template* (le flow actuel « passer
en WYSIWYG » réinsère des sections vides en écrasant les
intentions mal classées), **on choisit** *d'ajouter une nouvelle
action `restructure` au pipeline streaming CORE-008 existant,
qui passe le `TemplateDivergence` et le contenu brut au prompt
LLM ; côté frontend, on branche un bouton sur le warning
existant, on rend le diff via l'`AiDiffPanel` existant, et on
réutilise l'Inspector en mode chat quand le marqueur
`<info-missing>` est détecté en fin de stream*, **plutôt que**
*(B) écrire un parser markdown maison qui essaie de redistribuer
le contenu sans LLM (fragile, perd l'intention sémantique),
(C) créer un nouveau composant chat full-screen indépendant
(complexité UX et code dupliqué), (D) écrire la restructuration
sur disque automatiquement (perd le contrôle utilisateur, casse
la promesse Ctrl+S)*, **pour atteindre** *un MVP qui réutilise
~80% des briques existantes (CORE-008, AiDiffPanel, Inspector,
SpddHeader, useToast) et ne crée que de la glue (action +
critère prompt + bascule Inspector + badge dirty)*, **en
acceptant** *l'extension du contrat `SuggestionRequest` avec
un champ `divergence` optionnel — et donc la nécessité de
faire évoluer `SuggestionRequest` côté Go ET le stub TS
sans régresser les usages existants de l'action `improve` /
`enrich` / `rephrase` / `shorten`.*

### Alternatives écartées

- **B — Parser markdown maison sans LLM** : impossible de
  préserver l'intention sémantique d'un contenu mal placé.
- **C — Composant chat dédié plein écran** : duplique l'UX,
  perd le contexte de l'artefact, va à l'encontre de la
  décision Q2 story (réutiliser l'Inspector).
- **D — Écriture automatique sur disque post-acceptation** :
  contredit la décision Q5 story (Ctrl+S explicite).
- **E — Mode chat dès le 1er clic (pas de one-shot)** : friction
  systématique sur le cas nominal où la restructuration peut
  se faire d'un coup (cf. AC1 story).

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/provider/suggest.go` | faible | modify : ajouter `"restructure"` à l'enum action ; ajouter champ `Divergence string` (JSON sérialisé) à `SuggestionRequest` |
| `internal/promptbuilder/promptbuilder.go` | moyen | modify : ajouter le criterion « restructure » + insertion conditionnelle du contexte divergence dans le prompt système |
| `internal/uiapp/suggest.go` | faible | modify : routage de la nouvelle action — réutilise le pipeline streaming existant |
| `frontend/src/lib/templateDivergence.ts` | aucun | inchangé (le shape est déjà parfait) |
| `frontend/src/components/spdd/SpddEditor.tsx` (WarningsBanner) | moyen | modify : ajouter le bouton « Restructurer avec l'IA » à côté du warning |
| `frontend/src/components/spdd/SpddInspector.tsx` + `GenericInspector.tsx` | fort | modify : ajout d'un mode `chat` qui rend l'historique Q/R + input + 5 tours max |
| `frontend/src/components/spdd/AiDiffPanel.tsx` | faible | réutilisé tel quel (passer markdown avant/après) |
| `frontend/src/components/spdd/SpddHeader.tsx` | faible | modify : ajout badge orange « modifié non sauvé » conditionnel sur `isDirty` |
| `frontend/src/stores/spdd.ts` | moyen | modify : ajouter `inspectorMode`, `restructureChatHistory[]`, `chatTurnCount`, `isDirty` |
| `frontend/src/hooks/useSpddSuggest.ts` | faible | modify : exposer le marqueur `<info-missing>` détecté en fin de stream |
| `frontend/wailsjs/go/main/App.{d.ts,js}` | faible | modify : refléter le nouveau champ `Divergence` dans le stub `SuggestionRequest` |

## Dépendances et intégrations

- **CORE-008 streaming Claude CLI** — fondation réutilisée
  intégralement (events Wails + hook `useSpddSuggest`).
- **`SectionDefinitions`** chargées par `promptbuilder.loader` —
  source de vérité des sections attendues, déjà accessible côté
  Go ; le prompt LLM les inclura pour que l'IA connaisse la
  structure cible.
- **Pas de nouvelle dépendance npm / Go** — tout est déjà
  installé (`AiDiffPanel` est maison, pas de
  `react-diff-viewer`).
- **Contrainte format LLM** : le prompt système doit imposer le
  marqueur `<info-missing>question 1\nquestion 2</info-missing>`
  comme dernière sortie quand l'IA manque d'info (sinon réponse
  = markdown restructuré pur).

## Risques et points d'attention

> Selon les 6 catégories de
> [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Sécurité (STRIDE — Tampering)** : prompt injection via le
  contenu de l'artefact. Un texte malveillant style « Ignore
  previous instructions and… » dans la story pourrait détourner
  le LLM. *Impact* : moyen (sortie polluée mais pas d'écriture
  sans validation user). *Probabilité* : faible
  (utilisateur unique, pas d'input externe). *Mitigation* :
  prompt système ferme avec instructions de priorité claires +
  validation user explicite avant écriture (Ctrl+S).

- **Compatibilité — marqueur ambigu** : `<info-missing>` pourrait
  apparaître dans un contenu utilisateur réel (très improbable
  mais possible — un artefact qui DOCUMENTE le mécanisme).
  *Impact* : faux positif → bascule chat indue. *Probabilité* :
  très faible. *Mitigation* : ne détecter le marqueur que **en
  fin de réponse** (après le dernier `\n` significatif), pas
  au milieu.

- **Performance — taille du contenu** : un artefact très long
  (10000+ lignes) peut dépasser le contexte LLM. *Impact* :
  l'appel échoue ou tronque silencieusement. *Probabilité* :
  faible (artefacts SPDD sont courts par discipline).
  *Mitigation* : limite douce de taille (par exemple 30K
  caractères) avec warning utilisateur si dépassée.

- **Opérationnel — streaming long** : 5 tours × ~2 sec stream
  chacun = ~10 sec de latence cumulée. *Impact* : utilisateur
  attend devant un spinner. *Probabilité* : haute. *Mitigation* :
  bouton « Annuler » dans l'Inspector chat (déjà disponible via
  `SpddSuggestCancel`).

- **Data — perte de contenu lors d'un crash** : si l'app crashe
  pendant le chat (cf. OPS-001 ErrorBoundary à venir), tout
  l'historique est perdu (cohérent Q4 story, mais frustration).
  *Impact* : moyen. *Probabilité* : faible une fois OPS-001
  livré. *Mitigation* : aucune dans cette story (cohérent
  scope), recovery viendra avec OPS-001.

## Cas limites identifiés

> Détectés via BVA + EP + checklist 7 catégories de
> [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Artefact entièrement vide** (1 seule ligne titre) → l'IA
  n'a rien à restructurer, retourne probablement
  `<info-missing>` immédiatement → bascule chat dès le 1er
  appel.
- **Artefact géant** (> 30K caractères, 200+ lignes prose) →
  troncature silencieuse ou erreur ? À trancher (recommandation :
  warning utilisateur + refus de l'appel).
- **Marqueur partiel pendant le streaming** (l'IA commence par
  `<info-mis` puis change d'avis et écrit du contenu) → ne
  détecter le marqueur qu'après `done` event.
- **Fermeture pendant le streaming** → appel
  `SpddSuggestCancel`, l'Inspector revient en mode `'help'`
  proprement.
- **Refus puis re-clic immédiat** → reset complet : nouveau
  diff propre, pas de résidu de la session précédente.
- **Réponse LLM coupée à mi-stream** (Claude CLI tué, réseau
  KO) → l'event `error` est consommé par `useSpddSuggest`,
  toast destructive affiché, Inspector revient en `'help'`.

## Decisions à prendre avant le canvas

> Les 5 OQ de la story sont tranchées (cf. story `accepted`).
> Voici les décisions résiduelles soulevées par l'analyse.

- [ ] **Action enum design** : 1 seule valeur `"restructure"`
      qui couvre les 2 cas (one-shot OK / chat fallback selon
      marqueur), ou 2 valeurs distinctes
      `"restructure_one_shot"` + `"restructure_chat_turn"` ? →
      recommandation : 1 seule valeur, le marqueur côté LLM
      détermine la branche, le frontend gère le routage.
- [ ] **Limite de taille de l'artefact** : refuser l'appel
      au-delà de 30K caractères (avec toast explicite) ou
      tronquer côté Go avant le prompt ? → recommandation :
      refuser explicitement (l'utilisateur préfère un message
      à une troncature silencieuse).
- [ ] **`isDirty` badge — scope** : ajouter le flag
      uniquement quand la restructuration vient d'être
      acceptée, ou généraliser à toutes les modifications
      du SpddEditor (refacto SpddHeader plus large) ? →
      recommandation : généraliser, c'est trivial et bénéficie
      à tout l'éditeur.
- [ ] **Mémoire de la conversation chat côté Go** : le
      `previousSuggestion` field existant suffit-il, ou
      faut-il un nouveau champ `chatHistory []ChatTurn` dans
      `SuggestionRequest` pour transporter les N tours
      précédents au LLM ? → probablement `chatHistory` (un
      seul previousSuggestion ne capture pas un dialogue à
      plusieurs tours).
