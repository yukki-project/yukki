import { useState } from 'react';
import { FolderOpen, Sparkles } from 'lucide-react';
import {
  InitializeSPDD,
  ListArtifacts,
  SelectProject,
} from '../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectStore } from '@/stores/project';
import { useArtifactsStore } from '@/stores/artifacts';

export function ProjectPicker() {
  const setProjectDir = useProjectStore((s) => s.setProjectDir);
  const setHasSpdd = useProjectStore((s) => s.setHasSpdd);
  const refreshArtifacts = useArtifactsStore((s) => s.refresh);

  const [pendingDir, setPendingDir] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  async function handleOpen() {
    setError('');
    try {
      const dir = await SelectProject();
      if (!dir) return;
      try {
        await ListArtifacts('stories');
        setProjectDir(dir);
        setHasSpdd(true);
        void refreshArtifacts();
      } catch {
        setPendingDir(dir);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleInitialize() {
    if (!pendingDir) return;
    setError('');
    setBusy(true);
    try {
      await InitializeSPDD(pendingDir);
      setProjectDir(pendingDir);
      setHasSpdd(true);
      void refreshArtifacts();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-bold">yukki</h1>
          <p className="text-sm text-muted-foreground">
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
                Selected directory has no <code>spdd/</code> subtree:
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
