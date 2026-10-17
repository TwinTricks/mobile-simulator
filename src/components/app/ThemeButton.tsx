import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ThemeChoice } from "@/shared/types";

/**
 * The order the button walks, and the icon and name each stop answers to. The button says which
 * one is next rather than leaving it to be discovered by pressing.
 */
const THEME_CYCLE = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
] as const satisfies readonly { value: ThemeChoice; label: string; icon: LucideIcon }[];

type Props = {
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
};

export function ThemeButton({ theme, onTheme }: Props) {
  const at = Math.max(
    0,
    THEME_CYCLE.findIndex((choice) => choice.value === theme),
  );
  const current = THEME_CYCLE[at]!;
  const next = THEME_CYCLE[(at + 1) % THEME_CYCLE.length]!;
  const ThemeIcon = current.icon;
  const label = `${current.label}. Switch to ${next.label.toLowerCase()}`;
  return (
    <Button
      variant="plain"
      size="icon-sm"
      className="rounded-full"
      aria-label={label}
      data-tip={label}
      onClick={() => onTheme(next.value)}
    >
      <ThemeIcon />
    </Button>
  );
}
