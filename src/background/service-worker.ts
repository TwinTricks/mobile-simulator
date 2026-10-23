import { rulesetChange } from "@/lib/header-rules";
import { syncUserAgentRules } from "@/simulator/dynamic-rules";
import {
  OVERLAY_TOKEN_KEY,
  RECORD_COMMAND,
  RETURN_PARAM,
  SIMULATOR_PATH,
  type RecordTabMessage,
} from "@/shared/constants";
import { findDevice } from "@/shared/devices";
import { hostAllowed } from "@/shared/inline";
import { readRequest } from "@/shared/messages";
import type { ExtensionRequest, ExtensionResponse, InlineTabMessage } from "@/shared/messages";
import type { CspMode } from "@/shared/types";
import { isSimulatableUrl, safeReturnUrl } from "@/shared/url";
import { readSettings, readState, saveSettings } from "@/storage/simulator-store";

const simulatorUrl = () => chrome.runtime.getURL(SIMULATOR_PATH);

// Filtered here rather than with a `url` pattern in the query, which Chrome rejects for
// chrome-extension:// addresses.
async function simulatorTabs(): Promise<chrome.tabs.Tab[]> {
  const base = simulatorUrl();
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => tab.url?.startsWith(base));
}

/** Where closing the simulator in this tab should go back to, or null to close the tab. */
function returnUrlOf(tabUrl: string | undefined): string | null {
  if (!tabUrl?.startsWith(simulatorUrl())) return null;
  return safeReturnUrl(new URL(tabUrl).searchParams.get(RETURN_PARAM));
}

/**
 * Opens the simulator in place of the page in `from` when the settings say so. Otherwise it
 * focuses the simulator if it is already open, so there is only ever one.
 */
async function openSimulator(
  initialUrl: string,
  from?: chrome.tabs.Tab,
  overPage = true,
): Promise<number | undefined> {
  const params = new URLSearchParams();
  if (initialUrl) params.set("url", initialUrl);
  const { openMode } = await readSettings();

  const target = initialUrl || from?.url;
  if (
    overPage &&
    openMode === "over-page" &&
    from?.id !== undefined &&
    target &&
    isSimulatableUrl(target) &&
    !from.url?.startsWith(simulatorUrl())
  ) {
    await toggleFullScreen(from, target, true);
    return from.id;
  }

  if (from?.id !== undefined && openMode === "same-tab") {
    const back = from.url?.startsWith(simulatorUrl())
      ? returnUrlOf(from.url)
      : safeReturnUrl(from.url);
    if (back) params.set(RETURN_PARAM, back);
    await chrome.tabs.update(from.id, { url: `${simulatorUrl()}?${params}` });
    return from.id;
  }

  const query = params.toString();
  const url = query ? `${simulatorUrl()}?${query}` : simulatorUrl();
  const [existing] = await simulatorTabs();
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true, url });
    await chrome.windows.update(existing.windowId, { focused: true });
    return existing.id;
  }
  const tab = await chrome.tabs.create({ url });
  return tab.id;
}

/**
 * Runs in the website's tab, injected by `chrome.scripting`, so it must not reference anything
 * outside its own body. Lays the simulator over the page, or takes it away if it is already
 * there (left there with `openOnly`). The simulator asks to be taken away with a message when
 * it is closed.
 */
function toggleOverlay(src: string, openOnly: boolean, theme: string): boolean {
  const ID = "__msim-overlay";
  const existing = document.getElementById(ID);
  const root = document.documentElement;
  if (existing && openOnly) return true;
  if (existing) {
    existing.dispatchEvent(new Event("msim-close"));
    return false;
  }

  const frame = document.createElement("iframe");
  frame.id = ID;
  frame.src = src;
  frame.allow = "clipboard-write; display-capture; microphone; camera";
  // The simulator's own background, so the page never shows through while it starts.
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  frame.setAttribute(
    "style",
    "position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;" +
      "border:0!important;margin:0!important;padding:0!important;z-index:2147483647!important;" +
      `background:${dark ? "#141317" : "#fdfcf8"}!important;color-scheme:normal!important;` +
      "display:block!important",
  );
  const overflow = root.style.overflow;
  root.style.overflow = "hidden";

  const close = () => {
    window.removeEventListener("message", onMessage);
    frame.remove();
    root.style.overflow = overflow;
  };
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return;
    if ((event.data as { __msimOverlay?: unknown } | null)?.__msimOverlay === "close") close();
  };
  window.addEventListener("message", onMessage);
  frame.addEventListener("msim-close", close);
  root.appendChild(frame);
  frame.focus();
  return true;
}

