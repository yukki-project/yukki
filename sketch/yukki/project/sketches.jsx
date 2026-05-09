// sketches.jsx — Wireframe sketches for yukki ui design exploration

const { useState: uS } = React;

// ─── Sketchy primitive components ───────────────────────────────────────

const Box = ({ children, style, className = "", ...rest }) => (
  <div className={`box ${className}`} style={style} {...rest}>{children}</div>
);

const Scribble = ({ w = "80%" }) => (
  <div className="scribble" style={{ width: w }} />
);

const Hand = ({ children, size = 14, color, italic, style }) => (
  <span style={{
    fontFamily: "var(--hand)", fontSize: size, color: color || "var(--ink)",
    fontStyle: italic ? "italic" : "normal", ...style,
  }}>{children}</span>
);

const Mono = ({ children, size = 11, color, style }) => (
  <span style={{ fontFamily: "var(--mono)", fontSize: size, color: color || "var(--ink-2)", ...style }}>
    {children}
  </span>
);

const Tag = ({ children, tone, style }) => (
  <span className={`tag ${tone || ""}`} style={style}>{children}</span>
);

const Btn = ({ children, primary, ghost, style }) => (
  <span className={`btn-wf ${primary ? "primary" : ""} ${ghost ? "ghost" : ""}`} style={style}>
    {children}
  </span>
);

const Callout = ({ children, pos = "top-left", style }) => (
  <div className={`callout ${pos}`} style={style}>{children}</div>
);

// little rabbit doodle
const Bunny = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M9 5 C 7.5 9, 7.5 14, 10 17" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M19 5 C 20.5 9, 20.5 14, 18 17" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 18 C 8 13, 11 12, 14 12 C 17 12, 20 13, 20 18 L 20 23 C 20 26, 18 28, 14 28 C 10 28, 8 26, 8 23 Z"
          stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    <circle cx="12" cy="20" r="0.9" fill="var(--ink)" />
    <circle cx="16" cy="20" r="0.9" fill="var(--ink)" />
  </svg>
);

const ArtTitle = ({ title, sub }) => (
  <>
    <div className="ab-title-card">{title}</div>
    {sub && <div className="ab-subtitle">{sub}</div>}
  </>
);

// ── A1: 3-pane VS-Code style (current direction) ──
function S_3Pane() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-grid">
      <ArtTitle title="A1 · 3-pane editor" sub="VS Code / Kiro family — sidebar + main + provider rail" />
      <div style={{ position: "absolute", inset: "78px 22px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* titlebar */}
        <Box className="thin" style={{ height: 30, padding: "6px 10px", display: "flex", alignItems: "center", gap: 10 }}>
          <Bunny size={16} /> <Hand size={13}>yukki</Hand>
          <Mono>· yukki-dev/yukki @ main</Mono>
          <span style={{ flex: 1 }} />
          <Mono>⌘K</Mono>
        </Box>
        {/* stepper */}
        <Box style={{ height: 38, padding: "0 10px", display: "flex", alignItems: "center", gap: 14 }}>
          {["story", "analysis", "reasons-canvas", "generate", "api-test", "prompt-update", "sync"].map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                border: "1.2px solid var(--ink-2)",
                background: i === 2 ? "var(--accent)" : (i < 2 ? "var(--highlight)" : "var(--paper)"),
                color: i === 2 ? "var(--paper)" : "var(--ink)",
                display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 10,
              }}>{i + 1}</span>
              <Mono color={i === 2 ? "var(--ink)" : "var(--ink-3)"}>{s}</Mono>
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <Btn primary>▶ run</Btn>
        </Box>
        {/* main row */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "180px 1fr 220px", gap: 8, minHeight: 0 }}>
          <Box style={{ padding: 10 }} className="thin">
            <Mono>spdd/</Mono>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {["▾ stories (10)", "  ● CORE-001", "  ◐ CORE-002b", "  ○ META-006", "▾ analysis (4)", "  ● CORE-001", "  ◐ CORE-002b", "▾ prompts (4)", "  ★ CORE-002b", "▸ tests (2)"].map((t, i) => (
                <Hand key={i} size={12} color={t.includes("★") ? "var(--accent)" : "var(--ink-2)"}>{t}</Hand>
              ))}
            </div>
          </Box>
          <Box className="thin" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            <Hand size={16} style={{ fontFamily: "var(--hand-2)" }}>CORE-002b · canvas REASONS</Hand>
            <div style={{ display: "flex", gap: 6 }}>
              {"REASONS".split("").map((l, i) => (
                <Box key={i} className="thin" style={{ flex: 1, padding: 6, minHeight: 80 }}>
                  <Hand size={18} color="var(--accent)" style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>{l}</Hand>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    <Scribble w="100%" /><Scribble w="80%" /><Scribble w="90%" />
                  </div>
                </Box>
              ))}
            </div>
            <Hand size={13} color="var(--ink-2)">Operations table</Hand>
            <Box className="thin" style={{ padding: 6 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: i < 3 ? "1px dashed var(--ink-4)" : "none" }}>
                  <Mono color="var(--accent)">O{i}</Mono>
                  <Scribble w="60%" />
                  <Mono>{i === 1 ? "✓" : i === 2 ? "5/7" : "0/4"}</Mono>
                </div>
              ))}
            </Box>
          </Box>
          <Box className="thin filled-cool" style={{ padding: 10 }}>
            <Hand size={13} color="var(--accent-2)" style={{ fontWeight: 700 }}>provider stream</Hand>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {["14:01 read story", "14:01 read analysis", "14:01 calling claude", "14:01 R: 4 items", "14:01 E: 5 items", "14:01 ✓ wrote"].map((t, i) => (
                <Mono key={i} size={10}>{t}</Mono>
              ))}
            </div>
          </Box>
        </div>
      </div>
      <Callout pos="top-right" style={{ top: 60, right: 60 }}>← like the hi-fi</Callout>
    </div>
  );
}

