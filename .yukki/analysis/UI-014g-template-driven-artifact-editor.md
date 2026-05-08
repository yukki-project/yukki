---
id: UI-014g
slug: template-driven-artifact-editor
story: .yukki/stories/UI-014g-template-driven-artifact-editor.md
status: draft
created: 2026-05-07
updated: 2026-05-07
---

# Analyse — Mode édition structuré dans StoryViewer piloté par template

> Contexte stratégique pour la story `UI-014g-template-driven-artifact-editor`.
> Produit par `/yukki-analysis` à partir d'un scan ciblé du codebase.

## Mots-clés métier extraits

`StoryViewer`, `SpddAcEditor`, `AutoTextarea`, `parser`, `serializer`,
`sections`, `frontmatter`, `template`, `Given/When/Then`, `roundtrip`,
`inbox`, `WriteArtifact`, `ReadArtifact`, `splitIntoSections`, `SectionSpec`

## Concepts de domaine

### Existants (déjà dans le code)

- **`StoryViewer`** (`frontend/src/components/hub/StoryViewer.tsx`) — affiche
  un artefact en lecture (markdown rendu) et bascule en mode édition via
  textarea brut sur `body` uniquement. Dispose déjà de `splitFrontmatter`,
  `splitIntoSections`, `ReadArtifact`, `WriteArtifact`, `buildFullContent`.
  C'est le point d'entrée à modifier.

- **`SpddAcEditor`** (`frontend/src/components/spdd/SpddAcEditor.tsx`) —
  composant de rendu des cartes Given/When/Then. **Couplage fort** : lit et
  écrit directement dans `useSpddEditorStore` (`updateAc`, `removeAc`,
  `duplicateAc`). Ne peut pas être réutilisé sans découplag.

- **`parser.ts` / `serializer.ts`** (`frontend/src/components/spdd/`) — paire
  round-trip story-spécifique. Sections hard-codées (`bg`, `bv`, `si`, `so`,
  `ac`, `oq`, `no`), frontmatter story-spécifique. Non réutilisables tels
  quels pour inbox/epic.

- **`sections.ts`** — définition statique des sections story (clés + labels
  + `required`). Pas de concept de "widget type" (textarea vs ac-cards).

- **`types.ts`** — `StoryDraft` est un type story-spécifique structuré. Pas
  de type générique d'artefact éditable.

- **`roundtrip.test.ts`** — suite de tests garantissant la bidirectionnalité
  `draft → md → draft` pour le type story. Infrastructure de test à étendre.

- **Templates `.yukki/templates/`** — 6 fichiers markdown définissant la
  structure de chaque type. `inbox.md` : 2 sections (Idée, Notes), aucun
  G/W/T. `story.md` : 7 sections dont AC avec G/W/T. `epic.md` : section
  "Acceptance Criteria (haut niveau)" avec bullet-list, **pas** de G/W/T —
  la heuristique ne se déclenchera pas, ce qui est correct.

### Nouveaux (à introduire)

- **`SectionSpec`** (value object) — description d'une section dérivée du
  template : `{ heading: string; widget: 'textarea' | 'ac-cards' }`. Produit
  par le template parser, consommé par `TemplatedEditor`.

- **`TemplateParser`** (fonction pure) — lit le markdown d'un template
  (chaîne) et produit `SectionSpec[]` + `FrontmatterSpec[]`. Heuristique
  G/W/T : si le corps d'une section contient `- **Given**`, widget =
  `'ac-cards'`.

- **`FrontmatterSpec`** (value object) — description d'un champ frontmatter :
  `{ key: string; widget: 'text' | 'date' | 'select' | 'tags'; options?: string[] }`.
  Dérivé depuis la valeur template via heuristiques (voir Notes).

- **`TemplatedEditor`** (composant React) — remplace le textarea brut dans
  `StoryViewer`. Prend `content: string`, `sections: SectionSpec[]`,
  `fmSpec: FrontmatterSpec[]` et émet `onChange(newContent: string)`.
  État local (pas de store global).

