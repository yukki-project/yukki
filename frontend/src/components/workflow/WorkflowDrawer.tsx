import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StoryViewer } from '../hub/StoryViewer';
import { useArtifactsStore } from '@/stores/artifacts';
import { useWorkflowStore } from '@/stores/workflow';

export function WorkflowDrawer() {
  const drawerPath = useWorkflowStore((s) => s.drawerPath);
  const closeDrawer = useWorkflowStore((s) => s.closeDrawer);
  const setSelectedPath = useArtifactsStore((s) => s.setSelectedPath);

  useEffect(() => {
    if (drawerPath) {
      setSelectedPath(drawerPath);
    }
  }, [drawerPath, setSelectedPath]);

  return (
    <Sheet
      open={drawerPath !== null}
      onOpenChange={(open) => {
        if (!open) closeDrawer();
      }}
    >
      <SheetContent
        side="right"
        className="w-[600px] max-w-full sm:max-w-[600px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="font-mono text-sm">{drawerPath}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <StoryViewer className="h-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
