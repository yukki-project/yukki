/* global React, Icon */
// Shell — title bar + tabs + activity bar. Dressing visuel only.

const { useState } = React;

function TitleBar() {
  return (
    <div className="yk-titlebar">
      <span className="logo"><Icon name="rabbit" /></span>
      <span className="menu">File</span>
      <span className="spacer" />
      <span className="winctl"><Icon name="min" className="sm" /></span>
      <span className="winctl"><Icon name="max" className="sm" /></span>
      <span className="winctl"><Icon name="close" className="sm" /></span>
    </div>
  );
}

function Tabs({ extraTab = 'FRONT-002', dirty = false }) {
  return (
    <div className="yk-tabs">
      <div className="yk-tab">yukki</div>
      <div className="yk-tab">k8s-portal-csf</div>
      <div className="yk-tab">init</div>
      <div className={`yk-tab active ${dirty ? 'dirty' : ''}`}>
        {extraTab}
        <span className="close"><Icon name="close" className="sm" /></span>
      </div>
      <div className="yk-tab add"><Icon name="plus" className="sm" /></div>
    </div>
  );
}

function ActivityBar({ active = 'workflow' }) {
  const items = [
    { key: 'inbox',    icon: 'inbox' },
    { key: 'docs',     icon: 'book' },
    { key: 'layers',   icon: 'layers' },
    { key: 'ideas',    icon: 'bulb' },
    { key: 'story',    icon: 'doc' },
    { key: 'tests',    icon: 'check' },
    { key: 'map',      icon: 'map' },
    { key: 'workflow', icon: 'workflow' },
  ];
  return (
    <div className="yk-activity">
      {items.map(it => (
        <div key={it.key} className={`yk-act ${active === it.key ? 'active' : ''}`}>
          <Icon name={it.icon} />
        </div>
      ))}
      <div className="spacer" />
      <div className="yk-act"><Icon name="settings" /></div>
    </div>
  );
}

function StoryHeader({ mode = 'wysiwyg', onMode, dirty = false, onExport, exportRef, hasErrors = false }) {
  return (
    <div className="yk-header">
      <span className="id">FRONT-002</span>
      <span className="title">Éditeur guidé SPDD</span>
      <span className="pill">draft</span>
      <span className="saved">
        {dirty
          ? <><span className="dot" style={{ background: 'var(--warning)' }} /> en cours…</>
          : <><span className="dot" /> sauvé · 14:02</>
        }
      </span>
      <div className="yk-header-actions">
        <div className="seg">
          <button className={mode === 'wysiwyg' ? 'active' : ''} onClick={() => onMode('wysiwyg')}>
            <Icon name="edit" className="sm" /> WYSIWYG
          </button>
          <button className={mode === 'md' ? 'active' : ''} onClick={() => onMode('md')}>
            <Icon name="code" className="sm" /> Markdown
          </button>
        </div>
        <button
          ref={exportRef}
          className={`yk-btn ${hasErrors ? '' : 'primary'}`}
          onClick={onExport}
          style={{ marginLeft: 6 }}
        >
          <Icon name="download" className="sm" /> Exporter
        </button>
      </div>
    </div>
  );
}

function Footer({ done, total, missing = [] }) {
  const allDone = done >= total;
  return (
    <div className="yk-footer">
      <span className={`item ${allDone ? 'ok' : 'warn'}`}>
        <span className="dot" /> {done}/{total} obligatoires
      </span>
      {missing.length > 0 && (
        <span className="item warn" style={{ textTransform: 'none', fontFamily: 'var(--font-ui)' }}>
          manque : {missing.join(', ')}
        </span>
      )}
      <span className="spacer" />
      <span className="item">⌘K palette</span>
      <span className="item">⌘/ markdown</span>
      <span className="item">⌘↑↓ section</span>
      <span className="item">FRONT-002.md · UTF-8 · LF</span>
    </div>
  );
}

Object.assign(window, { TitleBar, Tabs, ActivityBar, StoryHeader, Footer });
