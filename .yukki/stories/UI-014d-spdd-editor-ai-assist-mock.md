---
id: UI-014d
slug: spdd-editor-ai-assist-mock
title: Assistance IA contextuelle sur sélection — popover et panneau diff (mock LLM)
status: synced
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
    - frontend
---

# Assistance IA contextuelle sur sélection — popover et panneau diff (mock LLM)

## Background

Le différenciateur du produit est l'assistance générative **contextuelle** :
le rédacteur sélectionne un passage, ouvre un popover proposant 4 actions
(*Améliorer la lisibilité*, *Enrichir*, *Reformuler*, *Raccourcir*), choisit
une action, et arbitre la suggestion via un panneau Avant/Après/Diff. Le
prompt système est augmenté du contexte de la section courante (définition
SPDD, contraintes éventuelles type "G/W/T testable" pour les AC). Cette
story livre toute l'UX **avec un LLM mocké** : la suggestion est calculée
côté client (delays simulés + transformations triviales) pour valider les
flux de sélection / popover / diff / acceptation / refus / régénération.

## Business Value

Itérer sur l'UX de l'IA — la partie la plus délicate du produit — sans
attendre que CORE-008 (streaming via `ClaudeProvider`) soit prêt. Permet
aux PO de tester les 4 actions, le ton des messages, le placement du
popover, et la lisibilité du panneau diff sur de vrais cas.

## Scope In