const OVERLAY_TABS_KEY = "msim-overlay-tabs";

/** Tabs showing the full-screen simulator, with the site it was opened over. */
async function overlayOrigins(): Promise<Map<number, string>> {
  const stored: unknown = (await chrome.storage.session.get(OVERLAY_TABS_KEY))[OVERLAY_TABS_KEY];
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return new Map();
  return new Map(
    Object.entries(stored)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([id, origin]) => [Number(id), origin]),
  );
}

async function overlayTabs(): Promise<Set<number>> {
  return new Set((await overlayOrigins()).keys());
}

async function setOverlayTab(tabId: number, open: boolean, url?: string): Promise<void> {
  const tabs = await overlayOrigins();
  if (open) tabs.set(tabId, originOf(url));
  else tabs.delete(tabId);
  await chrome.storage.session.set({ [OVERLAY_TABS_KEY]: Object.fromEntries(tabs) });
  await showCloseAction(tabId, open);
}

function originOf(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

const ICON_SOURCES: Record<number, string> = { 16: "icons/icon-16.png", 32: "icons/icon-48.png" };
let closeIcon: Promise<Record<number, ImageData>> | null = null;

/** The toolbar icon with a dark round cross over its bottom-right corner. */
function closeIconImages(): Promise<Record<number, ImageData>> {
  closeIcon ??= (async () => {
    const images: Record<number, ImageData> = {};
    for (const [size, path] of Object.entries(ICON_SOURCES).map(
      ([s, p]) => [Number(s), p] as const,
    )) {
      const blob = await (await fetch(chrome.runtime.getURL(path))).blob();
      const icon = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(size, size);
      const g = canvas.getContext("2d")!;
      g.drawImage(icon, 0, 0, size, size);
      icon.close();

      const r = size * 0.38;
      const c = size - r;
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fillStyle = "#27272a";
      g.fill();
      const d = r * 0.4;
      g.beginPath();
      g.moveTo(c - d, c - d);
      g.lineTo(c + d, c + d);
      g.moveTo(c + d, c - d);
      g.lineTo(c - d, c + d);
      g.strokeStyle = "#ffffff";
      g.lineWidth = Math.max(1.5, size * 0.09);
      g.lineCap = "round";
      g.stroke();
      images[size] = g.getImageData(0, 0, size, size);
    }
    return images;
  })();
  return closeIcon;
}

/**
 * While a tab shows the simulator, the toolbar button closes it instead of opening the popup,
 * and wears a cross to say so.
 */
async function showCloseAction(tabId: number, close: boolean): Promise<void> {
  try {
    await Promise.all([
      chrome.action.setPopup({
        tabId,
        popup: close ? "" : (chrome.runtime.getManifest().action?.default_popup ?? ""),
      }),
      close
        ? chrome.action.setIcon({ tabId, imageData: await closeIconImages() })
        : chrome.action.setIcon({ tabId, path: ICON_SOURCES }),
      chrome.action.setBadgeText({ tabId, text: "" }),
      chrome.action.setTitle({
        tabId,
        title: close ? "Close Mobile Simulator" : "Mobile Simulator",
      }),
    ]);
  } catch {
    // The tab closed in the meantime.
  }
}

async function refreshAction(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  const isSimulator = !!tab.url?.startsWith(simulatorUrl());
  await showCloseAction(tab.id, isSimulator || (await overlayTabs()).has(tab.id));
}

/** Shows the simulator over a website's own tab. Tabs that can't host it get the simulator tab. */
async function toggleFullScreen(
  tab: chrome.tabs.Tab | undefined,
  url = tab?.url,
  openOnly = false,
): Promise<void> {
  if (tab?.id === undefined || !url || !isSimulatableUrl(url)) {
    await openSimulator(url && isSimulatableUrl(url) ? url : "", tab, false);
    return;
  }
  if (openOnly && (await overlayTabs()).has(tab.id)) return;
  // The simulator checks this before it does anything, so a website that embeds the page on its
  // own gets nothing.
  const token = crypto.randomUUID();
  await chrome.storage.session.set({ [OVERLAY_TOKEN_KEY]: token });
  const src = `${simulatorUrl()}?mode=overlay&token=${token}&url=${encodeURIComponent(url)}`;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleOverlay,
      args: [src, false, (await readSettings()).theme],
    });
    await setOverlayTab(tab.id, result?.result === true, url);
  } catch {
    // Pages Chrome keeps extensions out of, such as the Web Store.
    await openSimulator(url, tab, false);
  }
}

/**
 * Puts the full-screen simulator back on a page of the site it was opened over, as the page
 * starts loading, so it is there before the site draws anything. Another site leaves it closed.
 */
