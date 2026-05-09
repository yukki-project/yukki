// app.jsx — App root + Tweaks panel wiring

const { useState: useS, useEffect: useE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "lang": "fr",
  "density": "regular",
  "accentHue": 65,
  "showRightPanel": true,
  "showBottomPanel": true,
  "canvasMode": "rendered",
  "showStream": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data = window.YUKKI_DATA;

  const [activeStep, setActiveStep] = useS("reasons-canvas");
  const [activeArt, setActiveArt] = useS({ kind: "prompts", id: "CORE-002b" });
  const [paletteOpen, setPaletteOpen] = useS(false);
  const [activeAB, setActiveAB] = useS("files");

  // Keyboard
  useE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen(true);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Apply theme
  useE(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    document.documentElement.setAttribute("data-density", t.density);
    document.documentElement.style.setProperty("--accent", `oklch(0.80 0.14 ${t.accentHue})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(0.80 0.14 ${t.accentHue} / 0.14)`);
    document.documentElement.style.setProperty("--accent-line", `oklch(0.80 0.14 ${t.accentHue} / 0.40)`);
  }, [t.theme, t.density, t.accentHue]);

  const canvas = data.canvas;
  const doneSteps = ["story", "analysis"];

  // Tabs (open editor tabs)
  const tabs = [
    { kind: "stories",  id: "CORE-002b", name: "CORE-002b · story.md",     dirty: false },
    { kind: "analysis", id: "CORE-002b", name: "CORE-002b · analysis.md",  dirty: false },
    { kind: "prompts",  id: "CORE-002b", name: "CORE-002b · canvas.md",    dirty: true  },
    { kind: "tests",    id: "CORE-002b", name: "CORE-002b · tests.md",     dirty: false },
  ];
  const activeTabIdx = tabs.findIndex(tab => tab.kind === activeArt.kind && tab.id === activeArt.id);

  return (
    <>
      <div className="app">
        <TitleBar repo={data.repo} onTogglePalette={() => setPaletteOpen(true)} />

        <div className="main" data-collapse-right={t.showRightPanel ? "0" : "1"}>
          <ActivityBar active={activeAB} onPick={setActiveAB} />
          <Sidebar data={data} activeArt={activeArt} onPick={(kind, it) => setActiveArt({kind, id: it.id})} lang={t.lang} />

          <div className="editor">
            <Stepper activeStep={activeStep} doneSteps={doneSteps}
                     onStep={setActiveStep}
                     onRun={() => alert("yukki " + activeStep + " " + activeArt.id)} />
            <div className="tabs">
              {tabs.map((tab, i) => (
                <div key={i} className="tab" data-active={i === activeTabIdx ? "1" : "0"}
                     onClick={() => setActiveArt({kind: tab.kind, id: tab.id})}>
                  <span className="id-pill">{tab.kind}</span>
                  <span>{tab.name}</span>
                  {tab.dirty ? <span className="dirty"/> : <span className="x"><Icon.X w={11}/></span>}
                </div>
              ))}
            </div>
            <div className="editor-body">
              {activeArt.kind === "prompts" && <CanvasArtefact canvas={canvas} lang={t.lang} mode={t.canvasMode} />}
              {activeArt.kind === "stories"  && <StoryArtefact canvas={canvas} lang={t.lang} />}
              {activeArt.kind === "analysis" && <AnalysisArtefact canvas={canvas} lang={t.lang} />}
              {activeArt.kind === "tests"    && <TestsArtefact canvas={canvas} lang={t.lang} />}
            </div>
            {t.showBottomPanel && <BottomPanel />}
          </div>

          <RightPanel canvas={canvas} stream={data.stream} />
        </div>

        <StatusBar canvas={canvas} lang={t.lang} />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} data={data}
                      onPick={(it) => { setPaletteOpen(false); if (it.kind === "cmd") setActiveStep(it.id); }} />

      <TweaksPanel title="Tweaks · yukki ui">
        <TweakSection label="Apparence" />
        <TweakRadio  label="Thème"   value={t.theme} options={["dark","light"]}
                     onChange={(v)=>setTweak("theme", v)} />
        <TweakRadio  label="Densité" value={t.density} options={["compact","regular","comfy"]}
                     onChange={(v)=>setTweak("density", v)} />
        <TweakSlider label="Teinte accent (oklch H)" value={t.accentHue} min={20} max={320} step={1} unit="°"
                     onChange={(v)=>setTweak("accentHue", v)} />

        <TweakSection label="Langue" />
        <TweakRadio  label="UI" value={t.lang} options={[{value:"fr",label:"FR"},{value:"en",label:"EN"}]}
                     onChange={(v)=>setTweak("lang", v)} />

        <TweakSection label="Layout" />
        <TweakToggle label="Panneau provider" value={t.showRightPanel}
                     onChange={(v)=>setTweak("showRightPanel", v)} />
        <TweakToggle label="Panneau output"   value={t.showBottomPanel}
                     onChange={(v)=>setTweak("showBottomPanel", v)} />

        <TweakSection label="Canvas" />
        <TweakRadio  label="Mode" value={t.canvasMode} options={[{value:"rendered",label:"Rendu"},{value:"code",label:"Markdown"}]}
                     onChange={(v)=>setTweak("canvasMode", v)} />
      </TweaksPanel>
    </>
  );
}