// ── A2: Notebook / document feel ──
function S_Notebook() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="A2 · Notebook" sub="Long scrolling document, methodology-first, like a Notion page" />
      <div style={{ position: "absolute", inset: "78px 60px 22px 60px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <Mono>spdd › prompts ›</Mono>
          <Hand size={26} style={{ fontFamily: "var(--hand-2)", fontWeight: 600 }}>CORE-002b · reasons-canvas</Hand>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag tone="accent">canvas</Tag><Tag>status: reviewed</Tag><Tag>STRIDE</Tag><Tag>BVA+EP</Tag>
        </div>
        <div className="line-h dotted" />
        <Hand size={16} italic color="var(--ink-2)">Spec exécutable de la commande qui synthétise un canvas R-E-A-S-O-N-S à partir de…</Hand>
        <div className="section-divider"><span>§ canvas REASONS</span><span className="line" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["R", "Requirements"], ["E", "Entities"], ["A", "Approach"], ["S", "Structure"]].map(([l, n]) => (
            <Box key={l} className="thin" style={{ padding: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <Hand size={22} color="var(--accent)" style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>{l}</Hand>
                <Mono>{n}</Mono>
              </div>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                <Scribble w="100%" /><Scribble w="92%" /><Scribble w="76%" />
              </div>
            </Box>
          ))}
        </div>
        <div className="section-divider"><span>§ Operations</span><span className="line" /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Mono color="var(--accent)">O{i}</Mono>
              <Scribble w="50%" />
              <Mono color="var(--ink-3)">internal/canvas/parser.go</Mono>
              <span style={{ flex: 1 }} />
              <Tag tone="cool">{i === 3 ? "0/4" : "ok"}</Tag>
            </div>
          ))}
        </div>
      </div>
      <Callout pos="bot-left" style={{ bottom: 80, left: 80 }}>scroll, no panes!</Callout>
    </div>
  );
}

