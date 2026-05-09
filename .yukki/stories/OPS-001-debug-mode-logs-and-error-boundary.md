---
id: OPS-001
slug: debug-mode-logs-and-error-boundary
title: Mode debug + logs persistants + error boundary
status: reviewed
created: 2026-05-08
updated: 2026-05-09
owner: Thibaut Sannier
modules:
    - frontend
    - internal/uiapp
    - cmd/yukki
---

# Mode debug + logs persistants + error boundary

## Background

L'application yukki est encore en phase alpha de développement.
Quand un défaut de rendu se produit pendant l'utilisation, l'écran
devient gris et la session se fige, parce qu'il n'existe aucun
garde-fou pour rattraper ces incidents. Les messages produits par
le code frontend disparaissent à la fermeture de la fenêtre, et
les logs écrits par le binaire Go sur sa sortie standard ne sont
conservés dans aucun fichier accessible à l'utilisateur. Quand un
utilisateur veut signaler un bug, il ne peut transmettre aucune
trace utile pour comprendre ce qui s'est passé. Cette story
introduit un garde-fou contre les crashes frontend, un système de
logs écrits sur disque que l'on peut partager après coup, et un
mode debug activable pour obtenir des informations plus détaillées.

## Business Value

Diagnostic rapide des bugs alpha : l'utilisateur peut joindre un
fichier log à un signalement. Plus de session perdue à cause d'une
exception non rattrapée. Réduction du temps de résolution des
incidents et confiance utilisateur restaurée (un crash ne tue plus
la session, on revient en arrière).

## Scope In

