/* global React, ReactDOM, Icon, SECTION_DEFS, DEFAULT_STORY,
   TitleBar, Tabs, ActivityBar, StoryHeader, Footer,
   Toc, EditorBody, validateFM,
   AIPopover, DiffPanel, Inspector, ExportPopover, Toast,
   DesignCanvas, DCSection, DCArtboard */

const { useState, useMemo } = React;

// ============================================================
// One artboard = one full app instance, in a specific state
// ============================================================
function App({
  initialMode = 'wysiwyg',
  initialActive = 'bg',
  initialAcIdx = null,
  story = null,
  rightContext = 'section',
  showAIPopover = false,
  popoverPos = { x: 360, y: 360 },
  selection = null,
  showDiff = false,
  diffData = null,
  showExport = false,
  showToast = null,
  acFocusIdx = null,
  fmDirty = false,
}) {
  const [mode, setMode] = useState(initialMode);
  const [active, setActive] = useState(initialActive);
  const [storyState, setStoryState] = useState(story || DEFAULT_STORY());
  const fmErrs = validateFM(storyState.fm);
  const fmErrorCount = Object.keys(fmErrs).length;

  // Compute section states for TOC
  const sectionStates = useMemo(() => {
    const s = {};
    s.fm = fmErrorCount > 0 ? 'todo' : 'done';
    s.bg = storyState.bg ? 'done' : 'todo';
    s.bv = storyState.bv ? 'done' : 'todo';
    s.si = storyState.si && storyState.si.length ? 'done' : 'todo';
    s.so = storyState.so ? 'done' : 'optional';
    const acs = storyState.ac || [];
    const allAcDone = acs.length >= 1 && acs.every(a => a.given && a.when && a.then);
    s.ac = allAcDone ? 'done' : (acs.length > 0 ? 'todo' : 'todo');
    s.oq = storyState.oq ? 'done' : 'optional';
    s.no = storyState.no ? 'done' : 'optional';
    return s;
  }, [storyState, fmErrorCount]);

  const acStates = (storyState.ac || []).map((ac, i) => {
    const filled = ac.given && ac.when && ac.then;
    return {
      state: filled ? 'done' : 'todo',
      active: i === acFocusIdx,
    };
  });

  const requiredKeys = SECTION_DEFS.filter(s => s.required).map(s => s.key);
  const doneCount = requiredKeys.filter(k => sectionStates[k] === 'done').length;
  const missing = requiredKeys.filter(k => sectionStates[k] !== 'done').map(k => SECTION_DEFS.find(s => s.key === k).label);

  const activeDef = SECTION_DEFS.find(s => s.key === active) || SECTION_DEFS[1];

  // Right pane content
  let rightPane;
  if (showDiff && diffData) {
    rightPane = <DiffPanel {...diffData} />;
  } else {
    rightPane = (
      <Inspector
        context={rightContext}
        sectionLabel={activeDef.label}
        sectionHint={activeDef.hint}
      />
    );
  }

  // Export checklist
  const exportChecklist = [
    { label: 'Front-matter complet', done: fmErrorCount === 0 },
    { label: 'Background non-vide', done: !!storyState.bg },
    { label: 'Business Value non-vide', done: !!storyState.bv },
    { label: 'Au moins 1 Scope In', done: storyState.si && storyState.si.length > 0 },
    { label: 'Tous les AC ont Given/When/Then', done: (storyState.ac || []).every(a => a.given && a.when && a.then) },
  ];

  return (
    <div className="yk yk-app">
      <TitleBar />
      <Tabs dirty={fmDirty || mode === 'wysiwyg'} />
      <div className="yk-main">
        <ActivityBar active="story" />
        <div className="yk-content">
          <StoryHeader
            mode={mode}
            onMode={setMode}
            dirty={fmDirty}
            hasErrors={fmErrorCount > 0}
            onExport={() => {}}
          />
          <div className="yk-body">
            <div className="yk-pane">
              <Toc
                activeKey={active}
                onJump={setActive}
                sectionStates={sectionStates}
                fmErrors={fmErrorCount}
                acStates={acStates}
                expandAc={true}
                onSubJump={(k, i) => setActive(k)}
              />
            </div>
            <div className="yk-pane" style={{ position: 'relative' }}>
              <EditorBody
                story={storyState}
                setStory={setStoryState}
                mode={mode}
                activeSection={active}
                focusedAcIdx={acFocusIdx}
                selection={selection}
                mutedSelection={showDiff}
              />
              {showAIPopover && (
                <AIPopover
                  x={popoverPos.x}
                  y={popoverPos.y}
                  sectionLabel={activeDef.label}
                  onAction={() => {}}
                  onClose={() => {}}
                />
              )}
              {showExport && (
                <ExportPopover
                  checklist={exportChecklist}
                  onClose={() => {}}
                  onExport={() => {}}
                />
              )}
              {showToast && <Toast message={showToast.message} kbd={showToast.kbd} />}
            </div>
            <div className="yk-pane">
              {rightPane}
            </div>
          </div>
          <Footer done={doneCount} total={requiredKeys.length} missing={missing} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// State variants for the 6 artboards
// ============================================================

// 1 — Default: empty-ish story, focused on Background
const story1 = () => {
  const s = DEFAULT_STORY();
  return s;
};

// 2 — AI popover open on a Background selection
const story2 = () => {
  const s = DEFAULT_STORY();
  return s;
};

// 3 — Diff panel after "Reformuler" was clicked
const story3 = () => {
  const s = DEFAULT_STORY();
  // Same story; the diff overlays the right pane and replaces the prose-block
  return s;
};

// 4 — Front-matter validation errors
const story4 = () => {
  const s = DEFAULT_STORY();
  s.fm.id = 'front-2';            // bad format
  s.fm.slug = 'SPDD Editor';      // bad chars / space / case
  s.fm.modules = ['frontend', 'unknown-module'];
  s.fm.created = '12-04-2026';    // bad date
  return s;
};

// 5 — AC focus: AC-2 is incomplete (Then is empty), inspector shows guidance
const story5 = () => {
  const s = DEFAULT_STORY();
  return s;
};

// 6 — Export popover with all-green checklist
const story6 = () => {
  const s = DEFAULT_STORY();
  s.bg = s.bg;
  s.so = ['Édition collaborative en temps réel', 'Versionning de stories', 'Génération automatique d\'AC'];
  s.ac = s.ac.map((ac, i) => i === 1 ? { ...ac, then: 'l\'ordre est mis à jour, la numérotation reste contiguë (AC-1 à AC-N)' } : (i === 2 ? { ...ac, given: 'la story contient au moins 1 AC' } : ac));
  return s;
};

// ============================================================
// Selection markers for the AI screens
// ============================================================
// Find the selection range in the Background text
const story2obj = story2();
const bgText = story2obj.bg;
const selStart = bgText.indexOf('la qualité');
const selEnd = bgText.indexOf('rédacteur') + 'rédacteur'.length;
const selection2 = { from: selStart, to: selEnd, muted: false };
const selection3 = { from: selStart, to: selEnd, muted: true };

// Diff data for artboard 3
const diffData3 = {
  before: bgText.slice(selStart, selEnd),
  after: 'la qualité varie selon la rigueur et l\'expérience SPDD du rédacteur',
  action: 'Reformuler',
  latencyMs: 2100,
  onAccept: () => {},
  onReject: () => {},
  onRegenerate: () => {},
};

// ============================================================
// Final canvas composition
// ============================================================
function Root() {
  return (
    <DesignCanvas>
      <DCSection
        id="default"
        title="Éditeur SPDD"
        subtitle="L'expérience de base : sommaire à gauche, document au centre, inspector contextuel à droite. Header avec l'identifiant FRONT-002, statut, et le toggle WYSIWYG ↔ Markdown."
      >
        <DCArtboard id="default" label="01 · État par défaut" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="bg"
              story={story1()}
            />
          </div>
        </DCArtboard>
        <DCArtboard id="markdown" label="02 · Bascule Markdown" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="md"
              initialActive="ac"
              story={story1()}
            />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="ai"
        title="Assistance IA contextuelle"
        subtitle="Sur sélection (≥3 mots), un popover propose 4 actions. Le contexte SPDD est déjà inclus — Yuki sait dans quelle section tu écris. Après acceptation, un panneau Avant/Après remplace l'inspector pour valider le diff."
      >
        <DCArtboard id="ai-popover" label="03 · Popover sur sélection" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="bg"
              story={story2()}
              selection={selection2}
              showAIPopover={true}
              popoverPos={{ x: 410, y: 320 }}
            />
          </div>
        </DCArtboard>
        <DCArtboard id="ai-diff" label="04 · Panneau diff Avant/Après" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="bg"
              story={story3()}
              selection={selection3}
              showDiff={true}
              diffData={diffData3}
            />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="validation"
        title="Validation & guidage"
        subtitle="Le front-matter valide en temps réel avec messages explicites. Les AC partiellement remplis affichent un état warning ; l'inspector suggère quoi compléter."
      >
        <DCArtboard id="fm-errors" label="05 · Erreurs front-matter" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="fm"
              story={story4()}
              rightContext="fm"
              fmDirty={true}
            />
          </div>
        </DCArtboard>
        <DCArtboard id="ac-focus" label="06 · AC en cours, inspector guide" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="ac"
              story={story5()}
              acFocusIdx={1}
              rightContext="ac"
            />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="export"
        title="Export"
        subtitle="L'export `.md` n'est débloqué que si toutes les sections obligatoires sont complètes. Sinon, une checklist explique ce qui manque, avec liens directs."
      >
        <DCArtboard id="export-ready" label="07 · Export prêt — checklist verte" width={1400} height={900}>
          <div className="yk-artboard">
            <App
              initialMode="wysiwyg"
              initialActive="bg"
              story={story6()}
              showExport={true}
              showToast={{ message: 'Story sauvée — front-matter valide', kbd: '⌘S' }}
            />
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
