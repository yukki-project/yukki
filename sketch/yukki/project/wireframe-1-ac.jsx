/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 1 — Édition AC (Given/When/Then) — section AC active
// + sommaire avec état d'avancement, footer avec compteur

function Wireframe_AC() {
  return (
    <div className="wf">
      <div className="wf-shell">
        <Topbar />
        <div className="wf-body">
          <div className="wf-pane shade">
            <Sommaire activeKey="ac" />
          </div>

          <div className="wf-pane">
            <div className="wf-doc">
              <div>
                <div className="label upper" style={{ marginBottom: 6 }}>Section</div>
                <h2>
                  <span className="wf-active-heading">Acceptance Criteria</span>
                </h2>
                <p className="body muted" style={{ marginTop: 6 }}>
                  Décris des cas concrets — Given (état initial), When (action), Then (résultat observable).
                </p>
              </div>

              {/* AC-1 — done, collapsed-ish */}
              <div className="wf-ac">
                <div className="wf-ac-header">
                  <span style={{ color: 'var(--accent-ok)' }}>✓</span>
                  <span>AC-1 — Saisie d'un Given/When/Then valide</span>
                  <div className="controls">
                    <span>▴</span>
                    <span>▾</span>
                    <span>✕</span>
                  </div>
                </div>
                <div className="wf-gwt">
                  <div className="gwt-label">Given</div>
                  <div>un nouveau formulaire d'AC vide</div>
                  <div className="gwt-label">When</div>
                  <div>le rédacteur saisit les 3 zones et clique « Ajouter »</div>
                  <div className="gwt-label">Then</div>
                  <div>l'AC s'ajoute en bas de la liste, le compteur passe à n+1</div>
                </div>
              </div>

              {/* AC-2 — active */}
              <div className="wf-ac active">
                <div className="wf-ac-header">
                  <span style={{ color: 'var(--accent-info)' }}>▶</span>
                  <span>AC-2 — Réordonner deux AC par drag</span>
                  <div className="controls">
                    <span>▴</span>
                    <span>▾</span>
                    <span>✕</span>
                  </div>
                </div>
                <div className="wf-gwt">
                  <div className="gwt-label">Given</div>
                  <div>la story contient 2 AC, AC-1 et AC-2</div>
                  <div className="gwt-label">When</div>
                  <div>
                    le rédacteur drag AC-2 au-dessus de AC-1
                    <span className="wf-caret" />
                  </div>
                  <div className="gwt-label">Then</div>
                  <div className="body muted" style={{ fontStyle: 'italic' }}>
                    décris le résultat observable…
                  </div>
                </div>
              </div>

              {/* AC-3 — incomplete */}
              <div className="wf-ac">
                <div className="wf-ac-header">
                  <span style={{ color: 'var(--accent-warn)' }}>⚠</span>
                  <span>AC-3 — Suppression d'un AC</span>
                  <div className="controls">
                    <span>▴</span>
                    <span>▾</span>
                    <span>✕</span>
                  </div>
                </div>
                <div className="wf-gwt">
                  <div className="gwt-label">Given</div>
                  <div className="body muted" style={{ fontStyle: 'italic' }}>
                    Given manquant — Yuki ne validera pas cet AC
                  </div>
                  <div className="gwt-label">When</div>
                  <div>le rédacteur clique l'icône ✕ d'un AC</div>
                  <div className="gwt-label">Then</div>
                  <div>l'AC est marqué archivé (soft-delete réversible)</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 4 }}>
                <button className="wf-btn">+ Ajouter un AC</button>
                <span className="body muted small">
                  Astuce : ⌘⏎ depuis n'importe quelle zone Given/When/Then
                </span>
              </div>

              <div className="wf-banner">
                <span>⚠</span>
                <span>
                  Open Questions est obligatoire pour exporter cette story (status = draft).
                </span>
              </div>
            </div>
          </div>

          <div className="wf-pane shade">
            <div className="label upper" style={{ marginBottom: 8 }}>Inspector — AC-2</div>
            <div className="body" style={{ marginBottom: 14 }}>
              Astuces de rédaction pour cet AC.
            </div>

            <div className="wf-box" style={{ padding: '8px 10px', marginBottom: 12 }}>
              <div className="small upper" style={{ color: 'var(--accent-ai)', marginBottom: 4 }}>
                ✦ Yuki suggère
              </div>
              <div className="body">
                Le « Then » est encore vide. Décris ce qu'on observe à l'écran après le drag —
                ordre dans le DOM, animation, message ?
              </div>
              <button className="wf-btn ghost" style={{ marginTop: 6, fontSize: 12, padding: '2px 0' }}>
                ↪ Pré-remplir avec une suggestion
              </button>
            </div>

            <div className="label upper small" style={{ marginBottom: 6 }}>Bonnes pratiques</div>
            <ul className="body" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li>1 AC = 1 comportement observable</li>
              <li>« Given » décrit l'état, pas le pourquoi</li>
              <li>« Then » utilise le présent : <em>"l'AC apparaît"</em></li>
              <li>Évite les "et" multiples — découpe</li>
            </ul>

            <hr style={{ border: 0, borderTop: '1px dashed var(--hatch)', margin: '14px 0' }} />

            <div className="label upper small" style={{ marginBottom: 6 }}>Mode</div>
            <div className="wf-tabs">
              <span className="wf-tab active">WYSIWYG</span>
              <span className="wf-tab">Markdown</span>
            </div>
            <div className="small muted body" style={{ marginTop: 6 }}>
              ⌘/ pour basculer
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Annotations */}
      <Annotation x={232} y={185} arrow="↖" w={170}>
        sommaire = état d'avancement passif, sans modale
      </Annotation>
      <Annotation x={232} y={368} arrow="↖" w={170}>
        AC-2 actif : ring info, caret blink dans la zone en cours
      </Annotation>
      <Annotation x={895} y={70} arrow="↗" w={155}>
        inspector polymorphe — devient panneau diff IA quand suggestion active
      </Annotation>
      <Annotation x={232} y={648} arrow="↘" w={180}>
        compteur 5/6 redondant : footer + sommaire
      </Annotation>
    </div>
  );
}

window.Wireframe_AC = Wireframe_AC;