- **ErrorBoundary React global** au niveau du shell de l'app qui
  rattrape les exceptions de rendu et affiche un panneau d'erreur
  lisible (titre, message court, stack trace dépliable, boutons
  « Copier », « Ouvrir les logs », « Recharger l'app »).
- **Logs persistants sur disque** : tous les events ≥ INFO
  (frontend + Go) sont écrits dans `<configDir>/yukki/logs/yukki-<YYYY-MM-DD>.log`
  avec format structuré (timestamp / level / source / message /
  stack si applicable). Les events de cycle de vie (startup,
  shutdown, projet ouvert, settings hydraté) sont visibles sans
  activer le mode debug.
- **Toggle « Mode debug »** dans un menu **Developer** dédié
  (séparé du FileMenu et du HelpMenu) ainsi qu'un raccourci
  global `Ctrl+Shift+D` : passé en `on`, abaisse le seuil à DEBUG
  et active des traces supplémentaires (IPC Wails, render React,
  store Zustand côté frontend).
- **Build-time gating** : le menu Developer, le toggle, le
  drawer logs, et le flag CLI `--debug` ne sont présents que dans
  les builds compilés avec le tag Go `devbuild`. Les builds de
  release n'exposent **aucune** surface debug (UI ni CLI).
- **Drawer logs intégré** : panneau rétractable depuis le bas
  de la fenêtre quand le mode debug est actif. Tail live du
  fichier du jour, filtres par niveau (DEBUG/INFO/WARN/ERROR)
  et par source (frontend/go), bouton « Pause auto-scroll »,
  fermeture par `Esc` ou clic sur le badge `DEBUG ON`.
- **Capture étendue côté frontend** : `window.onerror`, unhandled
  Promise rejections, erreurs des bindings Wails IPC.
- **Capture étendue côté Go** : panic recovery dans les bindings
  + log structuré de la stack.
- **Rotation** : un nouveau fichier par jour, archivage au-delà
  d'une limite (taille ou nb de fichiers — à arbitrer en analyse).
- **Bouton « Ouvrir le dossier de logs »** dans le panneau d'erreur
  ET dans le menu Developer — ouvre le dossier dans l'explorateur OS.

## Scope Out

- Télémétrie réseau / envoi automatique des logs vers un serveur
  distant.
- Auto-restart / crash recovery transparent (l'utilisateur recharge
  manuellement via le bouton du panneau d'erreur).
- Tracing distribué / OpenTelemetry (yukki est un binaire mono-
  process desktop).
- Anonymisation / scrubbing des PII dans les logs (un log peut
  contenir des paths utilisateur — c'est attendu pour le
  diagnostic, à signaler à l'utilisateur).
- Visualiseur de logs en mode normal (release build) — la lecture
  reste « ouvrir le fichier dans un éditeur ». Le drawer intégré
  est réservé aux builds dev.

## Acceptance Criteria

### AC1 — ErrorBoundary remplace l'écran gris

- **Given** l'app est ouverte sur n'importe quelle vue
- **When** un composant React jette une exception non rattrapée
  pendant son rendu (par exemple via un bouton « simuler crash »
  réservé aux tests)
- **Then** un panneau d'erreur s'affiche avec le message, la
  stack et les boutons « Copier », « Ouvrir les logs »,
  « Recharger l'app » — l'écran ne devient pas gris

### AC2 — Logs persistants écrits sur disque

- **Given** l'app est lancée et a déclenché au moins une erreur
  (par exemple via AC1)
- **When** l'utilisateur ouvre le dossier
  `<configDir>/yukki/logs/`
- **Then** un fichier `yukki-<YYYY-MM-DD>.log` y est présent,
  contenant au minimum la dernière erreur avec timestamp, level,
  source (`frontend` / `go`), message et stack

### AC3 — Mode debug abaisse le seuil

- **Given** le mode debug est activé
- **When** l'utilisateur déclenche une action ordinaire (par
  exemple ouvrir une story dans la HubList)
- **Then** le fichier de log contient des entrées DEBUG décrivant
  les appels Wails IPC déclenchés par l'action, ce qui n'apparaît
  pas en mode normal

### AC4 — Échec d'écriture des logs ne casse pas l'app

- **Given** le dossier `<configDir>/yukki/logs/` ne peut pas être
  créé (permissions OS, disque plein)
- **When** une erreur survient et tente d'être loggée
- **Then** un toast utilisateur indique « Impossible d'écrire le
  log — voir console » et l'app continue de tourner ; les logs
  retombent sur la console standard

### AC5 — Ouverture du dossier de logs

- **Given** un panneau d'erreur (AC1) ou le menu Developer est
  ouvert
- **When** l'utilisateur clique sur « Ouvrir le dossier de logs »
- **Then** l'explorateur de fichiers OS s'ouvre sur
  `<configDir>/yukki/logs/`, focus sur le fichier du jour

### AC6 — Drawer logs intégré (build dev)

- **Given** l'app est compilée avec le tag `devbuild` et le mode
  debug est activé
- **When** l'utilisateur clique sur le badge `DEBUG ON` dans la
  TitleBar (ou utilise le raccourci dédié)
- **Then** un drawer s'ouvre depuis le bas de la fenêtre, affiche
  les 500 dernières entrées du fichier du jour avec auto-scroll,
  et propose au minimum un filtre par niveau et un filtre par
  source ; `Esc` referme le drawer

### AC7 — Toggle invisible en build de release

- **Given** l'app est compilée **sans** le tag `devbuild`
- **When** l'utilisateur ouvre n'importe quel menu de la TitleBar
  ou inspecte la ligne de commande
- **Then** aucun item Mode debug ni Drawer logs n'apparaît, le
  flag `--debug` est inconnu de Cobra, et toute valeur
  `debugMode=true` héritée de `settings.json` est ignorée par le
  runtime (le seuil reste INFO)

### AC8 — Niveau par défaut INFO

- **Given** l'app est lancée sans flag CLI ni mode debug
- **When** l'utilisateur ouvre `<configDir>/yukki/logs/yukki-<YYYY-MM-DD>.log`
- **Then** le fichier contient au minimum un event INFO de
  startup (`ui startup`) et les events INFO/WARN/ERROR émis par
  la session ; les events DEBUG sont absents

## Open Questions

- [x] ~~**Emplacement exact** des logs ?~~ → **résolu 2026-05-09** :
      `os.UserConfigDir()/yukki/logs/`. Cohérent avec le draft
      store (CORE-007), tout le contexte yukki au même endroit
      pour faciliter le diagnostic.
- [x] ~~**Stratégie de rotation** ?~~ → **résolu 2026-05-09** :
      rotation par jour, un fichier `yukki-YYYY-MM-DD.log`
      par jour, garde les 7 derniers et supprime au-delà.
      Simple à comprendre pour un utilisateur qui débogue
      (« regarde le log d'hier »). Si l'usage révèle un besoin
      de plafond de taille, basculer vers une lib type
      `lumberjack` en suivi.
- [x] ~~**Persistance du toggle Mode debug** ?~~ → **résolu
      2026-05-09** : persisté dans la config
      (`<configDir>/yukki/settings.json`) ET signalé visuellement
      par un badge orange « DEBUG ON » dans le header tant que
      le mode est actif. Combine la commodité (pas de re-toggle
      à chaque démarrage) et la sûreté (l'utilisateur n'oublie
      pas qu'il génère des logs verbeux).
- [x] ~~**Niveau par défaut** ?~~ → **résolu 2026-05-09** :
      `INFO` en mode normal (capture INFO / WARN / ERROR / FATAL),
      bascule à `DEBUG` quand le mode debug est activé (capture
      DEBUG / INFO / WARN / ERROR / FATAL). **Amendé après revue
      utilisateur** (initialement WARN) — un fichier vide au
      démarrage normal est trompeur ; INFO permet de voir le
      cycle de vie (startup, projet ouvert, settings hydraté)
      sans activer le toggle, ce qui est la convention des
      éditeurs desktop modernes (VS Code, JetBrains, Chrome).
- [x] ~~**Format du log** ?~~ → **résolu 2026-05-09** : texte
      lisible style « slog text » (par exemple
      `2026-05-09T18:32:14Z WARN frontend HubList refresh failed
      err="no project"`). Cohérent avec le format slog Go par
      défaut, compatible `grep` et éditeurs de texte, lisible
      directement par l'utilisateur qui veut signaler un bug.

### Amendements post-implémentation (2026-05-09)

- [x] **Surface UI du toggle** : déplacé du **FileMenu** vers un
      **menu Developer dédié** (à droite de Help dans la
      TitleBar). Le FileMenu retrouve sa cohérence métier
      (fichier/projet uniquement). Le menu Developer scale pour
      d'autres outils dev futurs (dump state, copier
      diagnostic, etc.).
- [x] **Drawer logs intégré** : visualiseur tail-style en bas
      de fenêtre, accessible quand le mode debug est actif.
      Initialement en scope-out, basculé en scope-in après
      revue utilisateur. Évite l'aller-retour vers l'éditeur
      externe pendant un debug actif.
- [x] **Build-time gating** : tout l'attirail debug (menu,
      drawer, badge, flag CLI) est conditionné au build tag Go
      `devbuild`. Les builds de release ne contiennent même
      pas le code, et `settings.json` héritant de `debugMode=true`
      est ignoré au runtime (`debugMode := persisted && IsDevBuild`).
      Pattern aligné avec le tag `mock` existant.
- [x] **Renommage flag CLI** : `--verbose` → `--debug`,
      sémantique alignée avec le toggle UI. Flag absent dans
      les builds non-`devbuild`.

## Notes

- Briques existantes mobilisables : `slog` Go déjà initialisé
  dans `cmd/yukki/main.go` et passé à `internal/uiapp` ; les
  bindings Wails ont déjà un pattern de retour `(value, error)`
  loggé. Côté frontend, pas d'infra de logging en place — tout
  passe par `console.*` aujourd'hui.
- Évaluation INVEST (cf.
  [`.yukki/methodology/invest.md`](../methodology/invest.md)) :
  - **Independent** : aucune dépendance amont, mais touche
    plusieurs modules (frontend + Go + cmd).
  - **Negotiable** : la stratégie de rotation et le format du
    log sont ouverts en Open Questions.
  - **Valuable** : oui — diagnostic + non-régression au crash.
  - **Estimable** : oui, ~2-3 j.
  - **Small** : **borderline** — multi-modules + 3 sous-systèmes
    (ErrorBoundary, logging persistant, toggle). Voir SPIDR
    ci-dessous : scission possible si l'analyse révèle > 7 AC ou
    plus de 2 j d'effort.
  - **Testable** : oui — bouton « simuler crash » en mode dev,
    inspection du fichier log, mock du dossier inaccessible.
- Décision SPIDR (cf.
  [`.yukki/methodology/spidr.md`](../methodology/spidr.md)) :
  scission **possible** mais non figée — à arbitrer en analyse.

  | Axe | Verdict | Raison |
  |---|---|---|
  | Paths | **possible** | ErrorBoundary, logging persistant et toggle Mode debug sont 3 chemins relativement indépendants. Découpe potentielle : (a) OPS-001a = ErrorBoundary + écran d'erreur ; (b) OPS-001b = logs persistants + rotation ; (c) OPS-001c = toggle Mode debug + Settings UI. À garder pour l'analyse. |
  | Interfaces | non | Une seule UI cible (panneau d'erreur + Settings), pas de variantes. |
  | Data | non | Pas de modèle ni d'API à découper. |
  | Rules | non | AC4 (écriture KO) et AC5 (ouverture dossier) sont les deux cas limites, tiennent en 2 AC. |
  | Spike | non | Toutes les briques sont standard (React error boundary, fs Go, runtime.BrowserOpenURL Wails). |
