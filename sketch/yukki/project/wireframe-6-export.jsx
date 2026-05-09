/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 6 — Export bloqué + checklist cliquable

function Wireframe_Export() {
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
                <h2><span className="wf-active-heading">Open Questions</span></h2>
                <p className="body muted" style={{ marginTop: 6 }}>
                  Une décision à trancher avant l'implémentation ? Note-la ici —
                  c'est moins coûteux que de la découvrir en revue.
                </p>
              </div>

              <div className="wf-box dashed" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                <div className="body" style={{ fontStyle: 'italic' }}>
                  (section vide — clique pour commencer)
                </div>
                <button className="wf-btn" style={{ marginTop: 12 }}>+ Ajouter une question</button>
              </div>
            </div>
          </div>

          <div className="wf-pane shade">
            <div className="label upper" style={{ marginBottom: 8 }}>Empty state — pédagogique</div>
            <div className="body" style={{ marginBottom: 14 }}>
              Chaque section vide enseigne SPDD en une phrase. L'utilisateur
              n'a pas besoin de doc externe pour démarrer.
            </div>

            <div className="wf-box" style={{ padding: '8px 10px' }}>
              <div className="small upper" style={{ marginBottom: 4 }}>Exemples — autres sections</div>
              <div className="body small" style={{ lineHeight: 1.5 }}>
                <p style={{ marginBottom: 6 }}>
                  <strong>Background.</strong> "Pose le décor : pourquoi cette
                  story existe, dans quel projet, à quel moment."
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Scope In.</strong> "Liste ce que cette story livre.
                  Précis, observable, fini."
                </p>
                <p>
                  <strong>Acceptance Criteria.</strong> "Décris un cas concret
                  avec Given (état initial), When (action), Then (résultat
                  observable). Yuki t'aidera à formuler."
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer done={5} total={6} missing={['Open Questions']} />
      </div>

      {/* Export popover — anchored under the export button */}
      <div className="wf-popover" style={{
        position: 'absolute',
        top: 50,
        right: 24,
        width: 320,
        zIndex: 50,
      }}>
        <div className="label upper small" style={{ marginBottom: 6, color: 'var(--accent-warn)' }}>
          ⚠ Avant d'exporter, complète :
        </div>
        <div className="wf-checklist">
          <div className="wf-check-item done">
            <span className="mark">✓</span>
            <span>Front-matter</span>
          </div>
          <div className="wf-check-item done">
            <span className="mark">✓</span>
            <span>Background</span>
          </div>
          <div className="wf-check-item done">
            <span className="mark">✓</span>
            <span>Business Value</span>
          </div>
          <div className="wf-check-item done">
            <span className="mark">✓</span>
            <span>Scope In</span>
          </div>
          <div className="wf-check-item done">
            <span className="mark">✓</span>
            <span>Acceptance Criteria <span className="muted small">(3 AC)</span></span>
          </div>
          <div className="wf-check-item miss">
            <span className="mark">✗</span>
            <span>Open Questions</span>
            <span className="go">→ Aller</span>
          </div>
        </div>
        <hr className="wf-ai-divider" />
        <div className="small muted body" style={{ padding: '0 4px' }}>
          Ferme cette popover et exporte quand le manquant est rempli.
        </div>
      </div>

      {/* Make the popover's arrow point UP at the export button */}
      <Annotation x={1075} y={75} arrow="↗" w={140}>
        bouton Exporter cliquable — la popover explique
      </Annotation>
      <Annotation x={770} y={300} arrow="↑" w={170}>
        chaque ligne manquante est un lien actionnable
      </Annotation>
      <Annotation x={232} y={185} arrow="↖" w={170}>
        sommaire montre Open Questions en rouge — cohérent avec le footer
      </Annotation>
    </div>
  );
}

window.Wireframe_Export = Wireframe_Export;
