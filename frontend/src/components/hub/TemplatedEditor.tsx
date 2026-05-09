// UI-014g — Template-driven editor. Renders sections derived from a ParsedTemplate:
// - 'ac-cards' sections → GenericAcEditor
// - 'textarea' sections → auto-resize textarea
// - frontmatter fields  → typed inputs (text, date, select, tags)
// No store dependency — all state managed via props.

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { GenericAcEditor } from './GenericAcEditor';
import type { EditState, SectionState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';
import type { FrontmatterSpec } from '@/components/spdd/types';

// ─── Auto-resize textarea (local, mirrors SpddAcEditor's) ────────────────

interface AutoTextareaProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function AutoTextarea({ value, placeholder, onChange }: AutoTextareaProps): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }}
      className={cn(
        'w-full resize-none overflow-hidden rounded-md border border-ykp-line bg-ykp-bg-page',
        'px-3 py-2 text-[13.5px] leading-[1.55] text-ykp-text-primary placeholder:text-ykp-text-muted',
        'focus:outline-none focus:ring-1 focus:ring-ykp-ring',
      )}
    />
  );
}

// ─── Frontmatter field ────────────────────────────────────────────────────

interface FmFieldProps {
  spec: FrontmatterSpec;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

function FmField({ spec, value, onChange }: FmFieldProps): JSX.Element {
  const strValue = Array.isArray(value) ? value.join(', ') : (value ?? '');

  const labelClass = 'block text-[11px] font-mono text-ykp-text-muted mb-1 capitalize';
  const inputClass = cn(
    'w-full rounded-md border border-ykp-line bg-ykp-bg-page px-3 py-1.5',
    'text-[13px] text-ykp-text-primary focus:outline-none focus:ring-1 focus:ring-ykp-ring',
  );

  if (spec.widget === 'date') {
    return (
      <div>
        <label className={labelClass}>{spec.key}</label>
        <input
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    );
  }

  if (spec.widget === 'select' && spec.options) {
    return (
      <div>
        <label className={labelClass}>{spec.key}</label>
        <select
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {spec.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (spec.widget === 'tags') {
    // Render as comma-separated text for now; stores as string[]
    return (
      <div>
        <label className={labelClass}>{spec.key} <span className="text-[10px] text-ykp-text-muted">(séparés par virgule)</span></label>
        <input
          type="text"
          value={Array.isArray(value) ? value.join(', ') : strValue}
          onChange={(e) => {
            const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
            onChange(parts);
          }}
          className={inputClass}
        />
      </div>
    );
  }

  // Default: text
  return (
    <div>
      <label className={labelClass}>{spec.key}</label>
      <input
        type="text"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// ─── Frontmatter form ─────────────────────────────────────────────────────

interface FrontmatterFormProps {
  specs: ParsedTemplate['fmSpecs'];
  values: EditState['fmValues'];
  onChange: (key: string, value: string | string[]) => void;
}

function FrontmatterForm({ specs, values, onChange }: FrontmatterFormProps): JSX.Element | null {
  if (specs.length === 0) return null;
  return (
    <section className="border-b border-ykp-line px-6 py-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ykp-text-muted">
        Front-matter
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {specs.map((spec) => (
          <FmField
            key={spec.key}
            spec={spec}
            value={values[spec.key] ?? ''}
            onChange={(v) => onChange(spec.key, v)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Section renderer ─────────────────────────────────────────────────────

interface SectionRendererProps {
  section: SectionState;
  onChange: (updated: SectionState) => void;
}

function SectionRenderer({ section, onChange }: SectionRendererProps): JSX.Element {
  return (
    <section className="px-6 py-4 border-b border-ykp-line last:border-b-0">
      <h3 className="mb-2 text-[13px] font-semibold text-ykp-text-primary">{section.heading}</h3>
      {section.widget === 'ac-cards' ? (
        <GenericAcEditor
          acs={section.acs}
          onChange={(acs) => onChange({ ...section, acs })}
        />
      ) : (
        <AutoTextarea
          value={section.content}
          placeholder={`${section.heading}…`}
          onChange={(content) => onChange({ ...section, content })}
        />
      )}
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

interface TemplatedEditorProps {
  editState: EditState;
  template: ParsedTemplate;
  onChange: (state: EditState) => void;
}

export function TemplatedEditor({ editState, template, onChange }: TemplatedEditorProps): JSX.Element {
  const handleFmChange = (key: string, value: string | string[]) => {
    onChange({ ...editState, fmValues: { ...editState.fmValues, [key]: value } });
  };

  const handleSectionChange = (index: number, updated: SectionState) => {
    const sections = editState.sections.map((s, i) => i === index ? updated : s);
    onChange({ ...editState, sections });
  };

  return (
    <div className="flex flex-col overflow-y-auto bg-ykp-bg-page">
      <FrontmatterForm
        specs={template.fmSpecs}
        values={editState.fmValues}
        onChange={handleFmChange}
      />
      {editState.sections.map((section, i) => (
        <SectionRenderer
          key={section.heading}
          section={section}
          onChange={(updated) => handleSectionChange(i, updated)}
        />
      ))}
    </div>
  );
}
