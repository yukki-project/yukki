---
id: UI-019
slug: ai-restructure-and-chat-fallback
title: Restructuration IA d'un artefact mal formé (+ fallback chat)
status: accepted
created: 2026-05-08
updated: 2026-05-09
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
      2026-05-09** : limite dure à **5 tours** Q/R LLM ↔ user.
      Au-delà, l'Inspector affiche « Conversation trop longue,
      abandonné » et propose un bouton « Recommencer » qui réinitialise
      l'historique. Garde-fou simple contre la boucle infinie LLM
      et la dérive de coût.
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
