import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  storageKey: string;
  children: ReactNode;
}

function loadSectionState(storageKey: string, title: string, defaultOpen: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultOpen;
    const collapsed: string[] = JSON.parse(raw);
    return !collapsed.includes(title);
  } catch {
    return defaultOpen;
  }
}

function persistSectionState(storageKey: string, title: string, isOpen: boolean): void {
  try {
    const raw = localStorage.getItem(storageKey);
    const collapsed: string[] = raw ? JSON.parse(raw) : [];
    const next = isOpen
      ? collapsed.filter((t) => t !== title)
      : [...collapsed.filter((t) => t !== title), title];
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // localStorage unavailable — silent degradation
  }
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  storageKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(() =>
    loadSectionState(storageKey, title, defaultOpen),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    persistSectionState(storageKey, title, next);
  };

  return (
    <Collapsible.Root open={open} onOpenChange={handleOpenChange}>
      <Collapsible.Trigger asChild>
        <button
          className="flex w-full items-center gap-2 text-left py-1 hover:text-ykp-text-primary/80 transition-colors"
          aria-label={`${open ? 'Replier' : 'Déplier'} la section ${title}`}
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-ykp-text-muted transition-transform duration-200',
              open && 'rotate-90',
            )}
          />
          <h2 className="text-base font-semibold">{title}</h2>
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="pl-6">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
