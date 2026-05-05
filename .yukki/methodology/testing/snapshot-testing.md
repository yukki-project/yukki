---
id: TEST-snapshot
title: Snapshot testing — caractérisation et golden output
version: 1
status: published
category: testing
applies-to: [yukki-reasons-canvas, yukki-generate]
lang: fr
created: 2026-05-03
updated: 2026-05-03
sources:
  - "Llewellyn Falco — *Approval Tests* documentation, https://approvaltests.com"
  - "Kent C. Dodds (2018) — 'Effective Snapshot Testing', https://kentcdodds.com/blog/effective-snapshot-testing"
  - "Jest documentation — *Snapshot Testing*, https://jestjs.io/docs/snapshot-testing"
---

# Snapshot testing — caractérisation et golden output

## Définition

Le **snapshot testing** capture la sortie sérialisée d'un
sujet (HTML rendu, JSON, code généré, payload entier) au
premier run, l'enregistre dans un fichier "snapshot", puis
compare les exécutions futures à ce snapshot. Si la sortie
change, le test échoue et un humain doit décider :
**régression** (rejeter le diff) ou **changement intentionnel**
(régénérer le snapshot).

Né dans la communauté Jest (~2017), généralisé via
**Approval Tests** (Llewellyn Falco) qui en a fait un pattern
formel pour la **caractérisation** de code legacy.

> Pas un pattern à appliquer partout. C'est un **outil
> spécialisé** pour 2 contextes : caractériser du legacy non
> testé, ou figer une output stable dont la spec textuelle
> serait fastidieuse à écrire.

## Decision tree — quand utiliser

✅ **À utiliser quand** :
- **Caractérisation de code legacy** non testé : on capture le
  comportement actuel, on l'utilise comme filet pendant le
  refactor (Working Effectively with Legacy Code, Feathers)
- **Sérialisation stable** : un encodeur JSON canonique, un
  formatter, du code généré dont la sortie est déterministe
  et longue
- **Documentation par exemple** : le snapshot devient une
  référence de "voici à quoi ressemble la sortie" lisible
  par un humain
- **UI à structure stable** : un composant dont le markup ne
  change quasiment jamais (footer, navigation rigide)

❌ **À éviter quand** :
- **UI dynamique** : timestamps, IDs auto-générés, données
  utilisateur variables → snapshot diff sur chaque run
- **Tests métier** : le snapshot capture une sortie, pas le
  contrat. Un changement légitime du code casse le test sans
  signaler ce qui compte
- **Grands payloads opaques** : un snapshot de 5000 lignes
  qu'aucun reviewer ne lit = no-op
- **Quand un test focalisé suffit** : `expect(user.name).toBe
  ('Alice')` est plus précis qu'un snapshot du user complet

## Anti-patterns critiques

### "Regenerate sans review"

Pattern destructeur le plus courant : un dev voit que le
snapshot test échoue, lance `--update-snapshots` /
`--write-snapshots` sans regarder le diff, le commit passe.
**Le test devient un no-op** — il valide ce que le code
produit aujourd'hui, sans contrat.

Mitigation :
- **Snapshot review obligatoire** en code review : reviewer
  doit examiner le diff des fichiers `.snap` / `.approved.txt`
- **Pas de `--update-snapshots` en CI** : seulement en local,
  jamais auto-applied
- **Coverage drift gate** sur les fichiers de snapshots
  (mention explicite : "tu as modifié 8 snapshots, justifier
  dans la description PR")

### Snapshot opaque

Un snapshot de 1000+ lignes qui mélange data, structure et
formatage. Personne ne le lit, donc personne ne valide.
Mitigation : **scinder** par responsabilité (1 snapshot pour
le rendu HTML, 1 pour la data JSON, etc.).

### Snapshot avec timestamps / IDs

```
{ "id": "550e8400-e29b-41d4-a716-446655440000", "createdAt":
"2026-05-03T14:32:11.123Z" }
```

Le snapshot diffère à chaque run. Mitigation : **scrubbing**
(remplacer les valeurs volatiles par des placeholders avant
sérialisation), via les outils ad-hoc (`Verify` en .NET,
custom serializers en Jest).

### Snapshot inline vs file

- **Inline** (`toMatchInlineSnapshot()`) : le snapshot vit
  dans le test lui-même. Lisible, mais le test devient long
  et le snapshot risque d'être édité à la main par erreur.
- **File** (`toMatchSnapshot()`) : snapshot dans un fichier
  séparé. Plus propre pour les gros payloads, mais le
  reviewer doit ouvrir 2 fichiers.

Choix : inline si snapshot < 10 lignes, file sinon.

## Alternative : golden files

Pattern apparenté, plus explicite : on stocke des fichiers
"golden" (entrée + sortie attendue) dans `testdata/` (Go
convention), le test compare la sortie courante au golden.

Avantages :
- Plus explicite (le golden est un asset versionné)
- Pas de magic du runner
- Reviewable indépendamment

Inconvénients :
- Plus de boilerplate manuel
- Pas de regenerate automatique (à la main)

Idiomatique en Go (cf. `testdata/`), moins en JS où Jest
snapshots dominent.

## Snapshot review en code review

Checklist quand un PR modifie des fichiers de snapshots :

- [ ] Le diff snapshot est-il intentionnel (vs régression
      visible) ?
- [ ] Le diff snapshot reflète-t-il le changement annoncé
      dans la description PR ?
- [ ] Les snapshots impactés sont-ils encore lisibles
      (pas explosés en taille) ?
- [ ] Aucune valeur volatile (timestamp, ID auto, hash) ne
      s'est glissée ?
- [ ] Si le diff est massif (> 100 lignes), la PR justifie-t-
      elle pourquoi ?

## Heuristiques pour SPDD

- `/yukki-generate` ne devrait **pas** générer de snapshot
  tests par défaut. Si une Operation produit du code à sortie
  textuelle stable (templates, codegen), un snapshot peut
  être pertinent — mais doit être annoncé explicitement
  dans la section Tests de l'Operation.
- Pour la caractérisation d'un module legacy avant refactor :
  `/yukki-prompt-update` peut signaler "ajouter un snapshot
  de l'output actuel comme filet de sécurité avant
  modification".
- Composants frontend rendus (yukki UI) : utiliser sparingly,
  un test focalisé `expect(getByText('yukki')).toBeInTheDocument()`
  est presque toujours préférable.

## Voir aussi

- [`testing-frontend.md`](testing-frontend.md) — pyramide adaptée frontend
- [`coverage-discipline.md`](coverage-discipline.md) — anti-pattern "regenerate sans review"
- [`test-smells.md`](test-smells.md) — Sensitive Equality (smell apparenté)

## Sources

- Llewellyn Falco — *Approval Tests* documentation, [approvaltests.com](https://approvaltests.com). Pattern formel.
- Kent C. Dodds (2018) — *Effective Snapshot Testing*, [kentcdodds.com](https://kentcdodds.com/blog/effective-snapshot-testing). Critique constructive.
- Jest documentation — *Snapshot Testing*, [jestjs.io](https://jestjs.io/docs/snapshot-testing). Référence d'usage moderne.

## Changelog

- 2026-05-03 — v1 — création initiale
