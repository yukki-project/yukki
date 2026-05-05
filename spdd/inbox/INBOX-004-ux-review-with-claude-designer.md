---
id: INBOX-004
slug: ux-review-with-claude-designer
title: Revue UX de yukki avec Claude Designer (Inbox / Epics / Roadmap)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Revue UX de yukki avec Claude Designer (Inbox / Epics / Roadmap)

## Idée

Faire passer l'UX actuelle de yukki au crible d'une session **Claude
Designer** (ou équivalent), avec un focus particulier sur les 3
nouveaux artefacts introduits par META-005 (Inbox, Epic, Roadmap)
qui n'ont pas encore d'UX dédiée. La revue couvre :

- **Inbox** : capture rapide, friction minimale (raccourci clavier,
  formulaire 1-champ ?), tri par status, vue inbox-zero
- **Epic** : visualisation parent-child (tree, list, network ?),
  badge de progression des stories enfants, transitions de status
- **Roadmap** : layout kanban (Now/Next/Later) vs timeline trimestrielle
  vs swim-lanes par squad, drag-drop entre colonnes
- **Cohérence transverse** : navigation entre les 4 niveaux (Inbox →
  Story / Epic → Roadmap), breadcrumbs, retours en arrière
- **Sidebar étendue à 8 modes** : trop chargée ? regrouper en
  catégories (discovery / engagement / vue) ?

Livrables attendus de la session :
- Wireframes / sketches des 3 vues (Inbox, Epic, Roadmap)
- Liste des micro-interactions clés (capture, promotion, drag-drop)
- Recommandations sur la hiérarchie d'information

## Notes

- À faire **avant** de générer les stories enfants `INBOX-001/002`,
  `EPIC-001`, `ROADMAP-001/002` — sinon on code sans cap UX, on
  refait après.
- Préparer en amont : screenshot de l'état actuel de la sidebar +
  exemples concrets de Inbox / Epic / Roadmap files (ceux qu'on a
  déjà créés : INBOX-001 à INBOX-004).
- Risque méthodologique : une revue UX ne livre pas du code — c'est
  un input pour la phase de design des stories enfants. Probable
  Epic "Design system Inbox/Epic/Roadmap" qui regroupe la session
  designer + les itérations qui en découlent.
