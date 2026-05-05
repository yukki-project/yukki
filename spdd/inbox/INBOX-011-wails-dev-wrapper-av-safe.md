---
id: INBOX-011
slug: wails-dev-wrapper-av-safe
title: Wrapper `ui-dev.{sh,bat}` AV-safe + appargs ui par défaut
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Wrapper `ui-dev.{sh,bat}` AV-safe + `-appargs ui` par défaut

## Idée

Le repo a déjà `scripts/dev/ui-build.{sh,bat}` (wrapper AV-safe pour
`wails build`) mais **pas d'équivalent pour `wails dev`**. Du coup,
chaque démarrage de l'app demande de retaper :

```
export GOCACHE=$PWD/.gocache GOTMPDIR=$PWD/.gotmp \
       TMP=$PWD/.gotmp TEMP=$PWD/.gotmp
wails dev -tags mock -skipbindings -appargs "ui"
```

… avec deux pièges récurrents observés :
1. Sans `TMP/TEMP` redirigés, Defender bloque la phase
   *Generating bindings* (cf. `DEVELOPMENT.md`).
2. Sans `-appargs "ui"`, le binaire compile mais Cobra affiche juste
   son aide root et exit (pas de fenêtre WebView2 ouverte).

Ajouter `scripts/dev/ui-dev.{sh,bat}` qui :
- Redirige `GOCACHE`, `GOTMPDIR`, `TMP`, `TEMP` vers `<repo>/.gocache`
  et `<repo>/.gotmp`
- Ajoute `-tags mock -skipbindings` par défaut (mock provider, pas de
  régen bindings)
- Ajoute `-appargs "ui"` automatiquement
- Forwarder les flags utilisateur via `--`
- Documenter dans `DEVELOPMENT.md` à côté de la section sur
  `ui-build.{sh,bat}`

## Notes

- Cohérent avec le pattern existant — le wrapper `ui-build.sh` est
  une bonne référence à recopier pour la structure (BASH_SOURCE[0],
  detection plateforme, mkdir cache/tmpdir).
- Bénéfice immédiat : démarrer yukki en local devient
  `scripts/dev/ui-dev.sh` (1 commande, 0 piège). Bénéfice secondaire :
  un nouveau contributeur n'a pas à comprendre les contournements
  Defender pour démarrer.
- À traiter en Story atomique (DOC- ? CORE- ?) — pas un Epic.
- Quand le TICKET IT (exclusion Defender pour le repo, déjà mentionné
  dans `TODO.md`) sera en place, retirer `-skipbindings` du wrapper
  pour laisser Wails régénérer les bindings.
