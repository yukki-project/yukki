---
id: UI-020
slug: settings-page
title: Page Settings (CLI path, mode debug, projet par défaut, raccourcis)
status: draft
created: 2026-05-08
updated: 2026-05-08
owner: Thibaut Sannier
modules:
  - frontend
  - internal/uiapp
---

# Page Settings (CLI path, mode debug, projet par défaut, raccourcis)

## Background

L'app yukki n'a aucun panneau de réglages aujourd'hui — l'icône
`Settings` existe dans l'ActivityBar mais n'a pas de vue associée.
Conséquence : impossible pour l'utilisateur de configurer le
chemin de la CLI Claude (en cas d'install non standard), de
toggler le mode debug (OPS-001), de choisir une langue (META-006),
de définir le projet ouvert par défaut, ou de consulter les
raccourcis clavier disponibles. Friction réelle au premier
démarrage et besoin grandissant à mesure que les options
s'accumulent.

## Business Value

Centralise toutes les préférences en un seul endroit, supprime la
friction des configs cachées (variables d'environnement, fichiers
yaml). Réduit le temps d'onboarding et facilite la diagnostic
(« active le mode debug puis envoie-moi les logs »).

## Scope In

- Vue dédiée rendue quand `activeMode === 'settings'` (l'icône
  existe déjà dans l'ActivityBar).
- **Sections** organisées en groupes :
  - **Provider** : chemin de la CLI Claude (auto-détecté + override
    manuel), bouton « Tester la connexion ».
  - **Comportement** : toggle Mode debug (lien avec OPS-001),
    projet ouvert au démarrage (dernier ouvert / aucun / sélection),
    confirmation avant suppression.
  - **Apparence** : langue d'interface (lien avec META-006),
    densité (compacte / confort).
  - **Raccourcis clavier** : liste des raccourcis disponibles,
    en read-only pour cette story (l'édition viendra plus tard).
- **Persistance** des préférences sur disque dans
  `<configDir>/yukki/settings.json` ou équivalent.
- **Bouton « Réinitialiser »** par section pour revenir aux
  valeurs par défaut.
- **Validation** des champs (par exemple le chemin CLI doit
  exister sur disque ; le projet par défaut doit être un
  projet ouvert).

## Scope Out

- Édition des raccourcis clavier (read-only dans cette story —
  futur UI-020b).
- Synchronisation des préférences entre machines (cloud).
- Profils utilisateurs multiples (yukki est mono-user mono-machine
  pour l'instant).
- Configuration avancée du provider (timeouts, retries, modèles
  Claude spécifiques) — un panneau « avancé » viendra plus tard
  si besoin.
- Themes utilisateur custom (palette uniquement définie par
  UI-018 yk-*).

## Acceptance Criteria

### AC1 — Modifier le chemin Claude CLI persiste

- **Given** la page Settings est ouverte avec le chemin CLI
  Claude par défaut détecté
- **When** l'utilisateur saisit un chemin custom
  (`C:\Tools\claude.exe` par exemple) et clique sur « Tester »
- **Then** un retour visuel indique succès ou échec ; en cas de
  succès, la valeur est persistée et utilisée par le prochain
  appel `RunStory` / `SpddSuggestStart`

### AC2 — Toggle mode debug change le seuil de log

- **Given** le mode debug est désactivé (état par défaut)
- **When** l'utilisateur active le toggle Mode debug
- **Then** la préférence est persistée et le système de log
  (OPS-001) abaisse son seuil à DEBUG dès l'activation, sans
  rechargement nécessaire

### AC3 — Projet par défaut

- **Given** l'utilisateur a choisi « Projet `yukki` » comme projet
  par défaut au démarrage
- **When** il ferme l'app et la rouvre
- **Then** yukki s'ouvre directement sur le projet `yukki`, sans
  passer par l'écran « aucun projet ouvert »

### AC4 — Validation : chemin CLI invalide rejeté

- **Given** la page Settings est ouverte
- **When** l'utilisateur saisit un chemin qui n'existe pas
  (`/tmp/inexistant.exe`) et clique sur « Tester »
- **Then** un message d'erreur lisible explique le problème et la
  valeur précédente n'est PAS écrasée tant que la nouvelle n'est
  pas valide

### AC5 — Réinitialisation d'une section

- **Given** plusieurs préférences ont été modifiées dans la
  section « Apparence »
- **When** l'utilisateur clique sur « Réinitialiser cette section »
  et confirme
- **Then** les valeurs de la section reviennent aux défauts
  d'origine, persistance incluse — les autres sections sont
  inchangées

## Open Questions

- [ ] **Format du fichier de préférences** : JSON, YAML, ou TOML ?
      JSON est plus simple côté Wails, mais TOML est plus lisible
      pour un humain qui ouvre le fichier à la main. À trancher
      en analyse.
- [ ] **Emplacement** : `<configDir>/yukki/settings.json` (cohérent
      avec OPS-001 logs) ou un autre nom (`preferences.json`,
      `config.json`) ?
- [ ] Les **préférences sont-elles par utilisateur OS** (1
      `settings.json` global) ou **par projet** (1 settings dans
      chaque `.yukki/`) ? Probablement les deux à terme — la story
      doit clarifier.
- [ ] Le toggle Mode debug doit-il **survivre au redémarrage** ou
      revient-il à `off` à chaque démarrage (sécurité : pas de
      logs verbeux par accident) ?

## Notes

- Dépendances logiques : OPS-001 (mode debug), META-006 (langue),
  UI-018 (palette). La page Settings est leur point d'entrée
  utilisateur.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : peut être livrée même si OPS-001 / META-006
    ne le sont pas (les sections correspondantes affichent des
    placeholders « pas encore disponible »).
  - **Negotiable** : choix du format / emplacement ouverts.
  - **Valuable** : oui — onboarding + diagnostic.
  - **Estimable** : ~2 j.
  - **Small** : borderline — 4 sections distinctes mais homogènes
    (tous des form fields qui persistent dans un fichier).
  - **Testable** : oui — assertions sur le fichier de
    préférences avant/après modification, mock des bindings.
- Décision SPIDR : pas de découpe utile.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | non | Toutes les sections partagent la même infra (form + fichier). |
  | Interfaces | non | Une seule UI cible. |
  | Data | non | Un seul fichier `settings.json`. |
  | Rules | non | AC4 (validation) et AC5 (reset) sont les deux cas limites. |
  | Spike | non | Tout est standard. |
