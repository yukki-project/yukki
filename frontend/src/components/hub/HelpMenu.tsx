// UI-021 O6 — Menu Help dans le TitleBar : déclenche l'AboutDialog
// + ouvre la documentation et l'issue tracker GitHub via le
// navigateur OS.
//
// Calqué sur FileMenu (DropdownMenu shadcn). Trois items livrés :
//   1. À propos     → ouvre AboutDialog (state local)
//   2. Documentation → BrowserOpenURL(README GitHub)
//   3. Reporter un bug → BrowserOpenURL(Issues GitHub)

import { useState, useCallback } from 'react';
import { Info, BookOpen, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AboutDialog } from './AboutDialog';
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime';

const REPO_URL = 'https://github.com/yukki-project/yukki';
const ISSUES_URL = 'https://github.com/yukki-project/yukki/issues';

export function HelpMenu(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleOpenAbout = useCallback(() => {
    setMenuOpen(false);
    setAboutOpen(true);
  }, []);

  const handleOpenDocs = useCallback(() => {
    setMenuOpen(false);
    BrowserOpenURL(REPO_URL);
  }, []);

  const handleReportBug = useCallback(() => {
    setMenuOpen(false);
    BrowserOpenURL(ISSUES_URL);
  }, []);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label="Menu Help"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={handleOpenAbout}>
            <Info className="mr-2 h-3.5 w-3.5" />
            À propos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleOpenDocs}>
            <BookOpen className="mr-2 h-3.5 w-3.5" />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleReportBug}>
            <Bug className="mr-2 h-3.5 w-3.5" />
            Reporter un bug
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