// ── A3: Workflow / pipeline view ──
function S_Pipeline() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-dots">
      <ArtTitle title="A3 · Pipeline" sub="The 7-cmd cycle as a visual flow — pick a card to drill in" />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <path className="arrow" d="M 130 280 C 220 280, 220 220, 310 220" />
        <polyline className="arrow" points="300,212 314,220 300,228" />
        <path className="arrow" d="M 470 220 C 560 220, 560 280, 650 280" />
        <polyline className="arrow" points="640,272 654,280 640,288" />
        <path className="arrow" d="M 810 280 C 900 280, 900 360, 470 360 C 270 360, 270 440, 130 440" />
        <polyline className="arrow" points="120,432 134,440 120,448" />
        <path className="arrow-cool" d="M 470 470 C 470 540, 470 540, 470 580" strokeDasharray="4 4" />
      </svg>
      <div style={{ position: "absolute", top: 240, left: 50, width: 160 }}>
        <Box className="thick filled-accent" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>1 · story</Hand>
          <Hand size={11} color="var(--ink-2)">draft → clarified</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 180, left: 320, width: 160 }}>
        <Box className="thick filled-accent" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>2 · analysis</Hand>
          <Hand size={11} color="var(--ink-2)">Y-stmt + STRIDE</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 240, left: 660, width: 160 }}>
        <Box className="thick filled-accent2" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>3 · canvas</Hand>
          <Hand size={11} color="var(--ink-2)">R-E-A-S-O-N-S ★</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 410, left: 50, width: 160 }}>
        <Box className="thick" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>4 · generate</Hand>
          <Hand size={11} color="var(--ink-2)">code + tests</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 410, left: 320, width: 160 }}>
        <Box className="thick" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>5 · api-test</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 580, left: 320, width: 160 }}>
        <Box className="thick filled-cool" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>6 · prompt-update</Hand>
          <Hand size={11} color="var(--ink-2)">defect → canvas</Hand>
        </Box>
      </div>
      <div style={{ position: "absolute", top: 580, left: 660, width: 160 }}>
        <Box className="thick filled-cool" style={{ padding: 10 }}>
          <Hand size={14} style={{ fontWeight: 700 }}>7 · sync</Hand>
          <Hand size={11} color="var(--ink-2)">code → canvas</Hand>
        </Box>
      </div>
      <Callout pos="top-left" style={{ top: 100, left: 70 }}>click a node → opens drawer</Callout>
    </div>
  );
}

// ── A4: Kanban / lifecycle board ──
function S_Kanban() {
  const cols = [
    ["draft", ["UI-001 canvas-editor", "INT-001 copilot"]],
    ["reviewed", ["CORE-002b ★", "META-006 naming"]],
    ["accepted", ["CORE-002a analysis"]],
    ["implemented", ["CORE-001 story"]],
    ["synced", []],
  ];
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-grid">
      <ArtTitle title="A4 · Lifecycle board" sub="Kanban over the status field — drag a card to bump status" />
      <div style={{ position: "absolute", inset: "78px 20px 22px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {cols.map(([name, items]) => (
          <Box key={name} style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, background: "var(--paper-shade)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <Hand size={14} style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>{name}</Hand>
              <Mono>{items.length}</Mono>
            </div>
            <div className="line-h" />
            {items.map((it, i) => (
              <Box key={i} className="thin" style={{ padding: 7, background: "var(--paper)" }}>
                <Mono color="var(--accent)">{it.split(" ")[0]}</Mono>
                <Hand size={12}>{it.split(" ").slice(1).join(" ")}</Hand>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <Tag tone={i % 2 ? "cool" : "accent"}>{i % 2 ? "analysis" : "canvas"}</Tag>
                </div>
              </Box>
            ))}
            {items.length === 0 && <Hand size={11} color="var(--ink-3)" italic>aucun</Hand>}
          </Box>
        ))}
      </div>
      <Callout pos="bot-left" style={{ bottom: 60, left: 80 }}>← drag = bump status</Callout>
    </div>
  );
}

