/* global React */
// Shared wireframe primitives — Topbar, Sommaire, Footer
// Used across all 4 wireframe screens.

const { Fragment } = React;

function Topbar({ mode = 'wysiwyg', extra }) {
  return (
    <div className="wf-topbar">
      <span style={{ fontWeight: 700 }}>FRONT-002</span>
      <span className="body muted">·</span>
      <span className="body">Éditeur guidé SPDD</span>
      <span style={{ flex: 1 }} />
      {extra}
      <span className="wf-pill">draft</span>
      <span className="body muted small">saved 14:02</span>
      {mode === 'md' && <span className="wf-pill info">⌘/ markdown</span>}
      <button className="wf-btn">⤓ Exporter</button>
    </div>
  );
}

function Sommaire({ activeKey = 'ac', acStates = ['done', 'active', 'todo'] }) {
  const items = [
    { key: 'fm',  label: 'Front-matter',         state: 'done' },
    { key: 'bg',  label: 'Background',           state: 'done' },
    { key: 'bv',  label: 'Business Value',       state: 'done' },
    { key: 'si',  label: 'Scope In',             state: 'done' },
    { key: 'so',  label: 'Scope Out',            state: 'optional' },
    { key: 'ac',  label: 'Acceptance Criteria',  state: 'active' },
    { key: 'oq',  label: 'Open Questions',       state: 'todo' },
    { key: 'no',  label: 'Notes',                state: 'optional' },
  ];

  const dot = (s) => {
    if (s === 'done')    return '✓';
    if (s === 'active')  return '▶';
    if (s === 'todo')    return '●';
    return '○';
  };
  const cls = (s) => {
    if (s === 'done')    return 'done';
    if (s === 'active')  return 'active';
    if (s === 'todo')    return 'todo';
    return '';
  };

  return (
    <div className="wf-toc">
      <div className="label upper">Sommaire</div>
      {items.map(it => (
        <Fragment key={it.key}>
          <div className={`wf-toc-item ${cls(it.state)} ${it.key === activeKey ? 'active' : ''}`}>
            <span className="dot">{dot(it.state)}</span>
            <span>{it.label}</span>
            {it.key === 'ac' && <span className="count">3</span>}
          </div>
          {it.key === 'ac' && it.key === activeKey && (
            <Fragment>
              <div className="wf-toc-sub">
                <span style={{ color: 'var(--accent-ok)' }}>✓</span> AC-1
              </div>
              <div className="wf-toc-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                <span style={{ color: 'var(--accent-info)' }}>▶</span> AC-2
              </div>
              <div className="wf-toc-sub">
                <span style={{ color: 'var(--accent-warn)' }}>⚠</span> AC-3
              </div>
              <div className="wf-toc-sub" style={{ color: 'var(--accent-info)' }}>
                + ajouter un AC
              </div>
            </Fragment>
          )}
        </Fragment>
      ))}
      <hr style={{ border: 0, borderTop: '1px dashed var(--hatch)', margin: '10px 0' }} />
      <div className="small" style={{ color: 'var(--accent-warn)' }}>
        5/6 obligatoires
      </div>
      <div className="small muted body" style={{ marginTop: 4 }}>
        Open Questions à compléter
      </div>
    </div>
  );
}

function Footer({ done = 5, total = 6, missing = ['Open Questions'] }) {
  const allDone = done === total;
  return (
    <div className="wf-footer">
      <div className="wf-progress" {...(allDone ? { className: 'wf-progress done' } : {})}>
        <span className="bar"><i style={{ width: `${(done / total) * 100}%` }} /></span>
        <span>{done}/{total} sections obligatoires</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {missing.length > 0 && (
          <span style={{ color: 'var(--accent-warn)' }}>
            ⚠ manque : {missing.join(', ')}
          </span>
        )}
        <span className="small muted">⌘K palette · ⌘/ markdown · ⌘↓ section suivante</span>
      </div>
    </div>
  );
}

function Annotation({ x, y, arrow, children, w }) {
  return (
    <div className="wf-annotation" style={{ left: x, top: y, maxWidth: w || 180 }}>
      {arrow && <span className="arrow">{arrow}</span>}
      {children}
    </div>
  );
}

Object.assign(window, { Topbar, Sommaire, Footer, Annotation });
