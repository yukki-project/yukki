// UI-009 — TabBar : barre d'onglets des projets ouverts.
import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CloseProject, OpenProject, SwitchProject, ReorderProjects } from '../../../wailsjs/go/main/App';
import { useTabsStore } from '@/stores/tabs';
import { cn } from '@/lib/utils';
import type { ProjectTab } from '@/stores/tabs';

export function TabBar(): JSX.Element | null {
  const openedProjects = useTabsStore((s) => s.openedProjects);
  const activeIndex = useTabsStore((s) => s.activeIndex);
  const addProject = useTabsStore((s) => s.addProject);
  const removeProject = useTabsStore((s) => s.removeProject);
  const setActive = useTabsStore((s) => s.setActive);
  const reorderProjects = useTabsStore((s) => s.reorderProjects);

  const dragSrc = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (openedProjects.length === 0) {
    return null;
  }

  async function handleClickTab(idx: number) {
    try {
      await SwitchProject(idx);
      setActive(idx);
    } catch (e) {
      console.error('SwitchProject failed', e);
    }
  }

  async function handleClose(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    try {
      await CloseProject(idx);
      removeProject(idx);
    } catch (e) {
      console.error('CloseProject failed', e);
    }
  }

  async function handleOpenNew() {
    try {
      const meta = await OpenProject('');
      if (meta && meta.Path) {
        addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
      }
    } catch (e) {
      console.error('OpenProject failed', e);
    }
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
