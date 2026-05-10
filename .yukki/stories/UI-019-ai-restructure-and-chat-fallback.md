---
id: UI-019
slug: ai-restructure-and-chat-fallback
title: Restructuration IA d'un artefact mal formé (+ fallback chat)
status: synced
created: 2026-05-08
updated: 2026-05-10
owner: Thibaut Sannier
modules:
    - frontend
    - internal/uiapp
    - internal/promptbuilder
---

# Restructuration IA d'un artefact mal formé (+ fallback chat)

## Background

Le SpddEditor détecte déjà quand un artefact ne matche plus la
structure attendue par son template (sections manquantes / inattendues
/ ordre KO) et propose de basculer en WYSIWYG pour réinsérer les
trous vides — mais ce flow perd l'intention quand du contenu se
trouve mal classé. On veut, quand le warning s'affiche, un **bouton
« Restructurer avec l'IA »** qui demande au LLM de remapper le
contenu existant vers la structure cible. Si l'IA juge l'info
insuffisante pour reconstruire, on bascule en **mode chat** où
l'utilisateur répond à ses questions jusqu'à pouvoir finaliser.

## Business Value

Pas de perte de données quand un artefact est mal formé : ce qui
était déjà écrit est récupéré et remis à la bonne place. Onboarding
plus tolérant pour un PM ou un dev débutant qui peut écrire en
texte libre puis laisser l'IA structurer. Permet aussi de migrer
des artefacts hérités d'anciens templates sans repartir de zéro.

## Scope In

- Bouton **« Restructurer avec l'IA »** affiché à côté du warning
  de désynchronisation existant (« Le format ne correspond plus
  au template SPDD… ») dans le SpddEditor.
- Au clic : 1 appel LLM streamé qui reçoit le contenu actuel
  de l'artefact + la définition des sections du template +
  consigne « réorganise sans perdre d'info ; signale les manques ».
- Prévisualisation diff (avant / après) avec choix
  **Accepter / Refuser** par l'utilisateur ; pas d'écriture
  silencieuse.
