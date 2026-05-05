---
id: METHO-risk-taxonomy
title: Taxonomie de risques (6 catégories + STRIDE pour la sécurité)
version: 2
status: published
applies-to: [yukki-analysis, yukki-reasons-canvas, yukki-prompt-update]
lang: fr
created: 2026-04-30
updated: 2026-04-30
sources:
  - https://owasp.org/www-community/Threat_Modeling_Process
  - https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
---

# Taxonomie de risques (6 catégories + STRIDE)

## Définition

Cataloguer systématiquement les risques d'une feature pour qu'aucun axe ne
soit oublié pendant l'analyse. La grille à 6 catégories ci-dessous est
**exhaustive** : chaque feature doit la parcourir, même si certaines
catégories restent vides pour un cas donné.

## Les 6 catégories

| Catégorie | Quoi y mettre | Exemples génériques |
|---|---|---|
| **Sécurité** | tout ce qui touche aux 6 piliers info-sécurité (voir STRIDE ci-dessous) | bypass auth, injection, fuite de données, élévation de privilège |
| **Performance / Reliability** | latence, throughput, OOM, timeouts, panne de dépendance, dégradation gracieuse | sortie trop lente, cascade de timeouts, OOM sur gros volume, pas de retry |
| **Opérationnel** | deploy, monitoring, observabilité, support de production, runbook | feature sans logs structurés, alerting manquant, deploy non rejouable |
| **Intégration externe** | dépendances tierces (CLI, API, brokers, librairies), contrats, versions | bump cassant d'une lib, contrat CLI modifié, sous-processus introuvable |
| **Data** | format de fichier, encodage, cohérence, scale, conservation | encodage UTF-8 BOM oublié, collision d'identifiants, perte de précision |
| **Compatibilité** | rétro-compat, breaking changes, anciens fichiers, anciens callers | breaking change sur un format de frontmatter, ancien client qui appelle la commande historique |

## Sous-cadre STRIDE pour la branche Sécurité

Quand la feature touche l'authentification, l'autorisation, ou la donnée
sensible, **parcourir STRIDE** en plus de la catégorie *Sécurité* :

| STRIDE | Question à se poser |
|---|---|
| **S**poofing | Un acteur peut-il se faire passer pour un autre ? |
| **T**ampering | Une donnée peut-elle être modifiée en transit ou au repos ? |
| **R**epudiation | Une action peut-elle être déniée (manque de log/signature) ? |
| **I**nformation disclosure | De la donnée fuite-t-elle (logs, erreurs verbeuses, side channel, métadonnées) ? |
| **D**enial of Service | Un input peut-il bloquer le service (boucle, OOM intentionnel) ? |
| **E**levation of privilege | Un utilisateur peut-il dépasser ses droits ? |

## Format de description d'un risque

Pour chaque risque identifié, écrire :

> **\<Catégorie\>** — *Impact \<fort/moyen/faible\>, probabilité
> \<forte/moyenne/faible\>* — Description courte (1-2 phrases). **Mitigation**
> : \<action concrète\>.

## Exemple concret — Story `CORE-001` de yukki

Story [`CORE-001-cli-story-via-claude`](../stories/CORE-001-cli-story-via-claude.md)
— la commande CLI `yukki story` qui orchestre `claude` :

| Catégorie | Risque |
|---|---|
| Sécurité (Information disclosure) | `claude` CLI logge la description complète en mode verbose — fuite si la description contient des données sensibles → *Impact moyen, probabilité faible* — **Mitigation** : invoquer `claude --silent` par défaut, `--verbose` opt-in explicite. |
| Performance | `claude` met >30 s à répondre, l'utilisateur ne sait pas si ça avance → *Impact faible, probabilité forte* — **Mitigation** : streaming des tokens si supporté par le CLI, sinon spinner avec message "génération en cours…" après 5 s. |
| Opérationnel | Aucun log structuré côté `yukki`, debug post-mortem impossible → *Impact moyen, probabilité forte* — **Mitigation** : logs JSON via `slog` activables par `--log-format=json`. |
| Intégration externe | `claude` CLI v2 change d'interface (rename d'un flag) — `yukki` crashe silencieusement → *Impact fort, probabilité moyenne* — **Mitigation** : check `claude --version` au démarrage, message explicite si incompatible. |
| Data | Deux invocations parallèles de `yukki story` génèrent le même id — écrasement silencieux → *Impact fort, probabilité faible* — **Mitigation** : lock file `stories/.lock` pendant le calcul d'id, ou suffixe timestamp dans le nom de travail. |

## Bonnes pratiques

- **3-5 risques majeurs** suffisent en analyse. Concentrer sur ceux qui
  **changent l'architecture**, pas sur tous les risques imaginables.
- **Mitigation actionnable** : *"valider l'input"* est trop vague.
  *"Vérifier que `claude --version` retourne une version compatible avant
  toute invocation"* est actionnable.
- **Ne pas confondre risque et bug** : un risque est un *scénario plausible
  qui changerait la décision* ; un bug est une erreur d'implémentation
  (couverte en tests).

## Sources

- [OWASP Threat Modeling Process](https://owasp.org/www-community/Threat_Modeling_Process)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)

## Changelog

- 2026-04-30 — v1 — création initiale
- 2026-04-30 — v2 — exemple concret remplacé par CORE-001 de yukki
  (anciennement export CSV Trivy/portail). Bonnes pratiques également
  ajustées (exemple `claude --version` au lieu de `SubjectAccessReview`).