async function keepOverlay(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  const origin = (await overlayOrigins()).get(tab.id);
  if (origin === undefined || (await overlayStillThere(tab.id))) return;
  if (!origin || originOf(tab.url) !== origin || !tab.url || !isSimulatableUrl(tab.url)) {
    await setOverlayTab(tab.id, false);
    return;
  }
  // The same token as before, so a simulator still starting up is let in.
  const [session, { theme }] = await Promise.all([
    chrome.storage.session.get(OVERLAY_TOKEN_KEY),
    readSettings(),
  ]);
  let token: unknown = session[OVERLAY_TOKEN_KEY];
  if (typeof token !== "string" || !token) {
    token = crypto.randomUUID();
    await chrome.storage.session.set({ [OVERLAY_TOKEN_KEY]: token });
  }
  const src = `${simulatorUrl()}?mode=overlay&token=${token as string}&url=${encodeURIComponent(tab.url)}`;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleOverlay,
      args: [src, true, theme],
      injectImmediately: true,
    });
  } catch {
    // The page went away while loading; the next update tries again.
  }
}

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
}

/** Lets the inline phone open on a site. Only ever called for something the user did. */
async function allowInlineHost(host: string): Promise<void> {
  if (!host) return;
  const settings = await readSettings();
  if (settings.inline.enabled && hostAllowed(host, settings.inline.hosts)) return;
  await saveSettings({
    ...settings,
    inline: {
      enabled: true,
      hosts: settings.inline.hosts.includes(host)
        ? settings.inline.hosts
        : [...settings.inline.hosts, host],
    },
  });
}

/** Draws the inline phone in a website's tab, allowing the site first. */
async function openInline(tab: chrome.tabs.Tab | undefined): Promise<void> {
  const url = tab?.url;
  if (tab?.id === undefined || !url || !/^https?:/.test(url)) {
    await openSimulator(url && isSimulatableUrl(url) ? url : "", tab);
    return;
  }
  await allowInlineHost(hostOf(url));
  const message: InlineTabMessage = { __msimInline: "open" };
  try {
    await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
  } catch {
    // A tab opened before the extension was installed or updated has no trigger script until
    // it loads again, and loading it with the hash draws the phone.
    const withHash = new URL(url);
    withHash.hash = "mobile-sim";
    await chrome.tabs.update(tab.id, { url: withHash.href });
    await chrome.tabs.reload(tab.id);
  }
}

/** The inline phone's frame needs its User-Agent rule before it loads. */
async function inlineRules(
  deviceId: string,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !sender.tab) {
    return { ok: false, error: "Not from the inline phone." };
  }
  const settings = await readSettings();
  if (!settings.inline.enabled || !hostAllowed(hostOf(sender.url), settings.inline.hosts)) {
    return { ok: false, error: "The inline phone isn't allowed on this site." };
  }
  const device = findDevice(deviceId, (await readState()).customDevices);
  if (!device) return { ok: false, error: "No such device." };
  if (settings.spoofUA && device.ua) await syncUserAgentRules([device]);
  return { ok: true };
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function clearDynamicRules(): Promise<void> {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((rule) => rule.id);
    if (removeRuleIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
    }
  } catch {
    // Nothing to clear, or the API is unavailable. Either way there are no rules left behind.
  }
}

async function applyCspMode(mode: CspMode): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(rulesetChange(mode));
  } catch {
    // The rulesets may already be in the requested state.
  }
}

async function handle(
  request: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  switch (request.type) {
    case "open-simulator":
      return { ok: true, tabId: await openSimulator(request.url, await activeTab()) };
    case "get-active-url": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return { ok: true, url: tab?.url ?? "" };
    }
    case "set-csp-mode":
      await applyCspMode(request.mode);
      return { ok: true };
    case "open-full-screen": {
      const tab =
        request.tabId === undefined ? await activeTab() : await chrome.tabs.get(request.tabId);
      await toggleFullScreen(tab);
      return { ok: true };
    }
    case "open-inline":
      await openInline(await activeTab());
      return { ok: true };
    case "inline-rules":
      return inlineRules(request.deviceId, sender);
    case "inline-allow":
      // The trigger script sends this only for a real click on its Allow button.
      if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !sender.tab) {
        return { ok: false, error: "Not from the inline phone." };
      }
      await allowInlineHost(hostOf(sender.url));
      return { ok: true };
    case "overlay-closed":
      if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) {
        return { ok: false, error: "Not from the simulator." };
      }
      await setOverlayTab(sender.tab.id, false);
      return { ok: true };
    case "tab-capture":
      // Chrome allows it on a tab the extension was used on: its icon, shortcut or menu.
      if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) {
        return { ok: false, error: "Not from the simulator." };
      }
      if (!sender.url?.startsWith(simulatorUrl())) {
        return { ok: false, error: "Not from the simulator." };
      }
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: sender.tab.id });
        return { ok: true, streamId };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
  }
}

