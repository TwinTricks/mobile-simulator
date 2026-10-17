import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";

import { PanelField } from "@/components/app/Section";
import { cn } from "@/lib/utils";

/** The fill of a swatch whose colour is still to be picked. */
export const RAINBOW = "conic-gradient(#ff5f6d, #ffc371, #a8e063, #2193b0, #7f00ff, #ff5f6d)";

/** A round colour to pick, named underneath. */
export function Swatch({
  label,
  ariaLabel,
  style,
  picked,
  onClick,
  children,
}: {
  label: string;
  ariaLabel: string;
  style: CSSProperties;
  picked: boolean;
  onClick: () => void;
  /** Drawn in the swatch instead of the tick. */
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={picked}
      onClick={onClick}
      className="group focus-visible:ring-ring/50 flex min-w-0 flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-2"
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full border border-black/10 transition-shadow dark:border-white/15",
          picked
            ? "ring-primary ring-offset-card ring-2 ring-offset-2"
            : "group-hover:ring-border group-hover:ring-offset-card group-hover:ring-2 group-hover:ring-offset-2",
        )}
        style={style}
      >
        {children ??
          (picked && (
            <Check className="size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
          ))}
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-[0.6875rem] leading-none",
          picked ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <PanelField label={label} htmlFor={id}>
      <label
        htmlFor={id}
        className="border-input bg-card focus-within:ring-ring/50 flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border px-2 focus-within:ring-2"
      >
        <span
          className="size-5 shrink-0 rounded-full border border-black/10 dark:border-white/15"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-xs uppercase">{value}</span>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
        />
      </label>
    </PanelField>
  );
}
