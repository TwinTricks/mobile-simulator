import { useState, type FormEvent } from "react";
import { ArrowRight, Plus, X } from "lucide-react";

import { InlineMessage } from "@/components/app/InlineMessage";
import { PANEL_INPUT_CLASS, Panel } from "@/components/app/Section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { originColor, originLabel, parseOrigin } from "../environments";

export type EnvironmentControlsProps = {
  environments: readonly string[];
  compare: readonly string[];
  onChange: (environments: string[], compare: string[]) => void;
  /** Opens the current page on this site in every device. */
  onOpen: (origin: string) => void;
};

export function EnvironmentControls({
  environments,
  compare,
  onChange,
  onOpen,
}: EnvironmentControlsProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(event: FormEvent) {
    event.preventDefault();
    const origin = parseOrigin(draft);
    if (!origin) {
      setError("Type a site's address, such as localhost:3000 or staging.example.com.");
      return;
    }
    setError(null);
    setDraft("");
    if (environments.includes(origin)) return;
    onChange([...environments, origin], compare.length > 0 ? [...compare, origin] : [...compare]);
  }

  const toggle = (origin: string, on: boolean) =>
    onChange(
      [...environments],
      on
        ? environments.filter((o) => o === origin || compare.includes(o))
        : compare.filter((o) => o !== origin),
    );

  const comparing = compare.filter((o) => environments.includes(o)).length >= 2;

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={add}>
        <Input
          aria-label="Site to compare"
          placeholder="localhost:3000"
          spellCheck={false}
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={cn(PANEL_INPUT_CLASS, "flex-1")}
        />
        <Button type="submit" variant="twoTone" className="h-9" disabled={!draft.trim()}>
          <Plus />
          Add
        </Button>
      </form>
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      {environments.length > 0 ? (
        <Panel className="divide-border/60 divide-y rounded-lg border-dashed p-0 shadow-none">
          {environments.map((origin) => (
            <div key={origin} className="group flex items-center gap-2.5 px-3 py-2">
              <Checkbox
                aria-label={`Compare ${originLabel(origin)}`}
                checked={compare.includes(origin)}
                onCheckedChange={(value) => toggle(origin, value === true)}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: originColor(environments, origin) }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" data-tip={origin}>
                {originLabel(origin)}
              </span>
              <button
                type="button"
                data-tip="Open the current page on this site"
                aria-label={`Open on ${originLabel(origin)}`}
                onClick={() => onOpen(origin)}
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Forget ${originLabel(origin)}`}
                onClick={() =>
                  onChange(
                    environments.filter((o) => o !== origin),
                    compare.filter((o) => o !== origin),
                  )
                }
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </Panel>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">
        {comparing
          ? "Each device is shown once per ticked site, all at the same path. Clicks, typing and pages stay in step."
          : "Tick two or more sites to show each device on all of them, at the same path. The arrow opens the current page on that site."}
      </p>
    </div>
  );
}
