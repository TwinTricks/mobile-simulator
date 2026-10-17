import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidePanelProps = {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** A card floating beside the rail, as tall as its content and the window allow. */
export function SidePanel({ title, description, open, onClose, children }: SidePanelProps) {
  return (
    <aside
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "border-border/70 bg-background fixed top-3 right-[4.25rem] z-40 flex max-h-[calc(100vh-1.5rem-var(--studio-bar,0px))] w-[min(360px,calc(100vw-5rem))] flex-col overflow-hidden rounded-xl border shadow-xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        !open && "pointer-events-none translate-x-3 opacity-0",
      )}
    >
      <div className="border-border/60 bg-card/80 flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm leading-tight font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground truncate text-[0.6875rem] leading-tight">
            {description}
          </p>
        </div>
        <Button
          variant="plain"
          size="icon-sm"
          className="rounded-full"
          aria-label={`Close ${title.toLowerCase()} panel`}
          data-tip="Close"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {children}
    </aside>
  );
}
