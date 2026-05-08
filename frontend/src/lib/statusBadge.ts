// Shared artifact status badge classes — used in HubList, WorkflowCard, ArtifactReadView.
export const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  accepted: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  implemented: 'bg-green-500/15 text-green-700 dark:text-green-300',
  synced: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'in-progress': 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
};
