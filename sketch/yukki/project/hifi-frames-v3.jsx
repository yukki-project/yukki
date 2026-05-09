// hifi-frames-v3.jsx — style Kiro: épuré, beaucoup d'air, peu de chrome

const D3 = window.YUKKI_DATA;
const C3 = D3.canvas;

// Icons — outline simples, pas remplis
const Ic3 = {
  bun: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8.5 3.5 C 7 6.5, 7 10, 9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15.5 3.5 C 17 6.5, 17 10, 15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="15" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10.2" cy="14.5" r="0.8" fill="currentColor" />
    <circle cx="13.8" cy="14.5" r="0.8" fill="currentColor" />
  </svg>,
  doc:    (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 3h9l5 5v13H5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" /></svg>,
  search: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  branch: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6 8v8M6 14c0-3 3-5 6-5h4" stroke="currentColor" strokeWidth="1.5" /></svg>,
  flow:   (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7.5 7l3.5 9.5M16.5 7L13 16.5" stroke="currentColor" strokeWidth="1.5" /></svg>,
  cube:   (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3 L20 7v10l-8 4-8-4V7l8-4z M12 3v8m0 0L4 7m8 4l8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  chev: (s = 10) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chevR: (s = 10) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  more: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="12.5" cy="8" r="1.2" /></svg>,
  panel: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M15 4v16" stroke="currentColor" strokeWidth="1.5" /></svg>,
};

// ── activity rail ────────────────────────────────────────
function V3Activity({ active = "doc" }) {
  const items = [
    ["doc",    Ic3.bun,    null],     // brand mark sits at top
    ["files",  Ic3.doc,    "Artefacts"],
    ["search", Ic3.search, "Search"],
    ["branch", Ic3.branch, "Sync"],
    ["run",    Ic3.flow,   "Run"],
    ["ext",    Ic3.cube,   "Methodology"],
  ];
  return (
    <aside className="v3-activity">
      {items.map(([id, ic, t], i) => (
        <button key={id}
          className={`v3-activity-btn ${id === "files" ? "is-active" : ""} ${i === 0 ? "v3-activity-brand" : ""}`}
          title={t || "yukki"}>
          {ic(20)}
        </button>
      ))}
    </aside>
  );
}

// ── sidebar ──────────────────────────────────────────────
function V3Sidebar() {
  return (
    <aside className="v3-sidebar">
      <header className="v3-sidebar-head">
        <span className="v3-sidebar-title">YUKKI</span>
        <button className="v3-icon-btn"><Ic3.more /></button>
      </header>

      <div className="v3-sb-group">
        <div className="v3-sb-group-head v3-is-open">
          <Ic3.chev />
          <span>STORIES</span>
        </div>
        <div className="v3-sb-group-body">
          {D3.artefacts.stories.slice(0, 6).map(s => (
            <a key={s.id} className={`v3-sb-item ${s.id === "CORE-002b" ? "is-active" : ""}`}>
              {s.title}
            </a>
          ))}
        </div>
      </div>

      <div className="v3-sb-group">
        <div className="v3-sb-group-head">
          <Ic3.chevR />
          <span>ANALYSIS</span>
        </div>
      </div>
      <div className="v3-sb-group">
        <div className="v3-sb-group-head">
          <Ic3.chevR />
          <span>CANVAS</span>
        </div>
      </div>
      <div className="v3-sb-group">
        <div className="v3-sb-group-head">
          <Ic3.chevR />
          <span>TESTS</span>
        </div>
      </div>
    </aside>
  );
}

// ── tab bar ──────────────────────────────────────────────
function V3Tabs() {
  return (
    <div className="v3-tabs">
      <div className="v3-tab">
        <span className="v3-tab-ic"><Ic3.doc s={14} /></span>
        <span>analysis.md</span>
        <span className="v3-tab-mod">U</span>
      </div>
      <div className="v3-tab is-active">
        <span className="v3-tab-ic"><Ic3.flow s={14} /></span>
        <span>Canvas REASONS</span>
        <span className="v3-tab-x">×</span>
      </div>
      <div className="v3-tabs-spacer" />
      <button className="v3-icon-btn"><Ic3.panel /></button>
      <button className="v3-icon-btn"><Ic3.more /></button>
    </div>
  );
}

// ── REASONS columns (clean, kiro-card style) ─────────────
function V3Reasons() {
  const cols = ["R", "E", "A", "S", "O", "N", "S"].map((l, i) => ({
    l, ...Object.values(C3.columns)[i],
  }));
  return (
    <div className="v3-reasons">
      {cols.map((col, i) => (
        <div key={i} className="v3-rcol">
          <div className="v3-rcol-head">
            <span className="v3-rcol-l">{col.l}</span>
            <span className="v3-rcol-name">{col.name}</span>
          </div>
          <div className="v3-rcol-body">
            {col.items.slice(0, 3).map((it, j) => (
              <div key={j} className="v3-ritem">{it.t}</div>
            ))}
            {col.items.length > 3 && <div className="v3-rmore">+{col.items.length - 3}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 3-step explainer cards (à la Kiro) ───────────────────
function V3Explainer() {
  const steps = [
    { n: 1, t: "Lit story + analysis", d: "Yukki agrège la story et l'analyse liées pour disposer du contexte complet." },
    { n: 2, t: "Synthétise R·E·A·S·O·N·S", d: "Sept colonnes : Requirements, Entities, Approach, Structure, Operations, Norms, Safeguards." },
    { n: 3, t: "Persiste le canvas", d: "Le résultat est validé, signé et sauvegardé dans <span class=\"v3-mono\">spdd/canvas/</span>." },
  ];
  return (
    <div className="v3-explainer">
      {steps.map(s => (
        <div key={s.n} className="v3-card">
          <div className="v3-card-head">
            <span className="v3-card-n">{s.n}</span>
            <span className="v3-card-t">{s.t}</span>
          </div>
          <div className="v3-card-d" dangerouslySetInnerHTML={{ __html: s.d }} />
        </div>
      ))}
    </div>
  );
}

// ── editor pane ──────────────────────────────────────────
function V3Editor() {
  return (
    <div className="v3-editor-scroll">
      <div className="v3-editor-pane">
        {/* action chips top — like kiro Create hook + ⌘S */}
        <div className="v3-actions">
          <button className="v3-btn v3-btn--primary">Run reasons-canvas</button>
          <span className="v3-kbd">⌘</span>
          <span className="v3-kbd">R</span>
        </div>

        <h1 className="v3-h1">Synthétiser le canvas REASONS</h1>
        <p className="v3-doc-sub">
          La commande <span className="v3-mono">yukki reasons-canvas</span> condense story et analyse en un canvas exécutable de sept colonnes : R·E·A·S·O·N·S. Décrivez la cible et lancez la génération.
        </p>

        <V3Explainer />

        <div className="v3-prompt-block">
          <label className="v3-label">Story cible</label>
          <div className="v3-input">
            CORE-002b — Commande reasons-canvas
          </div>
        </div>

        <h2 className="v3-h2">Aperçu du canvas</h2>
        <V3Reasons />
      </div>
    </div>
  );
}

// ── full frame ───────────────────────────────────────────
function F_EditorV3() {
  return (
    <div className="v3-app">
      <div className="v3-main">
        <V3Activity />
        <V3Sidebar />
        <div className="v3-editor">
          <V3Tabs />
          <V3Editor />
        </div>
      </div>
    </div>
  );
}

function F_EditorV3_Light() {
  return (
    <div className="v3-light-root" style={{ width: "100%", height: "100%" }}>
      <F_EditorV3 />
    </div>
  );
}

Object.assign(window, { F_EditorV3, F_EditorV3_Light });
