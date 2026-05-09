// OPS-001 prompt-update O17 — Developer menu in the TitleBar.
//
// Mounted to the right of HelpMenu. Renders null when the binary is
// not a dev build (release builds get no menu at all). Items:
//   - toggle Mode debug (Ctrl+Shift+D hint)
//   - "Ouvrir le drawer logs" (visible only when debugMode is on)
//   - "Ouvrir le dossier de logs" (always available in dev build)

import { Bug, FileText, ScrollText } from 'lucide-react';
import { useCallback, useState } from 'react';
import { OpenLogsFolder } from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isDevBuild } from '@/lib/buildFlags';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/stores/settings';
import { useDevToolsStore } from '@/stores/devTools';

export function DeveloperMenu(): JSX.Element | null {
  if (!isDevBuild()) return null;

  const debugMode = useSettingsStore((s) => s.debugMode);
  const setDebugMode = useSettingsStore((s) => s.setDebugMode);
  const openDrawer = useDevToolsStore((s) => s.openDrawer);
  const [open, setOpen] = useState(false);

  const handleToggleDebug = useCallback(async () => {
    setOpen(false);
    await setDebugMode(!debugMode);
  }, [debugMode, setDebugMode]);

  const handleOpenDrawer = useCallback(async () => {
    setOpen(false);
    await openDrawer();
  }, [openDrawer]);

  const handleOpenFolder = useCallback(async () => {
    setOpen(false);
    try {
      await OpenLogsFolder();
    } catch (e) {
      logger.error('OpenLogsFolder failed', e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Developer
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={handleToggleDebug}>
          <Bug className="mr-2 h-4 w-4" />
          {debugMode ? 'Désactiver le mode debug' : 'Activer le mode debug'}
          <span className="ml-auto text-xs text-ykp-text-muted">Ctrl+Shift+D</span>
        </DropdownMenuItem>

        {debugMode && (
          <DropdownMenuItem onClick={handleOpenDrawer}>
            <ScrollText className="mr-2 h-4 w-4" />
            Ouvrir le drawer logs
            <span className="ml-auto text-xs text-ykp-text-muted">Esc pour fermer</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleOpenFolder}>
          <FileText className="mr-2 h-4 w-4" />
          Ouvrir le dossier de logs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
