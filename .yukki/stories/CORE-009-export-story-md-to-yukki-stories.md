---
id: CORE-009
slug: export-story-md-to-yukki-stories
title: Export du fichier .md final dans .yukki/stories/ avec contrôle de conformité
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - internal/uiapp
  - internal/artifacts
  - internal/storyspec
---

# Export du fichier .md final dans .yukki/stories/ avec contrôle de conformité

## Background

UI-014e expose un bouton "Exporter" qui, en mock, génère le `.md` côté
front et le télécharge ou le logge en console. Cette story implémente
l'**export réel** côté backend Go : sérialisation déterministe du draft
en Markdown SPDD, vérification de conformité au template, écriture
atomique dans `.yukki/stories/<id>-<slug>.md`, et gestion des conflits
(story déjà existante). Ce path doit être **byte-identique** entre
ce que la CLI `yukki story` produit et ce que l'UI exporte, pour ne pas
introduire de divergences de formatage.

## Business Value

Boucler le workflow : un PO peut rédiger sa story dans l'UI, l'exporter,
et trouver immédiatement le fichier dans `.yukki/stories/` prêt à être
commité. Pas de copier-coller manuel, pas de risque de format invalide.
Et la CLI continue de fonctionner exactement de la même façon, garantissant
que `yukki ui` et `yukki story` produisent le **même artefact**.

## Scope In

- Fonction Go `internal/storyspec.Render(draft Draft) ([]byte, error)` :
  - Sérialise le front-matter YAML dans l'ordre : `id, slug, title, status, created, updated, owner, modules`
  - Sépare par `---` (3 dashes) et un retour ligne
  - Sérialise les sections dans l'ordre du template : `Background`, `Business Value`, `Scope In`, `Scope Out`, `Acceptance Criteria` (avec sous-sections AC1, AC2…), `Open Questions`, `Notes`
  - Encodage UTF-8 sans BOM, EOL `\n`, retour ligne final présent
  - Pas de section vide (les sections optionnelles non remplies sont omises)
- Fonction Go `internal/storyspec.Conform(rendered []byte) error` :
  - Re-parse le `.md` rendu et vérifie qu'il est conforme au template `.yukki/templates/story.md` (mêmes sections, ordre identique, front-matter parseable par `yq`)
  - Échec si une section manquante ou hors ordre — sécurité contre les régressions de `Render`
- Fonction Go `internal/storyspec.WriteAtomic(path string, content []byte) error` :
  - Écriture via `os.CreateTemp` dans le même dossier puis `os.Rename` pour atomicité
  - Crée `.yukki/stories/` si inexistant
- Binding Wails `StoryExport(draft Draft, options ExportOptions) (ExportResult, error)` :
  - `options.Overwrite bool` — par défaut false ; si la story existe et `Overwrite=false`, retourne une erreur structurée `{kind: "conflict", existingPath: "..."}`
  - `ExportResult` contient `Path`, `Bytes`, `WrittenAt` ; consommé par UI pour afficher le toast
- Réutilisation par la CLI : `yukki story` finalise un draft via le même `Render` + `WriteAtomic`. Aucun chemin parallèle entre CLI et UI.
- Hook git optionnel : si `.git/` est détecté et `--git=true` (option), faire un `git add` du fichier exporté ; pas de commit auto (laisse au rédacteur)

## Scope Out

- Création automatique d'un commit ou d'une PR (le rédacteur reste maître du moment du commit)
- Export multi-stories (boucle sur drafts pour générer plusieurs `.md` à la fois) — story future si besoin
- Export vers d'autres formats (PDF, HTML, JSON) — hors périmètre SPDD
- Suppression du draft après export — laisser au front décider via `DraftDelete` (CORE-007)
- Validation sémantique avancée (cohérence Scope In ↔ AC, etc.) — c'est `/yukki-analysis`

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Render produit un .md byte-identique au template manuel

- **Given** un draft complet dont chaque champ et section a été pré-rempli avec
  des valeurs connues
- **When** je compare `Render(draft)` avec un `.md` rédigé à la main suivant
  le template `.yukki/templates/story.md` avec exactement les mêmes valeurs
