// UI-021 O7 — Dialog "À propos" : affiche version, commit, build
// date, lien GitHub, license, dépendances majeures + bouton
// "Copier les infos".
//
// Lecture lazy de BuildInfo : un useEffect déclenché par l'ouverture
// appelle App.GetBuildInfo() pour ne pas alourdir le startup. Si la
// version est vide ou "dev", on affiche un badge "build de
// développement" pour l'éviter de transmettre des infos trompeuses
// à un signalement de bug.

import { useEffect, useState } from 'react';
import { Github, Copy, FileText, Check } from 'lucide-react';
import yukkiLogo from '@/assets/yukki-logo.png';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GetBuildInfo, type BuildInfo } from '../../../wailsjs/go/main/App';
import {
  BrowserOpenURL,
  ClipboardSetText,
} from '../../../wailsjs/runtime/runtime';

const REPO_URL = 'https://github.com/yukki-project/yukki';
const LICENSE_URL =
  'https://github.com/yukki-project/yukki/blob/main/LICENSE';
const PACKAGE_JSON_URL =
  'https://github.com/yukki-project/yukki/blob/main/frontend/package.json';
const GO_MOD_URL =
  'https://github.com/yukki-project/yukki/blob/main/go.mod';

// Liste statique des briques majeures — exhaustivité couverte par
// le lien GitHub (cf. story Q4-D : mixte statique + lien).
const KEY_DEPENDENCIES: ReadonlyArray<{ name: string; role: string }> = [
  { name: 'Wails v2', role: 'Shell desktop Go ↔ webview' },
  { name: 'React 18', role: 'UI' },
  { name: 'Tiptap 3', role: 'Édition WYSIWYG markdown' },
  { name: '@react-pdf/renderer', role: 'Export PDF' },
  { name: 'Vite', role: 'Bundler frontend' },
  { name: 'Tailwind CSS', role: 'Styling' },
  { name: 'Zustand', role: 'State management' },
];

export interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps): JSX.Element {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void GetBuildInfo().then((data) => {
      if (!cancelled) setInfo(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const isDev = !info || info.Version === '' || info.Version === 'dev';
  const displayedVersion = info?.Version || 'dev';

  const handleCopy = async (): Promise<void> => {
    const lines = [
      `yukki ${displayedVersion}`,
      info?.CommitSHA ? `Commit: ${info.CommitSHA}` : '',
      info?.BuildDate ? `Built: ${info.BuildDate}` : '',
      typeof navigator !== 'undefined' && navigator.userAgent
        ? `User-Agent: ${navigator.userAgent}`
        : '',
    ].filter((s) => s !== '');
    const ok = await ClipboardSetText(lines.join('\n'));
    if (ok) {
      toast({
        title: 'Infos copiées',
        description: 'Le presse-papier contient version + commit + OS.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Copie impossible',
        description: 'Le presse-papier système a refusé l\'écriture.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <div className="flex flex-col items-center gap-3 pt-2">
          <img
            src={yukkiLogo}
            alt="yukki"
            className="h-32 w-32"
            draggable={false}
          />
          <DialogHeader className="items-center text-center">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              yukki
              {isDev ? (
                <span className="inline-flex items-center rounded-md bg-ykp-bg-subtle px-2 py-0.5 font-mono text-[10px] uppercase text-ykp-text-muted">
                  build de développement
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Toolkit Structured Prompt-Driven Development.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5">
            <dt className="font-mono text-xs text-ykp-text-muted">version</dt>
            <dd className="font-mono text-xs">{displayedVersion}</dd>

            <dt className="font-mono text-xs text-ykp-text-muted">commit</dt>
            <dd className="font-mono text-xs">
              {info?.CommitSHA ? info.CommitSHA : '—'}
            </dd>

            <dt className="font-mono text-xs text-ykp-text-muted">built</dt>
            <dd className="font-mono text-xs">
              {info?.BuildDate ? info.BuildDate : '—'}
            </dd>

            <dt className="font-mono text-xs text-ykp-text-muted">license</dt>
            <dd>
              <button
                type="button"
                className="text-xs text-primary underline decoration-dotted hover:opacity-80"
                onClick={() => BrowserOpenURL(LICENSE_URL)}
              >
                Apache-2.0
              </button>
            </dd>

            <dt className="font-mono text-xs text-ykp-text-muted">repo</dt>
            <dd>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary underline decoration-dotted hover:opacity-80"
                onClick={() => BrowserOpenURL(REPO_URL)}
              >
                <Github className="h-3 w-3" />
                yukki-project/yukki
              </button>
            </dd>
          </dl>

          <div className="space-y-1.5 border-t pt-3">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-ykp-text-muted">
              Briques majeures
            </h3>
            <ul className="space-y-0.5 text-xs">
              {KEY_DEPENDENCIES.map((dep) => (
                <li key={dep.name} className="flex items-baseline gap-2">
                  <Check className="h-3 w-3 shrink-0 text-ykp-text-muted" />
                  <span className="font-medium">{dep.name}</span>
                  <span className="text-ykp-text-muted">{dep.role}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-primary underline decoration-dotted hover:opacity-80"
                onClick={() => BrowserOpenURL(PACKAGE_JSON_URL)}
              >
                <FileText className="h-3 w-3" />
                package.json
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-primary underline decoration-dotted hover:opacity-80"
                onClick={() => BrowserOpenURL(GO_MOD_URL)}
              >
                <FileText className="h-3 w-3" />
                go.mod
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleCopy();
            }}
          >
            <Copy className="mr-1.5 h-3 w-3" />
            Copier les infos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
