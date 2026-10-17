import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

const TONE = {
  error: {
    icon: AlertTriangle,
    className: "border-destructive/25 bg-destructive/8 text-destructive",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/10 text-success",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  info: {
    icon: Info,
    className: "border-border bg-muted/60 text-muted-foreground",
  },
} as const;

type Props = {
  tone?: keyof typeof TONE;
  /** False where the message is part of the screen rather than an answer to something just done. */
  announce?: boolean;
  /** A close button at the end of the message. */
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
};

export function InlineMessage({
  tone = "info",
  announce = true,
  onDismiss,
  children,
  className,
}: Props) {
  const { icon: Icon, className: toneClassName } = TONE[tone];
  return (
    <div
      role={!announce || tone === "info" ? undefined : tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
        toneClassName,
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          data-tip="Dismiss"
          onClick={onDismiss}
          className="-mr-1 rounded-md p-0.5 opacity-70 hover:opacity-100"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
