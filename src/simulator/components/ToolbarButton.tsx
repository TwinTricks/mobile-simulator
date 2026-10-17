import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToolbarButtonProps = Omit<ComponentProps<typeof Button>, "variant" | "size"> & {
  label: string;
  /** Set for toggles, which then show in the brand colour while on. */
  active?: boolean;
};

export function ToolbarButton({ label, active, className, title, ...props }: ToolbarButtonProps) {
  return (
    <Button
      variant={active ? "twoTone" : "plain"}
      size="icon-sm"
      data-tip={title ?? label}
      data-tip-placement="left"
      aria-label={label}
      aria-pressed={active}
      className={cn("rounded-full", className)}
      {...props}
    />
  );
}
