import { userAgentRules } from "@/lib/header-rules";
import type { Device } from "@/shared/types";

let queue: Promise<void> = Promise.resolve();

async function upsertRules(devices: readonly Device[]): Promise<void> {
  try {
    const rules = userAgentRules(devices);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id),
      addRules: rules,
    });
  } catch (error) {
    console.warn("[simulator] dynamic rules update failed", error);
  }
}

/**
 * Puts a User-Agent rule in place for each device. Other devices' rules stay: they may belong to
 * a simulator open elsewhere, and a rule left over only matches frames tagged for its device.
 * Calls run one after another, because two overlapping updates could add the same id twice.
 */
export function syncUserAgentRules(devices: readonly Device[]): Promise<void> {
  queue = queue.then(() => upsertRules(devices));
  return queue;
}