- **`GenericAcEditor`** (composant React, dérivé de `SpddAcEditor`) —
  variante découplée du store Zustand. Reçoit `acs: Ac[]` et
  `onChange(acs: Ac[]) => void` en props.

- **`genericSerializer`** (fonction pure) — reconstruit un `.md` complet
  depuis frontmatter édité + sections ordonnées selon le template. Garantit
  le round-trip pour tous les types.

## Approche stratégique

Pour résoudre le manque d'éditeur structuré dans `StoryViewer` pour les types
inbox et story (et best-effort epic), on introduit un **template parser
générique côté frontend** qui dérive les specs de l'écran depuis le contenu
des templates `.yukki/templates/<type>.md` — plutôt que (a) un éditeur codé
en dur par type ou (b) une API Go dédiée au rendu d'UI — pour atteindre
l'extensibilité sans code front additionnel, en acceptant que le template
devienne une spec d'UI (convention à documenter) et que les templates
analysis/canvas-reasons restent hors périmètre cette itération.

**Alternatives écartées :**

- *Éditeur dédié par type (a)* — c'est l'existant (story seule via
  `SpddEditor`). Coût O(n) en code front pour chaque nouveau type. Rejeté.
- *API Go `RenderTemplateSpec`* — déporter le parsing template côté Go via
  Wails. Ajoute un aller-retour Wails au moment du clic Edit, complexifie
  le typage côté front. Rejeté au profit d'un parsing JS pur (les templates
  sont de simples fichiers markdown, pas de logique serveur nécessaire).
- *Charger les templates depuis Go au démarrage* — les templates pourraient
  être lus via `ReadArtifact`. Conservé comme fallback si le bundling pose
  problème, mais l'option préférée est de les **bundler** dans le frontend
  via `import.meta.glob` (Vite) pour éviter un appel Wails bloquant.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `frontend/src/components/hub/StoryViewer.tsx` | fort | modification (remplace textarea edit par `TemplatedEditor`) |
| `frontend/src/components/spdd/SpddAcEditor.tsx` | moyen | modification (découplage store → props `onChange`) |
| `frontend/src/components/spdd/types.ts` | faible | ajout types `SectionSpec`, `FrontmatterSpec`, `GenericAc` |
| `frontend/src/lib/templateParser.ts` | fort | création |
| `frontend/src/lib/genericSerializer.ts` | fort | création |
| `frontend/src/components/hub/TemplatedEditor.tsx` | fort | création |
| `frontend/src/components/hub/GenericAcEditor.tsx` | fort | création |
| `.yukki/templates/` | faible | lecture seule (aucune modification des fichiers template) |

## Dépendances et intégrations

