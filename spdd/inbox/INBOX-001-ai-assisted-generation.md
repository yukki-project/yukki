---
id: INBOX-001
slug: ai-assisted-generation
title: Aide à la génération assistée IA des artefacts SPDD
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Aide à la génération assistée IA des artefacts SPDD

## Idée

yukki dispose déjà de `/spdd-generate` (canvas → code). Étendre l'aide
IA à toutes les phases de la chaîne discovery → delivery :

- **Inbox** : à partir d'un brain dump (paragraphe libre, dump Slack,
  retour user), proposer N items Inbox structurés.
- **Promotion Inbox → Story / Epic** : analyser un Inbox et proposer
  s'il est atomique (→ Story) ou s'il devrait devenir un Epic
  décomposé en N sous-stories.
- **Découpage Epic → Stories** : à partir d'un Epic, proposer un
  découpage INVEST en stories enfants conformes à SPIDR.
- **Pré-remplissage Analysis** : scanner le codebase et proposer une
  analyse pré-remplie (concepts existants + risques BVA + cas limites)
  à partir d'une story validée.

Le but est de retirer le poids de la rédaction structurée pour ne
laisser que la **revue humaine** comme valeur ajoutée.

## Notes

- À distinguer de `/spdd-generate` qui projette un canvas en code —
  ici on parle de **générer les artefacts d'amont** (Inbox / promotion
  / découpage).
- Risque méthodologique : laisser l'IA pré-remplir trop tôt peut
  biaiser la revue humaine ("ancrage"). Maintenir explicitement le
  status `draft` post-génération IA pour forcer une relecture.
- Pourrait justifier un nouveau cluster de skills `/yukki-suggest-*`
  ou un mode "assist" sur les skills existants.