// Only fires while the popup is switched off for the tab, which is while it shows the simulator.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  if (tab.url?.startsWith(simulatorUrl())) {
    const back = returnUrlOf(tab.url);
    void (back ? chrome.tabs.update(tab.id, { url: back }) : chrome.tabs.remove(tab.id));
  } else void toggleFullScreen(tab);
});

async function overlayStillThere(tabId: number): Promise<boolean> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!document.getElementById("__msim-overlay"),
      injectImmediately: true,
    });
    return result?.result === true;
  } catch {
    return false;
  }
}

chrome.tabs.onUpdated.addListener((_tabId, change, tab) => {
  if (!change.url && !change.status) return;
  void (async () => {
    // A reload, or another page of the same site, takes the full-screen simulator away with the
    // old page. Put back as the page starts, and checked again once it has loaded.
    if (change.status) await keepOverlay(tab);
    await refreshAction(tab);
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void overlayOrigins().then((tabs) => {
    if (!tabs.delete(tabId)) return;
    void chrome.storage.session.set({ [OVERLAY_TABS_KEY]: Object.fromEntries(tabs) });
  });
});

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  const request = readRequest(raw);
  if (!request) return false;
  handle(request, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

const WEB_PAGES = ["http://*/*", "https://*/*"];

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    const menus: chrome.contextMenus.CreateProperties[] = [
      {
        id: "full-screen-page",
        title: "Preview this page on a phone (full screen)",
        contexts: ["page"],
        documentUrlPatterns: WEB_PAGES,
      },
      {
        id: "inline-page",
        title: "Preview this page on a phone (inside the page)",
        contexts: ["page"],
        documentUrlPatterns: WEB_PAGES,
      },
      {
        id: "open-page",
        title: "Open this page in Mobile Simulator",
        contexts: ["page"],
        documentUrlPatterns: WEB_PAGES,
      },
      {
        id: "open-link",
        title: "Open link in Mobile Simulator",
        contexts: ["link"],
        targetUrlPatterns: WEB_PAGES,
      },
      { id: "action-side-panel", title: "Open in side panel", contexts: ["action"] },
      { id: "action-full-screen", title: "Full screen on this page", contexts: ["action"] },
      { id: "action-inline", title: "Phone inside this page", contexts: ["action"] },
    ];
    for (const menu of menus) chrome.contextMenus.create(menu);
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "full-screen-page":
    case "action-full-screen":
      void toggleFullScreen(tab, info.pageUrl ?? tab?.url);
      return;
    case "inline-page":
    case "action-inline":
      void openInline(tab);
      return;
    case "open-page":
      void openSimulator(info.pageUrl ?? tab?.url ?? "", tab);
      return;
    case "open-link":
      void openSimulator(info.linkUrl ?? "", tab);
      return;
    case "action-side-panel":
      // Called straight from the click, which is what lets Chrome open the panel.
      if (tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId });
      return;
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-full-screen") void toggleFullScreen(tab);
  if (command === RECORD_COMMAND && tab?.id) {
    const message: RecordTabMessage = { __msimRecord: "toggle" };
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
});

// The rules match only frames tagged for their device, so one left behind does no harm, and a
// simulator that is still open needs its rules kept. They are swept when the browser starts.
chrome.runtime.onStartup.addListener(() => void clearDynamicRules());
chrome.runtime.onInstalled.addListener(() => {
  void clearDynamicRules();
  createMenus();
});

const IDENTITY_SCRIPT_ID = "mobile-identity";

/**
 * Registered rather than named in the manifest so it can run in the page's own world before the
 * page's scripts. It does nothing outside a simulator device frame.
 */
async function registerIdentityScript(): Promise<void> {
  try {
    const script: chrome.scripting.RegisteredContentScript = {
      id: IDENTITY_SCRIPT_ID,
      js: ["content/mobile-identity.js"],
      matches: ["<all_urls>"],
      allFrames: true,
      runAt: "document_start",
      world: "MAIN",
    };
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [IDENTITY_SCRIPT_ID],
    });
    if (existing.length) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  } catch (error) {
    console.warn("[identity] could not register the identity script", error);
  }
}

void registerIdentityScript();
void chrome.tabs.query({}).then((tabs) => tabs.forEach((tab) => void refreshAction(tab)));
