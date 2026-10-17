import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** The height and rounding every input inside a {@link Panel} is drawn at. */
export const PANEL_INPUT_CLASS = "h-9 rounded-[8px] bg-card placeholder:text-xs";

type SectionProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-foreground text-[0.8125rem] leading-none font-semibold">{title}</h2>
            {description ? (
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-border/70 bg-card rounded-xl border p-3 shadow-sm", className)}>
      {children}
    </div>
  );
}

/** A labelled input with room under it for the one thing that was refused. */
export function PanelField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {error ? <p className="text-destructive text-[0.6875rem]">{error}</p> : null}
    </div>
  );
}
