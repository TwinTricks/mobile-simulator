import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shotFileName } from "../screenshot/compose";
import type { FullPageShot } from "../screenshot/full-page";

type FullPageDialogProps = {
  shots: readonly FullPageShot[];
  url: string;
  onClose: () => void;
};

function download(shot: FullPageShot, url: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(shot.blob);
  link.download = shotFileName(url, [shot.name], "png", "full-page");
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

/** Shows the stitched full-page screenshots, one column per device, to save or copy. */
export function FullPageDialog({ shots, url, onClose }: FullPageDialogProps) {
  const sources = useMemo(() => shots.map((shot) => URL.createObjectURL(shot.blob)), [shots]);
  const [copied, setCopied] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => sources.forEach((src) => URL.revokeObjectURL(src)), [sources]);
  useEffect(() => saveRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": shots[0]!.blob })]);
    setCopied(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-page screenshot"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border/70 bg-background flex max-h-full w-[min(64rem,100%)] flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="bg-muted/40 flex min-h-0 flex-1 justify-center gap-4 overflow-auto p-4">
          {shots.map((shot, i) => (
            <figure key={shot.name} className="flex shrink-0 flex-col items-center gap-2">
              <img
                src={sources[i]}
                alt={`Full page in ${shot.name}`}
                className="border-border/60 w-56 rounded-md border shadow-sm"
              />
              <figcaption className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
                <span className="text-foreground font-medium">{shot.name}</span>
                <span className="tabular-nums">
                  {shot.width} × {shot.height}
                </span>
                {shots.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Save ${shot.name}`}
                    onClick={() => download(shot, url)}
                    className="hover:text-foreground rounded p-0.5"
                  >
                    <Download className="size-3" />
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="border-border/60 flex items-center gap-3 border-t px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm leading-tight font-semibold">Full-page screenshot</h2>
            <p className="text-muted-foreground truncate text-[0.6875rem]">
              The whole page, top to bottom. Pages that load more as you scroll may stop early.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X />
            Close
          </Button>
          {shots.length === 1 && (
            <Button variant="twoTone" size="sm" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          <Button
            ref={saveRef}
            size="sm"
            onClick={() => {
              shots.forEach((shot) => download(shot, url));
              onClose();
            }}
          >
            <Download />
            {shots.length > 1 ? "Save all" : "Save PNG"}
          </Button>
        </div>
      </div>
    </div>
  );
}
