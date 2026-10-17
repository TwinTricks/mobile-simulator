import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

/** One switch in a dashed {@link Panel}, rows split by `divide-y` on the panel. */
export function ToggleRow({ id, label, hint, icon: Icon, checked, disabled, onChange }: Props) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0",
        disabled && "opacity-55",
      )}
    >
      {Icon && <Icon aria-hidden className="text-muted-foreground mt-px size-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="text-[0.8125rem]">
          {label}
        </Label>
        {hint ? (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{hint}</p>
        ) : null}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