- **`import.meta.glob`** (Vite) — mécanisme recommandé pour bundler les
  templates `.yukki/templates/*.md` dans le frontend. Alternatif : appel
  `ReadArtifact` via Wails au clic Edit (latence négligeable, mais ajoute
  une dépendance Wails dans le parsing d'UI).
- **`WriteArtifact` / `ReadArtifact`** (Wails) — déjà utilisés par
  `StoryViewer`. Pas de nouvelle API Go nécessaire.
- **`useSpddEditorStore`** (Zustand) — à ne **pas** introduire dans
  `TemplatedEditor` ; état local React uniquement pour l'éditeur générique.
- **`roundtrip.test.ts`** — à étendre avec des cas inbox et epic pour la
  paire `genericSerializer` / `templateParser`.

## Risques et points d'attention

- **Découplage `SpddAcEditor`** — *Impact : moyen, Probabilité : certaine.*
  Le composant appelle `useSpddEditorStore` directement dans les sous-
  composants `GwtRow` et `AcCard`. Le découplage nécessite d'ajouter des
  callbacks `onChange` à chaque niveau ou de créer `GenericAcEditor` comme
  copie allégée. Mitigation : créer `GenericAcEditor` séparé plutôt que
  modifier `SpddAcEditor` (évite de régresser `SpddEditor`).

- **Round-trip générique** — *Impact : élevé, Probabilité : moyenne.*
  La sérialisation G/W/T doit produire exactement `- **Given** …` / `- **When** …` /
  `- **Then** …`. Si le format diverge du fichier original (casse, espaces,
  numérotation `### AC1 — titre`), le fichier sera corrompu à la sauvegarde.
  Mitigation : tests round-trip dédiés dès l'écriture de `genericSerializer`.

- **Template bundlé vs lu depuis Go** — *Impact : moyen, Probabilité : faible.*
  Vite `import.meta.glob` fonctionne pour des chemins relatifs au `frontend/`.
  Les templates sont dans `.yukki/templates/` (racine projet, hors `frontend/`).
  Wails ne sert pas les fichiers hors du dossier `frontend/`. Mitigation :
  copier les templates dans `frontend/public/templates/` ou utiliser
  `ReadArtifact` au clic Edit (recommandé — évite la duplication).

- **Heuristique G/W/T fragile** — *Impact : faible, Probabilité : faible.*
  Si un template contient `- **Given**` dans un exemple illustratif (pas une
  vraie section AC), l'heuristique déclenche le composant AC à tort.
  Mitigation : l'heuristique vérifie la présence conjointe de `**Given**`,
  `**When**` ET `**Then**` dans la même section (les trois ensemble).

- **Compatibilité `SpddEditor` story** — *Impact : moyen, Probabilité : faible.*
  Le `SpddEditor` dédié aux stories (UI-014) coexiste avec le `TemplatedEditor`
  générique. Pour les stories, quel éditeur prend la main ? Risque de double
  voie. Mitigation : `TemplatedEditor` s'active uniquement dans `StoryViewer`
  (panel viewer) ; `SpddEditor` reste dans le mode `editor` (activé depuis
  `ShellMode = 'editor'`). Les deux ne se croisent pas.

## Cas limites identifiés

- **Template non trouvé** (type inconnu) → fallback textarea brut avec notice.
- **Template vide ou sans section `##`** → fallback textarea brut.
- **Section AC sans aucun AC existant dans le fichier** → `GenericAcEditor`
  s'affiche vide avec le bouton "+ Ajouter un AC" (état initial valide).
- **Fichier `.md` sans frontmatter** (ex. fichier brut) → frontmatter vide,
  éditeur affiche uniquement les sections body.
- **Champ frontmatter absent du fichier mais présent dans le template** → input
  vide pré-rempli avec la valeur placeholder du template (ex. `<YYYY-MM-DD>`).
- **Section dans le fichier mais absente du template** → section orpheline
  conservée en bas de l'éditeur, non perdue à la sauvegarde (ordre template
  en premier, orphelines en fin).
- **Sauvegarde avec connexion Wails perdue** → erreur toast, contenu édité
  conservé dans l'état local (`dirtyContent`).

## Décisions à prendre avant le canvas

- [x] **Chargement des templates** : `ReadArtifact` via Wails au clic Edit.
  Évite de dupliquer les templates hors `frontend/`. Appel async négligeable.
- [x] **Découplage `SpddAcEditor`** : créer `GenericAcEditor` comme composant
  séparé. Protège `SpddEditor` (UI-014) sans risque de régression.
- [x] **Heuristique triple** : détecter `**Given**` + `**When**` + `**Then**`
  tous trois présents dans une même section → widget `ac-cards`. Pas de faux
  positif sur les 6 templates actuels (epic.md a des bullet-lists sans G/W/T).
- [x] **Numérotation AC séquentielle** : re-numéroter `AC1..n` à la
  sauvegarde. Cohérent avec `parser.ts`, `serializer.ts` et `roundtrip.test.ts`.
