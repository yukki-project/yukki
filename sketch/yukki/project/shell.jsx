// shell.jsx — Top titlebar, activity bar, sidebar, status bar, stepper

const { useState } = React;

function TitleBar({ repo, onTogglePalette }) {
  return (
    <div className="titlebar">
      <div className="brand">
        <RabbitMark size={20} color="var(--fg-0)" accent="var(--accent)" />
        <span>yukki</span>
        <span className="dot" />
      </div>
      <div className="repo">
        <span>{repo.org}</span>
        <span className="sep">/</span>
        <span style={{color: "var(--fg-0)"}}>{repo.name}</span>
        <span className="branch"><Icon.Branch w={11}/> &nbsp;{repo.branch}</span>
        {repo.dirty > 0 && <span style={{marginLeft: 8, color: "var(--warn)"}}>● {repo.dirty} modifié{repo.dirty>1?"s":""}</span>}
      </div>
      <div className="spacer" />
      <div className="palette" onClick={onTogglePalette} role="button">
        <Icon.Search w={12} />
        <span>Sauter à un artefact ou commande…</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" title="Synchroniser"><Icon.Sync w={14}/></button>
      <button className="icon-btn" title="Paramètres"><Icon.Settings w={14}/></button>
    </div>
  );
}

const STEPS = [
  { k: "story",         lbl: "story",         num: 1 },
  { k: "analysis",      lbl: "analysis",      num: 2 },
  { k: "reasons-canvas",lbl: "reasons-canvas",num: 3 },
  { k: "generate",      lbl: "generate",      num: 4 },
  { k: "api-test",      lbl: "api-test",      num: 5 },
  { k: "prompt-update", lbl: "prompt-update", num: 6 },
  { k: "sync",          lbl: "sync",          num: 7 },
];

function Stepper({ activeStep, doneSteps, onStep, onRun }) {
  return (
    <div className="stepper">
      {STEPS.map((s) => {
        const state = activeStep === s.k ? "active" : (doneSteps.includes(s.k) ? "done" : "pending");
        return (
          <button key={s.k} className="step" data-state={state} onClick={() => onStep(s.k)}>
            <span className="num">{s.num}</span>
            <span className="lbl">{s.lbl}</span>
          </button>
        );
      })}
      <div className="grow" />
      <div className="runbar">
        <button className="ghost-btn" title="Voir le diff"><Icon.Diff w={12}/> &nbsp;Diff</button>
        <button className="ghost-btn"><Icon.Eye w={12}/> &nbsp;Aperçu</button>
        <button className="run-btn" onClick={onRun}><Icon.Play w={11}/> &nbsp;Exécuter</button>
      </div>
    </div>
  );
}

function ActivityBar({ active, onPick }) {
  const items = [
    { k: "files",   icon: <Icon.Files w={18}/>,    badge: 12 },
    { k: "search",  icon: <Icon.Search w={18}/> },
    { k: "vcs",     icon: <Icon.Branch w={18}/>,   badge: 3 },
    { k: "canvas",  icon: <Icon.Brain w={18}/> },
    { k: "tests",   icon: <Icon.Bug w={18}/> },
  ];
  return (
    <div className="activitybar">
      {items.map(it => (
        <div key={it.k} className="ab" data-active={active === it.k ? "1" : "0"}
             onClick={() => onPick(it.k)} title={it.k}>
          {it.icon}
          {it.badge && <span className="badge">{it.badge}</span>}
        </div>
      ))}
      <div className="grow" />
      <div className="ab" title="Extensions"><Icon.Ext w={18}/></div>
      <div className="ab" title="Compte"><Icon.Settings w={18}/></div>
    </div>
  );
}

