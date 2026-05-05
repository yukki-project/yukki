---
id: INBOX-009
slug: token-counting-cost-tracking
title: Comptage de tokens et estimation de coût par workflow SPDD
status: unsorted
created: 2026-05-05
updated: 2026-05-05
promoted-to: ~
---

# Comptage de tokens et estimation de coût par workflow SPDD

## Idée

Aujourd'hui yukki invoque les providers (Claude CLI, demain Copilot
ou OpenAI API cf. INBOX-007) **sans visibilité** sur les tokens
consommés ni le coût engendré. Pour des équipes en production et
pour le pilotage du projet OSS, c'est aveugle.

Capturer pour chaque invocation :
- Tokens en **entrée** (prompt système + user prompt + contexte
  injecté : artefact lu, code scanné…)
- Tokens en **sortie** (réponse du modèle, artefact généré)
- Modèle utilisé (haiku / sonnet / opus / gpt-4o / …)
- Coût $ estimé (table de prix par modèle, mise à jour manuelle ou
  via API provider)
- Étape SPDD (`yukki-story`, `yukki-analysis`, `yukki-generate`, …)
- Durée wall-clock (utile pour comparer cache hit / miss)

Restitution :
- Log local par invocation (`.yukki/usage.jsonl`)
- Vue agrégée dans le hub UI : coût par story (cycle complet
  story→canvas→generate), coût cumulé par workflow type, top 10
  des invocations les plus chères
- Export CSV pour reporting externe
- Optionnel : alerte budget (`yukki budget set 50` → warn quand on
  approche, refuse de générer si dépassé)

## Cas d'usage

- **Pilotage produit OSS yukki** : "combien coûte un cycle SPDD
  complet sur une story moyenne ?" — chiffre concret pour la doc et
  les utilisateurs prospects
- **Optimisation prompts** : repérer les invocations qui consomment
  beaucoup et travailler le prompt système / la quantité de contexte
- **ROI de la cache prompt-cache** : si le provider supporte le
  caching (Anthropic prompt-cache, OpenAI cached input), mesurer le
  hit rate et l'économie réelle
- **Justification adoption en équipe** : avoir un coût par feature
  pour comparer à la facture cloud / outils traditionnels

## Notes

- **Source des compteurs** : le SDK / API provider retourne déjà les
  `usage.input_tokens` / `output_tokens`. Côté CLI Claude, à vérifier
  si l'info est exposée — sinon estimer avec un tokenizer local
  (tiktoken pour OpenAI, anthropic-tokenizer pour Claude).
- **Cache de prompts** : le caching change radicalement la facture —
  important de capter `cache_read_tokens` séparément (5-10× moins
  cher chez Anthropic).
- **Privacy** : le log `.yukki/usage.jsonl` ne doit **jamais** capturer
  le contenu des prompts (juste les comptes + métadonnées). À
  gitignore par défaut (cohérent avec `.yukki/research/` déjà ignoré).
- Lien avec INBOX-006 (subagents) : si subagents implémentés, on peut
  attribuer chaque coût à l'agent qui l'a engendré → granularité
  fine ("le `analysis-agent` consomme 60 % du coût d'une story
  complète, on peut switch en sonnet pour les cas simples").
- Lien avec INBOX-007 (multi-provider) : permet la comparaison
  inter-provider sur un workflow équivalent (Claude vs OpenAI vs
  Mistral à qualité égale).
- Probable Story atomique au début (juste capture + log) puis Epic
  si on veut vue UI + budget + alerts.
