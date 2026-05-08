---
id: OPS-002
slug: release-pipeline-github
title: Pipeline de release CI + binaires sur GitHub Releases
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - .github/workflows
  - cmd/yukki
  - scripts/dev
  - docs
---

# Pipeline de release CI + binaires sur GitHub Releases

## Background

La CI actuelle ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml))
fait tourner static checks + unit / integration / e2e / ui build sur
les 3 OS pour chaque PR vers `main` — c'est solide pour la qualité.
Mais aucun pipeline de release : pousser un tag `v0.x.y` ne produit
rien, et un utilisateur externe doit cloner et builder localement
pour obtenir un binaire. Friction qui bloque l'adoption open-source.
On veut auditer la CI existante pour s'assurer qu'elle reste utile
+ ajouter un workflow de release qui produit des binaires
multi-OS attachés à une GitHub Release sur tag.

## Business Value

Adoption : un nouvel utilisateur télécharge yukki depuis GitHub
Releases en un clic, sans Go ni Node ni wails CLI. Reproductibilité :
chaque tag versionne un binaire signé (à terme) avec son commit
SHA. Standard OSS attendu pour publier publiquement le repo.

## Scope In

- **Audit de la CI existante** : passer en revue
  `.github/workflows/ci.yml`, identifier les étapes redondantes,
  les jobs lents, les versions Go / Node figées qui mériteraient
  une mise à jour. Déposer un mini-rapport en commentaire de PR
  ou en `notes/` sur ce qui change.
- **Workflow de release** déclenché par un tag git de la forme
  `v[0-9]+.[0-9]+.[0-9]+` poussé sur `main`. Étapes :
  1. Run de la suite tests (réutiliser les jobs CI existants pour
     éviter la duplication).
  2. Build du binaire `yukki` pour 3 plateformes :
     `windows/amd64`, `darwin/universal` (Intel + ARM),
     `linux/amd64`.
  3. Injection de la version (`v0.x.y`), du commit SHA, et de la
     date de build via `-ldflags` côté Go.
  4. Calcul des checksums SHA-256 pour chaque binaire.
  5. Création d'une **GitHub Release** sur le tag avec les
     binaires + checksums attachés et des release notes
     auto-générées depuis les commits depuis le précédent tag
     (conventional commits, déjà respectés).
- **Commande `yukki --version`** qui affiche la version, le commit
  et la date de build (la valeur par défaut en build local sans
  ldflags reste `dev` ou `unknown`).
- **README.md racine** mis à jour avec une section « Install »
  pointant vers GitHub Releases pour chaque OS.

## Scope Out

- **Code signing** : signature EV Authenticode Windows, notarization
  macOS, signature GPG des binaires Linux. Hors scope car coûts
  / process variables — à suivre dans `OPS-002b` ou via un
  follow-up.
- **Auto-update mechanism** (Wails update, Sparkle-like) — suivi
  par OPS-003.
- **Distribution sur package managers** (Homebrew, Chocolatey,
  Snap, AUR) — follow-up dédié.
- **Distribution sur app stores** (Microsoft Store, Mac App Store).
- **Pre-release / nightly builds** quotidiens : on se cale sur
  les tags explicites pour la v1, pas de canal continu.
- **Pipeline pour le CLI seul** : `yukki story` (sans UI) reste
  inclus dans le binaire `yukki`. Pas de binaire séparé.

## Acceptance Criteria

### AC1 — Tag pousse une release publiable

- **Given** la branche `main` est verte et un développeur pousse
  un tag `v0.4.0`
- **When** le workflow de release s'exécute jusqu'au bout
- **Then** une GitHub Release `v0.4.0` apparaît sur
  `https://github.com/yukki-project/yukki/releases` avec les 3
  binaires (`yukki-v0.4.0-windows-amd64.exe`,
  `yukki-v0.4.0-darwin-universal`, `yukki-v0.4.0-linux-amd64`)
  et leurs `*.sha256` attachés en assets

### AC2 — Version visible dans le binaire

