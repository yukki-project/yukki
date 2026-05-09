import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type Meta } from '../../../wailsjs/go/main/App';
import { type StageKind } from './stages';

const COMMAND_BY_KIND: Record<StageKind, (sourcePath: string) => string> = {
  stories: () => '/yukki-story <description>',
  analysis: (p) => `/yukki-analysis ${p}`,
  prompts: (p) => `/yukki-reasons-canvas ${p}`,
  tests: () => '/yukki-tests <id-slug> (V2)',
  inbox: () => '/yukki-story <description>',
  epics: (p) => `/yukki-analysis ${p}`,
  roadmap: () => '—',
};

interface CreateNextStageModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceArtifact: Meta | null;
  nextKind: StageKind;
}

export function CreateNextStageModal({
  open,
  onOpenChange,
  sourceArtifact,
  nextKind,
}: CreateNextStageModalProps) {
  const [copied, setCopied] = useState(false);
  const command = sourceArtifact
    ? COMMAND_BY_KIND[nextKind](sourceArtifact.Path)
    : '';

  function copy() {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create next stage</DialogTitle>
          <DialogDescription>
            Run this command in Claude Code to advance{' '}
            <span className="font-mono text-ykp-text-primary">
              {sourceArtifact?.ID ?? '?'}
            </span>{' '}
            to the next SPDD stage.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-ykp-line bg-ykp-bg-subtle/40 p-3">
          <code className="block break-all font-mono text-sm text-ykp-text-primary">
            {command}
          </code>
        </div>
        <p className="text-xs text-ykp-text-muted">
          Coming in a future version: this will run automatically.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={copy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy command
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
