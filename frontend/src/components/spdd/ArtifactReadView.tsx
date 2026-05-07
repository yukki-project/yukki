// UI-016 — Read-only (view-only) rendering of an artifact based on its EditState + ParsedTemplate.
// Replaces the ReactMarkdown prose view from StoryViewer.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { EditState, SectionState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';
import type { GenericAc } from '@/components/spdd/types';

// ─── Status badge (mirrors HubList) ──────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  accepted: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  implemented: 'bg-green-500/15 text-green-700 dark:text-green-300',
  synced: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'in-progress': 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
};

// ─── Frontmatter header (read-only) ──────────────────────────────────────

interface FmHeaderProps {
  fmValues: EditState['fmValues'];
}

function FmHeader({ fmValues }: FmHeaderProps): JSX.Element {
  const title = String(fmValues['title'] ?? '');
  const id = String(fmValues['id'] ?? '');
  const status = String(fmValues['status'] ?? '');
  const updated = String(fmValues['updated'] ?? fmValues['created'] ?? '');

  return (
    <header className="border-b border-border px-6 py-4">
      {title && (
        <h1 className="text-[18px] font-semibold text-foreground leading-snug mb-2">{title}</h1>
      )}
      <div className="flex flex-wrap gap-2 items-center text-[12px] text-muted-foreground">
        {id && <span className="font-mono">{id}</span>}
        {status && (
          <span className={cn('rounded px-1.5 py-0.5 font-medium capitalize', STATUS_BADGE[status] ?? 'bg-muted text-muted-foreground')}>
            {status}
          </span>
        )}
        {updated && <span>mis à jour {updated}</span>}
      </div>
    </header>
  );
}

// ─── AC card (read-only) ─────────────────────────────────────────────────

interface AcCardProps {
  ac: GenericAc;
}

function AcCard({ ac }: AcCardProps): JSX.Element {
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-1.5 text-[13.5px]">
      {ac.title && (
        <p className="font-semibold text-foreground">{ac.id} — {ac.title}</p>
      )}
      {ac.given && (
        <div className="flex gap-2">
          <span className="shrink-0 font-semibold text-blue-600 dark:text-blue-400 w-12">Given</span>
          <span className="text-foreground">{ac.given}</span>
        </div>
      )}
      {ac.when && (
        <div className="flex gap-2">
          <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400 w-12">When</span>
          <span className="text-foreground">{ac.when}</span>
        </div>
      )}
      {ac.then && (
        <div className="flex gap-2">
          <span className="shrink-0 font-semibold text-green-600 dark:text-green-400 w-12">Then</span>
          <span className="text-foreground">{ac.then}</span>
        </div>
      )}
    </div>
  );
}

// ─── Section renderer (read-only) ────────────────────────────────────────

interface SectionViewProps {
  section: SectionState;
}

function SectionView({ section }: SectionViewProps): JSX.Element {
  return (
    <section className="px-6 py-4 border-b border-border last:border-b-0">
      <h2 className="mb-3 text-[15px] font-semibold text-foreground">{section.heading}</h2>
      {section.widget === 'ac-cards' ? (
        <div className="space-y-2">
          {section.acs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground italic">Aucun critère.</p>
          ) : (
            section.acs.map((ac) => <AcCard key={ac.id} ac={ac} />)
          )}
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {section.content || '*—*'}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

interface ArtifactReadViewProps {
  editState: EditState;
  // template is used for ordering (already reflected in editState.sections order)
  template: ParsedTemplate;
}

export function ArtifactReadView({ editState }: ArtifactReadViewProps): JSX.Element {
  return (
    <div className="flex flex-col bg-background">
      <FmHeader fmValues={editState.fmValues} />
      {editState.sections.map((section) => (
        <SectionView key={section.heading} section={section} />
      ))}
    </div>
  );
}
