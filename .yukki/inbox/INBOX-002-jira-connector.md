---
id: INBOX-002
slug: jira-connector
title: Connecteur Jira (sync bidirectionnel)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Connecteur Jira (sync bidirectionnel)

## Idée

Créer un connecteur Jira pour synchroniser les artefacts SPDD avec
un projet Jira existant. Cas d'usage cible : équipes qui ont leur
backlog produit dans Jira (impératif corporate, intégration avec
d'autres outils) mais veulent profiter de la rigueur méthodologique
SPDD côté dev sans dupliquer la saisie.

Mappings envisagés :

| Artefact SPDD | Issue type Jira |
|---|---|
| Inbox | Idea (ou Issue avec label `inbox`) |
| Story | Story |
| Epic | Epic |
| Roadmap | Roadmap (Jira Plans / Advanced Roadmaps) |

Modes possibles :
- **Push** : yukki crée / met à jour les tickets Jira depuis
  les artefacts SPDD locaux
- **Pull** : yukki importe des tickets Jira existants en artefacts
  SPDD `draft`
- **Bidir** : sync continue avec résolution de conflits

## Notes

- Risque : casse l'**autonomie** revendiquée par yukki (Scope Out
  explicite dans toutes les stories méta). À traiter comme un module
  optionnel (ex. `extensions/jira/`) plutôt qu'au cœur.
- Auth Jira Cloud (OAuth 2.0 / token API) — gestion secrets locale.
- Format des liens : `jira-url:` dans le frontmatter SPDD pour pointer
  vers le ticket distant ; `spdd-id:` côté Jira (custom field) pour
  pointer vers le fichier local.
- Probable Epic plutôt que Story atomique — décomposition INVEST
  nécessaire (auth, schéma, push, pull, conflits).
