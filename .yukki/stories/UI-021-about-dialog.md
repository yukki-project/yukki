---
id: UI-021
slug: about-dialog
title: Dialog "À propos" (version, GitHub, license, crédits)
status: reviewed
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
  - cmd/yukki
---

# Dialog "À propos" (version, GitHub, license, crédits)

## Background

Standard d'une app desktop : un dialog « À propos » qui affiche la
version du binaire, l'identité du projet, un lien vers le repo
GitHub, la licence, et éventuellement les crédits / dépendances.
Aujourd'hui yukki n'a pas ce panneau — l'utilisateur ne peut pas
savoir quelle version il utilise (utile pour signaler un bug),
trouver le repo, ou consulter la licence depuis l'app.

## Business Value

Réduit la friction de support : un signalement de bug peut
maintenant inclure « yukki v0.4.2 sur Windows ». Ouvre un
chemin clair vers le repo GitHub (issues, contribution).
Affiche la licence pour clarifier les usages. Petit standard
de qualité d'app — les utilisateurs s'y attendent.

## Scope In

- Dialog modal accessible depuis le **menu Help** (à créer ou
  enrichir) ou via un raccourci (par exemple `?` ou `F1`).
- Contenu :
  - **Logo / nom** yukki
  - **Version** : numéro de version du binaire (injection à
    **ajouter** dans cette story : `var version string` dans
    `main.go`, alimenté via `-X main.version=v0.x.y` dans le script
    de build et le workflow de release OPS-002 — vérifié au
    2026-05-08, aucune injection en place actuellement).
  - **Build info** : commit SHA, date de build, à injecter au même
    endroit (`-X main.commitSHA=... -X main.buildDate=...`).
  - **Lien GitHub** : `https://github.com/yukki-project/yukki`
    cliquable, ouvre le navigateur OS par défaut.
  - **Licence** : nom (par exemple Apache-2.0) + bouton « Voir le
    texte complet » qui ouvre le `LICENSE` dans un viewer ou
    dans le navigateur via le repo GitHub.
  - **Crédits / dépendances clés** : Wails v2, React, Tiptap,
    @react-pdf/renderer (cohérent avec un OSS attribution).
  - **Bouton « Copier les infos »** qui copie version + commit +
    OS dans le presse-papier (utile pour un bug report).

## Scope Out

- Update checker / vérification d'une nouvelle version (couvert
  par OPS-003 auto-update plus tard).
- Pop-up de news / changelog au démarrage.
- Easter eggs.
- Liste exhaustive des dépendances avec leurs versions exactes
  (un futur « About → Dependencies » pourra le faire).
- Téléchargement du fichier LICENSE depuis l'app (l'utilisateur
  consulte sur GitHub via le lien).

## Acceptance Criteria

### AC1 — Ouverture depuis le menu Help

- **Given** l'app yukki est ouverte
- **When** l'utilisateur clique sur Help → À propos (ou utilise
  le raccourci dédié)
- **Then** un dialog modal s'affiche avec le logo, le nom, la
  version, le SHA de commit, la date de build, le lien GitHub
  et le nom de la licence

### AC2 — Lien GitHub ouvre le navigateur OS

- **Given** le dialog À propos est ouvert
- **When** l'utilisateur clique sur le lien
  `https://github.com/yukki-project/yukki`
- **Then** le navigateur OS par défaut s'ouvre sur cette URL —
  pas dans une iframe interne, pas de panneau in-app

### AC3 — Bouton « Copier les infos »

- **Given** le dialog À propos est ouvert et affiche
  `version 0.4.2`, `commit abc1234`, `Windows 11`
- **When** l'utilisateur clique sur « Copier »
- **Then** le presse-papier OS contient une chaîne formatée
  contenant ces 3 infos (et l'utilisateur le voit confirmé via
  un toast)

### AC4 — Version « unknown » en mode dev

- **Given** le binaire est compilé sans ldflags (cas dev local
  avec `wails dev`)
- **When** l'utilisateur ouvre le dialog À propos
- **Then** la version affiche `dev` ou `unknown` (au lieu de
  planter ou d'afficher une chaîne vide)

### AC5 — Fermeture

- **Given** le dialog À propos est ouvert
- **When** l'utilisateur clique en dehors du dialog ou appuie
  sur Échap
- **Then** le dialog se ferme et l'app reprend l'état précédent
  (mode actif, sélection)

## Open Questions

- [x] ~~Où placer l'entrée d'accès ?~~ → **résolu 2026-05-08** :
      nouveau menu **Help** dans le TitleBar, à côté du menu File.
      Standard d'app desktop, découvrable, pas de couplage avec
      UI-020 (Settings).
- [x] ~~La version du binaire est-elle déjà injectée via ldflags
      dans `main.go` ?~~ → **résolu 2026-05-08** : non, aucune
      injection en place. La story doit l'ajouter (var Go +
      `-X main.version` dans le script de build ; alignement
      avec OPS-002 quand il livrera le workflow de release).
- [x] ~~Source du commit SHA et de la date de build ?~~ →
      **résolu 2026-05-08** : ldflags
      `-X main.commitSHA=$(git rev-parse --short HEAD)
      -X main.buildDate=$(date -u +%FT%TZ)` dans
      `scripts/dev/ui-build.sh` et le workflow CI/release
      OPS-002. Un seul mécanisme, standard Go, pas de fichier
      intermédiaire.
- [x] ~~Liste des crédits / dépendances : statique vs dynamique ?~~
      → **résolu 2026-05-08** : **mixte** — liste statique des
      briques majeures (Wails v2, React 18, Tiptap, @react-pdf/
      renderer, Vite, Tailwind, Zustand) directement dans le
      composant + lien « Voir toutes les dépendances » qui pointe
      vers les fichiers `package.json` et `go.mod` du repo
      GitHub. Concis dans l'app, exhaustif via GitHub.

## Notes

- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont (la version peut
    être hardcodée si l'injection ldflags n'existe pas encore).
  - **Negotiable** : emplacement du déclencheur ouvert.
  - **Valuable** : oui — standard d'app desktop + utile au
    support.
  - **Estimable** : ~½ j.
  - **Small** : oui, périmètre serré.
  - **Testable** : oui — assertion sur le contenu du dialog
    (mock des constantes de version).
- Décision SPIDR : pas de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Un seul flow d'ouverture / fermeture. |
  | Interfaces | non | Un seul dialog. |
  | Data | non | Constantes de version statiques. |
  | Rules | non | AC4 (mode dev) est le seul cas limite. |
  | Spike | non | Tout est standard. |
