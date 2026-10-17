import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "rounded-button focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/35 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.25),rgba(0,0,0,0.12))] shadow-sm [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:shadow-md hover:brightness-[1.06] active:brightness-95",
        // Clerk-style danger button: same gloss recipe as `default` (top
        // highlight into a bottom shade, text shadow, coloured drop shadow)
        // but in destructive red, with a darkened edge so it reads as raised.
        destructive:
          "bg-destructive shadow-destructive/30 hover:shadow-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 border border-black/20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(0,0,0,0.10))] text-white shadow-sm [text-shadow:0_1px_1px_rgba(0,0,0,0.22)] hover:shadow-md hover:brightness-[1.06] active:brightness-95 dark:border-black/30 dark:bg-red-600",
        outline:
          "bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 border shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        twoTone:
          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary border",
        plain: "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary",
        // twoTone without the ring: the brand colour carries the button on its
        // own, so it reads as an active/primary action in a toolbar of quiet
        // icon buttons without adding another outlined box to the row.
        primaryPlain: "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "rounded-button h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "rounded-button h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
