---
id: METHO-risk-taxonomy
title: Taxonomie de risques (6 catégories + STRIDE pour la sécurité)
version: 1
status: published
applies-to: [spdd-analysis, spdd-reasons-canvas, spdd-prompt-update]
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
| **Performance / Reliability** | latence, throughput, OOM, timeouts, panne de dépendance, dégradation gracieuse | export trop lent, cascade de timeouts, OOM sur gros volume, pas de retry |
| **Opérationnel** | deploy, monitoring, observabilité, support de production, runbook | feature sans logs structurés, alerting manquant, deploy non rejouable |
| **Intégration externe** | dépendances tierces (API, brokers, librairies), contrats, versions | bump cassant d'une lib, contrat REST modifié sans migration, broker unreachable |
| **Data** | migration de schéma, cohérence, encodage, scale, conservation | migration BDD non rejouable, encodage UTF-8 BOM oublié, perte de précision |
| **Compatibilité** | rétro-compat, breaking changes API, anciens clients, anciens fichiers | breaking change CRD, ancien client qui appelle la route legacy, format de fichier obsolète |

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

## Exemple concret — Export CSV Trivy

| Catégorie | Risque |
|---|---|
| Sécurité (Elevation) | Un utilisateur sans droit `get pods` accède à un namespace via l'API REST directe → *Impact fort, probabilité moyenne* — **Mitigation** : `SubjectAccessReview` côté serveur avant tout streaming. |
| Performance | Namespace avec >10 000 vulnérabilités déclenche OOM → *Impact fort, probabilité moyenne* — **Mitigation** : `StreamingOutput` ligne par ligne, jamais de `List.toArray()`. |
| Opérationnel | Pas de métrique sur le nombre d'exports / namespace → *Impact faible, probabilité forte* — **Mitigation** : compteur Micrometer `trivy_export_total{namespace, granted}`. |
| Data | Le champ `description` Trivy contient des `\n` → CSV mal formé chez le client → *Impact moyen, probabilité forte* — **Mitigation** : escaping CSV strict avec quoting des `,`, `"`, `\n`, `\r`. |

## Bonnes pratiques

- **3-5 risques majeurs** suffisent en analyse. Concentrer sur ceux qui
  **changent l'architecture**, pas sur tous les risques imaginables.
- **Mitigation actionnable** : "valider l'input" est trop vague. *"Appeler
  `SubjectAccessReview` avec verbe `get` ressource `pods` avant le
  streaming"* est actionnable.
- **Ne pas confondre risque et bug** : un risque est un *scénario plausible
  qui changerait la décision* ; un bug est une erreur d'implémentation
  (couverte en tests).

## Sources

- [OWASP Threat Modeling Process](https://owasp.org/www-community/Threat_Modeling_Process)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)

## Changelog

- 2026-04-30 — v1 — création initiale
