import { OVERLAY_TOKEN_KEY, RETURN_PARAM } from "@/shared/constants";
import { sendRequest } from "@/shared/messages";
import { safeReturnUrl } from "@/shared/url";

/**
 * Where the simulator is running: its own tab, Chrome's side panel (following the active tab),
 * or full screen over a website inside that website's tab.
 */
export type SimulatorMode = "tab" | "panel" | "overlay";

export function readMode(): SimulatorMode {
  if (document.body.dataset.mode === "panel") return "panel";
  if (new URLSearchParams(window.location.search).get("mode") === "overlay") return "overlay";
  return "tab";
}

export const MODE = readMode();

/**
 * True when the full-screen simulator was put there by the extension. The page is reachable
 * from any website, which must not get a working simulator just by embedding it.
 */
export async function overlayAllowed(): Promise<boolean> {
  if (MODE !== "overlay" || window === window.top) return false;
  const token = new URLSearchParams(window.location.search).get("token");
  const stored = (await chrome.storage.session.get(OVERLAY_TOKEN_KEY))[OVERLAY_TOKEN_KEY];
  return !!token && token === stored;
}

/**
 * Leaves the simulator: takes it off the website, goes back to the page it took the place of,
 * or closes its tab or side panel.
 */
export function closeSimulator(): void {
  const back = safeReturnUrl(new URLSearchParams(window.location.search).get(RETURN_PARAM));
  if (MODE === "overlay") {
    void sendRequest({ type: "overlay-closed" });
    window.parent.postMessage({ __msimOverlay: "close" }, "*");
  } else if (MODE === "tab" && back) {
    // Through the tabs API, which can also go back to pages like chrome://newtab.
    void chrome.tabs.getCurrent().then((tab) => {
      if (tab?.id !== undefined) void chrome.tabs.update(tab.id, { url: back });
      else window.location.replace(back);
    });
  } else {
    window.close();
  }
}
