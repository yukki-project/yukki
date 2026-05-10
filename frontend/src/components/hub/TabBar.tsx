// UI-009 — TabBar : barre d'onglets des projets ouverts.
import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CloseProject, OpenProject, SwitchProject, ReorderProjects } from '../../../wailsjs/go/main/App';
import { useTabsStore } from '@/stores/tabs';
import { useNavGuardStore } from '@/stores/navGuard';
import { cn } from '@/lib/utils';
import type { ProjectTab } from '@/stores/tabs';

export function TabBar(): JSX.Element | null {
  const openedProjects = useTabsStore((s) => s.openedProjects);
  const activeIndex = useTabsStore((s) => s.activeIndex);
  const addProject = useTabsStore((s) => s.addProject);
  const removeProject = useTabsStore((s) => s.removeProject);
  const setActive = useTabsStore((s) => s.setActive);
  const reorderProjects = useTabsStore((s) => s.reorderProjects);
  const guard = useNavGuardStore((s) => s.guard);

  const dragSrc = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (openedProjects.length === 0) {
    return null;
  }

  // Switch d'un onglet projet : skip si on re-clique l'onglet
  // actif. Le guard lit lui-même les flags (isDirty + restructure
  // open) et bloque si nécessaire.
  function handleClickTab(idx: number) {
    if (idx === activeIndex) return;
    guard(async () => {
      try {
        await SwitchProject(idx);
        setActive(idx);
      } catch (e) {
        console.error('SwitchProject failed', e);
      }
    });
  }

  function handleClose(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    // Fermer l'onglet actif passe par le guard ; fermer un autre
    // onglet ne déclenche le guard que si le draft courant est
    // dirty (le guard décide via les stores).
    if (idx === activeIndex) {
      guard(async () => {
        try {
          await CloseProject(idx);
          removeProject(idx);
        } catch (e) {
          console.error('CloseProject failed', e);
        }
      });
    } else {
      // Close d'un autre onglet : action immédiate, pas de risque
      // de perte sur le draft courant.
      void (async () => {
        try {
          await CloseProject(idx);
          removeProject(idx);
        } catch (e) {
          console.error('CloseProject failed', e);
        }
      })();
    }
  }

  async function handleOpenNew() {
    // Ouvrir un nouveau projet auto-switche sur lui (addProject
    // set activeIndex = nouveau tab) → on perd le contexte
    // courant. Le guard décide via les flags des stores.
    guard(async () => {
      try {
        const meta = await OpenProject('');
        if (meta && meta.Path) {
          addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
        }
      } catch (e) {
        console.error('OpenProject failed', e);
      }
    });
  }

  // Drag-drop reorder (HTML5 native API, no external lib).
  function handleDragStart(idx: number) {
    dragSrc.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(idx);
  }

  async function handleDrop(targetIdx: number) {
    const src = dragSrc.current;
    setDragOver(null);
    dragSrc.current = null;
    if (src === null || src === targetIdx) return;

    const n = openedProjects.length;
    const order = Array.from({ length: n }, (_, i) => i);
    // Move src to targetIdx position.
    order.splice(src, 1);
    order.splice(targetIdx, 0, src);

    try {
      await ReorderProjects(order);
      reorderProjects(order.map((i) => openedProjects[i].path).map(
        (path) => openedProjects.findIndex((p: ProjectTab) => p.path === path),
      ));
      // Simpler approach: just mirror what backend did.
      const reordered = order.map((i) => openedProjects[i]);
      useTabsStore.setState((s) => ({
        openedProjects: reordered,
        activeIndex: reordered.findIndex((p) => p === openedProjects[s.activeIndex]),
      }));
    } catch (e) {
      console.error('ReorderProjects failed', e);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Open projects"
      className="flex h-8 shrink-0 items-end gap-0 border-b border-ykp-line bg-ykp-bg-elevated overflow-x-auto"
    >
      {openedProjects.map((proj, idx) => (
        <div
          key={proj.path}
          role="tab"
          aria-selected={idx === activeIndex}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragLeave={() => setDragOver(null)}
          onClick={() => handleClickTab(idx)}
          className={cn(
            'group flex h-7 min-w-0 max-w-[180px] cursor-pointer items-center gap-1.5 border-t-2 px-3 text-xs select-none',
            idx === activeIndex
              ? 'border-primary bg-ykp-bg-page text-ykp-text-primary'
              : 'border-transparent bg-ykp-bg-elevated text-ykp-text-muted hover:bg-ykp-bg-page/60',
            dragOver === idx && 'ring-1 ring-primary',
          )}
        >
          <span className="truncate">{proj.name}</span>
          <button
            type="button"
            aria-label={`Close project ${proj.name}`}
            onClick={(e) => handleClose(e, idx)}
            className="ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-ykp-danger/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {/* New tab button */}
      <button
        type="button"
        aria-label="Open project"
        onClick={handleOpenNew}
        className="flex h-7 w-7 shrink-0 items-center justify-center text-ykp-text-muted hover:text-ykp-text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
