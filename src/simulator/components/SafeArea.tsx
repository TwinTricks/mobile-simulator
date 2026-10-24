import { useEffect, useState, type RefObject } from "react";

import type { SafeArea } from "../frame-box";

/**
 * Whether the page in `iframeRef` asks to draw edge to edge (`viewport-fit=cover`), as it
 * reports after each load.
 */
export function usePageCover(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  loadKey: string,
): boolean {
  const [cover, setCover] = useState(false);
  useEffect(() => {
    setCover(false);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const value = (event.data as { __msimCover?: unknown } | null)?.__msimCover;
      if (typeof value === "boolean") setCover(value);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeRef, loadKey]);
  return cover;
}

/** Hands the page its safe-area insets, or null for none, again whenever the frame loads. */
export function useSafeAreaInsets(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  insets: SafeArea | null,
  loadKey: string,
) {
  const key = insets ? `${insets.top},${insets.right},${insets.bottom},${insets.left}` : "";
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const [top = 0, right = 0, bottom = 0, left = 0] = key ? key.split(",").map(Number) : [];
    const send = () =>
      iframe.contentWindow?.postMessage(
        { __msimSafeArea: key ? { top, right, bottom, left } : null },
        "*",
      );
    send();
    iframe.addEventListener("load", send);
    return () => iframe.removeEventListener("load", send);
  }, [iframeRef, key, loadKey]);
}

/** Shades the edges a page should keep its content out of. */
export function SafeAreaGuides({ insets }: { insets: SafeArea }) {
  const shade =
    "absolute bg-sky-500/25 [background-image:repeating-linear-gradient(-45deg,rgb(14_165_233/.35)_0_2px,transparent_2px_7px)]";
  return (
    <div aria-hidden data-safe-area-guides className="pointer-events-none absolute inset-0 z-[16]">
      {insets.top > 0 && (
        <div className={shade} style={{ top: 0, left: 0, right: 0, height: insets.top }} />
      )}
      {insets.bottom > 0 && (
        <div className={shade} style={{ bottom: 0, left: 0, right: 0, height: insets.bottom }} />
      )}
      {insets.left > 0 && (
        <div
          className={shade}
          style={{ top: insets.top, bottom: insets.bottom, left: 0, width: insets.left }}
        />
      )}
      {insets.right > 0 && (
        <div
          className={shade}
          style={{ top: insets.top, bottom: insets.bottom, right: 0, width: insets.right }}
        />
      )}
    </div>
  );
}