function Sidebar({ data, activeArt, onPick, lang }) {
  const [open, setOpen] = useState({ stories: true, analysis: true, prompts: true, tests: false });
  const groups = [
    { k: "stories",  label: lang==="fr" ? "Stories" : "Stories",   items: data.artefacts.stories },
    { k: "analysis", label: lang==="fr" ? "Analyses" : "Analyses", items: data.artefacts.analysis },
    { k: "prompts",  label: lang==="fr" ? "Canvas REASONS" : "REASONS canvas", items: data.artefacts.prompts },
    { k: "tests",    label: lang==="fr" ? "Tests" : "Tests",       items: data.artefacts.tests },
  ];
  return (
    <div className="sidebar">
      <div className="head">
        <span>spdd/</span>
        <div className="acts">
          <button title="Nouvelle story"><Icon.Plus w={12}/></button>
          <button title="Rafraîchir"><Icon.Refresh w={12}/></button>
          <button title="Plus"><Icon.More w={12}/></button>
        </div>
      </div>
      <div className="scroll">
        {groups.map(g => (
          <div key={g.k} className="tree-group" data-open={open[g.k] ? "1" : "0"}>
            <div className="label" onClick={() => setOpen({...open, [g.k]: !open[g.k]})}>
              <Icon.ChevDown w={11} className="chev" />
              <span>{g.label}</span>
              <span className="count">{g.items.length}</span>
            </div>
            <div className="tree-children">
              {g.items.map(it => (
                <div key={`${g.k}-${it.id}`} className="tree-row"
                     data-active={activeArt && activeArt.kind === g.k && activeArt.id === it.id ? "1" : "0"}
                     onClick={() => onPick(g.k, it)}>
                  <span className="status-dot" data-s={it.status} title={it.status} />
                  <span className="id">{it.id}</span>
                  <span className="name">{it.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBar({ canvas, lang }) {
  return (
    <div className="statusbar">
      <div className="seg"><Icon.Branch w={12}/>main ↑2 ↓0</div>
      <div className="seg muted">{canvas.path}</div>
      <div className="grow" />
      <div className="seg"><Icon.Check w={12}/>ParseCanvas: 5/7</div>
      <div className="seg">SPDD · v0.4.1</div>
      <div className="seg">claude-cli 0.18</div>
      <div className="seg">{lang === "fr" ? "FR" : "EN"} · UTF-8</div>
    </div>
  );
}

function CommandPalette({ open, onClose, data, onPick }) {
  if (!open) return null;
  const items = [
    ...STEPS.map(s => ({ kind: "cmd", id: s.k, label: `yukki ${s.k}`, hint: "Commande SPDD" })),
    ...data.artefacts.stories.map(s => ({ kind: "story", id: s.id, label: `${s.id} · ${s.title}`, hint: "story" })),
    ...data.artefacts.prompts.map(s => ({ kind: "canvas", id: s.id, label: `${s.id} · ${s.title}`, hint: "canvas REASONS" })),
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "oklch(0 0 0 / 0.4)", display: "grid", placeItems: "start center", paddingTop: 80,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{
             width: 560, maxHeight: "70vh", overflow: "hidden",
             background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 10,
             boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)",
             display: "flex", flexDirection: "column",
           }}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderBottom:"1px solid var(--line)"}}>
          <Icon.Cmd w={14}/>
          <input autoFocus placeholder="Rechercher une commande, un artefact, une opération…"
                 style={{flex:1,background:"transparent",border:"none",outline:"none",color:"var(--fg-0)",fontFamily:"var(--font-ui)",fontSize:14}}/>
          <kbd style={{fontSize:10,color:"var(--fg-3)",border:"1px solid var(--line)",padding:"1px 5px",borderRadius:3,fontFamily:"var(--font-mono)"}}>esc</kbd>
        </div>
        <div style={{overflowY:"auto",padding:"6px 0"}}>
          {items.slice(0, 12).map((it, i) => (
            <div key={i} onClick={() => onPick(it)}
                 style={{
                   display:"flex",alignItems:"center",gap:10,padding:"7px 14px",
                   fontSize:12.5, color:"var(--fg-1)", cursor:"pointer",
                   background: i === 0 ? "var(--bg-3)" : "transparent",
                 }}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--accent)",width:54}}>{it.kind}</span>
              <span style={{flex:1}}>{it.label}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--fg-3)"}}>{it.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TitleBar, Stepper, ActivityBar, Sidebar, StatusBar, CommandPalette, STEPS });
