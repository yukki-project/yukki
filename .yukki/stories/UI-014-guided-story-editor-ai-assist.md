---
id: UI-014
slug: guided-story-editor-ai-assist
title: Éditeur guidé de stories SPDD avec assistance générative
status: implemented
created: 2026-05-07
updated: 2026-05-08
owner: Thibaut
modules:
  - frontend
  - internal/uiapp
---

# Éditeur guidé de stories SPDD avec assistance générative

> **Story umbrella — décomposée le 2026-05-07.** Trop large pour une seule
> itération, cette story sert désormais de **vision et critères de succès
> globaux**. Le travail est éclaté en 9 sous-stories, organisées en 3 phases :
>
> **Phase 1 — UI mock (vérifier l'UX sans backend)**
> - [UI-014a](UI-014a-spdd-editor-shell-mock.md) — Coquille (3 colonnes, sommaire, document, inspector, tokens design)
> - [UI-014b](UI-014b-spdd-editor-frontmatter-ac-mock.md) — Front-matter form + AC blocks + validation visuelle
> - [UI-014c](UI-014c-spdd-editor-wysiwyg-markdown-toggle-mock.md) — Bascule WYSIWYG ↔ Markdown sans perte
> - [UI-014d](UI-014d-spdd-editor-ai-assist-mock.md) — Popover IA + diff panel (LLM mocké)
> - [UI-014e](UI-014e-spdd-editor-export-checklist-mock.md) — Bouton Exporter + checklist + toast (export mocké)
>
> **Phase 2 — Backend Go**
> - [CORE-007](CORE-007-story-draft-persistence-validation.md) — Persistance des brouillons + validation FM côté Go
> - [CORE-008](CORE-008-llm-suggestion-streaming.md) — Suggestion IA streamée via `ClaudeProvider`
> - [CORE-009](CORE-009-export-story-md-to-yukki-stories.md) — Export `.md` byte-conforme dans `.yukki/stories/`
>
> **Phase 3 — Câblage**
> - [UI-014f](UI-014f-spdd-editor-wire-to-backend.md) — Remplace les mocks par les bindings Wails réels
>
> Les sections ci-dessous restent valides comme **vision globale** ; les AC
> détaillés vivent désormais dans les sous-stories.

## Background

Yukki impose un format SPDD structuré (front-matter YAML + sections fixes :
Background, Business Value, Scope In/Out, Acceptance Criteria en Given/When/Then,
Open Questions, Notes). Aujourd'hui la rédaction se fait à la main dans un éditeur
markdown générique : c'est lent, sujet à oublis de sections, et la qualité dépend
de la rigueur du rédacteur. L'objectif est un éditeur **guidé** qui force la
structure SPDD, accepte une saisie riche (titres, listes, formatage) avec bascule
markdown ↔ WYSIWYG, et embarque de l'assistance générative sur la sélection.

## Business Value

Permettre à toute personne amenée à rédiger une story (PO, lead technique,
développeur) de produire en quelques minutes une story SPDD complète, structurée et
exploitable directement par les agents IA en aval (notamment `/yukki-analysis`).
Cible : réduction du temps de rédaction et homogénéité du corpus de stories, sans
imposer la connaissance fine du template à chaque rédacteur.

## Scope In

- Interface graphique guidée, section par section, suivant l'ordre du template SPDD
  (front-matter → Background → Business Value → Scope In → Scope Out → Acceptance
  Criteria → Open Questions → Notes).
- Éditeur de texte riche par section : titres, gras/italique, listes à puces et
  numérotées, blocs de code, citations, liens.
- Bascule bidirectionnelle WYSIWYG ↔ markdown brut sans perte d'information.
- Sélection de texte → menu contextuel avec actions génératives : *Améliorer la
  lisibilité*, *Enrichir*, *Reformuler*, *Raccourcir*. Le prompt est augmenté du
  template SPDD et de la définition de la section courante.
- Bloc dédié Given/When/Then pour la saisie des Acceptance Criteria (un AC = trois
  champs distincts).
- Validation à la volée du front-matter : slug kebab-case, status dans l'énumération,
  modules dans la liste autorisée, dates ISO.
- Export du fichier `.md` conforme au template, prêt à être commité dans `.yukki/stories/`.

## Scope Out

- Intégration directe avec Jira, GitHub (création de PR, push automatique) —
  l'export fichier suffit pour cette story.
- Collaboration temps réel multi-utilisateurs sur une même story.
- Versioning et historique des modifications — délégué au gestionnaire de versions.
- Génération autonome d'une story complète depuis un prompt libre (hors scope).
- Configuration du backend LLM par l'utilisateur final — fixé côté plateforme.

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — Navigation guidée à travers les sections SPDD

- **Given** un utilisateur ouvre l'éditeur sur une nouvelle story
- **When** il démarre la rédaction
- **Then** l'interface présente les sections dans l'ordre du template, indique la
  section courante, signale visuellement les sections obligatoires non remplies, et
  bloque l'export tant que front-matter, Background, Business Value, Scope In et au
  moins un AC ne sont pas renseignés

### AC2 — Bascule markdown ↔ WYSIWYG sans perte

- **Given** une section contenant du contenu formaté (titres, listes, gras, liens)
- **When** l'utilisateur bascule vers la vue markdown puis revient en WYSIWYG
- **Then** le rendu et le contenu sont strictement identiques à l'état initial —
  aucune perte de formatage, aucun caractère ajouté ou supprimé

### AC3 — Suggestion générative acceptée / rejetée explicitement

- **Given** un utilisateur a sélectionné une portion de texte dans une section
- **When** il déclenche l'action *Améliorer la lisibilité* depuis le menu contextuel
- **Then** une suggestion IA est affichée dans un panneau avant/après ; l'utilisateur
  peut l'accepter, la rejeter ou la régénérer ; le texte n'est modifié dans l'éditeur
  qu'après acceptation explicite

### AC4 — Prompt générative enrichi du contexte de la section courante

- **Given** un utilisateur déclenche une action générative dans la section
  *Acceptance Criteria*
- **When** la requête est envoyée au LLM
- **Then** le prompt système inclut la définition SPDD de la section (format
  Given/When/Then et contrainte de testabilité), de sorte que la suggestion respecte
  la structure attendue

### AC5 — Validation du front-matter en temps réel

- **Given** un utilisateur saisit le front-matter de la story
- **When** un champ contient une valeur invalide (slug non kebab-case, status hors
  énumération, module inconnu, date mal formée)
- **Then** le champ est signalé en erreur avec un message explicite et l'export est
  bloqué tant que le front-matter n'est pas valide

### AC6 — Export en fichier markdown conforme au template

- **Given** une story complète et valide dans l'éditeur
- **When** l'utilisateur déclenche l'action *Exporter*
- **Then** un fichier `.md` est produit avec le front-matter YAML et les sections
  dans l'ordre exact du template ; le contenu markdown est identique à celui visible
  en vue markdown brute

## Open Questions

- [ ] Quelle bibliothèque d'éditeur riche retenir — TipTap, Lexical, ProseMirror —
      critère clé : fidélité de la conversion markdown ↔ rich text ?
- [ ] Où persiste-t-on les brouillons en cours : LocalStorage, fichier temporaire
      côté FS, ou backend dédié ?
- [ ] Comment attribue-t-on l'`id` — compteur automatique, saisie manuelle, suggestion
      à partir du module sélectionné ?
- [ ] Faut-il une étape *Vérifier la story* qui demande au LLM de détecter les
      incohérences entre Scope In/Out et les AC avant export ?
- [ ] La story est étendue (6 AC, scope riche) — envisager une décomposition SPIDR
      en UI-014a (éditeur guidé + export) / UI-014b (bascule WYSIWYG) /
      UI-014c (assistance générative) si l'estimation dépasse 2 sprints.

## Notes

- Le template cible est `.yukki/templates/story.md` (versionné dans le repo).
- À articuler avec `/yukki-analysis` qui consomme les stories produites.
- Backend LLM : `ClaudeProvider` existant via `internal/provider` ; le pattern
  `OnChunk` (CORE-006) est directement réutilisable pour streamer les suggestions.
- Penser export multi-stories dans une story ultérieure (hors scope ici).
