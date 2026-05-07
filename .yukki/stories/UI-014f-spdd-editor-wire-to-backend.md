---
id: UI-014f
slug: spdd-editor-wire-to-backend
title: Câblage de l'éditeur SPDD aux backends Go (remplace les mocks)
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
  - internal/uiapp
---

# Câblage de l'éditeur SPDD aux backends Go (remplace les mocks)

## Background

Les stories UI-014a..e livrent l'éditeur en **full mock** : state local
React/Zustand, validation côté client uniquement, LLM simulé, export en
téléchargement Blob. Les stories CORE-007..009 livrent les backends Go
correspondants : persistance, validation, suggestion streaming, export
filesystem. Cette story **branche les deux côtés** : remplace les mocks
front par les vrais appels Wails, supprime le code mock devenu inutile,
et valide l'intégration de bout en bout sur 2 ou 3 scénarios pivots.

## Business Value

C'est la story qui transforme un prototype en outil utilisable. Elle ne
livre rien de nouveau visuellement, mais elle élimine toute dette de
mock-to-real et garantit que l'UX validée sur les mocks (CORE-007..009)
fonctionne réellement avec les backends Go. C'est aussi le moment où
les régressions cross-domain apparaissent et doivent être traquées.

## Scope In

- **Persistance** : remplacer le `useDraftStore` mock (LocalStorage ou inline state)
  par des appels Wails `DraftSave` / `DraftLoad` / `DraftList` / `DraftDelete`
  - Auto-save debounced 2s déjà en place côté UI, redirigée vers `DraftSave`
  - Restoration au démarrage de l'app via `DraftList` + dialog de reprise
- **Validation** : remplacer les regex JS de UI-014b par un appel `StoryValidate`
  qui retourne la `ValidationReport` Go
  - Suppression du fichier `frontend/src/spdd/validate.ts` (mock)
  - Le hook `useValidation(draft)` appelle `StoryValidate` avec debounce 200ms
- **Liste des modules connus** : chargée depuis `.yukki/methodology/modules.yaml`
  via un nouveau binding `MethodologyLoadModules() []string`, plus de liste hardcoded JS
- **Assistance IA** : remplacer le mock `useFakeSuggestion` par `useSpddSuggest`
  qui s'abonne aux events `spdd:suggest:chunk`, `spdd:suggest:done`, `spdd:suggest:error`
  - Bouton "Arrêter" branché à `SpddSuggestCancel`
  - Lien "Voir le prompt" affiche le **vrai** prompt construit côté Go (via un binding `SpddSuggestPreview` qui retourne le prompt sans lancer la requête)
- **Export** : remplacer le `Blob` download par `StoryExport(draft, {Overwrite: false})`
  - Si `kind: "conflict"` retourné, dialog Radix UI "Écraser la story existante ?"
  - Toast de succès affiche le `Path` retourné par `ExportResult`
- **Définitions de sections** : chargées depuis `.yukki/methodology/section-definitions.yaml`
  via `MethodologyLoadSectionDefinitions()`, alimente le tooltip `?` des sections (UI-014a) et l'inspector (UI-014b)
- Tests d'intégration end-to-end (Vitest + Wails mock harness) : 3 scénarios
  - Scénario A : créer un nouveau brouillon, le remplir, fermer/rouvrir l'app, retrouver l'état
  - Scénario B : sélectionner du texte, demander une suggestion, accepter, voir le state mis à jour
  - Scénario C : exporter une story complète, vérifier que le `.md` est dans `.yukki/stories/` et est byte-identique à un golden

## Scope Out

- Nouveaux comportements UX non couverts par UI-014a..e (cette story est
  un **branchement**, pas une feature)
- Optimisations de performance (debounce fin, virtualisation des longs
  drafts, etc.) — à itérer après usage réel
- Migration des drafts d'un format à un autre (la persistance JSON de CORE-007
  est censée être stable)
- Tests visuels (screenshot regression) — méthode à décider plus tard

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Suppression complète du code mock