// ── Other artefact views (story / analysis / tests) ────────────────────────
function StoryArtefact({ canvas, lang }) {
  return (
    <>
      <div className="art-head">
        <div className="crumbs">
          <span className="seg">spdd</span><span>/</span>
          <span className="seg">stories</span><span>/</span>
          <span className="seg cur">{canvas.id}-{canvas.slug}.md</span>
        </div>
        <h1>{canvas.title.replace("yukki reasons-canvas — ", "User story — ")}</h1>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Pill tone="accent">user story</Pill>
          <Pill tone="ok">status: clarified</Pill>
          <Pill>INVEST · SPIDR</Pill>
        </div>
      </div>
      <div className="art-body">
        <section>
          <h2><span className="num">§1</span><span>{lang==="fr"?"En tant que…":"As a…"}</span><span className="rule"/></h2>
          <p className="lede">
            En tant que <em style={{color:"var(--accent)",fontStyle:"normal"}}>tech lead utilisateur de yukki</em>,
            je veux que la commande <span className="mono accent">yukki reasons-canvas</span> synthétise un canvas
            R-E-A-S-O-N-S à partir de la story et de l'analyse, afin de matérialiser la spec exécutable
            avant tout appel à <span className="mono">generate</span>.
          </p>
        </section>
        <section>
          <h2><span className="num">§2</span><span>Critères d'acceptation</span><span className="rule"/></h2>
          {canvas.acs.map(ac => (
            <div key={ac.id} className="ac">
              <div className="ac-h"><span className="id">{ac.id}</span><span style={{color:"var(--fg-3)"}}>·</span><span className="title">{ac.title}</span></div>
              <div className="gwt">
                <span className="k">given</span><span className="v">{ac.given}</span>
                <span className="k">when</span><span className="v">{ac.when}</span>
                <span className="k">then</span><span className="v">{ac.then}</span>
              </div>
            </div>
          ))}
        </section>
        <section>
          <h2><span className="num">§3</span><span>INVEST checklist</span><span className="rule"/></h2>
          <div className="checklist">
            {[
              ["Independent","Indépendante des 6 autres commandes (mock provider OK)",true],
              ["Negotiable","La forme du canvas reste discutable (REASONS vs RDS)",true],
              ["Valuable","Sans canvas, generate produit du code à l'aveugle",true],
              ["Estimable","≈ 3-5 jours dev + 2 j review méthodologique",true],
              ["Small","Possiblement à découper via SPIDR — voir §4",false],
              ["Testable","ParseCanvas + ValidateCanvas couvrables en table-driven",true],
            ].map(([k,v,ok], i) => (
              <div key={i} className="ck" data-on={ok ? "1" : "0"}>
                <span className="box"><Icon.Check w={10}/></span>
                <span style={{color: ok ? "var(--fg-1)" : "var(--warn)"}}><b style={{color:"var(--fg-0)"}}>{k}</b> — {v}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2><span className="num">§4</span><span>Découpage SPIDR</span><span className="rule"/></h2>
          <div className="bullets">
            <div className="bl"><span className="k">Spike</span><span className="v">Tester si claude-cli renvoie un markdown structuré stable<em>1 jour, jetable</em></span></div>
            <div className="bl"><span className="k">Path</span><span className="v">Happy path : story+analyse accepted → canvas draft<em>la version V1</em></span></div>
            <div className="bl"><span className="k">Interface</span><span className="v">Format markdown vs YAML vs JSON<em>tranché : markdown + front-matter</em></span></div>
            <div className="bl"><span className="k">Data</span><span className="v">Edge case : analyse vide<em>retour ErrAnalysisEmpty</em></span></div>
            <div className="bl"><span className="k">Rules</span><span className="v">Validation des Safeguards en MUST/SHOULD<em>règle additionnelle</em></span></div>
          </div>
        </section>
      </div>
    </>
  );
}

function AnalysisArtefact({ canvas, lang }) {
  return (
    <>
      <div className="art-head">
        <div className="crumbs">
          <span className="seg">spdd</span><span>/</span>
          <span className="seg">analysis</span><span>/</span>
          <span className="seg cur">{canvas.id}-{canvas.slug}.md</span>
        </div>
        <h1>Analyse — {canvas.title.replace("yukki reasons-canvas — ", "")}</h1>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Pill tone="accent">analysis</Pill>
          <Pill tone="info">status: reviewed</Pill>
          <Pill>STRIDE · BVA+EP · Y-Statement</Pill>
        </div>
      </div>
      <div className="art-body">
        <section>
          <h2><span className="num">§1</span><span>Y-Statement</span><span className="rule"/></h2>
          <div className="bullets">
            <div className="bl"><span className="k">In the context of</span><span className="v">la phase de spec exécutable d'un cycle SPDD</span></div>
            <div className="bl"><span className="k">Facing</span><span className="v">le besoin de structurer une demande riche pour le provider IA</span></div>
            <div className="bl"><span className="k">We decided for</span><span className="v">le canvas R-E-A-S-O-N-S avec parsing/validation côté yukki</span></div>
            <div className="bl"><span className="k">And against</span><span className="v">design.md monolithique (Kiro), pour préserver la séparation Operations/Approach/Safeguards</span></div>
            <div className="bl"><span className="k">To achieve</span><span className="v">une spec ré-exécutable, diffable, mergeable en review humaine</span></div>
            <div className="bl"><span className="k">Accepting</span><span className="v">une courbe d'apprentissage pour les nouveaux contributeurs (compensée par spdd/methodology/)</span></div>
          </div>
        </section>
        <section>
          <h2><span className="num">§2</span><span>Risques (STRIDE)</span><span className="rule"/></h2>
          <div className="risks">
            {canvas.risks.map((r, i) => (
              <div key={i} className="risk">
                <div className="h"><span>{r.cat}</span><span className="lvl" data-l={r.lvl}/></div>
                <div className="body">{r.body}</div>
                <div className="mit">→ {r.mit}</div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2><span className="num">§3</span><span>Edge cases (BVA + EP)</span><span className="rule"/></h2>
          <div className="bullets">
            <div className="bl"><span className="k">empty</span><span className="v">Story sans AC → ErrStoryIncomplete<em>BVA: limite inférieure</em></span></div>
            <div className="bl"><span className="k">huge</span><span className="v">Analyse > 50 KB → tronquée, warning<em>BVA: limite supérieure</em></span></div>
            <div className="bl"><span className="k">unicode</span><span className="v">Slug avec caractères non-ASCII → fold<em>EP: jeux de caractères</em></span></div>
            <div className="bl"><span className="k">timeout</span><span className="v">Provider hang &gt; 5min → SIGTERM<em>EP: états temporels</em></span></div>
            <div className="bl"><span className="k">malformed</span><span className="v">Section O sans signature → ErrCanvasMalformed<em>EP: structure invalide</em></span></div>
            <div className="bl"><span className="k">repeated</span><span className="v">Re-run sur canvas accepted → merge non destructif<em>EP: idempotence</em></span></div>
            <div className="bl"><span className="k">concurrent</span><span className="v">Deux yukki en parallèle → atomic write protège<em>EP: races</em></span></div>
          </div>
        </section>
      </div>
    </>
  );
}

function TestsArtefact({ canvas, lang }) {
  return (
    <>
      <div className="art-head">
        <div className="crumbs">
          <span className="seg">spdd</span><span>/</span>
          <span className="seg">tests</span><span>/</span>
          <span className="seg cur">{canvas.id}-{canvas.slug}.md</span>
        </div>
        <h1>Tests — {canvas.title.replace("yukki reasons-canvas — ", "")}</h1>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Pill tone="accent">tests</Pill>
          <Pill tone="warn">24/26 passants</Pill>
          <Pill>unit · integration · e2e</Pill>
        </div>
      </div>
      <div className="art-body">
        <section>
          <h2><span className="num">§1</span><span>Pyramide</span><span className="rule"/></h2>
          <div className="ops-table">
            <div className="row head"><span>tier</span><span>fichier</span><span>cas</span><span>passants</span><span>durée</span></div>
            <div className="row"><span className="id">unit</span><span className="sig">internal/canvas/parser_test.go</span><span className="file">7 cas</span><span className="tests"><span className="pass">5/7</span></span><span style={{color:"var(--fg-2)"}}>4ms</span></div>
            <div className="row"><span className="id">unit</span><span className="sig">internal/canvas/validator_test.go</span><span className="file">6 cas</span><span className="tests"><span className="pass">6/6</span></span><span style={{color:"var(--fg-2)"}}>2ms</span></div>
            <div className="row"><span className="id">unit</span><span className="sig">internal/canvas/merge_test.go</span><span className="file">4 cas</span><span className="tests"><span className="miss">0/4</span></span><span style={{color:"var(--fg-3)"}}>—</span></div>
            <div className="row"><span className="id">int</span><span className="sig">tests/integration/canvas_test.go</span><span className="file">5 cas</span><span className="tests"><span className="pass">5/5</span></span><span style={{color:"var(--fg-2)"}}>320ms</span></div>
            <div className="row"><span className="id">e2e</span><span className="sig">tests/e2e/reasons_canvas_test.go</span><span className="file">4 cas</span><span className="tests"><span className="pass">4/4</span></span><span style={{color:"var(--fg-2)"}}>2.1s</span></div>
          </div>
        </section>
        <section>
          <h2><span className="num">§2</span><span>Tests manquants (à écrire)</span><span className="rule"/></h2>
          <div className="oq">
            <div className="q"><span className="marker">!</span><div className="body">MergeCanvas — aucun test<em>O5 : opération nouvelle dans cette révision</em></div><button className="resolve">générer</button></div>
            <div className="q"><span className="marker">!</span><div className="body">ParseCanvas — section A absente<em>edge case BVA</em></div><button className="resolve">générer</button></div>
          </div>
        </section>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
