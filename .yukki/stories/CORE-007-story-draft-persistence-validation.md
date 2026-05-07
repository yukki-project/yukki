---
id: CORE-007
slug: story-draft-persistence-validation
title: Persistance des brouillons SPDD et validation front-matter côté Go
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - internal/uiapp
  - internal/artifacts
  - frontend
---

# Persistance des brouillons SPDD et validation front-matter côté Go

## Background

Les stories UI-014a..e livrent un éditeur fonctionnel **avec state local
uniquement**. Le rédacteur perd tout son travail s'il ferme l'app, et la
validation du front-matter est dupliquée en JS côté front (règles fragiles,
divergence possible avec la réalité Go). Cette story expose deux endpoints
Wails côté backend Go :

1. **Persistance** : chaque modification du brouillon est envoyée au backend
   qui le sérialise dans un fichier de cache (`~/.yukki/drafts/<id>.json` ou
   équivalent), restaurable au démarrage de l'app
2. **Validation** : règles SPDD canoniques (id, slug, status, modules, dates)
   exposées via une fonction Go réutilisée par la CLI (`yukki story`) et par
   l'UI (Wails event `story:validate`)

## Business Value

Garantir qu'un PO ne perd pas son travail en cas de crash, et que la
validation est **identique** entre `yukki story` (CLI) et l'éditeur (UI).
Une seule source de vérité Go évite les divergences subtiles qui empoisonnent
les workflows mixtes.

## Scope In

- Création du package `internal/draft` qui gère le cycle de vie d'un brouillon :
  - `Save(draft Draft) error` — sérialise en JSON dans `<configDir>/yukki/drafts/<id>.json`
  - `Load(id string) (Draft, error)` — recharge un brouillon depuis le disque
  - `List() ([]DraftSummary, error)` — liste les brouillons disponibles
  - `Delete(id string) error` — efface après export ou abandon explicite
- Type `Draft` avec : `ID`, `Slug`, `Title`, `Status`, `Created`, `Updated`, `Owner`, `Modules`, `Sections map[string]string` (Bg, Bv, SI, SO, OQ, Notes), `AC []AcceptanceCriterion`
- Validation centralisée dans `internal/storyspec/validate.go` :
  - `ValidateID(id string) error` — regex `^[A-Z]+(-[A-Z]+)*-\d+[a-z]?$` (UI-014a, CORE-007, META-001)
  - `ValidateSlug(slug string) error` — kebab-case strict, pas de chiffres en tête, ≤ 80 chars
  - `ValidateStatus(status string) error` — énumération `draft|reviewed|accepted|implemented|synced`
  - `ValidateModules(modules []string, known []string) []ModuleWarning` — chaque inconnu donne un warning, pas une erreur (le rédacteur peut introduire un nouveau module)
  - `ValidateDates(created, updated string) error` — ISO 8601 strict, updated ≥ created
- Liste des modules connus chargée depuis `.yukki/methodology/modules.yaml` (à créer si absent, valeurs par défaut : frontend, backend, controller, helm, docs, cli, internal/uiapp, internal/provider, internal/artifacts, internal/draft, internal/storyspec, etc.)
- Bindings Wails dans `internal/uiapp/bindings.go` :
  - `DraftSave(draft Draft) error`
  - `DraftLoad(id string) (Draft, error)`
  - `DraftList() ([]DraftSummary, error)`
  - `DraftDelete(id string) error`
  - `StoryValidate(draft Draft) ValidationReport` — retourne erreurs et warnings par champ
- `ValidationReport` structuré pour consommation directe par UI : `{ field: "id", severity: "error", message: "..." }`
- Auto-save côté front toutes les 2s d'inactivité (debounced) → appelle `DraftSave`
- Restoration au démarrage : si `DraftList()` non vide, l'UI propose au rédacteur de reprendre les brouillons existants

## Scope Out