- **Given** un utilisateur télécharge le binaire `yukki-v0.4.0-*`
  depuis GitHub Releases
- **When** il lance `yukki --version`
- **Then** la sortie contient au minimum la version (`v0.4.0`),
  le commit SHA tronqué, et la date de build — pas `dev` ni
  `unknown`

### AC3 — Échec d'une étape bloque la release

- **Given** un tag est poussé et le workflow de release démarre
- **When** une étape (test, build, ou upload) échoue sur l'une
  des 3 plateformes
- **Then** la GitHub Release **n'est pas créée** (ou est créée en
  draft avec une mention claire), aucun binaire incomplet n'est
  publié, et l'auteur du tag reçoit la notification GitHub
  d'échec

### AC4 — Tag invalide ignoré

- **Given** un tag de forme non standard est poussé (par exemple
  `wip-test`, `release-candidate-1`, ou un tag sur une branche
  autre que `main`)
- **When** GitHub évalue le déclencheur du workflow
- **Then** le workflow de release ne se déclenche pas (le tag est
  silencieusement ignoré par le filtre du workflow)

### AC5 — Pas de duplication CI / release

- **Given** la story est livrée
- **When** un développeur regarde les fichiers
  `.github/workflows/*.yml`
- **Then** le pipeline de release **réutilise** les jobs de tests
  de la CI (par exemple via `workflow_call`) et n'embarque pas
  une copie indépendante des étapes test, ce qui éviterait la
  dérive future

## Open Questions

- [ ] **Schéma de versioning** : SemVer strict (`v0.4.0`,
      `v1.0.0-beta.1`) ou CalVer (`2026.05.0`) ? SemVer est le
      standard pour un outil dev — à confirmer.
- [ ] **Trigger de release** : tag manuel poussé par un
      maintainer, ou release créée depuis l'UI GitHub déclenche
      le workflow ? Les deux mécanismes sont possibles.
- [ ] **macOS Universal vs Intel / ARM séparés** : une seule
      binaire universelle (lipo) ou deux binaires distincts ?
      Universal est plus simple côté utilisateur mais double la
      taille.
- [ ] **Linux : amd64 seul ou aussi arm64** (Raspberry Pi,
      Apple Silicon Asahi) ? Sans demande, amd64 suffit pour la
      v1.
- [ ] Les **release notes auto-générées** : groupées par type
      de commit (`feat:`, `fix:`, `chore:`) ou listées
      brutes ? À trancher.
- [ ] La **commande `--version`** existe-t-elle déjà dans le CLI
      Cobra ? Si oui, vérifier le format ; sinon l'ajouter dans
      cette story.

## Notes

- CI existante :
  [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
  (déclencheur push/PR vers `main`, 13 jobs verts sur la dernière
  PR mergée — cf. PR #25 / PR #26).
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : pas de dépendance amont. Peut être livrée
    avant DOC-002 (publication OSS) puisqu'elle prépare les
    binaires que DOC-002 référencera.
  - **Negotiable** : le code signing est explicitement reporté.
  - **Valuable** : oui — débloque l'adoption externe.
  - **Estimable** : ~1-2 j pour le pipeline non signé.
  - **Small** : borderline — multi-OS + audit CI + injection
    version. Voir SPIDR : scission possible.
  - **Testable** : oui — pousser un tag de test sur une branche
    et vérifier la release draft.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** mais non figée — à arbitrer en analyse.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | Audit CI et workflow de release sont 2 paths quasi-indépendants ; livrables séparables si l'analyse révèle > 7 AC ou > 2 j d'effort. |
  | Interfaces | non | Une seule "interface" (la GitHub Release) — pas de variante UI. |
  | Data | non | Les artefacts (binaires + checksums) sont une seule donnée. |
  | Rules | non | AC3 (échec) et AC4 (tag invalide) sont les deux cas limites, tiennent en 2 AC. |
  | Spike | **possible** | Si la signature de code Windows / macOS est priorisée (hors scope ici), prévoir un spike — pour l'instant non. |