// ── A5: REASONS canvas as a real "canvas" (post-it grid) ──
function S_Postit() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-dots">
      <ArtTitle title="A5 · REASONS as a wall of post-its" sub="Tactile, drag chips between R/E/A/S/O/N/S — like a design studio wall" />
      <div style={{ position: "absolute", inset: "78px 22px 22px 22px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {[
          ["R", "Requirements", ["lit story", "lit analyse", "idempotent", "merge non-destr."]],
          ["E", "Entities", ["Canvas", "Section", "Operation", "Norm", "Safeguard"]],
          ["A", "Approach", ["1. context", "2. inject", "3. parse"]],
          ["S", "Structure", ["canvas.go", "parser.go", "tmpl"]],
          ["O", "Operations", ["BuildContext", "ParseCanvas", "Validate", "Merge", "Write"]],
          ["N", "Norms", ["slog text", "errs %w", "i18n FR/EN"]],
          ["S", "Safeguards", ["no PII", "atomic write", "5min timeout", "no telemetry"]],
        ].map(([l, n, items], ci) => (
          <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ textAlign: "center" }}>
              <Hand size={28} color="var(--accent)" style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>{l}</Hand>
              <div><Mono>{n}</Mono></div>
            </div>
            {items.map((t, i) => (
              <div key={i} style={{
                background: ci === 4 ? "var(--highlight-2)" : (ci % 2 ? "var(--highlight)" : "#c5d8d880"),
                border: "1.2px solid var(--ink-2)",
                padding: "6px 8px",
                borderRadius: "5px 8px 4px 9px",
                transform: `rotate(${(i % 2 ? -1 : 1) * (0.5 + (i % 3) * 0.4)}deg)`,
                boxShadow: "1.5px 2px 0 rgba(0,0,0,0.08)",
              }}>
                <Hand size={11.5}>{t}</Hand>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Callout pos="top-right" style={{ top: 60, right: 80 }}>chips draggable between cols</Callout>
    </div>
  );
}

// ── A6: Split editor — markdown left, rendered right ──
function S_Split() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="A6 · Split markdown editor" sub="Source on the left, rendered canvas on the right — Obsidian / Typora vibe" />
      <div style={{ position: "absolute", inset: "78px 22px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <Box className="thin" style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <Mono>CORE-002b-reasons-canvas.md</Mono>
          <span style={{ flex: 1 }} />
          <Tag>edit</Tag><Tag tone="accent">preview</Tag><Tag>split</Tag>
        </Box>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minHeight: 0 }}>
          {/* markdown */}
          <Box className="thin" style={{ padding: 16, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7, background: "#fbf8f0" }}>
            <div style={{ color: "var(--ink-3)" }}>---</div>
            <div><span style={{ color: "var(--accent-2)" }}>id</span>: CORE-002b</div>
            <div><span style={{ color: "var(--accent-2)" }}>status</span>: reviewed</div>
            <div style={{ color: "var(--ink-3)" }}>---</div>
            <div style={{ height: 8 }} />
            <div style={{ color: "var(--accent)", fontWeight: 700 }}># Canvas — reasons-canvas</div>
            <div style={{ height: 4 }} />
            <div style={{ color: "var(--accent)" }}>## R — Requirements</div>
            <div>- lit story+analyse</div>
            <div>- canvas R-E-A-S-O-N-S complet</div>
            <div>- idempotent</div>
            <div style={{ background: "var(--highlight-2)", padding: "0 4px" }}>- merge non destructif (new)</div>
            <div style={{ height: 4 }} />
            <div style={{ color: "var(--accent)" }}>## O — Operations</div>
            <div>- O1 BuildContext...</div>
            <div>- O2 ParseCanvas...</div>
          </Box>
          {/* rendered */}
          <Box className="thin" style={{ padding: 16, background: "var(--paper)" }}>
            <Hand size={20} style={{ fontFamily: "var(--hand-2)", fontWeight: 600 }}>Canvas — reasons-canvas</Hand>
            <div style={{ marginTop: 12 }}>
              <Hand size={16} color="var(--accent)" style={{ fontWeight: 700 }}>R — Requirements</Hand>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                <li><Hand size={12.5}>lit story + analyse</Hand></li>
                <li><Hand size={12.5}>canvas R-E-A-S-O-N-S complet</Hand></li>
                <li><Hand size={12.5}>idempotent</Hand></li>
                <li><Hand size={12.5} color="var(--accent)">merge non destructif</Hand></li>
              </ul>
              <div style={{ height: 10 }} />
              <Hand size={16} color="var(--accent)" style={{ fontWeight: 700 }}>O — Operations</Hand>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {["O1 BuildContext", "O2 ParseCanvas"].map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <Mono color="var(--accent)">{o.split(" ")[0]}</Mono>
                    <Hand size={12.5}>{o.split(" ")[1]}</Hand>
                  </div>
                ))}
              </div>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

