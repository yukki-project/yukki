// hifi-frames.jsx — polished hi-fi frames (no wireframe), shown on a Figma-like canvas

const D = window.YUKKI_DATA;
const C = D.canvas;

// ── tiny rabbit mark ──────────────────────────────────────────────
const Bun = ({ s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3 C 6.5 6, 6.5 10, 8.5 12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16 3 C 17.5 6, 17.5 10, 15.5 12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    <ellipse cx="12" cy="15" rx="6" ry="6" stroke={c} strokeWidth="1.6" fill="none" />
    <circle cx="10" cy="14.5" r="0.9" fill={c} />
    <circle cx="14" cy="14.5" r="0.9" fill={c} />
  </svg>
);

const TitleBar = ({ light }) => (
  <div style={{
    height: 48, padding: "0 16px",
    display: "flex", alignItems: "center", gap: 14,
    borderBottom: "1px solid var(--line)",
    background: light ? "oklch(1 0 0 / 0.7)" : "oklch(0.18 0.015 250 / 0.6)",
    backdropFilter: "blur(20px)",
  }}>
    <div className="mark-tile"><Bun s={15} c="oklch(0.16 0.02 250)" /></div>
    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>
      <b style={{ fontFamily: "var(--ui)", fontStyle: "normal", fontWeight: 600, fontSize: 14 }}>yukki</b>
      <span style={{ color: "var(--fg-3)", fontFamily: "var(--ui)", fontStyle: "normal", fontSize: 12, marginLeft: 4 }}>·ui</span>
    </div>
    <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 6 }}>
      yukki-dev <span style={{ color: "var(--fg-4)" }}>/</span>
      <span style={{ color: "var(--fg)" }}>yukki</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", border: "1px solid var(--line)", borderRadius: 999, background: "var(--bg-2)", marginLeft: 6 }}>
        <span className="dot green" /> main
      </span>
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ width: 280, height: 28, padding: "0 10px", display: "flex", alignItems: "center", gap: 8, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-3)", fontSize: 12 }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      <span>Rechercher artefact, commande, ref…</span>
      <kbd style={{ marginLeft: "auto" }}>⌘K</kbd>
    </div>
    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(140deg,var(--plum),var(--blue))", color: "white", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 600 }}>m</div>
  </div>
);

