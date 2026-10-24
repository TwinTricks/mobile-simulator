import { useEffect, useRef, useState, type RefObject } from "react";
import { Hand } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TapTargetReport } from "@/shared/identity";

/**
 * Asks the page in `iframeRef` to check its tap targets against `min` CSS pixels (0 stops it),
 * again each time `loadKey` changes or the frame loads, and returns what it reports.
 */
export function useTapTargets(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  min: number,
  loadKey: string,
): { report: TapTargetReport | null; show: (index: number) => void } {
  const [report, setReport] = useState<TapTargetReport | null>(null);

  useEffect(() => {
    setReport(null);
    const iframe = iframeRef.current;
    if (!iframe) return;
    const ask = () => iframe.contentWindow?.postMessage({ __msimTargets: min }, "*");
    ask();
    iframe.addEventListener("load", ask);
    return () => iframe.removeEventListener("load", ask);
  }, [iframeRef, min, loadKey]);

  useEffect(() => {
    if (!min) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = (event.data as { __msimTargets?: TapTargetReport } | null)?.__msimTargets;
      if (data && typeof data === "object" && data.min === min) setReport(data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeRef, min]);

  return {
    report: min ? report : null,
    show: (index) =>
      iframeRef.current?.contentWindow?.postMessage({ __msimTargetShow: index }, "*"),
  };
}

/** The count under a device, which opens the list of small targets. */
export function TapTargetBadge({
  report,
  onShow,
}: {
  report: TapTargetReport;
  onShow: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const ok = report.count === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const summary = ok
    ? `Tap targets OK (${report.min}px)`
    : `${report.count} small tap target${report.count === 1 ? "" : "s"}`;

  return (
    <span ref={rootRef} className="relative self-center">
      <button
        type="button"
        data-tap-targets={report.count}
        aria-expanded={open}
        disabled={report.items.length === 0}
        data-tip={`Buttons and links under ${report.min}×${report.min} CSS pixels`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-px text-[0.6875rem] font-semibold",
          ok
            ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/12 text-red-700 hover:bg-red-500/20 dark:text-red-400",
        )}
      >
        <Hand className="size-3" />
        {summary}
      </button>
      {open && (
        <div
          role="list"
          aria-label="Small tap targets"
          className="border-border/70 bg-popover text-popover-foreground absolute bottom-full left-1/2 z-40 mb-1.5 max-h-64 w-72 -translate-x-1/2 overflow-auto rounded-lg border p-1 shadow-lg"
        >
          <p className="text-muted-foreground px-2 py-1 text-[0.6875rem]">
            Under {report.min}×{report.min}px.
            {report.crowded > 0 && ` ${report.crowded} also sit closer than 8px to another.`}
            {report.inline > 0 && ` Links in running text are allowed to be small.`}
          </p>
          {report.items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="listitem"
              onClick={() => onShow(index)}
              className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem]">
                {item.label}
              </span>
              {item.inline ? (
                <span className="text-[0.625rem] text-amber-600">in text</span>
              ) : item.crowded ? (
                <span className="text-[0.625rem] text-red-600">crowded</span>
              ) : null}
              <span className="text-muted-foreground tabular-nums">
                {item.width}×{item.height}
              </span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