// ── A7: Run console (the LIVE generate) ──
function S_RunConsole() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="A7 · Run console" sub="What you see while yukki generate is running — live agent activity" />
      <div style={{ position: "absolute", inset: "78px 30px 22px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Hand size={20} style={{ fontFamily: "var(--hand-2)" }}>$ yukki generate CORE-002b</Hand>
          <span style={{ flex: 1 }} />
          <Tag tone="accent">running…</Tag>
          <Btn ghost>■ stop</Btn>
        </div>
        {/* progress steps */}
        <Box className="thin" style={{ padding: 12 }}>
          <Hand size={13} color="var(--ink-2)" style={{ marginBottom: 8 }}>plan (8 operations)</Hand>
          {[
            ["O1 BuildContext", "done", "internal/workflow/canvas.go"],
            ["O2 RenderPrompt", "done", "internal/workflow/canvas.go"],
            ["O3 ParseCanvas", "running", "internal/canvas/parser.go"],
            ["O4 ValidateCanvas", "queued", "internal/canvas/validator.go"],
            ["O5 MergeCanvas", "queued", "internal/canvas/merge.go"],
          ].map(([n, s, f], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 200px 1fr 80px", padding: "5px 0", alignItems: "center", gap: 8 }}>
              <Hand size={14} color={s === "done" ? "var(--accent-2)" : s === "running" ? "var(--accent)" : "var(--ink-3)"}>
                {s === "done" ? "✓" : s === "running" ? "▸" : "○"}
              </Hand>
              <Hand size={13} style={{ fontWeight: s === "running" ? 700 : 400 }}>{n}</Hand>
              <Mono>{f}</Mono>
              <Tag tone={s === "done" ? "cool" : s === "running" ? "accent" : ""}>{s}</Tag>
            </div>
          ))}
        </Box>
        {/* split: live diff + provider stream */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10, minHeight: 0 }}>
          <Box className="thin" style={{ padding: 12, background: "#fbf8f0" }}>
            <Hand size={13} color="var(--ink-2)" style={{ marginBottom: 6 }}>live diff — internal/canvas/parser.go</Hand>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, lineHeight: 1.6 }}>
              <div style={{ color: "var(--ink-3)" }}> 14  func ParseCanvas(s string) (Canvas, error) {`{`}</div>
              <div style={{ background: "#c5d8d840" }}>+15    sections, err := splitSections(s)</div>
              <div style={{ background: "#c5d8d840" }}>+16    if err != nil {`{`} return Canvas{`{}`}, err {`}`}</div>
              <div style={{ background: "var(--highlight-2)" }}>~17    return assemble(sections), nil</div>
              <div style={{ color: "var(--ink-3)" }}> 18  {`}`}</div>
            </div>
          </Box>
          <Box className="thin filled-cool" style={{ padding: 12 }}>
            <Hand size={13} color="var(--accent-2)" style={{ marginBottom: 6, fontWeight: 700 }}>claude stream</Hand>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {["thinking…", "I'll split the markdown into sections", "first by ## headers", "then validate each", "writing parser.go..."].map((t, i) => (
                <Mono key={i} size={10}>· {t}</Mono>
              ))}
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

// ── B1: Status / project dashboard (home) ──
function S_Dashboard() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-grid">
      <ArtTitle title="B1 · Project home" sub="Landing page when you open yukki ui — what's going on right now" />
      <div style={{ position: "absolute", inset: "78px 30px 22px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <Bunny size={28} />
          <Hand size={28} style={{ fontFamily: "var(--hand-2)" }}>yukki / yukki</Hand>
          <Mono>main · 3 modifiés</Mono>
          <span style={{ flex: 1 }} />
          <Btn primary>+ nouvelle story</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[["12", "stories"], ["4", "analyses"], ["4", "canvas"], ["7/12", "implementées"]].map(([n, l], i) => (
            <Box key={i} style={{ padding: 14, textAlign: "center" }} className={i === 3 ? "filled-accent" : ""}>
              <Hand size={36} style={{ fontFamily: "var(--hand-2)", fontWeight: 700, color: "var(--accent)" }}>{n}</Hand>
              <Mono>{l}</Mono>
            </Box>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
          <Box style={{ padding: 14 }}>
            <Hand size={16} style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>en cours</Hand>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                ["CORE-002b", "reviewed", "canvas REASONS — review humaine", "★"],
                ["CORE-002a", "accepted", "analysis command → ready to generate", ""],
                ["META-006", "draft", "naming format", ""],
                ["INT-001", "needs-update", "copilot provider — sync after refactor", "↻"],
              ].map(([id, st, t, marker], i) => (
                <Box key={i} className="thin" style={{ padding: 8, display: "grid", gridTemplateColumns: "80px 100px 1fr 30px", gap: 10, alignItems: "center" }}>
                  <Mono color="var(--accent)">{id}</Mono>
                  <Tag tone={st === "needs-update" ? "accent" : st === "draft" ? "" : "cool"}>{st}</Tag>
                  <Hand size={13}>{t}</Hand>
                  <Hand size={16} color="var(--accent)">{marker}</Hand>
                </Box>
              ))}
            </div>
          </Box>
          <Box style={{ padding: 14 }} className="filled-cool">
            <Hand size={16} style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>activité git</Hand>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                "spec: bump CORE-002b reviewed",
                "feat(canvas): add MergeCanvas (O5)",
                "test: parser BVA cases",
                "spec: write CORE-002b analysis",
                "spec: clarify CORE-002b story",
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <Mono size={10} color="var(--accent-2)">{Math.floor(Math.random() * 1000).toString(16)}</Mono>
                  <Hand size={11}>{c}</Hand>
                </div>
              ))}
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

