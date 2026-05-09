/* global React, Icon, SECTION_DEFS */

const { useState, useRef, useEffect } = React;

// ============ Front-matter ============
const KNOWN_MODULES = ['frontend', 'backend', 'controller', 'extensions/auth', 'extensions/billing', 'helm', 'docs', 'cli'];
const KNOWN_STATUS  = ['draft', 'reviewed', 'accepted', 'done', 'archived'];

function validateFM(fm) {
  const errs = {};
  if (!/^[A-Z]{2,8}-\d{1,5}$/.test(fm.id || '')) errs.id = 'L\'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042).';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug || '')) errs.slug = 'Le slug n\'accepte que des lettres minuscules, chiffres et tirets — pas d\'espaces ni d\'accents.';
  if (!fm.title) errs.title = 'Donne un titre à cette story.';
  if (!KNOWN_STATUS.includes(fm.status)) errs.status = `Le statut doit être l'un de : ${KNOWN_STATUS.join(', ')}.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.created || '')) errs.created = 'Format de date attendu : AAAA-MM-JJ (ex. 2026-04-12).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.updated || '')) errs.updated = 'Format de date attendu : AAAA-MM-JJ (ex. 2026-04-12).';
  if (!fm.owner) errs.owner = 'Indique au moins un responsable — un email, un handle, ou ton équipe.';
  const badMods = (fm.modules || []).filter(m => !KNOWN_MODULES.includes(m));
  if (badMods.length) errs.modules = `« ${badMods[0]} » n\'est pas un module connu. Choisis dans la liste, ou demande à un lead d\'en ajouter un.`;
  return errs;
}