- Détection de sélection ≥ 3 mots dans une section prose (Background, Business Value, Scope In/Out, Open Questions, Notes) → highlight de la sélection avec `bg: primary-soft` + `box-shadow: inset 0 0 0 1px var(--yk-primary)`
- Popover ancré sous la sélection : min-width 240px, fond `--bg-elev`, ombre `0 8px 24px rgba(0,0,0,0.4)`, animation pop-in 12ms
- 4 actions dans le popover, chacune avec icône violette `✦`, libellé FR, et raccourci `⌘1`/`⌘2`/`⌘3`/`⌘4` à droite (kbd-pill style code)
- Action "hot" (`⌘1` Améliorer la lisibilité par défaut) surlignée violet-soft, exécutable en `Enter`
- Footer "trans" du popover en `--text-muted` 11.5px : "Yuki sait que tu rédiges la section *Background*. Le contexte SPDD est inclus dans le prompt." + lien "Voir le prompt" qui ouvre un dialog avec le prompt complet (mocké : on affiche le template d'augmentation que CORE-008 utilisera)
- Après clic sur une action : l'inspector droit (360px) est remplacé par un **Diff Panel** avec 3 cards : `AVANT` (texte original sur fond `--soft-red`), `APRÈS` (texte suggéré sur fond `--soft-green`), `DIFF` (lignes `−` rouges et `+` vertes)
- Pendant l'arbitrage : la sélection dans le doc devient muted (`opacity: 0.4` + `filter: grayscale(1)`)
- Boutons en bas du Diff Panel : `Refuser` (ghost), `✓ Accepter` (primary violet), `↻ Régénérer` (icon-only, relance le mock)
- LLM mocké : selon l'action sélectionnée, transformation triviale du texte
  - *Améliorer la lisibilité* : remplace 2-3 mots par des synonymes prédéfinis
  - *Enrichir* : ajoute une phrase plate "Cette friction freine l'adoption."
  - *Reformuler* : inverse l'ordre des deux moitiés de la phrase
  - *Raccourcir* : supprime les adverbes et les adjectifs prédéfinis
- Délai simulé : 1.5–2.5s avec spinner discret + libellé "Yuki rédige…"
- Acceptation : remplace la sélection dans le state, ferme le diff panel, restaure l'inspector contextuel
- Refus : ferme le diff panel sans rien modifier
- Régénération : relance le mock (autre seed), même action, sans toucher la sélection

## Scope Out

- Connexion réelle à `ClaudeProvider` ou tout autre LLM (CORE-008)
- Streaming token-par-token (CORE-008 : `OnChunk`)
- Contextualisation avancée du prompt (cette story expose la copy "Voir le prompt" mais le contenu est statique)
- Actions IA sur le front-matter ou les blocs AC (limité aux sections prose pour cette story)
- Apprentissage / mémorisation des actions précédemment acceptées par l'utilisateur
- Suggestion proactive (Yuki suggère sans qu'on demande) — couvert ailleurs par l'inspector AC

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Déclenchement du popover sur sélection ≥ 3 mots

- **Given** je rédige la section Background, contenant "Aujourd'hui les stories se rédigent à la main."
- **When** je sélectionne "se rédigent à la main"
- **Then** la sélection prend un fond violet-soft + bordure violette interne,
  un popover apparaît juste sous la fin de la sélection avec les 4 actions

### AC2 — Sélection trop courte ne déclenche rien

- **Given** je rédige la section Background
- **When** je sélectionne "à la" (2 mots)
- **Then** aucun popover n'apparaît, la sélection reste en surbrillance native du navigateur

### AC3 — Raccourci clavier ⌘1 exécute l'action hot

- **Given** le popover est ouvert avec "Améliorer la lisibilité" en hot
- **When** je tape `⌘1` (ou `Enter`)
- **Then** le popover se ferme, l'inspector est remplacé par le Diff Panel
  affichant AVANT/APRÈS/DIFF, la sélection dans le doc devient muted

### AC4 — Acceptation remplace la sélection

- **Given** le Diff Panel est ouvert avec une suggestion non vide
- **When** je clique sur "✓ Accepter"
- **Then** la sélection dans le state est remplacée par le texte de la
  suggestion, le Diff Panel se ferme, l'inspector contextuel revient,
  l'historique d'undo permet de revenir à l'état avant remplacement

### AC5 — Refus n'affecte pas le contenu

- **Given** le Diff Panel est ouvert
- **When** je clique sur "Refuser"
- **Then** le Diff Panel se ferme, la sélection retrouve sa surbrillance
  initiale (sans le mute), aucune modification n'est appliquée au state

### AC6 — Régénération relance le mock

- **Given** le Diff Panel affiche une première suggestion
- **When** je clique sur "↻ Régénérer"
- **Then** le panel passe en état "Yuki rédige…" pendant 1.5–2.5s puis affiche
  une nouvelle suggestion (peut être identique selon le seed mocké), AVANT
  inchangé, APRÈS et DIFF mis à jour

### AC7 — Accès au prompt augmenté depuis le popover

- **Given** le popover est ouvert
- **When** je clique sur "Voir le prompt" dans le footer
- **Then** un dialog Radix UI s'ouvre affichant le prompt complet (statique mocké)
  qui sera envoyé au LLM : "Tu es un rédacteur SPDD. La section courante est
  *Background*. Définition SPDD : … Texte sélectionné : *…*. Action demandée : *…*."

## Open Questions

- [ ] Faut-il un mode "comparer 2 suggestions" (régénérer mais garder
      l'ancienne en haut) ? Probablement hors scope mock, mais à noter
      pour CORE-008.
- [ ] Stocker l'historique des suggestions acceptées/refusées pour
      téléconseil au LLM réel (CORE-008) ? Ou ne stocker que les actions
      effectives ?
- [ ] Le mock doit-il simuler des erreurs (timeout, refus de l'API, prompt
      injection détectée côté client) ? Au moins 1 cas pour valider l'UX
      d'erreur — peut-être ajouter un AC8 dans une révision.

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md)
- Dépend de UI-014a (coquille) et UI-014b (sections éditables — la sélection
  doit fonctionner dans les `<textarea>`/composant riche)
- Prototype source : `sketch/yukki/project/spdd-ai.jsx` (popover + diff panel)
- Le **vrai** câblage LLM est en CORE-008 (streaming `ClaudeProvider`) ; cette
  story fournit l'UX mockée que UI-014f viendra brancher