// ── B2: Methodology browser ──
function S_Methodology() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="B2 · Methodology browser" sub="Read & teach the SPDD refs — pedagogy as a first-class surface" />
      <div style={{ position: "absolute", inset: "78px 30px 22px 30px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
        <Box style={{ padding: 12 }}>
          <Mono>spdd/methodology/</Mono>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
            {["DDD-tactical ★", "STRIDE", "BVA + EP", "Y-Statement", "INVEST", "SPIDR", "Given/When/Then"].map((r, i) => (
              <div key={i} style={{
                padding: "5px 8px",
                background: r.includes("★") ? "var(--highlight)" : "transparent",
                border: r.includes("★") ? "1.2px solid var(--accent)" : "1px dashed var(--ink-4)",
                borderRadius: 5,
              }}>
                <Hand size={12}>{r}</Hand>
              </div>
            ))}
          </div>
        </Box>
        <Box style={{ padding: 22, background: "#fbf8f0" }}>
          <Mono>methodology · 1/7</Mono>
          <Hand size={28} style={{ fontFamily: "var(--hand-2)", fontWeight: 600 }}>Domain-Driven Design (tactical)</Hand>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Tag>Eric Evans, 2003</Tag><Tag tone="cool">~10 min lecture</Tag>
          </div>
          <div className="line-h dotted" style={{ marginTop: 12 }} />
          <Hand size={16} italic color="var(--ink-2)" style={{ marginTop: 10, display: "block" }}>
            DDD distingue les Entities (identité dans le temps), les Value Objects (immuables, comparés par valeur)…
          </Hand>
          <div style={{ marginTop: 14 }}>
            <Hand size={14} color="var(--accent)" style={{ fontWeight: 700 }}>§ Exemple yukki</Hand>
            <Box className="thin" style={{ padding: 10, marginTop: 6, background: "var(--paper-shade)" }}>
              <Mono size={11}>Canvas (entity) · Section (VO) · Operation (VO) · Repository = artifacts.Writer</Mono>
            </Box>
            <Hand size={14} color="var(--accent)" style={{ fontWeight: 700, display: "block", marginTop: 14 }}>§ Comment l'utiliser dans REASONS</Hand>
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              <Scribble w="95%" /><Scribble w="88%" /><Scribble w="76%" /><Scribble w="92%" />
            </div>
          </div>
        </Box>
      </div>
      <Callout pos="top-right" style={{ top: 60, right: 80 }}>autoportant. enseigne.</Callout>
    </div>
  );
}

// ── B3: Diff / merge of two canvas versions ──
function S_Diff() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-grid">
      <ArtTitle title="B3 · Canvas diff" sub="prompt-update + sync — what's about to change in the spec" />
      <div style={{ position: "absolute", inset: "78px 22px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Box className="thin" style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <Mono>CORE-002b · canvas v0.3 (accepted) → v0.4 (reviewed)</Mono>
          <span style={{ flex: 1 }} />
          <Tag tone="cool">+ 6 ajouts</Tag>
          <Tag tone="accent">~ 3 modifs</Tag>
          <Tag>– 0 suppr.</Tag>
        </Box>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minHeight: 0 }}>
          <Box className="thin" style={{ padding: 12, background: "#fbf8f0" }}>
            <Mono>v0.3 · accepted · 2026-04-22</Mono>
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10.5, lineHeight: 1.7 }}>
              <div style={{ color: "var(--accent)" }}>## E — Entities</div>
              <div>- Canvas</div>
              <div>- Section</div>
              <div>- Operation</div>
              <div>- Norm, Safeguard</div>
              <div style={{ height: 8 }} />
              <div style={{ color: "var(--accent)" }}>## S — Safeguards</div>
              <div style={{ background: "rgba(216,105,62,0.12)", textDecoration: "line-through" }}>- timeout: pas de défaut</div>
            </div>
          </Box>
          <Box className="thin" style={{ padding: 12, background: "#fbf8f0" }}>
            <Mono color="var(--accent)">v0.4 · reviewed · 2026-04-30</Mono>
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10.5, lineHeight: 1.7 }}>
              <div style={{ color: "var(--accent)" }}>## E — Entities</div>
              <div>- Canvas</div>
              <div>- Section</div>
              <div>- Operation</div>
              <div>- Norm, Safeguard</div>
              <div style={{ background: "#c5d8d860" }}>+ ProviderTranscript</div>
              <div style={{ height: 8 }} />
              <div style={{ color: "var(--accent)" }}>## S — Safeguards</div>
              <div style={{ background: "var(--highlight-2)" }}>~ timeout: 5min par défaut, --timeout override</div>
            </div>
          </Box>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn ghost>ouvrir dans l'éditeur</Btn>
          <Btn>annuler</Btn>
          <Btn primary>accepter v0.4</Btn>
        </div>
      </div>
    </div>
  );
}

