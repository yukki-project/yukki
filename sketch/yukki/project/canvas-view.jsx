// canvas-view.jsx — The REASONS canvas centerpiece + supporting views

const REASONS_LETTERS = ["R", "E", "A", "S", "O", "N", "S2"];

function ReasonsCanvas({ canvas }) {
  return (
    <div className="reasons">
      {REASONS_LETTERS.map((key) => {
        const col = canvas.columns[key];
        return (
          <div className="col" key={key}>
            <div className="col-h">
              <span className="letter">{col.letter}</span>
              <span className="name">{col.name}</span>
              <span className="count">{col.count}</span>
            </div>
            <div className="col-b">
              {col.items.map((it, i) => (
                <div key={i} className="chip" data-diff={it.diff || ""} data-active={it.active ? "1" : "0"}>
                  <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Pill({ tone, children }) {
  return <span className="pill" data-tone={tone}><span className="dot"/>{children}</span>;
}

function ArtefactHeader({ canvas, lang }) {
  return (
    <div className="art-head">
      <div className="crumbs">
        <span className="seg">spdd</span><span>/</span>
        <span className="seg">prompts</span><span>/</span>
        <span className="seg cur">{canvas.id}-{canvas.slug}.md</span>
      </div>
      <h1>{canvas.title}</h1>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <Pill tone="accent">canvas REASONS</Pill>
        <Pill tone="info">status: {canvas.status}</Pill>
        <Pill>{canvas.id}</Pill>
        {canvas.methodology.map(m => <Pill key={m}>{m}</Pill>)}
      </div>
      <div className="meta-row">
        <div className="meta"><span className="k">author</span><span className="v">{canvas.author}</span></div>
        <div className="meta"><span className="k">created</span><span className="v">{canvas.created}</span></div>
        <div className="meta"><span className="k">updated</span><span className="v">{canvas.updated}</span></div>
        <div className="meta"><span className="k">AC</span><span className="v">{canvas.ac_count}</span></div>
        <div className="meta"><span className="k">Operations</span><span className="v">{canvas.ops_count}</span></div>
        <div className="meta"><span className="k">Safeguards</span><span className="v">{canvas.safeguards_count}</span></div>
      </div>
    </div>
  );
}

function SectionHeader({ num, children }) {
  return <h2><span className="num">{num}</span><span>{children}</span><span className="rule"/></h2>;
}

function CanvasArtefact({ canvas, lang, mode }) {
  if (mode === "code") return <CodePane canvas={canvas} />;
  return (
    <>
      <ArtefactHeader canvas={canvas} lang={lang} />
      <div className="art-body">
        <section>
          <SectionHeader num="§1">{lang==="fr" ? "Synthèse" : "Summary"}</SectionHeader>
          <p className="lede">
            {lang==="fr"
              ? "Spec exécutable de la commande yukki reasons-canvas — lit la story et l'analyse, demande au provider un canvas R-E-A-S-O-N-S structuré, valide le format, écrit atomiquement dans spdd/prompts/."
              : "Executable spec for yukki reasons-canvas — reads story+analysis, requests a structured R-E-A-S-O-N-S canvas from the provider, validates format, writes atomically to spdd/prompts/."}
          </p>
          <div className="diff-h" style={{marginTop:14}}>
            <span><span className="add">+ 6 ajouts</span> · <span className="mod">~ 3 modifs</span> · <span className="del">– 0 suppressions</span></span>
            <span style={{marginLeft:"auto"}}>vs. <b style={{color:"var(--fg-0)"}}>v0.3 (accepted)</b> · 2026-04-22</span>
          </div>
        </section>

        <section>
          <SectionHeader num="§2">{lang==="fr" ? "Canvas R-E-A-S-O-N-S" : "R-E-A-S-O-N-S canvas"}</SectionHeader>
          <ReasonsCanvas canvas={canvas} />
        </section>

        <section>
          <SectionHeader num="§3">Operations</SectionHeader>
          <div className="ops-table">
            <div className="row head">
              <span>id</span><span>signature</span><span>file</span><span>tests</span><span>diff</span>
            </div>
            {canvas.operations.map(op => (
              <div key={op.id} className="row">
                <span className="id">{op.id}</span>
                <span className="sig">
                  {op.sig}<span className="args">({op.args})</span> <span className="ret">{op.ret}</span>
                </span>
                <span className="file">{op.file}</span>
                <span className="tests">
                  <span className={op.tests.pass === op.tests.total ? "pass" : (op.tests.pass === 0 ? "miss" : "")}>
                    {op.tests.pass}/{op.tests.total}
                  </span>
                </span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:11}}>
                  {op.id === "O3" && <span style={{color:"var(--warn)"}}>~ mod</span>}
                  {op.id === "O5" && <span style={{color:"var(--ok)"}}>+ new</span>}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader num="§4">{lang==="fr" ? "Risques (STRIDE)" : "Risks (STRIDE)"}</SectionHeader>
          <div className="risks">
            {canvas.risks.map((r, i) => (
              <div key={i} className="risk">
                <div className="h">
                  <span>{r.cat}</span>
                  <span className="lvl" data-l={r.lvl} title={r.lvl} />
                </div>
                <div className="body">{r.body}</div>
                <div className="mit">→ {r.mit}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader num="§5">{lang==="fr" ? "Critères d'acceptation (Given / When / Then)" : "Acceptance criteria"}</SectionHeader>
          {canvas.acs.map(ac => (
            <div key={ac.id} className="ac">
              <div className="ac-h">
                <span className="id">{ac.id}</span>
                <span style={{color:"var(--fg-3)"}}>·</span>
                <span className="title">{ac.title}</span>
              </div>
              <div className="gwt">
                <span className="k">given</span><span className="v">{ac.given}</span>
                <span className="k">when</span><span className="v"><em>quand</em> {ac.when}</span>
                <span className="k">then</span><span className="v">{ac.then}</span>
              </div>
            </div>
          ))}
        </section>

        <section>
          <SectionHeader num="§6">Norms</SectionHeader>
          <div className="bullets">
            {canvas.norms.map((n, i) => (
              <div key={i} className="bl">
                <span className="k">{n.k}</span>
                <span className="v">{n.v}<em>{n.note}</em></span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader num="§7">Safeguards</SectionHeader>
          <div className="bullets">
            {canvas.safeguards.map((n, i) => (
              <div key={i} className="bl">
                <span className="k">{n.k}</span>
                <span className="v">{n.v}<em>{n.note}</em></span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader num="§8">{lang==="fr" ? "Questions ouvertes" : "Open questions"}</SectionHeader>
          <div className="oq">
            {canvas.openQuestions.map((q, i) => (
              <div key={i} className="q">
                <span className="marker">?</span>
                <div className="body">{q.q}<em>{q.hint}</em></div>
                <button className="resolve">trancher</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// Markdown / yaml mini-render of the same artefact
function CodePane({ canvas }) {
  const lines = [
    { t: "fm", c: "---" },
    { t: "fm", c: <><span className="y-key">id</span>: <span className="y-val">{canvas.id}</span></> },
    { t: "fm", c: <><span className="y-key">slug</span>: <span className="y-val">{canvas.slug}</span></> },
    { t: "fm", c: <><span className="y-key">type</span>: <span className="y-val">canvas-reasons</span></> },
    { t: "fm", c: <><span className="y-key">status</span>: <span className="y-val">{canvas.status}</span></> },
    { t: "fm", c: <><span className="y-key">author</span>: <span className="y-str">{canvas.author}</span></> },
    { t: "fm", c: <><span className="y-key">methodology</span>:</> },
    ...canvas.methodology.map(m => ({ t: "fm", c: <>  - <span className="y-str">{m}</span></> })),
    { t: "fm", c: "---" },
    { t: "md", c: "" },
    { t: "md", c: <span className="md-h"># {canvas.title}</span> },
    { t: "md", c: "" },
    { t: "md", c: <span className="md-h">## R — Requirements</span> },
    ...canvas.columns.R.items.map(it => ({ t: "md", c: <span className="md-li">- {it.t}{it.diff === "add" ? " (new)" : ""}</span> })),
    { t: "md", c: "" },
    { t: "md", c: <span className="md-h">## E — Entities</span> },
    ...canvas.columns.E.items.map(it => ({ t: "md", c: <span className="md-li">- {it.t}</span> })),
    { t: "md", c: "" },
    { t: "md", c: <span className="md-h">## O — Operations</span> },
    ...canvas.operations.map(op => ({ t: "md", c: <span className="md-li">- <span className="md-em">{op.id}</span> {op.sig}({op.args}) {op.ret}</span> })),
    { t: "md", c: "" },
    { t: "md", c: <span className="md-h">## S — Safeguards</span> },
    ...canvas.safeguards.map(s => ({ t: "md", c: <span className="md-li">- <span className="md-em">{s.k}</span>: {s.v}</span> })),
  ];
  return (
    <div className="art-body">
      <div className="code-pane">
        {lines.map((ln, i) => (
          <div key={i} className={ln.t === "fm" ? "ln-row frontmatter" : "ln-row"}>
            <span className="ln">{i + 1}</span>
            <span className="lc">{ln.c || "\u00a0"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CanvasArtefact, ReasonsCanvas });
