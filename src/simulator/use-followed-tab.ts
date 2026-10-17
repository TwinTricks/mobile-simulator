import { useEffect, useState } from "react";

import { isSimulatableUrl } from "@/shared/url";

/**
 * The address of the active tab in this window, kept current as tabs are switched and pages
 * change. Empty for pages the simulator can't show, and while `enabled` is false.
 */
export function useFollowedTabUrl(enabled: boolean): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let windowId: number | undefined;
    let current = true;

    const pick = (tab: chrome.tabs.Tab | undefined) => {
      if (current) setUrl(tab?.url && isSimulatableUrl(tab.url) ? tab.url : "");
    };
    const refresh = async () => {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      pick(tab);
    };
    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      if (info.windowId === windowId) void refresh();
    };
    const onUpdated = (_id: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (change.url && tab.active && tab.windowId === windowId) pick(tab);
    };

    void chrome.windows.getCurrent().then((win) => {
      windowId = win.id;
      void refresh();
    });
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      current = false;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [enabled]);

  return url;
}
