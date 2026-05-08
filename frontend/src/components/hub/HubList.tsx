import { useEffect } from 'react';
import { AlertCircle, Archive, Download, MoreHorizontal, X } from 'lucide-react';
import { type Meta } from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useArtifactsStore } from '@/stores/artifacts';
import { useShellStore } from '@/stores/shell';
import { usePdfExportStore } from '@/stores/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { STATUS_BADGE } from '@/lib/statusBadge';

const ARCHIVED_STATUSES = new Set(['synced']);

interface HubListProps {
  className?: string;
}

export function HubList({ className }: HubListProps) {
  const items = useArtifactsStore((s) => s.items);
  const error = useArtifactsStore((s) => s.error);
  const selectedPath = useArtifactsStore((s) => s.selectedPath);
  const setSelectedPath = useArtifactsStore((s) => s.setSelectedPath);
  const kind = useArtifactsStore((s) => s.kind);

  const showArchived = useShellStore((s) => s.showArchived);
  const setShowArchived = useShellStore((s) => s.setShowArchived);

  // UI-015 — multi-selection store + actions
  const selection = usePdfExportStore((s) => s.selection);
  const isExporting = usePdfExportStore((s) => s.isExporting);
  const errorMessage = usePdfExportStore((s) => s.errorMessage);
  const toggleSelection = usePdfExportStore((s) => s.toggleSelection);
  const clearSelection = usePdfExportStore((s) => s.clearSelection);
  const exportSelection = usePdfExportStore((s) => s.exportSelection);

  const { toast } = useToast();

  // UI-015 — propage les erreurs du store en toast destructif (sinon
  // l'export échoue silencieusement et l'utilisateur ne sait pas).
  useEffect(() => {
    if (errorMessage) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'export PDF',
        description: errorMessage,
      });
    }
  }, [errorMessage, toast]);

  const visible = showArchived ? items : items.filter((m) => !ARCHIVED_STATUSES.has(m.Status));

  // Q5-A — la sélection persiste au changement de mode ; on signale
  // le nombre d'items sélectionnés invisibles dans le mode courant.
  const visiblePaths = new Set(items.map((m) => m.Path));
  const hiddenSelectedCount = [...selection].filter((p) => !visiblePaths.has(p)).length;

  // UI-015 — UX : la checkbox est cachée par défaut. Visible quand :
  //   - la souris survole la ligne (`group-hover:`), ou
  //   - la ligne est elle-même cochée (toujours visible), ou
  //   - au moins UN item est coché ailleurs (mode "sélection active",
  //     toutes les checkboxes deviennent visibles pour faciliter
  //     l'ajout d'autres items).
  const selectionMode = selection.size > 0;

  const handleExportSelection = async () => {
    const expectedCount = selection.size;
    try {
      const result = await exportSelection();
      if (result.kind === 'success') {
        toast({
          title: 'PDF généré',
          description: `${result.count} artefact(s) exporté(s) dans ${result.outputPath}`,
        });
      }
    } catch {
      // idem.
    }
    // expectedCount conservé pour la lisibilité log si besoin
    void expectedCount;
  };

  return (
    <section className={cn('flex flex-col overflow-y-auto', className)} aria-label="Artefact list">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background border-b px-4 py-2">
        <div className="text-sm font-semibold capitalize">
          {kind}
          <span className="ml-2 text-xs text-muted-foreground">{visible.length} item(s)</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showArchived ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? 'Masquer les archivés' : 'Afficher les archivés (synced)'}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* UI-015 — barre d'action multi-sélection : block normal au-dessus
          de la liste, pas un overlay sticky. Le bouton "..." ouvre un
          menu d'actions extensible (pour l'instant Export PDF, plus tard
          d'autres actions de masse — archiver, supprimer, déplacer…). */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selection.size}</span> sélectionné(s)
            {hiddenSelectedCount > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                ({hiddenSelectedCount} hors du mode courant)
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => clearSelection()}
              title="Effacer la sélection"
              disabled={isExporting}
            >
              <X className="mr-1 h-3 w-3" /> Effacer
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-7 w-7"
                  disabled={isExporting || selection.size === 0}
                  title="Actions sur la sélection"
                  aria-label="Actions sur la sélection"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={isExporting}
                  onSelect={() => {
                    void handleExportSelection();
                  }}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  {isExporting ? 'Export en cours…' : 'Exporter PDF (combiné)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {error && (
        <div className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      {!error && visible.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">No {kind} yet.</p>
      )}
      {visible.length > 0 && (
        <ul className="w-full">
          {visible.map((m: Meta) => {
            const broken = !!m.Error;
            const active = m.Path === selectedPath;
            const archived = ARCHIVED_STATUSES.has(m.Status);
            const checked = selection.has(m.Path);
            // Visibilité de la checkbox : toujours si cochée, sinon
            // au hover, sinon si on est en mode sélection.
            const checkboxAlwaysVisible = checked || selectionMode;
            return (
              <li
                key={m.Path}
                onClick={() => setSelectedPath(m.Path)}
                className={cn(
                  'group flex items-start gap-1.5 px-3 py-2 cursor-pointer border-b hover:bg-accent/40',
                  active && 'bg-accent/60',
                  archived && 'opacity-40',
                )}
              >
                {/* Checkbox de sélection — cachée par défaut, visible au hover OU si cochée OU en mode sélection. Centrée verticalement avec self-center. */}
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(m.Path);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Sélectionner ${m.ID || m.Slug || m.Path}`}
                  className={cn(
                    'self-center h-3.5 w-3.5 cursor-pointer accent-primary transition-opacity',
                    checkboxAlwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                />
                {/* ID + status */}
                <div className="flex flex-col shrink-0 min-w-0 w-24 gap-0.5">
                  <span className="font-mono text-[11px] leading-tight truncate">{m.ID || '?'}</span>
                  {broken ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive w-fit"
                      title={m.Error}
                    >
                      <AlertCircle className="h-2.5 w-2.5" /> err
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'inline-block rounded-md px-1.5 py-0.5 text-[10px] w-fit',
                        STATUS_BADGE[m.Status] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {m.Status || '?'}
                    </span>
                  )}
                </div>
                {/* Title */}
                <span className="flex-1 text-xs leading-snug line-clamp-2 pt-px" title={m.Title || m.Slug || ''}>
                  {m.Title || m.Slug || '—'}
                </span>
                {/* Pas de menu d'actions par ligne pour l'instant — les
                    actions de masse (export, etc.) vivent dans la barre
                    de sélection en haut, déclenchée en cochant ≥ 1 item. */}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