function FMRow({ k, value, onChange, error, hint, mono = true }) {
  return (
    <div className={`yk-fm-row ${error ? 'error' : ''}`}>
      <div className="key">{k}</div>
      <div className="val-wrap">
        {Array.isArray(value)
          ? <div className="val">
              {value.map((v, i) => (
                <span key={i} className={`chip ${KNOWN_MODULES.includes(v) ? '' : 'bad'}`}>{v}</span>
              ))}
            </div>
          : <input
              type="text"
              value={value}
              onChange={e => onChange && onChange(e.target.value)}
              spellCheck={false}
              style={{ fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}
            />
        }
        {error && (
          <div className="err">
            <span className="ico"><Icon name="warn" style={{ width: 9, height: 9 }} /></span>
            <span>{error}</span>
          </div>
        )}
        {!error && hint && <div className="hint">{hint}</div>}
      </div>
    </div>
  );
}

function FrontMatter({ fm, onChange, errors }) {
  return (
    <div className="yk-fm">
      <FMRow k="id"      value={fm.id}      onChange={v => onChange({ ...fm, id: v })}      error={errors.id}      hint="Préfixe + numéro"/>
      <FMRow k="slug"    value={fm.slug}    onChange={v => onChange({ ...fm, slug: v })}    error={errors.slug} />
      <FMRow k="title"   value={fm.title}   onChange={v => onChange({ ...fm, title: v })}   error={errors.title} mono={false} />
      <FMRow k="status"  value={fm.status}  onChange={v => onChange({ ...fm, status: v })}  error={errors.status}  hint="draft · reviewed · accepted · done · archived" />
      <FMRow k="created" value={fm.created} onChange={v => onChange({ ...fm, created: v })} error={errors.created} />
      <FMRow k="updated" value={fm.updated} onChange={v => onChange({ ...fm, updated: v })} error={errors.updated} />
      <FMRow k="owner"   value={fm.owner}   onChange={v => onChange({ ...fm, owner: v })}   error={errors.owner} />
      <FMRow k="modules" value={fm.modules} error={errors.modules} />
    </div>
  );
}

// ============ AC block ============
function ACBlock({ ac, idx, active, onChange, onDelete, onActivate }) {
  const filled = !!ac.given && !!ac.when && !!ac.then;
  const partial = !filled && (ac.given || ac.when || ac.then);
  const stateClass = filled ? 'done' : partial ? 'partial' : 'active';
  const stateIcon = filled ? <Icon name="check" style={{ width: 8, height: 8, strokeWidth: 3 }} /> :
                    partial ? '!' : (idx + 1);

  return (
    <div className={`yk-ac ${active ? 'active' : ''}`} onClick={onActivate}>
      <div className="yk-ac-head">
        <span className={`ac-state ${stateClass}`}>{stateIcon}</span>
        <span className="num">AC-{idx + 1}</span>
        <input
          className="ac-title"
          value={ac.title}
          onChange={e => onChange({ ...ac, title: e.target.value })}
          placeholder="Titre court de l'AC…"
        />
        <div className="yk-ac-controls">
          <button title="Drag"><Icon name="drag" className="sm" /></button>
          <button title="Dupliquer"><Icon name="copy" className="sm" /></button>
          <button title="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Icon name="trash" className="sm" />
          </button>
        </div>
      </div>
      <div className="yk-gwt">
        <div className={`yk-gwt-label ${!ac.given ? 'empty' : ''}`}>Given</div>
        <textarea
          className="yk-gwt-input"
          value={ac.given}
          onChange={e => onChange({ ...ac, given: e.target.value })}
          placeholder="l'état initial avant l'action…"
          rows={1}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
        />
        <div className={`yk-gwt-label ${!ac.when ? 'empty' : ''}`}>When</div>
        <textarea
          className="yk-gwt-input"
          value={ac.when}
          onChange={e => onChange({ ...ac, when: e.target.value })}
          placeholder="l'action déclenchée par l'utilisateur…"
          rows={1}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
        />
        <div className={`yk-gwt-label ${!ac.then ? 'empty' : ''}`}>Then</div>
        <textarea
          className="yk-gwt-input"
          value={ac.then}
          onChange={e => onChange({ ...ac, then: e.target.value })}
          placeholder="le résultat observable…"
          rows={1}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
        />
      </div>
    </div>
  );
}

// ============ Section wrappers ============
function SectionHead({ def, errors }) {
  return (
    <div className="yk-section-head">
      <h2>{def.label}</h2>
      {def.required && <span className="h-pill required">obligatoire</span>}
      {!def.required && <span className="h-pill">optionnel</span>}
      {errors > 0 && <span className="h-pill required" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{errors} erreur{errors > 1 ? 's' : ''}</span>}
      <span className="help" title={def.hint}>?</span>
    </div>
  );
}

function ProseSection({ def, value, onChange, onSelect, selectionMarker }) {
  if (!value) {
    return (
      <section className="yk-section" data-section={def.key}>
        <SectionHead def={def} />
        <div className="yk-prose-empty">{def.hint}</div>
      </section>
    );
  }
  return (
    <section className="yk-section" data-section={def.key}>
      <SectionHead def={def} />
      <div className="yk-prose" onMouseUp={onSelect}>
        {selectionMarker
          ? renderProseWithSelection(value, selectionMarker)
          : <p>{value}</p>
        }
      </div>
    </section>
  );
}

function renderProseWithSelection(text, marker) {
  // marker = { from, to, muted }
  const before = text.slice(0, marker.from);
  const sel = text.slice(marker.from, marker.to);
  const after = text.slice(marker.to);
  return (
    <p>
      {before}
      <span className={`yk-selection ${marker.muted ? 'muted' : ''}`} data-selection>{sel}</span>
      {after}
    </p>
  );
}

function ListSection({ def, items, onChange }) {
  if (!items || items.length === 0) {
    return (
      <section className="yk-section" data-section={def.key}>
        <SectionHead def={def} />
        <div className="yk-prose-empty">{def.hint}</div>
      </section>
    );
  }
  return (
    <section className="yk-section" data-section={def.key}>
      <SectionHead def={def} />
      <div className="yk-prose">
        <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
      </div>
    </section>
  );
}

Object.assign(window, { validateFM, FrontMatter, ACBlock, SectionHead, ProseSection, ListSection });
