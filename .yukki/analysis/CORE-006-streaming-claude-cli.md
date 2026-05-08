---
id: CORE-006
slug: streaming-claude-cli
story: .yukki/stories/CORE-006-streaming-claude-cli.md
status: implemented
created: 2026-05-07
updated: 2026-05-08
---

# Analyse — Streaming live de la réponse Claude dans l'UI

> Contexte stratégique pour `CORE-006-streaming-claude-cli`. Produit par `/yukki-analysis`
> à partir d'un scan ciblé du codebase.

## Mots-clés métier extraits

`stream-json`, `chunk`, `OnChunk`, `ClaudeProvider`, `Generate`, `cmd.Run`,
`bufio.Scanner`, `provider:text`, `uiProgress`, `Progress interface`,
`eventProviderStart`, `eventProviderEnd`

## Concepts de domaine

### Existants (déjà dans le code)

- **`ClaudeProvider`** — `internal/provider/claude.go`. Struct qui invoque le
  binaire `claude` via `os/exec`. La méthode `Generate` utilise `cmd.Run()` +
  `bytes.Buffer` : elle attend la fin complète du processus avant de retourner.
  Champ `Args []string` (défaut `{"--print"}`) paramétrable par le constructeur.

- **`Provider` interface** — `internal/provider/provider.go`. Interface à 4
  méthodes (`Name`, `CheckVersion`, `Version`, `Generate`). Abstraite sur
  `ClaudeProvider` et `MockProvider`. `Generate` retourne `(string, error)` —
  pas de concept de chunk dans l'interface actuelle.

