---
id: <ID>                       # même id que la story et l'analyse
slug: <kebab-case-slug>
story: spdd/stories/<ID>-<slug>.md
analysis: spdd/analysis/<ID>-<slug>.md
status: draft                  # draft | reviewed | implemented | synced
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

# Canvas REASONS — <titre>

> Spécification exécutable. Source de vérité pour `/spdd-generate` et `/spdd-sync`.
> Toute divergence code ↔ canvas se résout **dans ce fichier d'abord**.

---

## R — Requirements

> Quel problème on résout, et **comment on saura que c'est fini**.

### Problème

<1-3 phrases.>

### Definition of Done

- [ ] <critère testable, repris ou raffiné depuis les AC de la story>
- [ ] <...>

---

## E — Entities

> Entités métier et relations. Pas du code, du domaine.

### Entités

| Nom | Description | Champs clés | Cycle de vie |
|---|---|---|---|
| `<Entity>` | <quoi> | <id, ...> | <création / mutation / suppression> |

### Relations

- `<EntityA>` ⟶ `<EntityB>` : <nature de la relation, cardinalité>
- <...>

---

## A — Approach

> Stratégie pour satisfaire les Requirements. Décisions d'architecture clés
> et alternatives écartées (avec pourquoi).

<5-15 lignes.>

### Alternatives considérées

- **<alternative>** — <pourquoi écartée>

---

## S — Structure

> Où s'intègre le changement. Composants, dépendances, frontières.

### Modules touchés

| Module | Fichiers principaux | Nature du changement |
|---|---|---|
| `backend` | `*Resource.java`, `*Service.java` | <create / modify / delete> |
| `controller` | `*Reconciler.java` | ... |
| `frontend` | `app/.../*.service.ts`, reducers, effects | ... |
| `extensions/<nom>` | `manifest.yaml`, `index.js` | ... |
| `common` | <DTO, CRD model> | ... |
| `helm` | `values.yaml`, templates | ... |

### Schéma de flux (optionnel)

```
<diagramme ASCII si utile : appels REST, events K8s, navigation UI>
```

---

## O — Operations

> Décomposition exécutable. Ordre, signatures, types. C'est ce que `/spdd-generate`
> consomme. Une opération = une unité testable.

### O1 — <titre>

- **Module** : `<module>`
- **Fichier** : `<chemin>`
- **Signature** :
  ```java
  public Response exportTrivyCsv(@QueryParam("namespace") String ns)
  ```
- **Comportement** : <quoi faire, étape par étape>
- **Tests** : <quels cas couvrir>

### O2 — <titre>

- **Module** : ...
- **Fichier** : ...
- **Signature** : ...
- **Comportement** : ...
- **Tests** : ...

---

## N — Norms

> Standards transversaux du projet à respecter dans cette feature.

- **Logging** : SLF4J / `@Slf4j` côté backend, `console.*` interdit côté frontend
  (utiliser le logger NgRx du portail si applicable).
- **Sécurité** : authent OIDC déjà en place ; toute nouvelle route REST doit
  passer par le filtre `JwtAuthFilter` et déclarer ses scopes.
- **Tests** : couverture sur la logique métier (services / reducers / effects),
  pas sur les `Resource.java` triviaux.
- **Nommage** : `*Resource` (REST), `*Service` (logique), `*Reconciler` (controller),
  `*.service.ts` / `*.effects.ts` / `*.reducer.ts` côté Angular.
- **Observabilité** : exposer les compteurs Micrometer si la feature ajoute un
  flux significatif (export, batch, scheduler).
- **i18n** : tous les textes UI passent par les fichiers de traduction.
- **Docs** : si la feature ajoute une API publique ou un onglet portail, mettre
  à jour `docs/` (Antora) et `nav.adoc`.

---

## S — Safeguards

> Limites non-négociables. Ce que la génération **ne doit pas** faire.

- **Sécurité**
  - Aucune route REST sans authent.
  - Aucune lecture / écriture K8s sans `RoleBinding` explicite côté Helm.
  - Pas de secret en clair dans les manifests, values ou code (utiliser `Secret`
    K8s + `@ConfigProperty`).
- **Compatibilité**
  - Pas de breaking change sur les CRDs `Application` / `PortalExtension` sans
    migration explicite.
  - Pas de modification du contrat extensions (frontend bus / backend API)
    sans bump de version.
- **Performance**
  - Pas d'appel K8s synchrone dans une boucle frontend ; passer par un effect.
  - Pagination côté backend si la collection retournée peut dépasser ~500 items.
- **Périmètre**
  - <invariant métier non négociable spécifique à la story, ex. "ne jamais
    exposer les vulnérabilités d'un namespace pour lequel l'utilisateur n'a
    pas de droits de lecture sur les pods">
