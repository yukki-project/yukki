---
id: META-002
slug: backport-story-techniques
story: .yukki/stories/META-002-backport-story-techniques.md
status: reviewed
created: 2026-04-30
updated: 2026-04-30
---

# Analyse — Extraire SPIDR / INVEST / formulation des AC depuis /yukki-story vers .yukki/methodology/

> Première analyse produite avec le skill `/yukki-analysis` enrichi par
> META-001. Sert aussi de **test de boucle complète** : si l'analyse tient
> debout sans modifier le skill, les 4 refs publiées sont utilisables.

## Mots-clés métier extraits

`SPIDR`, `INVEST`, `Given/When/Then`, `déclaratif`, `impératif`, `granularité
3-5`, `anti-patterns de découpage`, `inlining`, `methodology reference`,
`applies-to`, `frontmatter étendu`, `pattern miroir Claude/Copilot`,
`section ## Changelog`, `single source of truth`, `convention skill =
procédural`.

## Concepts de domaine

> Identification selon [`.yukki/methodology/domain-modeling.md`](../methodology/domain-modeling.md).

### Existants (déjà dans le repo, posés par META-001)

- **Entity** `Skill` — fichier procédural en deux formats miroirs
  (`.claude/commands/yukki-*.md` et `.github/skills/yukki-*/SKILL.md`),
  identifiable par son `name`, cycle de vie *implicite* (édité au fil des
  evolutions méthodologiques).
- **Entity** `MethodologyReference` — fichier dans `.yukki/methodology/` avec
  frontmatter étendu (`id`, `version`, `applies-to`, `sources`, `lang`).
  Cycle de vie : `published` puis incréments de `version` tracés via
  `## Changelog`. Quatre instances aujourd'hui (issues de META-001).
- **Entity** `MethodologyIndex` — fichier `.yukki/methodology/README.md`,
  agrégat de présentation, regénéré à chaque ajout/suppression de ref.
- **Value Object** `AppliesTo` — liste de strings, chaque string désigne
  un skill par son `name`. Immutable au sens où deux listes identiques
  désignent le même couplage.
- **Invariant (déjà inscrit dans `.yukki/README.md`)** : *"aucun skill ne
  redéfinit une technique méthodologique ; toute mention d'une technique
  doit être un lien vers `.yukki/methodology/<technique>.md`"*. Cet
  invariant est précisément ce que META-002 finit de faire respecter sur
  `/yukki-story`.
- **Integration point** : aucun externe ; cette story est purement
  documentaire, pas de subprocess ni d'API tierce.

### Nouveaux (à introduire)

