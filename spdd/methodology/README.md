# spdd/methodology/

Bibliothèque versionnée de **techniques méthodologiques** SPDD. Chaque
technique vit dans un fichier autonome et est référencée par les skills qui
la consomment. **Aucune technique n'est inlinée dans un skill.**

## Refs disponibles

| Ref | Résumé | applies-to |
|---|---|---|
| [domain-modeling.md](domain-modeling.md) | Identifier entités, value objects, invariants, intégrations et events d'une feature (DDD tactique allégé) | `spdd-analysis`, `spdd-reasons-canvas` |
| [risk-taxonomy.md](risk-taxonomy.md) | 6 catégories de risques + STRIDE en sous-cadre sécurité | `spdd-analysis`, `spdd-reasons-canvas`, `spdd-prompt-update` |
| [edge-cases.md](edge-cases.md) | BVA + EP + checklist 7 catégories pour identifier les cas limites | `spdd-analysis`, `spdd-reasons-canvas` |
| [decisions.md](decisions.md) | Format Y-Statement pour l'approche stratégique | `spdd-analysis`, `spdd-reasons-canvas` |

## Convention

- **1 ref = 1 technique** d'usage transverse aux skills
- **Frontmatter normalisé** (`id`, `version`, `status`, `applies-to`, `lang`, `sources`)
- **Longueur cible 80-150 lignes** par ref — au-delà, scinder
- **Versionning** : entier monotone par fichier, tracé via `## Changelog`
- **Langue** : français en v1 (`lang: fr`) ; internationalisation future possible
- **Skills** ne redéfinissent jamais une technique : ils la **référencent par lien**

Voir [`spdd/README.md`](../README.md) pour la philosophie générale SPDD.
