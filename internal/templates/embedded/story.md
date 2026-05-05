---
id: <ID>                       # ex. EXT-014, BACK-027, FRONT-042
slug: <kebab-case-slug>        # ex. trivy-csv-export
title: <titre court>
status: draft                  # draft | in-analysis | in-design | in-implementation | done
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
owner: <nom ou équipe>
modules:                       # modules impactés (utile pour /yukki-analysis)
  - backend                    # backend | controller | common | frontend | extensions/<nom> | helm | docs
---

# <titre>

## Background

<Pourquoi cette story existe ? Contexte métier ou technique. 3-6 lignes max.>

## Business Value

<À qui ça sert et quel gain mesurable. Ex. "permettre aux équipes Run d'exporter
les vulnérabilités Trivy au format CSV pour les rapports mensuels SecOps".>

## Scope In

- <ce qui est dans le périmètre, point par point>
- <...>

## Scope Out

- <ce qui est explicitement exclu et pourquoi>
- <...>

## Acceptance Criteria

> Format Given / When / Then. Chaque critère doit être testable.

### AC1 — <titre du critère>

- **Given** <contexte / état initial>
- **When** <action utilisateur ou événement système>
- **Then** <résultat observable>

### AC2 — <titre>

- **Given** ...
- **When** ...
- **Then** ...

## Open Questions

- [ ] <question pour le PO / l'archi / l'utilisateur final>
- [ ] <...>

## Notes

<Liens vers tickets Jira, threads Slack, screenshots, captures Bruno, etc.>
