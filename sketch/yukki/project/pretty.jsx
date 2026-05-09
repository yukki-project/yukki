// pretty.jsx — a polished hi-fi single-page yukki ui

const { useState: uS, useEffect: uE } = React;

// ─── icons ───────────────────────────────────────────────────────────
const I = {
  bunny: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M8 3 C 6.5 6, 6.5 10, 8.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 3 C 17.5 6, 17.5 10, 15.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="12" cy="15" rx="6" ry="6" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <circle cx="10" cy="14.5" r="0.8" fill="currentColor" />
      <circle cx="14" cy="14.5" r="0.8" fill="currentColor" />
      <path d="M11 17 Q 12 18 13 17" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  search: (s = 14) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>),
  chev: (s = 12) => (<svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  doc: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" /></svg>),
  flow: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="12.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 4h6M4.5 5.5l2.5 5M11.5 5.5L9 10.5" stroke="currentColor" strokeWidth="1.3" /></svg>),
  graph: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 12V4M2 12h12M5 9l3-3 2 2 3-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  flask: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M6 2h4v4l3 6a1.5 1.5 0 0 1-1.4 2H4.4A1.5 1.5 0 0 1 3 12l3-6V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6 2h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>),
  book: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 3h5a2 2 0 0 1 2 2v8a1.5 1.5 0 0 0-1.5-1.5H3z M13 3H8a2 2 0 0 0-2 2v8a1.5 1.5 0 0 1 1.5-1.5H13z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>),
  gear: (s = 16) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>),
  play: (s = 12) => (<svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M3 2v8l7-4z" /></svg>),
  bell: (s = 14) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 11V7a4 4 0 0 1 8 0v4l1 1H3z M6.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>),
  history: (s = 14) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 3a5 5 0 1 1-4.6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M3.4 6V3M3.4 6h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>),
  diff: (s = 14) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M4 5.5v5a2 2 0 0 0 2 2h4M12 10.5v-5a2 2 0 0 0-2-2H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>),
  side: (s = 14) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10 3v10" stroke="currentColor" strokeWidth="1.3" /></svg>),
  close: (s = 12) => (<svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>),
  ret: (s = 12) => (<svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M9 3v3a2 2 0 0 1-2 2H3M5 6 3 8l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>),
};

const D = window.YUKKI_DATA;
const C = D.canvas;

// ── titlebar ────────────────────────────────────────────────────────
function Titlebar({ onPalette }) {
  return (
    <div className="titlebar">
      <div className="brand">
        <div className="mark" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M8 3 C 6.5 6, 6.5 10, 8.5 12" stroke="oklch(0.18 0.02 75)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M16 3 C 17.5 6, 17.5 10, 15.5 12" stroke="oklch(0.18 0.02 75)" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="12" cy="15" rx="6" ry="6" stroke="oklch(0.18 0.02 75)" strokeWidth="1.8" fill="none" />
            <circle cx="10" cy="14.5" r="0.9" fill="oklch(0.18 0.02 75)" />
            <circle cx="14" cy="14.5" r="0.9" fill="oklch(0.18 0.02 75)" />
          </svg>
        </div>
        <span className="name"><b>yukki</b><span style={{ color: "var(--fg-3)", fontFamily: "var(--ui)", fontWeight: 400, fontSize: 13, marginLeft: 4 }}>·ui</span></span>
      </div>

      <div className="crumb" style={{ marginLeft: 10 }}>
        <span>{D.repo.org}</span><span className="sep">/</span><span style={{ color: "var(--fg)" }}>{D.repo.name}</span>
        <span className="branch">{D.repo.branch}</span>
        <span className="dirty">● {D.repo.dirty} modifiés</span>
      </div>

      <div className="grow" />

      <div className="search" onClick={onPalette} style={{ cursor: "pointer" }}>
        {I.search(13)}
        <span>Rechercher artefact, commande, ref…</span>
        <kbd>⌘K</kbd>
      </div>

      <button className="iconbtn" title="History">{I.history(15)}</button>
      <button className="iconbtn" title="Notifications" style={{ position: "relative" }}>
        {I.bell(15)}
        <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      </button>
      <button className="iconbtn" title="Settings">{I.gear(15)}</button>
      <div className="avatar" title="mlp">m</div>
    </div>
  );
}