- **`Progress` interface** — `internal/workflow/story.go`. Interface à 2 méthodes
  (`Start(label)`, `End(path, err)`). Implémentée par `uiProgress` (Wails events)
  et `noopProgress`. Définie dans `workflow` pour respecter la règle depguard
  (uiapp → workflow, jamais l'inverse).

- **`uiProgress`** — `internal/uiapp/progress.go`. Émet `provider:start` et
  `provider:end` vers le frontend via `emitEvent`. Pattern d'indirection
  `var emitEvent = runtime.EventsEmit` pour testabilité. Connaît uniquement
  le début et la fin de la génération — pas les chunks intermédiaires.

- **`MockProvider`** — `internal/provider/mock.go`. Test double de `Provider`,
  expose un champ `BlockUntil chan struct{}` pour les tests de cancellation.
  Retourne `Response string` complet d'un coup — pas de simulation de chunks.

- **`eventProviderStart` / `eventProviderEnd`** — constantes dans `progress.go`.
  Contrat wire stable avec le frontend (`NewStoryModal.tsx`).

### Nouveaux (à introduire)

- **`ChunkFunc`** (alias de type) — `type ChunkFunc func(text string)`. Callback
  appelé à chaque chunk de texte reçu du flux `stream-json`. Nil-safe. Vit dans
  `internal/provider` pour être partagé entre `ClaudeProvider` et les tests.

- **`eventProviderText`** — constante `"provider:text"` dans `progress.go`.
  Payload `{chunk: string}`. Extension naturelle des events existants ; le
  frontend écoute cet event pour accumuler et afficher le texte progressif.

- **Méthode de streaming interne** — logique `cmd.Start()` + `bufio.Scanner`
  + goroutine stderr + `cmd.Wait()` dans `ClaudeProvider`. Remplace `cmd.Run()`
  + `bytes.Buffer` uniquement quand `OnChunk` est non-nil. Pas d'interface
  supplémentaire : `Generate` reste la seule méthode publique exposée.

## Approche stratégique

*Pour réduire la latence perçue lors des générations SPDD, on choisit d'activer
`--output-format stream-json` dans `ClaudeProvider` et d'exposer un callback
`OnChunk` optionnel sur la struct — plutôt que d'ajouter `StreamGenerate` à
l'interface `Provider` ou d'utiliser un `io.Writer`, pour préserver la
compatibilité avec `MockProvider` et les tests existants, en acceptant que
seul `ClaudeProvider` supporte le streaming (le provider `gh copilot` reçoit
`OnChunk=nil` et continue comme avant).*

Alternatives écartées :
- **Ajouter `StreamGenerate(ctx, prompt, onChunk) (string, error)` à l'interface
  `Provider`** — cassant pour `MockProvider` et tout futur provider. Interdit
  par le principe d'extension minimale de l'interface.
- **`io.Writer` passé via context** — opaque, pas idiomatique Go, difficile à
  tester.
- **Goroutine séparée + channel** — surcharge de synchronisation inutile ;
  `bufio.Scanner` + appel direct au callback est plus simple.
- **Polling du fichier artefact en cours d'écriture** — ne fonctionne pas car
  yukki écrit le fichier seulement après retour de `Generate`.

## Modules impactés

| Module | Impact | Nature |
|---|---|---|
| `internal/provider` | fort | Modification — `ClaudeProvider.Generate` + champ `OnChunk`, type `ChunkFunc` |
| `internal/uiapp` | fort | Modification — `uiProgress`, `App.RunStory`, wiring `OnChunk` → `provider:text` |
| `internal/workflow` | faible | Modification — `Progress` interface : ajout méthode `Chunk(text string)` ou passage de callback via `StoryOptions` |
| `frontend` | moyen | Modification — `NewStoryModal.tsx` : écouter `provider:text`, afficher le texte progressif |

## Dépendances et intégrations

- **`claude` CLI** — flag `--output-format stream-json` (disponible depuis
  claude v2+, confirmé dans la doc officielle). Chaque ligne stdout est un
  objet JSON. Events utiles : `type=assistant` (texte généré), `type=result`
  (texte final + subtype). Events à ignorer : `system_prompt`, `tool_use`,
  `tool_result`.
- **`bufio.Scanner`** (stdlib Go) — lecture ligne par ligne de `cmd.Stdout`;
  buffer par défaut suffisant pour les lignes JSON de taille normale.
- **`encoding/json`** (stdlib Go) — parsing minimal : extraire `type` et
  `message.content[].text` sans désérialiser le payload complet.
- **Wails `runtime.EventsEmit`** — déjà utilisé dans `uiProgress` ; pas de
  nouveau composant frontend requis.

## Risques et points d'attention

Voir catégories dans [`.yukki/methodology/risk-taxonomy.md`](.yukki/methodology/risk-taxonomy.md).

- **Performance / Reliability** — Si `claude` produit des lignes JSON très
  longues (ex. bloc de code > 64 KB), `bufio.Scanner` peut tronquer avec son
  buffer par défaut (64 KB). Mitigation : appeler `scanner.Buffer()` avec un
  buffer max de 1 MB ; logger un warning si dépassement.
  *Impact : élevé (corruption silencieuse du texte) / Probabilité : faible.*

- **Intégration** — Le format exact de `--output-format stream-json` n'est pas
  documenté formellement par Anthropic (découvert par expérimentation). Une
  mise à jour du CLI claude pourrait changer la structure des events.
  Mitigation : parser défensivement (ignorer les champs inconnus, loger les
  lignes non-parsables sans planter).
  *Impact : moyen / Probabilité : faible (format stable depuis des mois).*

- **Compatibilité** — `MockProvider` ne simule pas de chunks ; les tests
  existants de `RunStory` doivent continuer à passer sans modification.
  Mitigation : `OnChunk` est nil par défaut dans le mock — aucun event
  `provider:text` émis en test.
  *Impact : bas / Probabilité : certaine sans précaution — adressée par design.*

- **Opérationnel** — Si un futur provider (copilot CLI) ne supporte pas
  `stream-json`, le champ `OnChunk` sera passé `nil` et le provider retombe
  en mode `cmd.Run()` classique. Pas de régression possible.
  *Impact : bas / Probabilité : sans objet (by design).*

- **Sécurité (STRIDE — Spoofing)** — Les chunks sont du texte brut affiché
  dans l'UI. Si le CLI claude injecte du HTML/JS dans le contenu (peu probable),
  l'affichage en `<pre>` ou textarea est safe. Ne jamais injecter via `innerHTML`.
  *Impact : moyen / Probabilité : très faible.*

## Cas limites identifiés

Voir techniques dans [`.yukki/methodology/edge-cases.md`](.yukki/methodology/edge-cases.md).

- **Ligne non-JSON dans le flux** — ex. message de debug du CLI claude, ligne
  vide. Doit être ignorée silencieusement (logged Debug) sans interrompre la
  lecture. La ligne vide finale après le dernier event ne doit pas causer d'erreur.
- **Flux vide** — `claude -p --output-format stream-json` ne produit aucune
  ligne (ex. quota dépassé, timeout immédiat). `Generate` retourne `("", ErrGenerationFailed)`.
- **Chunk vide dans un event assistant** — `content[].text == ""`. Doit être
  ignoré (pas d'appel `OnChunk("")`).
- **Annulation ctx en milieu de stream** — `ctx.Done()` reçu pendant que le
  scanner lit. Le `Scanner.Scan()` bloque sur I/O ; `exec.CommandContext`
  kill le process → `cmd.Wait()` retourne une erreur → propager via
  `ErrGenerationFailed`.
- **Timeout** — même chemin que annulation ctx ; `context.WithTimeout` déjà
  appliqué dans `Generate`.

## Décisions à prendre avant le canvas

- [ ] **D1 — Où passer `OnChunk` à `ClaudeProvider` ?**
  Option A : champ `OnChunk ChunkFunc` sur la struct (set par `App.RunStory` avant
  l'appel). Option B : paramètre supplémentaire dans `Generate` — impossible
  sans casser l'interface. **Recommandation : Option A (champ struct).**

- [ ] **D2 — Faut-il ajouter `Chunk(text string)` à l'interface `Progress` ?**
  Option A : ajouter `Chunk` à `Progress` dans `workflow/story.go` → `uiProgress`
  implémente, `noopProgress` aussi. Option B : wirer `OnChunk` directement dans
  `App.RunStory` sans passer par `Progress`. Option A découple mieux (workflow
  reste indépendant de Wails). **Recommandation : Option A.**

- [ ] **D3 — Format du payload `provider:text` ?**
  `{chunk: string}` (minimal) ou `{chunk: string, index: number}` (ordonné).
  L'ordre étant garanti par la lecture séquentielle du scanner, l'index est
  superflu. **Recommandation : `{chunk: string}` uniquement.**

- [ ] **D4 — Text final : assembler les chunks ou utiliser le champ `result` de
  l'event `type=result` ?**
  L'event `result` contient le texte complet final dans son champ `result`.
  Utiliser ce champ plutôt que la concaténation des chunks évite les risques de
  truncature ou de chunk manquant. **Recommandation : utiliser `result.result`
  comme valeur de retour de `Generate`, les chunks n'alimentent que l'UI.**