- **MethodologyReference `spidr`** — couvre SPIDR (5 axes) + signaux
  d'alerte + stratégies de découpage + anti-patterns. `applies-to:
  [yukki-story, yukki-prompt-update]`.
- **MethodologyReference `invest`** — couvre les 6 critères Independent /
  Negotiable / Valuable / Estimable / Small / Testable + heuristiques
  d'application. `applies-to: [yukki-story, yukki-analysis]`.
- **MethodologyReference `acceptance-criteria`** — couvre Given/When/Then,
  style déclaratif vs impératif, mots bannis, granularité 3-5.
  `applies-to: [yukki-story, yukki-prompt-update, yukki-reasons-canvas]`.

### Inlining résiduel à supprimer (matière première du chantier)

Côté `.claude/commands/yukki-story.md` (et son miroir Copilot) :

| Section actuellement inlinée | Cible |
|---|---|
| « Formulation des Acceptance Criteria » + « Style déclaratif vs impératif » + « Mots et tournures à bannir » | `acceptance-criteria.md` |
| « Granularité : combien d'AC ? » (table) | `acceptance-criteria.md` |
| Mention INVEST + lien Agile Alliance dans « Règles générales » | `invest.md` |
| « Étape 4bis — Story trop grosse : scinder avec SPIDR » (table 5 axes + signaux + stratégies + anti-patterns + exemple) | `spidr.md` |

Volume estimé : ~80 lignes à extraire de chaque format de skill (Claude +
Copilot), soit ~160 lignes au total.

## Approche stratégique

> Format Y-Statement selon [`.yukki/methodology/decisions.md`](../methodology/decisions.md).

> Pour résoudre le **dernier inlining résiduel dans `/yukki-story`** (SPIDR +
> INVEST + formulation des AC) qui contredit la convention posée par
> META-001, on choisit de **créer trois refs autonomes dans
> `.yukki/methodology/` puis de réécrire `/yukki-story` (Claude + Copilot)
> pour les référencer par lien**, plutôt que de **fusionner les trois
> techniques dans une ref méta unique** ou de **conserver l'inlining
> historique au nom de "ce skill est plus didactique que les autres"**,
> pour atteindre la **cohérence absolue de la convention
> skill/methodology** et la **réutilisabilité des refs entre skills**
> (INVEST consommé par `/yukki-analysis`, AC formulation par
> `/yukki-reasons-canvas`), en acceptant **trois fichiers supplémentaires
> dans `methodology/` et un skill `/yukki-story` qui exige un Read
> additionnel par l'agent quand il atteint une étape déléguée à une ref**.

### Alternatives écartées

- **Fusion en `story-techniques.md` unique** — casse la granularité par
  technique et complique `applies-to` (`/yukki-analysis` consomme INVEST
  mais pas SPIDR ; `/yukki-reasons-canvas` consomme AC formulation mais pas
  INVEST). Une ref par technique reste la bonne maille.
- **Conserver l'inlining (statu quo)** — viole l'invariant posé par
  META-001 et publié dans `.yukki/README.md`. Toute la valeur du chantier
  méthodologie repose sur cet invariant.
- **Mixer (ref pour SPIDR mais inline pour AC formulation)** — incohérent
  pour le lecteur, sans logique défendable. Tout ou rien.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `.yukki/methodology/` | fort | création de 3 nouveaux fichiers |
| `.claude/commands/yukki-story.md` | fort | refonte (suppression de ~80 lignes inlinées + ajout de liens) |
| `.github/skills/yukki-story/SKILL.md` | fort | miroir Copilot synchronisé |
| `.yukki/methodology/README.md` | faible | maj de l'index (+3 lignes table) |

## Dépendances et intégrations

- **Pas de dépendance code** — story documentaire, conforme à la nature
  des stories `META-`.
- **Sources externes** déjà identifiées par la web research de META-001 :
  Mountain Goat (SPIDR), Agile Alliance (INVEST), Cucumber + Fowler bliki
  (Given/When/Then), Parallel HQ (granularité). Aucune nouvelle source à
  rechercher.
- **Pattern frontmatter** des refs : reprend strictement la convention
  META-001, pas de nouveau champ.
- **Parseabilité** (exigence non fonctionnelle héritée de META-001) :
  `yq` doit parser les 3 nouveaux frontmatter sans erreur.

## Risques et points d'attention

> Catégorisation selon [`.yukki/methodology/risk-taxonomy.md`](../methodology/risk-taxonomy.md).

- **Compatibilité** — *Impact faible, probabilité faible*. Un agent qui a
  mémorisé l'ancienne version inlinée du skill `/yukki-story` pourrait
  appliquer SPIDR/INVEST de mémoire au lieu de relire la ref. **Mitigation**
  : les agents re-lisent les skills à chaque invocation (pas de cache
  long terme), donc l'effet est transitoire.
- **Opérationnel** — *Impact moyen, probabilité moyenne*. Liens cassés
  entre `/yukki-story` et `.yukki/methodology/<ref>.md` si un fichier est
  renommé ou si une ancre est modifiée. **Mitigation** : revue manuelle
  des liens à la livraison ; META-003 prévoira un check CI sur les liens
  morts.
- **Opérationnel (dérive skill ↔ ref)** — *Impact moyen, probabilité
  moyenne*. Une évolution du skill qui ré-introduirait une description
  partielle de SPIDR (sans s'en rendre compte) recréerait le problème.
  **Mitigation** : convention écrite dans `.yukki/README.md`, vérification
  manuelle dans les revues de PR ; META-003 portera la vérification
  automatique.

> Pas de risque de catégorie *Sécurité*, *Performance*, *Intégration
> externe* ou *Data* sur cette story (purement documentaire, conforme aux
> 6 catégories applicables).

## Cas limites identifiés

> Identification selon [`.yukki/methodology/edge-cases.md`](../methodology/edge-cases.md).

- **Equivalence Partitioning** — un agent qui invoque `/yukki-story` après
  ce changement / un humain qui consulte une ref directement / un humain
  qui parcourt `methodology/README.md`. Trois chemins de lecture, tous
  doivent atterrir sur du contenu cohérent.
- **Null / empty** — `applies-to` vide ne doit jamais arriver. Si un
  contributeur introduit une ref orpheline, l'index ne la liste pas et
  `/yukki-analysis` ne la référence pas — la ref devient invisible.
  Mitigation manuelle ; META-003 portera la vérification.
- **Failure modes** — `/yukki-story` invoqué pendant que les refs sont en
  cours de création (état intermédiaire) : peu probable parce que le
  cycle SPDD `/yukki-generate` produit toutes les Operations dans un même
  commit. À surveiller si le workflow change.
- **Concurrence (édition humaine)** — deux contributeurs éditent
  simultanément `spidr.md` et `/yukki-story` : conflit Git classique,
  pas un risque méthodologique.
- **Security / negative testing** — n/a sur une story documentaire.

## Décisions à prendre avant le canvas

> Toutes tranchables maintenant ; conservées ici pour traçabilité.

- [ ] **Ancres markdown dans les refs** : faut-il garantir des `<a>` ou
  ancres markdown stables (`spidr.md#anti-patterns`,
  `invest.md#small`) pour permettre des liens partiels depuis le skill ?
  — recommandation : oui, ancres standard `## Section` markdown auto-générées
  par les titres ; pas de `<a id>` manuel sauf cas particulier.
- [ ] **Section "Migration v1 → v2"** dans le `## Changelog` du skill
  `/yukki-story` qui explique le retrait du contenu inliné ?
  — recommandation : pas de section dédiée ; une entrée changelog suffit.
- [ ] **Ordre de génération** des refs (impact sur les liens internes
  potentiels) ? — recommandation : `invest.md` d'abord (plus simple),
  puis `spidr.md` (qui peut référencer `invest.md#small` en interne),
  puis `acceptance-criteria.md` (autonome).
- [ ] **Status initial** des 3 refs : `published` (cohérent avec META-001) ✓
  — décision implicite reprise.
