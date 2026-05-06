export type StageKind = 'stories' | 'analysis' | 'prompts' | 'tests' | 'inbox' | 'epics' | 'roadmap';

export interface Stage {
  kind: StageKind;
  label: string;
}

export const STAGES: Stage[] = [
  { kind: 'stories', label: 'Story' },
  { kind: 'analysis', label: 'Analysis' },
  { kind: 'prompts', label: 'Canvas' },
  { kind: 'tests', label: 'Tests' },
  { kind: 'inbox', label: 'Inbox' },
  { kind: 'epics', label: 'Epic' },
  { kind: 'roadmap', label: 'Roadmap' },
];

export const IMPLEMENTATION_LABEL = 'Implementation';

export const KINDS: StageKind[] = STAGES.map((s) => s.kind);

export function nextStageOf(kind: StageKind): StageKind | null {
  const idx = KINDS.indexOf(kind);
  if (idx === -1 || idx === KINDS.length - 1) return null;
  return KINDS[idx + 1];
}

export function previousStageOf(kind: StageKind): StageKind | null {
  const idx = KINDS.indexOf(kind);
  if (idx <= 0) return null;
  return KINDS[idx - 1];
}
