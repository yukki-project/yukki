/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 2 — Mode markdown brut (toggle ⌘/)

function MdRow({ n, children, type }) {
  return (
    <div className="row">
      <span className="gutter">{n}</span>
      <span className={type ? type : ''}>{children}</span>
    </div>
  );
}

function Wireframe_Markdown() {
  return (
    <div className="wf">
      <div className="wf-shell">
        <Topbar mode="md" />
        <div className="wf-body">
          <div className="wf-pane shade">
            <Sommaire activeKey="ac" />
          </div>

          <div className="wf-pane" style={{ padding: 0 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="label upper small">Document — markdown brut</span>
              <span style={{ flex: 1 }} />
              <div className="wf-tabs">
                <span className="wf-tab">WYSIWYG</span>
                <span className="wf-tab active">Markdown</span>
              </div>
              <span className="small muted">⌘/ pour basculer</span>
            </div>

            <div className="wf-md" style={{ padding: '14px 4px 14px 0', overflow: 'auto', height: 'calc(100% - 50px)' }}>
              <MdRow n="1">---</MdRow>
              <MdRow n="2"><span className="fm-key">id</span>: FRONT-002</MdRow>
              <MdRow n="3"><span className="fm-key">slug</span>: spdd-editor</MdRow>
              <MdRow n="4"><span className="fm-key">title</span>: Éditeur guidé SPDD</MdRow>
              <MdRow n="5"><span className="fm-key">status</span>: draft</MdRow>
              <MdRow n="6"><span className="fm-key">created</span>: 2026-04-12</MdRow>
              <MdRow n="7"><span className="fm-key">updated</span>: 2026-05-07</MdRow>
              <MdRow n="8"><span className="fm-key">owner</span>: po-front@yuki</MdRow>
              <MdRow n="9"><span className="fm-key">modules</span>: [frontend, docs]</MdRow>
              <MdRow n="10">---</MdRow>
              <MdRow n="11">{'\u00a0'}</MdRow>
              <MdRow n="12" type="heading">## Background</MdRow>
              <MdRow n="13">{'\u00a0'}</MdRow>
              <MdRow n="14">Aujourd'hui les stories se rédigent à la main dans un éditeur</MdRow>
              <MdRow n="15">markdown générique (VS Code, Obsidian) — c'est lent, sujet à</MdRow>
              <MdRow n="16">oublis de sections, et la qualité dépend de la rigueur du</MdRow>
              <MdRow n="17">rédacteur.</MdRow>
              <MdRow n="18">{'\u00a0'}</MdRow>
              <MdRow n="19" type="heading">## Business Value</MdRow>
              <MdRow n="20">{'\u00a0'}</MdRow>
              <MdRow n="21">En tant que **PO**, je veux rédiger des stories SPDD sans</MdRow>
              <MdRow n="22">oublier de sections, afin de raccourcir les cycles de revue.</MdRow>
              <MdRow n="23">{'\u00a0'}</MdRow>
              <MdRow n="24" type="heading">## Scope In</MdRow>
              <MdRow n="25">{'\u00a0'}</MdRow>
              <MdRow n="26">- Édition guidée par section</MdRow>
              <MdRow n="27">- Bascule WYSIWYG ↔ markdown brut</MdRow>
              <MdRow n="28">- Assistance IA sur sélection (4 actions)</MdRow>
              <MdRow n="29">- Validation front-matter inline</MdRow>
              <MdRow n="30">- Export `.md` conforme</MdRow>
              <MdRow n="31">{'\u00a0'}</MdRow>
              <MdRow n="32" type="heading">## Acceptance Criteria</MdRow>
              <MdRow n="33">{'\u00a0'}</MdRow>
              <MdRow n="34" type="heading">### AC-1 — Saisie d'un Given/When/Then valide</MdRow>
              <MdRow n="35">{'\u00a0'}</MdRow>
              <MdRow n="36">- **Given** un nouveau formulaire d'AC vide</MdRow>
              <MdRow n="37">- **When** le rédacteur saisit les 3 zones et clique « Ajouter »</MdRow>
              <MdRow n="38">- **Then** l'AC s'ajoute en bas de la liste, le compteur passe à n+1</MdRow>
              <MdRow n="39">{'\u00a0'}</MdRow>
              <MdRow n="40" type="heading">### AC-2 — Réordonner deux AC par drag<span className="wf-caret" /></MdRow>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      <Annotation x={460} y={70} arrow="↑" w={200}>
        bascule visible dans la topbar — pas d'ambiguïté sur le mode
      </Annotation>
      <Annotation x={232} y={185} arrow="↖" w={180}>
        sommaire reste fonctionnel — click → scroll vers la ligne du heading
      </Annotation>
      <Annotation x={460} y={648} arrow="↘" w={200}>
        round-trip garanti — un fuzzer teste WYSIWYG ↔ MD en CI
      </Annotation>
    </div>
  );
}

window.Wireframe_Markdown = Wireframe_Markdown;
