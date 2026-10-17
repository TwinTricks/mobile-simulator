import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * In presentation mode the rail waits off screen, behind a thin strip along the right edge, and
 * slides in while the pointer or focus is on it. It stays out while something it opened, such
 * as a panel, is showing.
 */
export function PresentationEdge({
  enabled,
  pinned,
  children,
}: {
  enabled: boolean;
  pinned: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <div data-presentation-edge className="group/edge fixed inset-y-0 right-0 z-50 w-3">
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex shadow-xl transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
          pinned
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 group-focus-within/edge:translate-x-0 group-focus-within/edge:opacity-100 group-hover/edge:translate-x-0 group-hover/edge:opacity-100",
        )}
      >
        {children}
      </div>
    </div>
  );
}
