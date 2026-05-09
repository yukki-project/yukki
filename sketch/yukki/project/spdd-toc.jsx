/* global React, Icon, SECTION_DEFS */

function Toc({ activeKey, onJump, sectionStates, fmErrors, acStates, expandAc = true, onSubJump }) {
  const required = SECTION_DEFS.filter(s => s.required);
  const doneCount = required.filter(s => sectionStates[s.key] === 'done').length;
  const total = required.length;
  const pct = (doneCount / total) * 100;

  return (
    <div className="yk-toc">
      <div className="yk-toc-label">Sections</div>
      {SECTION_DEFS.map(s => {
        const st = sectionStates[s.key] || (s.required ? 'todo' : 'optional');
        const isActive = activeKey === s.key;
        const errs = s.key === 'fm' ? fmErrors : 0;
        const dotClass = errs > 0 ? 'error' : st;
        return (
          <React.Fragment key={s.key}>
            <div
              className={`yk-toc-item ${isActive ? 'active' : ''}`}
              onClick={() => onJump && onJump(s.key)}
            >
              <span className={`dot ${dotClass}`}>
                {st === 'done' && errs === 0 && <Icon name="check" className="sm" style={{ width: 8, height: 8, strokeWidth: 3 }} />}
              </span>
              <span>{s.label}</span>
              {s.key === 'ac' && acStates && (
                <span className="count">{acStates.length}</span>
              )}
              {errs > 0 && <span className="err-count">{errs} err</span>}
            </div>
            {s.key === 'ac' && expandAc && acStates && acStates.map((acSt, i) => (
              <div
                key={i}
                className={`yk-toc-sub ${acSt.active ? 'active' : ''}`}
                onClick={() => onSubJump && onSubJump('ac', i)}
              >
                <span className={`mini-dot`} style={{
                  color: acSt.state === 'done' ? 'var(--success)' :
                         acSt.state === 'active' ? 'var(--primary)' :
                         'var(--warning)'
                }}>●</span>
                AC-{i + 1}
              </div>
            ))}
          </React.Fragment>
        );
      })}
      <div className={`yk-toc-foot ${doneCount === total ? 'done' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Progression</span>
          <span className="pct">{doneCount}/{total}</span>
        </div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <div style={{ fontSize: 10.5 }}>obligatoires remplies</div>
      </div>
    </div>
  );
}

window.Toc = Toc;