- Synchronisation cloud / multi-poste (hors périmètre yukki)
- Conflits de modification (pas de scenario multi-utilisateur sur un même brouillon)
- Export `.md` final dans `.yukki/stories/` (CORE-009)
- Validation sémantique avancée (cohérence Scope In/AC, etc.) — c'est le rôle de `/yukki-analysis`
- Interface CLI explicite pour gérer les drafts (`yukki draft list/load/delete`) — possiblement story future

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Sauvegarde et restoration d'un brouillon

- **Given** je rédige une story dans l'éditeur SPDD avec id `UI-099` et un Background partiel
- **When** je ferme l'app puis la rouvre
- **Then** un dialog propose "Reprendre le brouillon UI-099 (modifié il y a 30 secondes) ?", et accepter recharge l'éditeur exactement dans son état précédent (mêmes valeurs FM, même Bg partiel, même position de scroll)

### AC2 — Validation ID au format SPDD

- **Given** un draft avec `id = "front-001"` (minuscules)
- **When** l'UI appelle `StoryValidate(draft)`
- **Then** la `ValidationReport` contient `{field:"id", severity:"error", message:"L'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042). Préfixe en majuscules, un tiret, des chiffres."}`

### AC3 — Validation slug kebab-case

- **Given** un draft avec `slug = "Mon Slug Avec Espaces"`
- **When** validation
- **Then** erreur retournée avec message "Le slug doit être en kebab-case : minuscules, chiffres, tirets uniquement. Exemple : `mon-slug-avec-tirets`."

### AC4 — Module inconnu produit un warning, pas une erreur

- **Given** un draft avec `modules = ["frontend", "mystery-module"]`
- **When** validation
- **Then** la `ValidationReport` contient un `warning` (severity = "warning") sur le champ `modules` avec message "Module 'mystery-module' inconnu. Modules connus : frontend, backend, … Tu peux l'ajouter à .yukki/methodology/modules.yaml si c'est volontaire." — l'export n'est pas bloqué

### AC5 — Validation cohérente CLI / UI

- **Given** la CLI `yukki story --id "front-001" --slug "x"` est lancée et l'éditeur UI valide le même draft
- **When** les deux exécutent leur validation
- **Then** les messages d'erreur sont **strictement identiques** (même string), démontrant qu'une seule fonction Go est appelée

### AC6 — Auto-save debounced toutes les 2s

- **Given** je tape dans le Background pendant 5 secondes en continu
- **When** je m'arrête de taper
- **Then** 2 secondes plus tard, un appel `DraftSave` est fait, le fichier
  `<configDir>/yukki/drafts/UI-099.json` est mis à jour avec le contenu
  courant et `Updated` actualisé à `time.Now()`

### AC7 — Liste et suppression des drafts

- **Given** 3 drafts en cours (UI-099, CORE-099, META-099)
- **When** j'appelle `DraftList()`
- **Then** je récupère les 3 résumés (`{ID, Title, Updated}`) ; et après
  appel à `DraftDelete("UI-099")`, le fichier disparaît du FS et un nouveau
  `DraftList()` ne retourne que CORE-099 et META-099

## Open Questions

- [ ] Format de sérialisation : JSON pour Wails (binding direct) — confirmé.
      Mais faut-il aussi pouvoir lire/écrire en YAML/MD pour debugging ?
- [ ] Localisation du `configDir` selon OS (Windows vs macOS vs Linux) :
      utiliser `os.UserConfigDir()` ou hardcoder `~/.yukki/` cross-platform ?
- [ ] Liste des modules connus : statique en YAML ou dynamique inférée
      depuis l'arbo Go (`internal/`, `cmd/`) + détectée depuis package.json
      (`frontend`) ? La 1re option suffit pour cette story.
- [ ] Faut-il une expiration automatique des drafts (purger ceux > 30 jours
      sans modification) ?

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md) — backend
- Dépend conceptuellement de UI-014a..e (l'UI mock alimente les besoins de
  validation). Implémentable indépendamment, branchement effectif en UI-014f.
- Réutilise le pattern `internal/artifacts` existant pour la lecture/écriture
  de fichiers SPDD
- Frontend : nécessite des bindings Wails régénérés (`wails generate module`),
  d'où le module `frontend` listé en dépendance
