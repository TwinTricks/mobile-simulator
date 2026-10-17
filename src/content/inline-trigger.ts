import { parseInlineSpec, readInlineHash, type InlineConfig } from "@/shared/inline";
import type { InlineTabMessage } from "@/shared/messages";
import { savedInline } from "@/inline/session";

/**
 * Runs in the top frame of every website, and stays this small: the phone itself is only loaded
 * when a page asks for it with `#mobile-sim` in its address, a `{ __mobileSimPage: "open" }`
 * message, or the extension's menu.
 */

type InlineApp = typeof import("@/inline/app");

let app: Promise<InlineApp> | null = null;

function loadApp(): Promise<InlineApp> {
  app ??= import("@/inline/app");
  return app;
}

function open(config: InlineConfig, how: "page" | "menu" | "restore") {
  void loadApp().then((inline) => inline.openInline(config, how));
}

function close() {
  void app?.then((inline) => inline.closeInline());
}

function fromHash() {
  const config = readInlineHash(location.hash);
  if (config === undefined) return false;
  if (config === null) close();
  else open(config, "page");
  return true;
}

window.addEventListener("hashchange", fromHash);

// Testing tools and the site's own scripts can open and close it without touching the address.
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { __mobileSimPage?: unknown; spec?: unknown } | null;
  if (data?.__mobileSimPage === "open") {
    const config = parseInlineSpec(typeof data.spec === "string" ? data.spec : "");
    if (config) open(config, "page");
  } else if (data?.__mobileSimPage === "close") {
    close();
  }
});

chrome.runtime.onMessage.addListener((message: InlineTabMessage) => {
  if (message?.__msimInline === "open") open(parseInlineSpec("")!, "menu");
});

if (!fromHash()) {
  const saved = savedInline();
  if (saved) open(saved, "restore");
}
