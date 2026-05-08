// UI-014a — Right-side inspector (360px). Mocked content; live LLM and
// real validation arrive in UI-014b/c/d.

import { useSpddEditorStore } from '@/stores/spdd';
import { SECTIONS } from './sections';
import type { InspectorContext, ProseSectionKey, SectionKey } from './types';

const KNOWN_MODULES = [
  'frontend',
  'backend',
  'controller',
  'extensions/auth',
  'extensions/billing',
  'helm',
  'docs',
  'cli',
  'internal/uiapp',
  'internal/provider',
];

const STATUS_DEFINITIONS: Array<{ value: string; description: string }> = [
  { value: 'draft', description: "rédaction en cours, pas encore en revue" },
  { value: 'reviewed', description: "validée par le PO, prête pour analyse" },
  { value: 'accepted', description: "analyse et canvas figés, prête à coder" },
  { value: 'implemented', description: "code généré, tests verts" },
  { value: 'synced', description: "code et canvas alignés après refactor" },
];

const PROSE_RECOMMENDATIONS: Record<ProseSectionKey, string[]> = {
  bg: [
    "Vise 2 à 4 phrases — c'est un décor, pas un mémoire.",
    "Mentionne le module impacté au moins une fois.",
    "Évite l'impératif (« il faut… ») : décris ce qui est, pas ce qu'on doit faire.",
    "Ne propose pas de solution technique, c'est le rôle du canvas.",
  ],
  bv: [
    "Formule comme « En tant que … je veux … afin de … ».",
    "Quantifie le gain dès que c'est possible.",
    "Cible un public précis (PO, dev, ops, fin), pas « les utilisateurs ».",
    "Évite les bénéfices vagues comme « améliorer l'expérience ».",
  ],
  si: [
    "Une puce = un comportement observable.",
    "Préfère des verbes d'action concrets (« afficher », « valider », « persister »).",
    "Garde la liste resserrée — 4 à 8 puces.",
    "Si une puce est ambiguë, déplace-la en Open Questions.",
  ],
  so: [
    "Cite explicitement les hypothèses tentantes mais hors-scope.",
    "Indique pourquoi (« couvert par UI-014b », « hors périmètre métier »).",
    "Permet à la revue de couper court aux discussions de scope.",
  ],
  oq: [
    "Pose les questions au PO ou à l'archi, pas à toi-même.",
    "Coche au fil de l'eau — une question résolue se transforme en décision dans Notes.",
    "Si une question bloque la rédaction, escalade avant de continuer.",
  ],
  no: [
    "Liens vers tickets, threads, captures, dashboards.",
    "Évite les paragraphes : c'est un dépôt, pas un récit.",
    "Mentionne les stories liées (parente, dépendances) pour faciliter la traversée.",
  ],
};

const PROSE_DEFINITIONS: Record<ProseSectionKey, string> = {
  bg: "Le contexte qui justifie l'existence de la story. Pourquoi maintenant, quel décor métier ou technique. 3 à 6 lignes.",
  bv: "La valeur livrée à un public donné. Le « pour qui » et le « pourquoi », pas le « comment ».",
  si: "Le périmètre couvert par cette story. Liste actionnable de comportements.",
  so: "Le périmètre explicitement exclu, avec sa raison.",
  oq: "Les questions à trancher avant ou pendant la revue.",
  no: "Les pointeurs : tickets, captures, threads, stories liées.",
};

export function SpddInspector(): JSX.Element {
  const activeSection = useSpddEditorStore((s) => s.activeSection);
  const ctx = toContext(activeSection);
  const sectionMeta = SECTIONS.find((s) => s.key === activeSection);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-yk-bg-1 px-4 py-4 font-inter">
      <header className="mb-3">
        <p className="font-jbmono text-[10px] uppercase tracking-[0.12em] text-yk-text-muted">
          Inspector
        </p>
        <h2 className="text-[13.5px] font-semibold text-yk-text-primary">
          {sectionMeta?.label}
        </h2>
      </header>

      {ctx.kind === 'fm' && <FmCards />}
      {ctx.kind === 'ac' && <AcCards />}
      {ctx.kind === 'prose' && <ProseCards section={ctx.section} />}
    </div>
  );
}

