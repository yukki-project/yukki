---
id: <ID>                       # ex. EXT-014, BACK-027, FRONT-042
slug: <kebab-case-slug>        # ex. trivy-csv-export
title: <titre court>
status: draft                  # draft | reviewed | accepted | implemented | synced
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
owner: <nom ou équipe>
modules:                       # modules impactés (utile pour /yukki-analysis)
  - backend                    # backend | controller | common | frontend | extensions/<nom> | helm | docs
---

# <titre>

## Background
<!-- spdd: required help="Pose le décor : pourquoi cette story existe et quel contexte métier ou technique motive sa rédaction. 3-6 lignes max." -->

<Pourquoi cette story existe ? Contexte métier ou technique. 3-6 lignes max.>

## Business Value
<!-- spdd: required help="À qui sert cette story et quel gain mesurable. Exprime la valeur, pas la solution technique." -->

<À qui ça sert et quel gain mesurable. Ex. "permettre aux équipes Run d'exporter
les vulnérabilités Trivy au format CSV pour les rapports mensuels SecOps".>

## Scope In
<!-- spdd: required help="Liste précise de ce qui est dans le périmètre. Une puce = un comportement ou un livrable observable." -->

- <ce qui est dans le périmètre, point par point>
- <...>

## Scope Out
<!-- spdd: help="Ce qui est explicitement exclu, et pourquoi. Évite l'ambiguïté en revue." -->

- <ce qui est explicitement exclu et pourquoi>
- <...>

## Acceptance Criteria
<!-- spdd: required help="Critères testables au format Given/When/Then. Un AC = un comportement observable." -->

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
<!-- spdd: help="Questions à trancher avec le PO ou l'archi avant de partir en analyse. Cocher au fil de l'eau." -->

- [ ] <question pour le PO / l'archi / l'utilisateur final>
- [ ] <...>

## Notes
<!-- spdd: help="Liens vers tickets, threads, captures. Tout ce qui éclaire le contexte sans alourdir le corps." -->

<Liens vers tickets Jira, threads Slack, screenshots, captures Bruno, etc.>