// ── activity rail ───────────────────────────────────────────────────
function Activity({ active, onPick }) {
  const items = [
    { id: "files",   icon: I.doc, badge: true },
    { id: "flow",    icon: I.flow },
    { id: "tests",   icon: I.flask },
    { id: "graph",   icon: I.graph },
    { id: "ref",     icon: I.book },
  ];
  return (
    <nav className="activity">
      {items.map(it => (
        <button key={it.id} className="a" data-active={active === it.id ? 1 : 0} onClick={() => onPick(it.id)} title={it.id}>
          {it.icon(20)}
          {it.badge && <span className="badge" />}
        </button>
      ))}
      <div className="grow" />
      <button className="a" title="Settings">{I.gear(20)}</button>
    </nav>
  );
}

// ── sidebar ─────────────────────────────────────────────────────────
function Sidebar({ active, onPick }) {
  const groups = [
    { id: "stories",   label: "Stories",   items: D.artefacts.stories },
    { id: "analysis",  label: "Analysis",  items: D.artefacts.analysis },
    { id: "prompts",   label: "Canvas",    items: D.artefacts.prompts },
    { id: "tests",     label: "Tests",     items: D.artefacts.tests },
  ];
  const [open, setOpen] = uS({ stories: true, analysis: true, prompts: true, tests: false });
  return (
    <aside className="sidebar">
      <div className="head">
        <h3>spdd <span style={{ color: "var(--fg-3)", fontStyle: "normal", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 400 }}>/</span></h3>
        <div className="sub">10 stories · 4 canvas · 2 tests</div>
        <div className="filter">
          {I.search(12)}
          <span>filtrer…</span>
        </div>
      </div>
      <div className="scroll">
        {groups.map(g => (
          <div key={g.id} className="tg" data-open={open[g.id] ? 1 : 0}>
            <div className="lbl" onClick={() => setOpen({ ...open, [g.id]: !open[g.id] })}>
              <span className="chev">{I.chev(10)}</span>
              <span>{g.label}</span>
              <span className="n">{g.items.length}</span>
            </div>
            <div className="tg-kids">
              {g.items.map(it => (
                <div key={g.id + it.id} className="row"
                  data-active={active.kind === g.id && active.id === it.id ? 1 : 0}
                  onClick={() => onPick({ kind: g.id, id: it.id })}>
                  <span className="id">{it.id}</span>
                  <span className="name">{it.title}</span>
                  <span className="dot" data-s={it.status} title={it.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── editor / canvas centerpiece ─────────────────────────────────────
function Editor({ tabs, activeIdx, onTab, onCloseTab }) {
  return (
    <main className="editor">
      <div className="tabs">
        {tabs.map((t, i) => (
          <div key={i} className="tab" data-active={i === activeIdx ? 1 : 0} onClick={() => onTab(i)}>
            {t.dirty && <span className="dirty" />}
            <span className="id">{t.id}</span>
            <span>· {t.kind}</span>
            <span className="x" onClick={(e) => { e.stopPropagation(); onCloseTab(i); }}>{I.close(10)}</span>
          </div>
        ))}
        <div className="grow" />
        <div className="editor-actions">
          <button className="iconbtn" title="Diff">{I.diff(15)}</button>
          <button className="iconbtn" title="Toggle right panel">{I.side(15)}</button>
        </div>
      </div>
      <CanvasPane />
    </main>
  );
}

function CanvasPane() {
  const cols = [
    { key: "R", ...C.columns.R }, { key: "E", ...C.columns.E }, { key: "A", ...C.columns.A },
    { key: "S1", ...C.columns.S }, { key: "O", ...C.columns.O }, { key: "N", ...C.columns.N }, { key: "S2", ...C.columns.S2 },
  ];
  return (
    <div className="canvas-pane">
      {/* hero */}
      <header className="hero">
        <div className="crumbs">spdd / prompts / <span className="act">{C.id}-{C.slug}.md</span></div>
        <h1>Canvas <em>REASONS</em> — synthétiser la spec exécutable de <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontStyle: "normal" }}>reasons-canvas</span></h1>
        <div className="meta">
          <span className="chip accent">● {C.status}</span>
          <span className="chip"><span className="k">id</span><span className="v mono">{C.id}</span></span>
          <span className="chip"><span className="k">author</span><span className="v">{C.author}</span></span>
          <span className="chip dim"><span className="k">updated</span><span className="v">{C.updated}</span></span>
          {C.methodology.map(m => <span key={m} className="chip"><span style={{ color: "var(--accent)" }}>§</span> {m}</span>)}
        </div>
        <div className="lifecycle">
          {C.lifecycle.map((s, i) => (
            <div key={s} className="step" data-done={i < 2 ? 1 : 0} data-active={s === "reviewed" ? 1 : 0}>
              <span className="pill">{s}</span>
              <span className="arrow" />
            </div>
          ))}
        </div>
      </header>

      {/* REASONS */}
      <div className="section-title">
        <h2>R-E-A-S-O-N-S</h2>
        <span className="hint">7 colonnes · {C.columns.R.count + C.columns.E.count + C.columns.A.count + C.columns.S.count + C.columns.O.count + C.columns.N.count + C.columns.S2.count} items · v0.3 → v0.4</span>
        <span className="line" />
      </div>
      <div className="reasons">
        {cols.map((col, i) => (
          <div key={i} className="col">
            <div className="head-row">
              <div>
                <div className="L">{col.letter}</div>
                <div className="nm">{col.name}</div>
              </div>
              <span className="n">{col.count}</span>
            </div>
            <div className="items">
              {col.items.map((it, j) => (
                <div key={j} className="item" data-d={it.diff || ""} data-active={it.active ? 1 : 0}>{it.t}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* operations */}
      <div className="section-title">
        <h2>Operations</h2>
        <span className="hint">{C.operations.length} signatures · liées au code généré</span>
        <span className="line" />
      </div>
      <div className="ops">
        <div className="head">
          <span>id</span><span>signature</span><span>args</span><span>file</span><span style={{ textAlign: "right" }}>tests</span>
        </div>
        {C.operations.map(op => {
          const cls = op.tests.pass === op.tests.total ? "ok" : op.tests.pass === 0 ? "bad" : "warn";
          return (
            <div key={op.id} className="op">
              <span className="id">{op.id}</span>
              <span className="sig">{op.sig}</span>
              <span className="args">{op.args} <span style={{ color: "var(--fg-4)" }}>→</span> {op.ret}</span>
              <span className="file">{op.file}</span>
              <span className={`tests ${cls}`}>{op.tests.pass}/{op.tests.total} ✓</span>
            </div>
          );
        })}
      </div>

      {/* two-col: ACs + risks */}
      <div className="two">
        <div className="card">
          <h3>Acceptance criteria</h3>
          <div className="acs">
            {C.acs.map(ac => (
              <div key={ac.id} className="ac">
                <div className="ac-h"><span className="id">{ac.id}</span><span className="t">{ac.title}</span></div>
                <div className="gwt"><div className="gw">Given</div><div className="body">{ac.given}</div></div>
                <div className="gwt"><div className="gw">When</div><div className="body">{ac.when}</div></div>
                <div className="gwt"><div className="gw">Then</div><div className="body">{ac.then}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>STRIDE risk grid</h3>
          <div>
            {C.risks.map((r, i) => (
              <div key={i} className="risk">
                <span className="lvl" data-l={r.lvl}>{r.lvl.toUpperCase()}</span>
                <div className="body"><span className="cat">{r.cat}</span>{r.body}</div>
                <span className="mit">↳ {r.mit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* norms + safeguards */}
      <div className="two">
        <div className="card">
          <h3>Norms</h3>
          <div className="kv">
            {C.norms.map(n => (
              <React.Fragment key={n.k}>
                <div className="k">{n.k}</div>
                <div className="v">{n.v}<div style={{ color: "var(--fg-3)", fontFamily: "var(--mono)", fontSize: 11, marginTop: 2 }}>↳ {n.note}</div></div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Safeguards</h3>
          <div className="kv">
            {C.safeguards.map(s => (
              <React.Fragment key={s.k}>
                <div className="k">{s.k}</div>
                <div className="v">{s.v}<div style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11, marginTop: 2 }}>↳ {s.note}</div></div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* open questions */}
      <div className="card" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
        <h3 style={{ color: "var(--accent)" }}>Open questions</h3>
        {C.openQuestions.map((q, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, padding: "8px 0", borderBottom: i < C.openQuestions.length - 1 ? "1px dashed var(--accent-line)" : "none" }}>
            <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontWeight: 700 }}>?</span>
            <div style={{ fontSize: 13 }}>{q.q}<div style={{ color: "var(--fg-3)", fontSize: 11, fontFamily: "var(--mono)", marginTop: 3 }}>↳ {q.hint}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── right rail ──────────────────────────────────────────────────────
function Rail() {
  const [tab, setTab] = uS("stream");
  return (
    <aside className="rail">
      <div className="rh">
        <button className="rt" data-active={tab === "stream" ? 1 : 0} onClick={() => setTab("stream")}>Stream</button>
        <button className="rt" data-active={tab === "inspector" ? 1 : 0} onClick={() => setTab("inspector")}>Inspector</button>
        <button className="rt" data-active={tab === "diff" ? 1 : 0} onClick={() => setTab("diff")}>Diff</button>
        <div className="grow" />
        <button className="iconbtn">{I.gear(13)}</button>
      </div>
      <div className="rb">
        {tab === "stream" && (
          <div className="stream">
            {D.stream.map((e, i) => (
              <div key={i} className="ev">
                <span className="ts">{e.t}</span>
                <span className="k" data-k={e.k}>{e.k.slice(0, 1).toUpperCase()}</span>
                <span className="msg" dangerouslySetInnerHTML={{ __html: e.msg }} />
              </div>
            ))}
          </div>
        )}
        {tab === "inspector" && (
          <div style={{ padding: 16, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>front-matter</div>
              <pre style={{ margin: 0, padding: 12, background: "var(--bg-1)", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.65, color: "var(--fg-1)" }}>
{`id: ${C.id}
slug: ${C.slug}
status: ${C.status}
author: ${C.author}
created: ${C.created}
updated: ${C.updated}
methodology:
  - ${C.methodology.join("\n  - ")}`}
              </pre>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>validation</div>
              {[
                ["all 7 sections present", true],
                ["status transition valid", true],
                ["operations linked to code", true],
                ["O5 MergeCanvas tests failing", false],
                ["safeguards explicit", true],
              ].map(([t, ok], i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", color: "var(--fg-1)" }}>
                  <span style={{ color: ok ? "var(--green)" : "var(--rose)" }}>{ok ? "✓" : "✗"}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>linked artefacts</div>
              {[
                ["story", "CORE-002b · canvas REASONS"],
                ["analysis", "CORE-002b · analysis"],
                ["tests", "CORE-002b · tests"],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", color: "var(--fg-1)", fontSize: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent)", width: 60 }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "diff" && (
          <div style={{ padding: 14, fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.7 }}>
            <div style={{ color: "var(--fg-3)", marginBottom: 8 }}>v0.3 (accepted) → v0.4 (reviewed)</div>
            <div style={{ color: "var(--accent)" }}>## E — Entities</div>
            <div style={{ color: "var(--fg-1)" }}>  Canvas, Section, Operation, Norm, Safeguard</div>
            <div style={{ background: "oklch(0.80 0.13 150 / 0.15)", padding: "0 6px", color: "var(--green)" }}>+ ProviderTranscript</div>
            <div style={{ height: 8 }} />
            <div style={{ color: "var(--accent)" }}>## S — Safeguards</div>
            <div style={{ background: "oklch(0.75 0.15 18 / 0.10)", padding: "0 6px", color: "var(--rose)", textDecoration: "line-through" }}>- timeout: pas de défaut</div>
            <div style={{ background: "var(--accent-soft)", padding: "0 6px", color: "var(--accent)" }}>~ timeout: 5min, --timeout override</div>
            <div style={{ height: 8 }} />
            <div style={{ color: "var(--accent)" }}>## R — Requirements</div>
            <div style={{ background: "oklch(0.80 0.13 150 / 0.15)", padding: "0 6px", color: "var(--green)" }}>+ Tolère un canvas partiel existant</div>
          </div>
        )}
      </div>
      <div className="stream-foot">
        <span className="live">live · claude</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--mono)", color: "var(--fg-3)" }}>1247 → 4811 tok</span>
      </div>
    </aside>
  );
}

// ── status bar ──────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div className="statusbar">
      <span className="accent">● reasons-canvas · reviewed</span>
      <span className="seg">● {D.repo.branch}</span>
      <span className="seg">↑ 0 ↓ 2</span>
      <span className="seg">{D.repo.dirty} modifiés</span>
      <span className="grow" />
      <span className="seg">claude · sonnet-4.5</span>
      <span className="seg">UTF-8</span>
      <span className="seg">LF</span>
      <span className="seg">FR</span>
      <span className="seg">ln 142, col 8</span>
    </div>
  );
}

// ── ⌘K palette ──────────────────────────────────────────────────────
function Palette({ open, onClose }) {
  if (!open) return null;
  const results = [
    { k: "cmd", t: "yukki reasons-canvas", h: "génère le canvas R-E-A-S-O-N-S depuis story+analyse", sel: true },
    { k: "canvas", t: "CORE-002b · reasons-canvas", h: "spdd/prompts/CORE-002b-reasons-canvas.md" },
    { k: "story", t: "CORE-002b · canvas REASONS", h: "spdd/stories/CORE-002b-…md" },
    { k: "ref", t: "spdd/methodology/reasons-canvas.md", h: "documentation méthodologique" },
    { k: "cmd", t: "yukki prompt-update", h: "corriger un canvas existant" },
    { k: "cmd", t: "yukki sync", h: "recapter après refactor humain" },
  ];
  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="pi">
          <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 14 }}>⌘</span>
          <input autoFocus placeholder="Rechercher artefact, commande, ref…" defaultValue="reasons-canvas" />
          <kbd>esc</kbd>
        </div>
        <div className="results">
          {results.map((r, i) => (
            <div key={i} className="pres" data-sel={r.sel ? 1 : 0}>
              <span className="k">{r.k}</span>
              <div>
                <div className="t">{r.t}</div>
                <div className="h">{r.h}</div>
              </div>
              {r.sel && <span className="ret">↵</span>}
            </div>
          ))}
        </div>
        <div className="pf">
          <span>↑↓ naviguer</span>
          <span>↵ exécuter</span>
          <span>⇥ filtrer</span>
        </div>
      </div>
    </div>
  );
}

// ── run drawer ──────────────────────────────────────────────────────
function RunDrawer({ open, onClose, onOpen }) {
  return (
    <>
      <button className="run-fab" onClick={open ? onClose : onOpen} data-open={open ? 1 : 0}>
        {open ? I.close(13) : I.play(11)}
        <span>{open ? "fermer" : "lancer reasons-canvas"}</span>
      </button>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      {open && (
        <div className="drawer">
          <div className="dh">
            <span style={{ color: "var(--accent)" }}>{I.play(13)}</span>
            <span className="t">$ <span className="accent">yukki</span> generate <span style={{ color: "var(--fg-1)" }}>CORE-002b</span></span>
            <span className="grow" />
            <span className="pill">running</span>
          </div>
          <div className="db">
            {[
              ["O1", "BuildContext", "internal/workflow/canvas.go", "done"],
              ["O2", "RenderPrompt", "internal/workflow/canvas.go", "done"],
              ["O3", "ParseCanvas", "internal/canvas/parser.go", "running"],
              ["O4", "ValidateCanvas", "internal/canvas/validator.go", "queued"],
              ["O5", "MergeCanvas", "internal/canvas/merge.go", "queued"],
              ["O6", "WriteAtomic", "internal/artifacts/writer.go", "queued"],
            ].map(([id, sig, file, s], i) => (
              <div key={i} className="step" data-s={s}>
                <span className="ic">{s === "done" ? "✓" : s === "running" ? "▸" : "·"}</span>
                <div>
                  <div className="sig">{id} · {sig}</div>
                  <div className="file">{file}</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="df">
            <div className="progress"><div /></div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>3 / 6 · ~12s</span>
            <button className="btn">stop</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── tweaks panel ────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accentHue": 65,
  "showRail": true,
  "density": "regular"
}/*EDITMODE-END*/;

function TweaksWiring() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  uE(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    document.documentElement.style.setProperty("--accent", `oklch(0.82 0.155 ${t.accentHue})`);
    document.documentElement.style.setProperty("--accent-2", `oklch(0.72 0.155 ${t.accentHue})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(0.82 0.155 ${t.accentHue} / 0.14)`);
    document.documentElement.style.setProperty("--accent-line", `oklch(0.82 0.155 ${t.accentHue} / 0.40)`);
    document.documentElement.style.setProperty("--accent-fg", t.theme === "dark" ? "oklch(0.18 0.02 75)" : "oklch(0.99 0 0)");
    document.body.dataset.noRight = !t.showRail ? "1" : "0";
  }, [t.theme, t.accentHue, t.showRail]);

  // Toggle right rail on the .main element
  uE(() => {
    const m = document.querySelector(".main");
    if (m) m.setAttribute("data-no-right", t.showRail ? 0 : 1);
  }, [t.showRail]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Apparence">
        <TweakRadio label="Thème" value={t.theme} onChange={v => setTweak("theme", v)}
          options={[{ label: "Dark", value: "dark" }, { label: "Light", value: "light" }]} />
        <TweakSlider label="Accent (hue)" min={0} max={360} step={1} value={t.accentHue}
          onChange={v => setTweak("accentHue", v)} />
      </TweakSection>
      <TweakSection title="Layout">
        <TweakToggle label="Provider stream visible" value={t.showRail} onChange={v => setTweak("showRail", v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

// ── App ─────────────────────────────────────────────────────────────
function App() {
  const [paletteOpen, setPaletteOpen] = uS(false);
  const [runOpen, setRunOpen] = uS(false);
  const [activity, setActivity] = uS("files");
  const [activeArt, setActiveArt] = uS({ kind: "prompts", id: "CORE-002b" });

  const tabs = [
    { kind: "stories",  id: "CORE-002b" },
    { kind: "analysis", id: "CORE-002b" },
    { kind: "prompts",  id: "CORE-002b", dirty: true },
    { kind: "tests",    id: "CORE-002b" },
  ];
  const [activeTab, setActiveTab] = uS(2);
  const [tabList, setTabList] = uS(tabs);

  uE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(true); }
      else if (e.key === "Escape") { setPaletteOpen(false); setRunOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Titlebar onPalette={() => setPaletteOpen(true)} />
      <div className="main">
        <Activity active={activity} onPick={setActivity} />
        <Sidebar active={activeArt} onPick={a => { setActiveArt(a); }} />
        <Editor tabs={tabList} activeIdx={activeTab} onTab={setActiveTab}
          onCloseTab={i => setTabList(tabList.filter((_, j) => j !== i))} />
        <Rail />
      </div>
      <StatusBar />
      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <RunDrawer open={runOpen} onOpen={() => setRunOpen(true)} onClose={() => setRunOpen(false)} />
      <TweaksWiring />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
