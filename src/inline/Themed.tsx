import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ThemeChoice } from "@/shared/types";

/** The simulator's light or dark look, inside the shadow root rather than on the page. */
export function Themed({
  theme,
  className,
  children,
}: {
  theme: ThemeChoice;
  className?: string;
  children: ReactNode;
}) {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const dark = theme === "dark" || (theme === "system" && systemDark);

  return (
    <div
      className={cn(
        dark && "dark",
        "bg-background text-foreground font-sans text-[13px] leading-normal antialiased",
        className,
      )}
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      {children}
    </div>
  );
}
