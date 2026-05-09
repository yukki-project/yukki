/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 4 — Panneau de comparaison Avant/Après (split-view)

function Wireframe_Diff() {
  return (
    <div className="wf">
      <div className="wf-shell">
        <Topbar extra={
          <span className="wf-pill ai">✦ Suggestion en revue</span>
        } />
        <div className="wf-body split">
          <div className="wf-pane shade">
            <Sommaire activeKey="bg" />
          </div>

          {/* LEFT: document with selection grayed */}
          <div className="wf-pane">
            <div className="wf-doc">
              <div>
                <div className="label upper" style={{ marginBottom: 6 }}>Section</div>
                <h2><span className="wf-active-heading">Background</span></h2>
              </div>

              <div className="wf-prose" style={{ maxWidth: 540, opacity: 0.55 }}>
                <p>
                  Aujourd'hui les stories se rédigent à la main dans
                </p>
                <div className="wf-box" style={{ padding: '8px 10px', background: 'var(--paper-shade)', margin: '6px 0' }}>
                  <span style={{ background: 'rgba(106, 61, 138, 0.12)' }}>
                    un éditeur markdown générique, c'est lent et sujet à oublis
                    de sections, et la qualité dépend de la rigueur du rédacteur.
                  </span>
                </div>
                <p className="small muted" style={{ fontStyle: 'italic' }}>
                  ↑ sélection en cours de revue (grisée le temps de la suggestion)
                </p>
              </div>

              <div className="wf-prose" style={{ maxWidth: 540, marginTop: 16 }}>
                <p>
                  Cette friction freine l'adoption de SPDD chez les nouveaux PO.
                  L'éditeur guidé doit conserver la liberté du markdown libre
                  tout en imposant la structure.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: diff panel */}
          <div className="wf-pane shade" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--line)' }}>
              <div className="small upper" style={{ color: 'var(--accent-ai)', fontWeight: 700, letterSpacing: '0.08em' }}>
                ✦ Suggestion de Yuki
              </div>
              <div className="body" style={{ marginTop: 4 }}>
                <strong>Améliorer la lisibilité</strong>
                <span className="muted small" style={{ marginLeft: 8 }}>· 2.1s</span>
              </div>
            </div>

            <div style={{ padding: '12px 16px', overflow: 'auto', flex: 1 }}>
              <div className="wf-diff-block">
                <div className="head before">Avant</div>
                <div className="body">
                  un éditeur markdown générique, c'est lent et sujet à oublis
                  de sections, et la qualité dépend de la rigueur du rédacteur.
                </div>
              </div>

              <div className="wf-diff-block">
                <div className="head after">✓ Après</div>
                <div className="body">
                  un éditeur markdown générique. Cette pratique est lente,
                  favorise les oublis et rend la qualité dépendante du rédacteur.
                </div>
              </div>

              <div className="wf-diff-block">
                <div className="head diff">Diff</div>
                <div className="body" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>
                  <span className="wf-diff-line del">…c'est lent et sujet à oublis de sections, et la qualité dépend…</span>
                  <span className="wf-diff-line add">…Cette pratique est lente, favorise les oublis et rend la qualité dépendante…</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <button className="wf-btn ghost" style={{ padding: '4px 0' }}>↻ Régénérer</button>
                <button className="wf-btn ghost" style={{ padding: '4px 0', color: 'var(--accent-info)' }}>
                  ⓘ Voir prompt
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1.5px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--paper)' }}>
              <button className="wf-btn">Refuser</button>
              <button className="wf-btn primary">✓ Accepter</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      <Annotation x={232} y={400} arrow="↖" w={155}>
        sélection grisée — contexte préservé, pas une modale
      </Annotation>
      <Annotation x={690} y={185} arrow="↑" w={185}>
        3 vues du delta : Avant / Après / Diff — selon préférence
      </Annotation>
      <Annotation x={690} y={530} arrow="↓" w={170}>
        Refuser et Accepter sont symétriques — pas de "annuler" gris
      </Annotation>
      <Annotation x={690} y={465} arrow="←" w={170}>
        Régénérer = nouvelle variation sans refaire la sélection
      </Annotation>
    </div>
  );
}

window.Wireframe_Diff = Wireframe_Diff;
