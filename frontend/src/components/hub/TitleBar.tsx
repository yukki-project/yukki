import type { CSSProperties } from 'react';
import { Minus, Square, X } from 'lucide-react';
import yukkiLogo from '@/assets/yukki-logo.png';
import { Button } from '@/components/ui/button';
import { FileMenu } from '@/components/hub/FileMenu';
import { cn } from '@/lib/utils';
import {
  Quit,
  WindowMinimise,
  WindowToggleMaximise,
} from '../../../wailsjs/runtime/runtime';

const DRAG_REGION: CSSProperties = {
  ['--wails-draggable' as never]: 'drag',
};

export function TitleBar(): JSX.Element {
  return (
    <header
      aria-label="Title bar"
      className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-card select-none"
    >
      <div className="flex items-center gap-2 pl-3">
        <img
          src={yukkiLogo}
          alt="yukki"
          className="h-5 w-5"
          draggable={false}
        />
        <span className="text-xs text-muted-foreground">yukki</span>
        <FileMenu />
      </div>

      <div className="flex-1 self-stretch" style={DRAG_REGION} />

      <div className="flex h-full">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Minimize"
          className="h-8 w-12 rounded-none"
          onClick={() => WindowMinimise()}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Maximize"
          className="h-8 w-12 rounded-none"
          onClick={() => WindowToggleMaximise()}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          className={cn(
            'h-8 w-12 rounded-none',
            'hover:bg-destructive hover:text-destructive-foreground',
          )}
          onClick={() => Quit()}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