const Activity = ({ active = "files" }) => {
  const items = [
    ["files", "M3 2h7l3 3v9H3z"],
    ["flow", null], ["tests", null], ["graph", null], ["ref", null],
  ];
  return (
    <div style={{ width: 56, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4, background: "var(--bg)" }}>
      {items.map(([id]) => (
        <div key={id} style={{
          width: 36, height: 36, borderRadius: 9,
          display: "grid", placeItems: "center",
          color: id === active ? "var(--fg)" : "var(--fg-3)",
          background: id === active ? "var(--bg-2)" : "transparent",
          boxShadow: id === active ? "inset 0 0 0 1px var(--line)" : "none",
          position: "relative",
        }}>
          {id === active && <span style={{ position: "absolute", left: -12, top: 7, bottom: 7, width: 3, background: "var(--accent)", borderRadius: "0 3px 3px 0" }} />}
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <path d="M3 2h7l3 3v9H3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      ))}
    </div>
  );
};

const Sidebar = () => {
  const groups = [
    { lbl: "Stories", n: 10, items: D.artefacts.stories.slice(0, 6) },
    { lbl: "Analysis", n: 4, items: D.artefacts.analysis.slice(0, 3) },
    { lbl: "Canvas", n: 4, items: D.artefacts.prompts },
    { lbl: "Tests", n: 2 },
  ];
  return (
    <div style={{ width: 260, borderRight: "1px solid var(--line)", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 8px" }}>
        <div className="serif" style={{ fontStyle: "italic", fontSize: 22, letterSpacing: "-0.01em" }}>
          spdd <span style={{ color: "var(--fg-3)", fontFamily: "var(--mono)", fontStyle: "normal", fontSize: 13 }}>/</span>
        </div>
        <div className="mono" style={{ color: "var(--fg-3)", fontSize: 11, marginTop: 2 }}>10 stories · 4 canvas · 2 tests</div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 6px 12px" }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", color: "var(--fg-3)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              <span style={{ opacity: 0.7 }}>▾</span>
              <span>{g.lbl}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-4)", textTransform: "none", letterSpacing: 0 }}>{g.n}</span>
            </div>
            {g.items && g.items.map(it => {
              const active = g.lbl === "Canvas" && it.id === "CORE-002b";
              return (
                <div key={it.id} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 8,
                  padding: "5px 10px", margin: "1px 2px", borderRadius: 6,
                  background: active ? "var(--accent-soft)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px var(--accent-line)" : "none",
                  fontSize: 12.5,
                }}>
                  <span className="mono" style={{ fontSize: 10.5, color: active ? "var(--accent)" : "var(--fg-3)" }}>{it.id}</span>
                  <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</span>
                  <span className={`dot ${it.status === "implemented" ? "green" : it.status === "accepted" ? "amber" : it.status === "reviewed" ? "blue" : it.status === "needs-update" ? "rose" : "dim"}`} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── F1 — full editor ──────────────────────────────────────────────
function F_Editor() {
  const cols = [
    { l: "R", ...C.columns.R }, { l: "E", ...C.columns.E },
    { l: "A", ...C.columns.A }, { l: "S", ...C.columns.S },
    { l: "O", ...C.columns.O }, { l: "N", ...C.columns.N },
    { l: "S", ...C.columns.S2 },
  ];
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ display: "grid", gridTemplateColumns: "56px 260px 1fr 320px", height: "calc(100% - 48px)" }}>
        <Activity />
        <Sidebar />
        {/* editor */}
        <div className="dotted" style={{ background: "var(--bg-1)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {/* tabs */}
          <div style={{ height: 38, padding: "0 8px", display: "flex", alignItems: "center", gap: 2, background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
            {[
              ["CORE-002b · story", false],
              ["CORE-002b · analysis", false],
              ["CORE-002b · canvas", true],
              ["CORE-002b · tests", false],
            ].map(([t, active], i) => (
              <div key={i} style={{
                height: 28, padding: "0 12px",
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 12, color: active ? "var(--fg)" : "var(--fg-2)",
                background: active ? "var(--bg-1)" : "transparent",
                borderRadius: 6,
                boxShadow: active ? "inset 0 0 0 1px var(--line)" : "none",
              }}>
                {active && <span className="dot amber" style={{ width: 5, height: 5 }} />}
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{t.split(" · ")[0]}</span>
                <span>· {t.split(" · ")[1]}</span>
                <span style={{ color: "var(--fg-4)", marginLeft: 2, fontSize: 12 }}>×</span>
              </div>
            ))}
          </div>
          {/* canvas */}
          <div style={{ flex: 1, overflow: "auto", padding: "26px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* hero */}
            <div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>spdd / prompts / <span style={{ color: "var(--fg-1)" }}>CORE-002b-reasons-canvas.md</span></div>
              <h1 className="serif" style={{ margin: "8px 0 0", fontWeight: 400, fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.015em" }}>
                Canvas <em style={{ color: "var(--accent)" }}>REASONS</em> — synthétiser la spec exécutable de <span className="mono" style={{ fontStyle: "normal", fontSize: 22 }}>reasons-canvas</span>
              </h1>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <span className="chip accent">● reviewed</span>
                <span className="chip"><span style={{ color: "var(--fg-3)" }}>id</span> <span className="mono" style={{ fontSize: 11 }}>CORE-002b</span></span>
                <span className="chip"><span style={{ color: "var(--fg-3)" }}>updated</span> 14:02</span>
                {C.methodology.slice(0, 3).map(m => <span key={m} className="chip"><span style={{ color: "var(--accent)" }}>§</span> {m}</span>)}
              </div>
              {/* lifecycle */}
              <div style={{ display: "flex", alignItems: "center", marginTop: 14, gap: 0 }}>
                {C.lifecycle.map((s, i) => {
                  const active = s === "reviewed";
                  const done = i < 2;
                  return (
                    <React.Fragment key={s}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        height: 24, padding: "0 10px 0 9px", borderRadius: 999,
                        fontSize: 11.5,
                        color: active ? "var(--accent-fg)" : (done ? "var(--fg-1)" : "var(--fg-3)"),
                        background: active ? "var(--accent)" : "var(--bg-2)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                        fontWeight: active ? 600 : 400,
                        boxShadow: active ? "0 6px 18px oklch(0.80 0.16 150 / 0.30)" : "none",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: active ? "var(--accent-fg)" : (done ? "var(--green)" : "var(--fg-4)") }} />
                        {s}
                      </span>
                      {i < C.lifecycle.length - 1 && <span style={{ width: 22, height: 1, background: "var(--line)" }} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* REASONS */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <h2 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 20 }}>R-E-A-S-O-N-S</h2>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>v0.3 → v0.4 · +6 ~3</span>
                <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--line), transparent)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {cols.map((col, i) => (
                  <div key={i} className="card" style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <div>
                        <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: "var(--accent)", fontStyle: "italic" }}>{col.letter}</div>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{col.name}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{col.count}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {col.items.map((it, j) => {
                        const isAdd = it.diff === "add";
                        const isMod = it.diff === "mod";
                        return (
                          <div key={j} style={{
                            fontSize: 11, lineHeight: 1.45,
                            padding: "6px 8px", borderRadius: 6,
                            background: isAdd ? "oklch(0.80 0.16 150 / 0.10)" : isMod ? "var(--accent-soft)" : "var(--bg-1)",
                            border: isAdd ? "1px solid oklch(0.80 0.16 150 / 0.4)" : isMod ? "1px solid var(--accent-line)" : "1px solid transparent",
                            color: "var(--fg-1)",
                          }}>
                            {(isAdd || isMod) && <span className="mono" style={{ color: isAdd ? "var(--green)" : "var(--accent)", marginRight: 4, fontWeight: 700 }}>{isAdd ? "+" : "~"}</span>}
                            {it.t}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* operations */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <h2 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 20 }}>Operations</h2>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{C.operations.length} signatures</span>
                <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--line), transparent)" }} />
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="mono" style={{ display: "grid", gridTemplateColumns: "32px 1fr 1.4fr 1.6fr 70px", gap: 10, padding: "8px 14px", background: "var(--bg)", color: "var(--fg-3)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>
                  <span>id</span><span>signature</span><span>args</span><span>file</span><span style={{ textAlign: "right" }}>tests</span>
                </div>
                {C.operations.slice(0, 5).map(op => {
                  const cls = op.tests.pass === op.tests.total ? "var(--green)" : op.tests.pass === 0 ? "var(--rose)" : "var(--accent)";
                  return (
                    <div key={op.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1.4fr 1.6fr 70px", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line-soft)", fontSize: 12, alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 600 }}>{op.id}</span>
                      <span className="mono" style={{ fontSize: 11.5, color: "var(--fg)" }}>{op.sig}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{op.args} → {op.ret}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-2)" }}>{op.file}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: cls, textAlign: "right" }}>{op.tests.pass}/{op.tests.total} ✓</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* rail */}
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--line)" }}>
            {["Stream", "Inspector", "Diff"].map((t, i) => (
              <span key={t} style={{
                padding: "5px 10px", fontSize: 11.5, borderRadius: 6,
                color: i === 0 ? "var(--fg)" : "var(--fg-2)",
                background: i === 0 ? "var(--bg-2)" : "transparent",
                boxShadow: i === 0 ? "inset 0 0 0 1px var(--line)" : "none",
              }}>{t}</span>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
            {D.stream.slice(0, 9).map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 16px 1fr", gap: 8, padding: "6px 0", borderBottom: i < 8 ? "1px dashed var(--line-soft)" : "none", alignItems: "start" }}>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", paddingTop: 1 }}>{e.t.slice(3)}</span>
                <span style={{
                  width: 16, height: 16, display: "grid", placeItems: "center", borderRadius: 4,
                  fontFamily: "var(--mono)", fontSize: 8.5, fontWeight: 700,
                  background: e.k === "tool" ? "oklch(0.78 0.13 235 / 0.18)" : e.k === "rsp" ? "var(--accent-soft)" : e.k === "ok" ? "oklch(0.80 0.16 150 / 0.18)" : e.k === "warn" ? "oklch(0.80 0.16 150 / 0.2)" : "oklch(0.74 0.15 305 / 0.18)",
                  color: e.k === "tool" ? "var(--teal)" : e.k === "rsp" ? "var(--accent)" : e.k === "ok" ? "var(--green)" : e.k === "warn" ? "var(--accent)" : "var(--plum)",
                }}>{e.k.slice(0, 1).toUpperCase()}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-1)", lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: e.msg }} />
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-2)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }} className="mono">
              <span className="dot green pulse" /> live · claude
            </span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ color: "var(--fg-3)" }}>1247→4811 tok</span>
          </div>
        </div>
      </div>
      {/* status bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24, padding: "0 12px", display: "flex", alignItems: "center", gap: 12, fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-2)", background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}>
        <span style={{ background: "var(--accent)", color: "var(--accent-fg)", padding: "0 10px", height: "100%", display: "flex", alignItems: "center", margin: "0 -12px 0 -12px", fontWeight: 600 }}>● reasons-canvas · reviewed</span>
        <span>● main</span><span>↑0 ↓2</span><span>3 modifiés</span>
        <span style={{ flex: 1 }} />
        <span>claude · sonnet-4.5</span><span>UTF-8</span><span>FR</span><span>ln 142, col 8</span>
      </div>
    </div>
  );
}

// ── F2 — project home ─────────────────────────────────────────────
function F_Home() {
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", height: "calc(100% - 48px)" }}>
        <Activity active="files" />
        <div style={{ overflow: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <h1 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 38, letterSpacing: "-0.015em" }}>
              yukki <span style={{ color: "var(--fg-3)" }}>/</span> yukki
            </h1>
            <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>main · 3 modifiés · 12 stories actives</span>
            <span style={{ flex: 1 }} />
            <button className="btn primary">+ nouvelle story</button>
          </div>

          {/* stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              ["12", "stories", null],
              ["4", "analyses", null],
              ["4", "canvas", "1 en review"],
              ["7 / 12", "implementées", "58%"],
            ].map(([n, l, sub], i) => (
              <div key={i} className="card" style={{ padding: "18px 18px 16px", background: i === 3 ? "var(--accent-soft)" : "var(--bg-2)", borderColor: i === 3 ? "var(--accent-line)" : "var(--line)" }}>
                <div className="serif" style={{ fontSize: 40, lineHeight: 1, fontWeight: 400, color: i === 3 ? "var(--accent)" : "var(--fg)", letterSpacing: "-0.02em" }}>{n}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</div>
                {sub && <div style={{ fontSize: 11, color: i === 3 ? "var(--accent)" : "var(--fg-2)", marginTop: 4 }}>{sub}</div>}
              </div>
            ))}
          </div>

          {/* in progress + activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <h3 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 18 }}>en cours</h3>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>4</span>
              </div>
              {[
                ["CORE-002b", "reviewed", "canvas REASONS — review humaine en attente", "blue", "★"],
                ["CORE-002a", "accepted", "analysis command — prêt à générer", "amber", null],
                ["META-006",  "draft",    "format de nommage canonical des artefacts", "dim", null],
                ["INT-001",   "needs-update", "copilot provider — sync après refactor", "rose", "↻"],
              ].map(([id, st, t, dot, mark], i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "82px 100px 1fr 24px",
                  alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < 3 ? "1px dashed var(--line-soft)" : "none",
                }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{id}</span>
                  <span className="status-pill"><span className={`dot ${dot}`} />{st}</span>
                  <span style={{ fontSize: 13, color: "var(--fg)" }}>{t}</span>
                  <span style={{ color: "var(--accent)", fontSize: 14 }}>{mark || ""}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ background: "oklch(0.78 0.13 235 / 0.06)", borderColor: "oklch(0.78 0.13 235 / 0.30)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <h3 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 18 }}>activité git</h3>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>5 derniers</span>
              </div>
              {[
                ["a3f1d2", "spec: bump CORE-002b reviewed", "il y a 12min"],
                ["7c2811", "feat(canvas): add MergeCanvas (O5)", "il y a 1h"],
                ["b40e9a", "test: parser BVA cases", "il y a 2h"],
                ["88c1fe", "spec: write CORE-002b analysis", "hier"],
                ["12af3d", "spec: clarify CORE-002b story", "hier"],
              ].map(([h, m, t], i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 10, padding: "7px 0", alignItems: "center", borderBottom: i < 4 ? "1px dashed oklch(0.78 0.13 235 / 0.15)" : "none" }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--teal)" }}>{h}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-1)" }}>{m}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── F3 — run console (live generate) ───────────────────────────
function F_Run() {
  const steps = [
    ["O1", "BuildContext", "internal/workflow/canvas.go", "done"],
    ["O2", "RenderPrompt", "internal/workflow/canvas.go", "done"],
    ["O3", "ParseCanvas", "internal/canvas/parser.go", "running"],
    ["O4", "ValidateCanvas", "internal/canvas/validator.go", "queued"],
    ["O5", "MergeCanvas", "internal/canvas/merge.go", "queued"],
    ["O6", "WriteAtomic", "internal/artifacts/writer.go", "queued"],
  ];
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ height: "calc(100% - 48px)", padding: "32px 56px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="serif" style={{ fontSize: 26, fontStyle: "italic" }}>$ <span style={{ color: "var(--accent)" }}>yukki</span> generate <span style={{ fontFamily: "var(--mono)", fontSize: 22 }}>CORE-002b</span></span>
          <span style={{ flex: 1 }} />
          <span className="status-pill green pulse" style={{ height: 26, fontSize: 11.5 }}><span className="dot green" />running · 3/6 · ~12s</span>
          <button className="btn">■ stop</button>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>plan · 6 / 8 operations</div>
          {steps.map(([id, sig, file, s], i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "24px 1fr auto 80px",
              gap: 12, alignItems: "center",
              padding: "10px 12px",
              borderRadius: 8,
              background: s === "running" ? "var(--accent-soft)" : "transparent",
              border: s === "running" ? "1px solid var(--accent-line)" : "1px solid transparent",
              marginBottom: 4,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                display: "grid", placeItems: "center",
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
                background: s === "done" ? "oklch(0.80 0.16 150 / 0.20)" : s === "running" ? "var(--accent)" : "var(--bg-2)",
                color: s === "done" ? "var(--green)" : s === "running" ? "var(--accent-fg)" : "var(--fg-3)",
                border: s === "queued" ? "1px solid var(--line)" : "none",
              }}>{s === "done" ? "✓" : s === "running" ? "▸" : "·"}</span>
              <div>
                <div className="mono" style={{ fontSize: 12.5, color: s === "queued" ? "var(--fg-3)" : "var(--fg)" }}><span style={{ color: "var(--accent)", fontWeight: 600 }}>{id}</span> · {sig}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 1 }}>{file}</div>
              </div>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 10.5, color: s === "running" ? "var(--accent)" : "var(--fg-3)" }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
          <div className="card" style={{ background: "var(--bg-1)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>live diff · internal/canvas/parser.go</div>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.65 }}>
              <div style={{ color: "var(--fg-3)" }}> 14  func ParseCanvas(s string) (Canvas, error) {`{`}</div>
              <div style={{ background: "oklch(0.80 0.16 150 / 0.10)", color: "var(--fg)", padding: "0 4px", borderRadius: 3 }}><span style={{ color: "var(--green)" }}>+</span>15    sections, err := splitSections(s)</div>
              <div style={{ background: "oklch(0.80 0.16 150 / 0.10)", color: "var(--fg)", padding: "0 4px", borderRadius: 3 }}><span style={{ color: "var(--green)" }}>+</span>16    if err != nil {`{`} return Canvas{`{}`}, err {`}`}</div>
              <div style={{ background: "var(--accent-soft)", color: "var(--fg)", padding: "0 4px", borderRadius: 3 }}><span style={{ color: "var(--accent)" }}>~</span>17    return assemble(sections), nil</div>
              <div style={{ color: "var(--fg-3)" }}> 18  {`}`}</div>
            </div>
          </div>
          <div className="card" style={{ background: "oklch(0.78 0.13 235 / 0.05)", borderColor: "oklch(0.78 0.13 235 / 0.3)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>claude · stream</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["thinking…", "I'll split the markdown into sections", "first by ## headers", "then validate each", "writing parser.go..."].map((t, i) => (
                <div key={i} className="mono" style={{ fontSize: 10.5, color: "var(--fg-1)" }}>· {t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── F4 — ⌘K palette ──────────────────────────────────────────────
function F_Palette() {
  const results = [
    ["cmd", "yukki reasons-canvas", "génère le canvas R-E-A-S-O-N-S depuis story+analyse", true],
    ["canvas", "CORE-002b · reasons-canvas", "spdd/prompts/CORE-002b-reasons-canvas.md", false],
    ["story", "CORE-002b · canvas REASONS", "spdd/stories/CORE-002b-reasons-canvas.md", false],
    ["ref", "spdd/methodology/reasons-canvas.md", "documentation méthodologique", false],
    ["cmd", "yukki prompt-update", "corriger un canvas existant", false],
    ["cmd", "yukki sync", "recapter après refactor humain", false],
  ];
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ height: "calc(100% - 48px)", display: "grid", gridTemplateColumns: "56px 260px 1fr", position: "relative" }}>
        <Activity />
        <Sidebar />
        <div className="dotted" style={{ background: "var(--bg-1)", position: "relative" }} />
        {/* dim overlay + palette */}
        <div style={{ position: "absolute", inset: 0, background: "oklch(0.08 0.012 250 / 0.55)", backdropFilter: "blur(4px)" }} />
        <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 560 }}>
          <div style={{ background: "var(--bg-1)", border: "1px solid var(--line-strong)", borderRadius: 14, boxShadow: "0 24px 80px oklch(0 0 0 / 0.6)", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 14 }}>⌘</span>
              <span style={{ flex: 1, fontSize: 15, color: "var(--fg)" }}>reasons-canvas<span style={{ color: "var(--accent)", animation: "blink 1s step-end infinite" }}>|</span></span>
              <kbd>esc</kbd>
            </div>
            <div style={{ padding: 6 }}>
              {results.map(([k, t, h, sel], i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "70px 1fr auto",
                  gap: 12, padding: "10px 12px", borderRadius: 8,
                  alignItems: "center",
                  background: sel ? "var(--accent-soft)" : "transparent",
                }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</span>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: sel ? 600 : 400 }}>{t}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{h}</div>
                  </div>
                  {sel && <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>↵</span>}
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid var(--line)", padding: "8px 14px", display: "flex", gap: 14, fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
              <span>↑↓ naviguer</span><span>↵ exécuter</span><span>⇥ filtrer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── F5 — diff side-by-side ───────────────────────────────────────
function F_Diff() {
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ height: "calc(100% - 48px)", padding: "28px 36px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 26 }}>
            CORE-002b — diff de canvas
          </h2>
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>v0.3 (accepted) → v0.4 (reviewed)</span>
          <span style={{ flex: 1 }} />
          <span className="chip" style={{ background: "oklch(0.80 0.16 150 / 0.12)", borderColor: "oklch(0.80 0.16 150 / 0.4)", color: "var(--green)" }}>+ 6 ajouts</span>
          <span className="chip accent">~ 3 modifs</span>
          <span className="chip">– 1 suppression</span>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, minHeight: 0 }}>
          {[
            { lbl: "v0.3 · accepted · 22 avr.", side: "left" },
            { lbl: "v0.4 · reviewed · 30 avr.", side: "right" },
          ].map((s, si) => (
            <div key={si} className="card" style={{ background: "var(--bg-1)", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot" style={{ background: si === 0 ? "var(--fg-3)" : "var(--accent)", boxShadow: si === 1 ? "0 0 6px var(--accent)" : "none" }} />
                <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)" }}>{s.lbl}</span>
              </div>
              <div className="mono" style={{ flex: 1, padding: 16, fontSize: 11, lineHeight: 1.75, overflow: "auto" }}>
                <div style={{ color: "var(--accent)" }}>## E — Entities</div>
                <div style={{ color: "var(--fg-1)" }}>- Canvas</div>
                <div style={{ color: "var(--fg-1)" }}>- Section, Operation</div>
                <div style={{ color: "var(--fg-1)" }}>- Norm, Safeguard</div>
                {si === 1 && (
                  <div style={{ background: "oklch(0.80 0.16 150 / 0.15)", color: "var(--green)", padding: "0 4px", borderRadius: 3 }}>+ ProviderTranscript</div>
                )}

                <div style={{ height: 10 }} />
                <div style={{ color: "var(--accent)" }}>## S — Safeguards</div>
                {si === 0 ? (
                  <div style={{ background: "oklch(0.74 0.15 18 / 0.10)", color: "var(--rose)", textDecoration: "line-through", padding: "0 4px", borderRadius: 3 }}>- timeout: pas de défaut</div>
                ) : (
                  <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "0 4px", borderRadius: 3 }}>~ timeout: 5min, --timeout override</div>
                )}
                <div style={{ color: "var(--fg-1)" }}>- atomic write via rename</div>
                <div style={{ color: "var(--fg-1)" }}>- exit codes 0/1/2/3</div>

                <div style={{ height: 10 }} />
                <div style={{ color: "var(--accent)" }}>## R — Requirements</div>
                <div style={{ color: "var(--fg-1)" }}>- lit story + analyse</div>
                <div style={{ color: "var(--fg-1)" }}>- canvas R-E-A-S-O-N-S complet</div>
                <div style={{ color: "var(--fg-1)" }}>- idempotent</div>
                {si === 1 && (
                  <div style={{ background: "oklch(0.80 0.16 150 / 0.15)", color: "var(--green)", padding: "0 4px", borderRadius: 3 }}>+ Tolère un canvas partiel existant (merge)</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn ghost">ouvrir dans l'éditeur</button>
          <button className="btn">annuler</button>
          <button className="btn primary">accepter v0.4</button>
        </div>
      </div>
    </div>
  );
}

// ── F6 — REASONS as post-it wall ─────────────────────────────────
function F_Postit() {
  const cols = [
    ["R", "Requirements", ["lit story", "lit analyse", "idempotent", "merge non destr."], "green"],
    ["E", "Entities", ["Canvas", "Section", "Operation", "Norm", "Safeguard", "ProviderTranscript +"], "green"],
    ["A", "Approach", ["1. context", "2. inject", "3. parse"], "green"],
    ["S", "Structure", ["canvas.go", "parser.go +", "validator.go", "tmpl"], "blue"],
    ["O", "Operations", ["BuildContext", "ParseCanvas", "Validate", "Merge +", "Write", "Bump"], "rose"],
    ["N", "Norms", ["slog text", "errs %w", "i18n FR/EN"], "blue"],
    ["S", "Safeguards", ["no PII", "atomic write", "5min timeout ~", "exit codes", "no telemetry"], "green"],
  ];
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ height: "calc(100% - 48px)", padding: "28px 36px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 className="serif" style={{ margin: 0, fontStyle: "italic", fontWeight: 400, fontSize: 28 }}>
            CORE-002b · canvas <em style={{ color: "var(--accent)" }}>REASONS</em>
          </h2>
          <div className="mono" style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>vue mur — drag chips entre colonnes pour réorganiser</div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, minHeight: 0 }}>
          {cols.map(([l, n, items, tone], ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
              <div style={{ textAlign: "center", padding: "8px 0 6px", borderBottom: "1px dashed var(--line-soft)" }}>
                <div className="serif" style={{ fontSize: 30, fontStyle: "italic", color: "var(--accent)", lineHeight: 1 }}>{l}</div>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{n}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
                {items.map((t, i) => {
                  const bgs = {
                    green: "linear-gradient(140deg, oklch(0.82 0.15 150), oklch(0.74 0.16 145))",
                    blue:  "linear-gradient(140deg, oklch(0.78 0.13 235), oklch(0.72 0.13 232))",
                    rose:  "linear-gradient(140deg, oklch(0.80 0.12 18), oklch(0.74 0.13 12))",
                  };
                  const txt = "oklch(0.16 0.02 250)";
                  return (
                    <div key={i} style={{
                      background: bgs[tone],
                      color: txt,
                      padding: "8px 10px",
                      borderRadius: "5px 8px 4px 9px",
                      transform: `rotate(${(i % 2 ? -1 : 1) * (0.4 + (i % 3) * 0.4)}deg)`,
                      boxShadow: "1.5px 2px 0 oklch(0 0 0 / 0.22)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}>{t}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── F7 — methodology browser ─────────────────────────────────────
function F_Method() {
  const refs = ["DDD-tactical", "STRIDE", "BVA + EP", "Y-Statement", "INVEST", "SPIDR", "Given/When/Then"];
  return (
    <div className="frame">
      <TitleBar />
      <div style={{ height: "calc(100% - 48px)", display: "grid", gridTemplateColumns: "56px 220px 1fr" }}>
        <Activity active="ref" />
        <div style={{ borderRight: "1px solid var(--line)", background: "var(--bg)", padding: "14px 12px", overflow: "auto" }}>
          <div className="serif" style={{ fontStyle: "italic", fontSize: 20, padding: "0 6px 8px" }}>methodology /</div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", padding: "0 6px 10px" }}>7 refs · ~30 min lecture</div>
          {refs.map((r, i) => (
            <div key={r} style={{
              padding: "8px 10px", borderRadius: 7,
              fontSize: 12.5,
              background: i === 0 ? "var(--accent-soft)" : "transparent",
              boxShadow: i === 0 ? "inset 0 0 0 1px var(--accent-line)" : "none",
              color: i === 0 ? "var(--accent)" : "var(--fg-1)",
              fontWeight: i === 0 ? 600 : 400,
              marginBottom: 2,
            }}>{r}</div>
          ))}
        </div>
        <div style={{ overflow: "auto", padding: "32px 48px 48px", background: "var(--bg-1)" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>methodology · 1 / 7</div>
          <h1 className="serif" style={{ margin: "8px 0 12px", fontWeight: 400, fontStyle: "italic", fontSize: 38, lineHeight: 1.05, letterSpacing: "-0.015em", maxWidth: 720 }}>
            Domain-Driven Design <span style={{ color: "var(--fg-3)" }}>—</span> tactical
          </h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <span className="chip">Eric Evans, 2003</span>
            <span className="chip dim">~10 min</span>
            <span className="chip accent">utilisé par : E · O</span>
          </div>

          <p style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.55, color: "var(--fg-1)", maxWidth: 680, fontStyle: "italic" }}>
            DDD distingue les <em>Entities</em> (identité dans le temps), les <em>Value Objects</em> (immuables, comparés par valeur),
            les <em>Aggregates</em> (frontières de cohérence) et les <em>Repositories</em> (accès persistance).
          </p>

          <div style={{ height: 1, background: "var(--line-soft)", margin: "28px 0" }} />

          <h3 className="serif" style={{ margin: "0 0 10px", fontStyle: "italic", fontWeight: 400, fontSize: 22, color: "var(--accent)" }}>§ Exemple yukki</h3>
          <div className="card" style={{ padding: "14px 16px", maxWidth: 680, background: "var(--bg-2)" }}>
            <div className="mono" style={{ fontSize: 12, lineHeight: 1.7 }}>
              <div><span style={{ color: "var(--accent)" }}>Canvas</span> <span style={{ color: "var(--fg-3)" }}>// entity</span></div>
              <div><span style={{ color: "var(--teal)" }}>Section</span> <span style={{ color: "var(--fg-3)" }}>// value object</span></div>
              <div><span style={{ color: "var(--teal)" }}>Operation</span> <span style={{ color: "var(--fg-3)" }}>// value object</span></div>
              <div><span style={{ color: "var(--plum)" }}>Repository</span> <span style={{ color: "var(--fg-3)" }}>// = artifacts.Writer</span></div>
            </div>
          </div>

          <h3 className="serif" style={{ margin: "28px 0 10px", fontStyle: "italic", fontWeight: 400, fontSize: 22, color: "var(--accent)" }}>§ Comment l'utiliser dans REASONS</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "var(--fg-1)", maxWidth: 680 }}>
            La colonne <strong>E</strong> liste les entities et VO du bounded context de la commande. La colonne
            <strong> O</strong> dérive directement du langage ubiquitaire — chaque opération porte le nom du domaine.
            Pour <span className="mono" style={{ fontSize: 12 }}>reasons-canvas</span> : <em>BuildContext</em>, <em>ParseCanvas</em>, <em>MergeCanvas</em>…
          </p>
        </div>
      </div>
    </div>
  );
}

// ── F8 — palette light theme ────────────────────────────────────
function F_Light() {
  return (
    <div className="frame light">
      <TitleBar light />
      <div style={{ display: "grid", gridTemplateColumns: "56px 260px 1fr 320px", height: "calc(100% - 48px)" }}>
        <Activity />
        <Sidebar />
        <div className="dotted" style={{ background: "var(--bg-2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 38, padding: "0 8px", display: "flex", alignItems: "center", gap: 2, background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
            {["story", "analysis", "canvas", "tests"].map((t, i) => (
              <div key={i} style={{
                height: 28, padding: "0 12px",
                display: "flex", alignItems: "center", gap: 7, fontSize: 12,
                color: i === 2 ? "var(--fg)" : "var(--fg-2)",
                background: i === 2 ? "var(--bg-2)" : "transparent",
                borderRadius: 6, boxShadow: i === 2 ? "inset 0 0 0 1px var(--line)" : "none",
              }}>
                {i === 2 && <span className="dot amber" style={{ width: 5, height: 5 }} />}
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>CORE-002b</span>
                <span>· {t}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: "26px 32px", overflow: "auto" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>spdd / prompts /</div>
            <h1 className="serif" style={{ margin: "8px 0 12px", fontWeight: 400, fontSize: 30, lineHeight: 1.1 }}>
              Canvas <em style={{ color: "var(--accent)" }}>REASONS</em> — <span className="mono" style={{ fontSize: 18 }}>reasons-canvas</span>
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              <span className="chip accent">● reviewed</span>
              <span className="chip">CORE-002b</span>
              <span className="chip">DDD-tactical</span>
              <span className="chip">STRIDE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[["R", "Requirements", 4], ["E", "Entities", 5], ["A", "Approach", 3], ["S", "Structure", 4]].map(([l, n, c], i) => (
                <div key={i} className="card" style={{ padding: 12, background: "var(--bg)", borderColor: "var(--line)" }}>
                  <div className="serif" style={{ fontSize: 24, color: "var(--accent)", fontStyle: "italic" }}>{l}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", marginTop: 2 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 24, color: "var(--fg-1)", marginTop: 14, fontWeight: 500 }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--line)", padding: 12, background: "var(--bg)" }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>stream</div>
          {D.stream.slice(0, 5).map((e, i) => (
            <div key={i} className="mono" style={{ fontSize: 10.5, padding: "5px 0", color: "var(--fg-1)" }} dangerouslySetInnerHTML={{ __html: `<span style="color:var(--fg-3)">${e.t.slice(3)}</span> · ${e.msg}` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── F9 — brand sheet ─────────────────────────────────────────────
function F_Brand() {
  const swatches = [
    ["accent",   "var(--accent)",  "oklch(0.80 0.16 150)", "var(--accent-fg)"],
    ["bg",       "var(--bg)",      "oklch(0.155 0.014 250)", "var(--fg)"],
    ["bg-2",     "var(--bg-2)",    "oklch(0.22 0.016 250)", "var(--fg)"],
    ["green",    "var(--green)",   "oklch(0.80 0.16 150)", "var(--accent-fg)"],
    ["teal",     "var(--teal)",    "oklch(0.78 0.10 200)", "var(--fg)"],
    ["rose",     "var(--rose)",    "oklch(0.74 0.15 18)",  "var(--accent-fg)"],
    ["plum",     "var(--plum)",    "oklch(0.74 0.15 305)", "var(--accent-fg)"],
    ["blue",     "var(--blue)",    "oklch(0.78 0.13 235)", "var(--fg)"],
  ];
  return (
    <div className="frame">
      <div style={{ padding: "40px 48px", height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 32 }}>
        {/* logo block */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: "linear-gradient(140deg, var(--accent), var(--accent-2))", display: "grid", placeItems: "center", boxShadow: "0 12px 40px oklch(0.80 0.16 150 / 0.30)" }}>
            <Bun s={42} c="oklch(0.16 0.02 250)" />
          </div>
          <div>
            <div className="serif" style={{ fontStyle: "italic", fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em" }}>yukki</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 6 }}>spec-prompt-driven dev · ui</div>
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--fg-2)", maxWidth: 320 }}>
            <div><span style={{ color: "var(--fg-3)" }}>tone</span> · calme, technique, légèrement froid</div>
            <div><span style={{ color: "var(--fg-3)" }}>typo</span> · Geist (UI/Mono) + Instrument Serif (titres, italique)</div>
            <div><span style={{ color: "var(--fg-3)" }}>accent</span> · vert frais · oklch(0.80 0.16 150)</div>
          </div>
        </div>

        {/* mark variations */}
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>mark variations</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {[
              { bg: "var(--bg-2)", color: "var(--fg)", border: "1px solid var(--line)" },
              { bg: "var(--accent)", color: "var(--accent-fg)" },
              { bg: "linear-gradient(140deg, var(--accent), var(--accent-2))", color: "var(--accent-fg)" },
              { bg: "var(--bg)", color: "var(--accent)", border: "1px solid var(--accent-line)" },
              { bg: "oklch(1 0 0)", color: "oklch(0.16 0.02 250)" },
              { bg: "oklch(0.16 0.02 250)", color: "oklch(0.80 0.16 150)" },
            ].map((s, i) => (
              <div key={i} style={{ aspectRatio: "1", borderRadius: 14, background: s.bg, border: s.border || "none", display: "grid", placeItems: "center", color: s.color }}>
                <Bun s={36} c={s.color} />
              </div>
            ))}
          </div>
        </div>

        {/* type scale */}
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>type scale</div>
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="serif" style={{ fontStyle: "italic", fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em" }}>Canvas <em style={{ color: "var(--accent)" }}>REASONS</em></div>
            <div className="serif" style={{ fontStyle: "italic", fontSize: 28, color: "var(--fg-1)" }}>Synthétiser la spec exécutable</div>
            <div style={{ fontSize: 16, color: "var(--fg-1)", maxWidth: 560 }}>Le canvas R-E-A-S-O-N-S est le centre de gravité de la méthodologie SPDD.</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--fg-2)" }}>yukki reasons-canvas CORE-002b --merge</div>
          </div>
        </div>

        {/* color palette */}
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>palette</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
            {swatches.map(([n, val, real, fg], i) => (
              <div key={i} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                <div style={{ background: val, height: 80, display: "flex", alignItems: "flex-end", padding: 10, color: fg, fontSize: 11, fontWeight: 600 }}>{n}</div>
                <div className="mono" style={{ padding: "8px 10px", fontSize: 9.5, color: "var(--fg-3)" }}>{real}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { F_Editor, F_Home, F_Run, F_Palette, F_Diff, F_Postit, F_Method, F_Light, F_Brand });

// ── light wrappers ───────────────────────────────────────────────
// these inject a `light` ancestor so .frame inherits the light token overrides.
// Each underlying frame still renders <div className="frame">; we wrap them in
// a containing element that flips a CSS class so the cascade redefines vars.

function withLightWrapper(Inner) {
  return function () {
    return (
      <div className="frame-light-wrapper" style={{ width: "100%", height: "100%" }}>
        <Inner />
      </div>
    );
  };
}

// inject a stylesheet that re-applies light vars when nested under .frame-light-wrapper
(function () {
  if (document.getElementById("hf-light-wrapper-css")) return;
  const css = `
.frame-light-wrapper > .frame {
  --bg:        oklch(0.985 0.005 250);
  --bg-1:      oklch(0.965 0.006 250);
  --bg-2:      oklch(1 0 0);
  --bg-3:      oklch(0.94 0.008 250);
  --line:      oklch(0.88 0.010 250);
  --line-soft: oklch(0.93 0.008 250);
  --line-strong: oklch(0.78 0.012 250);
  --fg:        oklch(0.20 0.015 250);
  --fg-1:      oklch(0.36 0.014 250);
  --fg-2:      oklch(0.50 0.012 250);
  --fg-3:      oklch(0.66 0.012 250);
  --fg-4:      oklch(0.78 0.010 250);
  --accent:    oklch(0.62 0.17 150);
  --accent-2:  oklch(0.55 0.17 150);
  --accent-fg: oklch(0.99 0 0);
  --accent-soft: oklch(0.62 0.17 150 / 0.10);
  --accent-line: oklch(0.62 0.17 150 / 0.40);
}
.frame-light-wrapper .dotted {
  background-image: radial-gradient(oklch(0 0 0 / 0.04) 1px, transparent 1px) !important;
}
`;
  const tag = document.createElement("style");
  tag.id = "hf-light-wrapper-css";
  tag.textContent = css;
  document.head.appendChild(tag);
})();

const F_Editor_Light  = withLightWrapper(F_Editor);
const F_Home_Light    = withLightWrapper(F_Home);
const F_Run_Light     = withLightWrapper(F_Run);
const F_Postit_Light  = withLightWrapper(F_Postit);
const F_Method_Light  = withLightWrapper(F_Method);

Object.assign(window, { F_Editor_Light, F_Home_Light, F_Run_Light, F_Postit_Light, F_Method_Light });
