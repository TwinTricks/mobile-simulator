import type { ColorScheme } from "@/shared/types";

// The pages' side of these messages is in src/content/mobile-identity.ts, which runs in every
// device frame.

type ScrollMessage = { __simScroll: true; ratio: number };

function isScrollMessage(data: unknown): data is ScrollMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as ScrollMessage).__simScroll === true &&
    typeof (data as ScrollMessage).ratio === "number"
  );
}

/** The device whose page sent a top colour, and the colour, or null for any other message. */
export function readTopColor(
  event: MessageEvent,
  frames: ReadonlyMap<string, HTMLIFrameElement>,
): { id: string; color: string } | null {
  const data = event.data as { __simTopColor?: unknown; color?: unknown } | null;
  if (data?.__simTopColor !== true || typeof data.color !== "string") return null;
  for (const [id, iframe] of frames) {
    if (iframe.contentWindow === event.source) return { id, color: data.color };
  }
  return null;
}

/** Passes one frame's scroll position on to all the others. */
export function relayScroll(event: MessageEvent, frames: Iterable<HTMLIFrameElement>): void {
  if (!isScrollMessage(event.data)) return;
  const all = [...frames];
  if (!all.some((iframe) => iframe.contentWindow === event.source)) return;
  for (const iframe of all) {
    if (iframe.contentWindow === event.source) continue;
    iframe.contentWindow?.postMessage({ __simScrollApply: true, ratio: event.data.ratio }, "*");
  }
}

const SCHEME_STYLE_ID = "__sim_color_scheme";

/** Forces `color-scheme` in a same-origin frame. Cross-origin documents cannot be touched. */
export function applyColorScheme(iframe: HTMLIFrameElement | null, scheme: ColorScheme): void {
  try {
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const existing = doc.getElementById(SCHEME_STYLE_ID);
    if (scheme === "auto") {
      existing?.remove();
      return;
    }
    const style = existing ?? doc.createElement("style");
    style.id = SCHEME_STYLE_ID;
    style.textContent = `:root { color-scheme: ${scheme} !important; }`;
    if (!existing) doc.head?.appendChild(style);
  } catch {
    // Cross-origin.
  }
}

/** Back or forward in every frame that allows it, which is only same-origin ones. */
export function stepHistory(frames: Iterable<HTMLIFrameElement>, direction: "back" | "forward") {
  for (const iframe of frames) {
    try {
      if (direction === "back") iframe.contentWindow?.history.back();
      else iframe.contentWindow?.history.forward();
    } catch {
      // Cross-origin.
    }
  }
}
