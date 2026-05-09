/* global React, Icon, SECTION_DEFS, FrontMatter, ACBlock, SectionHead, ProseSection, ListSection, validateFM */

const { useState: useStateE, useRef: useRefE } = React;

// ============ Editor body — assembles all SPDD sections ============
function EditorBody({ story, setStory, mode, activeSection, focusedAcIdx, selection, mutedSelection }) {
  if (mode === 'md') {
    return <MarkdownView story={story} activeSection={activeSection} />;
  }

  const fmErrs = validateFM(story.fm);

  function setSection(key, val) {
    setStory({ ...story, [key]: val });
  }

  function setAc(idx, ac) {
    const newAcs = [...story.ac];
    newAcs[idx] = ac;
    setStory({ ...story, ac: newAcs });
  }

  function deleteAc(idx) {
    setStory({ ...story, ac: story.ac.filter((_, i) => i !== idx) });
  }

  function addAc() {
    setStory({
      ...story,
      ac: [...story.ac, { id: Date.now(), title: '', given: '', when: '', then: '' }],
    });
  }

  return (
    <div className="yk-doc">
      <div className="yk-doc-inner">

        <section className="yk-section" data-section="fm">
          <SectionHead def={SECTION_DEFS[0]} errors={Object.keys(fmErrs).length} />
          <FrontMatter
            fm={story.fm}
            errors={fmErrs}
            onChange={fm => setStory({ ...story, fm })}
          />
        </section>

        <ProseSection
          def={SECTION_DEFS[1]}
          value={story.bg}
          onChange={v => setSection('bg', v)}
          selectionMarker={activeSection === 'bg' ? selection : null}
        />

        <ProseSection
          def={SECTION_DEFS[2]}
          value={story.bv}
          onChange={v => setSection('bv', v)}
        />

        <ListSection
          def={SECTION_DEFS[3]}
          items={story.si}
        />

        {story.so
          ? <ListSection def={SECTION_DEFS[4]} items={story.so} />
          : <ProseSection def={SECTION_DEFS[4]} value="" />
        }

        <section className="yk-section" data-section="ac">
          <SectionHead def={SECTION_DEFS[5]} />
          {story.ac.map((ac, i) => (
            <ACBlock
              key={ac.id || i}
              ac={ac}
              idx={i}
              active={activeSection === 'ac' && focusedAcIdx === i}
              onChange={(newAc) => setAc(i, newAc)}
              onDelete={() => deleteAc(i)}
              onActivate={() => {}}
            />
          ))}
          <button className="yk-add-ac" onClick={addAc}>
            <Icon name="plus" className="sm" /> Ajouter un AC
          </button>
        </section>

        {story.oq
          ? <ProseSection def={SECTION_DEFS[6]} value={story.oq} />
          : <section className="yk-section" data-section="oq">
              <SectionHead def={SECTION_DEFS[6]} />
              <div className="yk-prose-empty">{SECTION_DEFS[6].hint}</div>
            </section>
        }

        {story.no
          ? <ProseSection def={SECTION_DEFS[7]} value={story.no} />
          : <section className="yk-section" data-section="no">
              <SectionHead def={SECTION_DEFS[7]} />
              <div className="yk-prose-empty">{SECTION_DEFS[7].hint}</div>
            </section>
        }

      </div>
    </div>
  );
}

