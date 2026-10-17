import type { ReactNode } from "react";

import { BrandMark } from "@/components/app/Brand";
import { ThemeButton } from "@/components/app/ThemeButton";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/shared/constants";
import type { ThemeChoice } from "@/shared/types";

type Props = {
  logoUrl: string;
  title?: string;
  subtitle?: string;
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
  /** Sits between the title and the actions, taking the room left over. */
  children?: ReactNode;
  /** Extra buttons, placed before the theme button. */
  actions?: ReactNode;
  className?: string;
};

export function AppHeader({
  logoUrl,
  title,
  subtitle,
  theme,
  onTheme,
  children,
  actions,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "border-border/60 bg-card/80 flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 backdrop-blur",
        className,
      )}
    >
      <BrandMark logoUrl={logoUrl} className="size-8 shrink-0" />
      <div className={cn("min-w-0", children ? "shrink-0" : "flex-1")}>
        <p className="truncate text-sm leading-tight font-semibold tracking-tight">
          {title ?? APP_NAME}
        </p>
        <p className="text-muted-foreground truncate text-[0.6875rem] leading-tight">
          {subtitle ?? (title ? APP_NAME : "Every screen size, side by side")}
        </p>
      </div>
      {children}
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <ThemeButton theme={theme} onTheme={onTheme} />
      </div>
    </header>
  );
}
