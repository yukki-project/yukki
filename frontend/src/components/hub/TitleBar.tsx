import type { CSSProperties } from 'react';
import { Minus, Square, X } from 'lucide-react';
import yukkiLogo from '@/assets/yukki-logo.png';
import { Button } from '@/components/ui/button';
import { FileMenu } from '@/components/hub/FileMenu';
import { HelpMenu } from '@/components/hub/HelpMenu';
import { DeveloperMenu } from '@/components/hub/DeveloperMenu';
import { cn } from '@/lib/utils';
import { isDevBuild } from '@/lib/buildFlags';
import { useSettingsStore } from '@/stores/settings';
import { useDevToolsStore } from '@/stores/devTools';
import {
  Quit,
  WindowMinimise,
  WindowToggleMaximise,
} from '../../../wailsjs/runtime/runtime';

const DRAG_REGION: CSSProperties = {
  ['--wails-draggable' as never]: 'drag',
};

export function TitleBar(): JSX.Element {
  const debugMode = useSettingsStore((s) => s.debugMode);
  const toggleDrawer = useDevToolsStore((s) => s.toggleDrawer);

  // Badge clickable when in dev build — toggles the LogsDrawer.
  // In a release build, isDevBuild() is false and the badge is
  // hidden anyway (via the debugMode gate which can never be true
  // there).
  const showBadge = debugMode && isDevBuild();

  return (
    <header
      aria-label="Title bar"
      className="flex h-8 shrink-0 items-center justify-between border-b border-ykp-line bg-ykp-bg-elevated select-none"
    >
      <div className="flex items-center gap-2 pl-3">
        <img
          src={yukkiLogo}
          alt="yukki"
          className="h-5 w-5"
          draggable={false}
        />
        <FileMenu />
        <HelpMenu />
        <DeveloperMenu />
        {showBadge && (
          <button
            type="button"
            aria-label="Debug mode is ON — click to toggle logs drawer"
            onClick={() => void toggleDrawer()}
            className="ml-2 rounded-sm bg-ykp-warning px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ykp-warning-fg hover:opacity-90"
          >
            DEBUG ON
          </button>
        )}
      </div>

      <div className="flex-1 self-stretch" style={DRAG_REGION} onDoubleClick={() => WindowToggleMaximise()} />

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
            'hover:bg-ykp-danger hover:text-ykp-danger-fg',
          )}
          onClick={() => Quit()}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