function toContext(key: SectionKey): InspectorContext {
  if (key === 'fm') return { kind: 'fm' };
  if (key === 'ac') return { kind: 'ac' };
  return { kind: 'prose', section: key as ProseSectionKey };
}

interface CardProps {
  label: string;
  children: React.ReactNode;
}

function Card({ label, children }: CardProps): JSX.Element {
  return (
    <section className="mb-3 rounded-yk border border-yk-line-subtle bg-yk-bg-2 px-3.5 py-3">
      <p className="mb-1.5 font-jbmono text-[10px] uppercase tracking-wider text-yk-text-muted">
        {label}
      </p>
      <div className="text-[12.5px] leading-[1.55] text-yk-text-secondary">
        {children}
      </div>
    </section>
  );
}

function ProseCards({ section }: { section: ProseSectionKey }): JSX.Element {
  return (
    <>
      <Card label="Définition SPDD">
        <p>{PROSE_DEFINITIONS[section]}</p>
      </Card>
      <Card label="Recommandations">
        <ul className="space-y-1.5">
          {PROSE_RECOMMENDATIONS[section].map((r, i) => (
            <li key={i} className="flex gap-2">
              <span
                aria-hidden
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yk-text-faint"
              />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card label="IA">
        <p>
          Sélectionne au moins 3 mots dans cette section pour ouvrir le menu
          d'assistance. Le contexte SPDD de la section est inclus dans le
          prompt.
        </p>
      </Card>
    </>
  );
}

function FmCards(): JSX.Element {
  return (
    <>
      <Card label="Modules connus">
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_MODULES.map((m) => (
            <span
              key={m}
              className="rounded-yk-sm bg-yk-bg-3 px-2 py-0.5 font-jbmono text-[11.5px] text-yk-text-secondary"
            >
              {m}
            </span>
          ))}
        </div>
      </Card>
      <Card label="Statuts SPDD">
        <ul className="space-y-1.5">
          {STATUS_DEFINITIONS.map((s) => (
            <li key={s.value} className="flex gap-2">
              <span className="font-jbmono text-[11.5px] text-yk-text-primary">
                {s.value}
              </span>
              <span className="text-yk-text-muted">— {s.description}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card label="Validation">
        <p>
          La plupart des champs valident au blur (id, slug, dates, owner). Le
          slug se met à jour en temps réel pour anticiper les conflits de
          fichier.
        </p>
      </Card>
    </>
  );
}

function AcCards(): JSX.Element {
  return (
    <>
      <Card label="Définition SPDD">
        <p>
          Un Acceptance Criterion = un comportement observable au format
          Given/When/Then. Chaque AC doit être testable en isolation.
        </p>
      </Card>
      <Card label="Bonnes pratiques">
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <span
              aria-hidden
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yk-text-faint"
            />
            <span>1 AC = 1 comportement. Évite les « et » multiples.</span>
          </li>
          <li className="flex gap-2">
            <span
              aria-hidden
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yk-text-faint"
            />
            <span>Given décrit un état initial, pas une cause ou un pourquoi.</span>
          </li>
          <li className="flex gap-2">
            <span
              aria-hidden
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yk-text-faint"
            />
            <span>Then est observable au présent (« le bouton apparaît »).</span>
          </li>
        </ul>
      </Card>
      <Card label="Yuki suggère">
        <div className="rounded-yk-sm border border-[color:var(--yk-primary-ring)] bg-[color:var(--yk-primary-soft)] p-2.5 text-yk-text-primary">
          <p className="text-[12.5px]">
            <span className="font-jbmono text-[11.5px] text-yk-primary">AC-2</span>
            {' — '}
            le Then est encore vide. Décris ce qu'on observe à l'écran après
            le drag.
          </p>
          <button
            type="button"
            className="mt-2 rounded-yk-sm border border-yk-primary px-2 py-1 font-jbmono text-[11px] text-yk-primary hover:bg-[color:var(--yk-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--yk-primary-ring)]"
            disabled
            title="Disponible en UI-014d"
          >
            Pré-remplir
          </button>
        </div>
      </Card>
    </>
  );
}
