# spdd/methodology/

Bibliothèque versionnée de **techniques méthodologiques** SPDD. Chaque
technique vit dans un fichier autonome et est référencée par les skills qui
la consomment. **Aucune technique n'est inlinée dans un skill.**

## Refs disponibles

| Ref | Résumé | applies-to |
|---|---|---|
| [acceptance-criteria.md](acceptance-criteria.md) | Formulation des AC : Given/When/Then, style déclaratif, mots bannis, granularité 3-5 | `spdd-story`, `spdd-prompt-update`, `spdd-reasons-canvas` |
| [decisions.md](decisions.md) | Format Y-Statement pour l'approche stratégique | `spdd-analysis`, `spdd-reasons-canvas` |
| [domain-modeling.md](domain-modeling.md) | Identifier entités, value objects, invariants, intégrations et events d'une feature (DDD tactique allégé) | `spdd-analysis`, `spdd-reasons-canvas` |
| [edge-cases.md](edge-cases.md) | BVA + EP + checklist 7 catégories pour identifier les cas limites | `spdd-analysis`, `spdd-reasons-canvas` |
| [invest.md](invest.md) | Les 6 critères de qualité d'une user story (Independent / Negotiable / Valuable / Estimable / Small / Testable) | `spdd-story`, `spdd-analysis` |
| [risk-taxonomy.md](risk-taxonomy.md) | 6 catégories de risques + STRIDE en sous-cadre sécurité | `spdd-analysis`, `spdd-reasons-canvas`, `spdd-prompt-update` |
| [spidr.md](spidr.md) | SPIDR — 5 axes de découpage (Paths / Interfaces / Data / Rules / Spike) quand "Small" d'INVEST est cassé | `spdd-story`, `spdd-prompt-update` |

## Convention

- **1 ref = 1 technique** d'usage transverse aux skills
- **Frontmatter normalisé** (`id`, `version`, `status`, `applies-to`, `lang`, `sources`)
- **Longueur cible 80-150 lignes** par ref — au-delà, scinder
- **Versionning** : entier monotone par fichier, tracé via `## Changelog`
- **Langue** : français en v1 (`lang: fr`) ; internationalisation future possible
- **Skills** ne redéfinissent jamais une technique : ils la **référencent par lien**
- **Naming** : par technique propre (nom propre comme `spidr`, `invest`) ou par sujet précis si plusieurs techniques convergent (`edge-cases`, `acceptance-criteria`) ; pas d'abréviation jargon

Voir [`spdd/README.md`](../README.md) pour la philosophie générale SPDD.