- **Given** la branche de cette story
- **When** je grep `mock|fake|stub` dans `frontend/src/spdd/`
- **Then** aucun match restant ; **et** les fichiers `useFakeSuggestion.ts`,
  `validate.ts` (côté UI), et tout `*.mock.ts` dédié à l'éditeur SPDD ont été
  supprimés (les mocks de tests Vitest restent autorisés sous `*.test.ts`)

### AC2 — Persistance et restoration end-to-end

- **Given** je crée une nouvelle story dans l'éditeur, je remplis FM + Bg + 1 AC,
  je tue l'app via le gestionnaire de tâches (sans clic sur fermer)
- **When** je relance `yukki ui`
- **Then** un dialog propose "Reprendre le brouillon UI-099 (modifié il y a < 1 min) ?",
  accepter recharge l'éditeur exactement dans son état avant le crash, le
  fichier `<configDir>/yukki/drafts/UI-099.json` est cohérent avec l'UI

### AC3 — Suggestion réelle streamée dans le diff panel

- **Given** je sélectionne 5 mots dans Background
- **When** je clique "Reformuler" et que `claude` CLI est authentifié
- **Then** le panel APRÈS affiche les chunks token-par-token (≥ 3 mises à
  jour DOM observables), durée affichée à la fin, et accepter remplace bien
  la sélection dans le state local et sur disque (via auto-save)

### AC4 — Validation côté Go équivalente à l'UX

- **Given** je tape `id = "front-001"` (minuscules) dans le FM
- **When** le `useValidation` se déclenche après 200ms de debounce
- **Then** l'UI affiche le message d'erreur **textuellement identique** à
  celui retourné par `yukki story --id "front-001" --slug "x"` en CLI ; la
  vérification prouve qu'on n'a pas réintroduit de validation JS parallèle

### AC5 — Export écrit dans .yukki/stories/

- **Given** une story complète et valide
- **When** je clique sur "Exporter" en primary
- **Then** un appel `StoryExport(draft, {Overwrite: false})` réussit, le
  fichier `.yukki/stories/UI-099-spdd-editor-wire-to-backend.md` est créé,
  son contenu est byte-identique au rendu attendu (golden file dans `_testdata/`),
  le toast affiche "Story sauvée — `.yukki/stories/UI-099-...md`" avec un
  lien clickable qui ouvre le fichier dans VSCode (binding Wails `Shell.OpenInEditor`)

### AC6 — Conflit sur story existante

- **Given** une story `.yukki/stories/UI-099-existing.md` existe déjà
- **When** je tente d'exporter un draft avec `id=UI-099`
- **Then** un dialog "La story UI-099 existe déjà (mise à jour il y a 3 jours).
  Écraser ?" apparaît avec `Annuler` / `Écraser` ; cliquer sur Écraser appelle
  `StoryExport(draft, {Overwrite: true})`, le fichier est remplacé

### AC7 — 3 scénarios e2e passent en CI

- **Given** la suite de tests Vitest + Wails mock harness
- **When** la CI exécute `npm test`
- **Then** les 3 scénarios (A, B, C) passent avec un rapport JSON exploitable
  ; un échec met le PR en rouge

## Open Questions

- [ ] Le binding `Shell.OpenInEditor` n'existe pas encore (utilité au-delà
      de cette story). Le créer ici (mini-scope creep) ou faire l'export
      sans le lien clickable ?
- [ ] Rejouer une suggestion si l'utilisateur a modifié la sélection entre
      `Suggérer` et `Accepter` — quelle UX ? (Probablement abandonner la
      suggestion et redémarrer)
- [ ] Quelle stratégie pour les drafts orphelins (story exportée puis
      modifiée à nouveau dans l'UI sans re-export) — est-ce qu'`Updated` du
      draft prime sur `Updated` du fichier `.md` ?

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md) — branchement final
- Dépend de UI-014a..e (UI mock complète) et CORE-007/008/009 (backends Go).
  À démarrer une fois ces 8 stories en `implemented`.
- Cette story est volontairement plus courte en scope visuel : c'est de
  l'**intégration**, pas de la conception
- Les golden files de comparaison `.md` doivent être versionnés dans
  `_testdata/` au plus près du test
