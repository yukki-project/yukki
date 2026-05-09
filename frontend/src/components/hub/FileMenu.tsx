// UI-009 — FileMenu : menu Fichier dans le TitleBar.
import { FolderOpen, Clock, Sparkles } from 'lucide-react';
import {
  InitializeYukki,
  ListRecentProjects,
  OpenProject,
  SelectDirectory,
} from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTabsStore } from '@/stores/tabs';
import { useState, useCallback } from 'react';

export function FileMenu(): JSX.Element {
  const recentProjects = useTabsStore((s) => s.recentProjects);
  const addProject = useTabsStore((s) => s.addProject);
  const setRecentProjects = useTabsStore((s) => s.setRecentProjects);

  const [open, setOpen] = useState(false);

  const handleOpenProject = useCallback(async (path = '') => {
    setOpen(false);
    try {
      const meta = await OpenProject(path);
      if (meta && meta.Path) {
        addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
      }
    } catch (e) {
      console.error('OpenProject failed', e);
    }
  }, [addProject]);

  const handleOpenRecent = useCallback(async (path: string) => {
    setOpen(false);
    await handleOpenProject(path);
  }, [handleOpenProject]);

  const handleOpenSubMenu = useCallback(async () => {
    try {
      const recents = await ListRecentProjects();
      setRecentProjects(
        recents.map((r) => ({ path: r.Path, name: r.Name, lastOpened: r.LastOpened })),
      );
    } catch {
      // Silently ignore — recent list stays as-is
    }
  }, [setRecentProjects]);

  const handleInitialize = useCallback(async () => {
    setOpen(false);
    try {
      const path = await SelectDirectory();
      if (!path) return; // user cancelled
      await InitializeYukki(path);
      await handleOpenProject(path);
    } catch (e) {
      console.error('InitializeYukki failed', e);
    }
  }, [handleOpenProject]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-ykp-text-muted hover:text-ykp-text-primary"
        >
          File
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => handleOpenProject('')}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Project…
          <span className="ml-auto text-xs text-ykp-text-muted">Ctrl+O</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger onPointerEnter={handleOpenSubMenu}>
            <Clock className="mr-2 h-4 w-4" />
            Recent Projects
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            {recentProjects.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-ykp-text-muted">No recent projects</span>
              </DropdownMenuItem>
            ) : (
              recentProjects.map((r) => (
                <DropdownMenuItem key={r.path} onClick={() => handleOpenRecent(r.path)}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="truncate text-xs text-ykp-text-muted">{r.path}</span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleInitialize}>
          <Sparkles className="mr-2 h-4 w-4" />
          Initialize Project…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
