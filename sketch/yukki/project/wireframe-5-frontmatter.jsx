/* global React, Topbar, Sommaire, Footer, Annotation */
// Wireframe 5 — Front-matter avec validation inline

function Row({ k, value, error, errMsg, hint }) {
  return (
    <div className="wf-row">
      <div className="key mono">{k}</div>
      <div>
        <div className={`val ${error ? 'error' : ''}`}>
          {value}
        </div>
        {hint && !error && <div className="small muted body" style={{ marginTop: 3 }}>{hint}</div>}
      </div>
      {error && (
        <div className="err-msg">
          <span>ⓘ</span>
          <span>{errMsg}</span>
        </div>
      )}
    </div>
  );
}

function Wireframe_FrontMatter() {
  return (
    <div className="wf">
      <div className="wf-shell">
        <Topbar />
        <div className="wf-body">
          <div className="wf-pane shade">
            <Sommaire activeKey="fm" acStates={['done', 'done', 'done']} />
          </div>

          <div className="wf-pane">
            <div className="wf-doc">
              <div>
                <div className="label upper" style={{ marginBottom: 6 }}>Section</div>
                <h2><span className="wf-active-heading">Front-matter</span></h2>
                <p className="body muted" style={{ marginTop: 6 }}>
                  Métadonnées de la story. Validation au blur (sauf slug, immédiat).
                </p>
              </div>

              <div className="wf-box" style={{ padding: '10px 16px' }}>
                <Row k="id" value="FRONT-002" hint="Préfixe de module + numéro" />
                <Row
                  k="slug"
                  value="éditeur-spdd-v1"
                  error
                  errMsg={"Le slug n’accepte que des lettres minuscules, chiffres et tirets — pas d’espaces ni d’accents."}
                />
                <Row k="title" value="Éditeur guidé SPDD" />
                <Row k="status" value="draft" hint="draft · reviewed · accepted · done · archived" />
                <Row
                  k="created"
                  value="12-04-2026"
                  error
                  errMsg="Format de date attendu : AAAA-MM-JJ (ex. 2026-04-12)."
                />
                <Row k="updated" value="2026-05-07" />
                <Row k="owner" value="po-front@yuki" />
                <Row
                  k="modules"
                  value="[frontend, backend-stuff]"
                  error
                  errMsg={"« backend-stuff » n’est pas un module connu. Choisis dans la liste, ou demande à un lead d’en ajouter un."}
                />
              </div>

              <div className="wf-banner" style={{ marginTop: 4 }}>
                <span>ⓘ</span>
                <span>
                  3 erreurs dans le front-matter — l'export reste bloqué tant qu'elles ne sont pas corrigées.
                </span>
              </div>
            </div>
          </div>

          <div className="wf-pane shade">
            <div className="label upper" style={{ marginBottom: 8 }}>Référence — modules</div>
            <div className="body" style={{ marginBottom: 6 }}>
              Liste fermée. Modifiable par les leads via fichier de config.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {['frontend', 'backend', 'controller', 'extensions/auth', 'extensions/billing', 'helm', 'docs', 'cli'].map(m => (
                <span key={m} className="wf-pill mono">{m}</span>
              ))}
            </div>

            <hr style={{ border: 0, borderTop: '1px dashed var(--hatch)', margin: '4px 0 14px' }} />

            <div className="label upper small" style={{ marginBottom: 6 }}>Stratégie de validation</div>
            <ul className="body" style={{ paddingLeft: 18, lineHeight: 1.65, fontSize: 12.5 }}>
              <li>À la frappe : aucune erreur affichée</li>
              <li>Au blur : validation inline</li>
              <li>800ms après dernière frappe : validation soft</li>
              <li><strong>slug</strong> : strip silencieux des invalides</li>
            </ul>
          </div>
        </div>
        <Footer done={3} total={6} missing={['Acceptance Criteria', 'Open Questions', 'corriger 3 erreurs front-matter']} />
      </div>

      <Annotation x={368} y={300} arrow="↖" w={175}>
        erreur inline sous le champ — pas de modale, pas de toast
      </Annotation>
      <Annotation x={368} y={500} arrow="↖" w={185}>
        message explicite + suggestion d'action ("demande à un lead")
      </Annotation>
      <Annotation x={232} y={185} arrow="↖" w={170}>
        sommaire affiche "Front-matter (3 erreurs)" en agrégé
      </Annotation>
    </div>
  );
}

window.Wireframe_FrontMatter = Wireframe_FrontMatter;
