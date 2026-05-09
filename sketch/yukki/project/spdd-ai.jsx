/* global React, Icon */
const { useState, useRef, useEffect } = React;

// ============ AI popover (selection menu) ============
function AIPopover({ x, y, onAction, onClose, sectionLabel = 'Background', selWords = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const actions = [
    { key: 'lisibility', label: 'Améliorer la lisibilité', kbd: '1' },
    { key: 'enrich',     label: 'Enrichir le contenu',     kbd: '2' },
    { key: 'rephrase',   label: 'Reformuler',              kbd: '3' },
    { key: 'shorten',    label: 'Raccourcir',              kbd: '4' },
  ];

  return (
    <div ref={ref} className="yk-popover" style={{ left: x, top: y }} role="menu" aria-label="Actions Yuki">
      <div className="arrow" style={{ left: 24 }} />
      {actions.map((a, i) => (
        <div
          key={a.key}
          className={`ai-action ${i === 0 ? 'hot' : ''}`}
          onClick={() => onAction(a.key)}
          role="menuitem"
          tabIndex={0}
        >
          <span className="ico"><Icon name="sparkle" /></span>
          <span>{a.label}</span>
          <span className="kbd">⌘{a.kbd}</span>
        </div>
      ))}
      <div className="divider" />
      <div className="trans">
        <Icon name="info" className="sm" style={{ verticalAlign: -2, marginRight: 4, color: 'var(--primary)' }} />
        Yuki sait que tu rédiges la section <strong style={{ color: 'var(--text-primary)' }}>{sectionLabel}</strong>.
        Le contexte SPDD est inclus dans le prompt. <a href="#prompt" onClick={e => e.preventDefault()}>Voir le prompt</a>
      </div>
    </div>
  );
}

// ============ Diff inspector ============
function DiffPanel({ before, after, action, onAccept, onReject, onRegenerate, latencyMs = 2100 }) {
  // Build a tiny line-diff (whole-block since this is a paragraph rephrase)
  return (
    <div className="yk-inspector" style={{ background: 'var(--bg-1)' }}>
      <div className="yk-diff-head">
        <span className="yk-insp-kicker"><Icon name="sparkle" className="sm" style={{ verticalAlign: -2, marginRight: 4 }}/> Suggestion de Yuki</span>
        <span className="action">{action}</span>
        <span className="meta">{(latencyMs / 1000).toFixed(1)}s</span>
      </div>

      <div className="yk-diff-body">
        <div className="yk-diff-block">
          <div className="head before">Avant</div>
          <div className="body">{before}</div>
        </div>

        <div className="yk-diff-block">
          <div className="head after"><Icon name="check" className="sm" style={{ verticalAlign: -2 }} /> Après</div>
          <div className="body">{after}</div>
        </div>

        <div className="yk-diff-block">
          <div className="head diff">Diff</div>
          <div className="body mono">
            <span className="yk-diff-line del">{before}</span>
            <span className="yk-diff-line add">{after}</span>
          </div>
        </div>

        <div className="yk-diff-tools">
          <button onClick={onRegenerate}><Icon name="refresh" className="sm"/> Régénérer</button>
          <button><Icon name="info" className="sm"/> Voir le prompt</button>
        </div>
      </div>

      <div className="yk-diff-foot">
        <button className="yk-btn" onClick={onReject}>Refuser</button>
        <button className="yk-btn primary" onClick={onAccept}>
          <Icon name="check" className="sm"/> Accepter
        </button>
      </div>
    </div>
  );
}

// ============ Inspector — contextual ============
function Inspector({ context = 'section', sectionLabel = 'Background', sectionHint, onClose, modules = [] }) {
  if (context === 'fm') {
    return (
      <div className="yk-inspector">
        <div className="yk-insp-head">
          <div className="yk-insp-kicker">Inspector</div>
          <div className="yk-insp-title">Front-matter</div>
        </div>
        <div className="yk-insp-body">
          <div className="yk-insp-section">
            <div className="label">Modules connus</div>
            <div className="yk-modules">
              {['frontend', 'backend', 'controller', 'extensions/auth', 'extensions/billing', 'helm', 'docs', 'cli'].map(m => (
                <span key={m} className="mod">{m}</span>
              ))}
            </div>
          </div>
          <div className="yk-insp-section">
            <div className="label">Statuts SPDD</div>
            <ul className="yk-insp-list">
              <li><strong style={{color:'var(--text-primary)'}}>draft</strong> — en cours de rédaction</li>
              <li><strong style={{color:'var(--text-primary)'}}>reviewed</strong> — relue par un lead</li>
              <li><strong style={{color:'var(--text-primary)'}}>accepted</strong> — prête à implémenter</li>
              <li><strong style={{color:'var(--text-primary)'}}>done</strong> — livrée</li>
              <li><strong style={{color:'var(--text-primary)'}}>archived</strong> — abandonnée</li>
            </ul>
          </div>
          <div className="yk-insp-section">
            <div className="label">Validation</div>
            <div className="yk-insp-card">
              Erreurs affichées au blur du champ. Le slug se valide en temps réel (caractères invalides strippés).
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (context === 'ac') {
    return (
      <div className="yk-inspector">
        <div className="yk-insp-head">
          <div className="yk-insp-kicker">Inspector</div>
          <div className="yk-insp-title">Acceptance Criteria</div>
        </div>
        <div className="yk-insp-body">
          <div className="yk-insp-section">
            <div className="label">Définition SPDD</div>
            <div className="yk-insp-card">
              Un cas concret avec <strong style={{color:'var(--text-primary)'}}>Given</strong> (état initial),
              <strong style={{color:'var(--text-primary)'}}> When</strong> (action),
              <strong style={{color:'var(--text-primary)'}}> Then</strong> (résultat observable).
            </div>
          </div>
          <div className="yk-insp-section">
            <div className="label">Bonnes pratiques</div>
            <ul className="yk-insp-list">
              <li>1 AC = 1 comportement observable</li>
              <li>Given décrit l'état, pas le pourquoi</li>
              <li>Then utilise le présent : "l'AC apparaît"</li>
              <li>Évite les "et" multiples — découpe</li>
            </ul>
          </div>
          <div className="yk-insp-section">
            <div className="label"><Icon name="sparkle" className="sm" style={{verticalAlign:-2}}/> Yuki suggère</div>
            <div className="yk-insp-card accent" style={{color:'var(--text-primary)'}}>
              AC-2 — le « Then » est encore vide. Décris ce qu'on observe à l'écran après le drag.
              <button className="yk-btn ghost sm" style={{marginTop:8, paddingLeft:0}}>
                <Icon name="bolt" className="sm"/> Pré-remplir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div className="yk-inspector">
      <div className="yk-insp-head">
        <div className="yk-insp-kicker">Inspector</div>
        <div className="yk-insp-title">{sectionLabel}</div>
      </div>
      <div className="yk-insp-body">
        <div className="yk-insp-section">
          <div className="label">Définition SPDD</div>
          <div className="yk-insp-card">{sectionHint}</div>
        </div>
        <div className="yk-insp-section">
          <div className="label">Recommandations</div>
          <ul className="yk-insp-list">
            <li>2 à 4 phrases suffisent</li>
            <li>Mentionne le module concerné</li>
            <li>Évite l'impératif (« il faut »)</li>
            <li>Pas de solution technique</li>
          </ul>
        </div>
        <div className="yk-insp-section">
          <div className="label"><Icon name="sparkle" className="sm" style={{verticalAlign:-2}}/> IA</div>
          <div className="yk-insp-card">
            Sélectionne un passage (3 mots min) pour ouvrir le menu d'aide à la rédaction.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Export popover ============
function ExportPopover({ checklist, onClose, onExport }) {
  const allDone = checklist.every(c => c.done);
  return (
    <div className="yk-export-pop" role="dialog" aria-label="Export">
      <div className="arrow" />
      <div className="head">
        <span className="ico"><Icon name="warn" /></span>
        Avant d'exporter, complète :
      </div>
      <div className="sub">L'export `.md` exige les sections obligatoires.</div>
      <div className="yk-checklist">
        {checklist.map((c, i) => (
          <div key={i} className={`yk-check-item ${c.done ? 'done' : 'miss'}`}>
            <span className="mark">{c.done ? <Icon name="check" style={{width:10,height:10,strokeWidth:3}}/> : '✗'}</span>
            <span>{c.label}</span>
            {!c.done && <span className="go">Aller →</span>}
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="yk-btn ghost" onClick={onClose}>Plus tard</button>
        <button className="yk-btn primary" disabled={!allDone} onClick={onExport} style={!allDone ? {opacity:0.5,cursor:'not-allowed'} : {}}>
          <Icon name="download" className="sm"/> Exporter .md
        </button>
      </div>
    </div>
  );
}

// ============ Toast ============
function Toast({ message, kbd }) {
  return (
    <div className="yk-toast">
      <span className="ico"><Icon name="check" /></span>
      <span>{message}</span>
      {kbd && <span className="kbd">{kbd}</span>}
    </div>
  );
}

Object.assign(window, { AIPopover, DiffPanel, Inspector, ExportPopover, Toast });
