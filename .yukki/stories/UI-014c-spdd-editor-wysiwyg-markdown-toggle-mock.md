---
id: UI-014c
slug: spdd-editor-wysiwyg-markdown-toggle-mock
title: Bascule WYSIWYG ↔ Markdown sans perte (mock)
status: draft
created: 2026-05-07
updated: 2026-05-07
owner: Thibaut
modules:
  - frontend
---

# Bascule WYSIWYG ↔ Markdown sans perte (mock)

## Background

Les rédacteurs SPDD ont deux profils : ceux qui veulent un éditeur riche
(WYSIWYG) avec gras/italique/listes/liens visibles, et ceux qui préfèrent
le markdown brut. Le prototype impose une bascule **bidirectionnelle sans
perte** : on doit pouvoir passer de l'un à l'autre indéfiniment sans
qu'aucun caractère ne soit ajouté ou retiré. La vue Markdown affiche le
fichier `.md` complet (front-matter YAML + sections) avec coloration
syntaxique et numéros de ligne ; la ligne correspondant à la section
active est surlignée en violet-soft.

## Background technique

UI-014a charge la story et UI-014b édite les sections via composants
spécialisés (FM form, AC blocks, prose textareas). Cette story ajoute la
**vue Markdown** : représentation du même state sous forme de fichier `.md`
unique, avec re-génération à la volée à chaque édition.

## Business Value

Permettre les deux modes de pensée — produit (vue guidée) et tech (vue
fichier brut) — sur la même story sans risquer de corrompre le format
SPDD à chaque switch. C'est un facteur clé d'adoption chez les
développeurs/tech leads habitués à éditer des `.md` directement.

## Scope In

- Segmented control WYSIWYG/Markdown dans le header (souligné violet 2px sur le mode actif)
- Vue Markdown : rendu du `.md` complet généré depuis le state, avec :
  - Numéros de ligne en gutter 50px à droite-aligné, `--text-faint`
  - Front-matter YAML : délimiteurs `---`, clé `#c8b6ff`, valeur string `#9be3a8`
  - Titres `## Section` en `#ffd089`, sous-titres `### AC1` en `#ffb3c1`
  - **gras** weight 600 `#f5f6fa`, *italique* en `--text-secondary`
  - Listes à puces et numérotées en `--text-secondary`
  - Ligne de la section active : fond violet-soft, numéro de ligne en `--yk-primary`
- Bascule WYSIWYG → Markdown : régénère le `.md` depuis le state interne (front-matter sérialisé YAML, sections ordonnées, AC sérialisés en sous-titres + listes)
- Bascule Markdown → WYSIWYG : reparse le `.md` vers le state ; si le contenu Markdown a été édité directement et n'est plus parseable selon le template SPDD, afficher un avertissement non bloquant ("Le format ne correspond plus au template SPDD — passer en WYSIWYG va appliquer la structure attendue")
- Aucune perte sur un round-trip W → M → W ou M → W → M sur du contenu valide
- Édition directe en mode Markdown autorisée (textarea en pleine largeur, monospace, syntax highlighting passive — pas d'auto-complétion cette story)
- Le sommaire reste visible et reste synchronisé : cliquer sur "Background" en mode Markdown scrolle jusqu'à la ligne `## Background`

## Scope Out

- Édition complètement libre du Markdown avec validation permissive (le mode reste un "miroir" du state, modulo édition manuelle)
- Bibliothèque WYSIWYG riche type TipTap/Lexical (mock cette story = `<textarea>` simple côté WYSIWYG ; UI-014b est censé fournir la riche)
- Coloration syntaxique via Shiki ou highlight.js (mock cette story = règles CSS simples sur tokens)
- Sauvegarde automatique des switchs en localStorage (CORE-007)

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Round-trip WYSIWYG → Markdown → WYSIWYG sans perte

- **Given** la story de démo (FM complet, 3 AC, Bg/Bv/SI/SO/Notes remplis)
- **When** je bascule sur Markdown puis reviens sur WYSIWYG sans rien éditer
- **Then** le state interne est strictement identique au state initial — même
  ordre de sections, même contenu d'AC, mêmes modules, même contenu prose
  (test via comparaison string ou snapshot)

### AC2 — Round-trip Markdown → WYSIWYG → Markdown sans perte

- **Given** je suis en mode Markdown sur la story de démo
- **When** je bascule sur WYSIWYG puis reviens sur Markdown sans rien éditer
- **Then** le `.md` rendu est byte-identique à celui du départ (espaces,
  retours ligne, ordre des clés YAML compris)

### AC3 — Coloration syntaxique YAML + Markdown

- **Given** la vue Markdown est active sur la story de démo
- **When** je regarde le rendu
- **Then** les délimiteurs `---` sont neutres, les clés YAML en violet clair
  `#c8b6ff`, les valeurs string en vert clair `#9be3a8`, les `## Sections`
  en jaune `#ffd089`, les `### AC1` en rose `#ffb3c1`, les listes à puces
  en `--text-secondary`

### AC4 — Surlignement de la ligne section active

- **Given** je suis en mode Markdown, section active = "Acceptance Criteria"
- **When** je regarde le gutter et la ligne `## Acceptance Criteria`
- **Then** la ligne entière a un fond violet-soft, son numéro de ligne est
  en `--yk-primary` weight 500, et un cliquant sur "Background" dans le
  sommaire fait scroller la vue Markdown jusqu'à la ligne `## Background`
  qui prend à son tour le surlignement

### AC5 — Édition directe en Markdown

- **Given** je suis en mode Markdown, je remplace dans la section Background
  le mot "lent" par "**lent**"
- **When** je bascule en WYSIWYG
- **Then** la section Background affiche le mot "lent" en gras (weight 600,
  couleur `--yk-text-primary`) et un nouveau passage en Markdown réaffiche
  bien `**lent**` au même endroit

### AC6 — Avertissement sur Markdown malformé

- **Given** je suis en mode Markdown et je supprime accidentellement la ligne
  `## Background` entière
- **When** je clique sur WYSIWYG
- **Then** une bannière non bloquante apparaît en haut du document
  ("Le format ne correspond plus au template SPDD — passer en WYSIWYG va
  appliquer la structure attendue. La section Background sera réinsérée vide.")
  avec un bouton "Continuer" et un bouton "Rester en Markdown"

## Open Questions

- [ ] Bibliothèque WYSIWYG cible : TipTap (extensible, écosystème riche),
      Lexical (perf, contrôle bas niveau), ProseMirror (le plus puissant mais
      le plus dense) ? Décision plutôt à prendre dans UI-014b ou dans une
      story d'arbitrage dédiée.
- [ ] La sérialisation YAML du front-matter : quelle bibliothèque (yaml.js, js-yaml,
      ou parser maison contraint au sous-ensemble SPDD) ? Cohérence à garder
      avec CORE-007/008.
- [ ] Coloration syntaxique : Shiki est déjà dans `package.json`. À utiliser
      (rendu côté front à la volée) ou réécrire un highlighter minimal sur
      les seuls tokens SPDD utiles (front-matter + titres + listes) ?

## Notes

- Story parente : [UI-014](UI-014-guided-story-editor-ai-assist.md)
- Dépend de UI-014a (coquille) et idéalement UI-014b (state riche du document)
- Prototype source : `sketch/yukki/project/spdd-editor.jsx` (rendu Markdown
  avec gutter), `spdd-editor.css` (`.yk-md-*`)
- Le `.md` de référence à reproduire : voir le template `.yukki/templates/story.md`
  et toutes les stories existantes (UI-001a, CORE-006, etc.)