- **Then** les deux sont byte-identiques (vérifié par `bytes.Equal`)

### AC2 — Sections optionnelles vides omises

- **Given** un draft avec Open Questions et Notes vides
- **When** `Render(draft)` est appelé
- **Then** le `.md` ne contient ni `## Open Questions` ni `## Notes` ; les
  sections obligatoires restent présentes même si non remplies (mais elles
  ne devraient jamais arriver à ce stade — bloquées par UI-014e)

### AC3 — Conform échoue sur sortie manipulée

- **Given** un `.md` rendu correct, modifié pour réordonner `## Background`
  après `## Business Value`
- **When** `Conform(modifiedMD)` est appelé
- **Then** une erreur explicite est retournée :
  `"section 'Background' attendue avant 'Business Value', trouvée à l'inverse"`

### AC4 — Écriture atomique

- **Given** un fichier `.yukki/stories/UI-099-test.md` est en cours d'écriture
  par `WriteAtomic` et le process est tué (test : kill -9 pendant un mock écriture lente)
- **When** la machine redémarre
- **Then** le fichier final n'existe pas OU il existe avec son contenu complet
  (pas de fichier partiel) — vérifié par test d'intégration via SIGKILL

### AC5 — Conflit sur story existante sans overwrite

- **Given** `.yukki/stories/UI-099-test.md` existe déjà
- **When** `StoryExport(draft, {Overwrite: false})` est appelé pour le même id
- **Then** retourne `{kind: "conflict", existingPath: ".yukki/stories/UI-099-test.md", existingUpdatedAt: "..."}`
  ; l'UI affiche un dialog "La story UI-099 existe déjà (mise à jour il y a 3 jours).
  Écraser ?" avec boutons `Annuler` / `Écraser`

### AC6 — CLI et UI produisent un même .md

- **Given** un draft identique passé à la CLI (`yukki story --from-draft UI-099.json`)
  et à l'UI (`StoryExport`)
- **When** les deux écrivent leur fichier
- **Then** les deux fichiers sont byte-identiques (test d'intégration : exécution
  des deux paths sur le même draft, comparaison `bytes.Equal`)

### AC7 — Création du dossier .yukki/stories si absent

- **Given** un projet sans dossier `.yukki/stories/`
- **When** `StoryExport(draft, ...)` est appelé
- **Then** le dossier est créé avec `os.MkdirAll(perm 0755)`, le fichier est
  écrit dedans, aucune erreur n'est retournée

## Open Questions

- [ ] Encodage du front-matter YAML : utiliser `gopkg.in/yaml.v3` (préserve
      l'ordre des clés via `yaml.Node`) ou écrire un sérialiseur dédié SPDD
      (plus simple, pas de dépendance) ? Vu que l'ordre des clés est strict
      et limité, le sérialiseur dédié est probablement plus prudent.
- [ ] Rendu du modules en YAML : `modules: [frontend, docs]` (flow style) ou
      `modules:\n  - frontend\n  - docs` (block style) ? Le template
      `.yukki/templates/story.md` utilise block, on s'aligne dessus.
- [ ] Hook git optionnel : faut-il l'activer par défaut (lecteur attend de
      voir le fichier dans `git status`) ou désactivé pour ne pas surprendre ?
      Probablement désactivé par défaut.
- [ ] Comportement en cas de slug différent de l'id : `id=UI-099, slug=test`
      → fichier `UI-099-test.md`. OK, mais que faire si l'utilisateur change
      le slug d'un draft existant ? Renommer le fichier exporté ou créer un
      nouveau ?

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md) — backend export
- Dépend de CORE-007 (validation et persistance des drafts) et conceptuellement
  de UI-014e (l'UI mock est ce qu'on remplace)
- Doit être **commun à la CLI et à l'UI** : la CLI `yukki story` actuelle
  (CORE-001) écrit déjà un `.md` ; cette story factorise le rendu via `Render`
  pour garantir qu'UI et CLI partagent le code
- Test pivot : un test d'intégration qui exécute la même request via les deux
  paths et compare bytes
