// data.js — sample SPDD data for the prototype

window.YUKKI_DATA = {
  repo: { org: "yukki-dev", name: "yukki", branch: "main", dirty: 3 },
  artefacts: {
    stories: [
      { id: "CORE-001", slug: "cli-story-via-claude",  title: "CLI yukki story orchestre Claude", status: "implemented" },
      { id: "CORE-002a", slug: "analysis-command",     title: "Commande analysis : risques + edge cases",  status: "accepted"   },
      { id: "CORE-002b", slug: "reasons-canvas",       title: "Commande reasons-canvas (centre du système)", status: "reviewed"   },
      { id: "CORE-002c", slug: "generate-cmd",          title: "Commande generate : code + tests depuis canvas", status: "draft"      },
      { id: "CORE-002d", slug: "api-test-cmd",          title: "Commande api-test : valide endpoints REST",      status: "draft"      },
      { id: "CORE-002e", slug: "prompt-update",         title: "Commande prompt-update : corriger le canvas",     status: "draft"      },
      { id: "CORE-002f", slug: "sync-cmd",              title: "Commande sync : recapter après refactor humain",  status: "draft"      },
      { id: "META-006",  slug: "naming-format",         title: "Format de nommage canonical des artefacts",       status: "reviewed"   },
      { id: "UI-001",    slug: "canvas-editor",         title: "Canvas editor graphique (TUI ou GUI)",            status: "draft"      },
      { id: "INT-001",   slug: "copilot-provider",      title: "Provider Copilot CLI",                            status: "needs-update"},
    ],
    analysis: [
      { id: "CORE-001",  slug: "cli-story-via-claude",  title: "Analyse — story command",       status: "accepted" },
      { id: "CORE-002a", slug: "analysis-command",      title: "Analyse — analysis command",     status: "accepted" },
      { id: "CORE-002b", slug: "reasons-canvas",        title: "Analyse — canvas REASONS",       status: "reviewed" },
      { id: "META-006",  slug: "naming-format",         title: "Analyse — naming",                status: "draft"    },
    ],
    prompts: [
      { id: "CORE-001",  slug: "cli-story-via-claude",  title: "Canvas REASONS — CORE-001",      status: "implemented" },
      { id: "CORE-002a", slug: "analysis-command",      title: "Canvas REASONS — CORE-002a",     status: "accepted" },
      { id: "CORE-002b", slug: "reasons-canvas",        title: "Canvas REASONS — CORE-002b",     status: "reviewed", active: true },
      { id: "META-006",  slug: "naming-format",         title: "Canvas REASONS — META-006",      status: "draft"    },
    ],
    tests: [
      { id: "CORE-001",  slug: "cli-story-via-claude",  title: "Tests — story command",          status: "implemented" },
      { id: "CORE-002a", slug: "analysis-command",      title: "Tests — analysis command",       status: "accepted" },
    ],
  },

  // The active artefact (canvas REASONS for CORE-002b)
  canvas: {
    id: "CORE-002b",
    title: "yukki reasons-canvas — synthétiser la spec exécutable",
    slug: "reasons-canvas",
    path: "spdd/prompts/CORE-002b-reasons-canvas.md",
    status: "reviewed",
    author: "mlp",
    created: "2026-04-22",
    updated: "2026-04-30 14:02",
    lifecycle: ["draft", "reviewed", "accepted", "implemented", "synced"],
    methodology: ["DDD-tactical", "STRIDE", "BVA+EP", "Y-Statement"],
    ac_count: 6,
    ops_count: 8,
    safeguards_count: 5,

    columns: {
      R: {
        name: "Requirements", letter: "R", count: 4,
        items: [
          { t: "Lit la story + l'analyse liées",                        diff: null },
          { t: "Construit un canvas R-E-A-S-O-N-S complet",              diff: null },
          { t: "Doit pouvoir être ré-exécuté (idempotent)",              diff: "mod" },
          { t: "Tolère un canvas partiel existant (merge)",              diff: "add" },
        ]
      },
      E: {
        name: "Entities", letter: "E", count: 5,
        items: [
          { t: "Canvas (aggregate root)",       diff: null },
          { t: "Section { letter, items }",     diff: null },
          { t: "Operation (signature, tests)",  diff: null },
          { t: "Norm, Safeguard",               diff: null },
          { t: "ProviderTranscript",            diff: "add" },
        ]
      },
      A: {
        name: "Approach", letter: "A", count: 3,
        items: [
          { t: "1. read story+analysis → context",  diff: null },
          { t: "2. inject prompt template",          diff: null },
          { t: "3. parse + validate response",       diff: "mod" },
        ]
      },
      S: {
        name: "Structure", letter: "S", count: 4,
        items: [
          { t: "internal/workflow/canvas.go",       diff: null },
          { t: "internal/workflow/prompts/canvas.tmpl", diff: null },
          { t: "internal/canvas/parser.go",         diff: "add" },
          { t: "spdd/templates/prompt.md",           diff: null },
        ]
      },
      O: {
        name: "Operations", letter: "O", count: 8,
        items: [
          { t: "BuildContext(storyID) (Context, error)",    diff: null, active: true },
          { t: "RenderPrompt(ctx, tmpl) (string, error)",   diff: null },
          { t: "ParseCanvas(rsp) (Canvas, error)",          diff: "mod" },
          { t: "ValidateCanvas(c) error",                    diff: null },
          { t: "MergeCanvas(old, new) Canvas",               diff: "add" },
          { t: "WriteAtomic(path, c) error",                 diff: null },
          { t: "BumpStatus(c, to) error",                    diff: null },
          { t: "EmitNext(c) string",                         diff: null },
        ]
      },
      N: {
        name: "Norms", letter: "N", count: 4,
        items: [
          { t: "Logging: slog text + JSON via flag",  diff: null },
          { t: "Errors: wrapped %w + sentinel",       diff: null },
          { t: "I18n: messages en anglais (logs)",    diff: null },
          { t: "CLI output: FR par défaut, EN flag",  diff: "add" },
        ]
      },
      S2: {
        name: "Safeguards", letter: "S", count: 5,
        items: [
          { t: "PII: jamais de prompt → log info",        diff: null },
          { t: "Atomic write: rename, jamais partiel",     diff: null },
          { t: "Timeout: 5min provider par défaut",        diff: "mod" },
          { t: "Exit codes: 0/1/2/3 sémantiques",          diff: null },
          { t: "No telemetry — ever.",                      diff: null },
        ]
      },
    },

    operations: [
      { id: "O1", sig: "BuildContext", args: "storyID string",        ret: "(Context, error)",  file: "internal/workflow/canvas.go",      tests: { pass: 4, total: 4 } },
      { id: "O2", sig: "RenderPrompt", args: "ctx Context, tmpl Tmpl", ret: "(string, error)",   file: "internal/workflow/canvas.go",      tests: { pass: 3, total: 3 } },
      { id: "O3", sig: "ParseCanvas",  args: "rsp string",             ret: "(Canvas, error)",    file: "internal/canvas/parser.go",         tests: { pass: 5, total: 7 } },
      { id: "O4", sig: "ValidateCanvas", args: "c Canvas",             ret: "error",              file: "internal/canvas/validator.go",      tests: { pass: 6, total: 6 } },
      { id: "O5", sig: "MergeCanvas",  args: "old, new Canvas",        ret: "Canvas",             file: "internal/canvas/merge.go",          tests: { pass: 0, total: 4 } },
      { id: "O6", sig: "WriteAtomic",  args: "path string, c Canvas",  ret: "error",              file: "internal/artifacts/writer.go",      tests: { pass: 2, total: 2 } },
      { id: "O7", sig: "BumpStatus",   args: "c *Canvas, to Status",   ret: "error",              file: "internal/canvas/lifecycle.go",      tests: { pass: 3, total: 3 } },
      { id: "O8", sig: "EmitNext",     args: "c Canvas",                ret: "string",             file: "internal/workflow/canvas.go",      tests: { pass: 1, total: 1 } },
    ],

    risks: [
      { cat: "STRIDE — Spoofing",        lvl: "lo", body: "Un attaquant fournit un canvas malformé via stdin pour fooler le parser.",  mit: "ValidateCanvas — schéma strict" },
      { cat: "STRIDE — Tampering",       lvl: "md", body: "Drift entre canvas en mémoire et fichier sur disque pendant write.",         mit: "WriteAtomic via rename" },
      { cat: "STRIDE — Repudiation",     lvl: "lo", body: "Aucun lien entre canvas et auteur humain.",                                   mit: "Front-matter author + git blame" },
      { cat: "STRIDE — Info disclosure", lvl: "md", body: "Prompt injecté contient potentiellement des secrets repo.",                   mit: "Filtre .env / *.key avant injection" },
      { cat: "STRIDE — Denial of service", lvl: "md", body: "Provider hangs → blocage CLI infini.",                                       mit: "Timeout 5min + signal SIGTERM" },
    ],

    norms: [
      { k: "logging",   v: "log/slog, text par défaut, JSON via --log=json. Pas de fmt.Println.", note: "spdd/methodology/logging.md" },
      { k: "errors",    v: "Wrapped via %w, sentinels exportés (ErrCanvasMalformed, ErrTimeout).", note: "Pas de panic au niveau cmd/" },
      { k: "naming",    v: "snake_case fichiers, PascalCase exportés Go, kebab-case slugs spdd/.",  note: "Aligned with TODO.md META-006" },
      { k: "i18n",      v: "Logs en anglais. Sortie utilisateur FR par défaut, --lang=en.",         note: "Décidé en analyse" },
    ],

    safeguards: [
      { k: "no PII",        v: "Jamais de log de prompt en niveau info. Niveau debug uniquement, redacté.",                  note: "MUST" },
      { k: "atomic write",  v: "Tous les artefacts: temp file + rename. Aucun fichier partiel.",                              note: "MUST" },
      { k: "timeout",       v: "DefaultClaudeTimeout = 5*time.Minute. Override par --timeout.",                                note: "SHOULD" },
      { k: "exit codes",    v: "0=ok, 1=user, 2=provider, 3=fs. Distingue les classes d'échec côté CI.",                      note: "MUST" },
      { k: "no telemetry",  v: "Aucun appel réseau hors provider. Ce sera matérialisé dans CONTRIBUTING.md.",                  note: "MUST" },
    ],

    acs: [
      { id: "AC-1", title: "Canvas généré idempotent",
        given: "Une story CORE-002b et son analyse en status accepted",
        when:  "L'utilisateur lance yukki reasons-canvas CORE-002b deux fois",
        then:  "Le second run préserve les éditions humaines (merge non destructif)",
      },
      { id: "AC-2", title: "Validation du format",
        given: "Une réponse provider sans section Safeguards",
        when:  "ParseCanvas est appelé",
        then:  "Erreur ErrCanvasMalformed et exit code 2",
      },
      { id: "AC-3", title: "Status lifecycle respecté",
        given: "Un canvas en status accepted",
        when:  "BumpStatus(canvas, draft) est appelé",
        then:  "Erreur — transition arrière interdite",
      },
    ],

    openQuestions: [
      { q: "MergeCanvas — stratégie sur les sections totalement remplacées par l'humain ?", hint: "Décision attendue lors de la review" },
      { q: "Timeout configurable globalement vs par-commande ?",                              hint: "Voir Safeguards" },
    ],
  },

  // Provider stream (live agent activity)
  stream: [
    { t: "14:01:42", k: "prompt", msg: "Injecting system prompt: <b>spdd/templates/prompt.md</b> (1247 tokens)" },
    { t: "14:01:43", k: "tool",   msg: "read spdd/stories/CORE-002b-reasons-canvas.md" },
    { t: "14:01:43", k: "tool",   msg: "read spdd/analysis/CORE-002b-reasons-canvas.md" },
    { t: "14:01:44", k: "rsp",    msg: "stream chunk → <b>R: Requirements</b> (4 items)" },
    { t: "14:01:46", k: "rsp",    msg: "stream chunk → <b>E: Entities</b> (5 items, ProviderTranscript flagged new)" },
    { t: "14:01:48", k: "rsp",    msg: "stream chunk → <b>A: Approach</b> (3 items)" },
    { t: "14:01:51", k: "rsp",    msg: "stream chunk → <b>S: Structure</b>, <b>O: Operations</b> (8)" },
    { t: "14:01:54", k: "rsp",    msg: "stream chunk → <b>N: Norms</b>, <b>S: Safeguards</b>" },
    { t: "14:01:56", k: "tool",   msg: "ValidateCanvas → ok (no missing section)" },
    { t: "14:01:56", k: "tool",   msg: "MergeCanvas(prev, new) → 2 mods, 4 adds, 0 dels" },
    { t: "14:01:57", k: "ok",     msg: "wrote <b>spdd/prompts/CORE-002b-reasons-canvas.md</b> (atomic)" },
    { t: "14:01:57", k: "warn",   msg: "status not bumped — review pending" },
  ],
};
