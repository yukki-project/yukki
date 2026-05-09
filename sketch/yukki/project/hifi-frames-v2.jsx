// hifi-frames-v2.jsx — sobre, Inter + JetBrains Mono, style Linear/GitHub

const D2 = window.YUKKI_DATA;
const C2 = D2.canvas;

// ── icons ─────────────────────────────────────────────────────────
const Ic = {
  file: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 2h6.5L13 5v9H3V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 2v3.5h4" stroke="currentColor" strokeWidth="1.3" /></svg>,
  flow: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 5l2 5M11 5l-2 5" stroke="currentColor" strokeWidth="1.3" /></svg>,
  test: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 13L6 9 9 11 13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="13" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3" /></svg>,
  graph: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 14V2M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><rect x="4" y="8" width="2" height="4" stroke="currentColor" strokeWidth="1.2" /><rect x="7" y="5" width="2" height="7" stroke="currentColor" strokeWidth="1.2" /><rect x="10" y="9" width="2" height="3" stroke="currentColor" strokeWidth="1.2" /></svg>,
  ref: (s = 14) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 2.5h7v11H3z M3 2.5l-.5.5v10l.5.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5 5h4M5 7.5h4M5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
  search: (s = 12) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" /><path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
  chev: (s = 9) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  bun: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M8.5 3.5 C 7 6.5, 7 10, 9 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M15.5 3.5 C 17 6.5, 17 10, 15 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="12" cy="15" r="5.5" stroke="currentColor" strokeWidth="1.7" /><circle cx="10.2" cy="14.5" r="0.8" fill="currentColor" /><circle cx="13.8" cy="14.5" r="0.8" fill="currentColor" /></svg>,
  plus: (s = 12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  play: (s = 11) => <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M3 2.5v7L9.5 6z" /></svg>,
};

// ── status mapping ────────────────────────────────────────────────
const ST = {
  draft:          { label: "draft",      tone: "muted" },
  reviewed:       { label: "reviewed",   tone: "blue" },
  accepted:       { label: "accepted",   tone: "green" },
  implemented:    { label: "implemented",tone: "green" },
  "needs-update": { label: "needs sync", tone: "rose" },
  synced:         { label: "synced",     tone: "blue" },
};

const StatusDot = ({ s }) => {
  const c = ST[s]?.tone || "muted";
  return <span className={`v2-dot v2-dot--${c}`} />;
};

const StatusPill = ({ s }) => {
  const m = ST[s] || ST.draft;
  return (
    <span className={`v2-pill v2-pill--${m.tone}`}>
      <span className={`v2-dot v2-dot--${m.tone}`} />
      {m.label}
    </span>
  );
};

// ── title bar ─────────────────────────────────────────────────────
function TitleBar2() {
  return (
    <header className="v2-titlebar">
      <div className="v2-brand">
        <span className="v2-brand-mark"><Ic.bun s={14} /></span>
        <span className="v2-brand-name">yukki</span>
        <span className="v2-brand-sub">ui</span>
      </div>
      <span className="v2-sep" />
      <nav className="v2-crumbs">
        <span className="v2-crumb-muted">yukki-dev</span>
        <span className="v2-crumb-slash">/</span>
        <span>yukki</span>
        <span className="v2-branch">main</span>
        <span className="v2-crumb-muted v2-crumb-tiny">3 modifiés</span>
      </nav>
      <span className="v2-grow" />
      <div className="v2-search">
        <span className="v2-search-ic"><Ic.search /></span>
        <span>Rechercher artefact, commande</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="v2-btn v2-btn--ghost"><Ic.plus /> story</button>
      <button className="v2-btn v2-btn--primary"><Ic.play /> run</button>
    </header>
  );
}

// ── activity rail ─────────────────────────────────────────────────
function Activity2({ active = "files" }) {
  const items = [
    ["files", Ic.file, "Artefacts"],
    ["flow",  Ic.flow, "Pipeline"],
    ["test",  Ic.test, "Tests"],
    ["graph", Ic.graph, "Métriques"],
    ["ref",   Ic.ref, "Methodology"],
  ];
  return (
    <aside className="v2-activity">
      {items.map(([id, ic, t]) => (
        <button key={id} className={`v2-activity-btn ${id === active ? "is-active" : ""}`} title={t}>
          {ic(15)}
        </button>
      ))}
    </aside>
  );
}

// ── sidebar ──────────────────────────────────────────────────────
function Sidebar2() {
  const groups = [
    { lbl: "stories",  count: D2.artefacts.stories.length, items: D2.artefacts.stories.slice(0, 6) },
    { lbl: "analysis", count: D2.artefacts.analysis.length, items: D2.artefacts.analysis.slice(0, 3) },
    { lbl: "canvas",   count: D2.artefacts.prompts.length,  items: D2.artefacts.prompts },
    { lbl: "tests",    count: D2.artefacts.tests.length,    items: [] },
  ];
  return (
    <aside className="v2-sidebar">
      <div className="v2-sidebar-head">
        <div className="v2-sidebar-title">spdd<span className="v2-sidebar-slash">/</span></div>
        <span className="v2-sidebar-meta">10 stories · 4 canvas · 2 tests</span>
      </div>
      <div className="v2-filter">
        <Ic.search s={11} />
        <span>filter…</span>
      </div>
      <div className="v2-sidebar-scroll">
        {groups.map((g, gi) => (
          <div key={gi} className="v2-tg">
            <div className="v2-tg-head">
              <Ic.chev />
              <span>{g.lbl}</span>
              <span className="v2-tg-count">{g.count}</span>
            </div>
            {g.items.map(it => {
              const active = g.lbl === "canvas" && it.id === "CORE-002b";
              return (
                <a key={it.id} className={`v2-row ${active ? "is-active" : ""}`}>
                  <span className="v2-row-id">{it.id}</span>
                  <span className="v2-row-name">{it.title}</span>
                  <StatusDot s={it.status} />
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── tabs ──────────────────────────────────────────────────────────
function Tabs2() {
  const tabs = [
    { id: "story",     n: "story",     active: false, dirty: false },
    { id: "analysis",  n: "analysis",  active: false, dirty: false },
    { id: "canvas",    n: "canvas",    active: true,  dirty: true  },
    { id: "tests",     n: "tests",     active: false, dirty: false },
  ];
  return (
    <div className="v2-tabs">
      {tabs.map(t => (
        <div key={t.id} className={`v2-tab ${t.active ? "is-active" : ""}`}>
          <span className="v2-tab-id">CORE-002b</span>
          <span className="v2-tab-sep">·</span>
          <span>{t.n}</span>
          {t.dirty && <span className="v2-tab-dot" />}
          <span className="v2-tab-x">×</span>
        </div>
      ))}
    </div>
  );
}

// ── REASONS canvas (simplified) ───────────────────────────────────
function Reasons2() {
  const cols = ["R", "E", "A", "S", "O", "N", "S"].map((l, i) => ({
    l, ...Object.values(C2.columns)[i],
  }));
  return (
    <section className="v2-section">
      <header className="v2-section-head">
        <h2 className="v2-h2">R · E · A · S · O · N · S</h2>
        <span className="v2-section-meta">v0.3 → v0.4</span>
        <span className="v2-section-meta v2-section-meta--green">+6</span>
        <span className="v2-section-meta v2-section-meta--blue">~3</span>
      </header>
      <div className="v2-reasons">
        {cols.map((col, i) => (
          <div key={i} className="v2-col">
            <div className="v2-col-head">
              <span className="v2-col-l">{col.l}</span>
              <span className="v2-col-name">{col.name}</span>
              <span className="v2-col-n">{col.count}</span>
            </div>
            <div className="v2-col-body">
              {col.items.map((it, j) => (
                <div key={j} className={`v2-item ${it.diff ? `v2-item--${it.diff}` : ""}`}>
                  {it.diff === "add" && <span className="v2-item-mk v2-item-mk--add">+</span>}
                  {it.diff === "mod" && <span className="v2-item-mk v2-item-mk--mod">~</span>}
                  <span>{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── operations table ──────────────────────────────────────────────
function Ops2() {
  return (
    <section className="v2-section">
      <header className="v2-section-head">
        <h2 className="v2-h2">Operations</h2>
        <span className="v2-section-meta">{C2.operations.length} signatures · 4/8 implementées</span>
      </header>
      <div className="v2-table">
        <div className="v2-tr v2-tr--head">
          <span>id</span><span>signature</span><span>args → ret</span><span>file</span><span className="v2-ta-r">tests</span>
        </div>
        {C2.operations.slice(0, 6).map(op => {
          const cls = op.tests.pass === op.tests.total ? "ok" : op.tests.pass === 0 ? "bad" : "warn";
          return (
            <div key={op.id} className="v2-tr">
              <span className="v2-mono v2-tr-id">{op.id}</span>
              <span className="v2-mono">{op.sig}</span>
              <span className="v2-mono v2-mute">{op.args} → {op.ret}</span>
              <span className="v2-mono v2-mute-2">{op.file}</span>
              <span className={`v2-mono v2-ta-r v2-tests v2-tests--${cls}`}>{op.tests.pass}/{op.tests.total}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── ACs ──────────────────────────────────────────────────────────
function Acs2() {
  return (
    <section className="v2-section">
      <header className="v2-section-head">
        <h2 className="v2-h2">Acceptance criteria</h2>
        <span className="v2-section-meta">{C2.acs.length} · Given/When/Then</span>
      </header>
      <div className="v2-acs">
        {C2.acs.slice(0, 3).map(a => (
          <div key={a.id} className="v2-ac">
            <div className="v2-ac-head">
              <span className="v2-mono v2-ac-id">{a.id}</span>
              <span>{a.title}</span>
            </div>
            <div className="v2-gwt"><span className="v2-gwt-k">given</span><span>{a.given}</span></div>
            <div className="v2-gwt"><span className="v2-gwt-k">when</span><span>{a.when}</span></div>
            <div className="v2-gwt"><span className="v2-gwt-k">then</span><span>{a.then}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── editor canvas ─────────────────────────────────────────────────
function EditorCanvas2() {
  return (
    <div className="v2-editor-pane">
      {/* breadcrumb above title */}
      <div className="v2-doc-crumbs">
        <span>spdd</span><span>/</span><span>prompts</span><span>/</span>
        <span className="v2-doc-crumbs-active">CORE-002b-reasons-canvas.md</span>
      </div>

      <header className="v2-doc-head">
        <h1 className="v2-h1">Canvas REASONS — reasons-canvas</h1>
        <p className="v2-doc-sub">Synthétiser la spec exécutable de la commande <span className="v2-mono">yukki reasons-canvas</span>.</p>

        <div className="v2-doc-meta">
          <StatusPill s={C2.status} />
          <span className="v2-meta-row">
            <span className="v2-meta-k">id</span>
            <span className="v2-mono">{C2.id}</span>
          </span>
          <span className="v2-meta-row">
            <span className="v2-meta-k">updated</span>
            <span>14:02</span>
          </span>
          <span className="v2-meta-row">
            <span className="v2-meta-k">refs</span>
            {C2.methodology.slice(0, 3).map(m => <span key={m} className="v2-tag">{m}</span>)}
          </span>
        </div>

        {/* compact lifecycle */}
        <div className="v2-lifecycle">
          {C2.lifecycle.map((s, i) => {
            const active = s === C2.status;
            const done = i < C2.lifecycle.indexOf(C2.status);
            return (
              <React.Fragment key={s}>
                <span className={`v2-life-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
                  {s}
                </span>
                {i < C2.lifecycle.length - 1 && <span className="v2-life-sep">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </header>

      <Reasons2 />
      <Ops2 />
      <Acs2 />
    </div>
  );
}

// ── right rail ────────────────────────────────────────────────────
function RightRail2() {
  return (
    <aside className="v2-rail">
      <div className="v2-rail-tabs">
        <button className="v2-rail-tab is-active">Stream</button>
        <button className="v2-rail-tab">Inspector</button>
        <button className="v2-rail-tab">Diff</button>
      </div>
      <div className="v2-rail-body">
        <div className="v2-stream">
          {D2.stream.slice(0, 10).map((e, i) => {
            const tone = e.k === "ok" ? "green" : e.k === "warn" ? "rose" : e.k === "tool" ? "blue" : e.k === "rsp" ? "violet" : "muted";
            return (
              <div key={i} className="v2-stream-row">
                <span className="v2-mono v2-stream-ts">{e.t.slice(3)}</span>
                <span className={`v2-stream-k v2-stream-k--${tone}`}>{e.k}</span>
                <span className="v2-mono v2-stream-msg" dangerouslySetInnerHTML={{ __html: e.msg }} />
              </div>
            );
          })}
        </div>
      </div>
      <footer className="v2-rail-foot">
        <span className="v2-mono v2-mute">claude · sonnet-4.5</span>
        <span className="v2-grow" />
        <span className="v2-mono v2-mute">1247→4811 tok</span>
      </footer>
    </aside>
  );
}

// ── status bar ────────────────────────────────────────────────────
function StatusBar2() {
  return (
    <footer className="v2-statusbar">
      <span className="v2-status-block">
        <StatusDot s="reviewed" />
        <span>reasons-canvas</span>
        <span className="v2-mute">·</span>
        <span>reviewed</span>
      </span>
      <span>main</span>
      <span className="v2-mute">↑0 ↓2</span>
      <span className="v2-mute">3 modifiés</span>
      <span className="v2-grow" />
      <span className="v2-mute">UTF-8</span>
      <span className="v2-mute">FR</span>
      <span className="v2-mute">Ln 142, Col 8</span>
    </footer>
  );
}

// ── full frame ────────────────────────────────────────────────────
function F_EditorV2() {
  return (
    <div className="v2-app">
      <TitleBar2 />
      <div className="v2-main">
        <Activity2 />
        <Sidebar2 />
        <div className="v2-editor">
          <Tabs2 />
          <div className="v2-editor-scroll">
            <EditorCanvas2 />
          </div>
        </div>
        <RightRail2 />
      </div>
      <StatusBar2 />
    </div>
  );
}

// light wrapper
function F_EditorV2_Light() {
  return (
    <div className="v2-light-root" style={{ width: "100%", height: "100%" }}>
      <F_EditorV2 />
    </div>
  );
}

Object.assign(window, { F_EditorV2, F_EditorV2_Light });
