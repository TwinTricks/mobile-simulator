import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, History, RefreshCw, X } from "lucide-react";

import { PANEL_INPUT_CLASS, Panel, Section } from "@/components/app/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { QUICK_URLS } from "@/shared/recent-urls";

type PagePanelProps = {
  url: string;
  open: boolean;
  recentUrls: readonly string[];
  onNavigate: (url: string) => void;
  onForget: (url: string | null) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
};

export function PagePanel({
  url,
  open,
  recentUrls,
  onNavigate,
  onForget,
  onBack,
  onForward,
  onReload,
}: PagePanelProps) {
  const [draft, setDraft] = useState(url);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(url), [url]);

  useEffect(() => {
    if (!open) return;
    // Waits a frame for the panel to drop `inert`, which would refuse the focus.
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onNavigate(draft);
  }

  const typed = draft.trim().toLowerCase();
  const matches =
    typed && typed !== url.toLowerCase()
      ? recentUrls.filter((u) => u.toLowerCase().includes(typed))
      : recentUrls;

  return (
    <div className="min-h-0 flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 py-3">
      <Section title="Address" description="The page every device loads.">
        <Panel className="space-y-3">
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              ref={inputRef}
              type="text"
              aria-label="URL"
              placeholder="https://example.com"
              spellCheck={false}
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={cn(PANEL_INPUT_CLASS, "flex-1")}
            />
            <Button type="submit" className="h-9 px-5">
              Go
            </Button>
          </form>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="plain" size="sm" onClick={onBack}>
              <ChevronLeft />
              Back
            </Button>
            <Button variant="plain" size="sm" onClick={onForward}>
              Forward
              <ChevronRight />
            </Button>
            <Button variant="plain" size="sm" onClick={onReload}>
              <RefreshCw />
              Reload
            </Button>
          </div>
        </Panel>
      </Section>

      <Section title="Local servers">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_URLS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => onNavigate(quick)}
              className="border-border/70 bg-card hover:border-primary/40 hover:text-primary rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors"
            >
              {quick.replace("http://", "")}
            </button>
          ))}
        </div>
      </Section>

      {recentUrls.length > 0 ? (
        <Section
          title="Recent"
          action={
            <button
              type="button"
              onClick={() => onForget(null)}
              className="text-muted-foreground hover:text-foreground text-[0.6875rem]"
            >
              Clear
            </button>
          }
        >
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-xs">No recent page matches.</p>
          ) : (
            <Panel className="divide-border/60 divide-y rounded-lg border-dashed p-0 shadow-none">
              {matches.map((recent) => (
                <div
                  key={recent}
                  className={cn(
                    "group hover:bg-accent/40 flex items-center gap-2 px-3 py-2 first:rounded-t-lg last:rounded-b-lg",
                    recent === url && "bg-primary/5",
                  )}
                >
                  <History className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  <button
                    type="button"
                    data-tip={recent}
                    onClick={() => onNavigate(recent)}
                    className={cn(
                      "min-w-0 flex-1 truncate text-left text-xs",
                      recent === url && "text-primary font-medium",
                    )}
                  >
                    {recent.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </button>
                  <button
                    type="button"
                    aria-label={`Forget ${recent}`}
                    onClick={() => onForget(recent)}
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </Panel>
          )}
        </Section>
      ) : null}

      {url ? (
        <Button
          variant="twoTone"
          className="w-full"
          onClick={() => void chrome.tabs.create({ url })}
        >
          <ExternalLink />
          Open in a real tab
        </Button>
      ) : null}
    </div>
  );
}
