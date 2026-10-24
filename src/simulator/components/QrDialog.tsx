import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { encode } from "uqr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocalAddress, shareableUrl, withHost } from "@/shared/qr-address";

type QrDialogProps = {
  url: string;
  /** The host remembered for this site when it is a local one. */
  host: string;
  onHost: (host: string) => void;
  onClose: () => void;
};

/** One path of unit squares, which stays crisp at any size. */
function qrPath(text: string): { size: number; d: string } {
  const { size, data } = encode(text, { ecc: "M", border: 2 });
  let d = "";
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return { size, d };
}

/** A QR code of the page on screen, to open it on a real phone. */
export function QrDialog({ url, host, onHost, onClose }: QrDialogProps) {
  const page = shareableUrl(url);
  const local = isLocalAddress(page);
  const target = (local && host && withHost(page, host)) || page;
  const code = useMemo(() => qrPath(target), [target]);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => setCopied(false), [target]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Open on your phone"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border/70 bg-background flex w-[min(22rem,100%)] flex-col gap-4 rounded-xl border p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm leading-tight font-semibold">Open on your phone</h2>
            <p className="text-muted-foreground text-[0.6875rem]">
              Scan with the phone's camera to open this page there.
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <svg
          role="img"
          aria-label={`QR code for ${target}`}
          data-qr={target}
          viewBox={`0 0 ${code.size} ${code.size}`}
          shapeRendering="crispEdges"
          className="mx-auto size-56 rounded-lg bg-white"
        >
          <path d={code.d} fill="#000" />
        </svg>

        {local && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qr-host" className="text-[0.6875rem] font-medium">
              This computer's address on your network
            </label>
            <Input
              id="qr-host"
              value={host}
              placeholder="192.168.1.20"
              spellCheck={false}
              onChange={(event) => onHost(event.target.value)}
              className="h-8 text-xs"
            />
            <p className="text-muted-foreground text-[0.6875rem]">
              {new URL(page).hostname} only opens on this computer. With the phone on the same
              Wi-Fi, use this computer's address instead, and have the dev server listen on the
              network (for example <code className="whitespace-nowrap">--host</code>).
            </p>
          </div>
        )}

        <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <span data-qr-address className="min-w-0 flex-1 truncate font-mono text-[0.6875rem]">
            {target}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(target).then(() => setCopied(true));
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
