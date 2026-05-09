import { useState } from 'react';
import { FolderOpen, Sparkles } from 'lucide-react';
import {
  InitializeYukki,
  OpenProject,
  SelectDirectory,
} from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTabsStore } from '@/stores/tabs';

export function ProjectPicker() {
  const addProject = useTabsStore((s) => s.addProject);

  const [pendingDir, setPendingDir] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  async function handleOpen() {
    setError('');
    try {
      const path = await SelectDirectory();
      if (!path) return; // user cancelled
      try {
        const meta = await OpenProject(path);
        if (meta && meta.Path) {
          // project:opened event will be handled by App.tsx EventsOn listener
          // but in case the event hasn't fired yet we also add locally.
          addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
        }
      } catch (e2: unknown) {
        if (String(e2).includes('no .yukki')) {
          setPendingDir(path);
        } else {
          setError(String(e2));
        }
      }
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function handleInitialize() {
    if (!pendingDir) return;
    setError('');
    setBusy(true);
    try {
      await InitializeYukki(pendingDir);
      const meta = await OpenProject(pendingDir);
      if (meta && meta.Path) {
        addProject({ path: meta.Path, name: meta.Name, lastOpened: meta.LastOpened });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ykp-bg-page p-8">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-bold">yukki</h1>
          <p className="text-sm text-ykp-text-muted">
            Open a SPDD project directory to browse your artefacts.
          </p>
          {!pendingDir && (
            <Button onClick={handleOpen} className="w-full">
              <FolderOpen className="mr-2 h-4 w-4" /> Open project
            </Button>
          )}
          {pendingDir && (
            <div className="space-y-2">
              <p className="text-sm">
                Selected directory has no <code>.yukki/</code> subtree:
                <span className="block font-mono text-xs mt-1 break-all">
                  {pendingDir}
                </span>
              </p>
              <Button
                onClick={handleInitialize}
                disabled={busy}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {busy ? 'Initializing…' : 'Initialize SPDD here'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPendingDir('')}
                disabled={busy}
                className="w-full"
              >
                Choose another directory
              </Button>
            </div>
          )}
          {error && <p className="text-sm text-ykp-danger">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
