// right-panel.jsx — Provider stream / inspector / diff tabs

const { useState: useState2 } = React;

function ProviderStream({ stream }) {
  return (
    <>
      <div className="rp-body">
        <div className="stream">
          {stream.map((l, i) => (
            <div key={i} className="line">
              <span className="t">{l.t}</span>
              <span className="tag" data-k={l.k}>{l.k}</span>
              <span className="msg" dangerouslySetInnerHTML={{__html: l.msg}} />
            </div>
          ))}
        </div>
      </div>
      <div className="stream-input">
        <input placeholder="Reprise du contexte avec le provider… (⏎ pour envoyer)" />
        <button>Envoyer</button>
      </div>
    </>
  );
}

function InspectorTab({ canvas }) {
  return (
    <div className="rp-body">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:10.5,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-2)",marginBottom:6,fontWeight:600}}>Lifecycle</div>
          <div style={{display:"flex",alignItems:"center",gap:0,fontFamily:"var(--font-mono)",fontSize:11}}>
            {canvas.lifecycle.map((s, i) => {
              const cur = s === canvas.status;
              const passed = canvas.lifecycle.indexOf(canvas.status) >= i;
              return (
                <React.Fragment key={s}>
                  <span style={{
                    padding:"3px 7px", borderRadius:4,
                    background: cur ? "var(--accent-soft)" : "transparent",
                    color: cur ? "var(--accent)" : (passed ? "var(--fg-1)" : "var(--fg-3)"),
                    border: cur ? "1px solid var(--accent-line)" : "1px solid transparent",
                  }}>{s}</span>
                  {i < canvas.lifecycle.length - 1 && <span style={{color: passed ? "var(--accent)" : "var(--fg-3)",margin:"0 2px"}}>›</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{fontSize:10.5,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-2)",marginBottom:6,fontWeight:600}}>Front-matter</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:11.5,color:"var(--fg-1)",lineHeight:1.7,background:"var(--bg-2)",padding:"8px 10px",borderRadius:6,border:"1px solid var(--line)"}}>
            <div><span style={{color:"var(--accent-2)"}}>id</span>: <span style={{color:"var(--fg-0)"}}>{canvas.id}</span></div>
            <div><span style={{color:"var(--accent-2)"}}>slug</span>: <span style={{color:"var(--fg-0)"}}>{canvas.slug}</span></div>
            <div><span style={{color:"var(--accent-2)"}}>type</span>: canvas-reasons</div>
            <div><span style={{color:"var(--accent-2)"}}>status</span>: <span style={{color:"var(--info)"}}>{canvas.status}</span></div>
            <div><span style={{color:"var(--accent-2)"}}>author</span>: <span style={{color:"var(--ok)"}}>{canvas.author}</span></div>
            <div><span style={{color:"var(--accent-2)"}}>updated</span>: {canvas.updated}</div>
          </div>
        </div>

        <div>
          <div style={{fontSize:10.5,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-2)",marginBottom:6,fontWeight:600}}>Validations</div>
          <div className="checklist">
            {[
              {l:"Front-matter YAML valide",ok:true},
              {l:"7 sections REASONS présentes",ok:true},
              {l:"Operations: signatures Go-compatibles",ok:true},
              {l:"AC en Given/When/Then",ok:true},
              {l:"Tous les Safeguards ont une priorité (MUST/SHOULD)",ok:true},
              {l:"Edge cases couvrent BVA + EP",ok:false},
              {l:"Y-Statement présent",ok:false},
            ].map((c, i) => (
              <div key={i} className="ck" data-on={c.ok ? "1" : "0"}>
                <span className="box"><Icon.Check w={10}/></span>
                <span style={{color: c.ok ? "var(--fg-1)" : "var(--fg-3)"}}>{c.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{fontSize:10.5,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-2)",marginBottom:6,fontWeight:600}}>Liens</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,fontFamily:"var(--font-mono)",fontSize:11.5}}>
            <a style={{color:"var(--info)",textDecoration:"none"}}>↪ spdd/stories/{canvas.id}-{canvas.slug}.md</a>
            <a style={{color:"var(--info)",textDecoration:"none"}}>↪ spdd/analysis/{canvas.id}-{canvas.slug}.md</a>
            <a style={{color:"var(--info)",textDecoration:"none"}}>↪ spdd/tests/{canvas.id}-{canvas.slug}.md</a>
            <a style={{color:"var(--fg-3)",textDecoration:"none"}}>↪ spdd/methodology/reasons-canvas.md</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffTab() {
  const lines = [
    { k: "ctx", n: 14, t: "## A — Approach" },
    { k: "ctx", n: 15, t: "" },
    { k: "ctx", n: 16, t: "1. read story+analysis → context" },
    { k: "del", n: 17, t: "2. inject prompt template (raw)" },
    { k: "add", n: 17, t: "2. inject prompt template (with redaction filter)" },
    { k: "ctx", n: 18, t: "3. parse + validate response" },
    { k: "ctx", n: 19, t: "" },
    { k: "ctx", n: 20, t: "## E — Entities" },
    { k: "ctx", n: 21, t: "- Canvas (aggregate root)" },
    { k: "add", n: 22, t: "- ProviderTranscript" },
    { k: "ctx", n: 23, t: "" },
    { k: "ctx", n: 24, t: "## S — Safeguards" },
    { k: "del", n: 25, t: "- timeout: pas de défaut, à la discrétion du caller" },
    { k: "add", n: 25, t: "- timeout: 5min par défaut, --timeout pour override" },
  ];
  return (
    <div className="rp-body">
      <div style={{fontFamily:"var(--font-mono)",fontSize:11.5,lineHeight:1.6,background:"var(--bg-0)",border:"1px solid var(--line)",borderRadius:6,overflow:"hidden"}}>
        {lines.map((ln, i) => {
          const bg = ln.k === "add" ? "oklch(0.80 0.13 150 / 0.10)" : ln.k === "del" ? "oklch(0.72 0.16 25 / 0.10)" : "transparent";
          const sign = ln.k === "add" ? "+" : ln.k === "del" ? "−" : " ";
          const c = ln.k === "add" ? "var(--ok)" : ln.k === "del" ? "var(--bad)" : "var(--fg-2)";
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"36px 16px 1fr",background:bg}}>
              <span style={{color:"var(--fg-3)",fontSize:10.5,textAlign:"right",padding:"2px 6px"}}>{ln.n}</span>
              <span style={{color: c, padding:"2px 0",textAlign:"center"}}>{sign}</span>
              <span style={{color:"var(--fg-1)",padding:"2px 8px",whiteSpace:"pre"}}>{ln.t || "\u00a0"}</span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:10.5,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-2)",marginBottom:6,fontWeight:600}}>Comparé avec</div>
        <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--fg-1)"}}>
          <div>HEAD: 2026-04-30 14:02 · status=reviewed</div>
          <div style={{color:"var(--fg-3)"}}>v0.3: 2026-04-22 09:14 · status=accepted</div>
        </div>
      </div>
    </div>
  );
}

function RightPanel({ canvas, stream }) {
  const [tab, setTab] = useState2("stream");
  return (
    <div className="rightpanel">
      <div className="rp-head">
        <span>Provider</span>
        <div className="prov-pill"><span className="live"/>claude-cli · sonnet 4.5</div>
      </div>
      <div className="rp-tabs">
        <button data-active={tab==="stream"?"1":"0"} onClick={()=>setTab("stream")}>Stream</button>
        <button data-active={tab==="inspector"?"1":"0"} onClick={()=>setTab("inspector")}>Inspector</button>
        <button data-active={tab==="diff"?"1":"0"} onClick={()=>setTab("diff")}>Diff</button>
      </div>
      {tab === "stream" && <ProviderStream stream={stream} />}
      {tab === "inspector" && <InspectorTab canvas={canvas} />}
      {tab === "diff" && <DiffTab />}
    </div>
  );
}

function BottomPanel() {
  const [tab, setTab] = useState2("output");
  return (
    <div className="panel-bottom">
      <div className="ph">
        <button data-active={tab==="output"?"1":"0"} onClick={()=>setTab("output")}>Output</button>
        <button data-active={tab==="problems"?"1":"0"} onClick={()=>setTab("problems")}>Problèmes <span style={{color:"var(--warn)"}}>2</span></button>
        <button data-active={tab==="terminal"?"1":"0"} onClick={()=>setTab("terminal")}>Terminal</button>
        <span style={{flex:1}}/>
        <span style={{color:"var(--fg-3)",fontSize:10.5}}>SPDD task runner</span>
      </div>
      <div className="pb">
        {tab === "output" && (
          <>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:42]</span> <span style={{color:"var(--accent)"}}>yukki</span> reasons-canvas CORE-002b</div>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:42]</span> reading <span style={{color:"var(--info)"}}>spdd/stories/CORE-002b-reasons-canvas.md</span></div>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:43]</span> reading <span style={{color:"var(--info)"}}>spdd/analysis/CORE-002b-reasons-canvas.md</span></div>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:44]</span> calling provider <span style={{color:"var(--accent)"}}>claude-cli</span> (timeout=5m)</div>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:57]</span> ✓ canvas validated · 7 sections · 8 ops · 5 safeguards</div>
            <div><span style={{color:"var(--fg-3)"}}>[14:01:57]</span> ✓ wrote <span style={{color:"var(--ok)"}}>spdd/prompts/CORE-002b-reasons-canvas.md</span> (atomic)</div>
            <div><span style={{color:"var(--warn)"}}>[14:01:57]</span> next: review humaine, puis <b>yukki generate CORE-002b</b></div>
          </>
        )}
        {tab === "problems" && (
          <>
            <div><span style={{color:"var(--warn)"}}>⚠</span> <span style={{color:"var(--fg-3)"}}>spdd/prompts/CORE-002b-…md:25</span> · Edge cases couvrent BVA mais pas EP — ajouter 2 partitions équivalentes</div>
            <div><span style={{color:"var(--warn)"}}>⚠</span> <span style={{color:"var(--fg-3)"}}>spdd/prompts/CORE-002b-…md:42</span> · Y-Statement absent dans la section Approach</div>
          </>
        )}
        {tab === "terminal" && (
          <>
            <div><span style={{color:"var(--accent)"}}>~/code/yukki</span> <span style={{color:"var(--ok)"}}>main</span> $ yukki status</div>
            <div style={{color:"var(--fg-2)"}}>3 artefacts modifiés · 1 canvas en review · 6 commandes restantes (CORE-002a–f)</div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RightPanel, BottomPanel });