- Si l'IA renvoie un marqueur de manque d'info (par ex.
  `<info-missing>` ou champ structuré équivalent), bascule en
  **mode chat** : drawer ou panneau qui affiche l'historique
  Q/R LLM ↔ utilisateur ; l'utilisateur répond, le LLM rebondit
  jusqu'à pouvoir produire la restructuration finale.
  **Conversation libre, sans cap dur** (cf. amendement post-
  implem OQ#3) — l'utilisateur abandonne explicitement quand il
  veut.
- **Streaming caractère-par-caractère** de la réponse Claude
  (chunks deltas via `--include-partial-messages` du CLI),
  rendus dans une bulle assistant qui s'écrit en live avec
  curseur clignotant. Layout chat « messenger » (avatar Sparkles
  à gauche, bulle violette user à droite, scroll continu, input
  bar avec bouton circulaire d'envoi).
- **Fallback conversationnel** : si Claude répond hors protocole
  (texte conversationnel, sans sections markdown détectables),
  sa réponse brute devient la question chat — meilleur UX que
  la question générique de l'heuristique 50%.
- Le bouton n'apparaît que quand le warning de désynchronisation
  est lui-même actif (pas de bouton sur un artefact conforme).

## Scope Out

- Restructuration sur un artefact **vide** (l'utilisateur démarre
  de zéro → flow LLM dédié déjà couvert par UI-001c `RunStory`).
- Restructuration **bulk** de plusieurs artefacts en une fois.
- Restructuration **cross-artefact** (ex. déplacer une section
  d'une story vers une analyse).
- Édition manuelle simultanée du draft pendant le chat.
- **Sauvegarde automatique** sans confirmation utilisateur — on
  reste explicite sur Accepter / Refuser.
- Restructuration du **front-matter YAML** (cette story se concentre
  sur le corps markdown ; le front-matter est déjà géré par le
  formulaire dédié).

## Acceptance Criteria

### AC1 — Restructuration one-shot d'un artefact partiellement valide

- **Given** un artefact dont le warning de désynchronisation est
  actif (par exemple deux sections manquantes mais du contenu
  utile en place)
- **When** l'utilisateur clique sur « Restructurer avec l'IA » et
  accepte le diff prévisualisé
- **Then** le draft de l'artefact est remplacé par la version
  restructurée, le warning de désynchronisation disparaît, et le
  contenu original est préservé section par section

### AC2 — Bascule en mode chat quand l'IA n'a pas assez d'info

- **Given** un artefact dont le contenu est trop mince pour que
  l'IA puisse remplir toutes les sections obligatoires
- **When** l'utilisateur clique sur « Restructurer avec l'IA »
- **Then** un panneau chat s'ouvre, affiche les questions du LLM
  (par exemple « Quel est le scope-in attendu ? ») et permet à
  l'utilisateur d'y répondre jusqu'à la production d'un diff
  acceptable

### AC3 — Refus du diff laisse l'artefact inchangé

- **Given** la prévisualisation du diff est affichée après une
  restructuration
- **When** l'utilisateur clique sur « Refuser » ou ferme la
  prévisualisation
- **Then** le draft de l'artefact reste à son état pré-clic et
  l'éditeur conserve toutes les modifications non sauvegardées
  antérieures

### AC4 — LLM indisponible : bouton désactivé

- **Given** la CLI Claude n'est pas disponible (binaire absent
  ou erreur de version), constat déjà visible dans la
  ClaudeBanner
- **When** le warning de désynchronisation est actif
- **Then** le bouton « Restructurer avec l'IA » est désactivé
  avec un tooltip explicite (« Claude CLI indisponible »)

### AC5 — Artefact conforme : bouton absent

- **Given** un artefact dont la structure correspond au template
  (aucun warning de désynchronisation actif)
- **When** l'utilisateur consulte le SpddEditor
- **Then** le bouton « Restructurer avec l'IA » n'est pas
  affiché (rien à restructurer)

## Open Questions

- [x] ~~Heuristique pour détecter « info manquante »~~ → **résolu
      2026-05-09** : marqueur `<info-missing>question 1\nquestion 2
      </info-missing>` imposé dans le prompt système. Détection par
      regex côté frontend, streaming-friendly. Format simple que
      Claude respecte de façon stable.
- [x] ~~Présentation du **mode chat** : drawer / modale / flottant ?~~
      → **résolu 2026-05-09** : on **réutilise l'Inspector existant**
      du SpddEditor (panneau droit qui affiche aujourd'hui l'aide
      contextuelle de la section). Pendant le chat, l'Inspector
      bascule en mode chat ; il retrouve son contenu d'aide normal
      quand le chat se ferme. Pas de nouveau pattern UX, cohérence
      visuelle préservée.
- [x] ~~Limite d'allers-retours dans le chat ?~~ → **résolu
      2026-05-09 puis amendé 2026-05-10** :
      - **Initial (2026-05-09)** : limite dure à 5 tours Q/R
        LLM ↔ user. Au-delà, mode `exhausted` + bouton
        « Recommencer ».
      - **Amendement post-implem (2026-05-10)** : **limite
        retirée** sur retour utilisateur (« le mécanisme de
        tour c'est nul »). La conversation est désormais
        illimitée ; l'utilisateur abandonne explicitement
        quand il veut via le bouton « Abandonner » ou en
        fermant l'Inspector. Trade-off : risque théorique de
        boucle infinie LLM ↔ user, accepté car en pratique
        Claude finit par produire un diff acceptable ou
        l'utilisateur ferme. Le mode `exhausted` + bouton
        Recommencer ont été retirés du code (Go +
        frontend + UI).
- [x] ~~Persistance de l'historique chat à la fermeture ?~~ →
      **résolu 2026-05-09** : tout jeter à la fermeture (MVP).
      Fermer l'Inspector ou changer de mode = abandon implicite,
      l'artefact reste dans son état d'origine pré-clic
      Restructurer. Si l'usage révèle un besoin, passer à une
      persistance session-memory (option B) en suivi.
- [x] ~~Sauvegarde auto vs Ctrl+S après acceptation ?~~ →
      **résolu 2026-05-09** : sauvegarde **explicite** via Ctrl+S
      ou bouton Save, comme toutes les autres modifications de
      l'éditeur. L'acceptation du diff applique la restructuration
      au draft en mémoire (badge orange « modifié non sauvé » dans
      le header pour que l'utilisateur ne l'oublie pas). Permet
      l'annulation simple (fermer sans sauver = retour à l'état
      pré-restructuration).

## Amendements post-implémentation (2026-05-10)

Capturés ici pour référence avant la prochaine sync `/yukki-sync`
qui réalignera le canvas avec ces décisions.

- **Tour-limit retiré** (cf. OQ#3 amendée). Plus de cap sur le
  nombre de tours chat ; abandon explicite uniquement.
- **Streaming chunk-par-chunk effectif** : flag CLI
  `--include-partial-messages` ajouté côté Go. Le parser
  stream-json attend désormais l'enveloppe `stream_event`
  (CLI 2.x) qui contient les `content_block_delta` →
  `text_delta` / `thinking_delta`. Avant cette correction le
  parser ignorait les deltas, le streaming visuel était cassé.
- **System prompt séparé** : `claude --system-prompt "..."` est
  passé pour les règles non-négociables (format
  `<info-missing>`, ne pas reformuler, etc.) ; l'artefact +
  divergence + history vont sur stdin. Bénéfice : prompt-cache
  Claude + priorité système renforcée.
- **`--bare` désactivé** : le flag désactive l'auth OAuth /
  keychain (n'accepte que `ANTHROPIC_API_KEY`). Comme la
  majorité des utilisateurs yukki sont sur OAuth (Claude Code
  via navigateur), `--bare` casse l'auth → désactivé.
- **Extended thinking dormant** : l'infrastructure
  `OnThinking` callback + event Wails `spdd:restructure:thinking` +
  `ThinkingBubble` UI est livrée et fonctionnelle, mais
  **`--effort high` n'est PAS activé** car la doc Anthropic
  Agent SDK confirme que l'activation du thinking désactive
  les StreamEvents (limitation connue, cf. issue
  anthropics/claude-code#30660 ouverte). Le streaming texte
  est privilégié sur l'affichage du raisonnement. Quand
  Anthropic livrera la fix CLI, il suffira de réactiver
  `clone.Effort = "high"` pour que la bulle « Raisonnement »
  s'allume.
- **Fallback conversationnel** : `isConversationalResponse(response)`
  côté Go détecte les réponses sans section `## ` et utilise
  le texte brut comme question chat (au lieu de la question
  générique de l'heuristique 50%). Branche prioritaire avant
  l'heuristique sections-vides.
- **Front-matter strip défensif** : `stripLeadingFrontMatter()`
  retire un éventuel YAML que Claude aurait halluciné en tête
  de réponse (malgré la consigne « ne touche pas au
  front-matter »). Évite les YAML doublés au moment du
  réassemblage frontend (`frontMatter + after`).
- **Chat redesign messenger** : ChatLayout component avec
  bulles assistant à gauche (avatar Sparkles violet, fond gris
  foncé) + bulles user à droite (violet plein), auto-scroll
  au dernier message, input bar avec textarea fluide + bouton
  circulaire d'envoi (Entrée envoie, Maj+Entrée saute une
  ligne). Inspirée d'une maquette Claude Design (`sketch/`).
- **Story-legacy path supporté** : sur les artefacts story
  (chemin `editState === null`), la divergence est dérivée
  des `markdownWarnings` du parser story (extraction du heading
  via regex sur la chaîne « La section X est absente »). Ne
  nécessite plus que le path générique.
- **Windows hideConsole fix** : nouveau helper build-tagged
  `internal/provider/hidewindow_{windows,other}.go` qui
  applique `CREATE_NO_WINDOW` au subprocess `claude` CLI.
  Sans ce flag, lancer `claude` depuis le binaire Wails GUI
  ouvrait une console terminale visible et perturbait les
  pipes stdout.

## Amendements post-implémentation 2 (2026-05-10b)

Seconde itération sur retour utilisateur après usage réel du
flow chat illimité. Inverse OQ#3 et OQ#5 ; à propager au canvas
au prochain `/yukki-sync`.

- **Conversation auto yukki ↔ Claude** (inverse OQ#3 amendée) :
  l'utilisateur n'intervient plus dans le chat. Quand Claude
  émet `<info-missing>`, **yukki répond automatiquement** à sa
  place avec un message générique (`AUTO_REPLY`) qui pousse
  Claude à remplir les sections inconnues avec le placeholder
  `<à compléter>` plutôt que de redemander. Cap dur réintroduit
  à `MAX_AUTO_TURNS = 10` pour éviter une boucle infinie LLM.
  Au-delà : bascule en `mode: 'error'` avec le markdown partiel
  visible — l'utilisateur peut Refuser pour relancer ou inspecter
  la sortie. **Bénéfice** : flux complètement automatisé,
  l'utilisateur valide juste le résultat final ; pas de friction
  textarea + envoi répété. Le system prompt rule 4 a été reformulé
  pour préférer `<à compléter>` sur `<info-missing>` (qui devient
  un dernier recours absolu pour artefacts vides).
- **ChatLayout simplifié** : suppression de l'input textarea + bouton
  d'envoi du `RestructureInspector`. Remplacé par un footer status
  (« Yukki dialogue avec Claude — tour N ») + bouton Annuler. Le
  composant `ChatLayout` rend toujours les bulles assistant /
  user (les réponses auto sont visibles dans l'historique pour
  transparence) mais l'utilisateur n'a aucune interaction texte
  pendant le streaming.
- **Validation Accept par template** (durcissement) : le bouton
  **Accepter** est désormais **désactivé** si le markdown `after`
  produit par Claude ne respecte pas le template (sections
  obligatoires absentes ou vides). Calcul via
  `parseArtifactContent + computeDivergence` sur la prop
  `acceptValidation` passée par `SpddEditor` à
  `RestructureInspector`. Banner orange affiche la liste des
  sections manquantes. **Garantit** qu'aucune restructuration
  ne peut casser la conformité du template — pas d'AC formelle
  parce que c'est une garde défensive transverse, mais cohérent
  avec AC1 (« le warning de désynchronisation disparaît »).
- **Auto-save sur Accept** (inverse OQ#5) : cliquer **Accepter**
  écrit immédiatement sur disque (`WriteArtifact`) + reset
  `isDirty=false` + toast « Restructuration sauvegardée ✓ ». UX
  naturelle : Accept = « j'ai vu le diff, applique + sauvegarde ».
  Sans cet auto-save, le navGuard re-ouvrait la pop-up
  « modifications non sauvegardées » à chaque clic dans la
  sidebar — vécu comme un bug. Sur erreur disque,
  `setDirty(true)` est rejoué pour permettre une retry via
  Ctrl+S.
- **Auto-save sur Terminer** (extension OQ#5) : le bouton
  **Terminer** (toggle edit → view-only du `SpddHeader`)
  sauvegarde implicitement avant de basculer. Retour utilisateur
  explicite : « entre deux redémarrages je perds ce qui a été
  fait » — l'utilisateur vivait Terminer comme un commit. Le
  nouveau flow : Modifier → édite → Terminer = sauve + ferme.
  Ctrl+S reste disponible et fonctionne aussi (extrait dans le
  helper `saveCurrentEditState`).
- **DiffStacked strip front-matter** (cosmétique) : le composant
  diff retire le bloc YAML de `before` avant comparaison. Sans
  ça, le diff affichait le front-matter comme « RETIRÉ » alors
  qu'il est juste réinjecté tel quel à l'acceptation (l'IA ne
  le voit pas). Pas un bug fonctionnel mais signal trompeur.
- **Bug fix `before` snapshot avant accept()** (régression
  silencieuse) : `RestructureInspector.handleAccept` lisait
  `useRestructureStore.getState().before` AVANT le reset par
  `accept()` puis le passait à `onAccept(after, before)`. Sans
  ce snapshot, le store était reset synchroniquement avant que
  `SpddEditor.handleRestructureAccept` ne lise `before`, ce qui
  causait `frontMatterExtracted=""` → front-matter vide après
  acceptation (cf. log diagnostic `restructure.accept.input
  beforeLen=0`).
- **Heuristique fallback dynamique** : la question générique
  émise par `buildHeuristicFallbackQuestions` quand l'heuristique
  50% se déclenche liste désormais les sections obligatoires
  réellement manquantes (« Les sections X et Y restent à
  compléter… »), au lieu d'une chaîne en dur générique. Calcul
  pur, déterministe, dépendant de `req.Divergence.MissingRequired`.

## Notes

- Briques existantes mobilisables : SpddEditor (UI-014) pour
  l'éditeur ; détection de désynchronisation déjà présente
  (UI-014g/h) ; streaming LLM via `SpddSuggestStart` /
  `SpddSuggestCancel` (CORE-008) ; promptbuilder Go pour la
  composition du prompt LLM (CORE-008).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : repose sur UI-014 + CORE-008 + UI-014g/h,
    toutes mergées. Pas de bloqueur amont.
  - **Negotiable** : le mode chat est le morceau le plus ouvert
    en design (drawer / modale / panneau).
  - **Valuable** : oui, récupération de données + onboarding
    tolérant.
  - **Estimable** : oui, ~2-3 j (frontend chat panel + prompts +
    diff preview).
  - **Small** : borderline. Le mode chat est un sous-projet à
    part entière (UX nouvelle + boucle LLM multi-tour). Voir
    SPIDR ci-dessous : scinder reste possible si la livraison
    s'avère trop grosse en analyse.
  - **Testable** : oui — détection bouton, mock LLM (échantillon
    de réponse avec / sans `<info-missing>`), assertion sur
    l'artefact post-acceptation.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** mais non figée — à arbitrer en analyse.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | One-shot et chat sont 2 chemins distincts ; on peut livrer (a) UI-019 one-shot puis (b) UI-019b chat. Recommandé si analyse révèle > 8 AC. |
  | Interfaces | non | Une seule UI cible (le SpddEditor) — pas de variantes. |
  | Data | non | Le markdown source + le template sont la même donnée pour les deux flows. |
  | Rules | non | L'AC5 (artefact conforme) et l'AC4 (LLM KO) sont les deux cas limites, tiennent en 2 AC. |
  | Spike | **possible** | L'heuristique « info manquante » côté LLM peut nécessiter un spike si le provider ne renvoie pas de manière fiable un marqueur structuré. |
