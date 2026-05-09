/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 3 — Menu contextuel d'assistance IA sur sélection

function Wireframe_AIPopover() {
  return (
    <div className="wf">
      <div className="wf-shell">
        <Topbar />
        <div className="wf-body">
          <div className="wf-pane shade">
            <Sommaire activeKey="bg" />
          </div>

          <div className="wf-pane">
            <div className="wf-doc">
              <div>
                <div className="label upper" style={{ marginBottom: 6 }}>Section</div>
                <h2><span className="wf-active-heading">Background</span></h2>
              </div>

              <div className="wf-prose" style={{ position: 'relative', maxWidth: 620 }}>
                <p>
                  Aujourd'hui les stories se rédigent à la main dans{' '}
                  <span className="wf-selection">
                    un éditeur markdown générique, c'est lent et sujet à oublis de sections,
                    et la qualité dépend de la rigueur du rédacteur.
                  </span>
                </p>

                {/* The popover, anchored under the selection */}
                <div className="wf-popover" style={{ top: 70, left: 36, width: 290 }}>
                  <div className="wf-ai-action active">
                    <span className="star">✦</span>
                    <span>Améliorer la lisibilité</span>
                  </div>
                  <div className="wf-ai-action">
                    <span className="star">✦</span>
                    <span>Enrichir le contenu</span>
                  </div>
                  <div className="wf-ai-action">
                    <span className="star">✦</span>
                    <span>Reformuler</span>
                  </div>
                  <div className="wf-ai-action">
                    <span className="star">✦</span>
                    <span>Raccourcir</span>
                  </div>
                  <hr className="wf-ai-divider" />
                  <div className="wf-ai-trans">
                    <span style={{ color: 'var(--accent-ai)', fontWeight: 700 }}>ⓘ</span>{' '}
                    Yuki sait que tu rédiges la section <strong>Background</strong>.
                    Le contexte SPDD est inclus dans le prompt.{' '}
                    <span style={{ color: 'var(--accent-info)', textDecoration: 'underline', textDecorationStyle: 'dashed' }}>
                      Voir ▸
                    </span>
                  </div>
                </div>

                <p style={{ marginTop: 220 }}>
                  Cette friction freine l'adoption de SPDD chez les nouveaux PO.
                  L'éditeur guidé doit conserver la liberté du markdown libre
                  tout en imposant la structure.
                </p>

                <p>
                  Le pari : structure + assistance IA contextuelle qui n'écrit jamais à
                  la place de l'humain — elle propose, l'humain dispose.
                </p>
              </div>
            </div>
          </div>

          <div className="wf-pane shade">
            <div className="label upper" style={{ marginBottom: 8 }}>Inspector — Background</div>

            <div className="wf-box" style={{ padding: '8px 10px', marginBottom: 12 }}>
              <div className="small upper" style={{ color: 'var(--ink-soft)', marginBottom: 4 }}>
                Définition SPDD
              </div>
              <div className="body">
                Le contexte de la story : pourquoi elle existe, dans quel
                projet, à quel moment. Pas la solution.
              </div>
            </div>

            <div className="label upper small" style={{ marginBottom: 6 }}>Recommandations</div>
            <ul className="body" style={{ paddingLeft: 18, lineHeight: 1.65 }}>
              <li>2 à 4 phrases suffisent</li>
              <li>Mentionne le module concerné</li>
              <li>Évite l'impératif (« il faut »)</li>
              <li>Pas de solution technique</li>
            </ul>

            <hr style={{ border: 0, borderTop: '1px dashed var(--hatch)', margin: '14px 0' }} />

            <div className="label upper small" style={{ marginBottom: 6 }}>
              ✦ Sélection IA active
            </div>
            <div className="body" style={{ marginBottom: 6 }}>
              <strong>2 lignes · 21 mots</strong>
            </div>
            <div className="small muted body">
              Esc ferme le menu sans modifier le texte.
            </div>
          </div>
        </div>
        <Footer />
      </div>

      <Annotation x={368} y={245} arrow="↖" w={170}>
        sélection ≥ 3 mots — sinon toast pédagogique
      </Annotation>
      <Annotation x={680} y={300} arrow="←" w={185}>
        4 verbes courts, ordonnés du plus cosmétique au plus transformateur
      </Annotation>
      <Annotation x={680} y={440} arrow="←" w={195}>
        transparence du prompt visible, pas masquée derrière une icône
      </Annotation>
      <Annotation x={232} y={185} arrow="↖" w={170}>
        sommaire = repère "tu es ici" — Background actif
      </Annotation>
    </div>
  );
}

window.Wireframe_AIPopover = Wireframe_AIPopover;