// ============ Markdown view ============
function MarkdownView({ story, activeSection }) {
  // Render the story as syntax-highlighted markdown lines
  const lines = [];

  // Front-matter
  lines.push({ type: 'fm', tokens: [{ p: '---' }] });
  lines.push({ type: 'fm', tokens: [{ k: 'id' }, { p: ': ' }, { s: story.fm.id }] });
  lines.push({ type: 'fm', tokens: [{ k: 'slug' }, { p: ': ' }, { s: story.fm.slug }] });
  lines.push({ type: 'fm', tokens: [{ k: 'title' }, { p: ': ' }, { s: `"${story.fm.title}"` }] });
  lines.push({ type: 'fm', tokens: [{ k: 'status' }, { p: ': ' }, { s: story.fm.status }] });
  lines.push({ type: 'fm', tokens: [{ k: 'created' }, { p: ': ' }, { s: story.fm.created }] });
  lines.push({ type: 'fm', tokens: [{ k: 'updated' }, { p: ': ' }, { s: story.fm.updated }] });
  lines.push({ type: 'fm', tokens: [{ k: 'owner' }, { p: ': ' }, { s: story.fm.owner }] });
  lines.push({ type: 'fm', tokens: [{ k: 'modules' }, { p: ': [' }, { s: story.fm.modules.map(m => `"${m}"`).join(', ') }, { p: ']' }] });
  lines.push({ type: 'fm', tokens: [{ p: '---' }] });
  lines.push({ type: 'blank' });

  // Background
  lines.push({ type: 'bg', tokens: [{ h2: '## Background' }] });
  lines.push({ type: 'blank' });
  if (story.bg) {
    wrapText(story.bg, 78).forEach(t => lines.push({ type: 'bg', tokens: [{ t }] }));
    lines.push({ type: 'blank' });
  }

  // Business Value
  lines.push({ type: 'bv', tokens: [{ h2: '## Business Value' }] });
  lines.push({ type: 'blank' });
  if (story.bv) {
    wrapText(story.bv, 78).forEach(t => lines.push({ type: 'bv', tokens: [{ t }] }));
    lines.push({ type: 'blank' });
  }

  // Scope In
  lines.push({ type: 'si', tokens: [{ h2: '## Scope In' }] });
  lines.push({ type: 'blank' });
  (story.si || []).forEach(item => {
    lines.push({ type: 'si', tokens: [{ p: '- ' }, { t: item }] });
  });
  lines.push({ type: 'blank' });

  // Scope Out (optional)
  if (story.so) {
    lines.push({ type: 'so', tokens: [{ h2: '## Scope Out' }] });
    lines.push({ type: 'blank' });
    if (Array.isArray(story.so)) {
      story.so.forEach(item => lines.push({ type: 'so', tokens: [{ p: '- ' }, { t: item }] }));
    } else {
      wrapText(story.so, 78).forEach(t => lines.push({ type: 'so', tokens: [{ t }] }));
    }
    lines.push({ type: 'blank' });
  }

  // AC
  lines.push({ type: 'ac', tokens: [{ h2: '## Acceptance Criteria' }] });
  lines.push({ type: 'blank' });
  story.ac.forEach((ac, i) => {
    lines.push({ type: 'ac', tokens: [{ h3: `### AC-${i + 1} — ${ac.title || '(sans titre)'}` }] });
    lines.push({ type: 'blank' });
    if (ac.given) lines.push({ type: 'ac', tokens: [{ p: '- ' }, { b: '**Given**' }, { t: ` ${ac.given}` }] });
    if (ac.when)  lines.push({ type: 'ac', tokens: [{ p: '- ' }, { b: '**When**' },  { t: ` ${ac.when}` }] });
    if (ac.then)  lines.push({ type: 'ac', tokens: [{ p: '- ' }, { b: '**Then**' },  { t: ` ${ac.then}` }] });
    if (!ac.then) lines.push({ type: 'ac', tokens: [{ p: '- ' }, { b: '**Then**' }, { t: ' …' }] });
    lines.push({ type: 'blank' });
  });

  // Open Questions / Notes (optional)
  if (story.oq) {
    lines.push({ type: 'oq', tokens: [{ h2: '## Open Questions' }] });
    lines.push({ type: 'blank' });
    wrapText(story.oq, 78).forEach(t => lines.push({ type: 'oq', tokens: [{ t }] }));
  }

  return (
    <div className="yk-md">
      {lines.map((line, idx) => {
        const active = activeSection && line.type === activeSection;
        return (
          <div key={idx} className={`row ${active ? 'active' : ''}`}>
            <span className="gutter">{idx + 1}</span>
            <span className="content">{renderTokens(line.tokens)}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderTokens(tokens) {
  if (!tokens) return ' ';
  return tokens.map((tk, i) => {
    if (tk.h2) return <span key={i} className="h2">{tk.h2}</span>;
    if (tk.h3) return <span key={i} className="h3">{tk.h3}</span>;
    if (tk.k)  return <span key={i} className="key">{tk.k}</span>;
    if (tk.s)  return <span key={i} className="str">{tk.s}</span>;
    if (tk.p)  return <span key={i} className="punct">{tk.p}</span>;
    if (tk.b)  return <span key={i} className="bold">{tk.b}</span>;
    if (tk.t)  return <span key={i} className="list">{tk.t}</span>;
    return null;
  });
}

function wrapText(text, max) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).length > max && line) {
      out.push(line);
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  if (line) out.push(line);
  return out;
}

window.EditorBody = EditorBody;
window.MarkdownView = MarkdownView;