// ── B4: Command palette / quick actions ──
function S_Palette() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="B4 · Command palette" sub="⌘K — sauter à n'importe quel artefact ou commande" />
      <div style={{ position: "absolute", inset: "78px 60px 22px 60px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* simulated dim background */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(20,18,15,0.18)",
            border: "1.5px dashed var(--ink-4)",
            borderRadius: 8,
            display: "grid", placeItems: "center",
          }}>
            <Hand size={14} color="var(--ink-3)" italic>app dimmed behind</Hand>
          </div>
          {/* palette */}
          <div style={{
            position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)",
            width: 520,
          }}>
            <Box className="thick" style={{ padding: 0, boxShadow: "4px 6px 0 rgba(0,0,0,0.1)", background: "var(--paper)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--ink-2)", display: "flex", alignItems: "center", gap: 8 }}>
                <Hand size={16} color="var(--accent)">⌘</Hand>
                <Hand size={15}>reasons-canvas</Hand>
                <span style={{ flex: 1 }} />
                <Mono>esc</Mono>
              </div>
              <div style={{ padding: 4 }}>
                {[
                  ["cmd", "yukki reasons-canvas", "génère le canvas REASONS depuis story+analyse", true],
                  ["canvas", "CORE-002b · reasons-canvas", "spdd/prompts/CORE-002b-…md", false],
                  ["story", "CORE-002b · canvas REASONS", "spdd/stories/CORE-002b-…md", false],
                  ["ref", "spdd/methodology/reasons-canvas.md", "documentation méthodologique", false],
                  ["cmd", "yukki prompt-update", "corriger un canvas existant", false],
                ].map(([k, t, h, sel], i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "70px 1fr auto",
                    padding: "8px 12px", gap: 12, alignItems: "center",
                    background: sel ? "var(--highlight)" : "transparent",
                    borderRadius: 5,
                  }}>
                    <Mono color="var(--accent)">{k}</Mono>
                    <div>
                      <Hand size={13} style={{ fontWeight: sel ? 700 : 400 }}>{t}</Hand>
                      <div><Mono size={10} color="var(--ink-3)">{h}</Mono></div>
                    </div>
                    {sel && <Mono>↵</Mono>}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 12px", borderTop: "1.5px dashed var(--ink-4)", display: "flex", gap: 14 }}>
                <Mono size={10}>↑↓ navigate</Mono>
                <Mono size={10}>↵ run</Mono>
                <Mono size={10}>⇥ filter</Mono>
              </div>
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── B5: Mobile / phone view ──
function S_Mobile() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper-dots">
      <ArtTitle title="B5 · Mobile / phone view" sub="Read-only triage — accept / nudge / comment a canvas from your phone" />
      <div style={{ position: "absolute", inset: "78px 0 22px 0", display: "flex", justifyContent: "center", gap: 30 }}>
        {[1, 2].map((screen, idx) => (
          <Box key={screen} className="thick" style={{
            width: 220, height: 460,
            borderRadius: 26, padding: 12,
            background: "var(--paper-shade)",
            position: "relative",
          }}>
            <Box className="thin" style={{ height: "100%", padding: 10, background: "var(--paper)", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Bunny size={14} />
                <Mono>yukki</Mono>
                <span style={{ flex: 1 }} />
                <Mono>9:41</Mono>
              </div>
              <div className="line-h" style={{ margin: "8px 0" }} />
              {idx === 0 ? (
                <>
                  <Hand size={14} style={{ fontFamily: "var(--hand-2)", fontWeight: 700 }}>en review</Hand>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {["CORE-002b ★", "META-006", "INT-001 ↻"].map((t, i) => (
                      <Box key={i} className="thin" style={{ padding: 7 }}>
                        <Mono color="var(--accent)">{t.split(" ")[0]}</Mono>
                        <Hand size={11}>review canvas REASONS</Hand>
                        <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                          <Tag>reviewed</Tag>
                        </div>
                      </Box>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Mono>CORE-002b</Mono>
                  <Hand size={14} style={{ fontFamily: "var(--hand-2)", fontWeight: 600 }}>reasons-canvas</Hand>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    <Tag tone="accent">+6</Tag><Tag>~3</Tag>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Hand size={12} color="var(--accent)" style={{ fontWeight: 700 }}>R · Requirements</Hand>
                    <Scribble w="100%" /><Scribble w="80%" />
                    <div style={{ height: 6 }} />
                    <Hand size={12} color="var(--accent)" style={{ fontWeight: 700 }}>O · Operations</Hand>
                    <Scribble w="92%" /><Scribble w="70%" />
                  </div>
                  <div style={{ position: "absolute", bottom: 18, left: 22, right: 22, display: "flex", gap: 6 }}>
                    <Btn ghost style={{ flex: 1, fontSize: 11, padding: "5px 8px" }}>nudge</Btn>
                    <Btn primary style={{ flex: 1, fontSize: 11, padding: "5px 8px" }}>accepter</Btn>
                  </div>
                </>
              )}
            </Box>
          </Box>
        ))}
      </div>
      <Callout pos="bot-left" style={{ bottom: 80, left: 80 }}>not the main feature, but useful for review</Callout>
    </div>
  );
}

// ── C1: Logo / wordmark explorations ──
function S_Logos() {
  return (
    <div style={{ position: "relative", height: "100%" }} className="paper">
      <ArtTitle title="C1 · Wordmark + rabbit explorations" sub="A few rabbit marks — geometric, hand-drawn, monogram" />
      <div style={{ position: "absolute", inset: "78px 30px 22px 30px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {[
          { name: "geo", desc: "geometric, two arcs + soft head", svg: <Bunny size={64} /> },
          { name: "stamp", desc: "circle stamp, 'y' inside",
            svg: <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" stroke="var(--ink)" strokeWidth="2" fill="var(--highlight)" />
              <path d="M22 14 C 20 22, 22 28, 26 28 M42 14 C 44 22, 42 28, 38 28" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="32" y="46" textAnchor="middle" fontFamily="var(--hand-2)" fontSize="22" fontWeight="700" fill="var(--ink)">y</text>
            </svg>
          },
          { name: "ear-y", desc: "the 'y' has rabbit ears — wordmark only",
            svg: <svg width="120" height="64" viewBox="0 0 120 64">
              <text x="10" y="48" fontFamily="var(--hand-2)" fontSize="40" fontWeight="700" fill="var(--ink)">yukki</text>
              <path d="M19 12 C 17 18, 17 24, 19 28 M27 12 C 29 18, 29 24, 27 28" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          },
          { name: "hand", desc: "hand-drawn rabbit (sketchbook vibe)",
            svg: <svg width="64" height="64" viewBox="0 0 64 64">
              <path d="M22 8 C 18 18, 19 28, 24 32 M42 8 C 46 18, 45 28, 40 32" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
              <ellipse cx="32" cy="42" rx="14" ry="14" stroke="var(--ink)" strokeWidth="2" fill="none" />
              <circle cx="27" cy="40" r="1.4" fill="var(--ink)" />
              <circle cx="37" cy="40" r="1.4" fill="var(--ink)" />
              <path d="M30 46 Q 32 48 34 46" stroke="var(--ink)" strokeWidth="1.4" fill="none" />
            </svg>
          },
          { name: "minimal", desc: "lowercase only, no mark",
            svg: <span style={{ fontFamily: "JetBrains Mono", fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em" }}>yukki/</span>
          },
          { name: "spdd-cycle", desc: "rabbit inside the 7-cycle",
            svg: <svg width="80" height="80" viewBox="0 0 80 80">
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
                const x = 40 + Math.cos(a) * 28;
                const y = 40 + Math.sin(a) * 28;
                return <circle key={i} cx={x} cy={y} r="3.5" fill={i === 2 ? "var(--accent)" : "var(--ink-2)"} />;
              })}
              <g transform="translate(28,28) scale(0.75)"><Bunny size={32} /></g>
            </svg>
          },
        ].map((l, i) => (
          <Box key={i} className="thin" style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minHeight: 180 }}>
            <div style={{ flex: 1, display: "grid", placeItems: "center" }}>{l.svg}</div>
            <Mono color="var(--accent)">{l.name}</Mono>
            <Hand size={11.5} color="var(--ink-2)" italic style={{ textAlign: "center" }}>{l.desc}</Hand>
          </Box>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  S_3Pane, S_Notebook, S_Pipeline, S_Kanban, S_Postit, S_Split, S_RunConsole,
  S_Dashboard, S_Methodology, S_Diff, S_Palette, S_Mobile, S_Logos,
});
