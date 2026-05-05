---
id: INBOX-010
slug: spdd-linter-pre-commit
title: Linter SPDD — discipline automation (pre-commit + CI)
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Linter SPDD — discipline automation

## Idée

CLAUDE.md décrit une dizaine de **règles non-négociables** SPDD
("pas d'inlining méthodologie", "miroir Claude/Copilot synchronisé",
"examples yukki only", etc.). Aujourd'hui, ces règles sont
**vérifiées à la main** lors de la revue humaine — fragile,
chronophage, et certaines règles sautent en pratique.

Implémenter un linter Go qui parcourt l'arbo `.yukki/` et applique
les règles automatiquement, exposé en :

- **CLI** : `yukki lint` (sortie console + exit code != 0 si erreur)
- **Pre-commit hook** : refuse le commit en cas d'erreur
- **CI job** : `lint` séparé de `static-checks`

Règles à vérifier :
- **Frontmatter** : YAML parseable + champs obligatoires présents
  (id, slug, title, status, created, updated)
- **Status transitions** : ne pas régresser (ex. `implemented` →
  `draft` est interdit ; `synced` → `reviewed` interdit)
- **Cross-refs** : `story:` / `analysis:` du frontmatter pointent
  vers des fichiers existants
- **Préfixe d'ID cohérent** avec le dossier
  (un fichier dans `inbox/` doit avoir préfixe `INBOX-`)
- **Convention de nommage** : `<id>-<slug>.md` pattern strict
- **Methodology no-inlining** : un skill SPDD ne définit jamais
  une technique (DDD, STRIDE, INVEST, BVA, SPIDR, Y-Statement) —
  uniquement des liens vers `.yukki/methodology/`
- **Miroir Claude / Copilot** : pour chaque skill `yukki-X`, vérifier
  que `.claude/commands/yukki-X.md` et `.github/skills/yukki-X/SKILL.md`
  existent et que leur contenu est cohérent (modulo écarts autorisés
  CLAUDE.md règle #4)

## Notes

- Possible reuse d'`internal/artifacts/parser.go` pour le frontmatter.
- Erreurs surfaceables avec format LSP-compatible pour intégration
  IDE (rouge sous le frontmatter cassé dans VSCode).
- Lien INBOX-008 (graph RAG) : le linter peut aussi alimenter le
  graphe de validation (déclarer "Story X depends-on Y" mais Y
  n'existe pas → erreur graph).
- Probable Story atomique pour la base (frontmatter + cross-refs +
  préfixes) ; Epic si on veut couvrir aussi le no-inlining et le
  miroir Claude/Copilot (analyse cross-fichier non-triviale).
