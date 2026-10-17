"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * The thumb is inset rather than flush: the track carries padding, so there is
 * an even ring of colour around the thumb on all four sides and at both ends
 * of its travel. Getting that right means the three numbers below are locked
 * to each other -
 *
 *   travel = trackWidth - (2 x border) - (2 x padding) - thumb
 *
 * with `border-box` sizing, the 1px transparent border and the padding both
 * eat into the track's declared width. Change any one value and the checked
 * translate has to be recomputed, or the thumb stops short of the far end.
 */
const SIZES = {
  // 28 - 2 - 4 - 10 = 12px travel
  default: {
    root: "h-4 w-7 p-0.5",
    thumb: "size-2.5",
    travel: "data-[state=checked]:translate-x-3",
  },
  // 24 - 2 - 2 - 10 = 10px travel
  sm: { root: "h-3.5 w-6 p-px", thumb: "size-2.5", travel: "data-[state=checked]:translate-x-2.5" },
} as const;

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: keyof typeof SIZES;
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer focus-visible:border-ring focus-visible:ring-ring/50 data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-(--switch-on) data-[state=checked]:shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]",
        SIZES[size].root,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground pointer-events-none block rounded-full shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-white",
          SIZES[size].thumb,
          SIZES[size].travel,
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
