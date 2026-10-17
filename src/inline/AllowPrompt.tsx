import { useEffect, useState, type MouseEvent } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ThemeChoice } from "@/shared/types";
import { placeHost } from "./place";
import { Themed } from "./Themed";

/**
 * Shown when a page on a site that isn't on the list asks for the phone. Allowing it takes a
 * real click: the page's own scripts can't make one.
 */
export function AllowPrompt({
  host,
  site,
  theme,
  onAllow,
  onDismiss,
}: {
  host: HTMLElement;
  site: string;
  theme: ThemeChoice;
  onAllow: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    placeHost(host, { top: 16, right: 16, width: 320 });
  }, [host]);

  const allow = (event: MouseEvent) => {
    if (!event.nativeEvent.isTrusted || busy) return;
    setBusy(true);
    void onAllow().finally(() => setBusy(false));
  };

  return (
    <Themed theme={theme} className="rounded-xl border p-4 shadow-xl">
      <div role="dialog" aria-label="Mobile Simulator" className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-medium">
          <Smartphone className="size-4" />
          Show a phone on {site}?
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          This page asked Mobile Simulator to draw a phone inside it. The sites that can do this are
          listed in the simulator's Settings.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={allow} disabled={busy}>
            Allow on {site}
          </Button>
        </div>
      </div>
    </Themed>
  );
}
